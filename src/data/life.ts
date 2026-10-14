import type { LifeRules } from '../engine/life';
import { ECONOMY } from './economy';

/**
 * How the people's days go without the player. In every district, each day, a few things
 * can happen where the people for them exist: a gang leans on a storefront about one day in
 * three and jumps someone one in five, a fight breaks out one in five (someone with the
 * nerve against a gang they hate, or rival crews), two regulars become friends one in four,
 * and a hot temper ends a friendship one in twelve; two things a day at most in one district.
 * The loser of a fight stays home two to four days. A shakedown takes a fifth to a half of
 * what the worker has, a robbery most of it, and people earn it back the way the economy pays
 * them (`economy.ts`). The city remembers two weeks of it and talks about one; after
 * the game was closed a month at most is lived through. The scenes are what pairs of people
 * are seen doing at the same place, by what they are to each other.
 */
export const LIFE: LifeRules = {
  chances: { shakedown: 0.3, robbery: 0.2, fight: 0.2, friends: 0.25, fallout: 0.08 },
  perDistrict: 2,
  hurtDays: [2, 4],
  shakedown: [0.2, 0.5],
  robbery: [0.4, 0.8],
  economy: ECONOMY,
  keepDays: 14,
  newsDays: 7,
  catchUpDays: 30,
  together: 0.7,
  leaning: 0.35,
  eyeing: 0.6,
  scenes: {
    couple: ['sharing a table with', 'arguing with', 'leaning on', 'splitting a plate with', 'not speaking to'],
    family: ['sitting with', 'arguing with', 'catching up with', 'being lectured by', 'splitting the bill with'],
    friends: ['drinking with', 'laughing with', 'talking shop with', 'swapping stories with', 'losing a bet to'],
    crew: ['holding court with', 'running numbers with', 'watching the door with', 'muttering with'],
    coworkers: ['complaining about the boss with', 'on a break with', 'splitting a smoke with'],
    shakedown: ['leaning on', 'collecting from', 'having a quiet word with'],
    rivals: ['staring down', 'squaring up to', 'keeping an eye on'],
  },
};
