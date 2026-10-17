import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { LINES } from '../src/data/dialogue';
import { FOOD } from '../src/data/food';
import { PEOPLE } from '../src/data/people';
import { SOCIETY } from '../src/data/society';
import { CHARISMA } from '../src/data/skills';
import {
  answer,
  compose,
  deflect,
  eloquenceOf,
  FAMILY,
  finish,
  fits,
  historyOf,
  line,
  moodOf,
  openness,
  openTopics,
  reactionTo,
  repeat,
  replyTo,
  smallTalk,
  varsFor,
  voiceOf,
  type Eloquence,
  type History,
  type Mood,
  type Question,
  type Speaker,
  type Topic,
  type Voice,
} from '../src/engine/dialogue';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, tiesOf, type Person, type Population } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { skillEdge } from '../src/engine/skills';
import type { Asked, Stance, Standing } from '../src/engine/society';
import type { World } from '../src/engine/types';

const T0 = Date.UTC(2077, 9, 12, 20, 0);
const HOUR = 3_600_000;

function person(id: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    name: `${id} Test`,
    given: id,
    family: 'Test',
    pronouns: 'she',
    age: 30,
    district: 'heywood',
    home: null,
    job: { role: 'cook', building: 'b-grill' },
    gang: null,
    traits: { warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.5 },
    likes: { dish: 'taco', drink: 'nicola', hangout: null },
    hates: null,
    eddies: 40,
    chip: 0,
    bio: '',
    ...extra,
  };
}

/** Enough of a city for lines to mention: a grill, a tower, a district. */
const world = {
  seed: 'dialogue',
  buildings: [
    { id: 'b-grill', district: 'heywood', kind: 'shops', kindLabel: 'Grill', category: 'food', business: 'grill', name: 'El Pinche Grill', floors: 1, block: 'A1', x: 0, y: 0, w: 2, h: 2 },
    { id: 'b-tower', district: 'heywood', kind: 'tower', kindLabel: 'Tower', category: 'corporate', business: null, name: 'Petrochem Annex', floors: 20, block: 'A2', x: 4, y: 0, w: 4, h: 4 },
    { id: 'b-home', district: 'heywood', kind: 'megabuilding', kindLabel: 'Megabuilding', category: 'residential', business: null, name: 'Megabuilding H8', floors: 40, block: 'A3', x: 8, y: 0, w: 4, h: 4 },
  ],
  districts: { heywood: { id: 'heywood', name: 'Heywood' } },
  locations: {},
} as unknown as World;
const empty: Population = { people: [], ties: [] };

function speakerOf(p: Person, over: Partial<Speaker> = {}, vars: Record<string, string> = {}): Speaker {
  const voice = over.voice ?? voiceOf(p, world);
  return {
    person: p,
    voice,
    mood: 'easy',
    stance: 'neutral',
    history: 'first',
    eloquence: 'blunt',
    ...over,
    vars: { ...LINES.lexicon[voice], ...varsFor(p, world, empty, PEOPLE, FOOD.dishes), here: 'El Pinche Grill', ...vars },
  };
}

const standing = (extra: Partial<Standing> = {}): Standing => ({ met: false, rapport: 0, grudge: 0, at: T0, talks: 0, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {}, ...extra });

describe('dialogue', () => {
  it('never says the same thing twice running while there is anything else to say', () => {
    const plain = speakerOf(person('Ana'));
    const pool = ['One.', 'Two.', 'Three.'];
    // Said just now, whole or as part of something longer: it gives way to what's left.
    for (let i = 0; i < 40; i++) expect(line(pool, { ...plain, recent: ['"One."', 'Two. And then some.'] }, createRng(`fresh-${i}`))).toBe('Three.');
    // The same line with another number in it is still the same line.
    for (let i = 0; i < 40; i++) expect(line(['Hit for {dmg}.', 'Struck for {dmg}.'], { ...plain, vars: { ...plain.vars, dmg: '18' }, recent: ['Hit for 12.'] }, createRng(`num-${i}`))).toBe('Struck for 18.');
    // With nothing else that fits, it's said again rather than nothing at all.
    expect(line(['Only.'], { ...plain, recent: ['Only.'] }, createRng('only'))).toBe('Only.');
    // Without a record, any of them.
    const said = new Set(Array.from({ length: 40 }, (_, i) => line(pool, plain, createRng(`any-${i}`))));
    expect(said.size).toBe(3);
  });

  it('picks fragments by who is talking, what they are doing and how they feel', () => {
    const rosa = speakerOf(person('rosa', { traits: { warmth: 0.9, temper: 0.2, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.7 } }), { mood: 'busy', stance: 'warm', history: 'regular' });
    expect(fits(undefined, rosa)).toBe(true);
    expect(fits({ stance: ['warm', 'friend'] }, rosa)).toBe(true);
    expect(fits({ stance: ['cold'] }, rosa)).toBe(false);
    expect(fits({ voice: ['street'] }, rosa)).toBe(true);
    expect(fits({ mood: ['busy'] }, rosa)).toBe(true);
    expect(fits({ mood: ['drinking'] }, rosa)).toBe(false);
    expect(fits({ history: ['regular', 'long'] }, rosa)).toBe(true);
    expect(fits({ eloquence: ['smooth'] }, rosa)).toBe(false);
    expect(fits({ traits: { warmth: 'high', temper: 'low' } }, rosa)).toBe(true);
    expect(fits({ traits: { chatty: 'low' } }, rosa)).toBe(false);
    expect(fits({ traits: { loyalty: 'high' } }, rosa)).toBe(false);
    expect(fits({ gang: false }, rosa)).toBe(true);
    expect(fits({ gang: true }, rosa)).toBe(false);
    expect(fits({ needs: ['work'] }, rosa)).toBe(true);
    expect(fits({ needs: ['gang'] }, rosa)).toBe(false);
    expect(fits({ lacks: ['gang'] }, rosa)).toBe(true);
    expect(fits({ lacks: ['work'] }, rosa)).toBe(false);
  });

  it('puts slang in by voice and starts every sentence with a capital', () => {
    expect(finish('{hey}. {choom}, that was {preem}, right? {KinHe} said so. costs {eddies}.', { ...LINES.lexicon.elder, kinHe: 'she' })).toBe('Well, hey. Choomba, that was nova, right? She said so. Costs eds.');
    expect(finish('{hey}, {choom}.  Two   spaces. {nah}.', LINES.lexicon.corpo)).toBe('Hello, friend. Two spaces. No.');
    expect(finish('{Role} at {work}. {He} is {age}.', { role: 'cook', Role: 'Cook', work: 'the grill', he: 'he', age: '30' })).toBe('Cook at the grill. He is 30.');
    // Something nobody filled stays as it is, so a test can see it.
    expect(finish('{nothing} here', {})).toBe('{nothing} here');
  });

  it('adds an opener and an aside for the talkative, and keeps it short for the terse', () => {
    const chatty = speakerOf(person('mei', { traits: { warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.95 } }));
    const terse = speakerOf(person('jun', { traits: { warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.05 } }));
    const lines = { ...LINES, openers: ['Hang on.'], tails: ['Ask anyone.'] };
    const extras = (speaker: Speaker) => Array.from({ length: 60 }, (_, i) => compose(['Core.'], speaker, lines, createRng(`c${i}`))).filter((said) => said !== 'Core.').length;
    expect(extras(chatty)).toBeGreaterThan(40);
    expect(extras(terse)).toBeLessThan(20);
    expect(compose(['Core.'], chatty, lines, createRng('x'))).toBe(compose(['Core.'], chatty, lines, createRng('x')));
    expect(compose(['Core.'], chatty, lines, createRng('x'), { opener: false, tail: false })).toBe('Core.');
    expect(compose([{ text: 'Never.', when: { stance: ['cold'] } }], chatty, lines, createRng('x'))).toBe('');
  });

  it('tells a ganger from a corpo, a nomad, an elder, a kid and the street', () => {
    expect(voiceOf(person('v', { gang: 'valentinos' }), world)).toBe('gang');
    expect(voiceOf(person('a', { job: { role: 'junior analyst', building: 'b-tower' } }), world)).toBe('corpo');
    expect(voiceOf(person('c', { job: { role: 'consultant', building: null } }), world)).toBe('corpo');
    expect(voiceOf(person('n', { district: 'badlands', job: { role: 'scrap hauler', building: null } }), world)).toBe('nomad');
    expect(voiceOf(person('e', { age: 61 }), world)).toBe('elder');
    expect(voiceOf(person('k', { age: 19 }), world)).toBe('young');
    expect(voiceOf(person('s'), world)).toBe('street');
    expect(moodOf('at home, asleep')).toBe('asleep');
    expect(moodOf('at home')).toBe('home');
    expect(moodOf('at the stove')).toBe('busy');
    expect(moodOf('working the counter')).toBe('busy');
    expect(moodOf('on watch')).toBe('busy');
    expect(moodOf('holding court')).toBe('court');
    expect(moodOf('nursing a Broseph')).toBe('drinking');
    expect(moodOf('eating Taco')).toBe('eating');
    expect(moodOf('killing time')).toBe('easy');
    expect(historyOf(standing(), 1, T0)).toBe('first');
    expect(historyOf(standing({ met: true, talks: 1, lastTalkAt: T0 - HOUR }), 1, T0)).toBe('recent');
    expect(historyOf(standing({ met: true, talks: 5, lastTalkAt: T0 - HOUR }), 1, T0)).toBe('regular');
    expect(historyOf(standing({ met: true, talks: 5, lastTalkAt: T0 - 4 * 24 * HOUR }), 1, T0)).toBe('long');
    // Sped up sixty times, three days is a little over an hour.
    expect(historyOf(standing({ met: true, talks: 5, lastTalkAt: T0 - 2 * HOUR }), 60, T0)).toBe('long');
    expect(eloquenceOf(1)).toBe('blunt');
    expect(eloquenceOf(2)).toBe('easy');
    expect(eloquenceOf(3)).toBe('easy');
    expect(eloquenceOf(4)).toBe('smooth');
  });

  it('opens up with charisma and warmth, and less the more a question asks', () => {
    const rules = SOCIETY.openness;
    const plain = person('p').traits;
    // Charisma by its level: past an ordinary person's, or short of it.
    const at = (level: number) => skillEdge(CHARISMA, level);
    // The player starts with no way with words at all: a stranger gives a name now and then, and next to nothing else.
    expect(openness('job', 'neutral', at(1), plain, rules)).toBeLessThan(openness('job', 'neutral', at(4), plain, rules) - 1);
    expect(replyTo(openness('job', 'neutral', at(1), plain, rules), rules, createRng('a'))).toBe('refuse');
    // An ordinary way with words: name yes, work a coin toss, age mostly a non-answer (now and then an answer), home and enemies a no.
    expect(replyTo(openness('name', 'neutral', at(4), plain, rules), rules, createRng('a'))).toBe('answer');
    expect(openness('job', 'neutral', at(4), plain, rules)).toBe(0);
    expect(openness('age', 'neutral', at(4), plain, rules)).toBe(-0.6);
    const odds = (asked: Asked) => {
      const replies = Array.from({ length: 200 }, (_, i) => replyTo(openness(asked, 'neutral', at(4), plain, rules), rules, createRng(`o${i}`)));
      return { answer: replies.filter((r) => r === 'answer').length / 200, refuse: replies.filter((r) => r === 'refuse').length / 200 };
    };
    expect(odds('age').refuse).toBe(0);
    expect(odds('age').answer).toBeGreaterThan(0.05);
    expect(odds('age').answer).toBeLessThan(0.35);
    expect(odds('home').refuse).toBe(1);
    expect(odds('hates').refuse).toBe(1);
    // A friend tells everything; so does a stranger to someone with charisma enough; the hostile nothing.
    for (const asked of ['name', 'job', 'age', 'home', 'likes', 'hates', 'kin'] as Asked[]) {
      expect(replyTo(openness(asked, 'friend', at(4), plain, rules), rules, createRng('a')), asked).toBe('answer');
      expect(replyTo(openness(asked, 'neutral', at(9), plain, rules), rules, createRng('a')), asked).toBe('answer');
      expect(replyTo(openness(asked, 'hostile', at(9), plain, rules), rules, createRng('a')), asked).toBe('refuse');
      expect(openness(asked, 'neutral', at(6), plain, rules)).toBeGreaterThan(openness(asked, 'neutral', at(4), plain, rules));
      expect(openness(asked, 'neutral', at(4), plain, rules)).toBeGreaterThan(openness(asked, 'neutral', at(1), plain, rules));
      expect(openness(asked, 'warm', at(4), plain, rules)).toBeGreaterThan(openness(asked, 'neutral', at(4), plain, rules));
    }
    // Their nature: the talkative and the warm say more; the loyal say less of their people; the brave more of their enemies; the greedy chop a chip sooner.
    const chatty = { ...plain, chatty: 0.9, warmth: 0.9 };
    expect(openness('age', 'neutral', at(4), chatty, rules)).toBeGreaterThan(openness('age', 'neutral', at(4), plain, rules));
    expect(openness('kin', 'neutral', at(4), { ...plain, loyalty: 0.9 }, rules)).toBeLessThan(openness('kin', 'neutral', at(4), plain, rules));
    expect(openness('hates', 'neutral', at(4), { ...plain, courage: 0.9 }, rules)).toBeGreaterThan(openness('hates', 'neutral', at(4), plain, rules));
    expect(openness('chop', 'neutral', at(4), { ...plain, greed: 0.9 }, rules)).toBeGreaterThan(openness('chop', 'neutral', at(4), plain, rules));
    // A mask on the player costs with everyone: a stranger in one gets a name out of people now and then and their work never; a friend still tells most things.
    expect(openness('name', 'neutral', at(4), plain, rules, true)).toBeCloseTo(openness('name', 'neutral', at(4), plain, rules) - rules.mask, 5);
    expect(replyTo(openness('job', 'neutral', at(4), plain, rules, true), rules, createRng('a'))).toBe('refuse');
    expect(replyTo(openness('job', 'friend', at(4), plain, rules, true), rules, createRng('a'))).toBe('answer');
    expect(replyTo(openness('home', 'friend', at(4), plain, rules, true), rules, createRng('a'))).not.toBe('answer');
    const inMask = speakerOf(person('m'), {}, { mask: 'gas mask' });
    expect(new Set(Array.from({ length: 40 }, (_, i) => openTopics(inMask, 0, rules, createRng(`m${i}`), true)).flat())).not.toContain('job');
    // A stranger chops a hot chip a little less readily than they talk about their work; a friend without a second thought.
    expect(openness('chop', 'neutral', 0, plain, rules)).toBeLessThan(openness('job', 'neutral', 0, plain, rules));
    expect(openness('chop', 'neutral', 0, plain, rules)).toBeGreaterThan(rules.deflectAt);
    expect(replyTo(openness('chop', 'friend', 0, plain, rules), rules, createRng('a'))).toBe('answer');
    // In between, the odds rise with the score; at the edges they're certain.
    const answers = (score: number) => Array.from({ length: 200 }, (_, i) => replyTo(score, rules, createRng(`r${i}`))).filter((r) => r === 'answer').length;
    expect(answers(-1)).toBe(0);
    expect(answers(0)).toBeGreaterThan(70);
    expect(answers(0)).toBeLessThan(130);
    expect(answers(1)).toBe(200);
    // What a stranger brings up on their own: the neighborhood and their lot, never their people or their enemies.
    const stranger = speakerOf(person('s', { hates: 'valentinos' }));
    const topics = new Set(Array.from({ length: 40 }, (_, i) => openTopics(stranger, 0, rules, createRng(`t${i}`), true)).flat());
    expect(topics).toContain('district');
    expect(topics).toContain('life');
    expect(topics).toContain('here');
    expect(topics).not.toContain('hates');
    expect(topics).not.toContain('kin');
    // A friend, with family to mention: everything, and their people only once that's earned.
    const friend = speakerOf(person('f', { hates: 'valentinos' }), { stance: 'friend' }, { kinName: 'Ana', kinWord: 'sister', kinWork: 'the grill' });
    expect(openTopics(friend, 0, rules, createRng('t'), true)).toEqual(['district', 'life', 'here', 'job', 'likes', 'hates', 'kin', 'dream', 'views']);
    expect(openTopics(friend, 0, rules, createRng('t'), false)).not.toContain('kin');
    const chat = smallTalk(friend, ['kin'], LINES, createRng('k'));
    expect(chat.topic).toBe('kin');
    expect(chat.said).toContain('Ana');
    const nothing = smallTalk(friend, [], LINES, createRng('k'));
    expect(nothing.topic).toBeNull();
    expect(LINES.brushOff.map((l) => (typeof l === 'string' ? l : l.text))).toContain(nothing.said);
  });

  it('opens up or closes by the moment: a drink, a shift, one question too many, the gang they hate in the room, grief, the small hours, a drunk asking', () => {
    const rules = SOCIETY.openness;
    const plain = person('p').traits;
    const at = (asked: Asked, moment = {}, stance: Stance = 'neutral') => openness(asked, stance, 0, plain, rules, false, moment);
    expect(at('age', { mood: 'drinking' })).toBeGreaterThan(at('age'));
    expect(at('age', { mood: 'busy' })).toBeLessThan(at('age'));
    // Busy at work, the work itself is still fair game.
    expect(at('job', { mood: 'busy' })).toBe(at('job'));
    expect(at('name', { grilled: 2 })).toBeCloseTo(at('name') - 2 * rules.moment.grilled, 5);
    expect(at('hates', { enemyHere: true })).toBeLessThan(at('hates'));
    expect(at('age', { enemyHere: true })).toBe(at('age'));
    // The braver they are, the less the enemy in the room matters.
    const brave = { ...plain, courage: 0.9 };
    expect(openness('hates', 'neutral', 1, brave, rules) - openness('hates', 'neutral', 1, brave, rules, false, { enemyHere: true })).toBeLessThan(at('hates') - at('hates', { enemyHere: true }));
    expect(at('job', { grieving: true })).toBeLessThan(at('job'));
    expect(at('home', { late: true })).toBeLessThan(at('home'));
    expect(at('job', { late: true })).toBe(at('job'));
    expect(at('job', { drunk: true })).toBeLessThan(at('job'));
    expect(at('job', { drunk: true }, 'friend')).toBe(at('job', {}, 'friend'));
  });

  it('takes a compliment, a joke, gossip and a kind word by who they are, and says why', () => {
    const traits = (t: Partial<Person['traits']>) => ({ warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.5, ...t });
    const warmOne = speakerOf(person('w', { traits: traits({ warmth: 0.9 }) }), { eloquence: 'easy' });
    const hardOne = speakerOf(person('h', { traits: traits({ warmth: 0.1 }) }), { eloquence: 'easy' });
    const { approach } = SOCIETY.reactions;
    expect(reactionTo(approach.compliment, warmOne)).toEqual({ score: 2, why: 'Likes a kind word' });
    expect(reactionTo(approach.compliment, hardOne)).toEqual({ score: -2, why: 'Not one for flattery' });
    // The player's way with words counts: smooth lands better, blunt worse.
    expect(reactionTo(approach.compliment, { ...warmOne, eloquence: 'smooth' }).score).toBe(3);
    expect(reactionTo(approach.compliment, { ...warmOne, eloquence: 'blunt' }).score).toBe(1);
    // A temper takes no jokes, grief none at all; the chatty love gossip; the grieving are glad to be asked how they are.
    const hothead = speakerOf(person('t', { traits: traits({ temper: 0.9 }) }), { eloquence: 'easy' });
    expect(reactionTo(approach.joke, hothead)).toEqual({ score: -2, why: 'Not in the mood for jokes' });
    const mourner = speakerOf(person('m'), { eloquence: 'easy' }, { grief: 'Ana', griefWord: 'sister' });
    expect(reactionTo(approach.joke, mourner)).toEqual({ score: -3, why: 'Grieving her sister' });
    expect(reactionTo(approach.care, mourner)).toEqual({ score: 3, why: 'Needed someone to ask, after losing her sister' });
    expect(reactionTo(approach.gossip, speakerOf(person('c', { traits: traits({ chatty: 0.9 }) }), { eloquence: 'easy' }))).toEqual({ score: 2, why: 'Loves gossip' });
    // Nothing that fits, nothing to say.
    expect(reactionTo(approach.chat, speakerOf(person('n'), { eloquence: 'easy' }))).toEqual({ score: 0, why: '' });
    // Questions too: a stranger is put off being asked where they live; anyone likes talking food.
    expect(reactionTo(SOCIETY.reactions.asked.home, speakerOf(person('s'))).score).toBeLessThan(0);
    expect(reactionTo(SOCIETY.reactions.asked.likes, speakerOf(person('s'))).score).toBeGreaterThan(0);
  });

  it('puts no full stop after a name that ends in its own mark', () => {
    expect(finish('Nothing beats {dish}.', { dish: 'Got Escargot?' })).toBe('Nothing beats Got Escargot?');
    expect(finish('Wait... What?', {})).toBe('Wait... What?');
  });

  it('answers, deflects, repeats and refuses in character', () => {
    const corpo = speakerOf(person('helena', { age: 44, job: { role: 'middle manager', building: 'b-tower' }, home: 'b-home' }), { voice: 'corpo', stance: 'neutral' });
    expect(answer(corpo, 'job', LINES, createRng('j'))).toContain('Petrochem Annex');
    expect(answer(corpo, 'home', LINES, createRng('h'))).toContain('Megabuilding H8');
    expect(answer(corpo, 'age', LINES, createRng('a'))).toContain('44');
    expect(repeat(corpo, 'age', LINES, createRng('a'))).toMatch(/44/);
    expect(repeat(corpo, 'age', LINES, createRng('a'))).toMatch(/^(Told you already|Weren't you listening|Again\?|You've got a short memory)/);
    const drifter = speakerOf(person('dez', { job: { role: 'courier', building: null } }));
    expect(answer(drifter, 'home', LINES, createRng('h'))).not.toContain('{');
    expect(answer(drifter, 'job', LINES, createRng('j'))).toMatch(/courier/i);
    expect(answer(drifter, 'hates', LINES, createRng('x'))).toMatch(/Nobody|head down|expensive/);
    const ganger = speakerOf(person('mateo', { gang: 'valentinos', job: { role: 'soldado', building: null }, hates: 'sixth_street' }), { voice: 'gang' });
    expect(answer(ganger, 'job', LINES, createRng('j'))).toContain('Valentinos');
    expect(answer(ganger, 'hates', LINES, createRng('h'))).toMatch(/6th Street/);
    expect(deflect(drifter, 'age', LINES, createRng('d'))).toMatch(/Old enough|Older than I look|writing a book/);
    expect(deflect(drifter, 'district', LINES, createRng('d'))).toMatch(/Pass|Next question|well enough|easier|Next\.|other time|Long story|next week/);
    expect(line(LINES.refuse, speakerOf(person('x'), { voice: 'corpo', stance: 'cold' }), createRng('r'))).toMatch(/\S/);
  });

  it('keeps every piece of news to its own kind and side, and every memory to its own kind', () => {
    const kinds = ['Shakedown', 'Robbery', 'Fight', 'Friends', 'Fallout', 'Makeup', 'Romance', 'Wedding', 'Breakup', 'Hired', 'LaidOff', 'Death', 'Joined', 'Mugging', 'Collected', 'Evicted', 'Closed', 'Reopened'];
    const roles = ['Mine', 'Kin', 'Ours', 'Heard'];
    const needs = (l: (typeof LINES.memory)[number]) => (typeof l === 'string' ? [] : (l.when?.needs ?? []));
    const text = (l: (typeof LINES.memory)[number]) => (typeof l === 'string' ? l : l.text);
    for (const l of LINES.topics.news) {
      expect(needs(l).filter((n) => kinds.some((k) => n === `news${k}`)), text(l)).toHaveLength(1);
      expect(needs(l).filter((n) => roles.some((r) => n === `news${r}`)), text(l)).toHaveLength(1);
    }
    const memories = ['Wronged', 'Heard', 'Saw', 'Settled', 'Gift', 'GoodWord', 'Hired', 'Promoted', 'Quit', 'Notice', 'Fired', 'Chopped', 'Asked', 'Date', 'Dumped', 'Cheated', 'Chat', 'Rebuffed', 'Covered', 'Backed'];
    for (const l of LINES.memory) expect(needs(l).filter((n) => memories.some((k) => n === `mem${k}`)), text(l)).toHaveLength(1);
  });

  it('never leaves a hole in a line, whoever is talking, across whole cities', () => {
    // An empty var mid-sentence leaves a space before the punctuation ("at .").
    const holes = /[{}]|  |^\p{Ll}|^\s|\s$|\s(?:[,;:!?]|\.(?!\.))/u;
    // Problems are collected and checked once: an assertion a line is slow across cities of thousands.
    const problems: string[] = [];
    const check = (said: string, about: string) => {
      if (!/\S/.test(said) || holes.test(said)) problems.push(`${about}: ${JSON.stringify(said)}`);
    };
    const voices: Voice[] = ['street', 'gang', 'corpo', 'nomad', 'elder', 'young'];
    const moods: Mood[] = ['busy', 'easy', 'eating', 'drinking', 'court', 'home', 'asleep'];
    const histories: History[] = ['first', 'recent', 'regular', 'long'];
    const stances: Stance[] = ['cold', 'wary', 'neutral', 'warm', 'friend'];
    const eloquences: Eloquence[] = ['blunt', 'easy', 'smooth'];
    const questions = Object.keys(LINES.questions) as Question[];
    const topics = Object.keys(LINES.topics) as Topic[];
    // Two cities hold about as many people as four did before the city grew: thousands of speakers.
    const seeds = Array.from({ length: 2 }, (_, i) => createRng(`dialogue-${i}`).next().toString(16).slice(2, 10));
    let lines = 0;
    for (const seed of seeds) {
      const city = generateWorld(seed, CITY);
      const population = generatePeople(city, PEOPLE, FOOD.dishes);
      for (const p of population.people) {
        const rng = createRng(`${seed}:${p.id}`);
        const kin = tiesOf(population, p.id).find((t) => FAMILY.includes(t.kind));
        const voice = voices[rng.int(0, voices.length - 1)] as Voice;
        const vars = {
          ...LINES.lexicon[voice],
          ...(voice === 'gang' && p.gang ? (LINES.gangLexicon[p.gang] ?? {}) : {}),
          ...varsFor(p, city, population, PEOPLE, FOOD.dishes, kin),
          here: rng.chance(0.8) ? 'The Afterlife' : '',
          late: rng.chance(0.3) ? 'this late' : '',
          early: rng.chance(0.3) ? 'yes' : '',
          atWork: rng.chance(0.3) ? 'yes' : '',
          gangGood: p.gang && rng.chance(0.3) ? 'yes' : '',
          districtBad: rng.chance(0.3) ? 'yes' : '',
          other: 'Ana',
          otherHe: 'she',
          otherHim: 'her',
          word: rng.chance(0.5) ? 'cousin' : '',
          item: 'Taco',
          take: '12',
          haul: '12 €$ and a credchip with 80 €$ on it',
          ...rng.pick([{ weapon: '', gun: '', blade: '', blunt: '' }, { weapon: 'Lexington', gun: 'yes', blade: '', blunt: '' }, { weapon: 'katana', gun: '', blade: 'yes', blunt: '' }, { weapon: 'bat', gun: '', blade: '', blunt: 'yes' }]),
          balance: '120',
          cut: '30',
          left: '90',
          mask: rng.chance(0.3) ? 'gas mask' : '',
          title: 'dish pit',
          pay: '24',
          broke: rng.chance(0.2) ? 'yes' : '',
          flush: rng.chance(0.2) ? 'yes' : '',
          slow: rng.chance(0.2) ? 'yes' : '',
          brisk: rng.chance(0.2) ? 'yes' : '',
          // Hard times: owing a gang, put out of a home, a workplace gone under, things walking out of the shop.
          ...(rng.chance(0.2) ? { inDebt: 'yes', debtGang: 'Tyger Claws', debtLate: rng.chance(0.5) ? 'yes' : '' } : {}),
          ...(rng.chance(0.2) ? { evicted: 'yes', evictedFrom: rng.chance(0.7) ? 'Kabuki Block 4' : '', evictedBy: rng.chance(0.5) ? 'Raul' : '', rough: rng.chance(0.3) ? 'yes' : '', squat: rng.chance(0.3) ? 'yes' : '' } : {}),
          ...(rng.chance(0.15) ? { closedPlace: 'Noodle Hut', closedRan: rng.chance(0.3) ? 'yes' : '' } : {}),
          lifted: rng.chance(0.15) ? 'yes' : '',
          kinDead: kin && rng.chance(0.3) ? 'yes' : '',
          again: rng.chance(0.3) ? 'yes' : '',
          // The moment: the player drunk, grief, the gang they hate here, questions piling up, a question they're touchy about or glad of.
          youDrunk: rng.chance(0.2) ? 'yes' : '',
          ...(rng.chance(0.15) ? { grief: 'Ana', griefWord: 'sister' } : {}),
          enemyHere: p.hates && rng.chance(0.3) ? 'Valentinos' : '',
          grilled: rng.chance(0.2) ? 'yes' : '',
          ...(rng.chance(0.3) ? (rng.chance(0.5) ? { touchy: 'yes' } : { keen: 'yes' }) : {}),
          // The heart, as it stands with the player: drawn to them, spoken for, seeing them, sweet on them, their look.
          drawn: rng.chance(0.6) ? 'yes' : '',
          ...(rng.chance(0.3) ? { taken: 'Rosa', takenWord: rng.pick(['wife', 'husband', 'girlfriend', 'partner']) } : {}),
          ...(rng.chance(0.2) ? { withYou: 'yes', together: rng.chance(0.5) ? 'yes' : '' } : {}),
          sweet: rng.chance(0.3) ? 'yes' : '',
          yourType: rng.chance(0.2) ? 'yes' : '',
        };
        const speaker: Speaker = {
          person: p,
          voice,
          mood: moods[rng.int(0, moods.length - 1)] as Mood,
          stance: stances[rng.int(0, stances.length - 1)] as Stance,
          history: histories[rng.int(0, histories.length - 1)] as History,
          eloquence: eloquences[rng.int(0, eloquences.length - 1)] as Eloquence,
          vars,
        };
        const about = `${seed} ${p.name} (${speaker.voice}, ${speaker.mood}, ${speaker.stance}, ${speaker.history})`;
        check(line(LINES.greeting, speaker, rng), `${about} greeting`);
        for (const topic of topics) {
          const said = compose(LINES.topics[topic], speaker, LINES, rng);
          if (topic === 'rumor' && !vars.gangGood && !vars.districtBad) continue;
          if (topic === 'here' && !vars.here) continue;
          if (topic === 'kin' && !kin) continue;
          if (topic === 'hates' && !p.hates) continue;
          // The news is checked on its own below, from every side it can be told from.
          if (topic === 'news') continue;
          check(said, `${about} topic ${topic}`);
        }
        for (const q of questions) {
          check(answer(speaker, q, LINES, rng), `${about} answer ${q}`);
          check(repeat(speaker, q, LINES, rng), `${about} repeat ${q}`);
          check(deflect(speaker, q, LINES, rng), `${about} deflect ${q}`);
          for (const eloquence of eloquences) check(line(LINES.questions[q].lines, { ...speaker, eloquence }, rng), `${about} question ${q} ${eloquence}`);
          lines += 4;
        }
        // A counter that won't serve the player is always named.
        check(line(LINES.barred, { ...speaker, vars: { ...vars, work: 'El Pinche Grill' } }, rng), `${about} barred`);
        for (const pool of [LINES.brushOff, LINES.grudge, LINES.hostile, LINES.asleep, LINES.talkedOut, LINES.refuse, LINES.pressed, LINES.gift.thanks, LINES.gift.favorite, LINES.gift.refuse, LINES.insult.reply, LINES.insult.shove, LINES.rob.done, LINES.rob.nothing, LINES.rob.fought, LINES.rob.cold, LINES.rob.coldNothing, LINES.chop.done, LINES.chop.refuse]) {
          check(line(pool, speaker, rng), `${about} pool`);
        }
        // Every way into a chat, from the player in every way with words, and every way it can land.
        for (const how of Object.values(LINES.approaches)) {
          for (const eloquence of eloquences) check(line(how.you, { ...speaker, eloquence }, rng), `${about} approach ${how.label} you ${eloquence}`);
          for (const pool of [how.liked, how.flat, how.disliked]) check(compose(pool, speaker, LINES, rng, { opener: false }), `${about} approach ${how.label}`);
          lines += 6;
        }
        // Romance: every answer to being asked out, a date (their favorite or not), making it official, being dumped, ending it, jealousy.
        const romance = LINES.romance;
        for (const pool of [romance.ask.yes, romance.ask.notDrawn, romance.ask.taken, romance.ask.notYet, romance.official.yes, romance.official.notYet, romance.dumped]) {
          check(compose(pool, { ...speaker, vars: { ...vars, taken: vars.taken || 'Rosa' } }, LINES, rng, { opener: false }), `${about} romance pool`);
        }
        check(line(romance.ask.masked, { ...speaker, vars: { ...vars, mask: 'balaclava' } }, rng), `${about} romance masked`);
        for (const favorite of ['yes', '']) check(compose(romance.date, { ...speaker, vars: { ...vars, item: 'Sake', favorite } }, LINES, rng, { opener: false }), `${about} date ${favorite}`);
        for (const end of [{ fizzled: 'yes', caught: '', other: '' }, { fizzled: '', caught: 'yes', other: 'Ana' }, { fizzled: '', caught: 'yes', other: '' }]) {
          check(compose(romance.theyEnd, { ...speaker, vars: { ...vars, ...end } }, LINES, rng, { opener: false }), `${about} they end it ${JSON.stringify(end)}`);
        }
        check(line(romance.jealous, { ...speaker, vars: { ...vars, other: 'Ana' } }, rng), `${about} jealous`);
        for (const eloquence of eloquences) {
          for (const pool of [LINES.you.askOut, LINES.you.official, LINES.you.endIt]) check(line(pool, { ...speaker, eloquence }, rng), `${about} you romance ${eloquence}`);
          check(line(LINES.you.date, { ...speaker, eloquence, vars: { ...vars, item: 'Sake' } }, rng), `${about} you date ${eloquence}`);
        }
        lines += 25;
        check(compose(LINES.chop.done, speaker, LINES, rng), `${about} chop done`);
        check(deflect(speaker, 'chop', LINES, rng), `${about} deflect chop`);
        // What happened between people lately, of every kind, from every side it can be told from.
        for (const kind of ['Shakedown', 'Robbery', 'Fight', 'Friends', 'Fallout']) {
          for (const role of ['Mine', 'Kin', 'Ours', 'Heard']) {
            if ((kind === 'Friends' || kind === 'Fallout') && (role === 'Ours' || role === 'Heard')) continue;
            for (const won of ['yes', '']) {
              const telling: Speaker = { ...speaker, vars: { ...vars, news: 'yes', [`news${kind}`]: 'yes', [`news${role}`]: 'yes', newsWho: 'Ana', newsGang: 'Valentinos', newsWord: 'cousin', newsAgo: 'last night', newsTook: '40', newsWhere: 'The Afterlife', newsHe: 'she', newsS: 's', newsHim: 'her', newsHis: 'her', newsWon: won, newsHurt: won ? '' : 'yes' } };
              check(compose(LINES.topics.news, telling, LINES, rng, { opener: false }), `${about} news ${kind} ${role} ${won ? 'won' : 'lost'}`);
            }
          }
        }
        lines += 32;
        // What they hold against someone else, every kind of it.
        for (const kind of ['Robbed', 'Shook', 'Beaten', 'Dumped', 'Fallout', 'LaidOff', 'Killed', 'Evicted']) {
          for (const word of ['cousin', '']) {
            const holding: Speaker = { ...speaker, vars: { ...vars, grudgeWho: 'Raul', [`grudge${kind}`]: 'yes', grudgeAgo: 'last week', grudgeKin: kind === 'Killed' ? 'Ana' : '', grudgeWord: kind === 'Killed' ? word : '' } };
            check(compose(LINES.topics.life, holding, LINES, rng, { opener: false }), `${about} grudge ${kind} ${word}`);
          }
        }
        lines += 16;
        // The news of people's hearts, work and deaths, and what they remember of the player: every other speaker is plenty of voices.
        const deep = population.people.indexOf(p) % 2 === 0;
        const told = (kind: string, role: string, extra: Record<string, string>) => {
          if (!deep) return;
          const telling: Speaker = { ...speaker, vars: { ...vars, news: 'yes', [`news${kind}`]: 'yes', [`news${role}`]: 'yes', newsWho: 'Ana', newsGang: 'Valentinos', newsWord: 'cousin', newsAgo: 'last night', newsTook: '0', newsWhere: 'Tom\'s Diner', newsHe: 'she', newsS: 's', newsHim: 'her', newsHis: 'her', newsWon: '', newsHurt: '', newsWith: '', newsKilled: '', ...extra } };
          check(compose(LINES.topics.news, telling, LINES, rng, { opener: false }), `${about} news ${kind} ${role} ${JSON.stringify(extra)}`);
          lines += 1;
        };
        const sides: Record<string, string[]> = { Makeup: ['Mine', 'Kin'], Romance: ['Mine', 'Kin', 'Heard'], Wedding: ['Mine', 'Kin', 'Heard'], Breakup: ['Mine', 'Kin', 'Heard'], Hired: ['Mine', 'Kin', 'Heard'], LaidOff: ['Mine', 'Kin', 'Heard'], Joined: ['Mine', 'Kin', 'Ours', 'Heard'], Mugging: ['Mine', 'Kin', 'Heard'], Collected: ['Mine', 'Kin', 'Ours', 'Heard'], Evicted: ['Mine', 'Kin', 'Heard'], Closed: ['Mine', 'Kin', 'Heard'], Reopened: ['Mine', 'Kin', 'Heard'] };
        // A mugging somewhere in particular, or nowhere.
        for (const won of ['yes', '']) told('Mugging', 'Mine', { newsWon: won, newsWhere: '' });
        for (const [kind, roles] of Object.entries(sides)) for (const role of roles) for (const won of ['yes', '']) for (const withWho of ['Jun', '']) told(kind, role, { newsWon: won, newsWith: withWho });
        // A death: a killer telling it, their people, the dead's people (killed, or of their years), the killer's gang, and the district.
        told('Death', 'Mine', { newsWon: 'yes', newsKilled: 'yes' });
        for (const withWho of ['Jun', '']) {
          told('Death', 'Kin', { newsWon: 'yes', newsKilled: 'yes', newsWith: withWho });
          told('Death', 'Kin', { newsKilled: 'yes', newsWith: withWho });
          told('Death', 'Heard', { newsKilled: 'yes', newsWith: withWho });
        }
        told('Death', 'Kin', { newsGang: '' });
        told('Death', 'Ours', { newsWon: 'yes', newsKilled: 'yes', newsWith: 'Jun' });
        told('Death', 'Heard', { newsGang: '' });
        // What they remember of the player, every kind of it, in every shape it comes in.
        const recalls: Array<Record<string, string>> = [];
        for (const what of ['memRobbery', 'memInsult', 'memAssault', 'memMurder', '']) {
          for (const took of ['40', '']) for (const twice of ['yes', '']) recalls.push({ memWronged: 'yes', ...(what ? { [what]: 'yes' } : {}), memTook: took, memTwice: twice });
          for (const word of ['cousin', '']) recalls.push({ memHeard: 'yes', ...(what ? { [what]: 'yes' } : {}), memWord: word });
          recalls.push({ memSaw: 'yes', ...(what ? { [what]: 'yes' } : {}) });
        }
        for (const took of ['60', '']) recalls.push({ memSettled: 'yes', memTook: took }, { memChopped: 'yes', memTook: took });
        recalls.push({ memGift: 'yes', memItem: 'Taco', memFavorite: 'yes' }, { memGift: 'yes', memItem: 'Taco' }, { memGift: 'yes' });
        for (const word of ['sister', '']) recalls.push({ memGoodWord: 'yes', memWord: word });
        for (const title of ['prep', '']) recalls.push({ memPromoted: 'yes', memTitle: title }, { memQuit: 'yes', memTitle: title });
        recalls.push({ memHired: 'yes' }, { memFired: 'yes' });
        for (const way of ['memJoke', 'memCompliment', 'memGossip', 'memCare', 'memFlirt']) for (const twice of ['yes', '']) recalls.push({ memChat: 'yes', [way]: 'yes', memTwice: twice }, { memRebuffed: 'yes', [way]: 'yes' });
        for (const place of ['the bar', '']) for (const twice of ['yes', '']) recalls.push({ memCovered: 'yes', memPlace: place, memTwice: twice }, { memBacked: 'yes', memPlace: place, memTwice: twice });
        for (const memory of deep ? recalls : []) {
          const remembering: Speaker = { ...speaker, vars: { ...vars, mem: 'yes', memWho: 'Ana', memHe: 'she', memHim: 'her', memHis: 'her', memAgo: 'yesterday', memAgain: rng.chance(0.5) ? 'yes' : '', ...memory } };
          check(compose(LINES.memory, remembering, LINES, rng, { opener: false }), `${about} memory ${JSON.stringify(memory)}`);
          if (memory.memQuit || memory.memFired) check(line(LINES.work.rehire, remembering, rng), `${about} rehire ${JSON.stringify(memory)}`);
          lines += 1;
        }
        // A boss, asked for work: every answer, in and out of a mask, with a place to name.
        const bossing: Speaker = { ...speaker, vars: { ...vars, work: 'El Pinche Grill' } };
        for (const pool of [LINES.work.hire, LINES.work.refuse, LINES.work.shift, LINES.work.promote, LINES.work.quit, LINES.work.notice, LINES.work.coverAsk, LINES.work.coverThanks, LINES.work.coverSnub, LINES.work.cutDemand, LINES.work.cutPaid, LINES.work.cutBack, LINES.work.cutWorse, LINES.work.caught, LINES.work.stood]) check(line(pool, bossing, rng), `${about} work pool`);
        for (const pool of [LINES.work.moonlight, LINES.work.sideGig]) check(line(pool, { ...bossing, vars: { ...bossing.vars, gig: 'Lizzie\'s Bar' } }, rng), `${about} side gig`);
        check(compose(LINES.work.hire, bossing, LINES, rng), `${about} hire`);
        check(compose(LINES.work.promote, bossing, LINES, rng), `${about} promote`);
        check(deflect(bossing, 'hire', LINES, rng), `${about} deflect hire`);
        check(line(LINES.work.masked, { ...bossing, vars: { ...bossing.vars, mask: 'balaclava' } }, rng), `${about} work masked`);
        for (const eloquence of eloquences) for (const pool of [LINES.you.work, LINES.you.quit, LINES.you.notice]) check(line(pool, { ...bossing, eloquence }, rng), `${about} you work ${eloquence}`);
        lines += 9;
        // With a mask on the player, and without: the pools that care either way, and the ones only a mask brings up.
        for (const mask of ['balaclava', '']) {
          const masked: Speaker = { ...speaker, vars: { ...vars, mask, work: 'The Afterlife' } };
          for (const pool of [LINES.greeting, LINES.rob.done, LINES.rob.fought, ...(mask ? [LINES.masked.barred, LINES.masked.recognized] : [])]) {
            const said = line(pool, masked, rng);
            check(said, `${about} ${mask ? 'masked' : 'bare'} pool`);
            if (mask && /your face|friendly face|new face/i.test(said)) problems.push(`${about} masked pool: ${JSON.stringify(said)}`);
          }
          lines += 3;
        }
        for (const eloquence of eloquences) {
          for (const pool of [LINES.you.talk, LINES.you.gift, LINES.you.insult, LINES.you.rob, LINES.you.robCold, LINES.you.chop]) check(line(pool, { ...speaker, eloquence }, rng), `${about} you ${eloquence}`);
        }
        lines += 30;
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
    expect(lines).toBeGreaterThan(5000);
    // Every pool for thousands of speakers: well over a minute, and half as long again on a slow CI runner.
  }, 240_000);
});
