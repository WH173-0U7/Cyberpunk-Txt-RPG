import { createRng, type Rng } from './rng';
import type { AmbientLine, District, Location, Point, Theme, Weather, World } from './types';

/** A district that may appear in a generated city. */
export interface DistrictTemplate {
  id: string;
  name: string;
  theme: Theme;
  /** One is picked per city and shared by the district's outdoor locations. */
  weather: Weather[];
  /** Neighborhood names used in place names, e.g. "{area} Market" → "Kabuki Market". */
  areas: string[];
  /** Kinds of location this district can contain (keys of `CityContent.kinds`). */
  kinds: string[];
  /** "edge" districts sit at the border of the map, like the Badlands. */
  placement?: 'edge';
  /** Second sentences for descriptions, setting the district's mood. */
  atmosphere: { outdoor: string[]; indoor: string[] };
  ambient: { outdoor: AmbientLine[]; indoor: AmbientLine[] };
}

/** A kind of place, e.g. a bar or a night market. */
export interface LocationKind {
  indoor: boolean;
  /** Weather inside (indoor kinds only); outdoor kinds use the district's. */
  weather?: Weather;
  /** Lighting that overrides the district colors. */
  theme?: Partial<Theme>;
  /** Name templates. `{area}` becomes a district neighborhood, `{n}` a small number. */
  names: string[];
  /** First sentences for descriptions. */
  descriptions: string[];
  ambient: AmbientLine[];
}

export interface CityContent {
  intro: string[];
  welcome: string;
  districts: DistrictTemplate[];
  kinds: Record<string, LocationKind>;
}

/** Longest description the location card is designed for (raw text, markup included). */
export const MAX_DESCRIPTION = 160;

const MAP_MIN = 7;
const MAP_MAX = 93;

/** Builds a whole city from a seed. Same seed and content, same city. */
export function generateWorld(seed: string, content: CityContent): World {
  const rng = createRng(seed);
  const templates = chooseDistricts(rng, content.districts);
  const centers = placeDistricts(rng, templates);

  const districts: Record<string, District> = {};
  const locations: Record<string, Location> = {};
  const usedNames = new Set<string>();
  const populated: DistrictTemplate[] = [];

  for (const template of templates) {
    const center = centers.get(template.id) ?? { x: 50, y: 50 };
    const weather = rng.pick(template.weather);
    const isEdge = template.placement === 'edge';
    const count = isEdge ? rng.int(2, 3) : rng.int(3, 4);
    const kinds = rng.shuffle(template.kinds).slice(0, Math.min(count, template.kinds.length));
    const spots = placeLocations(rng, center, kinds.length, isEdge ? 11 : 13, Object.values(locations));
    // A district with no room for any location is left off the map entirely.
    if (spots.length === 0) continue;
    populated.push(template);
    districts[template.id] = { id: template.id, name: template.name, theme: template.theme, ...center };

    spots.forEach((spot, index) => {
      const kindId = kinds[index] ?? '';
      const kind = content.kinds[kindId];
      if (!kind) throw new Error(`District "${template.id}" lists unknown location kind "${kindId}"`);
      const id = `${template.id}-${index + 1}`;
      locations[id] = {
        id,
        name: makeName(rng, kind, template, usedNames),
        kind: kindId,
        district: template.id,
        weather: kind.indoor ? (kind.weather ?? 'clear') : weather,
        ...(kind.theme ? { theme: kind.theme } : {}),
        description: makeDescription(rng, kind, template),
        links: [],
        ambient: [
          ...rng.shuffle(kind.ambient).slice(0, 2),
          ...rng.shuffle(kind.indoor ? template.ambient.indoor : template.ambient.outdoor).slice(0, 2),
        ],
        ...spot,
      };
    });
  }

  linkLocations(rng, populated, districts, locations);

  return {
    seed,
    start: chooseStart(rng, populated, locations, content),
    intro: content.intro,
    welcome: content.welcome,
    districts,
    locations,
  };
}

/** Three or four city districts, plus usually one edge district. */
function chooseDistricts(rng: Rng, pool: DistrictTemplate[]): DistrictTemplate[] {
  const city = rng.shuffle(pool.filter((d) => d.placement !== 'edge'));
  const edge = pool.filter((d) => d.placement === 'edge');
  const chosen = city.slice(0, Math.min(city.length, rng.int(3, 4)));
  if (edge.length && rng.chance(0.7)) chosen.push(rng.pick(edge));
  return chosen;
}

function placeDistricts(rng: Rng, templates: DistrictTemplate[]): Map<string, Point> {
  const centers = new Map<string, Point>();

  for (const template of templates.filter((t) => t.placement === 'edge')) {
    const along = rng.range(25, 75);
    const side = rng.int(0, 3);
    const point = [
      { x: along, y: 13 },
      { x: 87, y: along },
      { x: along, y: 87 },
      { x: 13, y: along },
    ][side] ?? { x: 13, y: along };
    centers.set(template.id, point);
  }

  const edges = [...centers.values()];
  let minGap = 30;
  for (const template of templates.filter((t) => t.placement !== 'edge')) {
    for (let attempt = 0; ; attempt++) {
      if (attempt > 0 && attempt % 100 === 0) minGap -= 2;
      const point = { x: rng.range(24, 76), y: rng.range(24, 76) };
      const clearOfCity = [...centers.values()].every((c) => edges.includes(c) || distance(c, point) >= minGap);
      const clearOfEdge = edges.every((c) => distance(c, point) >= minGap + 6);
      if (clearOfCity && clearOfEdge) {
        centers.set(template.id, point);
        break;
      }
    }
  }
  return centers;
}

/** Scatters up to `count` spots around a district center, keeping clear of every other location. */
function placeLocations(rng: Rng, center: Point, count: number, radius: number, existing: Point[]): Point[] {
  const placed: Point[] = [];
  let minGap = 10;
  for (let attempt = 0; placed.length < count && attempt < 400; attempt++) {
    // If the district is crowded, loosen the spacing rather than leave it nearly empty.
    if (attempt === 200 && placed.length < 2) minGap = 8;
    const angle = rng.range(0, Math.PI * 2);
    const r = rng.range(4, radius);
    const point = { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
    if (point.x < MAP_MIN || point.x > MAP_MAX || point.y < MAP_MIN || point.y > MAP_MAX) continue;
    if ([...existing, ...placed].every((other) => distance(other, point) >= minGap)) placed.push(point);
  }
  return placed;
}

function fill(rng: Rng, template: string, district: DistrictTemplate): string {
  return template.replace(/\{area\}/g, () => rng.pick(district.areas)).replace(/\{n\}/g, () => String(rng.int(2, 14)));
}

function makeName(rng: Rng, kind: LocationKind, district: DistrictTemplate, used: Set<string>): string {
  for (let attempt = 0; attempt < 16; attempt++) {
    const name = fill(rng, rng.pick(kind.names), district);
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const base = fill(rng, kind.names[0] ?? 'Unnamed Block', district);
  let n = 2;
  while (used.has(`${base} ${n}`)) n++;
  used.add(`${base} ${n}`);
  return `${base} ${n}`;
}

/** A sentence about the place, then one about the district's mood when it fits on the card. */
function makeDescription(rng: Rng, kind: LocationKind, district: DistrictTemplate): string {
  const first = rng.pick(kind.descriptions);
  const moods = rng.shuffle(kind.indoor ? district.atmosphere.indoor : district.atmosphere.outdoor);
  const second = moods.find((mood) => first.length + 1 + mood.length <= MAX_DESCRIPTION);
  return second ? `${first} ${second}` : first;
}

/**
 * Streets: a minimum spanning tree inside each district, the shortest crossing-free link
 * between neighboring districts, and a few extra links so the map has loops.
 */
function linkLocations(
  rng: Rng,
  templates: DistrictTemplate[],
  districts: Record<string, District>,
  locations: Record<string, Location>,
): void {
  const all = Object.values(locations);
  const edges: Array<[Location, Location]> = [];
  const connect = (a: Location, b: Location) => {
    edges.push([a, b]);
    a.links.push(b.id);
    b.links.push(a.id);
  };
  const isClear = (a: Location, b: Location) =>
    edges.every(([c, d]) => sharesEnd(a, b, c, d) || !segmentsCross(a, b, c, d)) &&
    all.every((n) => n === a || n === b || distanceToSegment(n, a, b) >= 4);

  const members = (districtId: string) => all.filter((l) => l.district === districtId);

  for (const template of templates) {
    const group = members(template.id);
    for (const [a, b] of spanningTree(group)) connect(a, b);
    if (group.length >= 3 && rng.chance(0.5)) {
      const extra = pairs(group, group).find(([a, b]) => !a.links.includes(b.id) && isClear(a, b));
      if (extra) connect(...extra);
    }
  }

  const districtList = templates.map((t) => districts[t.id]).filter((d): d is District => Boolean(d));
  const tree = spanningTree(districtList);
  const bridge = ([from, to]: [District, District]) => {
    const candidates = pairs(members(from.id), members(to.id));
    const best = candidates.find(([a, b]) => isClear(a, b)) ?? candidates[0];
    if (best) connect(...best);
  };
  for (const pair of tree) bridge(pair);

  // One more district-to-district link, so the city isn't a pure tree.
  const inTree = (a: District, b: District) => tree.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const spare = pairs(districtList, districtList).filter(([a, b]) => a.id < b.id && !inTree(a, b));
  if (spare.length && rng.chance(0.75)) {
    for (const [a, b] of spare.slice(0, 2)) {
      const candidate = pairs(members(a.id), members(b.id)).find(([x, y]) => isClear(x, y));
      if (candidate) {
        connect(...candidate);
        break;
      }
    }
  }
}

/** Starts somewhere outdoors in a city district (never out in the Badlands). */
function chooseStart(rng: Rng, templates: DistrictTemplate[], locations: Record<string, Location>, content: CityContent): string {
  const city = templates.find((t) => t.placement !== 'edge') ?? templates[0];
  const options = Object.values(locations).filter((l) => l.district === city?.id);
  const outdoor = options.filter((l) => !content.kinds[l.kind]?.indoor);
  const start = rng.pick(outdoor.length ? outdoor : options);
  return start.id;
}

/** Prim's algorithm: the shortest set of links that joins every point. */
function spanningTree<T extends Point>(points: T[]): Array<[T, T]> {
  const [first, ...rest] = points;
  if (!first) return [];
  const inTree: T[] = [first];
  const remaining = [...rest];
  const result: Array<[T, T]> = [];
  while (remaining.length) {
    let best: [T, T, number] | null = null;
    for (const a of inTree) {
      for (const b of remaining) {
        const d = distance(a, b);
        if (!best || d < best[2]) best = [a, b, d];
      }
    }
    if (!best) break;
    result.push([best[0], best[1]]);
    inTree.push(best[1]);
    remaining.splice(remaining.indexOf(best[1]), 1);
  }
  return result;
}

/** Every pairing of an item from `a` with a different item from `b`, closest first. */
function pairs<T extends Point>(a: T[], b: T[]): Array<[T, T]> {
  const result: Array<[T, T]> = [];
  for (const x of a) for (const y of b) if (x !== y) result.push([x, y]);
  return result.sort((p, q) => distance(...p) - distance(...q));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sharesEnd(a: Point, b: Point, c: Point, d: Point): boolean {
  return a === c || a === d || b === c || b === d;
}

/** Whether segments ab and cd properly cross each other. */
export function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
