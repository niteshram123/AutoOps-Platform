"""Tests for the AlertManager webhook receiver."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.config.settings import Settings
from app.storage.audit_store import AuditStore
from app.engine.healer import HealingEngine
from app.models.healing_event import HealingEvent, HealingStatus


FIRING_PAYLOAD = {
    "version": "4",
    "receiver": "autoops-webhook",
    "status": "firing",
    "alerts": [
        {
            "status": "firing",
            "labels": {
                "alertname": "HighErrorRate",
                "severity": "critical",
                "service": "api-gateway",
                "namespace": "autoops-production",
            },
            "annotations": {
                "summary": "High error rate on api-gateway",
                "description": "Error rate is 8.3% over last 5 minutes",
            },
            "startsAt": "2024-01-01T00:00:00Z",
            "generatorURL": "",
        }
    ],
    "groupLabels": {},
    "commonLabels": {},
    "externalURL": "",
}

RESOLVED_PAYLOAD = {**FIRING_PAYLOAD, "status": "resolved",
                    "alerts": [{**FIRING_PAYLOAD["alerts"][0], "status": "resolved"}]}


@pytest.fixture
def mock_app():
    """Set up app state with mocks."""
    mock_settings = Settings(WEBHOOK_SECRET="test-secret", ANTHROPIC_API_KEY="")
    mock_audit = AsyncMock(spec=AuditStore)
    mock_event = HealingEvent(
        id="test-event-id",
        alert_name="HighErrorRate",
        severity="critical",
        service="api-gateway",
        namespace="autoops-production",
        status=HealingStatus.RECEIVED,
    )
    mock_audit.create_event.return_value = mock_event
    mock_audit.list_events.return_value = []

    mock_engine = AsyncMock(spec=HealingEngine)

    app.state.settings = mock_settings
    app.state.audit_store = mock_audit
    app.state.healing_engine = mock_engine
    return app


def test_webhook_accepts_firing_alert(mock_app):
    client = TestClient(mock_app, raise_server_exceptions=False)
    resp = client.post(
        "/webhook/alert",
        json=FIRING_PAYLOAD,
        headers={"Authorization": "Bearer test-secret"},
    )
    assert resp.status_code == 202
    body = resp.json()
    assert body["status"] == "accepted"
    assert len(body["event_ids"]) == 1


def test_webhook_ignores_resolved_alert(mock_app):
    client = TestClient(mock_app, raise_server_exceptions=False)
    resp = client.post(
        "/webhook/alert",
        json=RESOLVED_PAYLOAD,
        headers={"Authorization": "Bearer test-secret"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_webhook_rejects_invalid_token(mock_app):
    client = TestClient(mock_app, raise_server_exceptions=False)
    resp = client.post(
        "/webhook/alert",
        json=FIRING_PAYLOAD,
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert resp.status_code == 401


def test_webhook_critical_endpoint(mock_app):
    client = TestClient(mock_app, raise_server_exceptions=False)
    resp = client.post(
        "/webhook/critical",
        json=FIRING_PAYLOAD,
        headers={"Authorization": "Bearer test-secret"},
    )
    assert resp.status_code == 202
    assert resp.json()["priority"] == "critical"


def test_health_endpoint(mock_app):
    client = TestClient(mock_app, raise_server_exceptions=False)
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"
