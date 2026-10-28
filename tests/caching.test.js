import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../server/app.js';

const weatherBody = { name: 'Delhi', main: { temp: 20 }, weather: [{ main: 'Clear' }] };
const forecastBody = { city: { name: 'Delhi', timezone: 0 }, list: [] };

// Fake fetch that builds a NEW Response for every call (a body can only be read once).
// It answers the forecast endpoint with forecast data and anything else with weather data.
function mockOpenWeather(status = 200) {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const body = String(url).includes('/forecast') ? forecastBody : weatherBody;
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

let app;

beforeEach(() => {
  // A fresh app (and so an empty cache) for every test, so tests stay independent
  app = createApp({ apiKey: 'test-api-key' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('caching OpenWeatherMap responses', () => {
  it('serves a repeated request from the cache without calling OpenWeatherMap again', async () => {
    const fetchMock = mockOpenWeather();

    const first = await request(app).get('/api/weather?city=Delhi');
    const second = await request(app).get('/api/weather?city=Delhi');

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats different spellings of the same city as one cache entry', async () => {
    const fetchMock = mockOpenWeather();

    await request(app).get('/api/weather?city=Delhi');
    const res = await request(app).get('/api/weather').query({ city: '  DELHI ' });

    expect(res.headers['x-cache']).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares an entry for coordinates less than about 1 km apart', async () => {
    const fetchMock = mockOpenWeather();

    await request(app).get('/api/weather?lat=28.6139&lon=77.2090');
    const res = await request(app).get('/api/weather?lat=28.6141&lon=77.2092');

    expect(res.headers['x-cache']).toBe('HIT');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches current weather and forecast separately', async () => {
    const fetchMock = mockOpenWeather();

    await request(app).get('/api/weather?city=Delhi');
    const forecast = await request(app).get('/api/forecast?city=Delhi');

    expect(forecast.headers['x-cache']).toBe('MISS');
    expect(forecast.body).toEqual({ city: 'Delhi', days: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never caches errors, so the next request tries again', async () => {
    const fetchMock = mockOpenWeather(500); // OpenWeatherMap is having a problem

    const failed = await request(app).get('/api/weather?city=Delhi');
    expect(failed.status).toBe(502);

    fetchMock.mockRestore();
    const retryMock = mockOpenWeather(200); // ...and now it has recovered

    const recovered = await request(app).get('/api/weather?city=Delhi');

    expect(recovered.status).toBe(200);
    expect(recovered.headers['x-cache']).toBe('MISS');
    expect(retryMock).toHaveBeenCalledTimes(1);
  });
});
