from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.profile_version import ProfileVersion


class ProfileRepository:
    def get_current(self, db: Session, *, user_id: UUID) -> ProfileVersion | None:
        statement = (
            select(ProfileVersion)
            .where(ProfileVersion.user_id == user_id)
            .order_by(desc(ProfileVersion.version_no))
            .limit(1)
        )
        return db.scalar(statement)

    def create_version(
        self,
        db: Session,
        *,
        user_id: UUID,
        version_no: int,
        summary: dict,
        personality_traits: dict,
        ability_traits: dict,
        relationship_traits: dict,
        fortune_traits: dict,
        confidence_map: dict,
        source_snapshot: dict,
        engine_version: str = "v0",
    ) -> ProfileVersion:
        profile = ProfileVersion(
            user_id=user_id,
            version_no=version_no,
            summary=summary,
            personality_traits=personality_traits,
            ability_traits=ability_traits,
            relationship_traits=relationship_traits,
            fortune_traits=fortune_traits,
            confidence_map=confidence_map,
            source_snapshot=source_snapshot,
            engine_version=engine_version,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile

    def list_versions(self, db: Session, *, user_id: UUID, limit: int = 10) -> list[ProfileVersion]:
        statement = (
            select(ProfileVersion)
            .where(ProfileVersion.user_id == user_id)
            .order_by(desc(ProfileVersion.version_no))
            .limit(limit)
        )
        return list(db.scalars(statement))

    def get_by_version(self, db: Session, *, user_id: UUID, version_no: int) -> ProfileVersion | None:
        statement = select(ProfileVersion).where(
            ProfileVersion.user_id == user_id,
            ProfileVersion.version_no == version_no,
        )
        return db.scalar(statement)
