# Every Google resource uses this project and region unless it says otherwise
provider "google" {
  project = var.project_id
  region  = var.region
}
