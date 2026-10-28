# Study Notes

My simple notes from building this project, day by day and topic by topic.

---

## Day 1: Setup and Git

### What is Git?
Git is a tool that saves snapshots of my project. Each snapshot is called a commit. If something breaks, I can go back to an older snapshot. GitHub is a website that stores a copy of my Git project online.

### How I save my work in Git
First I check what changed using git status. Then I choose which files to save using git add. This is called staging. Then I save them with git commit and a short message. Finally I upload my commits to GitHub using git push.

If git status says "working tree clean", it means everything is already saved. If it says "ahead 2", it means I have 2 commits on my laptop that are not on GitHub yet, so I need to push.

### What is .gitignore?
It is a file that tells Git which files it must never save. I ignore node_modules because it is very big and can be downloaded again. I ignore .env because it has my secret API key. I also ignore Terraform state files because they can contain secrets.

A line starting with ! means "do not ignore this one". I use it so that .env.example is still saved, because it is only a template without real secrets.

The old project's .gitignore did not ignore .env. If I had committed, my API key would have gone to GitHub. I fixed this before the first commit.

### What is .gitattributes?
Windows and Linux end each line of a file in a different way. Windows uses CRLF and Linux uses LF. My code will run on Linux (Docker and GitHub Actions), so this file tells Git to always store files with LF. This avoids strange errors and fake changes.

### Commit messages
I write commit messages in a fixed style called Conventional Commits. The message starts with a word that tells the type of change. feat means a new feature. fix means a bug fix. docs means documentation. test means tests. chore means small maintenance work. ci means pipeline changes. infra means Terraform or cloud changes. Each commit should be one small change that I can explain in one sentence.

### Why my API key was not safe in the old app
The old app was built with Vite. Vite takes any variable that starts with VITE_ and puts it inside the JavaScript file that goes to the browser. So anyone could open the browser tools and see my key.

The fix is to call the weather API from my own server (backend). The server keeps the key secret and the browser never sees it. Because the old key was already exposed, I made a new key and deleted the old one. This is called rotating a key.

### Why Docker needs WSL on Windows
Containers need Linux to run, but Windows is not Linux. WSL 2 runs a small real Linux inside Windows. Docker Desktop uses WSL 2 to run my containers. For WSL to work, virtualization must be turned on in the computer's BIOS.

My problem: Docker showed "unable to start". It had started before WSL was installed, and it remembered that error. When I fully restarted Docker Desktop, it found WSL and worked.

### How Docker works
Docker has two parts. The docker command I type is the client. The daemon is the engine running in the background. The client sends my command to the daemon. The daemon downloads images from a registry like Docker Hub, then creates and runs containers from them.

If I see "Error response from daemon", the command is fine but the engine has a problem.

### What is PATH?
PATH is a list of folders where Windows looks for commands. After I install a new tool, I must open a new terminal so Windows sees it. In VS Code I must restart the whole VS Code, not just the terminal.

My problem: terraform was installed but showed "not recognized". Restarting VS Code fixed it.

---

## Day 2: Express backend

### What is Express?
Express is a tool for building a web server in Node.js. I tell it which function should run for which URL. This is called a route. For example, when someone opens /health, my function sends back "ok".

Express 5 is the newest version. One good thing is that it catches errors in async functions automatically. If someone opens a URL that does not exist, Express sends a 404 error by itself.

### Why I have two files: app.js and index.js
app.js builds the server and its routes but does not start it. index.js actually starts the server on a port.

I split them so my tests can use app.js directly without starting a real server. This makes tests faster and avoids port problems.

### What is PORT?
Cloud Run tells my app which port to use through a variable called PORT. My app must listen on that port, otherwise Cloud Run cannot reach it. If PORT is not given, like on my laptop, the app uses 8080.

### What is a health check?
/health is a simple URL that returns 200 if my app is running. Cloud Run and the monitoring use it to check if my app is alive.

It must be fast and must not call any outside API. If it called the weather API and the weather API was down, it would look like my app is down, which is wrong.

### Hiding the X-Powered-By header
By default Express tells everyone "I am Express" in a header. I turned this off so attackers get less information about my app.

### npm scripts
npm scripts are short names for long commands. npm start runs my server the normal way, and Docker and Cloud Run will use this. npm run dev:server is for my laptop. It restarts the server when I save a file, and it loads my .env file.

Node 20 can load .env files by itself, so I did not need the dotenv package. The engines setting in package.json says my app needs Node 20 or newer.

### npm audit
npm audit checks my packages for known security problems. npm audit fix updates them safely, without big breaking changes. Adding --force allows big updates that can break the app, so I avoid it unless needed.

Version numbers have three parts: major, minor and patch. A major change can break things. The ^ symbol in package.json means "allow minor and patch updates, but not major".

My problem: the old project's packages had high security problems in axios, vite and postcss. I ran npm audit fix, checked that the app still builds, and committed it separately.

### The weather route (backend proxy)
My browser now asks my own server for the weather at /api/weather. My server adds the secret API key and calls OpenWeatherMap, then sends the answer back. The browser never sees the key. A server that calls another service for you like this is called a proxy.

The route accepts either a city name or a latitude and longitude. The latitude and longitude come from the "Current Location" button.

### Checking user input
I never trust what the user sends, because it goes into a request to another server. If the city is empty or too long, or the latitude and longitude are not real numbers in the correct range, I return error 400 straight away without calling OpenWeatherMap.

I build the URL with URLSearchParams. It safely encodes special characters like spaces and the & sign, so a user cannot break or change my request.

### HTTP status codes I use
200 means success. 400 means the user sent bad input. 404 means the city was not found. 500 means my own server has a problem, like the API key missing. 502 means the service behind my server failed, like OpenWeatherMap being down or rejecting my key.

### Timeouts
If OpenWeatherMap is slow, my server should not wait forever. I set a 5 second timeout, so the request gives up and the user gets a 502 error instead of a page that never loads.

### Safe logging
When something fails, I write a short message to the log for myself, but the user only sees a simple error. I never log the request URL, because it contains the API key. Logs are often read by many people and tools, so secrets must never go into them.

### Dependency injection
createApp takes the API key as an option. Normally it reads the key from the environment, but my tests can pass a fake key. Giving a function what it needs from outside, instead of it fetching things itself, is called dependency injection. It makes code easy to test.

### .env.example
.env is ignored by Git, so other people would not know which variables my app needs. .env.example is a template with the same names but fake values, and it is committed. A new developer copies it to .env and puts in their own key.

The .gitignore line !.env.example makes this one file an exception, so Git saves it even though all other .env files are ignored. I checked this with git check-ignore.

My win: the new API key became active, and my server returned real weather for Delhi without the key ever reaching the browser.

### One server for the website and the API
When I run npm run build, Vite creates a dist folder with the finished website files. My Express server now sends these files to the browser using express.static. So one server on port 8080 gives both the website and the API.

This is good because I only need to deploy one container. Also the website and the API have the same address, so I do not get CORS errors. CORS is a browser rule that blocks a page from calling an API on a different address unless that API allows it.

I put the API routes before express.static. Express checks routes in order, so /health and /api always reach my code first.

### Finding the dist folder
In modern JavaScript modules, the old __dirname variable does not exist. I use import.meta.url, which is the location of the current file, and go one folder up to find dist. This works no matter which folder I start the server from, which matters inside Docker.

### Why file names have random letters
Vite names files like index-CJJ-eVp2.js. The letters are a hash of the file content. When I change the code, the name changes, so the browser downloads the new file instead of using an old saved copy. This is called cache busting.

### Vite dev proxy
When I work on the frontend, I run Vite on port 5173 because it reloads the page instantly when I save. But my API runs on Express on port 8080. I told Vite to forward every request starting with /api to port 8080. This is called a proxy.

Because of this, my frontend code can always call /api/weather. It works on my laptop through the proxy and in production through the same server. The proxy is only for my laptop and is not part of the real website.

### Frontend now calls my backend
I changed App.jsx so it no longer calls OpenWeatherMap and no longer reads any API key. It now calls my own /api/weather using a small helper function called fetchWeather. If my server sends an error like "City not found", the helper shows that message on the screen.

To prove the key is gone, I built the website and searched the finished files in dist for the key and for the OpenWeatherMap address. Neither was found. The old security problem is fully fixed.

### Removing axios
axios is a package for making web requests. Browsers already have fetch built in, which is enough for my simple needs. So I removed axios. The website file became about 20 percent smaller, and there is one less package that can have security problems. An unused package is only risk with no benefit.

### The wind speed bug
The old app showed wind speed with "km/h", but OpenWeatherMap sends it in metres per second when I ask for metric units. So the app showed numbers 3.6 times too small. I fixed it by multiplying by 3.6. I found this bug by reading the code carefully and checking the API documentation.

### Wait until a service is ready
My test script once asked for the page before the server had fully started and got no answer, shown as HTTP 000. When I waited for /health to answer first, everything worked. Real systems do the same thing: Cloud Run waits for the app to be ready before sending it users.

### Containers and Docker commands
docker ps shows only running containers. docker ps -a shows all containers, including stopped ones. docker images shows the images I have.

An image is like a recipe, and a container is a running copy made from that recipe. A container only lives as long as its main program runs. hello-world prints a message and stops, so its container shows "Exited (0)", and 0 means it finished successfully. My Express server keeps running, so its container will stay up.

---

## Day 3: Linting and tests

### What is a linter?
A linter reads my code without running it and finds mistakes, like using a variable that does not exist. I use ESLint. It checks code automatically, so problems are caught before they reach users.

### Why ESLint said "process is not defined"
My ESLint settings only knew about browser code. process exists in Node.js, not in browsers, so ESLint thought it was a mistake. I split the settings into two parts. The src folder uses browser rules and React rules. The server folder, tests folder and config files use Node.js rules. Now each part is checked with the right rules.

I also checked that ESLint really looked at all my files. A linter that skips files also shows zero errors, so zero errors alone does not prove anything.

### Exit codes
Every command ends with a number called the exit code. 0 means success. Any other number means failure. GitHub Actions only looks at this number to decide if a step passed or failed. So if a test fails, the exit code is 1 and the deploy will stop.

### What are Jest and supertest?
Jest runs my tests and tells me which passed and which failed. supertest sends fake web requests directly to my Express app without starting a real server. This works because app.js only builds the app and does not start it.

Both are devDependencies. They are needed only for development and testing, not in production, so they will not go into my Docker image.

### How a test is written
A test has three parts: arrange, act and assert. First I set things up. Then I do the action, like sending a request. Then I check the result with expect. describe groups related tests together, and each it is one test that reads like a sentence.

### Making Jest work with modern JavaScript
My project uses import and export, which are called ES modules. Jest needs a special Node flag for this, called experimental-vm-modules. I wrote the test script in a way that works on both Windows and Linux. The "ExperimentalWarning" message is normal and harmless.

### A test must be able to fail
I broke my app on purpose by changing "ok" to "okay" and ran the tests. The test failed and the exit code was 1. Then I restored the file. This proves my test really checks something. A test that can never fail is useless.

### What is mocking?
My weather route calls the real internet using fetch. In tests I replace fetch with a fake version that returns whatever I want, like weather data, a 404 or an error. This fake is called a mock. After each test I put the real fetch back.

Mocking means my tests need no real API key, so GitHub Actions never needs my secret. They need no internet, so they are fast and never fail randomly. I can also test problems that are hard to create for real, like OpenWeatherMap being down or too slow.

### What my tests check
I have 14 tests. They check that /health returns ok and hides the X-Powered-By header. They check that bad input gets error 400 and never reaches OpenWeatherMap. They check success with a city and with latitude and longitude. They check that a user cannot sneak an extra parameter into my request. They check 404, 502 and 500 errors, and that the API key never appears in a response or in the logs.

### Running everything like CI
npm ci is like npm install, but stricter. It deletes node_modules and installs exactly the versions in package-lock.json. CI servers use it so every build is the same. I ran npm ci, lint, tests, build and a security audit from a clean start, and everything passed.

### Deciding about security warnings
After installing Jest, npm audit showed 5 low warnings in a package used inside Jest. The suggested fix would downgrade Jest to a very old version, which is worse. The problem only affects development tools, not my live app, and the production audit shows zero problems. So I accepted this small risk. Not every warning needs a forced fix. I look at how serious it is, where the code runs, and what the fix would break.
