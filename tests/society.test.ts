import { describe, expect, it } from 'vitest';
import { SOCIETY } from '../src/data/society';
import { INVERSE, type Person, type Population, type Tie, type TieKind } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { forgetMemories, memoriesOf, recall, recalled, remember } from '../src/engine/memory';
import { applyIncident, attitude, changeRep, changeStanding, dueThreats, freshSociety, isPinned, knowledgeOf, knownPeople, knowsOf, learnFact, learnLink, learnOf, linkOf, LOG_CAP, logLine, passGoodWord, pinIncident, relearnLink, repOf, settleThreat, standingOf, stanceOf, unpinnedIncidents, webOf, type SocietyRules } from '../src/engine/society';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2077, 9, 12, 20, 0);
const RULES: SocietyRules = SOCIETY;

function person(id: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    name: id,
    given: id,
    family: 'x',
    pronouns: 'they',
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

function tie(a: string, b: string, kind: TieKind): Tie[] {
  return [
    { from: a, to: b, kind },
    { from: b, to: a, kind: INVERSE[kind] },
  ];
}

// Rosa, a cook, has a husband (Mateo, a Valentino), a cousin, a coworker and a friend; the friend has a friend of her own.
const pop: Population = {
  people: [
    person('rosa'),
    person('mateo', { gang: 'valentinos', job: { role: 'soldado', building: null }, traits: { warmth: 0.5, temper: 0.9, loyalty: 0.9, greed: 0.5, courage: 0.9, chatty: 0.5 } }),
    person('cousin', { job: { role: 'courier', building: null }, traits: { warmth: 0.5, temper: 0.1, loyalty: 0.1, greed: 0.5, courage: 0.1, chatty: 0.5 } }),
    person('coworker'),
    person('friend', { job: { role: 'courier', building: null } }),
    person('friend2', { job: { role: 'courier', building: null } }),
    person('rival', { gang: 'sixth_street', district: 'santo_domingo', job: { role: 'regular', building: null } }),
    person('witness', { job: { role: 'courier', building: null } }),
  ],
  ties: [...tie('rosa', 'mateo', 'spouse'), ...tie('rosa', 'cousin', 'cousin'), ...tie('rosa', 'coworker', 'coworker'), ...tie('rosa', 'friend', 'friend'), ...tie('friend', 'friend2', 'friend')],
};
const links = { chainOf: () => null, rivalsOf: (gang: string) => (gang === 'valentinos' ? ['sixth_street'] : []) };

describe('society', () => {
  it('starts with nobody knowing the player, who is a stranger to all but the warm and the cold', () => {
    const state = freshSociety();
    expect(standingOf(state, 'rosa', RULES, 1, T0)).toMatchObject({ met: false, rapport: 0, grudge: 0 });
    expect(stanceOf(attitude(person('rosa'), state, RULES, 1, T0), RULES)).toBe('neutral');
    expect(stanceOf(attitude(person('cold', { traits: { ...person('x').traits, warmth: 0.1 } }), state, RULES, 1, T0), RULES)).toBe('wary');
    expect(stanceOf(100, RULES)).toBe('friend');
    expect(stanceOf(-100, RULES)).toBe('hostile');
  });

  it('spreads a robbery to the victim\'s people by closeness and loyalty, and on to theirs', () => {
    const state = freshSociety();
    const rng = createRng('society');
    const fallout = applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: ['witness'], district: 'heywood', took: 30 }, RULES, 1, T0, rng, links);
    const grudge = (id: string) => standingOf(state, id, RULES, 1, T0).grudge;
    expect(grudge('rosa')).toBe(55);
    // Mateo feels all of it, and is loyal: 55 × 1 × (0.5 + 0.9 / 2).
    expect(grudge('mateo')).toBe(Math.round(55 * 0.95));
    expect(grudge('cousin')).toBe(Math.round(55 * 0.5 * 0.55));
    expect(grudge('coworker')).toBe(Math.round(55 * 0.3 * 0.75));
    expect(grudge('friend')).toBe(Math.round(55 * 0.5 * 0.75));
    // Second hand: the friend's friend hears a third of what the friend feels.
    expect(grudge('friend2')).toBe(Math.round(55 * 0.5 * 0.75 * 0.35 * 0.5 * 0.75));
    expect(grudge('witness')).toBe(Math.round(55 * 0.3));
    expect(grudge('rival')).toBe(0);
    expect(fallout.affected[0]).toEqual({ id: 'rosa', grudge: 55 });
    expect(fallout.affected.map((a) => a.id)).toContain('mateo');
    // Rapport drops with the grudge; the stance follows.
    expect(standingOf(state, 'rosa', RULES, 1, T0).rapport).toBe(-18);
    expect(stanceOf(attitude(pop.people[0] as Person, state, RULES, 1, T0), RULES)).toBe('hostile');
    expect(stanceOf(attitude(pop.people[2] as Person, state, RULES, 1, T0), RULES)).toBe('cold');
  });

  it('costs reputation with the victim\'s workplace (to a ban), neighborhood and gang, and buys a little with the gang\'s rivals', () => {
    const state = freshSociety();
    applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'mateo', witnesses: [], district: 'heywood', took: 50 }, RULES, 1, T0, createRng('a'), links);
    // Half of 55, rounded the way JavaScript rounds halves.
    expect(repOf(state, 'gang:valentinos', RULES, 1, T0)).toBe(-27);
    expect(repOf(state, 'gang:sixth_street', RULES, 1, T0)).toBe(8);
    expect(repOf(state, 'district:heywood', RULES, 1, T0)).toBe(-11);
    expect(repOf(state, 'business:b-grill', RULES, 1, T0)).toBe(0);

    const shop = freshSociety();
    applyIncident(shop, pop, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: [], district: 'heywood', took: 30 }, RULES, 1, T0, createRng('b'), links);
    expect(repOf(shop, 'business:b-grill', RULES, 1, T0)).toBe(-33);
    expect(repOf(shop, 'business:b-grill', RULES, 1, T0)).toBeLessThanOrEqual(RULES.rep.banAt);
    // An insult is noticed, not a ban.
    const words = freshSociety();
    applyIncident(words, pop, { at: T0, kind: 'insult', victim: 'rosa', witnesses: [], district: 'heywood', took: 0 }, RULES, 1, T0, createRng('c'), links);
    expect(repOf(words, 'business:b-grill', RULES, 1, T0)).toBe(-7);
    expect(words.threats).toEqual([]);
  });

  it('leaves the dead out of it: no grudge, no memory, and nobody comes for them', () => {
    // Mateo dead, Rosa robbed: he's the one who'd have come, and now no one feels it for him.
    const mourning: Population = { ...pop, people: pop.people.map((p) => (p.id === 'mateo' ? { ...p, diedOn: 1 } : p)) };
    for (let i = 0; i < 20; i++) {
      const state = freshSociety();
      const fallout = applyIncident(state, mourning, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: [], district: 'heywood', took: 30 }, RULES, 1, T0, createRng(`dead-${i}`), links);
      expect(fallout.affected.some((a) => a.id === 'mateo')).toBe(false);
      expect(fallout.threats.some((t) => t.by === 'mateo')).toBe(false);
      expect(memoriesOf(state, 'mateo', RULES.memory, 1, T0)).toEqual([]);
    }
  });

  it('sends someone with the grudge and the nerve to collect, later, and the gang once it has had enough', () => {
    const state = freshSociety();
    // Mateo: 95% of 55 grudge, courage 0.9 and a temper: he comes.
    const first = applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: [], district: 'heywood', took: 30 }, RULES, 1, T0, createRng('revenge-1'), links);
    const revenge = first.threats.find((t) => t.by);
    expect(revenge).toBeDefined();
    expect(['rosa', 'mateo']).toContain(revenge?.by);
    expect(revenge?.amount).toBe(20 + 45);
    expect(revenge?.due).toBeGreaterThan(T0 + 2 * HOUR - 1);
    expect(revenge?.due).toBeLessThanOrEqual(T0 + 36 * HOUR);
    expect(dueThreats(state, T0)).toEqual([]);
    expect(dueThreats(state, T0 + 40 * HOUR)).toHaveLength(first.threats.length);
    // Robbing a Valentino twice: the gang comes looking.
    applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'mateo', witnesses: [], district: 'heywood', took: 50 }, RULES, 1, T0, createRng('revenge-2'), links);
    expect(repOf(state, 'gang:valentinos', RULES, 1, T0)).toBeGreaterThan(RULES.rep.banAt);
    const third = applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'mateo', witnesses: [], district: 'heywood', took: 50 }, RULES, 1, T0, createRng('revenge-3'), links);
    expect(third.threats.some((t) => t.gang === 'valentinos')).toBe(true);
    expect(state.threats.filter((t) => t.gang === 'valentinos')).toHaveLength(1);

    // Settling up halves the grudge and buys the gang off a little.
    const hunt = state.threats.find((t) => t.gang === 'valentinos');
    const before = repOf(state, 'gang:valentinos', RULES, 1, T0);
    if (hunt) settleThreat(state, hunt, RULES, 1, T0);
    expect(state.threats.some((t) => t.gang === 'valentinos')).toBe(false);
    expect(repOf(state, 'gang:valentinos', RULES, 1, T0)).toBe(Math.min(100, before + 15));
    if (revenge?.by) {
      const grudge = standingOf(state, revenge.by, RULES, 1, T0).grudge;
      settleThreat(state, revenge, RULES, 1, T0);
      expect(standingOf(state, revenge.by, RULES, 1, T0).grudge).toBe(grudge - Math.round(grudge / 2));
    }
  });

  it('keeps what the player knows of people and of who knows whom, never less than before', () => {
    const state = freshSociety();
    expect(knowsOf(state, 'rosa')).toBe(false);
    expect(learnOf(state, 'rosa', 'seen')).toBe(true);
    expect(learnOf(state, 'rosa', 'seen')).toBe(false);
    expect(learnOf(state, 'rosa', 'met')).toBe(true);
    expect(knowledgeOf(state, 'rosa')).toEqual({ met: true, seen: true, told: false, facts: [], log: [] });
    expect(knownPeople(state)).toEqual(['rosa']);
    // Facts come one at a time and stay; being told of someone comes with their name.
    expect(learnFact(state, 'rosa', 'job')).toBe(true);
    expect(learnFact(state, 'rosa', 'job')).toBe(false);
    expect(learnOf(state, 'mateo', 'told')).toBe(true);
    expect(knowledgeOf(state, 'mateo').facts).toEqual(['name']);
    expect(knowledgeOf(state, 'rosa').facts).toEqual(['job']);
    // What was said is kept, the last so many lines.
    for (let i = 0; i < LOG_CAP + 5; i++) logLine(state, 'rosa', i % 2 ? 'them' : 'you', `line ${i}`, T0 + i);
    const log = knowledgeOf(state, 'rosa').log;
    expect(log).toHaveLength(LOG_CAP);
    expect(log[0]).toEqual({ at: T0 + 5, who: 'them', text: 'line 5' });
    expect(log.at(-1)?.text).toBe(`line ${LOG_CAP + 4}`);

    // Seen together: connected, somehow. Told: how. Asked again: nothing to add.
    expect(learnLink(state, 'rosa', 'mateo', null, 'seen', T0)).toBe(true);
    expect(linkOf(state, 'rosa', 'mateo')).toEqual({ kind: null, how: 'seen', at: T0 });
    expect(learnLink(state, 'mateo', 'rosa', null, 'seen', T0 + 1)).toBe(false);
    expect(learnLink(state, 'mateo', 'rosa', 'spouse', 'told', T0 + 2)).toBe(true);
    expect(learnLink(state, 'rosa', 'mateo', 'spouse', 'asked', T0 + 3)).toBe(false);
    expect(linkOf(state, 'rosa', 'mateo')).toMatchObject({ kind: 'spouse', how: 'told' });
    // A one-way kind reads right from either side: Rosa's mother is Dolores; Dolores's child is Rosa.
    expect(learnLink(state, 'rosa', 'dolores', 'parent', 'told', T0)).toBe(true);
    expect(linkOf(state, 'rosa', 'dolores')?.kind).toBe('parent');
    expect(linkOf(state, 'dolores', 'rosa')?.kind).toBe('child');
    expect(learnLink(state, 'dolores', 'cousin', 'none', 'asked', T0)).toBe(true);
    expect(webOf(state, 'rosa').map((l) => `${l.id}:${l.kind}:${l.how}`).sort()).toEqual(['dolores:parent:told', 'mateo:spouse:told']);
    expect(webOf(state, 'dolores').map((l) => l.id)).toEqual(['rosa']);
    expect(webOf(state, 'cousin')).toEqual([]);
    expect(learnLink(state, 'rosa', 'rosa', 'friend', 'told', T0)).toBe(false);
  });

  it('forgives and forgets on the clock, sped up by the test speed', () => {
    const state = freshSociety();
    changeStanding(state, 'rosa', { grudge: 30, rapport: 10 }, RULES, 1, T0);
    changeRep(state, 'gang:valentinos', -20, RULES, 1, T0);
    expect(standingOf(state, 'rosa', RULES, 1, T0 + 10 * DAY)).toMatchObject({ grudge: 20, rapport: 10 });
    expect(standingOf(state, 'rosa', RULES, 1, T0 + 100 * DAY).grudge).toBe(0);
    expect(repOf(state, 'gang:valentinos', RULES, 1, T0 + 5 * DAY)).toBe(-10);
    expect(repOf(state, 'gang:valentinos', RULES, 60, T0 + 10 * 24 * 60_000)).toBe(0);
    // Changes are written down on faded values.
    changeStanding(state, 'rosa', { grudge: 5 }, RULES, 1, T0 + 10 * DAY);
    expect(standingOf(state, 'rosa', RULES, 1, T0 + 10 * DAY).grudge).toBe(25);
  });

  it("writes down what was done in a mask as nobody's, until someone who was there sees the mask again", () => {
    const state = freshSociety();
    const rng = createRng('mask');
    const scene = 'building:b-grill|39366:20|old-plastic-gas-mask';
    const masked = applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: ['witness'], district: 'heywood', took: 30, mask: 'old-plastic-gas-mask', where: scene }, RULES, 1, T0, rng, links);
    expect(masked).toEqual({ affected: [], rep: {}, threats: [] });
    expect(state.incidents[0]).toMatchObject({ id: 1, kind: 'robbery', mask: 'old-plastic-gas-mask', pinned: false, where: scene });
    expect(isPinned(state.incidents[0]!)).toBe(false);
    expect(unpinnedIncidents(state, 'old-plastic-gas-mask').map((i) => i.id)).toEqual([1]);
    expect(unpinnedIncidents(state, 'nami-balaclava')).toEqual([]);
    // Nobody holds it against the player: not the victim, not her husband, not the witness; not the house, not the neighborhood.
    for (const id of ['rosa', 'mateo', 'witness']) expect(standingOf(state, id, RULES, 1, T0).grudge, id).toBe(0);
    expect(repOf(state, 'business:b-grill', RULES, 1, T0)).toBe(0);
    expect(repOf(state, 'district:heywood', RULES, 1, T0)).toBe(0);
    expect(state.threats).toEqual([]);
    // Seen again: all of it lands, as if they'd seen the face at the time.
    const later = T0 + 5 * HOUR;
    const fallout = pinIncident(state, pop, 1, RULES, 1, later, rng, links);
    expect(fallout?.affected[0]).toEqual({ id: 'rosa', grudge: 55 });
    expect(standingOf(state, 'mateo', RULES, 1, later).grudge).toBe(Math.round(55 * 0.95));
    expect(standingOf(state, 'witness', RULES, 1, later).grudge).toBe(Math.round(55 * 0.3));
    expect(repOf(state, 'business:b-grill', RULES, 1, later)).toBe(-33);
    expect(isPinned(state.incidents[0]!)).toBe(true);
    expect(unpinnedIncidents(state, 'old-plastic-gas-mask')).toEqual([]);
    // Pinned once; and nothing to pin that isn't there.
    expect(pinIncident(state, pop, 1, RULES, 1, later, rng, links)).toBeNull();
    expect(pinIncident(state, pop, 99, RULES, 1, later, rng, links)).toBeNull();
    // Bare-faced, it's pinned as it happens; so is anything from a save before masks.
    const bare = applyIncident(state, pop, { at: later, kind: 'insult', victim: 'rosa', witnesses: [], district: 'heywood', took: 0 }, RULES, 1, later, rng, links);
    expect(bare.affected[0]?.id).toBe('rosa');
    expect(isPinned(state.incidents[1]!)).toBe(true);
    expect(isPinned({ id: 9, at: T0, kind: 'robbery', victim: 'rosa', witnesses: [], district: 'heywood', took: 10 })).toBe(true);
  });

  it('remembers what was done, by whom it was seen and who heard of it, and nothing of a mask until it is pinned', () => {
    const state = freshSociety();
    applyIncident(state, pop, { at: T0, kind: 'robbery', victim: 'rosa', witnesses: ['witness'], district: 'heywood', took: 30 }, RULES, 1, T0, createRng('m'), links);
    const of = (id: string) => memoriesOf(state, id, RULES.memory, 1, T0);
    expect(of('rosa')).toEqual([{ kind: 'wronged', at: T0, what: 'robbery', amount: 30, times: 1, said: 0 }]);
    expect(of('mateo')).toEqual([{ kind: 'heard', at: T0, about: 'rosa', what: 'robbery', times: 1, said: 0 }]);
    expect(of('witness')).toEqual([{ kind: 'saw', at: T0, about: 'rosa', what: 'robbery', times: 1, said: 0 }]);
    // Second hand, and faint: a friend's friend's grudge is under what sticks.
    expect(standingOf(state, 'friend2', RULES, 1, T0).grudge).toBeLessThan(RULES.memory.heardAt);
    expect(of('friend2')).toEqual([]);
    // Robbed again: one memory, twice over, the eddies added up, and hers to bring up again.
    recalled(state, 'rosa', of('rosa')[0]!);
    expect(of('rosa')[0]?.said).toBe(1);
    applyIncident(state, pop, { at: T0 + HOUR, kind: 'robbery', victim: 'rosa', witnesses: [], district: 'heywood', took: 12 }, RULES, 1, T0 + HOUR, createRng('m2'), links);
    expect(memoriesOf(state, 'rosa', RULES.memory, 1, T0 + HOUR)).toEqual([{ kind: 'wronged', at: T0 + HOUR, what: 'robbery', amount: 42, times: 2, said: 0 }]);
    // In a mask, nobody remembers anything of the player, until someone who was there sees it again.
    const masked = freshSociety();
    applyIncident(masked, pop, { at: T0, kind: 'insult', victim: 'rosa', witnesses: [], district: 'heywood', took: 0, mask: 'nami-balaclava', where: 'x' }, RULES, 1, T0, createRng('m3'), links);
    expect(masked.memories).toEqual({});
    pinIncident(masked, pop, 1, RULES, 1, T0 + 5 * HOUR, createRng('m4'), links);
    expect(memoriesOf(masked, 'rosa', RULES.memory, 1, T0 + 5 * HOUR)).toEqual([{ kind: 'wronged', at: T0, what: 'insult', times: 1, said: 0 }]);
  });

  it('brings up the strongest, freshest memory, each only so often, and forgets each kind on its own clock', () => {
    const state = freshSociety();
    const rules = RULES.memory;
    remember(state, 'rosa', { kind: 'gift', at: T0, what: 'taco' }, rules, 1, T0);
    remember(state, 'rosa', { kind: 'asked', at: T0, about: 'mateo' }, rules, 1, T0);
    // A gift outweighs a question.
    expect(recall(state, 'rosa', rules, 1, T0)?.kind).toBe('gift');
    recalled(state, 'rosa', recall(state, 'rosa', rules, 1, T0)!);
    // Brought up as often as it bears, it gives way to the next.
    expect(recall(state, 'rosa', rules, 1, T0)?.kind).toBe('asked');
    recalled(state, 'rosa', recall(state, 'rosa', rules, 1, T0)!);
    expect(recall(state, 'rosa', rules, 1, T0)).toBeNull();
    // A grievance is brought up again and again, up to its count.
    remember(state, 'rosa', { kind: 'wronged', at: T0, what: 'insult' }, rules, 1, T0);
    for (let i = 0; i < rules.repeat.wronged; i++) {
      const m = recall(state, 'rosa', rules, 1, T0);
      expect(m?.kind).toBe('wronged');
      recalled(state, 'rosa', m!);
    }
    expect(recall(state, 'rosa', rules, 1, T0)).toBeNull();
    // A gift is gone in a week, being wronged in a month; sped up sixty times, a month is half a day.
    expect(memoriesOf(state, 'rosa', rules, 1, T0 + 8 * DAY).map((m) => m.kind)).toEqual(['wronged']);
    expect(memoriesOf(state, 'rosa', rules, 1, T0 + 31 * DAY)).toEqual([]);
    expect(memoriesOf(state, 'rosa', rules, 60, T0 + 13 * HOUR)).toEqual([]);
    // Past the cap the weakest goes, never what just happened.
    const full = freshSociety();
    for (let i = 0; i < rules.cap; i++) remember(full, 'rosa', { kind: 'asked', at: T0 + i, about: `p${i}` }, rules, 1, T0 + i);
    remember(full, 'rosa', { kind: 'wronged', at: T0 + 100, what: 'robbery', amount: 5 }, rules, 1, T0 + 100);
    remember(full, 'rosa', { kind: 'asked', at: T0 + 200, about: 'last' }, rules, 1, T0 + 200);
    const kept = memoriesOf(full, 'rosa', rules, 1, T0 + 200);
    expect(kept).toHaveLength(rules.cap);
    expect(kept[0]).toMatchObject({ kind: 'asked', about: 'last' });
    expect(kept.some((m) => m.kind === 'wronged')).toBe(true);
    // People the city no longer has are forgotten, and so is anything about them.
    forgetMemories(full, new Set(['rosa', 'p5']));
    expect(memoriesOf(full, 'rosa', rules, 1, T0 + 200).map((m) => m.about ?? m.kind).sort()).toEqual(['p5', 'wronged']);
  });

  it('passes a good word to the people closest to someone the player was good to', () => {
    const state = freshSociety();
    const heard = passGoodWord(state, pop, pop.people[0] as Person, 10, RULES, 1, T0);
    // Her husband, her cousin and her friend are close enough to hear it; her coworker isn't.
    expect(heard.sort()).toEqual(['cousin', 'friend', 'mateo']);
    expect(standingOf(state, 'mateo', RULES, 1, T0).rapport).toBe(Math.round(10 * RULES.memory.goodWord * RULES.closeness.spouse));
    expect(standingOf(state, 'coworker', RULES, 1, T0).rapport).toBe(0);
    expect(memoriesOf(state, 'mateo', RULES.memory, 1, T0)).toEqual([{ kind: 'goodWord', at: T0, about: 'rosa', times: 1, said: 0 }]);
  });

  it('replaces what the player knew of a tie when they hear it changed', () => {
    const state = freshSociety();
    learnLink(state, 'rosa', 'friend', 'friend', 'told', T0);
    // A falling out: they aren't anything to each other now.
    expect(relearnLink(state, 'rosa', 'friend', 'none', 'told', T0 + 1)).toBe(true);
    expect(webOf(state, 'rosa')).toEqual([]);
    // Getting together, then marrying.
    expect(relearnLink(state, 'rosa', 'cousin', 'partner', 'told', T0 + 2)).toBe(true);
    expect(linkOf(state, 'cousin', 'rosa')?.kind).toBe('partner');
    expect(relearnLink(state, 'cousin', 'rosa', 'spouse', 'told', T0 + 3)).toBe(true);
    expect(relearnLink(state, 'rosa', 'cousin', 'spouse', 'told', T0 + 4)).toBe(false);
    expect(linkOf(state, 'rosa', 'cousin')).toMatchObject({ kind: 'spouse', at: T0 + 3 });
  });

  it('reads a mask as a threat, if it is a gang doing the reading', () => {
    const state = freshSociety();
    const mateo = person('mateo', { gang: 'valentinos' });
    expect(attitude(mateo, state, RULES, 1, T0, true)).toBe(attitude(mateo, state, RULES, 1, T0) - RULES.mask.turf);
    expect(stanceOf(attitude(mateo, state, RULES, 1, T0), RULES)).toBe('neutral');
    expect(stanceOf(attitude(mateo, state, RULES, 1, T0, true), RULES)).toBe('cold');
    expect(attitude(person('rosa'), state, RULES, 1, T0, true)).toBe(attitude(person('rosa'), state, RULES, 1, T0));
  });
});
