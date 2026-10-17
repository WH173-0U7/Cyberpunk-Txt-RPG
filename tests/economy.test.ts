import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { LIFE } from '../src/data/life';
import { PEOPLE } from '../src/data/people';
import { accountOf, economyDay, healthOf, ledgerOf, ownersOf, parOf, priceFactor, staffCostOf, stockOf, tillOf, timesIn, turfFrom, weekdayOf, type EconomyRules, type Flows, type Health } from '../src/engine/economy';
import { drawQuality, menuFor, type Quality } from '../src/engine/food';
import { generateWorld } from '../src/engine/generate';
import { bossOf } from '../src/engine/jobs';
import { freshLife, liveUntil, type LifeState } from '../src/engine/life';
import { buildingById, generatePeople, tiesOf, type Person, type Population, type Spot } from '../src/engine/people';
import { Game, type GameRules } from '../src/engine/game';
import { GENERATOR_VERSION } from '../src/engine/generate';
import { createSave, progressFor, readSave, type Progress, type SaveData } from '../src/engine/save';
import { CHARISMA } from '../src/data/skills';
import { COMBAT } from '../src/data/combat';
import { ENERGY } from '../src/data/energy';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LINES } from '../src/data/dialogue';
import { MONEY } from '../src/data/money';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { createRng } from '../src/engine/rng';
import type { World } from '../src/engine/types';

const seeds = Array.from({ length: 3 }, (_, i) => createRng(`economy-${i}`).next().toString(16).slice(2, 10));
const T = 39366;
const ECONOMY: EconomyRules = LIFE.economy;
const turf = turfFrom(PEOPLE.turf);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, jobs: JOBS, life: LIFE, gear: GEAR, money: MONEY, combat: COMBAT };

/** The tier a place runs at, the way the game works it out, remembered per place. */
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

function day(c: City, d: number, rules = ECONOMY): Flows {
  return economyDay({ world: c.world, population: c.population, state: c.state, rules, tier: c.tier, turf, base: c.base, seed: c.seed, day: d, ties: (id) => tiesOf(c.population, id) });
}

/** Every eddie in the city: on people (the dead too), in their accounts, in the tills, the gangs' chests and the street's takings. */
function total(c: City): number {
  const { state } = c;
  return (
    c.population.people.reduce((n, p) => n + p.eddies + (state.savings?.[p.id] ?? 0), 0) +
    Object.values(state.tills).reduce((n, t) => n + (t.cash ?? 0), 0) +
    Object.values(state.treasuries).reduce((n, v) => n + v, 0) +
    Object.values(state.street ?? {}).reduce((n, v) => n + v, 0)
  );
}

const ledger = (c: City, p: Person) => ledgerOf(p, c.world, c.population, ECONOMY, c.tier, c.seed);
const money = (c: City, p: Person) => p.eddies + accountOf(p, c.state, ledger(c, p), ECONOMY);
const nextDay = (from: number, weekday: number) => from + ((weekday - weekdayOf(from) + 7) % 7);
const indexOf = (c: City, p: Person) => c.population.people.indexOf(p);

describe('the economy', () => {
  it('goes round in a closed loop: every eddie a day moves comes from someone and goes to someone, but what comes in from outside the city and goes out of it', () => {
    for (const seed of seeds.slice(0, 2)) {
      const c = city(seed);
      const shops = c.world.buildings.filter((b) => b.business);
      for (let d = T; d < T + 21; d++) {
        // The player leaves a little on a counter now and then: money from outside the loop.
        if (d % 3 === 0) tillOf(c.state.tills, (shops[d % shops.length] as { id: string }).id).pending += 40;
        const before = total(c);
        const flows = day(c, d);
        expect(total(c), `${seed} day ${d}`).toBe(before + flows.in - flows.out + flows.opened);
        expect(flows.in, `${seed} day ${d} in`).toBeGreaterThan(0);
        expect(flows.out, `${seed} day ${d} out`).toBeGreaterThan(0);
      }
      // Nothing is ever below nothing.
      for (const p of c.population.people) {
        expect(p.eddies).toBeGreaterThanOrEqual(0);
        expect(c.state.savings?.[p.id] ?? 0).toBeGreaterThanOrEqual(0);
      }
      for (const v of Object.values(c.state.treasuries)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("pays people from where their work is: a storefront's people from its till, the corps' and the NCPD's from outside, a gang's from its chest, freelancers by their line, and the jobless nothing", () => {
    for (const seed of seeds) {
      const c = city(seed);
      for (const p of c.population.people) {
        const l = ledger(c, p);
        const work = p.job.building ? buildingById(c.world, p.job.building) : undefined;
        if (p.gang) expect(l).toMatchObject({ earner: 'gang', pay: ECONOMY.gang });
        else if (work?.business) {
          const wage = ECONOMY.staff[c.tier({ kind: 'building', id: work.id })];
          expect(l.earner).toBe('staff');
          expect(l.pay).toBe(bossOf(work, c.population) === p ? Math.round(wage * ECONOMY.boss) : wage);
        } else if (work) expect(l).toMatchObject({ earner: 'payroll', pay: ECONOMY.payroll[work.kind] ?? ECONOMY.payroll.default });
        else if (/NCPD/.test(p.job.role)) expect(l).toMatchObject({ earner: 'payroll', pay: ECONOMY.ncpd });
        else if (p.job.role === 'retired') expect(l.earner).toBe('pension');
        else if (ECONOMY.gigs[p.job.role] !== undefined) expect(l.earner).toBe(ECONOMY.street.includes(p.job.role) ? 'street' : 'gig');
        else expect(l).toMatchObject({ earner: 'none', pay: 0 });
        // How they live follows from it.
        expect(l.means).toBe(l.pay < ECONOMY.means[0] ? 'poverty' : l.pay > ECONOMY.means[1] ? 'luxury' : 'everyday');
      }
    }
  });

  it('pays a till\'s workers first when it runs short, the boss out of what is left, and a corp makes up its own places\' short', () => {
    for (const seed of seeds) {
      const c = city(seed);
      day(c, T);
      const payday = nextDay(T + 1, ECONOMY.payday);
      for (let d = T + 1; d < payday; d++) day(c, d);
      const shops = c.world.buildings.filter((b) => b.business);
      const staffOf = (id: string) => c.population.people.filter((p) => p.job.building === id && p.diedOn === undefined);
      // Short: a till holding just its hands' wages pays them all and the boss nothing.
      const own = shops.filter((b) => !ECONOMY.owners.corp.includes(b.business as string) && staffOf(b.id).length >= 2);
      const corp = shops.filter((b) => ECONOMY.owners.corp.includes(b.business as string) && staffOf(b.id).length >= 1);
      expect(own.length, seed).toBeGreaterThan(5);
      expect(corp.length, seed).toBeGreaterThan(0);
      const due = weekdayOf(payday);
      // Watch the people who don't shop on payday, so what they're paid is all that moves.
      const quiet = (p: Person) => indexOf(c, p) % 7 !== due;
      const watched = own.slice(0, 6).map((b) => {
        const staff = staffOf(b.id);
        const boss = bossOf(b, c.population, staff);
        const hands = staff.filter((p) => p !== boss).reduce((n, p) => n + ledger(c, p).pay, 0);
        (c.state.tills[b.id] as { cash?: number }).cash = hands;
        return { b, staff, boss, hands, before: new Map(staff.map((p) => [p.id, money(c, p)])) };
      });
      for (const b of corp) (c.state.tills[b.id] as { cash?: number }).cash = 0;
      const flows = day(c, payday);
      for (const { b, staff, boss, hands, before } of watched) {
        const till = c.state.tills[b.id];
        expect(till?.short, `${seed} ${b.name}`).toBe(boss ? ledger(c, boss).pay : undefined);
        for (const p of staff.filter(quiet)) {
          const got = money(c, p) - (before.get(p.id) as number);
          // A relative might be handed a little of it: never more than they were paid.
          expect(got, `${seed} ${b.name} ${p.name}`).toBeLessThanOrEqual(p === boss ? 0 : ledger(c, p).pay);
        }
        expect(hands).toBeGreaterThan(0);
      }
      for (const b of corp) expect(c.state.tills[b.id]?.short, `${seed} ${b.name}`).toBeUndefined();
      expect(flows.in).toBeGreaterThan(0);
    }
  });

  it("takes the week's rent to whoever owns the home (a landlord, less the building's upkeep, or a corp, out of the city), and what a tenant can't pay, they owe", () => {
    for (const seed of seeds) {
      const c = city(seed);
      const owners = ownersOf(c.world, c.population, ECONOMY, seed);
      // Every small block is a landlord's, every tall one and every megabuilding a corp's, a shack nobody's.
      for (const b of c.world.buildings.filter((x) => x.category === 'residential')) {
        if (b.kind === 'apartments' && b.floors < ECONOMY.smallBlock) {
          const owner = c.population.people.find((p) => p.id === owners.of.get(b.id));
          expect(owner, `${seed} ${b.name}`).toBeDefined();
          expect(owner?.district).toBe(b.district);
          expect(owner?.gang).toBeNull();
          expect(owner?.age).toBeGreaterThanOrEqual(ECONOMY.owners.age);
        } else if (b.kind === 'apartments' || b.kind === 'megabuilding') expect(owners.of.get(b.id), `${seed} ${b.name}`).toBeNull();
        else expect(owners.of.has(b.id), `${seed} ${b.name}`).toBe(false);
      }
      // A chain's storefront is its corp's; any other its boss's, or a landlord's of its district.
      for (const b of c.world.buildings.filter((x) => x.business)) {
        const owner = owners.of.get(b.id);
        if (ECONOMY.owners.corp.includes(b.business as string)) expect(owner, `${seed} ${b.name}`).toBeNull();
        else if (owner) expect(c.population.people.find((p) => p.id === owner)?.district, `${seed} ${b.name}`).toBe(b.district);
      }
      // The same city has the same owners.
      const again = ownersOf(c.world, generatePeople(c.world, PEOPLE, FOOD.dishes), ECONOMY, seed);
      expect([...again.of]).toEqual([...owners.of]);
      // On a quiet day for the landlord, a tenant with the money pays them the rent; one with nothing owes it.
      const rentDay = T + 2;
      const due = weekdayOf(rentDay);
      const tenants = c.population.people.filter((p, i) => i % 7 === due && ledger(c, p).landlord && ledger(c, p).rent > 0);
      const flush = tenants.find((t) => {
        const landlord = c.population.people.find((p) => p.id === ledger(c, t).landlord);
        return landlord && indexOf(c, landlord) % 7 !== due && landlord !== t;
      });
      const broke = tenants.find((t) => t !== flush);
      expect(flush && broke, seed).toBeTruthy();
      const landlord = c.population.people.find((p) => p.id === ledger(c, flush as Person).landlord) as Person;
      day(c, T);
      day(c, T + 1);
      (c.state.savings as Record<string, number>)[(flush as Person).id] = 100_000;
      (broke as Person).eddies = 0;
      (c.state.savings as Record<string, number>)[(broke as Person).id] = 0;
      const had = money(c, landlord);
      day(c, rentDay);
      const rent = ledger(c, flush as Person).rent;
      expect(money(c, landlord) - had, seed).toBeGreaterThanOrEqual(rent - Math.round(rent * ECONOMY.upkeep.share));
      expect(c.state.arrears?.[(flush as Person).id]).toBeUndefined();
      expect(c.state.arrears?.[(broke as Person).id], seed).toBe(ledger(c, broke as Person).rent);
      // A tall block's tenants pay a corp.
      const corpTenant = c.population.people.find((p) => {
        const home = p.home ? buildingById(c.world, p.home) : undefined;
        return home?.kind === 'apartments' && home.floors >= ECONOMY.smallBlock;
      });
      expect(ledger(c, corpTenant as Person)).toMatchObject({ landlord: null });
      expect(ledger(c, corpTenant as Person).rent).toBeGreaterThan(0);
    }
  });

  it('spends at real places: food at one of the counters nearest home and lunch near work, the rest at stores in their district', () => {
    for (const seed of seeds) {
      const c = city(seed);
      const grocers = new Set(c.world.buildings.filter((b) => b.business && (ECONOMY.grocers.categories.includes(b.category) || ECONOMY.grocers.businesses.includes(b.business as string))).map((b) => b.id));
      for (const l of Object.values(c.world.locations)) if (ECONOMY.grocers.places.includes(l.kind)) grocers.add(l.id);
      let fed = 0;
      for (const p of c.population.people) {
        const l = ledger(c, p);
        if (!l.grocer) continue;
        fed++;
        expect(grocers.has(l.grocer.id), `${seed} ${p.name}`).toBe(true);
        const at = l.grocer.kind === 'building' ? buildingById(c.world, l.grocer.id)?.district : c.world.locations[l.grocer.id]?.district;
        expect(at, `${seed} ${p.name}`).toBe(p.district);
        if (p.job.building) expect(l.lunch, `${seed} ${p.name}`).not.toBeNull();
      }
      expect(fed / c.population.people.length).toBeGreaterThan(0.95);
      // A week in, most counters have taken money for food, and the street's places of its own have too.
      for (let d = T; d < T + 7; d++) day(c, d);
      const food = c.world.buildings.filter((b) => b.business && b.category === 'food');
      const trading = food.filter((b) => (c.state.tills[b.id]?.days ?? []).reduce((n, v) => n + v, 0) + staffCostOf(c.population.people.filter((p) => p.job.building === b.id), null, c.tier({ kind: 'building', id: b.id }), ECONOMY) > 0);
      expect(trading.length / food.length, seed).toBeGreaterThan(0.8);
      expect(Object.values(c.state.street ?? {}).reduce((n, v) => n + v, 0), seed).toBeGreaterThan(0);
    }
  });

  it('keeps what people carry about what they started with, so a robbery takes what it did, and the rest in their account', () => {
    for (const seed of seeds) {
      const c = city(seed);
      for (let d = T; d < T + 14; d++) day(c, d);
      // Whoever's week it was today, with money left in the account.
      const due = weekdayOf(T + 13);
      let checked = 0;
      for (const [i, p] of c.population.people.entries()) {
        const keep = c.base.get(p.id) as number;
        if (i % 7 !== due || (c.state.savings?.[p.id] ?? 0) <= 0) continue;
        checked++;
        expect(p.eddies, `${seed} ${p.name}`).toBeGreaterThanOrEqual(keep);
        expect(p.eddies, `${seed} ${p.name}`).toBeLessThanOrEqual(keep * ECONOMY.purse);
      }
      expect(checked / (c.population.people.length / 7)).toBeGreaterThan(0.8);
    }
  });

  it('keeps who owns what through a reload: worked out from the city as it was made, before its days are put back', () => {
    const DAY = 86_400_000;
    const NOW = Date.UTC(2077, 9, 12, 20, 0);
    for (const seed of seeds.slice(0, 2)) {
      const world = generateWorld(seed, CITY);
      const game = new Game(world, RULES);
      game.start(NOW - 45 * DAY);
      game.tick(NOW);
      expect(game.lifeSaved.events.some((e) => e.kind === 'hired' || e.kind === 'laidOff' || e.kind === 'death' || e.kind === 'joined'), seed).toBe(true);
      const before = [...ownersOf(world, game.population, ECONOMY, seed).of];
      const save = readSave(JSON.parse(JSON.stringify(createSave(seed, game, GENERATOR_VERSION, NOW))));
      const again = generateWorld(seed, CITY);
      const reloaded = new Game(again, RULES, progressFor(again, save as SaveData, GENERATOR_VERSION) as Progress);
      expect([...ownersOf(again, reloaded.population, ECONOMY, seed).of], seed).toEqual(before);
    }
  });

  it('opens an older save\'s tills with their float and its people\'s accounts from their pay', () => {
    const c = city(seeds[0] as string);
    const shop = c.world.buildings.find((b) => b.business) as { id: string };
    c.state.tills[shop.id] = { days: [1, 2, 3], pending: 0 };
    const flows = day(c, T);
    expect(c.state.tills[shop.id]?.cash).toBeGreaterThan(0);
    expect(flows.opened).toBeGreaterThan(0);
    const someone = c.population.people[0] as Person;
    const l = ledger(c, someone);
    expect(accountOf(someone, { savings: {} }, l, ECONOMY)).toBe(Math.round(ECONOMY.savings * (l.pay || l.essentials)));
  });

  it('prices by the shelves: dearer as they empty, a tenth off at a slow place sitting on full ones; and holds fewer of a dear thing', () => {
    const { low, scarce, glut } = ECONOMY.prices;
    expect(priceFactor(1, 'steady', ECONOMY)).toBe(1);
    expect(priceFactor(0, 'steady', ECONOMY)).toBeCloseTo(1 + scarce);
    expect(priceFactor(low / 2, 'steady', ECONOMY)).toBeCloseTo(1 + scarce / 2);
    expect(priceFactor(0.95, 'struggling', ECONOMY)).toBeCloseTo(1 - glut);
    expect(priceFactor(0.95, 'thriving', ECONOMY)).toBe(1);
    let last = Infinity;
    for (const price of [1, 3, 8, 20, 60, 200, 900, 3000]) {
      const par = parOf(price, ECONOMY);
      expect(par).toBeLessThanOrEqual(last);
      expect(par).toBeGreaterThanOrEqual(1);
      expect(par).toBeLessThanOrEqual(ECONOMY.stock.most);
      last = par;
    }
  });

  it('runs a kind of store short when its trucks stop coming: bare shelves, dearer, a headline, and full again after', () => {
    for (const seed of seeds.slice(0, 2)) {
      const c = city(seed);
      for (let d = T; d < T + 7; d++) day(c, d);
      // The busiest kind of store somewhere: the trucks stop.
      const counts = new Map<string, number>();
      for (const b of c.world.buildings.filter((x) => x.business && x.category === 'food')) counts.set(b.district, (counts.get(b.district) ?? 0) + 1);
      const district = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] as string;
      const shops = c.world.buildings.filter((b) => b.business && b.district === district && b.category === 'food');
      const market = c.state.market as NonNullable<LifeState['market']>;
      market.shocks.push({ district, category: 'food', until: T + 20 });
      for (let d = T + 7; d < T + 21; d++) day(c, d);
      const level = () => shops.reduce((n, b) => n + stockOf(c.state.tills[b.id]), 0) / shops.length;
      expect(level(), seed).toBeLessThan(ECONOMY.market.short);
      expect(market.short, seed).toContain(`${district}:food`);
      expect(market.news.some((n) => n.kind === 'short' && n.district === district && n.category === 'food'), seed).toBe(true);
      expect(shops.some((b) => priceFactor(stockOf(c.state.tills[b.id]), 'steady', ECONOMY) > 1), seed).toBe(true);
      // The rest of the district's stores are stocked as ever.
      const others = c.world.buildings.filter((b) => b.business && b.district === district && b.category !== 'food' && !market.shocks.some((s) => s.district === district && s.category === b.category));
      expect(others.reduce((n, b) => n + stockOf(c.state.tills[b.id]), 0) / others.length, seed).toBeGreaterThan(0.8);
      // The trucks come again, and so does the food.
      for (let d = T + 21; d < T + 30; d++) day(c, d);
      expect(level(), seed).toBeGreaterThan(ECONOMY.market.back);
      expect(market.news.some((n) => n.kind === 'back' && n.district === district && n.category === 'food'), seed).toBe(true);
    }
  });

  it('sells nothing off bare shelves: its customers go elsewhere, and without the cash to restock it stays bare', () => {
    const c = city(seeds[0] as string);
    for (let d = T; d < T + 7; d++) day(c, d);
    const grocers = c.world.buildings.filter((b) => b.business && b.category === 'food');
    const bare = grocers[0] as { id: string };
    const till = c.state.tills[bare.id] as NonNullable<LifeState['tills'][string]>;
    till.stock = 0;
    till.cash = 0;
    day(c, T + 7);
    expect(till.days.at(-1), 'nothing taken').toBeLessThan(0);
    expect(stockOf(till)).toBe(0);
    // With cash in the till again, it restocks.
    till.cash = 5000;
    day(c, T + 8);
    expect(stockOf(till)).toBeGreaterThan(0);
  });

  it("pays the player what their own storefronts make over their reserve, out of the city's money, and loses one that goes under", () => {
    const c = city(seeds[0] as string);
    const owners = ownersOf(c.world, c.population, ECONOMY, c.seed);
    const shops = c.world.buildings.filter((b) => b.business && !owners.corp.has(b.business));
    const levels = ['low', 'fair', 'high'] as const;
    const mine = shops.filter((_, i) => i % 9 === 0).slice(0, 30);
    c.state.owned = Object.fromEntries(mine.map((b, i) => [b.id, { since: T, prices: levels[i % 3] as (typeof levels)[number], due: 0 }]));
    // The loop still closes: what's theirs leaves the city.
    for (let d = T; d < T + 14; d++) {
      const before = total(c);
      const flows = day(c, d);
      expect(total(c), `day ${d}`).toBe(before + flows.in - flows.out + flows.opened);
    }
    const owned = c.state.owned;
    expect(mine.some((b) => (owned[b.id]?.due ?? 0) > 0), 'some of it made money').toBe(true);
    // Short of its wages too many paydays running, it goes under like any, and what was in the till is theirs.
    const failing = mine.find((b) => c.population.people.some((p) => p.job.building === b.id)) as { id: string };
    const till = tillOf(c.state.tills, failing.id);
    const payday = nextDay(T + 15, ECONOMY.payday);
    for (let d = T + 14; d < payday; d++) day(c, d);
    till.lean = ECONOMY.hard!.close.weeks - 1;
    till.cash = 0;
    const due = owned[failing.id]?.due ?? 0;
    day(c, payday);
    expect(c.state.closed?.[failing.id]).toBeDefined();
    expect(owned[failing.id]?.lost).toBe(payday);
    expect(owned[failing.id]?.due).toBeGreaterThanOrEqual(due);
  });

  it('counts how often something comes off in a week by one roll', () => {
    expect(timesIn(7, 0, 0.99)).toBe(0);
    expect(timesIn(7, 1, 0)).toBe(7);
    const rng = createRng('times');
    for (const p of [0.1, 0.35, 0.6]) {
      let sum = 0;
      for (let i = 0; i < 20_000; i++) {
        const k = timesIn(7, p, rng.next());
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThanOrEqual(7);
        sum += k;
      }
      expect(sum / 20_000).toBeCloseTo(7 * p, 1);
    }
  });

  it('keeps a city going for a season: places doing well and badly, few people broke, and no money running away or drying up', () => {
    for (const seed of seeds.slice(0, 2)) {
      const c = city(seed);
      const shops = c.world.buildings.filter((b) => b.business);
      const money = () => c.population.people.filter((p) => p.diedOn === undefined).reduce((n, p) => n + p.eddies + (c.state.savings?.[p.id] ?? 0), 0);
      let early = 0;
      for (let d = T; d < T + 100; d++) {
        liveUntil(c.world, c.population, c.state, LIFE, c.base, d, seed, c.tier, turf, PEOPLE);
        if (d === T + 30) early = money();
      }
      const late = money();
      expect(late / early, seed).toBeGreaterThan(0.6);
      expect(late / early, seed).toBeLessThan(1.6);
      const healths: Record<Health, number> = { thriving: 0, steady: 0, struggling: 0 };
      for (const b of shops) {
        const staff = c.population.people.filter((p) => p.job.building === b.id && p.diedOn === undefined);
        const t = c.tier({ kind: 'building', id: b.id });
        healths[healthOf(c.state.tills[b.id], staffCostOf(staff, bossOf(b, c.population, staff), t, ECONOMY) + ECONOMY.rent[t] * 7, ECONOMY)]++;
      }
      expect(healths.thriving, seed).toBeGreaterThan(0);
      expect(healths.steady, seed).toBeGreaterThan(0);
      expect(healths.struggling, seed).toBeGreaterThan(0);
      expect(healths.struggling / shops.length, seed).toBeLessThan(0.45);
      const living = c.population.people.filter((p) => p.diedOn === undefined);
      const broke = living.filter((p) => p.eddies + (c.state.savings?.[p.id] ?? 0) < ledger(c, p).essentials);
      expect(broke.length / living.length, seed).toBeLessThan(0.15);
      // The broke are mostly those with no work, or none that pays much.
      const working = broke.filter((p) => ['staff', 'payroll'].includes(ledger(c, p).earner));
      expect(working.length / Math.max(1, broke.length), seed).toBeLessThan(0.5);
    }
  });
});
