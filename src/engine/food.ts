import { createRng, type Rng } from './rng';
import type { Building, Location, World } from './types';

/** How good (and how dear) an eatery is. A chain outlet is the same wherever it is. */
export type Quality = 'luxury' | 'everyday' | 'poverty';

/** What a dish is found on: the kinds of menu it belongs to. */
export type Served =
  | 'noodles'
  | 'dumplings'
  | 'grill'
  | 'street'
  | 'diner'
  | 'fine'
  | 'market'
  | 'snack'
  | 'soft'
  | 'coffee'
  | 'tea'
  | 'water'
  | 'beer'
  | 'spirits'
  | 'wine';

/** Something to eat or drink. Its name is the real Night City product or dish; the note and price are ours. */
export interface Dish {
  id: string;
  name: string;
  note: string;
  kind: 'food' | 'drink' | 'alcohol';
  /** What it costs at an everyday place; luxury and poverty scale it. */
  price: number;
  /** The menus it turns up on. Empty for things only a fixed menu serves. */
  on: Served[];
  /** Which qualities of place serve it. Everywhere, if not said. */
  where?: Quality[];
  /** Districts where it's a local staple, so it turns up more often there. */
  favored?: string[];
}

/** What a kind of eatery serves, and how big its menu is. */
export interface Kitchen {
  serves: Served[];
  foods: number;
  drinks: number;
}

/** A real place's (or chain's) menu: the same every time, at its own prices. */
export interface FixedMenu {
  quality: Quality;
  /** Dish ids, with a price where the menu sets its own instead of the dish's. */
  dishes: Array<string | { id: string; price: number }>;
}

export interface FoodContent {
  dishes: Dish[];
  /** By business id (storefronts) and location kind (places). */
  kitchens: Record<string, Kitchen>;
  /** By the name of a real place or storefront, or a chain's business id. */
  fixed: Record<string, FixedMenu>;
  /** Everyday prices times this. */
  priceBy: Record<Quality, number>;
  labels: Record<Quality | 'chain', string>;
  /** A line about the place for each quality, in the panel. */
  blurbs: Record<Quality | 'chain', string>;
}

/** Somewhere that sells food: a building the player is inside, or a place they're at. */
export interface Venue {
  id: string;
  name: string;
  district: string;
  /** The business (storefronts) or kind of place, as players read it. */
  kindLabel: string;
  quality: Quality;
  chain: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  note: string;
  kind: Dish['kind'];
  price: number;
}

export interface Menu {
  venue: Venue;
  items: MenuItem[];
}

/** A dish that doesn't say turns up everywhere. */
const WHERE_DEFAULT: Quality[] = ['everyday', 'poverty', 'luxury'];

/** Whether a building sells food: a storefront in the food trade. */
export function sellsFood(building: Building): boolean {
  return building.category === 'food';
}

/** The menu at a building or place, or null if there's nothing to eat there. */
export function menuFor(world: World, at: Building | Location, content: FoodContent): Menu | null {
  const isBuilding = 'floors' in at;
  const business = isBuilding ? at.business : null;
  if (isBuilding && !sellsFood(at)) return null;
  const fixed = content.fixed[at.name] ?? (business ? content.fixed[business] : undefined);
  const kitchen = content.kitchens[business ?? at.kind];
  if (!fixed && !kitchen) return null;

  const chain = Boolean(business && content.fixed[business] && !content.fixed[at.name]);
  const quality = fixed?.quality ?? drawQuality(world, at);
  const venue: Venue = { id: at.id, name: at.name, district: at.district, kindLabel: at.kindLabel, quality, chain };
  const items = fixed ? fixedItems(fixed, content) : kitchen ? kitchenItems(world, at, kitchen, quality, content) : [];
  return { venue, items };
}

/** A fixed menu, priced by its quality unless it names its own prices. */
function fixedItems(menu: FixedMenu, content: FoodContent): MenuItem[] {
  const items: MenuItem[] = [];
  for (const entry of menu.dishes) {
    const id = typeof entry === 'string' ? entry : entry.id;
    const dish = content.dishes.find((d) => d.id === id);
    if (!dish) continue;
    const price = typeof entry === 'string' ? priceAt(dish, menu.quality, content) : entry.price;
    items.push(item(dish, price));
  }
  return items;
}

/**
 * A place's own menu: a few of the dishes its kind of kitchen serves, at its quality, with
 * the district's staples turning up more often. Always the same for the same place.
 */
function kitchenItems(world: World, at: Building | Location, kitchen: Kitchen, quality: Quality, content: FoodContent): MenuItem[] {
  const rng = createRng(`${world.seed}:${at.id}:menu`);
  const pool = content.dishes.filter((d) => d.on.some((s) => kitchen.serves.includes(s)) && (d.where ?? WHERE_DEFAULT).includes(quality));
  const weight = (d: Dish) => (d.favored?.includes(at.district) ? 3 : 1);
  const foods = pickWeighted(rng, pool.filter((d) => d.kind === 'food'), kitchen.foods, weight);
  const drinks = pickWeighted(rng, pool.filter((d) => d.kind !== 'food'), kitchen.drinks, weight);
  return [...foods, ...drinks].map((d) => item(d, priceAt(d, quality, content)));
}

/** How good a place is, from how its district eats. The same every time for the same place. */
function drawQuality(world: World, at: Building | Location): Quality {
  const weights = world.districts[at.district]?.dining ?? {};
  const entries = (Object.entries(weights) as Array<[Quality, number]>).filter(([, w]) => w > 0);
  if (!entries.length) return 'everyday';
  const rng = createRng(`${world.seed}:${at.id}:food`);
  let roll = rng.next() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [quality, w] of entries) {
    roll -= w;
    if (roll < 0) return quality;
  }
  return entries[entries.length - 1]?.[0] ?? 'everyday';
}

function priceAt(dish: Dish, quality: Quality, content: FoodContent): number {
  return Math.max(1, Math.round(dish.price * content.priceBy[quality]));
}

function item(dish: Dish, price: number): MenuItem {
  return { id: dish.id, name: dish.name, note: dish.note, kind: dish.kind, price };
}

/** Up to `count` of `pool`, no repeats, the heavier ones likelier. */
function pickWeighted<T>(rng: Rng, pool: T[], count: number, weight: (t: T) => number): T[] {
  const left = [...pool];
  const picked: T[] = [];
  while (left.length && picked.length < count) {
    let roll = rng.next() * left.reduce((sum, t) => sum + weight(t), 0);
    let index = 0;
    for (; index < left.length - 1; index++) {
      roll -= weight(left[index] as T);
      if (roll < 0) break;
    }
    picked.push(...left.splice(index, 1));
  }
  return picked;
}
