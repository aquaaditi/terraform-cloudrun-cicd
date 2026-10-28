# syntax=docker/dockerfile:1
# Multi-stage build: build tools stay in earlier stages, only what's needed to RUN
# the app is copied into the small final image.

# ---------- Stage 1: build the React frontend ----------
FROM node:24-alpine AS build
WORKDIR /app

# Copy dependency files first: if only source code changes, Docker reuses the
# cached `npm ci` layer and rebuilds in seconds
COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- Stage 2: production dependencies only ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=dev skips Jest, Vite, ESLint... they are not needed at runtime
RUN npm ci --omit=dev

# ---------- Stage 3: the runtime image (this is what gets deployed) ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

# Files stay owned by root: the app user can read the code but not change it
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY server ./server

# Run as the unprivileged "node" user that ships with the official image
USER node

# Documents the port; Cloud Run sends traffic to $PORT (8080)
EXPOSE 8080

# Exec form: node runs as PID 1 and receives SIGTERM for graceful shutdown
CMD ["node", "server/index.js"]
