#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# load-generator.sh — Simulate realistic traffic against the AutoOps API
# Usage: ./scripts/monitoring/load-generator.sh [duration-seconds] [rps]
# Default: 300 seconds, 10 RPS
# ─────────────────────────────────────────────────────────────
set -euo pipefail

DURATION="${1:-300}"
RPS="${2:-10}"
BASE_URL="${API_GATEWAY_URL:-http://localhost:3000}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Counters (shared via temp files for subshell visibility) ──
STATS_DIR=$(mktemp -d)
echo 0 > "${STATS_DIR}/total"
echo 0 > "${STATS_DIR}/ok"
echo 0 > "${STATS_DIR}/client_err"
echo 0 > "${STATS_DIR}/server_err"

inc() { echo $(( $(cat "${STATS_DIR}/$1") + 1 )) > "${STATS_DIR}/$1"; }

# ── Sample user IDs for GET requests ─────────────────────────
CREATED_IDS=()

# ── Request functions ─────────────────────────────────────────

do_list_users() {
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/users")
  inc total
  case "${STATUS}" in 2*) inc ok ;; 4*) inc client_err ;; 5*) inc server_err ;; esac
}

do_create_user() {
  local name="user_$(( RANDOM % 9000 + 1000 ))"
  local email="${name}@loadtest.io"
  RESPONSE=$(curl -s -o /tmp/lgen_resp.json -w "%{http_code}" \
    -X POST "${BASE_URL}/api/users" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"email\":\"${email}\"}" 2>/dev/null || echo "000")
  inc total
  case "${RESPONSE}" in
    2*)
      inc ok
      # Capture the created ID for later GET requests
      ID=$(python3 -c "import json,sys; d=json.load(open('/tmp/lgen_resp.json')); print(d.get('id',''))" 2>/dev/null || true)
      [ -n "${ID}" ] && CREATED_IDS+=("${ID}")
      ;;
    4*) inc client_err ;;
    5*) inc server_err ;;
  esac
}

do_get_user() {
  # Mix of valid IDs and random UUIDs (some will 404)
  local id
  if [ ${#CREATED_IDS[@]} -gt 0 ] && [ $(( RANDOM % 2 )) -eq 0 ]; then
    id="${CREATED_IDS[$(( RANDOM % ${#CREATED_IDS[@]} ))]}"
  else
    id="$(python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "00000000-0000-0000-0000-000000000000")"
  fi
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/users/${id}")
  inc total
  case "${STATUS}" in 2*) inc ok ;; 4*) inc client_err ;; 5*) inc server_err ;; esac
}

do_invalid_create() {
  # Missing required fields → 422 Unprocessable Entity
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/users" \
    -H "Content-Type: application/json" \
    -d '{"name":""}')
  inc total
  case "${STATUS}" in 2*) inc ok ;; 4*) inc client_err ;; 5*) inc server_err ;; esac
}

# ── Traffic distribution ──────────────────────────────────────
# 80% GET /api/users  |  10% POST /api/users  |  5% GET /:id  |  5% invalid POST

send_request() {
  local roll=$(( RANDOM % 100 ))
  if   [ "${roll}" -lt 80 ]; then do_list_users
  elif [ "${roll}" -lt 90 ]; then do_create_user
  elif [ "${roll}" -lt 95 ]; then do_get_user
  else                             do_invalid_create
  fi
}

# ── Main loop ─────────────────────────────────────────────────
SLEEP_INTERVAL=$(python3 -c "print(1.0/${RPS})" 2>/dev/null || echo "0.1")
END_TIME=$(( $(date +%s) + DURATION ))
LAST_REPORT=$(date +%s)
LAST_TOTAL=0
SPIKE_NEXT=$(( $(date +%s) + 30 ))

echo ""
echo -e "${GREEN}AutoOps Load Generator${NC}"
echo "  Target:   ${BASE_URL}"
echo "  Duration: ${DURATION}s  |  Target RPS: ${RPS}"
echo ""

while [ "$(date +%s)" -lt "${END_TIME}" ]; do
  NOW=$(date +%s)

  # ── Traffic spike every 30 seconds ───────────────────────────
  if [ "${NOW}" -ge "${SPIKE_NEXT}" ]; then
    echo -e "${YELLOW}[spike]${NC} Sending burst of 30 requests..."
    for _ in $(seq 1 30); do
      send_request &
    done
    wait
    SPIKE_NEXT=$(( NOW + 30 ))
  fi

  send_request &

  # ── Print stats every 10 seconds ─────────────────────────────
  if [ $(( NOW - LAST_REPORT )) -ge 10 ]; then
    TOTAL=$(cat "${STATS_DIR}/total")
    OK=$(cat "${STATS_DIR}/ok")
    C_ERR=$(cat "${STATS_DIR}/client_err")
    S_ERR=$(cat "${STATS_DIR}/server_err")
    ELAPSED=$(( NOW - LAST_REPORT ))
    DELTA=$(( TOTAL - LAST_TOTAL ))
    ACTUAL_RPS=$(python3 -c "print(round(${DELTA}/${ELAPSED},1))" 2>/dev/null || echo "?")
    ELAPSED_TOTAL=$(( NOW - (END_TIME - DURATION) ))
    echo "[${ELAPSED_TOTAL}s] Sent: ${TOTAL} | 2xx: ${OK} | 4xx: ${C_ERR} | 5xx: ${S_ERR} | RPS: ${ACTUAL_RPS}"
    LAST_REPORT="${NOW}"
    LAST_TOTAL="${TOTAL}"
  fi

  sleep "${SLEEP_INTERVAL}"
done

wait  # wait for any background requests to finish

TOTAL=$(cat "${STATS_DIR}/total")
OK=$(cat "${STATS_DIR}/ok")
C_ERR=$(cat "${STATS_DIR}/client_err")
S_ERR=$(cat "${STATS_DIR}/server_err")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Load generation complete"
echo "  Total: ${TOTAL}  |  2xx: ${OK}  |  4xx: ${C_ERR}  |  5xx: ${S_ERR}"
echo "═══════════════════════════════════════════════════════"

rm -rf "${STATS_DIR}"
