"""Unit tests for advice generation service (no DB, no HTTP).

Covers the pure-logic public surface of AdviceService:
- _generate_today_advice — output shape, cap behavior
- _generate_weekly_plan — daily theme overrides
- _generate_lucky_days — date structure (monkeypatched clock)
- _generate_feng_shui_advice — default element vs. trait override
- _generate_focus_summary — focus string composition
- _get_figure_specific_advice — figure lookup
- _create_advice_items — output shape, template content
- generate_and_store — full flow with stubbed repo
- update_execution_feedback — feedback type → reminder mapping

Note: today-advice output is capped at 4 items with riskPreference first.
Templates for other dimensions are therefore tested via _create_advice_items
directly rather than through the top-level cap.
"""
import datetime as _dt
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services import advice_service
from app.services.advice_service import AdviceService


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------


class FakeAdviceRepo:
    def __init__(self):
        self.replace_calls = []
        self.update_feedback_calls = []
        self.update_feedback_return = None  # Advice object or None

    def replace_current(self, db, *, user_id, profile_version, summary):
        advice = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            profile_version=profile_version,
            summary=summary,
            execution_feedback={},
        )
        self.replace_calls.append(
            {"user_id": user_id, "profile_version": profile_version, "summary": summary}
        )
        return advice

    def get_current(self, db, *, user_id, profile_version):
        return None

    def update_feedback(self, db, *, user_id, profile_version, feedback):
        self.update_feedback_calls.append(
            {"user_id": user_id, "profile_version": profile_version, "feedback": feedback}
        )
        return self.update_feedback_return

    def list_recent(self, db, *, user_id, limit=10):
        return []


class FakeReminderRepo:
    def __init__(self):
        self.created = []

    def create(self, db, *, user_id, title, body, trigger_at, channel, meta):
        record = SimpleNamespace(
            user_id=user_id, title=title, body=body,
            trigger_at=trigger_at, channel=channel, meta=meta,
        )
        self.created.append(record)
        return record


class FakeDB:
    """Minimal stand-in: advice_service._create_followup_reminder calls db.commit()."""
    def commit(self):
        pass


class _FrozenDateTime:
    """Stand-in for advice_service.datetime with a fixed .now() — bypasses
    the immutability of the real datetime.datetime class.
    """
    def __init__(self, fixed: _dt.datetime):
        self._now = fixed

    def now(self, tz=None):
        return self._now


@pytest.fixture
def frozen_now(monkeypatch):
    fixed = _dt.datetime(2026, 7, 1, 12, 0, 0)
    monkeypatch.setattr(advice_service, "datetime", _FrozenDateTime(fixed))
    return fixed


def _profile(version_no=1, **traits):
    """Build a SimpleNamespace profile with given traits spread across groups."""
    p = SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        version_no=version_no,
        personality_traits={},
        ability_traits={},
        relationship_traits={},
        fortune_traits={},
        confidence_map={},
    )
    for k, v in traits.items():
        if k in {"riskPreference", "rationality", "emotionStability",
                 "longTermOrientation", "controlDrive", "introversion",
                 "elementPreference"}:
            p.personality_traits[k] = v
        elif k in {"executionStrength", "learningVelocity", "resourceIntegration"}:
            p.ability_traits[k] = v
        elif k in {"careerDrive", "wealthDrive"}:
            p.fortune_traits[k] = v
        else:
            p.personality_traits[k] = v
    return p


# ---------------------------------------------------------------------------
# _generate_today_advice — top-level cap behavior
# ---------------------------------------------------------------------------


def test_today_advice_high_risk_pref_uses_high_templates_capped_at_4():
    items = AdviceService()._generate_today_advice(
        {"riskPreference": 0.85}, {}, matched_figure=None
    )
    types = [item["type"] for item in items]
    assert "avoid" in types
    assert "action" in types
    # high risk template has 3 avoid + 3 action = 6, capped at 4
    assert len(items) == 4


def test_today_advice_medium_risk_pref_returns_exactly_4_medium_items():
    items = AdviceService()._generate_today_advice(
        {"riskPreference": 0.55}, {}, matched_figure=None
    )
    assert len(items) == 4
    contents = " ".join(item["content"] for item in items)
    assert "分散" in contents or "复盘" in contents


def test_today_advice_low_risk_pref_returns_low_templates():
    items = AdviceService()._generate_today_advice(
        {"riskPreference": 0.30}, {}, matched_figure=None
    )
    assert len(items) == 4
    contents = " ".join(item["content"] for item in items)
    assert "舒适区" in contents


def test_today_advice_capped_at_four_items_even_with_everything_high():
    # high everything → first 4 slots still taken by risk preference
    items = AdviceService()._generate_today_advice(
        {
            "riskPreference": 0.80,
            "emotionStability": 0.80,
            "controlDrive": 0.80,
            "careerDrive": 0.80,
            "rationality": 0.80,
            "executionStrength": 0.80,
            "wealthDrive": 0.80,
            "relationshipDependency": 0.70,
        },
        {},
        matched_figure="诸葛亮",
    )
    assert len(items) == 4
    # all 4 are risk preference; no figure-specific content makes it through
    contents = " ".join(item["content"] for item in items)
    assert "事必躬亲" not in contents


def test_today_advice_item_shape():
    items = AdviceService()._generate_today_advice(
        {"riskPreference": 0.80}, {}, matched_figure=None
    )
    for item in items:
        assert {"type", "title", "content", "reason", "status"} <= set(item.keys())
        assert item["status"] == "pending"


# ---------------------------------------------------------------------------
# _generate_today_advice — template content (tested via _create_advice_items
# because the [:4] cap shields later dimensions)
# ---------------------------------------------------------------------------


def test_emotion_low_template_has_avoid_and_action():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["emotionStability"]["low"], "avoid"
    )
    assert len(items) == 2
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["emotionStability"]["low"], "action"
    )
    assert len(items) == 3
    contents = " ".join(item["content"] for item in items)
    assert "情绪" in contents


def test_emotion_high_template_has_no_avoid():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["emotionStability"]["high"], "avoid"
    )
    assert items == []
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["emotionStability"]["high"], "action"
    )
    assert len(items) == 2


def test_control_high_template_includes_avoidance_and_action():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["controlDrive"]["high"], "avoid"
    )
    assert len(items) == 2
    contents = " ".join(item["content"] for item in items)
    assert "控制" in contents or "不确定" in contents


def test_career_low_template_mentions_passion():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["careerDrive"]["low"], "action"
    )
    assert len(items) == 2
    contents = " ".join(item["content"] for item in items)
    assert "热情" in contents or "成就感" in contents


def test_execution_low_template_includes_2min_rule():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["executionStrength"]["low"], "action"
    )
    contents = " ".join(item["content"] for item in items)
    assert "2分钟" in contents


def test_wealth_high_template_prompts_diversification():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["wealthDrive"]["high"], "action"
    )
    contents = " ".join(item["content"] for item in items)
    assert "多元收入" in contents or "财务" in contents


def test_relationship_high_template_prompts_networking():
    items = AdviceService()._create_advice_items(
        AdviceService.ADVICE_TEMPLATES["relationshipDependency"]["high"], "action"
    )
    contents = " ".join(item["content"] for item in items)
    assert "社交" in contents or "人脉" in contents


# ---------------------------------------------------------------------------
# _generate_weekly_plan
# ---------------------------------------------------------------------------


def test_weekly_plan_default_seven_days():
    plans = AdviceService()._generate_weekly_plan({}, matched_figure=None)
    assert len(plans) == 7
    days = [p["day"] for p in plans]
    assert days == [1, 2, 3, 4, 5, 6, 7]


def test_weekly_plan_each_item_has_day_title_description():
    plans = AdviceService()._generate_weekly_plan({}, matched_figure=None)
    for plan in plans:
        assert {"day", "title", "description"} <= set(plan.keys())


def test_weekly_plan_high_risk_overrides_day_3_and_5():
    plans = AdviceService()._generate_weekly_plan(
        {"riskPreference": 0.80}, matched_figure=None
    )
    day_3 = next(p for p in plans if p["day"] == 3)
    day_5 = next(p for p in plans if p["day"] == 5)
    assert day_3["title"] == "风险评估"
    assert day_5["title"] == "决策复盘"


def test_weekly_plan_low_emotion_appends_relaxation_day():
    plans = AdviceService()._generate_weekly_plan(
        {"emotionStability": 0.40}, matched_figure=None
    )
    # 7 default + 1 extra (relaxation on day 6)
    assert len(plans) == 8
    days = {p["day"] for p in plans}
    assert 6 in days


def test_weekly_plan_low_emotion_overrides_day_1():
    plans = AdviceService()._generate_weekly_plan(
        {"emotionStability": 0.40}, matched_figure=None
    )
    day_1 = next(p for p in plans if p["day"] == 1)
    assert day_1["title"] == "情绪记录"


def test_weekly_plan_high_control_drive_overrides_day_2():
    plans = AdviceService()._generate_weekly_plan(
        {"controlDrive": 0.80}, matched_figure=None
    )
    day_2 = next(p for p in plans if p["day"] == 2)
    assert day_2["title"] == "信任练习"


# ---------------------------------------------------------------------------
# _generate_lucky_days
# ---------------------------------------------------------------------------


def test_lucky_days_returns_three_within_thirty_days(frozen_now):
    lucky = AdviceService()._generate_lucky_days({})
    assert len(lucky) == 3
    today = frozen_now.date()
    for entry in lucky:
        date = _dt.datetime.strptime(entry["date"], "%Y-%m-%d").date()
        assert today < date <= today + _dt.timedelta(days=30)
        assert "activity" in entry
        assert "note" in entry


def test_lucky_days_activities_cycle_through_map(frozen_now):
    lucky = AdviceService()._generate_lucky_days({})
    activities = [entry["activity"] for entry in lucky]
    # first three are 签订合同, 社交应酬, 学习进修 (fixed ordering)
    assert activities[0] == "签订合同"
    assert activities[1] == "社交应酬"
    assert activities[2] == "学习进修"


# ---------------------------------------------------------------------------
# _generate_feng_shui_advice
# ---------------------------------------------------------------------------


def test_feng_shui_default_is_wood_element():
    advice = AdviceService()._generate_feng_shui_advice({})
    assert advice["luckyDirection"] == "东方"
    assert advice["luckyColor"] == "青、绿色"
    assert advice["luckyAnimal"] == "虎、兔"
    assert isinstance(advice["suggestions"], list)
    assert len(advice["suggestions"]) == 3


def test_feng_shui_uses_element_preference_when_provided():
    advice = AdviceService()._generate_feng_shui_advice({"elementPreference": "火"})
    assert advice["luckyDirection"] == "南方"
    assert advice["luckyColor"] == "红、紫色"


def test_feng_shui_falls_back_for_unknown_element():
    advice = AdviceService()._generate_feng_shui_advice({"elementPreference": "光"})
    # unknown element → default to wood
    assert advice["luckyDirection"] == "东方"


# ---------------------------------------------------------------------------
# _generate_focus_summary
# ---------------------------------------------------------------------------


def test_focus_summary_default_is_self_improvement():
    summary = AdviceService()._generate_focus_summary({}, matched_figure=None)
    assert summary == "持续自我提升"


def test_focus_summary_includes_risk_control():
    summary = AdviceService()._generate_focus_summary(
        {"riskPreference": 0.80}, matched_figure=None
    )
    assert "风险控制" in summary


def test_focus_summary_includes_long_term_planning():
    summary = AdviceService()._generate_focus_summary(
        {"longTermOrientation": 0.70}, matched_figure=None
    )
    assert "长期规划" in summary


def test_focus_summary_includes_career_development():
    summary = AdviceService()._generate_focus_summary(
        {"careerDrive": 0.80}, matched_figure=None
    )
    assert "事业发展" in summary


def test_focus_summary_includes_figure_mentorship():
    summary = AdviceService()._generate_focus_summary({}, matched_figure="诸葛亮")
    assert "学习诸葛亮" in summary


def test_focus_summary_joins_multiple_focuses():
    summary = AdviceService()._generate_focus_summary(
        {"riskPreference": 0.80, "careerDrive": 0.80}, matched_figure="刘邦"
    )
    # joined with '、'
    assert "、" in summary
    assert "风险控制" in summary
    assert "事业发展" in summary
    assert "学习刘邦" in summary


# ---------------------------------------------------------------------------
# _get_figure_specific_advice
# ---------------------------------------------------------------------------


def test_figure_specific_advice_known_figure_returns_two_items():
    items = AdviceService()._get_figure_specific_advice("曹操")
    assert len(items) == 2
    types = {item["type"] for item in items}
    assert "action" in types
    assert "avoid" in types


def test_figure_specific_advice_known_figure_zhuge_content():
    items = AdviceService()._get_figure_specific_advice("诸葛亮")
    contents = " ".join(item["content"] for item in items)
    assert "周密计划" in contents or "事必躬亲" in contents


def test_figure_specific_advice_unknown_figure_returns_empty():
    items = AdviceService()._get_figure_specific_advice("马丁·路德·金")
    assert items == []


# ---------------------------------------------------------------------------
# _create_advice_items
# ---------------------------------------------------------------------------


def test_create_advice_items_avoid_type_label():
    items = AdviceService()._create_advice_items(
        {"avoid": ["示例内容001示例"]}, "avoid"
    )
    assert items[0]["type"] == "avoid"
    assert items[0]["reason"] == "基于忌的个性化建议"
    assert items[0]["status"] == "pending"
    # title is content[:10]
    assert items[0]["title"] == "示例内容001示例"[:10]


def test_create_advice_items_action_type_label():
    items = AdviceService()._create_advice_items(
        {"action": ["示例内容001示例"]}, "action"
    )
    assert items[0]["type"] == "action"
    assert items[0]["reason"] == "基于宜的个性化建议"


def test_create_advice_items_record_type_label():
    items = AdviceService()._create_advice_items(
        {"record": ["示例内容001示例"]}, "record"
    )
    assert items[0]["type"] == "record"
    assert items[0]["reason"] == "基于记的个性化建议"


def test_create_advice_items_missing_key_returns_empty():
    items = AdviceService()._create_advice_items({"avoid": []}, "action")
    assert items == []


# ---------------------------------------------------------------------------
# generate_and_store (full flow)
# ---------------------------------------------------------------------------


def test_generate_and_store_calls_repo_with_summary():
    repo = FakeAdviceRepo()
    service = AdviceService(repository=repo)
    profile = _profile(version_no=2, riskPreference=0.55, careerDrive=0.60)

    match_response = SimpleNamespace(
        topMatches=[SimpleNamespace(figureName="张良")]
    )

    advice = service.generate_and_store(
        db=None, user_id=uuid4(), profile=profile, match_response=match_response
    )

    assert repo.replace_calls, "repository.replace_current was not called"
    call = repo.replace_calls[0]
    assert call["profile_version"] == 2
    summary = call["summary"]
    assert summary["matchedFigure"] == "张良"
    assert "todayAdvice" in summary
    assert "weeklyPlan" in summary
    assert "luckyDays" in summary
    assert "fengShui" in summary
    assert "focus" in summary
    assert advice.profile_version == 2


def test_generate_and_store_handles_no_match():
    repo = FakeAdviceRepo()
    service = AdviceService(repository=repo)
    profile = _profile(version_no=1, riskPreference=0.55)

    advice = service.generate_and_store(
        db=None, user_id=uuid4(), profile=profile, match_response=None
    )

    assert advice.summary["matchedFigure"] is None


def test_generate_and_store_handles_match_without_topMatches_attr():
    """A match_response that lacks topMatches should not crash."""
    repo = FakeAdviceRepo()
    service = AdviceService(repository=repo)
    profile = _profile(version_no=1)

    advice = service.generate_and_store(
        db=None, user_id=uuid4(), profile=profile, match_response=SimpleNamespace()
    )

    assert advice.summary["matchedFigure"] is None


def test_generate_and_store_handles_empty_topMatches_list():
    repo = FakeAdviceRepo()
    service = AdviceService(repository=repo)
    profile = _profile(version_no=1)

    match_response = SimpleNamespace(topMatches=[])
    advice = service.generate_and_store(
        db=None, user_id=uuid4(), profile=profile, match_response=match_response
    )

    assert advice.summary["matchedFigure"] is None


# ---------------------------------------------------------------------------
# update_execution_feedback
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("feedback_type,expected_days,expected_title", [
    ("completed", 7, "复盘建议执行效果"),
    ("in_progress", 3, "建议执行进度跟进"),
    ("started", 3, "建议执行进度跟进"),
    ("rejected", 5, "尝试新的改命建议"),
    ("skipped", 5, "尝试新的改命建议"),
    ("failed", 5, "重新评估改命建议"),
])
def test_update_execution_feedback_creates_reminder_per_type(
    monkeypatch, feedback_type, expected_days, expected_title, frozen_now
):
    advice_repo = FakeAdviceRepo()
    advice_repo.update_feedback_return = SimpleNamespace(id=uuid4(), execution_feedback={})

    fake_reminder = FakeReminderRepo()
    monkeypatch.setattr(
        "app.repositories.reminder_repository.ReminderRepository",
        lambda: fake_reminder,
    )

    service = AdviceService(repository=advice_repo)
    result = service.update_execution_feedback(
        db=FakeDB(),
        user_id=uuid4(),
        profile_version=1,
        feedback_type=feedback_type,
        feedback_text="我的反馈",
        advice_item_id="item-42",
    )

    assert result == {"success": True, "message": "Feedback recorded"}
    assert len(fake_reminder.created) == 1
    reminder = fake_reminder.created[0]
    expected_trigger = frozen_now + _dt.timedelta(days=expected_days)
    assert reminder.trigger_at == expected_trigger
    assert reminder.title == expected_title
    assert reminder.channel == "push"
    assert reminder.meta == {"advice_item_id": "item-42", "feedback_type": feedback_type}


def test_update_execution_feedback_unknown_type_uses_defaults(monkeypatch, frozen_now):
    advice_repo = FakeAdviceRepo()
    advice_repo.update_feedback_return = SimpleNamespace(id=uuid4(), execution_feedback={})
    fake_reminder = FakeReminderRepo()
    monkeypatch.setattr(
        "app.repositories.reminder_repository.ReminderRepository",
        lambda: fake_reminder,
    )

    service = AdviceService(repository=advice_repo)
    service.update_execution_feedback(
        db=FakeDB(),
        user_id=uuid4(),
        profile_version=1,
        feedback_type="mystery_type",
        feedback_text=None,
        advice_item_id=None,
    )

    reminder = fake_reminder.created[0]
    # unknown type falls through to 3-day default
    assert reminder.title == "改命建议跟进"
    assert "当前建议" in reminder.body


def test_update_execution_feedback_returns_failure_when_advice_missing(monkeypatch):
    advice_repo = FakeAdviceRepo()
    advice_repo.update_feedback_return = None  # repo found nothing
    fake_reminder = FakeReminderRepo()
    monkeypatch.setattr(
        "app.repositories.reminder_repository.ReminderRepository",
        lambda: fake_reminder,
    )

    service = AdviceService(repository=advice_repo)
    result = service.update_execution_feedback(
        db=FakeDB(), user_id=uuid4(), profile_version=1,
        feedback_type="completed",
    )

    assert result == {"success": False, "message": "Advice not found"}
    assert fake_reminder.created == []  # no reminder created
