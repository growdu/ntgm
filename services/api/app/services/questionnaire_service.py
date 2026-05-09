from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.intake_repository import IntakeRepository
from app.schemas.questionnaire import (
    QuestionnaireAnswerRequest,
    QuestionnaireQuestion,
)


DEFAULT_QUESTIONS: list[QuestionnaireQuestion] = [
    QuestionnaireQuestion(
        questionId="career-risk-preference",
        questionText="当你面对一个高收益但高不确定性的机会时，你通常会？",
        traitTargets=["riskPreference", "longTermOrientation"],
        options=["快速抓住", "观察一段时间后再决定", "只有非常确定才行动", "视情况而定"],
    ),
    QuestionnaireQuestion(
        questionId="conflict-response",
        questionText="在高压冲突中，你更接近哪种反应？",
        traitTargets=["emotionStability", "controlDrive"],
        options=["先压住情绪再处理", "直接正面回应", "先回避，之后再处理", "视对象而定"],
    ),
]


class QuestionnaireService:
    def __init__(self, repository: IntakeRepository | None = None) -> None:
        self.repository = repository or IntakeRepository()

    def get_next_questions(self) -> list[QuestionnaireQuestion]:
        return DEFAULT_QUESTIONS

    def save_answers(self, db: Session, *, user_id, payload: QuestionnaireAnswerRequest) -> None:
        for answer in payload.answers:
            self.repository.create_record(
                db,
                user_id=user_id,
                intake_type="questionnaire_answer",
                source_channel="web",
                payload=answer.model_dump(mode="json"),
                confidence=Decimal("0.8000"),
            )

