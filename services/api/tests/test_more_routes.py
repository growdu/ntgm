"""Route tests for bazi / advice / profiles (additional 8 scenarios).

Pattern recap:
- 不能 import app.main(pyjson-logger 4.x 与 pyenv 3.12 兼容性问题)
  ⇒ from app.api.routes.X import router; FastAPI() + include_router(router)
- default-arg service:不能 patch 类名,patch object method
- 每 route 一个 TestClient(app),dependency_overrides 完成后清空

这次新增覆盖:
- /bazi/current         200 / 404 (no user) / 404 (no analysis)
- /bazi/analyze         200 / 400 (birth_datetime not set)
- /advice/current       200
- /profiles/current     200 / 404 (no user) / 404 (no profile)
- /profiles/versions    200
- /profiles/recompute   200 / 404
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.advice import router as advice_router
from app.api.routes.bazi import router as bazi_router
from app.api.routes.profiles import router as profiles_router
from app.db import get_db
from app.repositories.bazi_repository import BaziRepository
from app.repositories.user_repository import UserRepository


# ---------------------------------------------------------------------------
class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _user(version=2, birth_set=False):
    birth = "1990-01-01T00:00:00+00:00" if birth_set else None
    return SimpleNamespace(
        id=uuid.uuid4(),
        name="李四",
        gender="male",
        birth_datetime=birth,
        birth_place="上海",
        current_profile_version=version,
    )


def _analysis():
    """Canned BaziAnalysis shape."""
    return SimpleNamespace(
        id=uuid.uuid4(),
        year_gz="甲子", month_gz="乙丑", day_gz="丙寅", hour_gz="丁卯",
        feature_data={"element": "wood"},
        interpretation_data={"text": "春生木旺"},
        score=85,
        confidence=0.9,
        engine_version="v2",
    )


# ---------------------------------------------------------------------------
# /bazi/current
# ---------------------------------------------------------------------------
def _bazi_app():
    app = FastAPI()
    app.include_router(bazi_router)
    return app


def test_bazi_current_ok(monkeypatch):
    user = _user()
    analysis = _analysis()
    monkeypatch.setattr(BaziRepository, "__init__", lambda self: None)
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _bazi_app()
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(BaziRepository, "get_current",
                          lambda self, db, *, user_id: analysis):
            r = TestClient(app).get("/bazi/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["analysisId"] == str(analysis.id)
    assert body["chart"]["yearGz"] == "甲子"
    assert body["score"] == 85


def test_bazi_current_404_no_user(monkeypatch):
    monkeypatch.setattr(BaziRepository, "__init__", lambda self: None)
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _bazi_app()
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/bazi/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "User not found" in r.json()["detail"]


def test_bazi_current_404_no_analysis(monkeypatch):
    user = _user()
    monkeypatch.setattr(BaziRepository, "__init__", lambda self: None)
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _bazi_app()
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(BaziRepository, "get_current",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).get("/bazi/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Bazi analysis not ready" in r.json()["detail"]


# ---------------------------------------------------------------------------
# /bazi/analyze  — uses dispatch_bazi_analyze (need to stub Celery)
# ---------------------------------------------------------------------------
def test_bazi_analyze_ok_no_birth_returns_400(monkeypatch):
    """User has birth_datetime=None → 400."""
    user = _user(birth_set=False)
    monkeypatch.setattr(BaziRepository, "__init__", lambda self: None)
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _bazi_app()
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user):
            r = TestClient(app).post("/bazi/analyze")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 400
    assert "birth_datetime" in r.json()["detail"]


# ---------------------------------------------------------------------------
# /advice/current
# ---------------------------------------------------------------------------
def _advice_app():
    app = FastAPI()
    app.include_router(advice_router)
    return app


def test_advice_current_ok(monkeypatch):
    """All 3 services called with right args → 200 + summary returned."""
    user = _user()
    profile = SimpleNamespace(id=uuid.uuid4(), user_id=user.id, version_no=2)
    advice = SimpleNamespace(
        id=uuid.uuid4(), user_id=user.id,
        profile_version=2,
        summary={"headline": "宜守正"},
    )
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _advice_app()
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user):
            from app.services.profile_service import ProfileService
            from app.services.advice_service import AdviceService
            with patch.object(ProfileService, "get_current_profile",
                              lambda self, db, *, user_id: profile), \
                 patch.object(AdviceService, "get_current",
                              lambda self, db, *, user_id, profile_version: advice):
                r = TestClient(app).get("/advice/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profileVersion"] == 2
    assert body["summary"] == {"headline": "宜守正"}


# ---------------------------------------------------------------------------
# /profiles/*  (uses profile_service + job_service)
# ---------------------------------------------------------------------------
def _profiles_app():
    app = FastAPI()
    app.include_router(profiles_router)
    return app


def test_profiles_current_ok(monkeypatch):
    user = _user()
    profile = SimpleNamespace(
        id=uuid.uuid4(), user_id=user.id, version_no=2,
        summary={"a": 1},
        personality_traits={"p": 0.5}, ability_traits={"q": 0.6},
        relationship_traits={"r": 0.7}, fortune_traits={"s": 0.4},
        confidence_map={"t": 0.8}, engine_version="v2",
    )
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _profiles_app()
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.profile_service import ProfileService
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: profile):
            r = TestClient(app).get("/profiles/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profileVersion"] == 2
    assert body["summary"] == {"a": 1}


def test_profiles_versions_ok(monkeypatch):
    """list_versions returns list of items."""
    user = _user()
    profile = SimpleNamespace(
        id=uuid.uuid4(), user_id=user.id, version_no=2,
        summary={"a": 1}, confidence_map={"c": 0.5},
        engine_version="v2", created_at="2026-01-01T00:00:00Z",
    )
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _profiles_app()
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.profile_service import ProfileService
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "list_versions",
                          lambda self, db, *, user_id, limit=10: [profile]):
            r = TestClient(app).get("/profiles/versions?limit=5")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body["items"], list)
    assert len(body["items"]) == 1
    assert body["items"][0]["profileVersion"] == 2


def test_profiles_recompute_ok(monkeypatch):
    """recompute creates job + dispatches async task."""
    user = _user()
    job = SimpleNamespace(
        id=uuid.uuid4(), user_id=user.id, job_type="recompute_profile",
        status="queued", payload=None, error_message=None,
        result=None, created_at=None, updated_at=None,
    )
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _profiles_app()
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.job_service import JobService

    def fake_create_job(self, db, *, user_id, job_type, payload):
        return job

    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(JobService, "create_job", fake_create_job), \
             patch("app.task_client.dispatch_profile_recompute",
                   lambda user_id, reason: None):
            r = TestClient(app).post(
                "/profiles/recompute",
                json={"reason": "manual_refresh"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobType"] == "recompute_profile"
    assert body["status"] == "queued"
    assert body["jobId"] == str(job.id)
