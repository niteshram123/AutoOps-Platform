from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse

from app.models.alert import Alert, AlertManagerPayload
from app.models.healing_event import HealingStatus

logger = logging.getLogger("healing-service")

router = APIRouter(prefix="/webhook", tags=["webhook"])


def _verify_token(request: Request) -> None:
    """Validate the Bearer token from the Authorization header."""
    settings = request.app.state.settings
    if not settings.WEBHOOK_SECRET:
        return  # No secret configured — allow all (dev mode)

    auth = request.headers.get("Authorization", "")
    expected = f"Bearer {settings.WEBHOOK_SECRET}"
    if auth != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing bearer token")


async def _handle_alerts(
    payload: AlertManagerPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    priority: str = "normal",
) -> JSONResponse:
    """Shared handler for all webhook endpoints."""
    _verify_token(request)

    engine = request.app.state.healing_engine
    audit = request.app.state.audit_store

    # Only process firing alerts
    firing = [a for a in payload.alerts if a.status == "firing"]
    if not firing:
        logger.info(
            "webhook received resolved/non-firing payload — no action",
            extra={"status": payload.status, "count": len(payload.alerts)},
        )
        return JSONResponse({"status": "ok", "message": "no firing alerts", "event_ids": []})

    event_ids: list[str] = []

    for alert in firing:
        alert.compute_firing_duration()

        # Count previous healing events for this service today
        existing = await audit.list_events(service=alert.labels.get("service", "unknown"))
        alert.previous_healing_count = len(existing)

        # Create audit event
        event = await audit.create_event(alert)
        event_ids.append(event.id)

        # Update last event timestamp metric
        try:
            from app.routes.metrics import healing_last_event_timestamp, healing_active_events
            healing_last_event_timestamp.set(time.time())
            healing_active_events.inc()
        except Exception:
            pass

        logger.info(
            "alert received",
            extra={
                "event_id": event.id,
                "alert": alert.labels.alertname,
                "severity": alert.labels.severity,
                "service": alert.labels.get("service", "unknown"),
                "priority": priority,
            },
        )

        # Spawn background task — never block the webhook response
        async def _process(a: Alert = alert, eid: str = event.id) -> None:
            try:
                await engine.process_alert(a, eid)
            except Exception as exc:
                logger.error(
                    "healing engine error",
                    extra={"event_id": eid, "error": str(exc)},
                )
                await audit.update_event(
                    eid,
                    status=HealingStatus.FAILED,
                    message=f"Unhandled engine error: {exc}",
                )
            finally:
                try:
                    from app.routes.metrics import healing_active_events
                    healing_active_events.dec()
                except Exception:
                    pass

        background_tasks.add_task(_process)

    return JSONResponse(
        {"status": "accepted", "event_ids": event_ids, "priority": priority},
        status_code=202,
    )


@router.post("/alert")
async def webhook_alert(
    payload: AlertManagerPayload,
    request: Request,
    background_tasks: BackgroundTasks,
) -> JSONResponse:
    """Main AlertManager webhook receiver."""
    return await _handle_alerts(payload, request, background_tasks, priority="normal")


@router.post("/critical")
async def webhook_critical(
    payload: AlertManagerPayload,
    request: Request,
    background_tasks: BackgroundTasks,
) -> JSONResponse:
    """High-priority receiver for critical alerts."""
    return await _handle_alerts(payload, request, background_tasks, priority="critical")


@router.post("/slo")
async def webhook_slo(
    payload: AlertManagerPayload,
    request: Request,
    background_tasks: BackgroundTasks,
) -> JSONResponse:
    """SLO breach receiver."""
    return await _handle_alerts(payload, request, background_tasks, priority="slo")
