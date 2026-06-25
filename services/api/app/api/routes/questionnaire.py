from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.questionnaire import (
    QuestionnaireAnswerRequest,
    QuestionnaireAnswerResponse,
    QuestionnaireNextResponse,
    QuestionnaireProgressResponse,
)
from app.services.profile_workflow_service import ProfileWorkflowService
from app.services.questionnaire_service import QuestionnaireService
from app.services.user_service import UserService

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])


@router.get("/next", response_model=QuestionnaireNextResponse)
def get_next_questions(
    batch_size: int | None = None,
    service = QuestionnaireService(),
) -> QuestionnaireNextResponse:
    questions = service.get_next_questions(batch_size=batch_size) if batch_size else service.get_next_questions()
    return QuestionnaireNextResponse(questions=questions)


@router.get("/progress", response_model=QuestionnaireProgressResponse)
def get_progress(
    service = QuestionnaireService(),
) -> QuestionnaireProgressResponse:
    return QuestionnaireProgressResponse(**service.get_total_progress())


@router.post("/reset", status_code=204)
def reset_progress(
    service = QuestionnaireService(),
) -> None:
    service.reset_progress()


@router.post("/answers", response_model=QuestionnaireAnswerResponse)
def submit_answers(
    payload: QuestionnaireAnswerRequest,
    db: Session = Depends(get_db),
    user_service = UserService(),
    questionnaire_service = QuestionnaireService(),
    workflow_service = ProfileWorkflowService(),
) -> QuestionnaireAnswerResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    questionnaire_service.save_answers(db, user_id=user.id, payload=payload)
    job, profile, _, _ = workflow_service.recompute(db, user=user, reason="questionnaire_answers")
    return QuestionnaireAnswerResponse(jobId=job.id, profileVersion=profile.version_no)
