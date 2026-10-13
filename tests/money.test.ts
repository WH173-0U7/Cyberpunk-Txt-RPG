import { describe, expect, it } from 'vitest';
import { MONEY } from '../src/data/money';
import { cash, changeCoins, coinFee, deposit, freshMoney, payCash, splitLoot, takeCash, withdraw } from '../src/engine/money';

describe('money', () => {
  it('pays coins first, then bills in notes, with the difference back in coins', () => {
    const paid = payCash({ bills: 50, coins: 3, account: 0 }, 7, MONEY, 999);
    // 3 €$ in coins, then a 5 €$ note for the remaining 4: 1 €$ back in coins.
    expect(paid).toEqual({ money: { bills: 45, coins: 1, account: 0 }, change: 1, kept: 0 });
    // Round prices need no change.
    expect(payCash({ bills: 50, coins: 0, account: 0 }, 20, MONEY, 999)).toEqual({ money: { bills: 30, coins: 0, account: 0 }, change: 0, kept: 0 });
    // 21 €$ from bills: a 25 handed over, 4 back.
    expect(payCash({ bills: 50, coins: 0, account: 0 }, 21, MONEY, 999)?.money).toEqual({ bills: 25, coins: 4, account: 0 });
    // Coins cover it outright.
    expect(payCash({ bills: 50, coins: 9, account: 0 }, 9, MONEY, 999)?.money).toEqual({ bills: 50, coins: 0, account: 0 });
    // The bills can't round up past what there is: the exact rest comes out of them.
    expect(payCash({ bills: 23, coins: 0, account: 0 }, 23, MONEY, 999)?.money).toEqual({ bills: 0, coins: 0, account: 0 });
    // No room for the change: the counter keeps it.
    expect(payCash({ bills: 50, coins: 0, account: 0 }, 21, MONEY, 1)).toEqual({ money: { bills: 25, coins: 1, account: 0 }, change: 1, kept: 3 });
    // Short.
    expect(payCash({ bills: 5, coins: 1, account: 100 }, 7, MONEY, 999)).toBeNull();
    expect(cash({ bills: 5, coins: 1, account: 100 })).toBe(6);
    expect(freshMoney(50)).toEqual({ bills: 50, coins: 0, account: 0 });
  });

  it('is taken bills first, and comes as mostly bills', () => {
    expect(takeCash({ bills: 30, coins: 8, account: 500 }, 35)).toEqual({ money: { bills: 0, coins: 3, account: 500 }, taken: 35 });
    expect(takeCash({ bills: 30, coins: 8, account: 500 }, 100)).toEqual({ money: { bills: 0, coins: 0, account: 500 }, taken: 38 });
    expect(takeCash({ bills: 30, coins: 8, account: 500 }, 0).taken).toBe(0);
    expect(splitLoot(40, MONEY)).toEqual({ bills: 32, coins: 8 });
    expect(splitLoot(0, MONEY)).toEqual({ bills: 0, coins: 0 });
  });

  it('banks: deposits less the cut for coins, withdraws bills, changes coins for bills', () => {
    expect(coinFee(0, MONEY)).toBe(0);
    expect(coinFee(40, MONEY)).toBe(2);
    expect(coinFee(4, MONEY)).toBe(0);
    expect(coinFee(10, MONEY)).toBe(1);
    expect(deposit({ bills: 100, coins: 40, account: 10 }, MONEY)).toEqual({ money: { bills: 0, coins: 0, account: 148 }, fee: 2 });
    expect(deposit({ bills: 100, coins: 0, account: 0 }, MONEY)).toEqual({ money: { bills: 0, coins: 0, account: 100 }, fee: 0 });
    expect(withdraw({ bills: 0, coins: 0, account: 148 }, 100)).toEqual({ bills: 100, coins: 0, account: 48 });
    expect(withdraw({ bills: 0, coins: 0, account: 48 }, 100)).toBeNull();
    expect(withdraw({ bills: 0, coins: 0, account: 48 }, 0)).toBeNull();
    expect(changeCoins({ bills: 10, coins: 40, account: 0 }, MONEY)).toEqual({ money: { bills: 48, coins: 0, account: 0 }, fee: 2 });
    expect(changeCoins({ bills: 10, coins: 0, account: 0 }, MONEY)).toBeNull();
  });
});
