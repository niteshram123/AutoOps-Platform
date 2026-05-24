#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# seal-secret.sh — Create a SealedSecret from key=value pairs
# Usage: ./seal-secret.sh <secret-name> <namespace> key=value [key=value...]
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SECRET_NAME="${1:-}"
NAMESPACE="${2:-}"
shift 2 || true
KV_PAIRS=("$@")

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEALED_DIR="${SCRIPT_DIR}/sealed"
CERT_PATH="${SCRIPT_DIR}/sealed-secrets-public.pem"

GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

if [ -z "${SECRET_NAME}" ] || [ -z "${NAMESPACE}" ] || [ ${#KV_PAIRS[@]} -eq 0 ]; then
  echo "Usage: $0 <secret-name> <namespace> key=value [key=value...]"
  exit 1
fi

if ! command -v kubeseal &>/dev/null; then
  echo -e "${RED}[✗]${NC} kubeseal not found. Run ./secrets/sealed-secrets-install.sh first."
  exit 1
fi

mkdir -p "${SEALED_DIR}"

# Build kubectl create secret command
KUBECTL_ARGS=("kubectl" "create" "secret" "generic" "${SECRET_NAME}"
  "--namespace=${NAMESPACE}" "--dry-run=client" "-o" "yaml")

for kv in "${KV_PAIRS[@]}"; do
  KUBECTL_ARGS+=("--from-literal=${kv}")
done

OUTPUT_FILE="${SEALED_DIR}/${SECRET_NAME}-${NAMESPACE}.yaml"

# Seal it
if [ -f "${CERT_PATH}" ]; then
  "${KUBECTL_ARGS[@]}" | kubeseal \
    --cert "${CERT_PATH}" \
    --format yaml > "${OUTPUT_FILE}"
else
  "${KUBECTL_ARGS[@]}" | kubeseal \
    --controller-name=sealed-secrets-controller \
    --controller-namespace=kube-system \
    --format yaml > "${OUTPUT_FILE}"
fi

echo -e "${GREEN}[✓]${NC} SealedSecret created: ${OUTPUT_FILE}"
echo "    Safe to commit to git."
echo ""
echo "Apply with:"
echo "  kubectl apply -f ${OUTPUT_FILE}"
