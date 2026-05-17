from celery import Celery

celery_app = Celery(
    "ntgm_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)
celery_app.conf.task_default_queue = "default"

# Import tasks to register them
from app.tasks import (
    health,
    profile_tasks,
    bazi_tasks,
    face_tasks,
)

__all__ = ["celery_app"]