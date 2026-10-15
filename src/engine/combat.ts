import type { Quality } from './food';
import type { Rng } from './rng';
import type { WeaponClass, WeaponTech } from './weapons';

/**
 * Fighting: simultaneous exchanges. Each beat, the player and whoever they're fighting pick a
 * move at the same time (the player against the clock: a few seconds, more with a
 * Kerenzikov or a Sandevistan fitted), and both moves land together. How far apart they are
 * matters: a blade wants arm's reach, a shotgun a room, a rifle the street. The engine here
 * is pure (a beat from two moves and a roll of the dice); who fights with what, what they'd
 * do, and what comes of it (the hurt, the dead, the incident, the heat) are `Game`'s. The
 * numbers are in `src/data/combat.ts`; the quickhacks in `src/data/quickhacks.ts`.
 */

/** How far apart two fighters are: arm's reach, across a room, across the street. */
export type Range = 'reach' | 'close' | 'far';
export const RANGES: readonly Range[] = ['reach', 'close', 'far'];

/** What a fighter can do in a beat: attack with what they've got, close in, back off, take cover (and reload), quickhack, talk it down, run; freezing is what happens when the clock runs out. */
export type Move = 'attack' | 'advance' | 'back' | 'cover' | 'hack' | 'talk' | 'run' | 'freeze';

/** The ways of fighting: every class of weapon, bare fists, and the chrome in an arm. */
export type FightClass = WeaponClass | 'fists' | 'mantis-blades' | 'gorilla-arms' | 'monowire' | 'launcher';

/** How a way of fighting goes: its odds of landing at each range (0: it can't), what it does, how many rounds a go, and how often a blow that drops someone kills them. */
export interface ClassRules {
  /** How its hits read: a gun's shots, a blade's cuts, a club's blows, fists, a wire's lash, a launcher's blast. */
  kind: 'gun' | 'blade' | 'blunt' | 'fists' | 'wire' | 'launcher';
  hit: Record<Range, number>;
  damage: [number, number];
  /** Rounds an attack uses, for a gun. */
  rounds?: number;
  /** Uses a fight, for chrome that has only so many shots in it (the launcher). */
  charges?: number;
  lethal: number;
}

/** What someone fights with: a weapon, chrome, or their fists. */
export interface Arm {
  /** A weapon's or an implant's id; `fists` for bare hands. */
  id: string;
  /** The item it is, if it's a weapon carried (its own id, for its magazine). */
  item?: string;
  name: string;
  short: string;
  cls: FightClass;
  tech?: WeaponTech;
  magazine: number;
}

/** One side of a fight, as it stands. */
export interface Fighter {
  hp: number;
  max: number;
  arm: Arm;
  /** Rounds in the gun now. */
  loaded: number;
  /** Rounds to reload from. */
  spare: number;
  armor: number;
  /** Took cover last beat: harder to hit. */
  covered: boolean;
  /** Beats left of each thing a quickhack did: half the aim, a jammed gun, no moving, chrome out. */
  blind: number;
  jammed: number;
  crippled: number;
  chromeOff: number;
  /** Damage a beat from something still burning in them (Overheat, Contagion), and for how many beats. */
  burn: number;
  burning: number;
  /** Uses left of chrome with charges (the launcher). */
  charges: number;
}

/** What modifies a fighter's odds and damage, from their chrome and their state. */
export interface Edge {
  /** Multiplies the odds of landing an attack. */
  aim: number;
  /** Multiplies melee damage. */
  melee: number;
  /** Damage taken is multiplied by this (a Berserk's guard). */
  guard: number;
  /** A smart gun's rounds track: with a Smart Link, better; without, worse. */
  smart: boolean;
  /** Attacks against them miss more on the first beat (optical camo). */
  evade: number;
}

export const NO_EDGE: Edge = { aim: 1, melee: 1, guard: 1, smart: false, evade: 0 };

/** A quickhack in a fight: what it does (the numbers are `src/data/quickhacks.ts`'s). */
export interface HackEffect {
  damage?: [number, number];
  /** Damage a beat, for so many beats. */
  burn?: { perBeat: number; beats: number };
  blind?: number;
  jam?: number;
  cripple?: number;
  chromeOff?: number;
  /** Hits harder the more RAM has gone on hacks this fight (Synapse Burnout). */
  burnout?: boolean;
}

export interface CombatRules {
  classes: Record<FightClass, ClassRules>;
  /** The real time the player has to pick a move, in ms, before freezing. */
  window: number;
  /** Multipliers on the odds of landing an attack. */
  odds: { cover: number; coverMelee: number; moving: number; running: number; blind: number; smartLink: number; smartless: number; hurt: number };
  /** Damage over armor: what's left is damage × soak / (soak + armor). */
  soak: number;
  /** Odds of getting away, by range; less if the other closes in, more if they don't come at you. */
  escape: Record<Range, number>;
  escapeAdvanced: number;
  escapeIdle: number;
  /** Talking someone down: a base, and what moves it (their courage and temper, how hurt they are, the player's charisma, a gun on the player, the beats gone by). */
  talk: { base: number; courage: number; temper: number; hurt: number; charisma: number; gun: number; perBeat: number };
  /** RAM back each beat. */
  ramPerBeat: number;
}

/** The fight as it stands between beats. */
export interface FightState {
  range: Range;
  beat: number;
  you: Fighter;
  them: Fighter;
  ram: number;
  ramMax: number;
  /** RAM spent on quickhacks so far, for Synapse Burnout. */
  ramSpent: number;
}

/** What happened in a beat, for `Game` to tell and act on. */
export type BeatEvent =
  | { who: 'you' | 'them'; what: 'hit'; dmg: number; kind: ClassRules['kind'] }
  | { who: 'you' | 'them'; what: 'miss'; kind: ClassRules['kind'] }
  | { who: 'you' | 'them'; what: 'advance' | 'back' | 'cover' | 'reload' | 'freeze' | 'empty' | 'jammed' | 'stuck' | 'outOfReach' }
  | { who: 'you' | 'them'; what: 'talk' | 'run'; ok: boolean }
  | { who: 'you'; what: 'hack'; hack: string; dmg: number }
  | { who: 'you' | 'them'; what: 'burn'; dmg: number };

/** Whether an attack with this arm can land at this range at all. */
export function reaches(arm: Arm, range: Range, rules: CombatRules): boolean {
  return (rules.classes[arm.cls]?.hit[range] ?? 0) > 0;
}

/** Whether an arm can attack now: a gun with a round in it and not jammed, chrome with a charge left, or anything held. */
export function canAttack(f: Fighter, rules: CombatRules): boolean {
  const cls = rules.classes[f.arm.cls];
  if (!cls) return false;
  if (cls.kind === 'gun') return f.loaded > 0 && f.jammed <= 0;
  if (cls.charges) return f.charges > 0;
  return true;
}

/** What an arm is worth at a range: its odds times its middling damage (nothing for a gun with no rounds to fire). */
export function worth(arm: Arm, loaded: number, range: Range, rules: CombatRules): number {
  const cls = rules.classes[arm.cls];
  if (!cls) return 0;
  if (cls.kind === 'gun' && loaded <= 0) return 0;
  return cls.hit[range] * ((cls.damage[0] + cls.damage[1]) / 2);
}

/** One step nearer, or further, kept within the ranges there are. */
export function stepRange(range: Range, by: number, furthest: Range = 'far'): Range {
  const at = RANGES.indexOf(range) + by;
  return RANGES[Math.max(0, Math.min(RANGES.indexOf(furthest), at))] as Range;
}

/** The odds of one attack landing. */
export function hitChance(attacker: Fighter, edge: Edge, target: Fighter, targetEdge: Edge, targetMove: Move, range: Range, beat: number, rules: CombatRules): number {
  const cls = rules.classes[attacker.arm.cls];
  if (!cls) return 0;
  let odds = cls.hit[range] * edge.aim;
  if (target.covered || targetMove === 'cover') odds *= cls.kind === 'gun' || cls.kind === 'launcher' ? rules.odds.cover : rules.odds.coverMelee;
  if (targetMove === 'advance' || targetMove === 'back') odds *= rules.odds.moving;
  if (targetMove === 'run') odds *= rules.odds.running;
  if (attacker.blind > 0) odds *= rules.odds.blind;
  if (attacker.arm.tech === 'Smart') odds *= edge.smart ? rules.odds.smartLink : rules.odds.smartless;
  if (attacker.hp < attacker.max * 0.3) odds *= rules.odds.hurt;
  if (beat === 1 && targetEdge.evade) odds *= 1 - targetEdge.evade;
  return Math.max(0, Math.min(0.97, odds));
}

/** What a landed attack does, after the target's armor and guard. */
export function damageOf(attacker: Fighter, edge: Edge, target: Fighter, targetEdge: Edge, rng: Rng, rules: CombatRules): number {
  const cls = rules.classes[attacker.arm.cls];
  if (!cls) return 0;
  let dmg = rng.range(cls.damage[0], cls.damage[1]);
  if (cls.kind === 'blade' || cls.kind === 'blunt' || cls.kind === 'fists' || cls.kind === 'wire') dmg *= edge.melee;
  dmg *= rules.soak / (rules.soak + Math.max(0, target.armor));
  dmg *= targetEdge.guard;
  return Math.max(1, Math.round(dmg));
}

/**
 * One beat: both moves at once. Moving happens first (a step in or out, a dash for it), then
 * whatever's thrown lands at the range it leaves; whoever moved, or ran, did nothing else,
 * and is easier to hit. Cover makes a fighter harder to hit this beat and the next, and
 * reloads a gun. A quickhack lands whatever the range. Then anything burning burns.
 */
export function resolveBeat(
  state: FightState,
  yours: Move,
  theirs: Move,
  ctx: { you: Edge; them: Edge; hack?: { id: string; ram: number; effect: HackEffect }; indoors: boolean; talkOdds: number; rng: Rng; rules: CombatRules },
): { state: FightState; events: BeatEvent[]; fled: 'you' | 'them' | null; talked: boolean } {
  const { rng, rules } = ctx;
  const s: FightState = { ...state, beat: state.beat + 1, you: { ...state.you }, them: { ...state.them } };
  const events: BeatEvent[] = [];
  const furthest: Range = ctx.indoors ? 'close' : 'far';
  // The moves: in, out, or a run for it. Crippled legs stay put.
  let step = 0;
  for (const [who, move, f] of [['you', yours, s.you], ['them', theirs, s.them]] as const) {
    if ((move === 'advance' || move === 'back' || move === 'run') && f.crippled > 0) {
      events.push({ who, what: 'stuck' });
      continue;
    }
    if (move === 'advance') {
      step -= 1;
      events.push({ who, what: 'advance' });
    } else if (move === 'back') {
      step += 1;
      events.push({ who, what: 'back' });
    }
  }
  s.range = stepRange(s.range, step, furthest);
  // A run for it: easier from further off, harder when the other comes at you.
  let fled: 'you' | 'them' | null = null;
  for (const [who, move, other, f] of [['you', yours, theirs, s.you], ['them', theirs, yours, s.them]] as const) {
    if (move !== 'run' || f.crippled > 0) continue;
    let odds = rules.escape[s.range];
    if (other === 'advance') odds *= rules.escapeAdvanced;
    else if (other !== 'attack') odds *= rules.escapeIdle;
    const ok = !fled && rng.chance(Math.min(0.95, odds));
    events.push({ who, what: 'run', ok });
    if (ok) fled = who;
  }
  // Cover, and a reload while down behind it.
  for (const [who, move, f] of [['you', yours, s.you], ['them', theirs, s.them]] as const) {
    const covered = move === 'cover';
    if (covered) {
      events.push({ who, what: 'cover' });
      const cls = rules.classes[f.arm.cls];
      if (cls?.kind === 'gun' && f.loaded < f.arm.magazine && f.spare > 0) {
        const n = Math.min(f.spare, f.arm.magazine - f.loaded);
        f.loaded += n;
        f.spare -= n;
        events.push({ who, what: 'reload' });
      }
    }
  }
  // The attacks, both at once, at the range the moves left.
  const hits: Array<{ target: Fighter; dmg: number }> = [];
  for (const [who, move, f, edge, target, targetEdge, targetMove] of [
    ['you', yours, state.you, ctx.you, s.them, ctx.them, theirs],
    ['them', theirs, state.them, ctx.them, s.you, ctx.you, yours],
  ] as const) {
    if (move === 'freeze') events.push({ who, what: 'freeze' });
    if (move !== 'attack') continue;
    const attacker = who === 'you' ? s.you : s.them;
    const cls = rules.classes[f.arm.cls];
    if (!cls) continue;
    if (cls.kind === 'gun' && f.jammed > 0) {
      events.push({ who, what: 'jammed' });
      continue;
    }
    if (!canAttack(attacker, rules)) {
      events.push({ who, what: 'empty' });
      continue;
    }
    if (!reaches(f.arm, s.range, rules)) {
      events.push({ who, what: 'outOfReach' });
      continue;
    }
    if (cls.rounds) attacker.loaded = Math.max(0, attacker.loaded - cls.rounds);
    if (cls.charges) attacker.charges -= 1;
    const odds = hitChance(f, edge, target, targetEdge, targetMove, s.range, s.beat, rules);
    if (rng.chance(odds)) {
      const dmg = damageOf(f, edge, target, targetEdge, rng, rules);
      hits.push({ target, dmg });
      events.push({ who, what: 'hit', dmg, kind: cls.kind });
    } else events.push({ who, what: 'miss', kind: cls.kind });
  }
  // The player's quickhack: it lands whatever the range.
  if (yours === 'hack' && ctx.hack && s.ram >= ctx.hack.ram) {
    const { effect } = ctx.hack;
    s.ram -= ctx.hack.ram;
    s.ramSpent += ctx.hack.ram;
    let dmg = 0;
    if (effect.damage) {
      dmg = rng.range(effect.damage[0], effect.damage[1]) * (effect.burnout ? Math.min(2, 1 + 0.1 * s.ramSpent) : 1);
      dmg = Math.max(1, Math.round(dmg * ctx.them.guard));
      hits.push({ target: s.them, dmg });
    }
    if (effect.burn) {
      s.them.burn = effect.burn.perBeat;
      s.them.burning = effect.burn.beats;
    }
    if (effect.blind) s.them.blind = effect.blind + 1;
    if (effect.jam) s.them.jammed = effect.jam + 1;
    if (effect.cripple) s.them.crippled = effect.cripple + 1;
    if (effect.chromeOff) s.them.chromeOff = effect.chromeOff + 1;
    events.push({ who: 'you', what: 'hack', hack: ctx.hack.id, dmg });
  }
  for (const { target, dmg } of hits) target.hp = Math.max(0, target.hp - dmg);
  // Talking it down: it takes if they don't come at the player, or the odds hold even so.
  let talked = false;
  if (yours === 'talk') {
    const ok = !fled && rng.chance(ctx.talkOdds * (theirs === 'attack' ? 0.6 : 1));
    events.push({ who: 'you', what: 'talk', ok });
    talked = ok;
  }
  if (theirs === 'talk') {
    // They back down; it ends unless the player keeps at them.
    const ok = !fled && yours !== 'attack' && yours !== 'hack';
    events.push({ who: 'them', what: 'talk', ok });
    talked = talked || ok;
  }
  // What's burning burns; what a quickhack did wears off.
  for (const [who, f] of [['you', s.you], ['them', s.them]] as const) {
    if (f.burning > 0 && f.hp > 0) {
      f.hp = Math.max(0, f.hp - f.burn);
      f.burning -= 1;
      events.push({ who, what: 'burn', dmg: f.burn });
    }
    f.covered = (who === 'you' ? yours : theirs) === 'cover';
    for (const key of ['blind', 'jammed', 'crippled', 'chromeOff'] as const) if (f[key] > 0) f[key] -= 1;
  }
  s.ram = Math.min(s.ramMax, s.ram + rules.ramPerBeat);
  return { state: s, events, fled, talked };
}

/**
 * What someone fighting the player does this beat, by their nature and how it's going: the
 * scared run or back down when it turns against them, the hot-headed come on; a blade closes
 * in, a gun finds its range or takes cover to reload; a jammed gun ducks.
 */
export function theirMove(state: FightState, nerve: { courage: number; temper: number }, indoors: boolean, rng: Rng, rules: CombatRules): Move {
  const f = state.them;
  const hurt = f.hp / Math.max(1, f.max);
  const breaking = hurt < 0.35 && rng.chance(0.75 - nerve.courage * 0.6);
  if (breaking) return rng.chance(0.5 + (1 - nerve.temper) * 0.3) ? 'run' : 'talk';
  const cls = rules.classes[f.arm.cls];
  if (!cls) return 'cover';
  if (cls.kind === 'gun') {
    if (f.jammed > 0 || f.loaded <= 0) return f.spare > 0 || f.jammed > 0 ? 'cover' : f.crippled > 0 ? 'cover' : 'advance';
    const here = cls.hit[state.range];
    // A better range one step off is worth the step, if the legs work.
    const nearer = state.range === 'reach' ? 0 : cls.hit[stepRange(state.range, -1)];
    const further = cls.hit[stepRange(state.range, 1, indoors ? 'close' : 'far')];
    if (f.crippled <= 0 && Math.max(nearer, further) > here + 0.2) return nearer >= further ? 'advance' : 'back';
    if (hurt < 0.5 && !f.covered && rng.chance(0.3 - nerve.temper * 0.2)) return 'cover';
    return 'attack';
  }
  // A blade, a club, chrome, fists: in close, or get in close.
  if (cls.hit[state.range] <= 0) return f.crippled > 0 ? 'cover' : 'advance';
  return rng.chance(0.08 * (1 - nerve.temper)) ? 'cover' : 'attack';
}

/** The odds of talking someone down this beat. */
export function talkOdds(state: FightState, nerve: { courage: number; temper: number }, charisma: number, armed: boolean, rules: CombatRules): number {
  const t = rules.talk;
  const hurt = 1 - state.them.hp / Math.max(1, state.them.max);
  const odds = t.base + (1 - nerve.courage) * t.courage - nerve.temper * t.temper + hurt * t.hurt + charisma * t.charisma + (armed ? t.gun : 0) + state.beat * t.perBeat;
  return Math.max(0.02, Math.min(0.9, odds));
}

/** Everything about fighting: the rules of a beat, and what the player and the people bring to one. */
export interface CombatContent extends CombatRules {
  /** The player's health: what it is, and what comes back in an hour. */
  health: { base: number; regenPerHour: number };
  /** Someone's health in a fight: a base, more for courage, for a gang, for a guard's job; less for their years. */
  people: { base: number; courage: number; gang: number; guard: number; elder: number };
  /** Whether someone carries anything, by their walk of life, and what (weapon ids, arm implants, or `fists`). */
  carry: { chance: Record<'gang' | 'guard' | 'corpo' | 'street' | 'elder', number>; gangs: Record<string, Array<[string, number]>>; guard: Array<[string, number]>; corpo: Array<[string, number]>; street: Array<[string, number]> };
  /** Spare magazines someone carries for a gun. */
  spareMags: number;
  /** Armor, by gang, for a guard, a corpo, anyone else. */
  armor: { gangs: Record<string, number>; gang: number; guard: number; corpo: number; street: number };
  /** What chrome does in a fight, by implant id (or a whole kind of operating system). */
  chrome: Record<string, { armor?: number; health?: number; window?: number; below?: number; aim?: number; melee?: number; guard?: number; evade?: number; ram?: number; deck?: number; smart?: boolean; revive?: boolean; arm?: 'mantis-blades' | 'gorilla-arms' | 'monowire' | 'launcher' }>;
  systems: Partial<Record<'sandevistan' | 'berserk' | 'cyberdeck', { aim?: number; guard?: number }>>;
  /** Days laid up after losing a fight to the player. */
  hurtDays: [number, number];
  /** NCPD heat: what each thing adds, how fast it cools, the most there is. */
  heat: { assault: number; murder: number; trauma: number; coolPerHour: number; max: number };
  /** A tell: the odds of reading someone's next move, more if their nature is known, more with charisma. */
  tell: { base: number; nature: number; charisma: number };
  /** The share of the cash on the player someone takes off them when they go down. */
  robbed: [number, number];
  lines: Record<string, string[]>;
}

/** Something that moves on the clock (health back, heat off): what it was, and when. */
export interface Meter {
  value: number;
  at: number;
}

/** The player's health: what it is now, the most it can be, and when it'll be full again. */
export interface HealthStatus {
  current: number;
  max: number;
  fullAt: number | null;
}

/** NCPD heat: how much, in stars, and when it's cooled off. */
export interface HeatStatus {
  level: number;
  stars: number;
  coolAt: number | null;
}

/** How a fight ended: the other down (alive, dead, or got out by Trauma Team), the player down, one of them gone, or talked out of it. */
export type FightOutcome = 'won' | 'killed' | 'trauma' | 'lost' | 'fled' | 'escaped' | 'talked';

/** A fight as the player sees it: both sides, the range, the clock, what's happened, and what they can do now. */
export interface FightView {
  name: string;
  range: Range;
  rangeLabel: string;
  beat: number;
  deadline: number;
  window: number;
  you: { hp: number; max: number; arm: string };
  them: { hp: number; max: number; arm: string };
  tell: string | null;
  log: string[];
  moves: Array<{ id: Move; label: string; sub: string; enabled: boolean }>;
  hacks: Array<{ id: string; name: string; ram: number; enabled: boolean }>;
  ram: number;
  ramMax: number;
  over: FightOutcome | null;
  result: string;
}

/** A store tier's quickhacks: what a quickhack dealer stocks. */
export interface HackStock {
  up?: boolean;
}

/** A quickhack as the wiki has it (its name, its type, the tier it's first had at, its RAM cost there), with what it does in a fight, our price and our note. */
export interface QuickhackKind {
  name: string;
  type: 'Combat' | 'Control';
  tier: 1 | 2 | 3;
  ram: number;
  quality: Quality;
  price: number;
  note: string;
  effect: HackEffect;
}

export interface HackContent {
  hacks: Record<string, QuickhackKind>;
  /** By business id. */
  stores: Record<string, HackStock>;
  tiers: Record<Quality, Quality[]>;
}
