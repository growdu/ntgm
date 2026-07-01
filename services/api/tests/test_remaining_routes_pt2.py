"""Routes tests for the remaining 6 files — push routes coverage 75% → ~85%.

Targets:
- /health, /ready                    health.py (0% → 100%)
- /profiles/versions/{no}            profiles.py (74% → 100%)
- /questionnaire/reset               questionnaire (73% → 100%)
- /questionnaire/answers             POST 200 + 404 no user
- /advice/regenerate                 advice.py (59% → 100%)
- /advice/feedback                   POST 200 + 404 cases
- /assets/upload-token               assets.py (58% → 100%)
- /users/intake/images               face (dispatch_face_analyze) + palm branches
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.advice import router as advice_router
from app.api.routes.assets import router as assets_router
from app.api.routes.health import router as health_router
from app.api.routes.profiles import router as profiles_router
from app.api.routes.questionnaire import router as questionnaire_router
from app.db import get_db
from app.repositories.user_repository import UserRepository
from app.services.advice_service import AdviceService
from app.services.asset_service import AssetService
from app.services.job_service import JobService
from app.services.match_service import MatchService
from app.services.profile_service import ProfileService
from app.services.profile_workflow_service import ProfileWorkflowService
from app.services.questionnaire_service import QuestionnaireService
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


def _user():
    return SimpleNamespace(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime=None, birth_place="北京",
        current_profile_version=2,
    )


def _profile(version=2):
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        version_no=version,
        summary={"text": "沉稳有静气"},
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
# /health, /ready
# ===========================================================================
def _health_app():
    app = FastAPI(); app.include_router(health_router); return app


def test_health_ok():
    """Simple liveness probe — no DB, no deps."""
    r = TestClient(_health_app()).get("/health")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_ready_all_ok(monkeypatch):
    """All three deps (db/redis/storage) healthy -> ready."""
    # Fake DB engine via app.db (the route imports it lazily inside the fn)
    fake_conn = MagicMock()
    fake_conn.execute.return_value = None

    class _CtxMgr:
        def __enter__(self_inner): return fake_conn
        def __exit__(self_inner, *a): return False

    fake_engine = MagicMock()
    fake_engine.connect.return_value = _CtxMgr()

    class FakeRedis:
        @staticmethod
        def from_url(url, **kw):
            return MagicMock(ping=MagicMock(return_value=True))

    fake_response_ok = SimpleNamespace(status_code=200)

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", fake_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head",
                        lambda url, timeout=3: fake_response_ok)

    r = TestClient(_health_app()).get("/ready")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ready"
    assert body["data"]["checks"]["database"] == "ok"
    assert body["data"]["checks"]["redis"] == "ok"
    assert body["data"]["checks"]["objectStorage"] == "ok"


def test_ready_database_down_marks_degraded(monkeypatch):
    """DB connection failure -> not all_ok, status: degraded."""
    class _ExplodingCtx:
        def __enter__(self_inner):
            raise Exception("conn refused")
        def __exit__(self_inner, *a): return False

    broken_engine = MagicMock()
    broken_engine.connect.return_value = _ExplodingCtx()

    class FakeRedis:
        @staticmethod
        def from_url(url, **kw):
            return MagicMock(ping=MagicMock(return_value=True))

    fake_200 = SimpleNamespace(status_code=200)

    import app.db as app_db
    monkeypatch.setattr(app_db, "engine", broken_engine)
    import app.core.config as app_config
    monkeypatch.setattr(app_config, "get_settings",
                        lambda: SimpleNamespace(
                            redis_url="redis://localhost:6379/0",
                            s3_endpoint="http://localhost:9000",
                        ))
    monkeypatch.setattr("redis.Redis", FakeRedis)
    monkeypatch.setattr("httpx.head", lambda url, timeout=3: fake_200)

    r = TestClient(_health_app()).get("/ready")
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is False
    assert body["data"]["status"] == "degraded"
    assert "error" in body["data"]["checks"]["database"]
    assert body["data"]["checks"]["redis"] == "ok"


# ===========================================================================
# /profiles/versions/{no}
# ===========================================================================
def _profiles_app():
    app = FastAPI(); app.include_router(profiles_router); return app


def test_profiles_get_specific_version_ok(monkeypatch):
    user = _user()
    profile = _profile(version=5)
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)

    app = _profiles_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ProfileService, "get_profile_by_version",
                          lambda self, db, *, user_id, version_no: profile):
            r = TestClient(app).get("/profiles/versions/5")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profileVersion"] == 5


def test_profiles_get_specific_version_404(monkeypatch):
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)

    app = _profiles_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ProfileService, "get_profile_by_version",
                          lambda self, db, *, user_id, version_no: None):
            r = TestClient(app).get("/profiles/versions/99")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Profile version not found" in r.json()["detail"]


# ===========================================================================
# /questionnaire/reset + /questionnaire/answers (POST)
# ===========================================================================
def _questionnaire_app():
    app = FastAPI(); app.include_router(questionnaire_router); return app


def test_questionnaire_reset_204(monkeypatch):
    monkeypatch.setattr(QuestionnaireService, "__init__", lambda self: None)
    resets = []
    app = _questionnaire_app()
    try:
        with patch.object(QuestionnaireService, "reset_progress",
                          lambda self: resets.append(True)):
            r = TestClient(app).post("/questionnaire/reset")
    finally: pass
    assert r.status_code == 204
    assert resets == [True]


def test_questionnaire_answers_ok(monkeypatch):
    user = _user()
    job = SimpleNamespace(id=uuid.uuid4())
    profile = _profile(version=3)
    saved = []
    captured = []  # for reason
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(QuestionnaireService, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileWorkflowService, "__init__", lambda self: None)

    app = _questionnaire_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(QuestionnaireService, "save_answers",
                          lambda self, db, *, user_id, payload: saved.append(payload)), \
             patch.object(ProfileWorkflowService, "recompute",
                          lambda self, db, *, user, reason: (
                              captured.append(reason), (job, profile, None, {}))[1]):
            r = TestClient(app).post("/questionnaire/answers", json={
                "answers": [{"questionId": "q1", "value": "A"}],
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    assert saved, "save_answers should have been called"
    body = r.json()
    assert body["jobId"] == str(job.id)
    assert body["profileVersion"] == 3
    assert captured == ["questionnaire_answers"]


def test_questionnaire_answers_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _questionnaire_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/questionnaire/answers", json={
                "answers": [],
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


# ===========================================================================
# /advice/regenerate + /advice/feedback
# ===========================================================================
def _advice_app():
    app = FastAPI(); app.include_router(advice_router); return app


def test_advice_regenerate_ok(monkeypatch):
    user = _user()
    profile = _profile()
    match_resp = SimpleNamespace(score=0.8, summary="契合")
    advice = SimpleNamespace(
        id=uuid.uuid4(), profile_version=2, summary={"today": "宜静"}
    )
    captured = {"match_called": 0, "gen_called": 0}

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    monkeypatch.setattr(MatchService, "__init__", lambda self: None)
    monkeypatch.setattr(AdviceService, "__init__", lambda self: None)

    app = _advice_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: profile), \
             patch.object(MatchService, "get_current_match",
                          lambda self, db, *, user_id, profile: (
                              captured.__setitem__("match_called",
                                                   captured["match_called"] + 1)
                              or match_resp)), \
             patch.object(AdviceService, "generate_and_store",
                          lambda self, db, *, user_id, profile, match_response: (
                              captured.__setitem__("gen_called",
                                                   captured["gen_called"] + 1)
                              or advice)):
            r = TestClient(app).post("/advice/regenerate")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["adviceId"] == str(advice.id)
    assert body["summary"] == {"today": "宜静"}
    assert captured["match_called"] == 1
    assert captured["gen_called"] == 1


def test_advice_regenerate_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _advice_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/advice/regenerate")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_advice_feedback_ok(monkeypatch):
    user = _user()
    profile = _profile()
    captured = {}
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    monkeypatch.setattr(AdviceService, "__init__", lambda self: None)

    app = _advice_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: profile), \
             patch.object(AdviceService, "update_execution_feedback",
                          lambda self, db, *, user_id, profile_version,
                                 feedback_type, feedback_text=None,
                                 advice_item_id=None: (
                              captured.update(profile_version=profile_version,
                                              feedback_type=feedback_type,
                                              feedback_text=feedback_text,
                                              advice_item_id=advice_item_id)
                              or {"accepted": True})):
            r = TestClient(app).post("/advice/feedback", json={
                "feedbackType": "useful",
                "feedbackText": "帮我做决定",
                "adviceItemId": "adv-1",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    assert captured["feedback_type"] == "useful"
    assert captured["feedback_text"] == "帮我做决定"
    assert captured["advice_item_id"] == "adv-1"


def test_advice_feedback_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _advice_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/advice/feedback", json={
                "feedbackType": "useful",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404


def test_advice_feedback_404_no_profile(monkeypatch):
    user = _user()
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(ProfileService, "__init__", lambda self: None)
    app = _advice_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: None):
            r = TestClient(app).post("/advice/feedback", json={
                "feedbackType": "useful",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Profile not found" in r.json()["detail"]


# ===========================================================================
# /assets/upload-token + /users/intake/images
# ===========================================================================
def _assets_app():
    app = FastAPI(); app.include_router(assets_router); return app


def test_assets_upload_token_ok(monkeypatch):
    monkeypatch.setattr(AssetService, "__init__", lambda self: None)

    captured = {}
    def fake_create(self, payload):
        captured["file_name"] = payload.fileName
        captured["content_type"] = payload.contentType
        captured["asset_type"] = payload.assetType
        return {
            "uploadUrl": "http://localhost:9000/bucket/abc?token=xyz",
            "storageKey": "uploads/abc",
        }

    app = _assets_app()
    try:
        with patch.object(AssetService, "create_upload_token", fake_create):
            r = TestClient(app).post("/assets/upload-token", json={
                "fileName": "face.jpg",
                "contentType": "image/jpeg",
                "assetType": "face",
            })
    finally: pass
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["storageKey"] == "uploads/abc"
    assert body["uploadUrl"].startswith("http://")
    assert captured["file_name"] == "face.jpg"
    assert captured["asset_type"] == "face"


def test_assets_intake_images_face_dispatches_async(monkeypatch):
    """assetType=face -> create_job('analyze_face') + dispatch_face_analyze."""
    user = _user()
    asset = SimpleNamespace(id=uuid.uuid4())
    jobs = []
    dispatched = []

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(AssetService, "__init__", lambda self: None)
    monkeypatch.setattr(JobService, "__init__", lambda self: None)

    app = _assets_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(AssetService, "register_uploaded_asset",
                          lambda self, db, *, user_id, payload: asset), \
             patch.object(JobService, "create_job",
                          lambda self, db, *, user_id, job_type, payload: (
                              jobs.append({"job_type": job_type, "payload": payload})
                              or SimpleNamespace(id=uuid.uuid4(), job_type=job_type, status="queued"))), \
             patch("app.task_client.dispatch_face_analyze",
                  lambda uid, aid: dispatched.append((uid, aid))):
            r = TestClient(app).post("/users/intake/images", json={
                "storageKey": "uploads/face.jpg",
                "assetType": "face",
                "contentType": "image/jpeg",
            })
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["assetId"] == str(asset.id)
    assert body["jobType"] == "analyze_face"
    assert len(jobs) == 1
    assert jobs[0]["job_type"] == "analyze_face"
    assert str(asset.id) in jobs[0]["payload"]["imageAssetId"]
    assert len(dispatched) == 1


def test_assets_intake_images_palm_skips_face_dispatch(monkeypatch):
    """assetType=palm -> no dispatch_face_analyze call."""
    user = _user()
    asset = SimpleNamespace(id=uuid.uuid4())
    dispatched = []

    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    monkeypatch.setattr(AssetService, "__init__", lambda self: None)
    monkeypatch.setattr(JobService, "__init__", lambda self: None)

    app = _assets_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: user), \
             patch.object(AssetService, "register_uploaded_asset",
                          lambda self, db, *, user_id, payload: asset), \
             patch.object(JobService, "create_job",
                          lambda self, db, *, user_id, job_type, payload: (
                              SimpleNamespace(id=uuid.uuid4(), job_type=job_type, status="queued"))), \
             patch("app.task_client.dispatch_face_analyze",
                  lambda uid, aid: dispatched.append((uid, aid))):
            r = TestClient(app).post("/users/intake/images", json={
                "storageKey": "uploads/palm.jpg",
                "assetType": "palm",
                "contentType": "image/jpeg",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    assert r.json()["jobType"] == "analyze_palm"
    assert dispatched == [], "palm should not trigger dispatch_face_analyze"


def test_assets_intake_images_404_no_user(monkeypatch):
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _assets_app(); _override_db(app)
    try:
        with patch.object(UserRepository, "get_first",
                          lambda self, db: None):
            r = TestClient(app).post("/users/intake/images", json={
                "storageKey": "uploads/face.jpg",
                "assetType": "face",
                "contentType": "image/jpeg",
            })
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
