"""Tests for the healing engine orchestration."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.engine.healer import HealingEngine
from app.engine.analyzer import AlertAnalyzer
from app.engine.verifier import HealingVerifier
from app.models.alert import Alert, AlertAnnotations, AlertLabels
from app.models.healing_event import (
    ActionResult,
    HealingEvent,
    HealingRecommendation,
    HealingStatus,
)
from app.storage.audit_store import AuditStore


def _make_alert(alertname: str = "HighErrorRate") -> Alert:
    return Alert(
        status="firing",
        labels=AlertLabels(
            alertname=alertname,
            severity="critical",
            service="api-gateway",
            namespace="autoops-production",
        ),
        annotations=AlertAnnotations(summary="Test", description="Test"),
        startsAt="2024-01-01T00:00:00Z",
    )


def _make_engine(
    recommendation: HealingRecommendation,
    action_success: bool = True,
    verified: bool = True,
) -> HealingEngine:
    audit = AsyncMock(spec=AuditStore)
    audit.update_event.return_value = MagicMock()

    analyzer = AsyncMock(spec=AlertAnalyzer)
    analyzer.analyze.return_value = recommendation

    verifier = AsyncMock(spec=HealingVerifier)
    verifier.verify_healing.return_value = verified

    grafana = AsyncMock()
    argocd = AsyncMock()
    k8s = AsyncMock()

    engine = HealingEngine(
        audit=audit,
        analyzer=analyzer,
        verifier=verifier,
        grafana=grafana,
        argocd=argocd,
        k8s=k8s,
        cooldown_seconds=0,  # disable cooldown for tests
    )

    # Mock action handlers
    result = ActionResult(success=action_success, message="test action")
    engine._rollback = AsyncMock()
    engine._rollback.execute = AsyncMock(return_value=result)
    engine._restart = AsyncMock()
    engine._restart.execute = AsyncMock(return_value=result)
    engine._scale = AsyncMock()
    engine._scale.execute = AsyncMock(return_value=result)

    return engine


@pytest.mark.asyncio
async def test_healer_executes_safe_action():
    rec = HealingRecommendation(
        action="restart",
        target_service="api-gateway",
        target_namespace="autoops-production",
        confidence=0.9,
        safe_to_automate=True,
        estimated_recovery_time_seconds=0,
    )
    engine = _make_engine(rec, action_success=True, verified=True)
    await engine.process_alert(_make_alert(), "test-event-id")

    engine._restart.execute.assert_called_once()
    engine.audit.update_event.assert_called()


@pytest.mark.asyncio
async def test_healer_escalates_unsafe_action():
    rec = HealingRecommendation(
        action="escalate",
        target_service="api-gateway",
        confidence=1.0,
        safe_to_automate=False,
    )
    engine = _make_engine(rec)
    await engine.process_alert(_make_alert(), "test-event-id")

    # Should have called grafana annotation for escalation
    engine.grafana.add_annotation.assert_called_once()
    # Should NOT have executed any action
    engine._restart.execute.assert_not_called()


@pytest.mark.asyncio
async def test_healer_skips_low_confidence():
    rec = HealingRecommendation(
        action="rollback",
        target_service="api-gateway",
        confidence=0.4,
        safe_to_automate=True,
    )
    engine = _make_engine(rec)
    await engine.process_alert(_make_alert(), "test-event-id")
    engine._rollback.execute.assert_not_called()


@pytest.mark.asyncio
async def test_healer_marks_failed_when_verification_fails():
    rec = HealingRecommendation(
        action="restart",
        target_service="api-gateway",
        confidence=0.9,
        safe_to_automate=True,
        estimated_recovery_time_seconds=0,
    )
    engine = _make_engine(rec, action_success=True, verified=False)
    await engine.process_alert(_make_alert(), "test-event-id")

    # Last update_event call should have FAILED status
    calls = engine.audit.update_event.call_args_list
    statuses = [
        c.kwargs.get("status") or (c.args[1] if len(c.args) > 1 else None)
        for c in calls
    ]
    assert HealingStatus.FAILED in statuses
