import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { accountOf, economyDay, ledgerOf, turfFrom, weekdayOf, type EconomyRules, type Flows } from '../src/engine/economy';
import { drawQuality, menuFor, type Quality } from '../src/engine/food';
import { Game, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { bossOf, runsIt } from '../src/engine/jobs';
import { applyLife, freshLife, liveUntil, type LifeRules, type LifeState } from '../src/engine/life';
import { buildingById, generatePeople, tiesOf, type Person, type Population, type Spot } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { createSave, progressFor, readSave, type Progress, type SaveData } from '../src/engine/save';
import type { Building, World } from '../src/engine/types';

const seeds = Array.from({ length: 3 }, (_, i) => createRng(`hard-${i}`).next().toString(16).slice(2, 10));
const T = 39366;
const ECONOMY: EconomyRules = LIFE.economy;
const HARD = ECONOMY.hard!;
const turf = turfFrom(PEOPLE.turf);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, jobs: JOBS, life: LIFE, gear: GEAR, money: MONEY, combat: COMBAT };
/** Nothing left to chance but what a test asks for. */
const QUIET = Object.fromEntries(Object.keys(LIFE.chances).map((k) => [k, 0])) as LifeRules['chances'];
const quiet = (hard: Partial<NonNullable<LifeRules['hard']>> = {}, chances: Partial<LifeRules['chances']> = {}): LifeRules => ({ ...LIFE, chances: { ...QUIET, ...chances }, held: { ...LIFE.held!, revenge: 0 }, hard: { ...LIFE.hard!, collect: { ...LIFE.hard!.collect, chance: 0 }, recruit: { ...LIFE.hard!.recruit, chance: 0 }, ...hard } });

function tierIn(world: World): (spot: Spot) => Quality {
  const known = new Map<string, Quality>();
  return (spot) => {
    const key = `${spot.kind}:${spot.id}`;
    const had = known.get(key);
    if (had) return had;
    const at = spot.kind === 'building' ? buildingById(world, spot.id) : world.locations[spot.id];
    const business = spot.kind === 'building' ? (at as { business: string | null } | undefined)?.business : null;
    const tier = !at ? 'everyday' : (menuFor(world, at, FOOD)?.venue.quality ?? (business ? GEAR.quality[business] : undefined) ?? drawQuality(world, at));
    known.set(key, tier);
    return tier;
  };
}

interface City {
  seed: string;
  world: World;
  population: Population;
  base: Map<string, number>;
  state: LifeState;
  tier: (spot: Spot) => Quality;
}

function city(seed: string): City {
  const world = generateWorld(seed, CITY);
  const population = generatePeople(world, PEOPLE, FOOD.dishes);
  return { seed, world, population, base: new Map(population.people.map((p) => [p.id, p.eddies])), state: freshLife(), tier: tierIn(world) };
}

const day = (c: City, d: number): Flows => economyDay({ world: c.world, population: c.population, state: c.state, rules: ECONOMY, tier: c.tier, turf, base: c.base, seed: c.seed, day: d, ties: (id) => tiesOf(c.population, id) });
const live = (c: City, d: number, rules: LifeRules = LIFE) => liveUntil(c.world, c.population, c.state, rules, c.base, d, c.seed, c.tier, turf, PEOPLE);
const ledger = (c: City, p: Person) => ledgerOf(p, c.world, c.population, ECONOMY, c.tier, c.seed);
const money = (c: City, p: Person) => p.eddies + accountOf(p, c.state, ledger(c, p), ECONOMY);
const nextDay = (from: number, weekday: number) => from + ((weekday - weekdayOf(from) + 7) % 7);
const FAMILY = new Set(['spouse', 'partner', 'parent', 'child', 'sibling', 'cousin', 'uncle', 'nephew', 'kin']);
/** The gang a district's loan shark is: the one with the most of its turf. */
const lender = (district: string) => [...turf(district)].sort((a, b) => b[1] - a[1])[0]?.[0];

describe('hard times', () => {
  it("lends to whoever still can't make the week on payday, from the gang with the most of their turf, at interest, and takes it back out of what they have over a week", () => {
    for (const seed of seeds) {
      const c = city(seed);
      day(c, T);
      const payday = nextDay(T + 1, ECONOMY.payday);
      // Someone with no family to help, no gang, and nothing coming in: they'll need the shark.
      const index = new Map(c.population.people.map((p, i) => [p.id, i]));
      const p = c.population.people.find((q) => !q.gang && lender(q.district) && ledger(c, q).earner === 'none' && ledger(c, q).essentials > 0 && !tiesOf(c.population, q.id).some((t) => FAMILY.has(t.kind)) && (index.get(q.id) as number) % 7 !== weekdayOf(payday)) as Person;
      expect(p, seed).toBeDefined();
      for (let d = T + 1; d < payday; d++) day(c, d);
      const gang = lender(p.district) as string;
      c.state.treasuries[gang] = 10_000;
      p.eddies = 0;
      (c.state.savings as Record<string, number>)[p.id] = 0;
      day(c, payday);
      const debt = c.state.debts?.[p.id];
      const l = ledger(c, p);
      expect(debt, seed).toMatchObject({ gang, since: payday, paid: payday });
      expect(debt?.owed, seed).toBe(Math.min(Math.ceil(l.essentials), Math.round(HARD.loan.weeks * l.essentials)));
      expect(money(c, p), seed).toBe(debt?.owed);
      // A week on, it's grown by the interest, and they've borrowed the rest of what they may.
      const owed = debt?.owed as number;
      for (let d = payday + 1; d <= payday + 7; d++) day(c, d);
      expect(c.state.debts?.[p.id]?.owed, seed).toBeGreaterThanOrEqual(Math.min(Math.ceil(HARD.loan.most * l.essentials), Math.ceil(owed * (1 + HARD.loan.interest))));
      expect(c.state.debts?.[p.id]?.owed, seed).toBeLessThanOrEqual(Math.ceil(HARD.loan.most * l.essentials));
      // Flush again, they pay it all back on their day of the week, to the gang's chest.
      (c.state.savings as Record<string, number>)[p.id] = 100_000;
      const chest = c.state.treasuries[gang] as number;
      const back = c.state.debts?.[p.id]?.owed as number;
      const theirs = nextDay(payday + 8, (index.get(p.id) as number) % 7);
      for (let d = payday + 8; d <= theirs; d++) day(c, d);
      expect(c.state.debts?.[p.id], seed).toBeUndefined();
      if (theirs !== nextDay(payday + 8, ECONOMY.payday)) expect(c.state.treasuries[gang], seed).toBeGreaterThanOrEqual(chest + back);
    }
  });

  it('has someone bold who cannot pay for the week\'s food walk out with some of it: the shelves go down, the till does not go up', () => {
    const c = city(seeds[0] as string);
    for (let d = T; d < T + 3; d++) day(c, d);
    const index = new Map(c.population.people.map((p, i) => [p.id, i]));
    const d = nextDay(T + 3, (ECONOMY.payday + 2) % 7);
    const bold = c.population.people.filter((p) => {
      const g = ledger(c, p).grocer;
      return (index.get(p.id) as number) % 7 === weekdayOf(d) && p.traits.courage + p.traits.greed >= HARD.lift.nerve && g?.kind === 'building' && !c.state.closed?.[g.id] && (c.state.tills[g.id]?.stock ?? 1) > 0.5 && (c.state.hurt[p.id] ?? -1) < d;
    });
    expect(bold.length).toBeGreaterThan(0);
    for (let k = T + 3; k < d; k++) day(c, k);
    for (const p of bold) {
      p.eddies = 0;
      (c.state.savings as Record<string, number>)[p.id] = 0;
    }
    day(c, d);
    const lifted = c.world.buildings.filter((b) => (c.state.tills[b.id]?.lifted ?? 0) > 0);
    expect(lifted.length).toBeGreaterThan(0);
    expect(lifted.every((b) => b.business)).toBe(true);
  });

  it("closes a storefront that can't pay its people paydays running: what's left in the till to its boss, a headline, and nothing taken or paid till it opens again; never a corp's, a bank, a hospital or a real place", () => {
    for (const seed of seeds) {
      const c = city(seed);
      day(c, T);
      const payday = nextDay(T + 1, ECONOMY.payday);
      for (let d = T + 1; d < payday; d++) day(c, d);
      const staffOf = (b: Building) => c.population.people.filter((p) => p.job.building === b.id && p.diedOn === undefined);
      const shops = c.world.buildings.filter((b) => b.business && staffOf(b).length >= 2);
      const named = new Set(HARD.close.never.names);
      const own = shops.find((b) => !ECONOMY.owners.corp.includes(b.business as string) && !HARD.close.never.businesses.includes(b.business as string) && !named.has(b.name)) as Building;
      const corp = shops.find((b) => ECONOMY.owners.corp.includes(b.business as string)) as Building;
      const real = c.world.buildings.find((b) => b.business && named.has(b.name) && !ECONOMY.owners.corp.includes(b.business as string) && staffOf(b).length);
      for (const b of [own, corp, real]) {
        if (!b) continue;
        const till = c.state.tills[b.id] as NonNullable<LifeState['tills'][string]>;
        till.cash = 10;
        till.lean = HARD.close.weeks - 1;
      }
      const boss = bossOf(own, c.population) as Person;
      const had = money(c, boss);
      day(c, payday);
      const closure = c.state.closed?.[own.id];
      expect(closure, seed).toBeDefined();
      expect(closure?.day).toBe(payday);
      expect(closure!.until - payday).toBeGreaterThanOrEqual(HARD.close.days[0]);
      expect(closure!.until - payday).toBeLessThanOrEqual(HARD.close.days[1]);
      expect(c.state.tills[own.id]?.cash, seed).toBe(0);
      expect(money(c, boss), seed).toBeGreaterThanOrEqual(had);
      expect(c.state.market?.news.at(-1), seed).toMatchObject({ kind: 'closed', building: own.id, district: own.district });
      expect(c.state.closed?.[corp.id], seed).toBeUndefined();
      if (real) expect(c.state.closed?.[real.id], `${seed} ${real.name}`).toBeUndefined();
      // Shut, it takes nothing, pays nothing and sells nothing.
      const till = c.state.tills[own.id] as NonNullable<LifeState['tills'][string]>;
      const days = till.days.length;
      till.pending = 40;
      for (let d = payday + 1; d <= payday + 8; d++) day(c, d);
      expect(till.cash, seed).toBe(0);
      expect(till.days.length, seed).toBe(days);
      expect(till.pending).toBe(0);
    }
  });

  it('lets the people of a storefront gone under go, and has new management take it on after: someone from the neighborhood runs it, a few work it, and its books start afresh', () => {
    for (const seed of seeds) {
      const c = city(seed);
      live(c, T);
      const shop = c.world.buildings.find((b) => {
        const staff = c.population.people.filter((p) => p.job.building === b.id && p.diedOn === undefined);
        return b.business && !ECONOMY.owners.corp.includes(b.business) && staff.length >= 2;
      }) as Building;
      const staff = c.population.people.filter((p) => p.job.building === shop.id && p.diedOn === undefined);
      const boss = bossOf(shop, c.population) as Person;
      (c.state.closed ??= {})[shop.id] = { day: T + 1, until: T + 4 };
      (c.state.tills[shop.id] as { cash: number }).cash = 0;
      const events = live(c, T + 1, quiet());
      for (const p of staff) {
        expect(p.job.building, `${seed} ${p.name}`).toBeNull();
        expect(c.state.jobs[p.id], `${seed} ${p.name}`).toMatchObject({ building: null, day: T + 1, was: shop.id });
        expect(tiesOf(c.population, p.id).some((t) => t.kind === 'coworker' && staff.some((s) => s.id === t.to)), p.name).toBe(false);
      }
      expect(c.state.jobs[boss.id]?.ran).toBe(true);
      expect(events.find((e) => e.kind === 'closed'), seed).toMatchObject({ who: [boss.id, staff.find((p) => p !== boss)?.id], where: { kind: 'building', id: shop.id } });
      const reopened = live(c, T + 4, quiet()).find((e) => e.kind === 'reopened');
      expect(reopened, seed).toBeDefined();
      expect(c.state.closed?.[shop.id], seed).toBeUndefined();
      const crew = c.population.people.filter((p) => p.job.building === shop.id && p.diedOn === undefined);
      const runs = bossOf(shop, c.population) as Person;
      expect(crew.length, seed).toBeGreaterThanOrEqual(1);
      expect(runs.id, seed).toBe(reopened?.who[0]);
      expect(runsIt(runs.job.role), runs.job.role).toBe(true);
      for (const p of crew) {
        expect(p.hiredOn, p.name).toBe(T + 4);
        expect(p.district, p.name).toBe(shop.district);
        if (p !== runs) expect(runsIt(p.job.role), p.job.role).toBe(false);
      }
      expect(c.state.market?.news.at(-1), seed).toMatchObject({ kind: 'reopened', building: shop.id });
      // Its books start afresh, with a float from the new management the next day the eddies move.
      expect(c.state.tills[shop.id]?.cash, seed).toBeUndefined();
      expect(c.state.tills[shop.id]?.failed, seed).toBeUndefined();
      live(c, T + 5, quiet());
      expect(c.state.tills[shop.id]?.cash, seed).toBeGreaterThan(0);
      // Put back onto a population made fresh for the seed, the new management is there.
      const again = generatePeople(c.world, PEOPLE, FOOD.dishes);
      applyLife(again, structuredClone(c.state));
      expect(bossOf(shop, again)?.id, seed).toBe(runs.id);
    }
  });

  it('puts out a tenant three weeks behind on the rent, with whoever they live with, to a squat in their district or the street, writes off what they owed, and has them find a place again once they can pay for one', () => {
    for (const seed of seeds) {
      const c = city(seed);
      live(c, T);
      const tenant = c.population.people.find((p) => {
        const l = ledger(c, p);
        return p.diedOn === undefined && !p.gang && l.landlord && l.rent > 0 && c.population.people.find((q) => q.id === l.landlord)?.diedOn === undefined && ['watson', 'pacifica'].includes(p.district);
      }) as Person;
      expect(tenant, seed).toBeDefined();
      const from = tenant.home as string;
      const landlord = ledger(c, tenant).landlord as string;
      const household = tiesOf(c.population, tenant.id).filter((t) => ['spouse', 'partner', 'parent', 'child', 'sibling'].includes(t.kind)).map((t) => c.population.people.find((p) => p.id === t.to) as Person).filter((p) => p.home === from && p.diedOn === undefined);
      const owed = HARD.evict * ledger(c, tenant).rent;
      (c.state.arrears ??= {})[tenant.id] = owed;
      const events = live(c, T + 1, quiet());
      const out = events.find((e) => e.kind === 'evicted' && e.who[1] === tenant.id);
      expect(out, seed).toMatchObject({ who: [landlord, tenant.id], took: owed, where: { kind: 'building', id: from } });
      const squat = tenant.home ? buildingById(c.world, tenant.home) : null;
      expect(tenant.home === null || (squat?.district === tenant.district && ['derelict', 'shack'].includes(squat.kind)), `${seed} ${squat?.name}`).toBe(true);
      expect(c.state.arrears?.[tenant.id]).toBeUndefined();
      for (const p of [tenant, ...household]) expect(c.state.homes?.[p.id], p.name).toMatchObject({ home: tenant.home, from, day: T + 1, why: 'evicted' });
      expect(ledger(c, tenant).rent).toBe(0);
      expect(c.state.held?.[tenant.id]?.some((h) => h.kind === 'evicted' && h.by === landlord), seed).toBe(true);
      // Put back onto a population made fresh for the seed, they're where they went.
      const again = generatePeople(c.world, PEOPLE, FOOD.dishes);
      applyLife(again, structuredClone(c.state));
      expect(again.people.find((p) => p.id === tenant.id)?.home, seed).toBe(tenant.home);
      // With the money put by, two weeks on and they've a place again: one of the district's cheapest blocks.
      (c.state.savings as Record<string, number>)[tenant.id] = 100_000;
      for (let d = T + 2; d <= T + 1 + LIFE.hard!.rehouse.after; d++) live(c, d, quiet());
      const home = tenant.home ? buildingById(c.world, tenant.home) : undefined;
      expect(home?.district, seed).toBe(tenant.district);
      expect(['apartments', 'megabuilding'].includes(home?.kind ?? ''), `${seed} ${home?.kind}`).toBe(true);
      expect(c.state.homes?.[tenant.id], seed).toMatchObject({ why: 'housed', day: T + 1 + LIFE.hard!.rehouse.after });
    }
  });

  it("sends a loan shark's collector for someone who hasn't paid a cent in too long: a beating, and what's on them toward it", () => {
    for (const seed of seeds) {
      const c = city(seed);
      live(c, T);
      const debtor = c.population.people.find((p) => !p.gang && p.diedOn === undefined && c.population.people.some((g) => g.gang === lender(p.district) && g.district === p.district && g.diedOn === undefined)) as Person;
      const gang = lender(debtor.district) as string;
      (c.state.debts ??= {})[debtor.id] = { gang, owed: 500, since: T - 30, paid: T - 30 };
      debtor.eddies = 60;
      c.state.eddies[debtor.id] = 60;
      const chest = c.state.treasuries[gang] ?? 0;
      const events = live(c, T + 1, quiet({ collect: { chance: 1, late: LIFE.hard!.collect.late } }));
      const visit = events.find((e) => e.kind === 'collected' && e.who[1] === debtor.id);
      expect(visit, seed).toMatchObject({ gang, took: 60 });
      expect(c.population.people.find((p) => p.id === visit?.who[0])?.gang).toBe(gang);
      expect(debtor.eddies).toBe(0);
      expect(c.state.debts?.[debtor.id]).toMatchObject({ owed: 440, paid: T + 1 });
      expect(c.state.hurt[debtor.id]).toBeGreaterThan(T + 1);
      // The chest has its cut of the day's takings too.
      expect(c.state.treasuries[gang]).toBeGreaterThanOrEqual(chest + 60);
      expect(c.state.held?.[debtor.id]?.some((h) => h.kind === 'beaten' && h.by === visit?.who[0])).toBe(true);
      // Warned, they're left alone for a while.
      const later = live(c, T + 2, quiet({ collect: { chance: 1, late: LIFE.hard!.collect.late } }));
      expect(later.some((e) => e.kind === 'collected' && e.who[1] === debtor.id)).toBe(false);
    }
  });

  it('has the desperate mug strangers, and the gangs take on the desperate young', () => {
    for (const seed of seeds) {
      const c = city(seed);
      live(c, T);
      const district = 'watson';
      const locals = c.population.people.filter((p) => p.district === district && !p.gang && p.diedOn === undefined && (c.state.hurt[p.id] ?? -1) < T + 1);
      const mugger = locals.find((p) => p.age >= LIFE.adultAt && p.traits.courage + p.traits.greed >= LIFE.hard!.mugging.nerve) as Person;
      // Owing a gang, with nothing to pay it back from.
      const desperate = (p: Person, d: number) => {
        (c.state.debts ??= {})[p.id] = { gang: lender(district) as string, owed: 100, since: d, paid: d };
        p.eddies = 0;
        c.state.eddies[p.id] = 0;
        (c.state.savings as Record<string, number>)[p.id] = 0;
      };
      desperate(mugger, T + 1);
      const mugged = live(c, T + 1, quiet({}, { mugging: 1 })).filter((e) => e.kind === 'mugging' && e.district === district);
      expect(mugged.length, seed).toBe(1);
      const [a, b] = mugged[0]!.who.map((id) => c.population.people.find((p) => p.id === id)) as [Person, Person];
      expect(a.gang).toBeNull();
      expect(b.gang).toBeNull();
      expect(mugged[0]!.gang).toBeNull();
      expect(mugged[0]!.took).toBeGreaterThan(0);
      expect(c.state.arrears?.[a.id] || c.state.debts?.[a.id], seed).toBeTruthy();
      expect(c.state.held?.[b.id]?.some((h) => h.kind === 'robbed' && h.by === a.id)).toBe(true);
      // Someone young, bold and behind on the rent, on a gang's turf, ends up in its colors.
      const young = c.population.people.find((p) => p.district === district && !p.gang && !p.job.building && p.diedOn === undefined && p.age >= LIFE.adultAt && p.age <= LIFE.hard!.recruit.age && p.traits.courage + p.traits.greed >= LIFE.hard!.recruit.nerve && (c.state.hurt[p.id] ?? -1) < T + 2) as Person;
      expect(young, seed).toBeDefined();
      for (const id of Object.keys(c.state.arrears ?? {})) delete c.state.arrears![id];
      for (const id of Object.keys(c.state.debts ?? {})) delete c.state.debts![id];
      desperate(young, T + 2);
      const joined = live(c, T + 2, quiet({ recruit: { ...LIFE.hard!.recruit, chance: 1 } })).find((e) => e.kind === 'joined' && e.district === district);
      expect(joined?.who[1], seed).toBe(young.id);
      expect(young.gang, seed).toBe(joined?.gang);
    }
  });

  it("locks a storefront gone under to everyone, ends the player's job there, and tells it in the news", () => {
    const DAY = 86_400_000;
    const NOW = Date.UTC(2077, 9, 12, 13, 0);
    const seed = seeds[0] as string;
    const world = generateWorld(seed, CITY);
    const game = new Game(world, RULES);
    game.start(NOW - 2 * DAY);
    game.tick(NOW - DAY);
    const shop = world.buildings.find((b) => b.business && b.category === 'food' && !ECONOMY.owners.corp.includes(b.business) && game.population.people.some((p) => p.job.building === b.id)) as Building;
    const save = readSave(JSON.parse(JSON.stringify(createSave(seed, game, GENERATOR_VERSION, NOW - DAY)))) as SaveData;
    const lived = save.life as LifeState;
    lived.closed = { [shop.id]: { day: lived.day, until: lived.day + 30 } };
    lived.market = { shocks: [], short: [], news: [{ day: lived.day, district: shop.district, category: shop.category, kind: 'closed', building: shop.id }] };
    const progress = progressFor(world, { ...save, where: { x: shop.x, y: shop.y, place: null, station: null, building: shop.id }, inside: null, jobs: [{ building: shop.id, rung: 0, trust: 0, shifts: 0, lastShiftDay: -1 }] }, GENERATOR_VERSION) as Progress;
    const reloaded = new Game(generateWorld(seed, CITY), RULES, progress);
    const said: string[] = [];
    reloaded.events.on('output', (m) => said.push(m.text));
    reloaded.start(NOW);
    const at = buildingById(reloaded.world, shop.id) as Building;
    expect(reloaded.locked(at, NOW)).toEqual({ opensAt: null, down: true });
    expect(reloaded.jobsStatus(NOW)).toEqual([]);
    expect(said.some((t) => t.includes(shop.name) && /gone under/.test(t))).toBe(true);
    expect(reloaded.enter(NOW)).toBe(false);
    expect(reloaded.interior).toBeNull();
    expect(reloaded.market(NOW).news[0]?.text, 'the headline names the place').toContain(shop.name);
  });
});
