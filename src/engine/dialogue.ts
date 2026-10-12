import { gangOf, pronounsOf, type PeopleContent, type Person, type Population, type Tie, type TieKind } from './people';
import type { Rng } from './rng';
import type { Fact, Stance } from './society';
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
  /** The player's questions about a person's own life, by what they'd find out. */
  questions: Record<Exclude<Fact, 'nature' | 'drinks'>, string>;
  /** The answers; `freelance` for work with no address, `homeless` for no home, `nobody` for no gang hated. */
  facts: Record<Exclude<Fact, 'nature' | 'drinks'> | 'freelance' | 'homeless' | 'nobody', string[]>;
  /** The player's own lines, for the record. */
  you: { talk: string[]; askAbout: string[]; gift: string[]; insult: string[]; rob: string[] };
}

/** Someone the player hasn't been introduced to, as they look: "A young woman in Valentinos colors". */
export function describeStranger(person: Person, content: PeopleContent): string {
  const gang = gangOf(person, content);
  const age = person.age < 28 ? 'young ' : person.age > 55 ? 'older ' : '';
  const noun = person.pronouns === 'she' ? 'woman' : person.pronouns === 'he' ? 'man' : 'person';
  const article = age.startsWith('o') ? 'An' : 'A';
  return `${article} ${age}${noun}${gang ? ` in ${gang.name} colors` : ''}`;
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
  const home = person.home ? world.buildings.find((b) => b.id === person.home) : undefined;
  return {
    ...pronounsOf(person),
    age: String(person.age),
    home: home?.name ?? '',
    Role: capitalize(person.job.role),
    hateMember: hate?.member ?? '',
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

export type Topic = 'refuse' | 'grudge' | 'job' | 'likes' | 'hates' | 'kin' | 'district';

/** What a person says when talked to: a greeting for how they feel, then something about their life, and which part of it. */
export function talkLines(ctx: TalkContext, vars: Record<string, string>, lines: DialogueLines, rng: Rng): { said: string[]; topic: Topic } {
  if (ctx.stance === 'hostile') return { said: [fill(rng.pick(lines.refuse), vars)], topic: 'refuse' };
  const said = [fill(rng.pick(lines.greeting[ctx.stance]), vars)];
  if (ctx.grudge >= 10 && rng.chance(0.6)) {
    said.push(fill(rng.pick(lines.grudge), vars));
    return { said, topic: 'grudge' };
  }
  const topics: Array<[Topic, string[]]> = [];
  if (vars.gang) topics.push(['job', lines.topics.gang]);
  else if (vars.work) topics.push(['job', lines.topics.job]);
  else topics.push(['job', lines.topics.freelance]);
  topics.push(['likes', lines.topics.dish], ['district', lines.topics.district]);
  if (vars.hate) topics.push(['hates', lines.topics.hate]);
  if (ctx.reveal && vars.kinName) topics.push(['kin', lines.topics.kin], ['kin', lines.topics.kin]);
  const [topic, pool] = rng.pick(topics);
  said.push(fill(rng.pick(pool), vars));
  return { said, topic };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
