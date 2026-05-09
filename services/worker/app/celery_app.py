from celery import Celery

celery_app = Celery(
    "ntgm_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)
celery_app.conf.task_default_queue = "default"
celery_app.autodiscover_tasks(["app.tasks"])

