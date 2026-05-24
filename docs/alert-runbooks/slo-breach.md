# Runbook: SLOBreach

## Alert Details

| Field       | Value                                                                                     |
|-------------|-------------------------------------------------------------------------------------------|
| Alert Name  | `SLOBreach`                                                                               |
| Severity    | Critical                                                                                  |
| Threshold   | Availability drops below 99.9% over a 1-hour rolling window                             |
| PromQL      | `(1 - rate(http_requests_total{status_code=~"2.."}[1h]) / rate(http_requests_total[1h])) > 0.001` |

---

## Symptoms

- Grafana SLO dashboard shows availability < 99.9%
- Error budget remaining is critically low (< 25%)
- `SLOBreach` alert firing in AlertManager
- Burn rate alert may also be active

---

## SLO Definitions

| Service         | SLI                          | SLO Target | Window       |
|-----------------|------------------------------|------------|--------------|
| api-gateway     | Availability (2xx+3xx/total) | 99.9%      | 30-day rolling |
| api-gateway     | P95 Latency                  | < 500ms    | 5-min window |
| user-service    | Availability                 | 99.5%      | 30-day rolling |
| user-service    | P95 Latency                  | < 200ms    | 5-min window |

Monthly error budget (99.9% SLO): **43.2 minutes** of allowed downtime.

---

## Investigation Steps

### Step 1 — Quantify the breach

```bash
# Current availability per service
curl -s "http://localhost:9092/api/v1/query" \
  --data-urlencode 'query=autoops:availability:1h' \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d['data']['result']:
    svc = r['metric'].get('service', '?')
    val = float(r['value'][1])
    print(f'{svc}: {val:.4f}%')
"

# Error budget remaining
curl -s "http://localhost:9092/api/v1/query" \
  --data-urlencode 'query=clamp_min((1 - (1 - avg(autoops:http_request_success_rate:5m)) / 0.001) * 100, 0)' \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print('Budget remaining:', d['data']['result'][0]['value'][1], '%')"
```

### Step 2 — Identify the error source

```bash
# Error rate by service and status code
curl -s "http://localhost:9092/api/v1/query" \
  --data-urlencode 'query=sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service, status_code)' \
  | python3 -m json.tool
```

### Step 3 — Check burn rate

A burn rate > 14.4x means the monthly error budget will be exhausted in under 1 hour.

```bash
curl -s "http://localhost:9092/api/v1/query" \
  --data-urlencode 'query=(1 - autoops:http_request_success_rate:5m) / 0.001' \
  | python3 -c "
import json, sys
d = json.load(sys.stdin)
for r in d['data']['result']:
    svc = r['metric'].get('service', '?')
    rate = float(r['value'][1])
    print(f'{svc}: {rate:.2f}x burn rate')
"
```

### Step 4 — Follow HighErrorRate runbook

If the SLO breach is caused by elevated error rates, follow the
[HighErrorRate runbook](./high-error-rate.md) for investigation and remediation steps.

---

## Remediation

### Immediate actions

1. Identify and fix the root cause (see HighErrorRate or PodCrashLooping runbooks)
2. If a bad deploy is the cause, roll back immediately
3. Consider temporarily routing traffic away from the affected service

### Error budget management

If the error budget is nearly exhausted:

1. **Freeze non-critical deployments** until the budget recovers
2. **Increase monitoring frequency** — reduce scrape interval to 5s temporarily
3. **Notify stakeholders** — SLO breach may require customer communication

---

## Post-Incident

- [ ] Calculate total error budget consumed
- [ ] Document root cause and timeline
- [ ] Review whether SLO targets are realistic
- [ ] Update error budget policy if needed
- [ ] Create post-mortem if breach lasted > 30 minutes
