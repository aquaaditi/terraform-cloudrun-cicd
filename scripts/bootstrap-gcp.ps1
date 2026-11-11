<#
.SYNOPSIS
  One-time GCP setup that Terraform needs before it can run (the "bootstrap").

.DESCRIPTION
  Creates the project, links billing, creates a budget alert, logs Terraform in,
  creates the versioned Terraform state bucket and writes terraform/terraform.tfvars.
  Safe to re-run: every step skips work that is already done.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-gcp.ps1 -ProjectId skycast-aditi-1111 -AlertEmail you@example.com
#>
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
  [string] $ProjectId,

  [Parameter(Mandatory)]
  [string] $AlertEmail,

  [string] $BillingAccount,    # optional: found automatically if you have exactly one
  [int]    $BudgetAmount = 500,
  [string] $Currency = 'INR'   # must match your billing account's currency
)

function Step($message) { Write-Host "`n==> $message" -ForegroundColor Cyan }

# Runs gcloud and stops the script if it fails
function Invoke-Gcloud {
  & gcloud @args
  if ($LASTEXITCODE -ne 0) { throw "gcloud $($args -join ' ') failed (exit code $LASTEXITCODE)" }
}

# ---------- 1. gcloud login ----------
Step 'Checking gcloud login'
$account = gcloud auth list --filter=status:ACTIVE --format='value(account)'
if (-not $account) {
  Write-Host 'Not logged in - a browser window will open. Click Allow.'
  Invoke-Gcloud auth login
} else {
  Write-Host "Logged in as $account"
}

# ---------- 2. Project ----------
Step "Project $ProjectId"
$existing = gcloud projects describe $ProjectId --format='value(projectId)' 2>$null
if ($existing) {
  Write-Host 'Already exists - skipping'
} else {
  Invoke-Gcloud projects create $ProjectId --name='SkyCast'
}

# ---------- 3. Billing ----------
Step 'Linking billing'
if (-not $BillingAccount) {
  $accounts = @(gcloud billing accounts list --filter='open=true' --format='value(name)')
  if ($accounts.Count -eq 0) {
    throw 'No billing account found. Create one at https://console.cloud.google.com/billing, then run this script again.'
  }
  if ($accounts.Count -gt 1) {
    throw "Several billing accounts found ($($accounts -join ', ')). Run again with -BillingAccount <ID>."
  }
  $BillingAccount = $accounts[0] -replace '^billingAccounts/', ''
}
Invoke-Gcloud billing projects link $ProjectId --billing-account=$BillingAccount
Invoke-Gcloud config set project $ProjectId

# ---------- 4. Budget alert (before any resources exist) ----------
Step "Budget alert: $BudgetAmount $Currency with emails at 50%, 90% and 100%"
Invoke-Gcloud services enable billingbudgets.googleapis.com --project=$ProjectId
$budgets = gcloud billing budgets list --billing-account=$BillingAccount --format='value(displayName)' 2>$null
if ($budgets -contains 'SkyCast budget') {
  Write-Host 'Already exists - skipping'
} else {
  & gcloud billing budgets create --billing-account=$BillingAccount --display-name='SkyCast budget' `
    --budget-amount="$BudgetAmount$Currency" --filter-projects="projects/$ProjectId" `
    --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Could not create the budget (often a currency mismatch). Create it in the console: Billing > Budgets & alerts.'
  }
}

# ---------- 5. Credentials for Terraform ----------
Step 'Terraform credentials (Application Default Credentials)'
gcloud auth application-default print-access-token *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'A browser window will open. Click Allow.'
  Invoke-Gcloud auth application-default login
} else {
  Write-Host 'Already logged in - skipping'
}
Invoke-Gcloud auth application-default set-quota-project $ProjectId

# ---------- 6. Terraform state bucket ----------
$bucket = "gs://$ProjectId-tfstate"
Step "State bucket $bucket"
$found = gcloud storage buckets describe $bucket --format='value(name)' 2>$null
if ($found) {
  Write-Host 'Already exists - skipping create'
} else {
  # us-central1: Cloud Storage's always-free tier covers US regions
  Invoke-Gcloud storage buckets create $bucket --location=us-central1 --uniform-bucket-level-access
}
Invoke-Gcloud storage buckets update $bucket --versioning # keep old state versions for recovery

# ---------- 7. terraform.tfvars (gitignored) ----------
$tfvars = Join-Path $PSScriptRoot '..\terraform\terraform.tfvars'
Step 'terraform/terraform.tfvars'
if (Test-Path $tfvars) {
  Write-Host 'Already exists - not overwriting'
} else {
  "project_id  = `"$ProjectId`"`nalert_email = `"$AlertEmail`"`n" | Set-Content -Path $tfvars -Encoding ascii -NoNewline
  Write-Host 'Created'
}

Write-Host "`nBootstrap complete. Next:" -ForegroundColor Green
Write-Host "  cd terraform"
Write-Host "  terraform init -backend-config=`"bucket=$ProjectId-tfstate`""
