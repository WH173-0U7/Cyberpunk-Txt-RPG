import { gangOf, pronounsOf, type PeopleContent, type Person, type Population, type Tie, type TieKind } from './people';
import type { Rng } from './rng';
import type { Stance } from './society';
import type { World } from './types';

/** What people say. Our words, in Night City's voice. */
export interface DialogueLines {
  greeting: Record<Stance, string[]>;
  topics: {
    job: string[];
    freelance: string[];
    gang: string[];
    kin: string[];
    dish: string[];
    district: string[];
    hate: string[];
  };
  /** From someone who holds something against the player but will still talk. */
  grudge: string[];
  /** From someone who won't. */
  refuse: string[];
  talkedOut: string[];
  gift: { thanks: string[]; favorite: string[]; refuse: string[] };
  insult: { reply: string[]; shove: string[] };
  rob: { done: string[]; nothing: string[]; fought: string[] };
  revenge: { person: string[]; gang: string[] };
  /** A storefront that won't serve the player. */
  barred: string[];
  /** Asked whether they know someone: they do (`{other}`, `{word}`), they don't, or they won't say. */
  ask: { knows: string[]; unknown: string[]; refuse: string[] };
}

export const KIN_LABEL: Record<TieKind, string> = {
  spouse: 'spouse',
  sibling: 'sibling',
  cousin: 'cousin',
  parent: 'parent',
  child: 'child',
  uncle: 'uncle',
  nephew: 'nephew',
  kin: 'in-law',
  friend: 'friend',
  crew: 'crewmate',
  coworker: 'coworker',
};

/** A person's word for one of their ties: what `other` is to them. */
export function kinWord(person: Person, kind: TieKind, other: Person): string {
  const gendered = (she: string, he: string, they: string) => (other.pronouns === 'she' ? she : other.pronouns === 'he' ? he : they);
  if (kind === 'spouse') return gendered('wife', 'husband', 'spouse');
  if (kind === 'sibling') return gendered('sister', 'brother', 'sibling');
  if (kind === 'parent') return gendered('mother', 'father', 'parent');
  if (kind === 'child') return gendered('daughter', 'son', 'kid');
  if (kind === 'uncle') return gendered('aunt', 'uncle', 'aunt or uncle');
  if (kind === 'nephew') return gendered('niece', 'nephew', 'niece or nephew');
  if (kind === 'crew') return person.gang ? 'crewmate' : 'associate';
  return KIN_LABEL[kind];
}

/** Fills `{name}`, `{given}`, `{he}`, `{him}`, `{his}`, `{He}`, `{s}` and whatever else is given. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key === 'He') return capitalize(vars.he ?? 'they');
    if (key === 'His') return capitalize(vars.his ?? 'their');
    return vars[key] ?? match;
  });
}

export interface TalkContext {
  stance: Stance;
  /** Whether the player has earned hearing about this person's people. */
  reveal: boolean;
  grudge: number;
}

export const FAMILY: TieKind[] = ['spouse', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

/** Everything a template can mention about a person, and the one relative (`kin`) a line about family would name. */
export function varsFor(person: Person, world: World, population: Population, content: PeopleContent, dishes: Array<{ id: string; name: string }>, kin?: Tie): Record<string, string> {
  const gang = gangOf(person, content);
  const district = world.districts[person.district];
  const work = person.job.building ? world.buildings.find((b) => b.id === person.job.building) : undefined;
  const hate = person.hates ? content.gangs[person.hates] : undefined;
  const kinPerson = kin ? population.people.find((p) => p.id === kin.to) : undefined;
  const kinWork = kinPerson?.job.building ? world.buildings.find((b) => b.id === kinPerson.job.building) : undefined;
  const kinPronouns = kinPerson ? pronounsOf(kinPerson) : null;
  return {
    ...pronounsOf(person),
    kinHe: kinPronouns?.he ?? 'they',
    kinHim: kinPronouns?.him ?? 'them',
    kinHis: kinPronouns?.his ?? 'their',
    name: person.name,
    given: person.given,
    role: person.job.role,
    work: work?.name ?? '',
    district: district?.name ?? 'Night City',
    gang: gang?.name ?? '',
    member: gang?.member ?? '',
    hate: hate?.name ?? '',
    dish: dishes.find((d) => d.id === person.likes.dish)?.name ?? 'a hot meal',
    drink: dishes.find((d) => d.id === person.likes.drink)?.name ?? 'a drink',
    kinName: kinPerson?.given ?? '',
    kinWord: kin && kinPerson ? kinWord(person, kin.kind, kinPerson) : '',
    kinWork: kinWork?.name ?? (kinPerson ? kinPerson.job.role : ''),
  };
}

/** What a person says when talked to: a greeting for how they feel, then something about their life. `kin`: whether that was about their relative. */
export function talkLines(ctx: TalkContext, vars: Record<string, string>, lines: DialogueLines, rng: Rng): { said: string[]; kin: boolean } {
  if (ctx.stance === 'hostile') return { said: [fill(rng.pick(lines.refuse), vars)], kin: false };
  const said = [fill(rng.pick(lines.greeting[ctx.stance]), vars)];
  if (ctx.grudge >= 10 && rng.chance(0.6)) {
    said.push(fill(rng.pick(lines.grudge), vars));
    return { said, kin: false };
  }
  const topics: string[][] = [];
  if (vars.gang) topics.push(lines.topics.gang);
  else if (vars.work) topics.push(lines.topics.job);
  else topics.push(lines.topics.freelance);
  topics.push(lines.topics.dish, lines.topics.district);
  if (vars.hate) topics.push(lines.topics.hate);
  if (ctx.reveal && vars.kinName) topics.push(lines.topics.kin, lines.topics.kin);
  const topic = rng.pick(topics);
  said.push(fill(rng.pick(topic), vars));
  return { said, kin: topic === lines.topics.kin };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
