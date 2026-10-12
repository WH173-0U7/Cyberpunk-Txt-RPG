import { CELLS } from './game';
import type { EnergyState } from './energy';
import type { Item, ItemKind, Leg, MapState, Point, Trip, Wallet, Whereabouts, World } from './types';

const ITEM_KINDS: ReadonlySet<string> = new Set<ItemKind>(['weapon', 'attachment', 'cyberware', 'quickhack', 'clothing', 'consumable', 'shard', 'junk', 'component']);

/** Where a player has got to in their city: enough to put them back exactly there. */
export interface Progress {
  where: Whereabouts;
  visited: string[];
  discovered: string[];
  explored: number[];
  eddies: number;
  passUntil: number;
  /** A trip still underway. It keeps going on the clock while the game is closed. */
  trip: Trip | null;
  /** The building the player is inside (always the one at `where`), if any. */
  inside: string | null;
  /** What the player carries. */
  items: Item[];
  /** The player's energy, as last written down (null: a new player's). */
  energy: EnergyState | null;
}

/** What a save takes from a game in progress (a `Game` has all of it). */
export interface SaveSource {
  readonly mapState: MapState;
  readonly wallet: Wallet;
  readonly currentTrip: Trip | null;
  readonly interior: { id: string } | null;
  readonly inventory: readonly Item[];
  readonly energySaved: EnergyState;
}

/** What gets written to the player's device. The city itself is rebuilt from its seed. */
export interface SaveData extends Progress {
  /** Save format. */
  version: 2;
  /** `GENERATOR_VERSION` when saved. A different one means the seed no longer builds this city. */
  generator: number;
  seed: string;
  /** Milliseconds since 1970. */
  savedAt: number;
}

export function createSave(seed: string, game: SaveSource, generator: number, now = Date.now()): SaveData {
  const { mapState: state, wallet } = game;
  return {
    version: 2,
    generator,
    seed,
    where: { ...state.where },
    visited: [...state.visited].sort(),
    discovered: [...state.discovered].sort(),
    explored: [...state.explored].sort((a, b) => a - b),
    eddies: wallet.eddies,
    passUntil: wallet.passUntil,
    trip: game.currentTrip,
    inside: game.interior?.id ?? null,
    items: game.inventory.map((item) => ({ ...item })),
    energy: { ...game.energySaved },
    savedAt: now,
  };
}

/** The seed of anything that looks like a save, even an old one, so its city can start over. */
export function savedSeed(raw: unknown): string | null {
  const seed = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).seed : null;
  return typeof seed === 'string' && /^[0-9a-f]{8}$/.test(seed) ? seed : null;
}

/** Reads back something that was saved, or null if it isn't a save this game understands. */
export function readSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const save = raw as Record<string, unknown>;
  const seed = savedSeed(raw);
  if (save.version !== 2 || !seed) return null;
  if (!isNumber(save.generator) || !isNumber(save.savedAt) || !isNumber(save.eddies) || !isNumber(save.passUntil)) return null;
  if (!isWhereabouts(save.where) || !isStrings(save.visited) || !isStrings(save.discovered) || !isNumbers(save.explored)) return null;
  if (save.trip !== null && !isTrip(save.trip)) return null;
  return {
    version: 2,
    generator: save.generator,
    seed,
    where: save.where,
    visited: save.visited,
    discovered: save.discovered,
    explored: save.explored,
    eddies: save.eddies,
    passUntil: save.passUntil,
    trip: save.trip,
    // Saves from before buildings could be entered don't have it: the player was outside.
    inside: typeof save.inside === 'string' ? save.inside : null,
    // Nor do saves from before the inventory: the player carried nothing. Anything unreadable is dropped.
    items: Array.isArray(save.items) ? save.items.filter(isItem) : [],
    // And saves from before energy start the player off fresh.
    energy: isEnergy(save.energy) ? save.energy : null,
    savedAt: save.savedAt,
  };
}

/** The progress in a save, checked against the city rebuilt from its seed. Null if they don't match. */
export function resume(world: World, save: SaveData): Progress | null {
  const known = (id: string) => id in world.locations;
  const fits = (w: Whereabouts) =>
    (!w.place || known(w.place)) && (!w.station || w.station in world.transit.stations) && (!w.building || world.buildings.some((b) => b.id === w.building));
  if (save.seed !== world.seed || !fits(save.where) || (save.trip && !fits(save.trip.to))) return null;
  if (!save.visited.every(known) || !save.discovered.every(known)) return null;
  if (!save.explored.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < CELLS * CELLS)) return null;
  const { where, visited, discovered, explored, eddies, passUntil, trip, items, energy } = save;
  const here = where.place && !trip && !visited.includes(where.place) ? [where.place] : [];
  // Only ever inside the building the player stands at, and never mid-trip.
  const inside = !trip && save.inside && save.inside === where.building ? save.inside : null;
  return { where, visited: [...visited, ...here], discovered, explored, eddies, passUntil, trip, inside, items, energy };
}

function isItem(value: unknown): value is Item {
  const item = value as Record<string, unknown> | null;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.kind === 'string' &&
    ITEM_KINDS.has(item.kind) &&
    Number.isInteger(item.count) &&
    (item.count as number) > 0
  );
}

function isEnergy(value: unknown): value is EnergyState {
  const e = value as Record<string, unknown> | null;
  return (
    typeof e === 'object' &&
    e !== null &&
    isNumber(e.current) &&
    e.current >= 0 &&
    Number.isInteger(e.level) &&
    (e.level as number) >= 1 &&
    isNumber(e.xp) &&
    e.xp >= 0 &&
    isNumber(e.updatedAt)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

function isPoint(value: unknown): value is Point {
  const p = value as Record<string, unknown> | null;
  return typeof p === 'object' && p !== null && isNumber(p.x) && isNumber(p.y);
}

function isWhereabouts(value: unknown): value is Whereabouts {
  if (!isPoint(value)) return false;
  const w = value as unknown as Record<string, unknown>;
  const idOrNull = (v: unknown) => v === null || typeof v === 'string';
  return idOrNull(w.place) && idOrNull(w.station) && idOrNull(w.building);
}

function isLeg(value: unknown): value is Leg {
  const leg = value as Record<string, unknown> | null;
  if (typeof leg !== 'object' || leg === null) return false;
  const kindOk = leg.kind === 'walk' || leg.kind === 'wait' || leg.kind === 'ride';
  const pathOk = Array.isArray(leg.path) && leg.path.length > 0 && leg.path.every(isPoint);
  return kindOk && pathOk && isNumber(leg.minutes) && (leg.stations === undefined || isStrings(leg.stations));
}

function isTrip(value: unknown): value is Trip {
  const trip = value as Record<string, unknown> | null;
  if (typeof trip !== 'object' || trip === null) return false;
  return (
    (trip.mode === 'foot' || trip.mode === 'ncart') &&
    isPoint(trip.from) &&
    isWhereabouts(trip.to) &&
    Array.isArray(trip.legs) &&
    trip.legs.length > 0 &&
    trip.legs.every(isLeg) &&
    isNumber(trip.minutes) &&
    isNumber(trip.fare) &&
    isNumber(trip.startedAt) &&
    isNumber(trip.endsAt)
  );
}
