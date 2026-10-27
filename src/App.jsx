import { useState } from "react";
import "./App.css";
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  Gauge,
  LocateFixed,
} from "lucide-react";

// Calls OUR backend, which adds the secret API key on the server.
// The browser never sees the key or talks to OpenWeatherMap directly.
async function fetchWeather(params) {
  const response = await fetch(`/api/weather?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Show the backend's message, e.g. "City not found"
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getWeather = async () => {
    if (!city.trim()) return;

    setLoading(true);
    setError("");

    try {
      setWeather(await fetchWeather({ city }));
    } catch (err) {
      setError(err.message);
      setWeather(null);
    }

    setLoading(false);
  };
  const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    setError("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      setLoading(true);
      setError("");

      try {
        const { latitude, longitude } = position.coords;
        setWeather(await fetchWeather({ lat: latitude, lon: longitude }));
      } catch {
        setError("Unable to fetch location weather.");
      }

      setLoading(false);
    },
    () => {
      setError("Location permission denied.");
    }
  );
};

  return (
    <div className="app">

      <h1>🌤 Weather Dashboard</h1>

      {/* Search Box */}

     <div className="search-box">

  <input
    type="text"
    placeholder="Enter city name..."
    value={city}
    onChange={(e) => setCity(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        getWeather();
      }
    }}
  />

  <button onClick={getWeather} disabled={loading}>
    <Search size={20} />
    {loading ? "Searching..." : "Search"}
  </button>

  <button onClick={getCurrentLocation}>
    <LocateFixed size={20} />
    Current Location
  </button>

</div>

      {/* Error */}

      {error && (
        <p
          style={{
            color: "red",
            textAlign: "center",
            marginBottom: "20px",
            fontSize: "18px",
          }}
        >
          {error}
        </p>
      )}

      {/* Message Before Search */}

      {!weather && !loading && !error && (
        <h3
          style={{
            textAlign: "center",
            color: "#555",
            marginTop: "50px",
          }}
        >
          Search for any city to see weather.
        </h3>
      )}

      {/* Weather Card */}

      {weather && (
        <div className="weather-card">

          <h2>
            <MapPin size={22} />
            {weather.name}
          </h2>

          <h1>{Math.round(weather.main.temp)}°C</h1>

          <p>
            {weather.weather[0].main}{" "}
            {weather.weather[0].main === "Clouds"
              ? "☁️"
              : weather.weather[0].main === "Rain"
              ? "🌧️"
              : weather.weather[0].main === "Clear"
              ? "☀️"
              : weather.weather[0].main === "Thunderstorm"
              ? "⛈️"
              : weather.weather[0].main === "Snow"
              ? "❄️"
              : "🌤️"}
          </p>

         <div className="details">

  <div className="detail-box">
    <Droplets size={30} />
    <span>Humidity</span>
    <h3>{weather.main.humidity}%</h3>
  </div>

  <div className="detail-box">
    <Wind size={30} />
    <span>Wind</span>
    {/* OpenWeatherMap returns m/s in metric units; 1 m/s = 3.6 km/h */}
    <h3>{Math.round(weather.wind.speed * 3.6)} km/h</h3>
  </div>

  <div className="detail-box">
    <Gauge size={30} />
    <span>Pressure</span>
    <h3>{weather.main.pressure} hPa</h3>
  </div>

  <div className="detail-box">
    🌡️
    <span>Feels Like</span>
    <h3>{Math.round(weather.main.feels_like)}°C</h3>
  </div>

</div>

        </div>
      )}

    </div>
  );
}

export default App;