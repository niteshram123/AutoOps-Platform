from __future__ import annotations

import logging

from app.integrations.argocd import ArgoCDClient
from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingRecommendation

logger = logging.getLogger("healing-service")


class RollbackAction:
    def __init__(self, argocd: ArgoCDClient) -> None:
        self.argocd = argocd

    async def execute(
        self, rec: HealingRecommendation, alert: Alert
    ) -> ActionResult:
        """Trigger ArgoCD rollback to the previous healthy revision."""
        # Derive ArgoCD app name from namespace, e.g. autoops-production → autoops-production
        namespace = rec.target_namespace or alert.labels.get("namespace", "autoops-production")
        app_name = f"autoops-{namespace.split('-')[-1]}"

        try:
            app = await self.argocd.get_application(app_name)
            current_revision = app.get("status", {}).get("sync", {}).get("revision", "unknown")

            history = await self.argocd.get_app_history(app_name)
            if len(history) < 2:
                return ActionResult(
                    success=False,
                    message=f"No previous revision available for {app_name}",
                )

            previous_revision = history[-2].get("revision", "")
            if not previous_revision:
                return ActionResult(
                    success=False,
                    message="Could not determine previous revision",
                )

            await self.argocd.rollback(app_name, revision=previous_revision)

            msg = (
                f"Rolled back {app_name} from "
                f"{current_revision[:7]} to {previous_revision[:7]}"
            )
            logger.info("rollback executed", extra={"app": app_name, "to": previous_revision[:7]})
            return ActionResult(
                success=True,
                message=msg,
                details={"from": current_revision, "to": previous_revision},
            )

        except Exception as exc:
            logger.error("rollback failed", extra={"error": str(exc), "app": app_name})
            return ActionResult(
                success=False,
                message=f"ArgoCD rollback failed: {exc}",
            )
