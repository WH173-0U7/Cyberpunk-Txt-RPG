import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, randomSeed } from '../src/engine/rng';

describe('createRng', () => {
  it('repeats exactly for the same seed', () => {
    const a = createRng('7f3a29c1');
    const b = createRng('7f3a29c1');
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });

  it('differs between seeds', () => {
    expect(createRng('00000001').next()).not.toBe(createRng('00000002').next());
  });

  it('keeps every helper within its bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 1000; i++) {
      const n = rng.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      const int = rng.int(2, 4);
      expect([2, 3, 4]).toContain(int);
      const range = rng.range(-5, 5);
      expect(range).toBeGreaterThanOrEqual(-5);
      expect(range).toBeLessThan(5);
    }
  });

  it('reaches every integer in a range', () => {
    const rng = createRng('coverage');
    const seen = new Set(Array.from({ length: 200 }, () => rng.int(1, 6)));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('shuffles a copy without losing or duplicating items', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = createRng('shuffle').shuffle(items);
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('refuses to pick from nothing', () => {
    expect(() => createRng('x').pick([])).toThrow();
  });
});

describe('hashSeed', () => {
  it('returns unsigned 32-bit numbers', () => {
    for (const seed of ['', 'a', 'night city', 'ffffffff']) {
      const h = hashSeed(seed);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
});

describe('randomSeed', () => {
  it('makes 8 hex characters', () => {
    expect(randomSeed()).toMatch(/^[0-9a-f]{8}$/);
  });
});
