# Dev Log

A daily diary of building this project: what I built, what I learned, and the problems I solved.
Plan: [ROADMAP.md](ROADMAP.md) · Study notes: [docs/NOTES.md](docs/NOTES.md) · Interview prep: [docs/INTERVIEW_PREP.md](docs/INTERVIEW_PREP.md)

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

## Next session — Day 3
- Fix ESLint so it understands Node.js files (server code uses process, which browsers don't have).
- Add Jest and supertest.
- Write tests for /health and /api/weather, with OpenWeatherMap mocked so tests need no real key or internet.
- Add npm test and npm run lint scripts, which GitHub Actions will run later.
- End Phase 1 with a summary and 3 interview questions.
