from typing import Any
from uuid import UUID

from pydantic import BaseModel


class AdviceCurrentResponse(BaseModel):
    adviceId: UUID
    profileVersion: int
    summary: dict[str, Any]

