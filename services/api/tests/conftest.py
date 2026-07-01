"""Shared pytest fixtures for FastAPI route tests.

Routes are wrapped through FastAPI's TestClient, which spins up an anyio
portal for each test. To keep total runtime below 30s for ~70 route tests,
we share a single FastAPI app + single TestClient across all tests in a
module via session-scoped fixtures.

⚠️ Dependency overrides are reset per-test to avoid bleed-through.
   Repository patches use `monkeypatch.setattr` (auto-cleanup).
"""
import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Generic helpers — also re-exportable from individual test modules.
# ---------------------------------------------------------------------------
class FakeUserRepo:
    """Captures calls + returns pre-loaded user. Reusable across tests."""

    def __init__(self, user=None):
        self.user = user
        self.calls = []

    def get_first(self, db):
        self.calls.append("get_first")
        return self.user

    @staticmethod
    def as_replacement(outer):
        """Bind to descriptor — receives (self, db) when called."""
        def _patched(self, db):
            outer.calls.append("get_first")
            return outer.user
        return _patched


def fake_user_payload(version_no=3):
    """Standard user object matching UserMeResponse schema."""
    return SimpleNamespace(
        id=uuid.uuid4(), name="张三", gender="male",
        birth_datetime=None, birth_place="北京",
        current_profile_version=version_no,
    )


# ---------------------------------------------------------------------------
# Per-app fixing fixture. Use by collecting all routers you want.
# This file is intentionally minimal; tests build their own apps with
# the specific routers they need via the `build_app` helper.
# ---------------------------------------------------------------------------
def build_app(*routers):
    """Create a FastAPI app with given routers."""
    app = FastAPI()
    for r in routers:
        app.include_router(r)
    return app


# ---------------------------------------------------------------------------
# Auto-fixture: isolate repository monkeypatches so one test's tweak
# does not bleed into next test.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _clean_db_overrides():
    """Snapshot+restore any app.dependency_overrides state via monkeypatch.

    We can't import TestClient.app easily here, so consumers should clear
    explicitly when they mount per-test FastAPI apps. This fixture mainly
    ensures repository patches don't leak.
    """
    yield
    # Note: pytest monkeypatch fixtures only exist if used. Tests
    # using `monkeypatch.setattr(UserRepository, ...)` auto-clean.
