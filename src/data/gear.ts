import type { GearContent } from '../engine/carry';

/**
 * What the player carries things in. The pockets of the clothes on your back come first,
 * with the wallet in the pants; bags are sold by general stores, thrift shops and clothing
 * stores. Eddies are cash (2077's eurodollars: hologram-marked bills and small coins, per the
 * wiki) and weigh what cash weighs, so a fat wallet is a heavy one. The wiki's 2077 clothing
 * has no bags, so these are plain things named for what they are; every number here is ours.
 */
export const GEAR: GearContent = {
  gramsPerEddy: 1,
  items: {
    weapon: { grams: 2500, perSlot: 1 },
    attachment: { grams: 200, perSlot: 2 },
    cyberware: { grams: 400, perSlot: 1 },
    quickhack: { grams: 5, perSlot: 10 },
    clothing: { grams: 600, perSlot: 1 },
    consumable: { grams: 250, perSlot: 2 },
    shard: { grams: 5, perSlot: 10 },
    junk: { grams: 300, perSlot: 1 },
    component: { grams: 100, perSlot: 5 },
  },
  dish: { food: 250, drink: 350, alcohol: 650 },
  kinds: {
    jacket: { name: 'Jacket pockets', slots: 4, maxGrams: 2000, grams: 0 },
    pants: { name: 'Pants pockets', slots: 3, maxGrams: 1500, grams: 0 },
    wallet: { name: 'Wallet', slots: 0, maxGrams: 0, grams: 40, holds: 1000 },
    'belt-pouch': { name: 'Belt pouch', slots: 2, maxGrams: 800, grams: 80, price: 12, note: 'Two pockets more, on a strap.' },
    'messenger-bag': { name: 'Messenger bag', slots: 5, maxGrams: 5000, grams: 450, price: 30, note: 'Slung across the chest. Five slots, five kilos.' },
    'duffel-bag': { name: 'Duffel bag', slots: 8, maxGrams: 9000, grams: 700, price: 40, note: 'Eight slots and nine kilos, over one shoulder.' },
    backpack: { name: 'Backpack', slots: 7, maxGrams: 8000, grams: 600, price: 55, note: 'Seven slots, eight kilos, both hands free.' },
  },
  start: [
    { id: 'jacket', kind: 'jacket', in: null },
    { id: 'pants', kind: 'pants', in: null },
    { id: 'wallet', kind: 'wallet', in: 'pants' },
  ],
  racks: {
    'general-store': ['belt-pouch', 'duffel-bag', 'backpack'],
    'thrift-shop': ['belt-pouch', 'messenger-bag', 'duffel-bag'],
    'clothing-store': ['messenger-bag', 'backpack'],
    boutique: ['messenger-bag'],
  },
  blurb: 'Bags and belts on the rack: more pockets, for a price.',
};
