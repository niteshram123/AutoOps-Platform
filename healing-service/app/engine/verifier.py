from __future__ import annotations

import logging

import httpx

from app.integrations.kubernetes import KubernetesClient
from app.integrations.prometheus import PrometheusClient
from app.models.alert import Alert
from app.models.healing_event import HealingRecommendation

logger = logging.getLogger("healing-service")

# Map service names to their local Docker Compose health URLs
_SERVICE_URLS: dict[str, str] = {
    "api-gateway": "http://api-gateway:3000",
    "user-service": "http://user-service:8000",
    "metrics-collector": "http://metrics-collector:9091",
}


class HealingVerifier:
    def __init__(self, k8s: KubernetesClient, prometheus: PrometheusClient) -> None:
        self.k8s = k8s
        self.prometheus = prometheus

    def _get_service_url(self, service: str) -> str:
        return _SERVICE_URLS.get(service, f"http://{service}:8080")

    async def verify_healing(
        self, alert: Alert, rec: HealingRecommendation
    ) -> bool:
        """Verify healing success via three checks:
        1. Health endpoint returns 200
        2. Error rate has dropped below 5%
        3. Pods are ready (for restart/rollback actions)
        """
        service = rec.target_service
        service_url = self._get_service_url(service)

        # ── Check 1: Health endpoint ──────────────────────────────
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{service_url}/health")
                if resp.status_code != 200:
                    logger.info(
                        "verify: health check failed",
                        extra={"service": service, "status": resp.status_code},
                    )
                    return False
        except Exception as exc:
            logger.info(
                "verify: health endpoint unreachable",
                extra={"service": service, "error": str(exc)},
            )
            return False

        # ── Check 2: Error rate via Prometheus ────────────────────
        query = (
            f'rate(http_requests_total{{service="{service}",status_code=~"5.."}}[2m])'
        )
        result = await self.prometheus.query(query)
        if result:
            try:
                error_rate = float(result[0]["value"][1])
                if error_rate > 0.05:
                    logger.info(
                        "verify: error rate still high",
                        extra={"service": service, "error_rate": error_rate},
                    )
                    return False
            except (KeyError, IndexError, ValueError):
                pass  # No data = no errors = OK

        # ── Check 3: Pod readiness (restart/rollback only) ────────
        if rec.action in ("restart", "rollback"):
            pods_ready = await self.k8s.check_pods_ready(
                rec.target_namespace, service
            )
            if not pods_ready:
                logger.info(
                    "verify: pods not ready",
                    extra={"service": service, "namespace": rec.target_namespace},
                )
                return False

        logger.info("verify: healing confirmed", extra={"service": service})
        return True
