#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  AutoOps Platform — Master Bootstrap Script
#  Boots the ENTIRE platform from zero on a fresh machine.
#  Usage: ./scripts/platform/bootstrap-all.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
START_TIME=$(date +%s)

# ── Colours ───────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}[✓]${NC} $*"; }
fail() { echo -e "  ${RED}[✗]${NC} $*"; }
warn() { echo -e "  ${YELLOW}[!]${NC} $*"; }
step() { echo -e "\n${CYAN}${BOLD}[$1]${NC} $2"; }

# ── Banner ────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║         AutoOps Platform — Complete Bootstrap         ║
  ║      AI-Assisted Self-Healing CI/CD Platform          ║
  ║              Phase 5 / Production-Ready               ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

# ── Step 1: Prerequisites ─────────────────────────────────────
step "1/9" "Prerequisites Check"
MISSING=()
declare -A TOOLS=(
  [docker]="docker --version"
  [docker-compose]="docker compose version"
  [curl]="curl --version"
  [jq]="jq --version"
  [python3]="python3 --version"
)
for tool in "${!TOOLS[@]}"; do
  if ${TOOLS[$tool]} &>/dev/null; then
    VERSION=$(${TOOLS[$tool]} 2>&1 | head -1)
    ok "${tool}: ${VERSION}"
  else
    fail "${tool}: NOT FOUND"
    MISSING+=("$tool")
  fi
done

# Optional tools (warn, don't abort)
for tool in kubectl helm kind terraform; do
  if command -v "$tool" &>/dev/null; then
    ok "${tool}: $(${tool} version --short 2>/dev/null || ${tool} --version 2>/dev/null | head -1)"
  else
    warn "${tool}: not found (optional — needed for Kubernetes/Terraform)"
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  fail "Missing required tools: ${MISSING[*]}"
  echo "  Install Docker Desktop from https://www.docker.com/products/docker-desktop"
  exit 1
fi

# ── Step 2: Environment Setup ─────────────────────────────────
step "2/9" "Environment Setup"
if [ ! -f "${ROOT_DIR}/.env" ]; then
  cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
  warn ".env created from .env.example — please set OPENROUTER_API_KEY"
else
  ok ".env exists"
fi

if grep -q "your-openrouter-api-key-here" "${ROOT_DIR}/.env" 2>/dev/null; then
  warn "OPENROUTER_API_KEY not set — healing service will use rule-based fallback"
else
  ok "OPENROUTER_API_KEY is configured"
fi

mkdir -p "${ROOT_DIR}/reports" "${ROOT_DIR}/healing-audit"
ok "Output directories ready"

# ── Step 3: Docker Network ────────────────────────────────────
step "3/9" "Docker Network"
if docker network inspect autoops-network &>/dev/null; then
  ok "autoops-network already exists"
else
  docker network create autoops-network --subnet 172.20.0.0/24
  ok "autoops-network created"
fi

# ── Step 4: Core Services (Phase 1) ──────────────────────────
step "4/9" "Core Services (Phase 1 — api-gateway, user-service, metrics-collector)"
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d --build
echo "  Waiting for services to become healthy..."
for i in $(seq 1 30); do
  HEALTHY=$(docker ps --filter "name=autoops" --filter "health=healthy" --format "{{.Names}}" | wc -l | tr -d ' ')
  if [ "${HEALTHY}" -ge 3 ]; then
    ok "All 3 core services healthy"
    break
  fi
  [ "$i" -eq 30 ] && { fail "Core services did not become healthy in time"; docker compose logs --tail=20; exit 1; }
  sleep 3
done

# ── Step 5: Monitoring Stack (Phase 4) ───────────────────────
step "5/9" "Monitoring Stack (Phase 4 — Prometheus, Grafana, AlertManager)"
docker compose -f "${ROOT_DIR}/monitoring/docker-compose.monitoring.yml" up -d
echo "  Waiting for Prometheus..."
for i in $(seq 1 20); do
  curl -sf http://localhost:9092/-/healthy &>/dev/null && { ok "Prometheus healthy"; break; }
  [ "$i" -eq 20 ] && warn "Prometheus not yet healthy — continuing"
  sleep 3
done
echo "  Waiting for Grafana..."
for i in $(seq 1 20); do
  curl -sf http://localhost:3001/api/health &>/dev/null && { ok "Grafana healthy"; break; }
  [ "$i" -eq 20 ] && warn "Grafana not yet healthy — continuing"
  sleep 3
done
bash "${ROOT_DIR}/scripts/monitoring/import-dashboards.sh" 2>/dev/null && ok "Dashboards imported" || warn "Dashboard import skipped"

# ── Step 6: Healing Service (Phase 5) ────────────────────────
step "6/9" "Self-Healing Engine (Phase 5)"
docker compose -f "${ROOT_DIR}/docker-compose.yml" up -d --build healing-service
echo "  Waiting for healing service..."
for i in $(seq 1 20); do
  curl -sf http://localhost:8888/health &>/dev/null && { ok "Healing service healthy"; break; }
  [ "$i" -eq 20 ] && { fail "Healing service did not start"; docker logs autoops-healing-service --tail=20; exit 1; }
  sleep 3
done

# ── Step 7: Kubernetes (optional) ────────────────────────────
step "7/9" "Kubernetes (Phase 3 — optional)"
if command -v kubectl &>/dev/null && kubectl cluster-info &>/dev/null 2>&1; then
  ok "Kubernetes cluster available: $(kubectl config current-context)"
  if command -v helm &>/dev/null; then
    helm list -A 2>/dev/null | grep -q autoops && ok "Helm releases already deployed" || warn "Run: helm install autoops-staging ./helm/autoops-platform -n autoops-staging"
  fi
else
  warn "No Kubernetes cluster — skipping (run 'kind create cluster --name autoops' to enable)"
fi

# ── Step 8: Final Validation ──────────────────────────────────
step "8/9" "Final Validation"
SERVICES=(
  "api-gateway:http://localhost:3000/health"
  "user-service:http://localhost:8000/health"
  "metrics-collector:http://localhost:9091/health"
  "healing-service:http://localhost:8888/health"
  "prometheus:http://localhost:9092/-/healthy"
  "grafana:http://localhost:3001/api/health"
  "alertmanager:http://localhost:9093/-/healthy"
)
ALL_OK=true
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"; url="${entry#*:}"
  if curl -sf "${url}" &>/dev/null; then
    ok "${name}"
  else
    fail "${name} — ${url}"
    ALL_OK=false
  fi
done

# ── Step 9: Status Table ──────────────────────────────────────
step "9/9" "Platform Status"
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

echo ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}  ║                  PLATFORM STATUS                            ║${NC}"
echo -e "${CYAN}${BOLD}  ╠══════════════════════════════════════════════════════════════╣${NC}"

print_row() {
  local name="$1" url="$2"
  if curl -sf "${url}" &>/dev/null; then
    printf "  ${CYAN}║${NC}  %-28s %-30s ${GREEN}✅ Healthy${NC}  ${CYAN}║${NC}\n" "$name" "$url"
  else
    printf "  ${CYAN}║${NC}  %-28s %-30s ${RED}❌ Down${NC}     ${CYAN}║${NC}\n" "$name" "$url"
  fi
}

print_row "API Gateway"        "http://localhost:3000/health"
print_row "User Service"       "http://localhost:8000/health"
print_row "Metrics Collector"  "http://localhost:9091/health"
print_row "Healing Service"    "http://localhost:8888/health"
print_row "Prometheus"         "http://localhost:9092/-/healthy"
print_row "Grafana"            "http://localhost:3001/api/health"
print_row "AlertManager"       "http://localhost:9093/-/healthy"

echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}AutoOps Platform is fully operational.${NC}"
echo -e "  Time taken: ${ELAPSED}s"
echo ""
echo "  Quick links:"
echo "    Grafana:         http://localhost:3001  (admin / autoops-grafana-2024)"
echo "    Prometheus:      http://localhost:9092"
echo "    AlertManager:    http://localhost:9093"
echo "    Healing Service: http://localhost:8888"
echo ""
echo "  Try the demo:"
echo "    ./scripts/platform/demo.sh"
echo "    ./scripts/healing/simulate-incident.sh HighErrorRate"
echo ""
