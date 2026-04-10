// Purpose: run startGame()

import { startGame } from "./src/cli.js";

try {
  await startGame();
} catch (err) {
  console.error("[fatal] unexpected error:", err.message);
  process.exit(1); // non-zero exit code signals failure
}
