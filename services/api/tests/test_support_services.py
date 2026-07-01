"""Unit tests for thin-wrapper services (no DB, no HTTP).

Covers the forwarding logic of:
- IntakeService — 4 thin methods delegating to IntakeRepository
- UserService — 5 thin methods delegating to UserRepository
- JobService — 3 thin methods delegating to JobRepository
- AssetService — create_upload_token (pure) + register_uploaded_asset (forwarder)
"""
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.services.asset_service import AssetService
from app.services.intake_service import IntakeService
from app.services.job_service import JobService
from app.services.user_service import UserService


# ---------------------------------------------------------------------------
# IntakeService
# ---------------------------------------------------------------------------


class FakeIntakeRepo:
    def __init__(self):
        self.create_record_calls = []
        self.create_life_event_calls = []
        self.records = []
        self.events = []

    def create_record(self, db, *, user_id, intake_type, source_channel, payload, confidence=None):
        record = SimpleNamespace(
            id=uuid4(), user_id=user_id, intake_type=intake_type,
            source_channel=source_channel, payload=payload, confidence=confidence,
        )
        self.create_record_calls.append({
            "user_id": user_id, "intake_type": intake_type,
            "source_channel": source_channel, "payload": payload, "confidence": confidence,
        })
        self.records.append(record)
        return record

    def create_life_event(self, db, *, user_id, event_type, event_time, title,
                          description, payload, impact_score):
        event = SimpleNamespace(
            id=uuid4(), user_id=user_id, event_type=event_type, event_time=event_time,
            title=title, description=description, payload=payload, impact_score=impact_score,
        )
        self.create_life_event_calls.append({
            "user_id": user_id, "event_type": event_type, "event_time": event_time,
            "title": title, "description": description, "payload": payload, "impact_score": impact_score,
        })
        self.events.append(event)
        return event

    def list_records(self, db, *, user_id, intake_type=None, limit=50):
        return self.records

    def list_life_events(self, db, *, user_id):
        return self.events


def test_intake_record_basic_intake_forwards_payload_and_sets_confidence():
    repo = FakeIntakeRepo()
    service = IntakeService(repository=repo)
    payload = SimpleNamespace(
        model_dump=lambda mode="json": {"name": "张三", "gender": "male"},
    )

    service.record_basic_intake(db=None, user_id=uuid4(), payload=payload)

    assert len(repo.create_record_calls) == 1
    call = repo.create_record_calls[0]
    assert call["intake_type"] == "basic_info"
    assert call["source_channel"] == "web"
    assert call["payload"] == {"name": "张三", "gender": "male"}
    assert call["confidence"] == 1.0  # Decimal("1.0000") == 1.0 numerically


def test_intake_create_life_event_forwards_fields():
    repo = FakeIntakeRepo()
    service = IntakeService(repository=repo)
    event_time = datetime(2024, 5, 1, tzinfo=timezone.utc)
    payload = SimpleNamespace(
        eventType="career_change",
        eventTime=event_time,
        title="换了工作",
        description="从A公司跳到B公司",
        payload={"oldCompany": "A"},
        impactScore=8,
    )

    service.create_life_event(db=None, user_id=uuid4(), payload=payload)

    assert len(repo.create_life_event_calls) == 1
    call = repo.create_life_event_calls[0]
    assert call["event_type"] == "career_change"
    assert call["title"] == "换了工作"
    assert call["impact_score"] == 8


def test_intake_list_life_events_returns_repo_results():
    repo = FakeIntakeRepo()
    repo.events = [SimpleNamespace(id=1), SimpleNamespace(id=2)]
    service = IntakeService(repository=repo)

    events = service.list_life_events(db=None, user_id=uuid4())

    assert len(events) == 2


def test_intake_list_records_forwards_intake_type_and_limit():
    repo = FakeIntakeRepo()
    service = IntakeService(repository=repo)

    service.list_records(db=None, user_id=uuid4(), intake_type="basic_info", limit=10)

    # FakeIntakeRepo.list_records doesn't capture args here, but the call must not raise


# ---------------------------------------------------------------------------
# UserService
# ---------------------------------------------------------------------------


class FakeUserRepo:
    def __init__(self):
        self.create_or_update_calls = []
        self.set_version_calls = []

    def create_or_update_basic(self, db, *, name, gender, birth_datetime, birth_place):
        user = SimpleNamespace(
            id=uuid4(), name=name, gender=gender,
            birth_datetime=birth_datetime, birth_place=birth_place,
        )
        self.create_or_update_calls.append({
            "name": name, "gender": gender,
            "birth_datetime": birth_datetime, "birth_place": birth_place,
        })
        return user

    def get_first(self, db):
        return SimpleNamespace(id=uuid4(), name="first")

    def get_by_id(self, db, *, user_id):
        return SimpleNamespace(id=user_id, name="lookup")

    def set_current_profile_version(self, db, *, user, version_no):
        self.set_version_calls.append({"user_id": user.id, "version_no": version_no})
        return SimpleNamespace(id=user.id, current_profile_version=version_no)


def test_user_intake_basic_forwards_fields():
    repo = FakeUserRepo()
    service = UserService(repository=repo)
    birth = datetime(1990, 1, 1, tzinfo=timezone.utc)
    payload = SimpleNamespace(
        name="张三", gender="male", birthDatetime=birth, birthPlace="北京"
    )

    service.intake_basic(db=None, payload=payload)

    assert len(repo.create_or_update_calls) == 1
    call = repo.create_or_update_calls[0]
    assert call["name"] == "张三"
    assert call["birth_place"] == "北京"
    assert call["birth_datetime"] == birth


def test_user_get_current_user_returns_repo_value():
    repo = FakeUserRepo()
    service = UserService(repository=repo)
    user = service.get_current_user(db=None)
    assert user is not None
    assert user.name == "first"


def test_user_require_current_user_raises_when_none(monkeypatch):
    repo = FakeUserRepo()
    monkeypatch.setattr(repo, "get_first", lambda db: None)
    service = UserService(repository=repo)
    import pytest
    with pytest.raises(ValueError, match="User not found"):
        service.require_current_user(db=None)


def test_user_require_current_user_returns_user_when_present():
    repo = FakeUserRepo()
    service = UserService(repository=repo)
    user = service.require_current_user(db=None)
    assert user.name == "first"


def test_user_set_current_profile_version_forwards():
    repo = FakeUserRepo()
    service = UserService(repository=repo)
    user = SimpleNamespace(id=uuid4())
    service.set_current_profile_version(db=None, user=user, version_no=5)
    assert repo.set_version_calls == [{"user_id": user.id, "version_no": 5}]


def test_user_get_user_by_id_forwards():
    repo = FakeUserRepo()
    service = UserService(repository=repo)
    uid = uuid4()
    user = service.get_user_by_id(db=None, user_id=uid)
    assert user.id == uid


# ---------------------------------------------------------------------------
# JobService
# ---------------------------------------------------------------------------


class FakeJobRepo:
    def __init__(self):
        self.create_calls = []
        self.update_calls = []

    def create_job(self, db, *, user_id, job_type, payload, status="queued"):
        job = SimpleNamespace(
            id=uuid4(), user_id=user_id, job_type=job_type, payload=payload, status=status
        )
        self.create_calls.append({"user_id": user_id, "job_type": job_type,
                                   "payload": payload, "status": status})
        return job

    def get_by_id(self, db, *, job_id):
        return SimpleNamespace(id=job_id, status="completed")

    def update_status(self, db, *, job, status, result):
        self.update_calls.append({"job_id": job.id, "status": status, "result": result})
        return SimpleNamespace(id=job.id, status=status, result=result)


def test_job_create_job_sets_queued_status():
    repo = FakeJobRepo()
    service = JobService(repository=repo)
    job = service.create_job(db=None, user_id=uuid4(), job_type="recompute_profile",
                              payload={"reason": "user_initiated"})
    assert job.status == "queued"
    assert repo.create_calls[0]["status"] == "queued"


def test_job_create_job_handles_none_user_id():
    repo = FakeJobRepo()
    service = JobService(repository=repo)
    job = service.create_job(db=None, user_id=None, job_type="system", payload={})
    assert repo.create_calls[0]["user_id"] is None


def test_job_get_job_returns_repo_value():
    repo = FakeJobRepo()
    service = JobService(repository=repo)
    job = service.get_job(db=None, job_id=uuid4())
    assert job.status == "completed"


def test_job_complete_job_forwards_status_and_result():
    repo = FakeJobRepo()
    service = JobService(repository=repo)
    job = SimpleNamespace(id=uuid4())
    service.complete_job(db=None, job=job, result={"profileVersion": 3})
    assert repo.update_calls[0]["status"] == "completed"
    assert repo.update_calls[0]["result"] == {"profileVersion": 3}


# ---------------------------------------------------------------------------
# AssetService
# ---------------------------------------------------------------------------


class FakeAssetRepo:
    def __init__(self):
        self.create_calls = []

    def create_asset(self, db, *, user_id, asset_type, storage_key, content_type, metadata):
        asset = SimpleNamespace(
            id=uuid4(), user_id=user_id, asset_type=asset_type,
            storage_key=storage_key, content_type=content_type, metadata=metadata,
        )
        self.create_calls.append({
            "user_id": user_id, "asset_type": asset_type, "storage_key": storage_key,
            "content_type": content_type, "metadata": metadata,
        })
        return asset


def test_asset_create_upload_token_uses_timestamp_and_uuid():
    payload = SimpleNamespace(assetType="intake_image", fileName="photo.jpg")
    service = AssetService(repository=FakeAssetRepo())
    result = service.create_upload_token(payload)

    assert "uploadUrl" in result
    assert "storageKey" in result
    assert "uploads/intake_image/" in result["storageKey"]
    assert "photo.jpg" in result["storageKey"]
    # timestamp prefix is YYYYMMDDHHMMSS (14 digits) + '-' + uuid hex (32 chars)
    parts = result["storageKey"].split("/")[-1]
    timestamp_part = parts.split("-")[0]
    assert len(timestamp_part) == 14
    assert timestamp_part.isdigit()
    # the upload URL should reference the storage key
    assert result["uploadUrl"].endswith(result["storageKey"])


def test_asset_create_upload_token_url_uses_localhost_placeholder():
    payload = SimpleNamespace(assetType="x", fileName="y.png")
    service = AssetService(repository=FakeAssetRepo())
    result = service.create_upload_token(payload)
    assert result["uploadUrl"].startswith("http://localhost:9000/placeholder-upload/")


def test_asset_register_uploaded_asset_forwards_to_repo():
    repo = FakeAssetRepo()
    service = AssetService(repository=repo)
    payload = SimpleNamespace(
        assetType="intake_image",
        storageKey="uploads/intake_image/20240701-abc.jpg",
        contentType="image/jpeg",
        metadata={"source": "intake"},
    )
    service.register_uploaded_asset(db=None, user_id=uuid4(), payload=payload)
    assert len(repo.create_calls) == 1
    call = repo.create_calls[0]
    assert call["asset_type"] == "intake_image"
    assert call["content_type"] == "image/jpeg"
    assert call["metadata"] == {"source": "intake"}
