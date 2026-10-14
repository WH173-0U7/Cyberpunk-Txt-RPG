import { describe, expect, it } from 'vitest';
import { fits, itemGrams, placeFor, stackSlots, type PocketState } from '../src/engine/carry';
import { drawWeapon, isGun, isLong, stockFor, weaponGrams } from '../src/engine/weapons';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { ARMS } from '../src/data/weapons';
import type { Item } from '../src/engine/types';

const none = { bills: 0, coins: 0 };
const dishes = FOOD.dishes;

describe('the weapons', () => {
  it('are the wiki\'s, each with a class that exists, and every gun a magazine and a round it takes', () => {
    const names = new Set<string>();
    for (const [id, weapon] of Object.entries(ARMS.weapons)) {
      expect(ARMS.classes[weapon.class], id).toBeDefined();
      expect(weapon.price, id).toBeGreaterThan(0);
      expect(['luxury', 'everyday', 'poverty']).toContain(weapon.quality);
      expect(weapon.note.length, id).toBeGreaterThan(10);
      expect(names.has(weapon.name), id).toBe(false);
      names.add(weapon.name);
      if (isGun(weapon, ARMS)) {
        expect(weapon.magazine, id).toBeGreaterThan(0);
        expect(ARMS.ammo[ARMS.classes[weapon.class]!.ammo!], id).toBeDefined();
        expect(weapon.maker, id).toBeTruthy();
        expect(['Power', 'Tech', 'Smart']).toContain(weapon.tech);
      } else {
        expect(weapon.magazine, id).toBeUndefined();
        expect(ARMS.classes[weapon.class]?.cut, id).toBeDefined();
      }
    }
    // Iconic weapons are one of a kind in the game: none of them is on a rack.
    for (const iconic of ['Apparition', 'Order', 'Malorian Arms 3516', 'Skippy', 'Satori', 'Overwatch', 'Comrade\'s Hammer', 'Kongou', 'La Chingona Dorada', 'Divided We Stand']) expect(names.has(iconic), iconic).toBe(false);
  });

  it('take the wiki\'s four kinds of ammo, each box a slot', () => {
    expect(Object.values(ARMS.ammo).map((a) => a.name).sort()).toEqual(['Handgun Ammo', 'Heavy Ammo', 'Shotgun Ammo', 'Sniper Ammo']);
    for (const [id, ammo] of Object.entries(ARMS.ammo)) {
      expect(stackSlots({ id, kind: 'ammo' }, ammo.box, GEAR), id).toBe(1);
      expect(stackSlots({ id, kind: 'ammo' }, ammo.box + 1, GEAR), id).toBe(2);
      expect(itemGrams({ id, kind: 'ammo' }, GEAR, dishes), id).toBe(ammo.grams);
    }
  });

  it('stock a store from its tier, the same for the same store and not for another', () => {
    const everyday = stockFor('seed', 'b1', 'everyday', { guns: 8 }, ARMS);
    expect(everyday).toHaveLength(8);
    expect(stockFor('seed', 'b1', 'everyday', { guns: 8 }, ARMS)).toEqual(everyday);
    expect(stockFor('seed', 'b2', 'everyday', { guns: 8 }, ARMS)).not.toEqual(everyday);
    for (const id of everyday) expect(ARMS.tiers.everyday).toContain(ARMS.weapons[id]?.quality);
    for (const id of stockFor('seed', 'b1', 'luxury', { guns: 8 }, ARMS)) expect(ARMS.tiers.luxury).toContain(ARMS.weapons[id]?.quality);
    // A gunsmith reaches a tier up; a blade shop has no guns, and a gun shop no blades.
    const up = stockFor('seed', 'b1', 'everyday', { guns: 40, up: true }, ARMS);
    expect(up.some((id) => ARMS.weapons[id]?.quality === 'luxury')).toBe(true);
    expect(stockFor('seed', 'b1', 'poverty', { melee: 7 }, ARMS).every((id) => !isGun(ARMS.weapons[id]!, ARMS))).toBe(true);
    expect(everyday.every((id) => isGun(ARMS.weapons[id]!, ARMS))).toBe(true);
    // Listed by class, then price.
    const order = Object.keys(ARMS.classes);
    const ranks = everyday.map((id) => order.indexOf(ARMS.weapons[id]!.class));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe('carrying weapons', () => {
  const pockets: PocketState[] = [
    { id: 'jacket', kind: 'jacket', in: null },
    { id: 'pants', kind: 'pants', in: null },
    { id: 'wallet', kind: 'wallet', in: 'pants' },
  ];
  const pistol = { id: 'lexington-1', kind: 'weapon' as const, weapon: 'lexington' };
  const rifle = { id: 'ajax-1', kind: 'weapon' as const, weapon: 'ajax' };
  const katana = { id: 'katana-1', kind: 'weapon' as const, weapon: 'katana' };

  it('weighs a gun with the rounds in it', () => {
    const lex = ARMS.weapons.lexington!;
    expect(itemGrams(pistol, GEAR, dishes)).toBe(weaponGrams(lex, ARMS));
    expect(itemGrams({ ...pistol, loaded: 20 }, GEAR, dishes)).toBe(weaponGrams(lex, ARMS) + 20 * ARMS.ammo['handgun-ammo']!.grams);
  });

  it('puts a pistol in a pocket, and a rifle or a katana only in a bag that takes something long', () => {
    expect(isLong(pistol, ARMS)).toBe(false);
    expect(isLong(rifle, ARMS)).toBe(true);
    expect(isLong(katana, ARMS)).toBe(true);
    expect(placeFor(pockets, [], none, pistol, 1, GEAR, dishes)).toBe('jacket');
    expect(placeFor(pockets, [], none, rifle, 1, GEAR, dishes)).toBeNull();
    expect(placeFor(pockets, [], none, katana, 1, GEAR, dishes)).toBeNull();
    const pouch = [...pockets, { id: 'belt-pouch-1', kind: 'belt-pouch', in: null }];
    expect(placeFor(pouch, [], none, rifle, 1, GEAR, dishes)).toBeNull();
    const bag = [...pockets, { id: 'backpack-1', kind: 'backpack', in: null }];
    expect(placeFor(bag, [], none, rifle, 1, GEAR, dishes)).toBe('backpack-1');
    expect(placeFor(bag, [], none, katana, 1, GEAR, dishes)).toBe('backpack-1');
    // An LMG is too heavy for a backpack, but not for a duffel.
    const lmg = { id: 'defender-1', kind: 'weapon' as const, weapon: 'defender' };
    expect(placeFor(bag, [], none, lmg, 1, GEAR, dishes)).toBeNull();
    expect(placeFor([...pockets, { id: 'duffel-bag-1', kind: 'duffel-bag', in: null }], [], none, lmg, 1, GEAR, dishes)).toBe('duffel-bag-1');
  });

  it('keeps a holster for a weapon, and a gun case for guns and their rounds', () => {
    const holster: PocketState = { id: 'holster-1', kind: 'holster', in: null };
    const taco = { id: 'taco', kind: 'consumable' as const };
    expect(fits(holster, [holster], [], none, pistol, 1, GEAR, dishes)).toBe(true);
    expect(fits(holster, [holster], [], none, taco, 1, GEAR, dishes)).toBe(false);
    expect(fits(holster, [holster], [], none, { id: 'handgun-ammo', kind: 'ammo' }, 50, GEAR, dishes)).toBe(false);
    expect(fits(holster, [holster], [], none, rifle, 1, GEAR, dishes)).toBe(false);
    const gunCase: PocketState = { id: 'gun-case-1', kind: 'gun-case', in: null };
    expect(fits(gunCase, [gunCase], [], none, rifle, 1, GEAR, dishes)).toBe(true);
    expect(fits(gunCase, [gunCase], [], none, { id: 'heavy-ammo', kind: 'ammo' }, 60, GEAR, dishes)).toBe(true);
    expect(fits(gunCase, [gunCase], [], none, taco, 1, GEAR, dishes)).toBe(false);
  });

  it('draws a loaded gun before an empty one, and any gun before a blade', () => {
    const items: Item[] = [
      { id: 'katana-1', kind: 'weapon', weapon: 'katana', name: 'Katana', count: 1, in: 'bag' },
      { id: 'kenshin-1', kind: 'weapon', weapon: 'kenshin', name: 'JKE-X2 Kenshin', count: 1, in: 'jacket', loaded: 0 },
      { id: 'unity-1', kind: 'weapon', weapon: 'unity', name: 'Unity', count: 1, in: 'jacket', loaded: 3 },
    ];
    expect(drawWeapon(items, ARMS)?.item.id).toBe('unity-1');
    expect(drawWeapon(items.slice(0, 2), ARMS)?.item.id).toBe('kenshin-1');
    expect(drawWeapon(items.slice(0, 1), ARMS)).toMatchObject({ gun: false });
    expect(drawWeapon([], ARMS)).toBeNull();
  });
});
