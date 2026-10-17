import { describe, expect, it } from 'vitest';
import { DOWNED } from '../src/data/downed';
import { killOdds, robsOdds, type Motive, type RevengeFor } from '../src/engine/downed';

/** An ordinary nature, alone with the player, no grudge. */
const ORDINARY = { temper: 0.5, courage: 0.5, warmth: 0.5 };
const odds = (motive: Motive, why: RevengeFor | null = null, traits = ORDINARY, grudge = 0, watching = 0, turf = false) => killOdds(motive, why, traits, grudge, watching, turf, DOWNED);

describe('at their mercy', () => {
  it('robs the player of everything, but someone who only fought back by their greed, and the NCPD never', () => {
    for (const motive of ['revenge', 'turf', 'robbery', 'debt'] as const) expect(robsOdds(motive, 0, DOWNED), motive).toBe(1);
    expect(robsOdds('police', 1, DOWNED)).toBe(0);
    expect(robsOdds('defense', 0, DOWNED)).toBe(0);
    expect(robsOdds('defense', 0.5, DOWNED)).toBeCloseTo(0.5 * DOWNED.rob.defense);
    expect(robsOdds('defense', 1, DOWNED)).toBe(1);
  });

  it('finishes the player by why they were fighting: revenge for a killing most of all, the NCPD never', () => {
    expect(odds('revenge', 'murder')).toBeGreaterThan(odds('revenge', 'gang'));
    expect(odds('revenge', 'gang')).toBeGreaterThan(odds('revenge', 'assault'));
    expect(odds('revenge', 'assault')).toBeGreaterThan(odds('turf'));
    expect(odds('turf')).toBeGreaterThan(odds('revenge', 'robbery'));
    expect(odds('revenge', 'robbery')).toBeGreaterThan(odds('robbery'));
    expect(odds('robbery')).toBeGreaterThan(odds('defense'));
    expect(odds('police', null, { temper: 1, courage: 1, warmth: 0 }, 100)).toBe(0);
    // An ordinary nature, alone, no grudge: the motive's own odds.
    expect(odds('revenge', 'robbery')).toBeCloseTo(DOWNED.kill.revenge.robbery);
    expect(odds('defense')).toBeCloseTo(DOWNED.kill.motive.defense);
  });

  it('is in the hot-tempered, the brave and the cold, and hardly in the calm, the timid and the warm', () => {
    const hard = odds('revenge', 'assault', { temper: 1, courage: 1, warmth: 0 });
    const soft = odds('revenge', 'assault', { temper: 0, courage: 0, warmth: 1 });
    expect(hard).toBeGreaterThan(2 * odds('revenge', 'assault'));
    expect(soft).toBeLessThan(0.3 * odds('revenge', 'assault'));
  });

  it('grows with the grudge they hold, up to a point, and shrinks with every one watching, but not on their turf', () => {
    expect(odds('turf', null, ORDINARY, 50)).toBeGreaterThan(odds('turf'));
    expect(odds('turf', null, ORDINARY, 500)).toBeCloseTo(odds('turf', null, ORDINARY, DOWNED.kill.grudgeMost));
    expect(odds('turf', null, ORDINARY, 0, 3)).toBeLessThan(odds('turf'));
    expect(odds('turf', null, ORDINARY, 0, 3, true)).toBeCloseTo(odds('turf'));
    // Never sure.
    expect(odds('revenge', 'murder', { temper: 1, courage: 1, warmth: 0 }, 100)).toBe(DOWNED.kill.most);
  });

  it('has lines for all of it, with nothing in them but what gets filled', () => {
    const vars = new Set(['who', 'Who', 'he', 'He', 'him', 'his', 'His', 's', 'es', 'haul', 'place', 'gang', 'where']);
    for (const [key, pool] of Object.entries(DOWNED.lines)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3);
      for (const line of pool) for (const [, name] of line.matchAll(/\{(\w+)\}/g)) expect(vars.has(name!), `${key}: {${name}}`).toBe(true);
    }
  });
});
