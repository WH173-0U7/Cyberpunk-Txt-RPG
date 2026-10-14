import type { LifeRules } from '../engine/life';
import { ECONOMY } from './economy';

/**
 * How the people's days go without the player. In every district, each day, a few things
 * can happen where the people for them exist: a gang leans on a storefront about one day in
 * three and jumps someone one in five, a fight breaks out one in five (someone with the
 * nerve against a gang they hate, or rival crews), two regulars become friends one in four,
 * and a hot temper ends a friendship one in twelve (patched up again, one day in eight, where
 * there's a falling out to patch up). Two people who are free (twenty or older, twelve years
 * apart at most, friends or regulars of the same place) get together one day in eight; after
 * two weeks together a couple marries one day in ten, and one with a temper or a cold heart
 * walks out one day in sixteen. A thriving storefront takes on someone looking for work one day in twelve (four
 * hands at most), a struggling one lets the last taken on go one in sixteen. A fight between
 * rival crews kills the loser one time in eight, while their gang has more than two left in
 * the district, and the gang takes someone young (twenty-five at most, with nerve or an eye
 * for eddies) in their place, one day in four; someone sixty-six or older dies of their years
 * one day in a hundred. Three things a day at most in one district. The loser of a fight
 * stays home two to four days. A shakedown takes a fifth to a half of what the worker has, a
 * robbery most of it, and people earn it back the way the economy pays them (`economy.ts`).
 * The city remembers two weeks of it and talks about one; a death a month and a half, a
 * wedding a month, a recruit three weeks. After the game was closed a month at most is lived
 * through. The scenes are what pairs of people are seen doing at the same place, by what
 * they are to each other.
 */
export const LIFE: LifeRules = {
  chances: { shakedown: 0.3, robbery: 0.2, fight: 0.2, friends: 0.25, fallout: 0.08, makeup: 0.12, romance: 0.12, wedding: 0.1, breakup: 0.06, hired: 0.08, laidOff: 0.06, death: 0.01, joined: 0.25 },
  perDistrict: 3,
  hurtDays: [2, 4],
  deadly: 0.12,
  crewFloor: 2,
  elderAt: 66,
  adultAt: 20,
  ageGap: 12,
  weddingAfter: 14,
  maxStaff: 4,
  jobless: ['between jobs', 'day laborer'],
  recruitAge: 25,
  lasting: { death: 45, wedding: 30, joined: 21 },
  griefDays: 14,
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
