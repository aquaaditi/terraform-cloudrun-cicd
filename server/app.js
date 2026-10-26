import express from 'express';
import { getWeather, parseLocation } from './weather.js';

// Builds and returns the Express app WITHOUT starting it.
// Tests import this directly and send requests with supertest (no real port needed).
// apiKey is a parameter so tests can pass a fake key (dependency injection).
export function createApp({ apiKey = process.env.OPENWEATHER_API_KEY } = {}) {
  const app = express();

  // Hide the "X-Powered-By: Express" header so we don't advertise our stack to attackers
  app.disable('x-powered-by');

  // Health check: Cloud Run and our uptime check call this to know the app is alive.
  // It must be fast and must NOT depend on external APIs.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Weather proxy: the browser calls us, we call OpenWeatherMap with the secret key
  app.get('/api/weather', async (req, res) => {
    const location = parseLocation(req.query);
    if (!location) {
      return res.status(400).json({ error: 'Provide a city, or lat and lon' });
    }

    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set');
      return res.status(500).json({ error: 'Server is not configured' });
    }

    try {
      const { status, body } = await getWeather(location, apiKey);
      if (status === 200) {
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
  });

  return app;
}
