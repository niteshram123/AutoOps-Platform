from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger("healing-service")


class GrafanaClient:
    def __init__(self, base_url: str, username: str, password: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password

    async def add_annotation(
        self,
        text: str,
        tags: list[str],
        time_ms: int | None = None,
    ) -> dict:
        """Add a time-series annotation visible on all Grafana dashboards."""
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        payload = {
            "text": text,
            "tags": tags,
            "time": time_ms or now_ms,
            "timeEnd": now_ms + 1000,
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{self.base_url}/api/annotations",
                    json=payload,
                    auth=(self.username, self.password),
                )
                resp.raise_for_status()
                logger.info(
                    "grafana annotation added",
                    extra={"text": text[:80], "tags": tags},
                )
                return resp.json()
        except Exception as exc:
            logger.warning(
                "grafana annotation failed",
                extra={"error": str(exc)},
            )
            return {}

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/api/health",
                    auth=(self.username, self.password),
                )
                return resp.status_code == 200
        except Exception:
            return False
