import type { GearContent } from './carry';
import type { Dish, Quality } from './food';
import { createRng } from './rng';
import type { Item } from './types';

/**
 * The player's trade: selling what they carry to the stores that deal in it, and fencing what
 * they took off people. A store buys the kinds of thing it deals in (`TradeRules.buys`, by
 * business id), at a share of what the thing is worth, a little more at a dear store and less
 * at a cheap one, more while its own shelves are short and less while it's sitting on them,
 * and by the player's Trading against its people's; it pays out of its till. Valuables (the
 * wiki's 2077 junk and jewellery, `src/data/valuables.ts`) are what people carry that's worth
 * taking off them in a robbery: no legit store will touch one, and only a fence (a pawn shop, a
 * junk shop) buys them. The numbers are in `src/data/trade.ts`; `Game` does the selling.
 */

/** What a store deals in, as the player's things go. */
export type TradeKind = 'gun' | 'melee' | 'ammo' | 'clothing' | 'cyberware' | 'deck' | 'quickhack' | 'med' | 'food' | 'component' | 'valuable';

/** A walk of life, as a valuable is carried by one (people.ts's `SkillWalk`). */
export type ValuableWalk = 'gang' | 'guard' | 'corpo' | 'elder' | 'street';

/**
 * A valuable: the wiki's name, our words for it, what a fence gives for it at an everyday
 * counter, its weight, whether it's jewellery (dearer, rarer), and who carries one: the members
 * of `gangs`, people of `walks`, people living at `means` (each missing: anyone).
 */
export interface Valuable {
  name: string;
  note: string;
  price: number;
  grams: number;
  jewellery?: boolean;
  gangs?: string[];
  walks?: ValuableWalk[];
  means?: Quality[];
}

export interface TradeRules {
  /** What each store deals in, by business id (a chain buys nothing off the street). */
  buys: Record<string, TradeKind[]>;
  /** The share of what a thing is worth a store pays, else `share`. */
  shares: Record<string, number>;
  share: number;
  /** On top of that, by the store's tier. */
  tier: Record<Quality, number>;
  /** A fence's share of a valuable's price, by business id. */
  fences: Record<string, number>;
  /** The most a store gives for a thing, as a share of what it would charge for it itself: so no Trading, however sharp, buys and sells back at a profit. */
  resale: number;
  /** Valuables: the chance someone carries one, by how they live; how much rarer jewellery is; how much likelier one of their own gang's, walk's or means. */
  carry: { chance: Record<Quality, number>; jewellery: number; gang: number; walk: number; means: number };
  /**
   * The narration: `sold` a thing, `fenced` a valuable, the till short of the price (`broke`),
   * no room on the player for the cash (`noRoom`), a legit store turning away a valuable
   * (`hot`). `{item}`, `{amount}`, `{place}`.
   */
  lines: Record<'sold' | 'fenced' | 'broke' | 'noRoom' | 'hot', string[]>;
}

/** What kind of thing an item is, as stores deal in it (null: nothing a store buys, a drug, a credchip). */
export function tradeKindOf(item: Pick<Item, 'id' | 'kind' | 'weapon'>, gear: GearContent, dishes: Dish[], valuables: Record<string, Valuable>): TradeKind | null {
  if (item.kind === 'weapon') {
    const weapon = gear.arms.weapons[item.weapon ?? ''];
    return weapon ? (gear.arms.classes[weapon.class]?.ammo ? 'gun' : 'melee') : null;
  }
  if (item.kind === 'ammo') return gear.arms.ammo[item.id] ? 'ammo' : null;
  if (item.kind === 'clothing') return 'clothing';
  if (item.kind === 'cyberware') {
    const implant = gear.chrome.implants[item.id];
    return implant ? (implant.system === 'cyberdeck' ? 'deck' : 'cyberware') : null;
  }
  if (item.kind === 'quickhack') return gear.hacks.hacks[item.id] ? 'quickhack' : null;
  if (item.kind === 'component') return gear.components[item.id] ? 'component' : null;
  if (item.kind === 'junk') return valuables[item.id] ? 'valuable' : null;
  if (item.kind === 'consumable') {
    if (gear.medical.meds[item.id]) return 'med';
    if (dishes.some((d) => d.id === item.id)) return 'food';
  }
  return null;
}

/** What one of a thing is worth, as its catalogue prices it (a round of ammo, its share of a box); 0 for nothing a store buys. */
export function worthOf(item: Pick<Item, 'id' | 'kind' | 'weapon' | 'gear'>, gear: GearContent, dishes: Dish[], valuables: Record<string, Valuable>): number {
  switch (tradeKindOf(item, gear, dishes, valuables)) {
    case 'gun':
    case 'melee':
      return gear.arms.weapons[item.weapon ?? '']?.price ?? 0;
    case 'ammo': {
      const ammo = gear.arms.ammo[item.id];
      return ammo ? ammo.price / Math.max(1, ammo.box) : 0;
    }
    case 'clothing':
      return gear.kinds[item.gear ?? item.id]?.price ?? 0;
    case 'cyberware':
    case 'deck':
      return gear.chrome.implants[item.id]?.price ?? 0;
    case 'quickhack':
      return gear.hacks.hacks[item.id]?.price ?? 0;
    case 'component':
      return gear.components[item.id]?.price ?? 0;
    case 'valuable':
      return valuables[item.id]?.price ?? 0;
    case 'med':
      return gear.medical.meds[item.id]?.price ?? 0;
    case 'food':
      return dishes.find((d) => d.id === item.id)?.price ?? 0;
    default:
      return 0;
  }
}

/**
 * The valuable someone has on them this week, if any (on their own stream, a week at a time, so
 * a robbery a week later finds them carrying again): likelier the better they live, of their own
 * gang's, walk's or means' likelier still, jewellery rarer.
 */
export function valuableOf(person: { id: string; gang?: string | null }, walk: ValuableWalk, means: Quality, week: number, valuables: Record<string, Valuable>, rules: TradeRules, seed: string): string | null {
  const rng = createRng(`${seed}:valuable:${person.id}:${week}`);
  if (!rng.chance(rules.carry.chance[means])) return null;
  const pool: Array<[string, number]> = [];
  for (const [id, v] of Object.entries(valuables)) {
    if (v.gangs && (!person.gang || !v.gangs.includes(person.gang))) continue;
    if (v.walks && !v.walks.includes(walk)) continue;
    if (v.means && !v.means.includes(means)) continue;
    const weight = (v.gangs ? rules.carry.gang : 1) * (v.walks ? rules.carry.walk : 1) * (v.means ? rules.carry.means : 1) * (v.jewellery ? rules.carry.jewellery : 1);
    pool.push([id, weight]);
  }
  const total = pool.reduce((n, [, w]) => n + w, 0);
  let roll = rng.next() * total;
  for (const [id, w] of pool) if ((roll -= w) < 0) return id;
  return pool.at(-1)?.[0] ?? null;
}
