locals {
  prefix = "wa-${var.environment}"

  vpc_name                    = coalesce(var.vpc_name_override, "${local.prefix}-vpc")
  subnet_gke_name             = "${local.prefix}-subnet-gke"
  subnet_proxy_name           = "${local.prefix}-subnet-proxy"
  router_name                 = "${local.prefix}-router"
  nat_name                    = "${local.prefix}-nat"
  cluster_name                = coalesce(var.gke_cluster_name_override, "${local.prefix}-gke")
  artifact_registry_repo_id   = coalesce(var.artifact_registry_repository_id_override, "${local.prefix}-repo")
  sql_instance_name           = coalesce(var.sql_instance_name_override, "${local.prefix}-pg")
  static_ip_name              = "${local.prefix}-ip"
  secret_prefix               = "${local.prefix}"
  project_services_psa_range  = "${local.prefix}-sql-psa-range"
  pods_secondary_range_name   = "${local.prefix}-pods"
  svcs_secondary_range_name   = "${local.prefix}-services"
  backup_bucket_default_name  = "${local.prefix}-backups-${random_id.bucket_suffix.hex}"
  backup_bucket_name          = coalesce(var.backup_bucket_name_override, local.backup_bucket_default_name)
  app_domain_fqdn             = "${var.domain}."
  create_dns_record           = var.enable_dns_record && var.dns_managed_zone != null
  service_account_api_name    = "${local.prefix}-api-runtime"
  service_account_web_name    = "${local.prefix}-web-runtime"
  service_account_nodes_name  = "${local.prefix}-gke-nodes"
  service_account_gha_name    = "${local.prefix}-gha-deployer"
  wi_pool_id                  = "github"
  wi_provider_id              = "whatsapp-platform"
}

resource "random_id" "bucket_suffix" {
  byte_length = 3
}
