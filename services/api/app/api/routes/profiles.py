from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.job import JobCreateResponse
from app.schemas.profile import ProfileRecomputeRequest, ProfileSummaryResponse
from app.services.job_service import JobService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/current", response_model=ProfileSummaryResponse)
def get_current_profile(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    profile_service: ProfileService = Depends(ProfileService),
) -> ProfileSummaryResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_current_profile(db, user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not ready")

    return ProfileSummaryResponse(
        profileId=profile.id,
        userId=profile.user_id,
        profileVersion=profile.version_no,
        summary=profile.summary,
        personalityTraits=profile.personality_traits,
        abilityTraits=profile.ability_traits,
        relationshipTraits=profile.relationship_traits,
        fortuneTraits=profile.fortune_traits,
        confidenceMap=profile.confidence_map,
        engineVersion=profile.engine_version,
    )


@router.post("/recompute", response_model=JobCreateResponse)
def recompute_profile(
    payload: ProfileRecomputeRequest,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    job_service: JobService = Depends(JobService),
) -> JobCreateResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    job = job_service.create_job(
        db,
        user_id=user.id,
        job_type="recompute_profile",
        payload={"reason": payload.reason, "userId": str(user.id)},
    )
    profile, source_snapshot = profile_service.generate_profile(db, user=user)
    user_service.set_current_profile_version(db, user=user, version_no=profile.version_no)
    job_service.complete_job(
        db,
        job=job,
        result={
            "profileVersion": profile.version_no,
            "sourceSnapshot": source_snapshot,
        },
    )
    return JobCreateResponse(jobId=job.id, jobType=job.job_type, status=job.status)
