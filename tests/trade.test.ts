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
import { CHARISMA, TRADING } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRADE } from '../src/data/trade';
import { TRAVEL } from '../src/data/travel';
import { VALUABLES } from '../src/data/valuables';
import { priceFactor, stockOf, tillOf, type Health } from '../src/engine/economy';
import type { Quality } from '../src/engine/food';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import type { LifeState } from '../src/engine/life';
import { generatePeople, walkOf, whereIs, type Clock, type Person } from '../src/engine/people';
import { createSave, readSave, type Progress } from '../src/engine/save';
import { tradeKindOf, valuableOf, worthOf } from '../src/engine/trade';
import type { Building, Item } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, trade: TRADE };

const blank = (extra: Partial<Progress>): Progress => ({
  where: streetSpot({ x: 0, y: 0 }),
  visited: [],
  discovered: [],
  explored: [],
  eddies: 0,
  passUntil: 0,
  trip: null,
  inside: null,
  items: [],
  gear: null,
  money: { bills: 0, coins: 0, account: 0 },
  energy: null,
  inebriation: null,
  society: null,
  charisma: null,
  job: null,
  life: null,
  ...extra,
});
const inside = (b: Building, extra: Partial<Progress> = {}): Progress => blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, ...extra });
const game = (progress: Progress, now = NOON) => {
  const g = new Game(world, RULES, progress);
  g.start(now);
  return g;
};
const inner = (g: Game) => g as unknown as { life: LifeState; tierOf: (b: Building) => Quality; trade: (b: Building) => { health: Health } };
const said = (g: Game) => {
  const lines: string[] = [];
  g.events.on('output', ({ text }) => lines.push(text));
  return lines;
};
const store = (business: string) => world.buildings.find((b) => b.business === business) as Building;
const gunId = Object.entries(GEAR.arms.weapons).find(([, w]) => GEAR.arms.classes[w.class]?.ammo && w.price > 100)![0];
const gun = (extra: Partial<Item> = {}): Item => ({ id: 'w-1', kind: 'weapon', name: GEAR.arms.weapons[gunId]!.name, count: 1, weapon: gunId, loaded: 0, in: 'jacket', ...extra });
const watch: Item = { id: 'silver-watch', kind: 'junk', name: 'Silver Watch', count: 1, in: 'jacket' };
/** What a store would give for a thing, as the rules have it (no Trading in these rules, so no haggling). */
const expected = (g: Game, b: Building, worth: number) => Math.max(1, Math.round(worth * (TRADE.shares[b.business!] ?? TRADE.share) * TRADE.tier[inner(g).tierOf(b)] * priceFactor(stockOf(inner(g).life.tills[b.id]), inner(g).trade(b).health, LIFE.economy)));

describe('what things are worth to a store', () => {
  it('knows each kind of thing and what one is worth', () => {
    const v = VALUABLES;
    expect(tradeKindOf(gun(), GEAR, FOOD.dishes, v)).toBe('gun');
    expect(worthOf(gun(), GEAR, FOOD.dishes, v)).toBe(GEAR.arms.weapons[gunId]!.price);
    const ammoId = Object.keys(GEAR.arms.ammo)[0]!;
    expect(tradeKindOf({ id: ammoId, kind: 'ammo' }, GEAR, FOOD.dishes, v)).toBe('ammo');
    expect(worthOf({ id: ammoId, kind: 'ammo' }, GEAR, FOOD.dishes, v)).toBeCloseTo(GEAR.arms.ammo[ammoId]!.price / GEAR.arms.ammo[ammoId]!.box);
    expect(tradeKindOf(watch, GEAR, FOOD.dishes, v)).toBe('valuable');
    expect(worthOf(watch, GEAR, FOOD.dishes, v)).toBe(VALUABLES['silver-watch']!.price);
    const dish = FOOD.dishes[0]!;
    expect(tradeKindOf({ id: dish.id, kind: 'consumable' }, GEAR, FOOD.dishes, v)).toBe('food');
    const med = Object.keys(GEAR.medical.meds)[0]!;
    expect(tradeKindOf({ id: med, kind: 'consumable' }, GEAR, FOOD.dishes, v)).toBe('med');
    // A drug and a credchip go to no store.
    expect(tradeKindOf({ id: Object.keys(GEAR.drugs)[0]!, kind: 'consumable' }, GEAR, FOOD.dishes, v)).toBeNull();
    expect(tradeKindOf({ id: 'chip', kind: 'credchip' }, GEAR, FOOD.dishes, v)).toBeNull();
  });

  it('has every valuable named, priced and weighed, jewellery dearer than junk, and every gang one for a real gang', () => {
    for (const [id, v] of Object.entries(VALUABLES)) {
      expect(v.name, id).toBeTruthy();
      expect(v.note.length, id).toBeGreaterThan(5);
      expect(v.price, id).toBeGreaterThan(0);
      expect(v.grams, id).toBeGreaterThan(0);
      for (const gang of v.gangs ?? []) expect(PEOPLE.gangs[gang], `${id}: ${gang}`).toBeDefined();
    }
    const junk = Object.values(VALUABLES).filter((v) => !v.jewellery).map((v) => v.price);
    const jewels = Object.values(VALUABLES).filter((v) => v.jewellery).map((v) => v.price);
    expect(Math.max(...junk)).toBeLessThan(Math.min(...jewels));
  });
});

describe("the trade's lines", () => {
  it('has a few of each, with nothing left unfilled', () => {
    const vars: Record<string, string> = { item: 'Silver Watch', amount: '240', place: 'Dogtown Pawn' };
    for (const [kind, pool] of Object.entries(TRADE.lines)) {
      expect(pool.length, kind).toBeGreaterThanOrEqual(2);
      for (const text of pool) expect(text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`), kind).not.toMatch(/[{}]/);
    }
  });
});

describe('what people carry', () => {
  it('is drawn on their own stream a week at a time: their gang\'s, their walk\'s and their means\' things, and more of it the better they live', () => {
    const tally: Record<Quality, [number, number]> = { poverty: [0, 0], everyday: [0, 0], luxury: [0, 0] };
    let gangOwn = 0;
    let gangAny = 0;
    for (const person of population.people.slice(0, 2500)) {
      const walk = walkOf(person, world);
      for (const means of ['poverty', 'everyday', 'luxury'] as Quality[]) {
        const id = valuableOf(person, walk, means, 100, VALUABLES, TRADE, world.seed);
        expect(valuableOf(person, walk, means, 100, VALUABLES, TRADE, world.seed)).toBe(id);
        tally[means][1] += 1;
        if (!id) continue;
        tally[means][0] += 1;
        const v = VALUABLES[id]!;
        if (v.gangs) expect(v.gangs).toContain(person.gang);
        if (v.walks) expect(v.walks).toContain(walk);
        if (v.means) expect(v.means).toContain(means);
        if (person.gang && means === 'everyday') {
          gangAny += 1;
          if (v.gangs || v.walks?.includes('gang')) gangOwn += 1;
        }
      }
    }
    const share = (m: Quality) => tally[m][0] / tally[m][1];
    expect(share('poverty')).toBeLessThan(share('everyday'));
    expect(share('everyday')).toBeLessThan(share('luxury'));
    expect(gangOwn / gangAny, 'gangers mostly carry gang things').toBeGreaterThan(0.5);
  });
});

describe('selling to a store', () => {
  it('buys what it deals in at a share of its worth, out of its till and in cash, onto its shelves', () => {
    const b = store('gun-shop');
    const g = game(inside(b, { items: [gun()] }));
    const lines = said(g);
    const sells = g.sellables(NOON)!;
    expect(sells.name).toBe(b.name);
    const row = sells.items.find((i) => i.id === 'w-1')!;
    const worth = GEAR.arms.weapons[gunId]!.price;
    expect(row).toMatchObject({ kind: 'gun', count: 1, units: 1, offer: expected(g, b, worth) });
    const till = tillOf(inner(g).life.tills, b.id);
    till.stock = 0.5;
    const before = till.cash ?? 0;
    const offer = g.sellables(NOON)!.items.find((i) => i.id === 'w-1')!.offer;
    expect(g.sell('w-1', 'jacket', NOON)).toBe(true);
    expect(g.inventory.some((i) => i.id === 'w-1')).toBe(false);
    expect(g.wallet.eddies).toBe(offer);
    expect(till.cash).toBe(before - offer);
    expect(stockOf(till)).toBeGreaterThan(0.5);
    expect(lines.some((l) => l.includes(String(offer)))).toBe(true);
  });

  it('never buys back for more than it sells for, however sharp the player\'s Trading', () => {
    const b = store('gun-shop');
    const rules: GameRules = { ...RULES, trading: TRADING };
    const sharp = new Game(world, rules, inside(b, { money: { bills: 0, coins: 0, account: 100_000 }, trading: { level: 60, xp: 0 } }));
    sharp.start(NOON);
    const menu = sharp.menu(NOON)!;
    const rackGun = menu.items.find((i) => i.kind === 'weapon')!;
    expect(sharp.buy(rackGun.id, NOON)).toBe(true);
    const bought = sharp.inventory.find((i) => i.kind === 'weapon')!;
    tillOf(inner(sharp).life.tills, b.id).cash = 100_000;
    const offer = sharp.sellables(NOON)!.items.find((i) => i.id === bought.id)!.offer;
    expect(offer).toBeLessThan(rackGun.price);
  });

  it('pays more while its shelves are short, and less while a slow place sits on full ones', () => {
    const b = store('gun-shop');
    const g = game(inside(b, { items: [gun()] }));
    const till = tillOf(inner(g).life.tills, b.id);
    till.stock = 1;
    const full = g.sellables(NOON)!.items[0]!.offer;
    till.stock = 0.05;
    const bare = g.sellables(NOON)!.items[0]!.offer;
    expect(bare).toBeGreaterThan(full);
  });

  it("won't take a loaded gun, more than its till holds, or cash the player has no room for", () => {
    const b = store('gun-shop');
    const loaded = game(inside(b, { items: [gun({ loaded: 3 })] }));
    expect(loaded.sellables(NOON)!.items[0]!.why).toBe('Unload it first');
    expect(loaded.sell('w-1', 'jacket', NOON)).toBe(false);
    const poor = game(inside(b, { items: [gun()] }));
    tillOf(inner(poor).life.tills, b.id).cash = 5;
    expect(poor.sellables(NOON)!.items[0]!.why).toBe('Till too light');
    expect(poor.sell('w-1', 'jacket', NOON)).toBe(false);
    expect(poor.inventory.some((i) => i.id === 'w-1')).toBe(true);
    const full = game(inside(b, { items: [gun()], money: { bills: 1000, coins: 0, account: 0 } }));
    tillOf(inner(full).life.tills, b.id).cash = 100_000;
    expect(full.sell('w-1', 'jacket', NOON)).toBe(false);
    expect(full.inventory.some((i) => i.id === 'w-1')).toBe(true);
  });

  it('turns a valuable away anywhere but a fence, where it goes for its price and no questions', () => {
    const shop = store('gun-shop');
    const legit = game(inside(shop, { items: [watch] }));
    const lines = said(legit);
    expect(legit.sellables(NOON)!.items).toEqual([expect.objectContaining({ id: 'silver-watch', kind: 'valuable', why: 'Only a fence' })]);
    expect(legit.sell('silver-watch', 'jacket', NOON)).toBe(false);
    expect(lines.some((l) => /somewhere else|pawn shop/.test(l))).toBe(true);
    const pawn = store('pawn-shop');
    const g = game(inside(pawn, { items: [watch] }));
    const sells = g.sellables(NOON)!;
    expect(sells.fence).toBe(true);
    const offer = Math.round(VALUABLES['silver-watch']!.price * TRADE.fences['pawn-shop']! * TRADE.tier[inner(g).tierOf(pawn)]);
    expect(sells.items[0]).toMatchObject({ kind: 'valuable', offer });
    tillOf(inner(g).life.tills, pawn.id).cash = 10_000;
    expect(g.sell('silver-watch', 'jacket', NOON)).toBe(true);
    expect(g.wallet.eddies).toBe(offer);
    // Nothing anywhere that doesn't deal in things.
    const bank = store('bank');
    expect(game(inside(bank, { items: [watch] })).sellables(NOON)).toBeNull();
  });
});

describe('robbing someone', () => {
  it('takes what of worth they have on them this week, by whose it was, for a fence', () => {
    // Someone with a valuable this week, somewhere the player can find them.
    const probe = new Game(world, RULES) as unknown as { valuableOn: (p: Person, now: number) => string | null };
    let found: { person: Person; spot: { kind: string; id: string } } | null = null;
    for (const person of population.people) {
      if (person.gang || /NCPD/.test(person.job.role)) continue;
      const where = whereIs(person, world, clockOf(NOON), FOOD.dishes, PEOPLE.out);
      if (where?.spot.kind !== 'building' || !probe.valuableOn(person, NOON)) continue;
      found = { person, spot: where.spot };
      break;
    }
    expect(found, 'someone carrying something').not.toBeNull();
    const b = world.buildings.find((x) => x.id === found!.spot.id)!;
    const g = game(inside(b));
    const lines = said(g);
    const id = (g as unknown as { valuableOn: (p: Person, now: number) => string | null }).valuableOn(found!.person, NOON)!;
    expect(g.rob(found!.person.id, NOON)).toBe(true);
    const taken = g.inventory.find((i) => i.kind === 'junk');
    expect(taken).toMatchObject({ id, name: VALUABLES[id]!.name, count: 1 });
    expect(lines.some((l) => l.includes(VALUABLES[id]!.name))).toBe(true);
    // It saves like anything carried.
    const save = JSON.parse(JSON.stringify(createSave(world.seed, g, GENERATOR_VERSION, NOON)));
    expect(readSave(save)?.items.some((i) => i.kind === 'junk' && i.id === id)).toBe(true);
  });
});
