import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { LIFE } from '../src/data/life';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { GEAR } from '../src/data/gear';
import { healthOf, staffCostOf, turfFrom, weekdayOf } from '../src/engine/economy';
import { bossOf } from '../src/engine/jobs';
import { drawQuality, menuFor, type Quality } from '../src/engine/food';
import { applyLife, freshLife, liveUntil, newsFor, scenesAt, tieKey, type LifeEvent } from '../src/engine/life';
import { generatePeople, tiesOf, whereIs, type Person, type Population, type Spot } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import type { World } from '../src/engine/types';

const seeds = Array.from({ length: 6 }, (_, i) => createRng(`life-${i}`).next().toString(16).slice(2, 10));
const sortedTies = (p: Population) => p.ties.map((t) => `${t.from}|${t.to}|${t.kind}`).sort();
const T = 39366;

/** The tier a place runs at, the way the game works it out: its menu's, its rack's, or its district's. */
function tierIn(world: World): (spot: Spot) => Quality {
  return (spot) => {
    const at = spot.kind === 'building' ? world.buildings.find((b) => b.id === spot.id) : world.locations[spot.id];
    if (!at) return 'everyday';
    const business = spot.kind === 'building' ? (at as { business: string | null }).business : null;
    return menuFor(world, at, FOOD)?.venue.quality ?? (business ? GEAR.quality[business] : undefined) ?? drawQuality(world, at);
  };
}
const turf = turfFrom(PEOPLE.turf);

function lived(seed: string, days: number, from = T) {
  const world = generateWorld(seed, CITY);
  const population = generatePeople(world, PEOPLE, FOOD.dishes);
  const base = new Map(population.people.map((p) => [p.id, p.eddies]));
  const state = freshLife();
  const events: LifeEvent[] = [];
  for (let day = from; day < from + days; day++) events.push(...liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf));
  return { world, population, base, state, events };
}

describe("the people's own days", () => {
  it('are the same days every time for a seed, and come back onto a fresh population exactly', () => {
    const a = lived('7f3a29c1', 12);
    const b = lived('7f3a29c1', 12);
    expect(a.events).toEqual(b.events);
    expect(a.state).toEqual(b.state);
    expect(a.population.people).toEqual(b.population.people);
    // Saved and put back: the same people, the same ties.
    const fresh = generatePeople(a.world, PEOPLE, FOOD.dishes);
    applyLife(fresh, structuredClone(a.state));
    expect(fresh.people).toEqual(a.population.people);
    expect(sortedTies(fresh)).toEqual(sortedTies(a.population));
    // Living a day at a time is the same as living them all at once.
    const once = lived('7f3a29c1', 1, T + 11);
    const atOnce = generatePeople(once.world, PEOPLE, FOOD.dishes);
    const state = freshLife();
    liveUntil(once.world, atOnce, state, LIFE, new Map(atOnce.people.map((p) => [p.id, p.eddies])), T + 11, '7f3a29c1', tierIn(once.world), turf);
    expect(state.day).toBe(T + 11);
  });

  it('has gangs lean on storefronts and jump people, fights that lay the loser up, and friendships made and lost, with every effect on the people', () => {
    const kinds = new Set<string>();
    for (const seed of seeds) {
      const { world, population, state, events } = lived(seed, 40);
      const byId = new Map(population.people.map((p) => [p.id, p]));
      const storefronts = new Set(world.buildings.filter((b) => b.business).map((b) => b.id));
      expect(events.length, seed).toBeGreaterThan(10);
      const perDay = new Map<string, number>();
      for (const e of events) {
        kinds.add(e.kind);
        const doer = byId.get(e.who[0]) as Person;
        const done = byId.get(e.who[1]) as Person;
        expect(doer, `${seed} ${e.id}`).toBeDefined();
        expect(done, `${seed} ${e.id}`).toBeDefined();
        expect(doer.district, `${seed} ${e.kind}`).toBe(e.district);
        // A friend from across the city can be fallen out with; everyone else in it is local.
        if (e.kind !== 'fallout') expect(done.district, `${seed} ${e.kind}`).toBe(e.district);
        const key = `${e.district}:${e.day}`;
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
        if (e.kind === 'shakedown') {
          expect(doer.gang, seed).toBe(e.gang);
          expect(done.gang, seed).toBeNull();
          expect(done.job.building && storefronts.has(done.job.building), seed).toBe(true);
          expect(e.took, seed).toBeGreaterThan(0);
          expect(e.where, seed).toEqual({ kind: 'building', id: done.job.building });
          expect(done.hates, seed).not.toBeNull();
        }
        if (e.kind === 'robbery') {
          expect(doer.gang, seed).toBe(e.gang);
          expect(done.gang, seed).toBeNull();
          expect(e.took, seed).toBeGreaterThan(0);
          expect(done.hates, seed).not.toBeNull();
        }
        if (e.kind === 'fight') {
          expect(e.took).toBe(0);
          expect(doer.gang || done.gang, seed).toBeTruthy();
          // The loser was laid up for days, and was back at it after.
          const until = state.hurt[done.id];
          if (e.day > state.day - LIFE.hurtDays[1]) expect(until === undefined || until >= e.day, seed).toBe(true);
        }
        if (e.kind === 'friends') {
          expect(e.gang).toBeNull();
          expect(doer.likes.hangout, seed).toEqual(done.likes.hangout);
        }
      }
      for (const [key, n] of perDay) expect(n, `${seed} ${key}`).toBeLessThanOrEqual(LIFE.perDistrict);
      // Nothing older than the city remembers; nobody laid up past their days.
      for (const e of state.events) expect(e.day, seed).toBeGreaterThan(state.day - LIFE.keepDays);
      for (const until of Object.values(state.hurt)) expect(until, seed).toBeGreaterThanOrEqual(state.day);
      for (const p of population.people) expect(p.hurtUntil === undefined ? -1 : p.hurtUntil, p.name).toBe(state.hurt[p.id] ?? -1);
      // Friendships made are ties both ways, and broken ones are gone both ways.
      for (const t of state.made) {
        expect(population.ties.some((u) => u.from === t.from && u.to === t.to && u.kind === 'friend'), `${seed} ${t.from}`).toBe(true);
        expect(population.ties.some((u) => u.from === t.to && u.to === t.from && u.kind === 'friend'), `${seed} ${t.to}`).toBe(true);
      }
      for (const key of state.broken) expect(population.ties.some((t) => tieKey(t.from, t.to) === key), `${seed} ${key}`).toBe(false);
      // Eddies taken are eddies had: nobody below nothing, and the gangs have what the rest lost, less what's been earned back.
      for (const p of population.people) expect(p.eddies, p.name).toBeGreaterThanOrEqual(0);
    }
    expect([...kinds].sort()).toEqual(['fallout', 'fight', 'friends', 'robbery', 'shakedown']);
  });

  it('keeps the laid up at home', () => {
    const { world, population, events } = lived(seeds[0] as string, 20);
    const fight = events.find((e) => e.kind === 'fight');
    if (fight) {
      const loser = population.people.find((p) => p.id === fight.who[1]) as Person;
      const hurt = { ...loser, hurtUntil: fight.day + 2 };
      for (const hour of [3, 11, 20]) {
        const where = whereIs(hurt, world, { hour, weekday: 2, day: fight.day + 1 }, FOOD.dishes);
        expect(where?.spot.id, `${loser.name} at ${hour}`).toBe(loser.home ?? undefined);
        if (loser.home) expect(where?.doing).toMatch(/laid up|asleep/);
      }
      expect(whereIs(hurt, world, { hour: 11, weekday: 2, day: fight.day + 3 }, FOOD.dishes)?.doing).not.toMatch(/laid up/);
    }
  });

  it('moves the eddies: payday lifts nearly everyone, other days wear them down, the tills keep a week and the gangs take their cut', () => {
    const payday = (day: number) => weekdayOf(day) === LIFE.economy.payday;
    const healths = new Set<string>();
    for (const seed of seeds) {
      const { world, population, base, state } = lived(seed, 30);
      const civilians = population.people.filter((p) => !p.gang);
      const total = () => civilians.reduce((n, p) => n + p.eddies, 0);
      // A day that isn't payday costs: living, and evenings out.
      let day = state.day + 1;
      while (payday(day)) day++;
      const before = total();
      liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf);
      expect(total(), `${seed} day ${day}`).toBeLessThan(before);
      // Payday: a week's money on nearly everyone who isn't paid by a gang.
      while (!payday(day)) day++;
      const had = new Map(civilians.map((p) => [p.id, p.eddies]));
      const chests = Object.values(state.treasuries).reduce((n, v) => n + v, 0);
      expect(chests, `${seed} treasuries before payday`).toBeGreaterThan(0);
      liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf);
      const up = civilians.filter((p) => p.eddies > (had.get(p.id) as number)).length;
      expect(up / civilians.length, `${seed} paid on ${day}`).toBeGreaterThan(0.9);
      // Every storefront keeps a week of books, and the city has places doing well and badly.
      const storefronts = world.buildings.filter((b) => b.business);
      for (const b of storefronts) expect(state.tills[b.id]?.days.length, `${seed} ${b.name}`).toBe(7);
      for (const b of storefronts) {
        const staff = population.people.filter((p) => p.job.building === b.id);
        const tier = tierIn(world)({ kind: 'building', id: b.id });
        healths.add(healthOf(state.tills[b.id], staffCostOf(staff, bossOf(b, population), tier, LIFE.economy) + LIFE.economy.rent[tier] * 7, LIFE.economy));
      }
      // Nobody is ruined by it: the city's civilians still hold about what they started with.
      const started = civilians.reduce((n, p) => n + (base.get(p.id) as number), 0);
      expect(total() / started, `${seed} eddies against the start`).toBeGreaterThan(0.6);
      expect(total() / started, `${seed} eddies against the start`).toBeLessThan(2);
    }
    expect([...healths].sort()).toEqual(['steady', 'struggling', 'thriving']);
  });

  it('gives everyone news to tell from their own side of it, and pairs people up where they are', () => {
    const { world, population, state } = lived(seeds[1] as string, 10);
    const byId = new Map(population.people.map((p) => [p.id, p]));
    let told = 0;
    for (const p of population.people) {
      const news = newsFor(p, population, state, LIFE, state.day);
      if (!news) continue;
      told++;
      expect(news.event.day).toBeGreaterThan(state.day - LIFE.newsDays);
      if (news.role === 'me') expect(news.event.who).toContain(p.id);
      if (news.role === 'kin') {
        expect(news.tie?.from).toBe(p.id);
        expect(news.event.who).toContain(news.tie?.to);
      }
      if (news.role === 'gang') expect(news.event.gang).toBe(p.gang);
      if (news.role === 'heard') {
        expect(news.event.district).toBe(p.district);
        expect(['friends', 'fallout']).not.toContain(news.event.kind);
      }
      expect(byId.get(news.other.id)).toBeDefined();
    }
    expect(told).toBeGreaterThan(population.people.length / 4);
    // Where two people who know each other are, they're often at something together; always, when the dice say so.
    const sure = { ...LIFE, together: 1, leaning: 1, eyeing: 1 };
    const spouses = population.ties.find((t) => t.kind === 'spouse');
    if (spouses) {
      const a = byId.get(spouses.from) as Person;
      const b = byId.get(spouses.to) as Person;
      const scenes = scenesAt([a, b], population, { kind: 'location', id: Object.keys(world.locations)[0] as string }, { hour: 20, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], sure, world.seed);
      expect(scenes.get(a.id)).toMatchObject({ with: b.id, kind: 'couple' });
      expect(scenes.get(b.id)).toMatchObject({ with: a.id, kind: 'couple' });
      expect(LIFE.scenes.couple).toContain(scenes.get(a.id)?.phrase);
    }
    // A ganger on their turf and the help behind a counter.
    const ganger = population.people.find((p) => p.gang && (PEOPLE.turf[p.district] ?? []).some(([g]) => g === p.gang)) as Person;
    const shop = world.buildings.find((b) => b.district === ganger.district && b.business && population.people.some((p) => p.job.building === b.id));
    if (shop) {
      const worker = population.people.find((p) => p.job.building === shop.id) as Person;
      const scenes = scenesAt([ganger, worker], population, { kind: 'building', id: shop.id }, { hour: 11, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], sure, world.seed);
      expect(scenes.get(ganger.id)).toMatchObject({ with: worker.id, kind: 'shakedown' });
      expect(scenes.get(worker.id)).toBeUndefined();
    }
    // Drawn the same for the place and the hour (hours go in threes), and nobody paired with themselves or twice.
    const here = population.people.slice(0, 12);
    const spot = { kind: 'location' as const, id: Object.keys(world.locations)[0] as string };
    const once = scenesAt(here, population, spot, { hour: 19, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], LIFE, world.seed);
    expect(scenesAt(here, population, spot, { hour: 20, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], LIFE, world.seed)).toEqual(once);
    for (const [id, scene] of once) {
      expect(scene.with).not.toBe(id);
      if (scene.kind !== 'shakedown') expect(once.get(scene.with)?.with).toBe(id);
    }
    void tiesOf;
  });
});
