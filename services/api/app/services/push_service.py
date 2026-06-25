"""
Push 派发 service — 业务编排层

职责:
1) 接收 reminder_id → 找到 reminder + 用户 + 设备 tokens
2) 构造 Expo messages → 调 client 发送
3) 更新 reminder.status / sent_at
4) 写入 push_dispatch_jobs 审计
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.push_dispatch_job import PushDispatchJob
from app.models.reminder import Reminder
from app.repositories.push_dispatch_job_repository import (
    PushDispatchJobRepository,
)
from app.repositories.push_token_repository import PushTokenRepository
from app.repositories.reminder_repository import ReminderRepository
from app.services import expo_push_client


class PushService:
    def __init__(
        self,
        reminder_repo: ReminderRepository | None = None,
        token_repo: PushTokenRepository | None = None,
        job_repo: PushDispatchJobRepository | None = None,
    ) -> None:
        self.reminders = reminder_repo or ReminderRepository()
        self.tokens = token_repo or PushTokenRepository()
        self.jobs = job_repo or PushDispatchJobRepository()

    async def dispatch_reminder(
        self, db: Session, *, settings: Settings, reminder_id: UUID
    ) -> tuple[PushDispatchJob, Reminder | None]:
        reminder = self.reminders.get(db, reminder_id=reminder_id)
        if reminder is None:
            raise ValueError(f"reminder {reminder_id} not found")
        if reminder.status != "pending":
            # 幂等：已发过的直接返回
            job = self.jobs.create(
                db,
                user_id=reminder.user_id,
                reminder_id=reminder.id,
                payload={"skipped": "not_pending", "currentStatus": reminder.status},
            )
            self.jobs.mark_completed(
                db,
                job=job,
                success_count=0,
                failure_count=0,
                result={"skipped": True, "reason": "not_pending"},
            )
            return job, reminder

        # 建 job 记录
        job = self.jobs.create(
            db,
            user_id=reminder.user_id,
            reminder_id=reminder.id,
            payload={
                "title": reminder.title,
                "body": reminder.body,
                "channel": reminder.channel,
            },
        )
        self.jobs.mark_running(db, job=job)

        # 找 active tokens
        active_tokens = self.tokens.list_active_for_user(
            db, user_id=reminder.user_id
        )
        self.jobs.set_target_count(db, job=job, count=len(active_tokens))

        if not active_tokens:
            self.jobs.mark_completed(
                db,
                job=job,
                success_count=0,
                failure_count=0,
                result={"reason": "no_active_tokens"},
            )
            # 标记 reminder failed（无可达设备）
            self.reminders.mark_failed(
                db, reminder=reminder, reason="no_active_tokens"
            )
            return job, reminder

        messages = expo_push_client.build_messages(
            [t.token for t in active_tokens],
            title=reminder.title,
            body=reminder.body,
            data={"reminderId": str(reminder.id), "jobId": str(job.id)},
            channel=reminder.channel,
        )
        tickets = await expo_push_client.send_messages(settings, messages)
        success, failure, details = expo_push_client.summarize_tickets(tickets)
        self.jobs.mark_completed(
            db,
            job=job,
            success_count=success,
            failure_count=failure,
            result={"tickets": details, "dryRun": settings.push_dry_run},
        )

        if failure == 0:
            self.reminders.mark_sent(db, reminder=reminder, sent_at=datetime.utcnow())
        elif success == 0:
            self.reminders.mark_failed(
                db, reminder=reminder, reason=f"all_failed:{failure}"
            )
        else:
            # 部分成功：仍记为 sent，备注里写
            self.reminders.mark_sent(db, reminder=reminder, sent_at=datetime.utcnow())
            from app.models.reminder import Reminder as _R  # 局部避免循环

            db.query(_R).filter(_R.id == reminder.id).update(
                {"failure_reason": f"partial:{failure}/{success + failure}"}
            )

        return job, reminder

    async def dispatch_immediate(
        self,
        db: Session,
        *,
        settings: Settings,
        user_id: UUID,
        title: str,
        body: str,
        data: dict | None = None,
        channel: str = "push",
    ) -> PushDispatchJob:
        active_tokens = self.tokens.list_active_for_user(db, user_id=user_id)
        job = self.jobs.create(
            db,
            user_id=user_id,
            reminder_id=None,
            payload={"title": title, "body": body, "channel": channel, "data": data},
        )
        self.jobs.mark_running(db, job=job)
        self.jobs.set_target_count(db, job=job, count=len(active_tokens))

        if not active_tokens:
            self.jobs.mark_completed(
                db, job=job, success_count=0, failure_count=0,
                result={"reason": "no_active_tokens", "dryRun": settings.push_dry_run},
            )
            return job

        messages = expo_push_client.build_messages(
            [t.token for t in active_tokens],
            title=title, body=body, data=data, channel=channel,
        )
        tickets = await expo_push_client.send_messages(settings, messages)
        success, failure, details = expo_push_client.summarize_tickets(tickets)
        self.jobs.mark_completed(
            db, job=job, success_count=success, failure_count=failure,
            result={"tickets": details, "dryRun": settings.push_dry_run},
        )
        return job

    async def scan_due_reminders(
        self, db: Session, *, settings: Settings, now: datetime | None = None
    ) -> list[PushDispatchJob]:
        """扫表：把到点的 pending reminder 一并派发。"""
        from sqlalchemy.orm import Session as _S  # noqa: F401  (already imported)

        now = now or datetime.utcnow()
        due = self.reminders.list_due(db, now=now, limit=100)
        results: list[PushDispatchJob] = []
        for r in due:
            try:
                job, _ = await self.dispatch_reminder(
                    db, settings=settings, reminder_id=r.id
                )
                results.append(job)
            except Exception as exc:  # 派发失败不阻塞后续
                # 写入失败 job
                failed_job = self.jobs.create(
                    db,
                    user_id=r.user_id,
                    reminder_id=r.id,
                    payload={"title": r.title, "body": r.body},
                )
                self.jobs.mark_failed(db, job=failed_job, error=str(exc))
                results.append(failed_job)
        return results
