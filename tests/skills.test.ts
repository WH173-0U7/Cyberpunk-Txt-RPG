import { describe, expect, it } from 'vitest';
import { CHARISMA } from '../src/data/skills';
import { freshSkill, gainXp, skillBonus, skillStatus, xpToNext, type SkillRules } from '../src/engine/skills';

const RULES: SkillRules = { xpFirstLevel: 10, xpGrowth: 1.5, perLevel: 0.2, levelLine: 'Level {level}.' };

describe('skills', () => {
  it('start at level 1 with no bonus, and need more for each level', () => {
    expect(skillStatus(freshSkill(), RULES)).toEqual({ level: 1, xp: 0, xpToNext: 10, bonus: 1 });
    expect(xpToNext(RULES, 2)).toBe(28);
    expect(xpToNext(RULES, 4)).toBe(80);
    expect(skillBonus(RULES, 3)).toBeCloseTo(1.4);
  });

  it('level up on enough experience, more than once at a time if it comes to that, and never lose any', () => {
    expect(gainXp(freshSkill(), 9, RULES)).toEqual({ state: { level: 1, xp: 9 }, levels: 0 });
    expect(gainXp(freshSkill(), 10, RULES)).toEqual({ state: { level: 2, xp: 0 }, levels: 1 });
    expect(gainXp(freshSkill(), 45, RULES)).toEqual({ state: { level: 3, xp: 7 }, levels: 2 });
    expect(gainXp({ level: 2, xp: 5 }, -3, RULES)).toEqual({ state: { level: 2, xp: 5 }, levels: 0 });
  });

  it("has the game's charisma within reason", () => {
    expect(CHARISMA.xpFirstLevel).toBeGreaterThan(0);
    expect(CHARISMA.perLevel).toBeGreaterThan(0);
    expect(CHARISMA.levelLine).toContain('{level}');
    // Level 2 is a dozen or so chats; level 5 a long way off.
    expect(xpToNext(CHARISMA, 1) / 2).toBeLessThanOrEqual(20);
    expect([1, 2, 3, 4].reduce((sum, level) => sum + xpToNext(CHARISMA, level), 0) / 2).toBeGreaterThan(100);
  });
});
