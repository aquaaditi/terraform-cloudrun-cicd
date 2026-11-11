terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11" # 8.11 or newer, but never a breaking 9.x
    }
  }

  # State lives in a versioned GCS bucket, not on a laptop.
  # The bucket name is passed at init time (backend blocks cannot use variables):
  #   terraform init -backend-config="bucket=<project-id>-tfstate"
  backend "gcs" {
    prefix = "skycast"
  }
}
