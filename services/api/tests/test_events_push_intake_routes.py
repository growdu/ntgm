"""Routes tests for events / push_tokens / users.intake_basic.

Goals (push routes coverage 56% -> ~70%):
- /events                POST 200 / 404
- /events                GET  200 / 404
- /push/tokens           POST upsert + 404 no user
- /push/tokens           GET  list + 404 no user
- /push/tokens/{id}      DELETE success / 404 user / 404 token not in user
- /users/intake/basic    POST 200 (records intake + bazi + workflow)

All routes use module-import-time default args for service instances, so
we patch the *repository* / *service method* on the class instead of the
service class itself.
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.events import router as events_router
from app.api.routes.push_tokens import router as push_tokens_router
from app.api.routes.users import router as users_router
from app.db import get_db
from app.repositories.push_token_repository import PushTokenRepository
from app.repositories.user_repository import UserRepository
from app.services.bazi_service import BaziService
from app.services.intake_service import IntakeService
from app.services.profile_workflow_service import ProfileWorkflowService
from app.services.user_service import UserService


# -----------------------------------------------------------------------------
# Shared helpers
# -----------------------------------------------------------------------------
class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _user(version=3, **extras):
    base = dict(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime="1990-01-01T00:00:00+00:00",
        birth_place="北京", current_profile_version=version,
    )
    base.update(extras)
    return SimpleNamespace(**base)


def _override_db(app):
    app.dependency_overrides[get_db] = _fake_get_db


def _events_app():
    app = FastAPI(); app.include_router(events_router); return app


def _push_app():
    app = FastAPI(); app.include_router(push_tokens_router); return app


def _users_app():
    app = FastAPI(); app.include_router(users_router); return app


# ===========================================================================
# /events  (POST + GET)
# ===========================================================================
def test_events_post_creates_and_triggers_workflow(monkeypatch):
    user = _user()
    event = SimpleNamespace(id=uuid.uuid4())
    job = SimpleNamespace(id=uuid.uuid4())
    profile = SimpleNamespace(version_no=7)

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileWorkflowService, "__init__", lambda self: None)

    app, calls = _events_app(), {"get_first": 0, "create_event": 0, "recompute": 0}
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(IntakeService, "create_life_event",
                          lambda self, db, *, user_id, payload: (
                              calls.__setitem__("create_event",
                                                calls["create_event"] + 1)
                              or event)), \
             patch.object(ProfileWorkflowService, "recompute",
                          lambda self, db, *, user, reason: (
                              calls.__setitem__("recompute",
                                                calls["recompute"] + 1)
                              or (job, profile, None, {"events": 1}))):
            r = TestClient(app).post("/events", json={
                "eventType": "marriage",
                "eventTime": "2024-06-01T00:00:00+00:00",
                "title": "结婚",
                "description": "吾与之合卺",
                "impactScore": 8,
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["eventId"] == str(event.id)
    assert body["jobId"] == str(job.id)
    assert body["profileVersion"] == 7
    assert body["recomputeTriggered"] is True
    assert calls["create_event"] == 1
    assert calls["recompute"] == 1


def test_events_post_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileWorkflowService, "__init__", lambda self: None)

    app = _events_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/events", json={
                "eventType": "marriage",
                "eventTime": "2024-06-01T00:00:00+00:00",
                "title": "结婚",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "User not found" in r.json()["detail"]


def test_events_get_lists_events(monkeypatch):
    user = _user()
    e1 = SimpleNamespace(
        id=uuid.uuid4(), event_type="marriage",
        event_time="2024-06-01T00:00:00+00:00",
        title="结婚", description="合卺",
        impact_score=8,
    )
    e2 = SimpleNamespace(
        id=uuid.uuid4(), event_type="career",
        event_time="2023-03-01T00:00:00+00:00",
        title="乔迁", description=None, impact_score=None,
    )

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)

    app = _events_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(IntakeService, "list_life_events",
                          lambda self, db, *, user_id: [e1, e2]):
            r = TestClient(app).get("/events")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) == 2
    assert items[0]["eventType"] == "marriage"
    assert items[0]["impactScore"] == 8
    assert items[1]["description"] is None


def test_events_get_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)

    app = _events_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).get("/events")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# /push/tokens  (POST + GET + DELETE)
# ===========================================================================
def _make_token_record(**overrides):
    base = dict(
        id=uuid.uuid4(),
        token="ExpoToken[abc-123]",
        platform="ios",
        device_name="iPhone15",
        is_active=True,
        created_at="2024-01-01T00:00:00",
        last_seen_at="2024-01-15T00:00:00",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def test_push_tokens_post_upserts_and_returns_record(monkeypatch):
    user = _user()
    rec = _make_token_record()
    captured = {}

    def fake_upsert(self, db, *, user_id, token, platform, device_name,
                    app_version=None, meta=None):
        captured.update(user_id=str(user_id), token=token, platform=platform,
                        device_name=device_name, app_version=app_version,
                        meta=meta)
        return rec

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushTokenRepository, "upsert", fake_upsert):
            r = TestClient(app).post("/push/tokens", json={
                "token": "ExpoToken[abc-123]",
                "platform": "ios",
                "deviceName": "iPhone15",
                "appVersion": "1.2.3",
            })
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["tokenId"] == str(rec.id)
    assert body["platform"] == "ios"
    assert body["deviceName"] == "iPhone15"
    assert body["isActive"] is True
    assert captured["token"] == "ExpoToken[abc-123]"
    assert captured["device_name"] == "iPhone15"
    assert captured["app_version"] == "1.2.3"
    assert "registeredAt" in captured["meta"]


def test_push_tokens_post_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/push/tokens", json={
                "token": "ExpoToken[abc-123]",
                "platform": "ios",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_push_tokens_get_lists_my_tokens(monkeypatch):
    user = _user()
    t1 = _make_token_record(platform="ios", device_name="iP1")
    t2 = _make_token_record(platform="android", device_name="Pixel7")

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushTokenRepository, "list_active_for_user",
                          lambda self, db, *, user_id: [t1, t2]):
            r = TestClient(app).get("/push/tokens")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["tokens"]) == 2
    assert body["tokens"][0]["platform"] == "ios"
    assert body["tokens"][1]["deviceName"] == "Pixel7"


def test_push_tokens_get_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).get("/push/tokens")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_push_tokens_delete_deactivates(monkeypatch):
    user = _user()
    target_id = uuid.uuid4()
    target_token = "ExpoToken[del-1]"
    target = _make_token_record(id=target_id, token=target_token)
    other = _make_token_record()  # not matching id

    deactivated = []
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushTokenRepository, "list_active_for_user",
                          lambda self, db, *, user_id: [other, target]), \
             patch.object(PushTokenRepository, "deactivate",
                          lambda self, db, *, token: deactivated.append(token)):
            r = TestClient(app).delete(f"/push/tokens/{target_id}")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 204
    assert deactivated == [target_token]


def test_push_tokens_delete_404_token_not_owned(monkeypatch):
    """If token id isn't in user's active list, return 404."""
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushTokenRepository, "list_active_for_user",
                          lambda self, db, *, user_id: []):
            r = TestClient(app).delete(f"/push/tokens/{uuid.uuid4()}")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Token not found" in r.json()["detail"]


def test_push_tokens_delete_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).delete(f"/push/tokens/{uuid.uuid4()}")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_push_tokens_delete_invalid_uuid_422(monkeypatch):
    """Pydantic should reject malformed UUIDs before hitting handler."""
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushTokenRepository, "__init__", lambda self: None)

    app = _push_app()
    _override_db(app)
    try:
        r = TestClient(app).delete("/push/tokens/not-a-uuid")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422


# ===========================================================================
# /users/intake/basic  (POST) — the only route in users.py not yet covered.
# ===========================================================================
def test_users_intake_basic_runs_full_pipeline(monkeypatch):
    created_user = _user(version=1)
    job = SimpleNamespace(id=uuid.uuid4())
    profile = SimpleNamespace(version_no=1)

    captured = {"intake_basic": None, "record_intake": 0,
                "bazi": 0, "workflow": 0}

    monkeypatch.setattr(UserService, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)
    monkeypatch.setattr(BaziService, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileWorkflowService, "__init__", lambda self: None)

    app = _users_app()
    _override_db(app)
    try:
        with patch.object(UserService, "intake_basic",
                          lambda self, db, payload: (
                              captured.__setitem__("intake_basic", payload)
                              or created_user)), \
             patch.object(IntakeService, "record_basic_intake",
                          lambda self, db, *, user_id, payload: (
                              captured.__setitem__("record_intake",
                                                   captured["record_intake"] + 1)
                              )), \
             patch.object(BaziService, "generate_from_user",
                          lambda self, db, *, user: (
                              captured.__setitem__("bazi",
                                                   captured["bazi"] + 1))), \
             patch.object(ProfileWorkflowService, "recompute",
                          lambda self, db, *, user, reason: (
                              captured.__setitem__("workflow",
                                                   captured["workflow"] + 1)
                              or (job, profile, None, {}))):
            r = TestClient(app).post("/users/intake/basic", json={
                "name": "张三",
                "gender": "male",
                "birthDatetime": "1990-01-01T00:00:00+00:00",
                "birthPlace": "北京",
            })
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["userId"] == str(created_user.id)
    assert body["accepted"] is True
    assert body["nextAction"] == "questionnaire"
    assert body["profileVersion"] == 1
    # Confirm full pipeline ran end-to-end
    assert captured["intake_basic"] is not None
    assert captured["record_intake"] == 1
    assert captured["bazi"] == 1
    assert captured["workflow"] == 1


def test_users_intake_basic_validates_missing_fields():
    """Pydantic validation should reject missing required fields (no DB hit)."""
    app = _users_app()
    _override_db(app)
    try:
        r = TestClient(app).post("/users/intake/basic", json={
            "name": "张三",
            # gender missing
            "birthDatetime": "1990-01-01T00:00:00+00:00",
            "birthPlace": "北京",
        })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422
