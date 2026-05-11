from app.repositories.advice_repository import AdviceRepository
from app.repositories.intake_repository import IntakeRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.profile_change_log_repository import ProfileChangeLogRepository
from app.repositories.profile_repository import ProfileRepository


class ArchiveService:
    def __init__(
        self,
        profile_repository: ProfileRepository | None = None,
        change_repository: ProfileChangeLogRepository | None = None,
        intake_repository: IntakeRepository | None = None,
        match_repository: MatchRepository | None = None,
        advice_repository: AdviceRepository | None = None,
    ) -> None:
        self.profile_repository = profile_repository or ProfileRepository()
        self.change_repository = change_repository or ProfileChangeLogRepository()
        self.intake_repository = intake_repository or IntakeRepository()
        self.match_repository = match_repository or MatchRepository()
        self.advice_repository = advice_repository or AdviceRepository()

    def build_timeline(
        self,
        db,
        *,
        user_id,
        limit: int = 30,
        item_types: set[str] | None = None,
        profile_version: int | None = None,
    ) -> list[dict]:
        profile_versions = self.profile_repository.list_versions(db, user_id=user_id, limit=limit)
        changes = self.change_repository.list_recent(db, user_id=user_id, limit=limit)
        life_events = list(self.intake_repository.list_life_events(db, user_id=user_id))[:limit]
        primary_matches = self.match_repository.list_primary_matches(db, user_id=user_id, limit=limit)
        advice_plans = self.advice_repository.list_recent(db, user_id=user_id, limit=limit)

        items: list[dict] = []

        for profile in profile_versions:
            keywords = profile.summary.get("keywords", [])
            keyword_text = "、".join(keywords) if isinstance(keywords, list) else "暂无关键词"
            items.append(
                {
                    "itemType": "profile_version",
                    "occurredAt": profile.created_at,
                    "title": f"画像版本 V{profile.version_no}",
                    "summary": f"画像总分 {profile.summary.get('score', '暂无')}，关键词：{keyword_text}",
                    "profileVersion": profile.version_no,
                    "metadata": {
                        "profileVersion": profile.version_no,
                        "summary": profile.summary,
                        "confidenceMap": profile.confidence_map,
                    },
                }
            )

        for change in changes:
            items.append(
                {
                    "itemType": "profile_change",
                    "occurredAt": change.created_at,
                    "title": f"画像变化 V{change.from_version} -> V{change.to_version}",
                    "summary": change.reason_summary.get("headline", "画像发生了一次更新。"),
                    "profileVersion": change.to_version,
                    "metadata": {
                        "fromVersion": change.from_version,
                        "toVersion": change.to_version,
                        "changedDimensions": change.changed_dimensions,
                        "reasonSummary": change.reason_summary,
                    },
                }
            )

        for event in life_events:
            items.append(
                {
                    "itemType": "life_event",
                    "occurredAt": event.event_time,
                    "title": event.title,
                    "summary": event.description or f"记录了一个 {event.event_type} 事件。",
                    "profileVersion": None,
                    "metadata": {
                        "eventType": event.event_type,
                        "impactScore": event.impact_score,
                    },
                }
            )

        for match in primary_matches:
            items.append(
                {
                    "itemType": "match_result",
                    "occurredAt": match.created_at,
                    "title": f"历史人物匹配 V{match.profile_version}",
                    "summary": f"当前最像 {match.figure_name}，相似度 {round(float(match.similarity_score) * 100, 1)}%。",
                    "profileVersion": match.profile_version,
                    "metadata": {
                        "profileVersion": match.profile_version,
                        "figureName": match.figure_name,
                        "similarityScore": float(match.similarity_score),
                    },
                }
            )

        for advice in advice_plans:
            items.append(
                {
                    "itemType": "advice_plan",
                    "occurredAt": advice.created_at,
                    "title": f"建议更新 V{advice.profile_version}",
                    "summary": advice.summary.get("focus", "生成了一次新的建议摘要。"),
                    "profileVersion": advice.profile_version,
                    "metadata": {
                        "profileVersion": advice.profile_version,
                        "summary": advice.summary,
                    },
                }
            )

        items.sort(key=lambda item: item["occurredAt"], reverse=True)
        if item_types:
            items = [item for item in items if item["itemType"] in item_types]
        if profile_version is not None:
            items = [item for item in items if item["profileVersion"] == profile_version]
        return items[:limit]
