import { useEffect, useState } from "react";

const nowSeconds = () => Math.floor(Date.now() / 1000);

// Current Unix time in seconds, refreshed every intervalMs so on-screen clocks keep moving
export function useNow(intervalMs = 10000) {
  const [now, setNow] = useState(nowSeconds);

  useEffect(() => {
    const timer = setInterval(() => setNow(nowSeconds()), intervalMs);
    return () => clearInterval(timer); // cleanup: stop the timer when the component goes away
  }, [intervalMs]);

  return now;
}
