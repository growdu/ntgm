from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.advice import AdviceCurrentResponse
from app.services.advice_service import AdviceService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService

router = APIRouter(prefix="/advice", tags=["advice"])


@router.get("/current", response_model=AdviceCurrentResponse)
def get_current_advice(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    profile_service: ProfileService = Depends(ProfileService),
    advice_service: AdviceService = Depends(AdviceService),
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

