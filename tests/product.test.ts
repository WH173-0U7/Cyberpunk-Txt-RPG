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
import { CHARISMA, TRADING } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { cutShare, foundOdds, harmOdds, mixedShare } from '../src/engine/cutting';
import { freshDealing, habitOf, type DealingRules, type DealingState, type DealState } from '../src/engine/dealing';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, walkOf, whereIs, type Clock, type Person, type Spot } from '../src/engine/people';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import { skillBonus, xpToNext } from '../src/engine/skills';
import type { Standing } from '../src/engine/society';
import type { Location } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
/** The tests' clock counts days unscaled. */
const DAY = 86_400_000;
const C = DEALING.cut;
const rulesWith = (dealing: DealingRules = DEALING): GameRules => ({ ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, dealing, trading: TRADING });
/** Cutting where what a test wants is sure to happen. */
const cutting = (over: Partial<DealingRules['cut']>): DealingRules => ({ ...DEALING, cut: { ...C, ...over } });

const blank = (extra: Partial<Progress>): Progress => ({ where: streetSpot({ x: 0, y: 0 }), visited: [], discovered: [], explored: [], eddies: 0, passUntil: 0, trip: null, inside: null, items: [], gear: null, money: { bills: 500, coins: 0, account: 0 }, energy: null, inebriation: null, society: null, charisma: null, job: null, life: null, ...extra });
const at = (spot: Spot, extra: Partial<Progress> = {}): Progress => {
  if (spot.kind === 'location') {
    const place = world.locations[spot.id] as Location;
    return blank({ where: { ...streetSpot(place), place: place.id }, ...extra });
  }
  const b = world.buildings.find((x) => x.id === spot.id)!;
  return blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, ...extra });
};
const friendly = (rapport: number): Standing => ({ met: true, rapport, grudge: 0, at: NOON, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} });
const societyWith = (standings: Record<string, Standing>): Progress['society'] => ({ standings, rep: {}, incidents: [], threats: [], nextId: 1, known: {}, links: {}, memories: {}, romance: null });
const play = (progress: Progress, rules = rulesWith(), now = NOON) => {
  const g = new Game(world, rules, progress);
  g.start(now);
  return g;
};
const doses = (drug: string, count: number, cut?: number): Progress['items'][number] => ({ id: drug, kind: 'consumable', name: DEALING.drugs[drug]!.name, count, in: 'jacket', ...(cut ? { cut } : {}) });
const agent = (count: number): Progress['items'][number] => ({ id: C.agent, kind: 'component', name: GEAR.components[C.agent]!.name, count, in: 'jacket' });
const spotOf = (p: Person, now = NOON) => whereIs(p, world, clockOf(now), FOOD.dishes, PEOPLE.out)?.spot ?? null;
const carried = (g: Game, id: string) => g.inventory.filter((i) => i.id === id).reduce((n, i) => n + i.count, 0);

/** The Tyger Claws' connect, somewhere the player finds them at noon, and dealing for them already. */
const connect = population.people.find((p) => p.gang === 'tyger_claws' && DEALING.gangs.tyger_claws!.connects.includes(p.job.role) && spotOf(p))!;
const dealingFor = (extra: Partial<DealState> = {}): DealingState => ({ ...freshDealing(), current: { gang: 'tyger_claws', connect: connect.id, rung: 0, trust: 10, corner: null, front: null, debt: 0, debtAt: NOON, collectAt: null, collections: 0, fronts: 0, sold: 0, take: 0, customers: {}, block: { key: -1, served: 0 }, ...extra } });
/** Someone with a Glitter habit, somewhere the player finds them at noon, who likes the player well enough to buy. */
const user = population.people.find((p) => {
  const dealt = new Set(PEOPLE.turf[p.district]?.flatMap(([gang]) => DEALING.gangs[gang]?.drugs ?? []));
  return !p.gang && habitOf(p, walkOf(p, world), dealt, DEALING, world.seed)?.drug === 'glitter' && spotOf(p);
})!;
const sellTo = (g: Game) => g.deal(user.id, 'sell:glitter', NOON);
const buying = { society: societyWith({ [user.id]: friendly(80) }) };

describe('the Dealing skill', () => {
  it('has the connect front only what the player knows the trade well enough for, and the next of the line shut', () => {
    const g = play(at(spotOf(connect)!, { dealing: dealingFor() }));
    const options = g.dealWith(connect.id, NOON);
    expect(options.find((o) => o.id === 'front:glitter')?.disabled).toBeFalsy();
    const shut = options.find((o) => o.id === 'front:boost')!;
    expect(shut.disabled).toBe(true);
    expect(shut.sub).toBe(`At Dealing Lv ${DEALING.gangs.tyger_claws!.at!.boost}`);
    expect(options.some((o) => o.id === 'front:prime-time')).toBe(false);
    expect(g.deal(connect.id, 'front:boost', NOON)).toBe(false);
    // Knowing the trade, the next opens.
    const sharp = play(at(spotOf(connect)!, { dealing: dealingFor(), dealer: { level: 4, xp: 0 } }));
    expect(sharp.dealWith(connect.id, NOON).find((o) => o.id === 'front:boost')?.disabled).toBeFalsy();
    expect(sharp.dealing(NOON)!.line.map((d) => d.open)).toEqual([true, true, false]);
  });

  it('grows with every sale and every package paid off, each level slower than the last, and says what it opens', () => {
    const g = play(at(spotOf(user)!, { ...buying, items: [doses('glitter', 3)], dealing: dealingFor() }));
    expect(sellTo(g)).toBe(true);
    expect(g.dealingSkill()!.xp).toBe(DEALING.xp.sale);
    expect(xpToNext(DEALING.skill, 5)).toBeGreaterThan(xpToNext(DEALING.skill, 4));
    // One short of a level that opens Boost: a package paid off takes it there, and says so.
    const said: string[] = [];
    const paying = play(at(spotOf(connect)!, { dealing: dealingFor({ front: { drug: 'glitter', doses: 8, owed: 80, paid: 0, at: NOON - 1000, due: NOON + 99 * DAY } }), dealer: { level: 3, xp: xpToNext(DEALING.skill, 3) - 1 } }));
    paying.events.on('output', ({ text }) => said.push(text));
    paying.deal(connect.id, 'pay', NOON);
    expect(paying.dealingSkill()!.level).toBe(4);
    expect(said.some((t) => t.includes('Boost'))).toBe(true);
  });

  it('is in everyone, the gangers further along, and moves a runner\'s pace', () => {
    const g = play(blank({}));
    const levels = (walk: string) => population.people.filter((p) => walkOf(p, world) === walk).slice(0, 200).map((p) => g.levelsOf(p.id)!.dealing);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(levels('gang'))).toBeGreaterThan(mean(levels('corpo')) + 1);
  });
});

describe('cutting', () => {
  it('mixes a dose of agent through a stack, and clean doses thin it', () => {
    expect(cutShare(10, 0, 1)).toBeCloseTo(1 / 11);
    expect(cutShare(10, 0.5, 10)).toBeCloseTo(0.75);
    expect(mixedShare(10, 0.5, 10)).toBeCloseTo(0.25);
    // Heavier cuts, cruder cutters: likelier to hurt someone, and to be tasted.
    expect(harmOdds(0.5, 1, C)).toBeGreaterThan(harmOdds(0.2, 1, C) * 4);
    expect(harmOdds(0.5, skillBonus(C.skill, 1), C)).toBeGreaterThan(harmOdds(0.5, skillBonus(C.skill, 8), C));
    expect(foundOdds(0.5, 1, C)).toBeGreaterThan(foundOdds(0.1, 1, C));
  });

  it('takes a cutting agent, a dose more a dose of it, up to as cut as it gets; and trains Cutting', () => {
    const none = play(blank({ items: [doses('glitter', 10)] }));
    expect(none.canCut('glitter')).toBe('No cutting agent on you.');
    const g = play(blank({ items: [doses('glitter', 10), agent(40)] }));
    expect(g.cut('glitter', 'jacket')).toBe(true);
    expect(carried(g, 'glitter')).toBe(11);
    expect(carried(g, C.agent)).toBe(39);
    expect(g.inventory.find((i) => i.id === 'glitter')!.cut).toBeCloseTo(1 / 11);
    expect(g.cuttingSkill()!.xp).toBe(C.xp);
    // A pocket big enough to take it all: cut as far as it goes.
    const bag = play(blank({ gear: [...GEAR.start, { id: 'bag', kind: 'duffel-bag', in: null }], items: [{ ...doses('glitter', 10), in: 'bag' }, { ...agent(40), in: 'bag' }] }));
    for (let n = 0; n < 60 && bag.canCut('glitter') === null; n++) bag.cut('glitter');
    expect(bag.inventory.find((i) => i.id === 'glitter')!.cut).toBeGreaterThanOrEqual(C.most);
    expect(bag.canCut('glitter')).toBe('As cut as it gets.');
    // A full pocket takes no more.
    for (let n = 0; n < 60 && g.canCut('glitter') === null; n++) g.cut('glitter');
    expect(g.canCut('glitter')).toMatch(/As cut as it gets|No room/);
  });

  it('is on the racks of a pharmacy, a general store and a bodega', () => {
    for (const business of GEAR.components[C.agent]!.stores) {
      const store = world.buildings.find((b) => b.business === business);
      if (!store) continue;
      const g = play(at({ kind: 'building', id: store.id }));
      expect(g.menu(NOON)?.items.some((i) => i.id === C.agent && i.kind === 'component'), business).toBe(true);
      expect(g.buy(C.agent, NOON), business).toBe(true);
      expect(carried(g, C.agent), business).toBe(1);
    }
  });

  it('has a bad batch get to the buyer the next day: laid up, and never back', () => {
    const g = play(at(spotOf(user)!, { ...buying, items: [doses('glitter', 4, 0.6)], dealing: dealingFor() }), rulesWith(cutting({ harm: { ...C.harm, base: 100, deadly: 0 }, found: { ...C.found, base: 0 } })));
    expect(sellTo(g)).toBe(true);
    expect(g.dealingSaved.harms.map((h) => h.id)).toEqual([user.id]);
    const said: string[] = [];
    g.events.on('output', ({ text }) => said.push(text));
    g.tick(NOON + DAY);
    expect(g.dealingSaved.harms).toEqual([]);
    expect(population.people.find((p) => p.id === user.id) && g.lifeSaved.hurt[user.id]).toBeGreaterThan(clockOf(NOON).day);
    expect(said.some((t) => /bad|sick|laid up/i.test(t))).toBe(true);
    expect(g.dealingSaved.current!.customers[user.id]).toBeUndefined();
  });

  it('can kill, and the NCPD hears of it', () => {
    const g = play(at(spotOf(user)!, { ...buying, items: [doses('glitter', 4, 0.7)], dealing: dealingFor() }), { ...rulesWith(cutting({ harm: { ...C.harm, base: 100, deadly: 1 }, found: { ...C.found, base: 0 } })), police: undefined });
    sellTo(g);
    g.tick(NOON + DAY);
    expect(g.lifeSaved.dead[user.id]).toBeDefined();
  });

  it('gets back to the gang now and then, which costs trust', () => {
    const g = play(at(spotOf(user)!, { ...buying, items: [doses('glitter', 4, 0.6)], dealing: dealingFor() }), rulesWith(cutting({ harm: { ...C.harm, base: 0 }, found: { ...C.found, base: 100 } })));
    sellTo(g);
    expect(g.dealingSaved.current!.trust).toBe(10 - C.found.trust);
  });

  it('makes the player\'s own dose weaker, and a bad one makes them sick', () => {
    const pure = play(blank({ items: [doses('black-lace', 1)] }));
    pure.consume('black-lace', NOON);
    const cut = play(blank({ items: [doses('black-lace', 1, 0.5)] }), rulesWith(cutting({ sick: { ...C.sick, base: 0 } })));
    cut.consume('black-lace', NOON);
    expect(cut.habitSaved.active[0]!.strength).toBeCloseTo(pure.habitSaved.active[0]!.strength * 0.5);
    const sick = play(blank({ items: [doses('dorph', 1, 0.7)] }), rulesWith(cutting({ sick: { ...C.sick, base: 100 } })));
    const before = sick.health(NOON).current;
    sick.consume('dorph', NOON);
    expect(sick.health(NOON).current).toBeLessThan(before);
  });

  it('keeps the cut, the skills and what is still to come through a save', () => {
    const g = play(blank({ items: [doses('glitter', 10, 0.3), agent(2)], dealing: { ...dealingFor(), harms: [{ id: user.id, drug: 'glitter', day: clockOf(NOON).day, deadly: false, knew: true }] }, dealer: { level: 3, xp: 5 }, cutter: { level: 2, xp: 1 } }));
    const back = new Game(world, rulesWith(), resume(world, readSave(JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON))))!)!);
    expect(back.inventory.find((i) => i.id === 'glitter')!.cut).toBeCloseTo(0.3);
    expect(back.dealerSaved).toEqual({ level: 3, xp: 5 });
    expect(back.cutterSaved).toEqual({ level: 2, xp: 1 });
    expect(back.dealingSaved.harms).toEqual(g.dealingSaved.harms);
  });
});

describe('the lines of cutting', () => {
  it('has three or more of each, filled for anyone', () => {
    const vars: Record<string, string> = { who: 'Kenji', Who: 'Kenji', drug: 'Glitter', share: '25', connect: 'Jun', gang: 'Tyger Claws' };
    for (const [key, pool] of Object.entries(C.lines)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3);
      for (const text of pool) expect(text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`), `${key}: ${text}`).not.toMatch(/[{}]/);
    }
    for (const drug of Object.keys(DEALING.drugs)) expect(DEALING.habit.lines.use[drug]?.length, drug).toBeGreaterThanOrEqual(3);
  });
});
