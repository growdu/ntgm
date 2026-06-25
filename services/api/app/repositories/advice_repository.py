from uuid import UUID

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.models.advice_plan import AdvicePlan


class AdviceRepository:
    def replace_current(
        self,
        db: Session,
        *,
        user_id: UUID,
        profile_version: int,
        summary: dict,
    ) -> AdvicePlan:
        db.execute(
            delete(AdvicePlan).where(
                AdvicePlan.user_id == user_id,
                AdvicePlan.profile_version == profile_version,
            )
        )
        advice = AdvicePlan(user_id=user_id, profile_version=profile_version, summary=summary)
        db.add(advice)
        db.commit()
        db.refresh(advice)
        return advice

    def get_current(self, db: Session, *, user_id: UUID, profile_version: int) -> AdvicePlan | None:
        statement = select(AdvicePlan).where(
            AdvicePlan.user_id == user_id,
            AdvicePlan.profile_version == profile_version,
        )
        return db.scalar(statement)

    def list_recent(self, db: Session, *, user_id: UUID, limit: int = 10) -> list[AdvicePlan]:
        statement = (
            select(AdvicePlan)
            .where(AdvicePlan.user_id == user_id)
            .order_by(desc(AdvicePlan.profile_version), desc(AdvicePlan.created_at))
            .limit(limit)
        )
        return list(db.scalars(statement))

    def update_feedback(
        self,
        db: Session,
        *,
        user_id: UUID,
        profile_version: int,
        feedback: dict,
    ) -> AdvicePlan | None:
        statement = select(AdvicePlan).where(
            AdvicePlan.user_id == user_id,
            AdvicePlan.profile_version == profile_version,
        )
        advice = db.scalar(statement)
        if advice:
            current_feedback = advice.execution_feedback or {}
            current_feedback.update(feedback)
            advice.execution_feedback = current_feedback
            db.commit()
            db.refresh(advice)
        return advice
