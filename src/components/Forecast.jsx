import { CalendarDays } from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { dayName, formatTemp } from "../utils/weather";

// 5-day forecast list. Each bar shows that day's min-max within the whole week's range.
export default function Forecast({ days, today, unit }) {
  const weekMin = Math.min(...days.map((d) => d.min));
  const weekMax = Math.max(...days.map((d) => d.max));
  const span = weekMax - weekMin || 1; // avoid dividing by zero if every day is the same

  return (
    <section className="card forecast" aria-label="5-day forecast">
      <h3 className="forecast-title">
        <CalendarDays size={18} aria-hidden="true" />
        5-day forecast
      </h3>
      <ul>
        {days.map((day) => (
          <li key={day.date} className="forecast-row">
            <span className="forecast-day">{day.date === today ? "Today" : dayName(day.date)}</span>
            <span className="forecast-icon" title={day.description}>
              <WeatherIcon main={day.main} icon={day.icon} size={26} />
              <span className="sr-only">{day.description}</span>
            </span>
            <span className="forecast-min">{formatTemp(day.min, unit)}</span>
            <span className="forecast-bar" aria-hidden="true">
              {/* Position the coloured part between this day's min and max */}
              <span
                style={{
                  left: `${((day.min - weekMin) / span) * 100}%`,
                  right: `${((weekMax - day.max) / span) * 100}%`,
                }}
              />
            </span>
            <span className="forecast-max">{formatTemp(day.max, unit)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
