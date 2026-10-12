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
        for (const o of stations) if (o !== s) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThanOrEqual(11);
        if (world.layout.coast) expect(s.x, `${world.seed} ${s.id} too close to the sea`).toBeGreaterThanOrEqual(world.layout.coast.depth + 5);
      }
    }
  });

  it('names every station once, with its district’s real NCART station names', () => {
    for (const world of worlds) {
      const stations = Object.values(world.transit.stations);
      const names = stations.map((s) => s.name);
      expect(new Set(names).size, world.seed).toBe(names.length);
      for (const s of stations) expect(CITY.ncart.stations[s.district], `${world.seed} ${s.name}`).toContain(s.name);
      // Never the name of a place in the same city.
      const places = new Set(Object.values(world.locations).map((l) => l.name));
      for (const name of names) expect(places.has(name), `${world.seed} ${name}`).toBe(false);
    }
  });

  it('names lines after the real ones, in their colors', () => {
    for (const world of worlds) {
      world.transit.lines.forEach((line, i) => {
        const real = CITY.ncart.lines[i];
        if (real) expect(line).toMatchObject({ name: real.name, color: real.color });
      });
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

  it('rides the NCART only from a stop, to the stop nearest the destination', () => {
    let rides = 0;
    for (const world of worlds) {
      const stations = Object.values(world.transit.stations);
      const place = Object.values(world.locations).find((l) => world.districts[l.district]?.terrain === 'city');
      const board = stations[0];
      if (!place || !board) continue;
      const to = { ...streetSpot(place), place: place.id };
      // Out on the street: no train.
      expect(planTrip(world, place, to, 'ncart', TRAVEL)).toBeNull();

      const plan = planTrip(world, { ...board, station: board.id }, to, 'ncart', TRAVEL);
      const nearest = stations.reduce((best, s) =>
        Math.abs(s.x - place.x) + Math.abs(s.y - place.y) < Math.abs(best.x - place.x) + Math.abs(best.y - place.y) ? s : best,
      );
      if (nearest.id === board.id) {
        expect(plan).toBeNull();
        continue;
      }
      rides++;
      expect(plan?.legs.map((l) => l.kind)).toEqual(['wait', 'ride']);
      expect(plan?.to.station).toBe(nearest.id);
      expect(plan?.fare).toBe(TRAVEL.fare);
    }
    expect(rides).toBeGreaterThan(200);
  });

  it('is much quicker than walking between stops far apart', () => {
    let faster = 0;
    let far = 0;
    for (const world of worlds) {
      const stations = Object.values(world.transit.stations);
      for (const a of stations) {
        for (const b of stations) {
          if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 50) continue;
          const to = { ...streetSpot(b), station: b.id };
          const ride = planTrip(world, { ...a, station: a.id }, to, 'ncart', TRAVEL);
          const walk = planTrip(world, a, to, 'foot', TRAVEL);
          if (!ride || !walk) continue;
          far++;
          if (ride.minutes < walk.minutes) faster++;
        }
      }
    }
    expect(far).toBeGreaterThan(200);
    expect(faster / far).toBeGreaterThan(0.9);
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
