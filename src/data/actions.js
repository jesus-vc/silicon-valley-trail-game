//TODOLater Handling Cash
// Intentionally, a player currently starts with a certain amount of cash and it only goes down with actions and events.
// This creates a sense of urgency and forces the player to make strategic choices, but it can also lead to a dead end if the player runs out of cash.
// If needed, consider replenishing cash through certain events or actions.

// TODOLater: Revisit whether actions should move to a keyed object shape like events.js —
// id field would become the key. Array works fine for now given the small fixed set.
export const actions = [
  {
    id: "travel",
    optionText: "Travel to the next location (costs cash and health).",
    effectText:
      "\nThe team hits the road. Progress made, but it takes a toll on cash and health.",
    effects: { cash: -10, health: -10, bugs: 0 },
  },
  {
    id: "rest",
    optionText: "Rest and restore health (costs cash and increases bugs).",
    effectText:
      "\nThe team takes a breather. Everyone feels better. Health restored, but it costs cash and new bugs appear.",
    effects: { cash: -10, health: +20, bugs: +2 },
  },
  {
    id: "hackathon",
    optionText: "Hackathon — reduce bugs (costs cash and health).",
    effectText:
      "\nHeads down, crunch mode. Bugs squashed, but the team is worn out. Health drained and it costs cash.",
    effects: { cash: -10, health: -15, bugs: -5 },
  },
  {
    id: "time_travel",
    optionText:
      "Time travel — return to the previous location with resources restored to that point.",
    effectText:
      "\nYou time travel to the past! You're back at your previous location and your resources have been restored to what they were then.",
  },
];
