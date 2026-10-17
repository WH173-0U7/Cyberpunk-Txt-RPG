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
import { PEOPLE } from '../src/data/people';
import { ROOMS } from '../src/data/rooms';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { stackSlots } from '../src/engine/carry';
import { accountOf, holderOf, ledgerOf, ownersOf } from '../src/engine/economy';
import { Game, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { tiesOf } from '../src/engine/people';
import { unitOf } from '../src/engine/rooms';
import { createSave, progressFor, readSave, type Progress, type SaveData } from '../src/engine/save';
import type { Building, Item, World } from '../src/engine/types';

const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, jobs: JOBS, life: LIFE, gear: GEAR, money: MONEY, combat: COMBAT, rooms: ROOMS, home: HOME };
const DAY = 86_400_000;
const NOW = Date.UTC(2077, 9, 12, 13, 0);
const SEED = '3c9d1e77';
const ECONOMY = LIFE.economy;

/** A game with the player inside a building, with what's given (money, items, a home, a stash). */
function gameIn(world: World, building: Building, extra: Partial<Progress> = {}, rules: GameRules = RULES): Game {
  const first = new Game(world, rules);
  first.start(NOW - DAY);
  const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, first, GENERATOR_VERSION, NOW - DAY)))) as SaveData;
  const progress = progressFor(world, { ...save, where: { x: building.x, y: building.y, place: null, station: null, building: building.id }, inside: building.id, room: 'main', ...extra }, GENERATOR_VERSION) as Progress;
  const game = new Game(world, rules, progress);
  game.start(NOW);
  return game;
}

const said = (game: Game) => {
  const lines: string[] = [];
  game.events.on('output', ({ text }) => lines.push(text));
  return lines;
};

describe("the player's home", () => {
  const world = generateWorld(SEED, CITY);
  const probe = new Game(world, RULES);
  const owners = ownersOf(world, probe.population, ECONOMY, SEED);
  const small = world.buildings.find((b) => b.kind === 'apartments' && b.floors < ECONOMY.smallBlock && owners.of.get(b.id)) as Building;
  const squat = world.buildings.find((b) => b.kind === 'derelict' || b.kind === 'shack') as Building;
  const taco: Item = { id: 'taco', kind: 'consumable', name: 'Taco', count: 3 };

  it('rents a unit nobody lives in at a block\'s door, a week up front to whoever owns it, and the bed raises the most energy', () => {
    expect(small, 'a small block with a landlord').toBeDefined();
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 } });
    const offer = game.homeOffer();
    expect(offer?.kind).toBe('rent');
    const rent = offer?.kind === 'rent' ? offer.rent : 0;
    expect(rent).toBeGreaterThan(0);
    const landlord = holderOf(owners.of.get(small.id), (id) => game.population.people.find((p) => p.id === id), (id) => tiesOf(game.population, id)) as string;
    const person = game.population.people.find((p) => p.id === landlord)!;
    const before = accountOf(person, game.lifeSaved, ledgerOf(person, world, game.population, ECONOMY, (s) => (game as unknown as { tierFn: (s: unknown) => 'everyday' }).tierFn(s), SEED), ECONOMY);
    const max = game.energy(NOW).max;
    expect(game.takeHome(NOW)).toBe(true);
    expect(game.wallet.account).toBe(1000 - rent);
    expect(game.lifeSaved.savings?.[landlord]).toBe(before + rent);
    const home = game.home(NOW)!;
    expect(home).toMatchObject({ rent, owed: 0, dueIn: 7, squat: false, bed: true, inside: true, atHome: false });
    expect(game.energy(NOW).max).toBe(max + ENERGY.bed);
    // Its unit is nobody else's, and it's open to the player alone: up they go.
    const unit = game.homeSaved!.room;
    expect(unit).toMatch(/^unit:/);
    const taken = game.population.people.filter((p) => p.home === small.id).map((p) => unitOf(p, small, game.population, ROOMS));
    expect(taken).not.toContain(unit);
    expect(game.homeOffer()).toMatchObject({ kind: 'go' });
    expect(game.goHome(NOW)).toBe(true);
    expect(game.room()?.id).toBe(unit);
    expect(game.homeOffer()).toMatchObject({ kind: 'stash', count: 0 });
  });

  it('keeps a stash at home, off the player: in a whole stack at a time, out as far as there is room, and kept through a save', () => {
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, items: [{ ...taco, in: 'jacket' }] });
    game.takeHome(NOW);
    expect(game.stash(), 'only at home').toBeNull();
    expect(game.stashIt('taco')).toBe(false);
    game.goHome(NOW);
    expect(game.stashIt('taco')).toBe(true);
    expect(game.inventory.some((i) => i.id === 'taco')).toBe(false);
    expect(game.stash()?.items).toEqual([{ id: 'taco', kind: 'consumable', name: 'Taco', count: 3 }]);
    expect(game.stash()?.slots).toBe(stackSlots(taco, 3, GEAR));
    // Kept through a save, and back out into a pocket.
    const save = readSave(JSON.parse(JSON.stringify(createSave(SEED, game, GENERATOR_VERSION, NOW)))) as SaveData;
    expect(save.stash).toHaveLength(1);
    const again = new Game(generateWorld(SEED, CITY), RULES, progressFor(world, save, GENERATOR_VERSION) as Progress);
    again.start(NOW);
    expect(again.home(NOW)?.atHome).toBe(true);
    expect(again.unstash('taco')).toBe(true);
    expect(again.inventory.find((i) => i.id === 'taco')?.count).toBe(3);
    expect(again.stash()?.items).toEqual([]);
    // A stash only holds so much.
    const tight: GameRules = { ...RULES, home: { ...HOME, stash: { ...HOME.stash, apartments: { slots: stackSlots(taco, 3, GEAR), maxGrams: 100_000 } } } };
    const full = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, items: [{ ...taco, in: 'jacket' }, { id: 'burrito-xxl', kind: 'consumable', name: 'Burrito XXL', count: 1, in: 'jacket' }] }, tight);
    full.takeHome(NOW);
    full.goHome(NOW);
    expect(full.stashIt('taco')).toBe(true);
    expect(full.stashIt('burrito-xxl')).toBe(false);
  });

  it('takes the rent every week, owes what it can\'t, warns, and puts the player out (the stash with them) when it\'s too far behind', () => {
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, items: [{ ...taco, in: 'jacket' }] });
    const lines = said(game);
    game.takeHome(NOW);
    game.goHome(NOW);
    game.stashIt('taco');
    const rent = game.home(NOW)!.rent;
    const account = game.wallet.account;
    game.tick(NOW + 7 * DAY);
    expect(game.wallet.account).toBe(account - rent);
    expect(game.home(NOW + 7 * DAY)).toMatchObject({ owed: 0, dueIn: 7 });
    // Broke: a week owed, then two (the warning), then out.
    (game as unknown as { money: { bills: number; coins: number; account: number } }).money = { bills: 0, coins: 0, account: 0 };
    game.tick(NOW + 14 * DAY);
    expect(game.home(NOW + 14 * DAY)).toMatchObject({ owed: rent, behind: 1 });
    game.tick(NOW + 21 * DAY);
    expect(game.home(NOW + 21 * DAY)?.behind).toBe(HOME.warnAt);
    expect(lines.some((l) => /Pay before the week's out|locks change/.test(l))).toBe(true);
    game.tick(NOW + 28 * DAY);
    expect(game.home(NOW + 28 * DAY)).toBeNull();
    expect(game.homeSaved).toBeNull();
    expect(game.stashSaved).toEqual([]);
    expect(lines.some((l) => /Evicted|out of|changed the locks/.test(l))).toBe(true);
    expect(game.room()?.id, 'shown out of the unit').toBe('main');
  });

  it('squats for nothing, with no bed, and now and then somebody goes through the stash', () => {
    expect(squat, 'a derelict building or a shack').toBeDefined();
    const raided: GameRules = { ...RULES, home: { ...HOME, squat: { raid: 1, take: 1 / 3 } } };
    const game = gameIn(world, squat, { money: { bills: 0, coins: 0, account: 0 }, items: [{ ...taco, in: 'jacket' }] }, raided);
    expect(game.homeOffer()).toEqual({ kind: 'squat' });
    const max = game.energy(NOW).max;
    expect(game.takeHome(NOW)).toBe(true);
    expect(game.home(NOW)).toMatchObject({ squat: true, bed: false, rent: 0, atHome: true });
    expect(game.energy(NOW).max).toBe(max);
    expect(game.stashIt('taco')).toBe(true);
    game.tick(NOW + 7 * DAY);
    expect(game.stashSaved[0]?.count).toBe(2);
    expect(game.home(NOW + 7 * DAY)).not.toBeNull();
  });

  it('turns away a mask, wants the first week up front, and won\'t let the player move out or move on with things in the stash', () => {
    const masked = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, gear: [...GEAR.start.map((p) => ({ ...p })), { id: 'mask', kind: 'nami-balaclava', in: null }] });
    expect(masked.masked()).toBeTruthy();
    expect(masked.takeHome(NOW)).toBe(false);
    expect(masked.homeSaved).toBeNull();
    const broke = gameIn(world, small, { money: { bills: 0, coins: 0, account: 0 } });
    expect(broke.takeHome(NOW)).toBe(false);
    expect(broke.homeSaved).toBeNull();
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 }, items: [{ ...taco, in: 'jacket' }] });
    game.takeHome(NOW);
    game.goHome(NOW);
    game.stashIt('taco');
    expect(game.moveOut(NOW)).toBe(false);
    game.unstash('taco');
    expect(game.moveOut(NOW)).toBe(true);
    expect(game.home(NOW)).toBeNull();
    expect(game.homeOffer()).toBeNull();
  });

  it('reads back a home and a stash, and drops one that isn\'t one', () => {
    const game = gameIn(world, small, { money: { bills: 0, coins: 0, account: 1000 } });
    game.takeHome(NOW);
    const save = JSON.parse(JSON.stringify(createSave(SEED, game, GENERATOR_VERSION, NOW)));
    expect(readSave(save)?.home).toMatchObject({ building: small.id, owed: 0, squat: false });
    expect(readSave({ ...save, home: { building: small.id, room: 'unit:2:A' } })?.home).toBeNull();
    expect(readSave({ ...save, stash: [{ id: 'taco' }, taco] })?.stash).toEqual([taco]);
    // A home in a building the city doesn't have is no home.
    const gone = progressFor(world, { ...(readSave(save) as SaveData), home: { ...(readSave(save) as SaveData).home!, building: 'b-nowhere' } }, GENERATOR_VERSION);
    expect(gone?.home).toBeNull();
  });
});
