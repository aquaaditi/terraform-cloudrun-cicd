import { describe, it, expect, jest, afterEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { summarizeForecast } from '../server/weather.js';

const API_KEY = 'test-api-key';
const app = createApp({ apiKey: API_KEY });

const IST_OFFSET = 19800; // India is UTC+5:30 = 19800 seconds

// Builds one 3-hour forecast entry in OpenWeatherMap's format, at a UTC time
function entry(isoUtc, tempMin, tempMax, main = 'Clear', icon = '01d') {
  return {
    dt: Date.parse(isoUtc) / 1000,
    main: { temp_min: tempMin, temp_max: tempMax },
    weather: [{ main, description: main.toLowerCase(), icon }],
  };
}

function mockOpenWeather(status, body) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

// Unit tests: summarizeForecast is a pure function, so no HTTP or mocks needed
describe('summarizeForecast', () => {
  it('groups entries by date and keeps the lowest min and highest max', () => {
    const data = {
      city: { name: 'Delhi', timezone: 0 },
      list: [
        entry('2026-10-28T06:00:00Z', 15, 20),
        entry('2026-10-28T12:00:00Z', 22, 28),
        entry('2026-10-28T18:00:00Z', 17, 19),
        entry('2026-10-29T12:00:00Z', 10, 12),
      ],
    };

    const result = summarizeForecast(data);

    expect(result.city).toBe('Delhi');
    expect(result.days).toHaveLength(2);
    expect(result.days[0]).toMatchObject({ date: '2026-10-28', min: 15, max: 28 });
    expect(result.days[1]).toMatchObject({ date: '2026-10-29', min: 10, max: 12 });
  });

  it("uses the city's timezone to decide which day an entry belongs to", () => {
    // 20:00 UTC on the 28th is 01:30 on the 29th in India
    const late = [entry('2026-10-28T20:00:00Z', 18, 20)];

    const inLondon = summarizeForecast({ city: { timezone: 0 }, list: late });
    const inIndia = summarizeForecast({ city: { timezone: IST_OFFSET }, list: late });

    expect(inLondon.days[0].date).toBe('2026-10-28');
    expect(inIndia.days[0].date).toBe('2026-10-29');
  });

  it('uses the entry closest to midday as the condition for the day', () => {
    const data = {
      city: { timezone: 0 },
      list: [
        entry('2026-10-28T03:00:00Z', 15, 16, 'Rain', '10n'),
        entry('2026-10-28T12:00:00Z', 25, 26, 'Clear', '01d'),
        entry('2026-10-28T21:00:00Z', 18, 19, 'Clouds', '04n'),
      ],
    };

    const [day] = summarizeForecast(data).days;

    expect(day).toMatchObject({ main: 'Clear', description: 'clear', icon: '01d' });
  });

  it('returns at most 5 days', () => {
    const list = [];
    for (let d = 1; d <= 7; d++) {
      list.push(entry(`2026-11-0${d}T12:00:00Z`, 20, 25));
    }

    const result = summarizeForecast({ city: { timezone: 0 }, list });

    expect(result.days).toHaveLength(5);
    expect(result.days[0].date).toBe('2026-11-01');
    expect(result.days[4].date).toBe('2026-11-05');
  });

  it('returns no days when the forecast list is missing', () => {
    expect(summarizeForecast({ city: { name: 'Delhi' } }).days).toEqual([]);
  });
});

// Route tests: full HTTP request through Express, with OpenWeatherMap mocked
describe('GET /api/forecast', () => {
  it('returns daily summaries and calls the forecast endpoint', async () => {
    const fetchMock = mockOpenWeather(200, {
      city: { name: 'Delhi', timezone: IST_OFFSET },
      list: [entry('2026-10-28T06:30:00Z', 20, 30, 'Clouds', '04d')],
    });

    const res = await request(app).get('/api/forecast?city=Delhi');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      city: 'Delhi',
      days: [
        { date: '2026-10-28', min: 20, max: 30, main: 'Clouds', description: 'clouds', icon: '04d' },
      ],
    });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/data/2.5/forecast');
    expect(url.searchParams.get('q')).toBe('Delhi');
    expect(url.searchParams.get('appid')).toBe(API_KEY);
  });

  it('returns 404 when the city is not found', async () => {
    mockOpenWeather(404, { cod: '404', message: 'city not found' });

    const res = await request(app).get('/api/forecast?city=NoSuchCity');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'City not found' });
  });

  it('returns 400 for invalid input without calling OpenWeatherMap', async () => {
    const fetchMock = mockOpenWeather(200, {});

    const res = await request(app).get('/api/forecast?lat=999&lon=0');

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
