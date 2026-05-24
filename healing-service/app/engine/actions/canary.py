from __future__ import annotations

import logging

from app.integrations.argocd import ArgoCDClient
from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingRecommendation

logger = logging.getLogger("healing-service")


class CanaryRollbackAction:
    def __init__(self, argocd: ArgoCDClient) -> None:
        self.argocd = argocd

    async def execute(
        self, rec: HealingRecommendation, alert: Alert
    ) -> ActionResult:
        """Roll back a canary deployment to the stable version via ArgoCD sync."""
        namespace = rec.target_namespace or alert.labels.get(
            "namespace", "autoops-production"
        )
        app_name = f"autoops-{namespace.split('-')[-1]}"

        try:
            # Sync to HEAD of the stable branch (ArgoCD will revert canary weights)
            await self.argocd.sync(app_name)
            msg = f"Canary rollback triggered for {app_name} via ArgoCD sync"
            logger.info("canary rollback executed", extra={"app": app_name})
            return ActionResult(
                success=True,
                message=msg,
                details={"app": app_name, "action": "sync_to_stable"},
            )
        except Exception as exc:
            logger.error("canary rollback failed", extra={"error": str(exc)})
            return ActionResult(
                success=False,
                message=f"Canary rollback failed: {exc}",
            )
