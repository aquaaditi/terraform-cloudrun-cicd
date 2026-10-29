import { Clock, MapPin } from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { useNow } from "../hooks/useNow";
import { formatCityTime, formatTemp } from "../utils/weather";

const LOCAL_FORMAT = {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
};
const TIME = { hour: "numeric", minute: "2-digit" };

// The main card: city, live local time, big temperature and condition
export default function CurrentWeather({ weather, unit }) {
  const now = useNow(); // ticks, so the city's clock keeps moving
  const condition = weather.weather[0];

  return (
    <section className="card current" aria-label={`Current weather in ${weather.name}`}>
      <div>
        <h2 className="city">
          <MapPin size={22} aria-hidden="true" />
          {weather.name}
          {weather.sys?.country && <span className="country">{weather.sys.country}</span>}
        </h2>
        <p className="local-time">
          <Clock size={15} aria-hidden="true" />
          {formatCityTime(now, weather.timezone, LOCAL_FORMAT)}
        </p>

        <p className="temp">{formatTemp(weather.main.temp, unit)}</p>
        <p className="condition">{condition.description}</p>
        <p className="feels-like">
          Feels like {formatTemp(weather.main.feels_like, unit)}
          {/* dt = when OpenWeatherMap measured this data */}
          <span className="updated"> · Updated {formatCityTime(weather.dt, weather.timezone, TIME)}</span>
        </p>
      </div>

      <WeatherIcon main={condition.main} icon={condition.icon} size={160} className="current-icon" />
    </section>
  );
}
