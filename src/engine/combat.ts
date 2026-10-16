import type { SkillRules, SkillState, SkillStatus } from './skills';
import type { Quality } from './food';
import type { Rng } from './rng';
import type { WeaponClass, WeaponTech } from './weapons';

/**
 * Fighting: simultaneous exchanges. Each beat, the player and whoever they're fighting pick a
 * move at the same time (the player against the clock: a few seconds, more with a
 * Kerenzikov or a Sandevistan fitted), and both moves land together. How far apart they are
 * matters: a blade wants arm's reach, a shotgun a room, a rifle the street. The engine here
 * is pure (a beat from two moves and a roll of the dice); who fights with what, what they'd
 * do, and what comes of it (the hurt, the dead, the incident, the NCPD) are `Game`'s. The
 * numbers are in `src/data/combat.ts`; the quickhacks in `src/data/quickhacks.ts`.
 */

/** How far apart two fighters are: arm's reach, across a room, across the street. */
export type Range = 'reach' | 'close' | 'far';
export const RANGES: readonly Range[] = ['reach', 'close', 'far'];

/** What a fighter can do in a beat: attack with what they've got, close in, back off, take cover (and reload), quickhack, talk it down, run; freezing is what happens when the clock runs out. */
/** `busy`: taken up with someone else this beat (in a fight of more than two): nothing done to this one, nothing told. */
export type Move = 'attack' | 'advance' | 'back' | 'cover' | 'hack' | 'heal' | 'talk' | 'run' | 'freeze' | 'busy';

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
  /** Health back a beat from a med still working (Bounce Back), and for how many beats. */
  regen: number;
  regening: number;
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
  /** Multiplies what a gun, a blade, a wire or a launcher does: under 1 aiming to wound. */
  wound: number;
  /** Multiplies the odds their blows (fists, a club, Gorilla Arms) knock someone out: a Street Brawler's. */
  ko: number;
  /** Multiplies the odds a blow knocks them out: under 1, harder to put down (Toughness). */
  steady: number;
  /** Multiplies everything their attacks do: how well they know the weapon (its kind's level and its own). */
  power: number;
  /** The odds a hit lands just right, for `CombatRules.crit` of the damage (a perk). */
  crit: number;
  /** The share of the target's armor their attacks go through (a perk). */
  pierce: number;
  /** The share of the target's cover their attacks get round (a perk). */
  flank: number;
}

export const NO_EDGE: Edge = { aim: 1, melee: 1, guard: 1, smart: false, evade: 0, wound: 1, ko: 1, steady: 1, power: 1, crit: 0, pierce: 0, flank: 0 };

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
  /** What a gun, a blade, a wire or a launcher does aiming to wound rather than kill. */
  nonLethal: number;
  /** The odds that someone put down by a quickhack or a burn is dead, aiming to kill. */
  hackLethal: number;
  /** Multipliers on the odds of landing an attack. */
  odds: { cover: number; coverMelee: number; moving: number; running: number; blind: number; smartLink: number; smartless: number; hurt: number };
  /** Damage over armor: what's left is damage × soak / (soak + armor). */
  soak: number;
  /** What a hit that lands just right does, times the rest. */
  crit: number;
  /** Odds of getting away, by range; less if the other closes in, more if they don't come at you. */
  escape: Record<Range, number>;
  escapeAdvanced: number;
  escapeIdle: number;
  /** Talking someone down: a base, and what moves it (their courage and temper, how hurt they are, the player's charisma, a gun on the player, the beats gone by). */
  talk: { base: number; courage: number; temper: number; hurt: number; charisma: number; gun: number; perBeat: number };
  /** RAM back each beat. */
  ramPerBeat: number;
  /**
   * Knocked out cold, like the wiki's non-lethal blunt weapons: what a blow of each kind can do
   * toward it (fists, a club; guns and blades none), the least share of someone's health a blow
   * must take to count, the most its odds can be, and the minutes someone stays out.
   */
  knockout: { kinds: Partial<Record<ClassRules['kind'], number>>; least: number; most: number; minutes: [number, number] };
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
  | { who: 'you' | 'them'; what: 'hit'; dmg: number; kind: ClassRules['kind']; crit?: true }
  | { who: 'you' | 'them'; what: 'miss'; kind: ClassRules['kind'] }
  | { who: 'you' | 'them'; what: 'advance' | 'back' | 'cover' | 'reload' | 'freeze' | 'empty' | 'jammed' | 'stuck' | 'outOfReach' }
  | { who: 'you' | 'them'; what: 'talk' | 'run'; ok: boolean }
  | { who: 'you'; what: 'hack'; hack: string; dmg: number }
  | { who: 'you'; what: 'heal' | 'regen'; dmg: number }
  | { who: 'you' | 'them'; what: 'burn'; dmg: number }
  /** Knocked out cold by a blow: `who` is the one out. */
  | { who: 'you' | 'them'; what: 'out' };

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
  // Cover, less the share of it the attacker gets round.
  if (target.covered || targetMove === 'cover') odds *= 1 - (1 - (cls.kind === 'gun' || cls.kind === 'launcher' ? rules.odds.cover : rules.odds.coverMelee)) * (1 - edge.flank);
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
  if (cls.kind === 'gun' || cls.kind === 'blade' || cls.kind === 'wire' || cls.kind === 'launcher') dmg *= edge.wound;
  dmg *= edge.power;
  dmg *= rules.soak / (rules.soak + Math.max(0, target.armor) * (1 - edge.pierce));
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
  ctx: { you: Edge; them: Edge; hack?: { id: string; ram: number; effect: HackEffect }; med?: { heal: number; regen?: { perBeat: number; beats: number } }; indoors: boolean; talkOdds: number; rng: Rng; rules: CombatRules },
): { state: FightState; events: BeatEvent[]; fled: 'you' | 'them' | null; talked: boolean; out: 'you' | 'them' | null } {
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
  const hits: Array<{ target: Fighter; dmg: number; kind?: ClassRules['kind']; edge?: Edge; targetEdge?: Edge }> = [];
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
      // A hit that lands just right (a perk's odds; nobody else draws for it).
      const crit = edge.crit > 0 && rng.chance(edge.crit);
      const dmg = Math.round(damageOf(f, edge, target, targetEdge, rng, rules) * (crit ? rules.crit : 1));
      hits.push({ target, dmg, kind: cls.kind, edge, targetEdge });
      events.push({ who, what: 'hit', dmg, kind: cls.kind, ...(crit ? { crit: true as const } : {}) });
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
  // A med taken this beat heals before what lands on the player does.
  if (yours === 'heal' && ctx.med) {
    const before = s.you.hp;
    s.you.hp = Math.min(s.you.max, s.you.hp + ctx.med.heal);
    if (ctx.med.regen) {
      s.you.regen = ctx.med.regen.perBeat;
      s.you.regening = ctx.med.regen.beats;
    }
    events.push({ who: 'you', what: 'heal', dmg: s.you.hp - before });
  }
  for (const { target, dmg } of hits) target.hp = Math.max(0, target.hp - dmg);
  // A blow that lands hard enough can knock someone out cold, short of putting them down: the player's first, as it's told.
  let out: 'you' | 'them' | null = null;
  for (const { target, dmg, kind, edge, targetEdge } of hits) {
    if (out || !kind || !edge || !targetEdge || target.hp <= 0) continue;
    const odds = knockoutOdds(kind, dmg, target, edge, targetEdge, rules);
    if (odds > 0 && rng.chance(odds)) {
      out = target === s.them ? 'them' : 'you';
      events.push({ who: out, what: 'out' });
    }
  }
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
    if (f.regening > 0 && f.hp > 0) {
      const before = f.hp;
      f.hp = Math.min(f.max, f.hp + f.regen);
      f.regening -= 1;
      if (who === 'you' && f.hp > before) events.push({ who: 'you', what: 'regen', dmg: f.hp - before });
    }
    f.covered = (who === 'you' ? yours : theirs) === 'cover';
    for (const key of ['blind', 'jammed', 'crippled', 'chromeOff'] as const) if (f[key] > 0) f[key] -= 1;
  }
  s.ram = Math.min(s.ramMax, s.ram + rules.ramPerBeat);
  return { state: s, events, fled, talked, out };
}

/**
 * The odds a blow knocks someone out cold: what its kind can do, by the share of their health
 * it took and how much of it is gone already, by the attacker's knack for it and the target's
 * toughness; nothing from a blow too light to count, and never past the most a blow can be.
 */
export function knockoutOdds(kind: ClassRules['kind'], dmg: number, target: Fighter, edge: Edge, targetEdge: Edge, rules: CombatRules): number {
  const power = rules.knockout.kinds[kind] ?? 0;
  const share = dmg / Math.max(1, target.max);
  if (!power || share < rules.knockout.least) return 0;
  const worn = 1 - target.hp / Math.max(1, target.max);
  return Math.min(rules.knockout.most, power * share * (1 + worn) * edge.ko * targetEdge.steady);
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

/** The odds of talking someone down this beat. `charisma` is in levels past an ordinary person's (`skillEdge`). */
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
  /** A tell: the odds of reading someone's next move, more if their nature is known, more with charisma. */
  tell: { base: number; nature: number; charisma: number };
  /** The share of the cash on the player someone takes off them when they go down. */
  robbed: [number, number];
  lines: Record<string, string[]>;
  /** The skills a fight trains: Street Brawler (blows landed bare-handed, or with blunt chrome and clubs) and Toughness (blows taken). */
  skills: { brawler: SkillRules; toughness: SkillRules };
  /** Experience a fight gives: a Street Brawler's per blow landed (`hit` bare-handed or chrome, `blunt` a club) and per knockout; Toughness per blow taken, more for one that could knock the player out, and for a fight ended on their feet. */
  training: { brawler: { hit: number; blunt: number; knockout: number }; toughness: { hit: number; blow: number; stood: number } };
  /** How hard people are to knock out: a base, less for the brave, less again for a ganger. */
  steady: { base: number; courage: number; gang: number };
  /** How well the player knows each kind of weapon and each weapon (fists are Street Brawler's). */
  mastery: MasteryRules;
  /** Killing someone who lies out cold: the ways there are, and who'd stop it. */
  finish: FinishContent;
  /**
   * The lines of a fight of more than two: someone joining (`joinThem`, `joinYou`: `{who}`,
   * `{he}`, `{s}`, and `{target}` the one the player went for), the next one up (`nextUp`), the
   * allies' blows and theirs (`allyHit`, `allyMiss`, `allyHurt`: `{ally}`, `{foe}`, `{dmg}`), and
   * someone out of it (`allyDown`, `allyOut`, `foeDown`, `foeOut`; `fled`, `backDown`: `{who}`).
   */
  group: Record<string, string[]>;
}

/**
 * Who throws in when a fight starts, and every beat after (`perBeat` of the odds): against the
 * player, by what they are to someone on the other side (family, friends, their gang), the
 * place's own guard, an NCPD officer (always), a stranger hardly ever and less in a crowd; for
 * the player, a friend (rapport at least `friendly`) or the one they're seeing. All times their
 * nerve (half again for the bravest, half for the most timid). Never more than `foes` with the
 * one the player went for, or `allies`.
 */
export interface JoinRules {
  kin: number;
  friend: number;
  gang: number;
  guard: number;
  stranger: number;
  crowd: number;
  friendly: number;
  ally: number;
  partner: number;
  perBeat: number;
  foes: number;
  allies: number;
}

/** A way to kill someone lying out cold: bare hands, a boot, a blade, a gun, something blunt, a monowire. */
export type FinishKind = 'choke' | 'stomp' | 'cut' | 'shoot' | 'beat' | 'garrote';

export interface FinishRules {
  /** What the button says. */
  label: string;
  /** What it takes: bare hands (anyone), a blade (in hand, or in the arms), a loaded gun, something blunt (Gorilla Arms too), a monowire. */
  needs: 'hands' | 'blade' | 'gun' | 'blunt' | 'wire';
  /** Heard through the walls: everyone in the building may call it in, not only whoever's in the room. */
  loud: boolean;
  /** How long it takes, as times the odds someone here gets there first and stops it. */
  slow: number;
  /** How it's told: `{who}`, `{he}`, `{his}`, `{weapon}`, and `{s}`/`{es}` after `{he}`. */
  lines: string[];
}

export interface FinishContent {
  ways: Record<FinishKind, FinishRules>;
  /**
   * The odds someone who's here stops it: a base, times their nerve, more for the victim's
   * family, friends and gang, more for a guard; in a crowd each leaves it to the others (over
   * the number there to the power of `crowd`); never more than `most`. An NCPD officer always
   * does, and draws on the player. Heard through the walls, the odds a call is made, as a share.
   */
  intervene: { base: number; kin: number; friend: number; gang: number; guard: number; crowd: number; most: number };
  heard: number;
  /** Whoever stops it: `{who}`, `{he}`, `{his}`, `{s}`, about them. */
  stopped: string[];
}

/** Which perks a weapon brings at its levels: a gun's by its technology, anything else's by what its hits are. */
export type PerkFamily = WeaponTech | 'blade' | 'blunt' | 'wire' | 'launcher';

/** Something a weapon known well does better, from its level up: what multiplies (`aim`, `power`, `guard`, `ko`) and what adds (`crit`, and the most of `pierce` and `flank`). */
export interface Perk {
  at: number;
  name: string;
  /** What it does, for the player, in a few words. */
  note: string;
  aim?: number;
  power?: number;
  guard?: number;
  ko?: number;
  crit?: number;
  pierce?: number;
  flank?: number;
}

/**
 * Weapon levels: one for each kind of weapon (`types`, by `FightClass`), and one for each
 * weapon itself (`models`, by weapon or implant id), each starting the player off worse than
 * anyone. Their bonuses multiply what the weapon does, and `aim` of the same to its odds of
 * landing; a model's perks come at its levels.
 */
export interface MasteryRules {
  types: SkillRules;
  models: SkillRules;
  aim: number;
  /** Experience each, for every go with it (`swing`), every hit (`hit`), and the blow that ends a fight (`down`). */
  training: { swing: number; hit: number; down: number };
  perks: Record<PerkFamily, Perk[]>;
  /** Where a level leaves the player, by how far past an ordinary person's it is (`STANDING`). */
  standing: Array<{ from: number; line: string }>;
}

/** How well the player knows each kind of weapon (by `FightClass`) and each weapon (by its id), as saved. */
export interface Arms {
  types: Partial<Record<string, SkillState>>;
  models: Partial<Record<string, SkillState>>;
}

/** A weapon as the player knows it, for the UI: its kind's level and its own, its perks so far and the next. */
export interface WeaponMastery {
  id: string;
  name: string;
  cls: FightClass;
  /** Its kind, as it's called ("Pistol", "Mantis Blades"). */
  type: string;
  typeStatus: SkillStatus;
  status: SkillStatus;
  perks: Perk[];
  next: Perk | null;
}

/** The perks a weapon brings, or none (fists). */
export function perkFamily(arm: Arm, rules: CombatRules): PerkFamily | null {
  const kind = rules.classes[arm.cls]?.kind;
  if (!kind || kind === 'fists') return null;
  return kind === 'gun' ? (arm.tech ?? 'Power') : kind;
}

/** What a weapon known this well brings: the bonuses of its kind's level and its own, and its perks so far. */
export function masteryEdge(edge: Edge, typeBonus: number, modelBonus: number, perks: readonly Perk[], rules: MasteryRules): Edge {
  const bonus = typeBonus * modelBonus;
  const out: Edge = { ...edge, aim: edge.aim * (1 + (bonus - 1) * rules.aim), power: edge.power * bonus };
  for (const p of perks) {
    out.aim *= p.aim ?? 1;
    out.power *= p.power ?? 1;
    out.guard *= p.guard ?? 1;
    out.ko *= p.ko ?? 1;
    out.crit += p.crit ?? 0;
    out.pierce = Math.max(out.pierce, p.pierce ?? 0);
    out.flank = Math.max(out.flank, p.flank ?? 0);
  }
  return out;
}

/** Something that moves on the clock (health coming back): what it was, and when. */
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

/** How a fight ended: the other down (alive, dead, or got out by Trauma Team), the player down, one of them gone, or talked out of it. */
/** How a fight ends: them down (`won`, laid up), dead, picked up by Trauma Team, or knocked out cold (`out`); the player down (`lost`) or knocked out (`knocked`); one of them gone; or talked out of it. */
export type FightOutcome = 'won' | 'killed' | 'trauma' | 'out' | 'lost' | 'knocked' | 'fled' | 'escaped' | 'talked';

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
  /** Aiming to kill, or (the player's choice, kept between fights) to wound. */
  lethal: boolean;
  /** Everyone on their side, the one the player's going for first: to pick another. */
  foes: Array<{ id: string; name: string; hp: number; max: number; arm: string; target: boolean }>;
  /** Whoever's in it on the player's side. */
  allies: Array<{ id: string; name: string; hp: number; max: number; arm: string }>;
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
