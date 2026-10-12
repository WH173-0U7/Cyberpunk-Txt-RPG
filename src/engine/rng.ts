/** Deterministic random numbers: the same seed always produces the same sequence. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy; the input is left alone. */
  shuffle<T>(items: readonly T[]): T[];
}

/** Turns any string into a well-mixed 32-bit number (FNV-1a plus a final avalanche). */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A mulberry32 generator seeded from a string. */
export function createRng(seed: string): Rng {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() needs at least one item');
    return items[Math.floor(next() * items.length)] as T;
  }

  function shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    pick,
    shuffle,
  };
}

/** A fresh random seed: 8 hex characters, short enough to read out or share. */
export function randomSeed(): string {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return (value[0] ?? 0).toString(16).padStart(8, '0');
}
