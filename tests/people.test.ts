import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { allHours, dreamOf, drawnTo, generatePeople, handleOf, hauntOf, heartOf, INVERSE, isCorpo, isNetrunner, peopleAt, readOf, skillsOf, tiesOf, walkOf, whereIs, worksNights, type PersonSkills, type Population, type TieKind } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { moodOf } from '../src/engine/dialogue';
import type { World } from '../src/engine/types';

const seeds = Array.from({ length: 60 }, (_, i) => createRng(`people-${i}`).next().toString(16).slice(2, 10));
const cities = seeds.map((seed) => {
  const world = generateWorld(seed, CITY);
  return { world, population: generatePeople(world, PEOPLE, FOOD.dishes) };
});
const FAMILY: TieKind[] = ['spouse', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

describe('the people', () => {
  it('are the same with hospitals in the city as without: a hospital takes only a storefront nobody hangs out at', () => {
    const without = { ...CITY, buildings: { ...CITY.buildings, landmarks: CITY.buildings.landmarks!.filter((l) => l.business !== 'hospital'), businesses: CITY.buildings.businesses.filter((b) => b.id !== 'hospital') } };
    for (const seed of seeds.slice(0, 4)) {
      const before = generateWorld(seed, without);
      const after = generateWorld(seed, CITY);
      expect(after.locations).toEqual(before.locations);
      const hospitals = new Set(after.buildings.filter((b) => b.business === 'hospital').map((b) => b.id));
      expect(hospitals.size).toBeGreaterThan(0);
      // Only the hospitals changed, and only their name and business.
      for (const [i, b] of after.buildings.entries()) {
        const was = before.buildings[i]!;
        if (hospitals.has(b.id)) expect({ ...b, name: was.name, business: was.business, category: was.category, kindLabel: was.kindLabel }).toEqual(was);
        else expect(b).toEqual(was);
      }
      // Everyone is who they were, but for the job titles of the staff where a hospital opened.
      const a = generatePeople(before, PEOPLE, FOOD.dishes);
      const b = generatePeople(after, PEOPLE, FOOD.dishes);
      const plain = (p: (typeof a.people)[number]) => ({ ...p, bio: '', job: { ...p.job, role: p.job.building && hospitals.has(p.job.building) ? '' : p.job.role } });
      expect(b.people.map(plain)).toEqual(a.people.map(plain));
      expect(b.ties).toEqual(a.ties);
    }
  }, 120_000);

  it('are the same people every time for a seed', () => {
    const world = generateWorld('7f3a29c1', CITY);
    expect(generatePeople(world, PEOPLE, FOOD.dishes)).toEqual(generatePeople(world, PEOPLE, FOOD.dishes));
  });

  it('crowd the homes on a third draw, leaving everyone the first two made (and their ties) as every save knows them', () => {
    const none = { ...PEOPLE, crowd: { staff: 0, perHome: [0, 0] as [number, number], tall: 0, megabuilding: 0, gangs: 0 }, ncpd: undefined };
    const strip = ({ bio: _bio, ...person }: Population['people'][number]) => person;
    for (const { world, population } of cities.slice(0, 20)) {
      const before = generatePeople(world, none, FOOD.dishes);
      expect(population.people.slice(0, before.people.length).map(strip), world.seed).toEqual(before.people.map(strip));
      const ties = new Set(population.ties.map((t) => `${t.from}|${t.to}|${t.kind}`));
      for (const t of before.ties) expect(ties.has(`${t.from}|${t.to}|${t.kind}`), `${world.seed} ${t.from}|${t.to}|${t.kind}`).toBe(true);
      // The crowd is most of the city, in its homes, and knows a few at work rather than a whole tower.
      const crowd = population.people.slice(before.people.length);
      expect(crowd.length, world.seed).toBeGreaterThan(before.people.length / 2);
      const known = new Set(before.people.map((p) => p.id));
      for (const p of crowd) {
        const mates = tiesOf(population, p.id).filter((t) => t.kind === 'coworker' && known.has(t.to));
        expect(mates.length, `${world.seed} ${p.id}`).toBeLessThanOrEqual(PEOPLE.crowdKnows);
      }
    }
  });

  it('adds the NCPD on a fourth draw, leaving everyone the first three made as every save knows them', () => {
    const without = { ...PEOPLE, ncpd: undefined };
    const strip = ({ bio: _bio, ...person }: Population['people'][number]) => person;
    for (const { world, population } of cities.slice(0, 10)) {
      const before = generatePeople(world, without, FOOD.dishes);
      expect(population.people.slice(0, before.people.length).map(strip), world.seed).toEqual(before.people.map(strip));
      // Officers where the NCPD still goes, none where it doesn't, and in pairs at the least.
      const officers = population.people.slice(before.people.length);
      // (A district with no homes in this city has its officers living elsewhere: none drawn there.)
      const housed = Object.entries(PEOPLE.ncpd!.perDistrict).filter(([d]) => world.buildings.some((b) => b.district === d && b.category === 'residential'));
      expect(officers.length, world.seed).toBe(housed.reduce((n, [, k]) => n + k, 0));
      for (const o of officers) {
        expect(PEOPLE.ncpd!.roles, o.id).toContain(o.job.role);
        expect(o.job.building, o.id).toBeNull();
        expect(['pacifica', 'badlands'], o.id).not.toContain(o.district);
      }
    }
  });

  it('finds ties and people by id as the lists change, the way scanning them would', () => {
    const { population } = cities[0] as { population: Population };
    const pop: Population = { people: population.people, ties: [...population.ties] };
    const [a, b] = pop.people as [Population['people'][number], Population['people'][number]];
    const scan = (id: string) => pop.ties.filter((t) => t.from === id);
    expect(tiesOf(pop, a.id)).toEqual(scan(a.id));
    // Added to, and replaced: the index follows.
    pop.ties.push({ from: a.id, to: b.id, kind: 'friend' }, { from: b.id, to: a.id, kind: 'friend' });
    expect(tiesOf(pop, a.id)).toEqual(scan(a.id));
    pop.ties = pop.ties.filter((t) => t.from !== a.id && t.to !== a.id);
    expect(tiesOf(pop, a.id)).toEqual([]);
    expect(tiesOf(pop, b.id)).toEqual(scan(b.id));
    // A copy every time: changing what comes back changes nothing.
    tiesOf(pop, b.id).pop();
    expect(tiesOf(pop, b.id)).toEqual(scan(b.id));
  });

  it('fill every district: its storefronts staffed, residents, and its gangs', () => {
    // Problems are collected and checked once: an assertion per person is slow across cities of thousands.
    const problems: string[] = [];
    const pools = Object.values(PEOPLE.names);
    const masculine = new Set(pools.flatMap((pool) => pool.masculine));
    const feminine = new Set(pools.flatMap((pool) => pool.feminine));
    const dishes = new Map(FOOD.dishes.map((d) => [d.id, d]));
    for (const { world, population } of cities) {
      const { people } = population;
      const buildings = new Map(world.buildings.map((b) => [b.id, b]));
      if (people.length < 20) problems.push(`${world.seed}: only ${people.length} people`);
      for (const district of Object.keys(world.districts)) {
        const locals = people.filter((p) => p.district === district);
        if (locals.length < PEOPLE.residents[0]) problems.push(`${world.seed} ${district}: ${locals.length} residents`);
        const staffed = new Set(locals.map((p) => p.job.building));
        for (const b of world.buildings) if (b.district === district && b.business && !staffed.has(b.id)) problems.push(`${world.seed} nobody works at ${b.name}`);
        for (const [gang, weight] of PEOPLE.turf[district] ?? []) {
          const members = locals.filter((p) => p.gang === gang).length;
          if (members < Math.max(1, weight - 1)) problems.push(`${world.seed} ${gang} in ${district}: ${members}`);
        }
      }
      for (const p of people) {
        const fail = (what: string) => problems.push(`${world.seed} ${p.name}: ${what}`);
        if (!/\S+ \S+/.test(p.name)) fail('no full name');
        // Given names go with the pronouns.
        if (p.pronouns === 'he' && !masculine.has(p.given)) fail(`given name ${p.given}`);
        if (p.pronouns === 'she' && !feminine.has(p.given)) fail(`given name ${p.given}`);
        if (!/^[a-z0-9-]+$/.test(p.id)) fail(`id ${p.id}`);
        if (p.age < 18) fail(`age ${p.age}`);
        if (p.bio.length <= 10) fail(`bio ${p.bio}`);
        if (!(p.eddies > 0)) fail(`eddies ${p.eddies}`);
        if (!(p.chip >= 0)) fail(`chip ${p.chip}`);
        const home = p.home ? buildings.get(p.home) : undefined;
        if (p.home && (home?.district !== p.district || home?.category !== 'residential')) fail(`home ${p.home}`);
        if (p.job.building && buildings.get(p.job.building)?.district !== p.district) fail(`works out of district at ${p.job.building}`);
        if (p.gang && !(PEOPLE.turf[p.district] ?? []).some(([g]) => g === p.gang)) fail(`${p.gang} off their turf`);
        if (dishes.get(p.likes.dish)?.kind !== 'food') fail(`dish ${p.likes.dish}`);
        if (!['drink', 'alcohol'].includes(dishes.get(p.likes.drink)?.kind ?? '')) fail(`drink ${p.likes.drink}`);
        for (const v of Object.values(p.traits)) if (!(v > 0)) fail(`trait ${v}`);
      }
      const names = people.map((p) => p.name);
      if (new Set(names).size !== names.length) problems.push(`${world.seed}: names repeat`);
      if (new Set(people.map((p) => p.id)).size !== names.length) problems.push(`${world.seed}: ids repeat`);
    }
    expect(problems.slice(0, 10)).toEqual([]);
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
    const problems: string[] = [];
    for (const { world, population } of cities) {
      const byId = new Map(population.people.map((p) => [p.id, p]));
      const keys = new Set(population.ties.map((t) => `${t.from}|${t.to}|${t.kind}`));
      const knows = new Map<string, number>();
      for (const t of population.ties) knows.set(t.from, (knows.get(t.from) ?? 0) + 1);
      for (const t of population.ties) {
        const fail = (what: string) => problems.push(`${world.seed} ${t.from} ${t.kind} ${t.to}: ${what}`);
        if (t.from === t.to) fail('tied to themself');
        if (!byId.has(t.to)) fail('nobody');
        if (!keys.has(`${t.to}|${t.from}|${INVERSE[t.kind]}`)) fail('one way only');
        const a = byId.get(t.from);
        const b = byId.get(t.to);
        if (!a || !b) continue;
        if (FAMILY.includes(t.kind) && a.district === b.district && a.family !== b.family) fail('family by another name');
        if (t.kind === 'crew' && a.gang !== b.gang) fail('crew of another gang');
        if (t.kind === 'coworker' && a.job.building !== b.job.building) fail('coworkers apart');
        // `to` is `from`'s parent: a generation older (an aunt or uncle can be any age).
        if (t.kind === 'parent' && b.age - a.age < 18) fail('a parent too young');
        if (t.kind === 'spouse' && Math.abs(a.age - b.age) > 12) fail('ages too far apart');
      }
      for (const p of population.people) if (!knows.get(p.id)) problems.push(`${world.seed} ${p.name} knows nobody`);
      const kinds = new Set(population.ties.map((t) => t.kind));
      for (const kind of ['friend', 'coworker', 'spouse', 'sibling'] as TieKind[]) if (!kinds.has(kind)) problems.push(`${world.seed} has no ${kind}`);
      // Blood runs across the city too.
      if (Object.keys(world.districts).length > 1 && !population.ties.some((t) => t.kind === 'cousin' && byId.get(t.from)?.district !== byId.get(t.to)?.district)) problems.push(`${world.seed}: no cousins across districts`);
    }
    expect(problems.slice(0, 10)).toEqual([]);
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
    // Over a working week, every storefront has its people in by day, and a bar or a club by night.
    for (const shop of world.buildings.filter((b) => b.business)) {
      // (A capsule hotel's night clerk is in by night; a place that never closes has hands on days and on nights.)
      const hours = shop.category === 'nightlife' && !allHours(shop) ? [21] : [11, 21];
      const staffed = [1, 2, 3, 4, 5].some((weekday) => hours.some((hour) => peopleAt(population, world, { kind: 'building', id: shop.id }, { hour, weekday, day: 100 + weekday }, FOOD.dishes).some((p) => p.person.job.building === shop.id)));
      expect(staffed, `${shop.name} is never open`).toBe(true);
    }
    // Night work keeps night hours: behind the bar at eleven at night, asleep at eight in the morning.
    const nights = population.people.filter((p) => worksNights(p, world) && p.job.building && p.home);
    expect(nights.length).toBeGreaterThan(0);
    for (const p of nights) expect(whereIs(p, world, { ...day, hour: 8 }, FOOD.dishes)?.doing, p.name).toBe('at home, asleep');
    const atTheBar = nights.filter((p) => whereIs(p, world, { ...day, hour: 23 }, FOOD.dishes)?.spot.id === p.job.building).length;
    expect(atTheBar).toBeGreaterThan(nights.length / 2);
    // At night the homes are full and the shops are not.
    const atHome = population.people.filter((p) => p.home && whereIs(p, world, { ...day, hour: 3 }, FOOD.dishes)?.spot.id === p.home).length;
    expect(atHome).toBeGreaterThan(population.people.filter((p) => p.home).length / 2);
    const evening = population.people.filter((p) => {
      const w = whereIs(p, world, { ...day, hour: 20 }, FOOD.dishes);
      return w && p.likes.hangout && w.spot.id === p.likes.hangout.id;
    }).length;
    expect(evening).toBeGreaterThan(population.people.length / 4);
  });

  it('sees people out and about at an open place near home, doing what people do there, and fills most of the city\'s open places by day', () => {
    const { world, population } = cities[0] as { world: World; population: Population };
    const { out } = PEOPLE;
    let seen = 0;
    for (const person of population.people.slice(0, 800)) {
      const haunt = hauntOf(person, world, out);
      if (!haunt) continue;
      const place = world.locations[haunt.id];
      expect(place?.district).toBe(person.district);
      expect(out.kinds[place?.kind ?? '']).toBeDefined();
      expect(hauntOf(person, world, out)).toBe(haunt);
      for (const hour of [7, 10, 13, 16, 20]) {
        const where = whereIs(person, world, { hour, weekday: 6, day: 100 }, FOOD.dishes, out);
        if (where?.spot.kind !== 'location' || where.spot.id !== haunt.id) continue;
        seen++;
        expect(out.kinds[place?.kind ?? '']).toContain(where.doing);
        // And it's where anyone there sees them.
        expect(peopleAt(population, world, haunt, { hour, weekday: 6, day: 100 }, FOOD.dishes, out).some((p) => p.person.id === person.id)).toBe(true);
      }
      // Without it, they're never there but as a hangout.
      if (person.likes.hangout?.id !== haunt.id) for (const hour of [7, 10, 13, 16, 20]) expect(whereIs(person, world, { hour, weekday: 6, day: 100 }, FOOD.dishes)?.spot.id).not.toBe(haunt.id);
    }
    expect(seen).toBeGreaterThan(50);
    // What they do there never reads as busy, eating or drinking.
    for (const doings of Object.values(out.kinds)) for (const doing of doings) expect(moodOf(doing), doing).toBe('easy');
    // At midday, nearly every open place in the city proper has someone there.
    const open = Object.values(world.locations).filter((l) => out.kinds[l.kind] && l.district !== 'badlands');
    const busy = open.filter((l) => peopleAt(population, world, { kind: 'location', id: l.id }, { hour: 12, weekday: 3, day: 100 }, FOOD.dishes, out).length > 0);
    expect(busy.length / open.length).toBeGreaterThan(0.8);
  });

  it('puts half the hands of a place that never closes on nights', () => {
    let nights = 0;
    let days = 0;
    for (const { world, population } of cities.slice(0, 6)) {
      for (const p of population.people) {
        const work = p.job.building ? world.buildings.find((b) => b.id === p.job.building) : undefined;
        if (!work || !allHours(work) || /\bnight\b/i.test(p.job.role)) continue;
        if (worksNights(p, world)) nights++;
        else days++;
      }
    }
    expect(nights).toBeGreaterThan(10);
    expect(days).toBeGreaterThan(10);
    expect(nights / (nights + days)).toBeGreaterThan(0.35);
    expect(nights / (nights + days)).toBeLessThan(0.65);
  });

  it('give everyone a heart: whom they are drawn to, what wins them over, the look they like; the same every time, and their spouse among them', () => {
    let people = 0;
    let none = 0;
    let everyone = 0;
    let styled = 0;
    const wants = new Set<string>();
    for (const { world, population } of cities.slice(0, 20)) {
      for (const person of population.people) {
        const heart = heartOf(person, world, PEOPLE, population);
        expect(heartOf(person, world, PEOPLE, population), person.name).toEqual(heart);
        expect(new Set(heart.drawnTo).size, person.name).toBe(heart.drawnTo.length);
        for (const tie of tiesOf(population, person.id)) {
          const spouse = tie.kind === 'spouse' ? population.people.find((p) => p.id === tie.to) : undefined;
          if (spouse) expect(drawnTo(heart, spouse.pronouns), `${person.name} and ${spouse.name}`).toBe(true);
        }
        people++;
        if (!heart.drawnTo.length) none++;
        if (heart.drawnTo.length === 3) everyone++;
        if (heart.style) styled++;
        wants.add(heart.wants);
      }
    }
    // Most are drawn to someone, a good share to anyone, a few to no one; most go for a look; every way in wins someone.
    expect(none / people).toBeGreaterThan(0.01);
    expect(none / people).toBeLessThan(0.15);
    expect(everyone / people).toBeGreaterThan(0.15);
    expect(styled / people).toBeGreaterThan(0.4);
    expect([...wants].sort()).toEqual(['care', 'chat', 'compliment', 'gossip', 'joke']);
  });

  it('never names anyone after a real character', () => {
    // Every character page of the wiki's 2077, Edgerunners, comic, fixer and vendor categories (titles, without any "(2077)").
    const real = new Set(readFileSync(new URL('./fixtures/canon-characters.txt', import.meta.url), 'utf8').split('\n').map((n) => n.replace(/ \(.*\)$/, '').trim().toLowerCase()).filter(Boolean));
    expect(real.size).toBeGreaterThan(500);
    // No name a community's pools can put together is one, whoever ends up with it.
    const composable = Object.entries(PEOPLE.names).flatMap(([pool, { masculine, feminine, family }]) => [...masculine, ...feminine].flatMap((given) => family.map((f) => `${pool}: ${given} ${f}`)));
    expect(composable.filter((n) => real.has(n.slice(n.indexOf(': ') + 2).toLowerCase()))).toEqual([]);
    for (const { population } of cities) expect(population.people.filter((p) => real.has(p.name.toLowerCase())).map((p) => p.name)).toEqual([]);
    // And the city is big enough for its names: nobody needs a number to tell them apart.
    for (const { world, population } of cities) expect(population.people.filter((p) => /\d/.test(p.name)).map((p) => p.name), world.seed).toEqual([]);
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

describe("people's own levels", () => {
  it('come from who they are: gangers and guards fight, corpos and the old talk, and nobody past the most', () => {
    const { world, population } = cities[0]!;
    const by: Record<string, PersonSkills[]> = {};
    for (const p of population.people) (by[walkOf(p, world)] ??= []).push(skillsOf(p, world, PEOPLE));
    const mean = (walk: string, skill: keyof PersonSkills) => by[walk]!.reduce((n, s) => n + s[skill], 0) / by[walk]!.length;
    const fighting = (walk: string) => mean(walk, 'brawler') + mean(walk, 'toughness') + mean(walk, 'arms');
    expect(fighting('gang')).toBeGreaterThan(fighting('street'));
    expect(fighting('guard')).toBeGreaterThan(fighting('street'));
    expect(fighting('street')).toBeGreaterThan(fighting('elder'));
    expect(fighting('street')).toBeGreaterThan(fighting('corpo'));
    expect(mean('elder', 'charisma')).toBeGreaterThan(mean('gang', 'charisma') + 2);
    expect(mean('corpo', 'charisma')).toBeGreaterThan(mean('gang', 'charisma') + 2);
    for (const list of Object.values(by)) for (const s of list) for (const v of Object.values(s)) expect(v >= 1 && v <= PEOPLE.skills!.most).toBe(true);
  });

  it('are the same every time, and everyone ordinary without the profiles', () => {
    const { world, population } = cities[1]!;
    const person = population.people[7]!;
    expect(skillsOf(person, world, PEOPLE)).toEqual(skillsOf(person, world, PEOPLE));
    expect(skillsOf(person, world, { ...PEOPLE, skills: undefined })).toEqual({ brawler: 4, toughness: 4, arms: 4, charisma: 4, trading: 4, dealing: 4, cutting: 4 });
  });

  it('read as a word, the first step whose top they are under', () => {
    const steps = PEOPLE.skills!.reads.fight;
    expect(readOf(1, steps)).toBe('Harmless');
    expect(readOf(4, steps)).toBe('Ordinary');
    expect(readOf(9, steps)).toBe('Dangerous');
    expect(readOf(99, steps)).toBe('Dangerous');
  });
});

