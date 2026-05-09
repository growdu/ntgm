from fastapi import FastAPI

from app.api.router import router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="NTGM API",
    version="0.1.0",
    description="持续交互演进的命理画像系统 API",
)
app.include_router(router, prefix=settings.api_prefix)

