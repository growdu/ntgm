from sqlalchemy.orm import Session

from app.repositories.intake_repository import IntakeRepository
from app.repositories.profile_repository import ProfileRepository


class ProfileService:
    def __init__(
        self,
        repository: ProfileRepository | None = None,
        intake_repository: IntakeRepository | None = None,
    ) -> None:
        self.repository = repository or ProfileRepository()
        self.intake_repository = intake_repository or IntakeRepository()

    def get_current_profile(self, db: Session, *, user_id):
        return self.repository.get_current(db, user_id=user_id)

    def generate_profile(self, db: Session, *, user) -> tuple[object, dict]:
        current = self.repository.get_current(db, user_id=user.id)
        next_version = 1 if current is None else current.version_no + 1

        records = self.intake_repository.list_records(db, user_id=user.id)
        events = self.intake_repository.list_life_events(db, user_id=user.id)
        questionnaire_count = sum(1 for record in records if record.intake_type == "questionnaire_answer")

        risk_preference = min(0.35 + questionnaire_count * 0.08 + len(events) * 0.05, 0.92)
        rationality = min(0.55 + questionnaire_count * 0.04, 0.9)
        control_drive = min(0.5 + len(events) * 0.06, 0.88)
        long_term = min(0.48 + questionnaire_count * 0.05, 0.89)
        execution_strength = min(0.52 + len(events) * 0.07, 0.91)

        personality_traits = {
            "riskPreference": round(risk_preference, 2),
            "rationality": round(rationality, 2),
            "emotionStability": round(min(0.5 + questionnaire_count * 0.03, 0.82), 2),
            "longTermOrientation": round(long_term, 2),
            "controlDrive": round(control_drive, 2),
        }
        ability_traits = {
            "executionStrength": round(execution_strength, 2),
            "learningVelocity": round(min(0.58 + questionnaire_count * 0.02, 0.85), 2),
            "resourceIntegration": round(min(0.54 + len(events) * 0.03, 0.84), 2),
        }
        relationship_traits = {
            "relationshipDependency": round(max(0.45 - questionnaire_count * 0.02, 0.2), 2),
            "conflictHandling": round(min(0.5 + questionnaire_count * 0.04, 0.82), 2),
        }
        fortune_traits = {
            "careerDrive": round(min(0.6 + len(events) * 0.04, 0.9), 2),
            "wealthDrive": round(min(0.56 + questionnaire_count * 0.03, 0.86), 2),
        }
        confidence_map = {
            "personality": round(min(0.55 + questionnaire_count * 0.08, 0.9), 2),
            "ability": round(min(0.5 + len(events) * 0.08, 0.88), 2),
            "relationship": round(min(0.45 + questionnaire_count * 0.06, 0.84), 2),
        }

        keywords = ["持续校准", "画像演进"]
        if personality_traits["riskPreference"] >= 0.65:
            keywords.append("高风险偏好")
        if fortune_traits["careerDrive"] >= 0.68:
            keywords.append("高事业驱动")
        if personality_traits["longTermOrientation"] >= 0.6:
            keywords.append("长线主义")

        summary = {
            "score": int(
                (
                    sum(personality_traits.values())
                    + sum(ability_traits.values())
                    + sum(relationship_traits.values())
                    + sum(fortune_traits.values())
                )
                / (
                    len(personality_traits)
                    + len(ability_traits)
                    + len(relationship_traits)
                    + len(fortune_traits)
                )
                * 100
            ),
            "keywords": keywords,
        }
        source_snapshot = {
            "intakeRecordCount": len(records),
            "questionnaireCount": questionnaire_count,
            "lifeEventCount": len(events),
        }

        profile = self.repository.create_version(
            db,
            user_id=user.id,
            version_no=next_version,
            summary=summary,
            personality_traits=personality_traits,
            ability_traits=ability_traits,
            relationship_traits=relationship_traits,
            fortune_traits=fortune_traits,
            confidence_map=confidence_map,
            source_snapshot=source_snapshot,
        )
        return profile, source_snapshot

