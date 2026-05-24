# Secrets Management — AutoOps Platform

## Strategy

| Layer | Method | Committed to git? |
|-------|--------|------------------|
| Local dev | `.env` file | ❌ Never |
| Kubernetes staging | K8s Secrets (base64) | ❌ Never |
| Kubernetes production | Sealed Secrets (encrypted) | ✅ Safe |

---

## Local Development

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY, ARGOCD_TOKEN
```

The `.env` file is in `.gitignore` and never committed.

---

## Kubernetes — Sealed Secrets

Sealed Secrets uses asymmetric encryption. The controller holds the private key in-cluster; you encrypt with the public key. Only the cluster can decrypt.

### Install

```bash
./secrets/sealed-secrets-install.sh
```

### Seal a secret

```bash
./secrets/seal-secret.sh healing-service-secrets autoops-ops \
  anthropic-api-key=sk-ant-your-key \
  argocd-token=your-argocd-token \
  webhook-secret=autoops-webhook-secret
# Creates: secrets/sealed/healing-service-secrets-autoops-ops.yaml
# Safe to commit ✅
```

### Apply to cluster

```bash
kubectl apply -f secrets/sealed/healing-service-secrets-autoops-ops.yaml
```

### Rotate a secret

```bash
./secrets/seal-secret.sh healing-service-secrets autoops-ops \
  anthropic-api-key=sk-ant-new-key
kubectl apply -f secrets/sealed/healing-service-secrets-autoops-ops.yaml
kubectl rollout restart deployment/healing-service -n autoops-ops
```

---

## Secret Inventory

| Secret Name | Namespace | Keys | Used By |
|-------------|-----------|------|---------|
| `healing-service-secrets` | `autoops-ops` | `anthropic-api-key`, `argocd-token`, `webhook-secret` | healing-service |
| `registry-credentials` | all | `.dockerconfigjson` | image pulls |
| `sonarqube-token` | `autoops-ops` | `token` | CI pipeline |

---

## Security Rules

- Never put real values in `secrets/templates/`
- Never commit `.env`, `*.pem`, or unsealed Secret YAML
- Rotate secrets immediately if accidentally exposed
- Use `WEBHOOK_SECRET` to authenticate AlertManager → healing-service calls
