# AutoOps Platform — Observability Guide (Phase 4)

## Overview

Phase 4 adds a complete observability stack to the AutoOps Platform:

| Component        | Technology                          | Port  |
|------------------|-------------------------------------|-------|
| Metrics scraping | Prometheus v2.47.2                  | 9092  |
| Alert routing    | AlertManager v0.26.0                | 9093  |
| Visualisation    | Grafana v10.2.2                     | 3001  |
| Host metrics     | Node Exporter v1.7.0                | 9100  |
| Container metrics| cAdvisor v0.47.3                    | 8090  |

---

## Quick Start

```bash
# 1. Start the main application stack (if not already running)
docker compose up -d

# 2. Deploy the observability stack
./scripts/monitoring/setup-monitoring.sh

# 3. Generate traffic to populate dashboards
./scripts/monitoring/load-generator.sh 300 10

# 4. Open Grafana
open http://localhost:3001  # admin / autoops-grafana-2024
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     autoops-network                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ api-gateway  │  │ user-service │  │metrics-collector │  │
│  │  :3000/metrics│  │ :8000/metrics│  │  :9090/metrics   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│         └─────────────────┴────────────────────┘            │
│                           │ scrape every 10-15s              │
│                    ┌──────▼──────┐                           │
│                    │ Prometheus  │◄── rules/*.yaml            │
│                    │   :9090     │                           │
│                    └──────┬──────┘                           │
│                           │ alerts                           │
│                    ┌──────▼──────┐                           │
│                    │AlertManager │──► webhook → healing-svc  │
│                    │   :9093     │──► email (critical)        │
│                    └─────────────┘                           │
│                                                              │
│                    ┌─────────────┐                           │
│                    │   Grafana   │◄── Prometheus datasource   │
│                    │   :3001     │    3 auto-provisioned      │
│                    └─────────────┘    dashboards             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │node-exporter │  │   cAdvisor   │                         │
│  │   :9100      │  │   :8090      │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Custom Metrics

### api-gateway (Node.js / prom-client)

| Metric                              | Type      | Labels                          |
|-------------------------------------|-----------|---------------------------------|
| `http_request_duration_seconds`     | Histogram | method, route, status_code      |
| `http_requests_total`               | Counter   | method, route, status_code      |
| `active_connections`                | Gauge     | service                         |
| `proxy_errors_total`                | Counter   | target_service, error_type      |

### user-service (Python / prometheus-fastapi-instrumentator)

| Metric                              | Type      | Labels                          |
|-------------------------------------|-----------|---------------------------------|
| `user_operations_total`             | Counter   | operation, status               |
| `user_store_size`                   | Gauge     | —                               |
| `user_validation_errors_total`      | Counter   | field, error_type               |
| `http_request_duration_seconds`     | Histogram | method, handler, status_code    |

### metrics-collector (Go / client_golang)

| Metric                              | Type      | Labels                          |
|-------------------------------------|-----------|---------------------------------|
| `collection_duration_seconds`       | Histogram | target                          |
| `external_scrapes_total`            | Counter   | target, status                  |
| `metrics_collector_build_info`      | Gauge     | version, go_version             |
| `autoops_service_health_status`     | Gauge     | service                         |

---

## Dashboards

### 1. AutoOps Platform Overview (`/d/autoops-overview`)

High-level platform health at a glance:
- Services up/down count
- Overall availability (1h)
- Total request rate
- Error rate
- Per-service request rate, error rate, P95 latency
- Container CPU and memory usage

### 2. Service Health Detail (`/d/autoops-service-health`)

Per-service drill-down (select service from dropdown):
- Service status and uptime
- Request rate stacked by status code (2xx/4xx/5xx)
- Latency percentiles (P50/P95/P99)
- Request duration heatmap
- Top 10 slowest endpoints
- HTTP status code distribution

### 3. SLO / SLA Dashboard (`/d/autoops-slo`)

SLO tracking and error budget management:
- Availability vs 99.9% SLO target
- Error budget remaining
- Burn rate (alert if > 1x)
- Per-service SLO status table

---

## Alert Rules

| Alert                    | Condition                              | Severity | For  |
|--------------------------|----------------------------------------|----------|------|
| `ServiceDown`            | `up == 0`                              | Critical | 1m   |
| `HighErrorRate`          | Error rate > 5%                        | Critical | 2m   |
| `HighLatency`            | P95 > 500ms                            | Warning  | 3m   |
| `PodCrashLooping`        | > 3 restarts in 15m                    | Critical | 5m   |
| `HPAMaxReplicas`         | HPA at max replicas                    | Warning  | 5m   |
| `SLOBreach`              | Availability < 99.9% (1h)             | Critical | 5m   |
| `ErrorBudgetBurnRateHigh`| Burn rate > 14.4x                      | Critical | 2m   |

---

## Scripts

| Script                              | Purpose                                    |
|-------------------------------------|--------------------------------------------|
| `setup-monitoring.sh`               | Deploy full stack + import dashboards      |
| `load-generator.sh [duration] [rps]`| Simulate realistic traffic                 |
| `trigger-alert.sh <alert-name>`     | Manually fire a test alert                 |
| `check-alerts.sh`                   | Display active alerts (exits 1 if critical)|
| `import-dashboards.sh`              | Re-import dashboards via Grafana API       |

---

## Kubernetes Deployment

For production Kubernetes deployment using kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack \
  -n autoops-ops --create-namespace \
  -f helm/monitoring/kube-prometheus-values.yaml
```

Access Grafana via NodePort:
```bash
kubectl get svc -n autoops-ops monitoring-grafana
# NodePort: 32001
```

---

## Troubleshooting

**Prometheus not scraping a service:**
```bash
# Check targets
curl http://localhost:9092/api/v1/targets | python3 -m json.tool | grep -A5 '"health"'
```

**Grafana shows "No data":**
- Ensure the monitoring stack and app stack are on the same Docker network
- Run `./scripts/monitoring/load-generator.sh 60 5` to generate initial data
- Check Prometheus targets page: http://localhost:9092/targets

**AlertManager not receiving alerts:**
```bash
docker logs autoops-alertmanager --tail=50
curl http://localhost:9093/api/v2/status | python3 -m json.tool
```
