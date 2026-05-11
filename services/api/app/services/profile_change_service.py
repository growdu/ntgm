from collections.abc import Mapping

from sqlalchemy.orm import Session

from app.repositories.profile_change_log_repository import ProfileChangeLogRepository


class ProfileChangeService:
    def __init__(self, repository: ProfileChangeLogRepository | None = None) -> None:
        self.repository = repository or ProfileChangeLogRepository()

    def build_change_summary(self, *, previous_profile, current_profile, reason: str, source_snapshot: dict) -> tuple[dict, dict]:
        previous_traits = self._flatten_traits(previous_profile) if previous_profile is not None else {}
        current_traits = self._flatten_traits(current_profile)

        diffs: list[dict] = []
        raised: list[str] = []
        lowered: list[str] = []

        for dimension, current_value in current_traits.items():
            previous_value = round(float(previous_traits.get(dimension, 0.0)), 2)
            delta = round(current_value - previous_value, 2)
            if abs(delta) < 0.03:
                continue

            direction = "up" if delta > 0 else "down"
            diffs.append(
                {
                    "dimension": dimension,
                    "previousValue": previous_value,
                    "currentValue": current_value,
                    "delta": delta,
                    "direction": direction,
                }
            )
            if direction == "up":
                raised.append(dimension)
            else:
                lowered.append(dimension)

        diffs.sort(key=lambda item: abs(item["delta"]), reverse=True)
        uncertain_dimensions = [
            key for key, value in current_profile.confidence_map.items() if self._to_float(value) < 0.6
        ]

        changed_dimensions = {
            "raised": raised,
            "lowered": lowered,
            "topDiffs": diffs[:6],
            "uncertainDimensions": uncertain_dimensions,
        }

        reason_summary = self._build_reason_summary(
            previous_profile=previous_profile,
            current_profile=current_profile,
            reason=reason,
            source_snapshot=source_snapshot,
            top_diffs=diffs[:3],
        )
        return changed_dimensions, reason_summary

    def record_change(
        self,
        db: Session,
        *,
        user_id,
        previous_profile,
        current_profile,
        reason: str,
        source_snapshot: dict,
    ):
        changed_dimensions, reason_summary = self.build_change_summary(
            previous_profile=previous_profile,
            current_profile=current_profile,
            reason=reason,
            source_snapshot=source_snapshot,
        )
        return self.repository.create(
            db,
            user_id=user_id,
            from_version=previous_profile.version_no if previous_profile is not None else 0,
            to_version=current_profile.version_no,
            changed_dimensions=changed_dimensions,
            reason_summary=reason_summary,
        )

    def list_recent_changes(self, db: Session, *, user_id, limit: int = 10):
        return self.repository.list_recent(db, user_id=user_id, limit=limit)

    def _flatten_traits(self, profile) -> dict[str, float]:
        flattened: dict[str, float] = {}
        for group_name in (
            "personality_traits",
            "ability_traits",
            "relationship_traits",
            "fortune_traits",
        ):
            group = getattr(profile, group_name, {}) or {}
            for key, value in group.items():
                numeric_value = round(self._to_float(value), 2)
                flattened[key] = numeric_value
        return flattened

    def _build_reason_summary(
        self,
        *,
        previous_profile,
        current_profile,
        reason: str,
        source_snapshot: dict,
        top_diffs: list[dict],
    ) -> dict:
        previous_snapshot = previous_profile.source_snapshot if previous_profile is not None else {}
        evidence_delta = {
            "intakeRecordDelta": source_snapshot.get("intakeRecordCount", 0)
            - previous_snapshot.get("intakeRecordCount", 0),
            "questionnaireDelta": source_snapshot.get("questionnaireCount", 0)
            - previous_snapshot.get("questionnaireCount", 0),
            "lifeEventDelta": source_snapshot.get("lifeEventCount", 0)
            - previous_snapshot.get("lifeEventCount", 0),
        }
        new_evidence = [
            label
            for label, delta in (
                ("问答补充", evidence_delta["questionnaireDelta"]),
                ("人生事件", evidence_delta["lifeEventDelta"]),
                ("证据总量", evidence_delta["intakeRecordDelta"]),
            )
            if delta > 0
        ]

        headline = self._build_headline(
            previous_profile=previous_profile,
            current_profile=current_profile,
            reason=reason,
            top_diffs=top_diffs,
            new_evidence=new_evidence,
        )

        return {
            "headline": headline,
            "trigger": reason,
            "newEvidence": new_evidence,
            "evidenceDelta": evidence_delta,
            "sourceSnapshot": source_snapshot,
        }

    def _build_headline(
        self,
        *,
        previous_profile,
        current_profile,
        reason: str,
        top_diffs: list[dict],
        new_evidence: list[str],
    ) -> str:
        if previous_profile is None:
            return f"基于首次建档与八字分析生成画像 V{current_profile.version_no}。"

        if not top_diffs:
            return f"画像升级到 V{current_profile.version_no}，当前新增证据暂未触发明显维度变化。"

        primary = top_diffs[0]
        direction_text = "上升" if primary["direction"] == "up" else "下降"
        evidence_text = f"；主要受{ '、'.join(new_evidence) }驱动" if new_evidence else ""
        return f"{primary['dimension']}明显{direction_text}，画像升级到 V{current_profile.version_no}{evidence_text}。"

    def _to_float(self, value) -> float:
        if isinstance(value, bool):
            return 1.0 if value else 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return 0.0
        if isinstance(value, Mapping):
            return 0.0
        return 0.0
