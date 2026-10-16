import { describe, expect, it } from 'vitest';
import { BRAWLER, CHARISMA, STANDING, TOUGHNESS, WEAPON_MODEL, WEAPON_TYPE } from '../src/data/skills';
import { freshSkill, gainXp, skillBonus, skillEdge, skillStatus, xpToNext, type SkillRules } from '../src/engine/skills';

const RULES: SkillRules = { xpFirstLevel: 10, xpGrowth: 1.5, average: 4, floor: 0.4, perLevel: 0.2, levelLine: 'Level {level}.' };

describe('skills', () => {
  it('start at level 1 worse than anyone, are ordinary at the average, and better only past it', () => {
    expect(skillStatus(freshSkill(), RULES)).toEqual({ level: 1, xp: 0, xpToNext: 10, bonus: 0.4 });
    expect(xpToNext(RULES, 2)).toBe(28);
    expect(xpToNext(RULES, 4)).toBe(80);
    // From the floor, evenly up to nothing at all at the average.
    expect(skillBonus(RULES, 2)).toBeCloseTo(0.6);
    expect(skillBonus(RULES, 3)).toBeCloseTo(0.8);
    expect(skillBonus(RULES, 4)).toBe(1);
    expect(skillBonus(RULES, 6)).toBeCloseTo(1.4);
    // In levels past an ordinary person's: short of it below, past it above.
    expect(skillEdge(RULES, 1)).toBeCloseTo(-3);
    expect(skillEdge(RULES, 4)).toBe(0);
    expect(skillEdge(RULES, 7)).toBeCloseTo(3);
  });

  it("has every one of the game's skills start the player off worse than anyone", () => {
    for (const rules of [CHARISMA, BRAWLER, TOUGHNESS, WEAPON_TYPE, WEAPON_MODEL]) {
      expect(skillBonus(rules, 1)).toBeLessThan(1);
      expect(skillBonus(rules, rules.average)).toBe(1);
      expect(skillBonus(rules, rules.average + 1)).toBeGreaterThan(1);
      for (let level = 1; level < 12; level++) expect(skillBonus(rules, level + 1)).toBeGreaterThan(skillBonus(rules, level));
    }
    // Every level says where it leaves the player, from worse than most to a professional.
    expect(STANDING[0]?.from).toBeLessThan(0);
    expect(STANDING.map((s) => s.from)).toEqual([...STANDING.map((s) => s.from)].sort((a, b) => a - b));
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
