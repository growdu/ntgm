from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {"success": True, "data": {"status": "ok"}}


@router.get("/ready")
def ready() -> dict[str, object]:
    """
    Readiness probe — actually checks DB, Redis, and object storage connectivity.
    Used by Kubernetes/orchestration platforms and load balancers.
    Returns "ready" only when all dependencies are reachable.
    """
    from sqlalchemy import text

    from app.core.config import get_settings
    from app.db import engine

    settings = get_settings()
    checks: dict[str, str] = {}
    all_ok = True

    # Database check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        all_ok = False

    # Redis check
    try:
        from redis import Redis

        r = Redis.from_url(settings.redis_url, socket_connect_timeout=3)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        all_ok = False

    # Object storage (MinIO) check — lightweight HTTP HEAD
    try:
        import httpx

        # Try MinIO browser/console port for lightweight health
        # s3_endpoint is like "http://localhost:9000"
        storage_url = settings.s3_endpoint.rstrip("/")
        response = httpx.head(f"{storage_url}/minio/health/live", timeout=3)
        checks["objectStorage"] = "ok" if response.status_code == 200 else f"status:{response.status_code}"
    except Exception as e:
        # Fallback: try a simple GET on the endpoint root
        try:
            import httpx
            storage_url = settings.s3_endpoint.rstrip("/")
            response = httpx.get(f"{storage_url}", timeout=3)
            checks["objectStorage"] = "ok" if response.status_code in (200, 403) else f"status:{response.status_code}"
        except Exception as e2:
            checks["objectStorage"] = f"error: {e} / {e2}"
            all_ok = False

    status = "ready" if all_ok else "degraded"
    return {
        "success": all_ok,
        "data": {
            "status": status,
            "checks": checks,
        },
    }
