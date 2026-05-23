#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICES=(
  "api-gateway:3000:autoops-api-gateway"
  "user-service:8000:autoops-user-service"
  "metrics-collector:9091:autoops-metrics-collector"
)

pretty_print() {
  local file="$1"
  if command -v jq >/dev/null 2>&1; then
    jq . "$file"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m json.tool "$file"
  elif command -v python >/dev/null 2>&1; then
    python -m json.tool "$file"
  else
    cat "$file"
  fi
}

overall_status=0

for entry in "${SERVICES[@]}"; do
  IFS=":" read -r service port container <<<"$entry"
  output="/tmp/health_${service}.json"
  echo -e "${YELLOW}[→] Checking ${service}...${NC}"

  if curl -sf "http://localhost:${port}/health" -o "$output"; then
    echo -e "${GREEN}[HEALTHY] ${service}${NC}"
    pretty_print "$output"
  else
    echo -e "${RED}[UNHEALTHY] ${service}${NC}"
    docker logs --tail=80 "$container" || true
    overall_status=1
  fi
done

exit "$overall_status"
