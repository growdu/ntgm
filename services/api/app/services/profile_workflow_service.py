from app.services.advice_service import AdviceService
from app.services.job_service import JobService
from app.services.match_service import MatchService
from app.services.profile_service import ProfileService
from app.services.user_service import UserService


class ProfileWorkflowService:
    def __init__(
        self,
        job_service: JobService | None = None,
        profile_service: ProfileService | None = None,
        match_service: MatchService | None = None,
        advice_service: AdviceService | None = None,
        user_service: UserService | None = None,
    ) -> None:
        self.job_service = job_service or JobService()
        self.profile_service = profile_service or ProfileService()
        self.match_service = match_service or MatchService()
        self.advice_service = advice_service or AdviceService()
        self.user_service = user_service or UserService()

    def recompute(self, db, *, user, reason: str) -> tuple[object, object, object, dict]:
        job = self.job_service.create_job(
            db,
            user_id=user.id,
            job_type="recompute_profile",
            payload={"reason": reason, "userId": str(user.id)},
        )
        profile, source_snapshot = self.profile_service.generate_profile(db, user=user)
        self.user_service.set_current_profile_version(db, user=user, version_no=profile.version_no)
        match_response = self.match_service.calculate_current_match(profile=profile)
        self.match_service.persist_match(
            db,
            user_id=user.id,
            profile=profile,
            match_response=match_response,
        )
        advice = self.advice_service.generate_and_store(
            db,
            user_id=user.id,
            profile=profile,
            match_response=match_response,
        )
        self.job_service.complete_job(
            db,
            job=job,
            result={
                "profileVersion": profile.version_no,
                "sourceSnapshot": source_snapshot,
                "adviceId": str(advice.id),
            },
        )
        return job, profile, advice, source_snapshot
