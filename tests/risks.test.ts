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
import { freshDealing, type DealingRules, type DealingState, type DealState } from '../src/engine/dealing';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, type Clock, type Spot } from '../src/engine/people';
import { chargesFor, freshPolice, type PoliceContent } from '../src/engine/police';
import type { Progress } from '../src/engine/save';
import type { Location } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NIGHT = Date.UTC(2077, 9, 13, 22, 0);
/** The NCPD where everyone calls, and nobody leaves it to anyone else. */
const CALLING: PoliceContent = { ...POLICE, districts: Object.fromEntries(Object.entries(POLICE.districts).map(([d, how]) => [d, how && { ...how, call: 10 }])), areas: {}, caller: { ...POLICE.caller, crowd: 0, most: 1 } };
const rulesWith = (dealing: DealingRules = DEALING, police: PoliceContent = POLICE): GameRules => ({ ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, dealing, trading: TRADING, police });
/** Dealing with nothing going wrong at the corner but what a test says. */
const calm = (bad: Partial<DealingRules['bad']> = {}): DealingRules => ({ ...DEALING, bad: { ...DEALING.bad, robber: 0, undercover: 0, seen: 0, snitch: { ...DEALING.bad.snitch, base: 0, pushed: 0, turned: 0 }, ...bad } });

const connect = population.people.find((p) => p.gang === 'tyger_claws' && p.job.role === 'lieutenant')!;
const corner = Object.values(world.locations).find((l) => DEALING.gangs.tyger_claws!.spots!.includes(l.name))!;
const dealing = (extra: Partial<DealState> = {}): DealingState => ({ ...freshDealing(), current: { gang: 'tyger_claws', connect: connect.id, rung: 0, trust: 0, corner: corner.id, front: null, debt: 0, debtAt: NIGHT, collectAt: null, collections: 0, fronts: 0, sold: 0, take: 0, customers: {}, block: { key: -1, served: 0 }, ...extra } });
const at = (spot: Spot, extra: Partial<Progress> = {}): Progress => {
  const place = world.locations[spot.id] as Location;
  return { where: { ...streetSpot(place), place: place.id }, visited: [], discovered: [], explored: [], eddies: 0, passUntil: 0, trip: null, inside: null, items: [], gear: null, money: { bills: 300, coins: 0, account: 0 }, energy: null, inebriation: null, society: null, charisma: null, job: null, life: null, ...extra };
};
const atCorner = (extra: Partial<Progress> = {}) => at({ kind: 'location', id: corner.id }, { dealing: dealing(), ...extra });
const doses = (drug: string, count: number): Progress['items'][number] => ({ id: drug, kind: 'consumable', name: DEALING.drugs[drug]!.name, count, in: 'jacket' });
const play = (rules: GameRules, progress: Progress, now = NIGHT) => {
  const game = new Game(world, rules, progress);
  game.start(now);
  return game;
};
const carried = (game: Game, drug: string) => game.inventory.filter((i) => i.id === drug).reduce((n, i) => n + i.count, 0);
/** The first buyer through, over a few blocks if need be. */
const firstUp = (game: Game, from = NIGHT) => {
  for (let n = 0; n < 6; n++) {
    const t = from + n * 3 * 3_600_000 / TRAVEL.timeScale;
    if (game.walkUp(t) && game.dealMoment(t)) return t;
  }
  return null;
};

describe('the NCPD and what the player carries', () => {
  it('charges a drug a dose: possession for the illegal ones, dealing for a dealer\'s weight of any', () => {
    const one = chargesFor([], POLICE, { possession: 1 });
    const twelve = chargesFor([], POLICE, { possession: 12, dealing: 12 });
    expect(one.crimes).toEqual(['possession']);
    expect(twelve.crimes).toEqual(['dealing', 'possession']);
    expect(twelve.fine).toBeGreaterThan(one.fine * 4);
    expect(twelve.hold).toBeGreaterThan(POLICE.crimes.murder.hold);
  });

  it('searches the player whenever officers have them: takes what is charged, and the gang still wants paying', () => {
    const police = { ...freshPolice(), confront: { officers: population.people.filter((p) => /^NCPD /.test(p.job.role)).slice(0, 2).map((p) => p.id), crime: 'assault' as const, why: 'scene' as const, at: NIGHT } };
    const game = play(rulesWith(), atCorner({ police, items: [doses('glitter', 12)], money: { bills: 5000, coins: 0, account: 0 }, dealing: dealing({ front: { drug: 'glitter', doses: 12, owed: 100, paid: 0, at: NIGHT, due: NIGHT + 10 * 3_600_000 } }) }));
    const sub = game.police(NIGHT).confront!.choices.find((c) => c.id === 'comply')!.sub;
    const charges = chargesFor(['assault'], POLICE, { possession: 12, dealing: 12 });
    expect(sub).toBe(`${charges.fine} €$ · ${charges.hold} min`);
    game.answerPolice('comply', NIGHT);
    expect(carried(game, 'glitter')).toBe(0);
    expect(game.wallet.eddies).toBe(5000 - charges.fine);
    expect(game.police(NIGHT).held).toBe(NIGHT + (charges.hold * 60_000) / TRAVEL.timeScale);
    expect(game.dealing(NIGHT)!.front!.left).toBe(100);
  });

  it('leaves a little of a legal drug alone, and lets someone with nothing on them go', () => {
    const officers = population.people.filter((p) => /^NCPD /.test(p.job.role)).slice(0, 2).map((p) => p.id);
    const game = play(rulesWith(), atCorner({ police: { ...freshPolice(), confront: { officers, crime: 'possession', why: 'search', at: NIGHT } }, items: [doses('deep-dive', 3)] }));
    expect(game.police(NIGHT).confront!.choices[0]!.sub).toBe('Pockets out');
    game.answerPolice('comply', NIGHT);
    expect(game.police(NIGHT).confront).toBeNull();
    expect(game.police(NIGHT).held).toBeNull();
    expect(carried(game, 'deep-dive')).toBe(3);
    expect(game.wallet.eddies).toBe(300);
  });

  it('has a patrol stop someone carrying now and then, more on their corner, a mask no help', () => {
    const always: PoliceContent = { ...POLICE, search: { ...POLICE.search, stop: 100 } };
    const game = play(rulesWith(calm(), always), atCorner({ items: [doses('glitter', 4)] }));
    game.tick(NIGHT + (POLICE.stop.minutes * 60_000) / TRAVEL.timeScale + 1);
    expect(game.police(NIGHT + 1).confront?.why).toBe('search');
    // Nothing on them, no stop.
    const clean = play(rulesWith(calm(), always), atCorner());
    clean.tick(NIGHT + (POLICE.stop.minutes * 60_000) / TRAVEL.timeScale + 1);
    expect(clean.police(NIGHT + 1).confront).toBeNull();
  });

  it('has a sale someone saw called in as dealing', () => {
    const game = play(rulesWith(calm({ seen: 1 }), CALLING), atCorner({ items: [doses('glitter', 10)] }));
    let reported = false;
    for (let n = 0, t = NIGHT; n < 6 && !reported; n++) {
      const up = firstUp(game, t);
      if (up === null) break;
      t = up;
      game.answerDeal('sell', t);
      reported = game.police(t).reports > 0;
    }
    expect(game.peopleHere(NIGHT).length).toBeGreaterThan(1);
    expect(reported).toBe(true);
  });
});

describe('bad customers', () => {
  it('has a robber come up like a buyer: hand it over and lose product and cash', () => {
    const game = play(rulesWith(calm({ robber: 100 })), atCorner({ items: [doses('glitter', 10)] }));
    const t = firstUp(game);
    expect(t).not.toBeNull();
    const moment = game.dealMoment(t!)!;
    expect(moment.choices.map((c) => c.id)).toEqual(['hand', 'talk', 'fight']);
    expect(moment.text).not.toMatch(/[{}]/);
    game.answerDeal('hand', t!);
    expect(carried(game, 'glitter')).toBeLessThan(10);
    expect(game.wallet.eddies).toBeLessThan(300);
  });

  it('lets the player fight a robber: a fight they started, not the player', () => {
    const game = play(rulesWith(calm({ robber: 100 })), atCorner({ items: [doses('glitter', 10)] }));
    const t = firstUp(game)!;
    game.answerDeal('fight', t);
    expect(game.fighting).toBe(true);
  });

  it('has an undercover officer pose as a buyer where the NCPD goes, and bust the player who sells to them', () => {
    const game = play(rulesWith(calm({ undercover: 100 })), atCorner({ items: [doses('glitter', 10)] }));
    const t = firstUp(game)!;
    const moment = game.dealMoment(t)!;
    expect(game.person(moment.person)?.job.role).toMatch(/^NCPD /);
    game.answerDeal('sell', t);
    const cops = game.police(t).confront!;
    expect(cops.crime).toBe('dealing');
    expect(cops.why).toBe('scene');
    // Passing on one, nothing comes of it.
    const careful = play(rulesWith(calm({ undercover: 100 })), atCorner({ items: [doses('glitter', 10)] }));
    const u = firstUp(careful)!;
    careful.answerDeal('turn', u);
    expect(careful.police(u).confront).toBeNull();
  });

  it('gives a sharp eye a tell on an undercover officer, now and then', () => {
    let told = 0;
    for (let n = 0; n < 12; n++) {
      const game = play(rulesWith(calm({ undercover: 100 })), atCorner({ items: [doses('glitter', 10)], trading: { level: 12, xp: 0 }, dealing: dealing({ sold: n }) }), NIGHT + n * 60_000);
      const t = firstUp(game, NIGHT + n * 60_000);
      const text = t === null ? '' : game.dealMoment(t)!.text;
      if (DEALING.lines.tell.some((line) => text.includes(line.split('{')[0]!.trim().slice(0, 18)))) told++;
    }
    expect(told).toBeGreaterThan(0);
  });

  it('has a buyer call it in after now and then, with the player\'s face: a warrant', () => {
    const snitching = calm({ snitch: { base: 100, pushed: 0, turned: 0, regular: 1 } });
    const game = play(rulesWith(snitching, CALLING), atCorner({ items: [doses('glitter', 10)] }));
    const t = firstUp(game)!;
    const buyer = game.person(game.dealMoment(t)!.person)!;
    game.answerDeal('sell', t);
    if (buyer.gang) return;
    expect(game.police(t).reports).toBe(1);
    expect(game.police(t).warrants.map((w) => w.crime)).toContain('dealing');
    // Not told: the player doesn't know a unit is coming.
    expect(game.police(t).dispatch).toBeNull();
  });

  it('lets a regular short of the price put the rest on tab, and settle it next time, or not', () => {
    // Every customer a regular already, and everyone short.
    const regular = (id: string) => ({ [id]: { bought: 5, last: 0 } });
    const outcomes = new Set<string>();
    for (let n = 0; n < 30 && outcomes.size < 2; n++) {
      const probe = play(rulesWith(calm()), atCorner({ items: [doses('glitter', 10)], dealing: dealing({ sold: n }) }), NIGHT + n * 60_000);
      const t0 = firstUp(probe, NIGHT + n * 60_000);
      if (t0 === null) continue;
      const who = probe.dealMoment(t0)!.person;
      const person = probe.person(who)!;
      const ask = Number(probe.dealMoment(t0)!.choices[0]!.sub!.split(' ')[0]);
      // Make them short, and a regular.
      person.eddies = Math.ceil(ask * 0.7);
      const game = play(rulesWith(calm()), atCorner({ items: [doses('glitter', 10)], dealing: dealing({ sold: n, customers: regular(who) }), life: { ...probe.lifeSaved, eddies: { ...probe.lifeSaved.eddies, [who]: person.eddies } } }), NIGHT + n * 60_000);
      const t = firstUp(game, NIGHT + n * 60_000);
      const moment = t === null ? null : game.dealMoment(t);
      if (!moment || moment.person !== who || !moment.choices.some((c) => c.id === 'tab')) continue;
      game.answerDeal('tab', t!);
      const tab = game.dealingSaved.current!.customers[who]!.tab!;
      expect(tab).toBeGreaterThan(0);
      outcomes.add('tab');
    }
    expect(outcomes.has('tab')).toBe(true);
  });
});
