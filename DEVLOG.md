# Dev Log

A daily diary of building this project: what I built, what I learned, and the problems I solved.
Plan: [ROADMAP.md](ROADMAP.md) · Study notes: [docs/NOTES.md](docs/NOTES.md) · Interview prep: [docs/INTERVIEW_PREP.md](docs/INTERVIEW_PREP.md)

---

## Day 4 — 2026-10-29 — Caching, Docker and a living interface

### What I built
- A server-side cache. The same city searched within 10 minutes is answered from memory, and an X-Cache header says HIT or MISS. A repeat Delhi search went from about 440 ms to about 2 ms.
- Graceful shutdown. When Docker or Cloud Run sends SIGTERM, the server finishes its requests and exits cleanly.
- A .dockerignore and a three-stage Dockerfile on node:24-alpine that runs as the non-root node user.
- Animated weather scenes behind the app: rain, snow, stars and moon, clouds, sun glow, fog and lightning.
- A live clock for the searched city and a sun arc that shows where the sun is between sunrise and sunset.
- Cloud cover and last-hour rain tiles, and cards that slide in for each new city.

### What I learned
- How a cache works: TTL, cache keys, a size limit, and why errors must never be cached.
- How to fake time in tests by injecting the clock.
- Multi-stage builds, layer caching, Alpine, non-root users and passing secrets only at runtime.
- Why exec-form CMD matters: Node must be the main process to receive SIGTERM.
- How to read docker history and look inside a running container with docker exec.
- Custom React hooks with cleanup, keeping components pure, and mocking network requests in a real browser.

### Problems and how I fixed them
- **Node 20 was end of life.** Before writing the Dockerfile I checked the official release schedule. Node 20 stopped getting security fixes on 30 April 2026, so I moved to Node 24 LTS.
- **Two tests broke after adding the cache.** Tests in one file shared one app and one cache, so a saved success leaked into a test that expected an error. I turned caching off in those files and gave caching its own tests with a fresh app each time.
- **The first image was 303 MB.** docker history showed a 54.6 MB node_modules layer. lucide-react and react-dom were inside, but the server never uses them. I moved them to devDependencies. The image dropped to 250 MB, against 1.93 GB for a basic single-stage build.
- **The local server kept stopping.** It lived in a terminal that got closed. Running it as a Docker container with -d fixed this for good.
- **Docker commands failed after a restart.** Docker Desktop was still starting. I learned to wait for "Engine running" and that Exited (255) means a container was cut off, not stopped cleanly.
- **Port already allocated.** Two containers tried to use port 8081. Only one program can use a port at a time.
- **Phone layout problems.** Screenshots showed the sun card times wrapping and the moon covering the search bar. Small CSS fixes solved both.

### Result
SkyCast runs in a 250 MB container as a non-root user, stops in 0.37 seconds, and has animated weather scenes. 58 tests pass. 49 commits in the repo.

---

## Day 3 — 2026-10-28 — Tests, forecast and redesign

### What I built
- ESLint settings split into browser rules for the React code and Node rules for the server and tests.
- Jest and supertest tests for /health and /api/weather, with OpenWeatherMap mocked so tests need no real key or internet.
- A shared route handler (a refactor) and a new /api/forecast route that turns 40 three-hour entries into 5 daily summaries.
- A full UI redesign called SkyCast: weather-based backgrounds, glass cards, weather icons, detail tiles, a °C/°F toggle, popular cities, and a 5-day forecast with temperature bars.
- Formatting helpers with unit tests, a new page title and favicon.

### What I learned
- Exit codes decide pass or fail in CI.
- Mocking, arrange-act-assert, and breaking code on purpose to prove a test can fail.
- Refactoring safely with tests, and DRY.
- Timezones: the forecast is in UTC, so days must use the city's offset.
- React components, props and state, Promise.allSettled, and accessibility basics.
- Checking the UI with headless Edge screenshots, not just with tests.

### Problems and how I fixed them
- **ESLint said "process is not defined".** It only knew browser globals. Splitting the config fixed it.
- **npm audit showed 5 low warnings after installing Jest.** The suggested fix would downgrade Jest to a 2020 version. They were dev-only and the production audit was clean, so I accepted the risk.
- **Late forecast entries would land on the wrong day.** I added the city's timezone offset and wrote a test that fails if the offset is removed.
- **The browser could not reach localhost.** The server had stopped. I learned that a server must keep running in its own terminal.

---

## Day 2 — 2026-10-27 — Express backend

### What I built
- An Express 5 server with a /health endpoint that returns 200. Cloud Run and monitoring will use it.
- An /api/weather route. My server now calls OpenWeatherMap with the secret key, so the browser never sees it. It works with a city name or with latitude and longitude.
- Input checks (400), "City not found" (404), a 5 second timeout, and a 502 error when OpenWeatherMap fails.
- Express now serves the built React app, so one server gives both the website and the API.
- A Vite proxy so local development calls the same /api URL as production.
- The frontend now calls /api/weather instead of OpenWeatherMap. I removed axios and used the built-in fetch.
- A .env.example template, plus docs/NOTES.md and docs/INTERVIEW_PREP.md for studying.

### What I learned
- Why app.js (builds the app) and index.js (starts it) are separate: tests can use the app without a real port.
- Cloud Run gives the port through the PORT variable, so the app must not hardcode it.
- A health check must not depend on outside APIs.
- HTTP status codes 400, 404, 500 and 502, and when to use each.
- Never log URLs that contain secrets.
- How to prove a secret is gone: search the built files in dist, not only the source code.
- 304 Not Modified and ETags mean the browser reuses its saved copy when nothing changed.

### Problems and how I fixed them
- **Security problems in old packages.** npm audit found high severity issues in axios, vite and postcss from the old lockfile. I ran npm audit fix (safe updates only), checked that the build still works, and committed it separately.
- **Wind speed was wrong.** The old app labelled wind as km/h, but OpenWeatherMap sends metres per second. I multiplied by 3.6.
- **Browser warning about the search box.** The input had no name or label, which is bad for screen readers. I added name and aria-label.
- **HTTP 000 in my test.** My script asked for the page before the server had started. Waiting for /health first fixed it. Real systems also wait for readiness.

### Result
The full app runs on one server at localhost:8080. The DevTools Network tab shows the browser only calls /api/weather, with no API key in the URL. 19 commits in the repo before this log entry.

---

## Day 1 — 2026-10-26 — Setup and Git

### What I built
- Inspected my old weather app: React 19 with Vite, axios and lucide-react.
- Started a git repo on main with a proper .gitignore and .gitattributes.
- Made the first commits and pushed them to GitHub.
- Installed and checked Node, Git, Docker Desktop, gcloud and Terraform.
- Wrote ROADMAP.md with the target architecture diagram and a 14-day plan.

### What I learned
- Vite puts every VITE_ variable into the browser code, so it can never hold a secret.
- .gitignore keeps secrets and Terraform state out of git, and ! makes an exception.
- Docker needs Linux, so on Windows it runs inside WSL 2.
- Docker is a client (the docker command) talking to a daemon (the engine).
- PATH is where Windows looks for commands, and VS Code must be restarted to see new tools.

### Problems and how I fixed them
- **API key exposed.** The old app used VITE_WEATHER_API_KEY, which goes into the browser, and the old .gitignore did not ignore .env. I fixed .gitignore before the first commit, checked it with git check-ignore, scanned staged files for the key, and created a new key.
- **WSL not installed.** Docker Desktop could not start. I ran wsl --install and restarted the PC.
- **Docker still said "unable to start".** Its logs showed it had started before WSL existed and kept the old error. A full restart of Docker Desktop fixed it, and docker run hello-world worked.
- **gcloud and terraform "not recognized".** gcloud had not finished installing, so I reinstalled it with winget. Terraform was installed, but VS Code had an old PATH, so restarting VS Code fixed it.

---

## Next session — Day 5
- Part 2 of the SkyCast upgrade (backend, with tests): hourly forecast for the next 24 hours, chance of rain per day, an /api/air route for the Air Quality Index, and an /api/places route for city suggestions.
- Part 3 (UI): mood line and what to wear, alerts banner, AQI card, hourly SVG chart with best time to go out, golden-hour sky, recent searches, voice search and autocomplete.
- Part 4 (extras): compare two cities, and PWA install with offline mode.
- Then Phase 3: Terraform, starting with a budget alert.
