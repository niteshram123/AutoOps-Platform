"""Tests for individual healing actions."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.engine.actions.restart import RestartAction
from app.engine.actions.scale import ScaleAction
from app.models.alert import Alert, AlertAnnotations, AlertLabels
from app.models.healing_event import HealingRecommendation


def _make_rec(action: str = "restart", service: str = "api-gateway") -> HealingRecommendation:
    return HealingRecommendation(
        action=action,
        target_service=service,
        target_namespace="autoops-production",
        confidence=0.9,
        safe_to_automate=True,
    )


def _make_alert() -> Alert:
    return Alert(
        status="firing",
        labels=AlertLabels(
            alertname="ServiceDown",
            severity="critical",
            service="api-gateway",
            namespace="autoops-production",
        ),
        annotations=AlertAnnotations(summary="Down", description="Down"),
        startsAt="2024-01-01T00:00:00Z",
    )


@pytest.mark.asyncio
async def test_restart_action_success():
    k8s = AsyncMock()
    k8s.patch_deployment.return_value = True
    k8s.wait_for_rollout.return_value = True

    action = RestartAction(k8s)
    result = await action.execute(_make_rec("restart"), _make_alert())

    assert result.success is True
    assert "api-gateway" in result.message
    k8s.patch_deployment.assert_called_once()


@pytest.mark.asyncio
async def test_restart_action_k8s_unavailable():
    k8s = AsyncMock()
    k8s.patch_deployment.return_value = False

    action = RestartAction(k8s)
    result = await action.execute(_make_rec("restart"), _make_alert())

    assert result.success is False
    assert "unavailable" in result.message.lower()


@pytest.mark.asyncio
async def test_scale_action_increases_replicas():
    k8s = AsyncMock()
    k8s.get_deployment_replicas.return_value = 2
    k8s.scale_deployment.return_value = True

    action = ScaleAction(k8s)
    result = await action.execute(_make_rec("scale_up"), _make_alert())

    assert result.success is True
    assert result.details["from_replicas"] == 2
    assert result.details["to_replicas"] == 4
    k8s.scale_deployment.assert_called_once_with(
        "autoops-production", "api-gateway", 4
    )


@pytest.mark.asyncio
async def test_scale_action_respects_safety_cap():
    k8s = AsyncMock()
    k8s.get_deployment_replicas.return_value = 10  # already at cap
    k8s.scale_deployment.return_value = True

    action = ScaleAction(k8s)
    result = await action.execute(_make_rec("scale_up"), _make_alert())

    assert result.success is False
    assert "safety cap" in result.message.lower()
    k8s.scale_deployment.assert_not_called()
