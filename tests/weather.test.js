import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../server/app.js';

// A fake key: tests never need the real secret (dependency injection via createApp)
const API_KEY = 'test-api-key';
const app = createApp({ apiKey: API_KEY });

const sampleWeather = { name: 'Delhi', main: { temp: 20 }, weather: [{ main: 'Clear' }] };

// Replaces the real fetch with a fake that returns the given status and JSON body.
// No real network call is made, so tests are fast, free and work offline.
function mockOpenWeather(status, body) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

// The URL our server sent to OpenWeatherMap in the first fetch call
function calledUrl(fetchMock) {
  return new URL(fetchMock.mock.calls[0][0]);
}

let consoleErrorSpy;

beforeEach(() => {
  // Silence expected error logs, but keep a spy so we can check what was logged
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks(); // put the real fetch and console.error back
});

describe('GET /api/weather - input validation', () => {
  it.each([
    ['no parameters', ''],
    ['a blank city', '?city=%20%20'],
    ['a city name over 100 characters', `?city=${'a'.repeat(101)}`],
    ['latitude out of range', '?lat=999&lon=10'],
    ['missing longitude', '?lat=28.6'],
  ])('returns 400 for %s', async (_label, query) => {
    const fetchMock = mockOpenWeather(200, sampleWeather);

    const res = await request(app).get(`/api/weather${query}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Provide a city, or lat and lon' });
    expect(fetchMock).not.toHaveBeenCalled(); // bad input never reaches OpenWeatherMap
  });
});

describe('GET /api/weather - success', () => {
  it('returns weather for a city and calls OpenWeatherMap correctly', async () => {
    const fetchMock = mockOpenWeather(200, sampleWeather);

    const res = await request(app).get('/api/weather?city=Delhi');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleWeather);

    const url = calledUrl(fetchMock);
    expect(url.hostname).toBe('api.openweathermap.org');
    expect(url.searchParams.get('q')).toBe('Delhi');
    expect(url.searchParams.get('appid')).toBe(API_KEY);
    expect(url.searchParams.get('units')).toBe('metric');
  });

  it('returns weather for latitude and longitude', async () => {
    const fetchMock = mockOpenWeather(200, sampleWeather);

    const res = await request(app).get('/api/weather?lat=28.61&lon=77.21');

    expect(res.status).toBe(200);
    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('lat')).toBe('28.61');
    expect(url.searchParams.get('lon')).toBe('77.21');
    expect(url.searchParams.has('q')).toBe(false);
  });

  it('safely encodes special characters so users cannot inject parameters', async () => {
    const fetchMock = mockOpenWeather(200, sampleWeather);

    // An attacker tries to sneak an extra appid into our upstream request
    await request(app).get('/api/weather').query({ city: 'New York&appid=evil' });

    const url = calledUrl(fetchMock);
    expect(url.searchParams.get('q')).toBe('New York&appid=evil');
    expect(url.searchParams.getAll('appid')).toEqual([API_KEY]); // still only our key
  });
});

describe('GET /api/weather - errors', () => {
  it('returns 404 when OpenWeatherMap cannot find the city', async () => {
    mockOpenWeather(404, { cod: '404', message: 'city not found' });

    const res = await request(app).get('/api/weather?city=NoSuchCity');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'City not found' });
  });

  it('returns 502 when OpenWeatherMap rejects the key, without leaking the key', async () => {
    mockOpenWeather(401, { cod: 401, message: 'Invalid API key' });

    const res = await request(app).get('/api/weather?city=Delhi');

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Weather service unavailable' });
    expect(JSON.stringify(res.body)).not.toContain(API_KEY);

    // The failure is logged for us, but the log never contains the key
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls.flat().join(' ')).not.toContain(API_KEY);
  });

  it('returns 502 when the request fails or times out', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('The operation timed out', 'TimeoutError'));

    const res = await request(app).get('/api/weather?city=Delhi');

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Weather service unavailable' });
  });

  it('returns 500 when the API key is not configured', async () => {
    const fetchMock = mockOpenWeather(200, sampleWeather);
    const appWithoutKey = createApp({ apiKey: '' });

    const res = await request(appWithoutKey).get('/api/weather?city=Delhi');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Server is not configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
