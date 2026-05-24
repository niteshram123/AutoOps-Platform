# ── Service Account for each namespace ───────────────────────
resource "kubernetes_service_account" "autoops" {
  for_each = toset(var.namespaces)

  metadata {
    name      = "autoops-sa"
    namespace = each.value
    labels = {
      "managed-by" = "terraform"
    }
  }
}

# ── Role: allows healing-service to manage deployments ───────
resource "kubernetes_role" "healing_role" {
  for_each = toset(var.namespaces)

  metadata {
    name      = "autoops-healing-role"
    namespace = each.value
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets"]
    verbs      = ["get", "list", "watch", "patch", "update"]
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "pods/log"]
    verbs      = ["get", "list", "watch", "delete"]
  }

  rule {
    api_groups = ["autoscaling"]
    resources  = ["horizontalpodautoscalers"]
    verbs      = ["get", "list", "watch"]
  }
}

# ── RoleBinding ───────────────────────────────────────────────
resource "kubernetes_role_binding" "healing_binding" {
  for_each = toset(var.namespaces)

  metadata {
    name      = "autoops-healing-binding"
    namespace = each.value
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.healing_role[each.value].metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.autoops[each.value].metadata[0].name
    namespace = each.value
  }
}
