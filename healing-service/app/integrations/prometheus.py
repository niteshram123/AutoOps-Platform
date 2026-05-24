from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("healing-service")


class PrometheusClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def query(self, promql: str) -> list[dict]:
        """Execute an instant PromQL query and return the result list."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self.base_url}/api/v1/query",
                    params={"query": promql},
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("data", {}).get("result", [])
        except Exception as exc:
            logger.warning(
                "prometheus query failed",
                extra={"query": promql[:80], "error": str(exc)},
            )
            return []

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/-/healthy")
                return resp.status_code == 200
        except Exception:
            return False
