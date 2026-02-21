resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = local.artifact_registry_repo_id
  description   = "Docker repository para whatsapp platform ${var.environment}"
  format        = "DOCKER"

  depends_on = [google_project_service.enabled]
}
