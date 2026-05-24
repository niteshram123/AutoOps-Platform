resource "helm_release" "kube_prometheus_stack" {
  name       = "monitoring"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "55.5.0"
  namespace  = var.namespace

  values = [
    templatefile("${path.module}/../../../helm/monitoring/kube-prometheus-values.yaml", {
      grafana_password     = var.grafana_password
      prometheus_retention = var.prometheus_retention
    })
  ]

  set {
    name  = "grafana.adminPassword"
    value = var.grafana_password
  }

  set {
    name  = "prometheus.prometheusSpec.retention"
    value = var.prometheus_retention
  }

  wait    = true
  timeout = 600
}
