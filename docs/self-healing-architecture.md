# Self-Healing Architecture — AutoOps Platform

## Overview

The self-healing engine is the core of Phase 5. It closes the loop between observability (Phase 4) and automated remediation — turning alerts into actions without human intervention.

```
AlertManager ──► Healing Service ──► AI Analysis (Claude) ──► Action
                      │                      │                    │
                      │                 Rule Fallback         ArgoCD / K8s
                      │                                           │
                   Audit Store ◄──────────────────────── Verify + Annotate
                      │                                           │
                   REST API                               Grafana Annotation
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ALERT LIFECYCLE                               │
│                                                                      │
│  Prometheus ──► AlertManager ──► POST /webhook/alert                │
│                                         │                            │
│                                   [1] Validate token                │
│                                   [2] Parse payload                 │
│                                   [3] Create audit event            │
│                                   [4] Return 202 immediately        │
│                                         │                            │
│                              Background Task spawned                │
│                                         │                            │
│                              ┌──────────▼──────────┐               │
│                              │   ANALYZING          │               │
│                              │  Claude API call     │               │
│                              │  (or rule fallback)  │               │
│                              └──────────┬──────────┘               │
│                                         │                            │
│                              ┌──────────▼──────────┐               │
│                              │   SAFETY GATE        │               │
│                              │  confidence > 0.6?   │               │
│                              │  safe_to_automate?   │               │
│                              └──────────┬──────────┘               │
│                                    ┌────┴────┐                      │
│                                   YES       NO                      │
│                                    │         │                      │
│                              EXECUTING   ESCALATED/SKIPPED          │
│                              (action)    (Grafana annotation)       │
│                                    │                                 │
│                              ┌─────▼──────┐                        │
│                              │  VERIFYING  │                        │
│                              │ health check│                        │
│                              │ error rate  │                        │
│                              │ pod ready   │                        │
│                              └─────┬──────┘                        │
│                                ┌───┴───┐                            │
│                              HEALED  FAILED                         │
│                                │       │                            │
│                         Grafana annotation (✅/❌)                  │
│                         Audit event updated                         │
│                         Prometheus metric recorded                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Webhook Receiver (`app/routes/webhook.py`)

- Accepts POST from AlertManager on `/webhook/alert`, `/webhook/critical`, `/webhook/slo`
- Validates Bearer token
- Filters: only processes `firing` alerts (ignores `resolved`)
- Returns `202 Accepted` immediately — never blocks
- Spawns background task per alert

### 2. Alert Analyzer (`app/engine/analyzer.py`)

**AI Mode (OpenRouter API):**
- Sends structured prompt to the configured model (default: `anthropic/claude-3-haiku` via OpenRouter)
- Receives JSON recommendation: action, confidence, reasoning, safe_to_automate
- Parses and validates response

**Rule-Based Fallback (always available):**

| Alert | Action | Confidence | Auto? |
|-------|--------|-----------|-------|
| HighErrorRate | rollback | 0.80 | ✅ |
| ServiceDown | restart | 0.90 | ✅ |
| HighLatency | scale_up | 0.70 | ✅ |
| PodCrashLooping | restart | 0.85 | ✅ |
| HPAMaxReplicas | escalate | 1.00 | ❌ |
| SLOBreach | rollback | 0.75 | ✅ |

### 3. Healing Engine (`app/engine/healer.py`)

Orchestrates the full workflow with safety gates:
- **Cooldown**: won't heal the same service twice within 5 minutes
- **Confidence gate**: skips if confidence < 0.6
- **Safety gate**: escalates if `safe_to_automate=false`

### 4. Actions

| Action | Implementation | Requires |
|--------|---------------|---------|
| `rollback` | ArgoCD API rollback to previous revision | ArgoCD |
| `restart` | Patch deployment `restartedAt` annotation | Kubernetes |
| `scale_up` | Increase replicas by 2 (max 10) | Kubernetes |
| `canary_rollback` | ArgoCD sync to stable | ArgoCD |

### 5. Verifier (`app/engine/verifier.py`)

Three-check verification after healing:
1. Health endpoint returns 200
2. Error rate < 5% (Prometheus query)
3. Pods are Running and Ready (for restart/rollback)

### 6. Audit Store (`app/storage/audit_store.py`)

- JSON file on disk (`/app/audit/healing-events.json`)
- Thread-safe writes via `filelock`
- Full status history per event
- REST API: `GET /audit/events`, `GET /audit/summary`

### 7. Grafana Integration (`app/integrations/grafana.py`)

Every healing event creates a Grafana annotation visible as a vertical line on all time-series dashboards:
- `⚠️ ESCALATED: ...` — manual intervention needed
- `✅ AUTO-HEALED: rollback on api-gateway | ...` — success
- `❌ HEAL FAILED: ...` — action failed or verification failed

---

## Healing Event States

```
RECEIVED → ANALYZING → EXECUTING → VERIFYING → HEALED
                                              ↘ FAILED
              ↘ ESCALATED (unsafe to automate)
              ↘ SKIPPED (low confidence / cooldown)
```

---

## Prometheus Metrics

The healing service exposes its own `/metrics` endpoint:

| Metric | Type | Description |
|--------|------|-------------|
| `healing_events_total` | Counter | Total events by action/service/result |
| `healing_duration_seconds` | Histogram | Time per healing cycle |
| `healing_ai_calls_total` | Counter | Claude API calls |
| `healing_ai_errors_total` | Counter | Claude API failures |
| `healing_active_events` | Gauge | Currently processing |
| `healing_last_event_timestamp` | Gauge | Unix timestamp of last event |

---

## Local vs Kubernetes Mode

| Feature | Docker Compose (local) | Kubernetes |
|---------|----------------------|-----------|
| Webhook receiver | ✅ Full | ✅ Full |
| AI analysis | ✅ Full | ✅ Full |
| Rule fallback | ✅ Full | ✅ Full |
| ArgoCD rollback | ⚠️ Skipped (no ArgoCD) | ✅ Full |
| K8s restart/scale | ⚠️ Skipped (no cluster) | ✅ Full |
| Grafana annotations | ✅ Full | ✅ Full |
| Audit trail | ✅ Full | ✅ Full |
| Prometheus metrics | ✅ Full | ✅ Full |
