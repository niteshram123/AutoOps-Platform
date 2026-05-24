#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# sealed-secrets-install.sh — Install Sealed Secrets controller
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SEALED_SECRETS_VERSION="v0.24.4"
KUBESEAL_VERSION="0.24.4"
CERT_PATH="$(dirname "$0")/sealed-secrets-public.pem"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }

echo ""
echo "Installing Sealed Secrets controller ${SEALED_SECRETS_VERSION}..."

kubectl apply -f \
  "https://github.com/bitnami-labs/sealed-secrets/releases/download/${SEALED_SECRETS_VERSION}/controller.yaml"

echo "Waiting for controller to be ready..."
kubectl wait --for=condition=available deployment/sealed-secrets-controller \
  -n kube-system --timeout=120s

log "Sealed Secrets controller is ready"

# Install kubeseal CLI
if ! command -v kubeseal &>/dev/null; then
  warn "kubeseal not found — installing..."
  OS=$(uname -s | tr '[:upper:]' '[:lower:]')
  ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
  curl -sL "https://github.com/bitnami-labs/sealed-secrets/releases/download/v${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION}-${OS}-${ARCH}.tar.gz" \
    | tar xz kubeseal
  sudo mv kubeseal /usr/local/bin/
  log "kubeseal installed"
else
  log "kubeseal already installed: $(kubeseal --version)"
fi

# Fetch and save the public key
echo ""
echo "Fetching cluster public key..."
kubeseal --fetch-cert --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system > "${CERT_PATH}"

log "Public key saved to ${CERT_PATH}"
echo ""
echo "You can now seal secrets with:"
echo "  ./secrets/seal-secret.sh <name> <namespace> key=value [key=value...]"
