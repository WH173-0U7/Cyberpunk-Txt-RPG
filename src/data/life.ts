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
 * In hard times, someone behind on the rent or owing a gang, bold or greedy enough, mugs a
 * stranger one day in four in a district, for most of what's on them; a gang's collector comes
 * for someone who's paid nothing back in two weeks, about one day in three; and a gang takes on
 * someone young (thirty at most) with nothing left to lose, one day in seven, up to two more than
 * it started with in a district. Being put out of a home is held against the landlord three
 * months; it, a storefront going under and one opening again are talked of for a month. Two
 * weeks after, and every week from then, someone put out finds a place again (one of the three
 * cheapest blocks of their district) once they've four weeks of its rent and their food put by.
 */
export const LIFE: LifeRules = {
  chances: { shakedown: 0.3, robbery: 0.2, fight: 0.2, friends: 0.25, fallout: 0.08, makeup: 0.12, romance: 0.12, wedding: 0.1, breakup: 0.06, hired: 0.08, laidOff: 0.06, death: 0.01, joined: 0.25, mugging: 0.25 },
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
  lasting: { death: 45, wedding: 30, joined: 21, evicted: 30, closed: 30, reopened: 21 },
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
    crew: ['holding court with', 'running numbers with', 'watching the door with', 'muttering with', 'sharing a smoke with'],
    coworkers: ['complaining about the boss with', 'on a break with', 'splitting a smoke with', 'covering a shift for', 'trading gossip with', 'counting the till with'],
    shakedown: ['leaning on', 'collecting from', 'having a quiet word with', 'taking an envelope from', 'reminding', 'looming over'],
    // The help's side of each of those, in the same order.
    leanedOn: ['being leaned on by', 'paying off', 'getting a quiet word from', 'handing an envelope to', 'being reminded by', 'trying not to look at'],
    rivals: ['staring down', 'squaring up to', 'keeping an eye on', 'trading looks with', 'sizing up', 'muttering about'],
    // Someone in a room with whoever they hold something against, and the other side of each, in the same order.
    grudge: ['glaring at', 'giving a wide berth to', 'not taking their eyes off', 'muttering about', 'turning their back on'],
    grudged: ['avoiding the eyes of', 'pretending not to see', 'keeping clear of', 'being muttered about by', 'ignoring'],
  },
  // What people hold against each other, and for how long: a killing for a year, being left for three months,
  // a robbery two, a beating or a falling out a month and a half, being let go or shaken down a month.
  held: {
    days: { robbed: 60, shook: 30, beaten: 45, dumped: 90, fallout: 45, laidOff: 30, killed: 365, evicted: 90 },
    cap: 6,
    revenge: 0.15,
    nerve: 0.55,
  },
  glaring: 0.7,
  hard: {
    mugging: { nerve: 1.1, take: [0.4, 0.9] },
    collect: { chance: 0.3, late: 14 },
    recruit: { chance: 0.15, age: 30, nerve: 1, extra: 2 },
    rehouse: { after: 14, weeks: 4, cheapest: 3 },
  },
};
