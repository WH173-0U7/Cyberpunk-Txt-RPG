import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { HOME } from '../src/data/home';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { NEEDS } from '../src/data/needs';
import { PEOPLE } from '../src/data/people';
import { ROOMS } from '../src/data/rooms';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { energyAt, energyStatus } from '../src/engine/energy';
import { Game, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { eat, fillOf, freshHunger, fullnessAt, hungerStage, hungerStatus } from '../src/engine/needs';
import { createSave, progressFor, readSave, type Progress, type SaveData } from '../src/engine/save';
import type { Building, Item, World } from '../src/engine/types';

const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, jobs: JOBS, life: LIFE, gear: GEAR, money: MONEY, combat: COMBAT, rooms: ROOMS, home: HOME, needs: NEEDS };
const HUNGER = NEEDS.hunger;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const NOW = Date.UTC(2077, 9, 12, 13, 0);
const SEED = '3c9d1e77';
/** A game hour, in clock milliseconds at the test speed. */
const GAME_HOUR = HOUR / TRAVEL.timeScale;

/** A game with the player inside a building, with what's given (fed, unless it says otherwise). */
function gameIn(world: World, building: Building, extra: Partial<Progress> = {}, rules: GameRules = RULES): Game {
  const first = new Game(world, rules);
  first.start(NOW - DAY);
  const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, first, GENERATOR_VERSION, NOW - DAY)))) as SaveData;
  const progress = progressFor(world, { ...save, where: { x: building.x, y: building.y, place: null, station: null, building: building.id }, inside: building.id, room: 'main', hunger: { value: 80, updatedAt: NOW }, ...extra }, GENERATOR_VERSION) as Progress;
  const game = new Game(world, rules, progress);
  game.start(NOW);
  return game;
}

const said = (game: Game) => {
  const lines: string[] = [];
  game.events.on('output', ({ text }) => lines.push(text));
  return lines;
};

const dish = (id: string) => FOOD.dishes.find((d) => d.id === id)!;
const food = (id: string, count = 2): Item => ({ id, kind: 'consumable', name: dish(id).name, count, in: 'jacket' });

describe('hunger', () => {
  it('empties on the clock, a point an hour and a fifth, through peckish, hungry and starving', () => {
    const state = { value: 80, updatedAt: NOW };
    expect(fullnessAt(state, HUNGER, TRAVEL.timeScale, NOW)).toBe(80);
    expect(fullnessAt(state, HUNGER, TRAVEL.timeScale, NOW + 6 * GAME_HOUR)).toBeCloseTo(50);
    expect(fullnessAt(state, HUNGER, TRAVEL.timeScale, NOW + 100 * GAME_HOUR)).toBe(0);
    // Not started yet (a new player before the game starts): it holds.
    expect(fullnessAt(freshHunger(HUNGER), HUNGER, TRAVEL.timeScale, NOW + DAY)).toBe(HUNGER.start);
    expect(hungerStage(60, HUNGER)).toBeNull();
    expect(hungerStage(40, HUNGER)?.id).toBe('peckish');
    expect(hungerStage(20, HUNGER)?.id).toBe('hungry');
    expect(hungerStage(5, HUNGER)?.id).toBe('starving');
    // Each stage holds less, and says when the next sets in.
    const fed = hungerStatus(state, HUNGER, TRAVEL.timeScale, NOW);
    expect(fed).toMatchObject({ stage: null, energy: 1, health: 1, next: { id: 'peckish' } });
    expect(fed.nextAt).toBeCloseTo(NOW + 6 * GAME_HOUR, -2);
    const starving = hungerStatus({ value: 5, updatedAt: NOW }, HUNGER, TRAVEL.timeScale, NOW);
    expect(starving).toMatchObject({ stage: { id: 'starving' }, next: null, nextAt: null });
    expect(starving.energy).toBeLessThan(hungerStatus({ value: 20, updatedAt: NOW }, HUNGER, TRAVEL.timeScale, NOW).energy);
    expect(starving.health).toBeLessThan(1);
  });

  it('is filled by everything eaten or drunk: a meal a third, a big one nearly half, a snack or a drink a little, never past full', () => {
    for (const d of FOOD.dishes) expect(fillOf(d, HUNGER), d.id).toBeGreaterThan(0);
    expect(fillOf(dish('burrito-xxl'), HUNGER)).toBeGreaterThan(fillOf(dish('hawt-dawg'), HUNGER));
    expect(fillOf(dish('hawt-dawg'), HUNGER)).toBeGreaterThan(fillOf(dish('pop-turd'), HUNGER));
    expect(fillOf(dish('pop-turd'), HUNGER)).toBeGreaterThan(fillOf(dish('water'), HUNGER));
    // Every food fills more than any drink.
    const drinks = FOOD.dishes.filter((d) => d.kind !== 'food').map((d) => fillOf(d, HUNGER));
    for (const d of FOOD.dishes.filter((d) => d.kind === 'food')) expect(fillOf(d, HUNGER), d.id).toBeGreaterThanOrEqual(Math.max(...drinks));
    expect(eat({ value: 80, updatedAt: NOW }, 45, HUNGER, TRAVEL.timeScale, NOW + GAME_HOUR).value).toBe(100);
  });

  it('caps the most energy hungry, and health too starving; eating lifts it without handing back what never came', () => {
    const world = generateWorld(SEED, CITY);
    const shop = world.buildings.find((b) => b.category === 'commodity')!;
    const full = gameIn(world, shop);
    const most = full.energy(NOW).max;
    const health = full.health(NOW).max;
    const game = gameIn(world, shop, { hunger: { value: 5, updatedAt: NOW }, energy: { current: 2, level: 1, xp: 0, updatedAt: NOW }, items: [food('taco'), food('burrito-xxl', 3)] });
    expect(game.hunger(NOW)?.stage?.id).toBe('starving');
    expect(game.energy(NOW).max).toBe(Math.round(most * 0.5));
    expect(game.health(NOW).max).toBe(Math.round(health * 0.8));
    // Left a long while, energy comes back only as far as the cap.
    const later = NOW + 2 * GAME_HOUR;
    expect(game.energy(later).current).toBe(Math.round(most * 0.5));
    // Eating lifts the cap, but what's there stays what it was; it comes back from there.
    const lines = said(game);
    expect(game.consume('burrito-xxl', later)).toBe(true);
    expect(game.hunger(later)?.stage?.id).toBe('peckish');
    expect(lines.some((l) => HUNGER.lines.better.includes(l))).toBe(true);
    expect(game.energy(later).max).toBe(most);
    expect(game.energy(later).current).toBe(Math.round(most * 0.5));
    expect(game.energy(later + (ENERGY.regenMinutes * 60_000) / TRAVEL.timeScale).current).toBe(Math.round(most * 0.5) + 1);
    expect(game.health(later).max).toBe(health);
  });

  it("won't take food past full, but a drink still goes down", () => {
    const world = generateWorld(SEED, CITY);
    const shop = world.buildings.find((b) => b.category === 'commodity')!;
    const game = gameIn(world, shop, { hunger: { value: 95, updatedAt: NOW }, items: [food('taco'), food('water')] });
    const lines = said(game);
    expect(game.consume('taco', NOW)).toBe(false);
    expect(lines.some((l) => HUNGER.lines.full.includes(l))).toBe(true);
    expect(game.inventory.find((i) => i.id === 'taco')?.count).toBe(2);
    expect(game.consume('water', NOW)).toBe(true);
    expect(game.hunger(NOW)?.value).toBe(99);
  });

  it('says so as each stage sets in, and once on coming back to one that bites', () => {
    const world = generateWorld(SEED, CITY);
    const shop = world.buildings.find((b) => b.category === 'commodity')!;
    const game = gameIn(world, shop, { hunger: { value: 51, updatedAt: NOW } });
    const lines = said(game);
    game.tick(NOW + GAME_HOUR);
    expect(lines).toContain(HUNGER.stages[0]!.down);
    game.tick(NOW + 2 * GAME_HOUR);
    expect(lines.filter((l) => l === HUNGER.stages[0]!.down)).toHaveLength(1);
    // Coming back to the game starving: told once, at the start.
    const away = new Game(world, RULES, progressFor(world, readSave(JSON.parse(JSON.stringify(createSave(SEED, game, GENERATOR_VERSION, NOW)))) as SaveData, GENERATOR_VERSION) as Progress);
    const back: string[] = [];
    away.events.on('output', ({ text }) => back.push(text));
    away.start(NOW + 60 * GAME_HOUR);
    expect(back).toContain(HUNGER.stages[2]!.down);
  });

  it('keeps how full the player is through a save, and an older save is fed', () => {
    const world = generateWorld(SEED, CITY);
    const shop = world.buildings.find((b) => b.category === 'commodity')!;
    const game = gameIn(world, shop, { hunger: { value: 33, updatedAt: NOW } });
    const save = readSave(JSON.parse(JSON.stringify(createSave(SEED, game, GENERATOR_VERSION, NOW)))) as SaveData;
    expect(save.hunger).toEqual({ value: 33, updatedAt: NOW });
    const { hunger: _gone, ...older } = save;
    const read = readSave(JSON.parse(JSON.stringify(older))) as SaveData;
    expect(read.hunger).toBeNull();
    const again = new Game(world, RULES, progressFor(world, read, GENERATOR_VERSION) as Progress);
    again.start(NOW);
    expect(again.hunger(NOW)?.value).toBe(HUNGER.start);
    expect(again.hunger(NOW + 6 * GAME_HOUR)?.value).toBeCloseTo(HUNGER.start - 30);
    // A save with nonsense in it is read as fed.
    expect(readSave({ ...JSON.parse(JSON.stringify(save)), hunger: { value: 400, updatedAt: NOW } })?.hunger).toBeNull();
    // Without the rules, nobody is ever hungry.
    const plain = gameIn(world, shop, { hunger: { value: 0, updatedAt: NOW } }, { ...RULES, needs: undefined });
    expect(plain.hunger(NOW)).toBeNull();
    expect(plain.energy(NOW).max).toBe(ENERGY.start);
  });
});

describe('resting', () => {
  const world = generateWorld(SEED, CITY);
  const probe = new Game(world, RULES);
  const small = world.buildings.find((b) => b.kind === 'apartments' && b.floors < LIFE.economy.smallBlock && probe.population.people.some((p) => p.home === b.id))!;
  const squat = world.buildings.find((b) => b.kind === 'derelict' || b.kind === 'shack')!;
  const motel = world.buildings.find((b) => b.business === 'motel' || b.business === 'capsule-hotel')!;
  const point = (ENERGY.regenMinutes * 60_000) / TRAVEL.timeScale;

  it('brings energy back three times as fast in a bed at home, and only once the player is in it', () => {
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, energy: { current: 0, level: 1, xp: 0, updatedAt: NOW } });
    expect(game.takeHome(NOW)).toBe(true);
    game.tick(NOW);
    expect(game.resting(NOW), 'the lobby is no bed').toBe(false);
    expect(game.goHome(NOW)).toBe(true);
    game.tick(NOW);
    expect(game.resting(NOW)).toBe(true);
    expect(game.energySaved.rate).toBe(NEEDS.rest.bed);
    expect(game.energy(NOW + 2 * point).current).toBe(2 * NEEDS.rest.bed);
    // Up and out: what came back in bed stays, and the rest comes back as usual.
    game.leave();
    game.tick(NOW + 2 * point);
    expect(game.resting(NOW + 2 * point)).toBe(false);
    expect(game.energySaved.rate).toBeUndefined();
    expect(game.energy(NOW + 4 * point).current).toBe(2 * NEEDS.rest.bed + 2);
  });

  it('brings it back half again as fast in a squat, and three times as fast in a room rented for the night', () => {
    const squatting = gameIn(world, squat, { energy: { current: 0, level: 1, xp: 0, updatedAt: NOW } });
    expect(squatting.takeHome(NOW)).toBe(true);
    squatting.tick(NOW);
    expect(squatting.energySaved.rate).toBe(NEEDS.rest.squat);
    expect(squatting.energy(NOW + 4 * point).current).toBe(4 * NEEDS.rest.squat);
    const room = 'guest:1:1';
    const lodged = gameIn(world, motel, { energy: { current: 0, level: 1, xp: 0, updatedAt: NOW }, lodging: { building: motel.id, room, until: NOW + DAY }, room });
    lodged.tick(NOW);
    expect(lodged.resting(NOW)).toBe(true);
    expect(lodged.energy(NOW + 2 * point).current).toBe(2 * NEEDS.rest.bed);
    // Someone else's room, or the lobby, is no rest.
    const lobby = gameIn(world, motel, { energy: { current: 0, level: 1, xp: 0, updatedAt: NOW }, lodging: { building: motel.id, room, until: NOW + DAY } });
    lobby.tick(NOW);
    expect(lobby.resting(NOW)).toBe(false);
  });

  it('keeps the rate it was resting at through a save, and checks it when read', () => {
    const game = gameIn(world, squat, { energy: { current: 0, level: 1, xp: 0, updatedAt: NOW } });
    game.takeHome(NOW);
    game.tick(NOW);
    const save = readSave(JSON.parse(JSON.stringify(createSave(SEED, game, GENERATOR_VERSION, NOW)))) as SaveData;
    expect(save.energy?.rate).toBe(NEEDS.rest.squat);
    expect(readSave({ ...JSON.parse(JSON.stringify(save)), energy: { ...save.energy, rate: -2 } })?.energy).toBeNull();
    // The engine's arithmetic: a rate speeds the refill and its next point, never past the most.
    const state = { current: 0, level: 1, xp: 0, updatedAt: NOW, rate: 2 };
    expect(energyAt(state, ENERGY, TRAVEL.timeScale, false, NOW + point)).toBeCloseTo(2);
    expect(energyStatus(state, ENERGY, TRAVEL.timeScale, false, NOW).nextPointAt).toBe(NOW + Math.ceil(point / 2));
    expect(energyAt(state, ENERGY, TRAVEL.timeScale, false, NOW + 100 * point, 0.5)).toBe(ENERGY.start / 2);
  });
});
