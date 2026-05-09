from collections.abc import Sequence
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.intake_record import IntakeRecord
from app.models.life_event import LifeEvent


class IntakeRepository:
    def create_record(
        self,
        db: Session,
        *,
        user_id: UUID,
        intake_type: str,
        source_channel: str,
        payload: dict[str, Any],
        confidence: Decimal | None = None,
    ) -> IntakeRecord:
        record = IntakeRecord(
            user_id=user_id,
            intake_type=intake_type,
            source_channel=source_channel,
            payload=payload,
            confidence=confidence,
            submitted_at=datetime.now(timezone.utc),
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def create_life_event(
        self,
        db: Session,
        *,
        user_id: UUID,
        event_type: str,
        event_time: datetime,
        title: str,
        description: str | None,
        payload: dict[str, Any],
        impact_score: int | None,
    ) -> LifeEvent:
        event = LifeEvent(
            user_id=user_id,
            event_type=event_type,
            event_time=event_time,
            title=title,
            description=description,
            payload=payload,
            impact_score=impact_score,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def list_life_events(self, db: Session, *, user_id: UUID) -> Sequence[LifeEvent]:
        statement = select(LifeEvent).where(LifeEvent.user_id == user_id).order_by(desc(LifeEvent.event_time))
        return db.scalars(statement).all()

    def list_records(self, db: Session, *, user_id: UUID) -> Sequence[IntakeRecord]:
        statement = (
            select(IntakeRecord)
            .where(IntakeRecord.user_id == user_id)
            .order_by(desc(IntakeRecord.submitted_at))
        )
        return db.scalars(statement).all()
