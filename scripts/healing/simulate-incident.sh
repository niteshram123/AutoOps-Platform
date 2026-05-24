#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# simulate-incident.sh — Trigger a live self-healing demo
# Usage: ./scripts/healing/simulate-incident.sh <incident-type>
# Types: HighErrorRate | ServiceDown | HighLatency | PodCrashLoop
# ─────────────────────────────────────────────────────────────
set -euo pipefail

INCIDENT="${1:-HighErrorRate}"
BASE_URL="${API_GATEWAY_URL:-http://localhost:3000}"
HEALING_URL="${HEALING_URL:-http://localhost:8888}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-autoops-webhook-secret}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

banner() { echo -e "\n${CYAN}══════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════${NC}\n"; }

send_alert() {
  local alertname="$1" severity="$2" service="$3" summary="$4" description="$5"
  local started
  started=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")

  curl -s -o /tmp/heal_resp.json -w "%{http_code}" \
    -X POST "${HEALING_URL}/webhook/alert" \
    -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
      \"version\": \"4\",
      \"receiver\": \"autoops-webhook\",
      \"status\": \"firing\",
      \"alerts\": [{
        \"status\": \"firing\",
        \"labels\": {
          \"alertname\": \"${alertname}\",
          \"severity\": \"${severity}\",
          \"service\": \"${service}\",
          \"namespace\": \"autoops-production\"
        },
        \"annotations\": {
          \"summary\": \"${summary}\",
          \"description\": \"${description}\",
          \"runbook\": \"https://github.com/niteshram123/AutoOps-Platform/docs/alert-runbooks/\"
        },
        \"startsAt\": \"${started}\"
      }],
      \"groupLabels\": {\"alertname\": \"${alertname}\"},
      \"commonLabels\": {},
      \"externalURL\": \"http://alertmanager:9093\"
    }"
}

case "${INCIDENT}" in

  HighErrorRate)
    banner "Simulating: HighErrorRate on api-gateway"
    echo -e "${YELLOW}[1/3]${NC} Sending 50 bad requests to generate errors..."
    for i in $(seq 1 50); do
      curl -s -o /dev/null -X POST "${BASE_URL}/api/users" \
        -H "Content-Type: application/json" -d '{}' &
    done
    wait
    echo -e "${GREEN}[✓]${NC} Error burst sent"

    echo -e "${YELLOW}[2/3]${NC} Sending HighErrorRate alert to healing service..."
    STATUS=$(send_alert "HighErrorRate" "critical" "api-gateway" \
      "High error rate on api-gateway" \
      "Error rate is 8.3% over last 5 minutes — above 5% threshold")
    echo -e "${GREEN}[✓]${NC} Alert sent (HTTP ${STATUS})"
    EVENT_ID=$(python3 -c "import json; d=json.load(open('/tmp/heal_resp.json')); print(d.get('event_ids',['?'])[0])" 2>/dev/null || echo "?")
    echo "    Event ID: ${EVENT_ID}"

    echo -e "${YELLOW}[3/3]${NC} Following healing service logs (30s)..."
    timeout 30 docker logs autoops-healing-service --follow 2>&1 | grep -E "analyzing|executing|healed|failed|recommendation|rollback|restart" || true
    ;;

  ServiceDown)
    banner "Simulating: ServiceDown on user-service"
    echo -e "${YELLOW}[1/4]${NC} Stopping user-service container..."
    docker stop autoops-user-service 2>/dev/null || echo "Container not running"

    echo -e "${YELLOW}[2/4]${NC} Sending ServiceDown alert..."
    STATUS=$(send_alert "ServiceDown" "critical" "user-service" \
      "user-service is down" \
      "user-service has been unreachable for more than 1 minute")
    echo -e "${GREEN}[✓]${NC} Alert sent (HTTP ${STATUS})"

    echo -e "${YELLOW}[3/4]${NC} Waiting 10 seconds (simulating healing time)..."
    sleep 10

    echo -e "${YELLOW}[4/4]${NC} Restarting user-service..."
    docker start autoops-user-service 2>/dev/null || true
    echo -e "${GREEN}[✓]${NC} user-service restarted"
    ;;

  HighLatency)
    banner "Simulating: HighLatency on api-gateway"
    echo -e "${YELLOW}[1/2]${NC} Sending concurrent requests to spike latency..."
    for i in $(seq 1 40); do
      curl -s -o /dev/null "${BASE_URL}/api/users" &
    done
    wait

    STATUS=$(send_alert "HighLatency" "warning" "api-gateway" \
      "High P95 latency on api-gateway" \
      "P95 latency is 750ms — above 500ms threshold")
    echo -e "${GREEN}[✓]${NC} Alert sent (HTTP ${STATUS})"
    ;;

  PodCrashLoop)
    banner "Simulating: PodCrashLooping"
    STATUS=$(send_alert "PodCrashLooping" "critical" "api-gateway" \
      "Pod api-gateway is crash looping" \
      "Pod autoops-production/api-gateway has restarted 5 times in 15 minutes")
    echo -e "${GREEN}[✓]${NC} Alert sent (HTTP ${STATUS})"
    ;;

  *)
    echo -e "${RED}[✗]${NC} Unknown incident type: ${INCIDENT}"
    echo "Supported: HighErrorRate | ServiceDown | HighLatency | PodCrashLoop"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}Incident simulated.${NC} Check the healing service:"
echo "  Logs:      docker logs autoops-healing-service --tail=30"
echo "  Audit:     curl http://localhost:8888/audit/events | python3 -m json.tool"
echo "  Summary:   curl http://localhost:8888/audit/summary | python3 -m json.tool"
