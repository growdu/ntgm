"""
画像相关异步任务
"""
import logging
from uuid import UUID

from celery import Task
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class ProfileRecomputeTask(Task):
    """画像重算异步任务"""

    name = "ntgm.profile.recompute"
    max_retries = 3
    autoretry_for = (Exception,)
    retry_backoff = True

    def run(self, payload: dict) -> dict:
        """
        执行画像重算

        Args:
            payload: {
                "user_id": str,
                "reason": str,
            }
        """
        from app.db import SessionLocal
        from app.repositories.job_repository import JobRepository
        from app.services.advice_service import AdviceService
        from app.services.job_service import JobService
        from app.services.match_service import MatchService
        from app.services.profile_change_service import ProfileChangeService
        from app.services.profile_service import ProfileService
        from app.services.user_service import UserService

        user_id = payload.get("user_id")
        reason = payload.get("reason", "手动触发")

        if not user_id:
            raise ValueError("user_id is required")

        db = SessionLocal()
        try:
            # 初始化服务
            job_repository = JobRepository()
            job_service = JobService(repository=job_repository)
            user_service = UserService()
            profile_service = ProfileService()
            profile_change_service = ProfileChangeService()
            match_service = MatchService()
            advice_service = AdviceService()

            # 获取用户
            user = user_service.get_user_by_id(db, user_id=UUID(user_id))
            if user is None:
                raise ValueError(f"User not found: {user_id}")

            logger.info(f"[ProfileRecompute] Starting for user {user_id}, reason: {reason}")

            # 查找对应的 Job 并标记为 running
            job = job_repository.get_latest_by_user_and_type(
                db, user_id=user.id, job_type="recompute_profile"
            )
            if job:
                job_repository.update_status(db, job=job, status="running")

            # 执行重算
            previous_profile = profile_service.get_current_profile(db, user_id=user.id)
            profile, source_snapshot = profile_service.generate_profile(db, user=user)

            # 记录变更
            profile_change_service.record_change(
                db,
                user_id=user.id,
                previous_profile=previous_profile,
                current_profile=profile,
                reason=reason,
                source_snapshot=source_snapshot,
            )

            # 更新用户当前版本
            user_service.set_current_profile_version(db, user=user, version_no=profile.version_no)

            # 计算并持久化匹配
            match_response = match_service.calculate_current_match(profile=profile)
            match_service.persist_match(
                db,
                user_id=user.id,
                profile=profile,
                match_response=match_response,
            )

            # 生成并持久化建议
            advice = advice_service.generate_and_store(
                db,
                user_id=user.id,
                profile=profile,
                match_response=match_response,
            )

            result_data = {
                "profileVersion": profile.version_no,
                "sourceSnapshot": source_snapshot,
                "adviceId": str(advice.id),
            }

            # 更新 Job 状态为 completed
            if job:
                job_repository.update_status(db, job=job, status="completed", result=result_data)

            logger.info(
                f"[ProfileRecompute] Completed for user {user_id}, "
                f"profile_version={profile.version_no}, advice_id={advice.id}"
            )

            return result_data

        except Exception as e:
            logger.error(f"[ProfileRecompute] Failed for user {user_id}: {e}")
            # 更新 Job 状态为 failed
            try:
                job = job_repository.get_latest_by_user_and_type(
                    db, user_id=UUID(user_id), job_type="recompute_profile"
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


recompute_profile = ProfileRecomputeTask()