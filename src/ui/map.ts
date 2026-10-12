import { blockAt } from '../engine/buildings';
import { CELL, cellCenter } from '../engine/game';
import { streetPath } from '../engine/generate';
import { districtAt, seaTest } from '../engine/geography';
import { pathLength, pathUpTo } from '../engine/streets';
import { tripProgress } from '../engine/travel';
import type { Building, District, Location, MapState, Point, Station, Trip, World } from '../engine/types';
import { buildingAt, drawCity, drawSelection, hexToRgba, type Box, type BuildingHit, type Px, type View } from './draw-city';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Room around the edge of the map so markers don't touch the frame. */
const PAD = 14;
/** Label metrics for collision checks (10.5px mono, slightly generous). */
const CHAR_WIDTH = 6.2;
const LABEL_HEIGHT = 17;
const LABEL_GAP = 11;
/** Space reserved around each marker so labels don't cover it. */
const MARKER_BOX = 18;

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
/** The most the city stretches to fill a stage that isn't square. */
const MAX_STRETCH = 1.35;
/** Px per map unit from which a tap picks a building or a spot on the street. Further out, a tap zooms into the block. */
const PICK_SCALE = 7;
/** How far (px) a finger can wander before a tap becomes a drag. */
const DRAG_SLOP = 8;
/** How far the fog clears around places, in map units. */
const CLEAR_VISITED = 27;
const CLEAR_KNOWN = 17;
/** District names fade out as you zoom in, gone by this zoom. */
const NAMES_GONE = 2;
/** Fog canvas pixels per CSS pixel. */
const FOG_DENSITY = 0.5;
/** The fog mask covers the map at this many pixels per map unit. */
const MASK_SCALE = 2;
/** Tapping this close (px) to a pinned spot counts as tapping it again. */
const PIN_REACH = 26;

/** Where the map is looking: how far in, and the map point at the middle of the stage. */
interface Camera {
  zoom: number;
  x: number;
  y: number;
}

/** Something on the map the player can pick, and then go to. */
export type Target =
  | { kind: 'place'; id: string }
  | { kind: 'station'; id: string }
  | { kind: 'building'; id: string }
  | { kind: 'point'; point: Point };

/** What a selection shows on the map: the walk there, and the stations an NCART trip would use. */
export interface Preview {
  path: Point[] | null;
  stations: string[];
}

export interface MapElements {
  stage: HTMLElement;
  city: HTMLCanvasElement;
  routes: SVGSVGElement;
  nodes: HTMLElement;
  sweep: HTMLElement;
  player: HTMLElement;
  progress: HTMLElement;
  coords: HTMLElement;
  controls: HTMLElement;
  zoomIn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  zoomHome: HTMLButtonElement;
}

export interface MapHandlers {
  /** Something on the map was tapped (null: the player's own spot). */
  onSelect(target: Target | null): void;
  /** The selected thing was tapped again: go there. */
  onGo(): void;
}

/**
 * The city: streets and buildings drawn to canvas, fog over everything unexplored, the NCART
 * network, routes that follow the streets, and tappable markers. Drag to pan, pinch or scroll
 * to zoom. Zoomed out, a tap on a block flies in to it; close in, a tap picks out a building
 * or a spot on the street. The player's marker moves along their trip in real time.
 */
export class CityMap {
  private world: World | null = null;
  private state: MapState | null = null;
  private target: Target | null = null;
  private preview: Preview = { path: null, stations: [] };
  private trip: Trip | null = null;
  private buildings = new Map<string, Building>();
  private inSea: (p: Point) => boolean = () => false;
  private hits: BuildingHit[] = [];
  private camera: Camera = { zoom: 1, x: 50, y: 50 };
  private width = 0;
  private height = 0;
  /** While the map is being dragged or flown, frames skip the costly glows. */
  private moving = false;
  private frame = 0;
  private liveFrame = 0;
  private lastTrail = 0;
  private flight: { frame: number; finish(): void } | null = null;
  private settleTimer: number | undefined;
  private readonly fog = document.createElement('canvas');
  /** Where the fog lifts, drawn once per change of map state and stretched over the map. */
  private readonly mask = document.createElement('canvas');

  private readonly pointers = new Map<number, Px>();
  /** The camera and finger positions a drag or pinch is measured from. */
  private gesture: { camera: Camera; start: Map<number, Px> } | null = null;
  private dragged = false;
  private pressTarget: Element | null = null;
  private stageRect: DOMRect | null = null;
  /** A drag can end with a click on whatever is under the finger; that click is swallowed. */
  private swallowClick = false;

  constructor(
    private readonly els: MapElements,
    private readonly handlers: MapHandlers,
    private readonly reducedMotion: boolean,
  ) {
    const { stage } = els;
    this.mask.width = 100 * MASK_SCALE;
    this.mask.height = 100 * MASK_SCALE;
    new ResizeObserver(() => this.render()).observe(stage);
    // District names are drawn on the canvas in the display font; redraw once it has loaded.
    void document.fonts?.ready.then(() => this.render());

    stage.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    stage.addEventListener('pointermove', (e) => this.onPointerMove(e));
    stage.addEventListener('pointerup', (e) => this.onPointerUp(e));
    stage.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    stage.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    stage.addEventListener(
      'click',
      (e) => {
        // Keyboard presses (detail 0) are never the tail of a drag.
        if (this.swallowClick && e.detail !== 0) {
          e.stopPropagation();
          e.preventDefault();
        }
        this.swallowClick = false;
      },
      true,
    );
    els.zoomIn.addEventListener('click', () => this.zoomBy(2));
    els.zoomOut.addEventListener('click', () => this.zoomBy(0.5));
    els.zoomHome.addEventListener('click', () => this.centerOnPlayer());
  }

  get selection(): Target | null {
    return this.target;
  }

  setWorld(world: World): void {
    this.stopFlight();
    this.world = world;
    this.state = null;
    this.target = null;
    this.preview = { path: null, stations: [] };
    this.trip = null;
    this.buildings = new Map(world.buildings.map((b) => [b.id, b]));
    this.inSea = seaTest(world.layout, world.seed);
    this.camera = { zoom: 1, x: 50, y: 50 };
  }

  update(state: MapState): void {
    this.state = state;
    if (this.target?.kind === 'place' && !state.discovered.has(this.target.id)) this.target = null;
    this.drawMask();
    this.render();
  }

  /** Highlights something to go to, with the way there; null clears it. */
  select(target: Target | null, preview: Preview = { path: null, stations: [] }): void {
    this.target = target;
    this.preview = target ? preview : { path: null, stations: [] };
    this.render();
  }

  /** Shows a trip underway (null: none) and keeps the player's marker moving along it. */
  setTrip(trip: Trip | null): void {
    this.trip = trip;
    cancelAnimationFrame(this.liveFrame);
    this.liveFrame = 0;
    this.render();
    if (trip) this.liveFrame = requestAnimationFrame(() => this.followTrip());
  }

  /** Zooms in (factor above 1) or out around the middle of the map. */
  zoomBy(factor: number): void {
    void this.flyTo({ ...this.camera, zoom: this.camera.zoom * factor }, 280);
  }

  /** Zooms out, if it has to, until every point is on screen. */
  bringIntoView(points: Point[]): Promise<void> {
    const margin = 40;
    const project = this.projector();
    const fits = points.every((p) => {
      const q = project(p);
      return q.x >= margin && q.x <= this.width - margin && q.y >= margin && q.y <= this.height - margin;
    });
    if (fits || !points.length) return Promise.resolve();
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const { sx, sy } = this.units();
    const fit = Math.min((this.width - margin * 2) / Math.max(1, (x1 - x0) * sx), (this.height - margin * 2) / Math.max(1, (y1 - y0) * sy));
    return this.flyTo({ zoom: Math.min(this.camera.zoom, fit), x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
  }

  /** Where the player is right now: along their trip, or where they stand. */
  private playerAt(): Point | null {
    if (this.trip) return tripProgress(this.trip, Date.now()).at;
    return this.state ? this.state.where : null;
  }

  /** Every frame of a trip: move the player's marker; now and then, redraw the trail behind them. */
  private followTrip(): void {
    if (!this.trip) return;
    this.placePlayer();
    const now = performance.now();
    if (now - this.lastTrail > 400) {
      this.lastTrail = now;
      this.drawTrail();
    }
    this.liveFrame = requestAnimationFrame(() => this.followTrip());
  }

  // ───────────── Camera ─────────────

  /** Px per map unit at zoom 1, on each axis. Stretches a little to fill the stage, but only a little. */
  private units(): { sx: number; sy: number } {
    const ux = Math.max(1, this.width - PAD * 2) / 100;
    const uy = Math.max(1, this.height - PAD * 2) / 100;
    const fit = Math.min(ux, uy);
    return { sx: Math.min(ux, fit * MAX_STRETCH), sy: Math.min(uy, fit * MAX_STRETCH) };
  }

  /** Px per map unit at a zoom. */
  private scaleAt(zoom: number): number {
    const { sx, sy } = this.units();
    return Math.sqrt(sx * sy) * zoom;
  }

  private projector(camera = this.camera): (p: Point) => Px {
    const { sx, sy } = this.units();
    const kx = sx * camera.zoom;
    const ky = sy * camera.zoom;
    const ox = this.width / 2 - camera.x * kx;
    const oy = this.height / 2 - camera.y * ky;
    return (p) => ({ x: ox + p.x * kx, y: oy + p.y * ky });
  }

  private project(p: Point): Px {
    return this.projector()(p);
  }

  private unproject(q: Px, camera = this.camera): Point {
    const { sx, sy } = this.units();
    return { x: camera.x + (q.x - this.width / 2) / (sx * camera.zoom), y: camera.y + (q.y - this.height / 2) / (sy * camera.zoom) };
  }

  /** A camera at `zoom` that puts map point `p` under screen point `q`. */
  private pinned(p: Point, q: Px, zoom: number): Camera {
    const { sx, sy } = this.units();
    return { zoom, x: p.x - (q.x - this.width / 2) / (sx * zoom), y: p.y - (q.y - this.height / 2) / (sy * zoom) };
  }

  /** Keeps the zoom in range and the city on screen, with the same margin as at zoom 1. */
  private clamp(camera: Camera): Camera {
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom));
    const { sx, sy } = this.units();
    const axis = (center: number, view: number, unit: number) => {
      const half = (view / 2 - PAD) / (unit * zoom);
      return half >= 50 ? 50 : Math.min(100 - half, Math.max(half, center));
    };
    return { zoom, x: axis(camera.x, this.width, sx), y: axis(camera.y, this.height, sy) };
  }

  /** Eases the camera to a new spot. Resolves when it lands, or when a finger takes over. */
  private flyTo(target: Camera, duration = 420): Promise<void> {
    this.stopFlight();
    const to = this.clamp(target);
    const from = { ...this.camera };
    const still = Math.abs(to.zoom - from.zoom) < 1e-3 && Math.hypot(to.x - from.x, to.y - from.y) < 1e-3;
    if (this.reducedMotion || still) {
      this.camera = to;
      this.render();
      return Promise.resolve();
    }
    const ratio = to.zoom / from.zoom;
    return new Promise((resolve) => {
      const start = performance.now();
      const finish = () => {
        this.flight = null;
        this.moving = false;
        this.render();
        resolve();
      };
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        if (t >= 1) {
          this.camera = to;
          finish();
          return;
        }
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const zoom = from.zoom * Math.pow(ratio, e);
        // Move the center the way a zoom around one fixed point would, so the target doesn't swing.
        const w = Math.abs(ratio - 1) < 0.02 ? e : (1 - from.zoom / zoom) / (1 - 1 / ratio);
        this.camera = this.clamp({ zoom, x: from.x + (to.x - from.x) * w, y: from.y + (to.y - from.y) * w });
        this.moving = true;
        this.render();
        if (this.flight) this.flight.frame = requestAnimationFrame(step);
      };
      this.flight = { frame: requestAnimationFrame(step), finish };
    });
  }

  private stopFlight(): void {
    const flight = this.flight;
    if (!flight) return;
    cancelAnimationFrame(flight.frame);
    flight.finish();
  }

  private centerOnPlayer(): void {
    const here = this.playerAt();
    if (!here) return;
    const close = (PICK_SCALE * 1.6) / this.scaleAt(1);
    void this.flyTo({ zoom: Math.max(this.camera.zoom, close), x: here.x, y: here.y });
  }

  // ───────────── Gestures ─────────────

  private local(e: PointerEvent | WheelEvent): Px {
    // Measured once per gesture: asking every move would force a fresh layout each frame.
    this.stageRect ??= this.els.stage.getBoundingClientRect();
    return { x: e.clientX - this.stageRect.left, y: e.clientY - this.stageRect.top };
  }

  private onPointerDown(e: PointerEvent): void {
    this.swallowClick = false;
    if (!this.world || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // A primary pointer starts a fresh gesture, even if an earlier one lost its pointerup.
    if (e.isPrimary) this.pointers.clear();
    if (this.pointers.size === 0) this.stageRect = null;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('.map-zoom')) return;
    if (this.pointers.size === 0) {
      this.dragged = false;
      this.pressTarget = target;
    } else {
      // A second finger: this is a pinch, not a tap.
      this.dragged = true;
    }
    this.stopFlight();
    this.pointers.set(e.pointerId, this.local(e));
    this.beginGesture();
  }

  private beginGesture(): void {
    this.gesture = { camera: { ...this.camera }, start: new Map(this.pointers) };
  }

  private onPointerMove(e: PointerEvent): void {
    const gesture = this.gesture;
    if (!gesture || !this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, this.local(e));
    const [idA, idB] = [...gesture.start.keys()];
    const a0 = idA === undefined ? undefined : gesture.start.get(idA);
    const a1 = idA === undefined ? undefined : this.pointers.get(idA);
    if (!a0 || !a1) return;
    const b0 = idB === undefined ? undefined : gesture.start.get(idB);
    const b1 = idB === undefined ? undefined : this.pointers.get(idB);

    if (b0 && b1) {
      // Pinch: the map point under the fingers' midpoint stays under it.
      const spread = Math.hypot(b1.x - a1.x, b1.y - a1.y) / Math.max(1, Math.hypot(b0.x - a0.x, b0.y - a0.y));
      const anchor = this.unproject({ x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, gesture.camera);
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, gesture.camera.zoom * spread));
      this.camera = this.clamp(this.pinned(anchor, { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 }, zoom));
    } else {
      if (!this.dragged && Math.hypot(a1.x - a0.x, a1.y - a0.y) < DRAG_SLOP) return;
      this.dragged = true;
      const anchor = this.unproject(a0, gesture.camera);
      this.camera = this.clamp(this.pinned(anchor, a1, gesture.camera.zoom));
    }
    // Hold on to the fingers even if the marker they started on is redrawn away.
    const { stage } = this.els;
    try {
      if (!stage.hasPointerCapture(e.pointerId)) stage.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone.
    }
    stage.classList.add('is-dragging');
    this.moving = true;
    this.requestRender();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size > 0) {
      // One finger of a pinch lifted: carry on panning with the other.
      this.beginGesture();
      return;
    }
    this.gesture = null;
    this.els.stage.classList.remove('is-dragging');
    const at = this.local(e);
    this.stageRect = null;
    if (this.dragged) {
      this.swallowClick = true;
      this.settle();
      return;
    }
    // Markers handle their own taps.
    if (e.type !== 'pointerup' || this.pressTarget?.closest('.node')) return;
    this.tap(at);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.world) return;
    this.stopFlight();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // Trackpad pinches arrive as wheel events with ctrlKey and small deltas.
    const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0018));
    const q = this.local(e);
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.camera.zoom * factor));
    this.camera = this.clamp(this.pinned(this.unproject(q), q, zoom));
    this.moving = true;
    this.requestRender();
    window.clearTimeout(this.settleTimer);
    this.settleTimer = window.setTimeout(() => this.settle(), 160);
  }

  /** A full-quality frame once the map stops moving. */
  private settle(): void {
    this.stageRect = null;
    this.moving = false;
    this.render();
  }

  private requestRender(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.render();
    });
  }

  /**
   * Zoomed out, a tap flies in to the block under it. Close in, a tap picks the building under
   * it, or the spot on the street. Tapping what's already picked means go there.
   */
  private tap(q: Px): void {
    const world = this.world;
    if (!world) return;
    if (this.scaleAt(this.camera.zoom) < PICK_SCALE) {
      this.zoomToBlock(q);
      return;
    }
    const id = buildingAt(this.hits, q);
    const building = id ? this.buildings.get(id) : undefined;
    if (building && this.revealed({ x: building.x + building.w / 2, y: building.y + building.h / 2 })) {
      if (this.target?.kind === 'building' && this.target.id === building.id) this.handlers.onGo();
      else this.handlers.onSelect({ kind: 'building', id: building.id });
      return;
    }
    const p = this.unproject(q);
    if (p.x < 0 || p.y < 0 || p.x > 100 || p.y > 100 || this.inSea(p)) return;
    const pinned = this.target?.kind === 'point' ? this.project(this.target.point) : null;
    if (pinned && Math.hypot(pinned.x - q.x, pinned.y - q.y) <= PIN_REACH) this.handlers.onGo();
    else this.handlers.onSelect({ kind: 'point', point: p });
  }

  private zoomToBlock(q: Px): void {
    const world = this.world;
    if (!world) return;
    const p = this.unproject(q);
    const block = blockAt(world.layout, p);
    if (!block) {
      void this.flyTo(this.pinned(p, q, this.camera.zoom * 2));
      return;
    }
    const { sx, sy } = this.units();
    // Big enough to pick out every building, with the neighbors still in sight.
    const fit = Math.min((this.width * 0.6) / ((block.x1 - block.x0) * sx), (this.height * 0.6) / ((block.y1 - block.y0) * sy));
    const zoom = Math.min(MAX_ZOOM, Math.max((PICK_SCALE * 1.5) / this.scaleAt(1), fit));
    void this.flyTo({ zoom, x: (block.x0 + block.x1) / 2, y: (block.y0 + block.y1) / 2 });
  }

  /** Whether a map point is out of the fog. */
  private revealed(p: Point): boolean {
    const ctx = this.mask.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    const x = Math.min(this.mask.width - 1, Math.max(0, Math.floor(p.x * MASK_SCALE)));
    const y = Math.min(this.mask.height - 1, Math.max(0, Math.floor(p.y * MASK_SCALE)));
    return (ctx.getImageData(x, y, 1, 1).data[3] ?? 0) > 110;
  }

  // ───────────── Drawing ─────────────

  private render(): void {
    const { world, state } = this;
    const { stage, progress } = this.els;
    this.width = stage.clientWidth;
    this.height = stage.clientHeight;
    if (!world || !state || !this.width || !this.height) return;
    this.camera = this.clamp(this.camera);

    const project = this.projector();
    const markerBoxes = new Map<string, Box>();
    const box = (p: Px): Box => ({ x: p.x - MARKER_BOX / 2, y: p.y - MARKER_BOX / 2, w: MARKER_BOX, h: MARKER_BOX });
    for (const location of Object.values(world.locations)) {
      if (state.discovered.has(location.id)) markerBoxes.set(location.id, box(project(location)));
    }
    for (const station of Object.values(world.transit.stations)) markerBoxes.set(station.id, box(project(station)));

    const controls = this.controlsBox();
    const labelBoxes = this.placeLabels(world, state, markerBoxes, controls);
    const obstacles = [...markerBoxes.values(), ...labelBoxes.values(), ...this.routeSamples(world, state), controls];
    this.drawCanvas(world, state, obstacles);
    this.drawRoutes(world, state);
    this.drawMarkers(world, state, labelBoxes);
    this.placePlayer();
    progress.textContent = `Mapped ${state.visited.size}/${Object.keys(world.locations).length}`;
    this.updateReadout(world);
    this.updateControls();
  }

  /** The player's marker, and the radar sweep that follows them. */
  private placePlayer(): void {
    const here = this.playerAt();
    if (!here || !this.width) return;
    const p = this.project(here);
    const { player, sweep } = this.els;
    player.style.transform = `translate(${p.x}px, ${p.y}px)`;
    player.classList.toggle('is-moving', Boolean(this.trip));
    sweep.style.left = `${p.x}px`;
    sweep.style.top = `${p.y}px`;
  }

  private drawCanvas(world: World, state: MapState, obstacles: Box[]): void {
    const { city } = this.els;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fitCanvas(city, this.width, this.height, dpr);
    const ctx = city.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const known = new Set(Object.values(world.locations).flatMap((l) => (state.discovered.has(l.id) ? [l.district] : [])));
    const view: View = {
      width: this.width,
      height: this.height,
      scale: this.scaleAt(this.camera.zoom),
      fast: this.moving,
      project: this.projector(),
    };
    this.hits = drawCity(ctx, world, view, known);
    this.drawFog(ctx, view, dpr);
    const selected = this.target?.kind === 'building' ? this.hits.find((hit) => this.target?.kind === 'building' && hit.id === this.target.id) : undefined;
    if (selected) drawSelection(ctx, selected, view);
    this.drawDistrictNames(
      ctx,
      Object.values(world.districts).filter((d) => known.has(d.id)),
      obstacles,
    );
  }

  /** Paints where the fog lifts: around every street walked and every place known. Done once per change. */
  private drawMask(): void {
    const { world, state } = this;
    const m = this.mask.getContext('2d', { willReadFrequently: true });
    if (!world || !state || !m) return;
    m.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
    m.clearRect(0, 0, 100, 100);
    const clear = (p: Point, radius: number) => {
      const glow = m.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
      glow.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      m.fillStyle = glow;
      m.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
    };
    for (const cell of state.explored) clear(cellCenter(cell), CELL * 1.25);
    for (const location of Object.values(world.locations)) {
      if (state.discovered.has(location.id)) clear(location, state.visited.has(location.id) ? CLEAR_VISITED : CLEAR_KNOWN);
    }
  }

  /** Darkness over the whole city, cut away where the mask says the player has been or knows of. */
  private drawFog(ctx: CanvasRenderingContext2D, view: View, dpr: number): void {
    const { fog, width, height } = this;
    // The fog is all soft gradients, so a quarter of the pixels look the same and draw far faster.
    const density = Math.min(dpr, 1) * FOG_DENSITY;
    fitCanvas(fog, width, height, density);
    const f = fog.getContext('2d');
    if (!f) return;
    f.setTransform(density, 0, 0, density, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, width, height);
    f.fillStyle = 'rgba(3, 4, 9, 0.86)';
    f.fillRect(0, 0, width, height);
    f.globalCompositeOperation = 'destination-out';
    f.imageSmoothingEnabled = true;
    const a = view.project({ x: 0, y: 0 });
    const b = view.project({ x: 100, y: 100 });
    f.drawImage(this.mask, a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.drawImage(fog, 0, 0, width, height);
  }

  /**
   * Big district names across their territory, fading out as you zoom in. Each tries spots
   * around the district's center, at full size and then smaller, and takes the first clear of
   * markers, labels, routes and the other names. A name with no clear spot is left off rather
   * than drawn over something.
   */
  private drawDistrictNames(ctx: CanvasRenderingContext2D, districts: District[], obstacles: Box[]): void {
    const fade = Math.min(1, Math.max(0, (NAMES_GONE - this.camera.zoom) / (NAMES_GONE - MIN_ZOOM)));
    if (fade === 0) return;
    const base = Math.max(11, Math.min(22, Math.min(this.width, this.height) / 20));
    const taken = [...obstacles];
    const project = this.projector();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const district of districts) {
      const text = district.name.toUpperCase();
      const c = project(district);
      // Zoomed in, a district whose middle is off screen doesn't get its name pinned to the edge.
      if (c.x < 0 || c.y < 0 || c.x > this.width || c.y > this.height) continue;
      for (const size of [Math.round(base), Math.round(base * 0.72)]) {
        ctx.font = `800 ${size}px Orbitron, "Share Tech Mono", sans-serif`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${(size * 0.3).toFixed(1)}px`;
        const textWidth = ctx.measureText(text).width;
        const boxAt = (p: Px) => ({ x: p.x - textWidth / 2, y: p.y - size / 2, w: textWidth, h: size });
        let spot: Px | null = null;
        for (const dy of [0, -1.5, 1.5, -3, 3, -4.5, 4.5]) {
          for (const dx of [0, -0.3, 0.3, -0.6, 0.6]) {
            const p = {
              x: Math.max(textWidth / 2 + 6, Math.min(this.width - textWidth / 2 - 6, c.x + dx * textWidth)),
              y: Math.max(size, Math.min(this.height - size, c.y + dy * size)),
            };
            if (taken.every((o) => overlap(boxAt(p), o) === 0)) {
              spot = p;
              break;
            }
          }
          if (spot) break;
        }
        if (!spot) continue;
        taken.push(boxAt(spot));
        ctx.shadowColor = district.theme.primary;
        ctx.shadowBlur = this.moving ? 0 : 12;
        ctx.fillStyle = hexToRgba(district.theme.primary, 0.42 * fade);
        ctx.fillText(text, spot.x, spot.y);
        break;
      }
    }
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  /** The footer says what you're looking at: the whole city, or which block is in the middle. */
  private updateReadout(world: World): void {
    const { coords } = this.els;
    if (this.scaleAt(this.camera.zoom) < PICK_SCALE) {
      coords.textContent = 'City view · Tap a block';
      return;
    }
    const center = { x: this.camera.x, y: this.camera.y };
    const block = blockAt(world.layout, center);
    const district = districtAt(Object.values(world.districts), center);
    coords.textContent = block ? `Block ${block.address}${district ? ` · ${district.name}` : ''}` : 'Street view';
  }

  private updateControls(): void {
    const { zoomIn, zoomOut } = this.els;
    zoomIn.disabled = this.camera.zoom >= MAX_ZOOM - 0.01;
    zoomOut.disabled = this.camera.zoom <= MIN_ZOOM + 0.01;
  }

  private controlsBox(): Box {
    const { controls } = this.els;
    return { x: controls.offsetLeft - 4, y: controls.offsetTop - 4, w: controls.offsetWidth + 8, h: controls.offsetHeight + 8 };
  }

  // ───────────── Routes ─────────────

  /** The trip's whole path, end to end. */
  private tripPath(trip: Trip): Point[] {
    const points: Point[] = [];
    for (const leg of trip.legs) points.push(...(points.length ? leg.path.slice(1) : leg.path));
    return points;
  }

  /** How far along its whole path the trip has got, in map units. */
  private tripDistanceDone(trip: Trip): number {
    const { leg, legDone } = tripProgress(trip, Date.now());
    let distance = 0;
    trip.legs.forEach((l, i) => {
      if (i < leg) distance += pathLength(l.path);
      else if (i === leg) distance += pathLength(l.path) * legDone;
    });
    return distance;
  }

  private drawRoutes(world: World, state: MapState): void {
    const { routes } = this.els;
    const project = this.projector();
    const defs = document.createElementNS(SVG_NS, 'defs');
    const lines: SVGElement[] = [];
    let gradientId = 0;

    // The NCART network underneath everything.
    for (const line of world.transit.lines) {
      const points = line.stations.map((id) => world.transit.stations[id]).filter((s): s is Station => Boolean(s));
      const track = polyline(points.map(project));
      track.setAttribute('class', 'ncart-line');
      track.setAttribute('stroke', line.color);
      lines.push(track);
    }

    const here = state.where.place;
    for (const a of Object.values(world.locations)) {
      for (const id of a.links) {
        const b = world.locations[id];
        if (!b || a.id > b.id) continue;
        const aKnown = state.discovered.has(a.id);
        const bKnown = state.discovered.has(b.id);
        if (!aKnown && !bKnown) continue;
        const line = polyline(streetPath(a, b).map(project));
        if (aKnown && bKnown) {
          const gid = `route-${++gradientId}`;
          defs.append(gradient(gid, project(a), project(b), colorOf(world, a), colorOf(world, b)));
          line.setAttribute('stroke', `url(#${gid})`);
          line.setAttribute('class', !this.trip && (a.id === here || b.id === here) ? 'route is-live' : 'route');
        } else {
          line.setAttribute('class', 'route is-hint');
        }
        lines.push(line);
      }
    }

    // The way to whatever is picked.
    if (this.preview.path && this.preview.path.length > 1) {
      const plan = polyline(this.preview.path.map(project));
      plan.setAttribute('class', 'route-plan');
      lines.push(plan);
    }

    // The trip underway: the way ahead, and the trail behind.
    if (this.trip) {
      const ahead = polyline(this.tripPath(this.trip).map(project));
      ahead.setAttribute('class', 'trip-path');
      const behind = polyline([]);
      behind.setAttribute('class', 'trip-done');
      lines.push(ahead, behind);
    }

    routes.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    routes.replaceChildren(defs, ...lines);
    this.drawTrail();
  }

  /** Redraws just the part of the trip already behind the player. */
  private drawTrail(): void {
    const behind = this.els.routes.querySelector('.trip-done');
    if (!behind || !this.trip) return;
    const project = this.projector();
    const done = pathUpTo(this.tripPath(this.trip), this.tripDistanceDone(this.trip));
    behind.setAttribute('points', done.map((p) => project(p)).map((p) => `${p.x},${p.y}`).join(' '));
  }

  // ───────────── Markers ─────────────

  /** Small boxes along every visible route, so district names keep off the lines. */
  private routeSamples(world: World, state: MapState): Box[] {
    const project = this.projector();
    const samples: Box[] = [];
    const sample = (points: Px[]) => {
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (!a || !b) continue;
        const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 8));
        for (let k = 0; k <= steps; k++) {
          const x = a.x + ((b.x - a.x) * k) / steps;
          const y = a.y + ((b.y - a.y) * k) / steps;
          samples.push({ x: x - 4, y: y - 4, w: 8, h: 8 });
        }
      }
    };
    for (const a of Object.values(world.locations)) {
      for (const id of a.links) {
        const b = world.locations[id];
        if (b && a.id < b.id && (state.discovered.has(a.id) || state.discovered.has(b.id))) {
          sample(streetPath(a, b).map(project));
        }
      }
    }
    for (const line of world.transit.lines) {
      sample(line.stations.map((id) => world.transit.stations[id]).filter((s): s is Station => Boolean(s)).map(project));
    }
    if (this.preview.path) sample(this.preview.path.map(project));
    if (this.trip) sample(this.tripPath(this.trip).map(project));
    return samples;
  }

  /**
   * Where you are and what you've picked always get a label. Places a route away get one if it
   * fits, and so do stations once you're zoomed in.
   */
  private placeLabels(world: World, state: MapState, markerBoxes: Map<string, Box>, controls: Box): Map<string, Box> {
    const here = this.trip ? null : (state.where.place ?? state.where.station);
    const picked = this.target?.kind === 'place' || this.target?.kind === 'station' ? this.target.id : null;
    const neighbors = (state.where.place && world.locations[state.where.place]?.links) || [];
    const close = this.scaleAt(this.camera.zoom) >= PICK_SCALE;
    const wanted = [
      ...(here ? [here] : []),
      ...(picked ? [picked] : []),
      ...neighbors.filter((id) => state.discovered.has(id)),
      ...this.preview.stations,
      ...(close ? Object.keys(world.transit.stations) : []),
    ];
    const labelBoxes = new Map<string, Box>();
    const placed: Box[] = [controls];
    for (const id of wanted) {
      const spot = world.locations[id] ?? world.transit.stations[id];
      if (!spot || labelBoxes.has(id)) continue;
      const forced = id === here || id === picked;
      const box = this.placeLabel(spot, placed, markerBoxes, forced);
      if (box) {
        labelBoxes.set(id, box);
        placed.push(box);
      }
    }
    return labelBoxes;
  }

  private drawMarkers(world: World, state: MapState, labelBoxes: Map<string, Box>): void {
    const { nodes } = this.els;
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.node;
    const neighbors = new Set((state.where.place && world.locations[state.where.place]?.links) || []);

    const markers: HTMLElement[] = [];
    for (const location of Object.values(world.locations).sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (!state.discovered.has(location.id)) continue;
      markers.push(this.renderPlace(world, location, state, neighbors, labelBoxes.get(location.id)));
    }
    for (const station of Object.values(world.transit.stations)) {
      markers.push(this.renderStation(world, station, state, labelBoxes.get(station.id)));
    }
    if (this.target?.kind === 'point') {
      const p = this.project(this.target.point);
      const pin = document.createElement('div');
      pin.className = 'pin';
      pin.style.cssText = `left:${p.x}px;top:${p.y}px`;
      markers.push(pin);
    }
    nodes.replaceChildren(...markers);
    if (focusedId) nodes.querySelector<HTMLElement>(`[data-node="${focusedId}"]`)?.focus({ preventScroll: true });
  }

  /**
   * Tries each side of a marker. Takes the first spot that covers nothing; if none does,
   * a forced label takes the least-bad spot and any other label is left off.
   */
  private placeLabel(spot: Location | Station, placed: Box[], markers: Map<string, Box>, forced: boolean): Box | null {
    const p = this.project(spot);
    const w = spot.name.length * CHAR_WIDTH + 12;
    const h = LABEL_HEIGHT;
    const right = { x: p.x + LABEL_GAP, y: p.y - h / 2, w, h };
    const left = { x: p.x - LABEL_GAP - w, y: p.y - h / 2, w, h };
    const above = { x: p.x - w / 2, y: p.y - LABEL_GAP - h, w, h };
    const below = { x: p.x - w / 2, y: p.y + LABEL_GAP, w, h };
    const candidates = p.x < this.width / 2 ? [right, left, above, below] : [left, right, above, below];

    const cost = (box: Box) => {
      let covered = placed.reduce((sum, other) => sum + overlap(box, other), 0);
      for (const [id, marker] of markers) if (id !== spot.id) covered += overlap(box, marker);
      return covered + this.outOfBounds(box) * 4;
    };
    const clean = candidates.find((box) => cost(box) === 0);
    if (clean) return clean;
    if (!forced) return null;
    return candidates.reduce((best, box) => (cost(box) < cost(best) ? box : best));
  }

  /** A marker button: the picked thing taps through to going there; the player's own spot clears the pick. */
  private marker(id: string, name: string, at: Px, color: string, classes: string[], labelBox: Box | undefined, onTap: () => void): HTMLElement {
    const node = document.createElement('button');
    node.type = 'button';
    node.dataset.node = id;
    node.title = name;
    node.className = ['node', ...classes].filter(Boolean).join(' ');
    node.style.cssText = `left:${at.x}px;top:${at.y}px;--node:${color}`;
    const mark = document.createElement('span');
    mark.className = 'node-mark';
    node.append(mark);
    if (labelBox) {
      const label = document.createElement('span');
      label.className = 'node-label';
      label.textContent = name;
      label.style.transform = `translate(${labelBox.x - at.x}px, ${labelBox.y - at.y}px)`;
      node.append(label);
    }
    node.addEventListener('click', onTap);
    return node;
  }

  private renderPlace(world: World, location: Location, state: MapState, neighbors: Set<string>, labelBox: Box | undefined): HTMLElement {
    const district = world.districts[location.district]?.name ?? '';
    const isHere = !this.trip && state.where.place === location.id;
    const isPicked = this.target?.kind === 'place' && this.target.id === location.id;
    const node = this.marker(
      location.id,
      location.name,
      this.project(location),
      colorOf(world, location),
      [
        isHere ? 'is-here' : neighbors.has(location.id) ? 'is-adjacent' : 'is-known',
        state.visited.has(location.id) ? 'is-visited' : 'is-unexplored',
        isPicked ? 'is-selected' : '',
      ],
      labelBox,
      () => {
        if (isPicked) this.handlers.onGo();
        else this.handlers.onSelect(isHere ? null : { kind: 'place', id: location.id });
      },
    );
    if (isHere) {
      node.setAttribute('aria-current', 'location');
      node.setAttribute('aria-label', `You are here: ${location.name}, ${district}`);
    } else {
      node.setAttribute('aria-pressed', String(isPicked));
      node.setAttribute('aria-label', `${location.name}, ${district}${state.visited.has(location.id) ? '' : ', unexplored'}`);
    }
    return node;
  }

  private renderStation(world: World, station: Station, state: MapState, labelBox: Box | undefined): HTMLElement {
    const isHere = !this.trip && state.where.station === station.id;
    const isPicked = this.target?.kind === 'station' && this.target.id === station.id;
    const color = world.transit.lines.find((l) => l.id === station.lines[0])?.color ?? '#ffd84d';
    const node = this.marker(
      station.id,
      station.name,
      this.project(station),
      color,
      ['station', isHere ? 'is-here' : '', isPicked ? 'is-selected' : '', this.preview.stations.includes(station.id) ? 'is-boarding' : ''],
      labelBox,
      () => {
        if (isPicked) this.handlers.onGo();
        else this.handlers.onSelect(isHere ? null : { kind: 'station', id: station.id });
      },
    );
    node.setAttribute('aria-label', `${station.name}, NCART${isHere ? ', you are here' : ''}`);
    if (!isHere) node.setAttribute('aria-pressed', String(isPicked));
    return node;
  }

  private outOfBounds(box: Box): number {
    return box.w * box.h - overlap(box, { x: 2, y: 2, w: this.width - 4, h: this.height - 4 });
  }
}

// ───────────── Helpers ─────────────

/** Whether two picks are the same thing. */
export function sameTarget(a: Target | null, b: Target | null): boolean {
  if (!a || !b || a.kind !== b.kind) return a === b;
  if (a.kind === 'point' && b.kind === 'point') return Math.hypot(a.point.x - b.point.x, a.point.y - b.point.y) < 0.01;
  return 'id' in a && 'id' in b && a.id === b.id;
}

/** Sizes a canvas to the stage at the screen's pixel density, leaving it alone if it already fits. */
function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): void {
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

function polyline(points: Px[]): SVGPolylineElement {
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
  return line;
}

function gradient(id: string, from: Px, to: Px, fromColor: string, toColor: string): SVGLinearGradientElement {
  const g = document.createElementNS(SVG_NS, 'linearGradient');
  g.setAttribute('id', id);
  g.setAttribute('gradientUnits', 'userSpaceOnUse');
  g.setAttribute('x1', `${from.x}`);
  g.setAttribute('y1', `${from.y}`);
  g.setAttribute('x2', `${to.x}`);
  g.setAttribute('y2', `${to.y}`);
  for (const [offset, color] of [
    ['0', fromColor],
    ['1', toColor],
  ] as const) {
    const stop = document.createElementNS(SVG_NS, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    g.append(stop);
  }
  return g;
}

function colorOf(world: World, location: Location): string {
  return world.districts[location.district]?.theme.primary ?? '#ffffff';
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
