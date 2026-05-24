"""Tests for the alert analyzer (rule-based fallback)."""
from __future__ import annotations

import pytest

from app.engine.analyzer import AlertAnalyzer
from app.models.alert import Alert, AlertAnnotations, AlertLabels


def _make_alert(alertname: str, service: str = "api-gateway") -> Alert:
    return Alert(
        status="firing",
        labels=AlertLabels(
            alertname=alertname,
            severity="critical",
            service=service,
            namespace="autoops-production",
        ),
        annotations=AlertAnnotations(
            summary=f"Test alert: {alertname}",
            description="Test description",
        ),
        startsAt="2024-01-01T00:00:00Z",
    )


@pytest.mark.asyncio
async def test_rule_based_high_error_rate():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("HighErrorRate")
    rec = await analyzer.analyze(alert)
    assert rec.action == "rollback"
    assert rec.confidence >= 0.75
    assert rec.safe_to_automate is True


@pytest.mark.asyncio
async def test_rule_based_service_down():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("ServiceDown")
    rec = await analyzer.analyze(alert)
    assert rec.action == "restart"
    assert rec.safe_to_automate is True


@pytest.mark.asyncio
async def test_rule_based_high_latency():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("HighLatency")
    rec = await analyzer.analyze(alert)
    assert rec.action == "scale_up"


@pytest.mark.asyncio
async def test_rule_based_hpa_max_replicas():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("HPAMaxReplicas")
    rec = await analyzer.analyze(alert)
    assert rec.action == "escalate"
    assert rec.safe_to_automate is False


@pytest.mark.asyncio
async def test_rule_based_unknown_alert():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("SomeUnknownAlert")
    rec = await analyzer.analyze(alert)
    assert rec.action == "wait"
    assert rec.safe_to_automate is False


@pytest.mark.asyncio
async def test_target_service_populated():
    analyzer = AlertAnalyzer(ai_enabled=False)
    alert = _make_alert("HighErrorRate", service="user-service")
    rec = await analyzer.analyze(alert)
    assert rec.target_service == "user-service"
