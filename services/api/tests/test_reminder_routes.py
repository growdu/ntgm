"""Routes tests for /reminders — 6 routes, push coverage to ~75%.

- POST /reminders                       create 201
- GET  /reminders                       list 200
- POST /reminders/{rid}/dispatch        async 200 / 404 user / 404 reminder (ValueError -> 404)
- POST /reminders/dispatch-immediate    async 200
- GET  /reminders/jobs                  list 200
- POST /reminders/{rid}/read            204 / 404 user / 404 wrong owner

`dispatch_*` routes are async; FastAPI's TestClient runs them through an
anyio portal automatically (we don't need httpx AsyncClient).
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.reminders import router as reminders_router
from app.db import get_db
from app.repositories.reminder_repository import ReminderRepository
from app.repositories.user_repository import UserRepository
from app.services.push_service import PushService


class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _user():
    return SimpleNamespace(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime=None, birth_place="北京",
        current_profile_version=1,
    )


def _reminder(user_id, **overrides):
    base = dict(
        id=uuid.uuid4(),
        user_id=user_id,
        title="提醒",
        body="今宜静坐",
        trigger_at="2024-06-01T08:00:00+00:00",
        status="pending",
        channel="push",
        read=False,
        sent_at=None,
        failure_reason=None,
        created_at="2024-05-31T20:00:00",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _job(user_id, **overrides):
    base = dict(
        id=uuid.uuid4(),
        reminder_id=uuid.uuid4(),
        user_id=user_id,
        job_type="reminder_dispatch",
        status="completed",
        target_token_count=2,
        success_count=2,
        failure_count=0,
        error_message=None,
        result={"tickets": [{"status": "ok"}, {"status": "ok"}]},
        created_at="2024-05-31T20:00:00",
        updated_at="2024-05-31T20:00:01",
    )
    base.update(overrides)
    return SimpleNamespace(**base)


def _settings_stub(dry_run=True):
    return SimpleNamespace(push_dry_run=dry_run)


def _app():
    app = FastAPI(); app.include_router(reminders_router); return app


def _override_db(app):
    app.dependency_overrides[get_db] = _fake_get_db


# ===========================================================================
# POST /reminders
# ===========================================================================
def test_reminders_post_creates_record(monkeypatch):
    user = _user()
    rec = _reminder(user.id)
    captured = {}

    def fake_create(self, db, *, user_id, title, body, trigger_at,
                    channel="push", meta=None):
        captured.update(user_id=str(user_id), title=title, body=body,
                        trigger_at=trigger_at, channel=channel, meta=meta)
        return rec

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ReminderRepository, "create", fake_create):
            r = TestClient(app).post("/reminders", json={
                "title": "提醒",
                "body": "今宜静坐",
                "triggerAt": "2024-06-01T08:00:00+00:00",
                "channel": "push",
                "meta": {"source": "test"},
            })
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 201, r.text
    body = r.json()
    assert body["reminderId"] == str(rec.id)
    assert body["status"] == "pending"
    assert body["read"] is False
    assert captured["user_id"] == str(user.id)
    assert captured["title"] == "提醒"
    # trigger_at parsed by pydantic into a datetime — check type, not str
    import datetime
    assert isinstance(captured["trigger_at"], datetime.datetime)
    assert captured["trigger_at"].year == 2024
    assert captured["channel"] == "push"
    assert captured["meta"] == {"source": "test"}


def test_reminders_post_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/reminders", json={
                "title": "提醒",
                "body": "今宜静坐",
                "triggerAt": "2024-06-01T08:00:00+00:00",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# GET /reminders
# ===========================================================================
def test_reminders_get_lists_mine(monkeypatch):
    user = _user()
    items = [_reminder(user.id, title="甲"), _reminder(user.id, title="乙", status="sent", read=True)]

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app()
    _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ReminderRepository, "list_for_user",
                          lambda self, db, *, user_id, limit=50: items):
            r = TestClient(app).get("/reminders")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    reminders = r.json()["reminders"]
    assert len(reminders) == 2
    assert reminders[0]["title"] == "甲"
    assert reminders[1]["status"] == "sent"


def test_reminders_get_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)
    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).get("/reminders")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# POST /reminders/{rid}/dispatch  (ASYNC)
# ===========================================================================
def test_reminders_dispatch_success(monkeypatch):
    user = _user()
    reminder_id = uuid.uuid4()
    reminder = _reminder(user.id, id=reminder_id)
    job = _job(user.id, reminder_id=reminder_id)

    async def fake_dispatch_reminder(self, db, *, settings, reminder_id):
        return job, reminder

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        from app.core.config import get_settings
        app.dependency_overrides[get_settings] = lambda: _settings_stub(dry_run=True)
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushService, "dispatch_reminder",
                          fake_dispatch_reminder):
            r = TestClient(app).post(f"/reminders/{reminder_id}/dispatch")
    finally:
        app.dependency_overrides.clear()
        try:
            from app.core.config import get_settings
            app.dependency_overrides.pop(get_settings, None)
        except Exception:
            pass

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobId"] == str(job.id)
    assert body["targetTokenCount"] == 2
    assert body["successCount"] == 2
    assert body["failureCount"] == 0
    assert body["dryRun"] is True
    assert len(body["details"]) == 2


def test_reminders_dispatch_value_error_returns_404(monkeypatch):
    """Service raises ValueError (e.g. reminder not found) -> 404."""
    user = _user()

    async def fake_dispatch_reminder(self, db, *, settings, reminder_id):
        raise ValueError("Reminder not found in DB")

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        from app.core.config import get_settings
        app.dependency_overrides[get_settings] = lambda: _settings_stub()
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushService, "dispatch_reminder",
                          fake_dispatch_reminder):
            r = TestClient(app).post(f"/reminders/{uuid.uuid4()}/dispatch")
    finally:
        app.dependency_overrides.clear()
        try:
            from app.core.config import get_settings
            app.dependency_overrides.pop(get_settings, None)
        except Exception:
            pass

    assert r.status_code == 404
    assert "Reminder not found" in r.json()["detail"]


def test_reminders_dispatch_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        from app.core.config import get_settings
        app.dependency_overrides[get_settings] = lambda: _settings_stub()
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post(f"/reminders/{uuid.uuid4()}/dispatch")
    finally:
        app.dependency_overrides.clear()
        try:
            from app.core.config import get_settings
            app.dependency_overrides.pop(get_settings, None)
        except Exception:
            pass
    assert r.status_code == 404


# ===========================================================================
# POST /reminders/dispatch-immediate  (ASYNC)
# ===========================================================================
def test_reminders_dispatch_immediate(monkeypatch):
    user = _user()
    job = _job(user.id, job_type="immediate",
               result={"tickets": [{"status": "ok"}]},
               target_token_count=1, success_count=1)

    async def fake_dispatch_immediate(self, db, *, settings, user_id,
                                       title, body, data=None, channel="push"):
        assert str(user_id) == str(user.id)
        assert title == "速推"
        assert body == "今时宜动"
        assert channel == "inapp"
        return job

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        from app.core.config import get_settings
        app.dependency_overrides[get_settings] = lambda: _settings_stub(dry_run=False)
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushService, "dispatch_immediate",
                          fake_dispatch_immediate):
            r = TestClient(app).post("/reminders/dispatch-immediate", json={
                "title": "速推",
                "body": "今时宜动",
                "data": {"k": "v"},
                "channel": "inapp",
            })
    finally:
        app.dependency_overrides.clear()
        try:
            from app.core.config import get_settings
            app.dependency_overrides.pop(get_settings, None)
        except Exception:
            pass

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobId"] == str(job.id)
    assert body["dryRun"] is False
    assert body["targetTokenCount"] == 1


def test_reminders_dispatch_immediate_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)
    app = _app(); _override_db(app)
    try:
        from app.core.config import get_settings
        app.dependency_overrides[get_settings] = lambda: _settings_stub()
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/reminders/dispatch-immediate", json={
                "title": "速推",
                "body": "今时宜动",
            })
    finally:
        app.dependency_overrides.clear()
        try:
            from app.core.config import get_settings
            app.dependency_overrides.pop(get_settings, None)
        except Exception:
            pass
    assert r.status_code == 404


# ===========================================================================
# GET /reminders/jobs
# ===========================================================================
def test_reminders_jobs_lists(monkeypatch):
    user = _user()
    jobs = [_job(user.id), _job(user.id, job_type="immediate",
                                  status="completed", result={"tickets": []})]

    # Patch the jobs repo *at class level*. `PushService.__init__` runs
    # without args (creates real repo instances bound to the class), then
    # the route calls `push.jobs.list_for_user(...)` which routes through
    # our patched class method.
    from app.repositories.push_dispatch_job_repository import (
        PushDispatchJobRepository,
    )

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    # Make sure any PushDispatchJobRepository() construction is safe.
    # (no explicit __init__ — falls back to object.__init__)

    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(PushDispatchJobRepository, "list_for_user",
                          lambda self, db, *, user_id, limit=50: jobs):
            r = TestClient(app).get("/reminders/jobs")
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["jobs"]) == 2
    assert body["jobs"][0]["jobType"] == "reminder_dispatch"
    assert body["jobs"][1]["targetTokenCount"] == 2


def test_reminders_jobs_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(PushService, "__init__", lambda self: None)
    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).get("/reminders/jobs")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# POST /reminders/{rid}/read
# ===========================================================================
def test_reminders_mark_read_success(monkeypatch):
    user = _user()
    rid = uuid.uuid4()
    reminder = _reminder(user.id, id=rid)
    reads = []

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ReminderRepository, "get",
                          lambda self, db, *, reminder_id: reminder), \
             patch.object(ReminderRepository, "mark_read",
                          lambda self, db, *, reminder: reads.append(reminder.id)):
            r = TestClient(app).post(f"/reminders/{rid}/read")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 204
    assert reads == [rid]


def test_reminders_mark_read_404_wrong_owner(monkeypatch):
    """Reminder exists but belongs to a different user -> 404."""
    me = _user()
    other_user = _user()
    rid = uuid.uuid4()
    reminder = _reminder(other_user.id, id=rid)  # different user_id

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: me), \
             patch.object(ReminderRepository, "get",
                          lambda self, db, *, reminder_id: reminder):
            r = TestClient(app).post(f"/reminders/{rid}/read")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Reminder not found" in r.json()["detail"]


def test_reminders_mark_read_404_no_reminder(monkeypatch):
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)

    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ReminderRepository, "get",
                          lambda self, db, *, reminder_id: None):
            r = TestClient(app).post(f"/reminders/{uuid.uuid4()}/read")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_reminders_mark_read_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ReminderRepository, "__init__", lambda self: None)
    app = _app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post(f"/reminders/{uuid.uuid4()}/read")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
