import type { MoneyRules } from '../engine/money';

/**
 * How eddies change hands. Cash is paid coins first, then in bills of five and up (the wiki
 * shows 2077's €$100 note; smaller notes and the coins are the 2020 ones carried forward),
 * with the difference back in coins. Banks count coins for a cut. Chains, luxury places,
 * stores with a rack and the NCART take a transfer from the account or a credchip; the
 * street wants cash. A netrunner chops a stolen credchip for a quarter of what's on it.
 * The numbers are ours.
 */
export const MONEY: MoneyRules = {
  noteMin: 5,
  coinShare: 0.2,
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
