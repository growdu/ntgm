from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.job import JobCreateResponse
from app.schemas.profile import ProfileRecomputeRequest, ProfileSummaryResponse
from app.services.profile_service import ProfileService
from app.services.profile_workflow_service import ProfileWorkflowService
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
    workflow_service: ProfileWorkflowService = Depends(ProfileWorkflowService),
) -> JobCreateResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    job, _, _, _ = workflow_service.recompute(db, user=user, reason=payload.reason)
    return JobCreateResponse(jobId=job.id, jobType=job.job_type, status=job.status)
