import type { Dish } from './food';
import type { Item, ItemKind } from './types';

/**
 * What the player carries, and in what. Nothing floats along behind you in Night City: every
 * item takes a slot in a pocket (a jacket's, pants', a bag's), every pocket has only so many
 * slots and bears only so much weight, and eddies are cash in a wallet that sits in a pocket
 * and weighs what the eddies weigh. Buying something means there's a pocket with room for
 * it; getting paid means the wallet has room for it. The numbers are in `src/data/gear.ts`.
 */

/** A kind of pocket or bag: its room, its own weight, and (for a wallet) how many eddies it holds. */
export interface PocketKind {
  name: string;
  /** How many stacks of things fit. A wallet has none; it holds eddies. */
  slots: number;
  /** The most its contents can weigh, in grams. */
  maxGrams: number;
  /** What it weighs empty. */
  grams: number;
  /** Eddies it holds, for a wallet. */
  holds?: number;
  /** What it costs where it's sold; nothing for the pockets of the clothes on your back. */
  price?: number;
  note?: string;
}

/** A pocket the player has: which kind it is, and where it sits (worn, or in another pocket). */
export interface PocketState {
  id: string;
  kind: string;
  in: string | null;
}

export interface GearContent {
  /** Grams per eddy: cash adds up. */
  gramsPerEddy: number;
  /** What a thing of each kind weighs and how many share a slot, unless the thing says otherwise. */
  items: Record<ItemKind, { grams: number; perSlot: number }>;
  /** Grams by kind of dish, unless the dish says its own. */
  dish: Record<Dish['kind'], number>;
  kinds: Record<string, PocketKind>;
  /** What a new player wears. */
  start: PocketState[];
  /** What each kind of store (by business id) has on its rack, by pocket kind. */
  racks: Record<string, string[]>;
  /** A line about a store's rack, in the panel. */
  blurb: string;
}

export interface Load {
  slots: number;
  grams: number;
}

/** A pocket with everything about it worked out, for the inventory. */
export interface PocketLoad extends PocketState {
  name: string;
  slots: number;
  maxGrams: number;
  /** Slots and grams taken by what's inside (and inner pockets, each a slot). */
  load: Load;
  /** What it weighs all told, itself included. */
  grams: number;
  /** For a wallet: the eddies it holds and could hold. */
  eddies?: number;
  holds?: number;
  over: boolean;
}

/** What one of something weighs, in grams. */
export function itemGrams(item: Pick<Item, 'id' | 'kind'>, gear: GearContent, dishes: Dish[]): number {
  if (item.kind === 'consumable') {
    const dish = dishes.find((d) => d.id === item.id);
    if (dish) return dish.grams ?? gear.dish[dish.kind];
  }
  return gear.items[item.kind]?.grams ?? 250;
}

/** How many slots a stack of `count` of something takes. */
export function stackSlots(item: Pick<Item, 'kind'>, count: number, gear: GearContent): number {
  const perSlot = Math.max(1, gear.items[item.kind]?.perSlot ?? 1);
  return Math.ceil(Math.max(0, count) / perSlot);
}

function kindOf(pocket: PocketState, gear: GearContent): PocketKind {
  return gear.kinds[pocket.kind] ?? { name: pocket.kind, slots: 0, maxGrams: 0, grams: 0 };
}

/** What a pocket weighs all told: itself, its things, its inner pockets and (for a wallet) the eddies in it. */
export function pocketGrams(pocket: PocketState, pockets: PocketState[], items: Item[], eddies: number, gear: GearContent, dishes: Dish[]): number {
  return kindOf(pocket, gear).grams + loadOf(pocket, pockets, items, eddies, gear, dishes).grams;
}

/** The slots and grams taken by what's inside a pocket: each stack by its kind, each inner pocket a slot and all it weighs. */
export function loadOf(pocket: PocketState, pockets: PocketState[], items: Item[], eddies: number, gear: GearContent, dishes: Dish[]): Load {
  const kind = kindOf(pocket, gear);
  let slots = 0;
  let grams = kind.holds ? Math.min(eddies, Number.MAX_SAFE_INTEGER) * gear.gramsPerEddy : 0;
  for (const item of items) {
    if (item.in !== pocket.id) continue;
    slots += stackSlots(item, item.count, gear);
    grams += item.count * itemGrams(item, gear, dishes);
  }
  for (const inner of pockets) {
    if (inner.in !== pocket.id || inner.id === pocket.id) continue;
    slots += 1;
    grams += pocketGrams(inner, pockets, items, eddies, gear, dishes);
  }
  return { slots, grams: Math.round(grams) };
}

/** Whether `count` more of something fit in a pocket, joining a stack of it already there if there is one. */
export function fits(pocket: PocketState, pockets: PocketState[], items: Item[], eddies: number, item: Pick<Item, 'id' | 'kind'>, count: number, gear: GearContent, dishes: Dish[]): boolean {
  const kind = kindOf(pocket, gear);
  if (kind.holds || kind.slots <= 0) return false;
  const load = loadOf(pocket, pockets, items, eddies, gear, dishes);
  const stack = items.find((i) => i.id === item.id && i.in === pocket.id);
  const slotsAfter = load.slots - (stack ? stackSlots(item, stack.count, gear) : 0) + stackSlots(item, (stack?.count ?? 0) + count, gear);
  const gramsAfter = load.grams + count * itemGrams(item, gear, dishes);
  return slotsAfter <= kind.slots && gramsAfter <= kind.maxGrams;
}

/** The pocket to put `count` of something in: one already holding some of it if that has room, else the first with room. Null when nothing fits. */
export function placeFor(pockets: PocketState[], items: Item[], eddies: number, item: Pick<Item, 'id' | 'kind'>, count: number, gear: GearContent, dishes: Dish[]): string | null {
  const roomy = pockets.filter((p) => fits(p, pockets, items, eddies, item, count, gear, dishes));
  const same = roomy.find((p) => items.some((i) => i.id === item.id && i.in === p.id));
  return (same ?? roomy[0])?.id ?? null;
}

/** How many more eddies the wallet (or wallets) will hold. None without one. */
export function walletRoom(pockets: PocketState[], eddies: number, gear: GearContent): number {
  const holds = pockets.reduce((sum, p) => sum + (kindOf(p, gear).holds ?? 0), 0);
  return Math.max(0, holds - eddies);
}

/** Everything carried, in grams: the worn pockets and all that's in them. */
export function totalGrams(pockets: PocketState[], items: Item[], eddies: number, gear: GearContent, dishes: Dish[]): number {
  return pockets.filter((p) => p.in === null).reduce((sum, p) => sum + pocketGrams(p, pockets, items, eddies, gear, dishes), 0);
}

/** Every pocket, worked out. */
export function loads(pockets: PocketState[], items: Item[], eddies: number, gear: GearContent, dishes: Dish[]): PocketLoad[] {
  return pockets.map((pocket) => {
    const kind = kindOf(pocket, gear);
    const load = loadOf(pocket, pockets, items, eddies, gear, dishes);
    const out: PocketLoad = {
      ...pocket,
      name: kind.name,
      slots: kind.slots,
      maxGrams: kind.maxGrams,
      load,
      grams: kind.grams + load.grams,
      // A wallet is over when it holds more eddies than it should; anything else when its slots or its weight are.
      over: kind.holds !== undefined ? eddies > kind.holds : load.slots > kind.slots || load.grams > kind.maxGrams,
    };
    if (kind.holds !== undefined) {
      out.eddies = eddies;
      out.holds = kind.holds;
    }
    return out;
  });
}

/** An id for a new pocket of a kind, unlike any the player has. */
export function newPocketId(kind: string, pockets: PocketState[]): string {
  let n = 1;
  while (pockets.some((p) => p.id === `${kind}-${n}`)) n++;
  return `${kind}-${n}`;
}
