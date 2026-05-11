import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ProfileChangeLog(TimestampMixin, Base):
    __tablename__ = "profile_change_logs"
    __table_args__ = (
        Index("ix_profile_change_logs_user_to_version", "user_id", "to_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    from_version: Mapped[int] = mapped_column(Integer, nullable=False)
    to_version: Mapped[int] = mapped_column(Integer, nullable=False)
    changed_dimensions: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    reason_summary: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
