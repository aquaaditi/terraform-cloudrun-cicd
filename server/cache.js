// A tiny in-memory cache where every entry expires after ttlMs (TTL = time to live).
// Each running server (each Cloud Run instance) has its own copy, which is fine for
// weather data that only changes about every 10 minutes.
// `now` is injectable so tests can fake the clock instead of waiting.
export function createCache({ ttlMs, maxEntries = 500, now = Date.now }) {
  const entries = new Map(); // key -> { value, expiresAt }; a Map remembers insertion order

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (now() >= entry.expiresAt) {
        entries.delete(key); // expired: forget it
        return undefined;
      }
      return entry.value;
    },

    set(key, value) {
      if (ttlMs <= 0) return; // a TTL of 0 turns caching off

      // Bound memory: when full, drop the oldest entry (the first key in the Map)
      if (entries.size >= maxEntries && !entries.has(key)) {
        entries.delete(entries.keys().next().value);
      }
      entries.set(key, { value, expiresAt: now() + ttlMs });
    },

    get size() {
      return entries.size;
    },
  };
}
