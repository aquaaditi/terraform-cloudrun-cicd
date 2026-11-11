variable "project_id" {
  description = "GCP project ID that hosts SkyCast"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project IDs are 6-30 characters: lowercase letters, digits and hyphens."
  }
}

variable "region" {
  description = "Region for Cloud Run and Artifact Registry"
  type        = string
  default     = "asia-south1" # Mumbai
}

variable "service_name" {
  description = "Base name for the Cloud Run services, repository and service accounts"
  type        = string
  default     = "skycast"
}

variable "github_repository" {
  description = "GitHub repo (owner/name) allowed to deploy through Workload Identity Federation"
  type        = string
  default     = "aquaaditi/terraform-cloudrun-cicd"
}

variable "alert_email" {
  description = "Email address that receives downtime alerts"
  type        = string
}
