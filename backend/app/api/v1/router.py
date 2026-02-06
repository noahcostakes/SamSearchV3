"""API v1 router combining all endpoints."""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.profiles import router as profiles_router
from app.api.v1.search import router as search_router
from app.api.v1.jobs import router as jobs_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(profiles_router)
router.include_router(search_router)
router.include_router(jobs_router)
