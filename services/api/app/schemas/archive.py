from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ProfileChangeDimensionItem(BaseModel):
    dimension: str
    previousValue: float
    currentValue: float
    delta: float
    direction: str


class ProfileChangeLogItem(BaseModel):
    changeId: UUID
    fromVersion: int
    toVersion: int
    changedDimensions: dict[str, Any]
    reasonSummary: dict[str, Any]
    createdAt: datetime


class ArchiveChangesResponse(BaseModel):
    items: list[ProfileChangeLogItem]


class ArchiveTimelineItem(BaseModel):
    itemType: str
    occurredAt: datetime
    title: str
    summary: str
    profileVersion: int | None = None
    metadata: dict[str, Any]


class ArchiveTimelineResponse(BaseModel):
    items: list[ArchiveTimelineItem]
