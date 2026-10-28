import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Cloudy,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react";

// Shows a Lucide icon for an OpenWeatherMap condition.
// Icon codes look like "02n": the number is the cloud level, "d"/"n" means day/night.
export default function WeatherIcon({ main, icon = "", size = 24, className }) {
  const props = { size, className, "aria-hidden": true };
  const night = icon.endsWith("n");
  const level = icon.slice(0, 2);

  switch (main) {
    case "Clear":
      return night ? <Moon {...props} /> : <Sun {...props} />;
    case "Clouds":
      if (level === "02") return night ? <CloudMoon {...props} /> : <CloudSun {...props} />; // few clouds
      if (level === "03") return <Cloud {...props} />; // scattered clouds
      return <Cloudy {...props} />; // broken / overcast
    case "Rain":
      return <CloudRain {...props} />;
    case "Drizzle":
      return <CloudDrizzle {...props} />;
    case "Thunderstorm":
      return <CloudLightning {...props} />;
    case "Snow":
      return <Snowflake {...props} />;
    default:
      return <CloudFog {...props} />; // mist, haze, fog, smoke, dust
  }
}
