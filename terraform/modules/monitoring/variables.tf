variable "namespace" {
  description = "Namespace to deploy monitoring stack into"
  type        = string
  default     = "autoops-ops"
}

variable "grafana_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "prometheus_retention" {
  description = "Prometheus data retention"
  type        = string
  default     = "15d"
}
