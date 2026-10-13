import type { MoneyRules } from '../engine/money';

/**
 * How eddies change hands. Cash is paid coins first, then in bills of five and up (the wiki
 * shows 2077's €$100 note; smaller notes and the coins are the 2020 ones carried forward),
 * with the difference back in coins. Banks count coins for a cut. Chains, luxury places,
 * stores with a rack and the NCART take a transfer from the account; the street wants cash.
 * The numbers are ours.
 */
export const MONEY: MoneyRules = {
  noteMin: 5,
  coinShare: 0.2,
  coinFee: 0.05,
  withdrawals: [20, 50, 100, 200],
  transfers: { chain: true, luxury: true, gear: true, ncart: true },
};
