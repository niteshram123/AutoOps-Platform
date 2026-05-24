from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.engine.analyzer import AlertAnalyzer
from app.engine.healer import HealingEngine
from app.engine.verifier import HealingVerifier
from app.integrations.argocd import ArgoCDClient
from app.integrations.grafana import GrafanaClient
from app.integrations.kubernetes import KubernetesClient
from app.integrations.prometheus import PrometheusClient
from app.routes.audit import router as audit_router
from app.routes.health import router as health_router
from app.routes.metrics import router as metrics_router
from app.routes.webhook import router as webhook_router
from app.storage.audit_store import AuditStore

# ── Logging ───────────────────────────────────────────────────────────────────
from pythonjsonlogger import jsonlogger

handler = logging.StreamHandler()
handler.setFormatter(
    jsonlogger.JsonFormatter("%(asctime)s %(name)s %(levelname)s %(message)s")
)
logging.basicConfig(level=settings.LOG_LEVEL.upper(), handlers=[handler])
logger = logging.getLogger("healing-service")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────
    audit_store = AuditStore(settings.AUDIT_STORAGE_PATH)
    await audit_store.load()

    argocd = ArgoCDClient(settings.ARGOCD_URL, settings.ARGOCD_TOKEN)
    k8s = KubernetesClient(in_cluster=settings.KUBERNETES_IN_CLUSTER)
    prometheus = PrometheusClient(settings.PROMETHEUS_URL)
    grafana = GrafanaClient(
        settings.GRAFANA_URL, settings.GRAFANA_USER, settings.GRAFANA_PASSWORD
    )
    analyzer = AlertAnalyzer(
        ai_enabled=settings.AI_ENABLED,
        anthropic_api_key=settings.ANTHROPIC_API_KEY,
    )
    verifier = HealingVerifier(k8s=k8s, prometheus=prometheus)
    engine = HealingEngine(
        audit=audit_store,
        analyzer=analyzer,
        verifier=verifier,
        grafana=grafana,
        argocd=argocd,
        k8s=k8s,
        cooldown_seconds=settings.HEALING_COOLDOWN_SECONDS,
    )

    # Attach to app state
    app.state.settings = settings
    app.state.audit_store = audit_store
    app.state.healing_engine = engine

    # Connectivity checks (warn, don't fail)
    if not await argocd.health_check():
        logger.warning("argocd not reachable — rollback actions will be skipped")
    if not await k8s.health_check():
        logger.warning("kubernetes not configured — k8s actions will be skipped")
    if not await grafana.health_check():
        logger.warning("grafana not reachable — annotations will be skipped")

    logger.info(
        "service started",
        extra={
            "service": settings.SERVICE_NAME,
            "version": "1.0.0",
            "ai_enabled": settings.AI_ENABLED and bool(settings.ANTHROPIC_API_KEY),
            "actions_registered": ["rollback", "restart", "scale_up", "canary_rollback"],
        },
    )

    yield

    # ── Shutdown ──────────────────────────────────────────────
    logger.info("service stopping", extra={"service": settings.SERVICE_NAME})


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AutoOps Healing Service",
    version="1.0.0",
    description="AI-Assisted Self-Healing Engine for AutoOps Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging + metrics middleware ──────────────────────────────────────
@app.middleware("http")
async def request_middleware(request: Request, call_next) -> Response:
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()

    response = await call_next(request)

    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    status = str(response.status_code)
    route = request.url.path

    logger.info(
        "http request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": route,
            "status_code": status,
            "duration_ms": duration_ms,
        },
    )

    # Record Prometheus metrics
    try:
        from app.routes.metrics import http_request_duration_seconds, http_requests_total
        http_requests_total.labels(
            method=request.method, route=route, status_code=status
        ).inc()
        http_request_duration_seconds.labels(
            method=request.method, route=route, status_code=status
        ).observe(duration_ms / 1000)
    except Exception:
        pass

    return response


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(webhook_router)
app.include_router(health_router)
app.include_router(audit_router)
app.include_router(metrics_router)
