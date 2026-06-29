"""
API端的任务客户端 - 用于向Worker发送异步任务

通过Celery broker分发任务到Worker服务
"""

_task_client = None


def _get_task_client():
    """Lazy Celery client initialization."""
    global _task_client
    if _task_client is None:
        from celery import Celery

        _task_client = Celery(
            "ntgm_api",
            broker="redis://localhost:6379/0",
            backend="redis://localhost:6379/1",
        )
    return _task_client


def dispatch_profile_recompute(user_id: str, reason: str) -> None:
    """分发画像重算任务"""
    _get_task_client().send_task(
        "ntgm.profile.recompute",
        kwargs={"payload": {"user_id": user_id, "reason": reason}},
    )


def dispatch_bazi_analyze(user_id: str) -> None:
    """分发八字分析任务"""
    _get_task_client().send_task(
        "ntgm.bazi.analyze",
        kwargs={"payload": {"user_id": user_id}},
    )


def dispatch_face_analyze(user_id: str, image_asset_id: str) -> None:
    """分脸分析任务"""
    _get_task_client().send_task(
        "ntgm.face.analyze",
        kwargs={"payload": {"user_id": user_id, "image_asset_id": image_asset_id}},
    )