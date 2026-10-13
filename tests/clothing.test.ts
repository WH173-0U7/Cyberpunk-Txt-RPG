import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { GARMENTS, SLOTS, STORE_QUALITY, STORES, STYLES } from '../src/data/clothing';
import { GEAR } from '../src/data/gear';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { createRng } from '../src/engine/rng';

describe('the clothing', () => {
  it('names every garment once, in a slot and a style, with a tier, a price and a word on it', () => {
    const names = Object.values(GARMENTS).map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(80);
    for (const [id, g] of Object.entries(GARMENTS)) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      expect(g.slot && SLOTS[g.slot], id).toBeTruthy();
      expect(g.style && STYLES[g.style], id).toBeTruthy();
      expect(['luxury', 'everyday', 'poverty'], id).toContain(g.quality);
      expect(g.price, id).toBeGreaterThanOrEqual(1);
      expect(g.grams, id).toBeGreaterThan(0);
      expect(g.note?.trim(), id).toBeTruthy();
      expect(g.name.trim(), id).toBe(g.name);
      // Pockets come with a limit on both counts, or not at all; the change goes in a pocket.
      expect(g.slots > 0, id).toBe(g.maxGrams > 0);
      if (g.change) expect(g.slots, id).toBeGreaterThan(0);
      expect(GEAR.kinds[id], id).toBe(g);
    }
    // Something to wear in every slot, in every style.
    for (const slot of Object.keys(SLOTS)) expect(Object.values(GARMENTS).some((g) => g.slot === slot), slot).toBe(true);
    for (const style of Object.keys(STYLES)) expect(Object.values(GARMENTS).some((g) => g.style === style), style).toBe(true);
  });

  it('dresses a new player head to toe but the head, off the thrift rack, with the wallet in the pants', () => {
    const worn = GEAR.start.filter((p) => p.in === null).map((p) => GEAR.kinds[p.kind]?.slot);
    expect(worn).toEqual(['inner', 'outer', 'legs', 'feet']);
    expect(GEAR.start.find((p) => p.kind === 'wallet')?.in).toBe('pants');
    for (const p of GEAR.start) if (GEAR.kinds[p.kind]?.slot) expect(STORES['thrift-shop'], p.kind).toContain(p.kind);
    // The pants take the change, and only they.
    expect(GEAR.start.filter((p) => GEAR.kinds[p.kind]?.change).map((p) => p.kind)).toEqual(['pants']);
  });

  it('stocks every store with real garments at its tier, for most of the body', () => {
    for (const [store, ids] of Object.entries(STORES)) {
      expect(ids.length, store).toBeGreaterThanOrEqual(8);
      expect(new Set(ids).size, store).toBe(ids.length);
      const slots = new Set<string>();
      for (const id of ids) {
        const g = GARMENTS[id];
        expect(g, `${store} sells ${id}, which there is no such thing as`).toBeDefined();
        if (g?.slot) slots.add(g.slot);
      }
      expect(slots.size, store).toBeGreaterThanOrEqual(4);
      // A luxury store sells luxury and nothing less; the thrift rack nothing dear; the rest the everyday.
      const tier = STORE_QUALITY[store];
      const tiers = new Set(ids.map((id) => GARMENTS[id]?.quality));
      expect(tier, store).toBeDefined();
      if (tier === 'luxury') expect([...tiers], store).toEqual(['luxury']);
      if (tier === 'poverty') expect(tiers.has('luxury'), store).toBe(false);
      if (tier === 'everyday') expect(tiers.has('everyday'), store).toBe(true);
      expect(GEAR.racks[store], store).toEqual(expect.arrayContaining(ids));
    }
    // Every clothing business in the city has a rack and a tier, is staffed, and keeps to districts that exist.
    for (const b of CITY.buildings.businesses.filter((b) => b.category === 'clothing')) {
      expect(GEAR.racks[b.id]?.length, b.id).toBeGreaterThan(0);
      expect(STORE_QUALITY[b.id], b.id).toBeDefined();
      expect(PEOPLE.roles.business[b.id]?.length, b.id).toBeGreaterThan(0);
      for (const district of b.where ?? []) expect(CITY.districts.some((d) => d.id === district), `${b.id} in ${district}`).toBe(true);
    }
    // The wiki's stores: Jinguji and Avante in the money, Stylishly in the middle-class districts, and the named stores where the wiki puts them.
    expect(CITY.buildings.businesses.find((b) => b.id === 'jinguji')?.where).toEqual(['city_center']);
    expect(CITY.buildings.businesses.find((b) => b.id === 'avante')?.where).toEqual(['city_center', 'westbrook']);
    expect(CITY.buildings.businesses.find((b) => b.id === 'stylishly')?.where).toEqual(['watson', 'heywood', 'santo_domingo']);
    const landmarks = CITY.buildings.landmarks ?? [];
    expect(landmarks.find((l) => l.name === 'Jinguji')).toMatchObject({ district: 'city_center', business: 'jinguji' });
    expect(landmarks.find((l) => l.name === 'Appel de Paris')).toMatchObject({ district: 'city_center', business: 'avante' });
    expect(landmarks.find((l) => l.name === 'Blossoming Sakura Clothier')).toMatchObject({ district: 'westbrook', business: 'saekos' });
    expect(landmarks.find((l) => l.name === 'Ded-Zed')).toMatchObject({ district: 'watson', business: 'ded-zed' });
  });

  it('opens the named stores and the chains in their districts, city by city', () => {
    const seeds = Array.from({ length: 80 }, (_, i) => createRng(`clothing-${i}`).next().toString(16).slice(2, 10));
    const named = new Set<string>();
    for (const seed of seeds) {
      const world = generateWorld(seed, CITY);
      for (const b of world.buildings) {
        if (b.category !== 'clothing' || !b.business) continue;
        const business = CITY.buildings.businesses.find((x) => x.id === b.business);
        if (business?.where) expect(business.where, `${seed} ${b.name} in ${b.district}`).toContain(b.district);
        if ((CITY.buildings.landmarks ?? []).some((l) => l.name === b.name)) named.add(b.name);
      }
    }
    for (const name of ['Jinguji', 'Appel de Paris', 'Blossoming Sakura Clothier', 'Ded-Zed']) expect(named, name).toContain(name);
  });
});
