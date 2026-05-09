from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.job import JobCreateResponse
from app.schemas.questionnaire import (
    QuestionnaireAnswerRequest,
    QuestionnaireAnswerResponse,
    QuestionnaireNextResponse,
)
from app.services.job_service import JobService
from app.services.questionnaire_service import QuestionnaireService
from app.services.user_service import UserService

router = APIRouter(prefix="/questionnaire", tags=["questionnaire"])


@router.get("/next", response_model=QuestionnaireNextResponse)
def get_next_questions(
    service: QuestionnaireService = Depends(QuestionnaireService),
) -> QuestionnaireNextResponse:
    return QuestionnaireNextResponse(questions=service.get_next_questions())


@router.post("/answers", response_model=QuestionnaireAnswerResponse)
def submit_answers(
    payload: QuestionnaireAnswerRequest,
    db: Session = Depends(get_db),
    user_service: UserService = Depends(UserService),
    questionnaire_service: QuestionnaireService = Depends(QuestionnaireService),
    job_service: JobService = Depends(JobService),
) -> QuestionnaireAnswerResponse:
    user = user_service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    questionnaire_service.save_answers(db, user_id=user.id, payload=payload)
    job = job_service.create_job(
        db,
        user_id=user.id,
        job_type="recompute_profile",
        payload={"reason": "questionnaire_answers", "userId": str(user.id)},
    )
    job_service.complete_job(
        db,
        job=job,
        result={"acceptedAnswers": len(payload.answers)},
    )
    return QuestionnaireAnswerResponse()
