# Private Docker registry for SkyCast images (CI pushes here, Cloud Run pulls from here)
resource "google_artifact_registry_repository" "images" {
  repository_id = var.service_name
  location      = var.region
  format        = "DOCKER"
  description   = "SkyCast container images, tagged with the git commit SHA"

  # Keep storage under the 0.5 GB free tier: keep the 10 newest images for rollbacks,
  # delete untagged leftovers after 7 days. KEEP rules win over DELETE rules.
  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "keep-10-newest"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-old-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s" # 7 days
    }
  }

  depends_on = [google_project_service.apis]
}
