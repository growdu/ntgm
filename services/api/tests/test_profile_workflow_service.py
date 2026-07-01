"""Unit tests for ProfileWorkflowService (no DB, no HTTP).

Covers the end-to-end recompute orchestration:
- Creates a 'recompute_profile' job with the right reason payload
- Generates a new profile, records the change, sets user current version
- Calculates and persists a match, generates and stores advice
- Completes the job with a result dict containing the new version
"""
from types import SimpleNamespace
from uuid import uuid4

from app.services.profile_workflow_service import ProfileWorkflowService


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class FakeJobService:
    def __init__(self):
        self.created = []
        self.completed = []

    def create_job(self, db, *, user_id, job_type, payload):
        job = SimpleNamespace(
            id=uuid4(), user_id=user_id, job_type=job_type,
            payload=payload, status="queued",
        )
        self.created.append(job)
        return job

    def complete_job(self, db, *, job, result):
        self.completed.append({"job": job, "result": result})
        job.status = "completed"
        return job


class FakeProfileService:
    def __init__(self, *, current=None, new=None):
        self.current = current
        self.new = new or SimpleNamespace(version_no=2, personality_traits={})
        self.snapshot = {"intakeCount": 1, "baziScoreRatio": 0.6}
        self.get_current_calls = []
        self.generate_calls = []

    def get_current_profile(self, db, *, user_id):
        self.get_current_calls.append(user_id)
        return self.current

    def generate_profile(self, db, *, user):
        self.generate_calls.append(user.id)
        return self.new, self.snapshot


class FakeProfileChangeService:
    def __init__(self):
        self.recorded = []

    def record_change(
        self, db, *, user_id, previous_profile, current_profile,
        reason, source_snapshot,
    ):
        self.recorded.append({
            "user_id": user_id, "previous": previous_profile,
            "current": current_profile, "reason": reason,
            "snapshot": source_snapshot,
        })


class FakeMatchService:
    def __init__(self):
        self.match_response = SimpleNamespace(
            top_matches=[SimpleNamespace(name="诸葛亮", similarity=0.85)],
        )
        self.persist_calls = []
        self.calc_calls = []

    def calculate_current_match(self, *, profile):
        self.calc_calls.append(profile)
        return self.match_response

    def persist_match(self, db, *, user_id, profile, match_response):
        self.persist_calls.append({
            "user_id": user_id, "profile": profile,
            "match_response": match_response,
        })


class FakeAdviceService:
    def __init__(self):
        self.advice = SimpleNamespace(id=uuid4())
        self.generate_calls = []

    def generate_and_store(self, db, *, user_id, profile, match_response):
        self.generate_calls.append({
            "user_id": user_id, "profile": profile,
            "match_response": match_response,
        })
        return self.advice


class FakeUserService:
    def __init__(self):
        self.set_version_calls = []

    def set_current_profile_version(self, db, *, user, version_no):
        self.set_version_calls.append({"user_id": user.id, "version_no": version_no})
        return SimpleNamespace(id=user.id, current_profile_version=version_no)


# ---------------------------------------------------------------------------
# recompute
# ---------------------------------------------------------------------------


def test_recompute_creates_job_with_reason_and_user_id():
    jobs = FakeJobService()
    profiles = FakeProfileService()
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    job, profile, advice, snapshot = workflow.recompute(
        db=None, user=user, reason="user_initiated"
    )

    assert len(jobs.created) == 1
    created = jobs.created[0]
    assert created.job_type == "recompute_profile"
    assert created.payload == {"reason": "user_initiated", "userId": str(user.id)}
    assert job is created


def test_recompute_loads_previous_profile_before_generating():
    jobs = FakeJobService()
    previous = SimpleNamespace(version_no=1)
    profiles = FakeProfileService(current=previous)
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    workflow.recompute(db=None, user=user, reason="manual")

    # get_current_profile called with same user_id
    assert profiles.get_current_calls == [user.id]
    # and generate_profile called with the user object
    assert profiles.generate_calls == [user.id]


def test_recompute_records_change_with_previous_and_current():
    jobs = FakeJobService()
    previous = SimpleNamespace(version_no=1)
    new = SimpleNamespace(version_no=2, personality_traits={})
    profiles = FakeProfileService(current=previous, new=new)
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    workflow.recompute(db=None, user=user, reason="scheduled")

    assert len(changes.recorded) == 1
    rec = changes.recorded[0]
    assert rec["previous"] is previous
    assert rec["current"] is new
    assert rec["reason"] == "scheduled"
    assert rec["snapshot"] == profiles.snapshot


def test_recompute_sets_current_profile_version_on_user():
    jobs = FakeJobService()
    new = SimpleNamespace(version_no=7, personality_traits={})
    profiles = FakeProfileService(new=new)
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    workflow.recompute(db=None, user=user, reason="x")

    assert users.set_version_calls == [{"user_id": user.id, "version_no": 7}]


def test_recompute_calculates_and_persists_match():
    jobs = FakeJobService()
    profiles = FakeProfileService()
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    workflow.recompute(db=None, user=user, reason="x")

    # calculate called with the generated profile
    assert len(matches.calc_calls) == 1
    assert matches.calc_calls[0] is profiles.new
    # persist called with same profile + match_response
    assert len(matches.persist_calls) == 1
    p = matches.persist_calls[0]
    assert p["user_id"] == user.id
    assert p["profile"] is profiles.new
    assert p["match_response"] is matches.match_response


def test_recompute_generates_and_stores_advice():
    jobs = FakeJobService()
    profiles = FakeProfileService()
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    _, _, advice, _ = workflow.recompute(db=None, user=user, reason="x")

    assert advice is advices.advice
    assert len(advices.generate_calls) == 1
    call = advices.generate_calls[0]
    assert call["user_id"] == user.id
    assert call["profile"] is profiles.new
    assert call["match_response"] is matches.match_response


def test_recompute_completes_job_with_profile_version_and_advice_id():
    jobs = FakeJobService()
    new = SimpleNamespace(version_no=5, personality_traits={})
    profiles = FakeProfileService(new=new)
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    workflow.recompute(db=None, user=user, reason="x")

    assert len(jobs.completed) == 1
    completed = jobs.completed[0]
    result = completed["result"]
    assert result["profileVersion"] == 5
    assert result["sourceSnapshot"] == profiles.snapshot
    assert result["adviceId"] == str(advices.advice.id)


def test_recompute_returns_job_profile_advice_snapshot_tuple():
    jobs = FakeJobService()
    profiles = FakeProfileService()
    changes = FakeProfileChangeService()
    matches = FakeMatchService()
    advices = FakeAdviceService()
    users = FakeUserService()
    workflow = ProfileWorkflowService(
        job_service=jobs, profile_service=profiles,
        profile_change_service=changes, match_service=matches,
        advice_service=advices, user_service=users,
    )
    user = SimpleNamespace(id=uuid4())

    result = workflow.recompute(db=None, user=user, reason="x")

    assert len(result) == 4
    job, profile, advice, snapshot = result
    assert job is jobs.created[0]
    assert profile is profiles.new
    assert advice is advices.advice
    assert snapshot == profiles.snapshot
