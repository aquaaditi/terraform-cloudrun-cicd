import { useState } from "react";
import { CloudOff, CloudSun, LoaderCircle, LocateFixed, Search } from "lucide-react";
import CurrentWeather from "./components/CurrentWeather";
import Forecast from "./components/Forecast";
import WeatherDetails from "./components/WeatherDetails";
import WeatherScene from "./components/WeatherScene";
import { cityDate, getTheme } from "./utils/weather";
import "./App.css";

const POPULAR_CITIES = ["New Delhi", "Mumbai", "London", "Tokyo", "New York"];
const UNIT_KEY = "skycast-unit";

// Calls OUR backend, which adds the secret API key on the server.
// The browser never sees the key or talks to OpenWeatherMap directly.
async function fetchApi(path, params) {
  const response = await fetch(`${path}?${new URLSearchParams(params)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Show the backend's message, e.g. "City not found"
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

// The saved °C/°F choice. Storage can be blocked (e.g. private mode), so fall back to °C.
function loadUnit() {
  try {
    return localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch {
    return "C";
  }
}

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState(loadUnit);

  // One loader for search, city buttons and current location
  const loadWeather = async (params) => {
    setLoading(true);
    setError("");
    try {
      // Fetch both at the same time. allSettled (not all) means a forecast failure
      // doesn't hide the current weather - the forecast section is simply skipped.
      const [current, upcoming] = await Promise.allSettled([
        fetchApi("/api/weather", params),
        fetchApi("/api/forecast", params),
      ]);
      if (current.status === "rejected") throw current.reason;

      setWeather(current.value);
      setForecast(upcoming.status === "fulfilled" ? upcoming.value.days : null);
    } catch (err) {
      setError(err.message);
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false); // always stop the spinner, even after an error
    }
  };

  const handleSearch = (event) => {
    event.preventDefault(); // stop the form from reloading the page
    if (city.trim()) loadWeather({ city: city.trim() });
  };

  const handlePickCity = (name) => {
    setCity(name);
    loadWeather({ city: name });
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => loadWeather({ lat: coords.latitude, lon: coords.longitude }),
      () => {
        setLoading(false);
        setError("Location permission denied.");
      },
    );
  };

  const changeUnit = (next) => {
    setUnit(next);
    try {
      localStorage.setItem(UNIT_KEY, next);
    } catch {
      // Storage blocked: the choice still works for this visit
    }
  };

  // The background follows the current weather (e.g. "theme-rain")
  const theme = weather ? getTheme(weather.weather[0].main, weather.weather[0].icon) : "default";

  return (
    <div className={`app theme-${theme}`}>
      <WeatherScene theme={theme} />

      <main className="container">
        <header className="topbar">
          <div className="brand">
            <CloudSun size={30} aria-hidden="true" />
            <span>SkyCast</span>
          </div>
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            {["C", "F"].map((u) => (
              <button key={u} type="button" aria-pressed={unit === u} onClick={() => changeUnit(u)}>
                °{u}
              </button>
            ))}
          </div>
        </header>

        <form className="search" onSubmit={handleSearch} role="search">
          <label className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="text"
              name="city"
              aria-label="City name"
              placeholder="Search for a city..."
              autoComplete="off"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <button type="submit" className="btn" disabled={loading}>
            Search
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={handleLocation}
            disabled={loading}
            aria-label="Use my current location"
            title="Use my current location"
          >
            <LocateFixed size={20} aria-hidden="true" />
          </button>
        </form>

        {error && (
          <p className="error" role="alert">
            <CloudOff size={20} aria-hidden="true" />
            {error}
          </p>
        )}

        {loading && (
          <div className="status" role="status">
            <LoaderCircle size={40} className="spin" aria-hidden="true" />
            <p>Loading weather...</p>
          </div>
        )}

        {!loading && !weather && (
          <section className="card welcome">
            <CloudSun size={64} aria-hidden="true" />
            <h2>Check the weather anywhere</h2>
            <p>Search for a city, use your location, or try one of these:</p>
            <div className="chips">
              {POPULAR_CITIES.map((name) => (
                <button key={name} type="button" className="chip" onClick={() => handlePickCity(name)}>
                  {name}
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && weather && (
          // A new key for each result makes React re-create this block, replaying the entrance animation
          <div className="results" key={`${weather.id}-${weather.dt}`}>
            <CurrentWeather weather={weather} unit={unit} />
            {forecast?.length > 0 && (
              <Forecast
                days={forecast}
                today={cityDate(weather.dt, weather.timezone)}
                unit={unit}
              />
            )}
            <WeatherDetails weather={weather} unit={unit} />
          </div>
        )}
      </main>

      <footer className="footer">
        Weather data from{" "}
        <a href="https://openweathermap.org" target="_blank" rel="noreferrer">
          OpenWeatherMap
        </a>
      </footer>
    </div>
  );
}

export default App;
