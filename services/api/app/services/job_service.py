from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.job_repository import JobRepository


class JobService:
    def __init__(self, repository: JobRepository | None = None) -> None:
        self.repository = repository or JobRepository()

    def create_job(self, db: Session, *, user_id: UUID | None, job_type: str, payload: dict):
        return self.repository.create_job(
            db, user_id=user_id, job_type=job_type, payload=payload, status="queued"
        )

    def get_job(self, db: Session, *, job_id: UUID):
        return self.repository.get_by_id(db, job_id=job_id)

    def complete_job(self, db: Session, *, job, result: dict):
        return self.repository.update_status(db, job=job, status="completed", result=result)
