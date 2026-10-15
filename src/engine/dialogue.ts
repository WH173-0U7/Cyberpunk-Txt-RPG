import { bossOf } from './jobs';
import { dreamOf, gangOf, handleOf, heartOf, pronounsOf, type Dream, type Heart, type PeopleContent, type Person, type Population, type Pronouns, type Tie, type TieKind, type Traits, type Want } from './people';
import type { Rng } from './rng';
import type { Asked, Fact, OpennessRules, Stance, Standing } from './society';
import type { World } from './types';

/**
 * What people say, put together on the spot rather than read off a list. A line is made of
 * fragments (`src/data/dialogue.ts`): an opener, sometimes; the thing itself; an aside,
 * sometimes. Each is picked from the fragments that fit the speaker: how they feel about the
 * player, how they talk (`Voice`: the street, a gang, a corpo, a nomad, their elders, the
 * young), what they're in the middle of (`Mood`), how well they know the player (`History`),
 * their nature (`Traits`), and the player's own way with words (`Eloquence`, from charisma).
 * A lexicon swaps slang in by voice (`{choom}`, `{gonk}`, `{eddies}`…), so one fragment
 * reads differently from a Valentino and from an Arasaka analyst. Whether someone answers at
 * all is `openness`: how they feel, the player's charisma, their nature, and how much the
 * question asks of them.
 */
export type Voice = 'street' | 'gang' | 'corpo' | 'nomad' | 'elder' | 'young';
export type Mood = 'busy' | 'easy' | 'eating' | 'drinking' | 'court' | 'home' | 'asleep';
/** How well the player and the speaker know each other, as of this exchange. */
export type History = 'first' | 'recent' | 'regular' | 'long';
/** The player's way with words, in three sizes. */
export type Eloquence = 'blunt' | 'easy' | 'smooth';
/** What a chat can turn to; `news` is what happened between people lately (life.ts), `dream` what they want out of life, `views` what they make of the corps, the badges and the city. */
export type Topic = 'job' | 'likes' | 'hates' | 'kin' | 'district' | 'life' | 'here' | 'rumor' | 'news' | 'dream' | 'views';
/** How the player starts a chat: just talking, a compliment, a joke, asking what's the word, asking how they're holding up, or a flirt. People take each by who they are and how they're doing. */
export type Approach = Want | 'flirt';
/** One way someone takes something: when it fits them, how much they like it (less than nothing: dislike), and why, as the player would read it (`{given}` and the rest filled in). */
export interface Reaction {
  when: When;
  by: number;
  why: string;
}
/** What the player can ask someone about themselves. */
export type Question = Exclude<Fact, 'nature' | 'drinks' | 'dream' | 'dead'>;
export type Reply = 'answer' | 'deflect' | 'refuse';

/** When a fragment fits: everything given must hold. */
export interface When {
  stance?: Stance[];
  voice?: Voice[];
  mood?: Mood[];
  history?: History[];
  eloquence?: Eloquence[];
  /** A trait at 0.6 or above (`high`), or at 0.4 or below (`low`). */
  traits?: Partial<Record<keyof Traits, 'high' | 'low'>>;
  /** In a gang, or not. */
  gang?: boolean;
  /** Variables that must have something in them for the line to make sense. */
  needs?: string[];
  /** Variables that must be empty. */
  lacks?: string[];
}

export interface Fragment {
  text: string;
  when?: When;
  /** Against the others that fit; 1 if not said. */
  weight?: number;
}

/** A fragment, or just its text when it fits anyone. */
export type Line = string | Fragment;

export interface DialogueLines {
  /** Slang by voice: what `{choom}`, `{gonk}`, `{preem}`, `{eddies}`, `{badges}`, `{delta}`, `{scop}`, `{hey}`, `{yeah}` and `{nah}` come out as. */
  lexicon: Record<Voice, Record<string, string>>;
  /** Slang by gang, over the gang voice's: how a Valentino or a Voodoo Boy says `{choom}` or `{hey}`. */
  gangLexicon: Record<string, Record<string, string>>;
  /** Said before an answer, sometimes: by what they're doing, how they feel, how they talk. */
  openers: Line[];
  /** Said after a chat or an answer, sometimes: by who they are. */
  tails: Line[];
  greeting: Line[];
  /** Their name, said the first time it comes up: after a greeting, or an answer to something else (`{given}`, `{name}`, `{handle}`). */
  introduce: Line[];
  topics: Record<Topic, Line[]>;
  /** From someone with nothing they'll bring up. */
  brushOff: Line[];
  /** From someone who holds something against the player but will still talk. */
  grudge: Line[];
  /** Narration: someone who won't deal with the player at all. */
  hostile: Line[];
  /** Narration: someone asleep. */
  asleep: Line[];
  talkedOut: Line[];
  /** Answers about themselves. */
  facts: Record<Question, Line[]>;
  /** Non-answers, by what was asked. */
  deflect: { [K in Asked]?: Line[] } & { any: Line[] };
  refuse: Line[];
  /** Asked again after a no. */
  pressed: Line[];
  /** Asked what they already said, with `{answer}` for it. */
  repeat: Line[];
  /** Asked whether they know someone: they do (`{other}`, `{word}`), they don't, or they've said already; they did, and `{other}` is dead (`{otherAgo}`); they did, and they're done with them (an ex, a friend fallen out with). */
  ask: { knows: Line[]; unknown: Line[]; repeat: Line[]; dead: Line[]; ex: Line[] };
  gift: { thanks: Line[]; favorite: Line[]; refuse: Line[] };
  insult: { reply: Line[]; shove: Line[] };
  rob: { done: Line[]; nothing: Line[]; fought: Line[] };
  /** A netrunner asked to chop a stolen credchip (`{balance}` on it, `{cut}` theirs, `{left}` after): they do, or they won't. */
  chop: { done: Line[]; refuse: Line[] };
  /** A boss asked for work (`{title}` the bottom rung, `{work}` the place, `{pay}` a shift): taken on, turned down, or not in a mask; a word after a shift; moved up (`{title}` the new rung); told the player quits. */
  /** `broke`: a boss whose place is struggling, turning the player away; `rehire`: a boss the player walked out on (`memQuit`) or who let them go (`memFired`), still remembering it. */
  work: { hire: Line[]; refuse: Line[]; masked: Line[]; shift: Line[]; promote: Line[]; quit: Line[]; broke: Line[]; rehire: Line[] };
  revenge: { person: Line[]; gang: Line[] };
  /** What someone brings up of what the player did, as they remember it (memory.ts): `mem` and `mem<Kind>` say which, with `{memWho}`, `{memWord}`, `{memAgo}`, `{memItem}`, `{memTook}`, `{memTitle}` and `memTwice`, `memAgain` (brought up before), `memRobbery`, `memInsult`, `memFavorite`. */
  memory: Line[];
  /** A storefront that won't serve the player. */
  barred: Line[];
  /** A mask on the player: a counter that serves no mask (`{work}`, `{mask}`), and someone who was there when the mask did something, seeing it again (`{mask}`). */
  masked: { barred: Line[]; recognized: Line[] };
  /** The player's questions: a short label for the button, and how they put it, by eloquence. */
  questions: Record<Question, { label: string; lines: Line[] }>;
  /** Ways to start a chat besides just talking: a short label for the chip, how the player puts it, and how it lands (liked, taken in stride, disliked). */
  approaches: Record<Exclude<Approach, 'chat'>, { label: string; you: Line[]; liked: Line[]; flat: Line[]; disliked: Line[] }>;
  /** What someone wants out of life, as the card says it once the player knows ("Wants out of Night City"). */
  dreams: Record<Dream, string>;
  /** Why an exchange went the way it did, on the note after it (`{given}`, `{his}`, `{item}`…): pushed after a no, one question too many, a favorite, a second gift in a day, a mask, a job, walking out, a chop. */
  notes: { pressed: string; grilled: string; favorite: string; twice: string; masked: string; hired: string; quit: string; chopped: string; date: string; official: string; dumped: string; ended: string; jealous: string };
  /**
   * Romance with the player (romance.ts): asked out (yes; not drawn to the player; spoken for,
   * `{taken}` their `{takenWord}`; not yet; not in a mask); a date (`{item}` ordered for two,
   * `favorite`, `{here}`); asked to make it official (yes, not yet); dumped by the player; ending
   * it themselves (`fizzled`: the spark gone, `caught`: once too often); jealous, seeing the
   * player flirt with `{other}`; and a heart's words for the card.
   */
  romance: {
    ask: { yes: Line[]; notDrawn: Line[]; taken: Line[]; notYet: Line[]; masked: Line[] };
    date: Line[];
    official: { yes: Line[]; notYet: Line[] };
    dumped: Line[];
    theyEnd: Line[];
    jealous: Line[];
    /** On the card, once the player knows someone's type: the way in that wins them over, and someone drawn to no one. */
    wants: Record<Want, string>;
    notLooking: string;
  };
  /** The player's own lines, for the record, by eloquence. */
  you: { talk: Line[]; askAbout: Line[]; gift: Line[]; insult: Line[]; rob: Line[]; chop: Line[]; work: Line[]; quit: Line[]; askOut: Line[]; date: Line[]; official: Line[]; endIt: Line[] };
}

/** Everything a line can be picked and filled by; `vars.mask` is the word for the mask the player has on, or nothing. */
export interface Speaker {
  person: Person;
  voice: Voice;
  mood: Mood;
  stance: Stance;
  history: History;
  /** The player's, which the player's own lines follow. */
  eloquence: Eloquence;
  vars: Record<string, string>;
}

const DAY = 86_400_000;

/** How someone talks, from who they are: a ganger, a corpo, a nomad, an elder, a kid, or the street. */
export function voiceOf(person: Person, world: World): Voice {
  if (person.gang) return 'gang';
  const work = person.job.building ? world.buildings.find((b) => b.id === person.job.building) : undefined;
  if (work?.kind === 'tower' || /analyst|manager|executive|consultant|receptionist|drone pilot|systems tech/i.test(person.job.role)) return 'corpo';
  if (person.district === 'badlands') return 'nomad';
  if (person.age >= 56) return 'elder';
  if (person.age <= 23) return 'young';
  return 'street';
}

/** What someone is in the middle of, from what they're doing ("at the stove", "nursing a beer"…). */
export function moodOf(doing: string): Mood {
  const d = doing.toLowerCase();
  if (d.includes('asleep')) return 'asleep';
  if (d.startsWith('at home')) return 'home';
  if (d.startsWith('holding court')) return 'court';
  if (d.startsWith('nursing')) return 'drinking';
  if (d.startsWith('eating')) return 'eating';
  if (/stove|counter|watch|patient|shift/.test(d)) return 'busy';
  return 'easy';
}

/** Never dealt with the player; dealt with them lately; a regular; or not for days. */
export function historyOf(standing: Standing, timeScale: number, now: number): History {
  if (!standing.met) return 'first';
  if (standing.lastTalkAt && now - standing.lastTalkAt > (3 * DAY) / timeScale) return 'long';
  if (standing.talks >= 4) return 'regular';
  return 'recent';
}

/** The player's way with words, from their charisma level. */
export function eloquenceOf(level: number): Eloquence {
  return level >= 4 ? 'smooth' : level >= 2 ? 'easy' : 'blunt';
}

export function fits(when: When | undefined, speaker: Speaker): boolean {
  if (!when) return true;
  if (when.stance && !when.stance.includes(speaker.stance)) return false;
  if (when.voice && !when.voice.includes(speaker.voice)) return false;
  if (when.mood && !when.mood.includes(speaker.mood)) return false;
  if (when.history && !when.history.includes(speaker.history)) return false;
  if (when.eloquence && !when.eloquence.includes(speaker.eloquence)) return false;
  if (when.gang !== undefined && Boolean(speaker.person.gang) !== when.gang) return false;
  if (when.traits) {
    for (const [trait, level] of Object.entries(when.traits) as Array<[keyof Traits, 'high' | 'low']>) {
      const value = speaker.person.traits[trait];
      if (level === 'high' ? value < 0.6 : value > 0.4) return false;
    }
  }
  if (when.needs?.some((key) => !speaker.vars[key])) return false;
  if (when.lacks?.some((key) => speaker.vars[key])) return false;
  return true;
}

function fragmentOf(line: Line): Fragment {
  return typeof line === 'string' ? { text: line } : line;
}

export function textOf(line: Line): string {
  return typeof line === 'string' ? line : line.text;
}

/** One of the fragments that fit, by weight; null when none do. */
export function pickFragment(pool: Line[], speaker: Speaker, rng: Rng): Fragment | null {
  const fitting = pool.map(fragmentOf).filter((f) => fits(f.when, speaker));
  if (!fitting.length) return null;
  const total = fitting.reduce((sum, f) => sum + (f.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const f of fitting) {
    roll -= f.weight ?? 1;
    if (roll < 0) return f;
  }
  return fitting[fitting.length - 1] ?? null;
}

/** One line from a pool, filled in; empty when nothing fits. */
export function line(pool: Line[], speaker: Speaker, rng: Rng): string {
  const picked = pickFragment(pool, speaker, rng);
  return picked ? finish(picked.text, speaker.vars) : '';
}

/**
 * A line from a pool with, sometimes, an opener before it and an aside after it: the more
 * talkative the speaker, the more often. Empty when nothing in the pool fits.
 */
export function compose(pool: Line[], speaker: Speaker, lines: DialogueLines, rng: Rng, parts: { opener?: boolean; tail?: boolean } = {}): string {
  const core = pickFragment(pool, speaker, rng);
  if (!core) return '';
  const { chatty } = speaker.person.traits;
  const said: string[] = [];
  if (parts.opener !== false && rng.chance(0.15 + chatty * 0.45)) {
    const opener = pickFragment(lines.openers, speaker, rng);
    if (opener) said.push(opener.text);
  }
  said.push(core.text);
  if (parts.tail !== false && rng.chance(chatty * 0.7)) {
    const tail = pickFragment(lines.tails, speaker, rng);
    if (tail) said.push(tail.text);
  }
  return finish(said.join(' '), speaker.vars);
}

// ───────────── Openness ─────────────

/**
 * How ready someone is to tell the player a thing (or, for `chop`, to do it): how they feel
 * about them, the player's charisma, how talkative and warm they are, less what the thing
 * asks of them (their name is nothing; where they sleep is a lot; their people, the more
 * loyal they are; who they hate, the less nerve they have; a hot chip, the less greedy), and
 * less again for a mask on the player: nobody opens up to a face they can't see.
 */
export function openness(asked: Asked, stance: Stance, level: number, traits: Traits, rules: OpennessRules, masked = false, moment: Moment = {}): number {
  let score = rules.stance[stance] + (level - 1) * rules.perLevel - rules.cost[asked];
  if (masked) score -= rules.mask;
  score += (traits.chatty - 0.5) * rules.traits.chatty + (traits.warmth - 0.5) * rules.traits.warmth;
  if (asked === 'kin') score -= (traits.loyalty - 0.5) * rules.traits.loyalty;
  if (asked === 'hates') score += (traits.courage - 0.5) * rules.traits.courage;
  if (asked === 'chop') score += (traits.greed - 0.5) * rules.traits.greed;
  // The moment: a drink in hand, a shift on, a mouthful; questions piling up; the gang they hate in the room; grief; the small hours; a drunk asking.
  const m = rules.moment;
  const work = asked === 'job' || asked === 'here' || asked === 'hire' || asked === 'chop';
  if (moment.mood === 'drinking') score += m.drinking;
  if (moment.mood === 'busy' && !work) score -= m.busy;
  if (moment.mood === 'eating' && !work) score -= m.eating;
  score -= (moment.grilled ?? 0) * m.grilled;
  if (moment.enemyHere && asked === 'hates') score -= m.enemy * (1.5 - traits.courage);
  if (moment.grieving) score -= m.grieving;
  if (moment.late && asked === 'home') score -= m.late;
  if (moment.drunk && stance !== 'warm' && stance !== 'friend') score -= m.drunk;
  return Math.round(score * 100) / 100;
}

/** What the moment brings to a question: what they're doing, how many questions in a row past the free ones, the gang they hate here, grief, the small hours, a drunk player. */
export interface Moment {
  mood?: Mood;
  grilled?: number;
  enemyHere?: boolean;
  grieving?: boolean;
  late?: boolean;
  drunk?: boolean;
}

/** The moment, as a speaker's variables say it. */
export function momentOf(speaker: Speaker, grilled = 0): Moment {
  const { vars } = speaker;
  return { mood: speaker.mood, grilled, enemyHere: Boolean(vars.enemyHere), grieving: Boolean(vars.grief), late: Boolean(vars.late), drunk: Boolean(vars.youDrunk) };
}

/** How someone takes something (a question, a way of starting a chat): every reaction that fits them adds up; the strongest one the right way says why. Zero, and no why, when nothing fits or it cancels out. */
export function reactionTo(reactions: Reaction[] | undefined, speaker: Speaker): { score: number; why: string } {
  const fitting = (reactions ?? []).filter((r) => fits(r.when, speaker));
  const score = fitting.reduce((n, r) => n + r.by, 0);
  if (!score) return { score: 0, why: '' };
  const strongest = fitting.filter((r) => Math.sign(r.by) === Math.sign(score)).sort((a, b) => Math.abs(b.by) - Math.abs(a.by))[0];
  return { score, why: strongest ? finish(strongest.why, speaker.vars) : '' };
}

/** What comes of an openness: an answer for sure at `answerAt`, a flat no below `deflectAt`, and in between a chance of either, or a non-answer. */
export function replyTo(score: number, rules: OpennessRules, rng: Rng): Reply {
  if (score >= rules.answerAt) return 'answer';
  if (score < rules.deflectAt) return 'refuse';
  return rng.chance((score - rules.deflectAt) / (rules.answerAt - rules.deflectAt)) ? 'answer' : 'deflect';
}

const TOPICS: Topic[] = ['district', 'life', 'here', 'job', 'likes', 'hates', 'kin', 'rumor', 'news', 'dream', 'views'];

/** What someone will bring up on their own: the topics they're open about, as of this chat. */
export function openTopics(speaker: Speaker, level: number, rules: OpennessRules, rng: Rng, reveal: boolean): Topic[] {
  const { vars, person } = speaker;
  const open: Topic[] = [];
  for (const topic of TOPICS) {
    if (topic === 'kin' && !(reveal && vars.kinName)) continue;
    if (topic === 'hates' && !vars.hate) continue;
    if (topic === 'here' && !vars.here) continue;
    if (topic === 'rumor' && !['gangGood', 'gangBad', 'districtGood', 'districtBad'].some((key) => vars[key])) continue;
    if (topic === 'news' && !vars.news) continue;
    if (topic === 'dream' && !vars.dream) continue;
    if (replyTo(openness(topic, speaker.stance, level, person.traits, rules, Boolean(vars.mask), momentOf(speaker)), rules, rng) === 'answer') open.push(topic);
  }
  return open;
}

/**
 * Something about their life, on one of the topics on the table (their people, and what
 * happened lately, twice as likely; what was asked for, `prefer`, when it's on the table at
 * all), or a brush-off when there's nothing they'll say.
 */
export function smallTalk(speaker: Speaker, topics: Topic[], lines: DialogueLines, rng: Rng, prefer: Topic[] = []): { said: string; topic: Topic | null } {
  const wanted = topics.filter((t) => prefer.includes(t));
  const pool = wanted.length ? wanted : topics.flatMap((t) => (t === 'kin' || t === 'news' ? [t, t] : [t]));
  const topic = pool.length ? rng.pick(pool) : null;
  const said = topic ? compose(lines.topics[topic], speaker, lines, rng, { opener: false }) : '';
  return said ? { said, topic } : { said: line(lines.brushOff, speaker, rng), topic: null };
}

/** An answer to a question about themselves, as they'd put it. */
export function answer(speaker: Speaker, question: Question, lines: DialogueLines, rng: Rng): string {
  return compose(lines.facts[question], speaker, lines, rng);
}

/** A non-answer to what was asked. */
export function deflect(speaker: Speaker, asked: Asked, lines: DialogueLines, rng: Rng): string {
  const pool = lines.deflect[asked];
  return (pool && line(pool, speaker, rng)) || line(lines.deflect.any, speaker, rng);
}

/** What they say when asked what they've already said. */
export function repeat(speaker: Speaker, question: Question, lines: DialogueLines, rng: Rng): string {
  const core = pickFragment(lines.facts[question], speaker, rng);
  const again = pickFragment(lines.repeat, speaker, rng);
  if (!core) return '';
  return finish(again ? again.text : '{answer}', { ...speaker.vars, answer: finish(core.text, speaker.vars) });
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
  partner: 'partner',
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
  if (kind === 'partner') return gendered('girlfriend', 'boyfriend', 'partner');
  if (kind === 'sibling') return gendered('sister', 'brother', 'sibling');
  if (kind === 'parent') return gendered('mother', 'father', 'parent');
  if (kind === 'child') return gendered('daughter', 'son', 'kid');
  if (kind === 'uncle') return gendered('aunt', 'uncle', 'aunt or uncle');
  if (kind === 'nephew') return gendered('niece', 'nephew', 'niece or nephew');
  if (kind === 'crew') return person.gang ? 'crewmate' : 'associate';
  return KIN_LABEL[kind];
}

/** Fills `{name}`, `{given}`, `{he}`, `{him}`, `{his}` and whatever else is given; `{He}`, `{KinHe}`… capitalize what `{he}`, `{kinHe}`… hold. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (vars[key] !== undefined) return vars[key];
    const lower = key.charAt(0).toLowerCase() + key.slice(1);
    if (key !== lower && vars[lower] !== undefined) return capitalize(vars[lower]);
    return match;
  });
}

/** Filled in, tidied, and each sentence starting with a capital. */
export function finish(template: string, vars: Record<string, string>): string {
  // A name that ends in its own mark ("Got Escargot?") takes no full stop after it.
  const text = fill(template, vars).replace(/\s+/g, ' ').trim().replace(/([?!])\.(?!\.)/g, '$1');
  return text.replace(/(^|[.!?…]["”]?\s+)(\p{Ll})/gu, (_, before: string, letter: string) => before + letter.toUpperCase());
}

/** Family, and the one they're seeing: the people a line about their people names. */
export const FAMILY: TieKind[] = ['spouse', 'partner', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin'];

/** The variable a district's own lines need: `inWatson`, `inCityCenter`… */
export function districtFlag(id: string): string {
  return `in${id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`;
}

/**
 * Everything a template can mention about a person, and the one relative (`kin`) a line about
 * family would name (`kinDead` when they're gone): who they are, where they work and for whom
 * and how long, where they live and in what, where they go of an evening, their street name,
 * how old they are (`ageYoung`, `ageOld`, `ageElder`), what they want out of life
 * (`dream`, `dream<Kind>`), and which district is theirs (`inWatson`…).
 */
export function varsFor(person: Person, world: World, population: Population, content: PeopleContent, dishes: Array<{ id: string; name: string }>, kin?: Tie): Record<string, string> {
  const gang = gangOf(person, content);
  const district = world.districts[person.district];
  const work = person.job.building ? world.buildings.find((b) => b.id === person.job.building) : undefined;
  const hate = person.hates ? content.gangs[person.hates] : undefined;
  const kinPerson = kin ? population.people.find((p) => p.id === kin.to) : undefined;
  const kinWork = kinPerson?.job.building ? world.buildings.find((b) => b.id === kinPerson.job.building) : undefined;
  const kinPronouns = kinPerson ? pronounsOf(kinPerson) : null;
  const home = person.home ? world.buildings.find((b) => b.id === person.home) : undefined;
  const dish = dishes.find((d) => d.id === person.likes.dish)?.name ?? 'something hot';
  const drink = dishes.find((d) => d.id === person.likes.drink)?.name ?? 'something cold';
  const hangout = person.likes.hangout;
  const evening = hangout ? (hangout.kind === 'building' ? world.buildings.find((b) => b.id === hangout.id)?.name : world.locations[hangout.id]?.name) : undefined;
  const boss = work?.business ? bossOf(work, population) : null;
  const dream = person.gang || person.age >= 18 ? dreamOf(person, world, content) : null;
  const years = Math.max(1, Math.min(person.age - 17, createYears(person.id)));
  const heart = heartOf(person, world, content, population);
  return {
    ...heartVars(heart),
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
    dish,
    drink,
    aDish: withArticle(dish),
    aDrink: withArticle(drink),
    kinName: kinPerson?.given ?? '',
    kinWord: kin && kinPerson ? kinWord(person, kin.kind, kinPerson) : '',
    kinWork: kinWork?.name ?? (kinPerson ? kinPerson.job.role : ''),
    kinDead: kinPerson?.diedOn !== undefined ? 'yes' : '',
    handle: handleOf(person, world, content) ?? '',
    ageYoung: person.age <= 25 ? 'yes' : '',
    ageOld: person.age >= 45 ? 'yes' : '',
    ageElder: person.age >= 56 ? 'yes' : '',
    homeMega: home?.kind === 'megabuilding' ? 'yes' : '',
    homeShack: home?.kind === 'shack' ? 'yes' : '',
    homeFloors: home && home.floors > 1 ? String(home.floors) : '',
    hangout: evening ?? '',
    isBoss: boss?.id === person.id ? 'yes' : '',
    bossName: boss && boss.id !== person.id ? boss.given : '',
    workYears: work ? String(years) : '',
    jobless: !person.gang && !person.job.building && /between jobs/i.test(person.job.role) ? 'yes' : '',
    dream: dream ?? '',
    ...(dream ? { [`dream${dream.charAt(0).toUpperCase()}${dream.slice(1)}`]: 'yes' } : {}),
    [districtFlag(person.district)]: 'yes',
  };
}

/** Whom a heart is drawn to, in words: "women", "men and anyone who goes by they", "anyone"; nothing for no one. */
export function drawnWord(drawn: readonly Pronouns[]): string {
  const has = (p: Pronouns) => drawn.includes(p);
  if (has('she') && has('he') && has('they')) return 'anyone';
  const sides = [has('she') ? 'women' : '', has('he') ? 'men' : ''].filter(Boolean).join(' and ');
  if (has('they')) return sides ? `${sides}, and anyone who goes by they` : 'anyone who goes by they';
  return sides;
}

/** The way in that wins someone over, as they'd say it: someone "easy to talk to", "who makes me laugh". */
export const WANT_WORDS: Record<Want, string> = {
  chat: 'easy to talk to',
  compliment: 'with a way with words',
  joke: 'who makes me laugh',
  gossip: 'who knows what goes on in this city',
  care: 'who actually listens',
};

/** A heart as line variables: `typeWho` (and `TypeWho`, to start a sentence; or `typeNone`), `typeWants`, `typeStyle` (a style's name), and `wants<Way>`. */
function heartVars(heart: Heart): Record<string, string> {
  const who = drawnWord(heart.drawnTo);
  return {
    typeWho: who,
    TypeWho: capitalize(who),
    typeNone: who ? '' : 'yes',
    typeWants: WANT_WORDS[heart.wants],
    typeStyle: heart.style ? capitalize(heart.style) : '',
    [`wants${capitalize(heart.wants)}`]: 'yes',
  };
}

/** How many years someone has been at the work they do, drawn for them (up to fifteen). */
function createYears(id: string): number {
  let h = 0;
  for (const c of `${id}:years`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1 + (h % 15);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "a Nicola", "an Oolong Tea". */
function withArticle(name: string): string {
  return `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
}
