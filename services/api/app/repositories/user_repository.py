from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def get_first(self, db: Session) -> User | None:
        return db.scalar(select(User).limit(1))

    def create_or_update_basic(
        self,
        db: Session,
        *,
        name: str,
        gender: str,
        birth_datetime: datetime,
        birth_place: str,
    ) -> User:
        user = self.get_first(db)
        if user is None:
            user = User(
                name=name,
                gender=gender,
                birth_datetime=birth_datetime,
                birth_place=birth_place,
            )
            db.add(user)
        else:
            user.name = name
            user.gender = gender
            user.birth_datetime = birth_datetime
            user.birth_place = birth_place

        db.commit()
        db.refresh(user)
        return user

    def set_current_profile_version(self, db: Session, *, user: User, version_no: int) -> User:
        user.current_profile_version = version_no
        db.commit()
        db.refresh(user)
        return user
