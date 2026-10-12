import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { menuFor, sellsFood, type Menu, type Quality } from '../src/engine/food';
import { generateWorld } from '../src/engine/generate';
import { createRng } from '../src/engine/rng';
import type { Building, Location, World } from '../src/engine/types';

const QUALITIES: Quality[] = ['luxury', 'everyday', 'poverty'];
const seeds = Array.from({ length: 200 }, (_, i) => createRng(`food-${i}`).next().toString(16).slice(2, 10));
const worlds = seeds.map((seed) => generateWorld(seed, CITY));
const dishById = new Map(FOOD.dishes.map((d) => [d.id, d]));
const chains = new Set(CITY.buildings.businesses.filter((b) => b.chain).map((b) => b.id));

/** Every menu in a city, with where it is. */
function menus(world: World): Array<{ at: Building | Location; menu: Menu }> {
  const found: Array<{ at: Building | Location; menu: Menu }> = [];
  for (const at of [...world.buildings, ...Object.values(world.locations)]) {
    const menu = menuFor(world, at, FOOD);
    if (menu) found.push({ at, menu });
  }
  return found;
}

const foods = (menu: Menu) => menu.items.filter((i) => i.kind === 'food');
const drinks = (menu: Menu) => menu.items.filter((i) => i.kind !== 'food');

describe('the food', () => {
  it('names each dish once, prices it, and puts it somewhere', () => {
    const ids = FOOD.dishes.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const onFixedMenus = new Set(Object.values(FOOD.fixed).flatMap((m) => m.dishes.map((d) => (typeof d === 'string' ? d : d.id))));
    for (const dish of FOOD.dishes) {
      expect(dish.price, dish.id).toBeGreaterThanOrEqual(1);
      expect(dish.name.trim(), dish.id).toBe(dish.name);
      expect(dish.on.length > 0 || onFixedMenus.has(dish.id), `${dish.id} is on no menu`).toBe(true);
      for (const quality of dish.where ?? []) expect(QUALITIES, dish.id).toContain(quality);
    }
  });

  it('only puts real dishes on the fixed menus', () => {
    for (const [name, menu] of Object.entries(FOOD.fixed)) {
      expect(menu.dishes.length, name).toBeGreaterThanOrEqual(2);
      for (const entry of menu.dishes) {
        const id = typeof entry === 'string' ? entry : entry.id;
        expect(dishById.has(id), `${name} serves ${id}, which there is no such thing as`).toBe(true);
      }
    }
    // Every chain and every real eatery in the city has its menu.
    for (const id of chains) expect(FOOD.fixed[id], id).toBeDefined();
    for (const landmark of CITY.buildings.landmarks ?? []) {
      if (!landmark.business) continue;
      expect(FOOD.fixed[landmark.name] ?? FOOD.fixed[landmark.business], landmark.name).toBeDefined();
    }
  });

  it('gives every kind of kitchen enough to eat and drink at every quality', () => {
    for (const [kind, kitchen] of Object.entries(FOOD.kitchens)) {
      for (const quality of QUALITIES) {
        const pool = FOOD.dishes.filter((d) => d.on.some((s) => kitchen.serves.includes(s)) && (d.where ?? QUALITIES).includes(quality));
        expect(pool.filter((d) => d.kind === 'food').length, `${kind} at ${quality}`).toBeGreaterThanOrEqual(Math.min(kitchen.foods, 3));
        expect(pool.filter((d) => d.kind !== 'food').length, `${kind} at ${quality}`).toBeGreaterThanOrEqual(Math.min(kitchen.drinks, 2));
      }
    }
  });

  it('has a menu at every eatery, with things to eat and drink, and none anywhere else', () => {
    for (const world of worlds) {
      for (const b of world.buildings) {
        const menu = menuFor(world, b, FOOD);
        if (!sellsFood(b)) {
          expect(menu, `${world.seed} ${b.name}`).toBeNull();
          continue;
        }
        expect(menu, `${world.seed} ${b.name} (${b.business})`).not.toBeNull();
        if (!menu) continue;
        expect(foods(menu).length, `${world.seed} ${b.name}`).toBeGreaterThanOrEqual(2);
        expect(drinks(menu).length, `${world.seed} ${b.name}`).toBeGreaterThanOrEqual(1);
        expect(new Set(menu.items.map((i) => i.id)).size, `${world.seed} ${b.name}`).toBe(menu.items.length);
        for (const item of menu.items) expect(item.price, `${world.seed} ${b.name} ${item.id}`).toBeGreaterThanOrEqual(1);
        expect(menu.venue).toMatchObject({ id: b.id, name: b.name, district: b.district, kindLabel: b.kindLabel });
      }
      for (const l of Object.values(world.locations)) {
        const menu = menuFor(world, l, FOOD);
        if (!FOOD.kitchens[l.kind]) expect(menu, `${world.seed} ${l.name}`).toBeNull();
        else expect(foods(menu as Menu).length, `${world.seed} ${l.name}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('serves the same menu every time', () => {
    const world = worlds[0] as World;
    for (const { at, menu } of menus(world)) expect(menuFor(world, at, FOOD), at.name).toEqual(menu);
    expect(menus(generateWorld(world.seed, CITY))).toEqual(menus(world));
  });

  it('serves what the place is and what it charges for', () => {
    for (const world of worlds) {
      for (const { at, menu } of menus(world)) {
        const { quality, chain } = menu.venue;
        const business = 'floors' in at ? at.business : null;
        if (chain) {
          // A chain outlet is the same wherever it is.
          expect(business && chains.has(business), `${world.seed} ${at.name}`).toBe(true);
          expect(menu.items, `${world.seed} ${at.name}`).toEqual(menuFor(worlds[1] as World, at, FOOD)?.items);
          continue;
        }
        const fixed = FOOD.fixed[at.name];
        if (fixed) {
          expect(quality).toBe(fixed.quality);
          continue;
        }
        for (const item of menu.items) {
          const dish = dishById.get(item.id);
          expect(dish, item.id).toBeDefined();
          if (!dish) continue;
          expect(dish.where ?? QUALITIES, `${world.seed} ${at.name} (${quality}) serves ${dish.id}`).toContain(quality);
          expect(item.price).toBe(Math.max(1, Math.round(dish.price * FOOD.priceBy[quality])));
        }
      }
    }
  });

  it('is only as good as the district: the center never eats cheap, the combat zone never eats well', () => {
    const seen = new Map<string, Set<Quality>>();
    for (const world of worlds) {
      for (const { at, menu } of menus(world)) {
        if (menu.venue.chain || FOOD.fixed[at.name]) continue;
        const dining = world.districts[at.district]?.dining ?? {};
        expect(dining[menu.venue.quality] ?? 0, `${world.seed} ${at.name} in ${at.district} is ${menu.venue.quality}`).toBeGreaterThan(0);
        const set = seen.get(at.district) ?? new Set<Quality>();
        set.add(menu.venue.quality);
        seen.set(at.district, set);
      }
    }
    expect(seen.get('city_center')).toEqual(new Set(['luxury', 'everyday']));
    expect(seen.get('pacifica')).toEqual(new Set(['poverty', 'everyday']));
    expect(seen.get('watson')).toEqual(new Set(QUALITIES));
  });

  it('puts the real eateries on their own menus where they turn up', () => {
    const found = new Set<string>();
    for (const world of worlds) {
      for (const b of world.buildings) {
        const landmark = (CITY.buildings.landmarks ?? []).find((l) => l.name === b.name && l.business);
        if (!landmark) continue;
        found.add(b.name);
        const menu = menuFor(world, b, FOOD);
        expect(menu, `${world.seed} ${b.name}`).not.toBeNull();
        const fixed = FOOD.fixed[b.name] ?? FOOD.fixed[landmark.business as string];
        expect(menu?.venue.quality, b.name).toBe(fixed?.quality);
        expect(menu?.items.map((i) => i.id), b.name).toEqual(fixed?.dishes.map((d) => (typeof d === 'string' ? d : d.id)));
      }
    }
    for (const landmark of CITY.buildings.landmarks ?? []) if (landmark.business) expect(found, landmark.name).toContain(landmark.name);
  });
});
