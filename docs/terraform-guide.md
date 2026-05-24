# Terraform Guide — AutoOps Platform

## Overview

The `terraform/` directory provisions the full Kubernetes infrastructure for AutoOps using Infrastructure as Code.

**What Terraform manages:**
- Kubernetes namespaces (`autoops-staging`, `autoops-production`, `autoops-ops`)
- Resource quotas per namespace
- RBAC (ServiceAccounts, Roles, RoleBindings for healing-service)
- kube-prometheus-stack via Helm
- Application Helm releases

---

## Prerequisites

```bash
# Install Terraform >= 1.6
brew install terraform        # macOS
choco install terraform       # Windows
# or download from https://developer.hashicorp.com/terraform/downloads

# Install kind (local Kubernetes)
brew install kind
kind create cluster --name autoops

# Verify
terraform version
kubectl cluster-info --context kind-autoops
```

---

## Quick Start (Local)

```bash
cd terraform

# 1. Initialise providers
terraform init

# 2. Preview changes
terraform plan -var-file=environments/local/terraform.tfvars

# 3. Apply
terraform apply -var-file=environments/local/terraform.tfvars

# 4. View outputs
terraform output
```

---

## Module Structure

```
terraform/
├── main.tf                    # Root — calls all modules
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── providers.tf               # Kubernetes + Helm providers
├── backend.tf                 # State backend (local by default)
├── modules/
│   ├── namespaces/            # Creates namespaces + resource quotas
│   ├── rbac/                  # ServiceAccounts, Roles, RoleBindings
│   └── monitoring/            # kube-prometheus-stack Helm release
└── environments/
    ├── local/terraform.tfvars
    └── production/terraform.tfvars
```

---

## Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `project_name` | `autoops` | Prefix for all resources |
| `kube_context` | `kind-autoops` | kubectl context to use |
| `image_tag` | `latest` | Docker image tag to deploy |
| `grafana_password` | `autoops-grafana-2024` | Grafana admin password |
| `prometheus_retention` | `15d` | Prometheus data retention |
| `environment` | `local` | Deployment environment |

---

## Environments

### Local (kind cluster)
```bash
terraform apply -var-file=environments/local/terraform.tfvars
```

### Production
```bash
# Update environments/production/terraform.tfvars with real values
terraform apply -var-file=environments/production/terraform.tfvars
```

---

## State Management

Local state is stored in `terraform/terraform.tfstate` (gitignored).

For team use, switch to remote state in `backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket = "autoops-terraform-state"
    key    = "autoops/terraform.tfstate"
    region = "us-east-1"
  }
}
```

---

## Teardown

```bash
terraform destroy -var-file=environments/local/terraform.tfvars
```
