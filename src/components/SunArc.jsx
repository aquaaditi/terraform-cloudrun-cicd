import { Sunrise, Sunset } from "lucide-react";
import { useNow } from "../hooks/useNow";
import { formatCityTime, formatDuration, sunProgress } from "../utils/weather";

const TIME = { hour: "numeric", minute: "2-digit" };
const DAY_SECONDS = 24 * 60 * 60;

// Sun's path from sunrise to sunset, with a dot at its current position (city's local time)
export default function SunArc({ sunrise, sunset, timezone }) {
  const now = useNow();
  const progress = sunProgress(now, sunrise, sunset); // null while the sun is down
  const sunUp = progress !== null;
  const position = sunUp ? progress : now < sunrise ? 0 : 1;

  // Arc is a half circle: centre (100, 100), radius 90. Progress 0 = left end, 1 = right end.
  const angle = Math.PI * (1 - position);
  const x = 100 + 90 * Math.cos(angle);
  const y = 100 - 90 * Math.sin(angle);

  let status;
  if (sunUp) status = `${formatDuration(sunset - now)} of daylight left`;
  else if (now < sunrise) status = `Sunrise in ${formatDuration(sunrise - now)}`;
  else status = `Sunrise in ${formatDuration(sunrise + DAY_SECONDS - now)}`; // tomorrow (approx.)

  return (
    <section className="card sun-card" aria-label="Sunrise and sunset">
      <svg viewBox="0 0 200 110" className="sun-arc" aria-hidden="true">
        <path d="M10 100 A90 90 0 0 1 190 100" className="arc-track" />
        {position > 0 && <path d={`M10 100 A90 90 0 0 1 ${x} ${y}`} className="arc-done" />}
        <line x1="0" y1="100" x2="200" y2="100" className="arc-horizon" />
        <circle cx={x} cy={y} r="7" className={sunUp ? "arc-sun" : "arc-sun down"} />
      </svg>

      <p className="sun-status">{status}</p>
      <p className="day-length">Day length {formatDuration(sunset - sunrise)}</p>

      <div className="sun-times">
        <span>
          <Sunrise size={16} aria-hidden="true" /> {formatCityTime(sunrise, timezone, TIME)}
        </span>
        <span>
          <Sunset size={16} aria-hidden="true" /> {formatCityTime(sunset, timezone, TIME)}
        </span>
      </div>
    </section>
  );
}
