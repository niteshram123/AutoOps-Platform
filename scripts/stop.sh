#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
COMPOSE_CMD=(docker compose -f docker-compose.yml)

if [ "${1:-}" = "--clean" ]; then
  echo -e "${YELLOW}[→] Stopping platform and removing volumes...${NC}"
  "${COMPOSE_CMD[@]}" down -v --remove-orphans
else
  echo -e "${YELLOW}[→] Stopping platform...${NC}"
  "${COMPOSE_CMD[@]}" down --remove-orphans
fi

# Cleanup temporary monitoring copies created by start.sh
TMP_BASE=${TMPDIR:-/tmp}
for d in "$TMP_BASE"/autoops-monitoring-*; do
  if [ -d "$d" ]; then
    echo -e "${YELLOW}[→] Removing temporary monitoring copy: $d${NC}"
    rm -rf "$d" || true
  fi
done

echo -e "${GREEN}[✓] AutoOps Platform stopped${NC}"
