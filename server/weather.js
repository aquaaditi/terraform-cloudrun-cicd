const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const TIMEOUT_MS = 5000;

// Validates the query string. Returns { city } or { lat, lon }, or null if the input is invalid.
// Never trust user input: it ends up in a request we send to another server.
export function parseLocation(query) {
  const city = typeof query.city === 'string' ? query.city.trim() : '';
  if (city) {
    return city.length <= 100 ? { city } : null;
  }

  // Used by the frontend's "Current Location" button
  const lat = Number.parseFloat(query.lat);
  const lon = Number.parseFloat(query.lon);
  const validLat = Number.isFinite(lat) && Math.abs(lat) <= 90;
  const validLon = Number.isFinite(lon) && Math.abs(lon) <= 180;
  return validLat && validLon ? { lat, lon } : null;
}

// Calls an OpenWeatherMap endpoint ("weather" or "forecast") from the server,
// so the API key never reaches the browser. Returns the upstream status and JSON body.
async function callOpenWeather(endpoint, location, apiKey) {
  // URLSearchParams encodes values safely (spaces, &, etc. in city names)
  const params = new URLSearchParams({ appid: apiKey, units: 'metric' });
  if (location.city) {
    params.set('q', location.city);
  } else {
    params.set('lat', String(location.lat));
    params.set('lon', String(location.lon));
  }

  const response = await fetch(`${OPENWEATHER_BASE_URL}/${endpoint}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS), // give up instead of hanging if the API is slow
  });

  return { status: response.status, body: await response.json() };
}

// Current weather, passed through as OpenWeatherMap returns it
export function getWeather(location, apiKey) {
  return callOpenWeather('weather', location, apiKey);
}

// 5-day forecast, condensed from 40 three-hour entries into one summary per day
export async function getForecast(location, apiKey) {
  const { status, body } = await callOpenWeather('forecast', location, apiKey);
  return { status, body: status === 200 ? summarizeForecast(body) : body };
}

const MAX_DAYS = 5;

// Groups OpenWeatherMap's 3-hourly forecast into daily summaries.
// Times are in UTC, so we shift them by the city's timezone offset first;
// otherwise late-night entries would be counted on the wrong day.
export function summarizeForecast(data) {
  const offsetSeconds = data.city?.timezone ?? 0;
  const days = new Map(); // "2026-10-28" -> summary for that local date

  for (const entry of data.list ?? []) {
    // Shift to the city's local time, then read the date/hour with UTC methods
    const local = new Date((entry.dt + offsetSeconds) * 1000);
    const date = local.toISOString().slice(0, 10);
    const hoursFromNoon = Math.abs(local.getUTCHours() - 12);

    const day = days.get(date) ?? { date, min: Infinity, max: -Infinity, hoursFromNoon: Infinity };
    day.min = Math.min(day.min, entry.main.temp_min);
    day.max = Math.max(day.max, entry.main.temp_max);

    // The entry closest to midday represents the day's typical weather
    if (hoursFromNoon < day.hoursFromNoon) {
      day.hoursFromNoon = hoursFromNoon;
      day.main = entry.weather[0].main;
      day.description = entry.weather[0].description;
      day.icon = entry.weather[0].icon;
    }
    days.set(date, day);
  }

  return {
    city: data.city?.name,
    days: [...days.values()]
      .slice(0, MAX_DAYS)
      .map(({ date, min, max, main, description, icon }) => ({ date, min, max, main, description, icon })),
  };
}
