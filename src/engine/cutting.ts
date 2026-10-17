import type { SkillRules } from './skills';

/**
 * Cutting product. A cutting agent (bought, our own: the wiki names none) stretches a stack of
 * doses by one dose each, mixed through the whole stack, so every dose in it is that much
 * filler (`Item.cut`, the stack's share). Cut product sells as ever, but a heavy cut can hurt
 * whoever takes it (`harmOdds`: the share squared, by the cutter's Cutting skill), the gang may
 * taste it in their own product (`foundOdds`), and a cut dose the player takes is weaker and can
 * make them sick. The numbers and lines are `DEALING.cut`; the doing of it is `Game`'s.
 */

export interface CutLines {
  /** Cutting a stack (`{drug}`, `{share}` the filler now, as a percentage); one too heavy to take more. */
  cut: string[];
  full: string[];
  /** Word reaching the player of a buyer laid up, or dead, from a bad batch (`{who}`, `{drug}`). */
  harmed: string[];
  killed: string[];
  /** The gang tasting the cut in its own product (`{connect}`, `{gang}`, `{drug}`). */
  found: string[];
  /** A bad cut the player took themselves (`{drug}`). */
  sick: string[];
}

export interface CutRules {
  skill: SkillRules;
  /** The agent's component id (in `GEAR.components`), and the Cutting XP a dose cut. */
  agent: string;
  xp: number;
  /** The most filler a stack takes. */
  most: number;
  /** A cut dose sold: the odds it hurts the buyer (`base` times the share squared, over the Cutting bonus), the share of those that kill, the days laid up. */
  harm: { base: number; deadly: number; days: [number, number] };
  /** A cut dose of the gang's own product sold: the odds word gets back (`base` times the share, over the bonus), the trust it costs. */
  found: { base: number; trust: number };
  /** A cut dose taken: the odds it makes the player sick (`base` times the share squared, over the bonus), and the share of their most health it takes. */
  sick: { base: number; health: number };
  lines: CutLines;
}

/** A stack's filler share after cutting `agents` more doses into `count` at `share`. */
export function cutShare(count: number, share: number, agents: number): number {
  const total = count + agents;
  return total > 0 ? (count * share + agents) / total : 0;
}

/** A stack's filler share once `added` clean doses join `count` at `share`. */
export function mixedShare(count: number, share: number, added: number): number {
  const total = count + added;
  return total > 0 ? (count * share) / total : 0;
}

/** The odds a dose cut this heavily hurts whoever takes it, by the cutter's Cutting bonus. */
export function harmOdds(share: number, bonus: number, rules: CutRules): number {
  return Math.min(1, (rules.harm.base * share * share) / Math.max(0.1, bonus));
}

/** The odds the gang tastes a cut in its own product, a dose sold. */
export function foundOdds(share: number, bonus: number, rules: CutRules): number {
  return Math.min(1, (rules.found.base * share) / Math.max(0.1, bonus));
}

/** The odds a cut dose the player takes makes them sick. */
export function sickOdds(share: number, bonus: number, rules: CutRules): number {
  return Math.min(1, (rules.sick.base * share * share) / Math.max(0.1, bonus));
}
