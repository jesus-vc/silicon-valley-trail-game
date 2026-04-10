// Tests for core game logic — win/loss conditions, resource mutations, weather effects, event map generation.
// These are pure functions that only read/write a plain gameState object, so no mocking needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createGameState } from "../src/state.js";
import { regularEvents, apiEvents } from "../src/data/events.js";
import {
  checkWinLoss,
  applyResourceEffect,
  applyEventEffect,
  applyWeatherEffect,
  getRandomEventMap,
  WIN_CONDITIONS,
  LOSE_CONDITIONS,
  WEATHER_THRESHOLDS,
  MIN_INTERMEDIATE_LOCATIONS,
} from "../src/engine.js";

// Isolated gameState per test — built on createGameState() so new fields are never missed
function makeState(overrides = {}) {
  const base = createGameState();
  return {
    ...base,
    ...overrides,
    resources: { ...base.resources, ...overrides.resources },
  };
}

const locations = [
  { id: "start", name: "Start", lat: 0, lon: 0 },
  { id: "mid", name: "Mid", lat: 1, lon: 1 },
  { id: "end", name: "End", lat: 2, lon: 2 },
];

// --- checkWinLoss ---

test("checkWinLoss: won when destination reached with sufficient health and low bugs", () => {
  const state = makeState({
    locationIndex: 2,
    resources: {
      cash: 100,
      health: WIN_CONDITIONS.minHealth,
      bugs: WIN_CONDITIONS.maxBugs - 1,
    },
  });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "won");
});

test("checkWinLoss: lost when destination reached but health below win threshold", () => {
  const state = makeState({
    locationIndex: 2,
    resources: { cash: 100, health: WIN_CONDITIONS.minHealth - 1, bugs: 0 },
  });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "lost");
});

test("checkWinLoss: lost when destination reached but bugs at or above win threshold", () => {
  const state = makeState({
    locationIndex: 2,
    resources: {
      cash: 100,
      health: WIN_CONDITIONS.minHealth,
      bugs: WIN_CONDITIONS.maxBugs,
    },
  });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "lost");
});

test("checkWinLoss: lost when health hits lose threshold mid-journey", () => {
  const state = makeState({
    resources: { cash: 100, health: LOSE_CONDITIONS.minHealth, bugs: 0 },
  });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "lost");
});

test("checkWinLoss: lost when cash hits lose threshold mid-journey", () => {
  const state = makeState({
    resources: { cash: LOSE_CONDITIONS.minCash, health: 100, bugs: 0 },
  });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "lost");
});

test("checkWinLoss: still playing mid-journey with healthy resources", () => {
  const state = makeState({ locationIndex: 1 });
  checkWinLoss(state, locations);
  assert.strictEqual(state.status, "playing");
});

// --- applyResourceEffect ---

test("applyResourceEffect: applies resource changes from chosen action", () => {
  const state = makeState();
  applyResourceEffect(state, {
    id: "rest",
    effects: { cash: -10, health: 20, bugs: 2 },
  });
  assert.strictEqual(state.resources.cash, 210); // 220 - 10
  assert.strictEqual(state.resources.health, 170); // 150 + 20
  assert.strictEqual(state.resources.bugs, 10); // 8 + 2
});

test("applyResourceEffect: bugs cannot go below 0", () => {
  const state = makeState({ resources: { cash: 200, health: 120, bugs: 2 } });
  applyResourceEffect(state, {
    id: "hackathon",
    effects: { cash: -10, health: -15, bugs: -5 },
  });
  assert.strictEqual(state.resources.bugs, 0);
});

// --- applyWeatherEffect ---

test("applyWeatherEffect: applies rain penalty when code is at rain threshold", () => {
  const state = makeState();
  applyWeatherEffect(state, {
    code: WEATHER_THRESHOLDS.rainCode,
    temp: 15,
  });
  assert.strictEqual(state.resources.health, 140); // 150 - 10
});

test("applyWeatherEffect: applies heat penalty when temp is at heat threshold", () => {
  const state = makeState();
  applyWeatherEffect(state, { code: 0, temp: WEATHER_THRESHOLDS.heatTemp });
  assert.strictEqual(state.resources.health, 145); // 150 - 5
});

test("applyWeatherEffect: applies both penalties when rain and heat thresholds both met", () => {
  const state = makeState();
  applyWeatherEffect(state, {
    code: WEATHER_THRESHOLDS.rainCode,
    temp: WEATHER_THRESHOLDS.heatTemp,
  });
  assert.strictEqual(state.resources.health, 135); // 150 - 10 - 5
});

test("applyWeatherEffect: no penalty for mild clear weather", () => {
  const state = makeState();
  applyWeatherEffect(state, { code: 0, temp: 20 });
  assert.strictEqual(state.resources.health, 150);
});

// --- applyEventEffect ---

test("applyEventEffect: applies resource changes from event option", () => {
  const state = makeState();
  applyEventEffect(state, { effects: { cash: -10, health: 10, bugs: 1 } });
  assert.strictEqual(state.resources.cash, 210); // 220 - 10
  assert.strictEqual(state.resources.health, 160); // 150 + 10
  assert.strictEqual(state.resources.bugs, 9); // 8 + 1
});

test("applyEventEffect: bugs cannot go below 0", () => {
  const state = makeState({ resources: { cash: 200, health: 120, bugs: 1 } });
  applyEventEffect(state, { effects: { cash: 0, health: 0, bugs: -5 } });
  assert.strictEqual(state.resources.bugs, 0);
});

// --- getRandomEventMap ---

// Builds a weatherMap with the given number of total entries (start + intermediates + end)
function makeWeatherMap(totalCount, code = 0, temp = 20) {
  const map = {};
  for (let i = 0; i < totalCount; i++) {
    map[`loc_${i}`] = { code, temp };
  }
  return map;
}

test("getRandomEventMap: returns exactly MIN_INTERMEDIATE_LOCATIONS keys", () => {
  const weatherMap = makeWeatherMap(MIN_INTERMEDIATE_LOCATIONS + 2); // +2 for start and end
  const result = getRandomEventMap(weatherMap);
  assert.strictEqual(Object.keys(result).length, MIN_INTERMEDIATE_LOCATIONS);
});

test("getRandomEventMap: assigns exactly 2 API events", () => {
  const weatherMap = makeWeatherMap(MIN_INTERMEDIATE_LOCATIONS + 2);
  const result = getRandomEventMap(weatherMap);
  const apiEventValues = Object.values(apiEvents);
  const apiCount = Object.values(result).filter((e) =>
    apiEventValues.includes(e),
  ).length;
  assert.strictEqual(apiCount, 2);
});

test("getRandomEventMap: no event is assigned to more than one location", () => {
  const weatherMap = makeWeatherMap(MIN_INTERMEDIATE_LOCATIONS + 2);
  const result = getRandomEventMap(weatherMap);
  const eventValues = Object.values(result);
  const unique = new Set(eventValues);
  assert.strictEqual(unique.size, eventValues.length);
});

test("getRandomEventMap: throws when fewer than MIN_INTERMEDIATE_LOCATIONS intermediate locations", () => {
  // MIN_INTERMEDIATE_LOCATIONS total entries → only MIN-2 intermediate after slicing start+end
  const tooSmall = makeWeatherMap(MIN_INTERMEDIATE_LOCATIONS);
  assert.throws(() => getRandomEventMap(tooSmall), {
    message: /expected at least/,
  });
});

test("getRandomEventMap: assigns foggy_event and no_clear_sky_event when all locations are foggy", () => {
  // code 45 (dense fog) satisfies >3 && <=48 → foggy_event; no location has code 0 → no_clear_sky_event
  // temp is unused by getRandomEventMap — 20 is the makeWeatherMap default, passed explicitly here for clarity
  const weatherMap = makeWeatherMap(MIN_INTERMEDIATE_LOCATIONS + 2, 45, 20);
  const result = getRandomEventMap(weatherMap);
  const assigned = Object.values(result);
  assert.ok(
    assigned.includes(apiEvents.foggy_event),
    "foggy_event should be assigned when fog locations exist",
  );
  assert.ok(
    assigned.includes(apiEvents.no_clear_sky_event),
    "no_clear_sky_event should be assigned when no clear sky locations exist",
  );
});

// --- events data contract ---

test("events: every event has description, options array, and numeric cash/health/bugs effects", () => {
  // Guards against silent breakage if an event is added or edited with an incorrect shape
  const allEvents = { ...regularEvents, ...apiEvents };
  for (const [id, event] of Object.entries(allEvents)) {
    assert.ok(
      typeof event.description === "string",
      `${id}: missing description`,
    );
    assert.ok(
      Array.isArray(event.options) && event.options.length >= 1,
      `${id}: options must be a non-empty array`,
    );
    for (const option of event.options) {
      const { effects } = option;
      assert.ok(
        effects && typeof effects === "object",
        `${id}: option missing effects`,
      );
      assert.ok(
        typeof effects.cash === "number",
        `${id}: effects.cash must be a number`,
      );
      assert.ok(
        typeof effects.health === "number",
        `${id}: effects.health must be a number`,
      );
      assert.ok(
        typeof effects.bugs === "number",
        `${id}: effects.bugs must be a number`,
      );
    }
  }
});

// --- full turn sequence (integration) ---

test("full turn sequence: compounding effects across action and weather trigger a mid-journey loss", () => {
  // health=56: travel alone (-10) leaves 46 > 45 (still playing), but travel + rain drops to 36 ≤ 45 → lost
  // note: once checkWinLoss sets status to "lost", the event guard (status === "playing") prevents the event from firing
  const state = makeState({
    locationIndex: 0,
    resources: { cash: 220, health: 56, bugs: 0 },
  });
  applyResourceEffect(state, { effects: { cash: -10, health: -10, bugs: 0 } }); // travel
  state.locationIndex += 1; // arrival at next location (cli.js logic, simulated here)
  applyWeatherEffect(state, { code: WEATHER_THRESHOLDS.rainCode, temp: 15 }); // rain: -10 health
  checkWinLoss(state, locations);
  // health: 56 - 10 - 10 = 36, which is below LOSE_CONDITIONS.minHealth (45)
  assert.strictEqual(state.status, "lost");
});

test("full turn sequence: traveling to the final location with sufficient resources results in a win", () => {
  // Real cli.js sequence for last travel: action → locationIndex++ → weather → checkWinLoss
  // No event fires at the destination — checkWinLoss always terminates the game there
  const state = makeState({
    locationIndex: locations.length - 2, // second-to-last
    resources: { cash: 200, health: 80, bugs: 0 },
  });
  applyResourceEffect(state, { effects: { cash: -10, health: -10, bugs: 0 } }); // travel
  state.locationIndex += 1; // arrival at destination (cli.js logic, simulated here)
  applyWeatherEffect(state, { code: 0, temp: 20 }); // no penalty
  checkWinLoss(state, locations);
  // health: 80 - 10 = 70 >= WIN_CONDITIONS.minHealth (60), bugs: 0 < WIN_CONDITIONS.maxBugs (5)
  assert.strictEqual(state.status, "won");
});

test("full turn sequence: player can lose on the last turn if health drops below the lose threshold at the destination", () => {
  // The lose check (health <= LOSE_CONDITIONS.minHealth) fires before the win check in checkWinLoss
  // So arriving at the destination doesn't guarantee a win — the player can still lose there
  const state = makeState({
    locationIndex: locations.length - 2, // second-to-last
    resources: { cash: 200, health: 56, bugs: 0 },
  });
  applyResourceEffect(state, { effects: { cash: -10, health: -10, bugs: 0 } }); // travel
  state.locationIndex += 1; // arrival at destination (cli.js logic, simulated here)
  applyWeatherEffect(state, { code: WEATHER_THRESHOLDS.rainCode, temp: 15 }); // rain: -10 health
  checkWinLoss(state, locations);
  // health: 56 - 10 - 10 = 36, below LOSE_CONDITIONS.minHealth (45) — loses even at the final location
  assert.strictEqual(state.status, "lost");
});
