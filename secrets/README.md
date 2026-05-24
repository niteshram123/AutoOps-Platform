# Secrets Management — AutoOps Platform

## Overview

AutoOps uses a layered secrets strategy:

| Environment | Method | Safe to commit? |
|-------------|--------|-----------------|
| Local dev | `.env` file | ❌ No (gitignored) |
| Kubernetes staging | Kubernetes Secrets | ❌ No (base64 only) |
| Kubernetes production | Sealed Secrets | ✅ Yes (encrypted) |

---

## Local Development

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY, ARGOCD_TOKEN, etc.
```

The `.env` file is gitignored and never committed.

---

## Kubernetes — Sealed Secrets

[Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) encrypts Kubernetes Secrets using a cluster-specific public key. The encrypted `SealedSecret` YAML is safe to commit to git.

### 1. Install the controller

```bash
./secrets/sealed-secrets-install.sh
```

### 2. Seal a new secret

```bash
./secrets/seal-secret.sh healing-service-secrets autoops-ops \
  openrouter-api-key=sk-or-your-key \
  argocd-token=your-token \
  webhook-secret=autoops-webhook-secret
```

This creates `secrets/sealed/healing-service-secrets-autoops-ops.yaml` — safe to commit.

### 3. Apply to cluster

```bash
kubectl apply -f secrets/sealed/healing-service-secrets-autoops-ops.yaml
```

### 4. Rotate a secret

```bash
# Re-seal with new value
./secrets/seal-secret.sh healing-service-secrets autoops-ops \
  openrouter-api-key=sk-or-new-key

# Apply the updated SealedSecret
kubectl apply -f secrets/sealed/healing-service-secrets-autoops-ops.yaml

# Restart the pod to pick up the new secret
kubectl rollout restart deployment/healing-service -n autoops-ops
```

---

## Secret Templates

Templates in `secrets/templates/` show the structure of each secret with placeholder values. Never put real values in templates.

| Template | Purpose |
|----------|---------|
| `registry-credentials-template.yaml` | Docker registry pull secret |
| `sonarqube-token-template.yaml` | SonarQube API token |
| `healing-service-token-template.yaml` | Healing service API keys |

---

## Security Notes

- Never commit `.env`, `*.pem`, or unsealed `Secret` YAML files
- The `secrets/sealed/` directory is gitignored by default — only commit intentionally
- Rotate secrets immediately if accidentally exposed
- Use `kubeseal --fetch-cert` to get the current public key before sealing
