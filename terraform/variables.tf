variable "project_name" {
  description = "Project name used as prefix for all resources"
  type        = string
  default     = "autoops"
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = "kind-autoops"
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "grafana_password" {
  description = "Grafana admin password"
  type        = string
  default     = "autoops-grafana-2024"
  sensitive   = true
}

variable "prometheus_retention" {
  description = "Prometheus data retention period"
  type        = string
  default     = "15d"
}

variable "environment" {
  description = "Deployment environment (local, staging, production)"
  type        = string
  default     = "local"
}
