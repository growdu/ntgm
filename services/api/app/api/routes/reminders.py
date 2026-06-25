from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db import get_db
from app.repositories.reminder_repository import ReminderRepository
from app.schemas.push import (
    PushDispatchJobListResponse,
    PushDispatchJobResponse,
    PushImmediateRequest,
    PushImmediateResponse,
    ReminderCreateRequest,
    ReminderListResponse,
    ReminderResponse,
)
from app.services.push_service import PushService
from app.services.user_service import UserService

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _to_reminder_response(r) -> ReminderResponse:
    return ReminderResponse(
        reminderId=r.id,
        title=r.title,
        body=r.body,
        triggerAt=r.trigger_at,
        status=r.status,
        channel=r.channel,
        read=r.read,
        sentAt=r.sent_at,
        failureReason=r.failure_reason,
        createdAt=r.created_at,
    )


def _to_job_response(j) -> PushDispatchJobResponse:
    return PushDispatchJobResponse(
        jobId=j.id,
        reminderId=j.reminder_id,
        userId=j.user_id,
        jobType=j.job_type,
        status=j.status,
        targetTokenCount=j.target_token_count,
        successCount=j.success_count,
        failureCount=j.failure_count,
        errorMessage=j.error_message,
        result=j.result or {},
        createdAt=j.created_at,
        updatedAt=j.updated_at,
    )


@router.post("", response_model=ReminderResponse, status_code=201)
def create_reminder(
    payload: ReminderCreateRequest,
    db: Session = Depends(get_db),
    service = UserService(),
    repo: ReminderRepository = Depends(ReminderRepository),
) -> ReminderResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    record = repo.create(
        db,
        user_id=user.id,
        title=payload.title,
        body=payload.body,
        trigger_at=payload.triggerAt,
        channel=payload.channel,
        meta=payload.meta or {},
    )
    db.commit()
    return _to_reminder_response(record)


@router.get("", response_model=ReminderListResponse)
def list_my_reminders(
    db: Session = Depends(get_db),
    service = UserService(),
    repo: ReminderRepository = Depends(ReminderRepository),
) -> ReminderListResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    items = repo.list_for_user(db, user_id=user.id, limit=50)
    return ReminderListResponse(reminders=[_to_reminder_response(r) for r in items])


@router.post("/{reminder_id}/dispatch", response_model=PushImmediateResponse)
async def dispatch_reminder(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    service = UserService(),
    push = PushService(),
    settings: Settings = Depends(get_settings),
) -> PushImmediateResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        job, reminder = await push.dispatch_reminder(
            db, settings=settings, reminder_id=reminder_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    db.commit()
    return PushImmediateResponse(
        jobId=job.id,
        targetTokenCount=job.target_token_count,
        successCount=job.success_count,
        failureCount=job.failure_count,
        dryRun=settings.push_dry_run,
        details=(job.result or {}).get("tickets", []),
    )


@router.post("/dispatch-immediate", response_model=PushImmediateResponse)
async def dispatch_immediate(
    payload: PushImmediateRequest,
    db: Session = Depends(get_db),
    service = UserService(),
    push = PushService(),
    settings: Settings = Depends(get_settings),
) -> PushImmediateResponse:
    """客户端主动推一条测试 / 自定义消息到当前用户的所有设备。"""
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    job = await push.dispatch_immediate(
        db,
        settings=settings,
        user_id=user.id,
        title=payload.title,
        body=payload.body,
        data=payload.data,
        channel=payload.channel,
    )
    db.commit()
    return PushImmediateResponse(
        jobId=job.id,
        targetTokenCount=job.target_token_count,
        successCount=job.success_count,
        failureCount=job.failure_count,
        dryRun=settings.push_dry_run,
        details=(job.result or {}).get("tickets", []),
    )


@router.get("/jobs", response_model=PushDispatchJobListResponse)
def list_my_jobs(
    db: Session = Depends(get_db),
    service = UserService(),
    push = PushService(),
) -> PushDispatchJobListResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    jobs = push.jobs.list_for_user(db, user_id=user.id, limit=50)
    return PushDispatchJobListResponse(jobs=[_to_job_response(j) for j in jobs])


@router.post("/{reminder_id}/read", status_code=204)
def mark_read(
    reminder_id: UUID,
    db: Session = Depends(get_db),
    service = UserService(),
    repo: ReminderRepository = Depends(ReminderRepository),
) -> None:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    r = repo.get(db, reminder_id=reminder_id)
    if r is None or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    repo.mark_read(db, reminder=r)
    db.commit()
