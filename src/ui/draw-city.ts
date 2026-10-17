import { districtAt, fromCoastFrame, shoreline, WORLD } from '../engine/geography';
import { createRng, hashSeed } from '../engine/rng';
import type { Building, CityLayout, District, Point, World } from '../engine/types';

export type Px = { x: number; y: number };

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How the city is placed on screen. */
export interface View {
  width: number;
  height: number;
  /** Screen pixels per map unit. */
  scale: number;
  /** Skip glows, for frames drawn while the map is moving. */
  fast: boolean;
  project(p: Point): Px;
}

/** Where a building ended up on screen, for tapping: its footprint, which is all of it, seen from straight above. */
export interface BuildingHit {
  id: string;
  footprint: Box;
}

const ASPHALT = '#06070d';
const PAVEMENT = '#0a0d17';
const SEA = '#040914';
const ROOF = '#111628';
const NEONS = ['#ff2bd6', '#00f0ff', '#39ff88', '#ffd84d', '#ff3b3b', '#a46bff'];

/** How bright a roof's tint is by how tall the building stands, so height still reads from straight above. */
const TINT_LOW = 0.08;
const TINT_TALL = 0.2;
/** Floors from which a building counts as a high-rise (the towers and the megabuildings): a second neon frame inside its edge. */
const TALL = 40;

/**
 * Draws the ground, the sea and every building onto the canvas, seen from straight above:
 * every building is its roof on its own footprint, so none hides what's behind it. Kept
 * simple: dark roofs tinted and edged in the district's neon, brighter the taller they stand,
 * a sign on a storefront and a warning light on a tower. Returns where each building is, for
 * tapping.
 */
export function drawCity(ctx: CanvasRenderingContext2D, world: World, view: View, knownDistricts: Set<string>): BuildingHit[] {
  ctx.fillStyle = ASPHALT;
  ctx.fillRect(0, 0, view.width, view.height);

  drawBlocks(ctx, world, view, knownDistricts);
  drawStreets(ctx, world.layout, view);
  if (world.layout.coast) drawSea(ctx, world.layout.coast, world.seed, view);
  return drawBuildings(ctx, world, view, knownDistricts);
}

/** The building under a screen point. A near miss still counts on small buildings. */
export function buildingAt(hits: BuildingHit[], q: Px): string | null {
  for (const slop of [0, 6]) {
    for (const hit of hits) if (covers(hit.footprint, q, slop)) return hit.id;
  }
  return null;
}

/** The picked building's outline, as SVG path data: its footprint. */
export function selectionOutline(hit: BuildingHit): string {
  const r = hit.footprint;
  return `M${r.x.toFixed(1)} ${r.y.toFixed(1)}H${(r.x + r.w).toFixed(1)}V${(r.y + r.h).toFixed(1)}H${r.x.toFixed(1)}Z`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * `hexToRgba` for the colors a frame asks for over and over (hundreds of buildings in a few
 * district colors and shades): made once each. Kept small, as fades ask for endless shades.
 */
const rgbaMade = new Map<string, Map<number, string>>();
function rgba(hex: string, alpha: number): string {
  let shades = rgbaMade.get(hex);
  if (!shades) rgbaMade.set(hex, (shades = new Map()));
  let made = shades.get(alpha);
  if (made === undefined) {
    if (shades.size > 64) shades.clear();
    shades.set(alpha, (made = hexToRgba(hex, alpha)));
  }
  return made;
}

/** Each building's own roof shade, worked out once. */
const roofShades = new WeakMap<Building, string>();
function roofShade(b: Building): string {
  let shade = roofShades.get(b);
  if (shade === undefined) {
    // No two roofs quite the same shade.
    const v = hash01(hashSeed(b.id), 2, 3);
    roofShades.set(b, (shade = v < 0.5 ? `rgba(0, 0, 0, ${(0.5 - v) * 0.2})` : `rgba(255, 255, 255, ${(v - 0.5) * 0.05})`));
  }
  return shade;
}

/** Sizes a canvas to the stage at a pixel density, leaving it alone if it already fits. */
export function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): void {
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

// ───────────── Ground ─────────────

/** Pavement under every city block; in the desert, open sand that runs across the streets. */
/** Which district each block belongs to, worked out once a city rather than every frame. */
const blockDistricts = new WeakMap<World, Array<District | null>>();
function districtsOfBlocks(world: World): Array<District | null> {
  let known = blockDistricts.get(world);
  if (known) return known;
  const districts = Object.values(world.districts);
  const xs = [0, ...world.layout.avenues, WORLD];
  const ys = [0, ...world.layout.streets, WORLD];
  known = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) known.push(districtAt(districts, { x: ((xs[i] ?? 0) + (xs[i + 1] ?? WORLD)) / 2, y: ((ys[j] ?? 0) + (ys[j + 1] ?? WORLD)) / 2 }));
  }
  blockDistricts.set(world, known);
  return known;
}

function drawBlocks(ctx: CanvasRenderingContext2D, world: World, view: View, known: Set<string>): void {
  const byBlock = districtsOfBlocks(world);
  const xs = [0, ...world.layout.avenues, WORLD];
  const ys = [0, ...world.layout.streets, WORLD];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] ?? 0;
      const x1 = xs[i + 1] ?? WORLD;
      const y0 = ys[j] ?? 0;
      const y1 = ys[j + 1] ?? WORLD;
      const district = byBlock[i * (ys.length - 1) + j];
      if (!district) continue;
      const lit = known.has(district.id);

      if (district.terrain === 'desert') {
        const a = view.project({ x: x0, y: y0 });
        const b = view.project({ x: x1, y: y1 });
        const cell = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
        if (!onScreen(cell, view)) continue;
        ctx.fillStyle = `rgba(255, 158, 61, ${lit ? 0.06 : 0.025})`;
        ctx.fillRect(cell.x, cell.y, cell.w + 0.5, cell.h + 0.5);
        continue;
      }

      // Sidewalks stop half a lane short of each street's centerline.
      const a = view.project({ x: i === 0 ? 0.2 : x0 + 0.55, y: j === 0 ? 0.2 : y0 + 0.55 });
      const b = view.project({ x: i === xs.length - 2 ? WORLD - 0.2 : x1 - 0.55, y: j === ys.length - 2 ? WORLD - 0.2 : y1 - 0.55 });
      const pad = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      if (pad.w <= 0 || pad.h <= 0 || !onScreen(pad, view)) continue;
      ctx.fillStyle = PAVEMENT;
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      if (lit) {
        ctx.fillStyle = rgba(district.theme.primary, 0.025);
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      }
    }
  }
}

/** Main roads glow faintly. */
function drawStreets(ctx: CanvasRenderingContext2D, layout: CityLayout, view: View): void {
  const vertical = (x: number) => {
    const p = view.project({ x, y: 0 });
    ctx.moveTo(p.x, 0);
    ctx.lineTo(p.x, view.height);
  };
  const horizontal = (y: number) => {
    const p = view.project({ x: 0, y });
    ctx.moveTo(0, p.y);
    ctx.lineTo(view.width, p.y);
  };

  ctx.lineWidth = Math.max(1.5, view.scale * 0.5);
  ctx.strokeStyle = 'rgba(150, 170, 220, 0.07)';
  ctx.beginPath();
  layout.avenues.forEach((x, i) => i % 3 === 1 && vertical(x));
  layout.streets.forEach((y, i) => i % 3 === 1 && horizontal(y));
  ctx.stroke();
}

/** Water from the map edge to a wavy shoreline, with one swell line off it. */
function drawSea(ctx: CanvasRenderingContext2D, coast: NonNullable<CityLayout['coast']>, seed: string, view: View): void {
  const shore = shoreline(coast, seed);
  // Stretch well past the frame so the water reaches the canvas edge at any zoom.
  const line = (offset: number) => {
    const points: Px[] = [];
    for (let t = -40; t <= WORLD + 40; t += 1.5) points.push(view.project(fromCoastFrame(coast.side, t, shore(t) - offset)));
    return points;
  };
  const trace = (points: Px[]) => points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));

  const coastline = line(0);
  ctx.beginPath();
  trace([...coastline, view.project(fromCoastFrame(coast.side, WORLD + 40, -60)), view.project(fromCoastFrame(coast.side, -40, -60))]);
  ctx.closePath();
  ctx.fillStyle = SEA;
  ctx.fill();
  ctx.fillStyle = 'rgba(60, 110, 255, 0.07)';
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(90, 150, 255, 0.5)';
  ctx.beginPath();
  trace(coastline);
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  for (const [offset, alpha] of [[1.6, 0.18]] as const) {
    if (offset >= coast.depth) continue;
    ctx.strokeStyle = `rgba(90, 150, 255, ${alpha})`;
    ctx.beginPath();
    trace(line(offset));
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// ───────────── Buildings ─────────────

function drawBuildings(ctx: CanvasRenderingContext2D, world: World, view: View, known: Set<string>): BuildingHit[] {
  const hits: BuildingHit[] = [];
  for (const b of world.buildings) {
    const r = footprint(b, view);
    if (!onScreen(r, view)) continue;
    const district = world.districts[b.district];
    const lit = known.has(b.district);
    if (b.floors === 0) drawOpenGround(ctx, b, r, district, lit);
    else drawRoof(ctx, b, r, view, district, lit);
    hits.push({ id: b.id, footprint: r });
  }
  return hits;
}

function footprint(b: Building, view: View): Box {
  const a = view.project({ x: b.x, y: b.y });
  const c = view.project({ x: b.x + b.w, y: b.y + b.h });
  return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
}

function onScreen(b: Box, view: View): boolean {
  return b.x + b.w >= -4 && b.y + b.h >= -4 && b.x <= view.width + 4 && b.y <= view.height + 4;
}

/** Whether a point is on a footprint, or within `slop` of it. */
function covers(r: Box, q: Px, slop: number): boolean {
  return q.x >= r.x - slop && q.x <= r.x + r.w + slop && q.y >= r.y - slop && q.y <= r.y + r.h + slop;
}

/** Parks, plazas and parking lots: open ground, flat. */
function drawOpenGround(ctx: CanvasRenderingContext2D, b: Building, r: Box, district: District | undefined, lit: boolean): void {
  switch (b.kind) {
    case 'park':
      ctx.fillStyle = `rgba(57, 255, 136, ${lit ? 0.08 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = `rgba(57, 255, 136, ${lit ? 0.25 : 0.08})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      break;
    case 'plaza':
      // Open paving around a glowing holo-statue.
      ctx.fillStyle = `rgba(200, 210, 240, ${lit ? 0.07 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = rgba(district?.theme.secondary ?? '#5ce1ff', lit ? 0.6 : 0.2);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default:
      // Parking lot.
      ctx.fillStyle = `rgba(120, 130, 160, ${lit ? 0.07 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
  }
}

/**
 * A building's roof, seen from straight above: dark, tinted in the district's color the more
 * the taller it stands, edged in its neon (a second frame inside for anything tall); a
 * storefront's sign along its street edge, a tower's warning light.
 */
function drawRoof(ctx: CanvasRenderingContext2D, b: Building, r: Box, view: View, district: District | undefined, lit: boolean): void {
  const color = district?.theme.primary ?? '#00f0ff';
  const tint = lit ? 1 : 0.35;
  const derelict = b.kind === 'derelict';
  const dim = derelict || b.kind === 'shack' || b.kind === 'warehouse' || b.kind === 'factory' || b.kind === 'container';
  const height = Math.min(1, Math.sqrt(b.floors / 60));
  ctx.fillStyle = ROOF;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = rgba(color, (derelict ? 0.03 : TINT_LOW + (TINT_TALL - TINT_LOW) * height) * tint);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = roofShade(b);
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = rgba(color, (derelict ? 0.15 : dim ? 0.3 : 0.55) * tint);
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  const small = Math.min(r.w, r.h);
  if (b.floors >= TALL && small >= 10) {
    const inset = Math.max(2.5, small * 0.14);
    ctx.strokeStyle = rgba(color, 0.35 * tint);
    ctx.strokeRect(r.x + inset + 0.5, r.y + inset + 0.5, r.w - inset * 2 - 1, r.h - inset * 2 - 1);
  }
  if (b.kind === 'shops' && small >= 5) {
    // The sign, along the edge on the street.
    const neon = neonOf(b, district);
    ctx.strokeStyle = rgba(neon, 0.9 * tint);
    ctx.lineWidth = Math.max(1.5, Math.min(3, view.scale * 0.12));
    glow(ctx, neon, lit && !view.fast ? 6 : 0);
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * 0.15, r.y + r.h - 2);
    ctx.lineTo(r.x + r.w * 0.85, r.y + r.h - 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }
  if (b.kind === 'tower' && small >= 5) {
    // Aviation warning light.
    ctx.fillStyle = `rgba(255, 51, 85, ${0.95 * tint})`;
    glow(ctx, '#ff3355', lit && !view.fast ? 5 : 0);
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.max(1.2, small * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/** The color a storefront glows in: its district's, or any neon going. */
function neonOf(b: Building, district: District | undefined): string {
  const rng = createRng(`${b.id}:neon`);
  return rng.chance(0.5) && district ? district.theme.secondary : rng.pick(NEONS);
}

function glow(ctx: CanvasRenderingContext2D, color: string, blur: number): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

/** A stable number in [0, 1) for one cell of a grid. */
function hash01(seed: number, a: number, b: number): number {
  let h = seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
