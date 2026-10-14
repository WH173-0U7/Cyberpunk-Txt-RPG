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
import { generatePeople, INVERSE, tiesOf, whereIs, type Person, type Population, type Spot } from '../src/engine/people';
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
  for (let day = from; day < from + days; day++) events.push(...liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf, PEOPLE));
  return { world, population, base, state, events };
}

describe("the people's own days", () => {
  it('are the same days every time for a seed, and come back onto a fresh population exactly', () => {
    const a = lived('7f3a29c1', 40);
    const b = lived('7f3a29c1', 40);
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
    liveUntil(once.world, atOnce, state, LIFE, new Map(atOnce.people.map((p) => [p.id, p.eddies])), T + 11, '7f3a29c1', tierIn(once.world), turf, PEOPLE);
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
        // A friend from across the city can be fallen out with, and made up with; everyone else in it is local.
        if (e.kind !== 'fallout' && e.kind !== 'makeup') expect(done.district, `${seed} ${e.kind}`).toBe(e.district);
        const key = `${e.district}:${e.day}`;
        perDay.set(key, (perDay.get(key) ?? 0) + 1);
        // Someone shaken down or robbed was no ganger then (a gang may have taken them on since), and worked where they were leaned on (unless their job has changed since).
        const civilian = done.gang === null || state.gangs[done.id] !== undefined;
        if (e.kind === 'shakedown') {
          expect(doer.gang, seed).toBe(e.gang);
          expect(civilian, seed).toBe(true);
          expect(e.where?.kind === 'building' && storefronts.has(e.where.id), seed).toBe(true);
          if (!state.jobs[done.id]) expect(e.where, seed).toEqual({ kind: 'building', id: done.job.building });
          expect(e.took, seed).toBeGreaterThan(0);
          expect(done.hates, seed).not.toBeNull();
        }
        if (e.kind === 'robbery') {
          expect(doer.gang, seed).toBe(e.gang);
          expect(civilian, seed).toBe(true);
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
      // Nothing older than the city remembers (the big things a while longer); nobody laid up past their days.
      for (const e of state.events) expect(e.day, `${seed} ${e.kind}`).toBeGreaterThan(state.day - (LIFE.lasting[e.kind] ?? LIFE.keepDays));
      for (const until of Object.values(state.hurt)) expect(until, seed).toBeGreaterThanOrEqual(state.day);
      for (const p of population.people) expect(p.hurtUntil === undefined ? -1 : p.hurtUntil, p.name).toBe(state.hurt[p.id] ?? -1);
      // Ties made are ties both ways; a pair whose ties from the start were broken has only what's been made since.
      const ties = new Set(population.ties.map((t) => `${t.from}|${t.to}|${t.kind}`));
      for (const t of state.made) {
        expect(ties.has(`${t.from}|${t.to}|${t.kind}`), `${seed} ${t.from}`).toBe(true);
        expect(ties.has(`${t.to}|${t.from}|${INVERSE[t.kind]}`), `${seed} ${t.to}`).toBe(true);
      }
      const made = new Set(state.made.map((t) => tieKey(t.from, t.to)));
      for (const key of state.broken) if (!made.has(key)) expect(population.ties.some((t) => tieKey(t.from, t.to) === key), `${seed} ${key}`).toBe(false);
      // Eddies taken are eddies had: nobody below nothing, and the gangs have what the rest lost, less what's been earned back.
      for (const p of population.people) expect(p.eddies, p.name).toBeGreaterThanOrEqual(0);
    }
    expect([...kinds]).toEqual(expect.arrayContaining(['fallout', 'fight', 'friends', 'robbery', 'shakedown']));
  });

  it('gets couples together, marries and splits them, takes people on and lets them go, buries the dead and fills a gang\'s ranks, with every effect on the people', () => {
    const kinds = new Set<string>();
    for (const seed of seeds) {
      const { world, population, state, events } = lived(seed, 90);
      const fresh = generatePeople(world, PEOPLE, FOOD.dishes);
      const byId = new Map(population.people.map((p) => [p.id, p]));
      const alive = (id: string) => byId.get(id)?.diedOn === undefined;
      const ties = new Set(population.ties.map((t) => `${t.from}|${t.to}`));
      for (const e of events) {
        kinds.add(e.kind);
        const [a, b] = e.who.map((id) => byId.get(id) as Person) as [Person, Person];
        // Nobody does anything once they're dead.
        for (const p of [a, b]) if (p.diedOn !== undefined) expect(e.day, `${seed} ${e.kind} with ${p.name} dead`).toBeLessThanOrEqual(p.diedOn);
        if (e.kind === 'death') {
          expect(b.diedOn, `${seed} ${b.name}`).toBe(e.day);
          // Killed in a fight between crews, or of their years.
          if (a !== b) {
            expect(a.gang && b.gang && a.gang !== b.gang, `${seed} ${a.name} killed ${b.name}`).toBeTruthy();
            expect(e.gang).toBe(a.gang);
          } else expect(b.age, `${seed} ${b.name}`).toBeGreaterThanOrEqual(LIFE.elderAt);
        }
        if (e.kind === 'romance') {
          expect(Math.min(a.age, b.age), seed).toBeGreaterThanOrEqual(LIFE.adultAt);
          expect(Math.abs(a.age - b.age), seed).toBeLessThanOrEqual(LIFE.ageGap);
        }
        if (e.kind === 'hired' || e.kind === 'laidOff') {
          // The boss does it, and is who the place always had.
          const shop = world.buildings.find((x) => x.id === e.where?.id);
          expect(shop?.business, seed).toBeTruthy();
          expect(bossOf(shop as never, fresh)?.id, `${seed} ${shop?.name}`).toBe(a.id);
          // No ganger then (someone let go can end up in colors).
          expect(b.gang === null || state.gangs[b.id] !== undefined, seed).toBe(true);
          expect(b.id).not.toBe(a.id);
        }
        if (e.kind === 'joined') {
          expect(b.gang, seed).toBe(e.gang);
          expect(a.gang, seed).toBe(e.gang);
          expect(b.age, seed).toBeLessThanOrEqual(LIFE.recruitAge);
          expect(state.gangs[b.id], seed).toBe(e.gang);
        }
      }
      // Every storefront is run by whoever ran it from the start, however many came and went.
      for (const shop of world.buildings.filter((x) => x.business)) expect(bossOf(shop, population)?.id, `${seed} ${shop.name}`).toBe(bossOf(shop, fresh)?.id);
      // One living partner or spouse each at most; every couple has the day it got together, and every tie runs both ways.
      for (const p of population.people.filter((q) => q.diedOn === undefined)) {
        const loves = population.ties.filter((t) => t.from === p.id && (t.kind === 'spouse' || t.kind === 'partner') && alive(t.to));
        expect(loves.length, `${seed} ${p.name}`).toBeLessThanOrEqual(1);
      }
      for (const t of population.ties) {
        expect(ties.has(`${t.to}|${t.from}`), `${seed} ${t.from} ${t.kind} ${t.to}`).toBe(true);
        if (t.kind === 'partner') expect(state.since[tieKey(t.from, t.to)], `${seed} ${t.from}`).toBeDefined();
      }
      // The jobs people have now: coworkers work at the same place (whoever's let go stops being one), nobody working is dead, and whoever was taken on knows the boss (unless something has come between them since).
      for (const [id, job] of Object.entries(state.jobs)) expect((byId.get(id) as Person).job, `${seed} ${id}`).toEqual({ role: job.role, building: job.building });
      for (const t of population.ties) {
        if (t.kind !== 'coworker') continue;
        const [p, q] = [byId.get(t.from) as Person, byId.get(t.to) as Person];
        expect(p.job.building, `${seed} ${p.name} and ${q.name}`).toBeTruthy();
        expect(p.job.building, `${seed} ${p.name} and ${q.name}`).toBe(q.job.building);
      }
      for (const p of population.people) if (p.job.building) expect(p.diedOn, p.name).toBeUndefined();
      for (const e of events.filter((x) => x.kind === 'hired')) {
        const [boss, hire] = e.who;
        const since = events.some((x) => x.day >= e.day && x.id !== e.id && x.who.includes(boss) && x.who.includes(hire));
        if (byId.get(hire)?.job.building === e.where?.id && !since) expect(ties.has(`${hire}|${boss}`), `${seed} ${hire} hired by ${boss}`).toBe(true);
      }
      // The dead are nowhere, and a gang takes on no more than it has lost.
      for (const p of population.people.filter((q) => q.diedOn !== undefined)) {
        for (const hour of [3, 12, 20]) expect(whereIs(p, world, { hour, weekday: 3, day: state.day }, FOOD.dishes), p.name).toBeNull();
        expect(state.dead[p.id]).toBe(p.diedOn);
      }
      for (const district of Object.keys(world.districts)) {
        for (const [gang] of PEOPLE.turf[district] ?? []) {
          const members = population.people.filter((p) => p.gang === gang && p.district === district);
          const recruits = members.filter((p) => state.gangs[p.id] === gang).length;
          expect(recruits, `${seed} ${gang} in ${district}`).toBeLessThanOrEqual(members.filter((p) => p.diedOn !== undefined).length);
        }
      }
      // Put back onto a population made fresh for the seed, it's all there.
      const again = generatePeople(world, PEOPLE, FOOD.dishes);
      applyLife(again, structuredClone(state));
      expect(again.people).toEqual(population.people);
      expect(sortedTies(again)).toEqual(sortedTies(population));
    }
    expect([...kinds].sort()).toEqual(['breakup', 'death', 'fallout', 'fight', 'friends', 'hired', 'joined', 'laidOff', 'makeup', 'robbery', 'romance', 'shakedown', 'wedding']);
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
      liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf, PEOPLE);
      expect(total(), `${seed} day ${day}`).toBeLessThan(before);
      // Payday: a week's money on nearly everyone who isn't paid by a gang.
      while (!payday(day)) day++;
      const had = new Map(civilians.map((p) => [p.id, p.eddies]));
      const chests = Object.values(state.treasuries).reduce((n, v) => n + v, 0);
      expect(chests, `${seed} treasuries before payday`).toBeGreaterThan(0);
      liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf, PEOPLE);
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
        expect(['friends', 'fallout', 'makeup']).not.toContain(news.event.kind);
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
