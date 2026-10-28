// Small pure functions that turn raw API values into display text.
// Kept outside React components so they are easy to test and reuse.

// Our API always returns Celsius (units=metric); convert only for display
export function formatTemp(celsius, unit) {
  const value = unit === 'F' ? (celsius * 9) / 5 + 32 : celsius;
  return `${Math.round(value)}°`;
}

// OpenWeatherMap returns wind in metres per second for metric units
export function formatWind(metresPerSecond, unit) {
  return unit === 'F'
    ? `${Math.round(metresPerSecond * 2.237)} mph`
    : `${Math.round(metresPerSecond * 3.6)} km/h`;
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Wind degrees (0-360) to one of 8 compass directions; each covers 45 degrees
export function windDirection(degrees) {
  return DIRECTIONS[Math.round(degrees / 45) % 8];
}

// Visibility comes in metres (max 10000)
export function formatVisibility(metres) {
  return `${(metres / 1000).toFixed(1)} km`;
}

// Formats a Unix time in the CITY's timezone, not the viewer's.
// Shift by the city's offset, then format as UTC so the browser's own timezone is ignored.
export function formatCityTime(unixSeconds, offsetSeconds, options) {
  const shifted = new Date((unixSeconds + offsetSeconds) * 1000);
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(shifted);
}

// The city's local date as "YYYY-MM-DD", to compare with forecast dates
export function cityDate(unixSeconds, offsetSeconds) {
  return new Date((unixSeconds + offsetSeconds) * 1000).toISOString().slice(0, 10);
}

// "2026-10-29" -> "Thu"
export function dayName(isoDate) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

// Background theme from the condition and day/night.
// OpenWeatherMap icon codes end in "d" (day) or "n" (night), e.g. "01n".
export function getTheme(main, icon) {
  const night = icon?.endsWith('n');
  switch (main) {
    case 'Clear':
      return night ? 'clear-night' : 'clear-day';
    case 'Clouds':
      return night ? 'clouds-night' : 'clouds-day';
    case 'Rain':
    case 'Drizzle':
      return 'rain';
    case 'Thunderstorm':
      return 'storm';
    case 'Snow':
      return 'snow';
    default:
      return 'mist'; // Mist, Haze, Fog, Smoke, Dust...
  }
}
