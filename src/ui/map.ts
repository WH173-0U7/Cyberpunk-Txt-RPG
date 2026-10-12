import { blockAt } from '../engine/buildings';
import { streetPath } from '../engine/generate';
import { districtAt } from '../engine/geography';
import type { Building, District, Location, MapState, Point, World } from '../engine/types';
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
/** Px per map unit from which a tap picks a building. Further out, a tap zooms into the block. */
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

/** Where the map is looking: how far in, and the map point at the middle of the stage. */
interface Camera {
  zoom: number;
  x: number;
  y: number;
}

export interface MapElements {
  stage: HTMLElement;
  city: HTMLCanvasElement;
  routes: SVGSVGElement;
  nodes: HTMLElement;
  sweep: HTMLElement;
  tracer: HTMLElement;
  progress: HTMLElement;
  coords: HTMLElement;
  controls: HTMLElement;
  zoomIn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
  zoomHome: HTMLButtonElement;
}

export interface MapHandlers {
  /** A marker was tapped (null: the player's own position). */
  onSelect(id: string | null): void;
  /** The already-selected marker was tapped again. */
  onTravel(id: string): void;
  /** A building was tapped (null: a tap on open street, clearing it). */
  onSelectBuilding(id: string | null): void;
}

/**
 * The city: streets and buildings drawn to canvas, fog over everything unexplored, routes that
 * follow the streets, and tappable markers. Drag to pan, pinch or scroll to zoom. Zoomed out, a
 * tap on a block flies in to it; close enough in, a tap picks out a single building.
 */
export class CityMap {
  private world: World | null = null;
  private state: MapState | null = null;
  private selected: string | null = null;
  private selectedBuilding: string | null = null;
  private plannedRoute: string[] = [];
  private buildings = new Map<string, Building>();
  private hits: BuildingHit[] = [];
  private camera: Camera = { zoom: 1, x: 50, y: 50 };
  private width = 0;
  private height = 0;
  private traveling = false;
  /** While the map is being dragged or flown, frames skip the costly glows. */
  private moving = false;
  private frame = 0;
  private flight: { frame: number; finish(): void } | null = null;
  private settleTimer: number | undefined;
  private readonly fog = document.createElement('canvas');

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

  get selection(): string | null {
    return this.selected;
  }

  get buildingSelection(): string | null {
    return this.selectedBuilding;
  }

  setWorld(world: World): void {
    this.stopFlight();
    this.world = world;
    this.state = null;
    this.selected = null;
    this.selectedBuilding = null;
    this.plannedRoute = [];
    this.buildings = new Map(world.buildings.map((b) => [b.id, b]));
    this.camera = { zoom: 1, x: 50, y: 50 };
  }

  update(state: MapState): void {
    this.state = state;
    if (this.selected === state.current || (this.selected && !state.discovered.has(this.selected))) {
      this.selected = null;
      this.plannedRoute = [];
    }
    this.render();
  }

  /** Highlights a destination and the route there; null clears it. Clears any building. */
  select(id: string | null, route: string[] = []): void {
    this.selected = id;
    this.plannedRoute = id ? route : [];
    this.selectedBuilding = null;
    this.render();
  }

  /** Outlines a building; null clears it. Clears any destination. */
  selectBuilding(id: string | null): void {
    this.selectedBuilding = id && this.buildings.has(id) ? id : null;
    this.selected = null;
    this.plannedRoute = [];
    this.render();
  }

  /** Zooms in (factor above 1) or out around the middle of the map. */
  zoomBy(factor: number): void {
    if (this.traveling) return;
    void this.flyTo({ ...this.camera, zoom: this.camera.zoom * factor }, 280);
  }

  /** Brings the whole route into view, then runs a tracer along its streets. Resolves on arrival. */
  async animateRoute(route: string[]): Promise<void> {
    const world = this.world;
    if (!world || route.length < 2) return;
    const { stage } = this.els;
    this.traveling = true;
    stage.classList.add('is-traveling');
    this.updateControls();
    try {
      await this.bringIntoView(this.routeCorners(route));
      if (!this.reducedMotion) await this.runTracer(route);
    } finally {
      this.traveling = false;
      stage.classList.remove('is-traveling');
      this.updateControls();
    }
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

  /** Zooms out, if it has to, until every point is on screen. */
  private bringIntoView(points: Point[]): Promise<void> {
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

  private centerOnPlayer(): void {
    const here = this.state && this.world?.locations[this.state.current];
    if (!here || this.traveling) return;
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
    if (this.traveling || !this.world || (e.pointerType === 'mouse' && e.button !== 0)) return;
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
    if (this.traveling || !this.world) return;
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

  /** Zoomed out, a tap flies in to the block under it. Close in, a tap picks the building under it. */
  private tap(q: Px): void {
    const world = this.world;
    if (!world) return;
    if (this.scaleAt(this.camera.zoom) < PICK_SCALE) {
      this.zoomToBlock(q);
      return;
    }
    const id = buildingAt(this.hits, q);
    const building = id ? this.buildings.get(id) : undefined;
    if (building && this.revealed(this.project({ x: building.x + building.w / 2, y: building.y + building.h / 2 }))) {
      if (building.id !== this.selectedBuilding) this.handlers.onSelectBuilding(building.id);
    } else if (this.selectedBuilding) {
      this.handlers.onSelectBuilding(null);
    }
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

  /** Whether a screen point is out of the fog, near enough to somewhere the player knows. */
  private revealed(q: Px): boolean {
    const { world, state } = this;
    if (!world || !state) return false;
    const scale = this.scaleAt(this.camera.zoom);
    const project = this.projector();
    return Object.values(world.locations).some((location) => {
      if (!state.discovered.has(location.id)) return false;
      const p = project(location);
      const radius = (state.visited.has(location.id) ? CLEAR_VISITED : CLEAR_KNOWN) * scale * 0.75;
      return Math.hypot(p.x - q.x, p.y - q.y) < radius;
    });
  }

  // ───────────── Drawing ─────────────

  private render(): void {
    const { world, state } = this;
    const { stage, sweep, progress } = this.els;
    this.width = stage.clientWidth;
    this.height = stage.clientHeight;
    if (!world || !state || !this.width || !this.height) return;
    this.camera = this.clamp(this.camera);

    const project = this.projector();
    const markerBoxes = new Map<string, Box>();
    for (const location of Object.values(world.locations)) {
      if (!state.discovered.has(location.id)) continue;
      const p = project(location);
      markerBoxes.set(location.id, { x: p.x - MARKER_BOX / 2, y: p.y - MARKER_BOX / 2, w: MARKER_BOX, h: MARKER_BOX });
    }

    const controls = this.controlsBox();
    const labelBoxes = this.placeLabels(world, state, markerBoxes, controls);
    const obstacles = [...markerBoxes.values(), ...labelBoxes.values(), ...this.routeSamples(world, state), controls];
    this.drawCanvas(world, state, obstacles);
    this.drawRoutes(world, state);
    this.drawMarkers(world, state, labelBoxes);

    const here = world.locations[state.current];
    if (here) {
      const p = project(here);
      sweep.style.left = `${p.x}px`;
      sweep.style.top = `${p.y}px`;
    }
    progress.textContent = `Mapped ${state.visited.size}/${Object.keys(world.locations).length}`;
    this.updateReadout(world);
    this.updateControls();
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
    this.drawFog(ctx, world, state, view, dpr);
    const selected = this.selectedBuilding ? this.hits.find((hit) => hit.id === this.selectedBuilding) : undefined;
    if (selected) drawSelection(ctx, selected, view);
    this.drawDistrictNames(
      ctx,
      Object.values(world.districts).filter((d) => known.has(d.id)),
      obstacles,
    );
  }

  /** Darkness over the whole city, cut away around everywhere the player knows. */
  private drawFog(ctx: CanvasRenderingContext2D, world: World, state: MapState, view: View, dpr: number): void {
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
    for (const location of Object.values(world.locations)) {
      if (!state.discovered.has(location.id)) continue;
      const p = view.project(location);
      const r = (state.visited.has(location.id) ? CLEAR_VISITED : CLEAR_KNOWN) * view.scale;
      if (p.x + r < 0 || p.y + r < 0 || p.x - r > width || p.y - r > height) continue;
      const glow = f.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
      glow.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      f.fillStyle = glow;
      f.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
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
    const { zoomIn, zoomOut, zoomHome } = this.els;
    zoomIn.disabled = this.traveling || this.camera.zoom >= MAX_ZOOM - 0.01;
    zoomOut.disabled = this.traveling || this.camera.zoom <= MIN_ZOOM + 0.01;
    zoomHome.disabled = this.traveling;
  }

  private controlsBox(): Box {
    const { controls } = this.els;
    return { x: controls.offsetLeft - 4, y: controls.offsetTop - 4, w: controls.offsetWidth + 8, h: controls.offsetHeight + 8 };
  }

  // ───────────── Routes ─────────────

  /** The street corners a multi-stop route passes through, in map units. */
  private routeCorners(route: string[]): Point[] {
    const world = this.world;
    if (!world) return [];
    const points: Point[] = [];
    for (let i = 1; i < route.length; i++) {
      const a = world.locations[route[i - 1] ?? ''];
      const b = world.locations[route[i] ?? ''];
      if (!a || !b) continue;
      const leg = streetPath(a, b);
      points.push(...(points.length ? leg.slice(1) : leg));
    }
    return points;
  }

  private routePoints(route: string[]): Px[] {
    const project = this.projector();
    return this.routeCorners(route).map(project);
  }

  /** Runs a tracer along the route's streets and lights the path behind it. */
  private async runTracer(route: string[]): Promise<void> {
    const points = this.routePoints(route);
    if (points.length < 2) return;
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      cumulative.push((cumulative[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
    }
    const total = cumulative.at(-1) ?? 0;
    if (total === 0) return;

    const { routes, tracer } = this.els;
    const duration = Math.min(1600, 340 + total * 1.5);
    const easing = 'cubic-bezier(0.45, 0, 0.55, 1)';

    const trail = document.createElementNS(SVG_NS, 'polyline');
    trail.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
    trail.setAttribute('class', 'route-trace');
    trail.style.strokeDasharray = `${total}`;
    routes.append(trail);
    trail.animate([{ strokeDashoffset: total }, { strokeDashoffset: 0 }], { duration, easing, fill: 'forwards' });

    tracer.hidden = false;
    const run = tracer.animate(
      points.map((p, i) => ({ transform: `translate(${p.x}px, ${p.y}px)`, offset: (cumulative[i] ?? 0) / total })),
      { duration, easing },
    );
    try {
      await run.finished;
    } catch {
      // Cancelled (e.g. the map re-rendered mid-trip); arrive anyway.
    } finally {
      tracer.hidden = true;
    }
  }

  private drawRoutes(world: World, state: MapState): void {
    const { routes } = this.els;
    const project = this.projector();
    const defs = document.createElementNS(SVG_NS, 'defs');
    const lines: SVGElement[] = [];
    let gradientId = 0;

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
          line.setAttribute('class', a.id === state.current || b.id === state.current ? 'route is-live' : 'route');
        } else {
          line.setAttribute('class', 'route is-hint');
        }
        lines.push(line);
      }
    }

    // The way to the selected destination, drawn on top.
    if (this.plannedRoute.length > 1) {
      const plan = polyline(this.routePoints(this.plannedRoute));
      plan.setAttribute('class', 'route-plan');
      lines.push(plan);
    }

    routes.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    routes.replaceChildren(defs, ...lines);
  }

  // ───────────── Markers ─────────────

  /** Small boxes along every visible route (hints included), so district names keep off the lines. */
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
    sample(this.routePoints(this.plannedRoute));
    return samples;
  }

  /** Where you are and your selection always get a label; places one step away only if they fit. */
  private placeLabels(world: World, state: MapState, markerBoxes: Map<string, Box>, controls: Box): Map<string, Box> {
    const neighbors = new Set(world.locations[state.current]?.links ?? []);
    const labelBoxes = new Map<string, Box>();
    const placed: Box[] = [controls];
    const wanted = [
      state.current,
      ...(this.selected ? [this.selected] : []),
      ...[...neighbors].filter((id) => state.discovered.has(id) && id !== this.selected),
    ];
    for (const id of wanted) {
      const location = world.locations[id];
      if (!location || labelBoxes.has(id)) continue;
      const forced = id === state.current || id === this.selected;
      const box = this.placeLabel(location, placed, markerBoxes, forced);
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
    const neighbors = new Set(world.locations[state.current]?.links ?? []);

    const markers: HTMLElement[] = [];
    for (const location of Object.values(world.locations).sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (!state.discovered.has(location.id)) continue;
      markers.push(this.renderMarker(world, location, state, neighbors, labelBoxes.get(location.id)));
    }
    nodes.replaceChildren(...markers);
    if (focusedId) nodes.querySelector<HTMLElement>(`[data-node="${focusedId}"]`)?.focus({ preventScroll: true });
  }

  /**
   * Tries each side of a marker. Takes the first spot that covers nothing; if none does,
   * a forced label takes the least-bad spot and any other label is left off.
   */
  private placeLabel(location: Location, placed: Box[], markers: Map<string, Box>, forced: boolean): Box | null {
    const p = this.project(location);
    const w = location.name.length * CHAR_WIDTH + 12;
    const h = LABEL_HEIGHT;
    const right = { x: p.x + LABEL_GAP, y: p.y - h / 2, w, h };
    const left = { x: p.x - LABEL_GAP - w, y: p.y - h / 2, w, h };
    const above = { x: p.x - w / 2, y: p.y - LABEL_GAP - h, w, h };
    const below = { x: p.x - w / 2, y: p.y + LABEL_GAP, w, h };
    const candidates = p.x < this.width / 2 ? [right, left, above, below] : [left, right, above, below];

    const cost = (box: Box) => {
      let covered = placed.reduce((sum, other) => sum + overlap(box, other), 0);
      for (const [id, marker] of markers) if (id !== location.id) covered += overlap(box, marker);
      return covered + this.outOfBounds(box) * 4;
    };
    const clean = candidates.find((box) => cost(box) === 0);
    if (clean) return clean;
    if (!forced) return null;
    return candidates.reduce((best, box) => (cost(box) < cost(best) ? box : best));
  }

  private renderMarker(world: World, location: Location, state: MapState, neighbors: Set<string>, labelBox: Box | undefined): HTMLElement {
    const p = this.project(location);
    const district = world.districts[location.district]?.name ?? '';
    const isHere = location.id === state.current;
    const node = document.createElement('button');
    node.type = 'button';
    node.dataset.node = location.id;
    node.title = location.name;
    node.className = [
      'node',
      isHere ? 'is-current' : neighbors.has(location.id) ? 'is-adjacent' : 'is-known',
      state.visited.has(location.id) ? 'is-visited' : 'is-unexplored',
      location.id === this.selected ? 'is-selected' : '',
    ]
      .filter(Boolean)
      .join(' ');
    node.style.cssText = `left:${p.x}px;top:${p.y}px;--node:${colorOf(world, location)}`;
    if (isHere) {
      node.setAttribute('aria-current', 'location');
      node.setAttribute('aria-label', `You are here: ${location.name}, ${district}`);
    } else {
      node.setAttribute('aria-pressed', String(location.id === this.selected));
      node.setAttribute('aria-label', `${location.name}, ${district}${state.visited.has(location.id) ? '' : ', unexplored'}`);
    }

    const mark = document.createElement('span');
    mark.className = 'node-mark';
    node.append(mark);
    if (labelBox) {
      const label = document.createElement('span');
      label.className = 'node-label';
      label.textContent = location.name;
      label.style.transform = `translate(${labelBox.x - p.x}px, ${labelBox.y - p.y}px)`;
      node.append(label);
    }

    node.addEventListener('click', () => {
      if (this.traveling) return;
      if (isHere) this.handlers.onSelect(null);
      else if (this.selected === location.id) this.handlers.onTravel(location.id);
      else this.handlers.onSelect(location.id);
    });
    return node;
  }

  private outOfBounds(box: Box): number {
    return box.w * box.h - overlap(box, { x: 2, y: 2, w: this.width - 4, h: this.height - 4 });
  }
}

// ───────────── Helpers ─────────────

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
