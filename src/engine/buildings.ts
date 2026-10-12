import { districtAt, seaTest } from './geography';
import { createRng, type Rng } from './rng';
import type { Building, BuildingCategory, BuildingKind, CityLayout, District, Point } from './types';

/** What a kind of building is called and how tall it gets. */
export interface BuildingStyle {
  /** How players read it, e.g. "Apartment block". */
  label: string;
  /** What it's for. A storefront takes its business's category instead. */
  category: BuildingCategory;
  /** Inclusive range; [0, 0] for open ground. */
  floors: [number, number];
  /**
   * Name templates: `{area}` becomes a district neighborhood, `{corp}` a corporation,
   * `{shop}` the storefront's business and `{n}` a number.
   */
  names: string[];
}

/** A kind of business a storefront can run. */
export interface Business {
  id: string;
  /** As it reads on the sign, e.g. "Gun Shop". */
  sign: string;
  /** As players read it, e.g. "Gun shop". */
  label: string;
  category: BuildingCategory;
}

/** What players call each category, and what it covers. */
export interface CategoryInfo {
  label: string;
  /** Businesses players can buy from or sell to (and, later, run); the rest is the city around them. */
  business: boolean;
  /** For a business category, how common its storefronts are in a typical district (relative). */
  share: number;
  description: string;
}

/** A real Night City building. It takes over the building of its kind nearest its district's middle. */
export interface BuildingLandmark {
  district: string;
  kind: BuildingKind;
  name: string;
}

export interface BuildingContent {
  styles: Record<BuildingKind, BuildingStyle>;
  categories: Record<BuildingCategory, CategoryInfo>;
  corps: string[];
  businesses: Business[];
  landmarks?: BuildingLandmark[];
}

/**
 * What a district's blocks are zoned for, as relative weights, plus its neighborhood names.
 * `trade` leans its storefronts toward some categories of business (weight 1 if not listed).
 */
export interface ZoningPlan {
  zoning: Partial<Record<BuildingKind, number>>;
  trade?: Partial<Record<BuildingCategory, number>>;
  areas: string[];
}

/** Buildings stop this far (map units) from a street's centerline. */
export const STREET_HALF_WIDTH = 0.9;
/** Gap between buildings sharing a block. */
const ALLEY = 0.35;
/** Smallest building side worth placing, in map units. */
const MIN_SIDE = 1.1;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The grid cell a point falls in, between street centerlines, with its address (e.g. "D7"). */
export interface BlockCell {
  address: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Column letter and row number, counted from the top-left of the map. */
export function blockAddress(column: number, row: number): string {
  return `${String.fromCharCode(65 + column)}${row + 1}`;
}

/** The block a map point is in, or null off the map. */
export function blockAt(layout: CityLayout, p: Point): BlockCell | null {
  if (p.x < 0 || p.x > 100 || p.y < 0 || p.y > 100) return null;
  const xs = [0, ...layout.avenues, 100];
  const ys = [0, ...layout.streets, 100];
  const cell = (lines: number[], v: number) => {
    let k = 0;
    while (k < lines.length - 2 && (lines[k + 1] ?? 100) <= v) k++;
    return k;
  };
  const column = cell(xs, p.x);
  const row = cell(ys, p.y);
  return { address: blockAddress(column, row), x0: xs[column] ?? 0, y0: ys[row] ?? 0, x1: xs[column + 1] ?? 100, y1: ys[row + 1] ?? 100 };
}

/**
 * Fills every city block with buildings. Uses its own random stream, so adding buildings
 * never changes the rest of a seed's city.
 */
export function generateBuildings(
  seed: string,
  layout: CityLayout,
  districts: District[],
  plans: Record<string, ZoningPlan>,
  content: BuildingContent,
): Building[] {
  const rng = createRng(`${seed}:buildings`);
  const inSea = seaTest(layout, seed);
  const onLand = (r: Rect) =>
    [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x, y: r.y + r.h },
      { x: r.x + r.w, y: r.y + r.h },
    ].every((p) => !inSea(p));

  const xs = [0, ...layout.avenues, 100];
  const ys = [0, ...layout.streets, 100];
  const buildings: Building[] = [];
  const reserved = new Set((content.landmarks ?? []).map((l) => l.name));

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const left = i === 0 ? 0.6 : (xs[i] ?? 0) + STREET_HALF_WIDTH;
      const right = i === xs.length - 2 ? 99.4 : (xs[i + 1] ?? 100) - STREET_HALF_WIDTH;
      const top = j === 0 ? 0.6 : (ys[j] ?? 0) + STREET_HALF_WIDTH;
      const bottom = j === ys.length - 2 ? 99.4 : (ys[j + 1] ?? 100) - STREET_HALF_WIDTH;
      const block: Rect = { x: left, y: top, w: right - left, h: bottom - top };
      if (block.w < MIN_SIDE || block.h < MIN_SIDE) continue;

      const district = districtAt(districts, { x: block.x + block.w / 2, y: block.y + block.h / 2 });
      const plan = district ? plans[district.id] : undefined;
      if (!district || !plan) continue;

      const address = blockAddress(i, j);
      const pieces =
        district.terrain === 'desert' ? scatterStructures(rng, block) : subdivide(rng, block, weightedPick(rng, plan.zoning));

      pieces.forEach(({ rect: exact, kind: blockKind }, k) => {
        // Checked after rounding, so a building on the shore can't round its way into the sea.
        const rect = { x: round(exact.x), y: round(exact.y), w: round(exact.w), h: round(exact.h) };
        if (!onLand(rect)) return;
        // Apartment blocks have shops at street level now and then.
        const kind: BuildingKind = blockKind === 'apartments' && rng.chance(0.2) ? 'shops' : blockKind;
        const style = content.styles[kind];
        const { name, business } = makeName(rng, style, plan, content, reserved);
        buildings.push({
          id: `b-${address}-${k + 1}`,
          block: address,
          district: district.id,
          kind,
          kindLabel: business?.label ?? style.label,
          category: business?.category ?? style.category,
          business: business?.id ?? null,
          name,
          floors: rng.int(style.floors[0], style.floors[1]),
          ...rect,
        });
      });
    }
  }

  // Real landmarks stand at full height, near the middle of their district.
  for (const landmark of content.landmarks ?? []) {
    const district = districts.find((d) => d.id === landmark.district);
    if (!district) continue;
    const away = (b: Building) => Math.hypot(b.x + b.w / 2 - district.x, b.y + b.h / 2 - district.y);
    const candidates = buildings.filter((b) => b.district === landmark.district && b.kind === landmark.kind);
    const nearest = candidates.reduce<Building | null>((best, b) => (!best || away(b) < away(best) ? b : best), null);
    if (!nearest) continue;
    nearest.name = landmark.name;
    nearest.floors = content.styles[landmark.kind].floors[1];
  }
  return buildings;
}

/** Splits a block the way its zoning builds: one big footprint, a few towers, or a row of shops. */
function subdivide(rng: Rng, block: Rect, kind: BuildingKind): Array<{ rect: Rect; kind: BuildingKind }> {
  const as = (rects: Rect[]) => rects.map((rect) => ({ rect, kind }));
  switch (kind) {
    case 'megabuilding':
    case 'park':
    case 'plaza':
    case 'lot':
      return as([block]);
    case 'tower': {
      // Towers stand back from the street on a podium, when there's room for one.
      const towers = rng.chance(0.6) ? [block] : split(rng, block, 2);
      return as(towers.map((r) => (Math.min(r.w, r.h) >= 2.4 ? inset(r, Math.min(r.w, r.h) * 0.16) : r)));
    }
    case 'apartments':
      return as(split(rng, block, rng.int(2, 4)));
    case 'shops':
      return as(split(rng, block, rng.int(3, 6)));
    case 'warehouse':
    case 'factory':
      return as(split(rng, block, rng.int(1, 2)));
    case 'derelict':
      return as(split(rng, block, rng.int(1, 3)));
    case 'shack':
    case 'container':
      return as([block]);
  }
}

/** Desert blocks are mostly empty sand, with the odd shack or shipping container. */
function scatterStructures(rng: Rng, block: Rect): Array<{ rect: Rect; kind: BuildingKind }> {
  if (!rng.chance(0.35)) return [];
  const structures: Array<{ rect: Rect; kind: BuildingKind }> = [];
  for (let n = rng.int(1, 2); n > 0; n--) {
    const kind: BuildingKind = rng.chance(0.55) ? 'shack' : 'container';
    const w = kind === 'container' ? rng.range(1.4, 2.2) : rng.range(1.1, 1.8);
    const h = kind === 'container' ? rng.range(0.7, 1) : rng.range(1, 1.6);
    if (w > block.w - 0.4 || h > block.h - 0.4) continue;
    const rect = { x: block.x + rng.range(0.2, block.w - w - 0.2), y: block.y + rng.range(0.2, block.h - h - 0.2), w, h };
    if (structures.every((s) => !intersects(s.rect, rect, 0.3))) structures.push({ rect, kind });
  }
  return structures;
}

/** Cuts a rectangle into up to `count` pieces, always splitting the biggest along its long side. */
function split(rng: Rng, rect: Rect, count: number): Rect[] {
  const pieces = [rect];
  while (pieces.length < count) {
    pieces.sort((a, b) => b.w * b.h - a.w * a.h);
    const piece = pieces[0];
    if (!piece) break;
    const vertical = piece.w >= piece.h;
    const span = vertical ? piece.w : piece.h;
    if (span < MIN_SIDE * 2 + ALLEY) break;
    const at = span * rng.range(0.35, 0.65);
    pieces.shift();
    if (vertical) {
      pieces.push({ ...piece, w: at - ALLEY / 2 }, { ...piece, x: piece.x + at + ALLEY / 2, w: piece.w - at - ALLEY / 2 });
    } else {
      pieces.push({ ...piece, h: at - ALLEY / 2 }, { ...piece, y: piece.y + at + ALLEY / 2, h: piece.h - at - ALLEY / 2 });
    }
  }
  return pieces.filter((p) => p.w >= MIN_SIDE * 0.8 && p.h >= MIN_SIDE * 0.8).sort((a, b) => a.y - b.y || a.x - b.x);
}

function inset(rect: Rect, by: number): Rect {
  return { x: rect.x + by, y: rect.y + by, w: rect.w - by * 2, h: rect.h - by * 2 };
}

function intersects(a: Rect, b: Rect, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function weightedPick(rng: Rng, weights: Partial<Record<BuildingKind, number>>): BuildingKind {
  const entries = Object.entries(weights).filter((e): e is [BuildingKind, number] => (e[1] ?? 0) > 0);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [kind, weight] of entries) {
    roll -= weight;
    if (roll < 0) return kind;
  }
  return entries.at(-1)?.[0] ?? 'apartments';
}

/**
 * A made-up name from the style's templates, never one that belongs to a real landmark. A
 * storefront's `{shop}` also decides its business, leaning the way its district trades.
 * Each part of a name takes one draw, so what a storefront sells never moves a building.
 */
function makeName(
  rng: Rng,
  style: BuildingStyle,
  plan: ZoningPlan,
  content: BuildingContent,
  reserved: Set<string>,
): { name: string; business: Business | null } {
  let business: Business | null = null;
  const fill = () =>
    rng
      .pick(style.names)
      .replace(/\{area\}/g, () => rng.pick(plan.areas))
      .replace(/\{corp\}/g, () => rng.pick(content.corps))
      .replace(/\{shop\}/g, () => {
        business = pickBusiness(rng, content, plan.trade ?? {});
        return business.sign;
      })
      .replace(/\{n\}/g, () => String(rng.int(2, 99)));
  let name = fill();
  for (let attempt = 0; attempt < 8 && reserved.has(name); attempt++) name = fill();
  return { name: reserved.has(name) ? `${name} ${rng.int(2, 99)}` : name, business };
}

/**
 * A business for a storefront. Each category turns up as often as its share, leaned on by
 * what the district trades in, however many kinds of business it has. One draw.
 */
function pickBusiness(rng: Rng, content: BuildingContent, trade: Partial<Record<BuildingCategory, number>>): Business {
  const { businesses, categories } = content;
  const kinds = new Map<BuildingCategory, number>();
  for (const b of businesses) kinds.set(b.category, (kinds.get(b.category) ?? 0) + 1);
  const weight = (b: Business) => (categories[b.category].share * (trade[b.category] ?? 1)) / (kinds.get(b.category) ?? 1);
  const total = businesses.reduce((sum, b) => sum + weight(b), 0);
  let roll = rng.next() * total;
  for (const b of businesses) {
    roll -= weight(b);
    if (roll < 0) return b;
  }
  const last = businesses.at(-1);
  if (!last) throw new Error('No businesses to open a storefront with');
  return last;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
