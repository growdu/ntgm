from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.push_dispatch_job import PushDispatchJob


class PushDispatchJobRepository:
    def create(
        self,
        db: Session,
        *,
        user_id: UUID,
        job_type: str = "reminder_dispatch",
        reminder_id: UUID | None = None,
        payload: dict | None = None,
    ) -> PushDispatchJob:
        record = PushDispatchJob(
            user_id=user_id,
            reminder_id=reminder_id,
            job_type=job_type,
            status="queued",
            payload=payload or {},
        )
        db.add(record)
        db.flush()
        return record

    def get(self, db: Session, *, job_id: UUID) -> PushDispatchJob | None:
        return db.execute(
            select(PushDispatchJob).where(PushDispatchJob.id == job_id)
        ).scalar_one_or_none()

    def list_for_user(
        self, db: Session, *, user_id: UUID, limit: int = 50
    ) -> list[PushDispatchJob]:
        return list(
            db.execute(
                select(PushDispatchJob)
                .where(PushDispatchJob.user_id == user_id)
                .order_by(PushDispatchJob.created_at.desc())
                .limit(limit)
            ).scalars()
        )

    def mark_running(self, db: Session, *, job: PushDispatchJob) -> None:
        job.status = "running"
        db.flush()

    def mark_completed(
        self,
        db: Session,
        *,
        job: PushDispatchJob,
        success_count: int,
        failure_count: int,
        result: dict,
    ) -> None:
        job.status = "completed"
        job.success_count = success_count
        job.failure_count = failure_count
        job.result = result
        db.flush()

    def mark_failed(
        self, db: Session, *, job: PushDispatchJob, error: str
    ) -> None:
        job.status = "failed"
        job.error_message = error
        db.flush()

    def set_target_count(
        self, db: Session, *, job: PushDispatchJob, count: int
    ) -> None:
        job.target_token_count = count
        db.flush()
