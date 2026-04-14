// Purpose: display + readline prompts, zero game logic

import * as readline from "node:readline/promises";
import { createGameState } from "./state.js";
import { locations } from "./data/locations.js";
import { actions } from "./data/actions.js";
import { stdin as input, stdout as output } from "node:process";
import {
  checkWinLoss,
  applyEffect,
  applyWeatherEffect,
  getRandomEventMap,
  WIN_CONDITIONS,
  LOSE_CONDITIONS,
  WEATHER_THRESHOLDS,
} from "./engine.js";
import { fetchWeatherMap } from "./weather.js";

let gameState = createGameState();
const rl = readline.createInterface({ input, output });
const start = locations[0].name;
const destination = locations[locations.length - 1].name;
const SEPARATOR = "=".repeat(60);
let currentWeather = null;
let weatherMap = null;
let eventMap = null;

// TODOLater: All display functions read locations, actions, WIN_CONDITIONS, LOSE_CONDITIONS
// from module scope. Passing them as parameters to startGame() COULD improve testability,
// but adds verbosity with no clear benefit at this stage (single game instance, no tests yet).

function displayIntro(gameState) {
  console.clear();

  const intro = `
${SEPARATOR}
SILICON VALLEY TRAIL
${SEPARATOR}

BEST NEWS EVER: You’re heading out on a road trip to test your resource management skills!

You and your 2 fellow engineers are driving from ${start} to
${destination}, where a VC firm is waiting to hear your pitch on your startup.

RULES
- You'll travel 10 locations in between.
- Your resources are Cash, Health, and Bugs (in your codebase).
- Each location has:
  - Weather that may affect your resources.
  - An unexpected event with choices that affect your resources.
- Keep your team healthy and your codebase clean to impress the investors!

OBJECTIVE
  WIN:  Arrive in ${destination} with
  - Health ≥ ${WIN_CONDITIONS.minHealth} AND Bugs < ${WIN_CONDITIONS.maxBugs}.

  LOSE: Before reaching ${destination}
  - Cash ≤ $${LOSE_CONDITIONS.minCash} OR Health ≤ ${LOSE_CONDITIONS.minHealth} 

ACTIONS (Each Turn)
${actions.map((a) => `  - ${a.optionText}`).join("\n")}

STARTING RESOURCES
  Cash:   $${gameState.resources.cash}
  Health: ${gameState.resources.health}
  Bugs:   ${gameState.resources.bugs}

WEATHER EFFECTS
 - Excluding ${start} and ${destination}, if a location
  - Has rain, health decreases by −${WEATHER_THRESHOLDS.rainPenalty}.
  - Has heat (≥ ${WEATHER_THRESHOLDS.heatTemp}°C), health decreases by −${WEATHER_THRESHOLDS.heatPenalty}.

${SEPARATOR}

Let's start!!!
`;
  console.log(intro);
}

function displayMenu(gameState, availableActions, currentWeather) {
  const actionLines = availableActions
    .map((action, index) => `${index + 1}. ${action.optionText}`)
    .join("\n");

  const weatherLine = currentWeather
    ? ` | Weather: ${weatherDescription(currentWeather.code)}, ${currentWeather.temp}°C`
    : " | Weather: —";
  const menu = `${SEPARATOR}
Location ${gameState.locationIndex + 1} of ${locations.length}: ${locations[gameState.locationIndex].name}
Cash: $${gameState.resources.cash} | Health: ${gameState.resources.health} | Bugs: ${gameState.resources.bugs}${weatherLine}

WIN: Arrive in ${destination} with Health ≥ ${WIN_CONDITIONS.minHealth} and Bugs < ${WIN_CONDITIONS.maxBugs}.
LOSE: Cash ≤ $${LOSE_CONDITIONS.minCash} or Health ≤ ${LOSE_CONDITIONS.minHealth} before reaching ${destination}.

Allowed Actions:
${actionLines}
`;

  console.log(menu);
}

function displayEndMessage(gameState) {
  if (gameState.status === "won") {
    console.log(`${SEPARATOR}
🎉 YOU WIN! You made it to ${destination} with a healthy team and a codebase with minimal bugs.
The VC investors are impressed — the pitch is on!`);
  } else if (gameState.locationIndex === locations.length - 1) {
    console.log(`${SEPARATOR}
YOU REACHED ${destination.toUpperCase()} — BUT LOST.

The team arrived too low on resources and the pitch fell flat.
`);
  } else {
    console.log(`${SEPARATOR}
GAME OVER. The startup didn't make it to ${destination}.

The team ran out of resources before reaching the destination.`);
  }
  console.log(`
FINAL RESOURCES:
Cash: $${gameState.resources.cash}
Health: ${gameState.resources.health}
Bugs: ${gameState.resources.bugs}
${SEPARATOR}`);
}

// Maps WMO weather codes to human-readable descriptions.
// Covers all valid WMO codes (0–99 per spec). The final branch handles 87–99, which are all
// thunderstorm variants. Out-of-spec codes return "Unknown conditions" rather than a misleading label.
function weatherDescription(code) {
  if (code < 0 || code > 99) return "Unknown conditions";
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 55) return "Drizzle";
  if (code <= 57) return "Freezing drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

function displayWeather(weather, locationName) {
  const condition = weatherDescription(weather.code);
  const penalties = [];
  if (weather.code >= WEATHER_THRESHOLDS.rainCode)
    penalties.push(`Health −${WEATHER_THRESHOLDS.rainPenalty} (rain)`);
  if (weather.temp >= WEATHER_THRESHOLDS.heatTemp)
    penalties.push(`Health −${WEATHER_THRESHOLDS.heatPenalty} (heat)`);
  const penaltyText =
    penalties.length > 0 ? penalties.join(", ") : "No weather penalty. Lucky!";
  console.log(
    `\nWeather in ${locationName}: ${condition}, ${weather.temp}°C → ${penaltyText}`,
  );
}

function displayEvent(gameState, event, currentWeather) {
  let optionLines = "";

  event.options.forEach((option, index) => {
    optionLines += `${index + 1}. ${option.optionText}\n`;
  });

  const weatherLine = currentWeather
    ? ` | Weather: ${weatherDescription(currentWeather.code)}, ${currentWeather.temp}°C`
    : " | Weather: —";
  console.log(`
${SEPARATOR}
Location ${gameState.locationIndex + 1} of ${locations.length}: ${locations[gameState.locationIndex].name}
Cash: $${gameState.resources.cash} | Health: ${gameState.resources.health} | Bugs: ${gameState.resources.bugs}${weatherLine}

EVENT: ${event.description}

${optionLines}`);
}

function validateChoice(rawChoice, optionCount) {
  const choice = Number(rawChoice);

  if (Number.isInteger(choice) && choice >= 1 && choice <= optionCount) {
    return choice;
  }

  return false;
}

async function promptChoice(prompt, optionCount) {
  let choice = false;
  while (choice === false) {
    const raw = await rl.question(`${prompt} (1-${optionCount}): `);
    choice = validateChoice(raw, optionCount);
    if (choice === false)
      console.log(
        `Invalid choice. Enter a number between 1 and ${optionCount}.`,
      );
  }
  return choice;
}

async function playTurn(snapshots) {
  console.clear();

  // time_travel requires both a prior location (index > 0) and a snapshot to restore to
  const availableActions =
    gameState.locationIndex !== 0 && snapshots.length > 1
      ? actions
      : actions.filter((a) => a.id !== "time_travel");

  displayMenu(gameState, availableActions, currentWeather);

  const choice = await promptChoice(
    "What will you choose?",
    availableActions.length,
  );
  const chosenAction = availableActions[choice - 1];

  console.log(`${SEPARATOR}\nYou chose '${chosenAction.optionText}'`);
  console.log(`${SEPARATOR}\n${chosenAction.effectText}`);

  if (chosenAction.id === "time_travel") {
    snapshots.pop(); // remove current location's arrival snapshot
    gameState = snapshots[snapshots.length - 1]; // restore to previous location's arrival state
    currentWeather = weatherMap[locations[gameState.locationIndex].id];
    await rl.question("\nPress Enter to continue...");
    return;
  }

  gameState = applyEffect(gameState, chosenAction);
  gameState = { ...gameState, status: checkWinLoss(gameState, locations) };

  // Apply travel effects (location advancement, weather on arrival, and event)
  if (chosenAction.id === "travel" && gameState.status === "playing") {
    gameState = { ...gameState, locationIndex: gameState.locationIndex + 1 };
    const arrivalLocation = locations[gameState.locationIndex];
    currentWeather = weatherMap[arrivalLocation.id];
    displayWeather(currentWeather, arrivalLocation.name);

    // No weather penalty at the final destination — weather shouldn't decide a win/loss the player earned
    const arrivedAtDestination =
      gameState.locationIndex === locations.length - 1;

    if (!arrivedAtDestination) {
      gameState = applyWeatherEffect(gameState, currentWeather);
    }

    gameState = { ...gameState, status: checkWinLoss(gameState, locations) };

    // Apply event effects
    if (gameState.status === "playing") {
      // Snapshot after travel+weather but before the event — so time_travel restores
      // to the state the player actually saw when they arrived at this location
      const arrivalSnapshot = gameState;
      const event = eventMap[arrivalLocation.id];
      displayEvent(gameState, event, currentWeather);
      const eventChoice = await promptChoice(
        "Your choice",
        event.options.length,
      );
      const chosenOption = event.options[eventChoice - 1];
      console.log(`\n${chosenOption.effectText}`);
      gameState = applyEffect(gameState, chosenOption);
      gameState = { ...gameState, status: checkWinLoss(gameState, locations) };
      snapshots.push(arrivalSnapshot);
      await rl.question("\nPress Enter to continue...");
      return;
    }
  }

  await rl.question("\nPress Enter to continue...");
}

async function startGame() {
  const displayLoading = `
${SEPARATOR}
Loading Game!
${SEPARATOR}`;

  console.log(displayLoading);

  try {
    weatherMap = await fetchWeatherMap(locations);
    currentWeather = weatherMap[locations[0].id];
    eventMap = getRandomEventMap(weatherMap);

    displayIntro(gameState);
    await rl.question("Press Enter to start...");

    // Seed with initial state as the rewind floor — ensures snapshots is never empty during play
    const snapshots = [gameState];
    while (gameState.status === "playing") {
      //TODOLater Review if playTurn() should return a snapshot rather than update directly the snapshots array.
      // Have startGame() or another wrapper manage snapshots?
      await playTurn(snapshots);
    }
    displayEndMessage(gameState);
  } finally {
    rl.close();
  }
}

export { startGame };
