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
import { askOf, blockOf, buyersIn, canMoveUp, freshDealing, habitOf, owedFor, pushOdds, streetPrice, withInterest, type DealingState, type DealState } from '../src/engine/dealing';
import { line, type Speaker } from '../src/engine/dialogue';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, walkOf, whereIs, type Clock, type Person, type Spot } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Standing } from '../src/engine/society';
import type { Location } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const NIGHT = Date.UTC(2077, 9, 13, 22, 0);
const HOUR = 3_600_000 / TRAVEL.timeScale;
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, dealing: DEALING, trading: TRADING };

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
  money: { bills: 500, coins: 0, account: 0 },
  energy: null,
  inebriation: null,
  society: null,
  charisma: null,
  job: null,
  life: null,
  ...extra,
});
/** The player standing at a spot: inside a building, or at a place. */
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
const game = (progress: Progress, now = NOON, rules: GameRules = RULES) => {
  const g = new Game(world, rules, progress);
  g.start(now);
  return g;
};

/** Gang members in a role, somewhere the player can find them at this hour. */
const findable = (gang: string, roles: string[], now: number): Array<{ person: Person; spot: Spot }> =>
  population.people.flatMap((person) => {
    if (person.gang !== gang || !roles.includes(person.job.role)) return [];
    const where = whereIs(person, world, clockOf(now), FOOD.dishes, PEOPLE.out);
    return where ? [{ person, spot: where.spot }] : [];
  });
const connectOf = (gang: string, now = NOON) => findable(gang, DEALING.gangs[gang]!.connects, now)[0]!;

/** Dealing for a gang already, a corner and all, as a save has it. */
const dealingFor = (gang: string, extra: Partial<DealState> = {}): DealingState => {
  const connect = population.people.find((p) => p.gang === gang && DEALING.gangs[gang]!.connects.includes(p.job.role))!;
  const corner = Object.values(world.locations).find((l) => DEALING.gangs[gang]!.spots?.includes(l.name)) ?? Object.values(world.locations).find((l) => l.district === connect.district && DEALING.corner.kinds.includes(l.kind))!;
  return { ...freshDealing(), current: { gang, connect: connect.id, rung: 0, trust: 0, corner: corner.id, front: null, debt: 0, debtAt: NOON, collectAt: null, collections: 0, fronts: 0, sold: 0, take: 0, customers: {}, block: { key: -1, served: 0 }, ...extra } };
};
const cornerOf = (dealing: DealingState): Spot => ({ kind: 'location', id: dealing.current!.corner! });
const glitter = (count: number): Progress['items'][number] => ({ id: 'glitter', kind: 'consumable', name: 'Glitter', count, in: 'jacket' });

describe('who has a habit', () => {
  it('is drawn on everyone\'s own stream: some of every walk of life, adults only, the gangers most, and mostly what is dealt where they live', () => {
    const walks: Record<string, [number, number]> = {};
    const byDrug = new Map<string, Map<string, number>>();
    for (const person of population.people) {
      const walk = walkOf(person, world);
      const dealt = new Set(PEOPLE.turf[person.district]?.flatMap(([gang]) => DEALING.gangs[gang]?.drugs ?? []));
      const habit = habitOf(person, walk, dealt, DEALING, world.seed);
      expect(habitOf(person, walk, dealt, DEALING, world.seed)).toEqual(habit);
      const tally = (walks[walk] ??= [0, 0]);
      tally[1] += 1;
      if (!habit) continue;
      expect(person.age).toBeGreaterThanOrEqual(DEALING.habits.adultAt);
      expect(DEALING.drugs[habit.drug]).toBeDefined();
      expect(habit.need).toBeGreaterThan(0);
      expect(habit.need).toBeLessThanOrEqual(1);
      tally[0] += 1;
      const district = byDrug.get(person.district) ?? byDrug.set(person.district, new Map()).get(person.district)!;
      district.set(habit.drug, (district.get(habit.drug) ?? 0) + 1);
    }
    const share = (walk: string) => walks[walk]![0] / walks[walk]![1];
    expect(share('gang')).toBeGreaterThan(share('street'));
    expect(share('street')).toBeGreaterThan(share('elder'));
    // In Pacifica the Animals deal Juice; it's the likeliest thing a Pacifica user takes after what anyone takes.
    const pacifica = [...(byDrug.get('pacifica') ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).map(([drug]) => drug);
    expect(pacifica.slice(0, 3)).toContain('juice');
    // Watson's three dealing gangs: Glitter, Black Lace, Deep Dive or Phant lead there.
    const watson = [...(byDrug.get('watson') ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).map(([drug]) => drug);
    expect(['glitter', 'black-lace', 'deep-dive', 'phant']).toContain(watson[0]);
  });
});

describe('the numbers of dealing', () => {
  it('owes back less of a bigger package the higher the rung, with longer to pay', () => {
    for (let i = 1; i < DEALING.rungs.length; i++) {
      const [lower, higher] = [DEALING.rungs[i - 1]!, DEALING.rungs[i]!];
      expect(higher.front).toBeGreaterThan(lower.front);
      expect(higher.cut).toBeLessThan(lower.cut);
      expect(higher.days).toBeGreaterThanOrEqual(lower.days);
      expect(higher.at).toBeGreaterThan(lower.at);
    }
    for (const drug of Object.values(DEALING.drugs)) {
      // What's owed is always less than the package fetches on the street: there's a margin to work.
      for (const rung of DEALING.rungs) expect(owedFor(drug, rung)).toBeLessThan(streetPrice(drug, 'everyday', DEALING) * rung.front);
      expect(streetPrice(drug, 'luxury', DEALING)).toBeGreaterThan(streetPrice(drug, 'poverty', DEALING));
    }
  });

  it('prices by Trading, pushes by Trading and need, and sees more buyers at night', () => {
    expect(askOf(20, 1.2)).toBe(24);
    expect(pushOdds(8, 4, 0.5, DEALING)).toBeGreaterThan(pushOdds(2, 6, 0.5, DEALING));
    expect(pushOdds(4, 4, 1, DEALING)).toBeGreaterThan(pushOdds(4, 4, 0, DEALING));
    expect(pushOdds(40, 1, 1, DEALING)).toBeLessThanOrEqual(DEALING.push.most);
    expect(buyersIn(23, 'club', DEALING)).toBeGreaterThan(buyersIn(8, 'club', DEALING));
    expect(buyersIn(23, 'club', DEALING)).toBeGreaterThan(buyersIn(23, 'factory', DEALING));
    expect(blockOf(10, 23)).not.toBe(blockOf(11, 0));
    expect(withInterest(100, 2, DEALING)).toBe(121);
  });

  it('gives every dealing gang canon product, a connect and a collector among its own roles, and a title a rung', () => {
    for (const [gang, crew] of Object.entries(DEALING.gangs)) {
      const roles = PEOPLE.gangs[gang]!.roles;
      expect(crew.connects.every((r) => roles.includes(r)), gang).toBe(true);
      expect(crew.collectors.every((r) => roles.includes(r)), gang).toBe(true);
      expect(crew.titles).toHaveLength(DEALING.rungs.length);
      for (const drug of crew.drugs) expect(DEALING.drugs[drug], drug).toBeDefined();
      // Their corners are canon places on their own turf.
      for (const name of crew.spots ?? []) {
        const landmark = CITY.districts.flatMap((d) => (d.landmarks ?? []).map((l) => ({ ...l, district: d.id }))).find((l) => l.name === name);
        expect(landmark, name).toBeDefined();
        expect(PEOPLE.turf[landmark!.district]?.some(([g]) => g === gang), name).toBe(true);
      }
    }
  });
});

describe('getting in with a gang', () => {
  it('has anyone of theirs but a connect point the player to one, by name, and where to find them', () => {
    const soldier = findable('tyger_claws', ['foot soldier', 'biker', 'bouncer'], NOON)[0]!;
    const g = game(at(soldier.spot, { society: societyWith({ [soldier.person.id]: friendly(30) }) }));
    const ask = g.dealWith(soldier.person.id, NOON).find((o) => o.id === 'ask');
    expect(ask?.label).toBe('Deal for the Tyger Claws');
    expect(g.deal(soldier.person.id, 'ask', NOON)).toBe(true);
    // The player knows a connect's name now, and nobody's dealing yet.
    const named = g.knownPeople().filter((p) => p.gang === 'tyger_claws' && DEALING.gangs.tyger_claws!.connects.includes(p.job.role));
    expect(named.length).toBeGreaterThan(0);
    expect(g.describe(named[0]!.id, NOON)?.named).toBe(true);
    expect(g.dealing(NOON)).toBeNull();
  });

  it('is turned down by a connect who does not know the player well enough', () => {
    const { person, spot } = connectOf('tyger_claws');
    const g = game(at(spot));
    g.deal(person.id, 'ask', NOON);
    expect(g.dealing(NOON)).toBeNull();
  });

  it('is taken on by a connect who likes the player: a package fronted, owed back by its day, and a corner on the gang\'s turf', () => {
    const { person, spot } = connectOf('tyger_claws');
    let g: Game | null = null;
    // Saying yes is an answer like any other: a warm enough connect says it sooner or later.
    for (let n = 0; n < 8 && !g?.dealing(NOON); n++) {
      g = game(at(spot, { society: societyWith({ [person.id]: { ...friendly(70), asks: n } }) }));
      g.deal(person.id, 'ask', NOON);
    }
    const view = g!.dealing(NOON)!;
    expect(view).not.toBeNull();
    expect(view.gang).toBe('tyger_claws');
    expect(view.title).toBe('Runner');
    expect(view.front).toMatchObject({ drug: 'glitter', doses: DEALING.rungs[0]!.front, paid: 0 });
    expect(view.front!.due).toBeGreaterThan(NOON);
    expect(view.carried).toBe(DEALING.rungs[0]!.front);
    expect(g!.inventory.some((i) => i.id === 'glitter' && i.in)).toBe(true);
    const corner = world.locations[view.corner!.id]!;
    expect(PEOPLE.turf[corner.district]?.some(([gang]) => gang === 'tyger_claws')).toBe(true);
  });
});

describe('the corner', () => {
  it('has buyers come by, a sale moving a dose and the cash, and quiet once the block has had its buyers', () => {
    const dealing = dealingFor('tyger_claws');
    const g = game(at(cornerOf(dealing), { dealing, items: [glitter(30)] }), NIGHT);
    expect(g.cornerAction(NIGHT)).toMatchObject({ id: 'deal', disabled: false });
    let t = NIGHT;
    let sold = 0;
    for (let n = 0; n < 12; n++) {
      t += 60_000 / TRAVEL.timeScale;
      if (!g.walkUp(t)) break;
      const moment = g.dealMoment(t);
      if (!moment) continue;
      expect(moment.text).not.toMatch(/[{}]/);
      const buyer = g.person(moment.person)!;
      const before = { cash: g.wallet.eddies, theirs: buyer.eddies, doses: g.inventory.filter((i) => i.id === 'glitter').reduce((s, i) => s + i.count, 0) };
      expect(g.answerDeal('sell', t)).toBe(true);
      sold += 1;
      expect(g.wallet.eddies).toBeGreaterThan(before.cash);
      expect(buyer.eddies).toBeLessThan(before.theirs);
      expect(g.inventory.filter((i) => i.id === 'glitter').reduce((s, i) => s + i.count, 0)).toBe(before.doses - 1);
    }
    expect(sold).toBeGreaterThan(0);
    expect(sold).toBeLessThanOrEqual(buyersIn(22, world.locations[dealing.current!.corner!]!.kind, DEALING));
    expect(g.dealing(t)!.sold).toBe(sold);
    expect(g.trading().xp).toBeGreaterThan(0);
  });

  it('lets the player push for more: sometimes it comes off, sometimes the buyer walks', () => {
    const outcomes = new Set<string>();
    for (let n = 0; n < 24 && outcomes.size < 2; n++) {
      const t = NIGHT + n * 60_000;
      const dealing = dealingFor('tyger_claws', { sold: n * 7 });
      const g = game(at(cornerOf(dealing), { dealing, items: [glitter(10)] }), t);
      if (!g.walkUp(t) || !g.dealMoment(t) || g.dealMoment(t)!.choices.length < 3) continue;
      const cash = g.wallet.eddies;
      g.answerDeal('push', t);
      outcomes.add(g.wallet.eddies > cash ? 'paid' : 'walked');
    }
    expect([...outcomes].sort()).toEqual(['paid', 'walked']);
  });

  it('is nowhere but the corner the gang gave the player', () => {
    const dealing = dealingFor('tyger_claws');
    const elsewhere = Object.values(world.locations).find((l) => l.id !== dealing.current!.corner)!;
    const g = game(at({ kind: 'location', id: elsewhere.id }, { dealing, items: [glitter(5)] }), NIGHT);
    expect(g.cornerAction(NIGHT)).toBeNull();
    expect(g.walkUp(NIGHT)).toBe(false);
  });
});

describe('pitching someone', () => {
  it('sells to someone with a habit for it who trusts the player, and puts off someone without one', () => {
    const g = game(blank({}));
    const clock = clockOf(NOON);
    const people = population.people.filter((p) => whereIs(p, world, clock, FOOD.dishes, PEOPLE.out));
    const dealt = (p: Person) => new Set(PEOPLE.turf[p.district]?.flatMap(([gang]) => DEALING.gangs[gang]?.drugs ?? []));
    const user = people.find((p) => habitOf(p, walkOf(p, world), dealt(p), DEALING, world.seed)?.drug === 'glitter' && p.eddies >= 30)!;
    const clean = people.find((p) => !p.gang && !habitOf(p, walkOf(p, world), dealt(p), DEALING, world.seed) && walkOf(p, world) === 'corpo')!;
    const spotOf = (p: Person) => whereIs(p, world, clock, FOOD.dishes, PEOPLE.out)!.spot;
    // A friend with the habit buys.
    const buying = game(at(spotOf(user), { items: [glitter(3)], society: societyWith({ [user.id]: friendly(70) }) }));
    expect(buying.dealWith(user.id, NOON).some((o) => o.id === 'sell:glitter')).toBe(true);
    const cash = buying.wallet.eddies;
    buying.deal(user.id, 'sell:glitter', NOON);
    expect(buying.wallet.eddies).toBeGreaterThan(cash);
    // A corpo who takes nothing is put out by being asked.
    const offended = game(at(spotOf(clean), { items: [glitter(3)] }));
    offended.deal(clean.id, 'sell:glitter', NOON);
    expect(offended.standingWith(clean.id, NOON)?.standing.rapport ?? 0).toBeLessThan(0);
    expect(g.dealing(NOON)).toBeNull();
  });
});

describe('paying up', () => {
  it('closes a front paid before its day, trust for it, and a rung up once there is trust and fronts enough', () => {
    const { person, spot } = connectOf('tyger_claws');
    const rung = DEALING.rungs[0]!;
    const owed = owedFor(DEALING.drugs.glitter!, rung);
    const dealing = { ...dealingFor('tyger_claws'), current: { ...dealingFor('tyger_claws').current!, connect: person.id, trust: DEALING.rungs[1]!.at - 1, fronts: DEALING.rungs[1]!.paid - 1, front: { drug: 'glitter', doses: rung.front, owed, paid: 0, at: NOON, due: NOON + 48 * HOUR } } };
    const g = game(at(spot, { dealing, money: { bills: 1000, coins: 0, account: 0 }, society: societyWith({ [person.id]: friendly(30) }) }));
    expect(g.dealWith(person.id, NOON).find((o) => o.id === 'pay')?.sub).toBe(`${owed} of ${owed} €$`);
    expect(g.deal(person.id, 'pay', NOON)).toBe(true);
    const view = g.dealing(NOON)!;
    expect(view.front).toBeNull();
    expect(view.fronts).toBe(DEALING.rungs[1]!.paid);
    expect(view.trust).toBe(DEALING.rungs[1]!.at - 1 + DEALING.trust.paid + DEALING.trust.early);
    expect(view.title).toBe('Pusher');
    expect(g.wallet.eddies).toBe(1000 - owed);
    // Paid up, the next package is on offer, and so is walking away.
    const options = g.dealWith(person.id, NOON).map((o) => o.id);
    expect(options).toContain('front:glitter');
    expect(options).toContain('walk');
  });

  it('takes part of it, and leaves the rest owed', () => {
    const { person, spot } = connectOf('tyger_claws');
    const dealing = { ...dealingFor('tyger_claws'), current: { ...dealingFor('tyger_claws').current!, connect: person.id, front: { drug: 'glitter', doses: 8, owed: 100, paid: 0, at: NOON, due: NOON + 48 * HOUR } } };
    const g = game(at(spot, { dealing, money: { bills: 40, coins: 0, account: 0 } }));
    g.deal(person.id, 'pay', NOON);
    expect(g.dealing(NOON)!.front).toMatchObject({ paid: 40, left: 60 });
    expect(g.wallet.eddies).toBe(0);
  });

  it('will not front more while anything is owed, nor to a mask', () => {
    const { person, spot } = connectOf('tyger_claws');
    const dealing = { ...dealingFor('tyger_claws'), current: { ...dealingFor('tyger_claws').current!, connect: person.id, debt: 50 } };
    const g = game(at(spot, { dealing }));
    expect(g.dealWith(person.id, NOON).map((o) => o.id)).toEqual(['pay']);
  });
});

describe('a debt', () => {
  const owing = (extra: Partial<DealState> = {}) => {
    const d = dealingFor('tyger_claws');
    return { ...d, current: { ...d.current!, front: { drug: 'glitter', doses: 8, owed: 100, paid: 0, at: NOON - 49 * HOUR, due: NOON - HOUR }, ...extra } };
  };

  it('is what was left owing at the deadline, with trust gone for it, growing by the day', () => {
    const g = game(blank({ dealing: owing() }));
    const view = g.dealing(NOON)!;
    expect(view.front).toBeNull();
    expect(view.debt).toBe(100);
    expect(view.trust).toBe(-DEALING.trust.short);
    g.tick(NOON + 24 * HOUR + 1);
    expect(g.dealing(NOON + 24 * HOUR + 1)!.debt).toBe(110);
  });

  it('brings a collector after the grace hours, who stops the player till it is settled', () => {
    const g = game(blank({ dealing: owing() }));
    const due = g.dealing(NOON)!.collectAt!;
    expect(due).toBe(NOON + DEALING.debt.graceHours * HOUR);
    g.tick(due + 1);
    const c = g.collector(due + 1)!;
    expect(c).not.toBeNull();
    expect(c.text).not.toMatch(/[{}]/);
    expect(c.choices.map((x) => x.id)).toEqual(['pay', 'plead', 'fight']);
    expect(g.person(c.person)?.gang).toBe('tyger_claws');
    expect(g.peopleHere(due + 1).some((p) => p.person.id === c.person)).toBe(true);
    // Nowhere to go till it's settled.
    const somewhere = Object.values(world.locations)[0]!;
    const plan = g.plan({ ...streetSpot(somewhere), place: somewhere.id }, 'foot', due + 1);
    expect(plan && g.go(plan, due + 1)).toBeFalsy();
    // Paid in full: square.
    expect(g.answerCollector('pay', due + 1)).toBe(true);
    expect(g.collector(due + 1)).toBeNull();
    expect(g.dealing(due + 1)!.debt).toBe(0);
    expect(g.wallet.eddies).toBe(400);
  });

  it('takes it out on a player who pleads and is not believed, and gives one who is a few hours', () => {
    const results = new Set<string>();
    for (let n = 0; n < 40 && results.size < 2; n++) {
      const g = game(blank({ dealing: owing({ collections: n }), money: { bills: 30, coins: 0, account: 0 } }));
      const t = g.dealing(NOON)!.collectAt! + 1 + n * 1000;
      g.tick(t);
      if (!g.collector(t)) continue;
      const health = g.health(t).current;
      g.answerCollector('plead', t);
      const after = g.dealing(t)!;
      if (g.health(t).current < health) {
        results.add('beaten');
        expect(g.wallet.eddies).toBe(0);
        expect(after.debt).toBe(70);
      } else {
        results.add('time');
        expect(after.collectAt).toBe(t + DEALING.debt.plead.hours * HOUR);
      }
    }
    expect([...results].sort()).toEqual(['beaten', 'time']);
  });

  it('ends in the gang cutting the player off when there is no trust left: the debt is a score to settle', () => {
    const g = game(blank({ dealing: owing({ trust: DEALING.trust.cutOff + DEALING.trust.short - 1 }) }));
    expect(g.dealing(NOON)).toBeNull();
    const saved = g.dealingSaved;
    expect(saved.burned.tyger_claws).toBeDefined();
    expect(g.societySaved.threats.some((t) => t.gang === 'tyger_claws' && t.amount > 100)).toBe(true);
  });
});

describe('dealing through a save', () => {
  it('keeps the gang, the rung, the front, the debt and the customers', () => {
    const d = dealingFor('tyger_claws', { rung: 1, trust: 9, fronts: 2, debt: 30, customers: { someone: { bought: 2, last: NOON } } });
    const g = game(blank({ dealing: d }));
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON))))!;
    const back = new Game(world, RULES, resume(world, save)!);
    expect(back.dealingSaved.current).toMatchObject({ gang: 'tyger_claws', rung: 1, trust: 9, fronts: 2, debt: 30 });
    // Customers the city doesn't have are forgotten.
    expect(back.dealingSaved.current!.customers).toEqual({});
    // A save from before dealing deals for nobody.
    expect(readSave({ ...JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON))), dealing: undefined })?.dealing).toBeNull();
  });
});

describe('the lines of dealing', () => {
  it('fill for anyone, and there are enough of them', () => {
    const vars: Record<string, string> = { who: 'a woman in Tyger Claws colors', Who: 'A woman in Tyger Claws colors', he: 'she', his: 'her', him: 'her', drug: 'Glitter', price: '18', pay: '12', gang: 'Tyger Claws', owed: '120', left: '40', when: 'Fri 18:00', weapon: 'knife', took: '3 doses of Glitter and 20 €$' };
    for (const [key, pool] of Object.entries(DEALING.lines)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3);
      for (const text of pool) expect(text.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? `{${k}}`), `${key}: ${text}`).not.toMatch(/[{}]/);
    }
    // What people say, for a connect, a ganger pointing the way, and anyone pitched.
    const connect = population.people.find((p) => p.gang === 'tyger_claws' && p.job.role === 'lieutenant')!;
    const g = game(blank({}));
    const rng = createRng('lines');
    const speakerOf = (person: Person): Speaker => (g as unknown as { speakerFor(p: Person, s: string, d: string, n: number): Speaker }).speakerFor(person, 'neutral', '', NOON);
    const deal = { drug: 'Glitter', doses: '8', owed: '79', when: 'Fri 18:00', corner: 'Jig-Jig Street', title: 'pusher', connect: 'Kenji', left: '40', pay: '20', price: '18', mask: '' };
    for (const person of [connect, ...population.people.slice(0, 40)]) {
      for (const stance of ['neutral', 'warm', 'cold', 'friend', 'wary'] as const) {
        const speaker = { ...speakerOf(person), stance, vars: { ...speakerOf(person).vars, ...deal } };
        for (const [key, pool] of Object.entries(LINES.deal)) {
          if (key === 'masked') continue;
          for (const where of ['Jig-Jig Street', '']) {
            const text = line(pool, { ...speaker, vars: { ...speaker.vars, where } }, rng);
            expect(text, `${key} ${stance}`).not.toBe('');
            expect(text, `${key} ${stance}`).not.toMatch(/[{}]/);
          }
        }
        for (const pool of [LINES.you.deal, LINES.you.pitch, LINES.you.payUp, LINES.you.walkAway]) expect(line(pool, speaker, rng)).not.toMatch(/[{}]|^$/);
      }
      expect(line(LINES.deal.masked, { ...speakerOf(person), vars: { ...speakerOf(person).vars, mask: 'balaclava' } }, rng)).not.toMatch(/[{}]|^$/);
    }
  });
});

describe('a canon check on the drugs', () => {
  it('has the 2077 drugs with the wiki\'s names and the gangs that move them, and the older two for the Valentinos', () => {
    expect(Object.values(DEALING.drugs).filter((d) => d.from === '2077').map((d) => d.name).sort()).toEqual(['Black Lace', 'Deep Dive', 'Glitter', 'Juice', 'Phant']);
    expect(DEALING.gangs.tyger_claws!.drugs).toEqual(['glitter']);
    expect(DEALING.gangs.animals!.drugs).toEqual(['juice']);
    expect(DEALING.gangs.scavengers!.drugs).toEqual(['deep-dive', 'phant']);
    expect(DEALING.gangs.valentinos!.drugs.map((id) => DEALING.drugs[id]!.from)).toEqual(['2020', '2020']);
    // Illegal to carry at all: the combat drug, Glitter and the Animals' Juice.
    expect(Object.entries(DEALING.drugs).filter(([, d]) => d.illegal).map(([id]) => id).sort()).toEqual(['black-lace', 'glitter', 'juice']);
    expect(canMoveUp({ rung: 0, trust: 100, fronts: 100 } as DealState, DEALING)).toBe(true);
  });
});
