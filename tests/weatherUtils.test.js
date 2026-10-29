import { describe, it, expect } from '@jest/globals';
import {
  cityDate,
  dayName,
  formatCityTime,
  formatDuration,
  formatTemp,
  formatVisibility,
  formatWind,
  getTheme,
  sunProgress,
  windDirection,
} from '../src/utils/weather.js';

const IST_OFFSET = 19800; // UTC+5:30
const TIME = { hour: 'numeric', minute: '2-digit' };

describe('formatTemp', () => {
  it('rounds Celsius', () => {
    expect(formatTemp(20.6, 'C')).toBe('21°');
  });

  it('converts to Fahrenheit', () => {
    expect(formatTemp(0, 'F')).toBe('32°');
    expect(formatTemp(100, 'F')).toBe('212°');
  });
});

describe('formatWind', () => {
  it('converts m/s to km/h for metric', () => {
    expect(formatWind(5, 'C')).toBe('18 km/h');
  });

  it('converts m/s to mph for imperial', () => {
    expect(formatWind(10, 'F')).toBe('22 mph');
  });
});

describe('windDirection', () => {
  it.each([
    [0, 'N'],
    [44, 'NE'],
    [90, 'E'],
    [225, 'SW'],
    [350, 'N'],
  ])('%i degrees is %s', (degrees, expected) => {
    expect(windDirection(degrees)).toBe(expected);
  });
});

describe('formatVisibility', () => {
  it('converts metres to kilometres', () => {
    expect(formatVisibility(10000)).toBe('10.0 km');
    expect(formatVisibility(2500)).toBe('2.5 km');
  });
});

describe('city time and date', () => {
  // 2026-10-28 20:00 UTC
  const unix = Date.parse('2026-10-28T20:00:00Z') / 1000;

  it("shows the time in the city's timezone, not the viewer's", () => {
    expect(formatCityTime(unix, 0, TIME)).toBe('8:00 PM');
    expect(formatCityTime(unix, IST_OFFSET, TIME)).toBe('1:30 AM');
  });

  it("returns the city's local date", () => {
    expect(cityDate(unix, 0)).toBe('2026-10-28');
    expect(cityDate(unix, IST_OFFSET)).toBe('2026-10-29');
  });

  it('turns an ISO date into a short weekday', () => {
    expect(dayName('2026-10-29')).toBe('Thu');
  });
});

describe('sunProgress', () => {
  const sunrise = 1000;
  const sunset = 2000;

  it('is 0 at sunrise, 0.5 at midday and 1 at sunset', () => {
    expect(sunProgress(1000, sunrise, sunset)).toBe(0);
    expect(sunProgress(1500, sunrise, sunset)).toBe(0.5);
    expect(sunProgress(2000, sunrise, sunset)).toBe(1);
  });

  it('is null before sunrise and after sunset', () => {
    expect(sunProgress(999, sunrise, sunset)).toBeNull();
    expect(sunProgress(2001, sunrise, sunset)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [11520, '3h 12m'],
    [3600, '1h 0m'],
    [1500, '25m'],
    [-50, '0m'],
  ])('%i seconds is %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('getTheme', () => {
  it.each([
    ['Clear', '01d', 'clear-day'],
    ['Clear', '01n', 'clear-night'],
    ['Clouds', '04d', 'clouds-day'],
    ['Drizzle', '09d', 'rain'],
    ['Thunderstorm', '11d', 'storm'],
    ['Snow', '13n', 'snow'],
    ['Haze', '50d', 'mist'],
  ])('%s with icon %s uses the %s theme', (main, icon, expected) => {
    expect(getTheme(main, icon)).toBe(expected);
  });
});
