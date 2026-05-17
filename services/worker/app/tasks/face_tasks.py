"""
人脸分析异步任务
"""
import logging
from uuid import UUID

from celery import Task

logger = logging.getLogger(__name__)


class FaceAnalyzeTask(Task):
    """人脸分析异步任务"""

    name = "ntgm.face.analyze"
    max_retries = 3
    autoretry_for = (Exception,)
    retry_backoff = True

    def run(self, payload: dict) -> dict:
        """
        执行人脸分析

        Args:
            payload: {
                "user_id": str,
                "image_asset_id": str,
            }
        """
        from app.db import SessionLocal
        from app.repositories.asset_repository import AssetRepository
        from app.services.user_service import UserService

        user_id = payload.get("user_id")
        image_asset_id = payload.get("image_asset_id")

        if not user_id:
            raise ValueError("user_id is required")
        if not image_asset_id:
            raise ValueError("image_asset_id is required")

        db = SessionLocal()
        try:
            user_service = UserService()
            asset_repository = AssetRepository()

            # 获取用户
            user = user_service.get_user_by_id(db, user_id=UUID(user_id))
            if user is None:
                raise ValueError(f"User not found: {user_id}")

            # 获取图片资源
            asset = asset_repository.get_by_id(db, asset_id=UUID(image_asset_id))
            if asset is None:
                raise ValueError(f"Image asset not found: {image_asset_id}")

            logger.info(f"[FaceAnalyze] Starting for user {user_id}, asset {image_asset_id}")

            # TODO: 接入 MediaPipe 或 OpenCV 进行真实人脸特征提取
            # Placeholder: 模拟返回一些基础分析结果
            features = {
                "face_shape": "oval",
                "expression": "calm",
                "confidence": 0.75,
            }

            # 更新 asset 的特征数据
            asset_repository.update_features(db, asset=asset, features=features)

            logger.info(f"[FaceAnalyze] Completed for user {user_id}")

            return {
                "status": "completed",
                "features": features,
                "message": "Face analysis placeholder - real implementation pending MediaPipe/OpenCV integration",
            }

        except Exception as e:
            logger.error(f"[FaceAnalyze] Failed for user {user_id}: {e}")
            raise
        finally:
            db.close()


face_analyze = FaceAnalyzeTask()