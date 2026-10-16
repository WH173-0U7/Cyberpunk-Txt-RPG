import type { Rng } from './rng';

/**
 * The player's own habit. A dose of a drug does what it does for a while (`DrugEffect`, ours
 * after what the wiki says of each: Black Lace's armor, damage and crits for less health,
 * Glitter's high, Juice's muscle, SynthCoke's reflexes, 'Dorph's second wind), less the more
 * the player is used to it (tolerance). Every dose is dependence on that drug, fading by the
 * day clean; a dependent player craves it after some hours without, then goes into
 * withdrawal (less charisma, worse aim, energy draining), and a bad enough habit put off long
 * enough collapses them into a hospital. Any dose can be an overdose, likelier on top of
 * others; 'Dorph can damage the nerves for good; Black Lace edges the player toward
 * cyberpsychosis. The numbers are `DEALING.habit` (`src/data/dealing.ts`); the doing of it
 * is `Game`'s.
 */

/** What a dose does while it lasts, at full strength. */
export interface DrugEffect {
  /** How long a dose lasts, in minutes on the clock. */
  minutes: number;
  /** Levels of charisma, up or down. */
  charisma?: number;
  /** In a fight: times the aim, times all damage, times melee damage, more armor, more time to choose (ms), more of a hit landing just right. */
  aim?: number;
  power?: number;
  melee?: number;
  armor?: number;
  window?: number;
  crit?: number;
  /** Times the most health the player has while it lasts. */
  maxHealth?: number;
  /** Times the odds a blow knocks the player out: under 1, harder to put down. */
  steady?: number;
  /** Health and energy back at once. */
  heal?: number;
  energy?: number;
  /** The odds a dose does lasting damage: aim lost for good. */
  nerve?: number;
  /** How far a dose takes the player toward cyberpsychosis. */
  edge?: number;
}

export interface HabitLines {
  /** Taking a dose, by drug id. */
  use: Record<string, string[]>;
  wearOff: string[];
  /** A dose that hits less for being used to it. */
  tolerant: string[];
  craving: string[];
  withdrawal: string[];
  /** Collapsing from withdrawal and coming to in a hospital (`{ward}`, `{bill}`). */
  severe: string[];
  /** An overdose: going down; someone here getting help (`{who}`, `{ward}`, `{bill}`); Trauma Team; nobody, and the end (`{place}`). */
  overdose: string[];
  saved: string[];
  trauma: string[];
  flatline: string[];
  nerve: string[];
  /** The edge: numb past `numb`, and snapping at someone here (`{who}`) past `snap`. */
  numb: string[];
  snap: string[];
}

export interface HabitRules {
  effects: Record<string, DrugEffect>;
  /** Dependence a dose adds (times the drug's hook), out of `most`, and what's lost a day clean. */
  dependence: { perDose: number; cleanDay: number; most: number };
  /** A dose's effects, scaled down by the dependence (out of 100) times this. */
  tolerance: number;
  /** From this dependence and this many hours without: craving, then withdrawal (charisma levels down, aim times, a point of energy gone every `drainMinutes`), then a collapse (health left a share, the dependence a share less for the detox). */
  craving: { at: number; hours: number };
  withdrawal: { at: number; hours: number; charisma: number; aim: number; drainMinutes: number };
  severe: { at: number; hours: number; health: number; detox: number };
  /** Overdose odds a dose (`base` by drug), times one more for every dose in the last `stackHours`, never past `most`; the odds someone here gets help in time. */
  overdose: { base: Record<string, number>; stack: number; stackHours: number; most: number; saved: number };
  /** Aim lost for good a time the nerves are damaged, at most so many times. */
  nerve: { aim: number; most: number };
  /** The edge, out of 100: lost a day clean; past `numb`, charisma levels down and no talking or running in a fight; past `snap`, the odds an hour of lashing out at someone. */
  edge: { cleanDay: number; numb: number; snap: number; charisma: number; snapChance: number };
  lines: HabitLines;
}

/** A drug's hold on the player: how dependent as of the last dose, when that was, and the doses lately. */
export interface DrugUse {
  dependence: number;
  last: number;
  recent: number[];
}

export interface HabitState {
  drugs: Record<string, DrugUse>;
  /** Doses working now: which, till when, how strong. */
  active: Array<{ drug: string; until: number; strength: number }>;
  /** Times the nerves have been damaged. */
  nerve: number;
  /** The edge as of `edgeAt`. */
  edge: number;
  edgeAt: number;
  /** The stage last told (`craving:<drug>`…), so each is told once; when energy last drained, and the player last snapped. */
  told?: string;
  drainAt?: number;
  snapAt?: number;
}

export function freshHabit(): HabitState {
  return { drugs: {}, active: [], nerve: 0, edge: 0, edgeAt: 0 };
}

const day = (timeScale: number) => 86_400_000 / timeScale;
const hour = (timeScale: number) => 3_600_000 / timeScale;

/** How dependent the player is on a drug at `now`: what it was at the last dose, less the days clean since. */
export function dependenceAt(use: DrugUse | undefined, now: number, rules: HabitRules, timeScale: number): number {
  if (!use) return 0;
  return Math.max(0, use.dependence - (rules.dependence.cleanDay * Math.max(0, now - use.last)) / day(timeScale));
}

/** The edge at `now`. */
export function edgeAt(state: HabitState, now: number, rules: HabitRules, timeScale: number): number {
  return Math.max(0, state.edge - (rules.edge.cleanDay * Math.max(0, now - state.edgeAt)) / day(timeScale));
}

/** The odds a dose now is an overdose: the drug's, times one more for every dose in the last hours. */
export function overdoseOdds(state: HabitState, drug: string, now: number, rules: HabitRules, timeScale: number): number {
  const window = rules.overdose.stackHours * hour(timeScale);
  const lately = Object.values(state.drugs).reduce((n, u) => n + u.recent.filter((t) => now - t < window).length, 0);
  return Math.min(rules.overdose.most, (rules.overdose.base[drug] ?? 0) * (1 + rules.overdose.stack * lately));
}

/** A dose taken: its strength by tolerance, the dependence it adds, any nerve damage and the edge; whether it's an overdose is the caller's roll on `overdoseOdds`. */
export function takeDose(state: HabitState, drug: string, hook: number, now: number, rules: HabitRules, timeScale: number, rng: Rng): { state: HabitState; strength: number; nerve: boolean } {
  const effect = rules.effects[drug];
  const use = state.drugs[drug];
  const dependence = dependenceAt(use, now, rules, timeScale);
  const strength = Math.max(0.2, 1 - (rules.tolerance * dependence) / 100);
  const window = rules.overdose.stackHours * hour(timeScale);
  const nerve = Boolean(effect?.nerve && state.nerve < rules.nerve.most && rng.chance(effect.nerve));
  const next: HabitState = {
    ...state,
    drugs: { ...state.drugs, [drug]: { dependence: Math.min(rules.dependence.most, dependence + rules.dependence.perDose * hook), last: now, recent: [...(use?.recent ?? []).filter((t) => now - t < window), now] } },
    active: [...state.active.filter((a) => a.until > now && a.drug !== drug), ...(effect ? [{ drug, until: now + (effect.minutes * 60_000) / timeScale, strength }] : [])],
    nerve: state.nerve + (nerve ? 1 : 0),
    edge: Math.min(100, edgeAt(state, now, rules, timeScale) + (effect?.edge ?? 0) * strength),
    edgeAt: now,
  };
  return { state: next, strength, nerve };
}

/** Where a habit stands at `now`: the worst of craving, withdrawal and collapse over every drug the player is dependent on, and which drug. */
export function stageAt(state: HabitState, now: number, rules: HabitRules, timeScale: number): { drug: string; stage: 'craving' | 'withdrawal' | 'severe' } | null {
  let worst: { drug: string; stage: 'craving' | 'withdrawal' | 'severe' } | null = null;
  const rank = { craving: 1, withdrawal: 2, severe: 3 } as const;
  for (const [drug, use] of Object.entries(state.drugs)) {
    if (state.active.some((a) => a.drug === drug && a.until > now)) continue;
    const dependence = dependenceAt(use, now, rules, timeScale);
    const hours = (now - use.last) / hour(timeScale);
    const stage = dependence >= rules.severe.at && hours >= rules.severe.hours ? 'severe' : dependence >= rules.withdrawal.at && hours >= rules.withdrawal.hours ? 'withdrawal' : dependence >= rules.craving.at && hours >= rules.craving.hours ? 'craving' : null;
    if (stage && (!worst || rank[stage] > rank[worst.stage])) worst = { drug, stage };
  }
  return worst;
}

/** Everything the habit does to the player at `now`, all told: what's working (by its strength), withdrawal, the nerves, the edge. */
export function effectsAt(state: HabitState, now: number, rules: HabitRules, timeScale: number): { charisma: number; aim: number; power: number; melee: number; armor: number; window: number; crit: number; maxHealth: number; steady: number; numb: boolean } {
  const out = { charisma: 0, aim: 1, power: 1, melee: 1, armor: 0, window: 0, crit: 0, maxHealth: 1, steady: 1, numb: false };
  const scale = (x: number | undefined, s: number) => 1 + ((x ?? 1) - 1) * s;
  for (const a of state.active) {
    if (a.until <= now) continue;
    const e = rules.effects[a.drug];
    if (!e) continue;
    out.charisma += (e.charisma ?? 0) * a.strength;
    out.aim *= scale(e.aim, a.strength);
    out.power *= scale(e.power, a.strength);
    out.melee *= scale(e.melee, a.strength);
    out.armor += (e.armor ?? 0) * a.strength;
    out.window += (e.window ?? 0) * a.strength;
    out.crit += (e.crit ?? 0) * a.strength;
    out.maxHealth *= scale(e.maxHealth, a.strength);
    out.steady *= scale(e.steady, a.strength);
  }
  const stage = stageAt(state, now, rules, timeScale)?.stage;
  if (stage === 'withdrawal' || stage === 'severe') {
    out.charisma -= rules.withdrawal.charisma;
    out.aim *= rules.withdrawal.aim;
  }
  out.aim *= Math.max(0.5, 1 - rules.nerve.aim * state.nerve);
  if (edgeAt(state, now, rules, timeScale) >= rules.edge.numb) {
    out.numb = true;
    out.charisma -= rules.edge.charisma;
  }
  out.charisma = Math.round(out.charisma);
  return out;
}

/** Where the player's habit stands, as the UI shows it. */
export interface HabitView {
  active: Array<{ drug: string; name: string; until: number }>;
  stage: { drug: string; name: string; stage: 'craving' | 'withdrawal' | 'severe' } | null;
  drugs: Array<{ drug: string; name: string; dependence: number }>;
  edge: number;
  numb: boolean;
  nerve: number;
}
