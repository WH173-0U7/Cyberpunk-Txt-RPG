import { describe, expect, it } from 'vitest';
import { INEBRIATION } from '../src/data/inebriation';
import { drink, freshInebriation, inebriationStatus, stageAt, unitsAt, type InebriationRules } from '../src/engine/inebriation';

const tipsy = { id: 'tipsy', label: 'Tipsy', at: 1, up: 'Tipsy.', down: 'Just tipsy.' };
const drunk = { id: 'drunk', label: 'Drunk', at: 3, up: 'Drunk.', down: 'Down to drunk.' };
// Two units an hour, so the numbers stay round.
const RULES: InebriationRules = { soberPerHour: 2, worst: 6, sober: 'Sober.', stages: [tipsy, drunk] };
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const T0 = Date.UTC(2077, 9, 12, 20, 0);

describe('inebriation', () => {
  it('starts sober', () => {
    expect(inebriationStatus(freshInebriation(), RULES, 1, T0)).toEqual({ units: 0, stage: null, severity: 0, soberAt: null });
  });

  it('adds every drink on top of what is still in the system', () => {
    const one = drink(freshInebriation(), 1, RULES, 1, T0);
    expect(one).toEqual({ units: 1, updatedAt: T0 });
    // Half an hour on, half of it has cleared; the next drink lands on the rest.
    expect(unitsAt(one, RULES, 1, T0 + 15 * MINUTE)).toBeCloseTo(0.5);
    expect(drink(one, 2, RULES, 1, T0 + 15 * MINUTE)).toEqual({ units: 2.5, updatedAt: T0 + 15 * MINUTE });
    expect(drink(one, -5, RULES, 1, T0)).toEqual(one);
  });

  it('clears on the clock, sped up by the test speed, and never below none', () => {
    const two = { units: 2, updatedAt: T0 };
    expect(unitsAt(two, RULES, 1, T0 + HOUR / 2)).toBeCloseTo(1);
    expect(unitsAt(two, RULES, 60, T0 + 30_000)).toBeCloseTo(1);
    expect(unitsAt(two, RULES, 1, T0 + 10 * HOUR)).toBe(0);
    // A clock that went backwards clears nothing.
    expect(unitsAt(two, RULES, 1, T0 - HOUR)).toBe(2);
  });

  it('stages by units, says when it will be over, and how bad it looks', () => {
    expect(stageAt(0.99, RULES)).toBeNull();
    expect(stageAt(1, RULES)).toBe(tipsy);
    expect(stageAt(2.99, RULES)).toBe(tipsy);
    expect(stageAt(3, RULES)).toBe(drunk);
    expect(stageAt(30, RULES)).toBe(drunk);

    const status = inebriationStatus({ units: 3, updatedAt: T0 }, RULES, 1, T0);
    expect(status.stage).toBe(drunk);
    expect(status.severity).toBeCloseTo(0.2 + 0.8 * (2 / 5));
    // Sober once below the first stage: two units to clear at two an hour.
    expect(status.soberAt).toBe(T0 + HOUR + 1);
    expect(inebriationStatus({ units: 3, updatedAt: T0 }, RULES, 1, status.soberAt as number).stage).toBeNull();
    // Tipsy already shows; nothing worse than the worst.
    expect(inebriationStatus({ units: 1, updatedAt: T0 }, RULES, 1, T0).severity).toBeCloseTo(0.2);
    expect(inebriationStatus({ units: 20, updatedAt: T0 }, RULES, 1, T0).severity).toBe(1);
  });

  it("has the game's stages in order, with lines", () => {
    const { stages, worst, soberPerHour } = INEBRIATION;
    expect(soberPerHour).toBeGreaterThan(0);
    expect(stages.length).toBeGreaterThanOrEqual(2);
    for (const [i, stage] of stages.entries()) {
      expect(stage.at, stage.id).toBeGreaterThan(i ? (stages[i - 1]?.at ?? 0) : 0);
      expect(stage.up, stage.id).not.toBe('');
      // Every stage but the worst can be sobered down to.
      if (i < stages.length - 1) expect(stage.down, stage.id).not.toBe('');
    }
    expect(worst).toBeGreaterThanOrEqual(stages[stages.length - 1]?.at ?? 0);
  });
});
