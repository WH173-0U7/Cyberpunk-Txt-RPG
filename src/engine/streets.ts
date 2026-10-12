import type { CityLayout, Point } from './types';

const EPSILON = 1e-6;

/** The nearest point that's on a street, avenue or the other. */
export function snapToStreet(layout: CityLayout, p: Point): Point {
  let best: Point = { x: p.x, y: p.y };
  let bestDistance = Infinity;
  for (const x of layout.avenues) {
    const d = Math.abs(p.x - x);
    if (d < bestDistance) {
      bestDistance = d;
      best = { x, y: p.y };
    }
  }
  for (const y of layout.streets) {
    const d = Math.abs(p.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = { x: p.x, y };
    }
  }
  return round(best);
}

/**
 * A walking route along the street grid: a short hop onto the nearest street, along the
 * streets with as few turns as the shortest way allows, and a hop off at the other end.
 */
export function streetRoute(layout: CityLayout, from: Point, to: Point): Point[] {
  const a = snapToStreet(layout, from);
  const b = snapToStreet(layout, to);
  const onAvenue = (p: Point) => layout.avenues.filter((x) => Math.abs(x - p.x) < EPSILON);
  const onStreet = (p: Point) => layout.streets.filter((y) => Math.abs(y - p.y) < EPSILON);
  const options: Point[][] = [];

  // Same line: straight there.
  if (onAvenue(a).some((x) => onAvenue(b).includes(x)) || onStreet(a).some((y) => onStreet(b).includes(y))) {
    options.push([a, b]);
  }
  // One turn, at the corner where their lines cross.
  if (onAvenue(a).length && onStreet(b).length) options.push([a, { x: a.x, y: b.y }, b]);
  if (onStreet(a).length && onAvenue(b).length) options.push([a, { x: b.x, y: a.y }, b]);
  // Two turns, across whichever connecting street or avenue keeps the walk shortest.
  if (onAvenue(a).length && onAvenue(b).length) {
    const y = closestBetween(layout.streets, a.y, b.y);
    if (y !== null) options.push([a, { x: a.x, y }, { x: b.x, y }, b]);
  }
  if (onStreet(a).length && onStreet(b).length) {
    const x = closestBetween(layout.avenues, a.x, b.x);
    if (x !== null) options.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  }

  const best = options.reduce<Point[] | null>((shortest, path) => (!shortest || pathLength(path) < pathLength(shortest) ? path : shortest), null) ?? [a, b];
  return tidy([{ x: from.x, y: from.y }, ...best, { x: to.x, y: to.y }]);
}

export function pathLength(path: Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1];
    const q = path[i];
    if (p && q) total += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return total;
}

/** The point a given distance along a path (clamped to its ends). */
export function pointAlong(path: Point[], distance: number): Point {
  const first = path[0];
  if (!first) return { x: 0, y: 0 };
  let left = Math.max(0, distance);
  for (let i = 1; i < path.length; i++) {
    const p = path[i - 1];
    const q = path[i];
    if (!p || !q) continue;
    const length = Math.hypot(q.x - p.x, q.y - p.y);
    if (left <= length) {
      const t = length === 0 ? 0 : left / length;
      return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
    }
    left -= length;
  }
  const last = path.at(-1) ?? first;
  return { x: last.x, y: last.y };
}

/** The first part of a path, up to a distance along it. */
export function pathUpTo(path: Point[], distance: number): Point[] {
  const out: Point[] = [];
  let left = Math.max(0, distance);
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    if (!p) continue;
    if (i === 0) {
      out.push(p);
      continue;
    }
    const prev = path[i - 1];
    if (!prev) continue;
    const length = Math.hypot(p.x - prev.x, p.y - prev.y);
    if (left >= length) {
      out.push(p);
      left -= length;
    } else {
      out.push(pointAlong([prev, p], left));
      break;
    }
  }
  return out;
}

/** Of the lines between two values, the one nearest their midpoint; otherwise the nearest outside. */
function closestBetween(lines: number[], a: number, b: number): number | null {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const mid = (a + b) / 2;
  const inside = lines.filter((v) => v >= lo - EPSILON && v <= hi + EPSILON);
  const pool = inside.length ? inside : lines;
  return pool.reduce<number | null>((best, v) => (best === null || Math.abs(v - mid) < Math.abs(best - mid) ? v : best), null);
}

/** Drops repeated points, so every segment has length. */
function tidy(path: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of path) {
    const last = out.at(-1);
    if (!last || Math.abs(last.x - p.x) > EPSILON || Math.abs(last.y - p.y) > EPSILON) out.push(round(p));
  }
  return out;
}

function round(p: Point): Point {
  return { x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 };
}
