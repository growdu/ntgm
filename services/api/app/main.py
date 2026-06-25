import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger.jsonlogger import JsonFormatter
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.router import router
from app.core.config import get_settings

settings = get_settings()


# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------
def _configure_logging() -> None:
    """Configure JSON logging for production readability."""
    log_level = logging.INFO if settings.app_env != "development" else logging.DEBUG
    root = logging.getLogger()
    root.setLevel(log_level)

    # Remove existing handlers
    for h in root.handlers[:]:
        root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    formatter = JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
        rename_fields={"levelname": "level", "asctime": "timestamp"},
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)


_configure_logging()
logger = logging.getLogger("ntgm-api")


# ---------------------------------------------------------------------------
# Sentry initialisation
# ---------------------------------------------------------------------------
def _init_sentry() -> None:
    """Initialise Sentry if DSN is configured."""
    dsn = getattr(settings, "sentry_dsn", None) or ""
    if not dsn:
        logger.info("Sentry DSN not configured — tracing disabled")
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration

    sentry_sdk.init(
        dsn=dsn,
        environment=settings.app_env,
        integrations=[
            FastApiIntegration(auto_enzyme=True),
            SqlAlchemyIntegration(),
        ],
        # Disable slow database queries auto-span (we have dedicated health checks)
        traces_sample_rate=0.1 if settings.app_env == "production" else 1.0,
        send_default_pii=False,
    )
    logger.info("Sentry initialised", extra={"environment": settings.app_env})


_init_sentry()


# ---------------------------------------------------------------------------
# Request ID middleware
# ---------------------------------------------------------------------------
class RequestIDMiddleware(BaseHTTPMiddleware):
    """Inject X-Request-ID header into every request and log context."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        # Attach request_id to all downstream logs via logging adapter
        adapter = logging.LoggerAdapter(logger, {"request_id": request_id})
        start = time.perf_counter()

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            response.headers["X-Request-ID"] = request_id
            adapter.info(
                f"{request.method} {request.url.path}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            adapter.exception(
                f"{request.method} {request.url.path} raised {type(exc).__name__}",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            raise


# ---------------------------------------------------------------------------
# Lifespan events
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"NTGM API starting — env={settings.app_env}")
    yield
    logger.info("NTGM API shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="NTGM API",
    version="0.1.0",
    description="持续交互演进的命理画像系统 API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.app_env == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)
app.include_router(router, prefix=settings.api_prefix)
