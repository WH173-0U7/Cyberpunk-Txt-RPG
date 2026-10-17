import type { MoneyRules } from '../engine/money';

/**
 * How eddies change hands. The notes are the wiki's (§1, §5, §10, §20, §50, §100, §500, of 2020
 * and still in hand in 2077) and the coin its €$1 (its cents never come up: prices are whole
 * eddies). Cash is paid coins first, then in the notes that cover it, with the change back in
 * notes no bigger than a hundred and what's under five in coins. The street pays in twenties and
 * under; the poor carry small notes and a handful of coins, the rich big notes and none. Banks
 * count coins for a cut. Chains, luxury places, stores with a rack and the NCART take a transfer
 * from the account or a credchip; the street wants cash. A netrunner chops a stolen credchip
 * for a quarter of what's on it. The numbers are ours.
 */
export const MONEY: MoneyRules = {
  notes: [1, 5, 10, 20, 50, 100, 500],
  noteMin: 5,
  most: { till: 100, bank: 100, street: 20 },
  purse: { coins: { poverty: 6, everyday: 4, luxury: 1 }, biggest: { poverty: 20, everyday: 50, luxury: 500 } },
  coinFee: 0.05,
  withdrawals: [20, 50, 100, 200],
  transfers: { chain: true, luxury: true, gear: true, ncart: true },
  chopCut: 0.25,
  // A mugging is work: about what a shift's hardest hour takes. Pockets of someone out cold, less.
  rob: { awake: 3, cold: 1 },
  // A shopkeeper twice as sharp as the player gets about two fifths more off them, and the other way round.
  haggle: 0.5,
  // A shopkeeper who remembers nothing but good of the player knocks up to a seventh off; nothing but bad, puts it on.
  regard: 0.15,
  tradeXp: 2,
};
