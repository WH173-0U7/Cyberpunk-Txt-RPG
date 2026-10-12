import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { TRAVEL } from '../src/data/travel';
import { streetSpot } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { createRng } from '../src/engine/rng';
import { pathLength, snapToStreet, streetRoute } from '../src/engine/streets';
import { rideBetween } from '../src/engine/transit';
import { planTrip, startTrip, tripProgress } from '../src/engine/travel';
import type { Point } from '../src/engine/types';

const seeds = Array.from({ length: 300 }, (_, i) => createRng(`ncart-${i}`).next().toString(16).slice(2, 10));
const worlds = seeds.map((seed) => generateWorld(seed, CITY));

const onGrid = (layout: { avenues: number[]; streets: number[] }, p: Point) => layout.avenues.includes(p.x) || layout.streets.includes(p.y);

describe('NCART network', () => {
  it('gives nearly every city a network of several stations', () => {
    const counts = worlds.map((w) => Object.keys(w.transit.stations).length);
    expect(counts.filter((n) => n >= 4).length).toBeGreaterThan(worlds.length * 0.9);
    for (const n of counts) expect(n === 0 || n >= 2).toBe(true);
  });

  it('puts stations on street corners in the city, clear of places and each other', () => {
    for (const world of worlds) {
      const stations = Object.values(world.transit.stations);
      for (const s of stations) {
        expect(world.layout.avenues, `${world.seed} ${s.id}`).toContain(s.x);
        expect(world.layout.streets, `${world.seed} ${s.id}`).toContain(s.y);
        expect(world.districts[s.district]?.terrain, `${world.seed} ${s.id}`).toBe('city');
        for (const l of Object.values(world.locations)) expect(Math.hypot(l.x - s.x, l.y - s.y)).toBeGreaterThanOrEqual(6);
        for (const o of stations) if (o !== s) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThanOrEqual(13);
        if (world.layout.coast) expect(s.x, `${world.seed} ${s.id} too close to the sea`).toBeGreaterThanOrEqual(world.layout.coast.depth + 5);
      }
    }
  });

  it('names every station once, after its neighborhood', () => {
    for (const world of worlds) {
      const names = Object.values(world.transit.stations).map((s) => s.name);
      expect(new Set(names).size, world.seed).toBe(names.length);
      for (const name of names) expect(name).toMatch(/ Station$/);
    }
  });

  it('connects every station to every other, with every station on a line', () => {
    for (const world of worlds) {
      const ids = Object.keys(world.transit.stations);
      for (const s of Object.values(world.transit.stations)) expect(s.lines.length, `${world.seed} ${s.id}`).toBeGreaterThan(0);
      for (const id of ids) for (const other of ids) if (id !== other) expect(rideBetween(world.transit, id, other), `${world.seed} ${id}→${other}`).not.toBeNull();
      for (const line of world.transit.lines) {
        expect(line.stations.length).toBeGreaterThanOrEqual(2);
        expect(line.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('walking routes', () => {
  it('follows the streets from any point to any other', () => {
    const rng = createRng('walks');
    for (const world of worlds.slice(0, 100)) {
      for (let n = 0; n < 10; n++) {
        const from = { x: rng.range(5, 95), y: rng.range(5, 95) };
        const to = { x: rng.range(5, 95), y: rng.range(5, 95) };
        const path = streetRoute(world.layout, from, to);
        expect(path[0]).toEqual({ x: Math.round(from.x * 100) / 100, y: Math.round(from.y * 100) / 100 });
        expect(path.at(-1)).toEqual({ x: Math.round(to.x * 100) / 100, y: Math.round(to.y * 100) / 100 });
        for (let i = 1; i < path.length; i++) {
          const p = path[i - 1];
          const q = path[i];
          expect(p?.x === q?.x || p?.y === q?.y, `${world.seed} leg ${i}`).toBe(true);
        }
        // Everything but the hops on and off the street runs along a street.
        for (const p of path.slice(1, -1)) expect(onGrid(world.layout, p), `${world.seed} ${JSON.stringify(p)}`).toBe(true);
      }
    }
  });

  it('walks corner to corner as the crow flies along the blocks', () => {
    for (const world of worlds.slice(0, 50)) {
      const places = Object.values(world.locations);
      for (const a of places) {
        for (const b of places) {
          const length = pathLength(streetRoute(world.layout, a, b));
          expect(length).toBeCloseTo(Math.abs(a.x - b.x) + Math.abs(a.y - b.y), 5);
        }
      }
    }
  });

  it('snaps a point to the nearest street', () => {
    const layout = { avenues: [20, 50], streets: [30], coast: null };
    expect(snapToStreet(layout, { x: 22, y: 70 })).toEqual({ x: 20, y: 70 });
    expect(snapToStreet(layout, { x: 35, y: 31 })).toEqual({ x: 35, y: 30 });
  });
});

describe('trip plans', () => {
  it('takes real minutes on foot, about one per block', () => {
    for (const world of worlds.slice(0, 50)) {
      const [a, b] = Object.values(world.locations);
      if (!a || !b) continue;
      const plan = planTrip(world, a, { ...streetSpot(b), place: b.id }, 'foot', TRAVEL);
      expect(plan?.minutes).toBeCloseTo((Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * TRAVEL.walkMinutesPerUnit, 5);
      expect(plan?.fare).toBe(0);
    }
  });

  it('beats walking on long trips by NCART, for a fare', () => {
    let faster = 0;
    let long = 0;
    for (const world of worlds) {
      const places = Object.values(world.locations).filter((l) => world.districts[l.district]?.terrain === 'city');
      const pairs = places.flatMap((a) => places.map((b) => [a, b] as const)).filter(([a, b]) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 60);
      for (const [a, b] of pairs.slice(0, 3)) {
        const to = { ...streetSpot(b), place: b.id };
        const walk = planTrip(world, a, to, 'foot', TRAVEL);
        const ride = planTrip(world, a, to, 'ncart', TRAVEL);
        if (!walk || !ride) continue;
        long++;
        if (ride.minutes < walk.minutes) faster++;
        expect(ride.fare).toBe(TRAVEL.fare);
        expect(ride.legs.some((l) => l.kind === 'ride')).toBe(true);
      }
    }
    expect(long).toBeGreaterThan(100);
    expect(faster / long).toBeGreaterThan(0.75);
  });

  it('moves the player along the trip as the clock runs', () => {
    const world = worlds[0];
    if (!world) throw new Error('no world');
    const [a, b] = Object.values(world.locations);
    if (!a || !b) throw new Error('no places');
    const plan = planTrip(world, a, { ...streetSpot(b), place: b.id }, 'foot', TRAVEL);
    if (!plan) throw new Error('no plan');
    const trip = startTrip(plan, 1000, TRAVEL);
    expect(trip.endsAt - trip.startedAt).toBe(Math.round((plan.minutes * 60_000) / TRAVEL.timeScale));
    expect(tripProgress(trip, 1000).at).toEqual({ x: a.x, y: a.y });
    expect(tripProgress(trip, trip.endsAt).at).toEqual({ x: b.x, y: b.y });
    expect(tripProgress(trip, (trip.startedAt + trip.endsAt) / 2).done).toBeCloseTo(0.5);
  });
});
