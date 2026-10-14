import type { EconomyRules } from '../engine/economy';

/**
 * How eddies move around the city. Payday is Friday: everyone draws a week's worth of what
 * they carried to begin with (so a robbery still yields about what it did), a gang's members
 * from the gang's treasury. Every day living takes a seventh of that back, give or take, and
 * the chatty go out most evenings, the quiet rarely, spending what their hangout charges: a
 * handful of eddies at a cheap counter, a lot at a luxury table, and only while they've a
 * couple of evenings' worth on them. A storefront's walk-in trade is drawn once (a cheap
 * counter takes a few dozen a day, a luxury place a couple of hundred) and swings a third
 * either way day to day; against that it pays rent, its staff (the boss near twice a worker)
 * and a cut of its takings to the gangs on its turf, by their share of it. A gang's members
 * make half a wage on rackets of their own and draw a wage from the chest while it lasts. A
 * week a third clear of its costs is thriving; a week in the red, struggling; thriving pays
 * the player's shift a quarter more, struggling a quarter less, and a struggling boss won't
 * hire.
 */
export const ECONOMY: EconomyRules = {
  payday: 5,
  wage: 1,
  living: 0.1,
  drain: 0.03,
  outing: [0.15, 0.55],
  spend: { luxury: 45, everyday: 14, poverty: 5 },
  stayIn: 2,
  walkIn: { luxury: [120, 260], everyday: [50, 120], poverty: [20, 60] },
  swing: 0.3,
  rent: { luxury: 48, everyday: 21, poverty: 9 },
  staff: { luxury: 185, everyday: 118, poverty: 65 },
  boss: 1.8,
  protection: 0.06,
  rackets: 0.5,
  thrivingAt: 0.35,
  pay: { thriving: 1.25, steady: 1, struggling: 0.75 },
  trade: {
    thriving: "Packed; the till hasn't stopped all week.",
    steady: 'Trade is steady.',
    struggling: "Trade is slow; the till's been light all week.",
  },
};
