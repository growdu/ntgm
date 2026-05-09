from typing import Any

from pydantic import BaseModel, Field


class QuestionnaireQuestion(BaseModel):
    questionId: str
    questionText: str
    traitTargets: list[str]
    options: list[str]


class QuestionnaireNextResponse(BaseModel):
    questions: list[QuestionnaireQuestion]


class QuestionnaireAnswerItem(BaseModel):
    questionId: str
    value: str
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class QuestionnaireAnswerRequest(BaseModel):
    answers: list[QuestionnaireAnswerItem]


class QuestionnaireAnswerResponse(BaseModel):
    accepted: bool = True
    recomputeTriggered: bool = True

