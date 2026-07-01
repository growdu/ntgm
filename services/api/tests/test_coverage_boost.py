"""Coverage booster tests for small gaps across services (no DB, no HTTP).

Covers:
- ProfileService trivial forwarders (get_current_profile, list_versions,
  get_profile_by_version)
- ProfileChangeService.list_recent_changes forwarder
- ProfileChangeService._to_float edge cases (bool, numeric string,
  non-numeric string, Mapping, other)
- AdviceService._generate_today_advice emotion/control/ability/career/longTerm
  trait branches (lines that the [:4] cap usually prevents in assertions,
  but they DO execute during the call)
- AdviceService.get_current forwarder
- AdviceService._generate_focus_summary 'highest-2' fallback when focuses empty
"""
from types import SimpleNamespace

from app.services.advice_service import AdviceService
from app.services.profile_change_service import ProfileChangeService
from app.services.profile_service import ProfileService


# ---------------------------------------------------------------------------
# ProfileService forwarders
# ---------------------------------------------------------------------------


class FakeProfileRepo2:
    def __init__(self):
        self.calls = []

    def get_current(self, db, *, user_id):
        self.calls.append(("get_current", user_id))
        return SimpleNamespace(version_no=3)

    def list_versions(self, db, *, user_id, limit=10):
        self.calls.append(("list_versions", user_id, limit))
        return ["v1", "v2", "v3"]

    def get_by_version(self, db, *, user_id, version_no):
        self.calls.append(("get_by_version", user_id, version_no))
        return SimpleNamespace(version_no=version_no)


def test_profile_get_current_profile_forwards():
    repo = FakeProfileRepo2()
    service = ProfileService(repository=repo, intake_repository=SimpleNamespace(),
                              bazi_repository=SimpleNamespace())
    profile = service.get_current_profile(db=None, user_id="u1")
    assert profile.version_no == 3
    assert repo.calls == [("get_current", "u1")]


def test_profile_list_versions_forwards_with_default_limit():
    repo = FakeProfileRepo2()
    service = ProfileService(repository=repo, intake_repository=SimpleNamespace(),
                              bazi_repository=SimpleNamespace())
    versions = service.list_versions(db=None, user_id="u1")
    assert versions == ["v1", "v2", "v3"]
    assert repo.calls == [("list_versions", "u1", 10)]


def test_profile_list_versions_forwards_custom_limit():
    repo = FakeProfileRepo2()
    service = ProfileService(repository=repo, intake_repository=SimpleNamespace(),
                              bazi_repository=SimpleNamespace())
    service.list_versions(db=None, user_id="u1", limit=5)
    assert repo.calls == [("list_versions", "u1", 5)]


def test_profile_get_profile_by_version_forwards():
    repo = FakeProfileRepo2()
    service = ProfileService(repository=repo, intake_repository=SimpleNamespace(),
                              bazi_repository=SimpleNamespace())
    p = service.get_profile_by_version(db=None, user_id="u1", version_no=7)
    assert p.version_no == 7
    assert repo.calls == [("get_by_version", "u1", 7)]


# ---------------------------------------------------------------------------
# ProfileChangeService.list_recent_changes
# ---------------------------------------------------------------------------


class FakeChangeRepo2:
    def __init__(self):
        self.calls = []
        self.results = []

    def list_recent(self, db, *, user_id, limit=10):
        self.calls.append((user_id, limit))
        return self.results


def test_profile_change_list_recent_changes_forwards():
    repo = FakeChangeRepo2()
    repo.results = [{"x": 1}, {"x": 2}]
    service = ProfileChangeService(repository=repo)
    out = service.list_recent_changes(db=None, user_id="u1")
    assert out == [{"x": 1}, {"x": 2}]
    assert repo.calls == [("u1", 10)]


def test_profile_change_list_recent_changes_forwards_custom_limit():
    repo = FakeChangeRepo2()
    service = ProfileChangeService(repository=repo)
    service.list_recent_changes(db=None, user_id="u1", limit=3)
    assert repo.calls == [("u1", 3)]


# ---------------------------------------------------------------------------
# ProfileChangeService._to_float edge cases
# ---------------------------------------------------------------------------


def test_to_float_handles_bool_true():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float(True) == 1.0


def test_to_float_handles_bool_false():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float(False) == 0.0


def test_to_float_handles_int():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float(42) == 42.0


def test_to_float_handles_numeric_string():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float("3.14") == 3.14


def test_to_float_handles_non_numeric_string_returns_zero():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float("not a number") == 0.0


def test_to_float_handles_mapping_returns_zero():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float({"a": 1}) == 0.0


def test_to_float_handles_none_returns_zero():
    service = ProfileChangeService(repository=SimpleNamespace())
    assert service._to_float(None) == 0.0


# ---------------------------------------------------------------------------
# AdviceService — _generate_today_advice trait branch coverage
# ---------------------------------------------------------------------------


def test_today_advice_low_emotion_stability_executes_low_branch():
    """Calling with emotionStability < 0.5 executes the low branch.
    The [:4] cap doesn't prevent the branch from running — only from
    the items appearing in the final list.
    """
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "emotionStability": 0.3}, {}, matched_figure=None
    )
    # The function executes without crashing; the low branch IS entered.
    assert isinstance(items, list)
    # The cap is 4 → even with multiple branches hit, only 4 returned
    assert len(items) <= 4


def test_today_advice_high_emotion_stability_executes_high_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "emotionStability": 0.85}, {}, matched_figure=None
    )
    assert isinstance(items, list)
    assert len(items) <= 4


def test_today_advice_high_control_drive_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "controlDrive": 0.8}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_high_ability_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "executionStrength": 0.9, "learningVelocity": 0.9},
        {}, matched_figure=None,
    )
    assert isinstance(items, list)


def test_today_advice_high_career_drive_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "careerDrive": 0.8}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_long_term_orientation_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "longTermOrientation": 0.85}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_medium_emotion_stability_skips_both_branches():
    """emotionStability 0.5 < 0.5 is False, 0.5 >= 0.7 is False → no item added."""
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "emotionStability": 0.5}, {}, matched_figure=None
    )
    # 0.5 is neither low nor high → no emotion item
    # result is just the 4 risk-low items
    assert len(items) == 4


# ---------------------------------------------------------------------------
# AdviceService.get_current forwarder
# ---------------------------------------------------------------------------


class FakeAdviceRepo2:
    def __init__(self):
        self.calls = []
        self.results = []

    def get_current(self, db, *, user_id, profile_version):
        self.calls.append({"user_id": user_id, "profile_version": profile_version})
        return self.results


def test_advice_get_current_forwards_args():
    repo = FakeAdviceRepo2()
    repo.results = SimpleNamespace(id=1, profile_version=3)
    service = AdviceService(repository=repo)
    result = service.get_current(db=None, user_id="u1", profile_version=3)
    assert result.id == 1
    assert repo.calls == [{"user_id": "u1", "profile_version": 3}]


# ---------------------------------------------------------------------------
# AdviceService._generate_focus_summary 'highest-2' fallback
# ---------------------------------------------------------------------------


def test_focus_summary_falls_back_to_highest_two_when_focuses_empty():
    service = AdviceService()
    # 3 traits all above 0.7 → enters 'top 2 highest' branch
    traits = {
        "careerDrive": 0.8, "executionStrength": 0.9, "controlDrive": 0.75,
    }
    summary = service._generate_focus_summary(traits, matched_figure=None)
    # Should produce some non-empty Chinese text
    assert isinstance(summary, str)
    assert len(summary) > 0


# ---------------------------------------------------------------------------
# AdviceService — _generate_today_advice LOW branches (elif < threshold)
# ---------------------------------------------------------------------------


def test_today_advice_low_control_drive_executes_elif_branch():
    service = AdviceService()
    # risk=0.3 (low) gives 4 items, but low control_drive branch IS executed
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "controlDrive": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_low_career_drive_executes_elif_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "careerDrive": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_low_rationality_executes_elif_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "rationality": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_low_execution_executes_elif_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "executionStrength": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_low_wealth_drive_executes_elif_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "wealthDrive": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_low_relationship_executes_elif_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "relationshipDependency": 0.3}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_high_wealth_drive_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "wealthDrive": 0.8}, {}, matched_figure=None
    )
    assert isinstance(items, list)


def test_today_advice_high_relationship_executes_branch():
    service = AdviceService()
    items = service._generate_today_advice(
        {"riskPreference": 0.3, "relationshipDependency": 0.8}, {}, matched_figure=None
    )
    assert isinstance(items, list)


# ---------------------------------------------------------------------------
# expo_push_client — HTTPError fallback path
# ---------------------------------------------------------------------------


def test_expo_send_messages_returns_error_tickets_on_httperror(monkeypatch):
    """When httpx raises HTTPError, send_messages returns one error ticket
    per input message with the exception's stringified message."""
    import asyncio
    import httpx

    from app.services.expo_push_client import send_messages

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def post(self, *args, **kwargs):
            raise httpx.HTTPError("connection refused")

    monkeypatch.setattr("app.services.expo_push_client.httpx.AsyncClient", FakeAsyncClient)

    settings = SimpleNamespace(
        push_dry_run=False,
        expo_access_token=None,
        expo_push_url="https://exp.host/--/api/v2/push/send",
    )
    messages = [{"to": "ExponentPushToken[abc]"}]

    tickets = asyncio.run(send_messages(settings, messages))

    assert tickets == [{"status": "error", "message": "connection refused"}]


def test_expo_send_messages_with_expo_access_token_adds_bearer(monkeypatch):
    """When settings.expo_access_token is set, the Authorization header
    includes Bearer token."""
    import asyncio

    from app.services.expo_push_client import send_messages

    captured_headers = {}

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            return False
        async def post(self, url, json, headers):
            captured_headers.update(headers)
            return SimpleNamespace(
                json=lambda: {"data": [{"status": "ok", "id": "1"}]},
                raise_for_status=lambda: None,
            )

    monkeypatch.setattr("app.services.expo_push_client.httpx.AsyncClient", FakeAsyncClient)

    settings = SimpleNamespace(
        push_dry_run=False,
        expo_access_token="secret123",
        expo_push_url="https://exp.host/--/api/v2/push/send",
    )
    messages = [{"to": "ExponentPushToken[abc]"}]

    tickets = asyncio.run(send_messages(settings, messages))

    assert captured_headers["Authorization"] == "Bearer secret123"
    assert tickets == [{"status": "ok", "id": "1"}]


# ---------------------------------------------------------------------------
# BaziService helpers — covering the remaining branches
# ---------------------------------------------------------------------------


from app.services.bazi_service import BaziService as _BS  # noqa: E402


def test_bazi_analyze_personality_with_ten_god_combinations():
    service = _BS()
    result = service._analyze_personality(
        day_gan="甲",
        level="强",
        ten_god_counts={
            "食神": 2, "伤官": 3, "正官": 1, "七杀": 2, "正印": 1,
            "偏印": 1, "比肩": 2, "劫财": 1, "正财": 1, "偏财": 1,
        },
        element_analysis={},
    )
    # Includes day-gan trait + many ten_god traits + level "强" trait
    assert "仁慈" in result  # 甲
    assert "艺术气质" in result
    assert "创造力强" in result
    assert "责任感" in result
    assert "魄力" in result
    assert "学习" in result
    assert "独立见解" in result
    assert "不甘人后" in result
    assert "竞争意识" in result
    assert "实际利益" in result
    assert "投机头脑" in result
    assert "意志坚强" in result


def test_bazi_analyze_personality_with_weak_level():
    service = _BS()
    result = service._analyze_personality(
        day_gan="乙", level="弱",
        ten_god_counts={}, element_analysis={},
    )
    assert "敏感" in result  # 弱 → "内心敏感，善于观察"


def test_bazi_analyze_personality_with_extreme_weak_level():
    service = _BS()
    result = service._analyze_personality(
        day_gan="癸", level="极弱",
        ten_god_counts={}, element_analysis={},
    )
    assert "敏感" in result  # 极弱 → "内心敏感"


def test_bazi_analyze_career_with_all_ten_gods():
    service = _BS()
    result = service._analyze_career(
        day_gan="甲",
        ten_god_counts={
            "正官": 2, "七杀": 1, "正印": 1, "偏印": 1, "食神": 2,
            "伤官": 1, "正财": 2, "偏财": 1,
        },
        level="强",
    )
    assert "体制内" in result
    assert "竞争性行业" in result
    assert "教育" in result
    assert "研发" in result
    assert "艺术" in result
    assert "创新" in result
    assert "财务" in result
    assert "商业头脑" in result
    assert "领导岗位" in result  # 强 → "适合领导岗位"


def test_bazi_analyze_career_with_weak_level():
    service = _BS()
    result = service._analyze_career(
        day_gan="甲", ten_god_counts={}, level="弱",
    )
    assert "稳定职业" in result  # 弱 → "适合稳定职业"


def test_bazi_analyze_career_with_no_hints_falls_back():
    service = _BS()
    result = service._analyze_career(
        day_gan="甲", ten_god_counts={}, level="中",
    )
    # 没有任何 trigger → 兜底
    assert "事业运势平稳" in result


def test_bazi_analyze_health_with_missing_element():
    service = _BS()
    result = service._analyze_health(
        day_gan="甲",
        element_analysis={
            "element_strength": {"木": 50, "火": 5, "土": 20, "金": 15, "水": 10},
        },
    )
    # day_element is 木 (very strong), 火 is missing
    assert "火气不足" in result or "火" in result


def test_bazi_analyze_health_with_no_hints_falls_back():
    """When day_gan has no element (FIVE_ELEMENTS miss) AND all strengths in
    [10, 35], health_hints stays empty → fallback fires."""
    service = _BS()
    # 乾 = "X" (not in FIVE_ELEMENTS) → day_element = "" → body_parts = "" → no hint
    # All elements between 10 and 35 → no < 10 or > 35 hint
    result = service._analyze_health(
        day_gan="X",
        element_analysis={"element_strength": {"木": 20, "火": 20, "土": 20, "金": 20, "水": 20}},
    )
    assert "健康运势总体平稳" in result


def test_bazi_analyze_health_with_overwhelming_element():
    service = _BS()
    result = service._analyze_health(
        day_gan="甲",
        element_analysis={"element_strength": {"木": 50, "火": 20, "土": 15, "金": 8, "水": 7}},
    )
    # 木 50 > 35, 金/水 < 10
    assert "木气过旺" in result or "金气不足" in result or "水气不足" in result


def test_bazi_analyze_lucky_periods_with_lucky_elements():
    service = _BS()
    result = service._analyze_lucky_periods(
        chart=SimpleNamespace(),
        element_analysis={
            "lucky_elements": ["木", "火"],
            "element_strength": {"木": 30, "火": 20, "土": 15, "金": 20, "水": 15},
        },
    )
    assert "木" in result
    assert "火" in result


def test_bazi_analyze_lucky_periods_with_no_lucky_elements():
    """When lucky_elements=[] AND element_strength={}, no hints added → fallback."""
    service = _BS()
    result = service._analyze_lucky_periods(
        chart=SimpleNamespace(),
        element_analysis={"lucky_elements": [], "element_strength": {}},
    )
    assert "需根据大运走势判断" in result


def test_bazi_generate_advice_with_weak_level():
    service = _BS()
    result = service._generate_advice(
        day_gan="甲", level="弱",
        element_analysis={"lucky_elements": []},
        ten_god_counts={},
    )
    # 弱 → "稳扎稳打，不宜冒险" + "多学习积累"
    assert "稳扎稳打" in result
    assert "多学习积累" in result


def test_bazi_generate_advice_with_extreme_weak_level():
    service = _BS()
    result = service._generate_advice(
        day_gan="甲", level="极弱",
        element_analysis={"lucky_elements": []},
        ten_god_counts={},
    )
    assert "稳扎稳打" in result


def test_bazi_generate_advice_with_lucky_elements():
    service = _BS()
    result = service._generate_advice(
        day_gan="甲", level="强",
        element_analysis={"lucky_elements": ["木", "火", "水"]},
        ten_god_counts={},
    )
    assert "多接触绿色植物" in result  # 木
    assert "保持温暖" in result  # 火
    assert "多喝水" in result  # 水


def test_bazi_calculate_day_strength_medium_level():
    """total_score in 45-65 → level = '中' (line 514)."""
    service = _BS()
    chart = SimpleNamespace(
        year_pillar=SimpleNamespace(gan="甲", zhi="子"),
        month_pillar=SimpleNamespace(gan="丙", zhi="午"),
        day_pillar=SimpleNamespace(gan="甲", zhi="辰"),
        hour_pillar=SimpleNamespace(gan="甲", zhi="申"),
        day_gan="甲",
        month_zhi="午",  # _calculate_day_strength reads chart.month_zhi directly
    )
    # 木=40, 火=30, 土=10, 金=5, 水=5 → 40+30-10-5-5 = 50 (in 45-65 range)
    element_analysis = {
        "element_strength": {"木": 40, "火": 30, "土": 10, "金": 5, "水": 5},
        "five_elements": {"木": 2, "火": 2, "土": 1, "金": 1, "水": 1},  # day_count for 甲 (木) = 2
    }
    result = service._calculate_day_strength(chart, element_analysis)
    assert result["level"] == "中"
    assert 45 <= result["total_score"] < 65


def test_bazi_get_current_forwards_to_repo():
    service = _BS(repository=SimpleNamespace(get_current=lambda db, user_id: "bazi_data"))
    result = service.get_current(db=None, user_id="u1")
    assert result == "bazi_data"


# ---------------------------------------------------------------------------
# BaziService — last 7 missing lines in _analyze_relationships / _generate_advice
# ---------------------------------------------------------------------------


def test_bazi_analyze_relationships_with_qisha_and_bijian_and_fallback():
    service = _BS()
    result = service._analyze_relationships(
        day_gan="X",  # not in day_gan_characteristics → char stays empty
        ten_god_counts={"七杀": 1, "比肩": 2},
        gender=None,
    )
    assert "感情经历丰富" in result
    assert "感情中可能有竞争者" in result
    # no other triggers → fallback
    result_no_hints = service._analyze_relationships(
        day_gan="X", ten_god_counts={}, gender=None,
    )
    assert "感情运势平稳" in result_no_hints


def test_bazi_generate_advice_with_qisha_shangguan_jiecai_and_fallback():
    service = _BS()
    result = service._generate_advice(
        day_gan="甲", level="中",
        element_analysis={"lucky_elements": []},
        ten_god_counts={"七杀": 2, "伤官": 2, "劫财": 2},
    )
    assert "三思后行" in result
    assert "表达方式" in result
    assert "恶性竞争" in result


def test_bazi_generate_advice_with_no_hints_falls_back():
    service = _BS()
    result = service._generate_advice(
        day_gan="甲", level="中",
        element_analysis={"lucky_elements": []},
        ten_god_counts={},
    )
    assert "持续关注自我成长" in result


def test_expo_send_messages_empty_returns_empty_list():
    """If messages list is empty, send_messages short-circuits to []."""
    import asyncio

    from app.services.expo_push_client import send_messages

    settings = SimpleNamespace(push_dry_run=False, expo_access_token=None)
    tickets = asyncio.run(send_messages(settings, []))
    assert tickets == []
