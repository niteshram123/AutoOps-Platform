# Runbook: HighErrorRate

## Alert Details

| Field       | Value                                                                 |
|-------------|-----------------------------------------------------------------------|
| Alert Name  | `HighErrorRate`                                                       |
| Severity    | Critical                                                              |
| Threshold   | Error rate > 5% over a 2-minute window                               |
| PromQL      | `rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05` |

---

## Symptoms

- Grafana "Error Rate by Service" panel shows a spike in 5xx responses
- Users reporting failures or timeouts
- AlertManager has an active `HighErrorRate` alert
- `./scripts/monitoring/check-alerts.sh` exits with code 1

---

## Investigation Steps

### Step 1 — Identify the affected service

```bash
# Which service is generating errors?
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{status_code=~"5.."}[5m])' \
  | python3 -m json.tool | grep -E '"service"|"value"'
```

### Step 2 — Check container logs

```bash
# API Gateway
docker logs autoops-api-gateway --tail=100 --since=10m

# User Service
docker logs autoops-user-service --tail=100 --since=10m

# Metrics Collector
docker logs autoops-metrics-collector --tail=100 --since=10m
```

In Kubernetes:
```bash
kubectl get pods -n autoops-production
kubectl logs -n autoops-production deployment/api-gateway --tail=100
kubectl logs -n autoops-production deployment/user-service --tail=100
```

### Step 3 — Check recent deployments

```bash
# Helm history
helm history autoops-production -n autoops-production

# Kubernetes rollout history
kubectl rollout history deployment/api-gateway -n autoops-production
kubectl rollout history deployment/user-service -n autoops-production
```

### Step 4 — Check service health and dependencies

```bash
curl http://localhost:3000/health | python3 -m json.tool
curl http://localhost:8000/health | python3 -m json.tool
curl http://localhost:9091/health | python3 -m json.tool
```

### Step 5 — Check resource pressure

```bash
# Docker
docker stats --no-stream

# Kubernetes
kubectl top pods -n autoops-production
kubectl top nodes
```

---

## Remediation

### Option A — Rollback (if caused by a bad deploy)

```bash
# Docker Compose
docker compose up -d --no-deps api-gateway  # re-deploy previous image

# Kubernetes
kubectl rollout undo deployment/api-gateway -n autoops-production
kubectl rollout status deployment/api-gateway -n autoops-production
```

### Option B — Scale up (if caused by traffic overload)

```bash
# Kubernetes
kubectl scale deployment api-gateway --replicas=5 -n autoops-production
kubectl scale deployment user-service --replicas=3 -n autoops-production
```

### Option C — Restart the service

```bash
# Docker
docker restart autoops-api-gateway

# Kubernetes
kubectl rollout restart deployment/api-gateway -n autoops-production
```

---

## Verification

After remediation, confirm the error rate has dropped:

```bash
# Watch error rate in real time
watch -n 5 'curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode "query=rate(http_requests_total{status_code=~\"5..\"}[5m])/rate(http_requests_total[5m])*100" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); [print(r[\"metric\"].get(\"service\",\"?\"), r[\"value\"][1]) for r in d[\"data\"][\"result\"]]"'
```

---

## Escalation

If the error rate does not drop within 15 minutes after remediation:

1. Page the on-call engineer
2. Open a P1 incident in the incident tracker
3. Begin post-mortem preparation

---

## Post-Incident

- [ ] Update this runbook with any new findings
- [ ] Create a post-mortem if the incident lasted > 15 minutes
- [ ] Add a regression test if the root cause was a code bug
- [ ] Review alert thresholds if this was a false positive
