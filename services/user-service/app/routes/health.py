import time
from datetime import datetime, timezone

from fastapi import APIRouter

from app.config.settings import settings
from app.routes.users import users

router = APIRouter(tags=["health"])
START_TIME = time.monotonic()


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.monotonic() - START_TIME, 3),
        "user_count": len(users),
    }
