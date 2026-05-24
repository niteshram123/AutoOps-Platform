#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# trigger-alert.sh — Manually trigger a test alert
# Usage: ./scripts/monitoring/trigger-alert.sh <alert-name>
# Supported: ServiceDown | HighErrorRate | HighLatency | SLOBreach
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ALERT="${1:-}"
BASE_URL="${API_GATEWAY_URL:-http://localhost:3000}"
ALERTMANAGER_URL="http://localhost:9093"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 <alert-name>"
  echo "Supported alerts: ServiceDown | HighErrorRate | HighLatency | SLOBreach"
  exit 1
}

[ -z "${ALERT}" ] && usage

wait_for_alert() {
  local name="$1"
  echo ""
  echo "Waiting for alert '${name}' to appear in AlertManager (up to 3 min)..."
  for i in $(seq 1 36); do
    FIRING=$(curl -sf "${ALERTMANAGER_URL}/api/v2/alerts" 2>/dev/null \
      | python3 -c "import json,sys; alerts=json.load(sys.stdin); print(sum(1 for a in alerts if a.get('labels',{}).get('alertname')=='${name}' and a.get('status',{}).get('state')=='active'))" 2>/dev/null || echo "0")
    if [ "${FIRING}" -gt 0 ]; then
      echo -e "${RED}[FIRING]${NC} Alert '${name}' is now active in AlertManager"
      return 0
    fi
    echo -n "."
    sleep 5
  done
  echo -e "${YELLOW}[!]${NC} Alert not yet visible — Prometheus evaluation interval may need more time"
}

case "${ALERT}" in

  ServiceDown)
    echo -e "${YELLOW}[trigger]${NC} Stopping api-gateway container for 90 seconds..."
    docker stop autoops-api-gateway
    echo "Container stopped. Waiting for Prometheus to detect it as DOWN..."
    sleep 90
    echo -e "${GREEN}[restore]${NC} Restarting api-gateway..."
    docker start autoops-api-gateway
    wait_for_alert "ServiceDown"
    ;;

  HighErrorRate)
    echo -e "${YELLOW}[trigger]${NC} Sending 60 invalid requests to generate 5xx / 4xx errors..."
    for i in $(seq 1 60); do
      curl -s -o /dev/null -X POST "${BASE_URL}/api/users" \
        -H "Content-Type: application/json" \
        -d '{"invalid_field": true}' &
    done
    wait
    echo -e "${GREEN}[done]${NC} Burst sent. Prometheus needs ~2 min to evaluate the rule."
    wait_for_alert "HighErrorRate"
    ;;

  HighLatency)
    echo -e "${YELLOW}[trigger]${NC} Sending 30 slow requests (via sleep proxy simulation)..."
    # We can't inject latency directly, so we flood with concurrent requests
    # to saturate the service and push P95 up.
    for i in $(seq 1 30); do
      curl -s -o /dev/null "${BASE_URL}/api/users" &
    done
    wait
    echo -e "${GREEN}[done]${NC} Requests sent. Check Grafana P95 latency panel."
    wait_for_alert "HighLatency"
    ;;

  SLOBreach)
    echo -e "${YELLOW}[trigger]${NC} Sending 100 error-inducing requests to breach SLO..."
    for i in $(seq 1 100); do
      curl -s -o /dev/null -X POST "${BASE_URL}/api/users" \
        -H "Content-Type: application/json" \
        -d '{}' &
    done
    wait
    echo -e "${GREEN}[done]${NC} Requests sent. SLO breach alert evaluates over 1h window."
    wait_for_alert "SLOBreach"
    ;;

  *)
    echo -e "${RED}[error]${NC} Unknown alert: ${ALERT}"
    usage
    ;;
esac

echo ""
echo "Current AlertManager alerts:"
curl -sf "${ALERTMANAGER_URL}/api/v2/alerts" 2>/dev/null \
  | python3 -c "
import json, sys
alerts = json.load(sys.stdin)
if not alerts:
    print('  (no active alerts)')
else:
    print(f'  {'ALERT NAME':<25} {'SEVERITY':<10} {'STATE':<10} {'STARTED'}')
    print('  ' + '-'*70)
    for a in alerts:
        labels = a.get('labels', {})
        status = a.get('status', {})
        starts = a.get('startsAt', '')[:19].replace('T', ' ')
        print(f'  {labels.get(\"alertname\",\"?\"):<25} {labels.get(\"severity\",\"?\"):<10} {status.get(\"state\",\"?\"):<10} {starts}')
" 2>/dev/null || echo "  (could not parse alerts)"
