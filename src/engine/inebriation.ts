/**
 * Inebriation: the alcohol in the player, in units. Every drink adds its units, and the body
 * clears them at a steady rate on the game's clock (sped up by the same test speed as trips),
 * while the game is closed too. The more units, the worse the stage, from tipsy to blackout
 * drunk, and the worse the player's screen looks. There's no other effect yet.
 */
export interface InebriationStage {
  id: string;
  label: string;
  /** From this many units up. */
  at: number;
  /** Said on drinking up to this. */
  up: string;
  /** Said on sobering down to this. */
  down: string;
}

export interface InebriationRules {
  /** Units the body clears in an hour on the game's clock. */
  soberPerHour: number;
  /** Units at which the screen is as bad as it gets. */
  worst: number;
  /** The stages, lightest first. Below the first, the player is sober. */
  stages: InebriationStage[];
  /** Said on sobering up altogether. */
  sober: string;
}

/** Units as they stood at `updatedAt`. What's left now depends on how long it's been clearing since. */
export interface InebriationState {
  units: number;
  /** Milliseconds since 1970. */
  updatedAt: number;
}

/** How drunk the player is at a moment, worked out. */
export interface InebriationStatus {
  units: number;
  /** Null when sober. */
  stage: InebriationStage | null;
  /** How bad it looks, 0 (sober) to 1 (as bad as it gets). */
  severity: number;
  /** When the player will be sober (null when they are). */
  soberAt: number | null;
}

/** A new player: sober. */
export function freshInebriation(): InebriationState {
  return { units: 0, updatedAt: 0 };
}

/** How long one unit takes to clear, in clock milliseconds. */
function msPerUnit(rules: InebriationRules, timeScale: number): number {
  return 3_600_000 / rules.soberPerHour / timeScale;
}

/** Units left at `now`, cleared since they were last written down, never below none. */
export function unitsAt(state: InebriationState, rules: InebriationRules, timeScale: number, now: number): number {
  const cleared = Math.max(0, now - state.updatedAt) / msPerUnit(rules, timeScale);
  return Math.max(0, state.units - cleared);
}

/** The stage this many units puts the player at, or null if sober. */
export function stageAt(units: number, rules: InebriationRules): InebriationStage | null {
  let stage: InebriationStage | null = null;
  for (const s of rules.stages) if (units >= s.at) stage = s;
  return stage;
}

export function inebriationStatus(state: InebriationState, rules: InebriationRules, timeScale: number, now: number): InebriationStatus {
  const units = unitsAt(state, rules, timeScale, now);
  const stage = stageAt(units, rules);
  const first = rules.stages[0]?.at ?? Infinity;
  // Tipsy is already something to see; blackout drunk is as bad as it gets.
  const severity = stage ? Math.min(1, 0.2 + (0.8 * (units - first)) / Math.max(1e-9, rules.worst - first)) : 0;
  const soberAt = stage ? now + Math.ceil((units - first) * msPerUnit(rules, timeScale)) + 1 : null;
  return { units, stage, severity, soberAt };
}

/** Drinks `units` more at `now`, on top of whatever is still in the system. */
export function drink(state: InebriationState, units: number, rules: InebriationRules, timeScale: number, now: number): InebriationState {
  return { units: unitsAt(state, rules, timeScale, now) + Math.max(0, units), updatedAt: now };
}
