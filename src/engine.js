// Purpose: game logic — no I/O, no side effects outside gameState

import { regularEvents, apiEvents } from "./data/events.js";

export const WIN_CONDITIONS = { minHealth: 60, maxBugs: 5 };
export const LOSE_CONDITIONS = { minHealth: 45, minCash: 0 };
export const MIN_INTERMEDIATE_LOCATIONS = 10; // game requires at least 10 stops between start and destination

// WMO weather codes ≥ 61 are rain or heavier; ≥ 30°C is a heat threshold for the Bay Area
export const WEATHER_THRESHOLDS = {
  rainCode: 61,
  heatTemp: 30,
  rainPenalty: 10,
  heatPenalty: 5,
};

function applyEffect(gameState, source) {
  const newResources = { ...gameState.resources };
  for (const key in source.effects) {
    newResources[key] += source.effects[key];
  }

  // Bugs can't go below 0 — negative bugs have no meaning
  newResources.bugs = Math.max(0, newResources.bugs);
  return { ...gameState, resources: newResources };
}

function checkWinLoss(gameState, locations) {
  const hasDepletedResources =
    gameState.resources.health <= LOSE_CONDITIONS.minHealth ||
    gameState.resources.cash <= LOSE_CONDITIONS.minCash;

  if (hasDepletedResources) return "lost";

  const reachedDestination = gameState.locationIndex === locations.length - 1;
  const hasSufficientResources =
    gameState.resources.health >= WIN_CONDITIONS.minHealth &&
    gameState.resources.bugs < WIN_CONDITIONS.maxBugs;

  if (reachedDestination) {
    if (hasSufficientResources) return "won";
    return "lost";
  }
  return "playing";
}

function applyWeatherEffect(gameState, currentWeather) {
  const newResources = { ...gameState.resources };
  if (currentWeather.code >= WEATHER_THRESHOLDS.rainCode) {
    newResources.health -= WEATHER_THRESHOLDS.rainPenalty;
  }
  if (currentWeather.temp >= WEATHER_THRESHOLDS.heatTemp) {
    newResources.health -= WEATHER_THRESHOLDS.heatPenalty;
  }
  return { ...gameState, resources: newResources };
}

function getRandomIndex(length) {
  return Math.floor(Math.random() * length);
}

function getRandomEventMap(weatherMap) {
  const eventMap = {};

  // Eligible = all locations except start (index 0) and end (last index)
  const eligibleLocations = Object.entries(weatherMap).slice(1, -1);
  const eligibleIds = eligibleLocations.map(([id]) => id);

  // Fail fast — programmer/config error, not a recoverable runtime condition
  if (eligibleLocations.length < MIN_INTERMEDIATE_LOCATIONS) {
    throw new Error(
      `getRandomEventMap: expected at least ${MIN_INTERMEDIATE_LOCATIONS} intermediate locations, got ${eligibleLocations.length}. Check weatherMap input and locations.js.`,
    );
  }

  // Step 1: Assign clear sky API event to a qualifying location, or a random eligible location if none qualify
  const clearSkyIds = eligibleLocations
    .filter(([, w]) => w.code === 0)
    .map(([id]) => id);

  const usesClearSky = clearSkyIds.length > 0;
  const skyPool = usesClearSky ? clearSkyIds : eligibleIds;
  const skyEventLocationId = skyPool[getRandomIndex(skyPool.length)];
  eventMap[skyEventLocationId] =
    apiEvents[usesClearSky ? "clear_sky_event" : "no_clear_sky_event"];

  // Step 2: Assign fog API event, excluding the location already used above
  const foggyIds = eligibleLocations
    .filter(([, w]) => w.code > 3 && w.code <= 48)
    .map(([id]) => id)
    .filter((id) => id !== skyEventLocationId);

  const usesFoggy = foggyIds.length > 0;
  const fogEventPool = usesFoggy
    ? foggyIds
    : eligibleIds.filter((id) => id !== skyEventLocationId);
  const fogLocationId = fogEventPool[getRandomIndex(fogEventPool.length)];
  eventMap[fogLocationId] =
    apiEvents[usesFoggy ? "foggy_event" : "no_foggy_event"];

  // Step 3: Fill remaining slots (eligibleIds minus the API event slots above) using pick-and-remove so no event repeats
  const regularPool = Object.values(regularEvents);
  const apiEventSlotCount = 2; // Steps 1 and 2 each claim one slot
  const requiredRegularEventCount = eligibleIds.length - apiEventSlotCount;
  if (regularPool.length < requiredRegularEventCount) {
    throw new Error(
      `getRandomEventMap: not enough regular events (${regularPool.length}) to fill ${requiredRegularEventCount} slots. Add events to regularEvents or reduce locations.`,
    );
  }
  for (const id of eligibleIds) {
    if (!eventMap[id]) {
      const i = getRandomIndex(regularPool.length);
      eventMap[id] = regularPool[i];
      regularPool.splice(i, 1);
    }
  }

  return eventMap;
}

export { checkWinLoss, applyEffect, applyWeatherEffect, getRandomEventMap };
