/**
 * A skill that grows with use: experience from using it, levels that take more each time,
 * and a bonus per level. Charisma is the first: how well the player gets on with people.
 */
export interface SkillRules {
  /** Experience to go from level 1 to 2; each level after needs more, by `xpGrowth`. */
  xpFirstLevel: number;
  xpGrowth: number;
  /** What each level above the first adds to the skill's bonus (0.2: twenty percent). */
  perLevel: number;
  /** Said on reaching a level, with `{level}` filled in. */
  levelLine: string;
}

export interface SkillState {
  level: number;
  /** Experience toward the next level. */
  xp: number;
}

export interface SkillStatus extends SkillState {
  xpToNext: number;
  /** 1 at level 1, more with each level. */
  bonus: number;
}

export function freshSkill(): SkillState {
  return { level: 1, xp: 0 };
}

export function xpToNext(rules: SkillRules, level: number): number {
  return Math.round(rules.xpFirstLevel * Math.pow(level, rules.xpGrowth));
}

export function skillBonus(rules: SkillRules, level: number): number {
  return 1 + (level - 1) * rules.perLevel;
}

export function skillStatus(state: SkillState, rules: SkillRules): SkillStatus {
  return { ...state, xpToNext: xpToNext(rules, state.level), bonus: skillBonus(rules, state.level) };
}

/** Earns experience, going up a level (or more) when it's enough. */
export function gainXp(state: SkillState, amount: number, rules: SkillRules): { state: SkillState; levels: number } {
  let { level, xp } = state;
  xp += Math.max(0, amount);
  let levels = 0;
  for (let need = xpToNext(rules, level); xp >= need; need = xpToNext(rules, level)) {
    xp -= need;
    level++;
    levels++;
  }
  return { state: { level, xp }, levels };
}
