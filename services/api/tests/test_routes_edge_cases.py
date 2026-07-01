"""Final edge-case tests pushing routes coverage 92% → ~98%.

Targets (per coverage report):
- advice.py 24/28/32/56     : current 404 no-user already covered; advice not
                              ready x2 + regenerate profile not ready
- archive.py 29, 61-66     : timeline 404 + changes 200/404
- bazi.py 53, 59-70        : POST /bazi/analyze 404 no-user + happy path
- health.py 43-45, 56-65   : redis error path + minio fallback paths
- intake.py 22             : 404 no-user
- matches.py 22, 26        : 404 no-user + 404 no-profile
- profiles.py 27, 31, 56, 83, 112 : 404 profile not ready / version not found / 404 no-user (recompute)
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.advice import router as advice_router
from app.api.routes.archive import router as archive_router
from app.api.routes.bazi import router as bazi_router
from app.api.routes.health import router as health_router
from app.api.routes.intake import router as intake_router
from app.api.routes.matches import router as matches_router
from app.api.routes.profiles import router as profiles_router
from app.db import get_db
from app.repositories.user_repository import UserRepository
from app.services.advice_service import AdviceService
from app.services.archive_service import ArchiveService
from app.services.bazi_service import BaziService
from app.services.intake_service import IntakeService
from app.services.job_service import JobService
from app.services.match_service import MatchService
from app.services.profile_change_service import ProfileChangeService
from app.services.profile_service import ProfileService


# ===========================================================================
# Shared helpers
# ===========================================================================
class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _user(birth_datetime=None):
    return SimpleNamespace(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime=birth_datetime, birth_place="北京",
        current_profile_version=2,
    )


def _profile():
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        version_no=2,
        summary={"text": "ok"},
        personality_traits={}, ability_traits={},
        relationship_traits={}, fortune_traits={},
        confidence_map={}, engine_version="v2",
        created_at=None,
    )


def _app(router):
    app = FastAPI(); app.include_router(router); return app


def _override_db(app):
    app.dependency_overrides[get_db] = _fake_get_db


# ===========================================================================
# advice edge cases
# ===========================================================================
def test_advice_current_404_no_user(monkeypatch):
    """Direct 404 path for /advice/current when get_current_user returns None."""
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    monkeypatch.setattr(AdviceService, "__init__", lambda self: None)
    app = _app(advice_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/advice/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "User not found" in r.json()["detail"]


def test_advice_current_404_advice_not_ready_no_user(monkeypatch):
    """Profile service returns None (no profile yet)."""
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    monkeypatch.setattr(AdviceService, "__init__", lambda self: None)
    app = _app(advice_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).get("/advice/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Advice not ready" in r.json()["detail"]


def test_advice_current_404_no_advice_for_profile(monkeypatch):
    """Profile exists but advice_service.get_current returns None."""
    user = _user()
    profile = _profile()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    monkeypatch.setattr(AdviceService, "__init__", lambda self: None)
    app = _app(advice_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: profile), \
             patch.object(AdviceService, "get_current",
                          lambda self, db, *, user_id, profile_version: None):
            r = TestClient(app).get("/advice/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Advice not ready" in r.json()["detail"]


def test_advice_regenerate_404_no_profile(monkeypatch):
    """regenerate 路径 — profile is None -> 404 Profile not ready."""
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(advice_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).post("/advice/regenerate")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Profile not ready" in r.json()["detail"]


def test_advice_feedback_404_profile_not_ready(monkeypatch):
    """feedback 路径 — profile is None -> 404 Profile not found (line 92)."""
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(advice_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).post("/advice/feedback",
                                      json={"feedbackType": "useful"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Profile not found" in r.json()["detail"]


# ===========================================================================
# archive edge cases
# ===========================================================================
def test_archive_timeline_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ArchiveService, "__init__", lambda self: None)
    app = _app(archive_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/archive/timeline")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_archive_changes_ok(monkeypatch):
    user = _user()
    changes = [
        SimpleNamespace(
            id=uuid.uuid4(),
            from_version=1, to_version=2,
            changed_dimensions={"personality": ["career"]},
            reason_summary={"text": "answer recorded"},
            created_at="2024-01-01",
        ),
    ]
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileChangeService, "__init__", lambda self: None)
    app = _app(archive_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileChangeService, "list_recent_changes",
                          lambda self, db, *, user_id, limit=10: changes):
            r = TestClient(app).get("/archive/changes")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["fromVersion"] == 1
    assert items[0]["toVersion"] == 2
    assert items[0]["changedDimensions"] == {"personality": ["career"]}


def test_archive_changes_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileChangeService, "__init__", lambda self: None)
    app = _app(archive_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/archive/changes")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# bazi edge case — POST /bazi/analyze
# ===========================================================================
def test_bazi_analyze_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(JobService, "__init__", lambda self: None)
    app = _app(bazi_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).post("/bazi/analyze")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_bazi_analyze_ok(monkeypatch):
    """Full happy path through JobService.create_job + dispatch_bazi_analyze."""
    user = _user(birth_datetime="1990-01-01T00:00:00+00:00")
    job = SimpleNamespace(
        id=uuid.uuid4(), job_type="bazi_analyze", status="queued"
    )
    dispatched = []
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(JobService, "__init__", lambda self: None)

    app = _app(bazi_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(JobService, "create_job",
                          lambda self, db, *, user_id, job_type, payload: (
                              dispatched.append({"call": "create_job",
                                                 "job_type": job_type,
                                                 "payload": payload})
                              or job)), \
             patch("app.task_client.dispatch_bazi_analyze",
                  lambda uid: dispatched.append({"call": "dispatch", "uid": uid})):
            r = TestClient(app).post("/bazi/analyze")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobId"] == str(job.id)
    assert body["jobType"] == "bazi_analyze"
    assert body["status"] == "queued"
    # Verify both create_job AND dispatch_bazi_analyze fired
    calls = [d["call"] for d in dispatched]
    assert "create_job" in calls
    assert "dispatch" in calls


# ===========================================================================
# health edge paths (redis-error + storage-error)
# ===========================================================================
def test_health_redis_error(monkeypatch):
    """Redis import or ping fails -> redis = error, all_ok=false."""
    fake_conn = MagicMock()
    fake_conn.execute.return_value = None

    class _CtxMgr:
        def __enter__(self_inner): return fake_conn
        def __exit__(self_inner, *a): return False
    fake_engine = MagicMock(); fake_engine.connect.return_value = _CtxMgr()

    # First call to Redis.from_url succeeds but ping raises
    def boom(url, **kw):
        m = MagicMock()
        m.ping.side_effect = Exception("redis down")
        return m

    class FakeRedis:
        from_url = staticmethod(boom)

    # HEAD to storage works (s3 ok), so only redis is degraded
    fake_200 = SimpleNamespace(status_code=200)

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", fake_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head", lambda url, timeout=3: fake_200)

    r = TestClient(_app(health_router)).get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is False
    assert body["data"]["status"] == "degraded"
    assert "error" in body["data"]["checks"]["redis"]
    # DB+storage should be ok
    assert body["data"]["checks"]["database"] == "ok"
    assert body["data"]["checks"]["objectStorage"] == "ok"


def test_health_storage_falls_back_to_get(monkeypatch):
    """HEAD non-200, GET 200/403 -> ok via fallback path (line 56-65)."""
    fake_conn = MagicMock()
    fake_conn.execute.return_value = None

    class _CtxMgr:
        def __enter__(self_inner): return fake_conn
        def __exit__(self_inner, *a): return False
    fake_engine = MagicMock(); fake_engine.connect.return_value = _CtxMgr()

    class FakeRedis:
        @staticmethod
        def from_url(url, **kw):
            return MagicMock(ping=MagicMock(return_value=True))

    # Make HEAD raise so route falls through to GET (line 56-65 fallback)
    def raise_head(url, timeout=3):
        raise Exception("HEAD not allowed on this bucket")
    get_200 = SimpleNamespace(status_code=200)

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", fake_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head", raise_head)
    monkeypatch.setattr("httpx.get", lambda url, timeout=3: get_200)

    r = TestClient(_app(health_router)).get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True, body
    assert body["data"]["checks"]["objectStorage"] == "ok"


def test_health_storage_fallback_403(monkeypatch):
    """HEAD 抛异常 + GET 403 -> ok (some buckets allow GET but not HEAD)."""
    fake_conn = MagicMock()
    fake_conn.execute.return_value = None

    class _CtxMgr:
        def __enter__(self_inner): return fake_conn
        def __exit__(self_inner, *a): return False
    fake_engine = MagicMock(); fake_engine.connect.return_value = _CtxMgr()

    class FakeRedis:
        @staticmethod
        def from_url(url, **kw):
            return MagicMock(ping=MagicMock(return_value=True))

    def raise_head(url, timeout=3):
        raise Exception("HEAD not allowed")

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", fake_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head", raise_head)
    monkeypatch.setattr("httpx.get",
                        lambda url, timeout=3: SimpleNamespace(status_code=403))

    r = TestClient(_app(health_router)).get("/ready")
    body = r.json()
    assert body["data"]["checks"]["objectStorage"] == "ok"


def test_health_storage_both_fail(monkeypatch):
    """HEAD raise + GET raise -> storage 'error' and degraded."""
    fake_conn = MagicMock(); fake_conn.execute.return_value = None
    class _CtxMgr:
        def __enter__(self_inner): return fake_conn
        def __exit__(self_inner, *a): return False
    fake_engine = MagicMock(); fake_engine.connect.return_value = _CtxMgr()

    class FakeRedis:
        @staticmethod
        def from_url(url, **kw):
            return MagicMock(ping=MagicMock(return_value=True))

    def raise_head(url, timeout=3):
        raise Exception("head conn refused")
    def raise_get(url, timeout=3):
        raise Exception("get conn refused")

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", fake_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head", raise_head)
    monkeypatch.setattr("httpx.get", raise_get)

    r = TestClient(_app(health_router)).get("/ready")
    body = r.json()
    assert body["success"] is False
    assert body["data"]["status"] == "degraded"
    assert "error" in body["data"]["checks"]["objectStorage"]
    # db+redis ok
    assert body["data"]["checks"]["database"] == "ok"
    assert body["data"]["checks"]["redis"] == "ok"


# ===========================================================================
# intake 404 no-user
# ===========================================================================
def test_intake_records_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(IntakeService, "__init__", lambda self: None)
    app = _app(intake_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/intake/records")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# matches edge cases
# ===========================================================================
def test_matches_current_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _app(matches_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/matches/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_matches_current_404_no_profile(monkeypatch):
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(matches_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).get("/matches/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Match not ready" in r.json()["detail"]


# ===========================================================================
# profiles edge cases — 404 no_profile for /current + recompute 404 no_user
# ===========================================================================
def test_profiles_current_404_no_profile(monkeypatch):
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(profiles_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).get("/profiles/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Profile not ready" in r.json()["detail"]


def test_profiles_current_404_no_user(monkeypatch):
    """/profiles/current line 27 raise 'User not found'."""
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(profiles_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/profiles/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "User not found" in r.json()["detail"]


def test_profiles_versions_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _app(profiles_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/profiles/versions")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_profiles_version_by_no_404_no_user(monkeypatch):
    """Path /profiles/versions/{no} 404 when no user (line 83)."""
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _app(profiles_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).get("/profiles/versions/3")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_profiles_recompute_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(JobService, "__init__", lambda self: None)
    app = _app(profiles_router); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: None):
            r = TestClient(app).post("/profiles/recompute",
                                      json={"reason": "test"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
