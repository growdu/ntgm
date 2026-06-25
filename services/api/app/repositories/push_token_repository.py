from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.push_token import PushToken


class PushTokenRepository:
    def upsert(
        self,
        db: Session,
        *,
        user_id: UUID,
        token: str,
        platform: str,
        device_name: str | None,
        app_version: str | None = None,
        meta: dict | None = None,
    ) -> PushToken:
        existing = db.execute(
            select(PushToken).where(PushToken.token == token)
        ).scalar_one_or_none()
        if existing is not None:
            existing.user_id = user_id
            existing.platform = platform
            existing.device_name = device_name
            existing.app_version = app_version
            existing.is_active = True
            existing.last_seen_at = None
            if meta:
                existing.meta = {**(existing.meta or {}), **meta}
            db.flush()
            return existing
        record = PushToken(
            user_id=user_id,
            token=token,
            platform=platform,
            device_name=device_name,
            app_version=app_version,
            is_active=True,
            meta=meta or {},
        )
        db.add(record)
        db.flush()
        return record

    def list_active_for_user(self, db: Session, *, user_id: UUID) -> list[PushToken]:
        return list(
            db.execute(
                select(PushToken).where(
                    PushToken.user_id == user_id,
                    PushToken.is_active.is_(True),
                )
            ).scalars()
        )

    def deactivate(self, db: Session, *, token: str) -> None:
        record = db.execute(
            select(PushToken).where(PushToken.token == token)
        ).scalar_one_or_none()
        if record is not None:
            record.is_active = False
            db.flush()

    def list_all_active(self, db: Session) -> list[PushToken]:
        return list(
            db.execute(
                select(PushToken).where(PushToken.is_active.is_(True))
            ).scalars()
        )
