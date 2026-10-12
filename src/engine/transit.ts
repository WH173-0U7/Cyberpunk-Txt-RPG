import { coastFrame, districtAt } from './geography';
import { createRng } from './rng';
import type { CityLayout, District, Location, Point, Station, Transit, TransitLine } from './types';

const LINE_COLORS = ['#ffd84d', '#ff2bd6', '#00f0ff', '#39ff88', '#ff8a3d', '#a46bff'];
/** Up to this many stations per city district. */
const PER_DISTRICT = 2;
/** Stations keep this far apart, and this far from any place's corner. */
const STATION_GAP = 13;
const PLACE_GAP = 6;
/** How far from a district's middle its stations can be. */
const REACH = 18;

/**
 * The city's NCART network: a couple of stations in every city district (the Badlands get
 * none), joined into lines. Its own random stream, so it never shifts the rest of the city.
 * `areas` names stations after each district's neighborhoods.
 */
export function generateTransit(
  seed: string,
  layout: CityLayout,
  districts: District[],
  locations: Location[],
  areas: Record<string, string[]>,
): Transit {
  const rng = createRng(`${seed}:ncart`);
  const { coast } = layout;
  const corners = layout.avenues
    .flatMap((x) => layout.streets.map((y) => ({ x, y })))
    .filter((c) => c.x >= 7 && c.x <= 93 && c.y >= 7 && c.y <= 93)
    .filter((c) => !coast || coastFrame(coast.side, c).depth >= coast.depth + 5)
    .filter((c) => districtAt(districts, c)?.terrain === 'city')
    .filter((c) => locations.every((l) => distance(l, c) >= PLACE_GAP));

  const stations: Station[] = [];
  const names = new Set<string>();
  for (const district of rng.shuffle(districts.filter((d) => d.terrain === 'city'))) {
    const nearby = rng.shuffle(corners.filter((c) => districtAt(districts, c)?.id === district.id && distance(c, district) <= REACH));
    const neighborhoods = rng.shuffle(areas[district.id] ?? []);
    let made = 0;
    for (const corner of nearby) {
      if (made >= PER_DISTRICT) break;
      if (stations.some((s) => distance(s, corner) < STATION_GAP)) continue;
      const fallback = `${district.name} ${['Central', 'East', 'West', 'North', 'South'][made] ?? made + 1}`;
      const base = neighborhoods.find((n) => !names.has(n)) ?? fallback;
      names.add(base);
      stations.push({ id: `ncart-${stations.length + 1}`, name: `${base} Station`, district: district.id, lines: [], ...corner });
      made++;
    }
  }
  if (stations.length < 2) return { stations: {}, lines: [] };

  const lines = drawLines(connect(stations), stations);
  for (const line of lines) {
    for (const id of line.stations) stations.find((s) => s.id === id)?.lines.push(line.id);
  }
  return { stations: Object.fromEntries(stations.map((s) => [s.id, s])), lines };
}

/** The shortest ride between two stations, as the stations it passes through. Null if they aren't connected. */
export function rideBetween(transit: Transit, from: string, to: string): string[] | null {
  const neighbors = new Map<string, Set<string>>();
  for (const line of transit.lines) {
    for (let i = 1; i < line.stations.length; i++) {
      const a = line.stations[i - 1];
      const b = line.stations[i];
      if (!a || !b) continue;
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      if (!neighbors.has(b)) neighbors.set(b, new Set());
      neighbors.get(a)?.add(b);
      neighbors.get(b)?.add(a);
    }
  }
  // Dijkstra over track length.
  const dist = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, string>();
  const open = new Set([from]);
  while (open.size) {
    const at = [...open].reduce((best, id) => ((dist.get(id) ?? Infinity) < (dist.get(best) ?? Infinity) ? id : best));
    open.delete(at);
    if (at === to) break;
    const here = transit.stations[at];
    for (const next of neighbors.get(at) ?? []) {
      const there = transit.stations[next];
      if (!here || !there) continue;
      const d = (dist.get(at) ?? Infinity) + distance(here, there);
      if (d < (dist.get(next) ?? Infinity)) {
        dist.set(next, d);
        previous.set(next, at);
        open.add(next);
      }
    }
  }
  if (!dist.has(to)) return null;
  const route = [to];
  for (let at = to; at !== from; ) {
    const prev = previous.get(at);
    if (!prev) return null;
    route.unshift(prev);
    at = prev;
  }
  return route;
}

/** Track between stations: the shortest set that joins them all, plus one loop if there's a short one. */
function connect(stations: Station[]): Array<[Station, Station]> {
  const [first, ...rest] = stations;
  if (!first) return [];
  const inTree = [first];
  const remaining = [...rest];
  const edges: Array<[Station, Station]> = [];
  while (remaining.length) {
    let best: [Station, Station, number] | null = null;
    for (const a of inTree) {
      for (const b of remaining) {
        const d = distance(a, b);
        if (!best || d < best[2]) best = [a, b, d];
      }
    }
    if (!best) break;
    edges.push([best[0], best[1]]);
    inTree.push(best[1]);
    remaining.splice(remaining.indexOf(best[1]), 1);
  }
  const has = (a: Station, b: Station) => edges.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const average = edges.reduce((sum, [a, b]) => sum + distance(a, b), 0) / Math.max(1, edges.length);
  const loops = stations
    .flatMap((a, i) => stations.slice(i + 1).map((b) => [a, b] as [Station, Station]))
    .filter(([a, b]) => !has(a, b) && distance(a, b) <= average * 1.4)
    .sort((p, q) => distance(...p) - distance(...q));
  if (loops[0] && stations.length >= 4) edges.push(loops[0]);
  return edges;
}

/** Splits the track into lines, each running as straight as it can until it runs out of track. */
function drawLines(edges: Array<[Station, Station]>, stations: Station[]): TransitLine[] {
  const unused = new Set(edges);
  const touching = (s: Station) => [...unused].filter(([a, b]) => a === s || b === s);
  const lines: TransitLine[] = [];
  while (unused.size) {
    // Start from the end of a line where there is one, so lines run end to end.
    const start = stations.find((s) => touching(s).length % 2 === 1) ?? stations.find((s) => touching(s).length > 0);
    if (!start) break;
    const path = [start];
    let at = start;
    let heading: Point | null = null;
    for (;;) {
      const options = touching(at);
      if (!options.length) break;
      const from: Station = at;
      const pick = options.reduce((best, edge) => {
        const turn = (e: [Station, Station]) => {
          const next = e[0] === from ? e[1] : e[0];
          const dir = unit({ x: next.x - from.x, y: next.y - from.y });
          return heading ? -(dir.x * heading.x + dir.y * heading.y) : 0;
        };
        return turn(edge) < turn(best) ? edge : best;
      });
      unused.delete(pick);
      const next = pick[0] === at ? pick[1] : pick[0];
      heading = unit({ x: next.x - at.x, y: next.y - at.y });
      path.push(next);
      at = next;
    }
    const n = lines.length;
    lines.push({ id: `line-${n + 1}`, name: `Line ${n + 1}`, color: LINE_COLORS[n % LINE_COLORS.length] ?? '#ffd84d', stations: path.map((s) => s.id) });
  }
  return lines;
}

function unit(v: Point): Point {
  const length = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / length, y: v.y / length };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
