// Decorative animated layers behind the app: sun, moon, stars, clouds, rain, snow, fog, lightning.
// Positions come from simple maths computed once when this file loads (not Math.random()),
// so the component is pure: the same theme always renders exactly the same scene.

// Spreads `count` items across the screen in a fixed pattern that looks random
function scatter(count, seed) {
  return Array.from({ length: count }, (_, i) => ({
    left: (i * 37 + seed * 13) % 100, // % across the screen
    top: (i * 53 + seed * 7) % 100, // % down the screen
    delay: ((i * 29 + seed) % 40) / 10, // 0-4 s, so items don't move in sync
    speed: ((i * 17 + seed) % 10) / 10, // 0-0.9, used to vary durations
    size: 0.5 + ((i * 11 + seed) % 10) / 10, // 0.5-1.4
  }));
}

const RAIN = scatter(70, 1);
const SNOW = scatter(45, 2);
const STARS = scatter(70, 3);
const CLOUDS = scatter(5, 4);

// Which layers each theme shows (themes come from getTheme in utils/weather.js)
const SCENES = {
  "clear-day": ["sun"],
  "clear-night": ["stars", "moon"],
  "clouds-day": ["sun-soft", "clouds"],
  "clouds-night": ["stars", "clouds"],
  rain: ["clouds", "rain"],
  storm: ["clouds", "rain", "lightning"],
  snow: ["clouds", "snow"],
  mist: ["fog"],
  default: ["clouds"],
};

export default function WeatherScene({ theme }) {
  const layers = SCENES[theme] ?? SCENES.default;
  const has = (name) => layers.includes(name);

  return (
    <div className="scene" aria-hidden="true">
      {has("sun") && <div className="scene-sun" />}
      {has("sun-soft") && <div className="scene-sun soft" />}
      {has("moon") && <div className="scene-moon" />}

      {has("stars") &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${s.left}%`,
              top: `${s.top * 0.7}%`, // keep stars in the upper sky
              width: `${s.size * 2}px`,
              height: `${s.size * 2}px`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}

      {has("clouds") &&
        CLOUDS.map((c, i) => (
          <span
            key={i}
            className="cloud"
            style={{
              top: `${5 + i * 12}%`,
              scale: `${c.size + 0.4}`,
              animationDuration: `${70 + c.speed * 50}s`,
              animationDelay: `-${i * 18}s`, // negative delay: clouds start mid-journey
            }}
          />
        ))}

      {has("rain") &&
        RAIN.map((d, i) => (
          <span
            key={i}
            className="drop"
            style={{
              left: `${d.left}%`,
              height: `${12 + d.size * 12}px`,
              animationDuration: `${0.5 + d.speed * 0.5}s`,
              animationDelay: `-${d.delay}s`,
            }}
          />
        ))}

      {has("snow") &&
        SNOW.map((f, i) => (
          <span
            key={i}
            className="flake"
            style={{
              left: `${f.left}%`,
              width: `${f.size * 7}px`,
              height: `${f.size * 7}px`,
              animationDuration: `${7 + f.speed * 6}s`,
              animationDelay: `-${f.delay * 3}s`,
            }}
          />
        ))}

      {has("fog") && (
        <>
          <div className="fog fog-1" />
          <div className="fog fog-2" />
        </>
      )}

      {has("lightning") && <div className="lightning" />}
    </div>
  );
}
