#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  AutoOps Platform — Interactive Demo Script
#  Usage: ./scripts/platform/demo.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; NC='\033[0m'

pause() {
  echo ""
  read -rp "  Press ENTER to continue..." _
  echo ""
}

section() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║  $1${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── Banner ────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║         AutoOps Platform — Live Demo                  ║
  ║      AI-Assisted Self-Healing CI/CD Platform          ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
echo "  This demo walks through all 5 phases of the AutoOps Platform."
pause

# ── DEMO 1: Running Services ──────────────────────────────────
section "DEMO 1/6 — Running Services"
echo "  All services running on Docker:"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep autoops || echo "  (no autoops containers running)"
echo ""
echo "  Health checks:"
for svc in "api-gateway:3000" "user-service:8000" "metrics-collector:9091" "healing-service:8888"; do
  name="${svc%%:*}"; port="${svc#*:}"
  STATUS=$(curl -sf "http://localhost:${port}/health" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null || echo "unreachable")
  echo -e "    ${name}: ${STATUS}"
done
pause

# ── DEMO 2: CI Pipeline ───────────────────────────────────────
section "DEMO 2/6 — CI Pipeline (Phase 2)"
echo "  Jenkinsfile pipeline stages:"
grep -E "stage\(" "${ROOT_DIR}/Jenkinsfile" | sed "s/.*stage('//;s/').*//" | nl -ba | head -15
echo ""
echo "  Jenkins:   http://localhost:8080"
echo "  SonarQube: http://localhost:9000"
pause

# ── DEMO 3: Kubernetes Deployment ────────────────────────────
section "DEMO 3/6 — Kubernetes / GitOps (Phase 3)"
if command -v kubectl &>/dev/null && kubectl cluster-info &>/dev/null 2>&1; then
  echo "  Pods in autoops-staging:"
  kubectl get pods -n autoops-staging 2>/dev/null || echo "  (namespace not found)"
  echo ""
  echo "  HPAs:"
  kubectl get hpa -n autoops-staging 2>/dev/null || echo "  (none)"
  echo ""
  echo "  ArgoCD apps:"
  kubectl get applications -n argocd 2>/dev/null || echo "  (ArgoCD not installed)"
else
  echo "  No Kubernetes cluster detected."
  echo "  To enable: kind create cluster --name autoops"
  echo "  Then run:  helm install autoops-staging ./helm/autoops-platform -n autoops-staging"
fi
pause

# ── DEMO 4: Observability ─────────────────────────────────────
section "DEMO 4/6 — Observability (Phase 4)"
echo "  Prometheus targets:"
curl -sf "http://localhost:9092/api/v1/targets" 2>/dev/null \
  | python3 -c "
import json,sys
d=json.load(sys.stdin)
for t in d.get('data',{}).get('activeTargets',[]):
    print(f\"    {t['labels'].get('job','?'):<25} {t['health']}\")
" 2>/dev/null || echo "  (Prometheus not running)"
echo ""
echo "  Starting 30s load generator in background..."
bash "${ROOT_DIR}/scripts/monitoring/load-generator.sh" 30 5 &
LOAD_PID=$!
echo "  Load generator PID: ${LOAD_PID}"
echo ""
echo "  Grafana dashboards:"
echo "    Overview:       http://localhost:3001/d/autoops-overview"
echo "    Service Health: http://localhost:3001/d/autoops-service-health"
echo "    SLO / SLA:      http://localhost:3001/d/autoops-slo"
pause
kill "${LOAD_PID}" 2>/dev/null || true

# ── DEMO 5: Self-Healing (THE SHOWSTOPPER) ────────────────────
section "DEMO 5/6 — Self-Healing Engine (Phase 5) ⭐"
echo -e "  ${YELLOW}Simulating a production incident...${NC}"
echo ""
echo "  Sending HighErrorRate alert to the healing service..."
bash "${ROOT_DIR}/scripts/healing/simulate-incident.sh" HighErrorRate &
SIM_PID=$!
echo ""
echo "  Healing service logs (live):"
sleep 2
timeout 25 docker logs autoops-healing-service --follow 2>&1 \
  | grep -E "received|analyzing|recommendation|executing|healed|failed|escalated|annotation" \
  || true
wait "${SIM_PID}" 2>/dev/null || true
echo ""
echo -e "  ${GREEN}Healing cycle complete.${NC}"
pause

# ── DEMO 6: Audit Trail ───────────────────────────────────────
section "DEMO 6/6 — Audit Trail"
bash "${ROOT_DIR}/scripts/healing/view-audit-log.sh"
echo ""
echo "  Full audit API:"
echo "    Events:  curl http://localhost:8888/audit/events | python3 -m json.tool"
echo "    Summary: curl http://localhost:8888/audit/summary | python3 -m json.tool"
echo "    Metrics: curl http://localhost:8888/metrics"
echo ""

# ── Closing ───────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Demo complete! AutoOps Platform — 5 phases, fully operational.${NC}"
echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  GitHub: https://github.com/niteshram123/AutoOps-Platform"
echo ""
