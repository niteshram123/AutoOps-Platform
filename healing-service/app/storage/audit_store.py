from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import aiofiles
from filelock import FileLock

from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingEvent, HealingRecommendation, HealingStatus

logger = logging.getLogger("healing-service")


class AuditStore:
    def __init__(self, storage_path: str) -> None:
        self.storage_path = storage_path
        self.lock_path = storage_path + ".lock"
        self._events: dict[str, HealingEvent] = {}
        os.makedirs(os.path.dirname(storage_path), exist_ok=True)

    async def load(self) -> None:
        """Load events from disk on startup."""
        if not os.path.exists(self.storage_path):
            return
        try:
            async with aiofiles.open(self.storage_path, "r") as f:
                raw = await f.read()
            data = json.loads(raw)
            for item in data:
                event = HealingEvent.model_validate(item)
                self._events[event.id] = event
            logger.info("audit store loaded", extra={"events": len(self._events)})
        except Exception as exc:
            logger.warning("could not load audit store", extra={"error": str(exc)})

    async def _persist(self) -> None:
        """Write all events to disk (thread-safe via filelock)."""
        with FileLock(self.lock_path):
            data = [e.model_dump(mode="json") for e in self._events.values()]
            async with aiofiles.open(self.storage_path, "w") as f:
                await f.write(json.dumps(data, indent=2, default=str))

    async def create_event(self, alert: Alert) -> HealingEvent:
        event = HealingEvent(
            alert_name=alert.labels.alertname,
            severity=alert.labels.severity,
            service=alert.labels.get("service", "unknown"),
            namespace=alert.labels.get("namespace", "autoops-production"),
        )
        event.add_transition(HealingStatus.RECEIVED)
        self._events[event.id] = event
        await self._persist()
        return event

    async def update_event(
        self,
        event_id: str,
        status: Optional[HealingStatus] = None,
        recommendation: Optional[HealingRecommendation] = None,
        action_result: Optional[ActionResult] = None,
        verified: Optional[bool] = None,
        message: str = "",
    ) -> HealingEvent:
        event = self._events[event_id]
        if status:
            event.add_transition(status, message)
        if recommendation is not None:
            event.recommendation = recommendation
        if action_result is not None:
            event.action_result = action_result
        if verified is not None:
            event.verified = verified
        event.updated_at = datetime.now(timezone.utc)
        await self._persist()
        return event

    async def get_event(self, event_id: str) -> Optional[HealingEvent]:
        return self._events.get(event_id)

    async def list_events(
        self,
        limit: int = 50,
        service: Optional[str] = None,
        status: Optional[str] = None,
    ) -> list[HealingEvent]:
        events = list(self._events.values())
        if service:
            events = [e for e in events if e.service == service]
        if status:
            events = [e for e in events if e.status.value == status.upper()]
        events.sort(key=lambda e: e.created_at, reverse=True)
        return events[:limit]

    async def get_summary(self) -> dict:
        events = list(self._events.values())
        by_status: dict[str, int] = {}
        by_action: dict[str, int] = {}
        by_service: dict[str, int] = {}
        healed = 0

        for e in events:
            by_status[e.status.value] = by_status.get(e.status.value, 0) + 1
            by_service[e.service] = by_service.get(e.service, 0) + 1
            if e.recommendation:
                act = e.recommendation.action
                by_action[act] = by_action.get(act, 0) + 1
            if e.status == HealingStatus.HEALED:
                healed += 1

        total = len(events)
        success_rate = round(healed / total * 100, 1) if total else 0.0

        return {
            "total_events": total,
            "by_status": by_status,
            "by_action": by_action,
            "by_service": by_service,
            "success_rate": success_rate,
        }
