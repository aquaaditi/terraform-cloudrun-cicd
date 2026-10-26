import express from 'express';

// Builds and returns the Express app WITHOUT starting it.
// Tests import this directly and send requests with supertest (no real port needed).
export function createApp() {
  const app = express();

  // Hide the "X-Powered-By: Express" header so we don't advertise our stack to attackers
  app.disable('x-powered-by');

  // Health check: Cloud Run and our uptime check call this to know the app is alive.
  // It must be fast and must NOT depend on external APIs.
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
