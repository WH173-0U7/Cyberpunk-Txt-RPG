import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { distance, generateWorld, MAX_DESCRIPTION, segmentsCross } from '../src/engine/generate';
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

  it('makes cities of a playable size', () => {
    for (const world of worlds) {
      const districtCount = Object.keys(world.districts).length;
      const locationCount = Object.keys(world.locations).length;
      expect(districtCount, world.seed).toBeGreaterThanOrEqual(3);
      expect(districtCount, world.seed).toBeLessThanOrEqual(5);
      expect(locationCount, world.seed).toBeGreaterThanOrEqual(8);
      expect(locationCount, world.seed).toBeLessThanOrEqual(20);
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

  it('never draws routes that cross each other', () => {
    for (const world of worlds) {
      const list = edges(world);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [a, b] = list[i] ?? [];
          const [c, d] = list[j] ?? [];
          const [pa, pb, pc, pd] = [a, b, c, d].map((id) => world.locations[id ?? '']);
          if (!pa || !pb || !pc || !pd) continue;
          expect(segmentsCross(pa, pb, pc, pd), `${world.seed}: ${a}-${b} crosses ${c}-${d}`).toBe(false);
        }
      }
    }
  });

  it('keeps locations on the map and apart from each other', () => {
    for (const world of worlds) {
      const list = Object.values(world.locations);
      for (const location of list) {
        expect(location.x).toBeGreaterThanOrEqual(7);
        expect(location.x).toBeLessThanOrEqual(93);
        expect(location.y).toBeGreaterThanOrEqual(7);
        expect(location.y).toBeLessThanOrEqual(93);
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

describe('city content', () => {
  it('only uses location kinds that exist', () => {
    for (const district of CITY.districts) {
      for (const kind of district.kinds) expect(CITY.kinds[kind], `${district.id}: ${kind}`).toBeDefined();
    }
  });

  it('uses only known markup tags', () => {
    const texts = [
      ...CITY.intro,
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
