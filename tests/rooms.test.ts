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
import { ROOMS } from '../src/data/rooms';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game, ROOM_FOR_THE_NIGHT, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, peopleAt, tiesOf, type Clock } from '../src/engine/people';
import { hasRooms, mainRoom, roomById, roomOf, roomsOn, unitOf, walkableFloors } from '../src/engine/rooms';
import { createSave, readSave, resume } from '../src/engine/save';
import { freshSociety } from '../src/engine/society';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, rooms: ROOMS, clock: clockOf };
/** A weekday at noon. */
const NOON = Date.UTC(2077, 9, 13, 12, 0);
/** An evening, when most people are home and awake. */
const NIGHT = Date.UTC(2077, 9, 13, 20, 0);

const building = (test: (b: Building) => boolean): Building => {
  const found = world.buildings.find(test);
  if (!found) throw new Error('no such building');
  return found;
};
/** The player inside a building of this city, as a fresh save would have it. */
const insideOf = (b: Building, now: number, extra = {}) => {
  const game = new Game(world, RULES, {
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
    money: { bills: 500, coins: 0, account: 0 },
    energy: null,
    inebriation: null,
    society: null,
    charisma: null,
    job: null,
    life: null,
    ...extra,
  });
  game.start(now);
  return game;
};

describe('the rooms of a building', () => {
  it('give a storefront its floor, a restroom and the back, named for what it is', () => {
    const eatery = building((b) => b.category === 'food' && b.kind === 'shops' && b.business !== 'noodle-bar');
    expect(roomsOn(eatery, 1, ROOMS).map((r) => r.id)).toEqual(['main', 'restroom', 'back']);
    expect(mainRoom(eatery, ROOMS).name).toBe('Dining room');
    expect(roomById(eatery, 'back', ROOMS)?.name).toBe('Kitchen');
    // Only its ground floor is anyone's to walk.
    expect(walkableFloors(eatery, ROOMS)).toBe(1);
    expect(roomById(eatery, 'hall:2', ROOMS)).toBeNull();
    expect(hasRooms(eatery, ROOMS)).toBe(true);
    const hospital = building((b) => b.business === 'hospital');
    expect(roomsOn(hospital, 1, ROOMS).map((r) => r.id)).toContain('ward');
  });

  it('give a motel numbered rooms on every floor, and a home its units floor by floor', () => {
    const motel = building((b) => b.business === 'motel' || b.business === 'capsule-hotel');
    const guests = ROOMS.guests[motel.business!]!;
    expect(walkableFloors(motel, ROOMS)).toBe(Math.max(1, motel.floors));
    expect(roomsOn(motel, 1, ROOMS).filter((r) => r.kind === 'guest')).toHaveLength(guests.perFloor);
    expect(roomById(motel, 'guest:1:3', ROOMS)?.name).toBe(`${guests.word} 103`);
    const block = building((b) => b.kind === 'apartments');
    expect(roomsOn(block, 1, ROOMS)[0]).toMatchObject({ id: 'main', name: 'Lobby' });
    expect(roomsOn(block, 2, ROOMS).map((r) => r.id)).toEqual(['hall:2', ...'ABCDEF'.split('').map((l) => `unit:2:${l}`)]);
    expect(roomById(block, 'unit:2:B', ROOMS)?.name).toBe('Unit 2B');
    expect(roomById(block, `unit:${block.floors + 1}:A`, ROOMS)).toBeNull();
  });

  it('puts a household in one unit of the home it shares, and anyone at home in theirs', () => {
    const couple = population.people.flatMap((p) => tiesOf(population, p.id).filter((t) => t.kind === 'spouse').map((t) => [p, population.people.find((q) => q.id === t.to)!] as const)).find(([a, b]) => a.home === b.home && a.home && world.buildings.find((x) => x.id === a.home)?.kind === 'apartments');
    if (!couple) throw new Error('no couple at home together');
    const [a, b] = couple;
    const home = building((x) => x.id === a.home);
    const unit = unitOf(a, home, population, ROOMS);
    expect(unit).toMatch(/^unit:\d+:[A-F]$/);
    expect(unitOf(b, home, population, ROOMS)).toBe(unit);
    expect(roomById(home, unit!, ROOMS)).not.toBeNull();
    expect(roomOf(a, home, 'at home, asleep', clockOf(NIGHT), population, ROOMS)).toBe(unit);
    // Somewhere they don't live, they have no unit.
    const other = building((x) => x.kind === 'apartments' && x.id !== home.id);
    expect(unitOf(a, other, population, ROOMS)).toBeNull();
  });

  it('has staff on the floor or out back, everyone else on the floor or in the restroom, and the same all the hour', () => {
    const shop = building((b) => b.category === 'food' && b.kind === 'shops');
    const clock = clockOf(NOON);
    const seen = new Set<string>();
    for (const person of population.people.slice(0, 600)) {
      const room = roomOf(person, shop, 'eating', clock, population, ROOMS);
      if (person.job.building === shop.id) expect(['main', 'back']).toContain(room);
      else expect(['main', 'restroom']).toContain(room);
      seen.add(room);
      expect(roomOf(person, shop, 'eating', clock, population, ROOMS)).toBe(room);
    }
    expect(seen).toContain('main');
    expect(seen).toContain('restroom');
  });
});

describe('the player in the rooms', () => {
  it('sees only who is in the same room, and buys only at the counter', () => {
    const shop = world.buildings.find((b) => b.category === 'food' && b.kind === 'shops' && peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes).length > 3)!;
    const game = insideOf(shop, NOON);
    expect(game.room()).toMatchObject({ id: 'main' });
    const everyone = peopleAt(game.population, world, { kind: 'building', id: shop.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out);
    const floor = game.peopleHere(NOON).map((p) => p.person.id);
    expect(floor.length).toBeLessThanOrEqual(everyone.length);
    for (const p of game.peopleHere(NOON)) expect(roomOf(p.person, shop, p.doing, clockOf(NOON), game.population, ROOMS)).toBe('main');
    expect(game.menu(NOON)).not.toBeNull();
    // The restroom: private, and no counter.
    expect(game.goRoom('restroom', NOON)).toBe(true);
    expect(game.room()?.id).toBe('restroom');
    expect(game.menu(NOON)).toBeNull();
    for (const p of game.peopleHere(NOON)) expect(floor).not.toContain(p.person.id);
    // The back is the staff's.
    expect(game.goRoom('back', NOON)).toBe(false);
    expect(game.roomsView(NOON)?.rooms.find((r) => r.room.id === 'back')?.access).toBe('staff');
    // Back out on the floor, and out the door: walking in again is the floor.
    expect(game.goRoom('main', NOON)).toBe(true);
    expect(game.leave()).toBe(true);
    expect(game.room()).toBeNull();
  });

  it('takes the stairs, finds a home locked, and gets let in only by someone who likes the player', () => {
    const clock = clockOf(NIGHT);
    const block = world.buildings.find((b) => b.kind === 'apartments' && peopleAt(population, world, { kind: 'building', id: b.id }, clock, FOOD.dishes).some((p) => !/asleep/.test(p.doing)))!;
    const resident = peopleAt(population, world, { kind: 'building', id: block.id }, clock, FOOD.dishes).find((p) => !/asleep/.test(p.doing))!.person;
    const unit = unitOf(resident, block, population, ROOMS)!;
    const floor = roomById(block, unit, ROOMS)!.floor;
    const stranger = insideOf(block, NIGHT);
    // The lobby at night: everyone's upstairs, at home.
    expect(stranger.peopleHere(NIGHT).some((p) => p.person.id === resident.id)).toBe(false);
    expect(stranger.goFloor(floor, NIGHT)).toBe(floor !== 1);
    expect(stranger.roomsView(NIGHT)?.rooms.find((r) => r.room.id === unit)?.access).toBe('locked');
    expect(stranger.goRoom(unit, NIGHT)).toBe(false);
    expect(stranger.knock(unit, NIGHT)).toBe(true);
    expect(stranger.room()?.id).not.toBe(unit);
    // A friend of theirs knocks and is let in, and finds them home.
    const friend = insideOf(block, NIGHT, {
      society: {
        ...freshSociety(),
        standings: { [resident.id]: { met: true, rapport: 80, grudge: 0, at: NIGHT, talks: 6, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} } },
        known: { [resident.id]: { met: true, seen: true, told: false, facts: ['name' as const], log: [] } },
      },
    });
    expect(friend.knock(unit, NIGHT)).toBe(true);
    expect(friend.room()?.id).toBe(unit);
    expect(friend.peopleHere(NIGHT).some((p) => p.person.id === resident.id)).toBe(true);
    // The room is kept through a save.
    const read = readSave(JSON.parse(JSON.stringify(createSave(world.seed, friend, 4, NIGHT))));
    expect(read?.room).toBe(unit);
    const again = new Game(world, RULES, resume(world, read!)!);
    expect(again.room()?.id).toBe(unit);
  });

  it('rents a room at a motel till noon, and lets the player into it and no other', () => {
    const motel = building((b) => b.business === 'motel' || b.business === 'capsule-hotel');
    const game = insideOf(motel, NIGHT, { jobs: [] });
    const menu = game.menu(NIGHT);
    const item = menu?.items.find((i) => i.id === ROOM_FOR_THE_NIGHT);
    if (!item) return; // Shut for the night: nobody at the desk.
    const room = item.detail!.split(' · ')[0]!;
    expect(game.buy(ROOM_FOR_THE_NIGHT, NIGHT)).toBe(true);
    const rented = game.rented(NIGHT)!;
    expect(roomById(motel, rented.room, ROOMS)?.name).toBe(room);
    // Till noon the next day.
    expect(new Date(rented.until).getUTCHours()).toBe(12);
    expect(rented.until).toBeGreaterThan(NIGHT);
    expect(game.rented(rented.until + 1)).toBeNull();
    const floor = roomById(motel, rented.room, ROOMS)!.floor;
    if (floor > 1) game.goFloor(floor, NIGHT);
    expect(game.goRoom(rented.room, NIGHT)).toBe(true);
    expect(game.peopleHere(NIGHT)).toEqual([]);
    const other = roomsOn(motel, floor, ROOMS).find((r) => r.kind === 'guest' && r.id !== rented.room)!;
    expect(game.goRoom(other.id, NIGHT)).toBe(false);
    expect(game.lodgingSaved).toEqual(rented);
  });
});
