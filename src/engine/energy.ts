/**
 * Energy: what the player spends to do things. It refills on the clock, in real time (sped up
 * by the same test speed as trips), while the game is closed too. Spending it trains it: every
 * point spent is experience, running right down to empty is worth a bonus, and enough
 * experience raises the energy level, and with it the most energy the player can hold. It's
 * meant to be a very long grind. A home with a bed raises the most too.
 */
export interface EnergyRules {
  /** The most energy at level 1. */
  start: number;
  /** How much each level after the first adds to the most. */
  perLevel: number;
  /** How much a home with a bed adds to the most. */
  bed: number;
  /** Minutes (on the game's clock) to get one point back. */
  regenMinutes: number;
  /** Experience for each point spent. */
  xpPerPoint: number;
  /** Extra experience for running all the way down to empty. */
  exhaustedBonus: number;
  /** Experience to go from level 1 to 2; each level after needs more, by `xpGrowth`. */
  xpFirstLevel: number;
  xpGrowth: number;
}

/** Energy as it stood at `updatedAt`. What it is now depends on how long it's been refilling since. */
export interface EnergyState {
  /** Points at `updatedAt`, fractions included. */
  current: number;
  level: number;
  /** Experience toward the next level. */
  xp: number;
  /** Milliseconds since 1970. */
  updatedAt: number;
}

/** Everything about the player's energy at a moment, worked out. */
export interface EnergyStatus {
  /** Whole points the player has. */
  current: number;
  max: number;
  level: number;
  xp: number;
  /** Experience the next level takes, all told. */
  xpToNext: number;
  /** When the next point comes back (null when full). */
  nextPointAt: number | null;
}

/** The most energy at a level, with or without a bed at home. */
export function maxEnergy(rules: EnergyRules, level: number, bed: boolean): number {
  return rules.start + (level - 1) * rules.perLevel + (bed ? rules.bed : 0);
}

/** Experience it takes to go from `level` to the next. It climbs steeply. */
export function xpToNext(rules: EnergyRules, level: number): number {
  return Math.round(rules.xpFirstLevel * Math.pow(level, rules.xpGrowth));
}

/** A new player: level 1, full. */
export function freshEnergy(rules: EnergyRules): EnergyState {
  return { current: maxEnergy(rules, 1, false), level: 1, xp: 0, updatedAt: 0 };
}

/** How long one point takes to come back, in clock milliseconds. */
function msPerPoint(rules: EnergyRules, timeScale: number): number {
  return (rules.regenMinutes * 60_000) / timeScale;
}

/** Energy at `now`, refilled since it was last spent, fractions included, never over the most. */
export function energyAt(state: EnergyState, rules: EnergyRules, timeScale: number, bed: boolean, now: number): number {
  const max = maxEnergy(rules, state.level, bed);
  const refilled = Math.max(0, now - state.updatedAt) / msPerPoint(rules, timeScale);
  return Math.min(max, state.current + refilled);
}

export function energyStatus(state: EnergyState, rules: EnergyRules, timeScale: number, bed: boolean, now: number): EnergyStatus {
  const max = maxEnergy(rules, state.level, bed);
  const value = energyAt(state, rules, timeScale, bed, now);
  const whole = Math.floor(value + 1e-9);
  const nextPointAt = whole >= max ? null : now + Math.ceil((whole + 1 - value) * msPerPoint(rules, timeScale));
  return { current: whole, max, level: state.level, xp: state.xp, xpToNext: xpToNext(rules, state.level), nextPointAt };
}

/**
 * Spends `amount` points at `now`, training energy as it goes. Null if there isn't enough.
 * Says how many levels it gained (usually none: levels take a long time).
 */
export function spendEnergy(
  state: EnergyState,
  amount: number,
  rules: EnergyRules,
  timeScale: number,
  bed: boolean,
  now: number,
): { state: EnergyState; levels: number } | null {
  const value = energyAt(state, rules, timeScale, bed, now);
  if (amount <= 0 || value + 1e-9 < amount) return null;
  const current = Math.max(0, value - amount);
  let xp = state.xp + amount * rules.xpPerPoint;
  // Running right down to empty: exhaustion is what trains it best.
  if (current < 1) xp += rules.exhaustedBonus;
  let level = state.level;
  let levels = 0;
  for (let need = xpToNext(rules, level); xp >= need; need = xpToNext(rules, level)) {
    xp -= need;
    level++;
    levels++;
  }
  return { state: { current, level, xp, updatedAt: now }, levels };
}
