import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { PHONE } from '../src/data/phone';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { interestAfter, interestOf, movesFor, replyRapport, type Chat } from '../src/engine/chat';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { answerOdds, reachOdds, replyOdds } from '../src/engine/phone';
import { generatePeople, whereIs, type Clock, type Person, type Spot } from '../src/engine/people';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { SocietyState, Standing } from '../src/engine/society';
import type { Location } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const MINUTE = 60_000;
const HOUR = 3_600_000;
// An evening, when people are out and talking.
const EVENING = Date.UTC(2077, 9, 13, 19, 0);
const RULES: GameRules = { ...TRAVEL, timeScale: 1, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, phone: PHONE };

const blank = (extra: Partial<Progress>): Progress => ({
  where: streetSpot({ x: 0, y: 0 }),
  visited: [],
  discovered: [],
  explored: [],
  eddies: 0,
  passUntil: 0,
  trip: null,
  inside: null,
  items: [],
  gear: null,
  money: { bills: 0, coins: 0, account: 0 },
  energy: null,
  inebriation: null,
  society: null,
  charisma: null,
  job: null,
  life: null,
  ...extra,
});
const at = (spot: Spot, extra: Partial<Progress> = {}): Progress => {
  if (spot.kind === 'location') {
    const place = world.locations[spot.id] as Location;
    return blank({ where: { ...streetSpot(place), place: place.id }, ...extra });
  }
  const b = world.buildings.find((x) => x.id === spot.id)!;
  return blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, ...extra });
};
const inner = (g: Game) => g as unknown as { society: SocietyState; chatState: Chat | null };
const standing = (rapport: number): Standing => ({ met: true, rapport, grudge: 0, at: EVENING, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} });

/** The first person of a kind awake somewhere the player can find them this evening, and the player there with them. */
function beside(which: (p: Person) => boolean, extra: Partial<Progress> | ((p: Person) => Partial<Progress>) = {}, rules: GameRules = RULES): { g: Game; person: Person } {
  for (const person of population.people) {
    if (!which(person)) continue;
    const where = whereIs(person, world, clockOf(EVENING), FOOD.dishes, PEOPLE.out);
    if (!where || /asleep/.test(where.doing)) continue;
    const g = new Game(world, rules, at(where.spot, typeof extra === 'function' ? extra(person) : extra));
    g.start(EVENING);
    const here = g.peopleHere(EVENING).find((p) => p.person.id === person.id);
    if (here) return { g, person: here.person };
  }
  throw new Error('nobody like that to be found');
}
/** The player already on good terms with them. */
const friendOf = (id: string, rapport = 60): Partial<Progress> => ({ society: { standings: { [id]: standing(rapport) }, rep: {}, incidents: [], threats: [], nextId: 1, known: { [id]: { met: true, seen: true, told: false, facts: ['name'], log: [] } }, links: {}, memories: {} } });
const chatty = (p: Person) => p.traits.chatty >= 0.7 && p.traits.warmth >= 0.5 && !p.gang && p.age >= 20;

describe('a conversation', () => {
  it('takes interest from who they are and how they are doing, and spends it a reply at a time', () => {
    const rules = SOCIETY.chat!;
    const easy = interestOf({ warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.5 }, 'neutral', 'easy', 0, rules);
    const keen = interestOf({ warmth: 0.9, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.9 }, 'friend', 'drinking', 1, rules);
    const busy = interestOf({ warmth: 0.2, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.1 }, 'cold', 'busy', 0, rules);
    expect(easy).toBeGreaterThan(2);
    expect(easy).toBeLessThan(6);
    expect(keen).toBeGreaterThan(easy + 3);
    expect(busy).toBe(0);
    // A liked reply keeps it going longer than a flat one; a disliked one cuts it short.
    expect(interestAfter(4, 1, rules)).toBeGreaterThan(interestAfter(4, 0, rules));
    expect(interestAfter(4, -1, rules)).toBeLessThan(interestAfter(4, 0, rules) - 1);
    // Rapport fades the longer it goes; a reply that offends costs in full.
    expect(replyRapport(1, 0, SOCIETY.reactions.rapport, rules)).toBeGreaterThan(replyRapport(1, 6, SOCIETY.reactions.rapport, rules));
    expect(replyRapport(-2, 6, SOCIETY.reactions.rapport, rules)).toBe(1 - 2 * SOCIETY.reactions.rapport);
    // Agreeing is there once they've said something; another joke only after a joke; the holo only with a phone, face to face.
    const chat: Chat = { with: 'x', approach: 'joke', topic: null, interest: 3, turns: 0, at: 0, remote: false, where: '', used: {}, warmth: 0, comfort: false };
    expect(movesFor(chat, true)).toEqual(['more', 'share', 'joke', 'holo', 'bye']);
    expect(movesFor({ ...chat, approach: 'care', topic: 'life', comfort: true, remote: true }, true)).toEqual(['more', 'agree', 'share', 'comfort', 'bye']);
  });

  it('goes on after the way in, a reply at a time, until their interest runs out or the player says goodbye', () => {
    const { g, person } = beside(chatty, {}, RULES);
    expect(g.chatWith(person.id, EVENING), 'nothing before talking').toBeNull();
    expect(g.talk(person.id, EVENING)).toBe(true);
    const open = g.chatWith(person.id, EVENING);
    expect(open, 'a chatty, warm stranger keeps talking').not.toBeNull();
    expect(open!.moves.map((m) => m.id)).toContain('more');
    expect(open!.moves.at(-1)?.id).toBe('bye');
    const lines = g.conversation(person.id).length;
    let t = EVENING;
    let turns = 0;
    while (g.chatWith(person.id, t) && turns < 20) {
      t += MINUTE;
      expect(g.reply(person.id, 'more', t)).toBe(true);
      turns++;
    }
    expect(turns, 'it ends on its own').toBeLessThan(20);
    expect(turns).toBeGreaterThan(0);
    expect(g.conversation(person.id).length).toBeGreaterThan(lines + turns);
    expect(g.reply(person.id, 'more', t + MINUTE), 'over').toBe(false);
  });

  it('ends when the player says goodbye, walks off, or leaves it too long', () => {
    const { g, person } = beside(chatty, (p) => friendOf(p.id), RULES);
    g.talk(person.id, EVENING);
    expect(g.chatWith(person.id, EVENING)).not.toBeNull();
    expect(g.reply(person.id, 'bye', EVENING + MINUTE)).toBe(true);
    expect(g.chatWith(person.id, EVENING + MINUTE)).toBeNull();
    // Left ten minutes without a word, it's over.
    g.talk(person.id, EVENING + 3 * HOUR);
    if (g.chatWith(person.id, EVENING + 3 * HOUR)) expect(g.chatWith(person.id, EVENING + 3 * HOUR + (SOCIETY.chat!.idleMinutes + 1) * MINUTE)).toBeNull();
    // Walking out of the building ends it.
    g.talk(person.id, EVENING + 6 * HOUR);
    if (g.chatWith(person.id, EVENING + 6 * HOUR) && g.interior) {
      g.leave();
      expect(g.chatWith(person.id, EVENING + 6 * HOUR)).toBeNull();
    }
  });

  it('is one exchange, as it was, without the rules for it', () => {
    const rules: GameRules = { ...RULES, society: { ...SOCIETY, chat: undefined } };
    const { g, person } = beside(chatty, {}, rules);
    expect(g.talk(person.id, EVENING)).toBe(true);
    expect(g.chatWith(person.id, EVENING)).toBeNull();
  });
});

describe('the holophone', () => {
  it('picks up, texts back and texts first by how they feel about the player', () => {
    expect(answerOdds('friend', { busy: false, late: false, seeing: false, again: false }, PHONE)).toBeGreaterThan(answerOdds('neutral', { busy: false, late: false, seeing: false, again: false }, PHONE));
    expect(answerOdds('friend', { busy: true, late: true, seeing: false, again: true }, PHONE)).toBeLessThan(0.2);
    expect(answerOdds('hostile', { busy: false, late: false, seeing: true, again: false }, PHONE)).toBe(0);
    expect(replyOdds('warm', 0, PHONE)).toBeGreaterThan(replyOdds('cold', 0, PHONE));
    expect(replyOdds('friend', PHONE.reply.waiting + 1, PHONE), 'no answer to pestering').toBe(0);
    expect(reachOdds('friend', 0.5, false, PHONE)).toBeGreaterThan(reachOdds('neutral', 0.5, false, PHONE));
    expect(reachOdds('neutral', 0.5, true, PHONE)).toBeGreaterThan(reachOdds('friend', 0.5, false, PHONE));
  });

  it('gets a friend\'s holo for the asking, with their name on it, and never from behind a mask', () => {
    const { g, person } = beside(chatty, (p) => friendOf(p.id, 80));
    g.talk(person.id, EVENING);
    expect(g.chatWith(person.id, EVENING)?.moves.map((m) => m.id)).toContain('holo');
    expect(g.reply(person.id, 'holo', EVENING + MINUTE)).toBe(true);
    expect(g.hasHolo(person.id)).toBe(true);
    expect(g.describe(person.id, EVENING)?.named).toBe(true);
    expect(g.contacts(EVENING).map((c) => c.id)).toEqual([person.id]);
    // Asked for it already, it isn't offered again.
    expect(g.chatWith(person.id, EVENING + MINUTE)?.moves.map((m) => m.id) ?? []).not.toContain('holo');
  });

  it('holds a conversation over the holo with someone who picks up, and says so when nobody does', () => {
    const { g, person } = beside(chatty, (p) => friendOf(p.id));
    const id = person.id;
    // A contact, and on the best of terms: they pick up nine times in ten, so a few tries is plenty.
    const s = inner(g).society;
    s.standings[id] = standing(90);
    (g as unknown as { phoneState: { contacts: Record<string, { since: number }> } }).phoneState.contacts[id] = { since: EVENING };
    let t = EVENING + HOUR;
    let answered = false;
    for (let i = 0; i < 12 && !answered; i++, t += 20 * MINUTE) answered = g.call(id, t) === 'answered';
    expect(answered).toBe(true);
    const open = g.chatWith(id, t - 20 * MINUTE);
    expect(open?.remote).toBe(true);
    expect(open?.moves.map((m) => m.id)).not.toContain('holo');
    expect(open?.moves.find((m) => m.id === 'bye')?.label).toBe(LINES.chat.again.hangUp);
    // Someone the player doesn't have the holo of can't be called; the dead don't pick up.
    const stranger = population.people.find((p) => p.id !== id)!;
    expect(g.call(stranger.id, t)).toBeNull();
  });

  it('answers a text later, puts it in the thread, and counts it unread till it is read', () => {
    const { g, person } = beside(chatty, (p) => friendOf(p.id));
    const id = person.id;
    inner(g).society.standings[id] = standing(90);
    (g as unknown as { phoneState: { contacts: Record<string, { since: number }> } }).phoneState.contacts[id] = { since: EVENING };
    expect(g.textsWith(id)?.kinds.map((k) => k.id), 'missing them is for the one the player is seeing').not.toContain('miss');
    let answered = false;
    let t = EVENING;
    for (let i = 0; i < 6 && !answered; i++) {
      expect(g.text(id, 'hey', t)).toBe(true);
      // Answers come within the hour, or after they wake.
      for (let h = 0; h < 14 && !answered; h++) {
        t += HOUR;
        g.tick(t);
        answered = (g.textsWith(id)?.texts ?? []).some((x) => x.from === 'them');
      }
    }
    expect(answered).toBe(true);
    expect(g.unreadTexts()).toBeGreaterThan(0);
    g.readTexts(id);
    expect(g.unreadTexts()).toBe(0);
    // A save keeps the holo and the thread.
    const back = new Game(world, RULES, resume(world, readSave(JSON.parse(JSON.stringify(createSave(world.seed, g, 0))))!)!);
    expect(back.hasHolo(id)).toBe(true);
    expect(back.textsWith(id)?.texts).toEqual(g.textsWith(id)?.texts);
  });

  it('gives nothing past a few unanswered texts but sore feelings', () => {
    const { g, person } = beside(chatty, (p) => friendOf(p.id));
    const id = person.id;
    (g as unknown as { phoneState: { contacts: Record<string, { since: number }> } }).phoneState.contacts[id] = { since: EVENING };
    const before = g.standingWith(id, EVENING)!.standing.rapport;
    for (let i = 0; i <= PHONE.reply.waiting + 2; i++) g.text(id, 'hey', EVENING + i * MINUTE);
    expect(g.standingWith(id, EVENING + 10 * MINUTE)!.standing.rapport).toBeLessThan(before);
  });
});
