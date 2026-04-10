// Tests for fetchWeatherMap — covers the happy path, fallback paths, and API contract assumptions.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchWeatherMap } from "../src/weather.js";
import { weatherFallback } from "../src/data/weatherFallback.js";
import { locations } from "../src/data/locations.js";

const testLocations = [
  { id: "loc_a", name: "Location A", lat: 37.3, lon: -121.8 },
  { id: "loc_b", name: "Location B", lat: 37.4, lon: -122.0 },
];

// Builds a minimal object that satisfies the Open-Meteo bulk response shape
function mockBulkResponse(items) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(items),
  });
}

test("fetchWeatherMap: returns a locationId → { code, temp } map on success", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    mockBulkResponse([
      { current_weather: { weathercode: 0, temperature: 20 } },
      { current_weather: { weathercode: 3, temperature: 25 } },
    ]),
  );
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, {
    loc_a: { code: 0, temp: 20 },
    loc_b: { code: 3, temp: 25 },
  });
});

test("fetchWeatherMap: returns weatherFallback when response is not ok", async (t) => {
  t.mock.method(globalThis, "fetch", () => Promise.resolve({ ok: false }));
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, weatherFallback);
});

test("fetchWeatherMap: returns weatherFallback when fetch throws (network error or timeout)", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    Promise.reject(new Error("Network error")),
  );
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, weatherFallback);
});

test("fetchWeatherMap: returns weatherFallback when response is not an array", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    mockBulkResponse({ error: "unexpected shape" }),
  );
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, weatherFallback);
});

test("fetchWeatherMap: returns weatherFallback when array length does not match locations", async (t) => {
  // API returns 1 item but 2 locations were requested
  t.mock.method(globalThis, "fetch", () =>
    mockBulkResponse([
      { current_weather: { weathercode: 0, temperature: 20 } },
    ]),
  );
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, weatherFallback);
});

test("fetchWeatherMap: returns weatherFallback when an item is missing expected weather fields", async (t) => {
  // Simulates a renamed or missing field in current_weather — the for loop null check should catch this
  t.mock.method(globalThis, "fetch", () =>
    mockBulkResponse([
      { current_weather: { temperature: 20 } }, // weathercode missing
      { current_weather: { weathercode: 3, temperature: 25 } },
    ]),
  );
  const result = await fetchWeatherMap(testLocations);
  assert.deepStrictEqual(result, weatherFallback);
});

test("weatherFallback: contains an entry for every location in locations.js", () => {
  const missingIds = locations
    .map((loc) => loc.id)
    .filter((id) => !(id in weatherFallback));
  assert.deepStrictEqual(
    missingIds,
    [],
    `weatherFallback is missing entries for: ${missingIds.join(", ")}`,
  );
});
