"""Unit tests for profile services (no DB, no HTTP).

Covers pure-logic services:
- ProfileService.generate_profile — trait computation, version increment, persistence payload
- ProfileChangeService.build_change_summary — diff, headline, uncertainty, evidence delta

Repositories are fake; no SQLAlchemy Session is touched.
"""
from types import SimpleNamespace
from uuid import uuid4

from app.services.profile_change_service import ProfileChangeService
from app.services.profile_service import ProfileService


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------


class FakeProfileRepo:
    """Captures create_version calls; lets tests preload a 'current' profile."""

    def __init__(self, current=None):
        self.current = current
        self.created = []

    def get_current(self, db, *, user_id):
        return self.current

    def create_version(self, db, *, user_id, version_no, summary,
                       personality_traits, ability_traits, relationship_traits,
                       fortune_traits, confidence_map, source_snapshot,
                       engine_version="v0"):
        profile = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            version_no=version_no,
            summary=summary,
            personality_traits=personality_traits,
            ability_traits=ability_traits,
            relationship_traits=relationship_traits,
            fortune_traits=fortune_traits,
            confidence_map=confidence_map,
            source_snapshot=source_snapshot,
            engine_version=engine_version,
        )
        self.created.append(profile)
        # Subsequent recomputes should see this new profile as 'current'
        self.current = profile
        return profile


class FakeIntakeRepo:
    def __init__(self, records=None, events=None):
        self.records = records or []
        self.events = events or []

    def list_records(self, db, *, user_id):
        return list(self.records)

    def list_life_events(self, db, *, user_id):
        return list(self.events)


class FakeBaziRepo:
    def __init__(self, bazi=None):
        self.bazi = bazi

    def get_current(self, db, *, user_id):
        return self.bazi


def _record(intake_type, payload=None):
    return SimpleNamespace(intake_type=intake_type, payload=payload or {})


def _bazi(score):
    return SimpleNamespace(score=score)


def _user():
    return SimpleNamespace(id=uuid4())


# ---------------------------------------------------------------------------
# ProfileService.generate_profile
# ---------------------------------------------------------------------------


def test_generate_profile_first_version_with_no_evidence():
    profile_repo = FakeProfileRepo(current=None)
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=[], events=[]),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, snapshot = service.generate_profile(db=None, user=_user())

    assert profile.version_no == 1
    assert snapshot == {
        "intakeRecordCount": 0,
        "questionnaireCount": 0,
        "lifeEventCount": 0,
        "baziScore": None,
    }
    # base risk preference = 0.35 + 0 (events) + 0.6*0.04 (default bazi ratio) = 0.374
    assert profile.personality_traits["riskPreference"] == 0.37
    # base rationality = 0.55 + 0.6*0.06 (default bazi ratio) = 0.586
    assert profile.personality_traits["rationality"] == 0.59
    # confidence base for personality = 0.55
    assert profile.confidence_map["personality"] == 0.55
    # no high traits triggered
    assert profile.summary["keywords"] == ["持续校准", "画像演进"]
    assert profile_repo.created == [profile]


def test_generate_profile_increments_version_from_previous():
    previous = SimpleNamespace(
        id=uuid4(), user_id=uuid4(), version_no=3, source_snapshot={}
    )
    profile_repo = FakeProfileRepo(current=previous)
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    assert profile.version_no == 4


def test_generate_profile_records_questionnaire_count_in_snapshot():
    records = [_record("questionnaire_answer", {"questionId": "q1", "value": "x"}) for _ in range(5)]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=records),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    _, snapshot = service.generate_profile(db=None, user=_user())

    assert snapshot["questionnaireCount"] == 5
    assert snapshot["intakeRecordCount"] == 5


def test_generate_profile_high_risk_answer_raises_risk_preference():
    """Two of two risk answers say 'seize the opportunity' → ratio 1.0 → +0.15."""
    records = [
        _record("questionnaire_answer", {"questionId": "risk_q", "value": "快速抓住机会"}),
        _record("questionnaire_answer", {"questionId": "risk_q2", "value": "会，我享受高风险"}),
    ]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=records, events=[]),
        bazi_repository=FakeBaziRepo(bazi=_bazi(60)),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    # questionnaire_count=2 (both records are questionnaire_answer), 0 events, bazi 60→0.6 ratio
    # 0.35 + 2*0.06 + 0 + 0.6*0.04 + 1.0*0.15 = 0.644
    assert profile.personality_traits["riskPreference"] == 0.64


def test_generate_profile_life_events_drive_career_and_control():
    events = [SimpleNamespace(id=i) for i in range(4)]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=[], events=events),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    # control_drive = 0.5 + 4*0.05 = 0.70
    assert profile.personality_traits["controlDrive"] == 0.7
    # career_drive = 0.6 + 4*0.04 = 0.76
    assert profile.fortune_traits["careerDrive"] == 0.76
    # ability: resourceIntegration = 0.54 + 4*0.03 = 0.66
    assert profile.ability_traits["resourceIntegration"] == 0.66
    # confidence in ability = 0.5 + 4*0.08 = 0.82
    assert profile.confidence_map["ability"] == 0.82


def test_generate_profile_trait_caps_are_respected():
    """Lots of evidence should not push traits above their caps."""
    records = [_record("questionnaire_answer", {"questionId": f"q{i}", "value": "v"}) for i in range(30)]
    events = [SimpleNamespace(id=i) for i in range(20)]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=records, events=events),
        bazi_repository=FakeBaziRepo(bazi=_bazi(100)),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    assert profile.personality_traits["riskPreference"] <= 0.92
    assert profile.personality_traits["rationality"] <= 0.9
    assert profile.personality_traits["controlDrive"] <= 0.88
    assert profile.personality_traits["introversion"] >= 0.2
    assert profile.relationship_traits["relationshipDependency"] >= 0.2
    assert profile.confidence_map["personality"] <= 0.9
    assert profile.confidence_map["ability"] <= 0.88


def test_generate_profile_keywords_triggered_by_high_traits():
    """Stack enough evidence to trigger all three keyword branches."""
    # 30 questionnaire records + 5 events + bazi 100 + risk-leaning answers
    records = (
        [_record("questionnaire_answer", {"questionId": "risk_x", "value": "快速抓住机会"}) for _ in range(10)]
        + [_record("questionnaire_answer", {"questionId": "filler", "value": "x"}) for _ in range(20)]
    )
    events = [SimpleNamespace(id=i) for i in range(5)]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=records, events=events),
        bazi_repository=FakeBaziRepo(bazi=_bazi(100)),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    keywords = profile.summary["keywords"]
    assert "高风险偏好" in keywords  # risk >= 0.65
    assert "高事业驱动" in keywords  # career >= 0.68
    assert "长线主义" in keywords    # long_term >= 0.60


def test_generate_profile_buckets_questionnaire_answers_by_keyword():
    """Verify answer bucketing (risk / emotion / career / execution / relationship / logic)."""
    records = [
        _record("questionnaire_answer", {"questionId": "emotion_q", "value": "很快就能调整"}),
        _record("questionnaire_answer", {"questionId": "career_q", "value": "成为行业顶尖"}),
        _record("questionnaire_answer", {"questionId": "execution_q", "value": "立刻去做"}),
        _record("questionnaire_answer", {"questionId": "logic_q", "value": "极度理性"}),
        _record("questionnaire_answer", {"questionId": "relationship_q", "value": "更喜欢独处"}),
    ]
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(records=records),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    # emotion_stab +0.15, career +0.12, execution +0.12, rationality +0.12, introversion +0.25
    assert profile.personality_traits["emotionStability"] > 0.5
    assert profile.fortune_traits["careerDrive"] > 0.6
    assert profile.ability_traits["executionStrength"] > 0.52
    assert profile.personality_traits["rationality"] > 0.55
    assert profile.personality_traits["introversion"] > 0.3


def test_generate_profile_summary_score_is_average_times_100():
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(),
        bazi_repository=FakeBaziRepo(bazi=_bazi(80)),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    # score is an int average across all 14 trait values, scaled to 0-100
    assert isinstance(profile.summary["score"], int)
    assert 0 <= profile.summary["score"] <= 100


def test_generate_profile_engine_version_default():
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    assert profile.engine_version == "v0"


def test_generate_profile_bazi_score_floors_to_zero_ratio_when_absent():
    profile_repo = FakeProfileRepo()
    service = ProfileService(
        repository=profile_repo,
        intake_repository=FakeIntakeRepo(),
        bazi_repository=FakeBaziRepo(bazi=None),
    )

    profile, _ = service.generate_profile(db=None, user=_user())

    # With no bazi, bazi_score_ratio=0.6 default; rationality = 0.55 + 0 + 0.6*0.06 = 0.586
    assert profile.personality_traits["rationality"] == 0.59


# ---------------------------------------------------------------------------
# ProfileChangeService
# ---------------------------------------------------------------------------


def _profile(version_no, personality, ability, relationship, fortune, confidence, source=None):
    return SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        version_no=version_no,
        personality_traits=personality,
        ability_traits=ability,
        relationship_traits=relationship,
        fortune_traits=fortune,
        confidence_map=confidence,
        source_snapshot=source or {},
    )


def test_build_change_summary_first_profile_uses_first_time_headline():
    current = _profile(1, {"a": 0.5}, {"b": 0.5}, {"c": 0.5}, {"d": 0.5}, {"personality": 0.5})
    service = ProfileChangeService()

    changed, reason = service.build_change_summary(
        previous_profile=None,
        current_profile=current,
        reason="initial",
        source_snapshot={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    # First-profile path takes a special headline; diffs are still computed against 0 baseline
    assert "首次建档" in reason["headline"]
    assert reason["trigger"] == "initial"
    assert reason["newEvidence"] == []
    # all dimensions treated as 'raised' (compared to 0 baseline)
    assert set(changed["raised"]) == {"a", "b", "c", "d"}
    assert changed["lowered"] == []


def test_build_change_summary_ignores_small_deltas_below_threshold():
    previous = _profile(1, {"a": 0.50}, {"b": 0.50}, {}, {}, {"personality": 0.5})
    current = _profile(2, {"a": 0.52}, {"b": 0.51}, {}, {}, {"personality": 0.5})  # +0.02, +0.01
    service = ProfileChangeService()

    changed, reason = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 1, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    assert changed["topDiffs"] == []
    assert "暂未触发明显维度变化" in reason["headline"]


def test_build_change_summary_records_raised_and_lowered_dimensions():
    previous = _profile(
        1,
        personality={"riskPreference": 0.40, "rationality": 0.70},
        ability={"executionStrength": 0.50},
        relationship={},
        fortune={},
        confidence={"personality": 0.5},
    )
    current = _profile(
        2,
        personality={"riskPreference": 0.75, "rationality": 0.50},
        ability={"executionStrength": 0.50},
        relationship={},
        fortune={},
        confidence={"personality": 0.5},
    )
    service = ProfileChangeService()

    changed, _ = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    assert "riskPreference" in changed["raised"]
    assert "rationality" in changed["lowered"]
    # topDiffs sorted by abs(delta) desc
    assert changed["topDiffs"][0]["delta"] == 0.35  # riskPreference


def test_build_change_summary_top_diffs_capped_at_six():
    # 8 trait dimensions, all moving by 0.10
    previous_traits = {f"trait_{i}": 0.30 for i in range(8)}
    current_traits = {f"trait_{i}": 0.40 for i in range(8)}
    previous = _profile(1, previous_traits, {}, {}, {}, {"personality": 0.5})
    current = _profile(2, current_traits, {}, {}, {}, {"personality": 0.5})
    service = ProfileChangeService()

    changed, _ = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    assert len(changed["topDiffs"]) == 6
    assert len(changed["raised"]) == 8


def test_build_change_summary_uncertain_dimensions_from_low_confidence():
    previous = _profile(1, {}, {}, {}, {}, {"personality": 0.5})
    current = _profile(2, {}, {}, {}, {}, {"personality": 0.4, "ability": 0.7, "relationship": 0.55})
    service = ProfileChangeService()

    changed, _ = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    # personality 0.4 < 0.6, relationship 0.55 < 0.6 → uncertain
    assert set(changed["uncertainDimensions"]) == {"personality", "relationship"}


def test_build_change_summary_new_evidence_only_for_positive_deltas():
    previous = _profile(1, {}, {}, {}, {}, {}, source={"intakeRecordCount": 10, "questionnaireCount": 5, "lifeEventCount": 3})
    current = _profile(2, {}, {}, {}, {}, {}, source={"intakeRecordCount": 13, "questionnaireCount": 5, "lifeEventCount": 1})
    service = ProfileChangeService()

    _, reason = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 13, "questionnaireCount": 5, "lifeEventCount": 1},
    )

    # intakeRecordDelta = +3, questionnaireDelta = 0, lifeEventDelta = -2
    assert reason["newEvidence"] == ["证据总量"]
    assert reason["evidenceDelta"] == {
        "intakeRecordDelta": 3,
        "questionnaireDelta": 0,
        "lifeEventDelta": -2,
    }


def test_build_change_summary_headline_includes_evidence_text():
    previous = _profile(1, {"risk": 0.40}, {}, {}, {}, {}, source={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0})
    current = _profile(2, {"risk": 0.70}, {}, {}, {}, {}, source={"intakeRecordCount": 5, "questionnaireCount": 2, "lifeEventCount": 0})
    service = ProfileChangeService()

    _, reason = service.build_change_summary(
        previous_profile=previous,
        current_profile=current,
        reason="auto",
        source_snapshot={"intakeRecordCount": 5, "questionnaireCount": 2, "lifeEventCount": 0},
    )

    assert "risk" in reason["headline"]
    assert "上升" in reason["headline"]
    assert "V2" in reason["headline"]
    # newEvidence: 问答补充 +2, 人生事件 0, 证据总量 +5
    assert "问答补充" in reason["headline"]
    assert "证据总量" in reason["headline"]


class FakeChangeLogRepo:
    def __init__(self):
        self.created = []

    def create(self, db, *, user_id, from_version, to_version, changed_dimensions, reason_summary):
        log = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            from_version=from_version,
            to_version=to_version,
            changed_dimensions=changed_dimensions,
            reason_summary=reason_summary,
        )
        self.created.append(log)
        return log

    def list_recent(self, db, *, user_id, limit=10):
        return list(self.created)[:limit]


def test_record_change_passes_versions_to_repository():
    previous = _profile(1, {"a": 0.4}, {}, {}, {}, {"p": 0.5})
    current = _profile(2, {"a": 0.7}, {}, {}, {}, {"p": 0.5})
    repo = FakeChangeLogRepo()
    service = ProfileChangeService(repository=repo)

    log = service.record_change(
        db=None, user_id=uuid4(),
        previous_profile=previous, current_profile=current,
        reason="auto", source_snapshot={"intakeRecordCount": 1, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    assert log.from_version == 1
    assert log.to_version == 2
    assert repo.created == [log]


def test_record_change_uses_zero_from_version_when_no_previous():
    current = _profile(1, {"a": 0.5}, {}, {}, {}, {"p": 0.5})
    repo = FakeChangeLogRepo()
    service = ProfileChangeService(repository=repo)

    log = service.record_change(
        db=None, user_id=uuid4(),
        previous_profile=None, current_profile=current,
        reason="init", source_snapshot={"intakeRecordCount": 0, "questionnaireCount": 0, "lifeEventCount": 0},
    )

    assert log.from_version == 0
    assert log.to_version == 1
