import { describe, it, expect } from '@jest/globals';
import { createCache } from '../server/cache.js';

// A fake clock we can move forward instantly instead of waiting
function fakeClock(start = 0) {
  let time = start;
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
  };
}

describe('createCache', () => {
  it('returns a stored value before it expires', () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, now: clock.now });

    cache.set('delhi', { temp: 20 });
    clock.advance(999);

    expect(cache.get('delhi')).toEqual({ temp: 20 });
  });

  it('forgets a value once its TTL has passed', () => {
    const clock = fakeClock();
    const cache = createCache({ ttlMs: 1000, now: clock.now });

    cache.set('delhi', { temp: 20 });
    clock.advance(1000);

    expect(cache.get('delhi')).toBeUndefined();
    expect(cache.size).toBe(0); // the expired entry was removed
  });

  it('returns undefined for keys that were never stored', () => {
    const cache = createCache({ ttlMs: 1000 });

    expect(cache.get('nowhere')).toBeUndefined();
  });

  it('stores nothing when the TTL is 0 (caching turned off)', () => {
    const cache = createCache({ ttlMs: 0 });

    cache.set('delhi', { temp: 20 });

    expect(cache.get('delhi')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('drops the oldest entry when full, so memory stays bounded', () => {
    const cache = createCache({ ttlMs: 1000, maxEntries: 2 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // cache is full, so "a" (the oldest) is dropped

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.size).toBe(2);
  });
});
