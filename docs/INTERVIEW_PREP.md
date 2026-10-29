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

**Q: How did you verify that the API key no longer reaches the browser?**
A: I removed every reference to the key from the frontend and switched it to call `/api/weather`. Then I built the production bundle and searched `dist/` for the actual key value and for the OpenWeatherMap hostname, and found neither. Checking the build output, not just the source, proves what users actually download.

**Q: Tell me about a bug you found in this project.** *(real story)*
A: The original app labelled wind speed as km/h, but OpenWeatherMap returns metres per second when you request metric units, so values were 3.6 times too low. I confirmed it in the API docs, converted with `speed * 3.6`, and committed it as a separate `fix:` commit so the change is easy to review and revert.

**Q: Why did you remove axios?**
A: After moving the API call to the backend, the frontend only needed one simple GET request, which the built-in `fetch` handles. Removing axios cut the bundle by about 20% and removed a dependency that had just needed a security patch. Every dependency adds attack surface and maintenance, so unused ones should go.

---

## Dockerfile and container hardening

**Q: Walk me through your Dockerfile.**
A: It's a three-stage build on `node:24-alpine`. The `build` stage runs `npm ci` and `vite build` to produce `dist/`. The `deps` stage runs `npm ci --omit=dev` for runtime packages only. The `runtime` stage copies just `node_modules`, `dist/`, `package.json` and `server/`, sets `NODE_ENV=production` and `PORT=8080`, switches to the non-root `node` user, and starts with exec-form `CMD ["node", "server/index.js"]`. Build tools never reach the final image.

**Q: Why use a multi-stage build?**
A: To separate building from running. Compilers, bundlers and test tools are needed to build but not to run. Leaving them in earlier stages makes the image smaller and reduces the attack surface. My single-stage comparison image on `node:24` was 1.93 GB, ran as root and contained Jest and Vite. The multi-stage Alpine image is 250 MB and runs as a non-root user.

**Q: Your image was bigger than expected. How did you investigate?** *(real story)*
A: `docker history` showed a 54.6 MB `node_modules` layer, which was far too big for Express. Running `du` inside the container showed `lucide-react` at 40 MB and `react-dom` at 8 MB. Those are frontend libraries that Vite bundles into `dist/` at build time, and the server never imports them, but the template listed them as runtime dependencies. I confirmed the server didn't import them, moved them to devDependencies, re-ran lint, tests, build and audit, and the layer dropped to 5.4 MB.

**Q: Why copy `package.json` and the lockfile before the source code?**
A: Layer caching. Each instruction creates a cached layer, and a layer is rebuilt only if its inputs change. Copying only the dependency files before `npm ci` means a code-only change reuses the cached install layer, so rebuilds take seconds.

**Q: Why run the container as a non-root user?**
A: Least privilege. If someone exploited the app, they'd get the permissions of the `node` user instead of root, which limits what they could change or reach. I also left the app files owned by root, so the app user can't modify its own code. I verified that a write attempt fails with "Permission denied".

**Q: How do secrets get into your container?**
A: At runtime, never at build time. `.dockerignore` excludes `.env`, so it can't be copied in, and I verified it isn't in the image. Locally I pass `--env-file .env` to `docker run`. On Cloud Run the key comes from Secret Manager as an environment variable. Anything baked into an image can be read by anyone who can pull it.

**Q: What is graceful shutdown and why does it matter on Cloud Run?**
A: Cloud Run and `docker stop` send SIGTERM before stopping a container, then SIGKILL after a grace period. My server handles SIGTERM by closing the listener so in-flight requests can finish, then exits, with an 8-second safety timeout. `docker stop` went from a forced 10-second kill to 371 ms with exit code 0, and users don't get dropped requests during deploys or scale-down.

**Q: Why exec form `CMD ["node", ...]` instead of `CMD npm start`?**
A: Exec form runs Node directly as PID 1, so it receives SIGTERM. Shell form or `npm start` puts a shell or npm in between, and that process may not forward signals, which breaks graceful shutdown.

**Q: Why did you choose Node 24 when the requirement said Node 20?** *(real story)*
A: Before writing the Dockerfile I checked the official Node.js release schedule and found Node 20 had reached end-of-life on 30 April 2026, so it no longer gets security patches. I raised it, and we moved to Node 24, the active LTS supported until April 2028, which also matched local development. I updated `engines` in `package.json` to document it.

**Q: What does `.dockerignore` do?**
A: It excludes files from the build context sent to the Docker engine. That keeps secrets like `.env` out of images, makes builds faster by not sending `node_modules` or `.git`, and avoids copying host-specific binaries (Windows `node_modules`) into a Linux image.

---

## Docker basics

**Q: What's the difference between an image and a container?**
A: An image is a read-only template: the app, its dependencies and the start command. A container is a running instance created from an image. One image can run as many containers. It's like a class and its objects.

**Q: Why might `docker ps` show nothing even though you ran a container?**
A: `docker ps` only lists running containers. A container stops when its main process exits. `hello-world` prints a message and exits with code 0, so it appears only in `docker ps -a`, as `Exited (0)`. A web server container keeps running because its process keeps listening.

---

## Testing and code quality

**Q: How do you test an API that depends on a third-party service?**
A: I mock the dependency. My Express route calls OpenWeatherMap through the global `fetch`, so in Jest I replace it with `jest.spyOn(globalThis, 'fetch')` and return a fake `Response` for each scenario: success, 404, 401, or a rejected promise for a timeout. Tests then need no API key, no network and no quota, run in about a second, and never fail because of the external service.

**Q: What's the difference between Jest and supertest?**
A: Jest is the test runner and assertion library: it finds tests, runs them and reports results with `expect`. supertest sends HTTP requests directly to an Express app in memory, without starting a server on a port. I build the app in `app.js` and start it in `index.js`, so tests import only the app.

**Q: How do you know your tests actually work?**
A: I make them fail on purpose. I changed the health response from "ok" to "okay", ran the tests, saw the failure and a non-zero exit code, then restored the code. A test that has never failed might not be asserting anything. This is the basic idea behind mutation testing.

**Q: What security behaviour do your tests cover?**
A: Three things. Invalid input is rejected with 400 before any upstream call. A city value like `New York&appid=evil` can't inject an extra query parameter, because the test checks that only one `appid` is sent. And when the upstream rejects the key, the response and the logs never contain the key: I spy on `console.error` and assert on what was logged.

**Q: Why do CI pipelines rely on exit codes?**
A: The runner decides pass or fail from the process exit code: 0 means success, anything else fails the step and stops later steps such as deploy. Jest and ESLint return non-zero on failures, so a failing test automatically blocks the deployment.

**Q: Your linter reported "process is not defined". What was wrong?**
A: The ESLint config only had browser globals, but server code runs in Node.js, where `process` exists. I split the flat config into a browser block for `src/` with the React rules, and a Node block for `server/`, `tests/` and config files. I also confirmed ESLint really linted every file, because "0 errors" can also mean "nothing was checked".

**Q: npm audit flagged vulnerabilities after you installed Jest. What did you do?** *(real story)*
A: I read the report. There were 5 low-severity issues in `deepmerge`, used only inside Jest's config loader, so dev-only. The suggested `--force` fix would downgrade Jest from 30 to 25, a breaking and older release. The production audit (`--omit=dev`) showed 0 vulnerabilities, so I accepted the low dev-only risk and planned `npm audit --omit=dev --audit-level=high` for CI. Triaging by severity and runtime exposure is better than forcing every fix.

---

## Forecast feature and frontend

**Q: How did you add a new API route without duplicating code?**
A: I first refactored the existing route: validation, the missing-key check and error mapping moved into a shared `openWeatherHandler`, and the HTTP call into `callOpenWeather(endpoint)`. The 14 existing tests passed unchanged, which proved the refactor was safe. The new `/api/forecast` route then became one line that reuses the handler, so both routes behave consistently and a fix in one place fixes both.

**Q: Why summarise the forecast on the server instead of in the browser?**
A: OpenWeatherMap returns 40 three-hour entries, about 16.5 KB. The browser only needs 5 daily summaries, about 0.5 KB, so doing it server-side cuts the payload around 32 times, which matters on mobile. The logic also lives in one place, where I can unit-test it.

**Q: Tell me about a tricky bug your tests protect against.** *(real story)*
A: Timezones. The forecast API returns times in UTC, but days should follow the city's calendar. 20:00 UTC is 01:30 the next day in India, so ignoring the offset puts entries on the wrong day. I shift each timestamp by the city's offset before grouping, and wrote a test with the same entry in London and in India. When I removed the offset on purpose, exactly that test failed.

**Q: What's the difference between `Promise.all` and `Promise.allSettled`, and why did you use the second?**
A: `Promise.all` rejects as soon as one promise fails. `allSettled` waits for all of them and reports each result. The app fetches current weather and the forecast in parallel, and with `allSettled` a forecast failure only hides the forecast section while the current weather still shows. That's graceful degradation.

**Q: How did you verify the UI, not just the code?**
A: Besides lint, unit tests and a production build, I drove headless Microsoft Edge with a small Chrome DevTools Protocol script. It clicked a city, toggled °F, resized to phone width, submitted an invalid city, saved screenshots and collected JavaScript errors (there were none). It's the same approach Playwright and Puppeteer use.

**Q: What accessibility improvements did you make?**
A: A semantic `<form role="search">`, so Enter submits. `aria-label`s on icon-only buttons. `aria-pressed` on the °C/°F toggle. `role="alert"` for errors and `role="status"` for loading. Visible `:focus-visible` outlines. Visually hidden `sr-only` text for forecast conditions. And `prefers-reduced-motion` support.

---

## Caching and performance

**Q: How did you improve the performance of your API?** *(real story)*
A: I added a server-side in-memory cache with a 10-minute TTL in front of OpenWeatherMap. That matches how often their data updates. Repeat lookups for the same city dropped from about 440 ms to about 2 ms, and it reduces upstream calls, which protects the free-tier quota and makes the app more resilient when the API is slow.

**Q: How did you choose the cache key?**
A: Route name plus a normalised location: city names lowercased, so "Delhi" and "delhi" share one entry, and coordinates rounded to 2 decimals (about 1 km), so nearby users share entries. Including the route name keeps current weather and forecast separate. A good key maximises hits without ever returning the wrong data.

**Q: Why don't you cache error responses?**
A: A brief upstream failure would then be served to every user for the whole TTL, even after the upstream recovered. I only cache 200 responses, and I have a test where the upstream first fails and then recovers, asserting that the second request goes upstream again.

**Q: How do you stop an in-memory cache from causing memory problems?**
A: Two limits: a TTL, so stale entries are removed when read, and a maximum of 500 entries, so when it's full the oldest entry (first in the Map's insertion order) is evicted. Memory stays bounded, which matters on Cloud Run where the memory limit is fixed and exceeding it kills the instance.

**Q: What are the limits of an in-memory cache on Cloud Run, and what would you use at scale?**
A: Each instance has its own cache, so instances don't share hits, and everything is lost when Cloud Run scales to zero or replaces an instance. For slow-changing weather data that's an acceptable trade-off and costs nothing. If consistency across instances or a higher hit rate mattered, I'd use a shared cache such as Redis on Memorystore, accepting its always-on cost.

**Q: How do you test time-based behaviour like a 10-minute TTL?**
A: I inject the clock. The cache takes a `now` function that defaults to `Date.now`, and tests pass a fake clock they can advance instantly. TTL tests run in milliseconds and are fully deterministic.

**Q: After adding caching, two existing tests failed. Why, and how did you fix it?** *(real story)*
A: The tests in one file shared a single app instance, so they shared one cache. A success response cached by an earlier test was returned to a later test that expected an upstream error. That's shared state breaking test isolation. I turned caching off in the logic test files with `cacheTtlMs: 0` and moved caching into its own suite, which creates a fresh app in `beforeEach`.

**Q: How can you tell whether a response came from the cache?**
A: The server sets an `X-Cache: HIT` or `MISS` header, the same convention CDNs use. It's visible in browser DevTools and the tests assert on it, which makes cache behaviour easy to debug in production too.

**Q: How did you build the animated weather backgrounds, and how did you keep them fast?**
A: A `WeatherScene` component renders decorative layers (raindrops, snowflakes, stars, clouds, fog, lightning) chosen by the weather theme, animated purely with CSS keyframes. Animations only touch `transform` and `opacity`, which the browser composites on the GPU without re-layout, so they stay smooth on phones. The layer is `position: fixed` with `pointer-events: none` and `aria-hidden`, and `prefers-reduced-motion` turns all motion off.

**Q: Why not use `Math.random()` to position the raindrops?**
A: React components should be pure: same props, same output. Random values during render would change on every re-render and make the UI jump. I compute positions once at module load with a deterministic formula that looks random, so every render of a theme is identical.

**Q: What is a custom React hook? Give an example from your project.**
A: A reusable function that uses React hooks and starts with `use`. My `useNow` hook stores the current time in state and uses `useEffect` to start a `setInterval` that updates it every 10 seconds. The effect returns a cleanup that calls `clearInterval`, so the timer stops when the component unmounts and doesn't leak.

**Q: How did you test UI states you can't reproduce on demand, like a thunderstorm?** *(real story)*
A: I mocked the network inside the browser. Using the DevTools Protocol `Fetch` domain, my script intercepted `/api/weather` requests in headless Edge and answered them with fake data for each condition, then screenshotted every scene at desktop and phone sizes and collected JavaScript errors. The screenshots exposed two mobile layout bugs that tests couldn't catch, which I fixed and re-verified.

---

## Dependencies

**Q: What's the difference between `npm audit fix` and `npm audit fix --force`?**
A: `npm audit fix` upgrades vulnerable packages only within the semver ranges in `package.json`, so it won't introduce breaking changes. `--force` allows major-version upgrades, which can break the app, so it needs careful testing. In my project the plain fix resolved all issues, and I verified the build afterwards.

**Q: What does `^1.18.1` mean in `package.json`?**
A: Caret range: any version from 1.18.1 up to, but not including, 2.0.0. Minor and patch updates are allowed, major ones aren't, because semver reserves major versions for breaking changes.

**Q: What's the difference between `npm install` and `npm ci`?**
A: `npm install` resolves versions and can update the lockfile. `npm ci` installs exactly what's in `package-lock.json`, deletes `node_modules` first and fails if the lockfile and `package.json` don't match. CI pipelines use `npm ci` for reproducible builds.
