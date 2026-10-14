import { economyDay, healthOf, staffCostOf, type EconomyRules, type Till } from './economy';
import type { Quality } from './food';
import { bossOf } from './jobs';
import { INVERSE, tiesOf, type Clock, type PeopleContent, type Person, type Population, type Spot, type Tie, type TieKind } from './people';
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
 * Under it all the eddies move (`economy.ts`): payday, evenings out, the tills, the gangs'
 * cut. On top of that, wherever the player is, the people there are seen with each other: a couple
 * sharing a table, a crew holding court, a ganger leaning on the cook. Everything here is
 * drawn from the seed and the day, so a city's days are the same whenever they're lived
 * through; the numbers are in `src/data/life.ts`.
 */
export type LifeKind = 'shakedown' | 'robbery' | 'fight' | 'friends' | 'fallout' | 'makeup' | 'romance' | 'wedding' | 'breakup' | 'hired' | 'laidOff' | 'death' | 'joined';

export interface LifeEvent {
  id: number;
  day: number;
  kind: LifeKind;
  /**
   * Who did it and who it was done to: the winner and the loser, for a fight; the two of
   * them, for friends made, lost or made up with and for a couple (the one who walked out
   * first, for a breakup); the boss and the one taken on or let go; the killer and the dead,
   * or the dead twice over for someone who died of their years; the one who brought a recruit
   * in, and the recruit.
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

export type SceneKind = 'couple' | 'family' | 'friends' | 'crew' | 'coworkers' | 'shakedown' | 'rivals';

/** What a pair of people here are seen doing: the phrase, and the other one's id ("arguing with" them). */
export interface Scene {
  with: string;
  phrase: string;
  kind: SceneKind;
}

export interface LifeRules {
  /** The chance of each kind of thing in a district on a day, where the people for it exist. */
  chances: Record<LifeKind, number>;
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
}

export interface LifeState {
  /** The last day lived through (-1 before the first). */
  day: number;
  nextId: number;
  events: LifeEvent[];
  /** Eddies people have now, where that isn't what they started with. */
  eddies: Record<string, number>;
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
  /** The job someone has now, where it isn't what they started with (taken on somewhere, let go, a gang's), and the day it changed. */
  jobs: Record<string, { role: string; building: string | null; day: number }>;
  /** The gang someone has joined. */
  gangs: Record<string, string>;
  /** The day each person died. */
  dead: Record<string, number>;
  /** The day each couple got together, by both ids (`a|b`). */
  since: Record<string, number>;
}

export function freshLife(): LifeState {
  return { day: -1, nextId: 1, events: [], eddies: {}, hurt: {}, hates: {}, made: [], broken: [], tills: {}, treasuries: {}, jobs: {}, gangs: {}, dead: {}, since: {} };
}

const FAMILY: TieKind[] = ['spouse', 'partner', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

export function tieKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Puts what has happened onto a population made fresh for the seed: ties made and broken, eddies, hates, jobs and gangs, who is laid up and who is dead. Anyone the city no longer has is forgotten. */
export function applyLife(population: Population, state: LifeState): void {
  const ids = new Set(population.people.map((p) => p.id));
  state.made = state.made.filter((t) => ids.has(t.from) && ids.has(t.to));
  state.broken = state.broken.filter((key) => key.split('|').every((id) => ids.has(id)));
  for (const key of ['eddies', 'hurt', 'hates', 'jobs', 'gangs', 'dead'] as const) for (const id of Object.keys(state[key])) if (!ids.has(id)) delete state[key][id];
  for (const key of Object.keys(state.since)) if (!key.split('|').every((id) => ids.has(id))) delete state.since[key];
  state.events = state.events.filter((e) => e.who.every((id) => ids.has(id)));
  const broken = new Set(state.broken);
  population.ties = population.ties.filter((t) => !broken.has(tieKey(t.from, t.to)));
  const tied = new Set(population.ties.map((t) => `${t.from}|${t.to}`));
  for (const t of state.made) {
    if (tied.has(`${t.from}|${t.to}`)) continue;
    tied.add(`${t.from}|${t.to}`).add(`${t.to}|${t.from}`);
    population.ties.push({ ...t }, { from: t.to, to: t.from, kind: INVERSE[t.kind] });
  }
  for (const person of population.people) {
    const eddies = state.eddies[person.id];
    if (eddies !== undefined) person.eddies = eddies;
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
    const died = state.dead[person.id];
    if (died !== undefined) person.diedOn = died;
  }
}

/**
 * Lives the days since the last one lived, up to today (and at most `catchUpDays` of them),
 * changing the people as it goes: the day's eddies first (wages, evenings out, the tills),
 * then what happens between people. `base` is what everyone started with in eddies, which
 * sets their wages; `tier` is the tier a place runs at, for what an evening there costs and
 * how a storefront is doing; `turf` is who collects in a district, and their shares, for the
 * gangs' cut; `content` is the people data, for the roles a hire or a recruit takes. Returns
 * the events of those days.
 */
export function liveUntil(world: World, population: Population, state: LifeState, rules: LifeRules, base: ReadonlyMap<string, number>, today: number, seed: string, tier: (spot: Spot) => Quality, turf: (district: string) => Array<[string, number]>, content: PeopleContent): LifeEvent[] {
  if (state.day >= today) return [];
  const from = state.day < 0 ? today - 1 : Math.max(state.day + 1, today - rules.catchUpDays + 1);
  const happened: LifeEvent[] = [];
  const ctx: DayContext = { tier, content, web: webFor(population), byId: new Map(population.people.map((p) => [p.id, p])) };
  for (let day = from; day <= today; day++) {
    const rng = createRng(`${seed}:life:${day}`);
    for (const id of Object.keys(state.hurt)) if ((state.hurt[id] as number) < day) delete state.hurt[id];
    economyDay({ world, population, state, rules: rules.economy, tier, turf, base, seed, day, rng });
    for (const district of Object.keys(world.districts)) happened.push(...liveDay(world, population, state, rules, district, day, rng, ctx));
    state.day = day;
  }
  state.events = state.events.filter((e) => e.day > today - (rules.lasting[e.kind] ?? rules.keepDays));
  for (const person of population.people) {
    const hurt = state.hurt[person.id];
    if (hurt !== undefined) person.hurtUntil = hurt;
    else delete person.hurtUntil;
  }
  return happened;
}


/** Everyone's ties, by whose they are, kept up as the days change them. */
type Web = Map<string, Tie[]>;

function webFor(population: Population): Web {
  const web: Web = new Map();
  for (const t of population.ties) {
    const list = web.get(t.from);
    if (list) list.push(t);
    else web.set(t.from, [t]);
  }
  return web;
}

/**
 * Makes what `b` is to `a` this (or, null, nothing): whatever they were to each other goes,
 * on the population, in the web, and for the save (the pair's ties from the start are
 * written off in `broken`, and what they are now kept in `made`). One tie a pair, as people
 * are made.
 */
function setTie(population: Population, state: LifeState, web: Web, a: Person, b: Person, kind: TieKind | null): void {
  const key = tieKey(a.id, b.id);
  population.ties = population.ties.filter((t) => tieKey(t.from, t.to) !== key);
  state.made = state.made.filter((t) => tieKey(t.from, t.to) !== key);
  if (!state.broken.includes(key)) state.broken.push(key);
  web.set(a.id, (web.get(a.id) ?? []).filter((t) => t.to !== b.id));
  web.set(b.id, (web.get(b.id) ?? []).filter((t) => t.to !== a.id));
  if (!kind) return;
  const there: Tie = { from: a.id, to: b.id, kind };
  const back: Tie = { from: b.id, to: a.id, kind: INVERSE[kind] };
  population.ties.push(there, back);
  state.made.push(there);
  web.get(a.id)?.push(there);
  web.get(b.id)?.push(back);
}

/** What a district's day can draw on besides its people: the tier a place runs at, and the people data (roles to hire into, the gangs). */
interface DayContext {
  tier: (spot: Spot) => Quality;
  content: PeopleContent;
  web: Web;
  byId: Map<string, Person>;
}

/**
 * One district's day: a few of the things that can happen between its people, by chance,
 * where the people for them exist. The gangs' doings first (a shakedown, a robbery, a fight,
 * which between rival crews now and then ends with someone dead), then the heart (a couple
 * getting together, marrying, splitting up), then friends made, lost and made up with, then
 * work (a busy place taking someone on, a struggling one letting someone go), then a gang
 * filling a dead member's place, and now and then the oldest dying of their years.
 */
function liveDay(world: World, population: Population, state: LifeState, rules: LifeRules, district: string, day: number, rng: Rng, ctx: DayContext): LifeEvent[] {
  const { web, byId, content } = ctx;
  const events: LifeEvent[] = [];
  const alive = (p: Person | undefined): p is Person => Boolean(p) && (p as Person).diedOn === undefined;
  const locals = population.people.filter((p) => p.district === district && alive(p) && (state.hurt[p.id] ?? -1) < day);
  const gangers = locals.filter((p) => p.gang);
  const civilians = locals.filter((p) => !p.gang);
  const storefronts = world.buildings.filter((b) => b.district === district && b.business);
  const shopIds = new Set(storefronts.map((b) => b.id));
  const workers = civilians.filter((p) => p.job.building && shopIds.has(p.job.building));
  const room = () => events.length < rules.perDistrict;
  const tiesFrom = (id: string) => web.get(id) ?? [];
  const tieBetween = (a: string, b: string) => tiesFrom(a).find((t) => t.to === b)?.kind ?? null;
  const write = (kind: LifeKind, who: [Person, Person], gang: string | null, took: number, where: Spot | null): void => {
    const event: LifeEvent = { id: state.nextId++, day, kind, who: [who[0].id, who[1].id], gang, district, took, where };
    state.events.push(event);
    events.push(event);
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
  };
  const spot = (person: Person): Spot | null => person.likes.hangout ?? (person.job.building ? { kind: 'building', id: person.job.building } : null);
  const at = (building: Building): Spot => ({ kind: 'building', id: building.id });
  const staffAt = (id: string) => population.people.filter((p) => p.job.building === id && alive(p));
  const healthAt = (b: Building) => {
    const tier = ctx.tier(at(b));
    return healthOf(state.tills[b.id], staffCostOf(staffAt(b.id), bossOf(b, population), tier, rules.economy) + rules.economy.rent[tier] * 7, rules.economy);
  };
  const together = (p: Person) => tiesFrom(p.id).some((t) => (t.kind === 'spouse' || t.kind === 'partner') && alive(byId.get(t.to)));

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
    const pairs: Array<[Person, Person]> = [];
    for (const g of gangers) {
      for (const c of civilians) if (c.hates === g.gang && c.traits.courage >= 0.5) pairs.push([g, c]);
      for (const h of gangers) if (h !== g && h.gang !== g.gang && h.hates === g.gang) pairs.push([g, h]);
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      const nerve = (p: Person) => p.traits.courage * 0.6 + p.traits.temper * 0.4 + rng.range(0, 0.5);
      const [winner, loser] = nerve(pair[0]) >= nerve(pair[1]) ? pair : [pair[1], pair[0]];
      const where = spot(loser) ?? spot(winner);
      const crew = loser.gang ? population.people.filter((p) => p.gang === loser.gang && p.district === district && alive(p)).length : 0;
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
  // Two people who are free get together: friends, or regulars of the same place, near enough in age.
  if (room() && rng.chance(rules.chances.romance)) {
    const free = locals.filter((p) => p.age >= rules.adultAt && !together(p));
    const freeIds = new Set(free.map((p) => p.id));
    const pairs: Array<[Person, Person]> = [];
    const close = (a: Person, b: Person) => Math.abs(a.age - b.age) <= rules.ageGap;
    for (const a of free) for (const t of tiesFrom(a.id)) if (t.kind === 'friend' && a.id < t.to && freeIds.has(t.to) && close(a, byId.get(t.to) as Person)) pairs.push([a, byId.get(t.to) as Person]);
    const byHangout = new Map<string, Person[]>();
    for (const p of free) if (p.likes.hangout) byHangout.set(`${p.likes.hangout.kind}:${p.likes.hangout.id}`, [...(byHangout.get(`${p.likes.hangout.kind}:${p.likes.hangout.id}`) ?? []), p]);
    for (const regulars of byHangout.values()) {
      for (let i = 0; i < regulars.length; i++) {
        for (let j = i + 1; j < regulars.length; j++) {
          const a = regulars[i] as Person;
          const b = regulars[j] as Person;
          if (close(a, b) && tieBetween(a.id, b.id) === null) pairs.push([a, b]);
        }
      }
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      setTie(population, state, web, pair[0], pair[1], 'partner');
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
      setTie(population, state, web, pair[0], pair[1], 'spouse');
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
      setTie(population, state, web, pair[0], pair[1], null);
      delete state.since[tieKey(pair[0].id, pair[1].id)];
      write('breakup', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // Two regulars of the same place become friends.
  if (room() && rng.chance(rules.chances.friends)) {
    const byHangout = new Map<string, Person[]>();
    for (const p of locals) if (p.likes.hangout) byHangout.set(`${p.likes.hangout.kind}:${p.likes.hangout.id}`, [...(byHangout.get(`${p.likes.hangout.kind}:${p.likes.hangout.id}`) ?? []), p]);
    const pairs: Array<[Person, Person]> = [];
    for (const regulars of byHangout.values()) {
      for (let i = 0; i < regulars.length; i++) {
        for (let j = i + 1; j < regulars.length; j++) {
          const a = regulars[i] as Person;
          const b = regulars[j] as Person;
          if (tieBetween(a.id, b.id) === null) pairs.push([a, b]);
        }
      }
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      setTie(population, state, web, pair[0], pair[1], 'friend');
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
      setTie(population, state, web, pair[0], pair[1], null);
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
      setTie(population, state, web, pair[0], pair[1], 'friend');
      write('makeup', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // A busy place takes on someone from the neighborhood who's looking for work.
  if (room() && rng.chance(rules.chances.hired)) {
    const looking = civilians.filter((p) => !p.job.building && rules.jobless.includes(p.job.role));
    const busy = looking.length ? storefronts.filter((b) => staffAt(b.id).length < rules.maxStaff && healthAt(b) === 'thriving') : [];
    if (busy.length) {
      const b = rng.pick(busy);
      const hire = rng.pick(looking);
      const boss = bossOf(b, population);
      const staff = staffAt(b.id);
      const role = rng.pick(content.roles.extra[b.category] ?? content.roles.extra.default ?? ['helps out']);
      hire.job = { role, building: b.id };
      hire.hiredOn = day;
      state.jobs[hire.id] = { role, building: b.id, day };
      for (const s of staff) if (tieBetween(hire.id, s.id) === null) setTie(population, state, web, hire, s, 'coworker');
      if (boss) write('hired', [boss, hire], null, 0, at(b));
    }
  }
  // A struggling place lets someone go: the last taken on first, never the boss.
  if (room() && rng.chance(rules.chances.laidOff)) {
    const failing = storefronts.filter((b) => staffAt(b.id).length >= 2 && healthAt(b) === 'struggling');
    if (failing.length) {
      const b = rng.pick(failing);
      const boss = bossOf(b, population);
      const staff = staffAt(b.id).filter((p) => p !== boss && (state.hurt[p.id] ?? -1) < day);
      const newest = Math.max(...staff.map((p) => p.hiredOn ?? -Infinity));
      const last = staff.filter((p) => (p.hiredOn ?? -Infinity) === newest);
      if (boss && last.length) {
        const gone = rng.pick(last);
        const role = rules.jobless[0] ?? 'between jobs';
        gone.job = { role, building: null };
        delete gone.hiredOn;
        state.jobs[gone.id] = { role, building: null, day };
        for (const t of [...tiesFrom(gone.id)]) if (t.kind === 'coworker') setTie(population, state, web, gone, byId.get(t.to) as Person, null);
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
    if (gang && colors && recruiters.length && recruits.length) {
      const recruiter = rng.pick(recruiters);
      const recruit = rng.pick(recruits);
      const role = rng.pick(colors.roles);
      recruit.gang = gang;
      recruit.job = { role, building: null };
      state.gangs[recruit.id] = gang;
      state.jobs[recruit.id] = { role, building: null, day };
      const rival = colors.rivals.find((r) => Object.values(content.turf).some((t) => t.some(([g]) => g === r)));
      if (rival && !recruit.hates) hate(recruit, rival);
      for (const m of population.people) if (m.gang === gang && m !== recruit && alive(m) && tieBetween(recruit.id, m.id) === null) setTie(population, state, web, recruit, m, 'crew');
      write('joined', [recruiter, recruit], gang, 0, recruiter.likes.hangout);
    }
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
  const recent = [...state.events].filter((e) => e.day > today - (rules.lasting[e.kind] ?? rules.newsDays)).sort((a, b) => b.day - a.day || b.id - a.id);
  const byId = new Map(population.people.map((p) => [p.id, p]));
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
export function scenesAt(present: Person[], population: Population, spot: Spot, clock: Clock, world: World, turf: Record<string, Array<[string, number]>>, rivalsOf: (gang: string) => string[], rules: LifeRules, seed: string): Map<string, Scene> {
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
      scenes.set(g.id, { with: worker.id, phrase: rng.pick(rules.scenes.shakedown), kind: 'shakedown' });
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
