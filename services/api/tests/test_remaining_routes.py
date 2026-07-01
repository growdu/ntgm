"""Final routes test batch — 8 happy-path tests across remaining route files.

Focus: cover routes still at 0% with minimal but real assertions. Pattern
identical to test_more_routes / test_push_e2e.

Routes covered (1 happy test each, plus 1-2 error cases):
  - /jobs/{job_id}         get_job
  - /assets/upload-token   create_upload_token (no DB)
  - /matches/current       3-service chain
  - /questionnaire/next    +  /questionnaire/progress  (pure compute)
  - /archive/timeline      ArchiveService.build_timeline
  - /intake/records        IntakeService.list_records
"""
from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.jobs import router as jobs_router
from app.api.routes.assets import router as assets_router
from app.api.routes.matches import router as matches_router
from app.api.routes.questionnaire import router as questionnaire_router
from app.api.routes.archive import router as archive_router
from app.api.routes.intake import router as intake_router
from app.db import get_db
from app.repositories.user_repository import UserRepository


class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _app(*routers):
    app = FastAPI()
    for r in routers:
        app.include_router(r)
    return app


def _user(version=2):
    return SimpleNamespace(
        id=uuid.uuid4(), name="李四", gender="male",
        birth_datetime=None, birth_place="上海",
        current_profile_version=version,
    )


# ---------------------------------------------------------------------------
# /jobs/{job_id}
# ---------------------------------------------------------------------------
def test_jobs_get_ok(monkeypatch):
    job = SimpleNamespace(
        id=uuid.uuid4(), job_type="recompute_profile", status="completed",
        payload={"reason": "x"}, result={"score": 0.9},
        error_message=None, created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-01T00:01:00Z",
    )
    from app.services.job_service import JobService
    app = _app(jobs_router)
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(JobService, "get_job",
                          lambda self, db, *, job_id: job):
            r = TestClient(app).get(f"/jobs/{job.id}")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobType"] == "recompute_profile"
    assert body["status"] == "completed"
    assert body["result"] == {"score": 0.9}


def test_jobs_get_404(monkeypatch):
    from app.services.job_service import JobService
    app = _app(jobs_router)
    app.dependency_overrides[get_db] = _fake_get_db
    try:
        with patch.object(JobService, "get_job",
                          lambda self, db, *, job_id: None):
            r = TestClient(app).get(f"/jobs/{uuid.uuid4()}")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 404
    assert "Job not found" in r.json()["detail"]


# ---------------------------------------------------------------------------
# /assets/upload-token  — no DB, no user, just AssetService.create_upload_token
# ---------------------------------------------------------------------------
def test_assets_upload_token_ok(monkeypatch):
    fake_token = {
        "uploadUrl": "https://s3.example.com/upload?token=xyz",
        "storageKey": "uploads/2026/07/abc.png",
    }
    from app.services.asset_service import AssetService
    app = _app(assets_router)
    try:
        with patch.object(AssetService, "create_upload_token",
                          lambda self, payload: fake_token):
            r = TestClient(app).post(
                "/assets/upload-token",
                json={"fileName": "abc.png", "contentType": "image/png", "assetType": "face"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["storageKey"] == "uploads/2026/07/abc.png"
    assert body["uploadUrl"].startswith("https://")


# ---------------------------------------------------------------------------
# /matches/current  — 3-service chain
# ---------------------------------------------------------------------------
def test_matches_current_ok(monkeypatch):
    user = _user()
    profile = SimpleNamespace(
        id=uuid.uuid4(), user_id=user.id, version_no=2,
        personality_traits={"p": 0.5}, ability_traits={"q": 0.6},
        relationship_traits={"r": 0.7}, fortune_traits={"s": 0.4},
    )
    # Service returns a real MatchCurrentResponse (Pydantic model).
    from app.schemas.match import MatchCurrentResponse, MatchItem
    match_response = MatchCurrentResponse(
        profileVersion=2,
        topMatches=[
            MatchItem(
                rank=1, figureName="至刚之人",
                similarityScore=0.92, highlights=["能力维度高度契合"],
                differences=["性格偏外向"],
            ),
        ],
        explanation={"method": "cosine over trait vectors"},
    )
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _app(matches_router)
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.profile_service import ProfileService
    from app.services.match_service import MatchService
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ProfileService, "get_current_profile",
                          lambda self, db, *, user_id: profile), \
             patch.object(MatchService, "get_current_match",
                          lambda self, db, *, user_id, profile: match_response):
            r = TestClient(app).get("/matches/current")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["profileVersion"] == 2
    assert len(body["topMatches"]) == 1
    assert body["topMatches"][0]["figureName"] == "至刚之人"
    assert body["topMatches"][0]["similarityScore"] == 0.92


# ---------------------------------------------------------------------------
# /questionnaire/next  / /questionnaire/progress  — pure compute, no DB
# ---------------------------------------------------------------------------
def test_questionnaire_next_ok(monkeypatch):
    from app.services.questionnaire_service import QuestionnaireService
    fake_qs = [
        {
            "questionId": "q1",
            "questionText": "你的风险偏好?",
            "traitTargets": ["riskPreference"],
            "options": ["保守", "稳健", "激进"],
        },
        {
            "questionId": "q2",
            "questionText": "近一年情绪稳定度?",
            "traitTargets": ["emotionStability"],
            "options": ["稳定", "一般", "波动"],
        },
    ]
    app = _app(questionnaire_router)
    try:
        with patch.object(QuestionnaireService, "get_next_questions",
                          lambda self, batch_size=None: fake_qs):
            r = TestClient(app).get("/questionnaire/next")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["questions"]) == 2
    assert body["questions"][0]["questionId"] == "q1"
    assert body["questions"][0]["options"] == ["保守", "稳健", "激进"]


def test_questionnaire_progress_ok(monkeypatch):
    from app.services.questionnaire_service import QuestionnaireService
    app = _app(questionnaire_router)
    try:
        with patch.object(
            QuestionnaireService, "get_total_progress",
            lambda self: {
                "totalGroups": 4,
                "totalQuestions": 18,
                "groups": [
                    {"groupId": "personality", "answered": 3, "total": 5},
                    {"groupId": "ability", "answered": 2, "total": 5},
                ],
            },
        ):
            r = TestClient(app).get("/questionnaire/progress")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["totalGroups"] == 4
    assert body["totalQuestions"] == 18
    assert len(body["groups"]) == 2


# ---------------------------------------------------------------------------
# /archive/timeline
# ---------------------------------------------------------------------------
def test_archive_timeline_ok(monkeypatch):
    user = _user()
    items = [
        {
            "itemType": "profile_change",
            "occurredAt": "2026-07-01T10:00:00Z",
            "title": "profile v2 -> v3",
            "summary": "能力维度提升",
            "profileVersion": 3,
            "metadata": {"changedDimensions": ["ability"]},
        },
    ]
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _app(archive_router)
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.archive_service import ArchiveService
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(ArchiveService, "build_timeline",
                          lambda self, db, *, user_id, limit=20,
                                 item_types=None, profile_version=None:
                                 items):
            r = TestClient(app).get("/archive/timeline?limit=10")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["itemType"] == "profile_change"
    assert body["items"][0]["profileVersion"] == 3


# ---------------------------------------------------------------------------
# /intake/records
# ---------------------------------------------------------------------------
def test_intake_records_ok(monkeypatch):
    user = _user()
    records = [
        SimpleNamespace(
            id=uuid.uuid4(), intake_type="questionnaire_answer",
            source_channel="web", payload={"qid": "q1", "value": 0.5},
            confidence=0.9, submitted_at="2026-07-01T08:00:00Z",
        ),
    ]
    monkeypatch.setattr(UserRepository, "__init__", lambda self: None)
    app = _app(intake_router)
    app.dependency_overrides[get_db] = _fake_get_db
    from app.services.intake_service import IntakeService
    try:
        with patch.object(UserRepository, "get_first", lambda self, db: user), \
             patch.object(IntakeService, "list_records",
                          lambda self, db, *, user_id, intake_type,
                                 limit=50: records):
            r = TestClient(app).get("/intake/records")
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 1
    assert body[0]["intakeType"] == "questionnaire_answer"
    assert body[0]["confidence"] == 0.9
