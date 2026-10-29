import { Cloud, Droplets, Eye, Gauge, Umbrella, Wind } from "lucide-react";
import { formatVisibility, formatWind, windDirection } from "../utils/weather";

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

// Grid of extra measurements (sunrise/sunset are shown in the SunArc card)
export default function WeatherDetails({ weather, unit }) {
  const { main, wind, visibility, clouds, rain } = weather;

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
      <Detail icon={Cloud} label="Cloud cover" value={`${clouds?.all ?? 0}%`} />
      {/* OpenWeatherMap only includes "rain" when it rained in the last hour */}
      <Detail icon={Umbrella} label="Rain (1h)" value={`${rain?.["1h"] ?? 0} mm`} />
    </section>
  );
}
