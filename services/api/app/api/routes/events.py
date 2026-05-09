from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.event import LifeEventCreateRequest, LifeEventItem, LifeEventResponse
from app.services.intake_service import IntakeService
from app.services.user_service import UserService

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=LifeEventResponse)
def create_event(
    payload: LifeEventCreateRequest,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    intake_service: IntakeService = Depends(IntakeService),
) -> LifeEventResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    event = intake_service.create_life_event(db, user_id=user.id, payload=payload)
    return LifeEventResponse(eventId=event.id)


@router.get("", response_model=list[LifeEventItem])
def list_events(
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    intake_service: IntakeService = Depends(IntakeService),
) -> list[LifeEventItem]:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    events = intake_service.list_life_events(db, user_id=user.id)
    return [
        LifeEventItem(
            eventId=event.id,
            eventType=event.event_type,
            eventTime=event.event_time,
            title=event.title,
            description=event.description,
            impactScore=event.impact_score,
        )
        for event in events
    ]

