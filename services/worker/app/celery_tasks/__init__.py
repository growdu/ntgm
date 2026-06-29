# Import all tasks to ensure they are registered with Celery
from app.celery_tasks.health import ping
from app.celery_tasks.profile_tasks import recompute_profile
from app.celery_tasks.bazi_tasks import bazi_analyze
from app.celery_tasks.face_tasks import face_analyze

__all__ = ["ping", "recompute_profile", "bazi_analyze", "face_analyze"]
