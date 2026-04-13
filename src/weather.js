// Purpose: fetch weather from Open-Meteo and normalize responses.

import { weatherFallback } from "./data/weatherFallback.js";

// Open-Meteo is free with no API key required: https://open-meteo.com
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

// Fail fast — a good response should be under 1s; 3s avoids hanging on slow/unresponsive requests
const TIMEOUT_MS = 3000;

//TODOLater - consider retry if it makes sense for a game of this magnitude
export async function fetchWeatherMap(locations) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const lats = locations.map((loc) => loc.lat).join(",");
    const lons = locations.map((loc) => loc.lon).join(",");

    const url = `${OPEN_METEO_URL}?latitude=${lats}&longitude=${lons}&current_weather=true`;
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      console.warn(
        `[weather] bad response status ${response.status}, using fallback`,
      );
      return weatherFallback;
    }

    const data = await response.json();

    // Guard against unexpected response shape (e.g. API error payload or missing locations)
    if (!Array.isArray(data) || data.length !== locations.length) {
      console.warn(
        `[weather] unexpected response shape (expected array of ${locations.length}, got ${Array.isArray(data) ? data.length : typeof data}), using fallback`,
      );
      return weatherFallback;
    }

    const weatherMap = {};
    for (let i = 0; i < data.length; i++) {
      const w = data[i].current_weather;
      // Fall back if any item is missing expected fields — protects against silent API renames
      if (w?.weathercode == null || w?.temperature == null) {
        console.warn(
          `[weather] missing fields at index ${i}:`,
          data[i],
          "— using fallback",
        );
        return weatherFallback;
      }
      weatherMap[locations[i].id] = {
        code: w.weathercode,
        temp: w.temperature,
      };
    }

    return weatherMap;
  } catch (err) {
    console.warn("[weather] fetch failed, using fallback:", err.message);
    return weatherFallback;
  } finally {
    clearTimeout(timer);
  }
}
