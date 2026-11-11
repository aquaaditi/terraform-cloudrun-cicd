# Two identities, each with only the permissions it needs (least privilege).
# Permissions are granted on specific resources, never project-wide.

# What the SkyCast container runs as. Its only permission: read one secret (see secrets.tf).
resource "google_service_account" "runtime" {
  account_id   = "${var.service_name}-run"
  display_name = "SkyCast Cloud Run runtime"
  description  = "Identity of the running container. Can only read the OpenWeatherMap API key."

  depends_on = [google_project_service.apis]
}

# What GitHub Actions becomes through Workload Identity Federation (see wif.tf).
resource "google_service_account" "deployer" {
  account_id   = "${var.service_name}-deployer"
  display_name = "SkyCast CI/CD deployer"
  description  = "Used by GitHub Actions to push images and deploy SkyCast. No secret access."

  depends_on = [google_project_service.apis]
}

# Deployer may push images to this one repository only
resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}

# Deployer may deploy services that RUN AS the runtime identity ("act as" it).
# Without this, it could not attach skycast-run to a new revision.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}
