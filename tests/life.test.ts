import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { LIFE } from '../src/data/life';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { GEAR } from '../src/data/gear';
import { turfFrom } from '../src/engine/economy';
import { bossOf } from '../src/engine/jobs';
import { drawQuality, menuFor, type Quality } from '../src/engine/food';
import { applyLife, freshLife, liveUntil, newsFor, scenesAt, tieKey, type LifeEvent } from '../src/engine/life';
import { allHours, drawnTo, generatePeople, heartOf, hospitalOf, INVERSE, leastStaff, peopleAt, tiesOf, whereIs, type Person, type Population, type Spot } from '../src/engine/people';
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

function lived(seed: string, days: number, from = T, spokenFor: ReadonlySet<string> = new Set()) {
  const world = generateWorld(seed, CITY);
  const population = generatePeople(world, PEOPLE, FOOD.dishes);
  const base = new Map(population.people.map((p) => [p.id, p.eddies]));
  const state = freshLife();
  const events: LifeEvent[] = [];
  for (let day = from; day < from + days; day++) events.push(...liveUntil(world, population, state, LIFE, base, day, seed, tierIn(world), turf, PEOPLE, spokenFor));
  return { world, population, base, state, events };
}

describe("the people's own days", () => {
  it('leave people holding what was done to them against whoever did it, never befriending or falling for them, till it is made up or settled', () => {
    const rules = LIFE.held!;
    for (const seed of seeds.slice(0, 3)) {
      const { population, state, events } = lived(seed, 60);
      const end = T + 59;
      const holds = (holder: string, by: string, kind: string, before = Infinity) => (state.held?.[holder] ?? []).some((h) => h.by === by && h.kind === kind && h.day < before);
      const alive = (id: string) => population.people.find((p) => p.id === id)?.diedOn === undefined;
      const later = (e: LifeEvent, kinds: string[]) => events.some((f) => f.day >= e.day && f.id !== e.id && kinds.includes(f.kind) && f.who.includes(e.who[0]) && f.who.includes(e.who[1]));
      let checked = 0;
      for (const e of events) {
        if (end - e.day > 10 || !alive(e.who[1]) || !alive(e.who[0])) continue;
        const [a, b] = e.who;
        // Robbed, shaken down, beaten, left, let go: held against whoever did it, unless they've had it out since.
        const kind = { robbery: 'robbed', shakedown: 'shook', fight: 'beaten', breakup: 'dumped', laidOff: 'laidOff' }[e.kind as string];
        if (kind && !later(e, ['fight', 'death'])) {
          expect(holds(b, a, kind), `${seed} ${e.kind} day ${e.day}: ${b} holds it against ${a}`).toBe(true);
          checked++;
        }
        // A falling out is held both ways, till they make up.
        if (e.kind === 'fallout' && !later(e, ['makeup'])) expect(holds(a, b, 'fallout') && holds(b, a, 'fallout'), `${seed} fallout day ${e.day}`).toBe(true);
        if (e.kind === 'makeup') expect(holds(a, b, 'fallout', e.day + 1) || holds(b, a, 'fallout', e.day + 1), `${seed} makeup day ${e.day}`).toBe(false);
      }
      expect(checked, seed).toBeGreaterThan(0);
      // Nobody makes a friend of, or falls for, someone either of them holds something against.
      for (const e of events.filter((e) => e.kind === 'friends' || e.kind === 'romance')) {
        const [a, b] = e.who;
        const before = (x: string, y: string) => (state.held?.[x] ?? []).some((h) => h.by === y && h.day < e.day && e.day - h.day < rules.days[h.kind]);
        expect(before(a, b) || before(b, a), `${seed} ${e.kind} day ${e.day} between a feud`).toBe(false);
      }
      // Nobody holds more than the cap, or anything past its days at the end.
      for (const list of Object.values(state.held ?? {})) expect(list.length).toBeLessThanOrEqual(rules.cap);
    }
  });

  it('have someone with the nerve go for whoever robbed them, and let it go once they win', () => {
    const seed = seeds[3] as string;
    const world = generateWorld(seed, CITY);
    const population = generatePeople(world, PEOPLE, FOOD.dishes);
    const base = new Map(population.people.map((p) => [p.id, p.eddies]));
    // Two civilians of one district: one robbed the other a week ago.
    const district = Object.keys(world.districts)[0] as string;
    const [victim, robber] = population.people.filter((p) => p.district === district && !p.gang && p.diedOn === undefined) as [Person, Person];
    victim.traits.courage = 0.95;
    const state = freshLife();
    state.day = T - 1;
    state.held = { [victim.id]: [{ kind: 'robbed', by: robber.id, day: T - 7 }] };
    const only = { ...LIFE, chances: Object.fromEntries(Object.keys(LIFE.chances).map((k) => [k, 0])) as typeof LIFE.chances, held: { ...LIFE.held!, revenge: 1 } };
    const events = liveUntil(world, population, state, only, base, T, seed, tierIn(world), turf, PEOPLE);
    const fight = events.find((e) => e.kind === 'fight' && e.who.includes(victim.id) && e.who.includes(robber.id));
    expect(fight, 'they go for the robber').toBeDefined();
    const won = fight!.who[0] === victim.id;
    expect((state.held?.[victim.id] ?? []).some((h) => h.by === robber.id && h.kind === 'robbed')).toBe(!won);
    // Lost, they hold the beating too; won, the robber does.
    if (won) expect((state.held?.[robber.id] ?? []).some((h) => h.by === victim.id && h.kind === 'beaten')).toBe(true);
    else expect((state.held?.[victim.id] ?? []).some((h) => h.by === robber.id && h.kind === 'beaten')).toBe(true);
    // Brought back onto a fresh population, what's held is kept for the people the city has, and anyone else's goes.
    const fresh = generatePeople(world, PEOPLE, FOOD.dishes);
    const again = structuredClone(state);
    again.held!['nobody-at-all'] = [{ kind: 'robbed', by: robber.id, day: T }];
    applyLife(fresh, again);
    expect(again.held!['nobody-at-all']).toBeUndefined();
    expect(again.held![victim.id] ?? again.held![robber.id]).toBeDefined();
  });

  it('show it when someone is in a room with whoever they hold something against, from both sides', () => {
    const world = generateWorld(seeds[0] as string, CITY);
    const population = generatePeople(world, PEOPLE, FOOD.dishes);
    const [a, b] = population.people.slice(0, 2) as [Person, Person];
    const held = (id: string) => (id === a.id ? [{ kind: 'robbed' as const, by: b.id, day: T }] : []);
    const spot = { kind: 'building' as const, id: world.buildings[0]!.id };
    const scenes = scenesAt([a, b], population, spot, { day: T, hour: 20, weekday: 3 }, world, PEOPLE.turf, () => [], { ...LIFE, glaring: 1 }, 'scene', held);
    expect(scenes.get(a.id)).toMatchObject({ with: b.id, kind: 'grudge' });
    expect(scenes.get(b.id)).toMatchObject({ with: a.id, kind: 'grudged' });
    expect(LIFE.scenes.grudge).toHaveLength(LIFE.scenes.grudged.length);
  });

  it('fill a place short of the hands its shifts want, never lay one off below them, and keep the new hands on its rota', () => {
    const seed = seeds[1] as string;
    const world = generateWorld(seed, CITY);
    const population = generatePeople(world, PEOPLE, FOOD.dishes);
    const base = new Map(population.people.map((p) => [p.id, p.eddies]));
    const state = freshLife();
    const shifts = PEOPLE.shifts!;
    // A place that never closes, two of its hands dead before the days begin.
    const shop = world.buildings.find((b) => b.business && allHours(b) && b.business !== 'hospital' && population.people.some((p) => p.district === b.district && LIFE.jobless.includes(p.job.role))) as World['buildings'][number];
    const least = leastStaff(shop, shifts);
    const hands = population.people.filter((p) => p.job.building === shop.id);
    for (const p of hands.slice(0, 2)) {
      p.diedOn = T - 1;
      state.dead[p.id] = T - 1;
    }
    const busy = { ...LIFE, chances: Object.fromEntries(Object.keys(LIFE.chances).map((k) => [k, k === 'hired' || k === 'laidOff' ? 1 : 0])) as typeof LIFE.chances, perDistrict: 6 };
    const staffOf = (id: string) => population.people.filter((p) => p.job.building === id && p.diedOn === undefined);
    const before = new Map(world.buildings.filter((b) => b.business).map((b) => [b.id, staffOf(b.id).length]));
    for (let day = T; day < T + 30; day++) liveUntil(world, population, state, busy, base, day, seed, tierIn(world), turf, PEOPLE);
    expect(staffOf(shop.id).length).toBeGreaterThanOrEqual(least);
    // No place let anyone go below what its shifts want (or what it had, if it was short to begin with).
    for (const b of world.buildings.filter((b) => b.business)) expect(staffOf(b.id).length, b.name).toBeGreaterThanOrEqual(Math.min(leastStaff(b, shifts), before.get(b.id) ?? 0));
    // The new hands work its rota with the rest: someone's in every hour of the day.
    const day = T + 30;
    for (let hour = 0; hour < 24; hour++) expect(staffOf(shop.id).some((p) => whereIs(p, world, { day, hour, weekday: (day + 4) % 7 }, FOOD.dishes)?.spot.id === shop.id), `${shop.name} at ${hour}`).toBe(true);
  });

  it('bring together only people drawn to each other, and never anyone the player is seeing', () => {
    // Everyone in the first few districts is spoken for, as if the player were seeing them.
    const world = generateWorld(seeds[0] as string, CITY);
    const taken = new Set(generatePeople(world, PEOPLE, FOOD.dishes).people.filter((p) => p.district === Object.keys(world.districts)[0]).map((p) => p.id));
    const { population, events } = lived(seeds[0] as string, 120, T, taken);
    const romances = events.filter((e) => e.kind === 'romance');
    expect(romances.length).toBeGreaterThan(0);
    for (const e of romances) {
      const [a, b] = e.who.map((id) => population.people.find((p) => p.id === id) as Person);
      expect(drawnTo(heartOf(a as Person, world, PEOPLE, population), (b as Person).pronouns), `${a?.name} → ${b?.name}`).toBe(true);
      expect(drawnTo(heartOf(b as Person, world, PEOPLE, population), (a as Person).pronouns), `${b?.name} → ${a?.name}`).toBe(true);
      for (const id of e.who) expect(taken.has(id), id).toBe(false);
    }
  });

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
    // Living a day at a time is the same as catching up on a month of them at once, as a phone left in a drawer does.
    const daily = lived('7f3a29c1', 16 + LIFE.catchUpDays);
    const caught = lived('7f3a29c1', 16);
    liveUntil(caught.world, caught.population, caught.state, LIFE, caught.base, T + 15 + LIFE.catchUpDays, '7f3a29c1', tierIn(caught.world), turf, PEOPLE);
    expect(caught.state.day).toBe(daily.state.day);
    expect(caught.state).toEqual(daily.state);
    expect(caught.population.people).toEqual(daily.population.people);
    expect(sortedTies(caught.population)).toEqual(sortedTies(daily.population));
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
      const staffOf = (people: Person[]) => {
        const by = new Map<string, Person[]>();
        for (const p of people) if (p.job.building && p.diedOn === undefined) by.set(p.job.building, [...(by.get(p.job.building) ?? []), p]);
        return by;
      };
      const [now, then] = [staffOf(population.people), staffOf(fresh.people)];
      const changed = world.buildings.filter((x) => x.business && bossOf(x, population, now.get(x.id) ?? [])?.id !== bossOf(x, fresh, then.get(x.id) ?? [])?.id);
      expect(changed.map((x) => x.name), seed).toEqual([]);
      // One living partner or spouse each at most; every couple has the day it got together, and every tie runs both ways.
      const crowded = population.people.filter((p) => p.diedOn === undefined && tiesOf(population, p.id).filter((t) => (t.kind === 'spouse' || t.kind === 'partner') && alive(t.to)).length > 1);
      expect(crowded.map((p) => p.name), seed).toEqual([]);
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

  it('keeps the laid up in the hospital nearest home, all day', () => {
    const { world, population, events } = lived(seeds[0] as string, 20);
    // A fight whose loser is still alive (the dead are nowhere, laid up or not).
    const fight = events.find((e) => e.kind === 'fight' && population.people.find((p) => p.id === e.who[1])?.diedOn === undefined);
    expect(fight).toBeDefined();
    if (fight) {
      const loser = population.people.find((p) => p.id === fight.who[1]) as Person;
      // Laid up for a couple of days, in this population.
      const hurt = loser;
      hurt.hurtUntil = fight.day + 2;
      const ward = hospitalOf(loser, world);
      expect(ward).not.toBeNull();
      for (const hour of [3, 11, 20]) {
        const clock = { hour, weekday: 2, day: fight.day + 1 };
        const where = whereIs(hurt, world, clock, FOOD.dishes);
        expect(where?.spot, `${loser.name} at ${hour}`).toEqual(ward);
        expect(where?.doing).toMatch(/hospital bed/);
        // And anyone at the hospital then sees them there.
        expect(peopleAt(population, world, ward!, clock, FOOD.dishes).map((p) => p.person.id)).toContain(loser.id);
      }
      expect(whereIs(hurt, world, { hour: 11, weekday: 2, day: fight.day + 3 }, FOOD.dishes)?.doing ?? '').not.toMatch(/laid up|hospital bed/);
    }
  });

  it('gives everyone news to tell from their own side of it, and pairs people up where they are', () => {
    const { world, population, state } = lived(seeds[1] as string, 10);
    const byId = new Map(population.people.map((p) => [p.id, p]));
    let told = 0;
    for (const p of population.people) {
      const news = newsFor(p, population, state, LIFE, state.day);
      if (!news) continue;
      told++;
      // A death or a wedding stays news longer (`lasting`).
      expect(news.event.day).toBeGreaterThan(state.day - (LIFE.lasting[news.event.kind] ?? LIFE.newsDays));
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
    // A ganger on their turf and the help behind a counter, who are nothing to each other (people who are, are at that instead).
    const ganger = population.people.find((p) => p.gang && (PEOPLE.turf[p.district] ?? []).some(([g]) => g === p.gang)) as Person;
    const strangers = (p: Person) => p.job.building && !tiesOf(population, ganger.id).some((t) => t.to === p.id);
    const shop = world.buildings.find((b) => b.district === ganger.district && b.business && population.people.some((p) => p.job.building === b.id && strangers(p)));
    if (shop) {
      const worker = population.people.find((p) => p.job.building === shop.id && strangers(p)) as Person;
      const scenes = scenesAt([ganger, worker], population, { kind: 'building', id: shop.id }, { hour: 11, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], sure, world.seed);
      expect(scenes.get(ganger.id)).toMatchObject({ with: worker.id, kind: 'shakedown' });
      // The help has their side of it: leaned on by whoever's leaning.
      const leaning = LIFE.scenes.shakedown.indexOf(scenes.get(ganger.id)?.phrase ?? '');
      expect(scenes.get(worker.id)).toEqual({ with: ganger.id, kind: 'leanedOn', phrase: LIFE.scenes.leanedOn[leaning] });
    }
    // Drawn the same for the place and the hour (hours go in threes), and nobody paired with themselves or twice.
    const here = population.people.slice(0, 12);
    const spot = { kind: 'location' as const, id: Object.keys(world.locations)[0] as string };
    const once = scenesAt(here, population, spot, { hour: 19, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], LIFE, world.seed);
    expect(scenesAt(here, population, spot, { hour: 20, weekday: 2, day: T }, world, PEOPLE.turf, (g) => PEOPLE.gangs[g]?.rivals ?? [], LIFE, world.seed)).toEqual(once);
    for (const [id, scene] of once) {
      expect(scene.with).not.toBe(id);
      expect(once.get(scene.with)?.with).toBe(id);
    }
    void tiesOf;
  });
});
