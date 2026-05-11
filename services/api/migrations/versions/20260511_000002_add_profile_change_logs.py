"""add profile change logs

Revision ID: 20260511_000002
Revises: 20250509_000001
Create Date: 2026-05-11 00:00:02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260511_000002"
down_revision = "20250509_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "profile_change_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("from_version", sa.Integer(), nullable=False),
        sa.Column("to_version", sa.Integer(), nullable=False),
        sa.Column(
            "changed_dimensions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "reason_summary",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_profile_change_logs_user_to_version",
        "profile_change_logs",
        ["user_id", "to_version"],
    )


def downgrade() -> None:
    op.drop_index("ix_profile_change_logs_user_to_version", table_name="profile_change_logs")
    op.drop_table("profile_change_logs")
