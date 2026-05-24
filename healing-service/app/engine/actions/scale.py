from __future__ import annotations

import logging

from app.integrations.kubernetes import KubernetesClient
from app.models.alert import Alert
from app.models.healing_event import ActionResult, HealingRecommendation

logger = logging.getLogger("healing-service")

MAX_REPLICAS_SAFETY_CAP = 10


class ScaleAction:
    def __init__(self, k8s: KubernetesClient) -> None:
        self.k8s = k8s

    async def execute(
        self, rec: HealingRecommendation, alert: Alert
    ) -> ActionResult:
        """Scale up deployment by 2 replicas (capped at MAX_REPLICAS_SAFETY_CAP)."""
        deployment_name = rec.target_service
        namespace = rec.target_namespace or alert.labels.get(
            "namespace", "autoops-production"
        )

        current = await self.k8s.get_deployment_replicas(namespace, deployment_name)
        desired = min(current + 2, MAX_REPLICAS_SAFETY_CAP)

        if desired == current:
            return ActionResult(
                success=False,
                message=f"{deployment_name} already at safety cap ({MAX_REPLICAS_SAFETY_CAP} replicas)",
            )

        success = await self.k8s.scale_deployment(namespace, deployment_name, desired)
        if not success:
            return ActionResult(
                success=False,
                message=f"Failed to scale {deployment_name} (K8s unavailable in local mode)",
            )

        msg = f"Scaled {deployment_name} from {current} to {desired} replicas"
        logger.info(
            "scale executed",
            extra={"deployment": deployment_name, "from": current, "to": desired},
        )
        return ActionResult(
            success=True,
            message=msg,
            details={"from_replicas": current, "to_replicas": desired},
        )
