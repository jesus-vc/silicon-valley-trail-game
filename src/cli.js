// Purpose: display + readline prompts, zero game logic

import * as readline from "node:readline/promises";
import { createGameState } from "./state.js";
import { locations } from "./data/locations.js";
import { actions } from "./data/actions.js";
import { stdin as input, stdout as output } from "node:process";
import {
  checkWinLoss,
  applyResourceEffect,
  applyEventEffect,
  applyWeatherEffect,
  getRandomEventMap,
  WIN_CONDITIONS,
  LOSE_CONDITIONS,
  WEATHER_THRESHOLDS,
} from "./engine.js";
import { fetchWeatherMap } from "./weather.js";

const gameState = createGameState();
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
  - Travel:    moves you forward, but costs cash and health.
  - Rest:      restores health, but costs cash and introduces new bugs.
  - Hackathon: squashes bugs, but drains health and costs cash.

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

function displayMenu(gameState) {
  let actionLines = "";

  actions.forEach((action, index) => {
    actionLines += `${index + 1}. ${action.optionText}\n`;
  });

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

function displayEvent(gameState, event) {
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

async function playEventTurn(event) {
  displayEvent(gameState, event);

  const optionCount = event.options.length;
  let choice = false;

  while (choice === false) {
    const rawChoice = await rl.question(`Your choice (1-${optionCount}): `);
    choice = validateChoice(rawChoice, optionCount);
    if (choice === false) {
      console.log(
        `Invalid choice. Enter a number between 1 and ${optionCount}.`,
      );
    }
  }

  const chosenOption = event.options[choice - 1];

  console.log(`\n${chosenOption.effectText}`);
  applyEventEffect(gameState, chosenOption);
}

async function playTurn() {
  console.clear();
  displayMenu(gameState);

  let choice = false;

  while (choice === false) {
    const rawChoice = await rl.question(
      `What will you choose? (1-${actions.length}): `,
    );

    choice = validateChoice(rawChoice, actions.length);

    if (choice === false) {
      console.log(
        `Invalid choice. Enter a number between 1 and ${actions.length}.`,
      );
    }
  }

  const chosenAction = actions[choice - 1];

  console.log(`${SEPARATOR}\nYou chose '${chosenAction.optionText}'`);
  console.log(`${SEPARATOR}\n${chosenAction.effectText}`);

  // Apply resource effects
  applyResourceEffect(gameState, chosenAction);
  checkWinLoss(gameState, locations);

  // Apply travel effects (location advancement, weather on arrival, and random event)
  if (chosenAction.id === "travel" && gameState.status === "playing") {
    gameState.locationIndex += 1;
    const arrivalLocation = locations[gameState.locationIndex];
    currentWeather = weatherMap[arrivalLocation.id];
    // TODOLater: weather should also display at the start location, but without applying a penalty
    displayWeather(currentWeather, arrivalLocation.name);

    // No weather penalty at the destination — weather shouldn't decide a win/loss the player earned
    const arrivedAtDestination =
      gameState.locationIndex === locations.length - 1;
    if (!arrivedAtDestination) {
      applyWeatherEffect(gameState, currentWeather);
    }

    checkWinLoss(gameState, locations);

    if (gameState.status === "playing") {
      await playEventTurn(eventMap[arrivalLocation.id]);
      checkWinLoss(gameState, locations);
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
    eventMap = getRandomEventMap(weatherMap);

    displayIntro(gameState);
    await rl.question("Press Enter to start...");

    while (gameState.status === "playing") {
      await playTurn();
    }
    displayEndMessage(gameState);
  } finally {
    rl.close();
  }
}

export { startGame };
