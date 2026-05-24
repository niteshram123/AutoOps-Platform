#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# teardown-all.sh — Tear down the entire AutoOps platform
# Usage: ./scripts/platform/teardown-all.sh [--volumes]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REMOVE_VOLUMES=false
[[ "${1:-}" == "--volumes" ]] && REMOVE_VOLUMES=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}[✓]${NC} $*"; }
warn() { echo -e "  ${YELLOW}[!]${NC} $*"; }

echo ""
echo -e "${RED}Tearing down AutoOps Platform...${NC}"
[ "${REMOVE_VOLUMES}" = "true" ] && warn "Volumes will be deleted (--volumes flag set)"
echo ""

# Stop monitoring stack
echo "Stopping monitoring stack..."
docker compose -f "${ROOT_DIR}/monitoring/docker-compose.monitoring.yml" down \
  $( [ "${REMOVE_VOLUMES}" = "true" ] && echo "--volumes" ) 2>/dev/null && ok "Monitoring stack stopped" || warn "Monitoring stack was not running"

# Stop core + healing services
echo "Stopping core services..."
docker compose -f "${ROOT_DIR}/docker-compose.yml" down \
  $( [ "${REMOVE_VOLUMES}" = "true" ] && echo "--volumes" ) 2>/dev/null && ok "Core services stopped" || warn "Core services were not running"

# Remove network
docker network rm autoops-network 2>/dev/null && ok "Network removed" || warn "Network already removed"

echo ""
ok "Platform torn down."
[ "${REMOVE_VOLUMES}" = "false" ] && echo "  Tip: run with --volumes to also delete persistent data"
