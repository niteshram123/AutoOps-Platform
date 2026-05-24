from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/events")
async def list_events(
    request: Request,
    limit: int = Query(default=50, ge=1, le=500),
    service: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
) -> JSONResponse:
    audit: "AuditStore" = request.app.state.audit_store
    events = await audit.list_events(limit=limit, service=service, status=status)
    return JSONResponse([e.model_dump(mode="json") for e in events])


@router.get("/events/export")
async def export_events(request: Request) -> JSONResponse:
    audit: "AuditStore" = request.app.state.audit_store
    events = await audit.list_events(limit=10000)
    data = [e.model_dump(mode="json") for e in events]
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": "attachment; filename=healing-audit-export.json"},
    )


@router.get("/events/{event_id}")
async def get_event(event_id: str, request: Request) -> JSONResponse:
    audit: "AuditStore" = request.app.state.audit_store
    event = await audit.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return JSONResponse(event.model_dump(mode="json"))


@router.get("/summary")
async def get_summary(request: Request) -> JSONResponse:
    audit: "AuditStore" = request.app.state.audit_store
    summary = await audit.get_summary()
    return JSONResponse(summary)
