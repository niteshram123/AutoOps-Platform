#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# import-dashboards.sh — Import all Grafana dashboards via API
# Usage: ./scripts/monitoring/import-dashboards.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DASHBOARDS_DIR="${ROOT_DIR}/monitoring/grafana/dashboards"

GRAFANA_URL="${GRAFANA_URL:-http://localhost:3001}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASS="${GRAFANA_PASS:-autoops-grafana-2024}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if [ ! -d "${DASHBOARDS_DIR}" ]; then
  echo -e "${RED}[✗]${NC} Dashboards directory not found: ${DASHBOARDS_DIR}"
  exit 1
fi

echo ""
echo "Importing Grafana dashboards from ${DASHBOARDS_DIR}..."
echo ""

SUCCESS=0
FAILED=0

for file in "${DASHBOARDS_DIR}"/*.json; do
  [ -f "${file}" ] || continue
  name=$(basename "${file}" .json)

  # Wrap the raw dashboard JSON in the import payload format
  PAYLOAD=$(python3 -c "
import json, sys
with open('${file}') as f:
    dashboard = json.load(f)
# Remove id so Grafana assigns a new one on import
dashboard.pop('id', None)
print(json.dumps({'dashboard': dashboard, 'overwrite': True, 'folderId': 0}))
")

  HTTP_STATUS=$(curl -s -o /tmp/grafana_import_resp.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
    "${GRAFANA_URL}/api/dashboards/import" \
    -d "${PAYLOAD}")

  if [ "${HTTP_STATUS}" -eq 200 ]; then
    UID=$(python3 -c "import json; d=json.load(open('/tmp/grafana_import_resp.json')); print(d.get('uid','?'))" 2>/dev/null || echo "?")
    echo -e "  ${GREEN}[✓]${NC} Imported: ${name}  (uid: ${UID})"
    (( SUCCESS++ )) || true
  else
    BODY=$(cat /tmp/grafana_import_resp.json 2>/dev/null || echo "no response")
    echo -e "  ${RED}[✗]${NC} Failed:   ${name}  (HTTP ${HTTP_STATUS}: ${BODY})"
    (( FAILED++ )) || true
  fi
done

echo ""
echo "Import complete: ${SUCCESS} succeeded, ${FAILED} failed"

[ "${FAILED}" -eq 0 ] || exit 1
