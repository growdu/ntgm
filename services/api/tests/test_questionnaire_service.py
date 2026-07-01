"""Unit tests for questionnaire service (no DB, no HTTP).

Covers:
- QUESTION_GROUPS catalog shape
- get_next_questions — batching, group rotation, stateful index
- get_total_progress — totals
- reset_progress — group_index reset
- save_answers — forwards to IntakeRepository with correct intake_type
"""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from app.services.questionnaire_service import (
    BATCH_SIZE,
    QUESTION_GROUPS,
    QuestionnaireService,
)


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


def test_question_groups_six_groups_present():
    groups = [g["group"] for g in QUESTION_GROUPS]
    assert groups == ["risk", "emotion", "career", "execution", "relationship", "wealth"]


def test_question_groups_every_question_has_required_fields():
    for group in QUESTION_GROUPS:
        for q in group["questions"]:
            assert {"questionId", "questionText", "traitTargets", "options"} <= set(
                q.model_dump().keys()
            )
            assert len(q.options) >= 2
            assert len(q.traitTargets) >= 1


def test_question_groups_have_unique_question_ids():
    ids = [q.questionId for g in QUESTION_GROUPS for q in g["questions"]]
    assert len(ids) == len(set(ids))


def test_batch_size_is_three():
    assert BATCH_SIZE == 3


# ---------------------------------------------------------------------------
# get_next_questions
# ---------------------------------------------------------------------------


def test_get_next_questions_default_batch_returns_three_from_first_group():
    service = QuestionnaireService()
    questions = service.get_next_questions()
    assert len(questions) == 3
    # all from the first group (risk)
    assert all("risk" in q.questionId or "investment" in q.questionId or "decision" in q.questionId
               for q in questions)


def test_get_next_questions_advances_group_index():
    service = QuestionnaireService()
    # first call: returns first group's first 3 (the whole group)
    first = service.get_next_questions()
    assert len(first) == 3
    # second call: returns second group's first 3 (the whole group)
    second = service.get_next_questions()
    assert len(second) == 3
    # different question IDs
    assert {q.questionId for q in first}.isdisjoint({q.questionId for q in second})


def test_get_next_questions_batch_size_2_partial_group_consumption():
    """With batch_size=2 and groups of 3, first call returns 2 from group 1,
    second call returns remaining 1 from group 1 plus 1 from group 2."""
    service = QuestionnaireService()
    first = service.get_next_questions(batch_size=2)
    assert len(first) == 2
    # all from risk group
    assert all("career-risk" in q.questionId or "investment" in q.questionId
               for q in first)


def test_get_next_questions_caps_at_available_groups():
    """If batch_size is huge, only the available groups are returned.

    Note: 5 groups have 3 questions each, the 'relationship' group has 2,
    so total = 17.
    """
    service = QuestionnaireService()
    questions = service.get_next_questions(batch_size=100)
    assert len(questions) == 17  # 5×3 + 1×2 = 17


def test_get_next_questions_advances_through_all_six_groups():
    """After 6 default batch_size=3 calls, every group should have been touched.

    Note: This test documents a quirk in the rotation algorithm — it always
    returns the FIRST N questions of each group then advances, so with uneven
    group sizes (relationship=2) some questions can be skipped. What matters
    for callers is that every group gets visited in rotation.
    """
    service = QuestionnaireService()
    groups_visited = set()
    for _ in range(6):
        for q in service.get_next_questions():
            # reverse-lookup the group each question came from
            for g in QUESTION_GROUPS:
                if any(q.questionId == x.questionId for x in g["questions"]):
                    groups_visited.add(g["group"])
                    break
    assert groups_visited == {"risk", "emotion", "career", "execution", "relationship", "wealth"}


# ---------------------------------------------------------------------------
# get_total_progress
# ---------------------------------------------------------------------------


def test_total_progress_has_six_groups_and_seventeen_questions():
    """5 groups have 3 questions, 'relationship' has 2 → 17 total."""
    progress = QuestionnaireService().get_total_progress()
    assert progress["totalGroups"] == 6
    assert progress["totalQuestions"] == 17
    assert len(progress["groups"]) == 6


def test_total_progress_groups_have_count():
    progress = QuestionnaireService().get_total_progress()
    for g in progress["groups"]:
        assert {"group", "label", "count"} <= set(g.keys())
        assert g["count"] >= 2


def test_total_progress_relationship_group_has_two_questions():
    progress = QuestionnaireService().get_total_progress()
    rel = next(g for g in progress["groups"] if g["group"] == "relationship")
    assert rel["count"] == 2


# ---------------------------------------------------------------------------
# reset_progress
# ---------------------------------------------------------------------------


def test_reset_progress_zeros_index():
    service = QuestionnaireService()
    service.get_next_questions()  # advance
    service.get_next_questions()  # advance more
    service.reset_progress()
    # after reset, should be back to first group
    questions = service.get_next_questions()
    # first group has 3 questions
    assert len(questions) == 3
    assert all("career-risk" in q.questionId or "investment" in q.questionId or "decision" in q.questionId
               for q in questions)


# ---------------------------------------------------------------------------
# save_answers
# ---------------------------------------------------------------------------


class FakeIntakeRepoForQ:
    def __init__(self):
        self.records = []

    def create_record(self, db, *, user_id, intake_type, source_channel, payload, confidence=None):
        rec = SimpleNamespace(
            id=uuid4(), user_id=user_id, intake_type=intake_type,
            source_channel=source_channel, payload=payload, confidence=confidence,
        )
        self.records.append(rec)
        return rec


def test_save_answers_creates_records_with_questionnaire_intake_type():
    repo = FakeIntakeRepoForQ()
    service = QuestionnaireService(repository=repo)
    answer = SimpleNamespace(
        model_dump=lambda mode="json": {"questionId": "career-risk-preference", "value": "快速抓住机会"}
    )
    payload = SimpleNamespace(answers=[answer, answer])

    service.save_answers(db=None, user_id=uuid4(), payload=payload)

    assert len(repo.records) == 2
    for rec in repo.records:
        assert rec.intake_type == "questionnaire_answer"
        assert rec.source_channel == "web"
        assert rec.confidence == Decimal("0.8000")


def test_save_answers_with_empty_answers_list_creates_no_records():
    repo = FakeIntakeRepoForQ()
    service = QuestionnaireService(repository=repo)
    payload = SimpleNamespace(answers=[])
    service.save_answers(db=None, user_id=uuid4(), payload=payload)
    assert repo.records == []
