from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.schemas.user import BasicIntakeRequest


class UserService:
    def __init__(self, repository: UserRepository | None = None) -> None:
        self.repository = repository or UserRepository()

    def intake_basic(self, db: Session, payload: BasicIntakeRequest):
        return self.repository.create_or_update_basic(
            db,
            name=payload.name,
            gender=payload.gender,
            birth_datetime=payload.birthDatetime,
            birth_place=payload.birthPlace,
        )

    def get_current_user(self, db: Session):
        return self.repository.get_first(db)

    def require_current_user(self, db: Session):
        user = self.get_current_user(db)
        if user is None:
            raise ValueError("User not found")
        return user

    def set_current_profile_version(self, db: Session, *, user, version_no: int):
        return self.repository.set_current_profile_version(db, user=user, version_no=version_no)
