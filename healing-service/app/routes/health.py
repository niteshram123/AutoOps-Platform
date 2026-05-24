from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])

_started_at = datetime.now(timezone.utc)


@router.get("/health")
async def health(request: Request) -> JSONResponse:
    settings = request.app.state.settings
    uptime = (datetime.now(timezone.utc) - _started_at).total_seconds()

    return JSONResponse(
        {
            "status": "healthy",
            "service": settings.SERVICE_NAME,
            "version": "1.0.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(uptime, 1),
            "ai_enabled": settings.AI_ENABLED and bool(settings.ANTHROPIC_API_KEY),
        }
    )
