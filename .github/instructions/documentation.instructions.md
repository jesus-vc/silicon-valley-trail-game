---
applyTo: "**"
---

# Documentation

## Tone

- Use concise language that is readable and approachable.
- Avoid jargon or overly technical language when simpler terms will do.
- Be concise and clear, but not robotic or terse.

## Code Comments

- Comment WHY, not WHAT
  - Bad: `# Sort the list` (obvious from code)
  - Good: `# Sort by timestamp to ensure deterministic order for caching`
- Document non-obvious decisions, edge cases, workarounds
- Update comments when code changes

## Self-Documenting Code

- Prefer clear code over comments when possible
- Extract complex logic into named functions

## README & Documentation

- Make commands copy-pasteable and accurate
- Reference source of truth, avoid hardcoded values
- Be concise - cut redundancy and filler
- Include: how to run, key dependencies, environment variables
- Avoid: duplicate information, marketing language, unnecessary explanations
