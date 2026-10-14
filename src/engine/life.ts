import { economyDay, type EconomyRules, type Till } from './economy';
import type { Quality } from './food';
import { INVERSE, tiesOf, type Clock, type Person, type Population, type Spot, type Tie, type TieKind } from './people';
import { createRng, type Rng } from './rng';
import type { World } from './types';

/**
 * The people's own lives, going on without the player. Every day on the clock, in every
 * district, a few things happen between them: a gang leans on a storefront for its cut, or
 * jumps someone on the way home; someone picks a fight with a gang they hate, or two rival
 * crews go at it, and the loser is laid up at home for days; two regulars of the same bar
 * become friends; a hot temper ends a friendship. What happens is written down (`LifeEvent`)
 * and changes the people for good (eddies, who hates whom, who is tied to whom, who is laid
 * up), so the city the player comes back to has moved on; and the people talk about it.
 * Under it all the eddies move (`economy.ts`): payday, evenings out, the tills, the gangs'
 * cut. On top of that, wherever the player is, the people there are seen with each other: a couple
 * sharing a table, a crew holding court, a ganger leaning on the cook. Everything here is
 * drawn from the seed and the day, so a city's days are the same whenever they're lived
 * through; the numbers are in `src/data/life.ts`.
 */
export type LifeKind = 'shakedown' | 'robbery' | 'fight' | 'friends' | 'fallout';

export interface LifeEvent {
  id: number;
  day: number;
  kind: LifeKind;
  /** Who did it and who it was done to (the winner and the loser, for a fight; the two of them, for friends made or lost). */
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
}

export function freshLife(): LifeState {
  return { day: -1, nextId: 1, events: [], eddies: {}, hurt: {}, hates: {}, made: [], broken: [], tills: {}, treasuries: {} };
}

const FAMILY: TieKind[] = ['spouse', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

export function tieKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Puts what has happened onto a population made fresh for the seed: ties made and broken, eddies, hates, who is laid up. Anyone the city no longer has is forgotten. */
export function applyLife(population: Population, state: LifeState): void {
  const ids = new Set(population.people.map((p) => p.id));
  state.made = state.made.filter((t) => ids.has(t.from) && ids.has(t.to));
  state.broken = state.broken.filter((key) => key.split('|').every((id) => ids.has(id)));
  for (const key of ['eddies', 'hurt', 'hates'] as const) for (const id of Object.keys(state[key])) if (!ids.has(id)) delete state[key][id];
  state.events = state.events.filter((e) => e.who.every((id) => ids.has(id)));
  const broken = new Set(state.broken);
  population.ties = population.ties.filter((t) => !broken.has(tieKey(t.from, t.to)));
  for (const t of state.made) {
    if (population.ties.some((u) => u.from === t.from && u.to === t.to)) continue;
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
  }
}

/**
 * Lives the days since the last one lived, up to today (and at most `catchUpDays` of them),
 * changing the people as it goes: the day's eddies first (wages, evenings out, the tills),
 * then what happens between people. `base` is what everyone started with in eddies, which
 * sets their wages; `tier` is the tier a place runs at, for what an evening there costs;
 * `turf` is who collects in a district, and their shares, for the gangs' cut. Returns the events of those days.
 */
export function liveUntil(world: World, population: Population, state: LifeState, rules: LifeRules, base: ReadonlyMap<string, number>, today: number, seed: string, tier: (spot: Spot) => Quality, turf: (district: string) => Array<[string, number]>): LifeEvent[] {
  if (state.day >= today) return [];
  const from = state.day < 0 ? today - 1 : Math.max(state.day + 1, today - rules.catchUpDays + 1);
  const happened: LifeEvent[] = [];
  for (let day = from; day <= today; day++) {
    const rng = createRng(`${seed}:life:${day}`);
    for (const id of Object.keys(state.hurt)) if ((state.hurt[id] as number) < day) delete state.hurt[id];
    economyDay({ world, population, state, rules: rules.economy, tier, turf, base, seed, day, rng });
    for (const district of Object.keys(world.districts)) happened.push(...liveDay(world, population, state, rules, district, day, rng));
    state.day = day;
  }
  state.events = state.events.filter((e) => e.day > today - rules.keepDays);
  for (const person of population.people) {
    const hurt = state.hurt[person.id];
    if (hurt !== undefined) person.hurtUntil = hurt;
    else delete person.hurtUntil;
  }
  return happened;
}


/** One district's day: a few of the things that can happen between its people, by chance, where the people for them exist. */
function liveDay(world: World, population: Population, state: LifeState, rules: LifeRules, district: string, day: number, rng: Rng): LifeEvent[] {
  const events: LifeEvent[] = [];
  const locals = population.people.filter((p) => p.district === district && (state.hurt[p.id] ?? -1) < day);
  const gangers = locals.filter((p) => p.gang);
  const civilians = locals.filter((p) => !p.gang);
  const storefronts = new Set(world.buildings.filter((b) => b.district === district && b.business).map((b) => b.id));
  const workers = civilians.filter((p) => p.job.building && storefronts.has(p.job.building));
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
  const spot = (person: Person): Spot | null => person.likes.hangout ?? (person.job.building ? { kind: 'building', id: person.job.building } : null);

  // A gang leans on a storefront for its cut.
  if (events.length < rules.perDistrict && gangers.length && workers.length && rng.chance(rules.chances.shakedown)) {
    const ganger = rng.pick(gangers);
    const worker = rng.pick(workers);
    const took = pay(worker, ganger, rules.shakedown);
    if (took > 0) {
      hate(worker, ganger.gang as string);
      write('shakedown', [ganger, worker], ganger.gang, took, { kind: 'building', id: worker.job.building as string });
    }
  }
  // Someone gets jumped on the way home.
  if (events.length < rules.perDistrict && gangers.length && civilians.length && rng.chance(rules.chances.robbery)) {
    const ganger = rng.pick(gangers);
    const victim = rng.pick(civilians);
    const took = pay(victim, ganger, rules.robbery);
    if (took > 0) {
      hate(victim, ganger.gang as string);
      write('robbery', [ganger, victim], ganger.gang, took, spot(victim));
    }
  }
  // Someone picks a fight with a gang they hate, or two crews go at it; the loser is laid up.
  if (events.length < rules.perDistrict && rng.chance(rules.chances.fight)) {
    const pairs: Array<[Person, Person]> = [];
    for (const g of gangers) {
      for (const c of civilians) if (c.hates === g.gang && c.traits.courage >= 0.5) pairs.push([g, c]);
      for (const h of gangers) if (h !== g && h.gang !== g.gang && h.hates === g.gang) pairs.push([g, h]);
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      const nerve = (p: Person) => p.traits.courage * 0.6 + p.traits.temper * 0.4 + rng.range(0, 0.5);
      const [winner, loser] = nerve(pair[0]) >= nerve(pair[1]) ? pair : [pair[1], pair[0]];
      const until = day + rng.int(rules.hurtDays[0], rules.hurtDays[1]);
      state.hurt[loser.id] = until;
      loser.hurtUntil = until;
      write('fight', [winner, loser], winner.gang, 0, spot(loser) ?? spot(winner));
    }
  }
  // Two regulars of the same place become friends.
  if (events.length < rules.perDistrict && rng.chance(rules.chances.friends)) {
    const byHangout = new Map<string, Person[]>();
    for (const p of locals) if (p.likes.hangout) byHangout.set(`${p.likes.hangout.kind}:${p.likes.hangout.id}`, [...(byHangout.get(`${p.likes.hangout.kind}:${p.likes.hangout.id}`) ?? []), p]);
    const pairs: Array<[Person, Person]> = [];
    const known = new Set(population.ties.map((t) => `${t.from}|${t.to}`));
    for (const regulars of byHangout.values()) {
      for (let i = 0; i < regulars.length; i++) {
        for (let j = i + 1; j < regulars.length; j++) {
          const a = regulars[i] as Person;
          const b = regulars[j] as Person;
          if (!known.has(`${a.id}|${b.id}`)) pairs.push([a, b]);
        }
      }
    }
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      const tie: Tie = { from: pair[0].id, to: pair[1].id, kind: 'friend' };
      population.ties.push(tie, { from: pair[1].id, to: pair[0].id, kind: 'friend' });
      state.made.push(tie);
      state.broken = state.broken.filter((key) => key !== tieKey(pair[0].id, pair[1].id));
      write('friends', pair, null, 0, pair[0].likes.hangout);
    }
  }
  // A temper ends a friendship.
  if (events.length < rules.perDistrict && rng.chance(rules.chances.fallout)) {
    const hot = locals.filter((p) => p.traits.temper >= 0.6);
    const pairs = hot.flatMap((p) => tiesOf(population, p.id).filter((t) => t.kind === 'friend').map((t): [Person, Person] | null => {
      const other = population.people.find((q) => q.id === t.to);
      return other ? [p, other] : null;
    })).filter((pair): pair is [Person, Person] => pair !== null);
    const pair = pairs.length ? rng.pick(pairs) : null;
    if (pair) {
      const key = tieKey(pair[0].id, pair[1].id);
      population.ties = population.ties.filter((t) => tieKey(t.from, t.to) !== key);
      state.made = state.made.filter((t) => tieKey(t.from, t.to) !== key);
      if (!state.broken.includes(key)) state.broken.push(key);
      write('fallout', pair, null, 0, pair[0].likes.hangout);
    }
  }
  return events;
}

/** What someone would bring up: the freshest thing that was theirs, their people's, their gang's doing, or (a shakedown, a robbery, a fight) their district's. */
export interface News {
  event: LifeEvent;
  role: 'me' | 'kin' | 'gang' | 'heard';
  /** The one they'd name: the other party, their relative, the victim. */
  other: Person;
  /** For `kin`: what the other is to them. */
  tie: Tie | null;
  /** Whether the speaker came off best (a fight they won; a shakedown or robbery their gang made). */
  won: boolean;
}

export function newsFor(person: Person, population: Population, state: LifeState, rules: LifeRules, today: number): News | null {
  const recent = [...state.events].filter((e) => e.day > today - rules.newsDays).sort((a, b) => b.day - a.day || b.id - a.id);
  const byId = new Map(population.people.map((p) => [p.id, p]));
  const ties = tiesOf(population, person.id);
  for (const event of recent) {
    const [doer, done] = event.who;
    if (doer === person.id || done === person.id) {
      const other = byId.get(doer === person.id ? done : doer);
      if (other) return { event, role: 'me', other, tie: null, won: doer === person.id };
    }
  }
  for (const event of recent) {
    const tie = ties.find((t) => event.who.includes(t.to));
    const other = tie ? byId.get(tie.to) : undefined;
    if (tie && other) return { event, role: 'kin', other, tie, won: event.who[0] === other.id };
  }
  for (const event of recent) {
    if (event.kind === 'friends' || event.kind === 'fallout') continue;
    const victim = byId.get(event.who[1]);
    if (!victim) continue;
    if (person.gang && event.gang === person.gang) return { event, role: 'gang', other: victim, tie: null, won: true };
    if (event.district === person.district) return { event, role: 'heard', other: victim, tie: null, won: false };
  }
  return null;
}

/** Who among the people here is with whom, and doing what: pairs who know each other, a ganger on their turf leaning on the help, rivals eyeing each other. Drawn for the place, the day and the hour. */
export function scenesAt(present: Person[], population: Population, spot: Spot, clock: Clock, world: World, turf: Record<string, Array<[string, number]>>, rivalsOf: (gang: string) => string[], rules: LifeRules, seed: string): Map<string, Scene> {
  const rng = createRng(`${seed}:scene:${spot.kind}:${spot.id}:${clock.day}:${Math.floor(clock.hour / 3)}`);
  const scenes = new Map<string, Scene>();
  const taken = new Set<string>();
  const rank = (kind: TieKind) => (kind === 'spouse' ? 0 : FAMILY.includes(kind) ? 1 : kind === 'friend' ? 2 : kind === 'crew' ? 3 : 4);
  const kindOf = (kind: TieKind): SceneKind => (kind === 'spouse' ? 'couple' : FAMILY.includes(kind) ? 'family' : kind === 'friend' ? 'friends' : kind === 'crew' ? 'crew' : 'coworkers');
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
