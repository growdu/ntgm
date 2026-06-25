from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.asset import (
    IntakeImageRequest,
    IntakeImageResponse,
    UploadTokenRequest,
    UploadTokenResponse,
)
from app.services.asset_service import AssetService
from app.services.job_service import JobService
from app.services.user_service import UserService

router = APIRouter(tags=["assets"])


@router.post("/assets/upload-token", response_model=UploadTokenResponse)
def create_upload_token(
    payload: UploadTokenRequest,
    service = AssetService(),
) -> UploadTokenResponse:
    token = service.create_upload_token(payload)
    return UploadTokenResponse(**token)


@router.post("/users/intake/images", response_model=IntakeImageResponse)
def confirm_upload(
    payload: IntakeImageRequest,
    db: Session = Depends(get_db),
    user_service = UserService(),
    asset_service = AssetService(),
    job_service = JobService(),
) -> IntakeImageResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    asset = asset_service.register_uploaded_asset(db, user_id=user.id, payload=payload)

    # Create job for face analysis
    job_type = "analyze_face" if payload.assetType == "face" else "analyze_palm"
    job_service.create_job(
        db,
        user_id=user.id,
        job_type=job_type,
        payload={"userId": str(user.id), "imageAssetId": str(asset.id)},
    )

    # Dispatch async task
    if payload.assetType == "face":
        from app.tasks import dispatch_face_analyze
        dispatch_face_analyze(str(user.id), str(asset.id))

    return IntakeImageResponse(assetId=asset.id, jobType=job_type)

