"""
Expo Push HTTP client

文档: https://docs.expo.dev/push-notifications/sending-notifications/

- batch: 一次最多 100 条
- 失败重试由 Expo 端做（我们只负责一次提交 + 拿 ticket）
- dry_run 模式不发，只返回模拟响应（用于演示 / 测试）
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def build_messages(
    tokens: list[str],
    *,
    title: str,
    body: str,
    data: dict | None = None,
    channel: str = "push",
    sound: str = "default",
) -> list[dict[str, Any]]:
    """构造 Expo 接受的 messages 数组。"""
    return [
        {
            "to": t,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": sound if channel == "push" else None,
            "channelId": "default" if channel == "push" else None,
        }
        for t in tokens
    ]


async def send_messages(
    settings: Settings, messages: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """调用 Expo Push API 一次，返回每个 token 的 ticket 详情。

    Expo 响应形如:
      {"data": [{"status": "ok", "id": "..."} , ...]}
    或: {"data": [{"status": "error", "message": "..."} , ...]}
    """
    if not messages:
        return []

    if settings.push_dry_run:
        # 演示模式：所有消息模拟 ok
        return [
            {"status": "ok", "id": f"dryrun-{i}", "dryRun": True}
            for i in range(len(messages))
        ]

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if settings.expo_access_token:
        headers["Authorization"] = f"Bearer {settings.expo_access_token}"

    timeout = httpx.Timeout(15.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(EXPO_PUSH_URL, json=messages, headers=headers)
            resp.raise_for_status()
            payload = resp.json()
            return payload.get("data", [])
        except httpx.HTTPError as exc:
            logger.warning("Expo push request failed: %s", exc)
            return [
                {"status": "error", "message": str(exc)} for _ in messages
            ]


def summarize_tickets(tickets: list[dict[str, Any]]) -> tuple[int, int, list[dict]]:
    """拆分成功 / 失败，附带原始细节。"""
    success = 0
    failure = 0
    details: list[dict] = []
    for i, t in enumerate(tickets):
        if t.get("status") == "ok":
            success += 1
        else:
            failure += 1
        details.append({"index": i, **t})
    return success, failure, details
