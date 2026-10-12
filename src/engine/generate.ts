import { generateBuildings, type BuildingContent, type ZoningPlan } from './buildings';
import { createRng, hashSeed, type Rng } from './rng';
import type { AmbientLine, BuildingKind, CityLayout, District, Location, Point, Side, Theme, Weather, World } from './types';

/** A real place from Night City. A district uses its own before it makes any up. */
export interface Landmark {
  name: string;
  /** Key of `CityContent.kinds`: what kind of place it is. */
  kind: string;
  /** Its first description sentence, in place of a generic one for its kind. */
  description: string;
}

/** A district that may appear in a generated city. */
export interface DistrictTemplate {
  id: string;
  name: string;
  theme: Theme;
  /** Roughly where it sits in the real Night City (0–100, north at the top). Each city moves it a little. */
  anchor: Point;
  /** One is picked per city and shared by the district's outdoor locations. */
  weather: Weather[];
  /** Neighborhood names used in place names, e.g. "{area} Market" → "Kabuki Market". */
  areas: string[];
  /** Kinds of location this district can contain (keys of `CityContent.kinds`). */
  kinds: string[];
  /** Real places in the district, used first. Made-up ones fill in once these run out. */
  landmarks?: Landmark[];
  /** What its blocks are built up with, as relative weights. */
  zoning: Partial<Record<BuildingKind, number>>;
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
  /** Which edge of the map is ocean. */
  coast: Side;
  welcome: string;
  districts: DistrictTemplate[];
  kinds: Record<string, LocationKind>;
  buildings: BuildingContent;
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
  const centers = placeDistricts(rng, templates);
  const coast = { side: content.coast, depth: Math.round(rng.range(7, 11) * 10) / 10 };
  const avenues = streetLines(rng);
  const streets = streetLines(rng);
  // Places keep well back from the shoreline, which wanders a couple of units either way.
  const corners = avenues
    .flatMap((x) => streets.map((y) => ({ x, y })))
    .filter((c) => isOnMap(c) && inland(coast.side, c) >= coast.depth + 5);

  const districts: Record<string, District> = {};
  const locations: Record<string, Location> = {};
  // Made-up names never borrow a real place's name, even one this city leaves out.
  const usedNames = new Set<string>();
  const realNames = new Set(content.districts.flatMap((d) => (d.landmarks ?? []).map((l) => l.name)));
  const populated: DistrictTemplate[] = [];

  for (const template of templates) {
    const center = centers.get(template.id) ?? { x: 50, y: 50 };
    const isEdge = template.placement === 'edge';
    const weather = rng.pick(template.weather);
    const count = isEdge ? rng.int(2, 3) : rng.int(3, 4);
    // Real places first; made-up ones only once the district runs out of them.
    const landmarks = rng.shuffle(template.landmarks ?? []).slice(0, count);
    // Made-up places lean toward kinds the real ones don't already cover.
    const fresh = template.kinds.filter((k) => !landmarks.some((l) => l.kind === k));
    const repeats = template.kinds.filter((k) => !fresh.includes(k));
    const madeUp = [...rng.shuffle(fresh), ...rng.shuffle(repeats)].slice(0, Math.max(0, Math.min(count, template.kinds.length) - landmarks.length));
    const plan = [...landmarks.map((landmark) => ({ kindId: landmark.kind, landmark })), ...madeUp.map((kindId) => ({ kindId, landmark: null }))];
    const spots = pickCorners(rng, corners, center, plan.length, isEdge ? 14 : 15, Object.values(locations));
    // A district with no free corners for any location is left off the map entirely.
    if (spots.length === 0) continue;
    populated.push(template);

    spots.forEach((spot, index) => {
      const { kindId, landmark } = plan[index] ?? { kindId: '', landmark: null };
      const kind = content.kinds[kindId];
      if (!kind) throw new Error(`District "${template.id}" uses unknown location kind "${kindId}"`);
      const id = `${template.id}-${index + 1}`;
      if (landmark) usedNames.add(landmark.name);
      locations[id] = {
        id,
        name: landmark ? landmark.name : makeName(rng, kind, template, usedNames, realNames),
        kind: kindId,
        kindLabel: kind.label,
        district: template.id,
        weather: kind.indoor ? (kind.weather ?? 'clear') : weather,
        ...(kind.theme ? { theme: kind.theme } : {}),
        description: makeDescription(rng, landmark?.description ?? rng.pick(kind.descriptions), kind, template),
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

  const start = chooseStart(rng, populated, locations, content);
  const layout: CityLayout = { avenues, streets, coast };
  const plans: Record<string, ZoningPlan> = Object.fromEntries(populated.map((t) => [t.id, { zoning: t.zoning, areas: t.areas }]));
  return {
    seed,
    start,
    welcome: content.welcome,
    layout,
    districts,
    locations,
    buildings: generateBuildings(seed, layout, Object.values(districts), plans, content.buildings),
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

/**
 * Each district sits roughly where it is in the real Night City, nudged a little each game.
 * An edge district slides further along its edge, so the desert isn't always in the same spot.
 */
function placeDistricts(rng: Rng, templates: DistrictTemplate[]): Map<string, Point> {
  const centers = new Map<string, Point>();
  for (const template of templates) {
    const edge = template.placement === 'edge';
    const dx = rng.range(-5, 5);
    const dy = edge ? rng.range(-18, 18) : rng.range(-5, 5);
    centers.set(template.id, { x: template.anchor.x + dx, y: template.anchor.y + dy });
  }
  return centers;
}

/** How far a point is from the given edge of the map. */
function inland(side: Side, p: Point): number {
  switch (side) {
    case 'north':
      return p.y;
    case 'east':
      return 100 - p.x;
    case 'south':
      return 100 - p.y;
    case 'west':
      return p.x;
  }
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

function fill(rng: Rng, template: string, district: DistrictTemplate): string {
  return template.replace(/\{area\}/g, () => rng.pick(district.areas)).replace(/\{n\}/g, () => String(rng.int(2, 14)));
}

function makeName(rng: Rng, kind: LocationKind, district: DistrictTemplate, used: Set<string>, reserved: Set<string>): string {
  for (let attempt = 0; attempt < 16; attempt++) {
    const name = fill(rng, rng.pick(kind.names), district);
    if (!used.has(name) && !reserved.has(name)) {
      used.add(name);
      return name;
    }
  }
  const base = fill(rng, kind.names[0] ?? 'Unnamed Block', district);
  let n = 2;
  while (used.has(`${base} ${n}`) || reserved.has(`${base} ${n}`)) n++;
  used.add(`${base} ${n}`);
  return `${base} ${n}`;
}

/** A sentence about the place, then one about the district's mood when it fits in the panel. */
function makeDescription(rng: Rng, first: string, kind: LocationKind, district: DistrictTemplate): string {
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
