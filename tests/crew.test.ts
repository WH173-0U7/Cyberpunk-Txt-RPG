import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { DEALING } from '../src/data/dealing';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { POLICE } from '../src/data/police';
import { CHARISMA, TRADING } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { crewSize, freshRunner, frontRunner, runnerDay, runnerLeft, runnerShort, settle, writeOff, type CrewRules, type Runner, type RunnerDay } from '../src/engine/crew';
import { freshDealing, type DealingRules, type DealingState, type DealState } from '../src/engine/dealing';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, peopleAt, whereIs, type Clock, type Person } from '../src/engine/people';
import type { PoliceContent } from '../src/engine/police';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Standing } from '../src/engine/society';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const DAY = 86_400_000;
const C = DEALING.crew;
const T = TRAVEL.timeScale;
/** The crew with nothing going wrong but what a test says. */
const calm = (over: Partial<CrewRules> = {}): DealingRules => ({ ...DEALING, crew: { ...C, bust: { ...C.bust, base: 0 }, robbed: { ...C.robbed, base: 0 }, skim: { ...C.skim, greed: 2 }, use: { doses: [0, 0] }, mood: { ...C.mood, walk: 0 }, ...over } });
const rulesWith = (dealing: DealingRules = calm(), police?: PoliceContent): GameRules => ({ ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, dealing, trading: TRADING, ...(police ? { police } : {}) });

const connect = population.people.find((p) => p.gang === 'tyger_claws' && p.job.role === 'lieutenant')!;
const dealing = (rung: number, crew: DealingState['crew'] = {}, extra: Partial<DealState> = {}): DealingState => ({ ...freshDealing(), crew, current: { gang: 'tyger_claws', connect: connect.id, rung, trust: 40, corner: null, front: null, debt: 0, debtAt: NOON, collectAt: null, collections: 0, fronts: 6, sold: 60, take: 900, customers: {}, block: { key: -1, served: 0 }, ...extra } });
const friendly = (rapport: number): Standing => ({ met: true, rapport, grudge: 0, at: NOON, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} });
const societyWith = (standings: Record<string, Standing>): Progress['society'] => ({ standings, rep: {}, incidents: [], threats: [], nextId: 1, known: {}, links: {}, memories: {}, romance: null });
const doses = (drug: string, count: number): Progress['items'][number] => ({ id: drug, kind: 'consumable', name: DEALING.drugs[drug]!.name, count, in: 'jacket' });

/** A storefront with a grown-up of no gang in it at noon, somewhere the NCPD polices, with some money on them; and who. */
const { shop, recruit } = (() => {
  for (const b of world.buildings) {
    if (!b.business) continue;
    const here = peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out).map((p) => p.person);
    const one = here.find((p) => !p.gang && p.age >= 21 && p.diedOn === undefined && !/^NCPD /.test(p.job.role) && (POLICE.districts[p.district]?.call ?? 0) > 0 && p.eddies >= 200);
    if (one) return { shop: b as Building, recruit: one as Person };
  }
  throw new Error('no shop with a recruit');
})();
const inside = (b: Building, extra: Partial<Progress> = {}): Progress => ({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, visited: [], discovered: [], explored: [], eddies: 0, passUntil: 0, trip: null, inside: b.id, items: [], gear: null, money: { bills: 200, coins: 0, account: 0 }, energy: null, inebriation: null, society: null, charisma: null, job: null, life: null, ...extra });
const play = (progress: Progress, rules = rulesWith(), now = NOON) => {
  const game = new Game(world, rules, progress);
  game.start(now);
  return game;
};
const day = clockOf(NOON).day;
const onPackage = (stock: number, over: Partial<Runner> = {}): Runner => ({ ...frontRunner(freshRunner(NOON, day, C), 'glitter', stock, 18, NOON, T, C), ...over });
const ctx = (over: Partial<RunnerDay> = {}): RunnerDay => ({ day: day + 1, users: 24, trading: 4, priceFactor: 1, street: 18, call: 0, rough: 1, greed: 0.3, hooked: false, rapport: 20, ...over });

describe('a crew', () => {
  it('opens at a high enough rung, and grows with the next', () => {
    expect(crewSize(0, C)).toBe(0);
    expect(crewSize(C.from - 1, C)).toBe(0);
    expect(crewSize(C.from, C)).toBe(C.most[0]);
    expect(crewSize(C.from + 1, C)).toBe(C.most[1]);
  });

  it('has a runner owe a share of a package\'s street value, by a day', () => {
    const r = onPackage(10);
    expect(r.owed).toBe(Math.round(10 * 18 * C.owe));
    expect(r.due).toBe(NOON + (C.days * DAY) / T);
    expect(runnerLeft(r)).toBe(r.owed);
    expect(runnerShort(r, NOON)).toBe(false);
  });
});

describe('a runner\'s day', () => {
  const quiet = calm().crew;
  it('sells by the users round there and their Trading, never more than they hold', () => {
    const many = runnerDay(onPackage(50), ctx({ users: 80 }), quiet, createRng('a'));
    const few = runnerDay(onPackage(50), ctx({ users: 0 }), quiet, createRng('a'));
    expect(many.sold).toBeGreaterThan(few.sold);
    expect(many.runner.cash).toBe(many.sold * 18);
    const sharp = runnerDay(onPackage(50), ctx({ users: 24, trading: 9 }), quiet, createRng('b'));
    const dull = runnerDay(onPackage(50), ctx({ users: 24, trading: 1 }), quiet, createRng('b'));
    expect(sharp.sold).toBeGreaterThanOrEqual(dull.sold);
    const two = runnerDay(onPackage(2), ctx({ users: 200 }), quiet, createRng('c'));
    expect(two.sold).toBeLessThanOrEqual(2);
    expect(two.runner.stock).toBe(2 - two.sold);
  });

  it('can end in a cell: the product gone, held some days, and maybe the player\'s name given', () => {
    const rules = { ...quiet, bust: { ...quiet.bust, base: 10, name: 1, loyal: 0 } };
    const out = runnerDay(onPackage(10), ctx({ call: 1 }), rules, createRng('bust'));
    expect(out.runner.stock).toBe(0);
    expect(out.runner.heldTill).toBeGreaterThanOrEqual(day + 1 + C.bust.hold[0]);
    expect(out.named).toBe(true);
    expect(out.runner.news[0]?.kind).toBe('busted');
    expect(out.runner.mood).toBeLessThan(onPackage(10).mood);
    // Where nobody calls the NCPD, nobody's picked up.
    expect(runnerDay(onPackage(10), ctx({ call: 0 }), rules, createRng('bust')).runner.stock).toBeLessThan(10);
    expect(runnerDay(onPackage(10), ctx({ call: 0 }), rules, createRng('bust')).named).toBe(false);
  });

  it('can be robbed of a share of what they hold, and hurt', () => {
    const rules = { ...quiet, robbed: { ...quiet.robbed, base: 10, hurt: 1 } };
    const out = runnerDay(onPackage(10, { cash: 100 }), ctx(), rules, createRng('rob'));
    expect(out.runner.stock).toBeLessThan(10);
    expect(out.runner.cash).toBeLessThan(100);
    expect(out.hurtDays).toBeGreaterThan(0);
  });

  it('has a greedy runner skim and a hooked one use, unseen', () => {
    const greedy = runnerDay(onPackage(20), ctx({ greed: 0.9 }), { ...quiet, skim: C.skim }, createRng('skim'));
    expect(greedy.skimmed).toBeGreaterThan(0);
    expect(greedy.runner.cash).toBe(greedy.sold * 18 - greedy.skimmed);
    expect(greedy.runner.hidden).toBeGreaterThan(0);
    const hooked = runnerDay(onPackage(20), ctx({ hooked: true, users: 0 }), { ...quiet, use: { doses: [2, 2] } }, createRng('use'));
    expect(hooked.runner.stock + hooked.sold).toBe(18);
  });

  it('walks when they have had enough, now and then running off with what they hold', () => {
    const fed = { ...quiet, mood: { ...quiet.mood, walk: 1, runOff: 0 } };
    expect(runnerDay(onPackage(5, { mood: 5 }), ctx({ users: 0 }), fed, createRng('w')).walked).toBe('quit');
    const gone = { ...quiet, mood: { ...quiet.mood, walk: 1, runOff: 10 } };
    expect(runnerDay(onPackage(5, { mood: 5 }), ctx({ users: 0 }), gone, createRng('w')).walked).toBe('ran');
    expect(runnerDay(onPackage(5, { mood: 60 }), ctx({ users: 0 }), fed, createRng('w')).walked).toBeNull();
  });
});

describe('settling up', () => {
  it('hands over what they hold up to what they owe, and keeps what is over once it is all sold', () => {
    const r = onPackage(10, { stock: 0, cash: 200 });
    const out = settle(r, C);
    expect(out.handed).toBe(r.owed);
    expect(out.settled).toBe(true);
    expect(out.kept).toBe(200 - r.owed);
    expect(out.runner.fronts).toBe(1);
    expect(out.runner.owed).toBe(0);
  });

  it('leaves a runner short when what they hold will not cover it, and lets it be written off', () => {
    const r = onPackage(10, { stock: 0, cash: 30 });
    expect(runnerShort(r, NOON)).toBe(true);
    const out = settle(r, C);
    expect(out.settled).toBe(false);
    expect(runnerLeft(out.runner)).toBe(r.owed - 30);
    const off = writeOff(out.runner, C);
    expect(runnerLeft(off)).toBe(0);
    expect(off.shorted).toBe(1);
    expect(off.mood).toBeGreaterThan(out.runner.mood);
  });
});

describe('the player\'s crew', () => {
  const warmly = societyWith({ [recruit.id]: friendly(80) });
  it('is on offer only from the rung it opens at, and only to someone who likes the player', () => {
    const low = play(inside(shop, { dealing: dealing(C.from - 1), society: warmly }));
    expect(low.dealWith(recruit.id, NOON).some((o) => o.id === 'recruit')).toBe(false);
    const high = play(inside(shop, { dealing: dealing(C.from), society: warmly }));
    expect(high.dealWith(recruit.id, NOON).find((o) => o.id === 'recruit')?.sub).toBe(`0 of ${C.most[0]} runners`);
    // A stranger turns it down.
    const cold = play(inside(shop, { dealing: dealing(C.from) }), rulesWith(calm({ keen: { gang: 9, user: 9, straight: 9 } })));
    cold.deal(recruit.id, 'recruit', NOON);
    expect(cold.crew(NOON)).toEqual([]);
  });

  it('takes on someone keen enough, who runs a package the player fronts out of their pockets', () => {
    const keen = rulesWith(calm({ keen: { gang: 9, user: 9, straight: 9 } }));
    const game = play(inside(shop, { dealing: dealing(C.from), society: warmly, items: [doses('glitter', 25)] }), keen);
    expect(game.deal(recruit.id, 'recruit', NOON)).toBe(true);
    expect(game.crew(NOON).map((r) => r.id)).toEqual([recruit.id]);
    const front = game.dealWith(recruit.id, NOON).find((o) => o.id === 'crew-front:glitter:10');
    expect(front).toBeDefined();
    expect(game.deal(recruit.id, 'crew-front:glitter:10', NOON)).toBe(true);
    expect(game.inventory.filter((i) => i.id === 'glitter').reduce((n, i) => n + i.count, 0)).toBe(15);
    const view = game.crew(NOON)[0]!;
    expect(view).toMatchObject({ drug: 'Glitter', stock: 10, short: false });
    expect(view.left).toBeGreaterThan(0);
    // Days later, they've sold some, and practiced at it; settling up pays the player.
    // The tests' clock counts days unscaled.
    const later = NOON + 3 * DAY;
    game.tick(later);
    const after = game.crew(later)[0]!;
    expect(after.stock).toBeLessThan(10);
    expect(after.cash).toBeGreaterThan(0);
    expect(game.dealingSaved.dealt[recruit.id]).toBe(10 - after.stock);
    // Wherever they are that day, the player finds them there.
    const before = game.wallet.eddies;
    let when = later;
    while (!whereIs(recruit, world, clockOf(when), FOOD.dishes, PEOPLE.out)) when += 3_600_000;
    const spot = whereIs(recruit, world, clockOf(when), FOOD.dishes, PEOPLE.out)!.spot;
    const there = spot.kind === 'building' ? inside(world.buildings.find((b) => b.id === spot.id)!) : { ...inside(shop), where: { ...streetSpot(world.locations[spot.id]!), place: spot.id }, inside: null };
    const back = play({ ...there, dealing: game.dealingSaved, society: game.societySaved, life: game.lifeSaved, money: { bills: before, coins: 0, account: 0 } }, keen, when);
    expect(back.deal(recruit.id, 'crew-collect', when)).toBe(true);
    expect(back.wallet.eddies).toBeGreaterThan(before);
  });

  it('hears when a runner is picked up, and has the player\'s name on a warrant when they talk', () => {
    const police: PoliceContent = { ...POLICE, districts: Object.fromEntries(Object.entries(POLICE.districts).map(([d, how]) => [d, how && { ...how, call: 1 }])), areas: {} };
    const busting = rulesWith(calm({ bust: { ...C.bust, base: 10, name: 1, loyal: 0 } }), police);
    const runner = onPackage(10);
    const game = play(inside(shop, { dealing: dealing(C.from, { [recruit.id]: runner }), society: warmly }), busting);
    const said: string[] = [];
    game.events.on('output', (m) => said.push(m.text));
    game.tick(NOON + 1.2 * DAY);
    expect(game.crew(NOON + 1.2 * DAY)[0]?.stock).toBe(0);
    expect(game.police(NOON + 1.2 * DAY).warrants.some((w) => w.crime === 'dealing')).toBe(true);
    expect(said.some((t) => /picked up|searched|cell/.test(t))).toBe(true);
    expect(said.some((t) => /name/.test(t))).toBe(true);
  });

  it('has a short runner leaned on or let off, and keeps them through a save', () => {
    const short = onPackage(10, { stock: 0, cash: 0, due: NOON - 1 });
    const leaning = rulesWith(calm({ lean: { ...C.lean, base: 1, most: 1 } }));
    const progress = inside(shop, { dealing: dealing(C.from, { [recruit.id]: short }), society: warmly });
    const game = play(progress, leaning);
    const options = game.dealWith(recruit.id, NOON).map((o) => o.id);
    expect(options).toContain('crew-lean');
    expect(options).toContain('crew-slide');
    const owed = runnerLeft(short);
    expect(recruit.eddies).toBeGreaterThanOrEqual(owed);
    expect(game.deal(recruit.id, 'crew-lean', NOON)).toBe(true);
    expect(game.crew(NOON)[0]?.left ?? 0).toBe(0);
    const slid = play(progress, leaning);
    expect(slid.deal(recruit.id, 'crew-slide', NOON)).toBe(true);
    expect(slid.crew(NOON)[0]!.left).toBe(0);
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, 0, NOON))))!;
    expect(new Game(world, leaning, resume(world, save)!).dealingSaved.crew).toEqual(game.dealingSaved.crew);
  });
});

describe('the lines of a crew', () => {
  it('has three or more of each, filled for anyone', () => {
    const vars: Record<string, string> = { who: 'Kenji', Who: 'Kenji', he: 'he', He: 'He', his: 'his', him: 'him', drug: 'Glitter', doses: '10', cash: '40' };
    for (const [key, pool] of Object.entries(C.lines)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3);
      for (const text of pool) expect(text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`), `${key}: ${text}`).not.toMatch(/[{}]/);
    }
  });
});
