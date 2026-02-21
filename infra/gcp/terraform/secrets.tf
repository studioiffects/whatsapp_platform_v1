resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "random_password" "nextauth_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "${local.secret_prefix}-jwt-secret"
  project   = var.project_id

  replication {
    auto {}
  }

  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

resource "google_secret_manager_secret" "nextauth_secret" {
  secret_id = "${local.secret_prefix}-nextauth-secret"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "nextauth_secret" {
  secret      = google_secret_manager_secret.nextauth_secret.id
  secret_data = random_password.nextauth_secret.result
}

resource "google_secret_manager_secret" "sql_password" {
  secret_id = "${local.secret_prefix}-sql-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "sql_password" {
  secret      = google_secret_manager_secret.sql_password.id
  secret_data = random_password.sql_password.result
}

resource "google_secret_manager_secret" "domain" {
  secret_id = "${local.secret_prefix}-domain"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "domain" {
  secret      = google_secret_manager_secret.domain.id
  secret_data = var.domain
}
