from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

router = APIRouter(tags=["monitoring"])

# ── Healing-service Prometheus metrics ───────────────────────────────────────

_registry = CollectorRegistry()

healing_actions_total = Counter(
    "healing_events_total",
    "Total healing events processed",
    ["action", "service", "result"],
    registry=_registry,
)

healing_duration_seconds = Histogram(
    "healing_duration_seconds",
    "Time taken to complete a healing cycle",
    ["action", "service"],
    buckets=[1, 5, 15, 30, 60, 120, 300],
    registry=_registry,
)

healing_ai_calls_total = Counter(
    "healing_ai_calls_total",
    "Total Claude API calls made",
    registry=_registry,
)

healing_ai_errors_total = Counter(
    "healing_ai_errors_total",
    "Total Claude API failures (fell back to rule-based)",
    registry=_registry,
)

healing_active_events = Gauge(
    "healing_active_events",
    "Number of healing events currently being processed",
    registry=_registry,
)

healing_last_event_timestamp = Gauge(
    "healing_last_event_timestamp",
    "Unix timestamp of the last healing event received",
    registry=_registry,
)

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests to the healing service",
    ["method", "route", "status_code"],
    registry=_registry,
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration for the healing service",
    ["method", "route", "status_code"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registry=_registry,
)


@router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint() -> PlainTextResponse:
    data = generate_latest(_registry)
    return PlainTextResponse(
        content=data.decode("utf-8"),
        media_type=CONTENT_TYPE_LATEST,
    )
