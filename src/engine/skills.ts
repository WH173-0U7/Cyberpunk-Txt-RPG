/**
 * A skill that grows with use: experience from using it, levels that take more each time,
 * and a bonus by level. Every skill starts the player off worse than anyone: below `average`
 * (where an ordinary person stands) the bonus is a penalty, from `floor` at level 1 up to
 * nothing at all at `average`, and only above it does each level carry them further.
 */
export interface SkillRules {
  /** Experience to go from level 1 to 2; each level after needs more, by `xpGrowth`. */
  xpFirstLevel: number;
  xpGrowth: number;
  /** The level an ordinary person is at: the bonus is 1 there. */
  average: number;
  /** The bonus at level 1, under 1: how much worse than an ordinary person the player starts. */
  floor: number;
  /** What each level above `average` adds to the bonus (0.2: twenty percent). */
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
  /** `floor` at level 1, 1 at `average`, more with each level after. */
  bonus: number;
}

export function freshSkill(): SkillState {
  return { level: 1, xp: 0 };
}

export function xpToNext(rules: SkillRules, level: number): number {
  return Math.round(rules.xpFirstLevel * Math.pow(level, rules.xpGrowth));
}

export function skillBonus(rules: SkillRules, level: number): number {
  if (level >= rules.average) return 1 + (level - rules.average) * rules.perLevel;
  // Below an ordinary person: from the floor at level 1, evenly up to nothing at `average`.
  return rules.floor + ((1 - rules.floor) * (level - 1)) / Math.max(1, rules.average - 1);
}

/**
 * The skill as levels above an ordinary person (below, as many as it falls short by, in the
 * same terms): for whatever adds a little per level rather than multiplying by the bonus.
 */
export function skillEdge(rules: SkillRules, level: number): number {
  return (skillBonus(rules, level) - 1) / rules.perLevel;
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
