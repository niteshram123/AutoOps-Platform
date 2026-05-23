#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
COMPOSE_CMD=(docker compose -f docker-compose.yml)

if [ $# -eq 0 ]; then
  echo -e "${YELLOW}[→] Following logs for all services...${NC}"
  "${COMPOSE_CMD[@]}" logs -f -t --tail=50
else
  echo -e "${YELLOW}[→] Following logs for ${1}...${NC}"
  "${COMPOSE_CMD[@]}" logs -f -t --tail=100 "$1"
fi
