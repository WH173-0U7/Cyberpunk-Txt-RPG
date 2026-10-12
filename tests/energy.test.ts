import { describe, expect, it } from 'vitest';
import { ENERGY } from '../src/data/energy';
import { energyAt, energyStatus, freshEnergy, maxEnergy, spendEnergy, xpToNext, type EnergyRules } from '../src/engine/energy';

const RULES: EnergyRules = { start: 5, perLevel: 1, bed: 5, regenMinutes: 6, xpPerPoint: 1, exhaustedBonus: 2, xpFirstLevel: 10, xpGrowth: 1.5 };
const MINUTE = 60_000;
const T0 = Date.UTC(2077, 9, 12, 20, 0);

describe('energy', () => {
  it('starts full at level 1, and holds more with each level and with a bed at home', () => {
    const fresh = freshEnergy(RULES);
    expect(energyStatus(fresh, RULES, 1, false, T0)).toEqual({ current: 5, max: 5, level: 1, xp: 0, xpToNext: 10, nextPointAt: null });
    expect(maxEnergy(RULES, 3, false)).toBe(7);
    expect(maxEnergy(RULES, 3, true)).toBe(12);
  });

  it('refills a point at a time on the clock, sped up by the test speed, and never past full', () => {
    const empty = { current: 0, level: 1, xp: 0, updatedAt: T0 };
    expect(energyAt(empty, RULES, 1, false, T0 + 6 * MINUTE)).toBeCloseTo(1);
    expect(energyStatus(empty, RULES, 1, false, T0 + 9 * MINUTE)).toMatchObject({ current: 1, nextPointAt: T0 + 12 * MINUTE });
    expect(energyAt(empty, RULES, 60, false, T0 + 6_000)).toBeCloseTo(1);
    // Days later (the game was closed): full, no more.
    expect(energyStatus(empty, RULES, 1, false, T0 + 3 * 86_400_000)).toMatchObject({ current: 5, nextPointAt: null });
  });

  it('only spends what there is, and spending trains it: more for running down to empty', () => {
    const full = freshEnergy(RULES);
    expect(spendEnergy(full, 6, RULES, 1, false, T0)).toBeNull();
    expect(spendEnergy(full, 0, RULES, 1, false, T0)).toBeNull();

    const some = spendEnergy(full, 3, RULES, 1, false, T0);
    expect(some).toEqual({ state: { current: 2, level: 1, xp: 3, updatedAt: T0 }, levels: 0 });
    // The rest, down to empty: the two points, plus the bonus for exhausting it.
    const empty = some && spendEnergy(some.state, 2, RULES, 1, false, T0);
    expect(empty?.state).toMatchObject({ current: 0, xp: 7 });
  });

  it('levels up once enough is spent, holding more from then on', () => {
    let state = freshEnergy(RULES);
    let now = T0;
    let levels = 0;
    // Run it down to empty and wait for a full bar, over and over.
    while (state.level === 1) {
      const spent = spendEnergy(state, Math.floor(energyAt(state, RULES, 1, false, now)), RULES, 1, false, now);
      if (!spent) throw new Error('nothing to spend');
      state = spent.state;
      levels += spent.levels;
      now += 30 * MINUTE;
    }
    expect(levels).toBe(1);
    expect(state.xp).toBeLessThan(xpToNext(RULES, 2));
    expect(energyStatus(state, RULES, 1, false, now).max).toBe(6);
  });

  it('is a very long grind with the game’s own numbers', () => {
    // Each level takes more than the last.
    for (let level = 1; level < 30; level++) expect(xpToNext(ENERGY, level + 1)).toBeGreaterThan(xpToNext(ENERGY, level));
    // It starts very low.
    expect(maxEnergy(ENERGY, 1, false)).toBeLessThanOrEqual(10);
    // Spending every point the moment it comes back, a whole day in real time isn't enough for level 2.
    const perDay = (24 * 60) / ENERGY.regenMinutes;
    expect(perDay * ENERGY.xpPerPoint).toBeLessThan(xpToNext(ENERGY, 1));
  });
});
