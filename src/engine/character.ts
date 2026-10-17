import type { Slot } from './carry';
import type { Voice } from './dialogue';
import type { PeopleContent, Person, Pronouns } from './people';
import { createRng, type Rng } from './rng';

/**
 * Who the player is, made at the start (the character builder): a name, the pronouns they go
 * by, a lifepath and a look. After the wiki's 2077 character creation: its three lifepaths (a
 * Streetkid raised on Night City's streets, a Nomad off the road, a Corpo out of a tower) and
 * a few parts of its look. What a lifepath gives in the game is ours (`src/data/character.ts`);
 * a save from before the builder has none of it, and plays as it always did.
 */

export type Lifepath = 'streetkid' | 'nomad' | 'corpo';
export const LIFEPATHS: readonly Lifepath[] = ['streetkid', 'nomad', 'corpo'];

/**
 * The parts of a look, each an option's id: the hair (its color, length and style), the eyes,
 * a mark, the build, and the body under the clothes (chest, genitals, and their size where
 * there is one). The first five and the build are plain to see; the rest is the body. Someone
 * under age has no body parts drawn (`''`).
 */
export type LookPart = 'color' | 'length' | 'style' | 'eyes' | 'mark' | 'build' | 'chest' | 'genitals' | 'size';
export const LOOK_PARTS: readonly LookPart[] = ['color', 'length', 'style', 'eyes', 'mark', 'build', 'chest', 'genitals', 'size'];
/** The parts the builder's Look step sets, and its Body step. */
export const FACE_PARTS: readonly LookPart[] = ['color', 'length', 'style', 'eyes', 'mark'];
export const BODY_PARTS: readonly LookPart[] = ['build', 'chest', 'genitals', 'size'];
export type Look = Record<LookPart, string>;
/** A look's option: its label, the words a line uses (a style's with `{length}` and `{color}` in it), and whether it stands out. */
export interface LookOption {
  id: string;
  label: string;
  words: string;
  bold?: boolean;
}
/** Weights for drawing a part of someone's look: for anyone, by pronouns, by gang, the young (under 30) and the old (55 and up), added up. */
export interface LookWeights {
  base: Record<string, number>;
  pronouns?: Partial<Record<Pronouns, Record<string, number>>>;
  gang?: Record<string, Record<string, number>>;
  young?: Record<string, number>;
  old?: Record<string, number>;
}

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
  /** Each part of a look: a label, and its options. */
  looks: Record<LookPart, { label: string; options: LookOption[] }>;
  /** How the people's looks are drawn, part by part; the hair's length that takes no style; the genitals that have a size; the age from which there's a body to draw. */
  people: Record<LookPart, LookWeights>;
  styleless: string[];
  sized: string[];
  adultAt: number;
}

/** Whether a character could have come out of the builder: a name, a lifepath, and a look the builder offers in every part. */
export function validCharacter(c: Character, rules: CharacterRules): boolean {
  if (!c.name.trim() || c.name.length > 40 || !LIFEPATHS.includes(c.lifepath)) return false;
  return LOOK_PARTS.every((part) => rules.looks[part].options.some((o) => o.id === c.look[part]));
}

/**
 * Someone's look, drawn on their own stream (it moves nothing else): every part by its
 * weights for who they are (their pronouns, their gang, their age), no style for hair too
 * short to have one, no size for genitals that have none, and no body at all under age.
 */
export function lookOf(person: Person, rules: CharacterRules): Look {
  const rng = createRng(`${person.id}:look`);
  const adult = person.age >= rules.adultAt;
  const pick = (part: LookPart): string => {
    const w = rules.people[part];
    const add = (into: Record<string, number>, from?: Record<string, number>) => {
      for (const [id, n] of Object.entries(from ?? {})) into[id] = (into[id] ?? 0) + n;
    };
    const weights: Record<string, number> = {};
    add(weights, w.base);
    add(weights, w.pronouns?.[person.pronouns]);
    if (person.gang) add(weights, w.gang?.[person.gang]);
    if (person.age < 30) add(weights, w.young);
    if (person.age >= 55) add(weights, w.old);
    const options = rules.looks[part].options.filter((o) => (weights[o.id] ?? 0) > 0);
    const total = options.reduce((n, o) => n + (weights[o.id] ?? 0), 0);
    let roll = rng.next() * total;
    for (const o of options) if ((roll -= weights[o.id] ?? 0) < 0) return o.id;
    return options.at(-1)?.id ?? rules.looks[part].options[0]?.id ?? '';
  };
  const color = pick('color');
  const length = pick('length');
  const style = pick('style');
  const eyes = pick('eyes');
  const mark = pick('mark');
  const build = pick('build');
  // Drawn whatever the age, so the stream reads the same for everyone; kept only for an adult.
  const chest = pick('chest');
  const genitals = pick('genitals');
  const size = pick('size');
  return {
    color,
    length,
    style: rules.styleless.includes(length) ? (rules.looks.style.options[0]?.id ?? '') : style,
    eyes,
    mark,
    build,
    chest: adult ? chest : '',
    genitals: adult ? genitals : '',
    size: adult && rules.sized.includes(genitals) ? size : '',
  };
}

/** A look in words: the hair ("long black hair in a ponytail", "cyan mohawk", "shaved head"), the eyes, a mark, the build, the chest, the genitals ("large penis"); nothing for a part not drawn. */
export interface LookWords {
  hair: string;
  eyes: string;
  mark: string;
  build: string;
  chest: string;
  genitals: string;
  /** Whether the hair stands out (dyed, a bold cut, shaved): what anyone would remark on. */
  bold: boolean;
}

export function lookWords(look: Look | undefined, rules: CharacterRules | undefined): LookWords {
  if (!look || !rules) return { hair: '', eyes: '', mark: '', build: '', chest: '', genitals: '', bold: false };
  const option = (part: LookPart) => rules.looks[part].options.find((o) => o.id === look[part]);
  const words = (part: LookPart) => option(part)?.words ?? '';
  const styled = rules.styleless.includes(look.length) ? words('length') : (option('style')?.words ?? '{length} {color} hair').replace('{length}', words('length'));
  const hair = styled.replace('{color}', words('color')).replace(/\s+/g, ' ').trim();
  const size = look.size && rules.sized.includes(look.genitals) ? words('size') : '';
  return {
    hair,
    eyes: words('eyes'),
    mark: words('mark'),
    build: words('build'),
    chest: words('chest'),
    genitals: [size, words('genitals')].filter(Boolean).join(' '),
    bold: Boolean(option('color')?.bold || option('length')?.bold || (!rules.styleless.includes(look.length) && option('style')?.bold)),
  };
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
