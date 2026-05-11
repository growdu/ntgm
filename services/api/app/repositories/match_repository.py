from uuid import UUID

from sqlalchemy import delete, desc, select
from sqlalchemy.orm import Session

from app.models.match_result import MatchResult


class MatchRepository:
    def replace_results(
        self,
        db: Session,
        *,
        user_id: UUID,
        profile_version: int,
        items: list[dict],
    ) -> list[MatchResult]:
        db.execute(
            delete(MatchResult).where(
                MatchResult.user_id == user_id,
                MatchResult.profile_version == profile_version,
            )
        )

        results: list[MatchResult] = []
        for item in items:
            result = MatchResult(
                user_id=user_id,
                profile_version=profile_version,
                rank_no=item["rank_no"],
                figure_name=item["figure_name"],
                similarity_score=item["similarity_score"],
                similarity_breakdown=item["similarity_breakdown"],
                difference_breakdown=item["difference_breakdown"],
                explanation=item["explanation"],
            )
            db.add(result)
            results.append(result)

        db.commit()
        for result in results:
            db.refresh(result)
        return results

    def get_current_results(self, db: Session, *, user_id: UUID, profile_version: int) -> list[MatchResult]:
        statement = (
            select(MatchResult)
            .where(MatchResult.user_id == user_id, MatchResult.profile_version == profile_version)
            .order_by(MatchResult.rank_no.asc(), desc(MatchResult.created_at))
        )
        return list(db.scalars(statement).all())

    def list_primary_matches(self, db: Session, *, user_id: UUID, limit: int = 10) -> list[MatchResult]:
        statement = (
            select(MatchResult)
            .where(MatchResult.user_id == user_id, MatchResult.rank_no == 1)
            .order_by(desc(MatchResult.profile_version), desc(MatchResult.created_at))
            .limit(limit)
        )
        return list(db.scalars(statement).all())
