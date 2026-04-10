// Captured from Open-Meteo bulk curl response on 2026-04-07.
// Used when the live API is unreachable at game start.
//
// curl "https://api.open-meteo.com/v1/forecast?latitude=37.3382,37.3688,37.4419,37.3207,37.2816,37.4852,37.4636,37.5629,37.5795,37.6305,37.6879,37.7749&longitude=-121.8863,-122.0363,-122.143,-122.2763,-122.3482,-122.2364,-122.4286,-122.3255,-122.3469,-122.4111,-122.4702,-122.4194&current_weather=true"
//
// Note: Open-Meteo modifies requested coordinates to the nearest grid point in its weather model,
// so returned lat/lon values will differ slightly from the input. This is expected behavior.
// Entries here are mapped by array index (matching input order), not by coordinate matching.
//
// TODOLater: Consider overriding a coastal location (e.g. Half Moon Bay) to a fog code (e.g. 45)
// so the fallback guarantees both foggy and clear_sky API event branches are reachable offline.
// The real response below had no foggy locations, meaning the fallback would always produce the same
// two API events (clear_sky + no_foggy).
export const weatherFallback = {
  san_jose: { code: 0, temp: 20.8 },
  sunnyvale: { code: 0, temp: 19.2 },
  palo_alto: { code: 0, temp: 21.8 },
  la_honda: { code: 0, temp: 16.4 },
  tunitas: { code: 0, temp: 14.4 },
  redwood_city: { code: 1, temp: 20.8 },
  half_moon_bay: { code: 1, temp: 14.6 },
  san_mateo: { code: 1, temp: 19.5 },
  burlingame: { code: 1, temp: 17.9 },
  san_bruno: { code: 1, temp: 16.7 },
  daly_city: { code: 1, temp: 14.7 },
  san_francisco: { code: 1, temp: 16.5 },
};
