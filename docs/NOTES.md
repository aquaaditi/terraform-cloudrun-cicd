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

---

## Day 3 (extra): Forecast and new design

### Refactoring
Refactoring means changing how code is organised without changing what it does. Before adding the forecast, I moved the shared error handling into one function called openWeatherHandler. My 14 tests still passed, which proved the behaviour did not change. Tests make refactoring safe.

### DRY: Don't Repeat Yourself
Both /api/weather and /api/forecast need the same input checks and error handling. Instead of copying 25 lines, both routes use the same handler. Now the new route is only one line, and if I fix a bug in the handler, both routes get the fix.

### Summarising the forecast on the server
OpenWeatherMap's free forecast gives 40 entries, one every 3 hours. My server groups them into 5 days, keeping the lowest and highest temperature and the weather closest to midday. The browser now downloads about 0.5 KB instead of 16.5 KB, which is about 32 times smaller.

### The timezone problem
OpenWeatherMap gives times in UTC. 8 PM in UTC is already 1:30 AM the next day in India. If I ignore the city's timezone, late entries go on the wrong day. So I add the city's timezone offset before deciding the date. I wrote a test for exactly this, and when I broke the code on purpose, only that test failed.

### Unit tests and route tests
A unit test checks one small function directly, like summarizeForecast, with hand-made data. A route test sends a full request through Express. Pure functions, which only take input and return output, are the easiest to unit test.

### React components
I split the page into small components. WeatherIcon picks the icon. CurrentWeather shows the big card. WeatherDetails shows the six tiles. Forecast shows the five days. App holds the data and decides what to show. Each file has one job, so it is easy to read and change.

Props are the inputs I pass to a component. State is data that can change, like the search text or the weather. When state changes, React redraws the page.

### Helper functions
I put formatting logic like Celsius to Fahrenheit, wind direction and local time in a separate helpers file and tested them. Times like sunrise must show the city's local time, not my laptop's time, so the helper shifts by the city's timezone.

### Themes with CSS variables
The background changes with the weather and with day or night. The icon code from OpenWeatherMap ends with d for day or n for night. Each theme only changes one CSS variable called --sky, so adding a new theme is just one line.

### Loading both at once and staying safe
The app asks for the current weather and the forecast at the same time, which is faster. I used Promise.allSettled instead of Promise.all. With allSettled, if only the forecast fails, the current weather still shows. This is called graceful degradation.

### Accessibility
I made the app usable for everyone. The search is a real form, so Enter works. Buttons with only an icon have a label for screen readers. Keyboard users see a clear outline. Text hidden with sr-only is read by screen readers but not shown. The app respects the "reduce motion" setting.

### Checking the design with a real browser
Passing tests do not prove the page looks right. I used Microsoft Edge in headless mode, which is a browser without a window, controlled by a script. It clicked a city, switched to °F, resized to phone size and saved screenshots. It also reported zero JavaScript errors. This is how tools like Playwright do automated UI testing.

### Removing unused files
Before deleting the old Vite files, I searched the project to prove nothing used them. I used git rm, which deletes the files and stages the deletion together.

---

## Day 4: Server-side caching

### What is a cache?
A cache is a place where I keep a copy of an answer so I can reuse it later instead of asking again. When someone searches Delhi, my server asks OpenWeatherMap and saves the answer in memory. If anyone searches Delhi again soon, my server gives the saved answer straight away.

### TTL: time to live
Every saved answer has an expiry time called the TTL. I chose 10 minutes because OpenWeatherMap only updates its data about every 10 minutes, so keeping it longer would show old weather, and keeping it shorter would waste calls.

### Why caching helps
The first Delhi search took about 440 milliseconds. The repeat search took about 2 milliseconds, around 200 times faster. It also means fewer calls to OpenWeatherMap, so I stay inside the free limit, and my app keeps working better if OpenWeatherMap is slow.

### How my cache works
My cache uses a JavaScript Map. Each entry stores the answer and the time it expires. When I read an expired entry, the cache deletes it and returns nothing. The cache also has a size limit of 500 entries. When it is full, it removes the oldest entry, so memory can never grow forever. This matters on Cloud Run, where memory is limited and costs money.

### The cache key
The key decides which requests count as "the same". I make city names lowercase, so Delhi and delhi share one entry. I round coordinates to 2 decimal places, which is about 1 km, so nearby locations share an entry too. The key also includes the route name, so current weather and the forecast are saved separately.

### Never cache errors
I only save successful answers. If OpenWeatherMap has a problem for a moment and I saved that error, users would see the error for 10 minutes even after it is fixed. I wrote a test for this, and when I broke the code on purpose, the test caught it.

### The X-Cache header
My server adds a header called X-Cache to each answer. HIT means it came from the cache. MISS means it came from OpenWeatherMap. I can see it in the browser's Network tab. Big services like CDNs use the same idea.

### Faking time in tests
To test that entries expire after 10 minutes, I did not wait 10 minutes. I gave the cache a fake clock that I can move forward instantly. This is dependency injection again: the cache gets its clock from outside.

### Shared state between tests
After adding the cache, two old tests failed. All tests in one file shared one app and so one cache. An earlier test saved Delhi, and a later test that expected an error got the saved success instead. This is called shared state between tests. Good tests must be independent. I turned caching off in those test files and gave caching its own test file, where every test gets a fresh app.

### Limits of my cache
Each running copy of my server has its own cache in its own memory. Cloud Run can run several copies, and when it scales down to zero, the cache is lost. For weather data that is fine. If many copies needed to share one cache, I would use a shared cache like Redis, for example Google Memorystore, but it costs money all the time.

I saw this myself: when my server restarted, the first search was a MISS again, because the memory was cleared.

---

## Day 4: Docker

### Why I upgraded to Node 24
My plan said Node 20, but Node 20 reached end of life on 30 April 2026. End of life means no more security fixes. Node 24 is the current long-term support version and is supported until 2028. My laptop already used Node 24, so the container now matches my laptop.

### What is .dockerignore?
When I build an image, Docker first sends my project folder to the Docker engine. This is called the build context. .dockerignore lists files that must not be sent. I exclude .env so my API key can never get inside an image. I exclude node_modules because the image installs its own clean copy, and my Windows copy could break on Linux. I also exclude .git, tests and docs because the app does not need them to run.

### What is a Dockerfile?
A Dockerfile is a recipe that tells Docker how to build an image, step by step. Each step creates a layer. Docker saves layers in a cache, so unchanged steps are reused and rebuilds are fast.

### Multi-stage build
My Dockerfile has three stages. The build stage installs all packages and builds the React website into dist. The deps stage installs only the packages needed to run the server. The final runtime stage starts fresh and copies in only dist, the server code and the production packages. Build tools like Vite and Jest stay behind in the earlier stages.

### Copy package files first
I copy package.json and package-lock.json before the source code, then run npm ci. If I only change my code, Docker reuses the saved npm ci layer, so the rebuild takes seconds instead of a minute.

### Alpine
Alpine is a very small Linux. Using node:24-alpine makes the image much smaller than the normal Debian-based node image, and fewer programs inside means fewer things that can have security problems.

### Running as a non-root user
By default, programs in a container run as root, the most powerful user. The official Node image has a normal user called node, and I switch to it with USER node. My app files stay owned by root, so the app can read its code but cannot change it. I tested this: trying to edit a file gave "Permission denied".

### Secrets at runtime, not build time
My API key is not inside the image. I pass it when I start the container with --env-file .env. I checked that .env does not exist inside the image. On Cloud Run, the key will come from Secret Manager the same way, as an environment variable.

### Graceful shutdown
When Docker or Cloud Run wants to stop my container, it first sends a signal called SIGTERM. My server now listens for it, stops taking new requests, finishes the current ones and exits. docker stop took 0.37 seconds with exit code 0. Without this, Docker waits 10 seconds and then kills the app by force.

I used the exec form of CMD, which is CMD ["node", "server/index.js"]. This makes Node the main process, so it receives the SIGTERM signal directly.

### The size problem I found
My first image was 303 MB, and the node_modules layer was 54.6 MB. I looked inside and found lucide-react (40 MB) and react-dom (8 MB). These are frontend libraries. Vite copies what it needs into dist during the build, so the server never uses them. They were listed as normal dependencies, so they got installed. I moved them to devDependencies. Now Express is the only runtime package, node_modules is 5.4 MB and the image is 250 MB.

### Comparing with a simple Dockerfile
I also built a simple one-stage image using the full node:24 image, the way many tutorials do it. It was 1.93 GB, ran as root and contained Jest, Vite and ESLint. My image is about 8 times smaller, runs as a normal user and contains only what the app needs. Smaller images upload faster, start faster on Cloud Run and are safer.

### Docker commands I used
docker build -t skycast:local . builds an image and gives it a name and tag. docker run -d starts a container in the background. -p 8081:8080 connects port 8081 on my laptop to port 8080 inside the container. docker ps shows running containers. docker logs shows what the app printed. docker exec runs a command inside a running container. docker stop stops it gracefully. docker history shows the size of each layer.

### A safety check stopped me
I tried to remove an old container with a command that used a shell variable. A safety check blocked it because it could not be sure what would be deleted. I stopped the container instead, which deletes nothing. Being careful with delete commands is an important habit.

---

## Day 4 (continued): A living interface

### Animated weather scenes
Behind the app there is now a moving scene that matches the weather. Rain falls, snow drifts, stars twinkle with a moon at night, clouds float, a sun glows on clear days, fog rolls in mist, and lightning flashes in storms. It is made only with CSS animations, so there are no image downloads.

The scene sits behind the content with position fixed, and pointer-events none means it can never block a click. The animations only change position and transparency, which the graphics card handles, so they stay smooth on phones. People who turn on "reduce motion" in their system settings see no movement.

### Keeping React components pure
A React component must always show the same thing for the same input. So I did not use Math.random to place raindrops, because that would change on every redraw. Instead, a small formula spreads them out in a pattern that looks random. It runs once when the file loads.

### Replaying the entrance animation
The weather cards slide up when a city loads. To replay this for every new city, I gave the results block a key made from the city and time. When the key changes, React treats it as a brand new block and the animation plays again.

### A custom hook: useNow
A hook is reusable component logic, and its name starts with use. useNow gives the current time and updates it every 10 seconds, so the city clock keeps ticking. It starts a timer with useEffect and returns a cleanup function that stops the timer when the component disappears. Forgetting cleanup causes memory leaks.

### Live clock versus update time
The main card now shows two different times. The big line is the city's current local time, which ticks. The small "Updated" time is when OpenWeatherMap measured the data. Before, these were mixed up.

### The sun arc
The sun card draws a half circle from sunrise to sunset with a glowing dot where the sun is now. I worked out the position with simple trigonometry: at sunrise the dot is at the left end, at sunset at the right end. It also shows how much daylight is left, or how long until sunrise.

### Testing the look with fake data
I cannot make it rain in London when I want to. So my test script told the browser to answer the weather request itself with fake data for each weather type. This is called mocking the network, and tools like Playwright do the same. It let me screenshot all seven scenes and check for errors.

### Fixing what the screenshots showed
The phone screenshots showed two layout problems. The sun card times wrapped onto two lines, and the moon covered the search bar. I fixed both with small CSS changes and checked again. Looking at the real result, not just passing tests, catches problems tests cannot see.

### Stopping only my own processes
My cleanup command once missed my test server, because Windows did not mark it as listening. I found it by its process ID and checked its full command before stopping it, so I would not stop anything of the user's. Always check what a process is before you kill it.
