from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("healing-service")

# kubernetes-python is imported lazily so the service starts even without
# a cluster configured (local Docker Compose mode).
_k8s_available = False
try:
    from kubernetes import client as k8s_client, config as k8s_config
    _k8s_available = True
except ImportError:
    pass


class KubernetesClient:
    def __init__(self, in_cluster: bool = False) -> None:
        self.in_cluster = in_cluster
        self._loaded = False

    def _load_config(self) -> None:
        if self._loaded or not _k8s_available:
            return
        try:
            if self.in_cluster:
                k8s_config.load_incluster_config()
            else:
                k8s_config.load_kube_config()
            self._loaded = True
        except Exception as exc:
            logger.warning("kubernetes config not available", extra={"error": str(exc)})

    async def patch_deployment(
        self, namespace: str, name: str, patch: dict
    ) -> bool:
        """Patch a deployment (e.g. trigger rolling restart)."""
        self._load_config()
        if not self._loaded:
            logger.warning("k8s not available — skipping patch_deployment")
            return False
        try:
            apps_v1 = k8s_client.AppsV1Api()
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps_v1.patch_namespaced_deployment(name, namespace, patch),
            )
            logger.info(
                "deployment patched",
                extra={"namespace": namespace, "deployment": name},
            )
            return True
        except Exception as exc:
            logger.error(
                "patch_deployment failed",
                extra={"error": str(exc), "deployment": name},
            )
            return False

    async def scale_deployment(
        self, namespace: str, name: str, replicas: int
    ) -> bool:
        self._load_config()
        if not self._loaded:
            logger.warning("k8s not available — skipping scale_deployment")
            return False
        try:
            apps_v1 = k8s_client.AppsV1Api()
            patch = {"spec": {"replicas": replicas}}
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps_v1.patch_namespaced_deployment(name, namespace, patch),
            )
            logger.info(
                "deployment scaled",
                extra={"namespace": namespace, "deployment": name, "replicas": replicas},
            )
            return True
        except Exception as exc:
            logger.error("scale_deployment failed", extra={"error": str(exc)})
            return False

    async def get_deployment_replicas(self, namespace: str, name: str) -> int:
        self._load_config()
        if not self._loaded:
            return 1
        try:
            apps_v1 = k8s_client.AppsV1Api()
            dep = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: apps_v1.read_namespaced_deployment(name, namespace),
            )
            return dep.spec.replicas or 1
        except Exception:
            return 1

    async def check_pods_ready(self, namespace: str, deployment_name: str) -> bool:
        self._load_config()
        if not self._loaded:
            return True  # assume OK in local mode
        try:
            core_v1 = k8s_client.CoreV1Api()
            pods = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: core_v1.list_namespaced_pod(
                    namespace,
                    label_selector=f"app={deployment_name}",
                ),
            )
            if not pods.items:
                return False
            return all(
                pod.status.phase == "Running"
                and all(c.ready for c in (pod.status.container_statuses or []))
                for pod in pods.items
            )
        except Exception:
            return True

    async def wait_for_rollout(
        self, namespace: str, name: str, timeout: int = 120
    ) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline:
            ready = await self.check_pods_ready(namespace, name)
            if ready:
                return True
            await asyncio.sleep(5)
        return False

    async def get_pod_logs(
        self, namespace: str, pod_name: str, lines: int = 50
    ) -> str:
        self._load_config()
        if not self._loaded:
            return ""
        try:
            core_v1 = k8s_client.CoreV1Api()
            logs = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: core_v1.read_namespaced_pod_log(
                    pod_name, namespace, tail_lines=lines
                ),
            )
            return logs
        except Exception:
            return ""

    async def health_check(self) -> bool:
        self._load_config()
        return self._loaded
