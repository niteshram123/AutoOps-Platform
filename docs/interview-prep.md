# Interview Prep — AutoOps Platform

## The 3-Minute Project Pitch (STAR Method)

**Situation:** "I wanted to build a project that demonstrates the full DevOps lifecycle — not just CI/CD, but the entire loop from code to production to self-healing."

**Task:** "I designed and built a 5-phase platform: microservices, CI pipeline, Kubernetes GitOps, observability, and an AI-powered self-healing engine."

**Action:** "Each phase builds on the last. Phase 1 is three microservices in Node.js, Python, and Go. Phase 2 adds a Jenkins CI pipeline with SonarQube quality gates and Trivy security scanning. Phase 3 deploys to Kubernetes via Helm and ArgoCD GitOps. Phase 4 adds Prometheus, Grafana, and AlertManager with custom SLO dashboards. Phase 5 is the self-healing engine — it receives alerts from AlertManager, calls the Claude AI API to reason about the best fix, executes rollbacks or restarts automatically, verifies the fix worked, and logs everything to an audit trail."

**Result:** "The result is a platform where a production incident can be detected, analyzed, remediated, and verified — all without human intervention — in under 2 minutes."

---

## Q&A

### Q1: "Walk me through your DevOps project"
Use the 3-minute pitch above. Key numbers to mention:
- 5 phases, 3 microservices, 3 languages (Node.js, Python, Go)
- 7 Prometheus alert rules, 3 Grafana dashboards
- 4 healing actions (rollback, restart, scale_up, canary_rollback)
- Full audit trail with REST API

---

### Q2: "How does your self-healing system work?"

"When Prometheus fires an alert, AlertManager sends a webhook to my healing service. The webhook handler returns 202 immediately — it never blocks. A background task then runs the healing workflow: first it calls the Claude AI API with a structured prompt describing the alert, and Claude returns a JSON recommendation with an action, confidence score, and reasoning. If the confidence is above 0.75 and safe_to_automate is true, the engine executes the action — for example, triggering an ArgoCD rollback. After waiting for the estimated recovery time, it verifies healing via three checks: health endpoint, Prometheus error rate query, and pod readiness. Finally it creates a Grafana annotation so the healing event is visible on dashboards."

**Follow-up: "What if the AI is unavailable?"**
"There's a rule-based fallback that maps alert names to deterministic actions — HighErrorRate → rollback, ServiceDown → restart, HighLatency → scale_up. The service works without any API key."

---

### Q3: "Why ArgoCD instead of Jenkins for deployment?"

"Jenkins is great for CI — building, testing, scanning. But for deployment, GitOps with ArgoCD is a better pattern. The desired state lives in git, ArgoCD continuously reconciles the cluster to match it, and you get automatic drift detection. If someone manually changes something in the cluster, ArgoCD detects it and can auto-correct. Jenkins would require you to trigger a pipeline to fix drift. Also, ArgoCD gives you a visual diff of what's changing before it applies — much safer for production."

---

### Q4: "How do you handle secrets in Kubernetes?"

"Three layers. For local development, a `.env` file that's gitignored. For Kubernetes, I use Sealed Secrets — you encrypt a Kubernetes Secret with the cluster's public key using the `kubeseal` CLI, and the resulting SealedSecret YAML is safe to commit to git. Only the Sealed Secrets controller running in the cluster can decrypt it. This means secrets are version-controlled alongside the code, but never exposed."

---

### Q5: "What's the difference between staging and production?"

"The Helm values files differ in three key areas: replica counts (staging runs 1 replica, production runs 2 with HPA), resource limits (production has higher CPU/memory limits), and ingress configuration (production has TLS). The same Helm chart is used for both — only the values change. ArgoCD has separate Application manifests pointing to each values file."

---

### Q6: "How does canary deployment work?"

"The canary manifests in `k8s/canary/` create a second deployment with the new image version alongside the stable one. Traffic is split using Kubernetes Service weights — initially 90% stable, 10% canary. If the canary's error rate stays below threshold for 10 minutes, the weight shifts to 50/50, then 100% canary. If the error rate spikes, the healing service can trigger a canary rollback via ArgoCD sync, which reverts to the stable weights."

---

### Q7: "What happens when the AI can't determine the healing action?"

"Two safety nets. First, if the Claude API call fails or returns invalid JSON, the analyzer falls back to a rule-based lookup table — deterministic rules for each known alert type. Second, if the AI returns `safe_to_automate: false` or a confidence below 0.6, the engine escalates instead of acting — it creates a Grafana annotation saying manual intervention is required and updates the audit event to ESCALATED. The system never takes a risky action it's not confident about."

---

### Q8: "How would you scale this for 100 microservices?"

"A few changes: First, replace the JSON file audit store with PostgreSQL or DynamoDB. Second, add a message queue (SQS or Kafka) between AlertManager and the healing service so alerts are processed reliably even under load. Third, add service-specific healing rules — a database service needs different actions than a stateless API. Fourth, implement alert correlation to avoid healing the same root cause 100 times. The architecture already supports this — the analyzer is pluggable, and the action handlers are independent modules."

---

### Q9: "What's your branching strategy and why?"

"I use a trunk-based strategy with short-lived feature branches. Main branch is always deployable. Feature branches are named `feature/description`, bug fixes are `fix/description`, and each phase has its own branch `phase/N-name`. PRs require passing CI (Jenkins build + SonarQube quality gate + Trivy scan) before merge. No long-lived branches — they cause merge conflicts and slow down delivery."

---

### Q10: "How do you ensure zero-downtime deployments?"

"Four mechanisms working together: Pod Disruption Budgets ensure at least one pod is always available during rolling updates. The Helm chart uses `RollingUpdate` strategy with `maxUnavailable: 0`. Readiness probes prevent traffic from reaching pods that aren't ready yet. And the HPA ensures there are always enough replicas to absorb the load during a rollout. For the canary strategy, traffic only shifts to the new version after it passes health checks."

---

## Key Metrics to Mention

- **Build time**: ~3 minutes (Jenkins pipeline with parallel stages)
- **Deployment frequency**: On every merge to main (GitOps continuous deployment)
- **MTTR**: < 2 minutes (automated healing for known alert types)
- **Test coverage**: > 80% (enforced by SonarQube quality gate)
- **Security**: Zero critical CVEs (Trivy scan blocks the pipeline)
- **Availability SLO**: 99.9% target, tracked in Grafana

---

## What Makes This Better Than Typical Projects

1. **End-to-end**: Most projects stop at CI/CD. This adds observability AND self-healing.
2. **AI integration**: Using Claude for reasoning, not just rule matching.
3. **Production patterns**: PDBs, HPAs, network policies, non-root containers, sealed secrets.
4. **Three languages**: Shows breadth — Node.js, Python, Go.
5. **GitOps**: ArgoCD with drift detection, not just `kubectl apply`.
6. **Audit trail**: Every automated action is logged with AI reasoning — explainable automation.
7. **Fallback design**: Works without AI, without Kubernetes, without ArgoCD — graceful degradation.
8. **IaC**: Terraform provisions the entire infrastructure from scratch.
