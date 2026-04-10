// Plain object (no class instances) — safe to JSON.stringify for save/load without custom serialization
function createGameState() {
  return {
    day: 1,
    status: "playing", // "playing" | "won" | "lost",
    locationIndex: 0,
    resources: {
      cash: 220,
      health: 150,
      bugs: 8,
    },
  };
}

export { createGameState };
