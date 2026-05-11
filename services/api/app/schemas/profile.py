from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ProfileRecomputeRequest(BaseModel):
    reason: str = "manual_refresh"


class ProfileSummaryResponse(BaseModel):
    profileId: UUID
    userId: UUID
    profileVersion: int
    summary: dict[str, Any]
    personalityTraits: dict[str, Any]
    abilityTraits: dict[str, Any]
    relationshipTraits: dict[str, Any]
    fortuneTraits: dict[str, Any]
    confidenceMap: dict[str, Any]
    engineVersion: str


class ProfileVersionItem(BaseModel):
    profileId: UUID
    profileVersion: int
    summary: dict[str, Any]
    confidenceMap: dict[str, Any]
    engineVersion: str
    createdAt: datetime


class ProfileVersionListResponse(BaseModel):
    items: list[ProfileVersionItem]
