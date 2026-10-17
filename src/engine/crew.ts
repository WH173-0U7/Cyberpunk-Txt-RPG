import type { Rng } from './rng';
import type { Stance } from './society';

/**
 * The player's own crew. From a high enough rung, the player can take on runners: anyone who
 * trusts them, the keener for being of the player's gang or using what it deals. A runner is
 * fronted doses out of the player's own pockets and owes back a share of their street value by
 * a day, as the player owes the connect; what they sell over that is theirs. They sell on
 * their own, a day at a time near where they live (`runnerDay`), by how many users there are
 * round there and their own Trading, and things go wrong on the way: the NCPD picks them up
 * (and they may give the player up), someone robs them, a greedy one skims, a hooked one uses,
 * and an unhappy one walks, or runs off with the lot. The player settles up in person
 * (`settle`): what they hold, up to what they owe, and the rest is theirs to lean on them for
 * or let slide. The numbers and lines are `DEALING.crew` (`src/data/dealing.ts`); the doing of
 * it is `Game`'s.
 */

/** Something that happened to a runner, for them to tell, or for word of it to reach the player. */
export interface RunnerNews {
  kind: 'busted' | 'robbed' | 'hurt';
  day: number;
  doses?: number;
  cash?: number;
}

export interface Runner {
  /** When they joined. */
  since: number;
  /** The drug they hold, and how many doses of it are still unsold. */
  drug: string | null;
  stock: number;
  /** The doses fronted in the package they're on, what they owe the player for it and have paid of it, and by when. */
  fronted: number;
  owed: number;
  paid: number;
  due: number | null;
  /** The cash from their sales they're holding (the player's share and their own, together). */
  cash: number;
  /** Packages paid off in full, and times they've come up short. */
  fronts: number;
  shorted: number;
  /** The last day they lived; held by the NCPD through this day. */
  day: number;
  heldTill?: number;
  /** How they feel about running for the player (out of 100): below `mood.quit`, they walk. */
  mood: number;
  /** What's happened since the player last saw them. */
  news: RunnerNews[];
  /** Skimmed or used this package, unseen: what they'd have to account for. */
  hidden?: number;
  /** Walked away, holding what they held for the player; or ran off with it. */
  quit?: boolean;
  ran?: boolean;
}

export interface CrewLines {
  /** Word reaching the player (`{who}`, `{he}`, `{his}`, `{drug}`, `{doses}`, `{cash}`): a runner picked up, picked up and naming the player, robbed, walking out holding something of the player's or with nothing out, running off with it, dead. */
  busted: string[];
  named: string[];
  robbed: string[];
  quit: string[];
  walked: string[];
  ran: string[];
  dead: string[];
}

export interface CrewRules {
  /** The rung (by index) from which the player can take runners on, and the most at each rung from it. */
  from: number;
  most: number[];
  /** Who'll think about it: their stance; keener (on the openness) for one of the player's gang, a user of what it deals, and less for someone straight. */
  stances: Stance[];
  keen: { gang: number; user: number; straight: number };
  /** A package for a runner: the sizes on offer, the share of its street value they owe the player, and the days they have to pay. */
  sizes: number[];
  owe: number;
  days: number;
  /** A day's selling: doses for every so many users of it round where they live, and for being out at all; a Dealing level past an ordinary one sells `perLevel` more; never past `most`. */
  sell: { base: number; perUsers: number; perLevel: number; most: number };
  /** Trading and Dealing XP a dose sold, for the runner. */
  practice: number;
  /** A day's odds of: the NCPD picking them up (times the district's call), naming the player then (less for one who likes them), days held; being robbed (times how rough it is), the share of stock and cash taken, the odds they're hurt and for how long; skimming (only someone greedier than `greed`), the share of a day's take; using it (if it's their habit), doses. */
  bust: { base: number; name: number; loyal: number; hold: [number, number] };
  robbed: { base: number; share: [number, number]; hurt: number; hurtDays: [number, number] };
  skim: { greed: number; share: [number, number] };
  use: { doses: [number, number] };
  /** How they feel: to start with, a day that sold, busted, robbed, leaned on, let off, a package settled; under `quit` a day's odds of walking (`walk`), and of running off with what they hold (`runOff`, by greed). */
  mood: { start: number; sold: number; busted: number; robbed: number; leaned: number; slide: number; settled: number; quit: number; walk: number; runOff: number };
  /** Leaning on one who's short: the odds they find the rest (the player's Street Brawler past theirs adds), never past `most`; the rapport and grudge it costs; the rapport letting it slide earns. */
  lean: { base: number; perLevel: number; most: number; rapport: number; grudge: number; slide: number };
  lines: CrewLines;
}

/** How many runners the player can have at their rung: none below `from`. */
export function crewSize(rung: number, rules: CrewRules): number {
  if (rung < rules.from) return 0;
  return rules.most[Math.min(rules.most.length - 1, rung - rules.from)] ?? 0;
}

/** A fresh runner, on nothing yet. */
export function freshRunner(now: number, day: number, rules: CrewRules): Runner {
  return { since: now, drug: null, stock: 0, fronted: 0, owed: 0, paid: 0, due: null, cash: 0, fronts: 0, shorted: 0, day, mood: rules.mood.start, news: [] };
}

/** What's still owed on the package a runner is on. */
export function runnerLeft(runner: Runner): number {
  return Math.max(0, runner.owed - runner.paid);
}

/** Whether a runner is short: what they hold won't cover what's left, with nothing left to sell, or past the day. */
export function runnerShort(runner: Runner, now: number): boolean {
  return runnerLeft(runner) > runner.cash && (runner.stock <= 0 || (runner.due !== null && now >= runner.due) || Boolean(runner.quit || runner.ran));
}

/** A package fronted to a runner: what they owe for it at this street price. */
export function frontRunner(runner: Runner, drug: string, doses: number, street: number, now: number, timeScale: number, rules: CrewRules): Runner {
  return { ...runner, drug, stock: doses, fronted: doses, owed: Math.round(doses * street * rules.owe), paid: 0, due: now + (rules.days * 86_400_000) / timeScale, hidden: 0 };
}

/** Everything a day's running depends on that isn't the runner. */
export interface RunnerDay {
  day: number;
  /** Users of what they carry round where they live. */
  users: number;
  /** Their Dealing level (how fast it sells), and what their Trading does to the price against an ordinary seller's. */
  dealing: number;
  priceFactor: number;
  /** A dose's street price where they sell. */
  street: number;
  /** The district's odds of a call (none where the NCPD doesn't police), and how rough it is. */
  call: number;
  rough: number;
  greed: number;
  /** Whether they're hooked on what they carry. */
  hooked: boolean;
  /** How much they like the player (rapport). */
  rapport: number;
}

/** What a day did: the runner after it, what they sold and skimmed, whether they gave the player up, the days they're laid up, and whether they walked or ran. */
export interface RunnerDayResult {
  runner: Runner;
  sold: number;
  skimmed: number;
  named: boolean;
  hurtDays: number;
  walked: 'quit' | 'ran' | null;
}

/**
 * One day of a runner's: picked up (stock seized, held, maybe naming the player), robbed (a
 * share of the stock and the cash, maybe hurt), or out selling (by the users round there and
 * their Trading; a greedy one skims, a hooked one uses); and how they feel about it, walking out
 * when they've had enough.
 */
export function runnerDay(runner: Runner, ctx: RunnerDay, rules: CrewRules, rng: Rng): RunnerDayResult {
  const r: Runner = { ...runner, news: [...runner.news], day: ctx.day };
  const out: RunnerDayResult = { runner: r, sold: 0, skimmed: 0, named: false, hurtDays: 0, walked: null };
  if (r.quit || r.ran) return out;
  const working = r.stock > 0 && r.drug !== null && !(r.heldTill !== undefined && ctx.day <= r.heldTill);
  if (working) {
    if (ctx.call > 0 && rng.chance(rules.bust.base * ctx.call)) {
      r.news.push({ kind: 'busted', day: ctx.day, doses: r.stock });
      r.stock = 0;
      r.heldTill = ctx.day + rng.int(rules.bust.hold[0], rules.bust.hold[1]);
      r.mood -= rules.mood.busted;
      out.named = rng.chance(Math.max(0, rules.bust.name - (rules.bust.loyal * Math.max(0, ctx.rapport)) / 100));
    } else if (rng.chance(rules.robbed.base * ctx.rough)) {
      const share = rng.range(rules.robbed.share[0], rules.robbed.share[1]);
      const doses = Math.max(1, Math.round(r.stock * share));
      const cash = Math.round(r.cash * share);
      r.stock -= doses;
      r.cash -= cash;
      r.mood -= rules.mood.robbed;
      r.news.push({ kind: 'robbed', day: ctx.day, doses, cash });
      if (rng.chance(rules.robbed.hurt)) {
        out.hurtDays = rng.int(rules.robbed.hurtDays[0], rules.robbed.hurtDays[1]);
        r.news.push({ kind: 'hurt', day: ctx.day });
      }
    } else {
      if (ctx.hooked) {
        const used = Math.min(r.stock, rng.int(rules.use.doses[0], rules.use.doses[1]));
        r.stock -= used;
        r.hidden = (r.hidden ?? 0) + used * ctx.street;
      }
      const pace = (rules.sell.base + ctx.users / rules.sell.perUsers) * Math.max(0.3, 1 + rules.sell.perLevel * (ctx.dealing - 4));
      const sold = Math.min(r.stock, Math.min(rules.sell.most, Math.round(pace * rng.range(0.5, 1.5))));
      if (sold > 0) {
        const take = Math.round(sold * ctx.street * ctx.priceFactor);
        r.stock -= sold;
        r.cash += take;
        r.mood = Math.min(100, r.mood + rules.mood.sold);
        out.sold = sold;
        if (ctx.greed > rules.skim.greed) {
          out.skimmed = Math.round(take * rng.range(rules.skim.share[0], rules.skim.share[1]));
          r.cash -= out.skimmed;
          r.hidden = (r.hidden ?? 0) + out.skimmed;
        }
      }
    }
  }
  // What they'd tell the player, the last few things only.
  r.news = r.news.slice(-6);
  if (r.mood < rules.mood.quit && rng.chance(rules.mood.walk)) {
    const holding = r.stock > 0 || r.cash > 0;
    if (holding && rng.chance(rules.mood.runOff * (0.5 + ctx.greed))) {
      r.ran = true;
      out.walked = 'ran';
    } else {
      r.quit = true;
      out.walked = 'quit';
    }
  }
  return out;
}

/** Settling up with a runner: the cash they hand over toward what's left, a package paid off (what's over is theirs), and what's still owed. */
export function settle(runner: Runner, rules: CrewRules): { runner: Runner; handed: number; kept: number; settled: boolean } {
  const left = runnerLeft(runner);
  const handed = Math.min(runner.cash, left);
  const r: Runner = { ...runner, cash: runner.cash - handed, paid: runner.paid + handed, news: [] };
  let kept = 0;
  let settled = false;
  if (r.owed > 0 && r.paid >= r.owed && r.stock <= 0) {
    kept = r.cash;
    settled = true;
    r.cash = 0;
    r.fronts += 1;
    r.mood = Math.min(100, r.mood + rules.mood.settled);
    Object.assign(r, { drug: null, fronted: 0, owed: 0, paid: 0, due: null, hidden: 0 });
  }
  return { runner: r, handed, kept, settled };
}

/** A runner's package written off: nothing more owed, and glad of it. */
export function writeOff(runner: Runner, rules: CrewRules, shorted = true): Runner {
  return { ...runner, drug: runner.stock > 0 ? runner.drug : null, fronted: runner.stock > 0 ? runner.fronted : 0, owed: 0, paid: 0, due: null, hidden: 0, shorted: runner.shorted + (shorted ? 1 : 0), mood: Math.min(100, runner.mood + rules.mood.slide) };
}

/** The odds leaning on a short runner gets the rest out of them: the player's fists against theirs. */
export function leanOdds(yours: number, theirs: number, rules: CrewRules): number {
  return Math.max(0.05, Math.min(rules.lean.most, rules.lean.base + rules.lean.perLevel * (yours - theirs)));
}

/** A runner as the UI shows them. */
export interface RunnerView {
  id: string;
  name: string;
  drug: string | null;
  stock: number;
  cash: number;
  owed: number;
  left: number;
  due: number | null;
  short: boolean;
  fronts: number;
  held: boolean;
  quit: boolean;
  ran: boolean;
}
