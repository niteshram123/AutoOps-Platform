# AutoOps Platform — SLO Definitions

## Overview

Service Level Objectives (SLOs) define the reliability targets for each AutoOps service.
They are measured using Prometheus recording rules and visualised in the
[SLO / SLA Grafana dashboard](http://localhost:3001/d/autoops-slo).

---

## SLO Table

| Service           | SLI                                    | SLO Target | Measurement Window |
|-------------------|----------------------------------------|------------|--------------------|
| api-gateway       | Availability (2xx+3xx / total)         | **99.9%**  | 30-day rolling     |
| api-gateway       | P95 Latency                            | **< 500ms**| 5-min window       |
| api-gateway       | P99 Latency                            | **< 1s**   | 5-min window       |
| user-service      | Availability (2xx+3xx / total)         | **99.5%**  | 30-day rolling     |
| user-service      | P95 Latency                            | **< 200ms**| 5-min window       |
| metrics-collector | Availability                           | **99.0%**  | 30-day rolling     |

---

## Error Budget Calculations

### api-gateway (99.9% SLO)

```
Monthly error budget = (1 - 0.999) × 30 × 24 × 60
                     = 0.001 × 43,200 minutes
                     = 43.2 minutes / month
```

### user-service (99.5% SLO)

```
Monthly error budget = (1 - 0.995) × 30 × 24 × 60
                     = 0.005 × 43,200 minutes
                     = 216 minutes / month  (~3.6 hours)
```

### metrics-collector (99.0% SLO)

```
Monthly error budget = (1 - 0.990) × 30 × 24 × 60
                     = 0.010 × 43,200 minutes
                     = 432 minutes / month  (~7.2 hours)
```

---

## Burn Rate Thresholds

Burn rate measures how fast the error budget is being consumed relative to the allowed rate.

| Burn Rate | Meaning                                      | Action                        |
|-----------|----------------------------------------------|-------------------------------|
| 1x        | On track — budget consumed at exactly SLO rate | No action needed             |
| 2x        | Budget will be exhausted in ~15 days         | Investigate                   |
| 6x        | Budget will be exhausted in ~5 days          | Page on-call                  |
| 14.4x     | Budget will be exhausted in < 1 hour         | Immediate incident response   |

---

## Prometheus Recording Rules

The following recording rules are defined in `monitoring/prometheus/rules/slo-rules.yaml`:

```promql
# 5-minute success rate per service
autoops:http_request_success_rate:5m

# 5-minute error rate per service
autoops:http_request_error_rate:5m

# P95 latency per service
autoops:http_p95_latency:5m

# P99 latency per service
autoops:http_p99_latency:5m

# 1-hour availability percentage per service
autoops:availability:1h
```

---

## Alert Thresholds

| Alert              | Condition                                    | Severity | For  |
|--------------------|----------------------------------------------|----------|------|
| `SLOBreach`        | Availability < 99.9% (1h window)             | Critical | 5m   |
| `ErrorBudgetBurnRateHigh` | Burn rate > 14.4x                   | Critical | 2m   |
| `HighErrorRate`    | Error rate > 5% (5m window)                  | Critical | 2m   |
| `HighLatency`      | P95 latency > 500ms (5m window)              | Warning  | 3m   |

---

## Error Budget Policy

1. **Green (> 75% remaining)**: Normal deployment cadence allowed
2. **Yellow (25–75% remaining)**: Increased caution; review all deployments
3. **Red (< 25% remaining)**: Freeze non-critical deployments; focus on reliability
4. **Exhausted (0%)**: Incident declared; all hands on reliability work

---

## References

- [HighErrorRate Runbook](./alert-runbooks/high-error-rate.md)
- [PodCrashLooping Runbook](./alert-runbooks/pod-crashloop.md)
- [SLOBreach Runbook](./alert-runbooks/slo-breach.md)
- [Grafana SLO Dashboard](http://localhost:3001/d/autoops-slo)
- [Google SRE Book — SLOs](https://sre.google/sre-book/service-level-objectives/)
