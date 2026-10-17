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
import { accountOf, ledgerOf, ownersOf, tillOf, weekdayOf } from '../src/engine/economy';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { bossOf, ladderFor } from '../src/engine/jobs';
import type { LifeState } from '../src/engine/life';
import type { Money } from '../src/engine/money';
import { generatePeople, whereIs, type Clock, type Person } from '../src/engine/people';
import { createSave, readSave, type Progress } from '../src/engine/save';
import type { SocietyState, Standing } from '../src/engine/society';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const DAY = 86_400_000;
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const ECONOMY = LIFE.economy;
const BUSINESS = ECONOMY.business!;
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf };

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
/** The player inside a building, or at its door. */
const inside = (b: Building, extra: Partial<Progress> = {}): Progress => blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, ...extra });
const atDoor = (b: Building, extra: Partial<Progress> = {}): Progress => blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: null, ...extra });
const game = (progress: Progress, now = NOON) => {
  const g = new Game(world, RULES, progress);
  g.start(now);
  return g;
};
const inner = (g: Game) => g as unknown as { money: Money; life: LifeState; society: SocietyState };
const standing = (rapport: number): Standing => ({ met: true, rapport, grudge: 0, at: NOON, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} });
const said = (g: Game) => {
  const lines: string[] = [];
  g.events.on('output', ({ text }) => lines.push(text));
  return lines;
};

const owners = ownersOf(world, population, ECONOMY, world.seed);
const never = new Set(ECONOMY.hard!.close.never.businesses);
const named = new Set(ECONOMY.hard!.close.never.names);
const sellable = world.buildings.filter((b) => b.business && !owners.corp.has(b.business) && !never.has(b.business) && !named.has(b.name));
/** A storefront the player could buy, with its boss in it at noon. */
const shopWithBoss = (() => {
  for (const b of sellable) {
    const boss = bossOf(b, population);
    if (!boss || !ladderFor(b, JOBS)) continue;
    const at = whereIs(boss, world, clockOf(NOON), FOOD.dishes, PEOPLE.out);
    if (at?.spot.kind === 'building' && at.spot.id === b.id) return { b, boss };
  }
  throw new Error('no storefront with its boss in at noon');
})();
const nextPayday = (from: number) => from + ((((ECONOMY.payday - weekdayOf(Math.floor(from / DAY))) % 7) + 7) % 7 || 7) * DAY;

describe("the player's business", () => {
  it('buys a going storefront off its boss, who stays on to run it, at weeks of its costs and its profit', () => {
    const { b, boss } = shopWithBoss;
    const g = game(inside(b, { money: { bills: 0, coins: 0, account: 100_000 } }));
    inner(g).society.standings[boss.id] = standing(80);
    const offer = g.moneyWith(boss.id, NOON).find((o) => o.id === 'buy');
    expect(offer, 'Buy the place, on the boss\'s card').toMatchObject({ label: 'Buy the place', disabled: false });
    const price = Number(offer!.sub!.replace(/\D/g, ''));
    expect(price).toBeGreaterThan(0);
    const person = g.population.people.find((p) => p.id === boss.id) as Person;
    const before = accountOf(person, g.lifeSaved, ledgerOf(person, world, g.population, ECONOMY, (s) => (g as unknown as { tierFn: (s: unknown) => 'everyday' }).tierFn(s), world.seed), ECONOMY);
    expect(g.moneyMove(boss.id, 'buy', NOON)).toBe(true);
    expect(g.owns(b.id)).toBe(true);
    expect(g.wallet.account).toBe(100_000 - price);
    expect(g.lifeSaved.savings?.[boss.id]).toBe(before + price);
    expect(g.moneyWith(boss.id, NOON).some((o) => o.id === 'buy'), 'no buying it twice').toBe(false);
    // The books are the player's now, run by the same boss.
    const books = g.books()!;
    expect(books).toMatchObject({ prices: 'fair', opening: false });
    expect(books.staff).toBeGreaterThan(0);
    expect(g.businesses().map((v) => v.building.id)).toEqual([b.id]);
  });

  it("won't sell to a player its boss is cold to", () => {
    const { b, boss } = shopWithBoss;
    const g = game(inside(b, { money: { bills: 0, coins: 0, account: 100_000 } }));
    inner(g).society.standings[boss.id] = standing(-60);
    expect(g.moneyWith(boss.id, NOON).find((o) => o.id === 'buy')).toMatchObject({ sub: 'Not selling', disabled: true });
    expect(g.moneyMove(boss.id, 'buy', NOON)).toBe(false);
    expect(g.owns(b.id)).toBe(false);
  });

  it('pays the player what it makes over its reserve on payday, and keeps the counter open to them at the staff price', () => {
    const { b } = shopWithBoss;
    const today = Math.floor(NOON / DAY);
    const g = game(inside(b, { money: { bills: 0, coins: 0, account: 0 } }));
    const lines = said(g);
    inner(g).life.owned = { [b.id]: { since: today, prices: 'fair', due: 0 } };
    const menu = g.menu(NOON);
    if (menu) expect(menu.staff, 'the staff price at their own counter').toBe(JOBS.perks.discount);
    // A fat till: well over its reserve come payday.
    tillOf(inner(g).life.tills, b.id).cash = 50_000;
    const payday = nextPayday(NOON);
    g.tick(payday + DAY);
    expect(g.wallet.account).toBeGreaterThan(40_000);
    expect(lines.some((l) => l.includes(b.name) && /over its reserve|Payday at/.test(l))).toBe(true);
    expect(inner(g).life.owned?.[b.id]?.due).toBe(0);
  });

  it('keeps its books out back: money in and out of the till, its prices, and selling it back', () => {
    const { b } = shopWithBoss;
    const today = Math.floor(NOON / DAY);
    const g = game(inside(b, { money: { bills: 0, coins: 0, account: 5000 } }));
    inner(g).life.owned = { [b.id]: { since: today, prices: 'fair', due: 0 } };
    const till = tillOf(inner(g).life.tills, b.id);
    const before = till.cash ?? 0;
    expect(g.putIn(1000, NOON)).toBe(true);
    expect(g.putIn(250, NOON), 'only the sums on offer').toBe(false);
    expect(till.cash).toBe(before + 1000);
    expect(g.wallet.account).toBe(4000);
    // What's over its float comes out.
    const over = g.books()!.over;
    expect(over).toBeGreaterThan(0);
    expect(g.takeOut(NOON)).toBe(true);
    expect(g.wallet.account).toBe(4000 + over);
    expect(g.books()!.over).toBe(0);
    // Dearer prices show on the menu.
    const fair = g.menu(NOON);
    expect(g.setPrices('high', NOON)).toBe(true);
    expect(g.setPrices('high', NOON), 'already').toBe(false);
    const high = g.menu(NOON);
    if (fair && high) {
      const item = fair.items.find((i) => i.kind !== 'plan' && i.kind !== 'treatment' && i.price >= 10);
      if (item) expect(high.items.find((i) => i.id === item.id)!.price).toBeGreaterThan(item.price);
    }
    expect(g.books()!.prices).toBe('high');
    // Sold back, for its worth.
    const worth = g.books()!.worth;
    const account = g.wallet.account;
    expect(g.sellBusiness(NOON)).toBe(true);
    expect(g.owns(b.id)).toBe(false);
    expect(g.wallet.account).toBe(account + worth);
    expect(g.books()).toBeNull();
  });

  it('buys a storefront gone under off the notice on its shutters: new hands open it the next day', () => {
    const b = sellable[0]!;
    const today = Math.floor(NOON / DAY);
    const first = game(atDoor(b));
    inner(first).life.closed = { [b.id]: { day: today - 3, until: today + 30 } };
    const sale = first.forSale()!;
    expect(sale.price).toBeGreaterThan(0);
    expect(sale.affordable).toBe(false);
    expect(first.buyClosed(NOON)).toBe(false);
    const g = game(atDoor(b, { money: { bills: 0, coins: 0, account: 50_000 } }));
    inner(g).life.closed = { [b.id]: { day: today - 3, until: today + 30 } };
    for (const p of g.population.people) if (p.job.building === b.id) p.job = { role: 'unemployed', building: null };
    expect(g.locked(b, NOON)?.down).toBe(true);
    expect(g.buyClosed(NOON)).toBe(true);
    expect(g.owns(b.id)).toBe(true);
    expect(g.wallet.account).toBe(50_000 - sale.price);
    expect(g.forSale(), 'theirs now').toBeNull();
    expect(g.businesses()[0]?.opening).toBe(true);
    g.tick(NOON + DAY);
    expect(inner(g).life.closed?.[b.id], 'open again').toBeUndefined();
    expect(g.businesses()[0]).toMatchObject({ opening: false });
    expect(g.businesses()[0]!.staff).toBeGreaterThan(0);
  });

  it('is lost when it goes under, and what was left in its till comes to the player', () => {
    const { b } = shopWithBoss;
    const today = Math.floor(NOON / DAY);
    const g = game(inside(b));
    const lines = said(g);
    inner(g).life.owned = { [b.id]: { since: today - 30, prices: 'fair', due: 120, lost: today } };
    g.tick(NOON + DAY);
    expect(g.owns(b.id)).toBe(false);
    expect(g.wallet.account).toBeGreaterThanOrEqual(120);
    expect(lines.some((l) => /gone under|finished/.test(l))).toBe(true);
    expect(lines.some((l) => l.includes('120'))).toBe(true);
  });

  it('says when its till is short of the wages, once a payday', () => {
    const { b } = shopWithBoss;
    const today = Math.floor(NOON / DAY);
    const g = game(inside(b));
    const lines = said(g);
    inner(g).life.owned = { [b.id]: { since: today, prices: 'fair', due: 0 } };
    const till = tillOf(inner(g).life.tills, b.id);
    till.cash = 0;
    const payday = nextPayday(NOON);
    g.tick(payday + DAY / 2);
    expect(till.lean).toBeGreaterThan(0);
    expect(lines.filter((l) => /short|wages/.test(l) && l.includes(b.name))).toHaveLength(1);
    expect(inner(g).life.owned?.[b.id]?.told).toBe(till.lean);
  });

  it('has a line for everything, with nothing left unfilled', () => {
    const vars = { place: 'Kabuki Noodles', amount: '240', weeks: '2', under: '3', level: 'high' };
    for (const [kind, pool] of Object.entries(BUSINESS.lines)) {
      expect(pool.length, kind).toBeGreaterThanOrEqual(2);
      for (const text of pool) expect(text.replace(/\{(\w+)\}/g, (_, k: string) => (vars as Record<string, string>)[k] ?? `{${k}}`), kind).not.toMatch(/[{}]/);
    }
  });

  it('comes back from a save, and a record that is not one is dropped', () => {
    const { b } = shopWithBoss;
    const g = game(inside(b));
    inner(g).life.owned = { [b.id]: { since: 1, prices: 'low', due: 0 } };
    const save = JSON.parse(JSON.stringify(createSave(world.seed, g, GENERATOR_VERSION, NOON)));
    expect(readSave(save)?.life?.owned).toEqual({ [b.id]: { since: 1, prices: 'low', due: 0 } });
    const broken = readSave({ ...save, life: { ...save.life, owned: { [b.id]: { since: 1, prices: 'cheap', due: 0 }, other: { since: 2, prices: 'high', due: 5 } } } });
    expect(broken?.life?.owned).toEqual({ other: { since: 2, prices: 'high', due: 5 } });
  });
});
