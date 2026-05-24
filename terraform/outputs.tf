output "namespace_names" {
  description = "All created Kubernetes namespace names"
  value       = module.namespaces.namespace_names
}

output "grafana_url" {
  description = "Grafana dashboard URL"
  value       = "http://localhost:3001"
}

output "argocd_url" {
  description = "ArgoCD UI URL"
  value       = "http://localhost:8080"
}

output "healing_service_url" {
  description = "Self-healing service URL"
  value       = "http://localhost:8888"
}

output "prometheus_url" {
  description = "Prometheus URL"
  value       = "http://localhost:9092"
}
