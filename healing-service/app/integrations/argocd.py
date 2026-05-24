from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("healing-service")


class ArgoCDClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"}

    async def get_application(self, app_name: str) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/applications/{app_name}",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_app_history(self, app_name: str) -> list:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/v1/applications/{app_name}/revisions",
                headers=self.headers,
            )
            return resp.json().get("revisions", [])

    async def rollback(self, app_name: str, revision: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/applications/{app_name}/rollback",
                headers=self.headers,
                json={"revision": revision, "prune": False},
            )
            resp.raise_for_status()
            return resp.json()

    async def sync(self, app_name: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/api/v1/applications/{app_name}/sync",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.base_url}/api/v1/applications",
                    headers=self.headers,
                )
                return resp.status_code in (200, 401)  # 401 = reachable but bad token
        except Exception:
            return False
