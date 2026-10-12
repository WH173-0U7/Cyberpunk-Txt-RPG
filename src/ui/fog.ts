import { CELL, cellCenter } from '../engine/game';
import { createRng } from '../engine/rng';
import type { MapState, Point, World } from '../engine/types';
import { fitCanvas, type Px } from './draw-city';

/** The fog mask covers the map at this many pixels per map unit: enough for wisps of smoke close in. */
const MASK_SCALE = 4;
/** The mask's width and height, in pixels. */
const SIZE = 100 * MASK_SCALE;
/** How far the fog clears around a place you've been to, in map units. Places you've only heard of stay in the dark. */
const CLEAR_VISITED = 6;
const FOG = 'rgba(3, 4, 9, 0.92)';
/** Fog canvas pixels per CSS pixel. The fog is all soft gradients, so a quarter of the pixels look the same and draw far faster. */
const FOG_DENSITY = 0.5;
/** Side of the noise tiles that shape the fog's edges and how it clears, in mask pixels. A power of two, so it wraps with a mask. */
const NOISE = 256;
/** How ragged the edge of a clearing is: 0 is a clean circle. Above 0.5, more fog could come back as a clearing grows. */
const RAGGED = 0.45;
/** How far the edge of a clearing swirls in and out, in mask pixels, like the edge of a cloud of smoke. */
const SWIRL = 6;
/** The thinnest smoke clears in about this long (s), the thickest in about this long. */
const QUICKEST = 0.3;
const SLOWEST = 1.8;
/** However slowly a pixel clears, it clears at least this much a second, so the last wisps don't hang about. */
const LEAST = 0.12;
/** How fast the pattern of thick and thin smoke drifts while it clears, in mask pixels a second. */
const DRIFT = 8;
/** The smoke in the dark: a tile this many pixels square, laid twice at different sizes and angles so it never looks tiled. */
const SMOKE_SIZE = 256;
const SMOKE_LAYERS = [
  { units: 70, angle: 0, x: 0, y: 0 },
  { units: 43, angle: 0.6, x: 17, y: 31 },
];
/** This many new cells at once (a walk that went on while the game was in the background) glitches in first, like an arrival. */
const BIG_REVEAL = 12;
/** How far around what it uncovers a glitch reaches, in mask pixels. */
const GLITCH_REACH = 16;
/** How long a glitch lasts (ms), how long each of its frames holds, and which frames tear the fog open (1). */
const GLITCH_MS = 520;
const GLITCH_STEP = 40;
const GLITCH_FRAMES = [1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1];
const GLITCH_COLORS = ['#00f0ff', '#ff2a6d', '#f3e600'];

/** What the fog needs to know about the camera. */
export interface FogView {
  width: number;
  height: number;
  dpr: number;
  project(p: Point): Px;
}

/** A rectangle of mask pixels, ends exclusive. */
interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Glitch extends Area {
  start: number;
}

/**
 * The fog over everything the player hasn't seen. It lifts along every street walked and
 * around every place visited, and never comes back. Newly uncovered ground doesn't pop out
 * of the dark: the fog over it thins like smoke, the thin parts first and the thick wisps
 * last, and arriving somewhere new glitches the map open first. It draws to its own canvas,
 * so it can clear while the city underneath stays as it is.
 */
export class Fog {
  /** How far the fog has lifted for good, 0 to 1, per mask pixel. */
  private readonly target = new Float32Array(SIZE * SIZE);
  /** How far it has lifted on screen so far: this catches up with `target`. */
  private readonly shown = new Float32Array(SIZE * SIZE);
  /** `shown` as pixels, put into `mask`. */
  private readonly pixels = new ImageData(SIZE, SIZE);
  /** Stretched over the map to cut the fog away. */
  private readonly mask = document.createElement('canvas');
  /** Clearings are painted here as soft circles, then read back into `target`. */
  private readonly paint = document.createElement('canvas');
  // Periods in mask pixels: billows 8 map units across down to wisps of 1.
  private readonly edges = smokeNoise('fog-edges', NOISE, [32, 16, 8, 4]);
  /** Which way each pixel's edge swirls: across from here, and down from half a tile away. */
  private readonly swirl = smokeNoise('fog-swirl', NOISE, [64, 32, 16]);
  /** Pushed toward 0 and 1, so the fog clears in distinct thin and thick patches. */
  private readonly thickness = smokeNoise('fog-thickness', NOISE, [32, 16, 8, 4]).map((n) => smoothstep(0.25, 0.75, n));
  private readonly smoke = smokeTexture();
  private pattern: CanvasPattern | null = null;
  /** The fog and its smoke, before anything is cut away. Only redrawn when the camera moves. */
  private readonly dark = document.createElement('canvas');
  private darkFor = '';
  private cells = new Set<number>();
  private places = new Set<string>();
  /** The part of the mask where the fog is still clearing. */
  private clearing: Area | null = null;
  private glitches: Glitch[] = [];
  /** A city that's just been loaded shows its fog as it is, rather than clearing it all in front of the player. */
  private instant = true;
  private view: FogView | null = null;
  private frame = 0;
  private last = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly reducedMotion: boolean,
  ) {
    for (const c of [this.mask, this.paint]) {
      c.width = SIZE;
      c.height = SIZE;
    }
  }

  /** A new city: all fog again. */
  reset(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.target.fill(0);
    this.shown.fill(0);
    this.pixels.data.fill(0);
    this.cells = new Set();
    this.places = new Set();
    this.clearing = null;
    this.glitches = [];
    this.instant = true;
    this.paint.getContext('2d', { willReadFrequently: true })?.clearRect(0, 0, SIZE, SIZE);
    this.mask.getContext('2d')?.clearRect(0, 0, SIZE, SIZE);
  }

  /**
   * Lifts the fog from whatever is newly explored or visited, and starts it clearing. Ground
   * uncovered on arriving somewhere (`arrived`) glitches in first.
   */
  update(world: World, state: MapState, arrived: boolean): void {
    const p = this.paint.getContext('2d', { willReadFrequently: true });
    if (!p) return;
    p.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
    let area: Area | null = null;
    const clear = (c: Point, radius: number) => {
      const glow = p.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
      glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
      glow.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      p.fillStyle = glow;
      p.fillRect(c.x - radius, c.y - radius, radius * 2, radius * 2);
      area = join(area, {
        x0: Math.floor((c.x - radius) * MASK_SCALE),
        y0: Math.floor((c.y - radius) * MASK_SCALE),
        x1: Math.ceil((c.x + radius) * MASK_SCALE),
        y1: Math.ceil((c.y + radius) * MASK_SCALE),
      });
    };
    let cells = 0;
    for (const cell of state.explored) {
      if (this.cells.has(cell)) continue;
      this.cells.add(cell);
      clear(cellCenter(cell), CELL * 1.2);
      cells++;
    }
    for (const location of Object.values(world.locations)) {
      if (!state.visited.has(location.id) || this.places.has(location.id)) continue;
      this.places.add(location.id);
      clear(location, CLEAR_VISITED);
    }
    // Each pixel takes its fog from a little way off, so the edges swirl; anything that far from the new clearings can change.
    const fresh = within(grow(area, SWIRL));
    const source = within(grow(area, SWIRL * 2 + 1));
    if (!fresh || !source) return;
    const sw = source.x1 - source.x0;
    const sh = source.y1 - source.y0;
    const data = p.getImageData(source.x0, source.y0, sw, sh).data;
    const liftedAt = (x: number, y: number) => {
      // Smoothly between pixels, so the swirls stay soft.
      const fx = Math.min(sw - 1, Math.max(0, x - source.x0));
      const fy = Math.min(sh - 1, Math.max(0, y - source.y0));
      const ax = Math.floor(fx);
      const ay = Math.floor(fy);
      const bx = Math.min(sw - 1, ax + 1);
      const by = Math.min(sh - 1, ay + 1);
      const at = (px: number, py: number) => data[(py * sw + px) * 4 + 3] ?? 0;
      const tx = fx - ax;
      const top = at(ax, ay) + (at(bx, ay) - at(ax, ay)) * tx;
      const bottom = at(ax, by) + (at(bx, by) - at(ax, by)) * tx;
      return (top + (bottom - top) * (fy - ay)) / 255;
    };

    // Read the new clearings back, with swirling, ragged edges.
    const { x0, y0, x1, y1 } = fresh;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const n = wrap(x, y);
        const sx = x + ((this.swirl[n] ?? 0.5) - 0.5) * 2 * SWIRL;
        const sy = y + ((this.swirl[wrap(x + NOISE / 2, y + NOISE / 2)] ?? 0.5) - 0.5) * 2 * SWIRL;
        const i = y * SIZE + x;
        this.target[i] = Math.max(this.target[i] ?? 0, shapeEdge(liftedAt(sx, sy), this.edges[n] ?? 0.5));
      }
    }

    if (this.instant || this.reducedMotion) {
      this.instant = false;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) this.show(y * SIZE + x, this.target[y * SIZE + x] ?? 0);
      }
      this.putMask(fresh);
      return;
    }
    this.clearing = join(this.clearing, fresh);
    const reach = within(grow(fresh, GLITCH_REACH));
    if (reach && (arrived || cells >= BIG_REVEAL)) this.glitches.push({ ...reach, start: performance.now() });
    this.animate();
  }

  /** Whether a map point is out of the fog (or on its way out). */
  revealed(p: Point): boolean {
    const x = Math.min(SIZE - 1, Math.max(0, Math.floor(p.x * MASK_SCALE)));
    const y = Math.min(SIZE - 1, Math.max(0, Math.floor(p.y * MASK_SCALE)));
    return (this.target[y * SIZE + x] ?? 0) > 0.43;
  }

  /** Draws the fog for where the camera is now. */
  draw(view: FogView): void {
    this.view = view;
    this.redraw();
  }

  private redraw(): void {
    const { view, canvas } = this;
    const f = canvas.getContext('2d');
    if (!view || !f) return;
    const { width, height } = view;
    const density = Math.min(view.dpr, 1) * FOG_DENSITY;
    fitCanvas(canvas, width, height, density);
    const o = view.project({ x: 0, y: 0 });
    const e = view.project({ x: 100, y: 100 });
    this.drawDark(width, height, density, o, e);

    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = 'copy';
    f.drawImage(this.dark, 0, 0);
    f.setTransform(density, 0, 0, density, 0, 0);
    f.globalCompositeOperation = 'destination-out';
    f.imageSmoothingEnabled = true;
    f.drawImage(this.mask, o.x, o.y, e.x - o.x, e.y - o.y);
    f.globalCompositeOperation = 'source-over';
    for (const g of this.glitches) this.drawScanlines(f, g, o, e);
  }

  /** The fog with smoke hanging in it, fixed to the map so it pans and zooms with the streets. */
  private drawDark(width: number, height: number, density: number, o: Px, e: Px): void {
    const key = `${width}x${height}@${density}:${o.x},${o.y},${e.x},${e.y}`;
    if (key === this.darkFor) return;
    this.darkFor = key;
    const { dark } = this;
    fitCanvas(dark, width, height, density);
    const d = dark.getContext('2d');
    if (!d) return;
    d.setTransform(density, 0, 0, density, 0, 0);
    d.clearRect(0, 0, width, height);
    d.fillStyle = FOG;
    d.fillRect(0, 0, width, height);
    this.pattern ??= d.createPattern(this.smoke, 'repeat');
    const smoke = this.pattern;
    if (!smoke) return;
    const ux = (e.x - o.x) / 100;
    const uy = (e.y - o.y) / 100;
    for (const layer of SMOKE_LAYERS) {
      const k = layer.units / SMOKE_SIZE;
      const cos = Math.cos(layer.angle) * k;
      const sin = Math.sin(layer.angle) * k;
      smoke.setTransform(new DOMMatrix([cos * ux, sin * uy, -sin * ux, cos * uy, o.x + layer.x * ux, o.y + layer.y * uy]));
      d.fillStyle = smoke;
      d.fillRect(0, 0, width, height);
    }
  }

  // ───────────── Clearing ─────────────

  private animate(): void {
    if (this.frame) return;
    this.last = performance.now();
    const step = (now: number) => {
      this.frame = 0;
      const going = this.step(now);
      this.redraw();
      if (going) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }

  /** One frame of the fog clearing. Returns whether there's more to come. */
  private step(now: number): boolean {
    const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    let dirty: Area | null = null;
    // Last frame's torn strips go back to what they should show.
    for (const g of this.glitches) {
      this.restore(g);
      dirty = join(dirty, g);
    }

    const area = this.clearing;
    if (area) {
      // The thick and thin patches drift a little while they clear.
      const drift = Math.floor((now / 1000) * DRIFT);
      // Only what changes this frame gets put back into the mask, and only what's left clearing gets looked at next frame.
      let changed: Area | null = null;
      for (let y = area.y0; y < area.y1; y++) {
        let row: Area | null = null;
        for (let x = area.x0; x < area.x1; x++) {
          const i = y * SIZE + x;
          const from = this.shown[i] ?? 0;
          const to = this.target[i] ?? 0;
          if (from === to) continue;
          this.show(i, clearStep(from, to, this.thickness[wrap(x + drift, y + drift)] ?? 0.5, dt));
          if (row) row.x1 = x + 1;
          else row = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
        }
        if (row) changed = join(changed, row);
      }
      this.clearing = changed;
      if (changed) dirty = join(dirty, changed);
    }

    this.glitches = this.glitches.filter((g) => now - g.start < GLITCH_MS);
    for (const g of this.glitches) this.tear(g, now);
    if (dirty) this.putMask(dirty);
    return Boolean(this.clearing) || this.glitches.length > 0;
  }

  private show(i: number, value: number): void {
    this.shown[i] = value;
    this.pixels.data[i * 4 + 3] = Math.round(value * 255);
  }

  private restore(area: Area): void {
    for (let y = area.y0; y < area.y1; y++) {
      for (let x = area.x0; x < area.x1; x++) this.show(y * SIZE + x, this.shown[y * SIZE + x] ?? 0);
    }
  }

  private putMask(area: Area): void {
    this.mask.getContext('2d')?.putImageData(this.pixels, 0, 0, area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
  }

  // ───────────── Glitch ─────────────

  private glitchFrame(g: Glitch, now: number): number | null {
    const frame = Math.floor((now - g.start) / GLITCH_STEP);
    return GLITCH_FRAMES[frame] ? frame : null;
  }

  /** On a glitch frame the map tears open in strips, shifted sideways, before the smoke takes over. */
  private tear(g: Glitch, now: number): void {
    const frame = this.glitchFrame(g, now);
    if (frame === null) return;
    const rng = createRng(`${g.start}:${frame}`);
    const data = this.pixels.data;
    for (let y = g.y0; y < g.y1; ) {
      const band = rng.int(3, 10);
      // Most strips slide sideways, some go dark, the rest stay as they are.
      const roll = rng.next();
      const shift = roll < 0.6 ? rng.int(-20, 20) : 0;
      const strength = roll < 0.6 ? rng.range(0.4, 1) : roll < 0.8 ? rng.range(0, 0.3) : 1;
      if (strength !== 1) {
        for (let yy = y; yy < Math.min(g.y1, y + band); yy++) {
          for (let x = g.x0; x < g.x1; x++) {
            const from = Math.min(SIZE - 1, Math.max(0, x - shift));
            data[(yy * SIZE + x) * 4 + 3] = Math.round((this.target[yy * SIZE + from] ?? 0) * strength * 255);
          }
        }
      }
      y += band;
    }
  }

  /** Thin scanlines across a glitch on its torn frames, split into two colors like a bad signal. */
  private drawScanlines(f: CanvasRenderingContext2D, g: Glitch, o: Px, e: Px): void {
    const frame = this.glitchFrame(g, performance.now());
    if (frame === null) return;
    const rng = createRng(`${g.start}:${frame}:lines`);
    const kx = (e.x - o.x) / SIZE;
    const ky = (e.y - o.y) / SIZE;
    const left = o.x + g.x0 * kx;
    const top = o.y + g.y0 * ky;
    const w = (g.x1 - g.x0) * kx;
    const h = (g.y1 - g.y0) * ky;
    f.globalCompositeOperation = 'lighter';
    for (let n = rng.int(2, 4); n > 0; n--) {
      const x = left + rng.range(-0.1, 0.5) * w;
      const y = top + rng.next() * h;
      const length = w * rng.range(0.3, 0.8);
      const thick = rng.range(1.5, 3);
      const split = rng.range(2, 5);
      const alpha = rng.range(0.3, 0.6);
      const [a, b] = rng.shuffle(GLITCH_COLORS);
      f.globalAlpha = alpha;
      f.fillStyle = a ?? '#00f0ff';
      f.fillRect(x, y, length, thick);
      f.fillStyle = b ?? '#ff2a6d';
      f.fillRect(x + split, y + thick * 0.5, length, thick);
    }
    f.globalAlpha = 1;
    f.globalCompositeOperation = 'source-over';
  }
}

// ───────────── Smoke ─────────────

/**
 * Makes the edge of a clearing ragged: where the fog is partly lifted, the noise there decides
 * how far. Fully fogged and fully clear stay as they are, and more lifted always means at
 * least as clear, so a clearing that grows never lets fog back in.
 */
export function shapeEdge(lifted: number, noise: number): number {
  const edge = 4 * lifted * (1 - lifted);
  const t = Math.min(1, Math.max(0, (lifted + (noise - 0.5) * RAGGED * edge - 0.15) / 0.7));
  return t * t * (3 - 2 * t);
}

/**
 * One step of a pixel's fog clearing toward where it's headed: quickly where the smoke is thin
 * (`thickness` near 0), slowly where it's thick, easing out as it gets there. Never overshoots,
 * and always gets there in a few seconds.
 */
export function clearStep(shown: number, target: number, thickness: number, dt: number): number {
  const gap = target - shown;
  if (gap <= 0.01) return target;
  const tau = QUICKEST + (SLOWEST - QUICKEST) * thickness;
  return Math.min(target, shown + Math.max(gap * (1 - Math.exp(-dt / tau)), LEAST * dt));
}

/** Tileable smoke-like noise, `size` pixels square, from 0 to 1: big soft billows with finer wisps over them. */
export function smokeNoise(seed: string, size: number, periods: number[]): Float32Array {
  const rng = createRng(seed);
  const out = new Float32Array(size * size);
  let weight = 1;
  for (const period of periods) {
    const n = Math.max(1, Math.round(size / period));
    const lattice = Float32Array.from({ length: n * n }, () => rng.next());
    // Which lattice points each column (and, the tile being square, each row) falls between, and how far along.
    const before = new Int32Array(size);
    const after = new Int32Array(size);
    const along = new Float32Array(size);
    for (let x = 0; x < size; x++) {
      const g = (x / size) * n;
      const g0 = Math.floor(g);
      before[x] = g0 % n;
      after[x] = (g0 + 1) % n;
      along[x] = ease(g - g0);
    }
    for (let y = 0; y < size; y++) {
      const top = (before[y] ?? 0) * n;
      const bottom = (after[y] ?? 0) * n;
      const ty = along[y] ?? 0;
      for (let x = 0; x < size; x++) {
        const x0 = before[x] ?? 0;
        const x1 = after[x] ?? 0;
        const tx = along[x] ?? 0;
        const a = lattice[top + x0] ?? 0;
        const b = lattice[top + x1] ?? 0;
        const c = lattice[bottom + x0] ?? 0;
        const d = lattice[bottom + x1] ?? 0;
        const upper = a + (b - a) * tx;
        const lower = c + (d - c) * tx;
        const i = y * size + x;
        out[i] = (out[i] ?? 0) + weight * (upper + (lower - upper) * ty);
      }
    }
    weight /= 2;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const v of out) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  for (let i = 0; i < out.length; i++) out[i] = ((out[i] ?? 0) - min) / span;
  return out;
}

/** Pale wisps of smoke, mostly see-through, to lay over the fog. */
function smokeTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SMOKE_SIZE;
  canvas.height = SMOKE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const noise = smokeNoise('fog-smoke', SMOKE_SIZE, [128, 64, 32, 16, 8]);
  const image = ctx.createImageData(SMOKE_SIZE, SMOKE_SIZE);
  const { data } = image;
  for (let i = 0; i < noise.length; i++) {
    data[i * 4] = 118;
    data[i * 4 + 1] = 132;
    data[i * 4 + 2] = 176;
    data[i * 4 + 3] = Math.round(smoothstep(0.3, 1, noise[i] ?? 0) * 0.075 * 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

function smoothstep(from: number, to: number, v: number): number {
  return ease(Math.min(1, Math.max(0, (v - from) / (to - from))));
}

/** Where a mask pixel falls in a noise tile. */
function wrap(x: number, y: number): number {
  return (y & (NOISE - 1)) * NOISE + (x & (NOISE - 1));
}

function grow(area: Area | null, by: number): Area | null {
  return area && { x0: area.x0 - by, y0: area.y0 - by, x1: area.x1 + by, y1: area.y1 + by };
}

function join(a: Area | null, b: Area): Area {
  if (!a) return b;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

/** An area cut down to the mask; null if nothing is left. */
function within(area: Area | null): Area | null {
  if (!area) return null;
  const clipped = {
    x0: Math.max(0, area.x0),
    y0: Math.max(0, area.y0),
    x1: Math.min(SIZE, area.x1),
    y1: Math.min(SIZE, area.y1),
  };
  return clipped.x1 > clipped.x0 && clipped.y1 > clipped.y0 ? clipped : null;
}
