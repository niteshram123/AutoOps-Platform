import logging

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Gauge

from app.config.settings import settings
from app.middleware.logging import RequestLoggingMiddleware, configure_logging
from app.routes.health import router as health_router
from app.routes.users import router as users_router

logger = configure_logging(settings.log_level)

app = FastAPI(title="AutoOps User Service", version=settings.service_version)
app.add_middleware(RequestLoggingMiddleware)

# ── Custom Prometheus metrics ─────────────────────────────────

# Tracks CRUD operations and their outcomes
user_operations_total = Counter(
    "user_operations_total",
    "Total user CRUD operations",
    ["operation", "status"],
)

# Current number of users held in memory
user_store_size = Gauge(
    "user_store_size",
    "Current number of users in the in-memory store",
)

# Validation errors broken down by field and error type
user_validation_errors_total = Counter(
    "user_validation_errors_total",
    "Total user validation errors",
    ["field", "error_type"],
)

# Expose metrics on the users router so they're accessible to route handlers
app.state.user_operations_total = user_operations_total
app.state.user_store_size = user_store_size
app.state.user_validation_errors_total = user_validation_errors_total

# ── Auto-instrument FastAPI with prometheus-fastapi-instrumentator ──
# Exposes /metrics with http_request_duration_seconds, http_requests_total, etc.
Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/health", "/metrics"],
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
).instrument(app).expose(app, include_in_schema=False, tags=["monitoring"])

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
