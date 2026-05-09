from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class LifeEventCreateRequest(BaseModel):
    eventType: str
    eventTime: datetime
    title: str
    description: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    impactScore: int | None = None


class LifeEventResponse(BaseModel):
    eventId: UUID
    recomputeTriggered: bool = True


class LifeEventItem(BaseModel):
    eventId: UUID
    eventType: str
    eventTime: datetime
    title: str
    description: str | None
    impactScore: int | None

