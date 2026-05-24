from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class AlertLabels(BaseModel):
    alertname: str = "Unknown"
    severity: str = "unknown"
    service: str = "unknown"
    namespace: str = "autoops-production"

    # Allow arbitrary extra labels (job, pod, etc.)
    model_config = {"extra": "allow"}

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, None) or self.model_extra.get(key, default)


class AlertAnnotations(BaseModel):
    summary: str = ""
    description: str = ""
    runbook: str = ""

    model_config = {"extra": "allow"}


class Alert(BaseModel):
    status: str = "firing"
    labels: AlertLabels = Field(default_factory=AlertLabels)
    annotations: AlertAnnotations = Field(default_factory=AlertAnnotations)
    startsAt: str = ""
    endsAt: str = ""
    generatorURL: str = ""

    # Computed fields (populated by webhook handler)
    firing_duration_minutes: float = 0.0
    previous_healing_count: int = 0

    @property
    def starts_at(self) -> str:
        return self.startsAt

    def compute_firing_duration(self) -> None:
        if self.startsAt:
            try:
                started = datetime.fromisoformat(
                    self.startsAt.replace("Z", "+00:00")
                )
                delta = datetime.now(timezone.utc) - started
                self.firing_duration_minutes = round(delta.total_seconds() / 60, 1)
            except Exception:
                self.firing_duration_minutes = 0.0


class AlertManagerPayload(BaseModel):
    version: str = "4"
    receiver: str = ""
    status: str = "firing"
    alerts: list[Alert] = Field(default_factory=list)
    groupLabels: dict[str, str] = Field(default_factory=dict)
    commonLabels: dict[str, str] = Field(default_factory=dict)
    commonAnnotations: dict[str, str] = Field(default_factory=dict)
    externalURL: str = ""
