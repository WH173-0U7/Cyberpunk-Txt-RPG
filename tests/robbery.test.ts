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
import { ROBBERY } from '../src/data/robbery';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { sumNotes, takeFrom } from '../src/engine/money';
import { generatePeople, peopleAt, type Clock, type Person } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { fearBand, fearOf, respond, searchOdds, type FearContext, type RobberyRules } from '../src/engine/robbery';
import type { Progress } from '../src/engine/save';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
/** A weekday at noon: storefronts open, people about. */
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const MINUTE = 60_000 / TRAVEL.timeScale;

/** A stranger of ordinary nerve, bare hands against bare hands, nobody else about. */
const STRANGER: FearContext = { drawn: 'none', chrome: false, edge: 0, armed: false, masked: false, dread: null, courage: 0.5, backup: 0, watching: 0, turf: false, officer: false, hurt: false, drunk: false };
const fear = (ctx: Partial<FearContext>) => fearOf({ ...STRANGER, ...ctx }, ROBBERY);
const CALM = { courage: 0, temper: 0, greed: 0 };

/** Robbery by fear, with a fear fixed by its base (everything else as it is), and the search's odds fixed if said. */
const fixed = (base: number, search?: number): RobberyRules => ({
  ...ROBBERY,
  fear: { ...ROBBERY.fear, base },
  ...(search !== undefined ? { search: { ...ROBBERY.search, least: search, most: search } } : {}),
});
const rulesWith = (robbery?: RobberyRules): GameRules => ({
  ...TRAVEL,
  energy: ENERGY,
  food: FOOD,
  inebriation: INEBRIATION,
  people: PEOPLE,
  society: SOCIETY,
  lines: LINES,
  charisma: CHARISMA,
  gear: GEAR,
  money: MONEY,
  jobs: JOBS,
  life: LIFE,
  combat: COMBAT,
  clock: clockOf,
  ...(robbery ? { robbery } : {}),
});
const lexington: Progress['items'][number] = { id: 'lexington-1', kind: 'weapon', weapon: 'lexington', name: 'M-10AF Lexington', count: 1, in: 'jacket', loaded: 20 };
const balaclava: Progress['items'][number] = { id: 'clothing-1', kind: 'clothing', gear: 'nami-balaclava', name: 'Nami balaclava', count: 1, in: 'jacket' };
const progressAt = (b: Building, extra: Partial<Progress> = {}): Progress => ({
  where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id },
  visited: [],
  discovered: [],
  explored: [],
  eddies: 0,
  passUntil: 0,
  trip: null,
  inside: b.id,
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
/** A storefront with a few people in it at noon, none of them an officer or in a gang, and one with cash on them. */
const shop = world.buildings.find((b) => {
  if (!b.business || b.kind !== 'shops') return false;
  const here = peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out);
  return here.length >= 2 && here.every((p) => !p.person.job.role.startsWith('NCPD') && !p.person.gang) && here.some((p) => p.person.eddies >= 40);
})!;
/** A game in the shop, and the one with the most cash on them, of the nature given. */
const play = (robbery: RobberyRules | undefined, traits: Partial<Person['traits']> = {}, extra: Partial<Progress> = {}) => {
  const game = new Game(world, rulesWith(robbery), progressAt(shop, extra));
  game.start(NOON);
  const victim = game.peopleHere(NOON).map((p) => p.person).sort((a, b) => b.eddies - a.eddies)[0]!;
  Object.assign(victim.traits, traits);
  return { game, victim };
};

describe('fear', () => {
  it('reads off what the player pulls and who they are', () => {
    // Bare hands against an ordinary stranger: not much.
    expect(fear({})).toBeCloseTo(0.25);
    expect(fear({ drawn: 'gun' })).toBeGreaterThan(fear({ drawn: 'blade' }));
    expect(fear({ drawn: 'blade' })).toBeGreaterThan(fear({ drawn: 'blunt' }));
    expect(fear({ drawn: 'blunt' })).toBeGreaterThan(fear({}));
    expect(fear({ chrome: true })).toBeGreaterThan(fear({}));
    expect(fear({ masked: true })).toBeGreaterThan(fear({}));
    // What they know the player for: a killing worst.
    expect(fear({ dread: 'murder' })).toBeGreaterThan(fear({ dread: 'assault' }));
    expect(fear({ dread: 'assault' })).toBeGreaterThan(fear({ dread: 'robbed' }));
    // Being better with it counts, up to a point, and worse counts against.
    expect(fear({ edge: 3 })).toBeGreaterThan(fear({}));
    expect(fear({ edge: 99 })).toBe(fear({ edge: ROBBERY.fear.levels }));
    expect(fear({ edge: -3, drawn: 'gun' })).toBeLessThan(fear({ drawn: 'gun' }));
    // Their own nerve, their own weapon, their people, a crowd, their turf: all take it back.
    expect(fear({ drawn: 'gun', courage: 1 })).toBeLessThan(fear({ drawn: 'gun', courage: 0 }));
    expect(fear({ drawn: 'gun', armed: true })).toBeLessThan(fear({ drawn: 'gun' }));
    expect(fear({ drawn: 'gun', backup: 1 })).toBeLessThan(fear({ drawn: 'gun' }));
    expect(fear({ drawn: 'gun', backup: 99 })).toBe(fear({ drawn: 'gun', backup: ROBBERY.fear.backup.most / ROBBERY.fear.backup.each }));
    expect(fear({ drawn: 'gun', watching: 99 })).toBe(fear({ drawn: 'gun', watching: ROBBERY.fear.watching.most / ROBBERY.fear.watching.each }));
    expect(fear({ drawn: 'gun', turf: true })).toBeLessThan(fear({ drawn: 'gun' }));
    // A hurt or a drunk robber is less to be afraid of; an officer isn't afraid of a mugger at all.
    expect(fear({ drawn: 'gun', hurt: true })).toBeLessThan(fear({ drawn: 'gun' }));
    expect(fear({ drawn: 'gun', drunk: true })).toBeLessThan(fear({ drawn: 'gun' }));
    expect(fear({ drawn: 'gun', officer: true })).toBe(0);
    // Always 0 to 1.
    expect(fear({ drawn: 'gun', chrome: true, masked: true, dread: 'murder', edge: 5, courage: 0 })).toBe(1);
  });

  it('shows as a word, the most afraid first', () => {
    expect(fearBand(1, ROBBERY)).toBe('Terrified');
    expect(fearBand(0.7, ROBBERY)).toBe('Scared');
    expect(fearBand(0.5, ROBBERY)).toBe('Nervous');
    expect(fearBand(0.35, ROBBERY)).toBe('Uneasy');
    expect(fearBand(0, ROBBERY)).toBe('Unafraid');
  });
});

describe('what someone robbed does', () => {
  const rng = createRng('respond');

  it('hands over nothing unafraid, and the brave and the hot-tempered fight', () => {
    expect(respond(0.1, CALM, false, ROBBERY, rng)).toEqual({ kind: 'refuse', share: 0, chip: false, valuable: false });
    // Not afraid at all, and all nerve and temper: most of the time.
    expect(Array.from({ length: 100 }, () => respond(0, { courage: 1, temper: 1, greed: 0 }, false, ROBBERY, rng).kind === 'fight').filter(Boolean).length).toBeGreaterThan(60);
    // Afraid enough, nobody fights.
    for (let i = 0; i < 50; i++) expect(respond(ROBBERY.fight.below, { courage: 1, temper: 1, greed: 0 }, false, ROBBERY, rng).kind).not.toBe('fight');
    // Somewhat afraid and somewhat brave: now and then.
    const fights = Array.from({ length: 400 }, () => respond(0.05, { courage: 0.6, temper: 0.4, greed: 0 }, false, ROBBERY, rng).kind === 'fight').filter(Boolean).length;
    expect(fights).toBeGreaterThan(20);
    expect(fights).toBeLessThan(200);
  });

  it('hands over more the more afraid, the greedy less, and all of it terrified', () => {
    const nervous = respond(0.5, CALM, false, ROBBERY, rng);
    expect(nervous.kind).toBe('hand');
    expect(nervous.share).toBeCloseTo((0.5 - ROBBERY.hand.from) / (ROBBERY.hand.to - ROBBERY.hand.from));
    expect(respond(0.7, CALM, false, ROBBERY, rng).share).toBeGreaterThan(nervous.share);
    expect(respond(0.5, { ...CALM, greed: 1 }, false, ROBBERY, rng).share).toBeCloseTo(nervous.share * (1 - ROBBERY.hand.greed));
    expect(respond(0.95, CALM, true, ROBBERY, rng)).toEqual({ kind: 'hand', share: 1, chip: true, valuable: true });
  });

  it('gives up the chip and a valuable only afraid enough, the greedy and jewellery needing more', () => {
    expect(respond(0.5, CALM, false, ROBBERY, rng)).toMatchObject({ chip: false, valuable: false });
    expect(respond(ROBBERY.chip.at, CALM, false, ROBBERY, rng).chip).toBe(true);
    expect(respond(ROBBERY.chip.at, { ...CALM, greed: 1 }, false, ROBBERY, rng).chip).toBe(false);
    expect(respond(ROBBERY.valuable.at, CALM, false, ROBBERY, rng).valuable).toBe(true);
    expect(respond(ROBBERY.valuable.at, CALM, true, ROBBERY, rng).valuable).toBe(false);
  });

  it('lets itself be searched by fear, against nerve, never sure either way', () => {
    expect(searchOdds(0.5, 0, ROBBERY)).toBeCloseTo(0.6);
    expect(searchOdds(0.5, 1, ROBBERY)).toBeLessThan(searchOdds(0.5, 0, ROBBERY));
    expect(searchOdds(1, 0, ROBBERY)).toBe(ROBBERY.search.most);
    expect(searchOdds(0, 1, ROBBERY)).toBe(ROBBERY.search.least);
  });

  it('hands over the small notes up to what they mean to give, and not a note more', () => {
    const purse = { notes: { '50': 1, '20': 1, '10': 1, '5': 2 }, coins: 3 };
    const { taken, left } = takeFrom(purse, 30, true, true);
    expect(taken).toEqual({ notes: { '5': 2, '10': 1 }, coins: 3 });
    expect(left).toEqual({ notes: { '50': 1, '20': 1 }, coins: 0 });
    // A single big note and a small share: nothing at all.
    expect(sumNotes(takeFrom({ notes: { '50': 1 }, coins: 0 }, 30, true, true).taken.notes)).toBe(0);
    // Without it, as before: the note that takes it over goes too.
    expect(sumNotes(takeFrom({ notes: { '50': 1 }, coins: 0 }, 30, true).taken.notes)).toBe(50);
  });
});

describe('robbery by fear', () => {
  it('reads fear on someone here, more with a gun and a mask, and not without the rules', () => {
    const bare = play(ROBBERY);
    const armed = play(ROBBERY, {}, { items: [lexington] });
    const read = bare.game.fear(bare.victim.id, NOON)!;
    expect(read).not.toBeNull();
    expect(read.label).toBe(fearBand(read.value, ROBBERY));
    expect(armed.game.fear(armed.victim.id, NOON)!.value).toBeGreaterThan(read.value);
    const masked = play(ROBBERY, {}, { items: [lexington, balaclava] });
    expect(masked.game.wear('clothing-1', NOON)).toBe(true);
    expect(masked.game.fear(masked.victim.id, NOON)!.value).toBeGreaterThan(armed.game.fear(armed.victim.id, NOON)!.value);
    const without = play(undefined);
    expect(without.game.fear(without.victim.id, NOON)).toBeNull();
  });

  it('takes everything off someone terrified', () => {
    const { game, victim } = play(fixed(2), CALM);
    expect(game.fear(victim.id, NOON)!.label).toBe('Terrified');
    const before = victim.eddies;
    expect(game.rob(victim.id, NOON)).toBe(true);
    expect(victim.eddies).toBe(0);
    expect(game.wallet.eddies).toBe(before);
  });

  it("takes the small notes off someone nervous, who swears that's all, and the rest can be gone after", () => {
    const { game, victim } = play(fixed(0.65, 1), CALM);
    const { value } = game.fear(victim.id, NOON)!;
    const share = (value - ROBBERY.hand.from) / (ROBBERY.hand.to - ROBBERY.hand.from);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThan(1);
    const before = victim.eddies;
    expect(game.rob(victim.id, NOON)).toBe(true);
    const handed = before - victim.eddies;
    expect(game.wallet.eddies).toBe(handed);
    // Never more than they meant to give; something kept back.
    expect(handed).toBeLessThanOrEqual(Math.round(before * share));
    expect(victim.eddies).toBeGreaterThan(0);
    expect(game.conversation(victim.id).some((l) => l.who === 'them')).toBe(true);
    // Gone after within the minutes, with odds made sure: everything left.
    expect(game.canSearch(victim.id, NOON + MINUTE)).toBe(true);
    expect(game.search(victim.id, NOON + MINUTE)).toBe(true);
    expect(victim.eddies).toBe(0);
    expect(game.wallet.eddies).toBe(before);
    // Once.
    expect(game.canSearch(victim.id, NOON + 2 * MINUTE)).toBe(false);
  });

  it('can be searched only in the minutes after', () => {
    const { game, victim } = play(fixed(0.65, 1), CALM);
    game.rob(victim.id, NOON);
    expect(game.canSearch(victim.id, NOON + (ROBBERY.search.minutes + 1) * MINUTE)).toBe(false);
    expect(game.search(victim.id, NOON + (ROBBERY.search.minutes + 1) * MINUTE)).toBe(false);
  });

  it('keeps the chip back unless afraid enough, and a search finds it', () => {
    const { game, victim } = play(fixed(0.55, 1), CALM);
    victim.chip = 120;
    expect(game.fear(victim.id, NOON)!.value).toBeLessThan(ROBBERY.chip.at);
    game.rob(victim.id, NOON);
    expect(victim.chip).toBe(120);
    expect(game.inventory.some((i) => i.kind === 'credchip')).toBe(false);
    game.search(victim.id, NOON + MINUTE);
    expect(victim.chip).toBe(0);
    expect(game.inventory.find((i) => i.kind === 'credchip')).toMatchObject({ balance: 120, locked: true });
  });

  it("is turned down by the unafraid, who aren't robbed for it, and can be searched for the lot", () => {
    const { game, victim } = play(fixed(-1, 1), CALM);
    const before = victim.eddies;
    game.rob(victim.id, NOON);
    expect(victim.eddies).toBe(before);
    expect(game.wallet.eddies).toBe(0);
    expect(game.fighting).toBe(false);
    expect(game.canSearch(victim.id, NOON + MINUTE)).toBe(true);
    game.search(victim.id, NOON + MINUTE);
    expect(victim.eddies).toBe(0);
  });

  it('pulls free of a search, or swings, by temper', () => {
    const calm = play(fixed(0.6, 0), CALM);
    calm.game.rob(calm.victim.id, NOON);
    const kept = calm.victim.eddies;
    calm.game.search(calm.victim.id, NOON + MINUTE);
    expect(calm.victim.eddies).toBe(kept);
    expect(calm.game.fighting).toBe(false);
    const hot = play({ ...fixed(0.6, 0), search: { ...ROBBERY.search, least: 0, most: 0, temper: 1 } }, { ...CALM, temper: 1 });
    hot.game.rob(hot.victim.id, NOON);
    hot.game.search(hot.victim.id, NOON + MINUTE);
    expect(hot.game.fighting).toBe(true);
    expect(hot.game.fightView()!.foes[0]!.id).toBe(hot.victim.id);
  });

  it('turns into a fight with someone unafraid and brave, with nothing handed over', () => {
    const { game, victim } = play({ ...fixed(-1), fight: { ...ROBBERY.fight, courage: 1, temper: 1 } }, { courage: 1, temper: 1, greed: 0 });
    const before = victim.eddies;
    expect(game.rob(victim.id, NOON)).toBe(true);
    expect(game.fighting).toBe(true);
    expect(victim.eddies).toBe(before);
    const log = game.fightView()!.log.join(' ');
    expect(log).not.toMatch(/[{}]|undefined/);
    expect(game.canSearch(victim.id, NOON + MINUTE)).toBe(false);
  });

  it('robs as it always did without the rules', () => {
    const { game, victim } = play(undefined, CALM);
    const before = victim.eddies;
    game.rob(victim.id, NOON);
    expect(game.wallet.eddies).toBe(before - victim.eddies);
    expect(game.canSearch(victim.id, NOON + MINUTE)).toBe(false);
  });
});
