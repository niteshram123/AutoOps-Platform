resource "kubernetes_namespace" "autoops" {
  for_each = toset(var.environments)

  metadata {
    name = "${var.project_name}-${each.value}"

    labels = {
      environment  = each.value
      project      = var.project_name
      "managed-by" = "terraform"
    }

    annotations = {
      "autoops.io/managed-by" = "terraform"
    }
  }
}

resource "kubernetes_resource_quota" "autoops" {
  for_each = toset(["staging", "production"])

  metadata {
    name      = "autoops-quota"
    namespace = kubernetes_namespace.autoops[each.value].metadata[0].name
  }

  spec {
    hard = each.value == "production" ? {
      "requests.cpu"    = "4"
      "requests.memory" = "8Gi"
      "limits.cpu"      = "8"
      "limits.memory"   = "16Gi"
      "count/pods"      = "50"
    } : {
      "requests.cpu"    = "2"
      "requests.memory" = "4Gi"
      "limits.cpu"      = "4"
      "limits.memory"   = "8Gi"
      "count/pods"      = "20"
    }
  }
}
