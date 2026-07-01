"""Unit tests for PushService orchestration (no DB, no HTTP, no real Expo).

Covers:
- dispatch_reminder: missing reminder → ValueError; non-pending → idempotent skip;
  pending + tokens → sends + marks; no tokens → marks failed
- dispatch_immediate: always creates a job, sends if tokens exist
- scan_due_reminders: iterates due list, captures per-reminder failures

Strategy: patch expo_push_client.send_messages with a stub; everything else
is provided by fake repositories.
"""
import asyncio
import datetime as _dt
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.services.push_service import PushService


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class FakeReminderRepo:
    def __init__(self):
        self.due_calls = []
        self.mark_sent_calls = []
        self.mark_failed_calls = []

    def get(self, db, *, reminder_id):
        return self._by_id.get(reminder_id)

    def set_reminder(self, reminder):
        self._by_id[reminder.id] = reminder

    def list_due(self, db, *, now, limit=100):
        self.due_calls.append({"now": now, "limit": limit})
        return list(self._due)

    def set_due(self, reminders):
        self._due = reminders

    def mark_sent(self, db, *, reminder, sent_at):
        self.mark_sent_calls.append({"reminder_id": reminder.id, "sent_at": sent_at})
        reminder.status = "sent"
        return reminder

    def mark_failed(self, db, *, reminder, reason):
        self.mark_failed_calls.append({"reminder_id": reminder.id, "reason": reason})
        reminder.status = "failed"
        return reminder

    _by_id = {}
    _due = []


class FakeTokenRepo:
    def __init__(self):
        self.tokens_by_user = {}

    def list_active_for_user(self, db, *, user_id):
        return self.tokens_by_user.get(user_id, [])


class FakeJobRepo:
    def __init__(self):
        self.created = []
        self.running = []
        self.completed = []
        self.target_set = []
        self.failed = []

    def create(self, db, *, user_id, reminder_id, payload):
        job = SimpleNamespace(
            id=uuid4(), user_id=user_id, reminder_id=reminder_id,
            payload=payload, status="queued",
        )
        self.created.append(job)
        return job

    def mark_running(self, db, *, job):
        self.running.append(job)
        job.status = "running"

    def mark_completed(self, db, *, job, success_count, failure_count, result):
        self.completed.append({
            "job": job, "success": success_count,
            "failure": failure_count, "result": result,
        })
        job.status = "completed"

    def set_target_count(self, db, *, job, count):
        self.target_set.append({"job": job, "count": count})

    def mark_failed(self, db, *, job, error):
        self.failed.append({"job": job, "error": error})
        job.status = "failed"


def _settings(dry_run=True):
    return SimpleNamespace(
        push_dry_run=dry_run,
        expo_push_url="https://exp.host/--/api/v2/push/send",
    )


def _reminder(status="pending", user_id=None, title="提醒", body="内容", channel="push"):
    return SimpleNamespace(
        id=uuid4(),
        user_id=user_id or uuid4(),
        title=title,
        body=body,
        channel=channel,
        status=status,
    )


def _token(user_id, value="ExponentPushToken[abc]"):
    return SimpleNamespace(token=value, user_id=user_id)


# ---------------------------------------------------------------------------
# dispatch_reminder
# ---------------------------------------------------------------------------


def test_dispatch_reminder_raises_when_reminder_missing():
    reminders = FakeReminderRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=FakeTokenRepo(), job_repo=FakeJobRepo()
    )
    with pytest.raises(ValueError, match="not found"):
        asyncio.run(service.dispatch_reminder(
            db=None, settings=_settings(), reminder_id=uuid4()
        ))


def test_dispatch_reminder_skips_when_not_pending():
    reminders = FakeReminderRepo()
    reminders.set_reminder(_reminder(status="sent"))
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=FakeTokenRepo(), job_repo=jobs
    )

    job, _ = asyncio.run(service.dispatch_reminder(
        db=None, settings=_settings(), reminder_id=list(reminders._by_id.keys())[0]
    ))

    # idempotent skip → job created with skipped payload, marked completed
    assert job.status == "completed"
    assert jobs.completed[0]["result"] == {"skipped": True, "reason": "not_pending"}
    # no tokens fetched
    assert not reminders.mark_sent_calls


def test_dispatch_reminder_marks_failed_when_no_active_tokens():
    user_id = uuid4()
    reminder = _reminder(status="pending", user_id=user_id)
    reminders = FakeReminderRepo()
    reminders.set_reminder(reminder)
    tokens = FakeTokenRepo()  # no tokens for user
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    job, returned_reminder = asyncio.run(service.dispatch_reminder(
        db=None, settings=_settings(), reminder_id=reminder.id
    ))

    assert job.status == "completed"
    assert jobs.completed[0]["result"] == {"reason": "no_active_tokens"}
    assert reminders.mark_failed_calls == [{"reminder_id": reminder.id, "reason": "no_active_tokens"}]
    assert returned_reminder is reminder


def test_dispatch_reminder_sends_to_expo_and_marks_sent(monkeypatch):
    user_id = uuid4()
    reminder = _reminder(status="pending", user_id=user_id)
    reminders = FakeReminderRepo()
    reminders.set_reminder(reminder)
    tokens = FakeTokenRepo()
    tokens.tokens_by_user[user_id] = [_token(user_id), _token(user_id, "ExponentPushToken[def]")]
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    async def fake_send(settings, messages):
        return [{"status": "ok"}, {"status": "ok"}]

    monkeypatch.setattr(
        "app.services.expo_push_client.send_messages", fake_send
    )

    job, returned_reminder = asyncio.run(service.dispatch_reminder(
        db=None, settings=_settings(dry_run=False), reminder_id=reminder.id
    ))

    assert job.status == "completed"
    # 2 success, 0 failure
    assert jobs.completed[0]["success"] == 2
    assert jobs.completed[0]["failure"] == 0
    # reminder marked sent
    assert reminders.mark_sent_calls[0]["reminder_id"] == reminder.id
    assert returned_reminder.status == "sent"


def test_dispatch_reminder_marks_failed_when_all_tickets_fail(monkeypatch):
    user_id = uuid4()
    reminder = _reminder(status="pending", user_id=user_id)
    reminders = FakeReminderRepo()
    reminders.set_reminder(reminder)
    tokens = FakeTokenRepo()
    tokens.tokens_by_user[user_id] = [_token(user_id)]
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    async def fake_send(settings, messages):
        return [{"status": "error", "message": "DeviceNotRegistered"}]

    monkeypatch.setattr(
        "app.services.expo_push_client.send_messages", fake_send
    )

    asyncio.run(service.dispatch_reminder(
        db=None, settings=_settings(), reminder_id=reminder.id
    ))

    assert reminders.mark_failed_calls == [
        {"reminder_id": reminder.id, "reason": "all_failed:1"}
    ]


def test_dispatch_reminder_partial_success_marks_sent_with_failure_reason(monkeypatch):
    user_id = uuid4()
    reminder = _reminder(status="pending", user_id=user_id)
    reminders = FakeReminderRepo()
    reminders.set_reminder(reminder)
    tokens = FakeTokenRepo()
    tokens.tokens_by_user[user_id] = [_token(user_id), _token(user_id, "ExponentPushToken[def]")]
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    async def fake_send(settings, messages):
        return [{"status": "ok"}, {"status": "error"}]

    monkeypatch.setattr(
        "app.services.expo_push_client.send_messages", fake_send
    )

    # Monkeypatch db.query for the partial-success failure_reason update
    class _Query:
        def filter(self, *args, **kwargs): return self
        def update(self, values): self.values = values; return 1
    fake_query = _Query()

    class FakeDB:
        def commit(self): pass
        def query(self, model): return fake_query

    asyncio.run(service.dispatch_reminder(
        db=FakeDB(), settings=_settings(), reminder_id=reminder.id
    ))

    # still marked sent
    assert reminders.mark_sent_calls[0]["reminder_id"] == reminder.id
    # failure_reason updated to partial
    assert fake_query.values == {"failure_reason": "partial:1/2"}


# ---------------------------------------------------------------------------
# dispatch_immediate
# ---------------------------------------------------------------------------


def test_dispatch_immediate_creates_job_and_skips_when_no_tokens():
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=FakeReminderRepo(), token_repo=FakeTokenRepo(), job_repo=jobs
    )

    job = asyncio.run(service.dispatch_immediate(
        db=None, settings=_settings(), user_id=uuid4(),
        title="t", body="b", data={"k": 1}, channel="push",
    ))

    assert job.status == "completed"
    assert jobs.completed[0]["result"]["reason"] == "no_active_tokens"


def test_dispatch_immediate_sends_messages_and_completes(monkeypatch):
    user_id = uuid4()
    tokens = FakeTokenRepo()
    tokens.tokens_by_user[user_id] = [_token(user_id)]
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=FakeReminderRepo(), token_repo=tokens, job_repo=jobs
    )

    async def fake_send(settings, messages):
        return [{"status": "ok"}]

    monkeypatch.setattr(
        "app.services.expo_push_client.send_messages", fake_send
    )

    job = asyncio.run(service.dispatch_immediate(
        db=None, settings=_settings(), user_id=user_id,
        title="Hi", body="World", data={"x": 1}, channel="push",
    ))

    assert job.status == "completed"
    assert jobs.completed[0]["success"] == 1
    assert jobs.completed[0]["failure"] == 0
    # payload includes title, body, channel, data
    payload = jobs.created[0].payload
    assert payload["title"] == "Hi"
    assert payload["data"] == {"x": 1}


# ---------------------------------------------------------------------------
# scan_due_reminders
# ---------------------------------------------------------------------------


def test_scan_due_reminders_dispatches_each_due(monkeypatch):
    r1 = _reminder(status="pending")
    r2 = _reminder(status="pending")
    reminders = FakeReminderRepo()
    reminders.set_due([r1, r2])
    reminders.set_reminder(r1)
    reminders.set_reminder(r2)
    tokens = FakeTokenRepo()
    # give both users no tokens → each marks failed with no_active_tokens
    tokens.tokens_by_user[r1.user_id] = []
    tokens.tokens_by_user[r2.user_id] = []
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    fixed_now = _dt.datetime(2024, 6, 1, 12, 0, 0)
    results = asyncio.run(service.scan_due_reminders(
        db=None, settings=_settings(), now=fixed_now
    ))

    assert reminders.due_calls == [{"now": fixed_now, "limit": 100}]
    assert len(results) == 2
    # both got mark_failed (no tokens)
    assert len(reminders.mark_failed_calls) == 2


def test_scan_due_reminders_captures_per_reminder_failure(monkeypatch):
    r1 = _reminder(status="pending")
    reminders = FakeReminderRepo()
    reminders.set_due([r1])
    reminders.set_reminder(r1)
    tokens = FakeTokenRepo()
    tokens.tokens_by_user[r1.user_id] = [_token(r1.user_id)]
    jobs = FakeJobRepo()
    service = PushService(
        reminder_repo=reminders, token_repo=tokens, job_repo=jobs
    )

    async def fake_send(settings, messages):
        raise RuntimeError("expo down")

    monkeypatch.setattr(
        "app.services.expo_push_client.send_messages", fake_send
    )

    results = asyncio.run(service.scan_due_reminders(
        db=None, settings=_settings()
    ))

    # one job captured the failure
    assert len(results) == 1
    assert jobs.failed[0]["error"] == "expo down"


def test_scan_due_reminders_default_now_uses_utcnow():
    reminders = FakeReminderRepo()
    reminders.set_due([])
    service = PushService(
        reminder_repo=reminders, token_repo=FakeTokenRepo(), job_repo=FakeJobRepo()
    )
    asyncio.run(service.scan_due_reminders(db=None, settings=_settings()))
    # default now is passed to list_due
    assert len(reminders.due_calls) == 1
    assert isinstance(reminders.due_calls[0]["now"], _dt.datetime)
