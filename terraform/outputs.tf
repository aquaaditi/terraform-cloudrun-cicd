# Printed after `terraform apply`. These go into GitHub repository variables (not secrets:
# none of them grant access on their own).

output "staging_url" {
  description = "Live URL of the staging service"
  value       = google_cloud_run_v2_service.app["staging"].uri
}

output "production_url" {
  description = "Live URL of the production service"
  value       = google_cloud_run_v2_service.app["production"].uri
}

output "image_repository" {
  description = "Where CI pushes images: <this>/skycast:<git-sha>"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "workload_identity_provider" {
  description = "Full provider name for google-github-actions/auth (GCP_WIF_PROVIDER)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "Service account GitHub Actions impersonates (GCP_DEPLOYER_SA)"
  value       = google_service_account.deployer.email
}
