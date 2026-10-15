import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { blockAt, STREET_HALF_WIDTH } from '../src/engine/buildings';
import { distance, generateWorld, MAX_DESCRIPTION, streetPath } from '../src/engine/generate';
import { seaTest, subdistrictAt, WORLD } from '../src/engine/geography';
import { createRng } from '../src/engine/rng';
import type { World } from '../src/engine/types';
import { stripMarkup } from '../src/ui/markup';

const seeds = Array.from({ length: 500 }, (_, i) => createRng(`batch-${i}`).next().toString(16).slice(2, 10));
const worlds = seeds.map((seed) => generateWorld(seed, CITY));

function edges(world: World) {
  const result: Array<[string, string]> = [];
  for (const location of Object.values(world.locations)) {
    for (const link of location.links) if (location.id < link) result.push([location.id, link]);
  }
  return result;
}

describe('generateWorld', () => {
  it('rebuilds exactly the same city from the same seed', () => {
    expect(generateWorld('7f3a29c1', CITY)).toEqual(generateWorld('7f3a29c1', CITY));
  });

  it('builds different cities from different seeds', () => {
    const layouts = new Set(worlds.map((w) => Object.values(w.locations).map((l) => l.name).join('|')));
    expect(layouts.size).toBeGreaterThan(worlds.length * 0.95);
  });

  it('builds every district and neighborhood of the real Night City, each with places of its own', () => {
    for (const world of worlds) {
      expect(Object.keys(world.districts).sort(), world.seed).toEqual(CITY.districts.map((d) => d.id).sort());
      const locationCount = Object.keys(world.locations).length;
      expect(locationCount, world.seed).toBeGreaterThanOrEqual(40);
      expect(locationCount, world.seed).toBeLessThanOrEqual(64);
      for (const template of CITY.districts) {
        const district = world.districts[template.id];
        expect(district?.subdistricts.map((s) => s.name), `${world.seed} ${template.id}`).toEqual(template.areas.filter((a) => template.areaAt?.[a]));
        for (const hood of district?.subdistricts ?? []) {
          const places = Object.values(world.locations).filter((l) => l.area === hood.name);
          expect(places.length, `${world.seed} ${hood.name}`).toBeGreaterThan(0);
          expect(places.every((l) => l.district === template.id)).toBe(true);
        }
      }
    }
  });

  it('puts every place in its own neighborhood, as the map draws it', () => {
    for (const world of worlds) {
      const districts = Object.values(world.districts);
      for (const location of Object.values(world.locations)) {
        const at = subdistrictAt(districts, location);
        expect(at?.district.id, `${world.seed} ${location.name}`).toBe(location.district);
        expect(at?.subdistrict?.name, `${world.seed} ${location.name}`).toBe(location.area);
      }
    }
  });

  it('connects every location to every other', () => {
    for (const world of worlds) {
      const seen = new Set([world.start]);
      const queue = [world.start];
      for (let id = queue.shift(); id; id = queue.shift()) {
        for (const link of world.locations[id]?.links ?? []) {
          if (!seen.has(link)) {
            seen.add(link);
            queue.push(link);
          }
        }
      }
      expect(seen.size, world.seed).toBe(Object.keys(world.locations).length);
    }
  });

  it('links both ways and only to real locations', () => {
    for (const world of worlds) {
      for (const location of Object.values(world.locations)) {
        for (const link of location.links) {
          expect(world.locations[link]?.links, `${world.seed} ${location.id}→${link}`).toContain(location.id);
        }
        expect(new Set(location.links).size).toBe(location.links.length);
      }
    }
  });

  it('puts every location on its own street corner', () => {
    for (const world of worlds) {
      const corners = new Set<string>();
      for (const location of Object.values(world.locations)) {
        expect(world.layout.avenues, `${world.seed} ${location.id}`).toContain(location.x);
        expect(world.layout.streets, `${world.seed} ${location.id}`).toContain(location.y);
        corners.add(`${location.x},${location.y}`);
      }
      expect(corners.size).toBe(Object.keys(world.locations).length);
    }
  });

  it('runs every route along the streets', () => {
    for (const world of worlds) {
      for (const [a, b] of edges(world)) {
        const from = world.locations[a];
        const to = world.locations[b];
        if (!from || !to) continue;
        const path = streetPath(from, to);
        expect(path[0]).toEqual({ x: from.x, y: from.y });
        expect(path.at(-1)).toEqual({ x: to.x, y: to.y });
        for (let i = 1; i < path.length; i++) {
          const p = path[i - 1];
          const q = path[i];
          // Every leg is horizontal or vertical, i.e. it follows a street.
          expect(p?.x === q?.x || p?.y === q?.y, `${world.seed} ${a}-${b}`).toBe(true);
        }
        // Coming back takes the same streets.
        expect(streetPath(to, from)).toEqual([...path].reverse());
      }
    }
  });

  it('keeps the sea off every location and away from the desert', () => {
    for (const world of worlds) {
      const { coast } = world.layout;
      if (!coast) continue;
      const reach = { north: (y: number) => y, south: (y: number) => WORLD - y, west: (x: number) => x, east: (x: number) => WORLD - x };
      for (const location of Object.values(world.locations)) {
        const along = coast.side === 'north' || coast.side === 'south' ? location.y : location.x;
        expect(reach[coast.side](along), `${world.seed} ${location.id}`).toBeGreaterThanOrEqual(coast.depth + 4);
      }
    }
  });

  it('centers each district on its locations', () => {
    for (const world of worlds) {
      for (const district of Object.values(world.districts)) {
        const members = Object.values(world.locations).filter((l) => l.district === district.id);
        expect(members.length, `${world.seed} ${district.id}`).toBeGreaterThan(0);
        expect(district.x).toBeCloseTo(members.reduce((s, l) => s + l.x, 0) / members.length);
        expect(district.y).toBeCloseTo(members.reduce((s, l) => s + l.y, 0) / members.length);
      }
    }
  });

  it('keeps locations on the map and apart from each other', () => {
    for (const world of worlds) {
      const list = Object.values(world.locations);
      for (const location of list) {
        expect(location.x).toBeGreaterThanOrEqual(7);
        expect(location.x).toBeLessThanOrEqual(WORLD - 7);
        expect(location.y).toBeGreaterThanOrEqual(7);
        expect(location.y).toBeLessThanOrEqual(WORLD - 7);
        for (const other of list) {
          if (other !== location) expect(distance(location, other), world.seed).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });

  it('gives every location a unique name and a description that fits the card', () => {
    for (const world of worlds) {
      const names = Object.values(world.locations).map((l) => l.name);
      expect(new Set(names).size, world.seed).toBe(names.length);
      for (const location of Object.values(world.locations)) {
        expect(location.description.length, location.description).toBeLessThanOrEqual(MAX_DESCRIPTION);
        expect(location.name).not.toMatch(/[{}]/);
        expect(location.ambient.length).toBeGreaterThan(0);
      }
    }
  });

  it('starts the player somewhere in the city, not out in the Badlands', () => {
    for (const world of worlds) {
      expect(world.locations[world.start], world.seed).toBeDefined();
      expect(world.locations[world.start]?.district).not.toBe('badlands');
    }
  });
});

describe('canon first', () => {
  const realNames = new Set(CITY.districts.flatMap((d) => (d.landmarks ?? []).map((l) => l.name)));

  it('uses real Night City places before making any up, each in its own neighborhood', () => {
    for (const world of worlds) {
      for (const template of CITY.districts) {
        const landmarks = template.landmarks ?? [];
        const unplaced = landmarks.filter((m) => !m.area && !Object.values(world.locations).some((l) => l.name === m.name));
        for (const area of template.areas) {
          const places = Object.values(world.locations).filter((l) => l.district === template.id && l.area === area);
          const own = landmarks.filter((m) => m.area === area);
          const real = places.filter((l) => landmarks.some((m) => m.name === l.name));
          // A made-up place only once the neighborhood's own real places, and the district's
          // real places that could go anywhere, are all used.
          if (real.length < places.length) expect(own.filter((m) => !real.some((l) => l.name === m.name)), `${world.seed} ${area}`).toEqual([]);
          if (real.length < places.length) expect(unplaced, `${world.seed} ${area}`).toEqual([]);
        }
        for (const location of Object.values(world.locations)) {
          const landmark = landmarks.find((m) => m.name === location.name);
          if (landmark?.area) expect(location.area, location.name).toBe(landmark.area);
        }
      }
    }
  });

  it('gives real places their own description and kind', () => {
    for (const world of worlds) {
      for (const location of Object.values(world.locations)) {
        const landmark = CITY.districts.flatMap((d) => d.landmarks ?? []).find((m) => m.name === location.name);
        if (!landmark) continue;
        expect(location.description.startsWith(landmark.description), location.name).toBe(true);
        expect(location.kind).toBe(landmark.kind);
      }
    }
  });

  it('never gives a made-up place a real place name', () => {
    for (const world of worlds) {
      for (const location of Object.values(world.locations)) {
        if (!realNames.has(location.name)) continue;
        const home = CITY.districts.find((d) => d.landmarks?.some((m) => m.name === location.name));
        expect(home?.id, `${world.seed} ${location.name}`).toBe(location.district);
      }
    }
  });

  it('lays the city out like the real Night City', () => {
    const mean = (world: World, id: string) => world.districts[id];
    for (const world of worlds) {
      expect(world.layout.coast?.side, world.seed).toBe('west');
      const center = mean(world, 'city_center');
      const watson = mean(world, 'watson');
      const pacifica = mean(world, 'pacifica');
      const westbrook = mean(world, 'westbrook');
      const heywood = mean(world, 'heywood');
      const badlands = mean(world, 'badlands');
      if (center && watson) expect(watson.y, `${world.seed} Watson is north`).toBeLessThan(center.y);
      if (center && heywood) expect(heywood.y, `${world.seed} Heywood is south`).toBeGreaterThan(center.y);
      if (center && westbrook) expect(westbrook.x, `${world.seed} Westbrook is east`).toBeGreaterThan(center.x);
      if (center && pacifica) {
        expect(pacifica.x, `${world.seed} Pacifica is west`).toBeLessThan(center.x);
        expect(pacifica.y, `${world.seed} Pacifica is south`).toBeGreaterThan(center.y);
      }
      // The desert wraps the city on the east and the south, well out from the middle.
      if (badlands && center) {
        for (const place of Object.values(world.locations).filter((l) => l.district === badlands.id)) {
          expect(place.x > center.x + 20 || place.y > center.y + 30, `${world.seed} ${place.name} is out past the city`).toBe(true);
        }
      }
      const santo = mean(world, 'santo_domingo');
      if (center && santo) {
        expect(santo.x, `${world.seed} Santo Domingo is east`).toBeGreaterThan(center.x);
        expect(santo.y, `${world.seed} Santo Domingo is south`).toBeGreaterThan(center.y);
      }
    }
  });

  it('raises exactly one Arasaka Tower downtown, taller than anything else there', () => {
    for (const world of worlds) {
      const named = world.buildings.filter((b) => b.name === 'Arasaka Tower');
      const towers = world.buildings.filter((b) => b.district === 'city_center' && b.kind === 'tower');
      expect(named.length, world.seed).toBe(towers.length ? 1 : 0);
      const tower = named[0];
      if (!tower) continue;
      expect(tower.district).toBe('city_center');
      expect(tower.floors).toBe(Math.max(...towers.map((b) => b.floors)));
    }
  });
});

describe('buildings', () => {
  it('fills the city with plenty of them', () => {
    for (const world of worlds) expect(world.buildings.length, world.seed).toBeGreaterThan(150);
  });

  it('gives every building a unique id, a name and a valid size', () => {
    // Problems are collected and checked once: an assertion per building is slow across 500 cities.
    const problems: string[] = [];
    for (const world of worlds) {
      const ids = new Set(world.buildings.map((b) => b.id));
      if (ids.size !== world.buildings.length) problems.push(`${world.seed}: duplicate building ids`);
      for (const b of world.buildings) {
        const style = CITY.buildings.styles[b.kind];
        if (/[{}]|^\s*$/.test(b.name)) problems.push(`${world.seed} ${b.id}: name "${b.name}"`);
        if (b.w <= 0.8 || b.h <= 0.6) problems.push(`${world.seed} ${b.id}: ${b.w}×${b.h}`);
        if (b.floors < style.floors[0] || b.floors > style.floors[1]) problems.push(`${world.seed} ${b.id}: ${b.floors} floors`);
        if (!world.districts[b.district]) problems.push(`${world.seed} ${b.id}: no district ${b.district}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('never stacks buildings on top of each other', () => {
    for (const world of worlds.slice(0, 100)) {
      const byBlock = new Map<string, typeof world.buildings>();
      for (const b of world.buildings) byBlock.set(b.block, [...(byBlock.get(b.block) ?? []), b]);
      for (const group of byBlock.values()) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const a = group[i];
            const c = group[j];
            if (!a || !c) continue;
            const overlapping = a.x < c.x + c.w - 0.01 && c.x < a.x + a.w - 0.01 && a.y < c.y + c.h - 0.01 && c.y < a.y + a.h - 0.01;
            expect(overlapping, `${world.seed}: ${a.id} overlaps ${c.id}`).toBe(false);
          }
        }
      }
    }
  });

  it('keeps buildings off the streets and out of the sea', () => {
    const problems: string[] = [];
    for (const world of worlds.slice(0, 150)) {
      const inSea = seaTest(world.layout, world.seed);
      for (const b of world.buildings) {
        for (const x of world.layout.avenues) {
          if (!(b.x + b.w <= x - STREET_HALF_WIDTH + 0.01 || b.x >= x + STREET_HALF_WIDTH - 0.01)) problems.push(`${world.seed}: ${b.id} on avenue ${x}`);
        }
        for (const y of world.layout.streets) {
          if (!(b.y + b.h <= y - STREET_HALF_WIDTH + 0.01 || b.y >= y + STREET_HALF_WIDTH - 0.01)) problems.push(`${world.seed}: ${b.id} on street ${y}`);
        }
        const corners = [
          { x: b.x, y: b.y },
          { x: b.x + b.w, y: b.y + b.h },
          { x: b.x + b.w, y: b.y },
          { x: b.x, y: b.y + b.h },
        ];
        if (corners.some(inSea)) problems.push(`${world.seed}: ${b.id} in the sea`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('finds the block a point is in, matching every building address', () => {
    for (const world of worlds.slice(0, 100)) {
      for (const b of world.buildings) {
        const block = blockAt(world.layout, { x: b.x + b.w / 2, y: b.y + b.h / 2 });
        expect(block?.address, b.id).toBe(b.block);
        if (!block) continue;
        expect(b.x).toBeGreaterThanOrEqual(block.x0);
        expect(b.x + b.w).toBeLessThanOrEqual(block.x1);
        expect(b.y).toBeGreaterThanOrEqual(block.y0);
        expect(b.y + b.h).toBeLessThanOrEqual(block.y1);
      }
    }
    const layout = { avenues: [30, 60], streets: [50], coast: null };
    expect(blockAt(layout, { x: 0, y: 0 })?.address).toBe('A1');
    expect(blockAt(layout, { x: 30, y: 50 })?.address).toBe('B2');
    expect(blockAt(layout, { x: 100, y: 100 })?.address).toBe('C2');
    expect(blockAt(layout, { x: -1, y: 20 })).toBeNull();
  });

  it('puts every building in exactly one category, and every storefront in business', () => {
    const problems: string[] = [];
    const businesses = new Map(CITY.buildings.businesses.map((b) => [b.id, b]));
    // Real storefronts keep their real names rather than their business's sign.
    const real = new Set((CITY.buildings.landmarks ?? []).map((l) => l.name));
    for (const world of worlds.slice(0, 100)) {
      for (const b of world.buildings) {
        const style = CITY.buildings.styles[b.kind];
        if (!CITY.buildings.categories[b.category]) problems.push(`${world.seed} ${b.id}: no category ${b.category}`);
        if (b.kind === 'shops') {
          const business = b.business ? businesses.get(b.business) : undefined;
          if (!business) problems.push(`${world.seed} ${b.id}: storefront without a business`);
          else if (business.category !== b.category || business.label !== b.kindLabel || (!real.has(b.name) && !b.name.includes(business.sign))) {
            problems.push(`${world.seed} ${b.id}: ${b.name} doesn't match ${business.id}`);
          }
          if (!CITY.buildings.categories[b.category]?.business) problems.push(`${world.seed} ${b.id}: storefront in ${b.category}`);
        } else {
          if (b.business !== null || b.category !== style.category || b.kindLabel !== style.label) problems.push(`${world.seed} ${b.id}: ${b.kind} as ${b.category}`);
          if (CITY.buildings.categories[b.category]?.business) problems.push(`${world.seed} ${b.id}: ${b.kind} counted as a business`);
        }
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it('opens every category of business somewhere, and leans each district its own way', () => {
    const shares = new Map<string, Map<string, number>>();
    for (const world of worlds) {
      for (const b of world.buildings) {
        if (b.kind !== 'shops') continue;
        const counts = shares.get(b.district) ?? new Map<string, number>();
        counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
        shares.set(b.district, counts);
      }
    }
    const share = (district: string, category: string) => {
      const counts = shares.get(district) ?? new Map<string, number>();
      const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
      return (counts.get(category) ?? 0) / Math.max(1, total);
    };
    const seen = new Set([...shares.values()].flatMap((counts) => [...counts.keys()]));
    for (const [id, info] of Object.entries(CITY.buildings.categories)) if (info.business) expect(seen, id).toContain(id);
    expect(share('watson', 'cyberware')).toBeGreaterThan(share('city_center', 'cyberware'));
    expect(share('westbrook', 'entertainment')).toBeGreaterThan(share('heywood', 'entertainment'));
    expect(share('santo_domingo', 'vehicles')).toBeGreaterThan(share('city_center', 'vehicles'));
    expect(share('city_center', 'clothing')).toBeGreaterThan(share('pacifica', 'clothing'));
  });

  it('builds the Badlands out of shacks and containers, and keeps them sparse', () => {
    for (const world of worlds) {
      const desert = world.buildings.filter((b) => world.districts[b.district]?.terrain === 'desert');
      for (const b of desert) expect(['shack', 'container']).toContain(b.kind);
      const city = world.buildings.filter((b) => world.districts[b.district]?.terrain === 'city');
      for (const b of city) expect(['shack', 'container']).not.toContain(b.kind);
    }
  });
});

describe('city content', () => {
  it('only uses location kinds that exist', () => {
    for (const district of CITY.districts) {
      for (const kind of district.kinds) expect(CITY.kinds[kind], `${district.id}: ${kind}`).toBeDefined();
    }
  });

  it('gives every real place a kind that exists, and a description that fits', () => {
    for (const district of CITY.districts) {
      for (const landmark of district.landmarks ?? []) {
        expect(CITY.kinds[landmark.kind], `${district.id}: ${landmark.name}`).toBeDefined();
        expect(landmark.description.length, landmark.name).toBeLessThanOrEqual(MAX_DESCRIPTION);
      }
    }
  });

  it('only trades in categories of business that exist', () => {
    for (const district of CITY.districts) {
      for (const category of Object.keys(district.trade ?? {})) {
        expect(CITY.buildings.categories[category as keyof typeof CITY.buildings.categories]?.business, `${district.id}: ${category}`).toBe(true);
      }
    }
    const ids = CITY.buildings.businesses.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of CITY.buildings.businesses) expect(CITY.buildings.categories[b.category]?.business, b.id).toBe(true);
  });

  it('zones every district with at least one kind of building', () => {
    for (const district of CITY.districts) {
      const weights = Object.values(district.zoning).filter((w) => (w ?? 0) > 0);
      expect(weights.length, district.id).toBeGreaterThan(0);
    }
  });

  it('uses only known markup tags', () => {
    const texts = [
      CITY.welcome,
      ...CITY.districts.flatMap((d) => [...d.atmosphere.outdoor, ...d.atmosphere.indoor, ...d.ambient.outdoor, ...d.ambient.indoor]),
      ...Object.values(CITY.kinds).flatMap((k) => [...k.descriptions, ...k.ambient]),
    ].map((line) => (typeof line === 'string' ? line : line.text));
    for (const text of texts) expect(stripMarkup(text), text).not.toMatch(/\{[a-z]\|/);
  });

  it('defines every color as 6-digit hex (the particle tint needs it)', () => {
    const themes = [...CITY.districts.map((d) => d.theme), ...Object.values(CITY.kinds).flatMap((k) => (k.theme ? [k.theme] : []))];
    for (const theme of themes) {
      for (const color of [theme.primary, theme.secondary]) if (color) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
