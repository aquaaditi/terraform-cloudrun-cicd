# Rollback Runbook

What to do when a release breaks SkyCast in production. Roll back first, investigate second.

Cloud Run keeps every deployed **revision**. Rolling back means sending traffic to an older
revision that is known to be good. No rebuild is needed, so it takes seconds.

## 1. Confirm the problem

```powershell
curl.exe -s https://skycast-production-4kivggshpa-el.a.run.app/health
gcloud run services logs read skycast-production --region asia-south1 --limit 50
```

The uptime check also emails an alert when `/health` fails from 2 or more regions.

## 2. Option A: Shift traffic to the previous revision (fastest, seconds)

List revisions, newest first, and note the last good one:

```powershell
gcloud run revisions list --service skycast-production --region asia-south1
```

Send 100% of traffic to it:

```powershell
gcloud run services update-traffic skycast-production --region asia-south1 --to-revisions <GOOD_REVISION>=100
```

Console alternative: **Cloud Run → skycast-production → Revisions → Manage traffic**.

## 3. Option B: Revert the commit through the pipeline (minutes)

Best when the bad change should be undone in git as well:

```powershell
git switch main
git pull
git switch -c revert/<short-description>
git revert <BAD_COMMIT_SHA>
git push -u origin revert/<short-description>
```

Open a pull request, merge it, and approve the production deployment. The pipeline builds and
deploys the reverted code like any other release.

## 4. Option C: Redeploy a known-good image by its commit SHA

Every image is tagged with the commit it was built from, and Artifact Registry keeps the 10
newest images:

```powershell
gcloud artifacts docker images list asia-south1-docker.pkg.dev/<PROJECT_ID>/skycast/skycast --include-tags
gcloud run deploy skycast-production --region asia-south1 --image asia-south1-docker.pkg.dev/<PROJECT_ID>/skycast/skycast:<GOOD_SHA>
```

## 5. Verify

```powershell
curl.exe -s https://skycast-production-4kivggshpa-el.a.run.app/health
gcloud run services describe skycast-production --region asia-south1 --format="value(status.traffic)"
```

Check that `/health` returns `{"status":"ok"}`, a city search works, and traffic points at the
expected revision.

## 6. After the incident

1. Fix the bug on a branch and release it through the normal pipeline (staging first).
2. If traffic was pinned in Option A, send it back to the newest revision once the fix is live:
   ```powershell
   gcloud run services update-traffic skycast-production --region asia-south1 --to-latest
   ```
3. Write down what happened, how it was detected, how long it lasted and how to prevent it.

## Practice

Rehearse on **staging**, never production:

```powershell
gcloud run revisions list --service skycast-staging --region asia-south1
gcloud run services update-traffic skycast-staging --region asia-south1 --to-revisions <OLDER_REVISION>=100
gcloud run services update-traffic skycast-staging --region asia-south1 --to-latest
```
