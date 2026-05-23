import logging

from fastapi import FastAPI

from app.config.settings import settings
from app.middleware.logging import RequestLoggingMiddleware, configure_logging
from app.routes.health import router as health_router
from app.routes.users import router as users_router

logger = configure_logging(settings.log_level)

app = FastAPI(title="AutoOps User Service", version=settings.service_version)
app.add_middleware(RequestLoggingMiddleware)
app.include_router(health_router)
app.include_router(users_router)


@app.on_event("startup")
async def startup_event():
    logging.getLogger("uvicorn.access").disabled = True
    logger.info(
        "service started",
        extra={
            "service": settings.service_name,
            "version": settings.service_version,
            "port": settings.port,
        },
    )
