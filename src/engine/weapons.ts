import type { Quality } from './food';
import { createRng } from './rng';
import type { Item } from './types';

/**
 * Guns, blades and the rounds for them. Every weapon is a real 2077 one from the wiki (its
 * maker, its class, how many rounds its magazine takes); gun stores and blade shops stock a
 * handful each, drawn for the store from what its tier sells. A weapon is its own thing in a
 * pocket, like a credchip, with the rounds in its magazine (`Item.loaded`) weighing with it.
 * Ammo is the wiki's four kinds, carried loose by the round, so many to a slot and so many
 * grams each: a box of shells is a heavy thing to have in a pocket. A long gun (a rifle, a
 * shotgun) or a long blade won't go in a jacket: it wants a bag that takes one (`long`). The
 * numbers are in `src/data/weapons.ts`; carrying is `src/engine/carry.ts`, buying and loading
 * are `Game`'s.
 */

/** The wiki's classes of 2077 weapon: its eight kinds of gun, the double-barrel apart, and its kinds of melee weapon. */
export type WeaponClass =
  | 'pistol'
  | 'revolver'
  | 'smg'
  | 'assault-rifle'
  | 'precision-rifle'
  | 'shotgun'
  | 'double-barrel'
  | 'sniper-rifle'
  | 'lmg'
  | 'knife'
  | 'katana'
  | 'machete'
  | 'axe'
  | 'club'
  | 'two-handed-club'
  | 'hammer'
  | 'chainsword';

/** What a class of weapon is: what it's called, whether it shoots and on what, what it weighs, and whether it wants a bag. */
export interface WeaponClassInfo {
  label: string;
  /** The ammo it takes, by item id (a gun); melee weapons take none. */
  ammo?: string;
  /** What one weighs, in grams, unless the weapon says its own. */
  grams: number;
  /** Too long for a pocket: it goes in a bag that takes one. */
  long?: boolean;
  /** For a melee weapon: does it cut or hit. */
  cut?: 'blade' | 'blunt';
}

/** The wiki's three kinds of 2077 gun. */
export type WeaponTech = 'Power' | 'Tech' | 'Smart';

/** A weapon as the wiki has it, with our weight, price and note. */
export interface WeaponKind {
  /** The wiki's name for it, maker left off: "M-10AF Lexington". */
  name: string;
  /** What it's called in a sentence: "Lexington", "katana". */
  short: string;
  maker?: string;
  class: WeaponClass;
  tech?: WeaponTech;
  /** The rounds its magazine takes (the wiki's ammo capacity). */
  magazine?: number;
  /** What it weighs, when it isn't the usual for its class. */
  grams?: number;
  /** The tier of store that stocks it. */
  quality: Quality;
  price: number;
  note: string;
  /** Sold loaded and never reloaded: when it's empty, it's junk. */
  disposable?: boolean;
}

/** One of the wiki's four kinds of ammo: what a round weighs, how many share a slot, and how it's sold. */
export interface AmmoKind {
  name: string;
  /** Grams per round. */
  grams: number;
  /** Rounds to a slot. */
  perSlot: number;
  /** Rounds to a box, which is how a store sells them. */
  box: number;
  /** An everyday store's price for a box; stores of other tiers scale it like a dish. */
  price: number;
  /** What it's for, in a word: "Pistols, revolvers, SMGs". */
  for: string;
  note: string;
}

/** What a store stocks: how many guns and melee weapons are on its rack, whether it sells ammo, and whether it reaches a tier up. */
export interface ArmsStock {
  guns?: number;
  melee?: number;
  ammo?: boolean;
  /** A gunsmith's rack: the tier above its own as well. */
  up?: boolean;
}

export interface ArmsContent {
  classes: Record<WeaponClass, WeaponClassInfo>;
  weapons: Record<string, WeaponKind>;
  /** By item id. */
  ammo: Record<string, AmmoKind>;
  /** By business id. */
  stores: Record<string, ArmsStock>;
  /** The tiers of weapon a store of each tier stocks. */
  tiers: Record<Quality, Quality[]>;
  /** The share of their courage it takes for someone being robbed to fight back, by what the player pulls on them. */
  rob: { bare: number; melee: number; gun: number };
}

/** The weapon an item is, if it is one. */
export function weaponOf(item: Pick<Item, 'id' | 'kind' | 'weapon'>, arms: ArmsContent): WeaponKind | null {
  if (item.kind !== 'weapon') return null;
  return arms.weapons[item.weapon ?? item.id] ?? null;
}

/** Whether a weapon shoots. */
export function isGun(weapon: WeaponKind, arms: ArmsContent): boolean {
  return Boolean(arms.classes[weapon.class]?.ammo);
}

/** The ammo a weapon takes, by item id, if it takes any. */
export function ammoFor(weapon: WeaponKind, arms: ArmsContent): string | null {
  return arms.classes[weapon.class]?.ammo ?? null;
}

/** Whether something is too long for a pocket: a long gun or a long blade. */
export function isLong(item: Pick<Item, 'id' | 'kind' | 'weapon'>, arms: ArmsContent): boolean {
  const weapon = weaponOf(item, arms);
  return Boolean(weapon && arms.classes[weapon.class]?.long);
}

/** What a weapon weighs empty, in grams. */
export function weaponGrams(weapon: WeaponKind, arms: ArmsContent): number {
  return weapon.grams ?? arms.classes[weapon.class]?.grams ?? 1000;
}

/** "Pistol · Militech · Power"; "Axe · Militech", or "Blade" for a knife that is just a knife. */
export function weaponDetail(weapon: WeaponKind, arms: ArmsContent): string {
  const info = arms.classes[weapon.class];
  const label = info?.label === weapon.name && info.cut ? (info.cut === 'blade' ? 'Blade' : 'Blunt') : info?.label;
  return [label, weapon.maker, weapon.tech].filter(Boolean).join(' · ');
}

/**
 * The weapons on a store's rack, by id: `count` of the guns (or the melee weapons) its tier
 * stocks, drawn for the store on its own stream, so the same store always has the same rack,
 * and listed by class, then price.
 */
export function stockFor(seed: string, building: string, quality: Quality, stock: ArmsStock, arms: ArmsContent): string[] {
  const tiers = new Set(arms.tiers[quality]);
  if (stock.up) for (const t of arms.tiers[quality === 'poverty' ? 'everyday' : 'luxury']) tiers.add(t);
  const order = Object.keys(arms.classes);
  const out: string[] = [];
  for (const [kind, count] of [['guns', stock.guns ?? 0], ['melee', stock.melee ?? 0]] as const) {
    if (!count) continue;
    const pool = Object.entries(arms.weapons)
      .filter(([, weapon]) => tiers.has(weapon.quality) && isGun(weapon, arms) === (kind === 'guns'))
      .map(([id]) => id);
    const rng = createRng(`${seed}:arms:${building}:${kind}`);
    out.push(...rng.shuffle(pool).slice(0, count));
  }
  const rank = (id: string) => order.indexOf(arms.weapons[id]?.class ?? '');
  const price = (id: string) => arms.weapons[id]?.price ?? 0;
  return out.sort((a, b) => rank(a) - rank(b) || price(a) - price(b));
}

/** What the player would pull on someone: a loaded gun first, then any gun (they can't tell it's empty), then a blade or a club; the dearest of each. */
export function drawWeapon(items: Item[], arms: ArmsContent): { item: Item; weapon: WeaponKind; gun: boolean } | null {
  let best: { item: Item; weapon: WeaponKind; gun: boolean; rank: number } | null = null;
  for (const item of items) {
    const weapon = weaponOf(item, arms);
    if (!weapon) continue;
    const gun = isGun(weapon, arms);
    const rank = (gun ? ((item.loaded ?? 0) > 0 ? 2 : 1) : 0) * 1e6 + weapon.price;
    if (!best || rank > best.rank) best = { item, weapon, gun, rank };
  }
  return best ? { item: best.item, weapon: best.weapon, gun: best.gun } : null;
}

/** An id for a new weapon, unlike any carried: each is its own thing, with its own magazine. */
export function newWeaponId(weapon: string, items: Item[]): string {
  let n = 1;
  while (items.some((i) => i.id === `${weapon}-${n}`)) n++;
  return `${weapon}-${n}`;
}
