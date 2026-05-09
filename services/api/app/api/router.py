from fastapi import APIRouter

from app.api.routes.assets import router as assets_router
from app.api.routes.events import router as events_router
from app.api.routes.health import router as health_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.matches import router as matches_router
from app.api.routes.profiles import router as profiles_router
from app.api.routes.questionnaire import router as questionnaire_router
from app.api.routes.users import router as users_router

router = APIRouter()
router.include_router(health_router)
router.include_router(assets_router)
router.include_router(users_router)
router.include_router(events_router)
router.include_router(jobs_router)
router.include_router(matches_router)
router.include_router(profiles_router)
router.include_router(questionnaire_router)
