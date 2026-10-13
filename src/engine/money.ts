/**
 * Eddies as they're carried and kept. Cash is bills and coins (2077's eurodollars, per the
 * wiki: hologram-marked bills, €$100 notes strapped by the hundred; the coins are the 2020
 * ones carried forward): it weighs something, it can be taken off you, and street counters
 * want it. The account is the holo's side of money: weightless, safe, and what chains,
 * corpo places and the NCART take. Banks move eddies between the two. The numbers are in
 * `src/data/money.ts`.
 */
export interface Money {
  /** Cash in bills, in €$. */
  bills: number;
  /** Cash in coins, in €$. */
  coins: number;
  /** In the bank, in €$. */
  account: number;
}

export interface MoneyRules {
  /** The smallest bill. Paying in bills rounds up to it, and the difference comes back in coins. */
  noteMin: number;
  /** Of what a robbery nets, the share that is coins. */
  coinShare: number;
  /** A bank's cut for counting coins, on a deposit or an exchange (0.05: five percent, to the nearest eddie). */
  coinFee: number;
  /** What a bank hands over in one go. */
  withdrawals: number[];
  /** Who takes a transfer from the account instead of cash. */
  transfers: { chain: boolean; luxury: boolean; gear: boolean; ncart: boolean };
}

export function freshMoney(bills: number): Money {
  return { bills, coins: 0, account: 0 };
}

/** Cash on hand. */
export function cash(money: Money): number {
  return money.bills + money.coins;
}

/**
 * Pays a price in cash: coins first (nobody wants to carry them), then bills, rounded up to
 * the smallest note, the difference back in coins. Change only comes back as far as there's
 * room for it (`changeRoom`, in €$); the counter keeps the rest. Null if the cash isn't there.
 */
export function payCash(money: Money, price: number, rules: MoneyRules, changeRoom: number): { money: Money; change: number; kept: number } | null {
  if (price > cash(money)) return null;
  const fromCoins = Math.min(money.coins, price);
  const rest = price - fromCoins;
  // Bills come in notes: what's handed over is the price rounded up to one, unless that's more bills than there are.
  const notes = Math.min(money.bills, Math.ceil(rest / rules.noteMin) * rules.noteMin);
  const handed = Math.max(rest, notes);
  const owed = handed - rest;
  const change = Math.min(owed, Math.max(0, changeRoom));
  return { money: { ...money, coins: money.coins - fromCoins + change, bills: money.bills - handed }, change, kept: owed - change };
}

/** Cash taken off the player, bills first: a thief grabs the notes. */
export function takeCash(money: Money, amount: number): { money: Money; taken: number } {
  const bills = Math.min(money.bills, Math.max(0, amount));
  const coins = Math.min(money.coins, Math.max(0, amount) - bills);
  return { money: { ...money, bills: money.bills - bills, coins: money.coins - coins }, taken: bills + coins };
}

/** How a sum taken off someone comes: mostly bills, some coins. */
export function splitLoot(amount: number, rules: MoneyRules): { bills: number; coins: number } {
  const coins = Math.round(amount * rules.coinShare);
  return { bills: amount - coins, coins };
}

/** All cash into the account, less the bank's cut for counting the coins. */
export function deposit(money: Money, rules: MoneyRules): { money: Money; fee: number } {
  const fee = coinFee(money.coins, rules);
  return { money: { bills: 0, coins: 0, account: money.account + money.bills + money.coins - fee }, fee };
}

/** Bills out of the account. Null if it isn't there. */
export function withdraw(money: Money, amount: number): Money | null {
  if (amount <= 0 || amount > money.account) return null;
  return { ...money, account: money.account - amount, bills: money.bills + amount };
}

/** Coins into bills, less the bank's cut. Null with no coins to change. */
export function changeCoins(money: Money, rules: MoneyRules): { money: Money; fee: number } | null {
  if (money.coins <= 0) return null;
  const fee = coinFee(money.coins, rules);
  return { money: { ...money, coins: 0, bills: money.bills + money.coins - fee }, fee };
}

/** The bank's cut for counting coins: the share, to the nearest eddie (a handful of change counts for free). */
export function coinFee(coins: number, rules: MoneyRules): number {
  return coins > 0 ? Math.min(coins, Math.round(coins * rules.coinFee)) : 0;
}
