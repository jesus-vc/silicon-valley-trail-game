# Design Notes

## Data Modeling

`gameState` is a single plain JS object — the source of truth for the player's location, resources, and game status. Every function that reads "what's happening right now" reads from it; every mutation writes back to it. Plain object means it serializes with `JSON.stringify` if save/load is ever needed.

**Static config** (`locations`, `actions`, `events`) is loaded once at startup and never mutated. **Runtime state** (`gameState`) is created fresh each session. Keeping them separate means static config has no side effects and `gameState` is the only thing that needs to be tracked or serialized.

**Tradeoff:** a single mutable object means any function can accidentally overwrite any field. Acceptable at this scale — the codebase is small and all mutations are intentional and localized.

One deliberate distinction: the per-game event schedule (`eventMap`) is stored in `cli.js`, not in `gameState`. It is determined once at startup and never changes — not live game state that turns mutate. Mixing it into `gameState` would conflate two different categories of data.

---

## Persistence

State lives in memory only — when the process exits, the game is gone. The entire game state is a single small object; no database is justified. If save/load were added, a flat JSON file via two functions in `state.js` would be the right first step.

**Tradeoff:** no save/load means a crash or accidental exit loses all progress. Acceptable for a short game session; would be the first thing to add if sessions grew longer.

---

## Separating Responsibilities

Three layers, each with a stated purpose:

| File         | Responsibility                                                |
| ------------ | ------------------------------------------------------------- |
| `engine.js`  | Pure game logic — no I/O, no side effects outside `gameState` |
| `cli.js`     | Display, input prompts, and turn orchestration                |
| `weather.js` | API fetch + response normalization                            |

`engine.js` functions (`applyResourceEffect`, `applyWeatherEffect`, `applyEventEffect`, `checkWinLoss`, `getRandomEventMap`) are pure and independently testable. `cli.js` calls them in sequence and owns display, input validation (`validateChoice`), and weather label formatting (`weatherDescription`).

`checkWinLoss` is called twice per turn: once after travel and weather effects, and again inside `playEventTurn` after the player resolves an event. This ensures a loss from an event outcome is caught immediately, not deferred.

**Tradeoff:** `playEventTurn` mixes readline I/O with the second `checkWinLoss` call, so that specific path is not unit-tested. The engine functions it calls are all tested individually. Migration path: extract a pure `resolveTurn(gameState, chosenAction, weather, eventOption)` if conditional branches grow.

---

## Input & Output Validation

**API inputs** — `fetchWeatherMap` validates every failure mode before data enters the game. Each failure scenario returns the full `weatherFallback` rather than passing a malformed map downstream. Each emits a `console.warn` to stderr — visible at runtime without affecting gameplay or stdout.

| Failure                 | Mechanism                                       |
| ----------------------- | ----------------------------------------------- |
| Network error           | `catch` returns `weatherFallback`               |
| Timeout (3s)            | `AbortController` caught in `catch`             |
| Bad HTTP status         | `if (!response.ok)` returns `weatherFallback`   |
| Unexpected shape        | array/length check returns `weatherFallback`    |
| Missing fields per item | `for` loop null check returns `weatherFallback` |

**Game logic inputs** — `getRandomEventMap` throws immediately on invalid input rather than producing a subtly wrong event map. This is a programmer/config error, not a recoverable runtime condition, so a hard throw is appropriate. It is caught at `index.js` and exits with code `1`.

---

## Error Handling

Edge cases addressed throughout:

- **Bugs floor clamp** — `Math.max(0, gameState.resources.bugs)` in both `applyResourceEffect` and `applyEventEffect`. Negative bugs have no meaning; the clamp prevents silent accumulation of meaningless state.
- **`rl.close()` on crash** — `startGame()` wraps everything in `try/finally`, guaranteeing the readline interface closes even if an unexpected error escapes.
- **API timeout** — 3s `AbortController` prevents the game from hanging indefinitely at startup. Failing fast beats an unresponsive CLI.
- **Rate limits** — Open-Meteo's free tier is 600 req/min. A single startup request is not a concern, and the fallback ensures the game runs regardless.

**Tradeoff:** no retries and no caching. A transient network failure at startup falls back immediately rather than recovering. See Retry logic in "If I Had More Time".

**Known gap:** the fallback response has no foggy locations (all codes 0 or 1), so offline play always produces `clear_sky_event` + `no_foggy_event`. The `foggy_event` branch is unreachable without a live API call. A `TODOLater` in `weatherFallback.js` tracks this.

---

## Testing

**Strategy:** test functions where a silent failure would harm the player — wrong win/loss outcome, corrupted resources, ignored API errors. Skip functions where failures are immediately visible (display output) or trivially simple (no branches).

**What's covered:**

- **`engine.js`** — every branch in `checkWinLoss`, `applyResourceEffect`, `applyEventEffect`, `applyWeatherEffect`, and `getRandomEventMap`, including boundary values and edge cases (e.g. bugs can't go negative, exact win/loss thresholds).
- **`weather.js`** — each fallback trigger: network error, timeout, bad status, unexpected shape, missing fields. Also a contract test asserting the fallback covers all active locations. More detail in [Input & Output Validation](#input--output-validation).
- **Events contract** — every event in `regularEvents` and `apiEvents` has `description`, a non-empty `options` array, and numeric `cash`/`health`/`bugs` effects. Catches silent breakage when events are added or edited.
- **Integration tests** — three scenarios exercise the full per-turn sequence (`applyResourceEffect` → `locationIndex++` → `applyWeatherEffect` → `checkWinLoss`): mid-journey loss, win at destination, loss at destination.

**What's excluded:** `cli.js` — all engine functions it calls are tested individually. The remaining code is display and turn orchestration. See the tradeoff in [Separating Responsibilities](#separating-responsibilities).

**Test runner:** Node's built-in `node:test` — no dependencies, no configuration. Consistent with the project's preference for built-ins.

**Tradeoff:** `node:test`'s module mocking is less ergonomic than Vitest's `vi.mock()` for ES modules. If tests grow to require full module-level mocking, Vitest becomes the better tool. For now, mocking `globalThis.fetch` directly is sufficient.

---

## Weather API

### How weather affects gameplay

Weather is fetched at game start for all locations. Two of the 10 mid-journey event slots are driven by live weather codes:

- **Clear sky** (`code === 0`): a teammate wants an outdoor detour — skip it or join them (morale vs. cash tradeoff).
- **Fog** (`code 4–48`): an engineer demands a fog walk before coding — allow it (lose cash, gain health) or push through (lose health).
- **No clear sky / no fog**: narrative variants that fire when conditions don't match.

Weather also applies a health penalty on every travel turn — rain/snow and high temperatures reduce health.

### API choice: Open-Meteo over OpenWeatherMap

Open-Meteo requires no API key and no account — anyone can run the game locally without any setup. Free with no usage limits for non-commercial use.

**Rejected:** OpenWeatherMap — requires an API key, charges beyond the free tier, and the token was slow to activate during evaluation.

**Tradeoff:** Open-Meteo has no SLA guarantees for its free tier. Acceptable because the fallback ensures the game always runs regardless.

### Bulk fetch at game start

A single API call fetches weather for all locations at startup. This is required by the event allocation design: assigning weather-based events needs a global view of all locations' weather simultaneously. Per-location fetch on travel cannot support this — by the time you reach location 8, the window to assign an event to location 3 has already passed. Side benefit: eliminates all in-game API calls.

**Tradeoff:** weather is slightly stale by later locations. For a game played over minutes, this doesn't matter.

### Fallback

A captured real API response (`src/data/weatherFallback.js`) is used in full when the fetch fails — real response over fabricated values to stay close to the actual API shape.

---

## Game Loop & Balance

**Cash is the game clock.** No action restores cash — every action costs cash, and events can drain it further. With $220 at start and 10 locations requiring at least one action each, there is no slack for indefinite stalling. A turn limit or explicit timer would have been redundant.

**Win and lose conditions check different things at different times.** The lose condition fires mid-journey: health ≤ 45 or cash ≤ 0. The win condition only fires at the destination: health ≥ 60 and bugs < 5. This means there is a survival band (health 46–59) where the player keeps playing but cannot win without recovering — arriving isn't enough.

**The three actions create a three-way tension, not just a binary tradeoff.** Travel is the only way to make progress, but it drains both cash and health. Rest recovers health but introduces bugs. Hackathon removes bugs but drains health further. No single action dominates: rest too much and bugs pile up; hackathon too much and health collapses; travel without recovery and the player arrives in no condition to win.

**Weather creates a situational fourth factor.** The weather health penalty only applies when the player chooses travel — not rest or hackathon. On a rain or heat turn, resting avoids the weather penalty but adds bugs. This makes bad weather days a genuine decision point rather than passive damage.

**Bugs have no mid-game consequence, only a destination check.** This was intentional: mid-game bug penalties would have added a second real-time pressure on top of the health floor, making the game feel punishing rather than strategic. Bugs are a long-term liability — ignore them early and the win condition forecloses at arrival.

**No event at the starting location.** The event map starts at the first travel destination. Firing an event before the player has taken a single action would feel arbitrary and removes agency from the first meaningful choice.

---

## CLI

Built as a CLI because the turn-based loop maps naturally to a read-prompt-respond cycle — each turn is a discrete input/output step. No UI framework, no hosting, no CORS concerns.

**Rejected:** web app (hosting, framework decisions, CORS/API key exposure); mobile/VR (unfamiliar setup cost).

**Tradeoff:** audience is limited to developers who can run Node locally.

---

## If I Had More Time

**Retry logic** — a single retry with short delay at startup would recover from transient network hiccups. Deferred until there is data to justify it.

**API timeout tuning** — the current 3s is based on online research, not measured data. Worth computing p95 response times from real usage and setting a data-driven value, alongside logging fallback frequency.

**Persistence** — flat JSON save file via two functions in `state.js` if save/load is ever needed.

**Type safety** — JSDoc `@param` on key engine functions, or TypeScript once data shapes stabilize.

**E2E tests** — simulate full player sessions by piping inputs to `startGame` and asserting terminal output. Deferred until the core flow is stable.
