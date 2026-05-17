from app.celery_app import celery_app


@celery_app.task(name="ntgm.health.ping")
def ping() -> dict[str, str]:
    return {"status": "ok"}