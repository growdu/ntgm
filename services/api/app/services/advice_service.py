from app.repositories.advice_repository import AdviceRepository
from app.schemas.advice import AdviceCurrentResponse


class AdviceService:
    def __init__(self, repository: AdviceRepository | None = None) -> None:
        self.repository = repository or AdviceRepository()

    def generate_and_store(self, db, *, user_id, profile, match_response):
        primary = match_response.topMatches[0] if match_response.topMatches else None
        summary = {
            "today": [
                "避免在高波动状态下做重大即时决策",
                "补充一次近期重大事件记录",
            ],
            "focus": "先稳定画像，再强化执行反馈",
            "matchedFigure": primary.figureName if primary else None,
        }
        return self.repository.replace_current(
            db,
            user_id=user_id,
            profile_version=profile.version_no,
            summary=summary,
        )

    def get_current(self, db, *, user_id, profile_version):
        return self.repository.get_current(db, user_id=user_id, profile_version=profile_version)

