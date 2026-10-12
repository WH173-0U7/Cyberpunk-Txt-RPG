import type { MapState, World } from './types';

/** Where a player has got to in their city: enough to put them back exactly there. */
export interface Progress {
  current: string;
  visited: string[];
  discovered: string[];
}

/** What gets written to the player's device. The city itself is rebuilt from its seed. */
export interface SaveData extends Progress {
  /** Save format. */
  version: 1;
  /** `GENERATOR_VERSION` when saved. A different one means the seed no longer builds this city. */
  generator: number;
  seed: string;
  /** Milliseconds since 1970. */
  savedAt: number;
}

export function createSave(seed: string, state: MapState, generator: number, now = Date.now()): SaveData {
  return {
    version: 1,
    generator,
    seed,
    current: state.current,
    visited: [...state.visited].sort(),
    discovered: [...state.discovered].sort(),
    savedAt: now,
  };
}

/** Reads back something that was saved, or null if it isn't a save this game understands. */
export function readSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const save = raw as Record<string, unknown>;
  const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
  if (save.version !== 1) return null;
  if (typeof save.generator !== 'number' || typeof save.savedAt !== 'number') return null;
  if (typeof save.seed !== 'string' || !/^[0-9a-f]{8}$/.test(save.seed)) return null;
  if (typeof save.current !== 'string' || !strings(save.visited) || !strings(save.discovered)) return null;
  return {
    version: 1,
    generator: save.generator,
    seed: save.seed,
    current: save.current,
    visited: save.visited,
    discovered: save.discovered,
    savedAt: save.savedAt,
  };
}

/** The progress in a save, checked against the city rebuilt from its seed. Null if they don't match. */
export function resume(world: World, save: SaveData): Progress | null {
  const known = (id: string) => id in world.locations;
  if (save.seed !== world.seed || !known(save.current)) return null;
  if (!save.visited.every(known) || !save.discovered.every(known)) return null;
  const visited = save.visited.includes(save.current) ? save.visited : [...save.visited, save.current];
  return { current: save.current, visited, discovered: save.discovered };
}
