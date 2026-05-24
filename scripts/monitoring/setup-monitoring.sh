#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# setup-monitoring.sh — Deploy the full AutoOps observability stack
# Usage: ./scripts/monitoring/setup-monitoring.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MONITORING_DIR="${ROOT_DIR}/monitoring"

PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3001"
ALERTMANAGER_URL="http://localhost:9093"
GRAFANA_USER="admin"
GRAFANA_PASS="autoops-grafana-2024"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err()  { echo -e "${RED}[✗]${NC} $*" >&2; }

# ── 1. Ensure the shared Docker network exists ────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  AutoOps Platform — Phase 4 Observability Setup"
echo "═══════════════════════════════════════════════════════"
echo ""

if ! docker network inspect autoops-network &>/dev/null; then
  warn "autoops-network not found — creating it..."
  docker network create autoops-network
  log "Network created"
else
  log "autoops-network already exists"
fi

# ── 2. Start the monitoring stack ────────────────────────────
log "Starting monitoring stack..."
docker compose -f "${MONITORING_DIR}/docker-compose.monitoring.yml" up -d

# ── 3. Wait for Prometheus ────────────────────────────────────
echo ""
echo "Waiting for Prometheus to become healthy..."
for i in $(seq 1 30); do
  if curl -sf "${PROMETHEUS_URL}/-/healthy" &>/dev/null; then
    log "Prometheus is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Prometheus did not become healthy in time"
    exit 1
  fi
  echo -n "."
  sleep 2
done

# ── 4. Wait for Grafana ───────────────────────────────────────
echo ""
echo "Waiting for Grafana to become healthy..."
for i in $(seq 1 40); do
  if curl -sf "${GRAFANA_URL}/api/health" &>/dev/null; then
    log "Grafana is healthy"
    break
  fi
  if [ "$i" -eq 40 ]; then
    err "Grafana did not become healthy in time"
    exit 1
  fi
  echo -n "."
  sleep 3
done

# ── 5. Import dashboards ──────────────────────────────────────
echo ""
log "Importing Grafana dashboards..."
"${SCRIPT_DIR}/import-dashboards.sh"

# ── 6. Verify alert rules loaded ─────────────────────────────
echo ""
log "Verifying Prometheus alert rules..."
RULES_RESPONSE=$(curl -sf "${PROMETHEUS_URL}/api/v1/rules" 2>/dev/null || echo '{}')
RULE_COUNT=$(echo "${RULES_RESPONSE}" | grep -o '"name"' | wc -l | tr -d ' ')
if [ "${RULE_COUNT}" -gt 0 ]; then
  log "Alert rules loaded: ${RULE_COUNT} rules found"
else
  warn "No alert rules detected yet — they may still be loading"
fi

# ── 7. Print access URLs ──────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Observability Stack Ready"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  Prometheus:   ${PROMETHEUS_URL}"
echo "  Grafana:      ${GRAFANA_URL}  (${GRAFANA_USER} / ${GRAFANA_PASS})"
echo "  AlertManager: ${ALERTMANAGER_URL}"
echo ""
echo "  Dashboards:"
echo "    Overview:       ${GRAFANA_URL}/d/autoops-overview"
echo "    Service Health: ${GRAFANA_URL}/d/autoops-service-health"
echo "    SLO / SLA:      ${GRAFANA_URL}/d/autoops-slo"
echo ""
echo "  Next steps:"
echo "    Generate traffic: ./scripts/monitoring/load-generator.sh 300 10"
echo "    Trigger an alert: ./scripts/monitoring/trigger-alert.sh HighErrorRate"
echo "    Check alerts:     ./scripts/monitoring/check-alerts.sh"
echo ""
