import type { JobRules } from '../engine/jobs';

/**
 * Where the player can work, and how far up. Eateries and clothing stores hire (the wiki's
 * own storefronts; the ladders and their titles are ours, bottom rung first): a shift a day,
 * between nine and five by the clock, for a little pay into the account and a little trust
 * with the boss. The pay is low on purpose and climbs with the rung; a luxury place pays more
 * than a secondhand one. Six shifts of trust and a boss who's warmed to the player is the
 * first step up; the top takes the better part of a month of showing up. Walking out costs
 * four rapport with the boss.
 */
export const JOBS: JobRules = {
  ladders: {
    food: [
      { id: 'dishes', title: 'Dish pit', doing: 'washing dishes', pay: 24, energy: 4, at: 0 },
      { id: 'prep', title: 'Prep', doing: 'on prep', pay: 40, energy: 4, at: 6 },
      { id: 'counter', title: 'Counter', doing: 'working the counter', pay: 60, energy: 3, at: 14 },
      { id: 'line', title: 'Line cook', doing: 'on the line', pay: 85, energy: 4, at: 24 },
    ],
    clothing: [
      { id: 'stockroom', title: 'Stockroom', doing: 'in the stockroom', pay: 26, energy: 3, at: 0 },
      { id: 'floor', title: 'Shop floor', doing: 'folding on the floor', pay: 42, energy: 3, at: 6 },
      { id: 'register', title: 'Register', doing: 'on the register', pay: 62, energy: 2, at: 14 },
      { id: 'fitting', title: 'Fitting', doing: 'fitting customers', pay: 90, energy: 3, at: 24 },
    ],
  },
  hours: [9, 17],
  tiers: { luxury: 1.6, everyday: 1, poverty: 0.7 },
  trustPerShift: 1,
  rapport: 3,
  rep: 1,
  quit: 4,
  promoteAt: ['warm', 'friend'],
};
