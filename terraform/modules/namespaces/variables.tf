variable "environments" {
  description = "List of environment names to create namespaces for"
  type        = list(string)
  default     = ["staging", "production", "ops"]
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "autoops"
}
