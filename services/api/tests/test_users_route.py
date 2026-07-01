"""Route-layer test scaffold.

⚠️ Route signatures look like:
    def get_me(db=Depends(get_db), service=UserService()): ...

The default `UserService()` is evaluated ONCE at module-import time, so
patching `app.api.routes.users.UserService` is too late.

Strategy: patch the *repository* the service holds:
    UserRepository.get_first = lambda db: fake_user
This works because:
  1. Service is instantiated at import (real, but stateless wrapper)
  2. Service delegates to its repository
  3. Repository methods can be monkeypatched on the class itself
"""
import uuid
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routes.users import router as users_router
from app.db import get_db
from app.repositories.user_repository import UserRepository


class _FakeDB:
    def __init__(self): self.commits = 0
    def commit(self): self.commits += 1


def _fake_get_db():
    db = _FakeDB()
    try: yield db
    finally: pass


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(users_router)
    return TestClient(app)


class FakeUserRepo:
    """Captures calls + returns pre-loaded user."""

    def __init__(self, user):
        self.user = user
        self.calls = []

    def get_first(self, db):
        self.calls.append("get_first")
        return self.user

    # Class-level replacement: takes (self, db) because pytest's
    # patch.object rebinds the descriptor on the class.
    @classmethod
    def as_replacement(cls, outer):
        def _patched_get_first(self, db):
            outer.calls.append("get_first")
            return outer.user
        return _patched_get_first


def test_users_me_returns_user():
    repo = FakeUserRepo(SimpleNamespace(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime=None, birth_place="北京",
        current_profile_version=3,
    ))
    app = _client().app
    app.dependency_overrides[get_db] = _fake_get_db
    original = UserRepository.__init__
    try:
        # Force every UserRepository() to be a no-op + provide our get_first.
        # patch.object binds descriptor on class, so signature is (self, db).
        with patch.object(UserRepository, "__init__", lambda self: None), \
             patch.object(UserRepository, "get_first", FakeUserRepo.as_replacement(repo)):
            client = TestClient(app)
            r = client.get("/users/me")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["userId"] == str(repo.user.id)
        assert body["name"] == "张三"
        assert body["currentProfileVersion"] == 3
        assert repo.calls == ["get_first"]
    finally:
        app.dependency_overrides.clear()
        UserRepository.__init__ = original


def test_users_me_returns_404_when_no_user():
    repo = FakeUserRepo(None)
    app = _client().app
    app.dependency_overrides[get_db] = _fake_get_db
    original = UserRepository.__init__
    try:
        with patch.object(UserRepository, "__init__", lambda self: None), \
             patch.object(UserRepository, "get_first", repo.get_first):
            client = TestClient(app)
            r = client.get("/users/me")
        assert r.status_code == 404
        assert "User not found" in r.json()["detail"]
    finally:
        app.dependency_overrides.clear()
        UserRepository.__init__ = original
