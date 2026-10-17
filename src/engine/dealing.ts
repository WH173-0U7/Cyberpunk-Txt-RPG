import { createRng } from './rng';
import type { Quality } from './food';
import type { CrewRules, Runner } from './crew';
import type { CutRules } from './cutting';
import type { HabitRules as YourHabitRules } from './habit';
import type { Person, SkillWalk, Traits } from './people';
import type { SkillRules } from './skills';
import type { Stance } from './society';

/**
 * Dealing for a gang. The gangs the wiki has dealing each push their own product (canon drugs,
 * by item id, in `src/data/drugs.ts`); a connect of theirs fronts the player a package once
 * they've earned some trust, owed back by a day; the player sells it on the corner the gang
 * gives them, to whoever has a habit (`habitOf`) and comes by, or pitches it to people they
 * meet; what's sold over what's owed is theirs, and the price is their Trading against the
 * buyer's. Paid on time, trust grows and the rungs follow, with bigger fronts and a better
 * cut; short or late, it's a debt that grows, and collectors come for it. The numbers and the
 * gangs' words are in `src/data/dealing.ts`; the doing of it is `Game`'s.
 */

/** A drug: canon facts (what it is, how it's taken, whether carrying it is a crime), and our weight, price and pull. */
export interface DrugKind {
  name: string;
  /** How it's taken: the wiki's for the 2077 drugs (an inhaler; the Animals drink their Juice), ours for the older ones. */
  type: string;
  /** The edition it's from: the 2077 drugs, or the older ones (2020, or RED only) that fill out a gang's line. */
  from: '2077' | '2020' | 'RED';
  /** Canon: illegal to carry at all (combat-rated, or illegal outright), not only to sell without a license. */
  illegal: boolean;
  grams: number;
  /** Doses to a pocket slot. */
  perSlot: number;
  /** A dose on the street at everyday prices; richer streets pay more, poorer less. */
  price: number;
  /** How hard it hooks, 0–1: its users need it more, and pay more readily. */
  hook: number;
  /** Who takes it: a weight by walk of life, the ages it's taken at, and traits that lean to it (a trait's share of a full point either way). */
  users: { walks: Partial<Record<SkillWalk, number>>; age: [number, number]; traits?: Partial<Record<keyof Traits, number>> };
  note: string;
}

/** Someone's habit: what they take, and how badly they need it (0–1). */
export interface Habit {
  drug: string;
  need: number;
}

export interface HabitRules {
  /** The share of each walk of life with a habit. */
  chance: Record<SkillWalk, number>;
  /** Nobody younger takes anything (as far as the game's concerned). */
  adultAt: number;
  /** What a drug nobody deals in their district weighs against one that's dealt there. */
  elsewhere: number;
}

/** A rung on a gang's ladder: the trust and the fronts paid it takes, the package it's fronted, the share of its street value owed back, and the days to pay. */
export interface DealRung {
  id: string;
  /** Trust it takes. */
  at: number;
  /** Fronts paid off in full it takes. */
  paid: number;
  /** Doses fronted. */
  front: number;
  /** The share of the package's street value owed back to the gang. */
  cut: number;
  days: number;
}

/** A gang that deals: what it pushes, who of theirs fronts it (by role) and who comes to collect, its rungs' titles, and the canon places it works. */
export interface DealGang {
  /** Its line, from what it fronts anyone to its best: each past the first takes the Dealing level in `at`. */
  drugs: string[];
  at?: Record<string, number>;
  connects: string[];
  collectors: string[];
  /** One title a rung, in the gang's own words. */
  titles: string[];
  /** Canon places the gang deals from, by name: a corner there first. */
  spots?: string[];
}

export interface DealLines {
  /** The corner's moments, told: `{who}` (`{Who}` to start a sentence), `{he}`, `{his}`, `{him}`, `{drug}`, `{price}`, `{pay}`, `{gang}`. */
  walkUp: string[];
  regular: string[];
  short: string[];
  sold: string[];
  pushed: string[];
  walked: string[];
  turned: string[];
  quiet: string[];
  dry: string[];
  /** The deadline: a front owed now, and the debt growing. */
  due: string[];
  /** Collectors, told (`{owed}`, `{pay}`, `{left}`, `{when}`): they turn up, they're paid in full or in part, they're talked round, they won't be, they take it out on the player. */
  collect: string[];
  collectPaid: string[];
  collectSome: string[];
  pleaded: string[];
  pleadFailed: string[];
  beaten: string[];
  /** The gang has had enough: no more product, and the debt is a score to settle. */
  cutOff: string[];
  /** Bad customers: a robber pulling a weapon (`{weapon}`), handed it (`{took}`), talked down, not; a tell that a buyer is NCPD; the bust; a regular wanting it on tab (`{owed}` the tab), put on it, paying it back (`{pay}`), dodging it. */
  robber: string[];
  handOver: string[];
  talkedDown: string[];
  talkFailed: string[];
  tell: string[];
  busted: string[];
  tabAsk: string[];
  tabTaken: string[];
  tabPaid: string[];
  tabDodged: string[];
  /** Turf wars (`{gang}` the rivals, `{ours}` the player's gang, `{corner}`, `{pay}`): rivals at the corner, the player clearing off, paying them, standing up to them; the corner lost, taken back, a new one given, none to give; selling on a rival's turf. */
  rivals: string[];
  clearedOff: string[];
  paidOff: string[];
  stoodUp: string[];
  lost: string[];
  retaken: string[];
  newCorner: string[];
  noCorner: string[];
  rivalTurf: string[];
}

/**
 * Turf wars. A corner is held by a gang (`DealingState.corners`, else a gang's own canon spot
 * is its own); a fight in its district won by a rival of the holder, in the people's own days,
 * takes it by `take`, and the gang that held it takes it back the same way. At the player's
 * corner, the rivals of their gang come by now and then (`rivals`: a chance a buyer's worth,
 * more for the player's heat, a point a sale halving a day, and for the rivals' share of the
 * district's turf): clearing off gives up the block, and `yield` times running gives up the
 * corner; paying them is a share of the cash; standing up to them is a fight, and trust with
 * the player's own gang. Selling on a rival's turf, or pitching one of theirs, may set them
 * on the player (`threat`).
 */
export interface WarRules {
  take: number;
  rivals: { base: number; heat: number; near: number; pay: [number, number]; yield: number; trust: number };
  heat: { decay: number };
  threat: { chance: number; amount: [number, number]; hours: [number, number] };
}

/**
 * The corner's bad customers. A robber posing as a buyer (`robber`, times `rough` by
 * district); an undercover officer (`undercover`, times how readily the district calls the
 * NCPD), read for one by the player's Trading or charisma (`read`); a buyer who calls it in
 * after (`snitch`: more pushed or turned away, a regular less, a ganger never), and witnesses
 * to a sale, of whom only `seen` notice it; a regular short of the price who wants it on tab
 * (`tab`: paid back with `extra` by the odds and their loyalty, written off after `days`).
 * Handing over to a robber loses a share of the doses and the cash (`rob`); talking them
 * down is the player's charisma against theirs (`talk`).
 */
export interface BadRules {
  robber: number;
  rough: Record<string, number>;
  undercover: number;
  read: { base: number; perLevel: number; most: number };
  snitch: { base: number; pushed: number; turned: number; regular: number };
  seen: number;
  tab: { payBack: number; loyalty: number; extra: number; days: number };
  rob: { doses: [number, number]; cash: [number, number] };
  talk: { base: number; perLevel: number; most: number };
}

export interface DealingRules {
  drugs: Record<string, DrugKind>;
  gangs: Record<string, DealGang>;
  rungs: DealRung[];
  habits: HabitRules;
  /** What it takes for a connect to front the player anything: how they feel about them (one of the gang vouching for them lets a neutral one do it), and how the gang does. */
  join: { stances: Stance[]; vouched: Stance[]; rep: number };
  /** Trust for a front paid in full and on time (more before half its time is up), off for paying late, for coming up short, and for fighting a collector. */
  trust: { paid: number; early: number; late: number; short: number; fought: number; cutOff: number };
  /** A debt: interest a day, hours after the deadline the collectors come and between visits, what pleading gets, what a beating takes. */
  debt: { interest: number; graceHours: number; againHours: number; plead: { base: number; perLevel: number; most: number; hours: number; trust: number }; beat: { health: number; energy: number; trust: number }; threat: number };
  /** The corner: the kinds of place it can be, buyers a three-hour block (from midnight), how busy each kind is, the energy a buyer takes, how much likelier a regular is to come, and how many buys make one. */
  corner: { kinds: string[]; buyers: number[]; busy: Record<string, number>; energy: number; regulars: number; regularAt: number; rapport: number };
  /** Pushing for more: the odds (a Trading level past theirs adds, their need adds), never past `most`; what it asks over the price. */
  push: { base: number; perLevel: number; need: number; most: number; more: number; rapport: number };
  /** A buyer short of the price offers what they have, if it's at least this share of it. */
  short: { least: number };
  /** Pitching someone without a habit: rapport it costs. */
  pitch: { rapport: number };
  /** What a dose fetches on richer and poorer streets. */
  tiers: Record<Quality, number>;
  bad: BadRules;
  war: WarRules;
  /** The player's own habit, if they use what they sell (habit.ts). */
  habit: YourHabitRules;
  /** The player's own runners, from a high enough rung (crew.ts). */
  crew: CrewRules;
  /** The Dealing skill, and its experience: a dose sold, a package paid off, a rung climbed, a dose a runner sells. */
  skill: SkillRules;
  xp: { sale: number; front: number; rung: number; runner: number };
  /** Cutting product, and the Cutting skill (cutting.ts). */
  cut: CutRules;
  lines: DealLines;
}

/** A package fronted: the drug, how many doses, what's owed back and what's been paid of it, by when. */
export interface Front {
  drug: string;
  doses: number;
  owed: number;
  paid: number;
  at: number;
  due: number;
}

/** The player's dealings with one gang. */
export interface DealState {
  gang: string;
  /** The member who fronts the player and takes the money. */
  connect: string;
  rung: number;
  trust: number;
  /** The place the gang has the player work, by location id. */
  corner: string | null;
  front: Front | null;
  /** What's overdue, interest and all, and when the interest last went on. */
  debt: number;
  debtAt: number;
  /** When collectors come next, while there's a debt. */
  collectAt: number | null;
  collections: number;
  /** Fronts paid off in full, doses sold, eddies taken. */
  fronts: number;
  sold: number;
  take: number;
  /** Who's bought off the player: how many times, when last, and what they owe on tab since when. */
  customers: Record<string, { bought: number; last: number; tab?: number; tabAt?: number }>;
  /** The corner's three-hour block, and how many buyers have come by in it. */
  block: { key: number; served: number };
  /** The player's heat with rival gangs (a point a sale, halving a day) as of when; the times running they've cleared off the corner for them. */
  heat?: number;
  heatAt?: number;
  yielded?: number;
}

export interface DealingState {
  current: DealState | null;
  /** Who in each gang put in a word for the player (a gang id's member id). */
  vouched: Record<string, string>;
  /** Gangs the player walked away from, as they left it, to pick up again. */
  past: Record<string, DealState>;
  /** Gangs that cut the player off, and when. */
  burned: Record<string, number>;
  /** Who holds a corner (a place's id) that's changed hands, or been claimed for the player; a gang's own canon spots are its own otherwise, and anywhere else nobody's. */
  corners: Record<string, string>;
  /** The player's runners, by person id, and every dose anyone has sold for the player (their practice at it). */
  crew: Record<string, Runner>;
  dealt: Record<string, number>;
  /** Buyers a bad cut has got to, to be told of the next day lived: who, of what, and whether it killed them, and whether they knew the player's face. */
  harms: Array<{ id: string; drug: string; day: number; deadly: boolean; knew: boolean }>;
}

export function freshDealing(): DealingState {
  return { current: null, vouched: {}, past: {}, burned: {}, corners: {}, crew: {}, dealt: {}, harms: [] };
}

/** The Dealing level a gang fronts a drug at: its first for anyone, the rest by `at`. */
export function drugLevel(gang: DealGang, drug: string): number {
  return gang.drugs[0] === drug ? 1 : (gang.at?.[drug] ?? 1);
}

/** The player's heat at `now`: what it was, halved for every day since. */
export function heatAt(state: DealState, now: number, rules: DealingRules, timeScale: number): number {
  if (!state.heat || state.heatAt === undefined) return 0;
  const days = Math.max(0, now - state.heatAt) / (86_400_000 / timeScale);
  return state.heat * Math.pow(rules.war.heat.decay, days);
}

/**
 * Whether someone takes anything, and what: on their own stream, so it never moves anything
 * else. A share of each walk of life does (`habits.chance`), adults only; what they take is
 * weighed by who each drug's users are (walk, age, nature) and whether anyone deals it where
 * they live (`dealtHere`, the drugs of the gangs whose turf it is).
 */
export function habitOf(person: Person, walk: SkillWalk, dealtHere: ReadonlySet<string>, rules: DealingRules, seed: string): Habit | null {
  if (person.age < rules.habits.adultAt) return null;
  const rng = createRng(`${seed}:habit:${person.id}`);
  if (!rng.chance(rules.habits.chance[walk])) return null;
  const weighed = Object.entries(rules.drugs).map(([id, drug]) => {
    const [from, to] = drug.users.age;
    let weight = (drug.users.walks[walk] ?? 0) * (person.age >= from && person.age <= to ? 1 : 0.2);
    for (const [trait, lean] of Object.entries(drug.users.traits ?? {}) as Array<[keyof Traits, number]>) weight *= Math.max(0.1, 1 + lean * (person.traits[trait] - 0.5) * 2);
    return { id, weight: weight * (dealtHere.has(id) ? 1 : rules.habits.elsewhere) };
  });
  const total = weighed.reduce((n, w) => n + w.weight, 0);
  if (total <= 0) return null;
  let roll = rng.next() * total;
  const pick = weighed.find((w) => (roll -= w.weight) < 0) ?? weighed[weighed.length - 1]!;
  const drug = rules.drugs[pick.id]!;
  return { drug: pick.id, need: Math.min(1, rng.range(0.15, 0.7) + drug.hook * 0.4) };
}

/** The rung the player is on with a gang. */
export function dealRungOf(state: DealState, rules: DealingRules): DealRung {
  return rules.rungs[Math.min(state.rung, rules.rungs.length - 1)]!;
}

/** Whether the player has the trust and the fronts paid for the next rung. */
export function canMoveUp(state: DealState, rules: DealingRules): boolean {
  const next = rules.rungs[state.rung + 1];
  return Boolean(next && state.trust >= next.at && state.fronts >= next.paid);
}

/** A dose's street price on a street of this tier. */
export function streetPrice(drug: DrugKind, tier: Quality, rules: DealingRules): number {
  return Math.max(1, Math.round(drug.price * rules.tiers[tier]));
}

/** What a package of this drug at this rung owes back. */
export function owedFor(drug: DrugKind, rung: DealRung): number {
  return Math.max(1, Math.round(drug.price * rung.front * rung.cut));
}

/**
 * What the player asks a buyer: the street price, moved by the player's Trading against the
 * buyer's (both as bonuses, `factor` = mine over theirs, to the haggle's power): a poor trader
 * lets it go for less, a sharp one gets more.
 */
export function askOf(street: number, factor: number): number {
  return Math.max(1, Math.round(street * factor));
}

/** The odds a push for more comes off: a Trading level past the buyer's adds, their need adds, never past `most`. */
export function pushOdds(yours: number, theirs: number, need: number, rules: DealingRules): number {
  const { push } = rules;
  return Math.max(0.05, Math.min(push.most, push.base + push.perLevel * (yours - theirs) + push.need * need));
}

/** Buyers a corner sees in a three-hour block: by the hour, times how busy its kind of place is. */
export function buyersIn(hour: number, kind: string, rules: DealingRules): number {
  const { corner } = rules;
  const base = corner.buyers[Math.floor(hour / 3) % corner.buyers.length] ?? 0;
  return Math.max(0, Math.round(base * (corner.busy[kind] ?? 1)));
}

/** A clock's three-hour block, counted from the start of time, so a new block is a new count. */
export function blockOf(day: number, hour: number): number {
  return day * 8 + Math.floor(hour / 3);
}

/** A debt after `days` of interest. */
export function withInterest(debt: number, days: number, rules: DealingRules): number {
  return Math.round(debt * Math.pow(1 + rules.debt.interest, days));
}

/** Where the player stands with the gang they deal for, as the UI shows it. */
export interface DealView {
  gang: string;
  gangName: string;
  title: string;
  rung: number;
  trust: number;
  /** The next rung: its title, and the trust and fronts paid it takes. */
  next: { title: string; trust: number; fronts: number } | null;
  connect: string;
  connectName: string;
  corner: { id: string; name: string } | null;
  front: { drug: string; name: string; doses: number; owed: number; paid: number; left: number; due: number } | null;
  /** Doses of the gang's product on the player now. */
  carried: number;
  debt: number;
  collectAt: number | null;
  fronts: number;
  sold: number;
  take: number;
  /** How many runners the player could have at their rung. */
  crewMost: number;
  /** The gang's line: each drug, the Dealing level it takes, and whether the player has it. */
  line: Array<{ drug: string; name: string; at: number; open: boolean }>;
}

/** Something to do about dealing with a person, as their card offers it: `ask`, `front`, `pay`, `walk`, or `sell:<drug>`. */
export interface DealOption {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
  danger?: boolean;
}

/** A choice on the panel: a buyer at the corner, or a collector come for a debt. */
export interface DealChoice {
  id: string;
  label: string;
  sub?: string;
  disabled?: boolean;
}

/** A buyer at the player's corner, waiting on an answer. */
export interface DealMomentView {
  text: string;
  person: string;
  choices: DealChoice[];
}

/** A collector on the player, waiting on an answer. */
export interface CollectorView {
  text: string;
  person: string;
  gang: string;
  owed: number;
  choices: DealChoice[];
}
