from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.job import JobCreateResponse
from app.schemas.profile import (
    ProfileRecomputeRequest,
    ProfileSummaryResponse,
    ProfileVersionItem,
    ProfileVersionListResponse,
)
from app.services.job_service import JobService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/current", response_model=ProfileSummaryResponse)
def get_current_profile(
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
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


@router.get("/versions", response_model=ProfileVersionListResponse)
def list_profile_versions(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
) -> ProfileVersionListResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    versions = profile_service.list_versions(db, user_id=user.id, limit=limit)
    return ProfileVersionListResponse(
        items=[
            ProfileVersionItem(
                profileId=profile.id,
                profileVersion=profile.version_no,
                summary=profile.summary,
                confidenceMap=profile.confidence_map,
                engineVersion=profile.engine_version,
                createdAt=profile.created_at,
            )
            for profile in versions
        ]
    )


@router.get("/versions/{version_no}", response_model=ProfileSummaryResponse)
def get_profile_version(
    version_no: int,
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
) -> ProfileSummaryResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_profile_by_version(db, user_id=user.id, version_no=version_no)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile version not found")

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
    user_service = UserService(),
    job_service = JobService(),
) -> JobCreateResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Create job
    job = job_service.create_job(
        db,
        user_id=user.id,
        job_type="recompute_profile",
        payload={"reason": payload.reason, "userId": str(user.id)},
    )

    # Dispatch async task
    from app.task_client import dispatch_profile_recompute
    dispatch_profile_recompute(str(user.id), payload.reason)

    return JobCreateResponse(jobId=job.id, jobType=job.job_type, status=job.status)
