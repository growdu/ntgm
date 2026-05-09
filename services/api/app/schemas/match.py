from typing import Any

from pydantic import BaseModel


class MatchItem(BaseModel):
    rank: int
    figureName: str
    similarityScore: float
    highlights: list[str]
    differences: list[str]


class MatchCurrentResponse(BaseModel):
    profileVersion: int
    topMatches: list[MatchItem]
    explanation: dict[str, Any]

