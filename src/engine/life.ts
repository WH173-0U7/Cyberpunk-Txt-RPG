import { economyDay, headlineIn, healthOf, holderOf, homeKind, ledgerOf, staffCostOf, type Closure, type Debt, type EconomyRules, type Ledger, type MarketState, type Owned, type Till, type Vice } from './economy';
import type { Quality } from './food';
import { bossOf, runsIt } from './jobs';
import { buildingById, drawnTo, heartOf, INVERSE, leastStaff, personById, rolesFor, seatRota, tiesOf, type Clock, type Heart, type PeopleContent, type Person, type Population, type Pronouns, type Spot, type Tie, type TieKind } from './people';
import { createRng, type Rng } from './rng';
import type { Building, World } from './types';

/**
 * The people's own lives, going on without the player. Every day on the clock, in every
 * district, a few things happen between them: a gang leans on a storefront for its cut, or
 * jumps someone on the way home; someone picks a fight with a gang they hate, or two rival
 * crews go at it, and the loser is laid up at home for days; two regulars of the same bar
 * become friends; a hot temper ends a friendship, and some are patched up again. Two people
 * get together, marry after a while, or one walks out. A busy storefront takes on someone
 * looking for work and a struggling one lets someone go; a fight between rival crews now and
 * then leaves someone dead, the old die of their years, and a gang that lost one of its own
 * takes on someone young. What happens is written down (`LifeEvent`) and changes the people
 * for good (eddies, who hates whom, who is tied to whom and how, who works where, who runs
 * with which gang, who is laid up, who is gone), so the city the player comes back to has
 * moved on; and the people talk about it.
 * Under it all the eddies go round (`economy.ts`): pay from tills, payrolls and chests, food,
 * evenings out and rent, the tills' books, the gangs' cut. And when the eddies run out, hard
 * times: the desperate mug strangers and run with the gangs, a loan shark's collector comes for
 * what's owed, a tenant three weeks behind is put out, and a storefront that can't pay its people
 * lets them all go, until new management takes it on. On top of that, wherever the player is, the people there are seen with each other: a couple
 * sharing a table, a crew holding court, a ganger leaning on the cook. Everything here is
 * drawn from the seed and the day, so a city's days are the same whenever they're lived
 * through; the numbers are in `src/data/life.ts`.
 */
export type LifeKind = 'shakedown' | 'robbery' | 'fight' | 'friends' | 'fallout' | 'makeup' | 'romance' | 'wedding' | 'breakup' | 'hired' | 'laidOff' | 'death' | 'joined' | 'mugging' | 'collected' | 'evicted' | 'closed' | 'reopened';
/** The kinds of thing that happen by chance on a day; the rest follow from the money (a debt, the rent, the books). */
export type ChanceKind = Exclude<LifeKind, 'collected' | 'evicted' | 'closed' | 'reopened'>;

export interface LifeEvent {
  id: number;
  day: number;
  kind: LifeKind;
  /**
   * Who did it and who it was done to: the winner and the loser, for a fight; the two of
   * them, for friends made, lost or made up with and for a couple (the one who walked out
   * first, for a breakup); the boss and the one taken on or let go; the killer and the dead,
   * or the dead twice over for someone who died of their years; the one who brought a recruit
   * in, and the recruit; the mugger and the mugged; a loan shark's collector and the one who owed;
   * the landlord and the tenant put out (the tenant twice over, put out by a corp); the boss of a
   * storefront gone under (or open again) and one of its people (the boss twice over, alone).
   */
  who: [string, string];
  /** The gang behind it, if any. */
  gang: string | null;
  district: string;
  /** Eddies that changed hands. */
  took: number;
  /** Where it happened, if anywhere in particular. */
  where: Spot | null;
}

export type SceneKind = 'couple' | 'family' | 'friends' | 'crew' | 'coworkers' | 'shakedown' | 'leanedOn' | 'rivals' | 'grudge' | 'grudged';

/** What a pair of people here are seen doing: the phrase, and the other one's id ("arguing with" them). */
export interface Scene {
  with: string;
  phrase: string;
  kind: SceneKind;
}

export interface LifeRules {
  /** The chance of each kind of thing in a district on a day, where the people for it exist. */
  chances: Record<ChanceKind, number>;
  /** The most things that happen in a district on one day. */
  perDistrict: number;
  /** Days a fight's loser stays home, from and to. */
  hurtDays: [number, number];
  /** The chance a fight between rival crews kills the loser, while their gang has more than `crewFloor` alive in the district. */
  deadly: number;
  crewFloor: number;
  /** The age from which someone can die of their years. */
  elderAt: number;
  /** The youngest someone gets together with anyone; the most years between a couple; the days they're together before they can marry. */
  adultAt: number;
  ageGap: number;
  weddingAfter: number;
  /** The most people a storefront takes on; the roles of people looking for work (the first is what someone let go becomes); the oldest a gang takes on. */
  maxStaff: number;
  jobless: string[];
  recruitAge: number;
  /** Days the big things are remembered and talked about, where that's longer than everything else (`keepDays`, `newsDays`). */
  lasting: Partial<Record<LifeKind, number>>;
  /** Days someone grieves a relative who died: quieter, closed up, in no mood for jokes. */
  griefDays: number;
  /** A shakedown's take and a robbery's, as shares of what the victim has. */
  shakedown: [number, number];
  robbery: [number, number];
  /** How the eddies move: wages, spending, the tills and the gangs' cut. */
  economy: EconomyRules;
  /** Days the city remembers something; days people still bring it up. */
  keepDays: number;
  newsDays: number;
  /** The most days lived through at once after the game was closed. */
  catchUpDays: number;
  /** The chance that two people here who know each other are doing something together; that a ganger on their turf is leaning on the help; that rivals here are eyeing each other. */
  together: number;
  leaning: number;
  eyeing: number;
  /** What pairs are seen doing, by what they are to each other; the other's name follows the phrase. */
  scenes: Record<SceneKind, string[]>;
  /** What people hold against each other (missing: nothing, as before). */
  held?: HeldRules;
  /** The chance someone at a spot with whoever they hold something against is seen at it. */
  glaring?: number;
  /** Hard times among the people (missing: none). */
  hard?: HardLifeRules;
}

/**
 * Hard times among the people. Someone desperate (behind on the rent, or owing a gang) with the
 * nerve (`mugging.nerve`, of courage and greed) mugs a stranger in their district for `mugging.take`
 * of what's on them. A collector of the gang someone owes, `collect.chance` a day a district, comes
 * for someone who hasn't paid a cent in `collect.late` days: a beating, and what they have on them.
 * A gang takes on the desperate young (up to `recruit.age`, with the nerve), `recruit.chance` a day a
 * district, while it has no more than `recruit.extra` members there beyond what it started with.
 * Someone put out of their home finds another once they've the money put by (`rehouse`).
 */
export interface HardLifeRules {
  mugging: { nerve: number; take: [number, number] };
  collect: { chance: number; late: number };
  recruit: { chance: number; age: number; nerve: number; extra: number };
  /** Put out, someone squatting or sleeping rough looks again every week from `after` days on, and finds a place (one of the `cheapest` blocks of their district) once they have `weeks` of its rent and their food put by. */
  rehouse: { after: number; weeks: number; cheapest: number };
}

export interface LifeState {
  /** The last day lived through (-1 before the first). */
  day: number;
  nextId: number;
  events: LifeEvent[];
  /** Eddies people have now, where that isn't what they started with. */
  eddies: Record<string, number>;
  /** What's on someone's credchip now, where it isn't what they started with (0: it was taken off them). */
  chips: Record<string, number>;
  /** Until which day someone is laid up. */
  hurt: Record<string, number>;
  /** A gang someone has come to hate. */
  hates: Record<string, string>;
  /** Friendships made (one direction; the other is implied) and broken (`a|b`, both directions). */
  made: Tie[];
  broken: string[];
  /** Every storefront's books, by building id; every gang's treasury. */
  tills: Record<string, Till>;
  treasuries: Record<string, number>;
  /** What's in each person's account (missing in a save from before: started afresh from their pay); the rent they owe; what's been spent at each district's places of its own since its street was paid. */
  savings?: Record<string, number>;
  arrears?: Record<string, number>;
  street?: Record<string, number>;
  /** Supply shocks, the kinds of store short where, and the headlines. */
  market?: MarketState;
  /** What people owe the gangs' loan sharks; the storefronts gone under. */
  debts?: Record<string, Debt>;
  closed?: Record<string, Closure>;
  /** The storefronts the player owns: kept with the people's days, since the economy pays them what's theirs. */
  owned?: Record<string, Owned>;
  /** Where someone lives now, where it isn't where they started (null: nowhere, sleeping rough), since when, where from, and why. */
  homes?: Record<string, Moved>;
  /** The job someone has now, where it isn't what they started with (taken on somewhere, let go, a gang's), and the day it changed; let go when a storefront went under, which one (`was`), and whether they ran it (`ran`). */
  jobs: Record<string, { role: string; building: string | null; day: number; was?: string; ran?: boolean }>;
  /** The gang someone has joined. */
  gangs: Record<string, string>;
  /** The day each person died. */
  dead: Record<string, number>;
  /** The day each couple got together, by both ids (`a|b`). */
  since: Record<string, number>;
  /** The first day the city lived (missing in a save from before: the next one it lives). */
  start?: number;
  /** How many fights each person has been in: what their fighting has learned from. */
  fights?: Record<string, number>;
  /** What each person holds against others from their own days (`hold`), freshest first. */
  held?: Record<string, Held[]>;
}

/** A move from one home to another: someone put out for the rent, or finding a place again after. */
export interface Moved {
  home: string | null;
  day: number;
  from: string | null;
  why: 'evicted' | 'housed';
}

/**
 * What someone holds against someone else, from their own days: robbed by them, shaken down,
 * beaten in a fight, left, fallen out with, let go by them as their boss, or their kin killed
 * (`about`, the one who died). It lasts its kind's days (`LifeRules.held`), comes up when they
 * talk, keeps the two from making friends or a couple, shows when they're in a room together,
 * and now and then has them settle it.
 */
export type HeldKind = 'robbed' | 'shook' | 'beaten' | 'dumped' | 'fallout' | 'laidOff' | 'killed' | 'evicted';
export interface Held {
  kind: HeldKind;
  by: string;
  day: number;
  about?: string;
}

export interface HeldRules {
  /** Days each kind is held. */
  days: Record<HeldKind, number>;
  /** The most anyone holds at once: the oldest gives way. */
  cap: number;
  /** The chance a day, a district, that someone with a beating, a robbery, a shakedown or a killing to settle and the nerve (`nerve` courage and up) goes for whoever did it. */
  revenge: number;
  nerve: number;
}

/** What someone holds against others on a day, freshest first: what's had its days is gone. */
export function heldBy(state: LifeState, id: string, rules: HeldRules | undefined, day: number): Held[] {
  if (!rules) return [];
  return (state.held?.[id] ?? []).filter((h) => day - h.day < (rules.days[h.kind] ?? 0));
}

/** Whether either of two holds something against the other. */
function feuding(state: LifeState, a: string, b: string, rules: HeldRules | undefined, day: number): boolean {
  return heldBy(state, a, rules, day).some((h) => h.by === b) || heldBy(state, b, rules, day).some((h) => h.by === a);
}

export function freshLife(): LifeState {
  return { day: -1, nextId: 1, events: [], eddies: {}, chips: {}, hurt: {}, hates: {}, made: [], broken: [], tills: {}, treasuries: {}, jobs: {}, gangs: {}, dead: {}, since: {} };
}

const FAMILY: TieKind[] = ['spouse', 'partner', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];
/** Who someone lives with, when they share a home: put out, they go too. */
const HOUSEHOLD: TieKind[] = ['spouse', 'partner', 'parent', 'child', 'sibling'];

/** Someone has been in one more fight. */
export function learned(state: LifeState, id: string): void {
  state.fights ??= {};
  state.fights[id] = (state.fights[id] ?? 0) + 1;
}

export function tieKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Puts what has happened onto a population made fresh for the seed: ties made and broken, eddies and chips, hates, jobs and gangs, who is laid up and who is dead. Anyone the city no longer has is forgotten. */
export function applyLife(population: Population, state: LifeState): void {
  const ids = new Set(population.people.map((p) => p.id));
  state.made = state.made.filter((t) => ids.has(t.from) && ids.has(t.to));
  state.broken = state.broken.filter((key) => key.split('|').every((id) => ids.has(id)));
  for (const key of ['eddies', 'chips', 'hurt', 'hates', 'jobs', 'gangs', 'dead'] as const) for (const id of Object.keys(state[key])) if (!ids.has(id)) delete state[key][id];
  for (const key of ['savings', 'arrears'] as const) {
    const record = state[key];
    if (record) for (const [id, amount] of Object.entries(record)) if (!ids.has(id) || !Number.isFinite(amount)) delete record[id];
  }
  for (const key of Object.keys(state.since)) if (!key.split('|').every((id) => ids.has(id))) delete state.since[key];
  // A debt owed or a move made by someone the city no longer has goes with them, and so does anything not shaped like one.
  if (state.debts) for (const [id, d] of Object.entries(state.debts)) if (!ids.has(id) || !d || typeof d.gang !== 'string' || !Number.isFinite(d.owed) || !Number.isFinite(d.paid)) delete state.debts[id];
  if (state.homes) for (const [id, m] of Object.entries(state.homes)) if (!ids.has(id) || !m || (m.home !== null && typeof m.home !== 'string') || !Number.isFinite(m.day)) delete state.homes[id];
  // What anyone holds against someone the city no longer has goes with them; so does anything not shaped like a grudge.
  if (state.held) {
    for (const [id, list] of Object.entries(state.held)) {
      const kept = ids.has(id) && Array.isArray(list) ? list.filter((h) => h && typeof h.kind === 'string' && ids.has(h.by) && Number.isFinite(h.day) && (h.about === undefined || ids.has(h.about))) : [];
      if (kept.length) state.held[id] = kept;
      else delete state.held[id];
    }
  }
  state.events = state.events.filter((e) => e.who.every((id) => ids.has(id)));
  // Only the ties of people with a broken or a made tie are looked at: tens of thousands of keys cost more than the few that matter.
  if (state.broken.length) {
    const broken = new Set(state.broken);
    const involved = new Set(state.broken.flatMap((key) => key.split('|')));
    population.ties = population.ties.filter((t) => !(involved.has(t.from) && broken.has(tieKey(t.from, t.to))));
  }
  if (state.made.length) {
    const involved = new Set(state.made.flatMap((t) => [t.from, t.to]));
    const tied = new Set(population.ties.filter((t) => involved.has(t.from)).map((t) => `${t.from}|${t.to}`));
    for (const t of state.made) {
      if (tied.has(`${t.from}|${t.to}`)) continue;
      tied.add(`${t.from}|${t.to}`).add(`${t.to}|${t.from}`);
      population.ties.push({ ...t }, { from: t.to, to: t.from, kind: INVERSE[t.kind] });
    }
  }
  for (const person of population.people) {
    const eddies = state.eddies[person.id];
    if (eddies !== undefined) person.eddies = eddies;
    const chip = state.chips[person.id];
    if (chip !== undefined) person.chip = chip;
    const hates = state.hates[person.id];
    if (hates !== undefined) person.hates = hates;
    const hurt = state.hurt[person.id];
    if (hurt !== undefined) person.hurtUntil = hurt;
    else delete person.hurtUntil;
    const job = state.jobs[person.id];
    if (job) {
      person.job = { role: job.role, building: job.building };
      if (job.building) person.hiredOn = job.day;
      else delete person.hiredOn;
    }
    const gang = state.gangs[person.id];
    if (gang !== undefined) person.gang = gang;
    const moved = state.homes?.[person.id];
    if (moved) person.home = moved.home;
    const died = state.dead[person.id];
    if (died !== undefined) person.diedOn = died;
  }
}

/**
 * Lives the days since the last one lived, up to today (and at most `catchUpDays` of them),
 * changing the people as it goes: the day's eddies first (pay, food, evenings out, rent, the
 * tills), then what happens between people. `base` is what everyone started with in eddies,
 * the cash they keep on them; `tier` is the tier a place runs at, for what's spent there and
 * how a storefront is doing; `turf` is who collects in a district, and their shares, for the
 * gangs' cut; `content` is the people data, for the roles a hire or a recruit takes; `vice` is
 * what a habit costs someone a day and which gang it goes to. Returns the events of those days.
 */
export function liveUntil(world: World, population: Population, state: LifeState, rules: LifeRules, base: ReadonlyMap<string, number>, today: number, seed: string, tier: (spot: Spot) => Quality, turf: (district: string) => Array<[string, number]>, content: PeopleContent, spokenFor: ReadonlySet<string> = new Set(), vice?: (person: Person) => Vice | null): LifeEvent[] {
  if (state.day >= today) return [];
  const from = state.day < 0 ? today - 1 : Math.max(state.day + 1, today - rules.catchUpDays + 1);
  // Everyone's practice counts from the first day the city lived.
  state.start ??= from;
  const happened: LifeEvent[] = [];
  const kept = keptFor(population, state);
  // A heart stays worked out while what it's drawn from stays the same: their spouse, their gang, their work and role, their grudge.
  const heart = (p: Person): Heart => {
    const spouses = (book.web.get(p.id) ?? []).filter((t) => t.kind === 'spouse').map((t) => t.to);
    const stamp = `${spouses.join(',')}|${p.gang ?? ''}|${p.job.building ?? ''}|${p.job.role}|${p.hates ?? ''}`;
    const known = kept.hearts.get(p.id);
    if (known?.stamp === stamp) return known.heart;
    const h = heartOf(p, world, content, population, (id) => book.web.get(id) ?? []);
    kept.hearts.set(p.id, { stamp, heart: h });
    return h;
  };
  // The ties as the last days left them, unless something else has changed them since.
  const book = kept.book && kept.book.settled === population.ties && kept.book.size === population.ties.length ? kept.book : (kept.book = tieBook(population, state));
  // Who lives in each district, and its storefronts: neither changes as the days go by.
  const residents = new Map<string, Person[]>();
  for (const p of population.people) {
    const list = residents.get(p.district);
    if (list) list.push(p);
    else residents.set(p.district, [p]);
  }
  const storefronts = new Map<string, Building[]>();
  for (const b of world.buildings) {
    if (!b.business) continue;
    const list = storefronts.get(b.district);
    if (list) list.push(b);
    else storefronts.set(b.district, [b]);
  }
  // Somewhere to squat in each district: its abandoned buildings and its shacks.
  const squats = new Map<string, Building[]>();
  for (const b of world.buildings) {
    if (b.kind !== 'derelict' && b.kind !== 'shack') continue;
    const list = squats.get(b.district);
    if (list) list.push(b);
    else squats.set(b.district, [b]);
  }
  const squatFor = (p: Person): string | null => {
    const home = p.home ? buildingById(world, p.home) : undefined;
    const from = home ? { x: home.x + home.w / 2, y: home.y + home.h / 2 } : (world.districts[p.district] ?? { x: 0, y: 0 });
    let best: Building | null = null;
    let near = Infinity;
    for (const b of squats.get(p.district) ?? []) {
      const d = Math.hypot(b.x + b.w / 2 - from.x, b.y + b.h / 2 - from.y);
      if (d < near) [best, near] = [b, d];
    }
    return best?.id ?? null;
  };
  const ledger = (p: Person) => ledgerOf(p, world, population, rules.economy, tier, seed);
  // Each district's blocks someone could rent in, the cheapest first.
  const rentals = new Map<string, Array<{ id: string; rent: number }>>();
  const homesIn = (district: string) => {
    let list = rentals.get(district);
    if (!list) {
      list = world.buildings
        .flatMap((b) => {
          const kind = b.district === district ? homeKind(b, rules.economy) : null;
          return kind ? [{ id: b.id, rent: rules.economy.homes[kind][tier({ kind: 'building', id: b.id })] }] : [];
        })
        .sort((a, b) => a.rent - b.rent || a.id.localeCompare(b.id));
      rentals.set(district, list);
    }
    return list;
  };
  const ctx: DayContext = { tier, content, book, byId: new Map(population.people.map((p) => [p.id, p])), residents, storefronts, heart, spokenFor, ledger, squatFor, homesIn };
  for (let day = from; day <= today; day++) {
    const rng = createRng(`${seed}:life:${day}`);
    for (const id of Object.keys(state.hurt)) if ((state.hurt[id] as number) < day) delete state.hurt[id];
    economyDay({ world, population, state, rules: rules.economy, tier, turf, base, seed, day, ties: (id) => book.web.get(id) ?? [], vice });
    for (const district of Object.keys(world.districts)) happened.push(...liveDay(population, state, rules, district, day, rng, ctx));
    state.day = day;
    // Forgotten day by day, so days caught up on all at once come out as they would have one at a time.
    state.events = state.events.filter((e) => e.day > day - (rules.lasting[e.kind] ?? rules.keepDays));
  }
  settleTies(population, book);
  book.settled = population.ties;
  book.size = population.ties.length;
  for (const person of population.people) {
    const hurt = state.hurt[person.id];
    if (hurt !== undefined) person.hurtUntil = hurt;
    else delete person.hurtUntil;
  }
  return happened;
}


/** Pronouns as bits, to test whom someone is drawn to with arithmetic. */
const PRONOUN_BIT: Record<Pronouns, number> = { she: 1, he: 2, they: 4 };

/**
 * Everyone's ties while days are lived, by whose they are (the web), kept up as the days
 * change them. The population's own list is brought up to date once the days are done
 * (`settleTies`), in the same order as if every change had been made to it there and then:
 * redoing a list of tens of thousands of ties for every change made a month away crawl.
 */
interface TieBook {
  web: Map<string, Tie[]>;
  /** The population's list of ties this book was last brought up to date with, and how long it was. */
  settled: readonly Tie[];
  size: number;
  /** Ties taken out and ties made since the population's list was last brought up to date. */
  gone: Set<Tie>;
  added: Tie[];
  /** `LifeState.broken`, to look up. */
  broken: Set<string>;
}

function tieBook(population: Population, state: LifeState): TieBook {
  const web = new Map<string, Tie[]>();
  for (const t of population.ties) {
    const list = web.get(t.from);
    if (list) list.push(t);
    else web.set(t.from, [t]);
  }
  return { web, settled: population.ties, size: population.ties.length, gone: new Set(), added: [], broken: new Set(state.broken) };
}

/**
 * What one day's living works out that the next can use again, kept with the population (and
 * the life it's living): the book of ties, and the hearts. A single day lived at midnight would
 * otherwise spend most of its time working them out afresh.
 */
const keeps = new WeakMap<Population, { state: LifeState; book: TieBook | null; hearts: Map<string, { stamp: string; heart: Heart }> }>();
function keptFor(population: Population, state: LifeState): { book: TieBook | null; hearts: Map<string, { stamp: string; heart: Heart }> } {
  let kept = keeps.get(population);
  if (!kept || kept.state !== state) keeps.set(population, (kept = { state, book: null, hearts: new Map() }));
  return kept;
}

/** Brings the population's ties up to date with the book. */
function settleTies(population: Population, book: TieBook): void {
  if (book.gone.size === 0 && book.added.length === 0) return;
  population.ties = [...population.ties, ...book.added].filter((t) => !book.gone.has(t));
  book.gone.clear();
  book.added = [];
}

/**
 * Makes what `b` is to `a` this (or, null, nothing): whatever they were to each other goes,
 * in the book, and for the save (the pair's ties from the start are written off in `broken`,
 * and what they are now kept in `made`). One tie a pair, as people are made.
 */
function setTie(state: LifeState, book: TieBook, a: Person, b: Person, kind: TieKind | null): void {
  const key = tieKey(a.id, b.id);
  const mine = book.web.get(a.id) ?? [];
  const theirs = book.web.get(b.id) ?? [];
  // Only a pair already tied has ties to take out (the web says, as quickly as asking it), and those only between them.
  if (mine.some((t) => t.to === b.id)) {
    for (const t of mine) if (t.to === b.id) book.gone.add(t);
    for (const t of theirs) if (t.to === a.id) book.gone.add(t);
    state.made = state.made.filter((t) => !((t.from === a.id && t.to === b.id) || (t.from === b.id && t.to === a.id)));
  }
  if (!book.broken.has(key)) {
    book.broken.add(key);
    state.broken.push(key);
  }
  const there: Tie[] = mine.filter((t) => t.to !== b.id);
  const back: Tie[] = theirs.filter((t) => t.to !== a.id);
  book.web.set(a.id, there);
  book.web.set(b.id, back);
  if (!kind) return;
  const tie: Tie = { from: a.id, to: b.id, kind };
  const inverse: Tie = { from: b.id, to: a.id, kind: INVERSE[kind] };
  book.added.push(tie, inverse);
  state.made.push(tie);
  there.push(tie);
  back.push(inverse);
}

/** What a district's day can draw on besides its people: the tier a place runs at, and the people data (roles to hire into, the gangs). */
interface DayContext {
  tier: (spot: Spot) => Quality;
  content: PeopleContent;
  book: TieBook;
  byId: Map<string, Person>;
  /** Everyone, by the district they live in, in the population's order. */
  residents: Map<string, Person[]>;
  /** Every storefront, by district. */
  storefronts: Map<string, Building[]>;
  /** Whom someone is drawn to (people.ts), worked out once a person. */
  heart: (person: Person) => Heart;
  /** People the player is seeing: no one else's to fall for. */
  spokenFor: ReadonlySet<string>;
  /** Someone's money as the economy sees it (their rent, and whose). */
  ledger: (person: Person) => Ledger;
  /** Where someone put out of their home goes: the nearest squat in their district, if there's one. */
  squatFor: (person: Person) => string | null;
  /** A district's blocks to rent in, with a head's rent, the cheapest first. */
  homesIn: (district: string) => Array<{ id: string; rent: number }>;
}

/**
 * One district's day: a few of the things that can happen between its people, by chance,
 * where the people for them exist. The gangs' doings first (a shakedown, a robbery, a fight,
 * which between rival crews now and then ends with someone dead), then the heart (a couple
 * getting together, marrying, splitting up), then friends made, lost and made up with, then
 * work (a busy place taking someone on, a struggling one letting someone go), then a gang
 * filling a dead member's place, and now and then the oldest dying of their years.
 */
function liveDay(population: Population, state: LifeState, rules: LifeRules, district: string, day: number, rng: Rng, ctx: DayContext): LifeEvent[] {
  const { book, byId, content } = ctx;
  const events: LifeEvent[] = [];
  const alive = (p: Person | undefined): p is Person => Boolean(p) && (p as Person).diedOn === undefined;
  const locals = (ctx.residents.get(district) ?? []).filter((p) => alive(p) && (state.hurt[p.id] ?? -1) < day);
  const gangers = locals.filter((p) => p.gang);
  const civilians = locals.filter((p) => !p.gang);
  const storefronts = ctx.storefronts.get(district) ?? [];
  const shopIds = new Set(storefronts.map((b) => b.id));
  const workers = civilians.filter((p) => p.job.building && shopIds.has(p.job.building));
  const room = () => events.length < rules.perDistrict;
  const tiesFrom = (id: string) => book.web.get(id) ?? [];
  const tieBetween = (a: string, b: string) => tiesFrom(a).find((t) => t.to === b)?.kind ?? null;
  const write = (kind: LifeKind, who: [Person, Person], gang: string | null, took: number, where: Spot | null): void => {
    // A fight is practice for both in it; a shakedown or a robbery for whoever did it.
    if (kind === 'fight' || kind === 'collected' || (kind === 'death' && who[0] !== who[1])) for (const p of who) learned(state, p.id);
    else if (kind === 'shakedown' || kind === 'robbery' || kind === 'mugging') learned(state, who[0].id);
    const event: LifeEvent = { id: state.nextId++, day, kind, who: [who[0].id, who[1].id], gang, district, took, where };
    state.events.push(event);
    events.push(event);
    // What it leaves one of them holding against the other.
    const [a, b] = who;
    if (kind === 'shakedown') hold(b, 'shook', a);
    else if (kind === 'robbery' || kind === 'mugging') hold(b, 'robbed', a);
    else if (kind === 'fight' || kind === 'collected') hold(b, 'beaten', a);
    else if (kind === 'evicted') hold(b, 'evicted', a);
    else if (kind === 'breakup') hold(b, 'dumped', a);
    else if (kind === 'laidOff') hold(b, 'laidOff', a);
    else if (kind === 'fallout') {
      hold(a, 'fallout', b);
      hold(b, 'fallout', a);
    } else if (kind === 'makeup') {
      forgive(a, b);
      forgive(b, a);
    } else if (kind === 'death' && a !== b) {
      for (const t of tiesFrom(b.id)) {
        const kin = byId.get(t.to);
        if (FAMILY.includes(t.kind) && alive(kin) && kin !== a) hold(kin, 'killed', a, b);
      }
    }
  };
  /** Writes down what someone holds against someone else: the same again is fresh again; past the cap the oldest goes. */
  const hold = (holder: Person, kind: HeldKind, by: Person, about?: Person): void => {
    const held = rules.held;
    if (!held || holder === by) return;
    const all = (state.held ??= {});
    const kept = heldBy(state, holder.id, held, day).filter((h) => !(h.kind === kind && h.by === by.id));
    all[holder.id] = [{ kind, by: by.id, day, ...(about ? { about: about.id } : {}) }, ...kept].slice(0, held.cap);
  };
  /** Lets go of a falling out with someone. */
  const forgive = (holder: Person, by: Person): void => {
    const list = state.held?.[holder.id];
    if (!list) return;
    const kept = list.filter((h) => !(h.by === by.id && h.kind === 'fallout'));
    if (kept.length) (state.held as Record<string, Held[]>)[holder.id] = kept;
    else delete (state.held as Record<string, Held[]>)[holder.id];
  };
  const pay = (from: Person, to: Person, share: [number, number]): number => {
    const took = Math.min(from.eddies, Math.round(from.eddies * rng.range(share[0], share[1])));
    if (took <= 0) return 0;
    from.eddies -= took;
    to.eddies += took;
    state.eddies[from.id] = from.eddies;
    state.eddies[to.id] = to.eddies;
    return took;
  };
  const hate = (person: Person, gang: string): void => {
    if (person.hates) return;
    person.hates = gang;
    state.hates[person.id] = gang;
  };
  const die = (person: Person): void => {
    state.dead[person.id] = day;
    person.diedOn = day;
    delete state.hurt[person.id];
    delete person.hurtUntil;
    // Gone from the rest of the day, too: nobody falls for, falls out with or is recruited by the dead.
    for (const list of [locals, gangers, civilians, workers]) {
      const at = list.indexOf(person);
      if (at >= 0) list.splice(at, 1);
    }
    staffIndex = null;
  };
  const spot = (person: Person): Spot | null => person.likes.hangout ?? (person.job.building ? { kind: 'building', id: person.job.building } : null);
  const at = (building: Building): Spot => ({ kind: 'building', id: building.id });
  // Who works at each storefront here, the living in the population's order: worked out when first asked, and again after anyone is hired, let go or dies.
  let staffIndex: Map<string, Person[]> | null = null;
  const staffAt = (id: string): Person[] => {
    if (!staffIndex) {
      staffIndex = new Map(storefronts.map((b) => [b.id, []]));
      for (const p of population.people) if (p.job.building && alive(p)) staffIndex.get(p.job.building)?.push(p);
    }
    return [...(staffIndex.get(id) ?? population.people.filter((p) => p.job.building === id && alive(p)))];
  };
  // The hands a place's shifts want, and its rota made again when they change (everyone who works there, the dead too, as a save's are).
  const least = (b: Building) => (content.shifts ? leastStaff(b, content.shifts) : 1);
  const reseat = (b: Building) => content.shifts && seatRota(b, population.people.filter((p) => p.job.building === b.id), content.shifts);
  const healthAt = (b: Building) => {
    const tier = ctx.tier(at(b));
    const staff = staffAt(b.id);
    return healthOf(state.tills[b.id], staffCostOf(staff, bossOf(b, population, staff), tier, rules.economy) + rules.economy.rent[tier] * 7, rules.economy);
  };
  const together = (p: Person) => tiesFrom(p.id).some((t) => (t.kind === 'spouse' || t.kind === 'partner') && alive(byId.get(t.to)));
  /**
   * One of the pairs `each` lists, the very one `rng.pick` would draw from the whole list, without
   * making it: the pairs are counted, one draw picks the place, and the list is walked to it. A
   * crowd's pairs grow as its square; this way they cost a count, not a list.
   */
  const pickPair = (each: (take: (a: Person, b: Person) => boolean) => void): [Person, Person] | null => {
    let count = 0;
    each(() => {
      count++;
      return false;
    });
    if (!count) return null;
    const at = Math.floor(rng.next() * count);
    let seen = 0;
    let found: [Person, Person] | null = null;
    each((a, b) => {
      if (seen++ !== at) return false;
      found = [a, b];
      return true;
    });
    return found;
  };
  /** The people of a list by the place they hang out, in the list's order. */
  const byHangoutOf = (people: Person[]): Map<string, Person[]> => {
    const by = new Map<string, Person[]>();
    for (const p of people) {
      if (!p.likes.hangout) continue;
      const key = `${p.likes.hangout.kind}:${p.likes.hangout.id}`;
      const list = by.get(key);
      if (list) list.push(p);
      else by.set(key, [p]);
    }
    return by;
  };

  /** Someone joins a gang: its colors, a role, its rivals to hate, its people for a crew. */
  const enlist = (gang: string, recruiter: Person, recruit: Person): void => {
    const colors = content.gangs[gang];
    if (!colors) return;
    const role = rng.pick(colors.roles);
    recruit.gang = gang;
    recruit.job = { role, building: null };
    state.gangs[recruit.id] = gang;
    state.jobs[recruit.id] = { role, building: null, day };
    const rival = colors.rivals.find((r) => Object.values(content.turf).some((t) => t.some(([g]) => g === r)));
    if (rival && !recruit.hates) hate(recruit, rival);
    for (const m of population.people) if (m.gang === gang && m !== recruit && alive(m) && tieBetween(recruit.id, m.id) === null) setTie(state, book, recruit, m, 'crew');
    // Off the streets' books now: civilians no more.
    for (const list of [civilians, workers]) {
      const at = list.indexOf(recruit);
      if (at >= 0) list.splice(at, 1);
    }
    gangers.push(recruit);
    write('joined', [recruiter, recruit], gang, 0, recruiter.likes.hangout);
  };

  /** A storefront gone under: everyone who works there let go, and the shutters down. */
  const shutDown = (b: Building): void => {
    const staff = staffAt(b.id);
    const boss = bossOf(b, population, staff);
    const role = rules.jobless[0] ?? 'between jobs';
    for (const p of staff) {
      p.job = { role, building: null };
      delete p.hiredOn;
      state.jobs[p.id] = { role, building: null, day, was: b.id, ...(p === boss ? { ran: true } : {}) };
      for (const t of [...tiesFrom(p.id)]) if (t.kind === 'coworker') setTie(state, book, p, byId.get(t.to) as Person, null);
    }
    staffIndex = null;
    reseat(b);
    if (boss) write('closed', [boss, staff.find((p) => p !== boss) ?? boss], null, 0, at(b));
  };
  /** New management for a storefront that's been shut: someone from the neighborhood looking for work runs it, a few more work it, and its books start afresh. */
  const reopen = (b: Building, closure: Closure): void => {
    const looking = civilians.filter((p) => !p.job.building && rules.jobless.includes(p.job.role) && p.age >= rules.adultAt);
    if (!looking.length) {
      // Nobody to take it on yet: it stays shut a few days more.
      closure.until = day + 3;
      return;
    }
    const take = () => looking.splice(rng.int(0, looking.length - 1), 1)[0] as Person;
    const runs = rolesFor(b, content).find(runsIt) ?? 'manager';
    const helps = (content.roles.extra[b.category] ?? content.roles.extra.default ?? []).filter((r) => !runsIt(r));
    const crew: Person[] = [];
    for (let k = 0; k < Math.max(1, least(b)) && looking.length; k++) {
      const p = take();
      const role = k === 0 ? runs : helps.length ? rng.pick(helps) : 'helps out';
      p.job = { role, building: b.id };
      p.hiredOn = day;
      state.jobs[p.id] = { role, building: b.id, day };
      crew.push(p);
    }
    for (const a of crew) for (const c of crew) if (a.id < c.id && tieBetween(a.id, c.id) === null) setTie(state, book, a, c, 'coworker');
    staffIndex = null;
    reseat(b);
    delete (state.closed as Record<string, Closure>)[b.id];
    // Fresh books: the new management's float goes in the next day the eddies move.
    const failed = state.tills[b.id]?.failed;
    state.tills[b.id] = { days: [], pending: 0, ...(failed ? { failed } : {}) };
    headlineIn((state.market ??= { shocks: [], short: [], news: [] }), { day, district, category: b.category, kind: 'reopened', building: b.id }, rules.economy.market.keep);
    write('reopened', [crew[0] as Person, crew[1] ?? (crew[0] as Person)], null, 0, at(b));
  };
  /** A tenant too far behind on the rent is put out, and whoever they live with goes with them: to a squat in the district, or the street. What they owed is written off. */
  const evict = (tenant: Person): void => {
    const from = tenant.home as string;
    const landlord = byId.get(holderOf(ctx.ledger(tenant).landlord, (id) => byId.get(id), tiesFrom) ?? '');
    const household = [tenant, ...tiesFrom(tenant.id).flatMap((t) => (HOUSEHOLD.includes(t.kind) ? [byId.get(t.to)] : []).filter((p): p is Person => alive(p) && p.home === from))];
    const to = ctx.squatFor(tenant);
    let owed = 0;
    for (const p of household) {
      owed += state.arrears?.[p.id] ?? 0;
      delete state.arrears?.[p.id];
      p.home = to;
      (state.homes ??= {})[p.id] = { home: to, day, from, why: 'evicted' };
    }
    write('evicted', [alive(landlord) && landlord !== tenant ? landlord : tenant, tenant], null, owed, { kind: 'building', id: from });
  };

  // A gang leans on a storefront for its cut.
  if (room() && gangers.length && workers.length && rng.chance(rules.chances.shakedown)) {
    const ganger = rng.pick(gangers);
    const worker = rng.pick(workers);
    const took = pay(worker, ganger, rules.shakedown);
    if (took > 0) {
      hate(worker, ganger.gang as string);
      write('shakedown', [ganger, worker], ganger.gang, took, { kind: 'building', id: worker.job.building as string });
    }
  }
  // Someone gets jumped on the way home.
  if (room() && gangers.length && civilians.length && rng.chance(rules.chances.robbery)) {
    const ganger = rng.pick(gangers);
    const victim = rng.pick(civilians);
    const took = pay(victim, ganger, rules.robbery);
    if (took > 0) {
      hate(victim, ganger.gang as string);
      write('robbery', [ganger, victim], ganger.gang, took, spot(victim));
    }
  }
  // Someone picks a fight with a gang they hate, or two crews go at it; the loser is laid up,
  // or, between crews and now and then, dead, and their family hate whoever did it.
  if (room() && rng.chance(rules.chances.fight)) {
    // Every ganger against each civilian with the nerve who hates their gang, then each ganger of another gang who does,
    // counted by gang rather than pair by pair, and the one `rng.pick` would take from that list drawn.
    const civiliansHating = new Map<string, Person[]>();
    const gangersHating = new Map<string, Person[]>();
    const add = (by: Map<string, Person[]>, gang: string, p: Person) => {
      const list = by.get(gang);
      if (list) list.push(p);
      else by.set(gang, [p]);
    };
    for (const c of civilians) if (c.hates && c.traits.courage >= 0.5) add(civiliansHating, c.hates, c);
    for (const h of gangers) if (h.hates) add(gangersHating, h.hates, h);
    const foesOf = (g: Person) => ({ civil: civiliansHating.get(g.gang as string) ?? [], crews: (gangersHating.get(g.gang as string) ?? []).filter((h) => h.gang !== g.gang) });
    let count = 0;
    for (const g of gangers) {
      const { civil, crews } = foesOf(g);
      count += civil.length + crews.length;
    }
    let pair: [Person, Person] | null = null;
    if (count) {
      let at = Math.floor(rng.next() * count);
      for (const g of gangers) {
        const { civil, crews } = foesOf(g);
        if (at >= civil.length + crews.length) {
          at -= civil.length + crews.length;
          continue;
        }
        pair = [g, (at < civil.length ? civil[at] : crews[at - civil.length]) as Person];
        break;
      }
    }
    if (pair) {
      const nerve = (p: Person) => p.traits.courage * 0.6 + p.traits.temper * 0.4 + rng.range(0, 0.5);
      const [winner, loser] = nerve(pair[0]) >= nerve(pair[1]) ? pair : [pair[1], pair[0]];
      const where = spot(loser) ?? spot(winner);
      const crew = loser.gang ? (ctx.residents.get(district) ?? []).filter((p) => p.gang === loser.gang && alive(p)).length : 0;
      if (winner.gang && loser.gang && crew > rules.crewFloor && rng.chance(rules.deadly)) {
        die(loser);
        for (const t of tiesFrom(loser.id)) {
          const kin = byId.get(t.to);
          if (FAMILY.includes(t.kind) && alive(kin) && !kin.gang) hate(kin, winner.gang);
        }
        write('death', [winner, loser], winner.gang, 0, where);
      } else {
        const until = day + rng.int(rules.hurtDays[0], rules.hurtDays[1]);
        state.hurt[loser.id] = until;
        loser.hurtUntil = until;
        write('fight', [winner, loser], winner.gang, 0, where);
      }
    }
  }
  // Two people who are free get together: friends, or regulars of the same place, near enough in age, and drawn to each other.
  if (room() && rng.chance(rules.chances.romance)) {
    const free = locals.filter((p) => p.age >= rules.adultAt && !together(p) && !ctx.spokenFor.has(p.id));
    const freeIds = new Set(free.map((p) => p.id));
    const close = (a: Person, b: Person) => Math.abs(a.age - b.age) <= rules.ageGap && drawnTo(ctx.heart(a), b.pronouns) && drawnTo(ctx.heart(b), a.pronouns);
    // A crowd's pairs grow as its square, so each is tested on what's worked out once a person:
    // their age, and their pronouns as a bit against the bits of whom they're drawn to (`close`).
    const groups = [...byHangoutOf(free).values()].map((regulars) => ({
      regulars,
      age: Float64Array.from(regulars, (p) => p.age),
      own: Uint8Array.from(regulars, (p) => PRONOUN_BIT[p.pronouns]),
      wants: Uint8Array.from(regulars, (p) => ctx.heart(p).drawnTo.reduce((bits, q) => bits | PRONOUN_BIT[q], 0)),
    }));
    const pair = pickPair((take) => {
      for (const a of free) for (const t of tiesFrom(a.id)) if (t.kind === 'friend' && a.id < t.to && freeIds.has(t.to) && close(a, byId.get(t.to) as Person) && take(a, byId.get(t.to) as Person)) return;
      for (const { regulars, age, own, wants } of groups) {
        for (let i = 0; i < regulars.length; i++) {
          for (let j = i + 1; j < regulars.length; j++) {
            if (Math.abs((age[i] as number) - (age[j] as number)) > rules.ageGap || !((wants[i] as number) & (own[j] as number)) || !((wants[j] as number) & (own[i] as number))) continue;
            const a = regulars[i] as Person;
            const b = regulars[j] as Person;
            if (tieBetween(a.id, b.id) === null && take(a, b)) return;
          }
        }
      }
    });
    // Nobody falls for someone they hold something against, or who holds something against them.
    if (pair && !feuding(state, pair[0].id, pair[1].id, rules.held, day)) {
      setTie(state, book, pair[0], pair[1], 'partner');
      state.since[tieKey(pair[0].id, pair[1].id)] = day;
      write('romance', pair, null, 0, pair[0].likes.hangout ?? pair[1].likes.hangout);
    }
  }
  // A couple who've been together long enough get married.
  if (room() && rng.chance(rules.chances.wedding)) {
    const ready: Array<[Person, Person]> = [];
    for (const [key, since] of Object.entries(state.since)) {
      if (since > day - rules.weddingAfter) continue;
      const [a, b] = key.split('|').map((id) => byId.get(id));
      if (alive(a) && alive(b) && a.district === district && tieBetween(a.id, b.id) === 'partner') ready.push([a, b]);
    }
    const pair = ready.length ? rng.pick(ready) : null;
    if (pair) {
      setTie(state, book, pair[0], pair[1], 'spouse');
      write('wedding', pair, null, 0, pair[0].likes.hangout ?? pair[1].likes.hangout);
    }
  }
  // A temper, or a cold heart, ends a romance (the one who walks out first).
  if (room() && rng.chance(rules.chances.breakup)) {
    const pairs: Array<[Person, Person]> = [];
    for (const p of locals) {
      if (p.traits.temper < 0.6 && p.traits.warmth > 0.3) continue;
      for (const t of tiesFrom(p.id)) if (t.kind === 'partner' && alive(byId.get(t.to))) pairs.push([p, byId.get(t.to) as Person]);
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      setTie(state, book, pair[0], pair[1], null);
      delete state.since[tieKey(pair[0].id, pair[1].id)];
      write('breakup', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // Two regulars of the same place become friends.
  if (room() && rng.chance(rules.chances.friends)) {
    // Every pair of regulars of a place who aren't already something to each other: each one's count is everyone after them
    // there less those they're tied to, so the pairs are counted from the ties, and only the row with the one drawn is walked.
    const rows: Array<{ regulars: Person[]; i: number; free: number }> = [];
    let count = 0;
    for (const regulars of byHangoutOf(locals).values()) {
      const place = new Map(regulars.map((p, i) => [p.id, i]));
      for (let i = 0; i < regulars.length; i++) {
        // One tie a pair, so each tie to someone later there is one pair fewer.
        let later = 0;
        for (const t of tiesFrom((regulars[i] as Person).id)) if ((place.get(t.to) ?? -1) > i) later++;
        const free = regulars.length - 1 - i - later;
        if (free > 0) rows.push({ regulars, i, free });
        count += free;
      }
    }
    let pair: [Person, Person] | null = null;
    if (count) {
      let at = Math.floor(rng.next() * count);
      for (const { regulars, i, free } of rows) {
        if (at >= free) {
          at -= free;
          continue;
        }
        const a = regulars[i] as Person;
        for (let j = i + 1; j < regulars.length && !pair; j++) {
          const b = regulars[j] as Person;
          if (tieBetween(a.id, b.id) === null && at-- === 0) pair = [a, b];
        }
        break;
      }
    }
    // ...nor makes a friend of them.
    if (pair && !feuding(state, pair[0].id, pair[1].id, rules.held, day)) {
      setTie(state, book, pair[0], pair[1], 'friend');
      write('friends', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // A temper ends a friendship.
  if (room() && rng.chance(rules.chances.fallout)) {
    const pairs: Array<[Person, Person]> = [];
    for (const p of locals) {
      if (p.traits.temper < 0.6) continue;
      for (const t of tiesFrom(p.id)) if (t.kind === 'friend' && alive(byId.get(t.to))) pairs.push([p, byId.get(t.to) as Person]);
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      setTie(state, book, pair[0], pair[1], null);
      write('fallout', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // Friends who fell out lately patch it up.
  if (room() && rng.chance(rules.chances.makeup)) {
    const pairs: Array<[Person, Person]> = [];
    for (const e of state.events) {
      if (e.kind !== 'fallout' || e.district !== district || e.day >= day) continue;
      const [a, b] = e.who.map((id) => byId.get(id));
      if (alive(a) && alive(b) && tieBetween(a.id, b.id) === null && !state.events.some((m) => m.kind === 'makeup' && m.day > e.day && m.who.includes(a.id) && m.who.includes(b.id))) pairs.push([a, b]);
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      setTie(state, book, pair[0], pair[1], 'friend');
      write('makeup', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // A place short of the hands its shifts want, else a busy one, takes on someone from the neighborhood who's looking for work.
  if (room() && rng.chance(rules.chances.hired)) {
    const looking = civilians.filter((p) => !p.job.building && rules.jobless.includes(p.job.role));
    const short = looking.length ? storefronts.filter((b) => staffAt(b.id).length < least(b)) : [];
    const busy = short.length ? short : looking.length ? storefronts.filter((b) => staffAt(b.id).length < Math.max(rules.maxStaff, least(b) + 1) && healthAt(b) === 'thriving') : [];
    if (busy.length) {
      const b = rng.pick(busy);
      const hire = rng.pick(looking);
      const staff = staffAt(b.id);
      const boss = bossOf(b, population, staff);
      const role = rng.pick(content.roles.extra[b.category] ?? content.roles.extra.default ?? ['helps out']);
      hire.job = { role, building: b.id };
      hire.hiredOn = day;
      staffIndex = null;
      state.jobs[hire.id] = { role, building: b.id, day };
      for (const s of staff) if (tieBetween(hire.id, s.id) === null) setTie(state, book, hire, s, 'coworker');
      reseat(b);
      if (boss) write('hired', [boss, hire], null, 0, at(b));
    }
  }
  // A struggling place lets someone go: the last taken on first, never the boss, and never below the hands its shifts want.
  if (room() && rng.chance(rules.chances.laidOff)) {
    const failing = storefronts.filter((b) => staffAt(b.id).length >= Math.max(2, least(b) + 1) && healthAt(b) === 'struggling');
    if (failing.length) {
      const b = rng.pick(failing);
      const boss = bossOf(b, population, staffAt(b.id));
      const staff = staffAt(b.id).filter((p) => p !== boss && (state.hurt[p.id] ?? -1) < day);
      const newest = Math.max(...staff.map((p) => p.hiredOn ?? -Infinity));
      const last = staff.filter((p) => (p.hiredOn ?? -Infinity) === newest);
      if (boss && last.length) {
        const gone = rng.pick(last);
        const role = rules.jobless[0] ?? 'between jobs';
        gone.job = { role, building: null };
        delete gone.hiredOn;
        staffIndex = null;
        state.jobs[gone.id] = { role, building: null, day };
        for (const t of [...tiesFrom(gone.id)]) if (t.kind === 'coworker') setTie(state, book, gone, byId.get(t.to) as Person, null);
        reseat(b);
        write('laidOff', [boss, gone], null, 0, at(b));
      }
    }
  }
  // A gang that has lost one of its own here takes on someone young from the neighborhood.
  if (room() && rng.chance(rules.chances.joined)) {
    const short = (content.turf[district] ?? []).map(([g]) => g).filter((g) => {
      const members = population.people.filter((p) => p.gang === g && p.district === district);
      return members.filter((p) => p.diedOn !== undefined).length > members.filter((p) => state.gangs[p.id] === g).length;
    });
    const gang = short.length ? rng.pick(short) : null;
    const recruiters = gang ? gangers.filter((p) => p.gang === gang) : [];
    const recruits = gang ? civilians.filter((p) => !p.job.building && p.age <= rules.recruitAge && p.hates !== gang && (p.traits.courage >= 0.5 || p.traits.greed >= 0.6)) : [];
    const colors = gang ? content.gangs[gang] : undefined;
    if (gang && colors && recruiters.length && recruits.length) enlist(gang, rng.pick(recruiters), rng.pick(recruits));
  }
  // The oldest die of their years, now and then.
  if (room() && rng.chance(rules.chances.death)) {
    const old = civilians.filter((p) => p.age >= rules.elderAt && !p.job.building);
    if (old.length) {
      const gone = rng.pick(old);
      die(gone);
      write('death', [gone, gone], null, 0, gone.home ? { kind: 'building', id: gone.home } : null);
    }
  }
  // Someone settles a score: whoever here holds a beating, a robbery, a shakedown or a killing
  // against someone in the district, with the nerve for it, goes for them. Won, it's settled.
  const held = rules.held;
  if (held && state.held && room() && rng.chance(held.revenge)) {
    const scores: Array<[Person, Person, Held]> = [];
    for (const [id, list] of Object.entries(state.held)) {
      const p = byId.get(id);
      if (!alive(p) || p.district !== district || p.traits.courage < held.nerve || (state.hurt[p.id] ?? -1) >= day) continue;
      for (const h of list) {
        if (day - h.day >= held.days[h.kind] || (h.kind !== 'robbed' && h.kind !== 'beaten' && h.kind !== 'shook' && h.kind !== 'killed')) continue;
        const foe = byId.get(h.by);
        if (alive(foe) && foe.district === district && (state.hurt[foe.id] ?? -1) < day) scores.push([p, foe, h]);
      }
    }
    const score = scores.length ? rng.pick(scores) : null;
    if (score) {
      const [avenger, foe] = score;
      const nerve = (p: Person) => p.traits.courage * 0.6 + p.traits.temper * 0.4 + rng.range(0, 0.5);
      const [winner, loser] = nerve(avenger) >= nerve(foe) ? [avenger, foe] : [foe, avenger];
      const until = day + rng.int(rules.hurtDays[0], rules.hurtDays[1]);
      state.hurt[loser.id] = until;
      loser.hurtUntil = until;
      // Settled, the one who went for it lets it go; beaten again, they hold that too.
      if (winner === avenger) {
        const kept = (state.held[avenger.id] ?? []).filter((h) => h.by !== foe.id);
        if (kept.length) state.held[avenger.id] = kept;
        else delete state.held[avenger.id];
      }
      write('fight', [winner, loser], winner.gang, 0, spot(loser) ?? spot(winner));
    }
  }

  // Hard times. What follows from the money comes first, whatever else the day held: a storefront
  // gone under lets its people go, new management takes on one that has been shut long enough,
  // and a tenant too far behind on the rent is put out.
  const broke = rules.economy.hard;
  if (broke && state.closed) {
    for (const b of storefronts) {
      const closure = state.closed[b.id];
      if (closure?.day === day) shutDown(b);
      else if (closure && closure.until <= day) reopen(b, closure);
    }
  }
  if (broke && state.arrears) {
    for (const [id, owed] of Object.entries(state.arrears)) {
      const tenant = byId.get(id);
      if (!alive(tenant) || tenant.district !== district || !tenant.home || !state.arrears[id]) continue;
      const rent = ctx.ledger(tenant).rent;
      if (rent > 0 && owed >= broke.evict * rent) evict(tenant);
    }
  }
  // Put out a while back, someone with the money put by again finds a place.
  if (broke && rules.hard && state.homes) {
    const { rehouse } = rules.hard;
    for (const [id, moved] of Object.entries(state.homes)) {
      const p = byId.get(id);
      const since = day - moved.day;
      if (moved.why !== 'evicted' || !alive(p) || p.district !== district || since < rehouse.after || since % 7 !== 0) continue;
      const homes = ctx.homesIn(district);
      const money = p.eddies + (state.savings?.[id] ?? 0);
      const food = rules.economy.food[ctx.ledger(p).means] * 7;
      if (!homes.length || money < rehouse.weeks * (food + (homes[0] as { rent: number }).rent)) continue;
      const to = rng.pick(homes.slice(0, rehouse.cheapest)).id;
      const from = p.home;
      for (const q of [p, ...tiesFrom(p.id).flatMap((t) => (HOUSEHOLD.includes(t.kind) ? [byId.get(t.to)] : []).filter((o): o is Person => alive(o) && o.home === from && state.homes?.[o.id]?.why === 'evicted'))]) {
        q.home = to;
        (state.homes as Record<string, Moved>)[q.id] = { home: to, day, from, why: 'housed' };
      }
    }
  }
  const hard = rules.hard;
  const desperate = (p: Person) => (state.arrears?.[p.id] ?? 0) > 0 || Boolean(state.debts?.[p.id]);
  // Someone desperate, with the nerve for it, mugs a stranger.
  if (hard && room() && rng.chance(rules.chances.mugging ?? 0)) {
    const muggers = civilians.filter((p) => p.age >= rules.adultAt && desperate(p) && p.traits.courage + p.traits.greed >= hard.mugging.nerve);
    const mugger = muggers.length ? rng.pick(muggers) : null;
    let victim: Person | null = null;
    for (let tries = 0; mugger && !victim && tries < 8; tries++) {
      const v = rng.pick(civilians);
      if (v !== mugger && v.eddies > 0 && tieBetween(mugger.id, v.id) === null) victim = v;
    }
    if (mugger && victim) {
      const took = pay(victim, mugger, hard.mugging.take);
      if (took > 0) write('mugging', [mugger, victim], null, took, spot(victim));
    }
  }
  // A loan shark's collector comes for someone who hasn't paid back a cent in too long: a beating, and what's on them.
  if (hard && state.debts && room() && rng.chance(hard.collect.chance)) {
    const late: Array<[Person, Debt]> = [];
    for (const [id, debt] of Object.entries(state.debts)) {
      const p = byId.get(id);
      if (alive(p) && p.district === district && day - debt.paid >= hard.collect.late && (state.hurt[id] ?? -1) < day) late.push([p, debt]);
    }
    const due = late.length ? rng.pick(late) : null;
    const collectors = due ? gangers.filter((g) => g.gang === due[1].gang) : [];
    if (due && collectors.length) {
      const [debtor, debt] = due;
      const collector = rng.pick(collectors);
      const took = Math.max(0, Math.min(debtor.eddies, debt.owed));
      debtor.eddies -= took;
      state.eddies[debtor.id] = debtor.eddies;
      state.treasuries[debt.gang] = (state.treasuries[debt.gang] ?? 0) + took;
      debt.owed -= took;
      // A warning: they'll be back if it isn't paid.
      debt.paid = day;
      if (debt.owed <= 0) delete state.debts[debtor.id];
      const until = day + rng.int(rules.hurtDays[0], rules.hurtDays[1]);
      state.hurt[debtor.id] = until;
      debtor.hurtUntil = until;
      write('collected', [collector, debtor], debt.gang, took, spot(debtor));
    }
  }
  // A gang on its turf takes on someone young with nothing left to lose, while it isn't much bigger here than it was.
  if (hard && room() && rng.chance(hard.recruit.chance)) {
    const here = ctx.residents.get(district) ?? [];
    const open = (content.turf[district] ?? [])
      .map(([g]) => g)
      .filter((g) => {
        let started = 0;
        let living = 0;
        for (const p of here) {
          if (p.gang !== g) continue;
          if (state.gangs[p.id] !== g) started++;
          if (alive(p)) living++;
        }
        return living < started + hard.recruit.extra;
      });
    const gang = open.length ? rng.pick(open) : null;
    const recruiters = gang ? gangers.filter((p) => p.gang === gang) : [];
    const recruits = gang ? civilians.filter((p) => !p.job.building && p.age >= rules.adultAt && p.age <= hard.recruit.age && p.hates !== gang && desperate(p) && p.traits.courage + p.traits.greed >= hard.recruit.nerve) : [];
    if (gang && recruiters.length && recruits.length) enlist(gang, rng.pick(recruiters), rng.pick(recruits));
  }
  return events;
}

/**
 * What someone would bring up: the freshest thing that was theirs, their people's, their
 * gang's doing, or their district's (anything but friends made, lost and made up with,
 * which is nobody else's business).
 */
export interface News {
  event: LifeEvent;
  role: 'me' | 'kin' | 'gang' | 'heard';
  /** The one they'd name: the other party, their relative, the victim. */
  other: Person;
  /** The other one in it, besides `other`, for `kin` and `heard`: who their sister is seeing, who let their cousin go. Null when there's nobody else (someone who died of their years). */
  with: Person | null;
  /** For `kin`: what the other is to them. */
  tie: Tie | null;
  /** Whether the speaker (or their relative) was the one who did it: won the fight, walked out, took someone on, brought someone in. */
  won: boolean;
}

const PRIVATE: ReadonlySet<LifeKind> = new Set<LifeKind>(['friends', 'fallout', 'makeup']);

export function newsFor(person: Person, population: Population, state: LifeState, rules: LifeRules, today: number): News | null {
  if (person.diedOn !== undefined) return null;
  const recent = state.events.filter((e) => e.day > today - (rules.lasting[e.kind] ?? rules.newsDays)).sort((a, b) => b.day - a.day || b.id - a.id);
  const byId = { get: (id: string) => personById(population, id) };
  const ties = tiesOf(population, person.id);
  const besides = (event: LifeEvent, other: Person): Person | null => {
    const id = event.who[0] === other.id ? event.who[1] : event.who[0];
    return id === other.id || id === person.id ? null : (byId.get(id) ?? null);
  };
  for (const event of recent) {
    const [doer, done] = event.who;
    if (doer === person.id || done === person.id) {
      const other = byId.get(doer === person.id ? done : doer);
      if (other && other.id !== person.id) return { event, role: 'me', other, with: null, tie: null, won: doer === person.id };
    }
  }
  for (const event of recent) {
    const tie = ties.find((t) => event.who.includes(t.to));
    const other = tie ? byId.get(tie.to) : undefined;
    if (tie && other) return { event, role: 'kin', other, with: besides(event, other), tie, won: event.who[0] === other.id && event.who[1] !== other.id };
  }
  for (const event of recent) {
    if (PRIVATE.has(event.kind)) continue;
    const victim = byId.get(event.who[1]);
    if (!victim) continue;
    if (person.gang && event.gang === person.gang) return { event, role: 'gang', other: victim, with: besides(event, victim), tie: null, won: true };
    if (event.district === person.district) return { event, role: 'heard', other: victim, with: besides(event, victim), tie: null, won: false };
  }
  return null;
}

/** Who among the people here is with whom, and doing what: pairs who know each other, a ganger on their turf leaning on the help, rivals eyeing each other. Drawn for the place, the day and the hour. */
export function scenesAt(present: Person[], population: Population, spot: Spot, clock: Clock, world: World, turf: Record<string, Array<[string, number]>>, rivalsOf: (gang: string) => string[], rules: LifeRules, seed: string, held: (id: string) => Held[] = () => []): Map<string, Scene> {
  const rng = createRng(`${seed}:scene:${spot.kind}:${spot.id}:${clock.day}:${Math.floor(clock.hour / 3)}`);
  const scenes = new Map<string, Scene>();
  const taken = new Set<string>();
  const couple = (kind: TieKind) => kind === 'spouse' || kind === 'partner';
  const rank = (kind: TieKind) => (couple(kind) ? 0 : FAMILY.includes(kind) ? 1 : kind === 'friend' ? 2 : kind === 'crew' ? 3 : 4);
  const kindOf = (kind: TieKind): SceneKind => (couple(kind) ? 'couple' : FAMILY.includes(kind) ? 'family' : kind === 'friend' ? 'friends' : kind === 'crew' ? 'crew' : 'coworkers');
  const pair = (a: Person, b: Person, kind: SceneKind, phrase: string) => {
    scenes.set(a.id, { with: b.id, phrase, kind });
    scenes.set(b.id, { with: a.id, phrase, kind });
    taken.add(a.id);
    taken.add(b.id);
  };
  // Someone in the same room as whoever they hold something against: it shows, from both sides.
  for (const a of present) {
    if (taken.has(a.id)) continue;
    const grudge = held(a.id).find((h) => !taken.has(h.by) && present.some((p) => p.id === h.by));
    const b = grudge ? present.find((p) => p.id === grudge.by) : undefined;
    if (!b || !rng.chance(rules.glaring ?? 0)) continue;
    const at = rng.int(0, rules.scenes.grudge.length - 1);
    scenes.set(a.id, { with: b.id, phrase: rules.scenes.grudge[at] ?? '', kind: 'grudge' });
    scenes.set(b.id, { with: a.id, phrase: rules.scenes.grudged[at] ?? rules.scenes.grudged[0] ?? '', kind: 'grudged' });
    taken.add(a.id);
    taken.add(b.id);
  }
  // Pairs who know each other, the closest first.
  for (const a of present) {
    if (taken.has(a.id)) continue;
    const candidates = tiesOf(population, a.id)
      .map((t) => ({ t, b: present.find((p) => p.id === t.to && !taken.has(p.id)) }))
      .filter((c): c is { t: Tie; b: Person } => Boolean(c.b))
      .sort((x, y) => rank(x.t.kind) - rank(y.t.kind));
    const first = candidates[0];
    if (!first || !rng.chance(rules.together)) continue;
    const kind = kindOf(first.t.kind);
    pair(a, first.b, kind, rng.pick(rules.scenes[kind]));
  }
  // A ganger on their turf, and the help at this storefront.
  const district = spot.kind === 'building' ? world.buildings.find((b) => b.id === spot.id)?.district : world.locations[spot.id]?.district;
  const local = new Set((district && turf[district] ? turf[district] : []).map(([g]) => g));
  for (const g of present) {
    if (!g.gang || taken.has(g.id) || !local.has(g.gang)) continue;
    const worker = present.find((p) => !taken.has(p.id) && !p.gang && spot.kind === 'building' && p.job.building === spot.id);
    if (worker && rng.chance(rules.leaning)) {
      // The same moment from both sides: the ganger leaning, the help leaned on.
      const at = rng.int(0, rules.scenes.shakedown.length - 1);
      scenes.set(g.id, { with: worker.id, phrase: rules.scenes.shakedown[at] ?? '', kind: 'shakedown' });
      scenes.set(worker.id, { with: g.id, phrase: rules.scenes.leanedOn[at] ?? rules.scenes.leanedOn[0] ?? '', kind: 'leanedOn' });
      taken.add(g.id);
      taken.add(worker.id);
    }
  }
  // Rivals, and the people who hate a gang, eyeing its colors.
  for (const g of present) {
    if (!g.gang || taken.has(g.id)) continue;
    const foe = present.find((p) => !taken.has(p.id) && p.id !== g.id && (p.hates === g.gang || (p.gang !== null && rivalsOf(g.gang as string).includes(p.gang))));
    if (foe && rng.chance(rules.eyeing)) pair(g, foe, 'rivals', rng.pick(rules.scenes.rivals));
  }
  return scenes;
}
