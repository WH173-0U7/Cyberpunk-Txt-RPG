import { generateBuildings, type BuildingContent, type ZoningPlan } from './buildings';
import type { Quality } from './food';
import { WORLD } from './geography';
import { createRng, hashSeed, type Rng } from './rng';
import { generateTransit, type TransitContent } from './transit';
import type { AmbientLine, BuildingCategory, BuildingKind, CityLayout, District, Location, Point, Side, Subdistrict, Theme, Weather, World } from './types';

/** A real place from Night City. A district uses its own before it makes any up. */
export interface Landmark {
  name: string;
  /** The neighborhood it's in (one of its district's `areas`). Anywhere in the district if not said. */
  area?: string;
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
  /** Its neighborhoods (the wiki's sub-districts), also used in place names: "{area} Market" → "Kabuki Market". */
  areas: string[];
  /**
   * Where each neighborhood sits from the anchor, on the same 0–100 scale. Every neighborhood
   * listed here gets places of its own; a district without any is one neighborhood at its anchor.
   */
  areaAt?: Record<string, Point>;
  /** Kinds of location this district can contain (keys of `CityContent.kinds`). */
  kinds: string[];
  /** Real places in the district, used first. Made-up ones fill in once these run out. */
  landmarks?: Landmark[];
  /** What its blocks are built up with, as relative weights. */
  zoning: Partial<Record<BuildingKind, number>>;
  /** Which categories of business its storefronts lean toward (1 if not listed). */
  trade?: Partial<Record<BuildingCategory, number>>;
  /** How its eateries lean: luxury, everyday or poverty, as relative weights. Everyday if not said. */
  dining?: Partial<Record<Quality, number>>;
  /** "edge" districts are open desert around the city, like the Badlands. */
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
  welcomeBack: string;
  /** The real NCART's lines and stations. */
  ncart: TransitContent;
  districts: DistrictTemplate[];
  kinds: Record<string, LocationKind>;
  buildings: BuildingContent;
}

/**
 * Saves only remember a seed and location ids, so they rely on a seed always building the same
 * places. Bump this whenever a change means seeds build different places (new content counts,
 * since it shifts the random choices); older saves then start their city over instead of
 * landing somewhere that no longer matches. The fingerprint test in tests/save.test.ts fails
 * as a reminder.
 */
export const GENERATOR_VERSION = 4;

/** Longest description the location panel is designed for (raw text, markup included). */
export const MAX_DESCRIPTION = 160;

/** The longest made-up place name that fits the sign on a narrow phone at a readable size. */
export const SHORT_NAME = 24;

/** Map units to one unit of the 0–100 scale the districts' anchors are on. */
const CANON = WORLD / 100;

/** Locations stay this far inside the map edge. */
const MAP_MIN = 7;
const MAP_MAX = WORLD - 7;

/** A neighborhood as placed on this map: where it is, and which district it belongs to. */
interface Hood extends Point {
  /** Null for a district with no neighborhoods of its own. */
  name: string | null;
  district: string;
}

/**
 * Builds a whole city from a seed. Same seed and content, same city. Every district is in it,
 * each neighborhood about where it is in the real Night City, with places of its own.
 */
export function generateWorld(seed: string, content: CityContent): World {
  const rng = createRng(seed);
  // City districts first (the first is where the player starts), then the desert around them.
  const templates = [...rng.shuffle(content.districts.filter((d) => d.placement !== 'edge')), ...content.districts.filter((d) => d.placement === 'edge')];
  const hoods = placeHoods(rng, templates);
  // The sea comes in far enough that the waterfront districts (Watson's, Pacifica, Wellsprings) are on it.
  const coast = { side: content.coast, depth: Math.round(rng.range(11, 14) * CANON * 10) / 10 };
  const avenues = streetLines(rng);
  const streets = streetLines(rng);
  // Places keep well back from the shoreline, which wanders a couple of units either way.
  const corners = avenues
    .flatMap((x) => streets.map((y) => ({ x, y })))
    .filter((c) => isOnMap(c) && inland(coast.side, c) >= coast.depth + 5);
  // Each corner belongs to the neighborhood nearest it, so a place is always in its own.
  const cornersOf = new Map<Hood, Point[]>();
  for (const corner of corners) {
    const hood = nearest(hoods, corner);
    if (hood) cornersOf.set(hood, [...(cornersOf.get(hood) ?? []), corner]);
  }

  const districts: Record<string, District> = {};
  const locations: Record<string, Location> = {};
  // Made-up names never borrow a real place's name, even one this city leaves out.
  const usedNames = new Set<string>();
  const realNames = new Set(content.districts.flatMap((d) => (d.landmarks ?? []).map((l) => l.name)));
  const populated: DistrictTemplate[] = [];

  // What each neighborhood will have: its real places first, made-up ones once it runs out.
  const allotments = templates.flatMap((template) => {
    const isEdge = template.placement === 'edge';
    const own = hoods.filter((h) => h.district === template.id);
    // Real places with no neighborhood can go in any of the district's.
    const anywhere = rng.shuffle((template.landmarks ?? []).filter((l) => !l.area || !own.some((h) => h.name === l.area)));
    const covered = new Set<string>();
    return own.map((hood) => {
      const count = isEdge ? rng.int(1, 2) : rng.int(2, 3);
      const landmarks = [...rng.shuffle((template.landmarks ?? []).filter((l) => l.area !== undefined && l.area === hood.name)), ...anywhere].slice(0, count);
      for (const landmark of landmarks) if (anywhere.includes(landmark)) anywhere.splice(anywhere.indexOf(landmark), 1);
      // Made-up places lean toward kinds the district doesn't already have.
      const fresh = template.kinds.filter((k) => !covered.has(k) && !landmarks.some((l) => l.kind === k));
      const repeats = template.kinds.filter((k) => !fresh.includes(k));
      const madeUp = [...rng.shuffle(fresh), ...rng.shuffle(repeats)].slice(0, Math.max(0, count - landmarks.length));
      const planned = [...landmarks.map((landmark) => ({ kindId: landmark.kind, landmark })), ...madeUp.map((kindId) => ({ kindId, landmark: null }))];
      for (const { kindId } of planned) covered.add(kindId);
      const radius = (isEdge ? 18 : 10) * CANON;
      return { template, hood, planned, radius, picked: [] as Array<Point & { kindId: string; landmark: Landmark | null }> };
    });
  });
  // Corners are handed out a round at a time, a place per neighborhood each round, so no
  // neighborhood is crowded out by the ones placed before it.
  const placed: Point[] = [];
  for (let round = 0; allotments.some((a) => a.planned.length > round); round++) {
    for (const allotment of allotments) {
      const next = allotment.planned[round];
      if (!next) continue;
      const [corner] = pickCorners(rng, cornersOf.get(allotment.hood) ?? [], allotment.hood, 1, allotment.radius, placed);
      if (!corner) continue;
      placed.push(corner);
      allotment.picked.push({ ...corner, ...next });
    }
  }

  for (const template of templates) {
    const isEdge = template.placement === 'edge';
    const weather = rng.pick(template.weather);
    const own = allotments.filter((a) => a.template === template);
    const spots = own.flatMap((a) => a.picked.map((spot) => ({ ...spot, area: a.hood.name })));
    // A district with no free corners for any location is left off the map entirely.
    if (spots.length === 0) continue;
    populated.push(template);

    spots.forEach(({ kindId, landmark, area, ...spot }, index) => {
      const kind = content.kinds[kindId];
      if (!kind) throw new Error(`District "${template.id}" uses unknown location kind "${kindId}"`);
      const id = `${template.id}-${index + 1}`;
      if (landmark) usedNames.add(landmark.name);
      locations[id] = {
        id,
        name: landmark ? landmark.name : makeName(rng, kind, template, area, usedNames, realNames),
        kind: kindId,
        kindLabel: kind.label,
        district: template.id,
        ...(area ? { area } : {}),
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
      weather,
      // Its own random stream, so the street mood never shifts the rest of the city.
      mood: createRng(`${seed}:${template.id}:streets`).pick(template.atmosphere.outdoor),
      ambient: template.ambient.outdoor,
      dining: template.dining ?? { everyday: 1 },
      subdistricts: own.flatMap(({ hood }): Subdistrict[] => (hood.name ? [{ name: hood.name, x: hood.x, y: hood.y }] : [])),
      ...centroid(spots),
    };
  }

  linkLocations(rng, populated, districts, locations);

  const start = chooseStart(rng, populated, locations, content);
  const layout: CityLayout = { avenues, streets, coast };
  const plans: Record<string, ZoningPlan> = Object.fromEntries(populated.map((t) => [t.id, { district: t.id, zoning: t.zoning, trade: t.trade, areas: t.areas }]));
  const areas = Object.fromEntries(populated.map((t) => [t.id, t.areas]));
  return {
    seed,
    start,
    welcome: content.welcome,
    welcomeBack: content.welcomeBack,
    layout,
    districts,
    locations,
    buildings: generateBuildings(seed, layout, Object.values(districts), plans, content.buildings),
    transit: generateTransit(seed, layout, Object.values(districts), Object.values(locations), areas, content.ncart),
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

/**
 * Each neighborhood sits roughly where it is in the real Night City: its district is nudged a
 * little each game, and each neighborhood a little more within it. All stay on the map.
 */
function placeHoods(rng: Rng, templates: DistrictTemplate[]): Hood[] {
  const hoods: Hood[] = [];
  const onMap = (v: number) => Math.min(MAP_MAX, Math.max(MAP_MIN, v));
  for (const template of templates) {
    const anchor = { x: template.anchor.x + rng.range(-2, 2), y: template.anchor.y + rng.range(-2, 2) };
    const offsets = template.areas.flatMap((name) => {
      const at = template.areaAt?.[name];
      return at ? [{ name, at }] : [];
    });
    if (offsets.length === 0) hoods.push({ name: null, district: template.id, x: onMap(anchor.x * CANON), y: onMap(anchor.y * CANON) });
    for (const { name, at } of offsets) {
      const x = (anchor.x + at.x + rng.range(-1.5, 1.5)) * CANON;
      const y = (anchor.y + at.y + rng.range(-1.5, 1.5)) * CANON;
      hoods.push({ name, district: template.id, x: onMap(x), y: onMap(y) });
    }
  }
  return hoods;
}

function nearest<T extends Point>(points: T[], p: Point): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const point of points) {
    const d = distance(point, p);
    if (d < bestDistance) {
      best = point;
      bestDistance = d;
    }
  }
  return best;
}

/** How far a point is from the given edge of the map. */
function inland(side: Side, p: Point): number {
  switch (side) {
    case 'north':
      return p.y;
    case 'east':
      return WORLD - p.x;
    case 'south':
      return WORLD - p.y;
    case 'west':
      return p.x;
  }
}

/** Street positions across the map, a short city block apart. */
function streetLines(rng: Rng): number[] {
  const lines: number[] = [];
  for (let at = rng.range(3, 6); at < WORLD - 3; at += rng.range(6.5, 9.5)) lines.push(Math.round(at * 10) / 10);
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
    if (picked.length >= Math.min(2, count)) break;
  }
  return picked;
}

function centroid(points: Point[]): Point {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

/** A name template filled in: `{area}` is the place's own neighborhood (any of the district's without one). */
function fill(rng: Rng, template: string, district: DistrictTemplate, area: string | null): string {
  return template.replace(/\{area\}/g, () => area ?? rng.pick(district.areas)).replace(/\{n\}/g, () => String(rng.int(2, 14)));
}

/**
 * A made-up name for a place, never one already taken or a real place's. A long neighborhood
 * makes long names ("Arasaka Waterfront Container Yard"), so one that fits the sign on a phone
 * (`SHORT_NAME`) is taken over a longer one when the kind has it.
 */
function makeName(rng: Rng, kind: LocationKind, district: DistrictTemplate, area: string | null, used: Set<string>, reserved: Set<string>): string {
  let long: string | null = null;
  for (let attempt = 0; attempt < 16; attempt++) {
    const name = fill(rng, rng.pick(kind.names), district, area);
    if (used.has(name) || reserved.has(name)) continue;
    if (name.length <= SHORT_NAME) {
      used.add(name);
      return name;
    }
    long ??= name;
  }
  if (long) {
    used.add(long);
    return long;
  }
  const base = fill(rng, kind.names[0] ?? 'Unnamed Block', district, area);
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
    // A loop or two, more in a bigger district, so it isn't a pure tree.
    for (let loops = rng.int(0, Math.floor(group.length / 3)); loops > 0; loops--) {
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

  // A couple more district-to-district links, so the city isn't a pure tree.
  const inTree = (a: District, b: District) => tree.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const spares = pairs(districtList, districtList).filter(([a, b]) => a.id < b.id && !inTree(a, b));
  for (const spare of spares.slice(0, 2)) {
    if (!rng.chance(0.75)) continue;
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
