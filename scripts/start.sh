#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
COMPOSE_CMD=(docker compose -f docker-compose.yml)

banner() {
  cat <<'BANNER'
╔═══════════════════════════════════════════╗
║      AutoOps Platform - Phase 1          ║
║   Containerized Microservices Stack      ║
╚═══════════════════════════════════════════╝
BANNER
}

require_command() {
  local command_name="$1"
  local label="$2"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo -e "${RED}[x] ${label} is required but was not found${NC}"
    exit 1
  fi
}

wait_for_health() {
  local name="$1"
  local url="$2"
  local elapsed=0

  while [ "$elapsed" -le 60 ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo -e "${GREEN}[✓] ${name} is healthy (${elapsed}s)${NC}"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo -e "${RED}[x] ${name} did not become healthy within 60s${NC}"
    "${COMPOSE_CMD[@]}" logs --tail=80 "$name" || true
  return 1
}

banner

require_command docker "Docker"
require_command curl "curl"

DOCKER_VERSION="$(docker --version)"
COMPOSE_VERSION="$(docker compose version)"
echo -e "${GREEN}[✓] ${DOCKER_VERSION} found${NC}"
echo -e "${GREEN}[✓] ${COMPOSE_VERSION} found${NC}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}[!] .env file not found; copied defaults from .env.example${NC}"
else
  echo -e "${GREEN}[✓] .env file found${NC}"
fi

echo -e "${YELLOW}[→] Building Docker images...${NC}"
# Copy monitoring configs to a temp directory to avoid OneDrive bind-mount issues
TMP_MON_DIR=$(mktemp -d -t autoops-monitoring-XXXX || mktemp -d)
echo -e "${YELLOW}[→] Copying monitoring configs to temporary folder: ${TMP_MON_DIR}${NC}"
cp -a "$(dirname "$0")/../monitoring/." "$TMP_MON_DIR/"
export MONITORING_DIR="$TMP_MON_DIR"

"${COMPOSE_CMD[@]}" build --no-cache

echo -e "${YELLOW}[→] Starting containers...${NC}"
"${COMPOSE_CMD[@]}" up -d

wait_for_health "metrics-collector" "http://localhost:9091/health"
wait_for_health "user-service" "http://localhost:8000/health"
wait_for_health "api-gateway" "http://localhost:3000/health"

cat <<'URLS'
┌─────────────────────────────────────────────┐
│           AutoOps Platform URLs             │
├──────────────────────┬──────────────────────┤
│ API Gateway          │ http://localhost:3000 │
│ User Service         │ http://localhost:8000 │
│ Metrics Collector    │ http://localhost:9091 │
│ Prometheus Metrics   │ http://localhost:9090 │
└──────────────────────┴──────────────────────┘
URLS

"$(dirname "$0")/health-check.sh"
echo -e "${GREEN}[✓] All services healthy. AutoOps Platform is ready.${NC}"
