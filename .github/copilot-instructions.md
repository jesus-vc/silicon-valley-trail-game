# Improvly - Project Instructions

## Project Overview

Silicon Valley Trail is a replayable CLI game inspired by Oregon Trail. The player guides a scrappy startup team across 10+ real Bay Area locations, managing resources like cash, morale, and coffee through daily turns. Each turn the player chooses an action, then faces a semi-random event whose outcome may be influenced by a live public API (e.g. weather, news trends, or flight data). The goal is to reach the destination before running out of critical resources.

## Tech Stack

Language: JavaScript (Node.js)
Interface: Command-line interface.
Database: None (in-memory state, JSON file for save/load if needed)
External API: Pending

## Working Principles

### Pre-Implementation Review

Before implementing any code, file, or integration:

- Explain the reasoning and necessity
- If possible, explain the reasoning using a decision or design framework (e.g., YAGNI, KISS, SOLID).
- Show alternatives considered
- Wait for approval before proceeding

### Complexity Challenge

When suggesting a solution, actively question if it's the simplest approach:

- Could this be done with fewer files/dependencies?
- Is this abstraction necessary at this stage?
- What's the 80/20 solution here?

### Decision Documentation

When making architectural decisions, capture:

- What was decided
- Why (constraints, tradeoffs)
- What was explicitly rejected and why
- Migration path for later

### Performance Approach

- Make it work, make it right, then make it fast (if needed)
- Measure before optimizing (use profilers)
- Optimize bottlenecks only after they're proven

### Code Review Checklist

Before finalizing any implementation:

- Does it solve the actual problem?
- Is it the simplest solution?
- Is it readable by someone else (or future you)?
