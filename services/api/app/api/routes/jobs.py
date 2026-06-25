from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.job import JobStatusResponse
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job(
    job_id: UUID,
    db: Session = Depends(get_db),
    service = JobService(),
) -> JobStatusResponse:
    job = service.get_job(db, job_id=job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(
        jobId=job.id,
        jobType=job.job_type,
        status=job.status,
        payload=job.payload,
        result=job.result,
        errorMessage=job.error_message,
        createdAt=job.created_at,
        updatedAt=job.updated_at,
    )

