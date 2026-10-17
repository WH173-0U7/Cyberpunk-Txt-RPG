import type { Dish } from './food';

/**
 * The player's needs: eating and resting. Hunger is how full they are, 0 (empty) to 100 (they
 * couldn't eat another bite); it empties on the game's clock (sped up by the same test speed as
 * trips), while the game is closed too, and whatever they eat or drink fills it by what it is
 * (a dish's own `fill`, else by its kind). The emptier, the worse: hungry, they can hold less
 * energy; starving, less health too. Nothing worse comes of it: nobody starves to death.
 * Resting is where the player is: energy comes back faster in a bed (their own, or a room they've
 * rented for the night), and a little faster in a squat, than out on the streets.
 */

/** A stage of hunger: under `below` full, what's left of the most energy and health, and what's said as it sets in. */
export interface HungerStage {
  id: string;
  label: string;
  below: number;
  energy: number;
  health: number;
  down: string;
}

export interface HungerRules {
  /** Hours (on the game's clock) a full stomach takes to empty. */
  hours: number;
  /** How full a new player is. */
  start: number;
  /** Past this, there's no eating more (a drink still goes down). */
  full: number;
  /** What a dish fills by its kind, unless it says its own. */
  fill: Record<Dish['kind'], number>;
  /** The stages, the mildest first. */
  stages: HungerStage[];
  /** Said refusing food when full, and when eating takes the player out of a stage. */
  lines: { full: string[]; better: string[] };
}

/** How much faster energy comes back resting: in a bed, in a squat. */
export interface RestRules {
  bed: number;
  squat: number;
}

export interface NeedsRules {
  hunger: HungerRules;
  rest: RestRules;
}

/** How full the player was at `updatedAt` (0: not started yet, so it holds where it is). */
export interface HungerState {
  value: number;
  updatedAt: number;
}

export interface HungerStatus {
  /** How full, 0 to 100, fractions included. */
  value: number;
  /** Null while fed. */
  stage: HungerStage | null;
  /** What's left of the most energy and health. */
  energy: number;
  health: number;
  /** The next stage, and when it sets in (null when starving already). */
  next: HungerStage | null;
  nextAt: number | null;
}

const HOUR = 3_600_000;

export function freshHunger(rules: HungerRules): HungerState {
  return { value: rules.start, updatedAt: 0 };
}

/** How fast it empties, a point to so many clock milliseconds. */
function msPerPoint(rules: HungerRules, timeScale: number): number {
  return (rules.hours * HOUR) / 100 / timeScale;
}

/** How full the player is at `now`. */
export function fullnessAt(state: HungerState, rules: HungerRules, timeScale: number, now: number): number {
  if (!state.updatedAt) return state.value;
  return Math.max(0, state.value - Math.max(0, now - state.updatedAt) / msPerPoint(rules, timeScale));
}

/** The stage this full puts the player at: the worst one it's under, or null. */
export function hungerStage(value: number, rules: HungerRules): HungerStage | null {
  let stage: HungerStage | null = null;
  for (const s of rules.stages) if (value < s.below) stage = s;
  return stage;
}

export function hungerStatus(state: HungerState, rules: HungerRules, timeScale: number, now: number): HungerStatus {
  const value = fullnessAt(state, rules, timeScale, now);
  const stage = hungerStage(value, rules);
  // The next stage down is the first one it isn't under yet, from the mildest.
  const next = rules.stages.find((s) => value >= s.below && (!stage || s.below < stage.below));
  const nextAt = next && state.updatedAt ? now + Math.ceil((value - next.below) * msPerPoint(rules, timeScale)) + 1 : null;
  return { value, stage, energy: stage?.energy ?? 1, health: stage?.health ?? 1, next: next ?? null, nextAt };
}

/** What a dish fills. */
export function fillOf(dish: Pick<Dish, 'kind' | 'fill'>, rules: HungerRules): number {
  return dish.fill ?? rules.fill[dish.kind];
}

/** Eats or drinks something that fills `fill` at `now`, never past full. */
export function eat(state: HungerState, fill: number, rules: HungerRules, timeScale: number, now: number): HungerState {
  return { value: Math.min(100, fullnessAt(state, rules, timeScale, now) + fill), updatedAt: now };
}
