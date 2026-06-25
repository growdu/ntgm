from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ---------- Push token ----------

class PushTokenRegisterRequest(BaseModel):
    token: str = Field(..., min_length=4, max_length=255)
    platform: Literal["ios", "android", "unknown"] = "unknown"
    deviceName: str | None = Field(default=None, max_length=128)
    appVersion: str | None = Field(default=None, max_length=32)


class PushTokenResponse(BaseModel):
    tokenId: UUID
    token: str
    platform: str
    deviceName: str | None
    isActive: bool
    registeredAt: datetime
    lastSeenAt: str | None


class PushTokenListResponse(BaseModel):
    tokens: list[PushTokenResponse]


# ---------- Reminder ----------

class ReminderCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=128)
    body: str = Field(..., min_length=1)
    triggerAt: datetime
    channel: Literal["push", "inapp"] = "push"
    meta: dict | None = None


class ReminderResponse(BaseModel):
    reminderId: UUID
    title: str
    body: str
    triggerAt: datetime
    status: str
    channel: str
    read: bool
    sentAt: datetime | None
    failureReason: str | None
    createdAt: datetime


class ReminderListResponse(BaseModel):
    reminders: list[ReminderResponse]


# ---------- Dispatch job ----------

class PushDispatchJobResponse(BaseModel):
    jobId: UUID
    reminderId: UUID | None
    userId: UUID
    jobType: str
    status: str
    targetTokenCount: int
    successCount: int
    failureCount: int
    errorMessage: str | None
    result: dict
    createdAt: datetime
    updatedAt: datetime


class PushDispatchJobListResponse(BaseModel):
    jobs: list[PushDispatchJobResponse]


# ---------- Dispatch result (immediate, sync) ----------

class PushImmediateRequest(BaseModel):
    """客户端直接推一条测试消息到所有已订阅设备。"""

    title: str = Field(..., min_length=1, max_length=128)
    body: str = Field(..., min_length=1)
    data: dict | None = None
    channel: Literal["push", "inapp"] = "push"


class PushImmediateResponse(BaseModel):
    jobId: UUID
    targetTokenCount: int
    successCount: int
    failureCount: int
    dryRun: bool
    details: list[dict]
