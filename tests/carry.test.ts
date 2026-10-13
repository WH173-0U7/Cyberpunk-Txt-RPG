import { describe, expect, it } from 'vitest';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { changeRoom, fits, itemGrams, loadOf, loads, newChipId, newPocketId, placeFor, pocketGrams, stackSlots, totalGrams, walletRoom, type GearContent, type PocketState } from '../src/engine/carry';
import type { Item } from '../src/engine/types';

const dishes = FOOD.dishes;
const worn: PocketState[] = [
  { id: 'jacket', kind: 'jacket', in: null },
  { id: 'pants', kind: 'pants', in: null },
  { id: 'wallet', kind: 'wallet', in: 'pants' },
];
const taco = (count: number, where = 'jacket'): Item => ({ id: 'taco', kind: 'consumable', name: 'Taco', count, in: where });
const sake = (count: number, where = 'jacket'): Item => ({ id: 'sake-utagawa', kind: 'consumable', name: 'Sake Utagawa', count, in: where });

describe('carrying things', () => {
  it('weighs things by what they are, and stacks the small ones two to a slot', () => {
    expect(itemGrams(taco(1), GEAR, dishes)).toBe(GEAR.dish.food);
    expect(itemGrams(sake(1), GEAR, dishes)).toBe(GEAR.dish.alcohol);
    // A dish that says its own weight.
    expect(itemGrams({ id: 'burrito-xxl', kind: 'consumable' }, GEAR, dishes)).toBe(600);
    expect(itemGrams({ id: 'shard-1', kind: 'shard' }, GEAR, dishes)).toBe(GEAR.items.shard.grams);
    expect(stackSlots(taco(1), 1, GEAR)).toBe(1);
    expect(stackSlots(taco(2), 2, GEAR)).toBe(1);
    expect(stackSlots(taco(3), 3, GEAR)).toBe(2);
    expect(stackSlots({ kind: 'shard' }, 10, GEAR)).toBe(1);
    expect(stackSlots({ kind: 'weapon' }, 2, GEAR)).toBe(2);
  });

  it('counts the wallet as a slot of the pants, the bills in it as weight, and the coins as a slot and weight of their own', () => {
    const money = { bills: 320, coins: 0 };
    const walletGrams = GEAR.kinds.wallet!.grams + 320 * GEAR.gramsPerBill;
    expect(loadOf(worn[1] as PocketState, worn, [], money, GEAR, dishes)).toEqual({ slots: 1, grams: Math.round(walletGrams) });
    expect(pocketGrams(worn[2] as PocketState, worn, [], money, GEAR, dishes)).toBe(Math.round(walletGrams));
    expect(loadOf(worn[0] as PocketState, worn, [taco(3), sake(1)], money, GEAR, dishes)).toEqual({ slots: 3, grams: 3 * GEAR.dish.food + GEAR.dish.alcohol });
    expect(totalGrams(worn, [taco(3), sake(1)], money, GEAR, dishes)).toBe(3 * GEAR.dish.food + GEAR.dish.alcohol + Math.round(walletGrams));
    const all = loads(worn, [taco(3)], money, GEAR, dishes);
    expect(all.map((p) => p.id)).toEqual(['jacket', 'pants', 'wallet']);
    expect(all[2]).toMatchObject({ bills: 320, holds: GEAR.kinds.wallet!.holds, over: false, grams: Math.round(walletGrams) });
    expect(loads(worn, [], { bills: 5000, coins: 0 }, GEAR, dishes)[2]?.over).toBe(true);
    // Coins: a slot of the pants when there are any, and heavy.
    const change = { bills: 0, coins: 30 };
    expect(loadOf(worn[1] as PocketState, worn, [], change, GEAR, dishes)).toEqual({ slots: 2, grams: GEAR.kinds.wallet!.grams + 30 * GEAR.gramsPerCoin });
    expect(loads(worn, [], change, GEAR, dishes)[1]).toMatchObject({ coins: 30 });
    expect(loads(worn, [], change, GEAR, dishes)[0]?.coins).toBeUndefined();
  });

  it('knows how many more coins the change pocket will bear', () => {
    const none = { bills: 0, coins: 0 };
    // An empty pants pocket: the weight limit, less the wallet.
    expect(changeRoom(worn, [], none, GEAR, dishes)).toBe(Math.floor((GEAR.kinds.pants!.maxGrams - GEAR.kinds.wallet!.grams) / GEAR.gramsPerCoin));
    // Pants full of things and no coins yet: no slot for them.
    const stuffed = [taco(1, 'pants'), sake(1, 'pants')];
    expect(changeRoom(worn, stuffed, none, GEAR, dishes)).toBe(0);
    // Some coins already there keep their slot; only the weight limits more.
    expect(changeRoom(worn, stuffed, { bills: 0, coins: 10 }, GEAR, dishes)).toBeGreaterThan(0);
    expect(changeRoom(worn.slice(0, 1), [], none, GEAR, dishes)).toBe(0);
  });

  it('puts things where they fit: with their own kind first, then the first pocket with room, or nowhere', () => {
    const items = [taco(1)];
    const fifty = { bills: 50, coins: 0 };
    expect(placeFor(worn, items, fifty, taco(1), 1, GEAR, dishes)).toBe('jacket');
    // A jacket with its four slots full: the pants take it.
    const full = [taco(2), sake(1), sake(1, 'jacket'), { id: 'nicola', kind: 'consumable', name: 'Nicola', count: 2, in: 'jacket' } as Item];
    expect(loadOf(worn[0] as PocketState, worn, full, fifty, GEAR, dishes).slots).toBe(4);
    expect(fits(worn[0] as PocketState, worn, full, fifty, taco(1), 1, GEAR, dishes)).toBe(false);
    expect(placeFor(worn, full, fifty, taco(1), 1, GEAR, dishes)).toBe('pants');
    // Too heavy for the pants, even with slots to spare: nowhere.
    const heavy = [...full, sake(2, 'pants')];
    expect(placeFor(worn, heavy, fifty, sake(1), 1, GEAR, dishes)).toBeNull();
    // The wallet holds eddies and credchips, never things.
    expect(fits(worn[2] as PocketState, worn, [], { bills: 0, coins: 0 }, taco(1), 1, GEAR, dishes)).toBe(false);
    // A bag makes room again.
    const withBag = [...worn, { id: 'duffel-bag-1', kind: 'duffel-bag', in: null }];
    expect(placeFor(withBag, heavy, fifty, sake(1), 1, GEAR, dishes)).toBe('duffel-bag-1');
    expect(newPocketId('duffel-bag', withBag)).toBe('duffel-bag-2');
  });

  it('keeps credchips in the wallet while it has card slots, then in a pocket', () => {
    const chip = (n: number, where = 'wallet'): Item => ({ id: `credchip-${n}`, kind: 'credchip', name: 'CredChip', count: 1, in: where, balance: 10 * n, locked: n % 2 === 0 });
    const none = { bills: 0, coins: 0 };
    expect(fits(worn[2] as PocketState, worn, [], none, chip(1), 1, GEAR, dishes)).toBe(true);
    expect(placeFor(worn, [], none, chip(1), 1, GEAR, dishes)).toBe('wallet');
    // Four card slots; the fifth chip goes in a pocket, a slot of its own.
    const four = [chip(1), chip(2), chip(3), chip(4)];
    expect(fits(worn[2] as PocketState, worn, four, none, chip(5), 1, GEAR, dishes)).toBe(false);
    expect(placeFor(worn, four, none, chip(5), 1, GEAR, dishes)).toBe('jacket');
    expect(loadOf(worn[0] as PocketState, worn, [...four, chip(5, 'jacket')], none, GEAR, dishes)).toEqual({ slots: 1, grams: GEAR.items.credchip.grams });
    // They weigh a little, and the wallet says how many it holds.
    expect(loadOf(worn[2] as PocketState, worn, four, none, GEAR, dishes).grams).toBe(4 * GEAR.items.credchip.grams);
    expect(loads(worn, four, none, GEAR, dishes)[2]).toMatchObject({ chips: 4, chipSlots: GEAR.kinds.wallet!.chips, over: false });
    expect(loads(worn, [...four, chip(5)], none, GEAR, dishes)[2]?.over).toBe(true);
    expect(loads(worn, four, none, GEAR, dishes)[0]?.chips).toBeUndefined();
    // Each chip is its own thing, with its own id.
    expect(newChipId(four)).toBe('credchip-5');
    expect(newChipId([])).toBe('credchip-1');
  });

  it('knows how many more bills the wallet will hold, and none without one', () => {
    const holds = GEAR.kinds.wallet!.holds ?? 0;
    expect(walletRoom(worn, { bills: 0, coins: 0 }, GEAR)).toBe(holds);
    expect(walletRoom(worn, { bills: holds - 10, coins: 400 }, GEAR)).toBe(10);
    expect(walletRoom(worn, { bills: holds + 500, coins: 0 }, GEAR)).toBe(0);
    expect(walletRoom(worn.slice(0, 2), { bills: 0, coins: 0 }, GEAR)).toBe(0);
  });

  it('copes with pockets of a kind the rules do not have', () => {
    const odd: PocketState[] = [{ id: 'x', kind: 'nothing', in: null }];
    const rules: GearContent = { ...GEAR, kinds: {} };
    expect(loadOf(odd[0] as PocketState, odd, [taco(1, 'x')], { bills: 0, coins: 0 }, rules, dishes)).toEqual({ slots: 1, grams: GEAR.dish.food });
    expect(placeFor(odd, [], { bills: 0, coins: 0 }, taco(1), 1, rules, dishes)).toBeNull();
  });
});
