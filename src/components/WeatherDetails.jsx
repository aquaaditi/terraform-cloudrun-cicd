import { Droplets, Eye, Gauge, Sunrise, Sunset, Wind } from "lucide-react";
import {
  formatCityTime,
  formatVisibility,
  formatWind,
  windDirection,
} from "../utils/weather";

const TIME = { hour: "numeric", minute: "2-digit" };

// One small tile: icon + label + value
function Detail({ icon: Icon, label, value }) {
  return (
    <div className="card detail">
      <span className="detail-label">
        <Icon size={18} aria-hidden="true" />
        {label}
      </span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

// Grid of extra measurements. Sunrise/sunset use the CITY's timezone.
export default function WeatherDetails({ weather, unit }) {
  const { main, wind, sys, timezone, visibility } = weather;

  return (
    <section className="details" aria-label="Weather details">
      <Detail icon={Droplets} label="Humidity" value={`${main.humidity}%`} />
      <Detail
        icon={Wind}
        label="Wind"
        value={`${formatWind(wind.speed, unit)} ${windDirection(wind.deg)}`}
      />
      <Detail icon={Gauge} label="Pressure" value={`${main.pressure} hPa`} />
      <Detail
        icon={Eye}
        label="Visibility"
        value={visibility != null ? formatVisibility(visibility) : "—"}
      />
      <Detail icon={Sunrise} label="Sunrise" value={formatCityTime(sys.sunrise, timezone, TIME)} />
      <Detail icon={Sunset} label="Sunset" value={formatCityTime(sys.sunset, timezone, TIME)} />
    </section>
  );
}
