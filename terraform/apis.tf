# New projects have most APIs switched off. Enable only what SkyCast needs.
locals {
  required_apis = [
    "run.googleapis.com",                  # Cloud Run
    "artifactregistry.googleapis.com",     # Docker image registry
    "secretmanager.googleapis.com",        # OPENWEATHER_API_KEY
    "iam.googleapis.com",                  # service accounts
    "iamcredentials.googleapis.com",       # short-lived tokens for GitHub Actions
    "sts.googleapis.com",                  # Workload Identity Federation token exchange
    "monitoring.googleapis.com",           # uptime check + alert policy
    "cloudresourcemanager.googleapis.com", # project-level IAM bindings
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.required_apis) # one resource per API

  service = each.value

  # Leave APIs on after `terraform destroy`; turning them off can break other things
  disable_on_destroy = false
}
