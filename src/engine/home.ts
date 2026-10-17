import { itemGrams, stackSlots, type GearContent } from './carry';
import type { Dish } from './food';
import type { Building, Item } from './types';

/**
 * The player's home: a unit rented in an apartment block or a megabuilding, or a squat in an
 * abandoned building or a shack. Rent falls due every week from the day it was taken; what
 * can't be paid is owed, a warning comes after a while, and after longer the player is put out
 * and loses what they kept there. A rented home has a bed (more energy, `ENERGY.bed`); any home
 * has a stash, kept off the player, out of reach of a robber or a search. A squat costs nothing,
 * has no bed, and now and then somebody goes through the stash. The numbers and the words are in
 * `src/data/home.ts`; `Game` keeps the state and does the paying.
 */
export interface HomeState {
  building: string;
  /** The room that's theirs: a unit of a block (`unit:<floor>:<letter>`), or the room you walk into of a squat (or of anywhere, without rooms). */
  room: string;
  /** A week's rent (nothing for a squat). */
  rent: number;
  /** The day it was taken on, and the day the next week's rent falls due. */
  since: number;
  due: number;
  /** Rent owed. */
  owed: number;
  squat: boolean;
  /** The day the player was told they'd be put out, if they have been. */
  warned?: number;
}

/** Where the player lives, as the UI shows it: the place and the room, the rent and what's owed (`behind` in whole weeks), the days till the next week falls due, a squat or a bed, whether they're in the building or in their own room, and how many stacks are in the stash. */
export interface HomeView {
  building: Building;
  room: string;
  rent: number;
  owed: number;
  behind: number;
  dueIn: number;
  squat: boolean;
  bed: boolean;
  inside: boolean;
  atHome: boolean;
  stashed: number;
}

/** What kind of home a building can be: a unit of an apartment block or of a megabuilding, or a squat. */
export type HomeKind = 'apartments' | 'megabuilding' | 'squat';

export interface HomeRules {
  /** A unit's rent a week, in heads of what the building's tenants pay a head (`ECONOMY.homes`). */
  unit: number;
  /** Weeks of rent owed before the warning, and before being put out. */
  warnAt: number;
  evictAt: number;
  /** What a stash holds, by the kind of home: stacks, and kilos. */
  stash: Record<HomeKind, { slots: number; maxGrams: number }>;
  /** A squat: the chance a week somebody goes through the stash, and the share of each stack they take. */
  squat: { raid: number; take: number };
  /**
   * What's said: taking a place (`rented`, `squatted`), turned away in a mask (`masked`), short
   * of the first week (`short`), the week paid (`paid`), short of it (`behind`), the warning
   * (`warn`), put out (`evicted`), a squat gone through (`raided`), handing back the keys
   * (`movedOut`, `left`: an old home given up for a new one), a full stash (`full`), and a
   * stash with things in it in the way (`clear`). `{place}`, `{room}`, `{rent}`, `{owed}`,
   * `{weeks}`, `{what}`. The landlord putting the rent up (`raised`) or down (`lowered`), `{was}` what it was.
   */
  lines: Record<'rented' | 'squatted' | 'masked' | 'short' | 'paid' | 'behind' | 'warn' | 'evicted' | 'raided' | 'movedOut' | 'left' | 'full' | 'clear' | 'raised' | 'lowered', string[]>;
}

/** What a stash holds now: its stacks' slots and their weight. */
export function stashLoad(items: Item[], gear: GearContent, dishes: Dish[]): { slots: number; grams: number } {
  let slots = 0;
  let grams = 0;
  for (const item of items) {
    slots += stackSlots(item, item.count, gear);
    grams += itemGrams(item, gear, dishes) * item.count;
  }
  return { slots, grams };
}

/** The stack in a stash that a thing goes onto: the same thing, cut the same, if there is one. */
export function stackIn(items: Item[], item: Item): Item | undefined {
  return items.find((i) => i.id === item.id && i.kind === item.kind && (i.cut ?? 0) === (item.cut ?? 0) && i.gear === item.gear && i.weapon === item.weapon);
}

/** Whether `count` of a thing fit in a stash of this size, onto its own stack if there is one. */
export function stashFits(items: Item[], item: Item, count: number, room: { slots: number; maxGrams: number }, gear: GearContent, dishes: Dish[]): boolean {
  const { slots, grams } = stashLoad(items, gear, dishes);
  const stack = stackIn(items, item);
  const before = stack ? stackSlots(stack, stack.count, gear) : 0;
  const after = stackSlots(item, (stack?.count ?? 0) + count, gear);
  return slots - before + after <= room.slots && grams + itemGrams(item, gear, dishes) * count <= room.maxGrams;
}
