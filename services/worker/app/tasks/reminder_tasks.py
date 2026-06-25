"""
Reminder dispatch Celery tasks.

Calls PushService.scan_due_reminders() which:
1. Queries pending reminders where trigger_at <= now
2. For each due reminder, fetches active Expo push tokens
3. Sends Expo push notifications
4. Updates reminder status (sent / failed)
"""
import logging

from celery import Task

logger = logging.getLogger(__name__)


class ReminderScanTask(Task):
    """Scan and dispatch due reminders."""

    name = "ntgm.reminder.scan_due"
    max_retries = 3
    autoretry_for = (Exception,)
    retry_backoff = 60  # seconds

    def run(self) -> dict:
        """
        Scan reminders table for due (trigger_at <= now) pending reminders
        and dispatch Expo push notifications for each.
        """
        # Import here to avoid circular imports at module load time
        from app.api_app.services.push_service import PushService
        from app.api_app.core.config import get_settings
        from app.api_app.db import SessionLocal

        settings = get_settings()
        db = SessionLocal()
        try:
            service = PushService()
            # scan_due_reminders is async; run in sync event loop
            import asyncio

            async def _scan() -> list:
                return await service.scan_due_reminders(db, settings=settings)

            jobs = asyncio.run(_scan())
            logger.info(
                f"[ReminderScan] dispatch_complete",
                extra={"dispatched": len(jobs)},
            )
            return {"dispatched": len(jobs), "jobs": [str(j.id) for j in jobs]}
        except Exception as exc:
            logger.exception(f"[ReminderScan] error: {exc}")
            raise
        finally:
            db.close()


reminder_scan = ReminderScanTask()
