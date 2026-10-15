import { createRng } from './rng';
import type { CityLayout, District, Point, Side, Subdistrict } from './types';

/**
 * How wide and tall the city is, in map units (a block is about eight). Everything that says
 * where the edge of the map is goes by this; the districts' anchors are on a 0–100 scale of
 * the real Night City and are scaled up to it.
 */
export const WORLD = 160;

type Coast = NonNullable<CityLayout['coast']>;

/** A point's position along a map edge, and how far in from that edge it is (both 0–`WORLD`). */
export function coastFrame(side: Side, p: Point): { along: number; depth: number } {
  switch (side) {
    case 'west':
      return { along: p.y, depth: p.x };
    case 'east':
      return { along: p.y, depth: WORLD - p.x };
    case 'north':
      return { along: p.x, depth: p.y };
    case 'south':
      return { along: p.x, depth: WORLD - p.y };
  }
}

/** The inverse of `coastFrame`: a map point from a position along the edge and a depth. */
export function fromCoastFrame(side: Side, along: number, depth: number): Point {
  switch (side) {
    case 'west':
      return { x: depth, y: along };
    case 'east':
      return { x: WORLD - depth, y: along };
    case 'north':
      return { x: along, y: depth };
    case 'south':
      return { x: along, y: WORLD - depth };
  }
}

/**
 * How far the sea reaches in from the coast's edge at each point along it. The shoreline
 * wobbles around `coast.depth`, the same way every time for a given seed.
 */
export function shoreline(coast: Coast, seed: string): (along: number) => number {
  const phase = createRng(`${seed}:coast`).range(0, Math.PI * 2);
  return (along) => coast.depth + Math.sin(along * 0.19 + phase) * 1.1 + Math.sin(along * 0.06 + phase * 2) * 1.4;
}

/** A test for whether a point is out in the sea. */
export function seaTest(layout: CityLayout, seed: string): (p: Point) => boolean {
  const { coast } = layout;
  if (!coast) return () => false;
  const shore = shoreline(coast, seed);
  return (p) => {
    const { along, depth } = coastFrame(coast.side, p);
    return depth < shore(along);
  };
}

/**
 * The district and neighborhood a point is in: the nearest neighborhood of any district (a
 * district with none counts as one, at its center). Every city block belongs to one.
 */
export function subdistrictAt(districts: District[], p: Point): { district: District; subdistrict: Subdistrict | null } | null {
  let best: { district: District; subdistrict: Subdistrict | null } | null = null;
  let bestDistance = Infinity;
  for (const district of districts) {
    if (district.subdistricts.length === 0) {
      const distance = (district.x - p.x) ** 2 + (district.y - p.y) ** 2;
      if (distance < bestDistance) {
        best = { district, subdistrict: null };
        bestDistance = distance;
      }
      continue;
    }
    for (const subdistrict of district.subdistricts) {
      const distance = (subdistrict.x - p.x) ** 2 + (subdistrict.y - p.y) ** 2;
      if (distance < bestDistance) {
        best = { district, subdistrict };
        bestDistance = distance;
      }
    }
  }
  return best;
}

/** The district a point is in (see `subdistrictAt`). */
export function districtAt(districts: District[], p: Point): District | null {
  return subdistrictAt(districts, p)?.district ?? null;
}
