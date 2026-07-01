"""Unit tests for match service (no DB, no HTTP).

Covers the pure-logic surface of MatchService:
- FIGURE_PROFILES catalog has expected shape and 12 entries
- _calculate_similarity — identical traits → 1.0, distant → low score
- _generate_highlights — top dimensions >= 0.85 trigger extra label
- _generate_differences — low dimensions < 0.6 trigger directional label
- calculate_current_match — top 5 returned, sorted desc
- persist_match — repo receives correctly shaped items
- get_current_match — both branches (DB hit, recompute fallback)
"""
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.services.match_service import FIGURE_PROFILES, MatchService


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


def test_figure_profiles_has_thirteen_entries():
    assert len(FIGURE_PROFILES) == 13


def test_figure_profiles_each_has_required_fields():
    for fig in FIGURE_PROFILES:
        assert {"name", "dynasty", "role", "traits", "highlights",
                "differences", "lifePhase", "advice"} <= set(fig.keys())


def test_figure_profiles_traits_have_consistent_keys():
    """All figures should expose the same 6 trait keys; matcher uses defaults
    for executionStrength/learningVelocity when not provided.
    """
    expected = {
        "riskPreference", "careerDrive", "controlDrive", "rationality",
        "emotionStability", "longTermOrientation",
    }
    for fig in FIGURE_PROFILES:
        assert set(fig["traits"].keys()) == expected


def test_figure_profiles_known_emperors_present():
    names = {fig["name"] for fig in FIGURE_PROFILES}
    for must in ["曹操", "刘邦", "李世民", "诸葛亮", "苏轼", "陶渊明"]:
        assert must in names


# ---------------------------------------------------------------------------
# _calculate_similarity
# ---------------------------------------------------------------------------


def _profile(version_no=1, personality=None, fortune=None, ability=None):
    return SimpleNamespace(
        id=uuid4(),
        user_id=uuid4(),
        version_no=version_no,
        personality_traits=personality or {},
        ability_traits=ability or {},
        relationship_traits={},
        fortune_traits=fortune or {},
        confidence_map={},
    )


def test_similarity_identical_traits_is_one():
    """When base traits exactly match a figure's traits, similarity == 1.0."""
    figure = FIGURE_PROFILES[0]  # 曹操
    base = dict(figure["traits"])  # exact copy
    service = MatchService()
    similarity, breakdown = service._calculate_similarity(base, figure)
    assert similarity == 1.0
    # all breakdown scores should be 1.0
    for v in breakdown.values():
        assert v == 1.0


def test_similarity_maximally_distant_is_low():
    """When base traits are all 0 and figure is all 1, similarity should be near 0."""
    base = {k: 0.0 for k in [
        "riskPreference", "careerDrive", "controlDrive", "rationality",
        "emotionStability", "longTermOrientation",
        "executionStrength", "learningVelocity",
    ]}
    # construct a maxed figure
    figure = {
        "name": "test", "dynasty": "x", "role": "x", "lifePhase": "x", "advice": "x",
        "highlights": [], "differences": [],
        "traits": {k: 1.0 for k in base},
    }
    service = MatchService()
    similarity, _ = service._calculate_similarity(base, figure)
    # exact max distance → similarity = 0
    assert similarity == 0.0


def test_similarity_breakdown_keys_match_weights():
    service = MatchService()
    _, breakdown = service._calculate_similarity({}, FIGURE_PROFILES[0])
    expected = {
        "riskPreference", "careerDrive", "controlDrive", "rationality",
        "emotionStability", "longTermOrientation",
        "executionStrength", "learningVelocity",
    }
    assert set(breakdown.keys()) == expected


def test_similarity_breakdown_is_one_minus_absolute_diff():
    service = MatchService()
    base = {"riskPreference": 0.7, "careerDrive": 0.5, "controlDrive": 0.5,
            "rationality": 0.5, "emotionStability": 0.5, "longTermOrientation": 0.5,
            "executionStrength": 0.5, "learningVelocity": 0.5}
    figure = {"traits": {"riskPreference": 0.5, "careerDrive": 0.5, "controlDrive": 0.5,
                         "rationality": 0.5, "emotionStability": 0.5, "longTermOrientation": 0.5,
                         "executionStrength": 0.5, "learningVelocity": 0.5}}
    _, breakdown = service._calculate_similarity(base, figure)
    # risk diff = 0.2 → score = 0.8
    assert breakdown["riskPreference"] == 0.8
    # all others = 1.0
    assert breakdown["careerDrive"] == 1.0


def test_similarity_score_clamped_at_zero():
    """Even extreme distance should not produce a negative similarity."""
    base = {k: 1.0 for k in ["riskPreference", "careerDrive", "controlDrive", "rationality",
                            "emotionStability", "longTermOrientation",
                            "executionStrength", "learningVelocity"]}
    figure = {"traits": {k: 0.0 for k in base}}
    service = MatchService()
    similarity, _ = service._calculate_similarity(base, figure)
    assert 0.0 <= similarity <= 1.0


# ---------------------------------------------------------------------------
# _generate_highlights
# ---------------------------------------------------------------------------


def test_highlights_includes_base_figure_highlights():
    service = MatchService()
    figure = {
        "highlights": ["亮点A", "亮点B"],
        "traits": {},
    }
    breakdown = {}
    out = service._generate_highlights(figure, breakdown)
    assert "亮点A" in out
    assert "亮点B" in out


def test_highlights_adds_label_when_dimension_above_085():
    service = MatchService()
    figure = {
        "highlights": [],
        "traits": {"riskPreference": 0.5},
    }
    # all dims at 1.0 → all 6 labelled dims with score 1.0 trigger labels
    breakdown = {
        "riskPreference": 1.0, "careerDrive": 1.0, "controlDrive": 1.0,
        "rationality": 0.5, "emotionStability": 0.5, "longTermOrientation": 0.5,
    }
    out = service._generate_highlights(figure, breakdown)
    # the top-2 by score are riskPreference and careerDrive (both 1.0)
    assert any("风险偏好" in h for h in out)
    assert any("事业驱动" in h for h in out)


def test_highlights_caps_at_four():
    service = MatchService()
    figure = {
        "highlights": ["h1", "h2", "h3", "h4"],
        "traits": {},
    }
    breakdown = {k: 1.0 for k in ["riskPreference", "careerDrive", "controlDrive",
                                   "rationality", "emotionStability", "longTermOrientation"]}
    out = service._generate_highlights(figure, breakdown)
    assert len(out) == 4


def test_highlights_no_extra_label_when_dim_below_085():
    service = MatchService()
    figure = {"highlights": [], "traits": {}}
    breakdown = {k: 0.5 for k in ["riskPreference", "careerDrive", "controlDrive",
                                   "rationality", "emotionStability", "longTermOrientation"]}
    out = service._generate_highlights(figure, breakdown)
    # 0.5 < 0.85 → no extra label
    assert out == []


# ---------------------------------------------------------------------------
# _generate_differences
# ---------------------------------------------------------------------------


def test_differences_includes_base_figure_differences():
    service = MatchService()
    figure = {"differences": ["差异A"], "traits": {}}
    base = {"riskPreference": 0.5}
    out = service._generate_differences(figure, {}, base)
    assert "差异A" in out


def test_differences_adds_higher_label_when_base_above_figure():
    service = MatchService()
    figure = {"differences": [], "traits": {"riskPreference": 0.3}}
    base = {"riskPreference": 0.9, "careerDrive": 0.5, "controlDrive": 0.5,
            "rationality": 0.5, "emotionStability": 0.5, "longTermOrientation": 0.5}
    breakdown = {"riskPreference": 0.3}  # below 0.6 threshold
    out = service._generate_differences(figure, breakdown, base)
    # base 0.9 > figure 0.3 → "高于"
    assert any("高于" in d and "风险偏好" in d for d in out)


def test_differences_adds_lower_label_when_base_below_figure():
    service = MatchService()
    figure = {"differences": [], "traits": {"riskPreference": 0.9}}
    base = {"riskPreference": 0.3, "careerDrive": 0.5, "controlDrive": 0.5,
            "rationality": 0.5, "emotionStability": 0.5, "longTermOrientation": 0.5}
    breakdown = {"riskPreference": 0.3}  # below 0.6 threshold
    out = service._generate_differences(figure, breakdown, base)
    # base 0.3 < figure 0.9 → "低于"
    assert any("低于" in d and "风险偏好" in d for d in out)


def test_differences_caps_at_three():
    service = MatchService()
    figure = {"differences": ["d1", "d2", "d3", "d4"], "traits": {}}
    out = service._generate_differences(figure, {}, {})
    assert len(out) == 3


# ---------------------------------------------------------------------------
# calculate_current_match
# ---------------------------------------------------------------------------


def test_calculate_current_match_returns_top_5():
    profile = _profile(
        version_no=3,
        personality={"riskPreference": 0.5, "rationality": 0.5, "emotionStability": 0.5,
                     "longTermOrientation": 0.5, "controlDrive": 0.5},
        fortune={"careerDrive": 0.5, "wealthDrive": 0.5},
        ability={"executionStrength": 0.5, "learningVelocity": 0.5},
    )
    service = MatchService()
    response = service.calculate_current_match(profile=profile)

    assert response.profileVersion == 3
    assert len(response.topMatches) == 5
    ranks = [item.rank for item in response.topMatches]
    assert ranks == [1, 2, 3, 4, 5]


def test_calculate_current_match_sorted_descending():
    profile = _profile()
    service = MatchService()
    response = service.calculate_current_match(profile=profile)

    scores = [item.similarityScore for item in response.topMatches]
    assert scores == sorted(scores, reverse=True)


def test_calculate_current_match_explanation_has_method_and_count():
    profile = _profile()
    service = MatchService()
    response = service.calculate_current_match(profile=profile)

    assert response.explanation["method"] == "multi-dimensional-euclidean-match"
    assert response.explanation["figureCount"] == 13
    assert "baseTraits" in response.explanation


def test_calculate_current_match_uses_profile_version_default_1():
    """A profile missing version_no should fall back to 1 via getattr default."""
    profile = SimpleNamespace(
        personality_traits={}, fortune_traits={}, ability_traits={},
    )
    # Explicitly remove version_no to trigger getattr default
    if hasattr(profile, "version_no"):
        del profile.version_no
    service = MatchService()
    response = service.calculate_current_match(profile=profile)
    assert response.profileVersion == 1


def test_calculate_current_match_best_match_uses_trait_proximity():
    """A profile with traits very close to 诸葛亮 should rank 诸葛亮 #1."""
    zl = next(f for f in FIGURE_PROFILES if f["name"] == "诸葛亮")
    profile = _profile(
        personality={k: v for k, v in zl["traits"].items()
                     if k in {"riskPreference", "rationality", "emotionStability",
                              "longTermOrientation", "controlDrive"}},
        fortune={"careerDrive": zl["traits"]["careerDrive"]},
        ability={},
    )
    service = MatchService()
    response = service.calculate_current_match(profile=profile)
    assert response.topMatches[0].figureName == "诸葛亮"


# ---------------------------------------------------------------------------
# persist_match
# ---------------------------------------------------------------------------


class FakeMatchRepo:
    def __init__(self):
        self.replace_calls = []
        self.get_results = []

    def replace_results(self, db, *, user_id, profile_version, items):
        self.replace_calls.append({"user_id": user_id, "profile_version": profile_version, "items": items})
        return [SimpleNamespace(**item) for item in items]

    def get_current_results(self, db, *, user_id, profile_version):
        return self.get_results

    def list_primary_matches(self, db, *, user_id, limit=10):
        return self.get_results


def test_persist_match_passes_items_with_required_keys():
    repo = FakeMatchRepo()
    service = MatchService(repository=repo)
    profile = _profile(version_no=4)

    response = service.calculate_current_match(profile=profile)
    service.persist_match(db=None, user_id=uuid4(), profile=profile, match_response=response)

    assert len(repo.replace_calls) == 1
    call = repo.replace_calls[0]
    assert call["profile_version"] == 4
    items = call["items"]
    assert len(items) == 5
    for item in items:
        assert {"rank_no", "figure_name", "similarity_score",
                "similarity_breakdown", "difference_breakdown",
                "explanation"} <= set(item.keys())


def test_persist_match_preserves_rank_and_figure_name():
    repo = FakeMatchRepo()
    service = MatchService(repository=repo)
    profile = _profile()

    response = service.calculate_current_match(profile=profile)
    service.persist_match(db=None, user_id=uuid4(), profile=profile, match_response=response)

    items = repo.replace_calls[0]["items"]
    for idx, item in enumerate(items):
        assert item["rank_no"] == idx + 1
        assert item["figure_name"] == response.topMatches[idx].figureName


def test_persist_match_breakdown_contains_highlights_and_differences():
    repo = FakeMatchRepo()
    service = MatchService(repository=repo)
    profile = _profile()

    response = service.calculate_current_match(profile=profile)
    service.persist_match(db=None, user_id=uuid4(), profile=profile, match_response=response)

    for item in repo.replace_calls[0]["items"]:
        assert "highlights" in item["similarity_breakdown"]
        assert "differences" in item["similarity_breakdown"]


# ---------------------------------------------------------------------------
# get_current_match
# ---------------------------------------------------------------------------


def test_get_current_match_returns_from_db_when_rows_exist():
    repo = FakeMatchRepo()
    repo.get_results = [
        SimpleNamespace(
            rank_no=1, figure_name="曹操", similarity_score=0.85,
            similarity_breakdown={"highlights": ["h1"], "differences": []},
            difference_breakdown={"differences": ["d1"]},
            explanation={"method": "cached"},
        )
    ]
    service = MatchService(repository=repo)
    profile = _profile(version_no=2)

    response = service.get_current_match(db=None, user_id=uuid4(), profile=profile)

    assert response.profileVersion == 2
    assert len(response.topMatches) == 1
    assert response.topMatches[0].figureName == "曹操"
    assert response.explanation == {"method": "cached"}


def test_get_current_match_recomputes_when_db_empty():
    repo = FakeMatchRepo()
    repo.get_results = []
    service = MatchService(repository=repo)
    profile = _profile()

    response = service.get_current_match(db=None, user_id=uuid4(), profile=profile)

    # recalculated → top 5 results
    assert len(response.topMatches) == 5
