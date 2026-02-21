variable "project_id" {
  description = "ID del proyecto GCP."
  type        = string
}

variable "region" {
  description = "Region principal de despliegue."
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Ambiente de despliegue (dev, staging, prod)."
  type        = string
  default     = "prod"
}

variable "domain" {
  description = "Dominio publico principal de la plataforma."
  type        = string
}

variable "dns_managed_zone" {
  description = "Nombre de la managed zone en Cloud DNS. Si es null, no se crea registro DNS."
  type        = string
  default     = null
}

variable "github_repository" {
  description = "Repositorio GitHub autorizado para OIDC (owner/repo)."
  type        = string
  default     = "studioiffects/whatsapp_platform_v1"
}

variable "vpc_name_override" {
  description = "Nombre personalizado para la VPC. Si es null, se usa naming por defecto."
  type        = string
  default     = null
}

variable "subnet_gke_cidr" {
  description = "CIDR de subnet de nodos GKE."
  type        = string
  default     = "10.40.0.0/20"
}

variable "subnet_proxy_cidr" {
  description = "CIDR de subnet REGIONAL_MANAGED_PROXY para Application Load Balancer."
  type        = string
  default     = "10.40.16.0/24"
}

variable "pods_cidr" {
  description = "CIDR secundario para Pods de GKE."
  type        = string
  default     = "10.44.0.0/14"
}

variable "services_cidr" {
  description = "CIDR secundario para Services de GKE."
  type        = string
  default     = "10.48.0.0/20"
}

variable "master_ipv4_cidr_block" {
  description = "Rango CIDR para el plano de control privado de GKE."
  type        = string
  default     = "172.16.0.0/28"
}

variable "gke_cluster_name_override" {
  description = "Nombre personalizado del cluster GKE. Si es null se autogenera."
  type        = string
  default     = null
}

variable "gke_release_channel" {
  description = "Canal de release de GKE."
  type        = string
  default     = "REGULAR"

  validation {
    condition     = contains(["RAPID", "REGULAR", "STABLE"], var.gke_release_channel)
    error_message = "gke_release_channel debe ser RAPID, REGULAR o STABLE."
  }
}

variable "gke_node_machine_type" {
  description = "Tipo de maquina para node pool."
  type        = string
  default     = "e2-standard-4"
}

variable "gke_node_min_count" {
  description = "Minimo de nodos del node pool."
  type        = number
  default     = 1
}

variable "gke_node_max_count" {
  description = "Maximo de nodos del node pool."
  type        = number
  default     = 6
}

variable "gke_node_disk_size_gb" {
  description = "Tamano de disco por nodo GKE en GB."
  type        = number
  default     = 100
}

variable "gke_namespace" {
  description = "Namespace Kubernetes principal de la aplicacion."
  type        = string
  default     = "whatsapp-prod"
}

variable "artifact_registry_repository_id_override" {
  description = "ID personalizado del repositorio Artifact Registry. Si es null se autogenera."
  type        = string
  default     = null
}

variable "backup_bucket_name_override" {
  description = "Nombre personalizado del bucket de backups. Si es null se autogenera."
  type        = string
  default     = null
}

variable "sql_instance_name_override" {
  description = "Nombre personalizado de Cloud SQL instance. Si es null se autogenera."
  type        = string
  default     = null
}

variable "sql_database_name" {
  description = "Nombre de la base de datos de la aplicacion."
  type        = string
  default     = "whatsapp_platform"
}

variable "sql_database_user" {
  description = "Usuario aplicacion para Cloud SQL."
  type        = string
  default     = "wa_app_user"
}

variable "sql_tier" {
  description = "Tier de Cloud SQL."
  type        = string
  default     = "db-custom-2-8192"
}

variable "sql_disk_size_gb" {
  description = "Tamano de disco Cloud SQL en GB."
  type        = number
  default     = 100
}

variable "sql_availability_type" {
  description = "Tipo de alta disponibilidad Cloud SQL."
  type        = string
  default     = "REGIONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.sql_availability_type)
    error_message = "sql_availability_type debe ser ZONAL o REGIONAL."
  }
}

variable "sql_backup_start_time" {
  description = "Hora UTC de backup automatico Cloud SQL."
  type        = string
  default     = "03:00"
}

variable "sql_deletion_protection" {
  description = "Proteccion contra borrado accidental Cloud SQL."
  type        = bool
  default     = true
}

variable "bucket_force_destroy" {
  description = "Permite destruir bucket aunque tenga objetos."
  type        = bool
  default     = false
}

variable "node_pool_initial_node_count" {
  description = "Cantidad inicial de nodos para el node pool."
  type        = number
  default     = 1
}

variable "enable_dns_record" {
  description = "Si true y dns_managed_zone no es null, crea el registro DNS A."
  type        = bool
  default     = true
}
