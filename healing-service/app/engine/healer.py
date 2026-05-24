from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

from app.engine.actions.canary import CanaryRollbackAction
from app.engine.actions.restart import RestartAction
from app.engine.actions.rollback import RollbackAction
from app.engine.actions.scale import ScaleAction
from app.engine.analyzer import AlertAnalyzer
from app.engine.verifier import HealingVerifier
from app.integrations.argocd import ArgoCDClient
from app.integrations.grafana import GrafanaClient
from app.integrations.kubernetes import KubernetesClient
from app.integrations.prometheus import PrometheusClient
from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingRecommendation, HealingStatus
from app.storage.audit_store import AuditStore

logger = logging.getLogger("healing-service")


class HealingEngine:
    def __init__(
        self,
        audit: AuditStore,
        analyzer: AlertAnalyzer,
        verifier: HealingVerifier,
        grafana: GrafanaClient,
        argocd: ArgoCDClient,
        k8s: KubernetesClient,
        cooldown_seconds: int = 300,
    ) -> None:
        self.audit = audit
        self.analyzer = analyzer
        self.verifier = verifier
        self.grafana = grafana
        self.cooldown_seconds = cooldown_seconds

        # Action handlers
        self._rollback = RollbackAction(argocd)
        self._restart = RestartAction(k8s)
        self._scale = ScaleAction(k8s)
        self._canary = CanaryRollbackAction(argocd)

        # Cooldown tracker: service → last heal timestamp
        self._last_healed: dict[str, float] = {}

    async def process_alert(self, alert: Alert, event_id: str) -> None:
        """Full healing workflow: Analyze → Decide → Act → Verify → Audit."""
        service = alert.labels.get("service", "unknown")

        # ── Cooldown check ────────────────────────────────────────
        last = self._last_healed.get(service, 0)
        if time.time() - last < self.cooldown_seconds:
            remaining = int(self.cooldown_seconds - (time.time() - last))
            logger.info(
                "healing skipped — cooldown active",
                extra={"service": service, "remaining_seconds": remaining},
            )
            await self.audit.update_event(
                event_id,
                status=HealingStatus.SKIPPED,
                message=f"Cooldown active — {remaining}s remaining",
            )
            return

        # ── Step 1: Analyze ───────────────────────────────────────
        await self.audit.update_event(event_id, status=HealingStatus.ANALYZING)
        try:
            recommendation = await self.analyzer.analyze(alert)
        except Exception as exc:
            logger.error("analysis failed", extra={"error": str(exc)})
            await self.audit.update_event(
                event_id,
                status=HealingStatus.FAILED,
                message=f"Analysis error: {exc}",
            )
            return

        await self.audit.update_event(event_id, recommendation=recommendation)

        # ── Step 2: Safety gate ───────────────────────────────────
        if not recommendation.safe_to_automate:
            msg = f"AI determined manual intervention required (confidence={recommendation.confidence:.2f})"
            logger.info("escalating alert", extra={"service": service, "reason": msg})
            await self.audit.update_event(
                event_id, status=HealingStatus.ESCALATED, message=msg
            )
            await self.grafana.add_annotation(
                text=f"⚠️ ESCALATED: {alert.labels.alertname} on {service} — {recommendation.reasoning}",
                tags=["healing", "escalated", service],
            )
            return

        if recommendation.confidence < 0.6:
            msg = f"Confidence too low: {recommendation.confidence:.2f}"
            await self.audit.update_event(
                event_id, status=HealingStatus.SKIPPED, message=msg
            )
            return

        # ── Step 3: Execute ───────────────────────────────────────
        await self.audit.update_event(event_id, status=HealingStatus.EXECUTING)
        action_result = await self._execute_action(recommendation, alert)
        await self.audit.update_event(event_id, action_result=action_result)

        if not action_result.success:
            await self.audit.update_event(
                event_id,
                status=HealingStatus.FAILED,
                message=action_result.message,
            )
            await self.grafana.add_annotation(
                text=f"❌ HEAL FAILED: {recommendation.action} on {service} — {action_result.message}",
                tags=["healing", "failed", service],
            )
            return

        # ── Step 4: Verify ────────────────────────────────────────
        await self.audit.update_event(event_id, status=HealingStatus.VERIFYING)
        wait_secs = min(recommendation.estimated_recovery_time_seconds, 60)
        logger.info(
            "waiting before verification",
            extra={"seconds": wait_secs, "service": service},
        )
        await asyncio.sleep(wait_secs)

        verified = await self.verifier.verify_healing(alert, recommendation)

        # ── Step 5: Final audit + Grafana annotation ──────────────
        final_status = HealingStatus.HEALED if verified else HealingStatus.FAILED
        await self.audit.update_event(
            event_id,
            status=final_status,
            verified=verified,
            message=action_result.message,
        )

        emoji = "✅" if verified else "❌"
        await self.grafana.add_annotation(
            text=(
                f"{emoji} AUTO-HEALED: {recommendation.action} on {service} | "
                f"{recommendation.reasoning}"
            ),
            tags=["healing", recommendation.action, final_status.value.lower(), service],
        )

        # ── Prometheus metrics ────────────────────────────────────
        try:
            from app.routes.metrics import healing_actions_total, healing_duration_seconds
            healing_actions_total.labels(
                action=recommendation.action,
                service=service,
                result=final_status.value.lower(),
            ).inc()
        except Exception:
            pass

        if verified:
            self._last_healed[service] = time.time()

        logger.info(
            "healing complete",
            extra={
                "event_id": event_id,
                "service": service,
                "action": recommendation.action,
                "status": final_status.value,
                "verified": verified,
            },
        )

    async def _execute_action(
        self, rec: HealingRecommendation, alert: Alert
    ) -> ActionResult:
        action_map = {
            "rollback": self._rollback.execute,
            "restart": self._restart.execute,
            "scale_up": self._scale.execute,
            "canary_rollback": self._canary.execute,
        }
        handler = action_map.get(rec.action)
        if handler is None:
            return ActionResult(
                success=True,
                message=f"Action '{rec.action}' is a no-op (wait/escalate)",
            )
        try:
            return await handler(rec, alert)
        except Exception as exc:
            logger.error(
                "action execution error",
                extra={"action": rec.action, "error": str(exc)},
            )
            return ActionResult(success=False, message=str(exc))
