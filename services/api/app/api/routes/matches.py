from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.match import MatchCurrentResponse
from app.services.match_service import MatchService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/current", response_model=MatchCurrentResponse)
def get_current_match(
    db: Session = Depends(get_db),
    user_service = UserService(),
    profile_service = ProfileService(),
    match_service = MatchService(),
) -> MatchCurrentResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_current_profile(db, user_id=user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Match not ready")

    return match_service.get_current_match(db, user_id=user.id, profile=profile)
