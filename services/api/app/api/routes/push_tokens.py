from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.push_token import PushToken
from app.repositories.push_token_repository import PushTokenRepository
from app.schemas.push import (
    PushTokenListResponse,
    PushTokenRegisterRequest,
    PushTokenResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/push", tags=["push"])


def _to_response(t: PushToken) -> PushTokenResponse:
    return PushTokenResponse(
        tokenId=t.id,
        token=t.token,
        platform=t.platform,
        deviceName=t.device_name,
        isActive=t.is_active,
        registeredAt=t.created_at,
        lastSeenAt=t.last_seen_at,
    )


@router.post("/tokens", response_model=PushTokenResponse)
def register_token(
    payload: PushTokenRegisterRequest,
    db: Session = Depends(get_db),
    service = UserService(),
    repo: PushTokenRepository = Depends(PushTokenRepository),
) -> PushTokenResponse:
    """注册/更新当前用户的推送 token。"""
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    record = repo.upsert(
        db,
        user_id=user.id,
        token=payload.token,
        platform=payload.platform,
        device_name=payload.deviceName,
        app_version=payload.appVersion,
        meta={"registeredAt": datetime.utcnow().isoformat()},
    )
    db.commit()
    return _to_response(record)


@router.get("/tokens", response_model=PushTokenListResponse)
def list_my_tokens(
    db: Session = Depends(get_db),
    service = UserService(),
    repo: PushTokenRepository = Depends(PushTokenRepository),
) -> PushTokenListResponse:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    tokens = repo.list_active_for_user(db, user_id=user.id)
    return PushTokenListResponse(tokens=[_to_response(t) for t in tokens])


@router.delete("/tokens/{token_id}", status_code=204)
def deactivate_token(
    token_id: UUID,
    db: Session = Depends(get_db),
    service = UserService(),
    repo: PushTokenRepository = Depends(PushTokenRepository),
) -> None:
    user = service.get_current_user(db)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    tokens = repo.list_active_for_user(db, user_id=user.id)
    target = next((t for t in tokens if t.id == token_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Token not found")
    repo.deactivate(db, token=target.token)
    db.commit()
