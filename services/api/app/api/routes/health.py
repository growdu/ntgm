from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, object]:
    return {"success": True, "data": {"status": "ok"}}


@router.get("/ready")
def ready() -> dict[str, object]:
    return {
        "success": True,
        "data": {
            "status": "ready",
            "checks": {
                "database": "configured",
                "redis": "configured",
                "objectStorage": "configured",
            },
        },
    }

