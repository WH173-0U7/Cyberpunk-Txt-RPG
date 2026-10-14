import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { dreamOf, generatePeople, handleOf, INVERSE, isCorpo, isNetrunner, peopleAt, whereIs, type Population, type TieKind } from '../src/engine/people';
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
        expect(p.chip).toBeGreaterThanOrEqual(0);
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

  it('puts a credchip on some of them, corpos most of all, and knows who can chop one', () => {
    const all = cities.flatMap(({ world, population }) => population.people.map((p) => ({ p, world })));
    const corpo = ({ p, world }: (typeof all)[number]) => Boolean(p.job.building && world.buildings.find((b) => b.id === p.job.building)?.kind === 'tower');
    const corpos = all.filter(corpo);
    const gangers = all.filter(({ p }) => p.gang);
    const street = all.filter((x) => !corpo(x) && !x.p.gang);
    const share = (people: typeof all) => people.filter(({ p }) => p.chip > 0).length / people.length;
    expect(corpos.length).toBeGreaterThan(50);
    expect(share(corpos)).toBeGreaterThan(share(street));
    expect(share(street)).toBeGreaterThan(share(gangers));
    expect(share(gangers)).toBeGreaterThan(0);
    for (const [who, group] of [['corpo', corpos], ['gang', gangers], ['street', street]] as const) {
      const { range } = PEOPLE.chips[who];
      for (const { p } of group) if (p.chip) expect(p.chip, p.name).toBeGreaterThanOrEqual(range[0]);
      for (const { p } of group) expect(p.chip, p.name).toBeLessThanOrEqual(range[1]);
    }
    // A netrunner for hire, a Voodoo Boys netrunner and anyone behind a netrunning counter can chop a chip; a cook can't.
    const choppers = all.filter(({ p, world }) => isNetrunner(p, world));
    expect(choppers.length).toBeGreaterThan(20);
    expect(choppers.some(({ p }) => p.job.role === 'netrunner for hire')).toBe(true);
    expect(choppers.some(({ p, world }) => world.buildings.find((b) => b.id === p.job.building)?.category === 'netrunning')).toBe(true);
    expect(choppers.some(({ p }) => p.gang === 'voodoo_boys' && p.job.role === 'netrunner')).toBe(true);
    expect(choppers.some(({ p }) => /cook|bartender|teller/.test(p.job.role))).toBe(false);
    // Every city has someone to take a hot chip to.
    for (const { world, population } of cities) expect(population.people.some((p) => isNetrunner(p, world)), world.seed).toBe(true);
  });

  it('tie people together both ways: family who share a name, friends, crews and coworkers', () => {
    for (const { world, population } of cities) {
      const byId = new Map(population.people.map((p) => [p.id, p]));
      const keys = new Set(population.ties.map((t) => `${t.from}|${t.to}|${t.kind}`));
      const knows = new Map<string, number>();
      for (const t of population.ties) knows.set(t.from, (knows.get(t.from) ?? 0) + 1);
      for (const t of population.ties) {
        expect(t.from, world.seed).not.toBe(t.to);
        expect(byId.has(t.to), `${world.seed} ${t.to}`).toBe(true);
        expect(keys.has(`${t.to}|${t.from}|${INVERSE[t.kind]}`), `${world.seed} ${t.from} ${t.kind} ${t.to}`).toBe(true);
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
      for (const p of population.people) expect(knows.get(p.id) ?? 0, `${world.seed} ${p.name} knows nobody`).toBeGreaterThan(0);
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
    // Nor gives anyone a canon character's street name, or a canon weapon's or perk's (checked on the wiki).
    const canon = ['Lucky', 'Rook', 'Hammer', 'Bolt', 'Jackie', 'Johnny', 'Panam', 'Judy', 'Dex', 'Brick', 'Nix', 'Rogue', 'Smasher', 'Placide', 'Skippy', 'Royce', 'Dum Dum', 'Sasquatch', 'T-Bug', 'Spider', 'Takemura'];
    for (const handle of PEOPLE.handles.pool) expect(canon, handle).not.toContain(handle);
  });

  it('gives most gangers a street name and corpos none, and everyone something to want out of life, the same every time', () => {
    for (const { world, population } of cities.slice(0, 20)) {
      for (const p of population.people) {
        const handle = handleOf(p, world, PEOPLE);
        expect(handleOf(p, world, PEOPLE)).toBe(handle);
        if (handle) expect(PEOPLE.handles.pool).toContain(handle);
        if (isCorpo(p, world)) expect(handle, p.name).toBeNull();
        const dream = dreamOf(p, world, PEOPLE);
        expect(dreamOf(p, world, PEOPLE)).toBe(dream);
        // A corpo climbs, a ganger doesn't; nobody in a gang wants to climb a corp, nobody outside one wants rank in it.
        if (dream === 'ladder') expect(p.gang, p.name).toBeNull();
        if (dream === 'rank') expect(p.gang, p.name).not.toBeNull();
        if (dream === 'payback') expect(p.hates, p.name).not.toBeNull();
      }
    }
    const all = cities.flatMap(({ world, population }) => population.people.map((p) => ({ p, world })));
    const gangers = all.filter(({ p }) => p.gang);
    const named = gangers.filter(({ p, world }) => handleOf(p, world, PEOPLE)).length / gangers.length;
    expect(named).toBeGreaterThan(0.6);
    expect(named).toBeLessThan(0.8);
    const corpos = all.filter(({ p, world }) => isCorpo(p, world));
    expect(corpos.filter(({ p, world }) => dreamOf(p, world, PEOPLE) === 'ladder').length / corpos.length).toBeGreaterThan(0.4);
    expect(new Set(all.map(({ p, world }) => dreamOf(p, world, PEOPLE))).size).toBe(Object.keys(PEOPLE.dreams).length);
  });
});
