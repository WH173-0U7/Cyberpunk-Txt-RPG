import { createRng } from './rng';
import type { CityLayout, District, Point, Side } from './types';

type Coast = NonNullable<CityLayout['coast']>;

/** A point's position along a map edge, and how far in from that edge it is (both 0–100). */
export function coastFrame(side: Side, p: Point): { along: number; depth: number } {
  switch (side) {
    case 'west':
      return { along: p.y, depth: p.x };
    case 'east':
      return { along: p.y, depth: 100 - p.x };
    case 'north':
      return { along: p.x, depth: p.y };
    case 'south':
      return { along: p.x, depth: 100 - p.y };
  }
}

/** The inverse of `coastFrame`: a map point from a position along the edge and a depth. */
export function fromCoastFrame(side: Side, along: number, depth: number): Point {
  switch (side) {
    case 'west':
      return { x: depth, y: along };
    case 'east':
      return { x: 100 - depth, y: along };
    case 'north':
      return { x: along, y: depth };
    case 'south':
      return { x: along, y: 100 - depth };
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

/** The district whose center is closest: city blocks belong to the nearest district. */
export function districtAt(districts: District[], p: Point): District | null {
  let best: District | null = null;
  let bestDistance = Infinity;
  for (const d of districts) {
    const distance = Math.hypot(d.x - p.x, d.y - p.y);
    if (distance < bestDistance) {
      best = d;
      bestDistance = distance;
    }
  }
  return best;
}
