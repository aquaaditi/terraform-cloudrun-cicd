import express from 'express';
import { fileURLToPath } from 'node:url';
import { createCache } from './cache.js';
import { getForecast, getWeather, locationKey, parseLocation } from './weather.js';

// Absolute path to the React build output (created by `npm run build`)
const distDir = fileURLToPath(new URL('../dist', import.meta.url));

// OpenWeatherMap updates its data about every 10 minutes, so caching longer is pointless
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

// Shared route handler for anything that proxies OpenWeatherMap.
// It validates input, checks the key is configured, serves cached answers
// and maps upstream errors. fetchData is the function that calls OpenWeatherMap.
function openWeatherHandler({ apiKey, cache, name, fetchData }) {
  return async (req, res) => {
    const location = parseLocation(req.query);
    if (!location) {
      return res.status(400).json({ error: 'Provide a city, or lat and lon' });
    }

    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set');
      return res.status(500).json({ error: 'Server is not configured' });
    }

    // Serve from memory if we fetched the same thing recently
    const cacheKey = `${name}:${locationKey(location)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT'); // visible in DevTools: this answer came from the cache
      return res.json(cached);
    }

    try {
      const { status, body } = await fetchData(location, apiKey);
      if (status === 200) {
        cache.set(cacheKey, body); // only successful answers are cached, never errors
        res.set('X-Cache', 'MISS');
        return res.json(body);
      }
      if (status === 404) {
        return res.status(404).json({ error: 'City not found' });
      }
      // e.g. 401 (bad key) or 429 (rate limit): log it, but don't expose details to users.
      // Never log the request URL - it contains the API key.
      console.error(`OpenWeatherMap returned status ${status}`);
      return res.status(502).json({ error: 'Weather service unavailable' });
    } catch (err) {
      // Network failure or timeout
      console.error(`OpenWeatherMap request failed: ${err.name}`);
      return res.status(502).json({ error: 'Weather service unavailable' });
    }
  };
}

// Builds and returns the Express app WITHOUT starting it.
// Tests import this directly and send requests with supertest (no real port needed).
// apiKey and cacheTtlMs are parameters so tests can pass a fake key or turn caching off
// (dependency injection).
export function createApp({
  apiKey = process.env.OPENWEATHER_API_KEY,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
} = {}) {
  const app = express();
  const cache = createCache({ ttlMs: cacheTtlMs }); // one cache shared by both API routes

  // Hide the "X-Powered-By: Express" header so we don't advertise our stack to attackers
  app.disable('x-powered-by');

  // Health check: Cloud Run and our uptime check call this to know the app is alive.
  // It must be fast and must NOT depend on external APIs.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Weather proxy: the browser calls us, we call OpenWeatherMap with the secret key
  app.get(
    '/api/weather',
    openWeatherHandler({ apiKey, cache, name: 'weather', fetchData: getWeather }),
  );

  // 5-day forecast, summarised per day on the server (same validation and error handling)
  app.get(
    '/api/forecast',
    openWeatherHandler({ apiKey, cache, name: 'forecast', fetchData: getForecast }),
  );

  // Serve the built React app (index.html, JS, CSS). Registered AFTER the API routes,
  // so /health and /api/* always reach our code first.
  app.use(express.static(distDir));

  return app;
}
