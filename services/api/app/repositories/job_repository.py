from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.job import Job


class JobRepository:
    def create_job(
        self,
        db: Session,
        *,
        user_id: UUID | None,
        job_type: str,
        payload: dict,
        status: str = "queued",
    ) -> Job:
        job = Job(user_id=user_id, job_type=job_type, payload=payload, status=status)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def get_by_id(self, db: Session, *, job_id: UUID) -> Job | None:
        return db.scalar(select(Job).where(Job.id == job_id))

    def list_latest_by_user(self, db: Session, *, user_id: UUID) -> list[Job]:
        statement = select(Job).where(Job.user_id == user_id).order_by(desc(Job.created_at))
        return list(db.scalars(statement).all())

    def update_status(
        self,
        db: Session,
        *,
        job: Job,
        status: str,
        result: dict | None = None,
        error_message: str | None = None,
    ) -> Job:
        job.status = status
        job.result = result
        job.error_message = error_message
        db.commit()
        db.refresh(job)
        return job
