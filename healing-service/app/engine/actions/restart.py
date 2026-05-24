from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.integrations.kubernetes import KubernetesClient
from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingRecommendation

logger = logging.getLogger("healing-service")


class RestartAction:
    def __init__(self, k8s: KubernetesClient) -> None:
        self.k8s = k8s

    async def execute(
        self, rec: HealingRecommendation, alert: Alert
    ) -> ActionResult:
        """Restart pods via rolling restart annotation.

        Equivalent to: kubectl rollout restart deployment/<name>
        """
        deployment_name = rec.target_service
        namespace = rec.target_namespace or alert.labels.get(
            "namespace", "autoops-production"
        )

        patch = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": datetime.now(
                                timezone.utc
                            ).isoformat()
                        }
                    }
                }
            }
        }

        success = await self.k8s.patch_deployment(namespace, deployment_name, patch)
        if not success:
            return ActionResult(
                success=False,
                message=f"Failed to patch deployment {deployment_name} (K8s unavailable in local mode)",
            )

        # Wait for rollout to complete (non-blocking — best effort)
        await self.k8s.wait_for_rollout(namespace, deployment_name, timeout=120)

        msg = f"Restarted deployment {deployment_name} in {namespace}"
        logger.info("restart executed", extra={"deployment": deployment_name, "namespace": namespace})
        return ActionResult(
            success=True,
            message=msg,
            details={"namespace": namespace, "deployment": deployment_name},
        )
