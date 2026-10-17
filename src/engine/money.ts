import type { Quality } from './food';
import type { Rng } from './rng';

/**
 * Eddies as they're carried and kept. Cash is notes and coins, the wiki's eurodollars: notes of
 * §1, §5, §10, §20, §50, §100 and §500 (2020's, still in hand in 2077, whose €$100 is the
 * Series A 2055 bill), hologram-marked and cloth-like, and the €$1 coin of nickel, tin and
 * aluminum (the wiki's cents never come up: every price is whole eddies). Cash weighs
 * something, it can be taken off you, and street counters want it. The account is the holo's
 * side of money: weightless, safe, and what chains, corpo places and the NCART take. Banks move
 * eddies between the two. Credchips (the wiki's 2020 chips of eurodollars, "chops" on the
 * street) are items with a balance: taken off someone they come locked, and a netrunner chops
 * them for a cut. The numbers are in `src/data/money.ts`.
 */
export interface Money {
  /** Cash in notes, in €$ all told. */
  bills: number;
  /** €$1 coins, in €$ (one a eddie). */
  coins: number;
  /** In the bank, in €$. */
  account: number;
  /** The notes the bills are: how many of each, by denomination (missing in an older save: worked out from `bills`, the biggest first). */
  notes?: Notes;
}

/** Notes by denomination ("20": 3 is three €$20 notes). */
export type Notes = Record<string, number>;

/** Cash in hand, as it changes hands: notes and €$1 coins. */
export interface Cash {
  notes: Notes;
  coins: number;
}

export interface MoneyRules {
  /** The notes there are, in €$, smallest first. */
  notes: number[];
  /** Change under this comes back in coins; what's over it in notes. */
  noteMin: number;
  /** The biggest note a counter's till hands back, a bank's teller, and the street (tips, a gang's loan) pays in. */
  most: { till: number; bank: number; street: number };
  /** What people carry, by how they live: up to so many €$1 coins, and their notes no bigger than this. */
  purse: { coins: Record<Quality, number>; biggest: Record<Quality, number> };
  /** A bank's cut for counting coins, on a deposit or an exchange (0.05: five percent, to the nearest eddie). */
  coinFee: number;
  /** What a bank hands over in one go. */
  withdrawals: number[];
  /** Who takes a transfer from the account (or a credchip) instead of cash. */
  transfers: { chain: boolean; luxury: boolean; gear: boolean; ncart: boolean };
  /** How far Trading moves a price: the seller's Trading over the player's, to this power (0: not at all). Only with the rules for Trading. */
  haggle?: number;
  /** How far what the one behind the counter remembers of the player moves a price: their regard, all good, takes this share off; all bad, puts it on. */
  regard?: number;
  /** Trading experience a purchase gives. */
  tradeXp?: number;
  /** A netrunner's cut for chopping a stolen credchip (0.25: a quarter of what's on it). */
  chopCut: number;
  /** The energy a robbery takes: going for someone awake, going through the pockets of someone out cold (missing: none). */
  rob?: { awake: number; cold: number };
}

export function freshMoney(bills: number, rules?: MoneyRules): Money {
  return { bills, coins: 0, account: 0, ...(rules ? { notes: makeNotes(bills, rules, rules.most.bank) } : {}) };
}

/** Cash on hand. */
export function cash(money: Pick<Money, 'bills' | 'coins'>): number {
  return money.bills + money.coins;
}

// ───────────── Notes ─────────────

/** What a handful of notes comes to. */
export function sumNotes(notes: Notes): number {
  let sum = 0;
  for (const [d, n] of Object.entries(notes)) sum += Number(d) * n;
  return sum;
}

/** How many notes there are. */
export function countNotes(notes: Notes): number {
  let count = 0;
  for (const n of Object.values(notes)) count += n;
  return count;
}

/** Notes with none of a kind left out, so a save stays small. */
function clean(notes: Notes): Notes {
  const out: Notes = {};
  for (const [d, n] of Object.entries(notes)) if (n > 0) out[d] = n;
  return out;
}

export function addNotes(a: Notes, b: Notes): Notes {
  const out: Notes = { ...a };
  for (const [d, n] of Object.entries(b)) out[d] = (out[d] ?? 0) + n;
  return clean(out);
}

export function minusNotes(a: Notes, b: Notes): Notes {
  const out: Notes = { ...a };
  for (const [d, n] of Object.entries(b)) out[d] = (out[d] ?? 0) - n;
  return clean(out);
}

/** A sum in notes, the biggest first, none over `most`. */
export function makeNotes(amount: number, rules: MoneyRules, most = Infinity): Notes {
  const notes: Notes = {};
  let left = Math.max(0, Math.round(amount));
  for (const d of [...rules.notes].reverse()) {
    if (d > most) continue;
    const n = Math.floor(left / d);
    if (n > 0) notes[String(d)] = n;
    left -= n * d;
  }
  return notes;
}

/** A sum as it's handed over: what's under the smallest note change comes in back in coins, the rest in notes, none over `most`. */
export function cashFor(amount: number, rules: MoneyRules, most: number): Cash {
  const whole = Math.max(0, Math.round(amount));
  const coins = whole % rules.noteMin;
  return { notes: makeNotes(whole - coins, rules, most), coins };
}

/** The player's notes: as kept, or (an older save, or bills set by hand) worked out from what the bills come to. */
export function notesOf(money: Money, rules: MoneyRules): Notes {
  return money.notes && sumNotes(money.notes) === money.bills ? money.notes : makeNotes(money.bills, rules, rules.most.bank);
}

/** Money with these notes, the bills to match. */
export function withNotes(money: Money, notes: Notes): Money {
  const kept = clean(notes);
  return { ...money, notes: kept, bills: sumNotes(kept) };
}

/** The notes as words, the biggest first: "€$100 ×2 · €$20 · €$5 ×3". */
export function notesLine(notes: Notes): string {
  return Object.entries(notes)
    .filter(([, n]) => n > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([d, n]) => `€$${d}${n > 1 ? ` ×${n}` : ''}`)
    .join(' · ');
}

/**
 * The notes to pay `rest` with out of these: exactly, if it can be done (the biggest that go
 * first); else the least over, with as few notes as it takes. Null if they don't come to it.
 */
export function notesToPay(notes: Notes, rest: number): Notes | null {
  if (rest <= 0) return {};
  if (sumNotes(notes) < rest) return null;
  const denoms = Object.keys(notes)
    .map(Number)
    .filter((d) => (notes[String(d)] ?? 0) > 0)
    .sort((a, b) => b - a);
  // The biggest that go, down to the smallest: exact if it comes to it.
  const pick: Notes = {};
  let left = rest;
  for (const d of denoms) {
    const n = Math.min(notes[String(d)] ?? 0, Math.floor(left / d));
    if (n > 0) pick[String(d)] = n;
    left -= n * d;
  }
  if (left === 0) return pick;
  // Short: one more note, the smallest left that covers it; or one note that covers the lot, if that's less over.
  const options: Notes[] = [];
  const spare = minusNotes(notes, pick);
  const top = [...denoms].reverse().find((d) => (spare[String(d)] ?? 0) > 0 && d >= left);
  if (top !== undefined) options.push(addNotes(pick, { [String(top)]: 1 }));
  const single = [...denoms].reverse().find((d) => d >= rest);
  if (single !== undefined) options.push({ [String(single)]: 1 });
  if (!options.length) {
    // Every note but none big enough: the smallest first till it's covered.
    const all: Notes = {};
    let got = 0;
    for (const d of [...denoms].reverse()) {
      for (let i = 0; i < (notes[String(d)] ?? 0) && got < rest; i++) {
        all[String(d)] = (all[String(d)] ?? 0) + 1;
        got += d;
      }
    }
    return all;
  }
  return options.sort((a, b) => sumNotes(a) - sumNotes(b) || countNotes(a) - countNotes(b))[0] as Notes;
}

// ───────────── Paying and being paid ─────────────

/** How much more cash the player's pockets take: notes in the wallet, coins in the change pocket. */
export interface CashRoom {
  notes: number;
  coins: number;
}

/**
 * Pays a price in cash: coins first (nobody wants to carry them), then the notes that cover the
 * rest (exactly if they can, else the least over), and the change back: under `noteMin` in
 * coins, the rest in notes no bigger than a till's. Change only comes back as far as there's
 * room for it (`room`: the wallet's notes as it is, the change pocket's coins once the coins
 * paid are out of it); the counter keeps the rest. Null if the cash isn't there.
 */
export function payCash(money: Money, price: number, rules: MoneyRules, room: CashRoom): { money: Money; change: number; kept: number; handed: Cash } | null {
  if (price > cash(money)) return null;
  const fromCoins = Math.min(money.coins, price);
  const rest = price - fromCoins;
  const notes = notesOf(money, rules);
  const handed = notesToPay(notes, rest);
  if (!handed) return null;
  const over = sumNotes(handed) - rest;
  const back = cashFor(over, rules, rules.most.till);
  // The notes back fit where the notes handed over were, and what room the wallet had; the coins where the pocket has room.
  const noteRoom = Math.max(0, room.notes) + countNotes(handed);
  const given: Notes = {};
  let fitted = 0;
  for (const [d, n] of Object.entries(back.notes).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    const k = Math.min(n, noteRoom - fitted);
    if (k > 0) given[d] = k;
    fitted += Math.max(0, k);
  }
  const coins = Math.min(back.coins, Math.max(0, room.coins));
  const change = sumNotes(given) + coins;
  return { money: { ...withNotes(money, addNotes(minusNotes(notes, handed), given)), coins: money.coins - fromCoins + coins }, change, kept: over - change, handed: { notes: handed, coins: fromCoins } };
}

/** Cash someone's owed taken off the player, with change back as for any payment, or all of it if that's all there is; what it came to (with any change they kept). */
export function takeCash(money: Money, amount: number, rules: MoneyRules, room: CashRoom): { money: Money; taken: number } {
  const want = Math.max(0, Math.round(amount));
  if (want <= 0) return { money, taken: 0 };
  if (want >= cash(money)) return { money: { ...money, bills: 0, coins: 0, notes: {} }, taken: cash(money) };
  const paid = payCash(money, want, rules, room) as NonNullable<ReturnType<typeof payCash>>;
  return { money: paid.money, taken: want + paid.kept };
}

/** Cash a thief grabs off the player: the biggest notes first, till it's about `amount`, then the coins; no change. */
export function grabCash(money: Money, amount: number, rules: MoneyRules): { money: Money; taken: number } {
  const want = Math.max(0, Math.round(amount));
  const notes = notesOf(money, rules);
  const grabbed: Notes = {};
  let got = 0;
  for (const d of Object.keys(notes).map(Number).sort((a, b) => b - a)) {
    for (let i = 0; i < (notes[String(d)] ?? 0) && got < want; i++) {
      grabbed[String(d)] = (grabbed[String(d)] ?? 0) + 1;
      got += d;
    }
  }
  const coins = Math.min(money.coins, Math.max(0, want - got));
  return { money: { ...withNotes(money, minusNotes(notes, grabbed)), coins: money.coins - coins }, taken: got + coins };
}

/** Cash into the player's pockets: the notes as far as the wallet holds them (the biggest first), the coins as far as the pocket bears them. What went in. */
export function pocket(money: Money, given: Cash, rules: MoneyRules, room: CashRoom): { money: Money; got: Cash } {
  const notes: Notes = {};
  let fitted = 0;
  for (const [d, n] of Object.entries(given.notes).sort((a, b) => Number(b[0]) - Number(a[0]))) {
    const k = Math.min(n, Math.max(0, room.notes) - fitted);
    if (k > 0) notes[d] = k;
    fitted += Math.max(0, k);
  }
  const coins = Math.min(given.coins, Math.max(0, room.coins));
  return { money: { ...withNotes(money, addNotes(notesOf(money, rules), notes)), coins: money.coins + coins }, got: { notes, coins } };
}

// ───────────── People's pockets ─────────────

/**
 * How the cash someone carries is made up: a few €$1 coins and the rest in notes, the poor in
 * small ones, the rich in big ones, drawn on their own stream for what they carry (so the same
 * sum on the same person is always the same notes).
 */
export function purseOf(amount: number, means: Quality, rules: MoneyRules, rng: Rng): Cash {
  const whole = Math.max(0, Math.round(amount));
  const coins = Math.min(whole, rng.int(0, rules.purse.coins[means]));
  const biggest = rules.purse.biggest[means];
  const notes: Notes = {};
  let left = whole - coins;
  while (left > 0) {
    // Any note that fits, likelier the bigger it is: a mixed pocket, not a neat one.
    const fits = rules.notes.filter((d) => d <= left && d <= biggest);
    const total = fits.reduce((n, d) => n + Math.sqrt(d), 0);
    let roll = rng.next() * total;
    const d = fits.find((x) => (roll -= Math.sqrt(x)) < 0) ?? (fits.at(-1) as number);
    notes[String(d)] = (notes[String(d)] ?? 0) + 1;
    left -= d;
  }
  return { notes, coins };
}

/**
 * About `amount` out of someone's pocket: the smallest first (what they hand over, keeping the
 * big ones back), or the biggest first (going through their pockets). With `under`, never a note
 * that takes it past `amount` (handing over what they mean to, and not a note more). What's
 * taken, and what's left.
 */
export function takeFrom(purse: Cash, amount: number, smallestFirst: boolean, under = false): { taken: Cash; left: Cash } {
  const want = Math.max(0, Math.round(amount));
  const taken: Notes = {};
  let got = 0;
  // Handing it over, the coins go first, then the small notes; going through them, the big notes first and the coins last.
  let coins = smallestFirst ? Math.min(purse.coins, want) : 0;
  got += coins;
  const order = Object.keys(purse.notes).map(Number).sort((a, b) => (smallestFirst ? a - b : b - a));
  for (const d of order) {
    if (under && got + d > want) continue;
    for (let i = 0; i < (purse.notes[String(d)] ?? 0) && got < want && !(under && got + d > want); i++) {
      taken[String(d)] = (taken[String(d)] ?? 0) + 1;
      got += d;
    }
  }
  if (!smallestFirst) coins = Math.min(purse.coins, Math.max(0, want - got));
  return { taken: { notes: taken, coins }, left: { notes: minusNotes(purse.notes, taken), coins: purse.coins - coins } };
}

// ───────────── The bank ─────────────

/** All cash into the account, less the bank's cut for counting the coins. */
export function deposit(money: Money, rules: MoneyRules): { money: Money; fee: number } {
  const fee = coinFee(money.coins, rules);
  return { money: { bills: 0, coins: 0, notes: {}, account: money.account + money.bills + money.coins - fee }, fee };
}

/** Notes out of the account, in the teller's notes (the biggest first). Null if it isn't there. */
export function withdraw(money: Money, amount: number, rules: MoneyRules): { money: Money; notes: Notes } | null {
  if (amount <= 0 || amount > money.account) return null;
  const notes = makeNotes(amount, rules, rules.most.bank);
  return { money: { ...withNotes(money, addNotes(notesOf(money, rules), notes)), account: money.account - amount }, notes };
}

/** Coins into notes, less the bank's cut. Null with no coins to change. */
export function changeCoins(money: Money, rules: MoneyRules): { money: Money; fee: number; notes: Notes } | null {
  if (money.coins <= 0) return null;
  const fee = coinFee(money.coins, rules);
  const notes = makeNotes(money.coins - fee, rules, rules.most.bank);
  return { money: { ...withNotes(money, addNotes(notesOf(money, rules), notes)), coins: 0 }, fee, notes };
}

/** The bank's cut for counting coins: the share, to the nearest eddie (a handful of change counts for free). */
export function coinFee(coins: number, rules: MoneyRules): number {
  return coins > 0 ? Math.min(coins, Math.round(coins * rules.coinFee)) : 0;
}

/** A netrunner's cut for chopping a credchip with `balance` on it: the share, to the nearest eddie, and never nothing. */
export function chipCut(balance: number, rules: MoneyRules): number {
  return balance > 0 ? Math.min(balance, Math.max(1, Math.round(balance * rules.chopCut))) : 0;
}
