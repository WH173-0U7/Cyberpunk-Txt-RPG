import { implantGrams, implantOf, type ChromeContent } from './cyberware';
import type { HackContent } from './combat';
import type { Dish, Quality } from './food';
import type { Money } from './money';
import type { Item, ItemKind } from './types';
import { type ArmsContent, isLong, weaponGrams, weaponOf } from './weapons';

/** Where a garment is worn, after the wiki's 2077 clothing slots. */
export type Slot = 'head' | 'face' | 'outer' | 'inner' | 'legs' | 'feet';
/** The wiki's four styles of 2077. */
export type Style = 'entropism' | 'kitsch' | 'neomilitarism' | 'neokitsch';

/** The cash a pocket has to bear: bills in the wallet, coins loose in the change pocket. */
export type Cash = Pick<Money, 'bills' | 'coins'>;

/**
 * What the player carries, and in what. Nothing floats along behind you in Night City: every
 * item takes a slot in a pocket (a jacket's, pants', a bag's), every pocket has only so many
 * slots and bears only so much weight, and eddies are cash: bills in a wallet that sits in a
 * pocket, coins loose in another, each weighing what it weighs; credchips ride in the
 * wallet's card slots, and in a pocket when those are full. Buying something means there's
 * a pocket with room for it; getting paid means the wallet has room for the bills and the
 * pocket for the coins. The numbers are in `src/data/gear.ts`.
 */

/** A kind of pocket or bag, or a garment with pockets (or none): its room, its own weight, and (for a wallet) how many eddies it holds. */
export interface PocketKind {
  name: string;
  /** Where it's worn, for a garment. Bags and the wallet have no slot. */
  slot?: Slot;
  brand?: string;
  style?: Style;
  /** The tier it belongs to, for a garment: what kind of store carries it. */
  quality?: Quality;
  /** How many stacks of things fit. A wallet has none; it holds eddies; a tank top has none at all. */
  slots: number;
  /** The most its contents can weigh, in grams. */
  maxGrams: number;
  /** What it weighs empty. */
  grams: number;
  /** Bills it holds, in €$, for a wallet. */
  holds?: number;
  /** Credchips it holds, for a wallet: its card slots. */
  chips?: number;
  /** Where loose coins go: a slot of this pocket when there are any, and their weight. */
  change?: boolean;
  /** What it costs where it's sold; nothing for the pockets of the clothes on your back. */
  price?: number;
  note?: string;
  /** For a garment that hides the face (a gas mask, a ballistic mask, a balaclava, a menpō): the word for it. Glasses and goggles don't. */
  mask?: string;
  /** For a bag: it takes something long, a rifle or a katana, which no pocket of a garment does. */
  long?: boolean;
  /** The only kinds of thing it takes, for a holster or a gun case. */
  only?: ItemKind[];
}

/** A pocket the player has: which kind it is, and where it sits (worn, or in another pocket). */
export interface PocketState {
  id: string;
  kind: string;
  in: string | null;
}

export interface GearContent {
  /** Grams per €$ in bills (a note weighs about a gram, and most are twenties and up). */
  gramsPerBill: number;
  /** Grams per €$ in coins (a €$1 coin of nickel, tin and aluminum). */
  gramsPerCoin: number;
  /** What a thing of each kind weighs and how many share a slot, unless the thing says otherwise. */
  items: Record<ItemKind, { grams: number; perSlot: number }>;
  /** Weapons and ammo: what each weighs, how many rounds share a slot, which are too long for a pocket (src/data/weapons.ts). */
  arms: ArmsContent;
  /** Cyberware: what an implant carried weighs, by the part of the body it's for (src/data/cyberware.ts). */
  chrome: ChromeContent;
  /** Quickhacks, and the stores that sell them (src/data/quickhacks.ts). */
  hacks: HackContent;
  /** Grams by kind of dish, unless the dish says its own. */
  dish: Record<Dish['kind'], number>;
  kinds: Record<string, PocketKind>;
  /** What a new player wears. */
  start: PocketState[];
  /** What each kind of store (by business id) has on its rack: garments and bags, by kind. */
  racks: Record<string, string[]>;
  /** The tier a store sells at, by business id; a store not listed draws one from its district like an eatery. */
  quality: Record<string, Quality>;
  slotLabels: Record<Slot, string>;
  styleLabels: Record<Style, string>;
  /** What a rack is, in the panel and on the menu: a store of each tier, or bags only. */
  labels: Record<Quality, string>;
  blurbs: Record<Quality | 'bags', string>;
}

export interface Load {
  slots: number;
  grams: number;
}

/** A pocket with everything about it worked out, for the inventory. */
export interface PocketLoad extends PocketState {
  name: string;
  /** For a garment: where it's worn, and what it is. */
  slot?: Slot;
  brand?: string;
  style?: Style;
  quality?: Quality;
  note?: string;
  /** For a garment that hides the face: the word for it. */
  mask?: string;
  slots: number;
  maxGrams: number;
  /** Slots and grams taken by what's inside (and inner pockets, each a slot). */
  load: Load;
  /** What it weighs all told, itself included. */
  grams: number;
  /** For a wallet: the bills in it and the most it holds. */
  bills?: number;
  holds?: number;
  /** For a wallet: the credchips in it, and its card slots. */
  chips?: number;
  chipSlots?: number;
  /** For the change pocket: the coins in it, in €$. */
  coins?: number;
  over: boolean;
}

/** What one of something weighs, in grams: a dish its own, a garment what it weighs on you, a gun with the rounds in it, a round of ammo by its kind, anything else by its kind. */
export function itemGrams(item: Pick<Item, 'id' | 'kind' | 'gear' | 'weapon' | 'loaded'>, gear: GearContent, dishes: Dish[]): number {
  if (item.kind === 'consumable') {
    const dish = dishes.find((d) => d.id === item.id);
    if (dish) return dish.grams ?? gear.dish[dish.kind];
  }
  if (item.kind === 'clothing') {
    const kind = gear.kinds[item.gear ?? item.id];
    if (kind) return kind.grams;
  }
  if (item.kind === 'weapon') {
    const weapon = weaponOf(item, gear.arms);
    if (weapon) {
      const ammo = gear.arms.ammo[gear.arms.classes[weapon.class]?.ammo ?? ''];
      return weaponGrams(weapon, gear.arms) + (item.loaded ?? 0) * (ammo?.grams ?? 0);
    }
  }
  if (item.kind === 'ammo') {
    const ammo = gear.arms.ammo[item.id];
    if (ammo) return ammo.grams;
  }
  const implant = implantOf(item, gear.chrome);
  if (implant) return implantGrams(implant, gear.chrome);
  return gear.items[item.kind]?.grams ?? 250;
}

/** The garments worn, in the order of the slots, and the bags carried. */
export function outfit(pockets: PocketState[], gear: GearContent): { worn: Partial<Record<Slot, PocketState>>; bags: PocketState[] } {
  const worn: Partial<Record<Slot, PocketState>> = {};
  const bags: PocketState[] = [];
  for (const p of pockets) {
    if (p.in !== null) continue;
    const slot = gear.kinds[p.kind]?.slot;
    if (slot) worn[slot] ??= p;
    else bags.push(p);
  }
  return { worn, bags };
}

/** How many slots a stack of `count` of something takes: so many rounds of ammo to a slot by their kind, anything else by its kind. */
export function stackSlots(item: Pick<Item, 'id' | 'kind'>, count: number, gear: GearContent): number {
  const ammo = item.kind === 'ammo' ? gear.arms.ammo[item.id] : undefined;
  const perSlot = Math.max(1, ammo?.perSlot ?? gear.items[item.kind]?.perSlot ?? 1);
  return Math.ceil(Math.max(0, count) / perSlot);
}

function kindOf(pocket: PocketState, gear: GearContent): PocketKind {
  return gear.kinds[pocket.kind] ?? { name: pocket.kind, slots: 0, maxGrams: 0, grams: 0 };
}

/** How many credchips are in a pocket. */
function chipsIn(pocket: PocketState, items: Item[]): number {
  return items.filter((i) => i.kind === 'credchip' && i.in === pocket.id).reduce((n, i) => n + i.count, 0);
}

/** What a pocket weighs all told: itself, its things, its inner pockets, and the cash in it. */
export function pocketGrams(pocket: PocketState, pockets: PocketState[], items: Item[], money: Cash, gear: GearContent, dishes: Dish[]): number {
  return kindOf(pocket, gear).grams + loadOf(pocket, pockets, items, money, gear, dishes).grams;
}

/** The slots and grams taken by what's inside a pocket: each stack by its kind, each inner pocket a slot and all it weighs, the bills in a wallet, the coins in the change pocket (a slot when there are any). */
export function loadOf(pocket: PocketState, pockets: PocketState[], items: Item[], money: Cash, gear: GearContent, dishes: Dish[]): Load {
  const kind = kindOf(pocket, gear);
  let slots = kind.change && money.coins > 0 ? 1 : 0;
  let grams = (kind.holds !== undefined ? money.bills * gear.gramsPerBill : 0) + (kind.change ? money.coins * gear.gramsPerCoin : 0);
  for (const item of items) {
    if (item.in !== pocket.id) continue;
    slots += stackSlots(item, item.count, gear);
    grams += item.count * itemGrams(item, gear, dishes);
  }
  for (const inner of pockets) {
    if (inner.in !== pocket.id || inner.id === pocket.id) continue;
    slots += 1;
    grams += pocketGrams(inner, pockets, items, money, gear, dishes);
  }
  return { slots, grams: Math.round(grams) };
}

/** Whether `count` more of something fit in a pocket, joining a stack of it already there if there is one. A wallet takes credchips in its card slots, and nothing else; a holster takes only what it's for; something long goes only in a bag that takes it. */
export function fits(pocket: PocketState, pockets: PocketState[], items: Item[], money: Cash, item: Pick<Item, 'id' | 'kind' | 'gear' | 'weapon' | 'loaded'>, count: number, gear: GearContent, dishes: Dish[]): boolean {
  const kind = kindOf(pocket, gear);
  if (kind.holds !== undefined) return item.kind === 'credchip' && chipsIn(pocket, items) + count <= (kind.chips ?? 0);
  if (kind.slots <= 0) return false;
  if (kind.only && !kind.only.includes(item.kind)) return false;
  if (!kind.long && isLong(item, gear.arms)) return false;
  const load = loadOf(pocket, pockets, items, money, gear, dishes);
  const stack = items.find((i) => i.id === item.id && i.in === pocket.id);
  const slotsAfter = load.slots - (stack ? stackSlots(item, stack.count, gear) : 0) + stackSlots(item, (stack?.count ?? 0) + count, gear);
  const gramsAfter = load.grams + count * itemGrams(item, gear, dishes);
  return slotsAfter <= kind.slots && gramsAfter <= kind.maxGrams;
}

/** The pocket to put `count` of something in: the wallet for a credchip while it has a card slot free; else one already holding some of it if that has room, else the first with room. Null when nothing fits. */
export function placeFor(pockets: PocketState[], items: Item[], money: Cash, item: Pick<Item, 'id' | 'kind' | 'gear' | 'weapon' | 'loaded'>, count: number, gear: GearContent, dishes: Dish[]): string | null {
  const roomy = pockets.filter((p) => fits(p, pockets, items, money, item, count, gear, dishes));
  const wallet = item.kind === 'credchip' ? roomy.find((p) => kindOf(p, gear).holds !== undefined) : undefined;
  const same = roomy.find((p) => items.some((i) => i.id === item.id && i.in === p.id));
  return (wallet ?? same ?? roomy[0])?.id ?? null;
}

/** How many more €$ in bills the wallet (or wallets) will hold. None without one. */
export function walletRoom(pockets: PocketState[], money: Cash, gear: GearContent): number {
  const holds = pockets.reduce((sum, p) => sum + (kindOf(p, gear).holds ?? 0), 0);
  return Math.max(0, holds - money.bills);
}

/** How many more €$ in coins the change pocket will bear: a free slot if there are none yet, and the weight. None without one. */
export function changeRoom(pockets: PocketState[], items: Item[], money: Cash, gear: GearContent, dishes: Dish[]): number {
  let room = 0;
  for (const pocket of pockets) {
    const kind = kindOf(pocket, gear);
    if (!kind.change) continue;
    const load = loadOf(pocket, pockets, items, money, gear, dishes);
    if (money.coins <= 0 && load.slots >= kind.slots) continue;
    room += Math.max(0, Math.floor((kind.maxGrams - load.grams) / gear.gramsPerCoin));
  }
  return room;
}

/** Everything carried, in grams: the worn pockets and all that's in them. */
export function totalGrams(pockets: PocketState[], items: Item[], money: Cash, gear: GearContent, dishes: Dish[]): number {
  return pockets.filter((p) => p.in === null).reduce((sum, p) => sum + pocketGrams(p, pockets, items, money, gear, dishes), 0);
}

/** Every pocket, worked out. */
export function loads(pockets: PocketState[], items: Item[], money: Cash, gear: GearContent, dishes: Dish[]): PocketLoad[] {
  return pockets.map((pocket) => {
    const kind = kindOf(pocket, gear);
    const load = loadOf(pocket, pockets, items, money, gear, dishes);
    const out: PocketLoad = {
      ...pocket,
      name: kind.name,
      ...(kind.slot ? { slot: kind.slot } : {}),
      ...(kind.brand ? { brand: kind.brand } : {}),
      ...(kind.style ? { style: kind.style } : {}),
      ...(kind.quality ? { quality: kind.quality } : {}),
      ...(kind.note ? { note: kind.note } : {}),
      ...(kind.mask ? { mask: kind.mask } : {}),
      slots: kind.slots,
      maxGrams: kind.maxGrams,
      load,
      grams: kind.grams + load.grams,
      // A wallet is over when it holds more bills or chips than it should; anything else when its slots or its weight are.
      over: kind.holds !== undefined ? money.bills > kind.holds || chipsIn(pocket, items) > (kind.chips ?? 0) : load.slots > kind.slots || load.grams > kind.maxGrams,
    };
    if (kind.holds !== undefined) {
      out.bills = money.bills;
      out.holds = kind.holds;
      out.chips = chipsIn(pocket, items);
      out.chipSlots = kind.chips ?? 0;
    }
    if (kind.change) out.coins = money.coins;
    return out;
  });
}

/** An id for a new pocket of a kind, unlike any the player has. */
export function newPocketId(kind: string, pockets: PocketState[]): string {
  let n = 1;
  while (pockets.some((p) => p.id === `${kind}-${n}`)) n++;
  return `${kind}-${n}`;
}

/** An id for a credchip, unlike any carried: each is its own thing, with its own balance. */
export function newChipId(items: Item[]): string {
  let n = 1;
  while (items.some((i) => i.id === `credchip-${n}`)) n++;
  return `credchip-${n}`;
}
