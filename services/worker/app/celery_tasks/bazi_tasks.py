"""
八字分析异步任务
"""
import logging
from uuid import UUID

from celery import Task

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="ntgm.bazi.analyze",
    bind=True,
    max_retries=3,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def bazi_analyze(self: Task, payload: dict) -> dict:
    """
    执行八字分析

    Args:
        payload: {
            "user_id": str,
        }
    """
    import sys
    import os
    api_path = os.environ.get("API_APP_PATH", "/work/ai/ntgm/services/api")
    sys.path.insert(0, api_path)
    for key in list(sys.modules.keys()):
        if key == "app" or key.startswith("app."):
            del sys.modules[key]
    from app.db import SessionLocal
    from app.repositories.job_repository import JobRepository
    from app.services.bazi_service import BaziService
    from app.services.job_service import JobService
    from app.services.user_service import UserService

    user_id = payload.get("user_id")

    if not user_id:
        raise ValueError("user_id is required")

    db = SessionLocal()
    try:
        user_service = UserService()
        bazi_service = BaziService()
        job_repository = JobRepository()
        job_service = JobService(repository=job_repository)

        # 获取用户
        user = user_service.get_user_by_id(db, user_id=UUID(user_id))
        if user is None:
            raise ValueError(f"User not found: {user_id}")

        if user.birth_datetime is None:
            raise ValueError(f"User {user_id} does not have birth_datetime set")

        # 查找 Job 并标记为 running
        job = job_repository.get_latest_by_user_and_type(
            db, user_id=user.id, job_type="bazi_analyze"
        )
        if job:
            job_repository.update_status(db, job=job, status="running")

        logger.info(f"[BaziAnalyze] Starting for user {user_id}")

        # 执行八字分析
        result = bazi_service.generate_from_user(db, user=user)

        result_data = {
            "year_gz": result.year_gz,
            "month_gz": result.month_gz,
            "day_gz": result.day_gz,
            "hour_gz": result.hour_gz,
            "score": float(result.score),
        }

        # 更新 Job 状态为 completed
        if job:
            job_repository.update_status(db, job=job, status="completed", result=result_data)

        logger.info(
            f"[BaziAnalyze] Completed for user {user_id}, "
            f"year={result.year_gz}, score={result.score}"
        )

        return result_data

    except Exception as e:
        logger.error(f"[BaziAnalyze] Failed for user {user_id}: {e}")
        # 更新 Job 状态为 failed
        try:
            job = job_repository.get_latest_by_user_and_type(
                db, user_id=UUID(user_id), job_type="bazi_analyze"
            )
            if job:
                job_repository.update_status(
                    db, job=job, status="failed", error_message=str(e)
                )
        except Exception:
            pass
        raise
    finally:
        db.close()
