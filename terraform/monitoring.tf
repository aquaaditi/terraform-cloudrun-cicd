# Uptime check on production /health + an email alert when it fails.
locals {
  production_host = trimprefix(google_cloud_run_v2_service.app["production"].uri, "https://")
}

resource "google_monitoring_uptime_check_config" "production_health" {
  display_name = "SkyCast production /health"
  timeout      = "10s"
  period       = "900s" # every 15 minutes: enough for a demo, keeps requests and cost tiny

  # 3 is the minimum number of checker regions
  selected_regions = ["USA", "EUROPE", "ASIA_PACIFIC"]

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = local.production_host
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_monitoring_notification_channel" "email" {
  display_name = "SkyCast alerts email"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }

  depends_on = [google_project_service.apis]
}

resource "google_monitoring_alert_policy" "production_down" {
  display_name = "SkyCast production is down"
  combiner     = "OR"

  conditions {
    display_name = "/health failing from 2 or more regions"

    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.production_health.uptime_check_id}\" AND resource.type=\"uptime_url\""
      comparison      = "COMPARISON_GT"
      threshold_value = 1 # more than 1 failing region, so one region's network blip doesn't page us
      duration        = "0s"

      aggregations {
        alignment_period     = "1200s"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        cross_series_reducer = "REDUCE_COUNT_FALSE" # count regions where the check failed
        group_by_fields      = ["resource.label.*"]
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  documentation {
    mime_type = "text/markdown"
    content   = "SkyCast production failed its /health uptime check. Check the logs in Cloud Run, then follow the rollback steps in the README (send traffic back to the previous revision)."
  }
}
