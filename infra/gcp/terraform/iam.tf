resource "google_service_account" "api_runtime" {
  project      = var.project_id
  account_id   = local.service_account_api_name
  display_name = "WhatsApp API Runtime (${var.environment})"
}

resource "google_service_account" "web_runtime" {
  project      = var.project_id
  account_id   = local.service_account_web_name
  display_name = "WhatsApp WEB Runtime (${var.environment})"
}

resource "google_service_account" "gke_nodes" {
  project      = var.project_id
  account_id   = local.service_account_nodes_name
  display_name = "WhatsApp GKE Nodes (${var.environment})"
}

resource "google_service_account" "gha_deployer" {
  project      = var.project_id
  account_id   = local.service_account_gha_name
  display_name = "GitHub Actions Deployer (${var.environment})"
}

resource "google_project_iam_member" "api_runtime_roles" {
  for_each = toset([
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api_runtime.email}"
}

resource "google_project_iam_member" "web_runtime_roles" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web_runtime.email}"
}

resource "google_project_iam_member" "gke_nodes_roles" {
  for_each = toset([
    "roles/artifactregistry.reader",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/stackdriver.resourceMetadata.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gha_deployer_roles" {
  for_each = toset([
    "roles/artifactregistry.writer",
    "roles/container.admin",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gha_deployer.email}"
}
