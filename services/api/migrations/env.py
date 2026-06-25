# Alembic migration environment configuration.
# This env.py is the entry point for Alembic migration commands.

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.models.base import Base

# Import ALL models so that Base.metadata is fully populated.
from app.models import (  # noqa: F401
    advice_plan,
    bazi_analysis,
    image_asset,
    intake_record,
    job,
    life_event,
    match_result,
    profile_change_log,
    profile_version,
    push_dispatch_job,
    push_token,
    reminder,
    user,
)

# Alembic Config object —INI file is already loaded by Alembic.
config = context.config

# Set the SQLAlchemy database URL from app settings (not hardcoded INI).
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

# Configure logging from INI file (if present).
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata target for autogenerate.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL scripts without DB.

    This is used for review/dry-run and is much faster for schema inspection.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connects to the database directly."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            # Render server defaults as SQL literals (required for PG SERIAL etc.)
            render_item=lambda kind, desc, *args: desc,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
