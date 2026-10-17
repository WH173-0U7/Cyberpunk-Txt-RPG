/**
 * The player at someone's mercy: put down in a fight, or knocked out cold. Whoever did it goes
 * through their pockets and takes everything (`robsOdds`: anyone, but someone who only fought
 * back does it by their greed, and the NCPD never), and may finish them (`killOdds`): by why
 * they were fighting (come for revenge, by what it was for; a gang's turf; a robbery; a debt;
 * fighting back), who they are (temper and nerve for it, warmth against), the grudge they hold,
 * and who's watching. Pure; the numbers and the lines are in `src/data/downed.ts`, and `Game`
 * does it.
 */

/** Why someone was fighting the player. */
export type Motive = 'revenge' | 'turf' | 'robbery' | 'debt' | 'defense' | 'police';

/** What a revenge was for: what the player did (a killing, a beating, a robbery, an insult), or a gang's hunt. */
export type RevengeFor = 'murder' | 'assault' | 'robbery' | 'insult' | 'gang';

export interface DownedRules {
  /** Someone who only fought back takes the lot by their greed, times this; anyone else always, the NCPD never. */
  rob: { defense: number };
  kill: {
    /** The odds by why they fought, before who they are; a revenge by what it was for. */
    motive: Record<Exclude<Motive, 'revenge'>, number>;
    revenge: Record<RevengeFor, number>;
    /** How much their nature moves it, about an ordinary one (a half): temper and nerve up, warmth down. */
    temper: number;
    courage: number;
    warmth: number;
    /** A point of their grudge against the player, up to `grudgeMost` points. */
    grudge: number;
    grudgeMost: number;
    /** Each one watching (not in it), times this; a ganger on their own turf minds nobody. */
    watching: number;
    most: number;
  };
  /** Revenge comes as a fight (the one coming, or one of the gang), its first beat waiting on the player; run from, it comes again in these hours. */
  again: [number, number];
  lines: {
    /** They take everything: `{haul}`. */
    stripped: string[];
    /** Nothing on the player to take. */
    bare: string[];
    /** They leave the player breathing. */
    spared: string[];
    /** They finish the player (`{place}`): the end. */
    killed: string[];
    /** Revenge arriving: the one with the grudge (`{name}`), a gang's (`{gang}`), a loan shark's (`{gang}`). */
    arrive: string[];
    arriveGang: string[];
    arriveDebt: string[];
  };
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** The odds that whoever put the player down goes through their pockets. */
export function robsOdds(motive: Motive, greed: number, rules: DownedRules): number {
  if (motive === 'police') return 0;
  return motive === 'defense' ? clamp(greed * rules.rob.defense) : 1;
}

/** The odds that whoever put the player down finishes them. */
export function killOdds(
  motive: Motive,
  why: RevengeFor | null,
  traits: { temper: number; courage: number; warmth: number },
  grudge: number,
  watching: number,
  turf: boolean,
  rules: DownedRules,
): number {
  const k = rules.kill;
  if (motive === 'police') return 0;
  const base = motive === 'revenge' ? k.revenge[why ?? 'gang'] : k.motive[motive];
  const nature = Math.max(0, 1 + (traits.temper - 0.5) * k.temper) * Math.max(0, 1 + (traits.courage - 0.5) * k.courage) * Math.max(0, 1 - (traits.warmth - 0.5) * k.warmth);
  const held = 1 + Math.min(Math.max(0, grudge), k.grudgeMost) * k.grudge;
  const crowd = turf ? 1 : k.watching ** Math.max(0, watching);
  return clamp(base * nature * held * crowd, 0, k.most);
}
