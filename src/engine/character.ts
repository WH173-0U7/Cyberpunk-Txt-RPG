import type { Slot } from './carry';
import type { Voice } from './dialogue';
import type { PeopleContent, Pronouns } from './people';
import type { Rng } from './rng';

/**
 * Who the player is, made at the start (the character builder): a name, the pronouns they go
 * by, a lifepath and a look. After the wiki's 2077 character creation: its three lifepaths (a
 * Streetkid raised on Night City's streets, a Nomad off the road, a Corpo out of a tower) and
 * a few parts of its look. What a lifepath gives in the game is ours (`src/data/character.ts`);
 * a save from before the builder has none of it, and plays as it always did.
 */

export type Lifepath = 'streetkid' | 'nomad' | 'corpo';
export const LIFEPATHS: readonly Lifepath[] = ['streetkid', 'nomad', 'corpo'];

/** The parts of a look the builder sets, each an option's id. */
export type LookPart = 'hair' | 'color' | 'eyes' | 'mark';
export const LOOK_PARTS: readonly LookPart[] = ['hair', 'color', 'eyes', 'mark'];
export type Look = Record<LookPart, string>;

export interface Character {
  name: string;
  pronouns: Pronouns;
  lifepath: Lifepath;
  look: Look;
}

/** A lifepath: what it's called and how the builder puts it, and where and how the player starts out. */
export interface LifepathContent {
  name: string;
  blurb: string;
  /** Where they start: a real place by name, else any place out in the open of the district. */
  district: string;
  place: string;
  /** Cash on them and in the account. */
  cash: number;
  account: number;
  /** What they wear in place of the usual, by slot: a garment kind (`GEAR.kinds`). */
  outfit: Partial<Record<Slot, string>>;
  /** Reputation they start with, by circle (`district:heywood`, `gang:valentinos`). */
  rep: Record<string, number>;
  /** People from round where they start who know them already: how many, of whom, how well, and as what. */
  known: { count: number; district: string; gang?: string; corpo?: boolean; rapport: number };
  /** How readily people of each voice take to them: openness on every ask. */
  voices: Partial<Record<Voice, number>>;
}

export interface CharacterRules {
  lifepaths: Record<Lifepath, LifepathContent>;
  /** Each part of a look: the options, a label and the words for it in a line ("cyan mohawk"). */
  looks: Record<LookPart, { label: string; options: Array<{ id: string; label: string; words: string }> }>;
}

/** Whether a character could have come out of the builder: a name, a lifepath, and a look the builder offers. */
export function validCharacter(c: Character, rules: CharacterRules): boolean {
  if (!c.name.trim() || c.name.length > 40 || !LIFEPATHS.includes(c.lifepath)) return false;
  return LOOK_PARTS.every((part) => rules.looks[part].options.some((o) => o.id === c.look[part]));
}

/** A look in words, as a line puts it: "cyan mohawk", "chrome optics", "scar" (nothing for no mark). */
export function lookWords(look: Look | undefined, rules: CharacterRules | undefined): { hair: string; eyes: string; mark: string } {
  if (!look || !rules) return { hair: '', eyes: '', mark: '' };
  const words = (part: LookPart) => rules.looks[part].options.find((o) => o.id === look[part])?.words ?? '';
  return { hair: words('hair').replace('{color}', words('color')), eyes: words('eyes'), mark: words('mark') };
}

/** A name for a new player of a lifepath, from the names of the people where it starts (by pronouns; anyone's for they). */
export function nameFor(lifepath: Lifepath, pronouns: Pronouns, rules: CharacterRules, people: PeopleContent, rng: Rng): string {
  const backgrounds = people.backgrounds[rules.lifepaths[lifepath].district] ?? [[people.fallbackBackground, 1]];
  const total = backgrounds.reduce((n, [, w]) => n + w, 0);
  let roll = rng.next() * total;
  const [community] = backgrounds.find(([, w]) => (roll -= w) < 0) ?? backgrounds[0]!;
  const pool = people.names[community] ?? people.names[people.fallbackBackground]!;
  const given = pronouns === 'she' ? pool.feminine : pronouns === 'he' ? pool.masculine : rng.chance(0.5) ? pool.feminine : pool.masculine;
  return `${rng.pick(given)} ${rng.pick(pool.family)}`;
}
