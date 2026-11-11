# Terraform creates the secret CONTAINER only. The value is added once with gcloud:
#   gcloud secrets versions add openweather-api-key --data-file=-
# Never manage the value here: everything Terraform manages is stored in plain text in state.
resource "google_secret_manager_secret" "openweather" {
  secret_id = "openweather-api-key"

  replication {
    auto {} # Google picks the storage locations
  }

  depends_on = [google_project_service.apis]
}

# Only the Cloud Run runtime identity may read this one secret
resource "google_secret_manager_secret_iam_member" "runtime_reads_key" {
  secret_id = google_secret_manager_secret.openweather.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.runtime.member
}
