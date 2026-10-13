import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { LINES } from '../src/data/dialogue';
import { FOOD } from '../src/data/food';
import { PEOPLE } from '../src/data/people';
import { SOCIETY } from '../src/data/society';
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
    // A stranger with no way with words: name yes, work a coin toss, age a non-answer, home and enemies a no.
    expect(replyTo(openness('name', 'neutral', 1, plain, rules), rules, createRng('a'))).toBe('answer');
    expect(openness('job', 'neutral', 1, plain, rules)).toBe(0);
    expect(openness('age', 'neutral', 1, plain, rules)).toBe(-1);
    expect(replyTo(openness('age', 'neutral', 1, plain, rules), rules, createRng('a'))).toBe('deflect');
    expect(replyTo(openness('home', 'neutral', 1, plain, rules), rules, createRng('a'))).toBe('refuse');
    expect(replyTo(openness('hates', 'neutral', 1, plain, rules), rules, createRng('a'))).toBe('refuse');
    // A friend tells everything; so does a stranger to someone with charisma enough; the hostile nothing.
    for (const asked of ['name', 'job', 'age', 'home', 'likes', 'hates', 'kin'] as Asked[]) {
      expect(replyTo(openness(asked, 'friend', 1, plain, rules), rules, createRng('a')), asked).toBe('answer');
      expect(replyTo(openness(asked, 'neutral', 9, plain, rules), rules, createRng('a')), asked).toBe('answer');
      expect(replyTo(openness(asked, 'hostile', 9, plain, rules), rules, createRng('a')), asked).toBe('refuse');
      expect(openness(asked, 'neutral', 3, plain, rules)).toBeGreaterThan(openness(asked, 'neutral', 1, plain, rules));
      expect(openness(asked, 'warm', 1, plain, rules)).toBeGreaterThan(openness(asked, 'neutral', 1, plain, rules));
    }
    // Their nature: the talkative and the warm say more; the loyal say less of their people; the brave more of their enemies; the greedy chop a chip sooner.
    const chatty = { ...plain, chatty: 0.9, warmth: 0.9 };
    expect(openness('age', 'neutral', 1, chatty, rules)).toBeGreaterThan(openness('age', 'neutral', 1, plain, rules));
    expect(openness('kin', 'neutral', 1, { ...plain, loyalty: 0.9 }, rules)).toBeLessThan(openness('kin', 'neutral', 1, plain, rules));
    expect(openness('hates', 'neutral', 1, { ...plain, courage: 0.9 }, rules)).toBeGreaterThan(openness('hates', 'neutral', 1, plain, rules));
    expect(openness('chop', 'neutral', 1, { ...plain, greed: 0.9 }, rules)).toBeGreaterThan(openness('chop', 'neutral', 1, plain, rules));
    // A mask on the player costs with everyone: a stranger in one gets a name out of people now and then and their work never; a friend still tells most things.
    expect(openness('name', 'neutral', 1, plain, rules, true)).toBeCloseTo(openness('name', 'neutral', 1, plain, rules) - rules.mask, 5);
    expect(replyTo(openness('job', 'neutral', 1, plain, rules, true), rules, createRng('a'))).toBe('refuse');
    expect(replyTo(openness('job', 'friend', 1, plain, rules, true), rules, createRng('a'))).toBe('answer');
    expect(replyTo(openness('home', 'friend', 1, plain, rules, true), rules, createRng('a'))).not.toBe('answer');
    const inMask = speakerOf(person('m'), {}, { mask: 'gas mask' });
    expect(new Set(Array.from({ length: 40 }, (_, i) => openTopics(inMask, 1, rules, createRng(`m${i}`), true)).flat())).not.toContain('job');
    // A stranger chops a hot chip a little less readily than they talk about their work; a friend without a second thought.
    expect(openness('chop', 'neutral', 1, plain, rules)).toBeLessThan(openness('job', 'neutral', 1, plain, rules));
    expect(openness('chop', 'neutral', 1, plain, rules)).toBeGreaterThan(rules.deflectAt);
    expect(replyTo(openness('chop', 'friend', 1, plain, rules), rules, createRng('a'))).toBe('answer');
    // In between, the odds rise with the score; at the edges they're certain.
    const answers = (score: number) => Array.from({ length: 200 }, (_, i) => replyTo(score, rules, createRng(`r${i}`))).filter((r) => r === 'answer').length;
    expect(answers(-1)).toBe(0);
    expect(answers(0)).toBeGreaterThan(70);
    expect(answers(0)).toBeLessThan(130);
    expect(answers(1)).toBe(200);
    // What a stranger brings up on their own: the neighborhood and their lot, never their people or their enemies.
    const stranger = speakerOf(person('s', { hates: 'valentinos' }));
    const topics = new Set(Array.from({ length: 40 }, (_, i) => openTopics(stranger, 1, rules, createRng(`t${i}`), true)).flat());
    expect(topics).toContain('district');
    expect(topics).toContain('life');
    expect(topics).toContain('here');
    expect(topics).not.toContain('hates');
    expect(topics).not.toContain('kin');
    // A friend, with family to mention: everything, and their people only once that's earned.
    const friend = speakerOf(person('f', { hates: 'valentinos' }), { stance: 'friend' }, { kinName: 'Ana', kinWord: 'sister', kinWork: 'the grill' });
    expect(openTopics(friend, 1, rules, createRng('t'), true)).toEqual(['district', 'life', 'here', 'job', 'likes', 'hates', 'kin']);
    expect(openTopics(friend, 1, rules, createRng('t'), false)).not.toContain('kin');
    const chat = smallTalk(friend, ['kin'], LINES, createRng('k'));
    expect(chat.topic).toBe('kin');
    expect(chat.said).toContain('Ana');
    const nothing = smallTalk(friend, [], LINES, createRng('k'));
    expect(nothing.topic).toBeNull();
    expect(LINES.brushOff.map((l) => (typeof l === 'string' ? l : l.text))).toContain(nothing.said);
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
    expect(deflect(drifter, 'district', LINES, createRng('d'))).toMatch(/Pass|Next question|well enough/);
    expect(line(LINES.refuse, speakerOf(person('x'), { voice: 'corpo', stance: 'cold' }), createRng('r'))).toMatch(/\S/);
  });

  it('never leaves a hole in a line, whoever is talking, across whole cities', () => {
    const holes = /[{}]|  |^\p{Ll}|^\s|\s$/u;
    const check = (said: string, about: string) => {
      expect(said, about).toMatch(/\S/);
      expect(said, about).not.toMatch(holes);
    };
    const voices: Voice[] = ['street', 'gang', 'corpo', 'nomad', 'elder', 'young'];
    const moods: Mood[] = ['busy', 'easy', 'eating', 'drinking', 'court', 'home', 'asleep'];
    const histories: History[] = ['first', 'recent', 'regular', 'long'];
    const stances: Stance[] = ['cold', 'wary', 'neutral', 'warm', 'friend'];
    const eloquences: Eloquence[] = ['blunt', 'easy', 'smooth'];
    const questions = Object.keys(LINES.questions) as Question[];
    const topics = Object.keys(LINES.topics) as Topic[];
    const seeds = Array.from({ length: 6 }, (_, i) => createRng(`dialogue-${i}`).next().toString(16).slice(2, 10));
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
          balance: '120',
          cut: '30',
          left: '90',
          mask: rng.chance(0.3) ? 'gas mask' : '',
          title: 'dish pit',
          pay: '24',
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
          check(said, `${about} topic ${topic}`);
        }
        for (const q of questions) {
          check(answer(speaker, q, LINES, rng), `${about} answer ${q}`);
          check(repeat(speaker, q, LINES, rng), `${about} repeat ${q}`);
          check(deflect(speaker, q, LINES, rng), `${about} deflect ${q}`);
          for (const eloquence of eloquences) check(line(LINES.questions[q].lines, { ...speaker, eloquence }, rng), `${about} question ${q} ${eloquence}`);
          lines += 4;
        }
        for (const pool of [LINES.brushOff, LINES.grudge, LINES.hostile, LINES.asleep, LINES.talkedOut, LINES.refuse, LINES.pressed, LINES.ask.knows, LINES.ask.unknown, LINES.ask.repeat, LINES.gift.thanks, LINES.gift.favorite, LINES.gift.refuse, LINES.insult.reply, LINES.insult.shove, LINES.rob.done, LINES.rob.nothing, LINES.rob.fought, LINES.chop.done, LINES.chop.refuse, LINES.barred]) {
          check(line(pool, speaker, rng), `${about} pool`);
        }
        check(compose(LINES.chop.done, speaker, LINES, rng), `${about} chop done`);
        check(deflect(speaker, 'chop', LINES, rng), `${about} deflect chop`);
        // A boss, asked for work: every answer, in and out of a mask, with a place to name.
        const bossing: Speaker = { ...speaker, vars: { ...vars, work: 'El Pinche Grill' } };
        for (const pool of [LINES.work.hire, LINES.work.refuse, LINES.work.shift, LINES.work.promote, LINES.work.quit]) check(line(pool, bossing, rng), `${about} work pool`);
        check(compose(LINES.work.hire, bossing, LINES, rng), `${about} hire`);
        check(compose(LINES.work.promote, bossing, LINES, rng), `${about} promote`);
        check(deflect(bossing, 'hire', LINES, rng), `${about} deflect hire`);
        check(line(LINES.work.masked, { ...bossing, vars: { ...bossing.vars, mask: 'balaclava' } }, rng), `${about} work masked`);
        for (const eloquence of eloquences) for (const pool of [LINES.you.work, LINES.you.quit]) check(line(pool, { ...bossing, eloquence }, rng), `${about} you work ${eloquence}`);
        lines += 9;
        // With a mask on the player, and without: the pools that care either way, and the ones only a mask brings up.
        for (const mask of ['balaclava', '']) {
          const masked: Speaker = { ...speaker, vars: { ...vars, mask, work: 'The Afterlife' } };
          for (const pool of [LINES.greeting, LINES.rob.done, LINES.rob.fought, ...(mask ? [LINES.masked.barred, LINES.masked.recognized] : [])]) {
            const said = line(pool, masked, rng);
            check(said, `${about} ${mask ? 'masked' : 'bare'} pool`);
            if (mask) expect(said, `${about} masked pool`).not.toMatch(/your face|friendly face|new face/i);
          }
          lines += 3;
        }
        for (const eloquence of eloquences) {
          for (const pool of [LINES.you.talk, LINES.you.askAbout, LINES.you.gift, LINES.you.insult, LINES.you.rob, LINES.you.chop]) check(line(pool, { ...speaker, eloquence }, rng), `${about} you ${eloquence}`);
        }
        lines += 30;
      }
    }
    expect(lines).toBeGreaterThan(5000);
  });
});
