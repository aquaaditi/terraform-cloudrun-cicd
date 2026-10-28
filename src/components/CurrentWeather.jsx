import { MapPin } from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { formatCityTime, formatTemp } from "../utils/weather";

const UPDATED_FORMAT = {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
};

// The main card: city, local time, big temperature and condition
export default function CurrentWeather({ weather, unit }) {
  const condition = weather.weather[0];

  return (
    <section className="card current" aria-label={`Current weather in ${weather.name}`}>
      <div>
        <h2 className="city">
          <MapPin size={22} aria-hidden="true" />
          {weather.name}
          {weather.sys?.country && <span className="country">{weather.sys.country}</span>}
        </h2>
        {/* dt = when OpenWeatherMap measured this, shown in the city's own timezone */}
        <p className="updated">
          {formatCityTime(weather.dt, weather.timezone, UPDATED_FORMAT)} (local time)
        </p>

        <p className="temp">{formatTemp(weather.main.temp, unit)}</p>
        <p className="condition">{condition.description}</p>
        <p className="feels-like">Feels like {formatTemp(weather.main.feels_like, unit)}</p>
      </div>

      <WeatherIcon main={condition.main} icon={condition.icon} size={160} className="current-icon" />
    </section>
  );
}
