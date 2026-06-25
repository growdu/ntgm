from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.advice import AdviceCurrentResponse
from app.services.advice_service import AdviceService
from app.services.match_service import MatchService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService

router = APIRouter(prefix="/advice", tags=["advice"])


@router.get("/current", response_model=AdviceCurrentResponse)
def get_current_advice(
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
    advice_service = AdviceService(),
) -> AdviceCurrentResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_current_profile(db, user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Advice not ready")

    advice = advice_service.get_current(db, user_id=user.id, profile_version=profile.version_no)
    if advice is None:
        raise HTTPException(status_code=404, detail="Advice not ready")

    return AdviceCurrentResponse(
        adviceId=advice.id,
        profileVersion=advice.profile_version,
        summary=advice.summary,
    )


@router.post("/regenerate", response_model=AdviceCurrentResponse)
def regenerate_advice(
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
    match_service = MatchService(),
    advice_service = AdviceService(),
) -> AdviceCurrentResponse:
    """重新生成建议（基于最新画像）"""
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_current_profile(db, user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not ready")

    match_response = match_service.get_current_match(db, user_id=user.id, profile=profile)
    advice = advice_service.generate_and_store(
        db,
        user_id=user.id,
        profile=profile,
        match_response=match_response,
    )

    return AdviceCurrentResponse(
        adviceId=advice.id,
        profileVersion=advice.profile_version,
        summary=advice.summary,
    )


class FeedbackRequest(BaseModel):
    feedbackType: str
    feedbackText: str | None = None
    adviceItemId: str | None = None


@router.post("/feedback")
def submit_feedback(
    payload: FeedbackRequest,
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
    advice_service = AdviceService(),
):
    """提交建议执行反馈"""
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_current_profile(db, user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    return advice_service.update_execution_feedback(
        db,
        user_id=user.id,
        profile_version=profile.version_no,
        feedback_type=payload.feedbackType,
        feedback_text=payload.feedbackText,
        advice_item_id=payload.adviceItemId,
    )

