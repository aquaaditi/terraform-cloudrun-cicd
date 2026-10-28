import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../server/app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    // Act: supertest sends a fake HTTP request straight to the app (no real port)
    const res = await request(createApp()).get('/health');

    // Assert: check the status code and the JSON body
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('does not expose the X-Powered-By header', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
