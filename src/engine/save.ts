import { CELLS } from './game';
import type { Leg, MapState, Point, Trip, Wallet, Whereabouts, World } from './types';

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

export function createSave(
  seed: string,
  state: MapState,
  wallet: Wallet,
  trip: Trip | null,
  inside: string | null,
  generator: number,
  now = Date.now(),
): SaveData {
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
    trip,
    inside,
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
  const { where, visited, discovered, explored, eddies, passUntil, trip } = save;
  const here = where.place && !trip && !visited.includes(where.place) ? [where.place] : [];
  // Only ever inside the building the player stands at, and never mid-trip.
  const inside = !trip && save.inside && save.inside === where.building ? save.inside : null;
  return { where, visited: [...visited, ...here], discovered, explored, eddies, passUntil, trip, inside };
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
