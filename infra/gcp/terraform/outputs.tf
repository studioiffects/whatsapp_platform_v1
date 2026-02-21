output "region" {
  value = var.region
}

output "vpc_name" {
  value = google_compute_network.main.name
}

output "gke_cluster_name" {
  value = google_container_cluster.main.name
}

output "gke_cluster_location" {
  value = google_container_cluster.main.location
}

output "gke_namespace" {
  value = var.gke_namespace
}

output "gke_get_credentials_command" {
  value = "gcloud container clusters get-credentials ${google_container_cluster.main.name} --region ${google_container_cluster.main.location} --project ${var.project_id}"
}

output "artifact_registry_repository_id" {
  value = google_artifact_registry_repository.docker.repository_id
}

output "api_image_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/api"
}

output "web_image_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}/web"
}

output "cloud_sql_instance_name" {
  value = google_sql_database_instance.main.name
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "cloud_sql_private_ip" {
  value = google_sql_database_instance.main.private_ip_address
}

output "cloud_sql_database_name" {
  value = google_sql_database.app.name
}

output "cloud_sql_database_user" {
  value = google_sql_user.app.name
}

output "cloud_sql_database_password" {
  value     = random_password.sql_password.result
  sensitive = true
}

output "backup_bucket_name" {
  value = google_storage_bucket.backups.name
}

output "ingress_static_ip_name" {
  value = google_compute_global_address.ingress_public_ip.name
}

output "ingress_static_ip_address" {
  value = google_compute_global_address.ingress_public_ip.address
}

output "api_runtime_gsa_email" {
  value = google_service_account.api_runtime.email
}

output "web_runtime_gsa_email" {
  value = google_service_account.web_runtime.email
}

output "gha_deployer_gsa_email" {
  value = google_service_account.gha_deployer.email
}

output "workload_identity_provider_name" {
  value = google_iam_workload_identity_pool_provider.github_oidc.name
}

output "secret_names" {
  value = {
    jwt_secret      = google_secret_manager_secret.jwt_secret.secret_id
    nextauth_secret = google_secret_manager_secret.nextauth_secret.secret_id
    sql_password    = google_secret_manager_secret.sql_password.secret_id
    domain          = google_secret_manager_secret.domain.secret_id
  }
}
