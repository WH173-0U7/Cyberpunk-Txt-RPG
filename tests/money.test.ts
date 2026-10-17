import { describe, expect, it } from 'vitest';
import { MONEY } from '../src/data/money';
import {
  cash,
  cashFor,
  changeCoins,
  chipCut,
  coinFee,
  countNotes,
  deposit,
  freshMoney,
  grabCash,
  makeNotes,
  notesLine,
  notesOf,
  notesToPay,
  payCash,
  pocket,
  purseOf,
  sumNotes,
  takeCash,
  takeFrom,
  withdraw,
  withNotes,
  type Money,
} from '../src/engine/money';
import { createRng } from '../src/engine/rng';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld, GENERATOR_VERSION } from '../src/engine/generate';
import { whereIs, type Clock } from '../src/engine/people';
import { createSave, progressFor, readSave, type Progress, type SaveData } from '../src/engine/save';

const ROOMY = { notes: 99, coins: 999 };
/** Money holding these notes and coins. */
const wallet = (notes: Record<string, number>, coins = 0, account = 0): Money => withNotes({ bills: 0, coins, account }, notes);

describe('notes and coins', () => {
  it("are the wiki's: notes of €$1 to €$500, and the €$1 coin", () => {
    expect(MONEY.notes).toEqual([1, 5, 10, 20, 50, 100, 500]);
    expect(makeNotes(185, MONEY)).toEqual({ '100': 1, '50': 1, '20': 1, '10': 1, '5': 1 });
    expect(makeNotes(185, MONEY, 20)).toEqual({ '20': 9, '5': 1 });
    expect(makeNotes(7, MONEY)).toEqual({ '5': 1, '1': 2 });
    // Handed over, what's under a fiver is coins.
    expect(cashFor(37, MONEY, 100)).toEqual({ notes: { '20': 1, '10': 1, '5': 1 }, coins: 2 });
    expect(notesLine({ '5': 3, '100': 2, '20': 1 })).toBe('€$100 ×2 · €$20 · €$5 ×3');
    expect(sumNotes({ '100': 2, '5': 3 })).toBe(215);
    expect(countNotes({ '100': 2, '5': 3 })).toBe(5);
  });

  it("works an older save's bills out as notes, the biggest first, and keeps the ones it has", () => {
    expect(notesOf({ bills: 160, coins: 0, account: 0 }, MONEY)).toEqual({ '100': 1, '50': 1, '10': 1 });
    expect(notesOf(wallet({ '20': 8 }), MONEY)).toEqual({ '20': 8 });
    // Notes that don't come to the bills (set by hand) give way to the bills.
    expect(notesOf({ bills: 30, coins: 0, account: 0, notes: { '20': 5 } }, MONEY)).toEqual({ '20': 1, '10': 1 });
    expect(freshMoney(50, MONEY).notes).toEqual({ '50': 1 });
  });

  it('pays coins first, then the notes that cover it: exactly if they can, else the least over', () => {
    expect(notesToPay({ '20': 3, '5': 2 }, 45)).toEqual({ '20': 2, '5': 1 });
    // Can't be exact: the smallest note that covers what's left over.
    expect(notesToPay({ '20': 3 }, 45)).toEqual({ '20': 3 });
    // One note that covers it all, when that's less over than a pile.
    expect(notesToPay({ '50': 1, '20': 2 }, 45)).toEqual({ '50': 1 });
    expect(notesToPay({ '10': 1 }, 45)).toBeNull();
    const paid = payCash(wallet({ '20': 2, '10': 1 }, 3), 7, MONEY, ROOMY)!;
    // 3 €$ in coins, then the €$10 note for the 4 left: 6 back, a fiver and a coin.
    expect(paid.handed).toEqual({ notes: { '10': 1 }, coins: 3 });
    expect(paid.money).toMatchObject({ bills: 45, coins: 1, notes: { '20': 2, '5': 1 } });
    expect(paid.change).toBe(6);
    // A round price, exactly.
    expect(payCash(wallet({ '20': 2, '10': 1 }), 30, MONEY, ROOMY)?.money).toMatchObject({ bills: 20, coins: 0, notes: { '20': 1 } });
    // Coins cover it outright.
    expect(payCash(wallet({ '20': 1 }, 9), 9, MONEY, ROOMY)?.money).toMatchObject({ bills: 20, coins: 0 });
    // A €$100 for a €$3 bite: the change in notes no bigger than a till's, and coins.
    expect(payCash(wallet({ '100': 1 }), 3, MONEY, ROOMY)?.money.notes).toEqual({ '50': 1, '20': 2, '5': 1 });
    // Short.
    expect(payCash(wallet({ '5': 1 }, 1, 100), 7, MONEY, ROOMY)).toBeNull();
    expect(cash(wallet({ '5': 1 }, 1, 100))).toBe(6);
  });

  it('gives back only the change there is room for: the counter keeps the rest', () => {
    const tight = payCash(wallet({ '50': 1 }), 21, MONEY, { notes: 0, coins: 1 })!;
    // 29 back: the €$20 fits where the €$50 was, the €$5 and three of the coins don't.
    expect(tight.money).toMatchObject({ bills: 20, coins: 1, notes: { '20': 1 } });
    expect(tight.change).toBe(21);
    expect(tight.kept).toBe(8);
  });

  it('is taken by a payee with change, all of it when that is all there is; a thief grabs the big notes', () => {
    const owed = takeCash(wallet({ '20': 1, '10': 1 }, 8, 500), 35, MONEY, ROOMY);
    expect(owed.taken).toBe(35);
    expect(cash(owed.money)).toBe(3);
    expect(takeCash(wallet({ '20': 1, '10': 1 }, 8, 500), 100, MONEY, ROOMY)).toEqual({ money: { bills: 0, coins: 0, account: 500, notes: {} }, taken: 38 });
    expect(takeCash(wallet({ '20': 1 }), 0, MONEY, ROOMY).taken).toBe(0);
    const grabbed = grabCash(wallet({ '100': 1, '20': 2, '5': 1 }, 4), 30, MONEY);
    expect(grabbed.taken).toBe(100);
    expect(grabbed.money).toMatchObject({ bills: 45, coins: 4, notes: { '20': 2, '5': 1 } });
  });

  it('goes into the pockets as far as the wallet holds the notes and the pocket the coins', () => {
    const { money, got } = pocket(wallet({ '20': 1 }), { notes: { '50': 1, '10': 3 }, coins: 6 }, MONEY, { notes: 2, coins: 4 });
    expect(got).toEqual({ notes: { '50': 1, '10': 1 }, coins: 4 });
    expect(money).toMatchObject({ bills: 80, coins: 4, notes: { '50': 1, '20': 1, '10': 1 } });
  });

  it('makes up what people carry by how they live: the poor in small notes and coins, the rich in big notes', () => {
    for (let i = 0; i < 40; i++) {
      const amount = 5 + i * 13;
      const poor = purseOf(amount, 'poverty', MONEY, createRng(`poor:${i}`));
      expect(sumNotes(poor.notes) + poor.coins, `${amount}`).toBe(amount);
      expect(Object.keys(poor.notes).map(Number).every((d) => d <= MONEY.purse.biggest.poverty)).toBe(true);
      expect(poor.coins).toBeLessThanOrEqual(MONEY.purse.coins.poverty);
      const rich = purseOf(amount, 'luxury', MONEY, createRng(`rich:${i}`));
      expect(sumNotes(rich.notes) + rich.coins).toBe(amount);
    }
    // The same sum on the same stream is the same notes.
    expect(purseOf(120, 'everyday', MONEY, createRng('same'))).toEqual(purseOf(120, 'everyday', MONEY, createRng('same')));
    // A rich pocket runs to fewer, bigger notes.
    const many = (means: 'poverty' | 'luxury') => Array.from({ length: 30 }, (_, i) => countNotes(purseOf(300, means, MONEY, createRng(`${means}:${i}`)).notes)).reduce((a, b) => a + b, 0);
    expect(many('luxury')).toBeLessThan(many('poverty'));
  });

  it('comes out of a pocket the small notes first when handed over, the big ones first when someone goes through it', () => {
    const purse = { notes: { '50': 1, '20': 2, '5': 2 }, coins: 3 };
    const handed = takeFrom(purse, 30, true);
    // Coins, both fivers, then a twenty: 33, and the big note kept back.
    expect(handed.taken).toEqual({ notes: { '5': 2, '20': 1 }, coins: 3 });
    expect(handed.left).toEqual({ notes: { '50': 1, '20': 1 }, coins: 0 });
    const searched = takeFrom(purse, 30, false);
    expect(searched.taken).toEqual({ notes: { '50': 1 }, coins: 0 });
    expect(takeFrom(purse, 999, true).taken).toEqual(purse);
  });

  it('banks: deposits less the cut for coins, withdraws in notes, changes coins for notes', () => {
    expect(coinFee(0, MONEY)).toBe(0);
    expect(coinFee(40, MONEY)).toBe(2);
    expect(coinFee(4, MONEY)).toBe(0);
    expect(coinFee(10, MONEY)).toBe(1);
    expect(deposit(wallet({ '100': 1 }, 40, 10), MONEY)).toEqual({ money: { bills: 0, coins: 0, account: 148, notes: {} }, fee: 2 });
    const out = withdraw({ bills: 0, coins: 0, account: 348 }, 250, MONEY)!;
    expect(out.notes).toEqual({ '100': 2, '50': 1 });
    expect(out.money).toMatchObject({ bills: 250, account: 98 });
    expect(withdraw({ bills: 0, coins: 0, account: 48 }, 100, MONEY)).toBeNull();
    expect(withdraw({ bills: 0, coins: 0, account: 48 }, 0, MONEY)).toBeNull();
    const changed = changeCoins(wallet({ '10': 1 }, 40), MONEY)!;
    expect(changed).toMatchObject({ fee: 2, notes: { '20': 1, '10': 1, '5': 1, '1': 3 } });
    expect(changed.money).toMatchObject({ bills: 48, coins: 0 });
    expect(changeCoins(wallet({ '10': 1 }), MONEY)).toBeNull();
  });

  it('gives a netrunner a quarter of a chopped chip, and never nothing', () => {
    expect(chipCut(0, MONEY)).toBe(0);
    expect(chipCut(1, MONEY)).toBe(1);
    expect(chipCut(2, MONEY)).toBe(1);
    expect(chipCut(10, MONEY)).toBe(3);
    expect(chipCut(120, MONEY)).toBe(30);
    expect(chipCut(121, MONEY)).toBe(30);
  });
});

describe('notes in the game', () => {
  const world = generateWorld('7f3a29c1', CITY);
  const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
  const NOON = Date.UTC(2077, 9, 13, 12, 0);
  const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf };
  const at = (id: string, money?: Money): Game => {
    const b = world.buildings.find((x) => x.id === id)!;
    const first = new Game(world, RULES);
    first.start(NOON - 1000);
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, first, GENERATOR_VERSION, NOON - 1000)))) as SaveData;
    const progress = progressFor(world, { ...save, where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id }, inside: b.id, room: 'main', ...(money ? { money } : {}) }, GENERATOR_VERSION) as Progress;
    const game = new Game(world, RULES, progress);
    game.start(NOON);
    return game;
  };
  const eatery = world.buildings.find((b) => b.category === 'food' && b.business)!;

  it("starts a new player off with a few small notes, and keeps a save's notes as they are", () => {
    const fresh = new Game(world, RULES);
    expect(fresh.wallet.notes).toEqual(makeNotes(RULES.startingEddies, MONEY, MONEY.most.street));
    const game = at(eatery.id, wallet({ '50': 1, '5': 2, '1': 3 }, 4));
    const saved = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, GENERATOR_VERSION, NOON)))) as SaveData;
    expect(saved.money).toMatchObject({ bills: 63, coins: 4, notes: { '50': 1, '5': 2, '1': 3 } });
    // An older save's bills, with no notes, come back as notes; notes that don't add up are dropped and worked out again.
    const older = at(eatery.id, { bills: 160, coins: 0, account: 0 });
    expect(older.wallet.notes).toEqual({ '100': 1, '50': 1, '10': 1 });
    expect(readSave({ ...JSON.parse(JSON.stringify(saved)), money: { bills: 63, coins: 4, account: 0, notes: { '50': 9 } } })?.money).toEqual({ bills: 63, coins: 4, account: 0 });
  });

  it('pays at a counter with notes, the change back in notes and coins', () => {
    const game = at(eatery.id, wallet({ '100': 1 }));
    const menu = game.menu(NOON);
    const dish = menu?.items.find((i) => i.price > 0 && i.price < 50 && game.canBuy(i.id) === null);
    expect(dish, 'something cheap on the menu').toBeDefined();
    expect(game.buy(dish!.id, NOON)).toBe(true);
    const change = 100 - dish!.price;
    expect(game.wallet.eddies).toBe(change);
    expect(game.wallet.notes).toEqual(cashFor(change, MONEY, MONEY.most.till).notes);
    expect(game.wallet.coins).toBe(change % MONEY.noteMin);
  });

  it("takes a robbery's cash out of the victim's own notes, the small ones first", () => {
    for (let hour = 0; hour < 24 * 7; hour += 3) {
      const now = NOON + hour * 3_600_000;
      const victim = new Game(world, RULES).population.people.find((p) => !p.gang && !/NCPD/.test(p.job.role) && p.eddies >= 20 && whereIs(p, world, clockOf(now), FOOD.dishes, PEOPLE.out)?.spot.kind === 'building');
      if (!victim) continue;
      const spot = whereIs(victim, world, clockOf(now), FOOD.dishes, PEOPLE.out)!.spot.id;
      const game = at(spot, { bills: 0, coins: 0, account: 0, notes: {} });
      if (!game.peopleHere(NOON).some((p) => p.person.id === victim.id)) continue;
      const person = game.population.people.find((p) => p.id === victim.id)!;
      const before = person.eddies;
      expect(game.rob(person.id, NOON)).toBe(true);
      const got = game.wallet.eddies;
      // Whatever came away is notes and coins, and exactly what they lost.
      expect(before - person.eddies).toBe(got);
      expect(sumNotes(game.wallet.notes) + game.wallet.coins).toBe(got);
      return;
    }
    throw new Error('nobody to rob');
  });
});
