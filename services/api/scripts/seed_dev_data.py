#!/usr/bin/env python3
"""
Seed development database with realistic sample data.

Usage:
    # With Docker Compose (runs inside the api container):
    docker compose -f infra/compose/docker-compose.yml exec api \\
      python scripts/seed_dev_data.py

    # Or directly with uv:
    cd services/api && uv run python scripts/seed_dev_data.py

Run AFTER `alembic upgrade head` — needs the schema to exist.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.db import SessionLocal
from app.models.user import User
from app.models.intake_record import IntakeRecord
from app.models.life_event import LifeEvent
from app.models.bazi_analysis import BaziAnalysis


def _tz(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware (UTC)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def seed_users(db) -> list[User]:
    """Create 3 demo users at different stages of the funnel."""
    users = [
        User(
            id=uuid.UUID("a0000001-0000-0000-0000-000000000001"),
            name="李明",
            gender="M",
            birth_datetime=_tz(datetime(1995, 3, 15, 10, 30)),
            birth_place="北京",
            current_profile_version=0,
            status="active",
        ),
        User(
            id=uuid.UUID("a0000002-0000-0000-0000-000000000002"),
            name="王芳",
            gender="F",
            birth_datetime=_tz(datetime(1998, 7, 22, 14, 0)),
            birth_place="上海",
            current_profile_version=1,
            status="active",
        ),
        User(
            id=uuid.UUID("a0000003-0000-0000-0000-000000000003"),
            name="张伟",
            gender="M",
            birth_datetime=_tz(datetime(1990, 11, 8, 8, 15)),
            birth_place="深圳",
            current_profile_version=2,
            status="active",
        ),
    ]

    for u in users:
        existing = db.query(User).filter(User.id == u.id).first()
        if not existing:
            db.add(u)
    db.commit()
    print(f"  Users: {len(users)} created/verified")
    return users


def seed_intake_records(db, users: list[User]) -> None:
    """Create intake records for each user."""
    records_data = [
        # User 1 — just basic info (V0)
        {
            "user": users[0],
            "intake_type": "basic",
            "source_channel": "mobile",
            "payload": {
                "name": "李明",
                "gender": "M",
                "birthDate": "1995-03-15",
                "birthTime": "10:30",
                "birthPlace": "北京",
                "birthLng": 116.4,
                "birthLat": 39.9,
            },
        },
        # User 2 — basic + photo (V1)
        {
            "user": users[1],
            "intake_type": "basic",
            "source_channel": "mobile",
            "payload": {
                "name": "王芳",
                "gender": "F",
                "birthDate": "1998-07-22",
                "birthTime": "14:00",
                "birthPlace": "上海",
                "birthLng": 121.5,
                "birthLat": 31.2,
            },
        },
        {
            "user": users[1],
            "intake_type": "photo",
            "source_channel": "mobile",
            "payload": {
                "photoAssetId": str(uuid.uuid4()),
                "faceFeatures": {"face_shape": "oval", "expression": "calm"},
            },
        },
        # User 3 — full V2 intake
        {
            "user": users[2],
            "intake_type": "basic",
            "source_channel": "web",
            "payload": {
                "name": "张伟",
                "gender": "M",
                "birthDate": "1990-11-08",
                "birthTime": "08:15",
                "birthPlace": "深圳",
                "birthLng": 114.1,
                "birthLat": 22.5,
            },
        },
        {
            "user": users[2],
            "intake_type": "questionnaire_v1",
            "source_channel": "web",
            "payload": {
                "answers": {
                    "riskPreference": 0.6,
                    "longTermOrientation": 0.75,
                    "emotionStability": 0.45,
                    "socialOrientation": 0.3,
                }
            },
        },
    ]

    count = 0
    for rd in records_data:
        existing = (
            db.query(IntakeRecord)
            .filter(
                IntakeRecord.user_id == rd["user"].id,
                IntakeRecord.intake_type == rd["intake_type"],
            )
            .first()
        )
        if not existing:
            rec = IntakeRecord(**{k: v for k, v in rd.items() if k != "user"})
            rec.user_id = rd["user"].id
            db.add(rec)
            count += 1
    db.commit()
    print(f"  Intake records: {count} created/verified")


def seed_life_events(db, users: list[User]) -> None:
    """Create life events for the most mature user (User 3)."""
    events = [
        {
            "user": users[2],
            "event_type": "education",
            "event_time": _tz(datetime(2013, 9, 1)),
            "title": "考入清华大学计算机系",
            "description": "以优异成绩被清华大学计算机科学与技术专业录取",
            "impact_score": 8,
        },
        {
            "user": users[2],
            "event_type": "career",
            "event_time": _tz(datetime(2017, 7, 1)),
            "title": "加入字节跳动",
            "description": "毕业后加入字节跳动担任后端工程师",
            "impact_score": 7,
        },
        {
            "user": users[2],
            "event_type": "relationship",
            "event_time": _tz(datetime(2020, 5, 20)),
            "title": "结婚",
            "description": "与相恋三年的女友结婚",
            "impact_score": 6,
        },
        {
            "user": users[2],
            "event_type": "career",
            "event_time": _tz(datetime(2022, 1, 1)),
            "title": "晋升为技术经理",
            "description": "带领 10 人团队负责数据平台建设",
            "impact_score": 7,
        },
    ]

    count = 0
    for ev in events:
        existing = (
            db.query(LifeEvent)
            .filter(LifeEvent.user_id == ev["user"].id, LifeEvent.title == ev["title"])
            .first()
        )
        if not existing:
            rec = LifeEvent(**{k: v for k, v in ev.items() if k != "user"})
            rec.user_id = ev["user"].id
            db.add(rec)
            count += 1
    db.commit()
    print(f"  Life events: {count} created/verified")


def seed_bazi(db, users: list[User]) -> None:
    """Create Bazi analyses for all users."""
    analyses = [
        {
            "user": users[0],
            "year_gz": "乙亥",
            "month_gz": "丁丑",
            "day_gz": "戊子",
            "hour_gz": "丁巳",
            "chart_data": {
                "year_gan": "乙",
                "year_zhi": "亥",
                "month_gan": "丁",
                "month_zhi": "丑",
                "day_gan": "戊",
                "day_zhi": "子",
                "hour_gan": "丁",
                "hour_zhi": "巳",
            },
            "feature_data": {
                "five_elements": {"木": 2, "火": 3, "土": 2, "金": 1, "水": 2},
                "lucky_elements": ["火", "土"],
                "unlucky_elements": ["金"],
            },
            "interpretation_data": {
                "day_master": "戊土",
                "strength": "强",
                "summary": "日主戊土生于丑月，得令但地支无根，性格稳重务实",
            },
            "score": 72,
            "confidence": 0.85,
            "engine_version": "bazi-v0",
        },
        {
            "user": users[1],
            "year_gz": "戊寅",
            "month_gz": "己未",
            "day_gz": "辛酉",
            "hour_gz": "壬子",
            "chart_data": {
                "year_gan": "戊",
                "year_zhi": "寅",
                "month_gan": "己",
                "month_zhi": "未",
                "day_gan": "辛",
                "day_zhi": "酉",
                "hour_gan": "壬",
                "hour_zhi": "子",
            },
            "feature_data": {
                "five_elements": {"木": 2, "火": 1, "土": 3, "金": 2, "水": 2},
                "lucky_elements": ["土", "金"],
                "unlucky_elements": ["火"],
            },
            "interpretation_data": {
                "day_master": "辛金",
                "strength": "中",
                "summary": "日主辛金生于未月，土旺金相，性格内敛细腻",
            },
            "score": 68,
            "confidence": 0.78,
            "engine_version": "bazi-v0",
        },
        {
            "user": users[2],
            "year_gz": "庚午",
            "month_gz": "丁亥",
            "day_gz": "辛亥",
            "hour_gz": "壬戌",
            "chart_data": {
                "year_gan": "庚",
                "year_zhi": "午",
                "month_gan": "丁",
                "month_zhi": "亥",
                "day_gan": "辛",
                "day_zhi": "亥",
                "hour_gan": "壬",
                "hour_zhi": "戌",
            },
            "feature_data": {
                "five_elements": {"木": 2, "火": 2, "土": 1, "金": 2, "水": 3},
                "lucky_elements": ["水", "金"],
                "unlucky_elements": ["土"],
            },
            "interpretation_data": {
                "day_master": "辛亥",
                "strength": "弱",
                "summary": "日主辛金死于亥月，水多泄金之气，需要火来暖局",
            },
            "score": 81,
            "confidence": 0.91,
            "engine_version": "bazi-v1",
        },
    ]

    count = 0
    for a in analyses:
        existing = (
            db.query(BaziAnalysis)
            .filter(BaziAnalysis.user_id == a["user"].id, BaziAnalysis.year_gz == a["year_gz"])
            .first()
        )
        if not existing:
            rec = BaziAnalysis(**{k: v for k, v in a.items() if k != "user"})
            rec.user_id = a["user"].id
            db.add(rec)
            count += 1
    db.commit()
    print(f"  Bazi analyses: {count} created/verified")


def main() -> None:
    db = SessionLocal()
    try:
        print("\n[seed_dev_data] Starting...")
        print(f"  Database: {db.get_bind().url.database}")

        users = seed_users(db)
        seed_intake_records(db, users)
        seed_life_events(db, users)
        seed_bazi(db, users)

        print("[seed_dev_data] Done — database seeded successfully.\n")
        print("Demo users:")
        for u in users:
            print(f"  {u.name}  id={u.id}  profile_v{u.current_profile_version}")
        print()

    finally:
        db.close()


if __name__ == "__main__":
    main()
