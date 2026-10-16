import { personById, tiesOf, type Clock, type Person, type Population, type TieKind } from './people';
import { createRng } from './rng';
import type { Building, BuildingCategory, BuildingKind } from './types';

/**
 * The rooms inside a building, worked out from what it is (never drawn into the city, so a
 * room never moves a building): a storefront's floor, its restroom and the back where the
 * staff go; a hospital's ward; a motel's or a capsule hotel's numbered rooms, floor by floor;
 * an apartment block's lobby and its floors of units, a resident's home one of them; a tower's
 * lobby and its floors of offices. Who is in which room follows from where they are and what
 * they're doing (`roomOf`), so whoever is in the same room as the player is who sees them.
 */
export type RoomKind = 'main' | 'restroom' | 'back' | 'ward' | 'hall' | 'unit' | 'guest' | 'office';

export interface Room {
  /** `main`, `restroom`, `back`, `ward`, `hall:<floor>`, `unit:<floor>:<letter>`, `guest:<floor>:<n>`, `office:<floor>`. */
  id: string;
  kind: RoomKind;
  name: string;
  floor: number;
}

/** What rooms are called and how they're laid out (`src/data/rooms.ts`); the words and numbers are ours. */
export interface RoomsContent {
  /** The room you walk into: by business, else by the storefront's category, else by the building's kind. */
  main: { business: Record<string, string>; category: Partial<Record<BuildingCategory, string>>; kind: Partial<Record<BuildingKind, string>>; other: string };
  /** Behind the counter, staff only: by business, else by category. */
  back: { business: Record<string, string>; category: Partial<Record<BuildingCategory, string>>; other: string };
  restroom: string;
  ward: string;
  /** Units on a floor of a home, by the building's kind. */
  units: Partial<Record<BuildingKind, number>>;
  /** A lodging business's rooms: how many a floor, and what one's called ("Room", "Capsule"). */
  guests: Record<string, { perFloor: number; word: string }>;
  /** The share of the time someone at work is out back, and someone out is in the restroom. */
  breakShare: number;
  restroomShare: number;
  /** How the people at a hospital who aren't laid up split between the waiting room and the ward. */
  wardShare: number;
  /** Who works a tower's lobby rather than an office floor. */
  lobbyRoles: RegExp;
  /** A few words on each kind of room, said on walking in. */
  blurbs: Record<RoomKind, string[]>;
  /** What a motel or a capsule hotel rents for the night, by business: its name, a word on it, and the base price (priced by the place like a dish). */
  rent: Record<string, { name: string; note: string; price: number; desk: string }>;
  /** What's said of a door: shut to the player (`staffOnly`, `locked`, `guestLocked`), and knocking on one. `{room}`, `{work}`, `{who}`, `{mask}`. */
  lines: { staffOnly: string[]; locked: string[]; guestLocked: string[]; noAnswer: string[]; asleep: string[]; masked: string[]; stranger: string[]; through: string[]; letIn: string[]; rented: string[] };
}

/** A room rented for the night: where, which, and till when. */
export interface Lodging {
  building: string;
  room: string;
  until: number;
}

/** Whether the player can walk into a room: they're in it, it's open, it's the staff's, it's locked (a home's unit, someone else's rented room), or it's the one they've rented. */
export type RoomAccess = 'here' | 'open' | 'staff' | 'locked' | 'yours';

/** Where the player can go from where they are, for the rooms overlay. */
export interface RoomsView {
  room: Room;
  floor: number;
  /** The floors there are to walk. */
  floors: number;
  rooms: Array<{ room: Room; access: RoomAccess }>;
}

/** The ties that make a household: whoever someone lives with, in the same unit. */
const HOUSEHOLD: ReadonlySet<TieKind> = new Set<TieKind>(['spouse', 'partner', 'parent', 'child']);

/** How many floors there are to walk: the ground floor at least. */
export function floorsOf(building: Building): number {
  return Math.max(1, building.floors);
}

/** Whether people live on its floors in units (an apartment block, a megabuilding). */
export function hasUnits(building: Building, content: RoomsContent): boolean {
  return (content.units[building.kind] ?? 0) > 0;
}

function guestsOf(building: Building, content: RoomsContent): { perFloor: number; word: string } | null {
  return (building.business && content.guests[building.business]) || null;
}

/** The room you walk into. */
export function mainRoom(building: Building, content: RoomsContent): Room {
  const { main } = content;
  const name = (building.business && main.business[building.business]) || (building.kind === 'shops' ? main.category[building.category] : undefined) || main.kind[building.kind] || main.other;
  return { id: 'main', kind: 'main', name, floor: 1 };
}

const LETTERS = 'ABCDEFGHIJKLMNOP';

function unitRoom(floor: number, index: number): Room {
  const letter = LETTERS[index] ?? String(index + 1);
  return { id: `unit:${floor}:${letter}`, kind: 'unit', name: `Unit ${floor}${letter}`, floor };
}

function guestRoom(floor: number, n: number, word: string): Room {
  return { id: `guest:${floor}:${n}`, kind: 'guest', name: `${word} ${floor}${String(n).padStart(2, '0')}`, floor };
}

/** The rooms on one floor of a building, in the order they're listed: the one you're in, or walk into, first. */
export function roomsOn(building: Building, floor: number, content: RoomsContent): Room[] {
  const floors = floorsOf(building);
  if (floor < 1 || floor > floors) return [];
  const rooms: Room[] = [];
  const shop = building.kind === 'shops';
  const guests = guestsOf(building, content);
  const units = content.units[building.kind] ?? 0;
  if (floor === 1) {
    rooms.push(mainRoom(building, content));
    if (building.business === 'hospital') rooms.push({ id: 'ward', kind: 'ward', name: content.ward, floor: 1 });
    // Anywhere people come and go has a restroom; a home's units have their own.
    if (shop || building.kind === 'tower' || building.kind === 'warehouse' || building.kind === 'factory') rooms.push({ id: 'restroom', kind: 'restroom', name: content.restroom, floor: 1 });
    if (shop || building.kind === 'warehouse' || building.kind === 'factory') {
      const back = (building.business && content.back.business[building.business]) || (shop ? content.back.category[building.category] : undefined) || content.back.other;
      rooms.push({ id: 'back', kind: 'back', name: back, floor: 1 });
    }
  } else {
    rooms.push({ id: `hall:${floor}`, kind: 'hall', name: `Floor ${floor}`, floor });
    if (building.kind === 'tower') rooms.push({ id: `office:${floor}`, kind: 'office', name: `Floor ${floor} offices`, floor });
  }
  if (guests) for (let n = 1; n <= guests.perFloor; n++) rooms.push(guestRoom(floor, n, guests.word));
  for (let i = 0; i < units; i++) rooms.push(unitRoom(floor, i));
  return rooms;
}

/** The floors a building lets the player walk: a storefront that isn't lodging is its ground floor. */
export function walkableFloors(building: Building, content: RoomsContent): number {
  if (building.kind === 'shops' && !guestsOf(building, content)) return 1;
  if (building.kind === 'warehouse' || building.kind === 'factory' || building.kind === 'derelict') return 1;
  return floorsOf(building);
}

/** A room of a building by its id, or null if it has none such. */
export function roomById(building: Building, id: string, content: RoomsContent): Room | null {
  const [, floorText] = id.split(':');
  const floor = floorText ? Number(floorText) : 1;
  if (!Number.isInteger(floor) || floor > walkableFloors(building, content)) return null;
  return roomsOn(building, floor, content).find((r) => r.id === id) ?? null;
}

/** Whether a building has anywhere to go but the room you walk into. */
export function hasRooms(building: Building, content: RoomsContent): boolean {
  return walkableFloors(building, content) > 1 || roomsOn(building, 1, content).length > 1;
}

/**
 * The unit someone lives in, in the home they live in: the one their household shares (a
 * spouse, a partner, their parents, their children who live there too), drawn for it.
 */
export function unitOf(person: Person, building: Building, population: Population, content: RoomsContent): string | null {
  const units = content.units[building.kind] ?? 0;
  if (!units || person.home !== building.id) return null;
  let key = person.id;
  for (const tie of tiesOf(population, person.id)) {
    if (!HOUSEHOLD.has(tie.kind) || tie.to >= key) continue;
    if (personById(population, tie.to)?.home === building.id) key = tie.to;
  }
  const rng = createRng(`${building.id}:${key}:unit`);
  const floor = rng.int(1, floorsOf(building));
  return unitRoom(floor, rng.int(0, units - 1)).id;
}

/**
 * The room someone is in, in the building they're in: at home, their unit; laid up, the ward;
 * at work, the floor, now and then out back (a tower's people on their office's floor, its
 * guards and reception in the lobby); anyone else on the floor, now and then in the restroom.
 * Each of those is drawn for the person and the hour, so it holds while the hour does.
 */
export function roomOf(person: Person, building: Building, doing: string, clock: Clock, population: Population, content: RoomsContent): string {
  if (building.business === 'hospital' && /hospital bed/.test(doing)) return 'ward';
  if (person.home === building.id) return unitOf(person, building, population, content) ?? 'main';
  const rng = createRng(`${person.id}:${building.id}:room:${clock.day}:${clock.hour}`);
  const rooms = roomsOn(building, 1, content);
  const has = (id: string) => rooms.some((r) => r.id === id);
  if (person.job.building === building.id) {
    if (building.kind === 'tower') {
      if (content.lobbyRoles.test(person.job.role)) return 'main';
      const floors = floorsOf(building);
      return floors > 1 ? `office:${createRng(`${person.id}:office`).int(2, floors)}` : 'main';
    }
    if (building.business === 'hospital') return rng.chance(content.wardShare) ? 'ward' : 'main';
    return has('back') && rng.chance(content.breakShare) ? 'back' : 'main';
  }
  return has('restroom') && rng.chance(content.restroomShare) ? 'restroom' : 'main';
}
