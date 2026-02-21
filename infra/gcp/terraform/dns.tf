resource "google_dns_record_set" "app_domain_a" {
  count = local.create_dns_record ? 1 : 0

  project      = var.project_id
  managed_zone = var.dns_managed_zone
  name         = local.app_domain_fqdn
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.ingress_public_ip.address]
}
