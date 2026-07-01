"""End-to-end push notification chain test.

Validates: HTTP request → route → service → repos → expo client → response.

This is the CHANGELOG "链路" item:
- /reminders POST creates a Reminder row
- /reminders/dispatch-immediate triggers PushService.dispatch_immediate
- PushService queries tokens, builds Expo messages, calls expo_push_client,
  summarizes tickets, records job state
- Route returns PushImmediateResponse

Why this matters: service-level tests already cover each method in isolation
(test_push_service.py has 23 tests). But the chain — Pydantic body validation,
default-argument service wiring, async route handler, dependency override,
response serialization — has never been exercised together.

Mocks needed (since we have no DB):
- UserRepository.get_first → return fake user
- PushTokenRepository.list_active_for_user → return [fake token]
- PushDispatchJobRepository.create/mark_running/set_target_count/mark_completed
- expo_push_client.send_messages → canned ticket
"""
from __future__ import annotations

import asyncio
import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.reminders import router as reminders_router
from app.db import get_db
from app.repositories.push_dispatch_job_repository import PushDispatchJobRepository
from app.repositories.push_token_repository import PushTokenRepository
from app.repositories.user_repository import UserRepository


class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _client_with_overrides() -> tuple[TestClient, FastAPI]:
    app = FastAPI()
    app.include_router(reminders_router)
    app.dependency_overrides[get_db] = _fake_get_db
    return TestClient(app), app


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _fake_user():
    return SimpleNamespace(
        id=uuid.uuid4(), name="李四", gender="male",
        birth_datetime=None, birth_place="上海",
        current_profile_version=2,
    )


def _fake_token(idx=0):
    return SimpleNamespace(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        token=f"ExponentPushToken[test-{idx}]",
        platform="ios",
        is_active=True,
    )


# patch.object binds descriptor on class; signature is (self, db_or_args, ...)
def _bind_db_free(repo, method_name):
    """Return a function usable as a class-method replacement that ignores self."""
    def _patched(self, *args, **kwargs):
        return getattr(repo, method_name)(*args, **kwargs)
    return _patched


class FakeJobRepo:
    def __init__(self):
        self.jobs = []
        self.events = []
        self.next_id = uuid.uuid4()

    def create(self, db, *, user_id, reminder_id, payload):
        job = SimpleNamespace(
            id=self.next_id,
            user_id=user_id,
            reminder_id=reminder_id,
            payload=payload,
            job_type="push_immediate",
            status="created",
            target_token_count=0,
            success_count=0,
            failure_count=0,
            result=None,
            error_message=None,
            created_at=None,
            updated_at=None,
        )
        self.events.append(("create", user_id, reminder_id, payload))
        self.jobs.append(job)
        return job

    def mark_running(self, db, *, job):
        job.status = "running"
        self.events.append(("mark_running", job.id))
        return None

    def set_target_count(self, db, *, job, count):
        job.target_token_count = count
        self.events.append(("set_target_count", count))
        return None

    def mark_completed(self, db, *, job, success_count, failure_count, result):
        job.success_count = success_count
        job.failure_count = failure_count
        job.result = result
        job.status = "completed"
        self.events.append(("mark_completed", success_count, failure_count, result))
        return None


class FakeTokenRepo:
    def __init__(self, tokens):
        self.tokens = tokens
        self.events = []

    def list_active_for_user(self, db, *, user_id):
        self.events.append(("list_active_for_user", user_id))
        return list(self.tokens)


class FakeUserRepo:
    def __init__(self, user):
        self.user = user
        self.events = []

    def get_first(self, db):
        self.events.append("get_first")
        return self.user


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _noop_init(monkeypatch):
    """Replace repo constructors with no-ops so they don't need a DB session."""
    for cls in (PushDispatchJobRepository, PushTokenRepository, UserRepository):
        monkeypatch.setattr(cls, "__init__", lambda self: None)


def test_dispatch_immediate_chain_succeeds(monkeypatch):
    user = _fake_user()
    token = _fake_token()
    job_repo = FakeJobRepo()
    token_repo = FakeTokenRepo([token])
    user_repo = FakeUserRepo(user)

    async def fake_send(settings, messages):
        return [{"status": "ok", "id": f"ticket-{uuid.uuid4()}"}]

    monkeypatch.setattr("app.services.push_service.expo_push_client.send_messages", fake_send)

    with patch.object(UserRepository, "get_first", FakeUserRepo.get_first.__get__(user_repo, FakeUserRepo)), \
         patch.object(PushTokenRepository, "list_active_for_user", FakeTokenRepo.list_active_for_user.__get__(token_repo, FakeTokenRepo)), \
         patch.object(PushDispatchJobRepository, "create", FakeJobRepo.create.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_running", FakeJobRepo.mark_running.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "set_target_count", FakeJobRepo.set_target_count.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_completed", FakeJobRepo.mark_completed.__get__(job_repo, FakeJobRepo)):

        client, app = _client_with_overrides()
        try:
            r = client.post(
                "/reminders/dispatch-immediate",
                json={
                    "title": "测试通知",
                    "body": "你好,这是端到端推送测试",
                    "channel": "push",
                },
            )
        finally:
            app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["jobId"] == str(job_repo.jobs[0].id)
    assert body["targetTokenCount"] == 1
    assert body["successCount"] == 1
    assert body["failureCount"] == 0
    assert isinstance(body["dryRun"], bool)
    assert len(body["details"]) == 1
    assert body["details"][0]["status"] == "ok"

    # Verify chain — exact ordering of repo events
    event_types = [e[0] for e in job_repo.events]
    assert event_types == ["create", "mark_running", "set_target_count", "mark_completed"]
    # Target count was 1 (one active token)
    target_event = next(e for e in job_repo.events if e[0] == "set_target_count")
    assert target_event[1] == 1
    # mark_completed recorded the success/failure split
    complete_event = next(e for e in job_repo.events if e[0] == "mark_completed")
    assert complete_event[1] == 1  # success
    assert complete_event[2] == 0  # failure
    assert complete_event[3]["tickets"][0]["status"] == "ok"
    assert token_repo.events == [("list_active_for_user", user.id)]
    assert user_repo.events == ["get_first"]


def test_dispatch_immediate_no_tokens(monkeypatch):
    """Empty token list — job completes with reason=no_active_tokens."""
    user = _fake_user()
    job_repo = FakeJobRepo()
    token_repo = FakeTokenRepo([])  # no tokens
    user_repo = FakeUserRepo(user)

    # send_messages should NOT be called at all when there are no tokens.
    call_count = {"n": 0}

    async def fake_send(settings, messages):
        call_count["n"] += 1
        return []

    monkeypatch.setattr("app.services.push_service.expo_push_client.send_messages", fake_send)

    with patch.object(UserRepository, "get_first", FakeUserRepo.get_first.__get__(user_repo, FakeUserRepo)), \
         patch.object(PushTokenRepository, "list_active_for_user", FakeTokenRepo.list_active_for_user.__get__(token_repo, FakeTokenRepo)), \
         patch.object(PushDispatchJobRepository, "create", FakeJobRepo.create.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_running", FakeJobRepo.mark_running.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "set_target_count", FakeJobRepo.set_target_count.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_completed", FakeJobRepo.mark_completed.__get__(job_repo, FakeJobRepo)):

        client, app = _client_with_overrides()
        try:
            r = client.post(
                "/reminders/dispatch-immediate",
                json={"title": "无设备", "body": "用户没有活跃 token 时如何处理?"},
            )
        finally:
            app.dependency_overrides.clear()

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["targetTokenCount"] == 0
    assert body["successCount"] == 0
    assert body["failureCount"] == 0

    assert call_count["n"] == 0, "send_messages must NOT be invoked with zero tokens"
    complete = next(e for e in job_repo.events if e[0] == "mark_completed")
    assert complete[3]["reason"] == "no_active_tokens"


def test_dispatch_immediate_returns_404_when_no_user(monkeypatch):
    user_repo = FakeUserRepo(None)

    async def fake_send(settings, messages): return []

    monkeypatch.setattr("app.services.push_service.expo_push_client.send_messages", fake_send)

    with patch.object(UserRepository, "get_first", FakeUserRepo.get_first.__get__(user_repo, FakeUserRepo)):
        client, app = _client_with_overrides()
        try:
            r = client.post(
                "/reminders/dispatch-immediate",
                json={"title": "x", "body": "y"},
            )
        finally:
            app.dependency_overrides.clear()

    assert r.status_code == 404
    assert "User not found" in r.json()["detail"]


def test_dispatch_immediate_handles_partial_failures(monkeypatch):
    """Expo returns mixed ok/error tickets → response splits correctly."""
    user = _fake_user()
    tokens = [_fake_token(0), _fake_token(1), _fake_token(2)]
    job_repo = FakeJobRepo()
    token_repo = FakeTokenRepo(tokens)
    user_repo = FakeUserRepo(user)

    async def fake_send(settings, messages):
        # 2 ok, 1 error — matches 3 tokens
        return [
            {"status": "ok", "id": "t-0"},
            {"status": "error", "message": "InvalidCredentials"},
            {"status": "ok", "id": "t-2"},
        ]

    monkeypatch.setattr("app.services.push_service.expo_push_client.send_messages", fake_send)

    with patch.object(UserRepository, "get_first", FakeUserRepo.get_first.__get__(user_repo, FakeUserRepo)), \
         patch.object(PushTokenRepository, "list_active_for_user", FakeTokenRepo.list_active_for_user.__get__(token_repo, FakeTokenRepo)), \
         patch.object(PushDispatchJobRepository, "create", FakeJobRepo.create.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_running", FakeJobRepo.mark_running.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "set_target_count", FakeJobRepo.set_target_count.__get__(job_repo, FakeJobRepo)), \
         patch.object(PushDispatchJobRepository, "mark_completed", FakeJobRepo.mark_completed.__get__(job_repo, FakeJobRepo)):

        client, app = _client_with_overrides()
        try:
            r = client.post(
                "/reminders/dispatch-immediate",
                json={"title": "部分失败", "body": "test", "data": {"k": "v"}},
            )
        finally:
            app.dependency_overrides.clear()

    assert r.status_code == 200
    body = r.json()
    assert body["targetTokenCount"] == 3
    assert body["successCount"] == 2
    assert body["failureCount"] == 1
    assert len(body["details"]) == 3
    statuses = [d["status"] for d in body["details"]]
    assert statuses.count("ok") == 2
    assert statuses.count("error") == 1
