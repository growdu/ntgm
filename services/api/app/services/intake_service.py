from decimal import Decimal
from sqlalchemy.orm import Session

from app.repositories.intake_repository import IntakeRepository
from app.schemas.event import LifeEventCreateRequest
from app.schemas.user import BasicIntakeRequest


class IntakeService:
    def __init__(self, repository: IntakeRepository | None = None) -> None:
        self.repository = repository or IntakeRepository()

    def record_basic_intake(self, db: Session, *, user_id, payload: BasicIntakeRequest):
        return self.repository.create_record(
            db,
            user_id=user_id,
            intake_type="basic_info",
            source_channel="web",
            payload=payload.model_dump(mode="json"),
            confidence=Decimal("1.0000"),
        )

    def create_life_event(self, db: Session, *, user_id, payload: LifeEventCreateRequest):
        return self.repository.create_life_event(
            db,
            user_id=user_id,
            event_type=payload.eventType,
            event_time=payload.eventTime,
            title=payload.title,
            description=payload.description,
            payload=payload.payload,
            impact_score=payload.impactScore,
        )

    def list_life_events(self, db: Session, *, user_id):
        return self.repository.list_life_events(db, user_id=user_id)

    def list_records(self, db: Session, *, user_id):
        return self.repository.list_records(db, user_id=user_id)
