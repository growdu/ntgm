from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reminder import Reminder


class ReminderRepository:
    def create(
        self,
        db: Session,
        *,
        user_id: UUID,
        title: str,
        body: str,
        trigger_at: datetime,
        channel: str = "push",
        meta: dict | None = None,
    ) -> Reminder:
        record = Reminder(
            user_id=user_id,
            title=title,
            body=body,
            trigger_at=trigger_at,
            status="pending",
            channel=channel,
            meta=meta or {},
        )
        db.add(record)
        db.flush()
        return record

    def list_for_user(
        self, db: Session, *, user_id: UUID, limit: int = 50
    ) -> list[Reminder]:
        return list(
            db.execute(
                select(Reminder)
                .where(Reminder.user_id == user_id)
                .order_by(Reminder.trigger_at.desc())
                .limit(limit)
            ).scalars()
        )

    def list_due(self, db: Session, *, now: datetime, limit: int = 100) -> list[Reminder]:
        return list(
            db.execute(
                select(Reminder)
                .where(
                    Reminder.status == "pending",
                    Reminder.trigger_at <= now,
                )
                .order_by(Reminder.trigger_at.asc())
                .limit(limit)
            ).scalars()
        )

    def get(self, db: Session, *, reminder_id: UUID) -> Reminder | None:
        return db.execute(
            select(Reminder).where(Reminder.id == reminder_id)
        ).scalar_one_or_none()

    def mark_sent(
        self, db: Session, *, reminder: Reminder, sent_at: datetime | None = None
    ) -> Reminder:
        reminder.status = "sent"
        reminder.sent_at = sent_at or datetime.utcnow()
        db.flush()
        return reminder

    def mark_failed(
        self, db: Session, *, reminder: Reminder, reason: str
    ) -> Reminder:
        reminder.status = "failed"
        reminder.failure_reason = reason
        db.flush()
        return reminder

    def mark_read(self, db: Session, *, reminder: Reminder) -> Reminder:
        reminder.read = True
        db.flush()
        return reminder

    def cancel(self, db: Session, *, reminder: Reminder) -> Reminder:
        reminder.status = "cancelled"
        db.flush()
        return reminder
