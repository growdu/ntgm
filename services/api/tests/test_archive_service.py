"""Unit tests for archive service — timeline builder (no DB, no HTTP).

Covers:
- build_timeline aggregates 5 sources: profile versions, change logs, life
  events, primary matches, advice plans
- Items sorted desc by occurredAt
- item_types filter
- profile_version filter
- limit applied after sort+filter
- Shape of each itemType's metadata
"""
import datetime as _dt
from types import SimpleNamespace
from uuid import uuid4

from app.services.archive_service import ArchiveService


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class FakeProfileRepo:
    def __init__(self, versions=None):
        self.versions = versions or []

    def list_versions(self, db, *, user_id, limit=10):
        return self.versions


class FakeChangeRepo:
    def __init__(self, changes=None):
        self.changes = changes or []

    def list_recent(self, db, *, user_id, limit=10):
        return self.changes


class FakeIntakeRepo:
    def __init__(self, events=None):
        self.events = events or []

    def list_life_events(self, db, *, user_id):
        return self.events


class FakeMatchRepo:
    def __init__(self, matches=None):
        self.matches = matches or []

    def list_primary_matches(self, db, *, user_id, limit=10):
        return self.matches


class FakeAdviceRepo:
    def __init__(self, plans=None):
        self.plans = plans or []

    def list_recent(self, db, *, user_id, limit=10):
        return self.plans


def _profile_version(version_no, created_at, summary=None, confidence_map=None):
    return SimpleNamespace(
        id=uuid4(),
        version_no=version_no,
        created_at=created_at,
        summary=summary or {"score": 75, "keywords": ["高风险偏好"]},
        confidence_map=confidence_map or {"personality": 0.8},
    )


def _change(from_v, to_v, created_at, headline="画像变化"):
    return SimpleNamespace(
        id=uuid4(),
        from_version=from_v,
        to_version=to_v,
        created_at=created_at,
        reason_summary={"headline": headline},
        changed_dimensions={"raised": ["riskPreference"]},
    )


def _life_event(event_time, title="工作变动", description="换工作了", impact=5):
    return SimpleNamespace(
        id=uuid4(),
        event_time=event_time,
        event_type="career",
        title=title,
        description=description,
        impact_score=impact,
    )


def _match(profile_version, created_at, figure_name="诸葛亮", score=0.85):
    return SimpleNamespace(
        id=uuid4(),
        profile_version=profile_version,
        figure_name=figure_name,
        similarity_score=score,
        created_at=created_at,
    )


def _advice(profile_version, created_at, focus="风险控制"):
    return SimpleNamespace(
        id=uuid4(),
        profile_version=profile_version,
        created_at=created_at,
        summary={"focus": focus},
    )


# ---------------------------------------------------------------------------
# build_timeline — basic shape
# ---------------------------------------------------------------------------


def test_timeline_with_no_data_returns_empty():
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())

    assert items == []


def test_timeline_aggregates_all_five_sources():
    t1 = _dt.datetime(2024, 1, 1)
    t2 = _dt.datetime(2024, 2, 1)
    t3 = _dt.datetime(2024, 3, 1)

    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(1, t1)]),
        change_repository=FakeChangeRepo(changes=[_change(1, 2, t2)]),
        intake_repository=FakeIntakeRepo(events=[_life_event(t3)]),
        match_repository=FakeMatchRepo(matches=[_match(2, t2)]),
        advice_repository=FakeAdviceRepo(plans=[_advice(2, t2)]),
    )

    items = service.build_timeline(db=None, user_id=uuid4(), limit=50)

    item_types = {item["itemType"] for item in items}
    assert item_types == {
        "profile_version", "profile_change", "life_event",
        "match_result", "advice_plan",
    }
    assert len(items) == 5


def test_timeline_sorted_descending_by_occurred_at():
    t1 = _dt.datetime(2024, 1, 1)
    t2 = _dt.datetime(2024, 2, 1)
    t3 = _dt.datetime(2024, 3, 1)
    t4 = _dt.datetime(2024, 4, 1)
    t5 = _dt.datetime(2024, 5, 1)

    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(1, t2)]),
        change_repository=FakeChangeRepo(changes=[_change(1, 2, t3)]),
        intake_repository=FakeIntakeRepo(events=[_life_event(t1)]),
        match_repository=FakeMatchRepo(matches=[_match(2, t5)]),
        advice_repository=FakeAdviceRepo(plans=[_advice(2, t4)]),
    )

    items = service.build_timeline(db=None, user_id=uuid4(), limit=50)
    timestamps = [item["occurredAt"] for item in items]
    assert timestamps == sorted(timestamps, reverse=True)


# ---------------------------------------------------------------------------
# Shape per itemType
# ---------------------------------------------------------------------------


def test_timeline_profile_version_item_shape():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[
            _profile_version(3, t, summary={"score": 80, "keywords": ["长线主义"]})
        ]),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    item = items[0]
    assert item["itemType"] == "profile_version"
    assert item["title"] == "画像版本 V3"
    assert "80" in item["summary"]
    assert "长线主义" in item["summary"]
    assert item["profileVersion"] == 3
    assert item["metadata"]["profileVersion"] == 3
    assert item["metadata"]["summary"]["score"] == 80


def test_timeline_profile_version_falls_back_when_keywords_not_a_list():
    """When summary["keywords"] is not a list, fallback text is used."""
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(
            1, t, summary={"score": 50, "keywords": "invalid"}
        )]),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    assert "暂无关键词" in items[0]["summary"]


def test_timeline_profile_version_uses_empty_joiner_when_keywords_list_empty():
    """An empty list yields an empty join, not the fallback."""
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(
            1, t, summary={"score": 50, "keywords": []}
        )]),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    assert "关键词：" in items[0]["summary"]
    assert "暂无关键词" not in items[0]["summary"]


def test_timeline_change_item_shape():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(changes=[_change(2, 3, t, headline="riskPreference上升")]),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    item = items[0]
    assert item["itemType"] == "profile_change"
    assert "V2 -> V3" in item["title"]
    assert item["summary"] == "riskPreference上升"
    assert item["profileVersion"] == 3
    assert item["metadata"]["fromVersion"] == 2
    assert item["metadata"]["toVersion"] == 3
    assert item["metadata"]["changedDimensions"] == {"raised": ["riskPreference"]}


def test_timeline_life_event_item_shape():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(events=[_life_event(t, title="搬家", description="搬到上海", impact=7)]),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    item = items[0]
    assert item["itemType"] == "life_event"
    assert item["title"] == "搬家"
    assert item["summary"] == "搬到上海"
    assert item["profileVersion"] is None
    assert item["metadata"]["impactScore"] == 7


def test_timeline_life_event_falls_back_when_no_description():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(events=[_life_event(t, description=None)]),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    assert "记录了一个" in items[0]["summary"]


def test_timeline_match_item_shape():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(matches=[_match(5, t, figure_name="曹操", score=0.8732)]),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    item = items[0]
    assert item["itemType"] == "match_result"
    assert "V5" in item["title"]
    assert "曹操" in item["summary"]
    assert "87.3" in item["summary"]  # 0.8732 * 100 = 87.32, rounded to 1 decimal
    assert item["profileVersion"] == 5


def test_timeline_advice_item_shape():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(plans=[_advice(4, t, focus="长期规划")]),
    )

    items = service.build_timeline(db=None, user_id=uuid4())
    item = items[0]
    assert item["itemType"] == "advice_plan"
    assert "V4" in item["title"]
    assert item["summary"] == "长期规划"
    assert item["profileVersion"] == 4


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


def test_timeline_item_types_filter():
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(1, t)]),
        change_repository=FakeChangeRepo(changes=[_change(1, 2, t)]),
        intake_repository=FakeIntakeRepo(events=[_life_event(t)]),
        match_repository=FakeMatchRepo(matches=[_match(2, t)]),
        advice_repository=FakeAdviceRepo(plans=[_advice(2, t)]),
    )

    items = service.build_timeline(
        db=None, user_id=uuid4(), item_types={"life_event", "match_result"}
    )
    types = {item["itemType"] for item in items}
    assert types == {"life_event", "match_result"}


def test_timeline_profile_version_filter():
    t1 = _dt.datetime(2024, 1, 1)
    t2 = _dt.datetime(2024, 2, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[
            _profile_version(1, t1), _profile_version(2, t2)
        ]),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(),
        match_repository=FakeMatchRepo(matches=[_match(1, t1), _match(2, t2)]),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(
        db=None, user_id=uuid4(), profile_version=2
    )
    for item in items:
        assert item["profileVersion"] == 2


def test_timeline_profile_version_filter_keeps_life_events_with_none():
    """Life events have profileVersion=None — when filtering by a specific
    version, they're excluded (None != X)."""
    t = _dt.datetime(2024, 1, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(),
        change_repository=FakeChangeRepo(),
        intake_repository=FakeIntakeRepo(events=[_life_event(t)]),
        match_repository=FakeMatchRepo(),
        advice_repository=FakeAdviceRepo(),
    )

    items = service.build_timeline(
        db=None, user_id=uuid4(), profile_version=2
    )
    assert items == []


# ---------------------------------------------------------------------------
# Limit
# ---------------------------------------------------------------------------


def test_timeline_limit_caps_result_count():
    t1 = _dt.datetime(2024, 1, 1)
    t2 = _dt.datetime(2024, 2, 1)
    t3 = _dt.datetime(2024, 3, 1)
    t4 = _dt.datetime(2024, 4, 1)
    t5 = _dt.datetime(2024, 5, 1)
    service = ArchiveService(
        profile_repository=FakeProfileRepo(versions=[_profile_version(1, t1)]),
        change_repository=FakeChangeRepo(changes=[_change(1, 2, t2)]),
        intake_repository=FakeIntakeRepo(events=[_life_event(t3)]),
        match_repository=FakeMatchRepo(matches=[_match(2, t4)]),
        advice_repository=FakeAdviceRepo(plans=[_advice(2, t5)]),
    )

    items = service.build_timeline(db=None, user_id=uuid4(), limit=2)
    assert len(items) == 2
    # top-2 by occurred_at desc
    assert items[0]["occurredAt"] == t5
    assert items[1]["occurredAt"] == t4
