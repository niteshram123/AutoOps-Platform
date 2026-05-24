# ─────────────────────────────────────────────────────────────
# AutoOps Platform — Terraform Root Module
# Provisions: namespaces, RBAC, resource quotas, monitoring stack,
# and deploys the application via Helm.
# ─────────────────────────────────────────────────────────────

module "namespaces" {
  source       = "./modules/namespaces"
  environments = ["staging", "production", "ops"]
  project_name = var.project_name
}

module "rbac" {
  source     = "./modules/rbac"
  depends_on = [module.namespaces]
  namespaces = module.namespaces.namespace_names
}

module "monitoring" {
  source               = "./modules/monitoring"
  depends_on           = [module.namespaces]
  namespace            = "autoops-ops"
  grafana_password     = var.grafana_password
  prometheus_retention = var.prometheus_retention
}

# ── Application Helm release (staging) ───────────────────────
resource "helm_release" "autoops_staging" {
  name       = "autoops-staging"
  chart      = "${path.module}/../helm/autoops-platform"
  namespace  = "autoops-staging"
  depends_on = [module.namespaces, module.rbac]

  values = [
    file("${path.module}/../helm/autoops-platform/values.yaml"),
    file("${path.module}/../helm/autoops-platform/values-staging.yaml"),
  ]

  set {
    name  = "global.imageTag"
    value = var.image_tag
  }

  wait    = true
  timeout = 300
}
