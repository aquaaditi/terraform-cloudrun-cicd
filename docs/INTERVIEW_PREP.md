# Interview Prep

Questions and model answers based on what was actually built in this project.
Practise answering out loud before reading the answer.

---

## Project overview

**Q: Walk me through your project architecture.**
A: A push to main triggers GitHub Actions. The test job runs ESLint and Jest tests. If they pass, the deploy job authenticates to GCP with Workload Identity Federation, so no service account keys are stored in GitHub. It builds a Docker image tagged with the commit SHA, pushes it to Artifact Registry and deploys to Cloud Run staging automatically. Production needs manual approval through a GitHub Environment. The API key comes from Secret Manager, and a Cloud Monitoring uptime check on /health emails me if the app goes down. All GCP infrastructure is created with Terraform.

---

## Git and security

**Q: Why is a `VITE_`-prefixed environment variable not a safe place for an API key?**
A: Vite copies `VITE_*` values into the JavaScript bundle at build time, so they end up in the browser and anyone can read them in DevTools. Secrets must stay on a server. That's why I added an Express backend that adds the key and calls the API on the user's behalf.

**Q: Why should you never commit `terraform.tfstate`?**
A: State can contain resource attributes, including secrets, in plain text. Committed state also goes stale and conflicts when two people apply changes. Teams store state in a remote backend such as a GCS bucket, which supports locking.

**Q: You accidentally committed an API key. Is deleting it in a new commit enough?**
A: No. It's still in git history and may already be cloned or scanned by bots. First revoke and rotate the key. Then rewrite history with `git filter-repo` or BFG if needed, and add protections such as `.gitignore` rules and secret scanning.

**Q: Tell me about a security issue you caught in this project.** *(real story)*
A: The app I started from read the API key from a `VITE_` variable, which exposed it in the browser bundle, and its `.gitignore` didn't ignore `.env`. Before the first commit I rewrote the `.gitignore`, verified with `git check-ignore`, scanned staged content for the key value, and rotated the key. Later I moved the API call to the backend.

**Q: Why do you commit `package-lock.json` and `.terraform.lock.hcl`?**
A: Lock files pin exact dependency versions, so every machine and the CI pipeline install the same thing. That makes builds reproducible and avoids "works on my machine" problems.

**Q: What is `.gitattributes` used for in your repo?**
A: It forces LF line endings. I develop on Windows, which uses CRLF, but the code runs in Linux containers and on Linux CI runners. Consistent line endings prevent noisy diffs and broken scripts.

---

## Docker

**Q: How does Docker run on Windows?**
A: Containers share the host's Linux kernel, and Windows doesn't have one. Docker Desktop runs a real Linux kernel through WSL 2, a lightweight VM, and the containers run there. It needs CPU virtualization enabled.

**Q: Explain Docker's architecture.**
A: It's client-server. The `docker` CLI sends requests to the Docker daemon. The daemon pulls images from a registry, creates containers from them and manages their lifecycle. "Error response from daemon" means the CLI is fine but the daemon has a problem.

**Q: Describe a setup problem you debugged.** *(real story)*
A: `docker run` failed with "Docker Desktop is unable to start". I checked Docker's backend logs and found it had started before WSL was installed, cached the "WSL not installed" error and never retried. After confirming WSL 2 was running with `wsl --list --verbose`, I fully restarted Docker Desktop and verified with `docker run hello-world`.

---

## Node.js and Express

**Q: Why did you split the server into `app.js` and `index.js`?**
A: `app.js` builds the Express app and exports it without listening on a port. `index.js` starts it. Tests can import the app and send requests through supertest without opening a real port, which keeps tests fast and avoids port conflicts.

**Q: Why does the app read `process.env.PORT`?**
A: Cloud Run decides which port the container must listen on and passes it in the `PORT` environment variable. Hardcoding a port would break that contract. 8080 is only the local fallback.

**Q: What should a health check endpoint do?**
A: Return 200 quickly if the service itself is alive. It should not depend on external APIs. Otherwise an OpenWeatherMap outage would make Cloud Run or the monitoring think our app is down and trigger false alerts.

**Q: Why disable the `X-Powered-By` header?**
A: It advertises that the app runs on Express. Hiding it gives attackers less information for targeting known framework vulnerabilities. It's a small defence-in-depth step.

**Q: How do you load environment variables locally without committing secrets?**
A: Real values live in `.env`, which is gitignored, and `.env.example` documents the variable names. Node 20+ can load the file natively with `--env-file=.env`, so I didn't need the `dotenv` package. In Cloud Run the value comes from Secret Manager instead.

**Q: How does your app keep the OpenWeatherMap API key out of the browser?**
A: The browser calls my own endpoint, `/api/weather`. The Express server adds the key and calls OpenWeatherMap server-side, then returns the result. The key only exists as a server environment variable, from `.env` locally and Secret Manager on Cloud Run. I also verified that the key never appears in any response body or header.

**Q: Which HTTP status codes does your API return, and why 502?**
A: 400 for invalid input, 404 when the city isn't found, 500 when my server is misconfigured (for example the key is missing), and 502 Bad Gateway when the upstream API fails or rejects the request. 502 tells the caller that the problem is in a service behind mine, not in their request or my code.

**Q: Why validate input when you're just passing it to another API?**
A: User input ends up in a request my server sends, so it must be checked. I reject empty or overly long city names and out-of-range coordinates with a 400 before making any external call. That saves API quota, and I build the URL with `URLSearchParams` so special characters can't change the request.

**Q: Why add a timeout to an outbound HTTP call?**
A: Without one, a slow upstream API can keep requests open, tying up server resources and leaving users waiting. With `AbortSignal.timeout(5000)` the call fails fast and the user gets a clear 502. On Cloud Run that also stops a slow dependency from keeping instances busy and costing money.

**Q: How do you handle errors without leaking sensitive information?**
A: Users get a short generic message. Details like the upstream status code go to the server logs for me, but I never log the request URL, because it contains the API key. Logs are widely accessible, so they must never contain secrets.

**Q: What is dependency injection, and where did you use it?**
A: Passing a component what it needs instead of letting it fetch things itself. My `createApp` function accepts the API key as an option and defaults to the environment variable, so tests can inject a fake key without touching real environment variables or real secrets.

**Q: What is `.env.example` for?**
A: `.env` holds real secrets and is gitignored, so `.env.example` is a committed template listing the required variable names with placeholder values. It documents the configuration for new developers. A `!.env.example` exception in `.gitignore` keeps it tracked.

**Q: Why does Express serve the React build instead of hosting the frontend separately?**
A: One container serves both the static frontend and the API on the same origin. That means one service to build, deploy and monitor, and no CORS configuration, because the browser calls the same host it loaded the page from. For a small app it's simpler and cheaper. At larger scale I'd consider putting static files on Cloud Storage with a CDN.

**Q: Why are the API routes registered before `express.static`?**
A: Express matches middleware and routes in the order they're registered. With the API routes first, `/health` and `/api/*` always reach my handlers, and the static middleware only handles everything else.

**Q: What is CORS?**
A: Cross-Origin Resource Sharing is a browser security rule. A page from one origin (scheme, host and port) can't read responses from an API on another origin unless that API sends headers allowing it. Serving the frontend and API from the same origin avoids the problem entirely.

**Q: How does local development work with a separate frontend dev server?**
A: Vite runs on port 5173 with hot reload, and Express runs on 8080. Vite's dev proxy forwards any `/api` request to Express. The frontend always uses relative `/api` URLs, so the same code works locally through the proxy and in production, where Express serves everything.

**Q: Why do Vite's build files have hashes in their names?**
A: The hash is based on the file's content, so a code change produces a new file name. Browsers can cache these files for a long time, and users still get the new version immediately after a deploy. This is called cache busting.

---

## Dependencies

**Q: What's the difference between `npm audit fix` and `npm audit fix --force`?**
A: `npm audit fix` upgrades vulnerable packages only within the semver ranges in `package.json`, so it won't introduce breaking changes. `--force` allows major-version upgrades, which can break the app, so it needs careful testing. In my project the plain fix resolved all issues, and I verified the build afterwards.

**Q: What does `^1.18.1` mean in `package.json`?**
A: Caret range: any version from 1.18.1 up to, but not including, 2.0.0. Minor and patch updates are allowed, major ones aren't, because semver reserves major versions for breaking changes.

**Q: What's the difference between `npm install` and `npm ci`?**
A: `npm install` resolves versions and can update the lockfile. `npm ci` installs exactly what's in `package-lock.json`, deletes `node_modules` first and fails if the lockfile and `package.json` don't match. CI pipelines use `npm ci` for reproducible builds.
