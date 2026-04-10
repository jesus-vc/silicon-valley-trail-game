---
applyTo: "**"
---

# Testing

## Core Philosophy

- Test behavior, not implementation
- Prefer fewer, higher-value tests over exhaustive low-value coverage
- Ask: "If this breaks silently, would a user be harmed?" — if yes, test it

## Test Pyramid (Priority Order)

**Integration tests (highest priority):**

- API endpoints: correct status codes, response shape, error handling
- Database interactions: data is correctly read/written
- Cross-layer flows: route → business logic → DB

**Unit tests (selective):**

- Only for complex logic with many branches (e.g. input validation, LLM prompt construction)
- Pure functions with non-obvious behavior
- Skip for: simple mappings, trivial wrappers, pass-through functions

**End-to-end tests (future, post-MVP):**

- Full user flows only (e.g. submit observation → receive comedy chain)
- Defer until core flows are stable

## What NOT to Test

- Framework behavior (e.g. Express routing, ORM internals)
- Trivial getters/setters
- Code that merely delegates to a library with no transformation
- Every permutation of valid input — test representative cases and edge cases only

## External Integrations

- Mock external services (Anthropic, DB) in unit/integration tests
- Write at least one test that validates the mock is called with the correct input
- Write at least one test that handles a failure response gracefully
