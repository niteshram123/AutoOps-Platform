from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class HealingStatus(str, Enum):
    RECEIVED = "RECEIVED"
    ANALYZING = "ANALYZING"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    HEALED = "HEALED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"
    SKIPPED = "SKIPPED"


class HealingRecommendation(BaseModel):
    action: str = "wait"
    target_service: str = "unknown"
    target_namespace: str = "autoops-production"
    confidence: float = 0.5
    reasoning: str = ""
    urgency: str = "within_5min"
    estimated_recovery_time_seconds: int = 30
    safe_to_automate: bool = False
    escalate_if_fails: bool = True


class ActionResult(BaseModel):
    success: bool = False
    message: str = ""
    details: dict[str, Any] = Field(default_factory=dict)


class StatusTransition(BaseModel):
    status: HealingStatus
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = ""


class HealingEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    alert_name: str
    severity: str
    service: str
    namespace: str
    status: HealingStatus = HealingStatus.RECEIVED
    recommendation: Optional[HealingRecommendation] = None
    action_result: Optional[ActionResult] = None
    verified: Optional[bool] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status_history: list[StatusTransition] = Field(default_factory=list)

    def add_transition(self, status: HealingStatus, message: str = "") -> None:
        self.status = status
        self.updated_at = datetime.now(timezone.utc)
        self.status_history.append(
            StatusTransition(status=status, message=message)
        )
