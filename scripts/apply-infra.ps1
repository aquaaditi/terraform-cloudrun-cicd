<#
.SYNOPSIS
  Creates SkyCast's GCP infrastructure with Terraform, including the API key secret.

.DESCRIPTION
  Uses your existing `gcloud auth login` session (as a short-lived access token), so no
  separate Application Default Credentials login is needed. Order matters: the secret must
  have a value before Cloud Run can start, so it is created first, then filled, then
  everything else is applied. Safe to re-run.

  Run `terraform init -backend-config="bucket=<project-id>-tfstate"` in terraform/ first.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\apply-infra.ps1
#>
param(
  [string] $SecretId = 'openweather-api-key'
)

function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }

function Assert-Success($what) {
  if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location (Join-Path $repoRoot 'terraform')

# Terraform reads this token instead of Application Default Credentials (valid ~1 hour)
Step 'Using your gcloud login for Terraform'
$env:GOOGLE_OAUTH_ACCESS_TOKEN = gcloud auth print-access-token
Assert-Success 'gcloud auth print-access-token (run: gcloud auth login)'

# ---------- 1. The secret container (needs a value before Cloud Run can start) ----------
Step 'Creating the secret container (type yes)'
terraform apply -target='google_secret_manager_secret.openweather'
Assert-Success 'terraform apply (secret)'

# ---------- 2. The secret value, straight from .env (never through Terraform) ----------
Step "Adding the API key to Secret Manager ($SecretId)"
$existing = gcloud secrets versions list $SecretId --filter='state=enabled' --limit=1 --format='value(name)' 2>$null
if ($existing) {
  Write-Host 'A value already exists - skipping'
} else {
  $line = Get-Content (Join-Path $repoRoot '.env') | Where-Object { $_ -match '^OPENWEATHER_API_KEY=' }
  if (-not $line) { throw 'OPENWEATHER_API_KEY not found in .env' }
  $key = ($line -split '=', 2)[1].Trim()

  # Write without a trailing newline (a newline would make the key invalid), upload, delete
  $tmp = Join-Path $env:TEMP 'skycast-owm-key.txt'
  [IO.File]::WriteAllText($tmp, $key)
  try {
    gcloud secrets versions add $SecretId --data-file=$tmp
    Assert-Success 'gcloud secrets versions add'
  } finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
  }
}

# ---------- 3. Everything else ----------
Step 'Creating all infrastructure (type yes)'
terraform apply
Assert-Success 'terraform apply'

Step 'Outputs (copy these for GitHub Actions)'
terraform output
