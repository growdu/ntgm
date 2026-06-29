from celery import Celery

celery_app = Celery("ntgm_worker")

from app.celery_tasks import (  # noqa: F401 — registers tasks on celery_app
    bazi_tasks,
    face_tasks,
    health,
    profile_tasks,
    reminder_tasks,
)

# Explicitly register class-based tasks (face, profile) that aren't auto-picked-up
celery_app.register_task(face_tasks.face_analyze)
celery_app.register_task(profile_tasks.recompute_profile)

__all__ = ["celery_app"]


# ─── Celery Beat Schedule ────────────────────────────────────────────────────
# Scans and dispatches due reminders every 60 seconds.
# Override interval via CELERY_BEAT_SCHEDULE_SECONDS env var.
celery_app.conf.task_default_queue = "celery"
celery_app.conf.worker_queue = "celery"
celery_app.conf.beat_schedule = {
    "reminder-scan-dispatch": {
        "task": "ntgm.reminder.scan_due",
        "schedule": 60.0,
        "kwargs": {},
    },
}
