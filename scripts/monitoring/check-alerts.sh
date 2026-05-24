#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# check-alerts.sh — Display active and silenced alerts
# Usage: ./scripts/monitoring/check-alerts.sh
# Exit code 1 if any CRITICAL alerts are firing.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ALERTMANAGER_URL="${ALERTMANAGER_URL:-http://localhost:9093}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9092}"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  AutoOps Alert Status"
echo "═══════════════════════════════════════════════════════"

# ── Active alerts from AlertManager ──────────────────────────
echo ""
echo "AlertManager — Active Alerts:"
echo ""

ALERTS_JSON=$(curl -sf "${ALERTMANAGER_URL}/api/v2/alerts" 2>/dev/null || echo "[]")

python3 - <<PYEOF
import json, sys

alerts = json.loads('''${ALERTS_JSON}''')

if not alerts:
    print("  (no active alerts)")
else:
    header = f"  {'ALERT NAME':<28} {'SEVERITY':<10} {'SERVICE':<18} {'STARTED':<22} {'STATE'}"
    print(header)
    print("  " + "─" * 90)
    for a in sorted(alerts, key=lambda x: x.get('labels', {}).get('severity', 'z')):
        labels  = a.get('labels', {})
        status  = a.get('status', {})
        starts  = a.get('startsAt', '')[:19].replace('T', ' ')
        name    = labels.get('alertname', '?')
        sev     = labels.get('severity', '?')
        svc     = labels.get('service', labels.get('job', '?'))
        state   = status.get('state', '?')
        print(f"  {name:<28} {sev:<10} {svc:<18} {starts:<22} {state}")

PYEOF

# ── Silenced alerts ───────────────────────────────────────────
echo ""
echo "AlertManager — Silences:"
echo ""

SILENCES_JSON=$(curl -sf "${ALERTMANAGER_URL}/api/v2/silences" 2>/dev/null || echo "[]")

python3 - <<PYEOF
import json

silences = json.loads('''${SILENCES_JSON}''')
active = [s for s in silences if s.get('status', {}).get('state') == 'active']

if not active:
    print("  (no active silences)")
else:
    for s in active:
        matchers = ', '.join(f"{m['name']}={m['value']}" for m in s.get('matchers', []))
        ends = s.get('endsAt', '')[:19].replace('T', ' ')
        print(f"  ID: {s['id'][:8]}...  Matchers: {matchers}  Ends: {ends}")

PYEOF

# ── Prometheus pending/firing rules ──────────────────────────
echo ""
echo "Prometheus — Firing / Pending Rules:"
echo ""

RULES_JSON=$(curl -sf "${PROMETHEUS_URL}/api/v1/rules" 2>/dev/null || echo '{"data":{"groups":[]}}')

python3 - <<PYEOF
import json

data = json.loads('''${RULES_JSON}''')
groups = data.get('data', {}).get('groups', [])

found = False
for g in groups:
    for r in g.get('rules', []):
        state = r.get('state', '')
        if state in ('firing', 'pending'):
            found = True
            name = r.get('name', '?')
            labels = r.get('labels', {})
            sev = labels.get('severity', '?')
            print(f"  [{state.upper():<7}] {name:<30} severity={sev}")

if not found:
    print("  (no rules currently firing or pending)")

PYEOF

# ── Exit code ─────────────────────────────────────────────────
CRITICAL_COUNT=$(echo "${ALERTS_JSON}" | python3 -c "
import json, sys
alerts = json.load(sys.stdin)
print(sum(1 for a in alerts
          if a.get('labels', {}).get('severity') == 'critical'
          and a.get('status', {}).get('state') == 'active'))
" 2>/dev/null || echo "0")

echo ""
if [ "${CRITICAL_COUNT}" -gt 0 ]; then
  echo -e "${RED}[!] ${CRITICAL_COUNT} CRITICAL alert(s) are firing${NC}"
  exit 1
else
  echo -e "${GREEN}[✓] No critical alerts firing${NC}"
  exit 0
fi
