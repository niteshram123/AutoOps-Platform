# Demo Guide — AutoOps Platform

## Quick Demo (5 minutes)

```bash
# 1. Start everything
./scripts/platform/bootstrap-all.sh

# 2. Run the interactive demo
./scripts/platform/demo.sh

# 3. Simulate an incident
./scripts/healing/simulate-incident.sh HighErrorRate

# 4. View the audit trail
./scripts/healing/view-audit-log.sh
```

---

## Demo Sections

### Section 1 — Show Running Services
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl http://localhost:3000/health | python3 -m json.tool
curl http://localhost:8888/health | python3 -m json.tool
```

### Section 2 — Show Metrics Instrumentation
```bash
# api-gateway custom metrics
curl http://localhost:3000/metrics | grep -E "http_requests_total|active_connections"

# user-service custom metrics
curl http://localhost:8000/metrics | grep "user_operations_total"

# healing-service metrics
curl http://localhost:8888/metrics | grep "healing_"
```

### Section 3 — Show Grafana Dashboards
Open http://localhost:3001 (admin / autoops-grafana-2024)
- Overview dashboard: request rates, error rates, P95 latency
- SLO dashboard: availability vs 99.9% target, error budget

### Section 4 — Trigger Self-Healing (The Showstopper)

```bash
# Terminal 1: Watch healing service logs
docker logs autoops-healing-service --follow

# Terminal 2: Simulate incident
./scripts/healing/simulate-incident.sh HighErrorRate
```

**What you'll see in the logs:**
```
{"message": "alert received", "alert": "HighErrorRate", "service": "api-gateway"}
{"message": "rule-based recommendation", "action": "rollback", "confidence": 0.8}
{"message": "healing complete", "status": "HEALED", "verified": true}
```

**What appears in Grafana:**
A vertical annotation line: `✅ AUTO-HEALED: rollback on api-gateway`

### Section 5 — Show Audit Trail
```bash
curl http://localhost:8888/audit/summary | python3 -m json.tool
curl http://localhost:8888/audit/events | python3 -m json.tool
./scripts/healing/view-audit-log.sh
```

---

## Interview Talking Points

1. **"The webhook returns 202 immediately"** — never blocks AlertManager
2. **"AI with deterministic fallback"** — works without an API key
3. **"Cooldown prevents thrashing"** — won't heal the same service twice in 5 min
4. **"Three-check verification"** — health + error rate + pod readiness
5. **"Full audit trail"** — every decision is logged with reasoning
6. **"Grafana annotations"** — healing events visible on dashboards

---

## Simulating Different Incidents

```bash
# High error rate → triggers rollback
./scripts/healing/simulate-incident.sh HighErrorRate

# Service down → triggers restart
./scripts/healing/simulate-incident.sh ServiceDown

# High latency → triggers scale_up
./scripts/healing/simulate-incident.sh HighLatency

# Pod crash loop → triggers restart
./scripts/healing/simulate-incident.sh PodCrashLoop
```

---

## Enabling AI Mode

Set your OpenRouter API key in `.env`:
```bash
OPENROUTER_API_KEY=sk-or-your-key-here
OPENROUTER_MODEL=anthropic/claude-3-haiku
AI_ENABLED=true
```

Then restart the healing service:
```bash
docker compose up -d --build healing-service
```

Get a free API key at https://openrouter.ai/keys
