from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "ntgm-api"
    api_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://ntgm:ntgm@localhost:5432/ntgm"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "ntgm-dev"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expires_days: int = 7

    # 推送通知（Expo Push）
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"
    expo_access_token: str | None = None
    push_dry_run: bool = True  # 默认不真发，演示用
    reminder_dispatch_interval_seconds: int = 60  # 扫表周期
    sentry_dsn: str = ""  # Sentry monitoring DSN (e.g. https://...), empty = disabled

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
