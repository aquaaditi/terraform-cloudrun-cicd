const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
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

// Calls OpenWeatherMap from the server, so the API key never reaches the browser.
// Returns the upstream HTTP status and JSON body; the route decides what to send to the user.
export async function getWeather(location, apiKey) {
  // URLSearchParams encodes values safely (spaces, &, etc. in city names)
  const params = new URLSearchParams({ appid: apiKey, units: 'metric' });
  if (location.city) {
    params.set('q', location.city);
  } else {
    params.set('lat', String(location.lat));
    params.set('lon', String(location.lon));
  }

  const response = await fetch(`${OPENWEATHER_URL}?${params}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS), // give up instead of hanging if the API is slow
  });

  return { status: response.status, body: await response.json() };
}
