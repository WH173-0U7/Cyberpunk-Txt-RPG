import { VALUABLES } from './valuables';
import type { GearContent } from '../engine/carry';
import { GARMENTS, SLOTS, STORE_QUALITY, STORES, STYLES } from './clothing';
import { CHROME } from './cyberware';
import { HACKS } from './quickhacks';
import { DRUGS } from './drugs';
import { MEDICAL } from './medical';
import { ARMS } from './weapons';

/**
 * What the player carries things in. The clothes on your back come first: every garment is
 * a real piece of 2077 clothing from the wiki (`src/data/clothing.ts`), worn in one of the
 * wiki's six slots, and the ones with pockets carry things; the wallet rides in the pants.
 * Bags are sold by general stores, thrift shops and clothing stores. Eddies are cash (2077's
 * eurodollars, per the wiki: hologram-marked bills, and the 2020 coins carried forward) and
 * weigh what cash weighs: a note next to nothing, coins a lot, so a pocketful of change is a
 * heavy one; credchips (the wiki's 2020 chips of eurodollars) ride in the wallet's card
 * slots. The wiki's 2077 clothing has no bags, so those are plain things named for what they
 * are; every number here is ours. Gun stores sell a holster (one handgun or knife, off your
 * pockets) and a gun case; a rifle or a katana goes only in a bag that takes something long
 * (the weapons and the ammo are `src/data/weapons.ts`).
 */
export const GEAR: GearContent = {
  gramsPerNote: 1,
  gramsPerCoin: 6,
  items: {
    weapon: { grams: 2500, perSlot: 1 },
    ammo: { grams: 15, perSlot: 50 },
    attachment: { grams: 200, perSlot: 2 },
    cyberware: { grams: 400, perSlot: 1 },
    quickhack: { grams: 5, perSlot: 10 },
    clothing: { grams: 600, perSlot: 1 },
    consumable: { grams: 250, perSlot: 2 },
    shard: { grams: 5, perSlot: 10 },
    credchip: { grams: 5, perSlot: 1 },
    junk: { grams: 300, perSlot: 1 },
    component: { grams: 100, perSlot: 5 },
  },
  arms: ARMS,
  chrome: CHROME,
  hacks: HACKS,
  medical: MEDICAL,
  drugs: DRUGS,
  // Something to cut product with: ours, since the wiki names no cutting agent. A pharmacy, a
  // general store or a bodega sells it as if it were for something else.
  components: {
    'cutting-agent': { name: 'Cutting agent', note: 'A fine white powder that is sold for something else, and bought for this. A dose of it stretches a package by a dose.', grams: 4, perSlot: 20, price: 3, stores: ['pharmacy', 'general-store', 'bodega'] },
  },
  dish: { food: 250, drink: 350, alcohol: 650 },
  kinds: {
    wallet: { name: 'Wallet', slots: 0, maxGrams: 0, grams: 40, holds: 40, chips: 4 },
    'belt-pouch': { name: 'Belt pouch', slots: 2, maxGrams: 800, grams: 80, price: 12, note: 'Two pockets more, on a strap.' },
    'messenger-bag': { name: 'Messenger bag', slots: 5, maxGrams: 5000, grams: 450, price: 30, note: 'Slung across the chest. Five slots, five kilos; a rifle rides along the strap.', long: true },
    'duffel-bag': { name: 'Duffel bag', slots: 8, maxGrams: 9000, grams: 700, price: 40, note: 'Eight slots and nine kilos, over one shoulder. Long enough for a rifle.', long: true },
    backpack: { name: 'Backpack', slots: 7, maxGrams: 8000, grams: 600, price: 55, note: 'Seven slots, eight kilos, both hands free. A rifle sticks out the top.', long: true },
    holster: { name: 'Holster', slots: 1, maxGrams: 2000, grams: 250, price: 25, note: 'On the hip: one sidearm or one blade, out of your pockets. Nothing long.', only: ['weapon'] },
    'gun-case': { name: 'Gun case', slots: 3, maxGrams: 12000, grams: 2400, price: 70, note: 'A hard case with a handle. Three slots and twelve kilos, for guns and their rounds only.', long: true, only: ['weapon', 'ammo', 'attachment'] },
    ...GARMENTS,
  },
  // A new player is dressed off the thrift rack, head bare, the wallet in the pants.
  start: [
    { id: 'tank', kind: 'tank', in: null },
    { id: 'jacket', kind: 'jacket', in: null },
    { id: 'pants', kind: 'pants', in: null },
    { id: 'high-tops', kind: 'high-tops', in: null },
    { id: 'wallet', kind: 'wallet', in: 'pants' },
  ],
  valuables: VALUABLES,
  racks: {
    'general-store': ['belt-pouch', 'duffel-bag', 'backpack'],
    'thrift-shop': [...STORES['thrift-shop'], 'belt-pouch', 'messenger-bag', 'duffel-bag'],
    'clothing-store': [...STORES['clothing-store'], 'messenger-bag', 'backpack'],
    boutique: [...STORES.boutique, 'messenger-bag'],
    stylishly: [...STORES.stylishly, 'backpack'],
    jinguji: STORES.jinguji,
    avante: STORES.avante,
    saekos: STORES.saekos,
    'ded-zed': STORES['ded-zed'],
    // Weapon stores rack these beside their guns and their blades (`ARMS.stores`).
    'gun-shop': ['holster', 'gun-case'],
    gunsmith: ['holster', 'gun-case'],
    'ammo-shop': ['holster'],
    'blade-shop': ['holster'],
  },
  quality: STORE_QUALITY,
  slotLabels: SLOTS,
  styleLabels: STYLES,
  labels: { luxury: 'Luxury', everyday: 'Everyday', poverty: 'Secondhand' },
  blurbs: {
    bags: 'Bags and belts on the rack: more pockets, for a price.',
    luxury: 'Designer racks, a tailor in the back, and prices that assume you are not asking.',
    everyday: 'Racks of clothes people actually wear, at prices people actually pay.',
    poverty: 'Secondhand racks: worn, washed and priced to move.',
  },
};
