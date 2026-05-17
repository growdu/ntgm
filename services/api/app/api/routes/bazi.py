from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.bazi import BaziCurrentResponse
from app.schemas.job import JobCreateResponse
from app.services.bazi_service import BaziService
from app.services.job_service import JobService
from app.services.user_service import UserService

router = APIRouter(prefix="/bazi", tags=["bazi"])


@router.get("/current", response_model=BaziCurrentResponse)
def get_current_bazi(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    bazi_service: BaziService = Depends(BaziService),
) -> BaziCurrentResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    analysis = bazi_service.get_current(db, user_id=user.id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Bazi analysis not ready")

    return BaziCurrentResponse(
        analysisId=analysis.id,
        chart={
            "yearGz": analysis.year_gz,
            "monthGz": analysis.month_gz,
            "dayGz": analysis.day_gz,
            "hourGz": analysis.hour_gz,
        },
        featureData=analysis.feature_data,
        interpretationData=analysis.interpretation_data,
        score=analysis.score,
        confidence=float(analysis.confidence),
        engineVersion=analysis.engine_version,
    )


@router.post("/analyze", response_model=JobCreateResponse)
def analyze_bazi(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    job_service: JobService = Depends(JobService),
) -> JobCreateResponse:
    """Trigger async bazi analysis"""
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.birth_datetime is None:
        raise HTTPException(status_code=400, detail="User birth_datetime not set")

    # Create job
    job = job_service.create_job(
        db,
        user_id=user.id,
        job_type="bazi_analyze",
        payload={"userId": str(user.id)},
    )

    # Dispatch async task
    from app.tasks import dispatch_bazi_analyze
    dispatch_bazi_analyze(str(user.id))

    return JobCreateResponse(jobId=job.id, jobType=job.job_type, status=job.status)

