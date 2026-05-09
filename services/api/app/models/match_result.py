import uuid
from typing import Any

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class MatchResult(TimestampMixin, Base):
    __tablename__ = "match_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    profile_version: Mapped[int] = mapped_column(Integer, nullable=False)
    rank_no: Mapped[int] = mapped_column(Integer, nullable=False)
    figure_name: Mapped[str] = mapped_column(String(128), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    similarity_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    difference_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    explanation: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

