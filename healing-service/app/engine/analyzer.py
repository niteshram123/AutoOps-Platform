from __future__ import annotations

import json
import logging

from app.models.alert import Alert
from app.models.healing_event import HealingRecommendation

logger = logging.getLogger("healing-service")

# ── Prometheus metrics (imported lazily to avoid circular imports) ────────────
_ai_calls_counter = None
_ai_errors_counter = None


def _get_counters():
    global _ai_calls_counter, _ai_errors_counter
    if _ai_calls_counter is None:
        from app.routes.metrics import healing_ai_calls_total, healing_ai_errors_total
        _ai_calls_counter = healing_ai_calls_total
        _ai_errors_counter = healing_ai_errors_total
    return _ai_calls_counter, _ai_errors_counter


# ── Rule-based fallback ───────────────────────────────────────────────────────
_FALLBACK_RULES: dict[str, dict] = {
    "HighErrorRate": {
        "action": "rollback",
        "confidence": 0.80,
        "safe_to_automate": True,
        "urgency": "immediate",
        "estimated_recovery_time_seconds": 60,
        "reasoning": "High error rate typically caused by a bad deployment. Rolling back to previous revision.",
    },
    "ServiceDown": {
        "action": "restart",
        "confidence": 0.90,
        "safe_to_automate": True,
        "urgency": "immediate",
        "estimated_recovery_time_seconds": 30,
        "reasoning": "Service is unreachable. Restarting pods to restore availability.",
    },
    "HighLatency": {
        "action": "scale_up",
        "confidence": 0.70,
        "safe_to_automate": True,
        "urgency": "within_5min",
        "estimated_recovery_time_seconds": 45,
        "reasoning": "High latency suggests resource contention. Scaling up to distribute load.",
    },
    "PodCrashLooping": {
        "action": "restart",
        "confidence": 0.85,
        "safe_to_automate": True,
        "urgency": "immediate",
        "estimated_recovery_time_seconds": 60,
        "reasoning": "Pod is crash-looping. Triggering rolling restart to recover.",
    },
    "HPAMaxReplicas": {
        "action": "escalate",
        "confidence": 1.0,
        "safe_to_automate": False,
        "urgency": "within_30min",
        "estimated_recovery_time_seconds": 0,
        "reasoning": "HPA at max replicas — manual capacity planning required.",
    },
    "SLOBreach": {
        "action": "rollback",
        "confidence": 0.75,
        "safe_to_automate": True,
        "urgency": "immediate",
        "estimated_recovery_time_seconds": 90,
        "reasoning": "SLO breach detected. Rolling back to restore availability above target.",
    },
    "ErrorBudgetBurnRateHigh": {
        "action": "rollback",
        "confidence": 0.75,
        "safe_to_automate": True,
        "urgency": "immediate",
        "estimated_recovery_time_seconds": 90,
        "reasoning": "Error budget burning fast. Rollback to stop the bleeding.",
    },
}

_DEFAULT_RULE = {
    "action": "wait",
    "confidence": 0.50,
    "safe_to_automate": False,
    "urgency": "within_30min",
    "estimated_recovery_time_seconds": 120,
    "reasoning": "Unknown alert type. Monitoring for 2 minutes before escalating.",
}


class AlertAnalyzer:
    def __init__(self, ai_enabled: bool = True, anthropic_api_key: str = "") -> None:
        self.ai_enabled = ai_enabled and bool(anthropic_api_key)
        self._client = None

        if self.ai_enabled:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=anthropic_api_key)
                logger.info("AI analyzer initialized with Claude API")
            except Exception as exc:
                logger.warning(
                    "anthropic client init failed — using rule-based fallback",
                    extra={"error": str(exc)},
                )
                self.ai_enabled = False

    async def analyze(self, alert: Alert) -> HealingRecommendation:
        """Analyze alert and return a healing recommendation.

        Tries Claude API first; falls back to rule-based if unavailable.
        """
        if self.ai_enabled and self._client:
            try:
                return await self._ai_analyze(alert)
            except Exception as exc:
                logger.warning(
                    "AI analysis failed — using rule-based fallback",
                    extra={"error": str(exc)},
                )
                try:
                    _, errors = _get_counters()
                    errors.inc()
                except Exception:
                    pass

        return self._rule_based_fallback(alert)

    async def _ai_analyze(self, alert: Alert) -> HealingRecommendation:
        import asyncio

        try:
            calls, _ = _get_counters()
            calls.inc()
        except Exception:
            pass

        system_prompt = (
            "You are an expert DevOps SRE AI assistant embedded in the AutoOps "
            "self-healing platform. Analyze Kubernetes/microservice alerts and "
            "recommend specific, safe healing actions.\n\n"
            "Respond with ONLY a valid JSON object (no markdown, no explanation):\n"
            '{"action":"<rollback|restart|scale_up|canary_rollback|wait|escalate>",'
            '"target_service":"<service name>",'
            '"target_namespace":"<kubernetes namespace>",'
            '"confidence":<0.0-1.0>,'
            '"reasoning":"<brief explanation>",'
            '"urgency":"<immediate|within_5min|within_30min>",'
            '"estimated_recovery_time_seconds":<int>,'
            '"safe_to_automate":<true|false>,'
            '"escalate_if_fails":<true|false>}\n\n'
            "Only set safe_to_automate=true for actions with confidence > 0.75."
        )

        user_prompt = (
            f"Alert received at {alert.starts_at}:\n"
            f"Alert Name: {alert.labels.alertname}\n"
            f"Severity: {alert.labels.severity}\n"
            f"Service: {alert.labels.get('service', 'unknown')}\n"
            f"Namespace: {alert.labels.get('namespace', 'autoops-production')}\n"
            f"Summary: {alert.annotations.summary}\n"
            f"Description: {alert.annotations.description}\n\n"
            f"Context:\n"
            f"- Firing for: {alert.firing_duration_minutes} minutes\n"
            f"- Previous healing actions today: {alert.previous_healing_count}\n\n"
            "Recommend the best healing action."
        )

        # Run synchronous Anthropic client in thread pool
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=512,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ),
        )

        raw_text = response.content[0].text.strip()
        data = json.loads(raw_text)

        rec = HealingRecommendation(
            action=data.get("action", "wait"),
            target_service=data.get("target_service", alert.labels.get("service", "unknown")),
            target_namespace=data.get("target_namespace", alert.labels.get("namespace", "autoops-production")),
            confidence=float(data.get("confidence", 0.5)),
            reasoning=data.get("reasoning", ""),
            urgency=data.get("urgency", "within_5min"),
            estimated_recovery_time_seconds=int(data.get("estimated_recovery_time_seconds", 30)),
            safe_to_automate=bool(data.get("safe_to_automate", False)),
            escalate_if_fails=bool(data.get("escalate_if_fails", True)),
        )

        logger.info(
            "AI recommendation",
            extra={
                "alert": alert.labels.alertname,
                "action": rec.action,
                "confidence": rec.confidence,
                "safe": rec.safe_to_automate,
            },
        )
        return rec

    def _rule_based_fallback(self, alert: Alert) -> HealingRecommendation:
        rule = _FALLBACK_RULES.get(alert.labels.alertname, _DEFAULT_RULE)
        rec = HealingRecommendation(
            action=rule["action"],
            target_service=alert.labels.get("service", "unknown"),
            target_namespace=alert.labels.get("namespace", "autoops-production"),
            confidence=rule["confidence"],
            reasoning=rule["reasoning"],
            urgency=rule["urgency"],
            estimated_recovery_time_seconds=rule["estimated_recovery_time_seconds"],
            safe_to_automate=rule["safe_to_automate"],
            escalate_if_fails=True,
        )
        logger.info(
            "rule-based recommendation",
            extra={
                "alert": alert.labels.alertname,
                "action": rec.action,
                "confidence": rec.confidence,
            },
        )
        return rec
