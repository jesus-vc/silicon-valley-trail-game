// TODOLater: Consider if events and actions should be unified under a shared "Decision" class structure,
// since they both have similar shapes (descriptions/effectText and effects).
// For now, I'll keep them separate for simplicity, but perhaps a class could provide more structure and methods.

export const regularEvents = {
  grandmother_visit: {
    description:
      "A team member's 95-year-old grandmother heard you're all in town. She invites you over for a home-cooked meal. Do you go?",
    options: [
      {
        optionText: "Yes, we want to see her!",
        effectText:
          "Wonderful meal, great stories. The team feels recharged. You buy a nice gift, and a few bugs sneak in while nobody's watching the deploy.",
        effects: { cash: -10, health: +10, bugs: +1 },
      },
      {
        optionText: "Maybe next time. Too much work to do.",
        effectText:
          "You stay focused and work on the product, fixing and preventing bugs, but skipping family time takes a quiet toll on the team.",
        effects: { cash: 0, health: -10, bugs: -2 },
      },
    ],
  },
  parallel_parking_failure: {
    description:
      "You need to park to use the restroom. You find a parking spot on the street. Eight attempts in, you're still not in. People are watching.",
    options: [
      {
        optionText: "Keep trying. You are NOT paying for a garage.",
        effectText:
          "Attempt 12. You're in. Barely. The video recording is uploaded to a popular YouTube channel followed by VC investors who think bad parkers make bad founders. Team morale takes a hit.",
        effects: { cash: 0, health: -10, bugs: 0 },
      },
      {
        optionText: "Give up and pay for the parking garage.",
        effectText:
          "The garage is $10. Everyone exhales. No one speaks of this again.",
        effects: { cash: -10, health: +5, bugs: 0 },
      },
    ],
  },
  server_down_er: {
    description:
      "Production is down! Also, a team member just cut their hand on a broken coffee mug and needs the ER. The ER has terrible internet connection. You have one laptop.",
    options: [
      {
        optionText: "Fix the server first. Then go to the ER.",
        effectText:
          "Server is back up in 45 minutes after fixing bugs. Your teammate is fine but has strong opinions about your priorities. Team morale drops.",
        effects: { cash: 0, health: -10, bugs: -2 },
      },
      {
        optionText: "Go to the ER. Try to fix the server from there.",
        effectText:
          "Teammate is patched up. The team breathes easier. The server was down 2 hours though — users noticed and bugs piled up. A stressful win.",
        effects: { cash: 0, health: +10, bugs: +2 },
      },
    ],
  },
  podcast_ambush: {
    description:
      "A guy with a ring light and a microphone steps in front of the team at a gasoline stop. He runs a podcast called 'Founders on the Move.' He wants 15 minutes.",
    options: [
      {
        optionText:
          "Agree to the podcast. The team is excited to share their story.",
        effectText:
          "You pitch to 4,000 subscribers. Two might be real investors. The team feeds off the energy.",
        effects: { cash: 0, health: +10, bugs: 0 },
      },
      {
        optionText: "Refuse and drive away.",
        effectText:
          "'Startup too busy to talk.' He posts the clip to his LinkedIn. The comments are not kind. The team spends the next hour quietly stewing, reducing health.",
        effects: { cash: 0, health: -10, bugs: 0 },
      },
    ],
  },
  highway_101_standstill: {
    description:
      "Traffic on 101 has completely stopped. No ETA. Someone in the car suggests doing an impromptu code review to pass the time.",
    options: [
      {
        optionText: "Sure. Let's use the time well.",
        effectText:
          "Two hours of focused review. Real bugs found and noted. Mentally draining, but the codebase is cleaner.",
        effects: { cash: 0, health: -5, bugs: -3 },
      },
      {
        optionText: "No. Everyone just stare at your phones.",
        effectText:
          "Traffic clears eventually. The team arrives stiff, irritable, and behind schedule.",
        effects: { cash: 0, health: -10, bugs: 0 },
      },
    ],
  },
  competitor_launch: {
    description:
      "Your main competitor just launched a new feature and posted a 'we're live!' tweet. It's going viral. The team is rattled and wants to pivot immediately.",
    options: [
      {
        optionText: "Drop everything and analyze their launch.",
        effectText:
          "Two hours lost to competitive panic. Some team members want to rewrite the whole product. Bugs sneak in during the chaos.",
        effects: { cash: 0, health: -10, bugs: +2 },
      },
      {
        optionText: "Stay focused. Ship your own thing.",
        effectText:
          "Discipline holds. The team refocuses and catches a latent bug in the process. Morale quietly improves.",
        effects: { cash: 0, health: +5, bugs: -1 },
      },
    ],
  },
  free_boba: {
    description:
      "A boba shop is giving away free drinks to anyone who can correctly name three design patterns on the spot.",
    options: [
      {
        optionText: "Join in. The team deserves a treat.",
        effectText:
          "Factory, Observer, Strategy. Nailed it. The team is energized — maybe a little too energized. A few sloppy commits follow.",
        effects: { cash: 0, health: +10, bugs: +1 },
      },
      {
        optionText: "Keep moving. No time.",
        effectText:
          "The team watches through the window as others celebrate with taro milk tea. FOMO is real.",
        effects: { cash: 0, health: -5, bugs: 0 },
      },
    ],
  },
  recruiter_dm: {
    description:
      "Your lead backend engineer just got LinkedIn DMs from a recruiter at a well-funded AI startup.",
    options: [
      {
        optionText: "Address it head-on. Have an honest team conversation.",
        effectText:
          "Uncomfortable, but clarifying. Everyone commits to finishing the trip. Morale steadies.",
        effects: { cash: -10, health: +10, bugs: 0 },
      },
      {
        optionText: "Ignore it. Pretend you didn't notice.",
        effectText:
          "Tension builds quietly. Mistakes follow. Members start slacking on code review.",
        effects: { cash: 0, health: -10, bugs: +3 },
      },
    ],
  },
};

export const apiEvents = {
  clear_sky_event: {
    description:
      "Clear skies all day. Your most superstitious engineer refuses to write a single line of code without sunscreen — 'UV rays corrupt a sharp mind, not just skin.' The team needs to find a pharmacy.",
    options: [
      {
        optionText: "Fine. Stop and buy the sunscreen.",
        effectText:
          "Sunscreen acquired. Engineer appeased. The detour cost time and triggered a rushed deploy.",
        effects: { cash: -10, health: +5, bugs: +2 },
      },
      {
        optionText: "Absolutely not. Keep driving.",
        effectText:
          "Engineer sulks for two hours and introduces subtle bugs due to stress. Or was it on purpose? The team will never know.",
        effects: { cash: 0, health: -10, bugs: +2 },
      },
    ],
  },
  no_clear_sky_event: {
    description:
      "Every stop on this route has had no clear sky. Your team's self-described 'solar-powered engineer' is fading fast. They demand a SAD lamp. Immediately.",
    options: [
      {
        optionText: "Buy the lamp. It's cheaper than a morale crisis.",
        effectText:
          "Lamp acquired. Engineer perks up. The team rallies, though the stop cost time and focus.",
        effects: { cash: -15, health: +10, bugs: +1 },
      },
      {
        optionText: "Tough it out. You'll be in SF soon.",
        effectText:
          "Engineer dims further. Mistakes accumulate. The team feels it.",
        effects: { cash: 0, health: -10, bugs: +2 },
      },
    ],
  },
  foggy_event: {
    description:
      "Karl the Fog has rolled in — thick and unrelenting. One engineer insists on a fog walk before coding: 'It's where ideas live.' It's a Bay Area thing. You've learned not to argue.",
    options: [
      {
        optionText: "Allow the fog walk.",
        effectText:
          "Twenty minutes of silence and mist. Engineer returns inspired. The team benefits — though nobody reviewed the open PR.",
        effects: { cash: -10, health: +10, bugs: +2 },
      },
      {
        optionText: "No fog walks. We're on a deadline.",
        effectText:
          "Engineer sits down, technically present, visibly elsewhere. A quiet bug slips through review.",
        effects: { cash: 0, health: -10, bugs: +1 },
      },
    ],
  },
  no_foggy_event: {
    description:
      "Not a single foggy stop on this entire route. Your SF-native engineer is off-balance — no fog means no clarity. They've ordered a portable fog machine on Etsy. It's already shipped.",
    options: [
      {
        optionText: "Accept the fog machine. Pick it up on the way.",
        effectText:
          "It works. Suspiciously well. The engineer is back. The detour was worth it.",
        effects: { cash: -10, health: +10, bugs: +1 },
      },
      {
        optionText: "Veto the fog machine. This is a car, not a spa.",
        effectText:
          "Engineer processes the loss quietly. A few too many quietly.",
        effects: { cash: 0, health: -10, bugs: +2 },
      },
    ],
  },
};
