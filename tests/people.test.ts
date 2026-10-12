import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, INVERSE, peopleAt, tiesOf, whereIs, type Population, type TieKind } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import type { World } from '../src/engine/types';

const seeds = Array.from({ length: 60 }, (_, i) => createRng(`people-${i}`).next().toString(16).slice(2, 10));
const cities = seeds.map((seed) => {
  const world = generateWorld(seed, CITY);
  return { world, population: generatePeople(world, PEOPLE, FOOD.dishes) };
});
const FAMILY: TieKind[] = ['spouse', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

describe('the people', () => {
  it('are the same people every time for a seed', () => {
    const world = generateWorld('7f3a29c1', CITY);
    expect(generatePeople(world, PEOPLE, FOOD.dishes)).toEqual(generatePeople(world, PEOPLE, FOOD.dishes));
  });

  it('fill every district: its storefronts staffed, residents, and its gangs', () => {
    for (const { world, population } of cities) {
      const { people } = population;
      expect(people.length, world.seed).toBeGreaterThanOrEqual(20);
      for (const district of Object.keys(world.districts)) {
        const locals = people.filter((p) => p.district === district);
        expect(locals.length, `${world.seed} ${district}`).toBeGreaterThanOrEqual(PEOPLE.residents[0]);
        for (const b of world.buildings.filter((b) => b.district === district && b.business)) {
          expect(locals.some((p) => p.job.building === b.id), `${world.seed} nobody works at ${b.name}`).toBe(true);
        }
        for (const [gang, weight] of PEOPLE.turf[district] ?? []) {
          expect(locals.filter((p) => p.gang === gang).length, `${world.seed} ${gang} in ${district}`).toBeGreaterThanOrEqual(Math.max(1, weight - 1));
        }
      }
      for (const p of people) {
        expect(p.name, p.id).toMatch(/\S+ \S+/);
        // Given names go with the pronouns.
        const pools = Object.values(PEOPLE.names);
        if (p.pronouns === 'he') expect(pools.some((pool) => pool.masculine.includes(p.given)), p.name).toBe(true);
        if (p.pronouns === 'she') expect(pools.some((pool) => pool.feminine.includes(p.given)), p.name).toBe(true);
        expect(p.id).toMatch(/^[a-z0-9-]+$/);
        expect(p.age).toBeGreaterThanOrEqual(18);
        expect(p.bio.length).toBeGreaterThan(10);
        expect(p.eddies).toBeGreaterThan(0);
        if (p.home) expect(world.buildings.find((b) => b.id === p.home)).toMatchObject({ district: p.district, category: 'residential' });
        if (p.job.building) expect(world.buildings.find((b) => b.id === p.job.building)?.district, p.name).toBe(p.district);
        if (p.gang) expect((PEOPLE.turf[p.district] ?? []).map(([g]) => g), p.name).toContain(p.gang);
        expect(FOOD.dishes.find((d) => d.id === p.likes.dish)?.kind, p.name).toBe('food');
        expect(['drink', 'alcohol']).toContain(FOOD.dishes.find((d) => d.id === p.likes.drink)?.kind);
        for (const v of Object.values(p.traits)) expect(v).toBeGreaterThan(0);
      }
      const names = people.map((p) => p.name);
      expect(new Set(names).size, world.seed).toBe(names.length);
      expect(new Set(people.map((p) => p.id)).size, world.seed).toBe(names.length);
    }
  });

  it('tie people together both ways: family who share a name, friends, crews and coworkers', () => {
    for (const { world, population } of cities) {
      const byId = new Map(population.people.map((p) => [p.id, p]));
      for (const t of population.ties) {
        expect(t.from, world.seed).not.toBe(t.to);
        expect(byId.has(t.to), `${world.seed} ${t.to}`).toBe(true);
        expect(population.ties.some((u) => u.from === t.to && u.to === t.from && u.kind === INVERSE[t.kind]), `${world.seed} ${t.from} ${t.kind} ${t.to}`).toBe(true);
        const a = byId.get(t.from);
        const b = byId.get(t.to);
        if (!a || !b) continue;
        if (FAMILY.includes(t.kind) && a.district === b.district) expect(a.family, `${a.name} ${t.kind} ${b.name}`).toBe(b.family);
        if (t.kind === 'crew') expect(a.gang).toBe(b.gang);
        if (t.kind === 'coworker') expect(a.job.building).toBe(b.job.building);
        // `to` is `from`'s parent: a generation older (an aunt or uncle can be any age).
        if (t.kind === 'parent') expect(b.age - a.age, `${b.name} is ${a.name}'s parent`).toBeGreaterThanOrEqual(18);
        if (t.kind === 'spouse') expect(Math.abs(a.age - b.age)).toBeLessThanOrEqual(12);
      }
      for (const p of population.people) expect(tiesOf(population, p.id).length, `${world.seed} ${p.name} knows nobody`).toBeGreaterThan(0);
      const kinds = new Set(population.ties.map((t) => t.kind));
      for (const kind of ['friend', 'coworker', 'spouse', 'sibling'] as TieKind[]) expect(kinds, `${world.seed} has no ${kind}`).toContain(kind);
      // Blood runs across the city too.
      if (Object.keys(world.districts).length > 1) expect(population.ties.some((t) => t.kind === 'cousin' && byId.get(t.from)?.district !== byId.get(t.to)?.district)).toBe(true);
    }
  });

  it('keeps hours: at work by day, out in the evening, home at night, and findable', () => {
    const { world, population } = cities[0] as { world: World; population: Population };
    const day = { weekday: 2, day: 100 };
    for (const person of population.people) {
      for (const hour of [0, 3, 7, 10, 13, 16, 19, 21, 23]) {
        const where = whereIs(person, world, { ...day, hour }, FOOD.dishes);
        if (!where) continue;
        expect(where.doing.length).toBeGreaterThan(0);
        if (where.spot.kind === 'building') expect(world.buildings.some((b) => b.id === where.spot.id), person.name).toBe(true);
        else expect(world.locations[where.spot.id], person.name).toBeDefined();
      }
      expect(whereIs(person, world, { ...day, hour: 11 }, FOOD.dishes)).toEqual(whereIs(person, world, { ...day, hour: 11 }, FOOD.dishes));
    }
    // Over a working week, every storefront has its people in by day.
    for (const shop of world.buildings.filter((b) => b.business)) {
      const staffed = [1, 2, 3, 4, 5].some((weekday) => peopleAt(population, world, { kind: 'building', id: shop.id }, { hour: 11, weekday, day: 100 + weekday }, FOOD.dishes).length > 0);
      expect(staffed, `${shop.name} is never open`).toBe(true);
    }
    // At night the homes are full and the shops are not.
    const atHome = population.people.filter((p) => p.home && whereIs(p, world, { ...day, hour: 3 }, FOOD.dishes)?.spot.id === p.home).length;
    expect(atHome).toBeGreaterThan(population.people.filter((p) => p.home).length / 2);
    const evening = population.people.filter((p) => {
      const w = whereIs(p, world, { ...day, hour: 20 }, FOOD.dishes);
      return w && p.likes.hangout && w.spot.id === p.likes.hangout.id;
    }).length;
    expect(evening).toBeGreaterThan(population.people.length / 4);
  });

  it('never names anyone after a real character', () => {
    const real = ['Jackie Welles', 'Judy Alvarez', 'Panam Palmer', 'Johnny Silverhand', 'Sebastián Ibarra', 'Solomon Reed', 'Kurt Hansen', 'Wakako Okada', 'Viktor Vektor'];
    for (const { population } of cities) for (const p of population.people) expect(real).not.toContain(p.name);
  });
});
