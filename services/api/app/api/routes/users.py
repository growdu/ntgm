from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.user import BasicIntakeRequest, BasicIntakeResponse, UserMeResponse
from app.services.intake_service import IntakeService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/intake/basic", response_model=BasicIntakeResponse)
def intake_basic(
    payload: BasicIntakeRequest,
    db: Session = Depends(get_db),
    service: UserService = Depends(UserService),
    intake_service: IntakeService = Depends(IntakeService),
) -> BasicIntakeResponse:
    user = service.intake_basic(db, payload)
    intake_service.record_basic_intake(db, user_id=user.id, payload=payload)
    return BasicIntakeResponse(userId=user.id)


@router.get("/me", response_model=UserMeResponse)
def get_me(
    db: Session = Depends(get_db),
    service: UserService = Depends(UserService),
) -> UserMeResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserMeResponse(
        userId=user.id,
        name=user.name,
        gender=user.gender,
        birthDatetime=user.birth_datetime,
        birthPlace=user.birth_place,
        currentProfileVersion=user.current_profile_version,
    )
