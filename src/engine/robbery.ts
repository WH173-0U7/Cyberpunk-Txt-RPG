import type { Rng } from './rng';

/**
 * A robbery, as the one robbed takes it: how much they fear the player (`fearOf`), and so what
 * they do. Terrified, they hand over everything; scared, most of the cash and maybe the chip;
 * nervous, what they think they can get away with (the small notes, "that's all I've got"), the
 * greedy less; unafraid, they say no, and the brave or the hot-tempered among them fight. What
 * they kept back the player can go after (`searchOdds`), which the scared let happen and the
 * brave don't. Pure; the numbers are in `src/data/robbery.ts`, and `Game` does the robbing.
 */

/** What the player would pull on someone: a gun (loaded or not; nobody can tell), a blade, something blunt, or nothing. */
export type Drawn = 'gun' | 'blade' | 'blunt' | 'none';

/** What goes into how much someone fears the player, as they see it. */
export interface FearContext {
  drawn: Drawn;
  /** Chrome in the arms that fights (Mantis Blades, Gorilla Arms). */
  chrome: boolean;
  /** The player's levels with what they'd use against theirs (a negative number when theirs are better). */
  edge: number;
  /** Whether they carry a weapon of their own. */
  armed: boolean;
  masked: boolean;
  /** What they've seen or heard of the player: a killing, a beating, or that it was the player who robbed them last time. */
  dread: 'murder' | 'assault' | 'robbed' | null;
  /** Their own nerve, 0 to 1. */
  courage: number;
  /** Their people here (family, friends, crew, their gang), and anyone else watching. */
  backup: number;
  watching: number;
  /** A ganger on their own gang's turf, or an officer. */
  turf: boolean;
  officer: boolean;
  /** How the player looks: hurt, drunk. */
  hurt: boolean;
  drunk: boolean;
}

export interface RobberyRules {
  /** Going through someone's pockets for what they kept back: its energy, the odds (`searchOdds`), how long after it can be tried, and how readily the hot-tempered swing instead (`temper`, of their temper). */
  search: { energy: number; bonus: number; courage: number; least: number; most: number; minutes: number; temper: number };
  fear: {
    base: number;
    drawn: Record<Drawn, number>;
    chrome: number;
    /** A level's worth either way, and the most levels count. */
    perLevel: number;
    levels: number;
    armed: number;
    mask: number;
    dread: { murder: number; assault: number; robbed: number };
    courage: number;
    backup: { each: number; most: number };
    watching: { each: number; most: number };
    turf: number;
    officer: number;
    hurt: number;
    drunk: number;
  };
  /** How fear reads on them, the most afraid first: from `at` up. */
  bands: Array<{ at: number; label: string }>;
  /** The share of their cash they hand over: none at `from`, all of it at `to`, and the greedy keep back `greed` of what they would have given. */
  hand: { from: number; to: number; greed: number };
  /** Fear it takes to give up the chip, and a valuable (jewellery more), the greedy needing `greed` more. */
  chip: { at: number; greed: number };
  valuable: { at: number; greed: number; jewellery: number };
  /** Under `below`, they won't hand over anything; and the more so, the likelier the brave (`courage`) and the hot-tempered (`temper`) fight. */
  refuse: { below: number };
  fight: { below: number; courage: number; temper: number };
}

/** What someone does about being robbed: fight, refuse, or hand over a share of their cash, and maybe the chip and a valuable. */
export interface Response {
  kind: 'fight' | 'refuse' | 'hand';
  share: number;
  chip: boolean;
  valuable: boolean;
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** How much someone fears the player, 0 (not at all) to 1 (terrified). */
export function fearOf(ctx: FearContext, rules: RobberyRules): number {
  const f = rules.fear;
  const levels = Math.max(-f.levels, Math.min(f.levels, ctx.edge));
  return clamp(
    f.base +
      f.drawn[ctx.drawn] +
      (ctx.chrome ? f.chrome : 0) +
      levels * f.perLevel -
      (ctx.armed ? f.armed : 0) +
      (ctx.masked ? f.mask : 0) +
      (ctx.dread ? f.dread[ctx.dread] : 0) -
      ctx.courage * f.courage -
      Math.min(f.backup.most, ctx.backup * f.backup.each) -
      Math.min(f.watching.most, ctx.watching * f.watching.each) -
      (ctx.turf ? f.turf : 0) -
      (ctx.officer ? f.officer : 0) -
      (ctx.hurt ? f.hurt : 0) -
      (ctx.drunk ? f.drunk : 0),
  );
}

/** How fear reads on someone: "Terrified", "Scared"… */
export function fearBand(fear: number, rules: RobberyRules): string {
  return (rules.bands.find((b) => fear >= b.at) ?? rules.bands.at(-1))?.label ?? '';
}

/** What someone robbed does, by how much they fear the player and who they are. */
export function respond(fear: number, traits: { courage: number; temper: number; greed: number }, jewellery: boolean, rules: RobberyRules, rng: Rng): Response {
  if (fear < rules.fight.below) {
    // Unafraid: the brave and the hot-tempered fight (the more so the braver or the hotter: squared, so an ordinary nerve mostly just says no), and the more so the less they fear.
    const odds = ((rules.fight.below - fear) / rules.fight.below) * (traits.courage ** 2 * rules.fight.courage + traits.temper ** 2 * rules.fight.temper);
    if (rng.chance(clamp(odds))) return { kind: 'fight', share: 0, chip: false, valuable: false };
  }
  if (fear < rules.refuse.below) return { kind: 'refuse', share: 0, chip: false, valuable: false };
  const share = clamp((fear - rules.hand.from) / (rules.hand.to - rules.hand.from)) * (1 - traits.greed * rules.hand.greed);
  const chip = fear >= rules.chip.at + traits.greed * rules.chip.greed;
  const valuable = fear >= rules.valuable.at + traits.greed * rules.valuable.greed + (jewellery ? rules.valuable.jewellery : 0);
  return { kind: 'hand', share, chip, valuable };
}

/** The odds of turning out someone's pockets for what they kept back: their fear, less their nerve. */
export function searchOdds(fear: number, courage: number, rules: RobberyRules): number {
  return clamp(fear + rules.search.bonus - courage * rules.search.courage, rules.search.least, rules.search.most);
}
