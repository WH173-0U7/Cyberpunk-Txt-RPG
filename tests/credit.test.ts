import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { CREDIT } from '../src/data/credit';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { creditLimit, honestyOf, loanAmounts } from '../src/engine/credit';
import type { Money } from '../src/engine/money';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { generatePeople, whereIs, type Clock, type Person, type Spot } from '../src/engine/people';
import { createSave, readSave, type Progress } from '../src/engine/save';
import type { LifeState } from '../src/engine/life';
import type { SocietyState, Standing } from '../src/engine/society';
import type { Location } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
const DAY = 86_400_000;
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf, credit: CREDIT };

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
/** The player standing at a spot: inside a building, or at a place. */
const at = (spot: Spot, extra: Partial<Progress> = {}): Progress => {
  if (spot.kind === 'location') {
    const place = world.locations[spot.id] as Location;
    return blank({ where: { ...streetSpot(place), place: place.id }, ...extra });
  }
  const b = world.buildings.find((x) => x.id === spot.id)!;
  return blank({ where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, ...extra });
};
const game = (progress: Progress, now = NOON) => {
  const g = new Game(world, RULES, progress);
  g.start(now);
  return g;
};
/** The game's insides a test reaches into: the player's money, the people's days, and how people stand with the player. */
const inner = (g: Game) => g as unknown as { money: Money; life: LifeState; society: SocietyState };
const friendly = (rapport: number): Standing => ({ met: true, rapport, grudge: 0, at: NOON, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} });

/** The first person of a kind somewhere the player can find them at noon, and the player there with them. */
function beside(which: (p: Person) => boolean, extra: Partial<Progress> = {}): { g: Game; person: Person } {
  for (const person of population.people) {
    if (!which(person)) continue;
    const where = whereIs(person, world, clockOf(NOON), FOOD.dishes, PEOPLE.out);
    if (!where) continue;
    const g = game(at(where.spot, extra));
    const here = g.peopleHere(NOON).find((p) => p.person.id === person.id && which(p.person));
    if (here) return { g, person: here.person };
  }
  throw new Error('nobody like that to be found');
}
const officer = (p: Person) => /NCPD/.test(p.job.role);

describe('a bank loan', () => {
  const bank = world.buildings.find((b) => b.business === 'bank')!;

  it('lends against what the player\'s work pays, with its interest on top, and takes it back a week at a time', () => {
    expect(bank, 'a bank in the city').toBeDefined();
    expect(creditLimit(0, CREDIT.bank)).toBe(CREDIT.bank.base);
    expect(creditLimit(100_000, CREDIT.bank)).toBe(CREDIT.bank.most);
    expect(loanAmounts(300, CREDIT.bank)).toEqual([200, 250, 300]);
    const g = game(at({ kind: 'building', id: bank.id }));
    const offer = g.credit(NOON)!;
    expect(offer).toMatchObject({ limit: 300, amounts: [200, 250, 300], loan: null, barred: false });
    expect(g.borrow(275, NOON), 'only what it offers').toBe(false);
    expect(g.borrow(300, NOON)).toBe(true);
    expect(g.wallet.account).toBe(300);
    const owed = Math.round(300 * (1 + CREDIT.bank.interest));
    const installment = Math.ceil(owed / CREDIT.bank.term);
    expect(g.credit(NOON)).toMatchObject({ limit: 0, amounts: [], loan: { owed, installment, dueIn: 7, missed: 0, defaulted: false } });
    g.tick(NOON + 7 * DAY);
    expect(g.wallet.account).toBe(300 - installment);
    expect(g.debts(NOON + 7 * DAY).bank).toMatchObject({ owed: owed - installment, missed: 0, dueIn: 7 });
    // Paid off at the counter, out of the account and then the cash.
    inner(g).money = { bills: 200, coins: 0, account: 200 };
    expect(g.repayLoan(NOON + 7 * DAY)).toBe(true);
    expect(g.debts(NOON + 7 * DAY).bank).toBeNull();
    expect(g.wallet.account).toBe(0);
    expect(g.wallet.eddies).toBe(400 - (owed - installment));
    expect(g.credit(NOON + 7 * DAY)?.limit, 'and lends again').toBe(300);
  });

  it('charges for a missed installment, and after three in a row sweeps the account every week and never lends again', () => {
    const g = game(at({ kind: 'building', id: bank.id }));
    g.borrow(300, NOON);
    const { owed, installment } = g.credit(NOON)!.loan!;
    inner(g).money = { bills: 0, coins: 0, account: 0 };
    g.tick(NOON + 7 * DAY);
    const fee = Math.ceil(installment * CREDIT.bank.late);
    expect(g.debts(NOON + 7 * DAY).bank).toMatchObject({ owed: owed + fee, missed: 1, defaulted: false });
    g.tick(NOON + 14 * DAY);
    g.tick(NOON + 21 * DAY);
    const defaulted = g.debts(NOON + 21 * DAY).bank!;
    expect(defaulted).toMatchObject({ owed: owed + 3 * fee, missed: CREDIT.bank.default, defaulted: true });
    expect(g.credit(NOON + 21 * DAY)).toMatchObject({ barred: true, limit: 0 });
    // Whatever goes in the account, the bank takes toward it.
    inner(g).money = { bills: 0, coins: 0, account: 100 };
    g.tick(NOON + 28 * DAY);
    expect(g.wallet.account).toBe(0);
    expect(g.debts(NOON + 28 * DAY).bank?.owed).toBe(defaulted.owed - 100);
    inner(g).money = { bills: 0, coins: 0, account: 10_000 };
    g.tick(NOON + 35 * DAY);
    expect(g.debts(NOON + 35 * DAY).bank).toBeNull();
    expect(g.wallet.account).toBe(10_000 - (defaulted.owed - 100));
    expect(g.credit(NOON + 35 * DAY), 'paid, and still barred').toMatchObject({ barred: true, limit: 0, amounts: [] });
  });
});

describe('a loan shark', () => {
  it('lends a gang\'s cash out of its chest, at interest every week, one gang at a time and only so much', () => {
    const { g, person } = beside((p) => Boolean(p.gang) && !officer(p));
    const gang = person.gang!;
    inner(g).life.treasuries[gang] = 5000;
    const options = g.moneyWith(person.id, NOON);
    expect(options.map((o) => o.id)).toEqual(CREDIT.shark.amounts.map((a) => `borrow:${a}`));
    expect(g.moneyMove(person.id, 'borrow:250', NOON)).toBe(true);
    expect(g.wallet.eddies).toBe(250);
    expect(inner(g).life.treasuries[gang]).toBe(4750);
    expect(g.creditSaved.shark).toMatchObject({ gang, owed: 250, borrowed: 250 });
    expect(g.debts(NOON).shark).toMatchObject({ owed: 250, late: false });
    // Pay back is on offer now, and borrowing past the most is not.
    expect(g.moneyWith(person.id, NOON)[0]).toMatchObject({ id: 'repay' });
    // As much as the wallet holds, and no more.
    expect(g.moneyMove(person.id, 'borrow:500', NOON)).toBe(true);
    expect(g.moneyMove(person.id, 'borrow:500', NOON), 'no room in the wallet').toBe(false);
    inner(g).money = { bills: 0, coins: 0, account: 0 };
    expect(g.moneyMove(person.id, 'borrow:500', NOON)).toBe(true);
    inner(g).money = { bills: 0, coins: 0, account: 0 };
    expect(g.moneyWith(person.id, NOON).find((o) => o.id === 'borrow:500')?.disabled, 'up to the most').toBe(true);
    expect(g.moneyMove(person.id, 'borrow:500', NOON)).toBe(false);
    // An empty chest lends nothing.
    inner(g).life.treasuries[gang] = 0;
    expect(g.moneyMove(person.id, 'borrow:100', NOON)).toBe(false);
    expect(g.creditSaved.shark?.owed).toBe(1250);
    // A week on, a tenth more.
    g.tick(NOON + 7 * DAY);
    expect(g.creditSaved.shark?.owed).toBe(Math.ceil(1250 * (1 + CREDIT.shark.interest)));
  });

  it('never grows past its cap, sends someone to collect once nothing has been paid back in too long, and lets it go once it\'s square', () => {
    const { g, person } = beside((p) => Boolean(p.gang) && !officer(p));
    const gang = person.gang!;
    inner(g).life.treasuries[gang] = 5000;
    g.moneyMove(person.id, 'borrow:100', NOON);
    inner(g).money = { bills: 0, coins: 0, account: 0 };
    g.tick(NOON + 13 * DAY);
    expect(g.creditSaved.shark?.sent, 'not yet').toBeUndefined();
    expect(g.societySaved.threats.some((t) => t.why === 'debt')).toBe(false);
    g.tick(NOON + CREDIT.shark.grace * DAY);
    const shark = g.creditSaved.shark!;
    expect(shark.sent).toBe(true);
    expect(g.debts(NOON + CREDIT.shark.grace * DAY).shark?.late).toBe(true);
    const threat = g.societySaved.threats.find((t) => t.why === 'debt' && t.gang === gang)!;
    expect(threat).toMatchObject({ by: null, amount: shark.owed });
    // Behind, the player gets no more.
    const late = NOON + CREDIT.shark.grace * DAY;
    expect(g.moneyWith(person.id, late).find((o) => o.id === 'borrow:100')?.disabled).toBe(false);
    expect(g.moneyMove(person.id, 'borrow:100', late)).toBe(false);
    expect(g.creditSaved.shark?.owed).toBe(shark.owed);
    // They come and take what's on the player, which comes off what's owed, and the clock starts again.
    inner(g).money = { bills: 50, coins: 0, account: 0 };
    const chest = inner(g).life.treasuries[gang]!;
    g.tick(threat.due + 1);
    expect(g.wallet.eddies).toBe(0);
    expect(g.creditSaved.shark).toMatchObject({ owed: shark.owed - 50 });
    expect(g.creditSaved.shark?.sent).toBeUndefined();
    expect(inner(g).life.treasuries[gang]).toBe(chest + 50);
    expect(g.societySaved.threats.some((t) => t.why === 'debt')).toBe(false);
    // Months on, it's no more than the cap.
    const later = new Game(world, RULES, at({ kind: 'building', id: world.buildings[0]!.id }, { credit: { bank: null, barred: false, shark: { gang, owed: 100, borrowed: 100, since: 0, paid: clockOf(NOON).day, due: clockOf(NOON).day + 1 }, lent: {} } }));
    later.start(NOON + 13 * 7 * DAY);
    expect(later.creditSaved.shark?.owed).toBe(100 * CREDIT.shark.cap);
  });

  it('is paid back to any of the gang, and once it\'s square nobody comes for it', () => {
    const { g, person } = beside((p) => Boolean(p.gang) && !officer(p));
    const gang = person.gang!;
    inner(g).life.treasuries[gang] = 5000;
    g.moneyMove(person.id, 'borrow:250', NOON);
    // Someone already on their way for it.
    inner(g).society.threats.push({ id: 99, due: NOON + DAY, by: null, gang, incident: 0, amount: 250, why: 'debt' });
    inner(g).money = { bills: 100, coins: 0, account: 0 };
    expect(g.moneyMove(person.id, 'repay', NOON)).toBe(true);
    expect(g.creditSaved.shark?.owed).toBe(150);
    expect(inner(g).life.treasuries[gang]).toBe(4850);
    inner(g).money = { bills: 500, coins: 0, account: 0 };
    expect(g.moneyMove(person.id, 'repay', NOON)).toBe(true);
    expect(g.creditSaved.shark).toBeNull();
    expect(g.wallet.eddies).toBe(350);
    expect(g.societySaved.threats.some((t) => t.why === 'debt')).toBe(false);
    expect(g.debts(NOON).shark).toBeNull();
  });

  it('won\'t lend to a player they\'re cold to', () => {
    const { g, person } = beside((p) => Boolean(p.gang) && !officer(p));
    inner(g).life.treasuries[person.gang!] = 5000;
    inner(g).society.standings[person.id] = friendly(-60);
    expect(g.peopleHere(NOON).find((p) => p.person.id === person.id)?.stance).toMatch(/cold|hostile/);
    expect(g.moneyMove(person.id, 'borrow:100', NOON)).toBe(false);
    expect(g.creditSaved.shark).toBeNull();
    expect(g.wallet.eddies).toBe(0);
  });

  it('owes one gang at a time: another gang\'s shark won\'t lend on top of it', () => {
    const { g, person } = beside((p) => Boolean(p.gang) && !officer(p));
    inner(g).life.treasuries[person.gang!] = 5000;
    g.moneyMove(person.id, 'borrow:100', NOON);
    const other = Object.keys(PEOPLE.gangs).find((gang) => gang !== person.gang)!;
    (g as unknown as { creditState: { shark: { gang: string } } }).creditState.shark.gang = other;
    const options = g.moneyWith(person.id, NOON);
    expect(options.some((o) => o.id === 'repay'), 'nothing owed to theirs').toBe(false);
    expect(options.every((o) => o.disabled)).toBe(true);
  });
});

describe('lending to people', () => {
  const civilian = (p: Person) => !p.gang && !officer(p) && p.age >= 18;

  it('is taken by the broke, or by someone warm to the player, and paid back as the honest can', () => {
    const { g, person } = beside(civilian, { money: { bills: 500, coins: 0, account: 0 } });
    // Flush and a stranger: no thanks.
    inner(g).life.savings = { ...inner(g).life.savings, [person.id]: 10_000 };
    expect(g.moneyWith(person.id, NOON).map((o) => o.id)).toEqual(CREDIT.lend.amounts.map((a) => `lend:${a}`));
    expect(g.moneyMove(person.id, 'lend:50', NOON)).toBe(false);
    expect(g.wallet.eddies).toBe(500);
    // Warm to the player, they'll take it.
    inner(g).society.standings[person.id] = friendly(40);
    person.traits.loyalty = 0.9;
    person.traits.greed = 0.1;
    expect(honestyOf(person)).toBeGreaterThanOrEqual(CREDIT.lend.honest);
    expect(g.moneyMove(person.id, 'lend:50', NOON)).toBe(true);
    expect(g.wallet.eddies).toBe(450);
    expect(inner(g).life.savings![person.id]).toBe(10_050);
    expect(g.moneyWith(person.id, NOON)).toEqual([{ id: 'ask', label: 'Ask for it back', sub: '€$ 50' }]);
    expect(g.debts(NOON)).toMatchObject({ owedYou: 50, owers: 1 });
    // A week on, an honest one with money over pays it back into the player's account.
    g.tick(NOON + 7 * DAY);
    expect(g.creditSaved.lent[person.id]).toBeUndefined();
    expect(g.wallet.account).toBe(50);
  });

  it('is never paid back by the dishonest, who make excuses, and asking again so soon costs goodwill', () => {
    const { g, person } = beside(civilian, { money: { bills: 500, coins: 0, account: 0 } });
    inner(g).society.standings[person.id] = friendly(40);
    inner(g).life.savings = { ...inner(g).life.savings, [person.id]: 10_000 };
    person.traits.loyalty = 0;
    person.traits.greed = 1;
    expect(g.moneyMove(person.id, 'lend:100', NOON)).toBe(true);
    g.tick(NOON + 14 * DAY);
    expect(g.creditSaved.lent[person.id]?.owed, 'not a cent').toBe(100);
    const here = g.peopleHere(NOON + 14 * DAY).some((p) => p.person.id === person.id);
    expect(here, 'still about two weeks on').toBe(true);
    expect(g.moneyMove(person.id, 'ask', NOON + 14 * DAY)).toBe(true);
    expect(g.creditSaved.lent[person.id]?.owed).toBe(100);
    const rapport = inner(g).society.standings[person.id]!.rapport;
    expect(g.moneyMove(person.id, 'ask', NOON + 14 * DAY + 60_000)).toBe(true);
    expect(inner(g).society.standings[person.id]!.rapport).toBeLessThan(rapport);
  });

  it('is paid back when asked by the honest, as far as they have money over their week', () => {
    const { g, person } = beside(civilian, { money: { bills: 500, coins: 0, account: 0 } });
    inner(g).society.standings[person.id] = friendly(40);
    person.traits.loyalty = 0.9;
    person.traits.greed = 0.1;
    g.moneyMove(person.id, 'lend:100', NOON);
    inner(g).life.savings![person.id] = 10_000;
    expect(g.moneyMove(person.id, 'ask', NOON + 60_000)).toBe(true);
    expect(g.creditSaved.lent[person.id]).toBeUndefined();
    expect(g.wallet.account).toBe(100);
    expect(inner(g).life.savings![person.id]).toBe(9900);
  });

  it('isn\'t offered to an officer', () => {
    const cops = population.people.filter(officer);
    expect(cops.length).toBeGreaterThan(0);
    for (const person of cops.slice(0, 40)) {
      const where = whereIs(person, world, clockOf(NOON), FOOD.dishes, PEOPLE.out);
      if (!where) continue;
      const g = game(at(where.spot, { money: { bills: 500, coins: 0, account: 0 } }));
      if (!g.peopleHere(NOON).some((p) => p.person.id === person.id)) continue;
      expect(g.moneyWith(person.id, NOON)).toEqual([]);
      return;
    }
    expect.unreachable('no officer about at noon');
  });
});

describe('credit in a save', () => {
  it('comes back as it was, and drops what isn\'t a loan', () => {
    const bank = world.buildings.find((b) => b.business === 'bank')!;
    const g = game(at({ kind: 'building', id: bank.id }));
    g.borrow(300, NOON);
    const credit = { ...g.creditSaved, shark: { gang: 'maelstrom', owed: 300, borrowed: 250, since: 1, paid: 1, due: 8 }, lent: { someone: { owed: 20, since: 1, paid: 1, due: 8 } } };
    (g as unknown as { creditState: unknown }).creditState = credit;
    const save = JSON.parse(JSON.stringify(createSave(world.seed, g, GENERATOR_VERSION, NOON)));
    expect(readSave(save)?.credit).toEqual(credit);
    const broken = readSave({ ...save, credit: { bank: { bank: bank.id }, barred: 'yes', shark: { gang: 3 }, lent: { a: { owed: 'x' }, b: { owed: 5, since: 1, paid: 1, due: 8 } } } });
    expect(broken?.credit).toEqual({ bank: null, barred: false, shark: null, lent: { b: { owed: 5, since: 1, paid: 1, due: 8 } } });
    expect(readSave({ ...save, credit: 'nope' })?.credit).toBeNull();
  });
});
