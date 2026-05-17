# Import all tasks to ensure they are registered with Celery
from app.tasks.health import ping
from app.tasks.profile_tasks import recompute_profile
from app.tasks.bazi_tasks import bazi_analyze
from app.tasks.face_tasks import face_analyze

__all__ = ["ping", "recompute_profile", "bazi_analyze", "face_analyze"]