resource "google_compute_network" "main" {
  name                    = local.vpc_name
  auto_create_subnetworks = false
  project                 = var.project_id

  depends_on = [google_project_service.enabled]
}

resource "google_compute_subnetwork" "gke" {
  name                     = local.subnet_gke_name
  ip_cidr_range            = var.subnet_gke_cidr
  region                   = var.region
  network                  = google_compute_network.main.id
  project                  = var.project_id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = local.pods_secondary_range_name
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = local.svcs_secondary_range_name
    ip_cidr_range = var.services_cidr
  }
}

resource "google_compute_subnetwork" "proxy" {
  name          = local.subnet_proxy_name
  ip_cidr_range = var.subnet_proxy_cidr
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

resource "google_compute_router" "nat_router" {
  name    = local.router_name
  region  = var.region
  network = google_compute_network.main.id
  project = var.project_id
}

resource "google_compute_router_nat" "nat" {
  name                               = local.nat_name
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

resource "google_compute_global_address" "private_service_access_range" {
  name          = local.project_services_psa_range
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_access_range.name]

  depends_on = [google_project_service.enabled]
}

resource "google_compute_global_address" "ingress_public_ip" {
  name    = local.static_ip_name
  project = var.project_id
}
