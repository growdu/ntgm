from celery import Celery

from app.celery_app import celery_app
from app.tasks import (  # noqa: F401 — registers tasks on celery_app
    bazi_tasks,
    face_tasks,
    health,
    profile_tasks,
    reminder_tasks,
)

__all__ = ["celery_app"]


# ─── Celery Beat Schedule ────────────────────────────────────────────────────
# Scans and dispatches due reminders every 60 seconds.
# Override interval via CELERY_BEAT_SCHEDULE_SECONDS env var.
celery_app.conf.task_default_queue = "default"
celery_app.conf.beat_schedule = {
    "reminder-scan-dispatch": {
        "task": "ntgm.reminder.scan_due",
        "schedule": 60.0,
        "kwargs": {},
    },
}
