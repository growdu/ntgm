from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.profile_change_log import ProfileChangeLog


class ProfileChangeLogRepository:
    def create(
        self,
        db: Session,
        *,
        user_id: UUID,
        from_version: int,
        to_version: int,
        changed_dimensions: dict,
        reason_summary: dict,
    ) -> ProfileChangeLog:
        change_log = ProfileChangeLog(
            user_id=user_id,
            from_version=from_version,
            to_version=to_version,
            changed_dimensions=changed_dimensions,
            reason_summary=reason_summary,
        )
        db.add(change_log)
        db.commit()
        db.refresh(change_log)
        return change_log

    def list_recent(self, db: Session, *, user_id: UUID, limit: int = 10) -> list[ProfileChangeLog]:
        statement = (
            select(ProfileChangeLog)
            .where(ProfileChangeLog.user_id == user_id)
            .order_by(desc(ProfileChangeLog.to_version), desc(ProfileChangeLog.created_at))
            .limit(limit)
        )
        return list(db.scalars(statement))
