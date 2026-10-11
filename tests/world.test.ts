import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/data/world';
import { resolveTheme } from '../src/fx/theme';
import { stripMarkup } from '../src/ui/markup';

// Guards the hand-written content in src/data/world.ts against typos.
describe('world data', () => {
  const locations = Object.entries(WORLD.locations);

  it('starts somewhere that exists', () => {
    expect(WORLD.locations[WORLD.start]).toBeDefined();
  });

  it('keys every district and location by its own id', () => {
    for (const [key, district] of Object.entries(WORLD.districts)) expect(district.id).toBe(key);
    for (const [key, location] of locations) expect(location.id).toBe(key);
  });

  it('only links to real locations and districts', () => {
    for (const [, location] of locations) {
      expect(WORLD.districts[location.district], `${location.id} district`).toBeDefined();
      for (const [direction, target] of Object.entries(location.exits)) {
        expect(WORLD.locations[target], `${location.id} → ${direction}`).toBeDefined();
      }
    }
  });

  it('can reach every location from the start', () => {
    const seen = new Set([WORLD.start]);
    const queue = [WORLD.start];
    for (let id = queue.shift(); id; id = queue.shift()) {
      for (const target of Object.values(WORLD.locations[id]?.exits ?? {})) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(WORLD.locations).sort());
  });

  it('uses only known markup tags', () => {
    const texts = [
      ...WORLD.intro,
      WORLD.welcome,
      ...locations.flatMap(([, l]) => [l.description, ...(l.ambient ?? []).map((a) => (typeof a === 'string' ? a : a.text))]),
    ];
    for (const text of texts) expect(stripMarkup(text), text).not.toMatch(/\{[a-z]\|/);
  });

  it('defines every color as 6-digit hex (the particle tint needs it)', () => {
    for (const [, location] of locations) {
      const district = WORLD.districts[location.district];
      if (!district) continue;
      const theme = resolveTheme(location, district);
      expect(theme.primary, location.id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.secondary, location.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
