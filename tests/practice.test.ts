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
import { TRAVEL } from '../src/data/travel';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { freshLife, liveUntil, type LifeState } from '../src/engine/life';
import { generatePeople, walkOf, type Clock, type Person } from '../src/engine/people';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const DAY = Math.floor(NOON / 86_400_000);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf };
const TRADED: GameRules = { ...RULES, trading: TRADING };

/** A storefront of nobody's chain, with someone working it. */
const shop = world.buildings.find((b) => b.business && b.category === 'food' && !FOOD.fixed[b.business] && b.business !== 'hospital')!;
const progressAt = (b: Building, extra: Partial<Progress> = {}): Progress => ({
  where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id },
  visited: [],
  discovered: [],
  explored: [],
  eddies: 0,
  passUntil: 0,
  trip: null,
  inside: b.id,
  items: [],
  gear: null,
  money: { bills: 5000, coins: 0, account: 0 },
  energy: null,
  inebriation: null,
  society: null,
  charisma: null,
  job: null,
  life: null,
  ...extra,
});
/** A city that has been living for `days` days, a day lived already today. */
const lived = (days: number, extra: Partial<LifeState> = {}): LifeState => ({ ...freshLife(), day: DAY, start: DAY - days, ...extra });
const gameAt = (rules: GameRules, life: LifeState, extra: Partial<Progress> = {}) => {
  const game = new Game(world, rules, progressAt(shop, { life, ...extra }));
  game.start(NOON);
  return game;
};
const staffer = (game: Game): Person => game.population.people.find((p) => p.job.building === shop.id && !p.gang)!;

describe('people learning with practice', () => {
  it('makes a counter hand a better trader and talker the longer they work it, each level slower than the last', () => {
    const at = (days: number) => {
      const game = gameAt(TRADED, lived(days));
      return game.levelsOf(staffer(game).id, NOON)!;
    };
    const fresh = at(0);
    const year = at(365);
    const two = at(730);
    expect(year.trading).toBeGreaterThan(fresh.trading);
    expect(year.charisma).toBeGreaterThanOrEqual(fresh.charisma);
    // A second year is worth less than the first: every level takes more practice.
    expect(two.trading - year.trading).toBeLessThan(year.trading - fresh.trading);
    // What they don't practice stays where it was.
    expect(year.brawler).toBe(fresh.brawler);
  });

  it('makes anyone who fights better at it, a fight at a time', () => {
    const plain = gameAt(RULES, lived(0));
    const person = staffer(plain);
    const fought = gameAt(RULES, lived(0, { fights: { [person.id]: 60 } }));
    const before = plain.levelsOf(person.id, NOON)!;
    const after = fought.levelsOf(person.id, NOON)!;
    expect(after.brawler).toBeGreaterThan(before.brawler);
    expect(after.toughness).toBeGreaterThan(before.toughness);
    expect(after.charisma).toBe(before.charisma);
  });

  it('counts the fights people have in their own days, and the gangers on the streets', () => {
    const population = generatePeople(world, PEOPLE, FOOD.dishes);
    const state = freshLife();
    const base = new Map(population.people.map((p) => [p.id, p.eddies]));
    liveUntil(world, population, state, LIFE, base, DAY, world.seed, () => 'everyday', () => [], PEOPLE);
    for (let d = DAY + 1; d <= DAY + 30; d++) liveUntil(world, population, state, LIFE, base, d, world.seed, () => 'everyday', () => [], PEOPLE);
    expect(state.start).toBe(DAY - 1);
    const fights = state.events.filter((e) => e.kind === 'fight').length;
    if (fights) expect(Object.values(state.fights ?? {}).reduce((n, k) => n + k, 0)).toBeGreaterThan(0);
    // A ganger's days on the street make a fighter of them.
    const game = gameAt(RULES, lived(400));
    const ganger = game.population.people.find((p) => walkOf(p, world) === 'gang' && !(state.jobs[p.id]))!;
    const green = gameAt(RULES, lived(0)).levelsOf(ganger.id, NOON)!;
    expect(game.levelsOf(ganger.id, NOON)!.brawler).toBeGreaterThan(green.brawler);
  });
});

describe('Trading', () => {
  it('is what the player pays against the seller: a poor trader over the price, a sharp one under, a chain never', () => {
    // A gun store, where a price is worth talking about.
    const guns = world.buildings.find((b) => b.business && GEAR.arms.stores[b.business] && !FOOD.fixed[b.business])!;
    const at = (rules: GameRules, extra: Partial<Progress> = {}) => {
      const game = new Game(world, rules, progressAt(guns, { life: lived(0), ...extra }));
      game.start(NOON);
      return game.menu(NOON)!;
    };
    const plain = at(RULES);
    const poor = at(TRADED);
    const sharp = at(TRADED, { trading: { level: 9, xp: 0 } });
    const priceOf = (menu: typeof plain, id: string) => menu.items.find((i) => i.id === id)!.price;
    const dish = [...plain.items].sort((a, b) => b.price - a.price)[0]!;
    expect(priceOf(poor, dish.id)).toBeGreaterThan(priceOf(plain, dish.id));
    expect(priceOf(sharp, dish.id)).toBeLessThan(priceOf(poor, dish.id));
    expect(poor.haggle).toBeGreaterThan(0);
    // A chain's prices are its prices.
    const chain = world.buildings.find((b) => b.business && FOOD.fixed[b.business] && b.category === 'food')!;
    const chainGame = new Game(world, TRADED, progressAt(chain, { life: lived(0) }));
    chainGame.start(NOON);
    const chainPlain = new Game(world, RULES, progressAt(chain, { life: lived(0) }));
    chainPlain.start(NOON);
    expect(chainGame.menu(NOON)?.items.map((i) => i.price)).toEqual(chainPlain.menu(NOON)?.items.map((i) => i.price));
  });

  it('grows with every purchase, and keeps through a save', () => {
    const game = gameAt(TRADED, lived(0));
    const item = game.menu(NOON)!.items.find((i) => !game.canBuy(i.id, NOON))!;
    expect(game.buy(item.id, NOON)).toBe(true);
    expect(game.trading().xp).toBe(MONEY.tradeXp);
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, 0, NOON))))!;
    expect(new Game(world, TRADED, resume(world, save)!).tradingSaved).toEqual(game.tradingSaved);
  });
});
