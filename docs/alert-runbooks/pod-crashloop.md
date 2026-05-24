# Runbook: PodCrashLooping

## Alert Details

| Field       | Value                                                                                     |
|-------------|-------------------------------------------------------------------------------------------|
| Alert Name  | `PodCrashLooping`                                                                         |
| Severity    | Critical                                                                                  |
| Threshold   | Pod restart count > 3 in the last 15 minutes                                             |
| PromQL      | `rate(kube_pod_container_status_restarts_total[15m]) * 60 * 15 > 3`                      |

---

## Symptoms

- `kubectl get pods` shows `CrashLoopBackOff` or high restart count
- Grafana shows service health dropping to 0
- `ServiceDown` alert may also be firing
- Users experiencing intermittent failures

---

## Investigation Steps

### Step 1 — Identify the crashing pod

```bash
kubectl get pods -n autoops-production -o wide
kubectl get pods -n autoops-staging -o wide

# Sort by restart count
kubectl get pods -n autoops-production \
  --sort-by='.status.containerStatuses[0].restartCount'
```

### Step 2 — Inspect pod events and status

```bash
# Replace <pod-name> with the actual pod name
kubectl describe pod <pod-name> -n autoops-production
```

Look for:
- `OOMKilled` — container ran out of memory
- `Error` — application crashed
- `ImagePullBackOff` — bad image tag
- Liveness/readiness probe failures

### Step 3 — Read the crash logs

```bash
# Current logs
kubectl logs <pod-name> -n autoops-production

# Logs from the previous (crashed) container
kubectl logs <pod-name> -n autoops-production --previous
```

### Step 4 — Check resource limits

```bash
kubectl describe pod <pod-name> -n autoops-production | grep -A5 "Limits\|Requests"
kubectl top pod <pod-name> -n autoops-production
```

### Step 5 — Check recent config/secret changes

```bash
kubectl get events -n autoops-production --sort-by='.lastTimestamp' | tail -20
kubectl get configmap -n autoops-production
kubectl get secret -n autoops-production
```

---

## Common Root Causes and Fixes

### OOMKilled

```bash
# Increase memory limit in Helm values
# Edit helm/charts/<service>/values.yaml:
#   resources.limits.memory: 512Mi  →  1Gi

helm upgrade autoops-production ./helm/autoops-platform \
  -n autoops-production \
  --set userService.resources.limits.memory=1Gi
```

### Application crash (check logs for stack trace)

```bash
# Rollback to last known good version
kubectl rollout undo deployment/<deployment-name> -n autoops-production
kubectl rollout status deployment/<deployment-name> -n autoops-production
```

### Bad image / ImagePullBackOff

```bash
# Check the image tag
kubectl get deployment <deployment-name> -n autoops-production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Force a re-pull
kubectl set image deployment/<deployment-name> \
  <container>=<registry>/<image>:<correct-tag> \
  -n autoops-production
```

### Liveness probe failing

```bash
# Temporarily disable the probe to allow the pod to start
kubectl patch deployment <deployment-name> -n autoops-production \
  --type=json \
  -p='[{"op":"remove","path":"/spec/template/spec/containers/0/livenessProbe"}]'
# Investigate, then re-add the probe with correct settings
```

---

## Escalation

If the pod continues to crash after remediation:

1. Cordon the affected node: `kubectl cordon <node-name>`
2. Drain workloads: `kubectl drain <node-name> --ignore-daemonsets`
3. Page the on-call engineer

---

## Post-Incident

- [ ] Root cause documented
- [ ] Resource limits reviewed and adjusted if needed
- [ ] Post-mortem created if duration > 15 minutes
- [ ] Runbook updated with new findings
