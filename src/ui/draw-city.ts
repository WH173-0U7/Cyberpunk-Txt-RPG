import { districtAt, fromCoastFrame, shoreline } from '../engine/geography';
import { createRng, hashSeed } from '../engine/rng';
import type { Building, BuildingKind, CityLayout, District, Point, World } from '../engine/types';

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

/** Where a building ended up on screen, for tapping. */
export interface BuildingHit {
  id: string;
  footprint: Box;
  /** Screen offset from the footprint up to the roof; zero for open ground. */
  rise: Px;
}

const ASPHALT = '#06070d';
const PAVEMENT = '#0a0d17';
const SEA = '#040914';
const ROOF = '#111628';
const WALL_SOUTH = '#0b0e1c';
const WALL_WEST = '#07090f';
const WARM_LIGHT = '#ffd9a0';
const NEONS = ['#ff2bd6', '#00f0ff', '#39ff88', '#ffd84d', '#ff3b3b', '#a46bff'];

/** Px per map unit from which windows, lane markings and rooftop details appear. */
const DETAIL_SCALE = 6;
/** Px per map unit from which every window shows, lit or not. */
const FINE_SCALE = 14;
/** How tall buildings stand, in map units per square-rooted floor. The root keeps skyscrapers in check. */
const LIFT = 0.42;
/** Where roofs sit relative to their footprint: up and to the right, as if seen from the south-west. */
const RISE_X = 0.32;
const RISE_Y = -0.95;

/** How a kind of building's walls look. */
interface Facade {
  /** Chance a window is lit. */
  lit: number;
  /** Of the lit windows, the share glowing in the district's color rather than plain light. */
  neon: number;
  /** Windows per map unit along a wall, and rows per map unit of height, close up. Half as many further out. */
  cols: number;
  rows: number;
  /** How much of each window's cell is glass, across and up. */
  glassW: number;
  glassH: number;
  light: string;
  /** Unlit glass, only drawn close up. */
  dark: string;
}

const DARK_GLASS = 'rgba(120, 140, 200, 0.08)';
const FACADES: Record<BuildingKind, Facade | null> = {
  // Curtain-wall glass: wide panes, cool light.
  tower: { lit: 0.5, neon: 0.12, cols: 3, rows: 6, glassW: 0.84, glassH: 0.62, light: '#d4ecff', dark: 'rgba(90, 150, 230, 0.16)' },
  apartments: { lit: 0.4, neon: 0.28, cols: 2.2, rows: 5, glassW: 0.56, glassH: 0.44, light: WARM_LIGHT, dark: DARK_GLASS },
  megabuilding: { lit: 0.45, neon: 0.22, cols: 3, rows: 6.5, glassW: 0.5, glassH: 0.4, light: WARM_LIGHT, dark: DARK_GLASS },
  shops: { lit: 0.6, neon: 0.35, cols: 2, rows: 5, glassW: 0.6, glassH: 0.45, light: WARM_LIGHT, dark: DARK_GLASS },
  // Strip windows high up under the roof line.
  warehouse: { lit: 0.12, neon: 0, cols: 1.2, rows: 1.5, glassW: 0.8, glassH: 0.2, light: '#ffe6b8', dark: DARK_GLASS },
  factory: { lit: 0.2, neon: 0, cols: 1.6, rows: 2, glassW: 0.7, glassH: 0.25, light: '#ffb070', dark: DARK_GLASS },
  // Boarded up and broken.
  derelict: { lit: 0.03, neon: 0, cols: 2, rows: 5, glassW: 0.56, glassH: 0.44, light: '#ff9a5a', dark: 'rgba(0, 0, 0, 0.4)' },
  shack: { lit: 0.4, neon: 0, cols: 1, rows: 5, glassW: 0.4, glassH: 0.4, light: WARM_LIGHT, dark: DARK_GLASS },
  park: null,
  plaza: null,
  lot: null,
  container: null,
};

/**
 * Draws the ground, the sea and every building onto the canvas. Buildings stand up off the
 * map, drawn back to front with walls, lit windows and rooftop clutter that fills in as you
 * zoom. Returns where each building landed, for tapping.
 */
export function drawCity(ctx: CanvasRenderingContext2D, world: World, view: View, knownDistricts: Set<string>): BuildingHit[] {
  ctx.fillStyle = ASPHALT;
  ctx.fillRect(0, 0, view.width, view.height);

  drawBlocks(ctx, world, view, knownDistricts);
  drawStreets(ctx, world.layout, view);
  if (world.layout.coast) drawSea(ctx, world.layout.coast, world.seed, view);
  return drawBuildings(ctx, world, view, knownDistricts);
}

/** The first building under a screen point, front to back. A near miss still counts on small buildings. */
export function buildingAt(hits: BuildingHit[], q: Px): string | null {
  for (const slop of [0, 6]) {
    for (let i = hits.length - 1; i >= 0; i--) {
      const hit = hits[i];
      if (hit && covers(hit, q, slop)) return hit.id;
    }
  }
  return null;
}

/** The selected building's outline, glowing. Drawn last, so it shows through the fog. */
export function drawSelection(ctx: CanvasRenderingContext2D, hit: BuildingHit, view: View): void {
  const { footprint: r, rise: d } = hit;
  const roof = { x: r.x + d.x, y: r.y + d.y };
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, Math.min(3, view.scale * 0.12));
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = view.fast ? 0 : 12;
  ctx.beginPath();
  if (d.x === 0 && d.y === 0) {
    ctx.rect(r.x, r.y, r.w, r.h);
  } else {
    // The whole silhouette, then the roof's front edges and the near corner.
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(roof.x + r.w, roof.y + r.h);
    ctx.lineTo(roof.x + r.w, roof.y);
    ctx.lineTo(roof.x, roof.y);
    ctx.closePath();
    ctx.moveTo(roof.x, roof.y);
    ctx.lineTo(roof.x, roof.y + r.h);
    ctx.lineTo(roof.x + r.w, roof.y + r.h);
    ctx.moveTo(r.x, r.y + r.h);
    ctx.lineTo(roof.x, roof.y + r.h);
  }
  ctx.stroke();
  ctx.restore();
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ───────────── Ground ─────────────

/** Pavement under every city block; in the desert, open sand that runs across the streets. */
function drawBlocks(ctx: CanvasRenderingContext2D, world: World, view: View, known: Set<string>): void {
  const districts = Object.values(world.districts);
  const xs = [0, ...world.layout.avenues, 100];
  const ys = [0, ...world.layout.streets, 100];
  const curb = view.scale >= DETAIL_SCALE;
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] ?? 0;
      const x1 = xs[i + 1] ?? 100;
      const y0 = ys[j] ?? 0;
      const y1 = ys[j + 1] ?? 100;
      const district = districtAt(districts, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
      if (!district) continue;
      const lit = known.has(district.id);

      if (district.terrain === 'desert') {
        const a = view.project({ x: x0, y: y0 });
        const b = view.project({ x: x1, y: y1 });
        const cell = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
        if (!onScreen(cell, view)) continue;
        ctx.fillStyle = `rgba(255, 158, 61, ${lit ? 0.06 : 0.025})`;
        ctx.fillRect(cell.x, cell.y, cell.w + 0.5, cell.h + 0.5);
        // Scrub and rocks.
        const rng = createRng(`${world.seed}:sand:${i}:${j}`);
        ctx.fillStyle = `rgba(255, 190, 120, ${lit ? 0.22 : 0.07})`;
        const size = Math.max(1, view.scale * 0.3);
        for (let n = rng.int(2, 5); n > 0; n--) ctx.fillRect(cell.x + rng.range(0, cell.w), cell.y + rng.range(0, cell.h), size, size);
        continue;
      }

      // Sidewalks stop half a lane short of each street's centerline.
      const a = view.project({ x: i === 0 ? 0.2 : x0 + 0.55, y: j === 0 ? 0.2 : y0 + 0.55 });
      const b = view.project({ x: i === xs.length - 2 ? 99.8 : x1 - 0.55, y: j === ys.length - 2 ? 99.8 : y1 - 0.55 });
      const pad = { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      if (pad.w <= 0 || pad.h <= 0 || !onScreen(pad, view)) continue;
      ctx.fillStyle = PAVEMENT;
      ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      if (lit) {
        ctx.fillStyle = hexToRgba(district.theme.primary, 0.025);
        ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
      }
      if (curb) {
        ctx.strokeStyle = `rgba(150, 170, 220, ${lit ? 0.12 : 0.05})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(pad.x + 0.5, pad.y + 0.5, pad.w - 1, pad.h - 1);
      }
    }
  }
}

/** Main roads glow faintly; closer in, every street gets a dashed center line. */
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

  if (view.scale < DETAIL_SCALE) return;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 216, 120, 0.16)';
  ctx.setLineDash([view.scale * 0.5, view.scale * 0.8]);
  ctx.beginPath();
  layout.avenues.forEach(vertical);
  layout.streets.forEach(horizontal);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Water from the map edge to a wavy shoreline, with a few swell lines. */
function drawSea(ctx: CanvasRenderingContext2D, coast: NonNullable<CityLayout['coast']>, seed: string, view: View): void {
  const shore = shoreline(coast, seed);
  // Stretch well past the frame so the water reaches the canvas edge at any zoom.
  const line = (offset: number) => {
    const points: Px[] = [];
    for (let t = -40; t <= 140; t += 1.5) points.push(view.project(fromCoastFrame(coast.side, t, shore(t) - offset)));
    return points;
  };
  const trace = (points: Px[]) => points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));

  const coastline = line(0);
  ctx.beginPath();
  trace([...coastline, view.project(fromCoastFrame(coast.side, 140, -60)), view.project(fromCoastFrame(coast.side, -40, -60))]);
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
  for (const [offset, alpha] of [
    [1.6, 0.22],
    [3.4, 0.14],
    [5.4, 0.08],
  ] as const) {
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
  const raised: Array<{ b: Building; r: Box; rise: Px }> = [];

  for (const b of world.buildings) {
    const r = footprint(b, view);
    if (b.floors === 0) {
      if (!onScreen(r, view)) continue;
      drawOpenGround(ctx, b, r, view, world.districts[b.district], known.has(b.district));
      hits.push({ id: b.id, footprint: r, rise: { x: 0, y: 0 } });
      continue;
    }
    const rise = riseOf(b, view);
    if (onScreen({ x: r.x, y: r.y + rise.y, w: r.w + rise.x, h: r.h - rise.y }, view)) raised.push({ b, r, rise });
  }

  // South in front of north; within a row, west in front of east.
  raised.sort((p, q) => p.b.y + p.b.h - (q.b.y + q.b.h) || q.b.x - p.b.x);

  // Shadows first, so none falls across a roof.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  for (const { r, rise } of raised) ctx.rect(r.x + rise.x * 0.7, r.y - rise.y * 0.12, r.w, r.h);
  ctx.fill();

  for (const { b, r, rise } of raised) {
    drawRaised(ctx, b, r, rise, view, world.districts[b.district], known.has(b.district));
    hits.push({ id: b.id, footprint: r, rise });
  }
  return hits;
}

function footprint(b: Building, view: View): Box {
  const a = view.project({ x: b.x, y: b.y });
  const c = view.project({ x: b.x + b.w, y: b.y + b.h });
  return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
}

function riseOf(b: Building, view: View): Px {
  const lift = Math.sqrt(b.floors) * LIFT * view.scale;
  return { x: lift * RISE_X, y: lift * RISE_Y };
}

function onScreen(b: Box, view: View): boolean {
  return b.x + b.w >= -4 && b.y + b.h >= -4 && b.x <= view.width + 4 && b.y <= view.height + 4;
}

/** Whether a point is on a building: its footprint swept up to its roof. */
function covers(hit: BuildingHit, q: Px, slop: number): boolean {
  const { footprint: r, rise: d } = hit;
  // Some t in [0, 1] must put q - t·rise inside the footprint.
  let lo = 0;
  let hi = 1;
  for (const [min, max, step] of [
    [q.x - r.x - r.w - slop, q.x - r.x + slop, d.x],
    [q.y - r.y - r.h - slop, q.y - r.y + slop, d.y],
  ] as const) {
    if (Math.abs(step) < 1e-6) {
      if (min > 0 || max < 0) return false;
      continue;
    }
    const t1 = min / step;
    const t2 = max / step;
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  }
  return lo <= hi;
}

/** Parks, plazas and parking lots: open ground with a pattern. */
function drawOpenGround(ctx: CanvasRenderingContext2D, b: Building, r: Box, view: View, district: District | undefined, lit: boolean): void {
  // Every random draw happens up front, so nothing shifts as detail comes and goes with zoom.
  const rng = createRng(b.id);
  const detail = view.scale >= DETAIL_SCALE;
  switch (b.kind) {
    case 'park': {
      const path = [rng.range(0.3, 0.7), rng.range(0.3, 0.7)] as const;
      const trees = Array.from({ length: Math.min(40, Math.max(4, Math.round(b.w * b.h * 0.9))) }, () => ({
        u: rng.range(0.08, 0.92),
        v: rng.range(0.08, 0.92),
        size: rng.range(0.22, 0.42),
      }));
      ctx.fillStyle = `rgba(57, 255, 136, ${lit ? 0.08 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (detail) {
        ctx.strokeStyle = `rgba(200, 255, 220, ${lit ? 0.14 : 0.05})`;
        ctx.lineWidth = Math.max(1, view.scale * 0.12);
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + r.h * path[0]);
        ctx.quadraticCurveTo(r.x + r.w / 2, r.y + r.h * 0.5, r.x + r.w, r.y + r.h * path[1]);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(57, 255, 136, ${lit ? 0.24 : 0.08})`;
      ctx.beginPath();
      for (const tree of trees) {
        const x = r.x + r.w * tree.u;
        const y = r.y + r.h * tree.v;
        const radius = Math.max(0.8, tree.size * view.scale);
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
      break;
    }
    case 'plaza': {
      ctx.fillStyle = `rgba(200, 210, 240, ${lit ? 0.07 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (detail) {
        // Paving.
        ctx.strokeStyle = `rgba(200, 210, 240, ${lit ? 0.07 : 0.03})`;
        ctx.lineWidth = 1;
        const step = view.scale * 0.8;
        ctx.beginPath();
        for (let x = r.x + step; x < r.x + r.w; x += step) {
          ctx.moveTo(x, r.y);
          ctx.lineTo(x, r.y + r.h);
        }
        for (let y = r.y + step; y < r.y + r.h; y += step) {
          ctx.moveTo(r.x, y);
          ctx.lineTo(r.x + r.w, y);
        }
        ctx.stroke();
      }
      // A fountain or holo-statue in the middle.
      const glow = district?.theme.secondary ?? '#5ce1ff';
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const radius = Math.min(r.w, r.h) * 0.16;
      ctx.strokeStyle = hexToRgba(glow, lit ? 0.6 : 0.2);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (detail && lit) {
        ctx.fillStyle = hexToRgba(glow, 0.35);
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default: {
      // Parking lot.
      const cars = Array.from({ length: rng.int(2, 7) }, () => ({ u: rng.next(), row: rng.int(0, 1), color: rng.pick(NEONS) }));
      ctx.fillStyle = `rgba(120, 130, 160, ${lit ? 0.07 : 0.03})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (!detail) break;
      const bay = view.scale * 0.55;
      const depth = Math.min(r.h * 0.3, view.scale * 1.1);
      const rows = [r.y + r.h * 0.12, r.y + r.h * 0.88 - depth];
      ctx.strokeStyle = `rgba(230, 230, 255, ${lit ? 0.16 : 0.05})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const row of rows) {
        for (let x = r.x + bay; x < r.x + r.w - 1; x += bay) {
          ctx.moveTo(x, row);
          ctx.lineTo(x, row + depth);
        }
      }
      ctx.stroke();
      const slots = Math.max(1, Math.floor(r.w / bay) - 1);
      for (const car of cars) {
        const slot = Math.floor(car.u * slots);
        ctx.fillStyle = hexToRgba(car.color, lit ? 0.4 : 0.12);
        ctx.fillRect(r.x + bay * (slot + 1) + bay * 0.15, (rows[car.row] ?? r.y) + depth * 0.12, bay * 0.7, depth * 0.76);
      }
    }
  }
}

/** A building with height: shadowed walls with lit windows, then a roof with details. */
function drawRaised(
  ctx: CanvasRenderingContext2D,
  b: Building,
  r: Box,
  rise: Px,
  view: View,
  district: District | undefined,
  lit: boolean,
): void {
  const color = district?.theme.primary ?? '#00f0ff';
  const tint = lit ? 1 : 0.35;
  const roof = { x: r.x + rise.x, y: r.y + rise.y, w: r.w, h: r.h };
  const facade = FACADES[b.kind];
  const litChance = (facade?.lit ?? 0) * tint;
  const corner = { x: r.x, y: r.y + r.h };
  const roofCorner = { x: roof.x, y: roof.y + roof.h };

  // The south face (toward the bottom of the screen) and the west face are the ones you see.
  const south = [corner, { x: r.x + r.w, y: r.y + r.h }, { x: roof.x + roof.w, y: roof.y + roof.h }, roofCorner];
  const west = [{ x: r.x, y: r.y }, corner, roofCorner, { x: roof.x, y: roof.y }];
  polygon(ctx, south, WALL_SOUTH);
  polygon(ctx, south, hexToRgba(color, 0.07 * tint));
  polygon(ctx, west, WALL_WEST);

  const wallHeight = -rise.y;
  if (facade && view.scale >= DETAIL_SCALE && wallHeight >= 4) {
    windows(ctx, b, facade, 'south', corner, { x: r.w, y: 0 }, rise, b.w, view, litChance, color);
    windows(ctx, b, facade, 'west', { x: r.x, y: r.y }, { x: 0, y: r.h }, rise, b.h, view, litChance * 0.7, color);
    if (b.kind === 'tower') {
      // A streak of reflected light down the glass.
      const at = 0.55 + hash01(hashSeed(b.id), 1, 1) * 0.25;
      polygon(ctx, wallBand(corner, { x: r.w, y: 0 }, rise, at, at + 0.12, 0, 1), `rgba(200, 230, 255, ${0.06 * tint})`);
    }
  } else if (litChance > 0) {
    // Too small for windows: a warm haze where they would be.
    polygon(ctx, south, `rgba(255, 210, 150, ${litChance * 0.12})`);
  }

  // Street-level glow from storefronts.
  if (b.kind === 'shops' && lit && view.scale >= DETAIL_SCALE) {
    const neon = neonOf(b, district);
    const spill = view.scale * 0.7;
    const glow = ctx.createLinearGradient(0, corner.y, 0, corner.y + spill);
    glow.addColorStop(0, hexToRgba(neon, 0.3));
    glow.addColorStop(1, hexToRgba(neon, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(r.x, corner.y, r.w, spill);
    // Lit shop windows along the ground floor.
    polygon(ctx, wallBand(corner, { x: r.w, y: 0 }, rise, 0.08, 0.92, 0.05, 0.4), hexToRgba(neon, 0.22));
  }

  // The near corner catches the light.
  ctx.strokeStyle = hexToRgba(color, 0.3 * tint);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(corner.x + 0.5, corner.y);
  ctx.lineTo(roofCorner.x + 0.5, roofCorner.y);
  ctx.stroke();

  // Roof.
  const derelict = b.kind === 'derelict';
  ctx.fillStyle = ROOF;
  ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
  ctx.fillStyle = hexToRgba(color, (derelict ? 0.04 : 0.12) * tint);
  ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
  // No two roofs quite the same shade.
  const shade = hash01(hashSeed(b.id), 2, 3);
  ctx.fillStyle = shade < 0.5 ? `rgba(0, 0, 0, ${(0.5 - shade) * 0.2})` : `rgba(255, 255, 255, ${(shade - 0.5) * 0.05})`;
  ctx.fillRect(roof.x, roof.y, roof.w, roof.h);
  if (view.scale >= DETAIL_SCALE && Math.min(roof.w, roof.h) > 10) {
    // Parapet.
    const inset = Math.max(1.5, view.scale * 0.12);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.strokeRect(roof.x + inset, roof.y + inset, roof.w - inset * 2, roof.h - inset * 2);
  }
  ctx.strokeStyle = hexToRgba(color, (derelict ? 0.18 : 0.5) * tint);
  ctx.lineWidth = 1;
  ctx.strokeRect(roof.x + 0.5, roof.y + 0.5, roof.w - 1, roof.h - 1);
  if (view.scale >= DETAIL_SCALE) rooftopClutter(ctx, b, roof, view, lit);
  roofDetails(ctx, b, roof, view, district, lit);

  if (b.kind === 'megabuilding' && view.scale >= DETAIL_SCALE) holoAd(ctx, b, corner, { x: r.w, y: 0 }, rise, view, lit);
}

/**
 * A grid of windows on a wall, given its bottom corner, the vector along its base and the
 * vector up to the roof. The grid depends only on the building, so the same windows stay lit
 * while you zoom; closer in, the grid doubles up and the dark windows show too.
 */
function windows(
  ctx: CanvasRenderingContext2D,
  b: Building,
  facade: Facade,
  face: 'south' | 'west',
  base: Px,
  along: Px,
  up: Px,
  length: number,
  view: View,
  litChance: number,
  color: string,
): void {
  const fine = view.scale >= FINE_SCALE;
  const height = Math.sqrt(b.floors) * LIFT;
  const density = fine ? 1 : 0.5;
  const rows = Math.max(1, Math.min(b.floors, Math.round(height * facade.rows * density)));
  const cols = Math.max(1, Math.round(length * facade.cols * density));
  const seed = hashSeed(`${b.id}:${face}:${fine ? 'fine' : 'coarse'}`);
  const warm = new Path2D();
  const neon = new Path2D();
  const dark = new Path2D();
  const at = (u: number, v: number) => ({ x: base.x + along.x * u + up.x * v, y: base.y + along.y * u + up.y * v });

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const roll = hash01(seed, row, col);
      const isLit = roll < litChance;
      if (!isLit && !fine) continue;
      const path = !isLit ? dark : roll < litChance * (1 - facade.neon) ? warm : neon;
      const u0 = (col + 0.5 - facade.glassW / 2) / cols;
      const u1 = (col + 0.5 + facade.glassW / 2) / cols;
      // Short windows sit near the top of their floor.
      const v1 = (row + 0.5 + Math.max(facade.glassH / 2, 0.42 - facade.glassH / 2)) / rows;
      const v0 = v1 - facade.glassH / rows;
      const p = at(u0, v0);
      path.moveTo(p.x, p.y);
      const q = at(u1, v0);
      path.lineTo(q.x, q.y);
      const s = at(u1, v1);
      path.lineTo(s.x, s.y);
      const t = at(u0, v1);
      path.lineTo(t.x, t.y);
      path.closePath();
    }
  }
  ctx.fillStyle = facade.dark;
  ctx.fill(dark);
  ctx.fillStyle = hexToRgba(facade.light, 0.75);
  ctx.fill(warm);
  ctx.fillStyle = hexToRgba(color, 0.85);
  ctx.fill(neon);
}

/** A band across a wall: u runs along its base, v from the street (0) up to the roof (1). */
function wallBand(base: Px, along: Px, up: Px, u0: number, u1: number, v0: number, v1: number): Px[] {
  const at = (u: number, v: number) => ({ x: base.x + along.x * u + up.x * v, y: base.y + along.y * u + up.y * v });
  return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
}

/** Megabuildings carry a giant holo-ad on their front. */
function holoAd(ctx: CanvasRenderingContext2D, b: Building, base: Px, along: Px, up: Px, view: View, lit: boolean): void {
  const rng = createRng(`${b.id}:ad`);
  if (!rng.chance(0.6)) return;
  const color = rng.pick(NEONS);
  const u = rng.range(0.1, 0.45);
  const band = wallBand(base, along, up, u, u + rng.range(0.25, 0.45), 0.55, 0.85);
  ctx.save();
  if (!view.fast && lit) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  polygon(ctx, band, hexToRgba(color, lit ? 0.38 : 0.12));
  ctx.restore();
  ctx.strokeStyle = hexToRgba(color, lit ? 0.9 : 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  band.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

/** Skylights, vents and solar panels on the flat roofs of ordinary buildings. */
function rooftopClutter(ctx: CanvasRenderingContext2D, b: Building, roof: Box, view: View, lit: boolean): void {
  if (b.kind !== 'apartments' && b.kind !== 'shops' && b.kind !== 'warehouse' && b.kind !== 'factory') return;
  const rng = createRng(`${b.id}:clutter`);
  const skylights = Array.from({ length: rng.int(0, 2) }, () => ({ u: rng.range(0.1, 0.6), v: rng.range(0.15, 0.6), w: rng.range(0.15, 0.3), h: rng.range(0.1, 0.2) }));
  const vents = Array.from({ length: rng.int(1, 4) }, () => ({ u: rng.range(0.1, 0.9), v: rng.range(0.1, 0.9) }));
  const solar = rng.chance(b.kind === 'warehouse' ? 0.5 : 0.25);
  const panel = { u: rng.range(0.08, 0.35), v: rng.range(0.1, 0.4) };
  const alpha = lit ? 1 : 0.35;
  const small = Math.min(roof.w, roof.h);
  if (small < 12) return;

  if (solar) {
    const x = roof.x + roof.w * panel.u;
    const y = roof.y + roof.h * panel.v;
    const w = roof.w * 0.5;
    const h = roof.h * 0.42;
    ctx.fillStyle = `rgba(40, 70, 160, ${0.35 * alpha})`;
    ctx.fillRect(x, y, w, h);
    if (view.scale >= FINE_SCALE) {
      ctx.strokeStyle = `rgba(140, 180, 255, ${0.22 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cells = Math.max(2, Math.round(w / Math.max(5, view.scale * 0.4)));
      for (let k = 1; k < cells; k++) {
        ctx.moveTo(x + (w * k) / cells, y);
        ctx.lineTo(x + (w * k) / cells, y + h);
      }
      ctx.moveTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
    }
  }
  // Skylights, lit from the rooms below.
  for (const light of skylights) {
    ctx.fillStyle = lit ? 'rgba(255, 217, 160, 0.32)' : 'rgba(255, 217, 160, 0.08)';
    ctx.fillRect(roof.x + roof.w * light.u, roof.y + roof.h * light.v, roof.w * light.w, roof.h * light.h);
  }
  if (view.scale < FINE_SCALE) return;
  // Vents.
  ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * alpha})`;
  ctx.strokeStyle = `rgba(190, 200, 225, ${0.2 * alpha})`;
  const radius = Math.max(1.2, view.scale * 0.1);
  for (const vent of vents) {
    ctx.beginPath();
    ctx.arc(roof.x + roof.w * vent.u, roof.y + roof.h * vent.v, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** What's on top of each kind of building. */
function roofDetails(ctx: CanvasRenderingContext2D, b: Building, roof: Box, view: View, district: District | undefined, lit: boolean): void {
  const small = Math.min(roof.w, roof.h);
  if (small < 5) return;
  const rng = createRng(`${b.id}:roof`);
  const cx = roof.x + roof.w / 2;
  const cy = roof.y + roof.h / 2;
  const alpha = lit ? 1 : 0.35;
  const glow = (color: string, blur: number) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = view.fast || !lit ? 0 : blur;
  };

  switch (b.kind) {
    case 'tower': {
      const helipad = rng.chance(0.5);
      const mast = rng.chance(0.6);
      ctx.strokeStyle = `rgba(220, 230, 255, ${0.14 * alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(roof.x + small * 0.18, roof.y + small * 0.18, roof.w - small * 0.36, roof.h - small * 0.36);
      if (helipad && small > 16) {
        ctx.strokeStyle = `rgba(255, 216, 77, ${0.7 * alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, small * 0.26, 0, Math.PI * 2);
        ctx.stroke();
        if (view.scale >= FINE_SCALE) {
          ctx.fillStyle = `rgba(255, 216, 77, ${0.8 * alpha})`;
          ctx.font = `800 ${Math.round(small * 0.28)}px Orbitron, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('H', cx, cy + 0.5);
        }
      } else {
        // An antenna mast with an aviation light on top.
        const tip = mast && view.scale >= DETAIL_SCALE ? { x: cx + small * 0.4 * RISE_X, y: cy + small * 0.4 * RISE_Y } : { x: cx, y: cy };
        if (tip.x !== cx) {
          ctx.strokeStyle = `rgba(200, 210, 240, ${0.5 * alpha})`;
          ctx.lineWidth = Math.max(1, view.scale * 0.06);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(tip.x, tip.y);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = `rgba(255, 51, 85, ${0.95 * alpha})`;
        glow('#ff3355', 6);
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, Math.max(1.2, small * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      break;
    }
    case 'megabuilding': {
      // An open courtyard down the middle.
      ctx.fillStyle = 'rgba(3, 4, 9, 0.85)';
      ctx.fillRect(roof.x + roof.w * 0.3, roof.y + roof.h * 0.3, roof.w * 0.4, roof.h * 0.4);
      ctx.strokeStyle = hexToRgba(district?.theme.primary ?? '#00f0ff', 0.4 * alpha);
      ctx.strokeRect(roof.x + roof.w * 0.3 + 0.5, roof.y + roof.h * 0.3 + 0.5, roof.w * 0.4 - 1, roof.h * 0.4 - 1);
      break;
    }
    case 'apartments': {
      // AC units and a water tank.
      const units = Array.from({ length: rng.int(1, 4) }, () => ({ u: rng.range(0.08, 0.7), v: rng.range(0.08, 0.7) }));
      const tank = rng.chance(0.4);
      const s = Math.max(1.5, small * 0.13);
      ctx.fillStyle = `rgba(190, 200, 225, ${0.18 * alpha})`;
      for (const unit of units) ctx.fillRect(roof.x + roof.w * unit.u, roof.y + roof.h * unit.v, s, s);
      if (tank && small > 10) {
        ctx.strokeStyle = `rgba(190, 200, 225, ${0.25 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(roof.x + roof.w * 0.78, roof.y + roof.h * 0.28, small * 0.11, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'shops': {
      // A neon sign along the front edge of the roof.
      const neon = neonOf(b, district);
      ctx.strokeStyle = hexToRgba(neon, 0.9 * alpha);
      ctx.lineWidth = Math.max(1.5, Math.min(4, view.scale * 0.14));
      glow(neon, 8);
      ctx.beginPath();
      ctx.moveTo(roof.x + roof.w * 0.12, roof.y + roof.h - 1.5);
      ctx.lineTo(roof.x + roof.w * 0.88, roof.y + roof.h - 1.5);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      break;
    }
    case 'warehouse':
    case 'factory': {
      const stack = { u: rng.range(0.2, 0.8), v: rng.range(0.2, 0.8) };
      // Ridged roof.
      ctx.strokeStyle = `rgba(200, 210, 240, ${0.1 * alpha})`;
      ctx.lineWidth = 1;
      const across = roof.w >= roof.h;
      const ridges = Math.max(2, Math.round((across ? b.w : b.h) * 1.4));
      ctx.beginPath();
      for (let k = 1; k < ridges; k++) {
        if (across) {
          const x = roof.x + (roof.w * k) / ridges;
          ctx.moveTo(x, roof.y + 1);
          ctx.lineTo(x, roof.y + roof.h - 1);
        } else {
          const y = roof.y + (roof.h * k) / ridges;
          ctx.moveTo(roof.x + 1, y);
          ctx.lineTo(roof.x + roof.w - 1, y);
        }
      }
      ctx.stroke();
      if (b.kind === 'factory') {
        // A smokestack, glowing hot at the rim.
        const sx = roof.x + roof.w * stack.u;
        const sy = roof.y + roof.h * stack.v;
        const radius = Math.max(1.5, small * 0.12);
        ctx.fillStyle = 'rgba(160, 170, 200, 0.06)';
        ctx.beginPath();
        ctx.arc(sx + radius * 0.8, sy - radius * 1.6, radius * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#05060b';
        ctx.strokeStyle = `rgba(255, 90, 60, ${0.7 * alpha})`;
        glow('#ff5a3c', 6);
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      break;
    }
    case 'derelict': {
      // Holes in the roof.
      const holes = Array.from({ length: rng.int(1, 3) }, () => [rng.range(0, 0.6), rng.range(0, 0.6), rng.range(0.15, 0.35), rng.range(0.15, 0.35)] as const);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      for (const [u, v, w, h] of holes) ctx.fillRect(roof.x + roof.w * u, roof.y + roof.h * v, roof.w * w, roof.h * h);
      break;
    }
    case 'container': {
      // Corrugated steel, in faded shipping colors.
      ctx.strokeStyle = rng.pick(['rgba(255, 120, 50, 0.4)', 'rgba(60, 200, 190, 0.4)', 'rgba(200, 60, 60, 0.4)']);
      ctx.lineWidth = 1;
      const step = Math.max(2.5, view.scale * 0.25);
      ctx.beginPath();
      for (let x = roof.x + step; x < roof.x + roof.w - 1; x += step) {
        ctx.moveTo(x, roof.y + 1);
        ctx.lineTo(x, roof.y + roof.h - 1);
      }
      ctx.stroke();
      break;
    }
    case 'shack': {
      // A tarp patch over the corrugated roof.
      const patch = [rng.range(0.1, 0.5), rng.range(0.1, 0.5)] as const;
      ctx.fillStyle = `rgba(255, 158, 61, ${0.22 * alpha})`;
      ctx.fillRect(roof.x + roof.w * patch[0], roof.y + roof.h * patch[1], roof.w * 0.4, roof.h * 0.4);
      break;
    }
    default:
      break;
  }
}

/** The color a storefront glows in: its district's, or any neon going. */
function neonOf(b: Building, district: District | undefined): string {
  const rng = createRng(`${b.id}:neon`);
  return rng.chance(0.5) && district ? district.theme.secondary : rng.pick(NEONS);
}

function polygon(ctx: CanvasRenderingContext2D, points: Px[], fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

/** A stable number in [0, 1) for one cell of a grid. */
function hash01(seed: number, a: number, b: number): number {
  let h = seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 1, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

