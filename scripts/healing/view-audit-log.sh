#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# view-audit-log.sh — Display healing audit trail
# Usage: ./scripts/healing/view-audit-log.sh [--tail N] [--export]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

HEALING_URL="${HEALING_URL:-http://localhost:8888}"
TAIL=""
EXPORT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tail) TAIL="$2"; shift 2 ;;
    --export) EXPORT=true; shift ;;
    *) shift ;;
  esac
done

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

# ── Fetch events ──────────────────────────────────────────────
LIMIT="${TAIL:-50}"
EVENTS_JSON=$(curl -sf "${HEALING_URL}/audit/events?limit=${LIMIT}" 2>/dev/null || echo "[]")
SUMMARY_JSON=$(curl -sf "${HEALING_URL}/audit/summary" 2>/dev/null || echo "{}")

# ── Print table ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  AutoOps Healing Audit Trail${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

python3 - <<PYEOF
import json, sys

events = json.loads('''${EVENTS_JSON}''')
if not events:
    print("  (no healing events recorded yet)")
    print("")
    print("  Run a simulation: ./scripts/healing/simulate-incident.sh HighErrorRate")
else:
    header = f"  {'ID':<10} {'ALERT':<22} {'SERVICE':<16} {'ACTION':<14} {'STATUS':<12} {'TIME'}"
    print(header)
    print("  " + "─" * 90)
    for e in events:
        eid    = e.get('id', '?')[:8]
        alert  = e.get('alert_name', '?')[:20]
        svc    = e.get('service', '?')[:14]
        rec    = e.get('recommendation') or {}
        action = rec.get('action', '—')[:12]
        status = e.get('status', '?')
        ts     = e.get('created_at', '')[:19].replace('T', ' ')

        # Colour status
        if status == 'HEALED':
            status_str = f'\033[0;32m{status:<12}\033[0m'
        elif status in ('FAILED', 'ESCALATED'):
            status_str = f'\033[0;31m{status:<12}\033[0m'
        elif status in ('ANALYZING', 'EXECUTING', 'VERIFYING'):
            status_str = f'\033[1;33m{status:<12}\033[0m'
        else:
            status_str = f'{status:<12}'

        print(f"  {eid:<10} {alert:<22} {svc:<16} {action:<14} {status_str} {ts}")

PYEOF

# ── Print summary ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}Summary:${NC}"
python3 - <<PYEOF
import json

s = json.loads('''${SUMMARY_JSON}''')
total   = s.get('total_events', 0)
rate    = s.get('success_rate', 0)
by_s    = s.get('by_status', {})
by_a    = s.get('by_action', {})

print(f"  Total events:  {total}")
print(f"  Success rate:  {rate}%")
print(f"  By status:     {by_s}")
print(f"  By action:     {by_a}")
PYEOF

# ── Export ────────────────────────────────────────────────────
if [ "${EXPORT}" = "true" ]; then
  EXPORT_FILE="healing-audit-export-$(date +%Y%m%d-%H%M%S).json"
  curl -sf "${HEALING_URL}/audit/events/export" -o "${EXPORT_FILE}"
  echo ""
  echo -e "${GREEN}[✓]${NC} Exported to ${EXPORT_FILE}"
fi

echo ""
