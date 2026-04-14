# Silicon Valley Trail

A replayable CLI game inspired by Oregon Trail. Guide a scrappy startup team from San Jose to San Francisco, managing cash, health, and bugs across Bay Area locations. Each turn you choose an action; each leg of the trip triggers a semi-random event. Arrive with a healthy team and clean code to win the pitch.

## Quick Start

### 1. Install Node.js v24+

Visit [nodejs.org/en/download](https://nodejs.org/en/download), select version **v24.14.1 (LTS)**, and follow the instructions for your OS.

### 2. Verify installation

npm is bundled with Node.js — no separate install needed.

```bash
node --version  # should print v24.x.x
npm --version   # should print 10.x.x or higher
```

### 3. Clone and run

```bash
git clone https://github.com/jesus-vc/game-silicon-valley-trail
cd game-silicon-valley-trail
npm start
```

No dependencies to install — the game runs entirely on Node.js built-in modules.

## Environment Variables

No API keys or mocks required. The game uses [Open-Meteo](https://open-meteo.com), a free weather API with no authentication. If the API is unreachable, the game automatically falls back to a pre-captured weather dataset and continues normally — no configuration needed to run offline.

See [.env.example](.env.example) for the full list of supported environment variables.

## Design Notes

See [DESIGN-NOTES.md](DESIGN-NOTES.md) for design notes explaining key choices and tradeoffs.

## Architecture

The game logic core is isolated from user I/O and external data — each layer should be reasoned about independently.

**Logic core:** `src/engine.js` + `src/state.js`. `state.js` owns all game data; `engine.js` contains the pure game logic that transforms it (actions, events, weather effects, win/loss checks) with no I/O or side effects.

`src/cli.js` drives the game loop and handles all user I/O. `index.js` is the entry point, but it only calls `startGame()` from `cli.js`. All source files — including `data/` — are required for the game to run.

`src/weather.js` degrades gracefully: it fetches live weather from Open-Meteo for all locations in bulk, but returns a pre-captured per-location fallback map on any failure, so the game continues normally if the API is unreachable.

`data/` holds static content (actions, events, locations, weather fallback) with no logic — it can be modified independently of the core.

**Initialization flow:** At game start, `cli.js` fetches weather for all 12 locations in one request. It passes the resulting weather map to `engine.js` (`getRandomEventMap`), which assigns one event per non-terminal location: two are weather-driven (clear sky, fog) and the remaining eight are drawn randomly from the regular event pool. This event map is fixed for the entire playthrough.

**Module dependencies:** `cli.js` is the single orchestrator — it imports from `engine.js`, `state.js`, `weather.js`, and `data/`. `engine.js` only imports from `data/` and has no knowledge of I/O or HTTP.

## Dependencies

No npm packages — the game runs entirely on Node.js built-ins.

| Dependency                           | Kind         | Notes                                                             |
| ------------------------------------ | ------------ | ----------------------------------------------------------------- |
| Node.js ≥ 24                         | Runtime      | `readline/promises` requires v17+; v24 is current LTS             |
| `node:readline/promises`             | Built-in     | CLI prompts                                                       |
| `node:test`                          | Built-in     | Test runner — no test framework needed                            |
| [Open-Meteo](https://open-meteo.com) | External API | Free, no auth required; game falls back gracefully if unreachable |

## How to Run Tests

```bash
# from project root
npm test
```

Covers core engine logic (`applyEffect`, `checkWinLoss`, `applyWeatherEffect`, `getRandomEventMap`) and all `fetchWeatherMap` failure paths (network error, timeout, bad status, non-array response, length mismatch).

## Example Gameplay

```
$ npm start

Loading Game!

============================================================
SILICON VALLEY TRAIL
============================================================
...

Press Enter to start...          ← press Enter

============================================================
Location 1 of 12: San Jose
Cash: $220 | Health: 150 | Bugs: 8

1. Travel to the next location (costs cash and health).
2. Rest and restore health (costs cash and increases bugs).
3. Hackathon — reduce bugs (costs cash and health).

What will you choose? (1-3): 1   ← type 1, press Enter

You chose 'Travel...'

Weather in Sunnyvale: Clear sky, 19.2°C → No weather penalty. Lucky!

EVENT: ...                        ← random event appears
1. <option one>
2. <option two>

Your choice (1-2): 2              ← type 1 or 2, press Enter

Press Enter to continue...        ← press Enter
```

Each turn: choose an action (1–3, or 1–4 once time travel unlocks after the first location). On travel turns, weather applies first, then a random event fires (1–2). Repeat until you reach San Francisco or run out of resources.

## AI Usage

GitHub Copilot (Claude Sonnet) was used as a development aid during design phases, code generation and refactoring suggestions. The game itself does not use AI at runtime.
