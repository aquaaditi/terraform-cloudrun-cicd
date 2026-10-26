# Study Notes

Topic-wise notes from building this project, organised by day.
For interview questions, see [INTERVIEW_PREP.md](INTERVIEW_PREP.md). For the daily log, see [DEVLOG.md](../DEVLOG.md).

---

## Day 1: Setup and Git

### Git basics used
| Command | What it does |
|---|---|
| `git init -b main` | Create a new repo with `main` as the default branch |
| `git status` | Show staged, modified and untracked files. Run it before every commit |
| `git add <file>` | Stage a file (put it in the next commit) |
| `git commit -m "..."` | Save staged changes as a snapshot |
| `git log --oneline` | Show commit history, one line each |
| `git remote add origin <url>` | Link the local repo to GitHub under the name `origin` |
| `git push -u origin main` | Upload `main`; `-u` sets tracking so later just `git push` works |
| `git check-ignore -v <file>` | Show which `.gitignore` rule ignores a file |

- `## main...origin/main [ahead 2]` means 2 local commits are not yet pushed.
- `nothing to commit, working tree clean` means everything is committed.

### .gitignore
- Lists files git must never track: dependencies (`node_modules/`), build output (`dist/`), **secrets** (`.env`), Terraform state.
- `!pattern` is an exception, e.g. `.env.*` ignores all env files but `!.env.example` keeps the template.
- Gotcha: the original Vite `.gitignore` did **not** ignore `.env`, so `git add .` would have leaked the API key.
- `.terraform.lock.hcl` is deliberately **committed**: it pins provider versions like `package-lock.json` does.

### .gitattributes
- `* text=auto eol=lf` stores text files with Linux line endings (LF).
- Windows uses CRLF; Linux containers and CI runners expect LF. Mismatches cause noisy diffs and broken shell scripts.

### Conventional Commits
Format: `type: short description`
- `feat:` new feature · `fix:` bug fix · `docs:` documentation · `test:` tests
- `chore:` maintenance · `ci:` pipeline changes · `infra:` infrastructure (Terraform)
- One commit = one logical change you can explain in one sentence.

### Why `VITE_` env vars are not secret
- Vite **copies** every `VITE_*` variable into the JavaScript bundle at build time.
- Anyone can see it in browser DevTools → Network tab.
- Fix: call the third-party API from a **backend**, which keeps the key on the server.
- A leaked key must be **rotated** (new key + delete old one). Deleting it from code is not enough.

### Docker on Windows: WSL 2
- Containers need a **Linux kernel**. Windows doesn't have one.
- **WSL 2** (Windows Subsystem for Linux) runs a real Linux kernel in a lightweight VM.
- Docker Desktop runs its engine inside WSL 2.
- Requires CPU virtualization (Intel VT-x) enabled in BIOS.
- Gotcha: Docker Desktop started before WSL was installed and kept the old error. A full restart of Docker Desktop fixed it.

### Docker client-server architecture
1. `docker` CLI (client) sends commands to the **daemon** (engine).
2. Daemon **pulls images** from a **registry** (Docker Hub, Artifact Registry).
3. Daemon **creates and runs containers** from images.
4. Output streams back to the client.
- `Error response from daemon` means the CLI works but the daemon has a problem.

### PATH (Windows)
- PATH is the list of folders Windows searches when you type a command.
- After installing a tool, open a **new** terminal. VS Code terminals inherit PATH from VS Code, so **restart VS Code**.
- Gotcha: `terraform` was installed but "not recognized" until VS Code restarted.

---

## Day 2: Express backend

### Express basics
- Express maps **routes** (method + URL) to handler functions: `app.get('/health', (req, res) => ...)`.
- `req` = incoming request, `res` = response we send back.
- `res.status(200).json({...})` sets the HTTP status and sends JSON.
- Express 5 automatically catches errors thrown in `async` handlers (Express 4 didn't).
- Unknown routes return **404** by default.

### app.js vs index.js pattern
- `app.js` **builds** the app (routes, middleware) and exports it. It does not listen on a port.
- `index.js` **starts** the server with `app.listen(port)`.
- Why: tests import `app.js` directly and send fake requests (supertest) without a real port.

### PORT and Cloud Run
- Cloud Run injects a `PORT` environment variable (default 8080). The app **must** listen on it.
- `Number(process.env.PORT) || 8080` uses PORT if set, otherwise falls back to 8080 locally.

### Health checks
- `/health` returns 200 if the process is alive. Used by Cloud Run and uptime monitoring.
- Keep it fast and **independent of external APIs**, otherwise an OpenWeatherMap outage would look like our outage.

### Small security habits
- `app.disable('x-powered-by')` hides the `X-Powered-By: Express` header (less info for attackers).

### npm scripts and Node features
| Script | Command | Used by |
|---|---|---|
| `npm start` | `node server/index.js` | Docker / Cloud Run |
| `npm run dev:server` | `node --watch --env-file=.env server/index.js` | Local development |
- `--watch` restarts the server when files change (built into Node, no nodemon needed).
- `--env-file=.env` loads `.env` (built into Node 20.6+, no `dotenv` package needed).
- `"engines": { "node": ">=20" }` documents the required Node version.

### npm audit and semver
- `npm audit` lists known vulnerabilities in installed packages.
- `npm audit fix` upgrades **within semver ranges** only, so it's safe.
- `npm audit fix --force` allows **major** upgrades, which can break things.
- Semver `MAJOR.MINOR.PATCH`: `^1.18.1` allows `1.x.x` ≥ 1.18.1 but not `2.0.0`.
- Always re-run the build/tests after fixing dependencies.
- Gotcha: the copied old lockfile had high-severity issues (axios, vite, postcss). Fixed in a separate `fix(deps):` commit.
