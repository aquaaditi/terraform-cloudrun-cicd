# Two identical services: staging (auto-deployed by CI) and production (manual approval).
locals {
  environments = {
    staging    = { max_instances = 1 }
    production = { max_instances = 2 }
  }

  # Google's tiny demo image. Terraform needs SOME image to create a service before CI has
  # built ours; after that CI deploys the real image tagged with the commit SHA.
  placeholder_image = "us-docker.pkg.dev/cloudrun/container/hello"
}

resource "google_cloud_run_v2_service" "app" {
  for_each = local.environments

  name                = "${var.service_name}-${each.key}"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false # allow `terraform destroy` to clean up

  template {
    service_account                  = google_service_account.runtime.email
    max_instance_request_concurrency = 80
    timeout                          = "15s"

    scaling {
      min_instance_count = 0                        # scale to zero: no cost while idle
      max_instance_count = each.value.max_instances # hard cap on cost
    }

    containers {
      image = local.placeholder_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true # billed for CPU only while handling requests
        startup_cpu_boost = true # faster cold starts
      }

      # The API key is injected from Secret Manager at startup, never baked into the image
      env {
        name = "OPENWEATHER_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openweather.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    # CI owns the image from now on. Without this, every `terraform apply` would roll the
    # service back to the placeholder. client/client_version are set by gcloud deploys.
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.runtime_reads_key, # the key must be readable at startup
  ]
}

# Anyone on the internet can open the website
resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = google_cloud_run_v2_service.app

  name     = each.value.name
  location = each.value.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# The CI deployer may deploy new revisions to these two services only
resource "google_cloud_run_v2_service_iam_member" "deployer" {
  for_each = google_cloud_run_v2_service.app

  name     = each.value.name
  location = each.value.location
  role     = "roles/run.developer"
  member   = google_service_account.deployer.member
}
