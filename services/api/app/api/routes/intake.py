from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.intake import IntakeRecordItem
from app.services.intake_service import IntakeService
from app.services.user_service import UserService

router = APIRouter(prefix="/intake", tags=["intake"])


@router.get("/records", response_model=list[IntakeRecordItem])
def list_intake_records(
    intakeType: str | None = Query(default=None, description="Filter by intake type"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user_service = UserService(),
    intake_service = IntakeService(),
) -> list[IntakeRecordItem]:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    records = intake_service.list_records(db, user_id=user.id, intake_type=intakeType, limit=limit)
    return [
        IntakeRecordItem(
            recordId=record.id,
            intakeType=record.intake_type,
            sourceChannel=record.source_channel,
            payload=record.payload,
            confidence=float(record.confidence) if record.confidence is not None else None,
            submittedAt=record.submitted_at,
        )
        for record in records
    ]

