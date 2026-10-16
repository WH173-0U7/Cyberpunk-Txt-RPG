import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { DEALING } from '../src/data/dealing';
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
import type { DealingRules } from '../src/engine/dealing';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { dependenceAt, edgeAt, effectsAt, freshHabit, overdoseOdds, stageAt, takeDose, type HabitRules, type HabitState } from '../src/engine/habit';
import { generatePeople, peopleAt, type Clock } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const HOUR = 3_600_000 / TRAVEL.timeScale;
const DAY = 24 * HOUR;
const H = DEALING.habit;
const T = TRAVEL.timeScale;
const rng = () => createRng('habit-test');
/** The habit with nothing left to chance: no overdoses, no lasting harm. */
const safe = (over: Partial<HabitRules> = {}): DealingRules => ({ ...DEALING, habit: { ...H, overdose: { ...H.overdose, base: {} }, effects: Object.fromEntries(Object.entries(H.effects).map(([id, e]) => [id, { ...e, nerve: 0 }])), ...over } });
const rulesWith = (dealing: DealingRules = safe()): GameRules => ({ ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, dealing });

/** A storefront with people in it at noon. */
const shop = world.buildings.find((b) => b.business && peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out).length >= 3)!;
/** A building nobody is in at noon. */
const empty = world.buildings.find((b) => peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out).length === 0)!;
const inside = (b: Building, extra: Partial<Progress> = {}): Progress => ({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, visited: [], discovered: [], explored: [], eddies: 0, passUntil: 0, trip: null, inside: b.id, items: [], gear: null, money: { bills: 2000, coins: 0, account: 0 }, energy: null, inebriation: null, society: null, charisma: null, job: null, life: null, ...extra });
const doses = (drug: string, count: number): Progress['items'][number] => ({ id: drug, kind: 'consumable', name: DEALING.drugs[drug]!.name, count, in: 'jacket' });
const play = (progress: Progress, rules = rulesWith(), now = NOON) => {
  const game = new Game(world, rules, progress);
  game.start(now);
  return game;
};
const dosed = (drug: string, times: number, from = NOON, gap = HOUR * 3): HabitState => {
  let state = freshHabit();
  for (let n = 0; n < times; n++) state = takeDose(state, drug, DEALING.drugs[drug]!.hook, from + n * gap, H, T, rng()).state;
  return state;
};

describe('a dose', () => {
  it('hooks the player a little more each time, works less the more they are used to it, and lets go by the day clean', () => {
    const once = dosed('glitter', 1);
    const often = dosed('glitter', 6);
    expect(dependenceAt(once.drugs.glitter, NOON, H, T)).toBeCloseTo(H.dependence.perDose * DEALING.drugs.glitter!.hook);
    expect(dependenceAt(often.drugs.glitter, NOON + 15 * HOUR, H, T)).toBeGreaterThan(dependenceAt(once.drugs.glitter, NOON, H, T) * 4);
    // The sixth works less than the first.
    expect(often.active[0]!.strength).toBeLessThan(once.active[0]!.strength);
    // A week clean takes most of it away.
    const last = often.drugs.glitter!.last;
    expect(dependenceAt(often.drugs.glitter, last + 7 * DAY, H, T)).toBeLessThan(dependenceAt(often.drugs.glitter, last, H, T) - 7 * H.dependence.cleanDay + 0.001);
  });

  it('is likelier an overdose on top of others', () => {
    const fresh = freshHabit();
    const stacked = dosed('glitter', 2, NOON, HOUR / 4);
    expect(overdoseOdds(stacked, 'glitter', NOON + HOUR, H, T)).toBeGreaterThan(overdoseOdds(fresh, 'glitter', NOON, H, T) * 2);
    expect(overdoseOdds(stacked, 'glitter', NOON + 10 * HOUR, H, T)).toBeCloseTo(H.overdose.base.glitter!);
  });

  it('does what it does while it lasts: Black Lace armor, damage and crits for less health; Glitter talk and a blur', () => {
    const lace = dosed('black-lace', 1);
    const fx = effectsAt(lace, NOON + 1, H, T);
    expect(fx.armor).toBe(20);
    expect(fx.power).toBeCloseTo(1.15);
    expect(fx.maxHealth).toBeCloseTo(0.65);
    const glitter = effectsAt(dosed('glitter', 1), NOON + 1, H, T);
    expect(glitter.charisma).toBe(2);
    expect(glitter.aim).toBeLessThan(1);
    // Worn off, nothing.
    expect(effectsAt(lace, NOON + (H.effects['black-lace']!.minutes * 60_000) / T + 1, H, T).armor).toBe(0);
  });

  it('brings on craving, then withdrawal, then a collapse, the longer a habit goes without', () => {
    const hooked = dosed('glitter', 8, NOON, HOUR * 2);
    const last = hooked.drugs.glitter!.last;
    expect(stageAt(hooked, last + H.craving.hours * HOUR + 1, H, T)?.stage).toBe('craving');
    expect(stageAt(hooked, last + H.withdrawal.hours * HOUR + 1, H, T)?.stage).toBe('withdrawal');
    expect(stageAt(hooked, last + H.severe.hours * HOUR + 1, H, T)?.stage).toBe('severe');
    const shaking = effectsAt(hooked, last + H.withdrawal.hours * HOUR + 1, H, T);
    expect(shaking.charisma).toBe(-H.withdrawal.charisma);
    expect(shaking.aim).toBeCloseTo(H.withdrawal.aim);
  });

  it('takes a Black Lace habit toward the edge, which wears off clean', () => {
    const laced = dosed('black-lace', 12, NOON, HOUR);
    const now = laced.edgeAt;
    expect(edgeAt(laced, now, H, T)).toBeGreaterThanOrEqual(H.edge.numb);
    expect(effectsAt(laced, now + 11 * HOUR, H, T).numb).toBe(true);
    expect(edgeAt(laced, now + 60 * DAY, H, T)).toBe(0);
  });
});

describe('the player taking a dose', () => {
  it('uses it from the inventory: in effect, hooked, and told when it wears off', () => {
    const game = play(inside(empty, { items: [doses('black-lace', 2)] }));
    const max = game.health(NOON).max;
    expect(game.consume('black-lace', NOON)).toBe(true);
    const view = game.habit(NOON)!;
    expect(view.active.map((a) => a.drug)).toEqual(['black-lace']);
    expect(view.drugs[0]!.dependence).toBeGreaterThan(0);
    expect(game.health(NOON).max).toBeLessThan(max);
    const worn = NOON + (H.effects['black-lace']!.minutes * 60_000) / T + 1;
    game.tick(worn);
    expect(game.habit(worn)!.active).toEqual([]);
    expect(game.health(worn).max).toBe(max);
  });

  it('has an overdose kill the player alone, with nobody to help', () => {
    const deadly = safe({ overdose: { ...H.overdose, base: { glitter: 1 }, most: 1, saved: 0 } });
    const game = play(inside(empty, { items: [doses('glitter', 1)] }), rulesWith(deadly));
    let flatlined = '';
    game.events.on('flatlined', ({ text }) => (flatlined = text));
    game.consume('glitter', NOON);
    expect(flatlined).not.toBe('');
    expect(flatlined).not.toMatch(/[{}]/);
  });

  it('has someone here get help in time, now and then: the hospital, and a bill', () => {
    const lucky = safe({ overdose: { ...H.overdose, base: { glitter: 1 }, most: 1, saved: 1 } });
    const game = play(inside(shop, { items: [doses('glitter', 1)] }), rulesWith(lucky));
    let flatlined = false;
    game.events.on('flatlined', () => (flatlined = true));
    game.consume('glitter', NOON);
    expect(flatlined).toBe(false);
    expect(game.wallet.eddies).toBeLessThan(2000);
    expect(game.interior?.business).toBe('hospital');
  });

  it('collapses a bad habit put off too long into the hospital, detoxed', () => {
    const habit = dosed('glitter', 8, NOON - 40 * HOUR, HOUR);
    const game = play(inside(empty, { habit }), rulesWith(), NOON);
    game.tick(NOON + 1);
    const view = game.habit(NOON + 1)!;
    expect(view.drugs[0]!.dependence).toBeLessThan(Math.round(dependenceAt(habit.drugs.glitter, NOON, H, T)));
    expect(game.health(NOON + 1).current).toBeLessThan(game.health(NOON + 1).max);
  });

  it('takes talking and running off the table in a fight once the player is past the edge', () => {
    const habit = { ...freshHabit(), edge: 90, edgeAt: NOON };
    const game = play(inside(shop, { habit }), rulesWith(safe({ edge: { ...H.edge, snapChance: 0 } })));
    const someone = game.peopleHere(NOON)[0]!.person;
    game.attack(someone.id, NOON);
    const moves = game.fightView()!.moves;
    expect(moves.find((m) => m.id === 'talk')?.enabled).toBe(false);
    expect(moves.find((m) => m.id === 'run')?.enabled).toBe(false);
  });

  it('keeps the habit through a save', () => {
    const habit = dosed('dorph', 3);
    const game = play(inside(empty, { habit }));
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, 0, NOON))))!;
    expect(new Game(world, rulesWith(), resume(world, save)!).habitSaved).toEqual(game.habitSaved);
  });
});

describe('the lines of a habit', () => {
  it('has three or more for every drug and every turn, and fill for anyone', () => {
    const vars: Record<string, string> = { drug: 'Glitter', ward: 'Night City Medical Center', bill: 'The bill: 80 €$.', who: 'a woman in a red coat', place: 'Kabuki Market' };
    for (const drug of Object.keys(DEALING.drugs)) {
      expect(H.effects[drug], drug).toBeDefined();
      expect(H.lines.use[drug]?.length, drug).toBeGreaterThanOrEqual(3);
      expect(H.overdose.base[drug], drug).toBeGreaterThan(0);
    }
    for (const [key, pool] of Object.entries(H.lines)) {
      for (const lines of key === 'use' ? Object.values(pool as Record<string, string[]>) : [pool as string[]]) {
        expect(lines.length, key).toBeGreaterThanOrEqual(3);
        for (const text of lines) expect(text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`), `${key}: ${text}`).not.toMatch(/[{}]/);
      }
    }
  });
});
