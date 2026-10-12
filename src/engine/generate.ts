import { createRng, hashSeed, type Rng } from './rng';
import type { AmbientLine, CityLayout, District, Location, Point, Side, Theme, Weather, World } from './types';

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
  /** "edge" districts sit at the border of the map as open desert, like the Badlands. */
  placement?: 'edge';
  /** Second sentences for descriptions, setting the district's mood. */
  atmosphere: { outdoor: string[]; indoor: string[] };
  ambient: { outdoor: AmbientLine[]; indoor: AmbientLine[] };
}

/** A kind of place, e.g. a bar or a night market. */
export interface LocationKind {
  /** How players read it, e.g. "Night market". */
  label: string;
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
  welcome: string;
  districts: DistrictTemplate[];
  kinds: Record<string, LocationKind>;
}

/** Longest description the location panel is designed for (raw text, markup included). */
export const MAX_DESCRIPTION = 160;

/** Locations stay this far inside the map edge. */
const MAP_MIN = 7;
const MAP_MAX = 93;

/** Builds a whole city from a seed. Same seed and content, same city. */
export function generateWorld(seed: string, content: CityContent): World {
  const rng = createRng(seed);
  const templates = chooseDistricts(rng, content.districts);
  const edgeSide: Side = rng.pick(['north', 'east', 'south', 'west'] as const);
  const centers = placeDistricts(rng, templates, edgeSide);
  const avenues = streetLines(rng);
  const streets = streetLines(rng);
  const corners = avenues.flatMap((x) => streets.map((y) => ({ x, y }))).filter(isOnMap);

  const districts: Record<string, District> = {};
  const locations: Record<string, Location> = {};
  const usedNames = new Set<string>();
  const populated: DistrictTemplate[] = [];

  for (const template of templates) {
    const center = centers.get(template.id) ?? { x: 50, y: 50 };
    const isEdge = template.placement === 'edge';
    const weather = rng.pick(template.weather);
    const count = isEdge ? rng.int(2, 3) : rng.int(3, 4);
    const kinds = rng.shuffle(template.kinds).slice(0, Math.min(count, template.kinds.length));
    const spots = pickCorners(rng, corners, center, kinds.length, isEdge ? 14 : 15, Object.values(locations));
    // A district with no free corners for any location is left off the map entirely.
    if (spots.length === 0) continue;
    populated.push(template);

    spots.forEach((spot, index) => {
      const kindId = kinds[index] ?? '';
      const kind = content.kinds[kindId];
      if (!kind) throw new Error(`District "${template.id}" lists unknown location kind "${kindId}"`);
      const id = `${template.id}-${index + 1}`;
      locations[id] = {
        id,
        name: makeName(rng, kind, template, usedNames),
        kind: kindId,
        kindLabel: kind.label,
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

    // The district's center is where its places actually ended up.
    districts[template.id] = {
      id: template.id,
      name: template.name,
      theme: template.theme,
      terrain: isEdge ? 'desert' : 'city',
      ...centroid(spots),
    };
  }

  linkLocations(rng, populated, districts, locations);

  const hasEdge = populated.some((t) => t.placement === 'edge');
  return {
    seed,
    start: chooseStart(rng, populated, locations, content),
    welcome: content.welcome,
    layout: { avenues, streets, coast: chooseCoast(rng, Object.values(locations), hasEdge ? edgeSide : null) },
    districts,
    locations,
  };
}

/**
 * The route between two places along the street grid: straight when they share a street,
 * otherwise one turn at a corner. The same pair always takes the same corner.
 */
export function streetPath(a: Location, b: Location): Point[] {
  if (a.x === b.x || a.y === b.y) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  const [p, q] = a.id < b.id ? [a, b] : [b, a];
  const corner = hashSeed(p.id + q.id) & 1 ? { x: p.x, y: q.y } : { x: q.x, y: p.y };
  return [{ x: a.x, y: a.y }, corner, { x: b.x, y: b.y }];
}

/** Three or four city districts, plus usually one edge district. */
function chooseDistricts(rng: Rng, pool: DistrictTemplate[]): DistrictTemplate[] {
  const city = rng.shuffle(pool.filter((d) => d.placement !== 'edge'));
  const edge = pool.filter((d) => d.placement === 'edge');
  const chosen = city.slice(0, Math.min(city.length, rng.int(3, 4)));
  if (edge.length && rng.chance(0.7)) chosen.push(rng.pick(edge));
  return chosen;
}

function placeDistricts(rng: Rng, templates: DistrictTemplate[], edgeSide: Side): Map<string, Point> {
  const centers = new Map<string, Point>();

  for (const template of templates.filter((t) => t.placement === 'edge')) {
    const along = rng.range(25, 75);
    const point = { north: { x: along, y: 14 }, east: { x: 86, y: along }, south: { x: along, y: 86 }, west: { x: 14, y: along } }[edgeSide];
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

/** Street positions across the map, a short city block apart. */
function streetLines(rng: Rng): number[] {
  const lines: number[] = [];
  for (let at = rng.range(3, 6); at < 97; at += rng.range(6.5, 9.5)) lines.push(Math.round(at * 10) / 10);
  return lines;
}

function isOnMap(p: Point): boolean {
  return p.x >= MAP_MIN && p.x <= MAP_MAX && p.y >= MAP_MIN && p.y <= MAP_MAX;
}

/** Up to `count` street corners near a district center, keeping clear of every other location. */
function pickCorners(rng: Rng, corners: Point[], center: Point, count: number, radius: number, existing: Point[]): Point[] {
  const nearby = rng.shuffle(corners.filter((c) => distance(c, center) <= radius));
  const picked: Point[] = [];
  // Prefer roomy spacing; loosen it if the district would otherwise be nearly empty.
  for (const minGap of [11, 8.5]) {
    for (const corner of nearby) {
      if (picked.length >= count) break;
      if ([...existing, ...picked].every((other) => distance(other, corner) >= minGap)) picked.push(corner);
    }
    if (picked.length >= 2) break;
  }
  return picked;
}

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

/** Night City is on the coast: the sea fills one edge, never the desert's, without reaching any location. */
function chooseCoast(rng: Rng, locations: Location[], desertSide: Side | null): CityLayout['coast'] {
  const reach: Record<Side, (p: Point) => number> = {
    north: (p) => p.y,
    east: (p) => 100 - p.x,
    south: (p) => 100 - p.y,
    west: (p) => p.x,
  };
  const sides = (['north', 'east', 'south', 'west'] as const).filter((s) => s !== desertSide);
  const side = rng.pick(sides);
  const closest = Math.min(...locations.map(reach[side]));
  const depth = closest - rng.range(5, 8);
  return depth >= 4 ? { side, depth: Math.round(depth * 10) / 10 } : null;
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

/** A sentence about the place, then one about the district's mood when it fits in the panel. */
function makeDescription(rng: Rng, kind: LocationKind, district: DistrictTemplate): string {
  const first = rng.pick(kind.descriptions);
  const moods = rng.shuffle(kind.indoor ? district.atmosphere.indoor : district.atmosphere.outdoor);
  const second = moods.find((mood) => first.length + 1 + mood.length <= MAX_DESCRIPTION);
  return second ? `${first} ${second}` : first;
}

/**
 * Routes: a minimum spanning tree inside each district, the shortest link between neighboring
 * districts, and a few extra links so the city has loops.
 */
function linkLocations(
  rng: Rng,
  templates: DistrictTemplate[],
  districts: Record<string, District>,
  locations: Record<string, Location>,
): void {
  const all = Object.values(locations);
  const connect = (a: Location, b: Location) => {
    if (a.links.includes(b.id)) return;
    a.links.push(b.id);
    b.links.push(a.id);
  };
  const members = (districtId: string) => all.filter((l) => l.district === districtId);

  for (const template of templates) {
    const group = members(template.id);
    for (const [a, b] of spanningTree(group)) connect(a, b);
    if (group.length >= 3 && rng.chance(0.5)) {
      const extra = pairs(group, group).find(([a, b]) => !a.links.includes(b.id));
      if (extra) connect(...extra);
    }
  }

  const districtList = templates.map((t) => districts[t.id]).filter((d): d is District => Boolean(d));
  const tree = spanningTree(districtList);
  for (const [from, to] of tree) {
    const closest = pairs(members(from.id), members(to.id))[0];
    if (closest) connect(...closest);
  }

  // One more district-to-district link, so the city isn't a pure tree.
  const inTree = (a: District, b: District) => tree.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const spare = pairs(districtList, districtList).find(([a, b]) => a.id < b.id && !inTree(a, b));
  if (spare && rng.chance(0.75)) {
    const closest = pairs(members(spare[0].id), members(spare[1].id))[0];
    if (closest) connect(...closest);
  }
}

/** Starts somewhere outdoors in a city district (never out in the desert). */
function chooseStart(rng: Rng, templates: DistrictTemplate[], locations: Record<string, Location>, content: CityContent): string {
  const city = templates.find((t) => t.placement !== 'edge') ?? templates[0];
  const options = Object.values(locations).filter((l) => l.district === city?.id);
  const outdoor = options.filter((l) => !content.kinds[l.kind]?.indoor);
  return rng.pick(outdoor.length ? outdoor : options).id;
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
