import { streetPath } from '../engine/generate';
import { createRng, type Rng } from '../engine/rng';
import type { CityLayout, District, Location, MapState, Point, World } from '../engine/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Room around the edge of the map so markers don't touch the frame. */
const PAD = 14;
/** Label metrics for collision checks (10.5px mono, slightly generous). */
const CHAR_WIDTH = 6.2;
const LABEL_HEIGHT = 17;
const LABEL_GAP = 11;
/** Space reserved around each marker so labels don't cover it. */
const MARKER_BOX = 18;
/** Gap between a block and the street centerline, in px. */
const STREET_HALF = 3;

const ASPHALT = '#06070d';
const BUILDING = '#0c1020';
const SEA = '#040914';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Px = { x: number; y: number };

export interface MapElements {
  stage: HTMLElement;
  city: HTMLCanvasElement;
  routes: SVGSVGElement;
  nodes: HTMLElement;
  sweep: HTMLElement;
  tracer: HTMLElement;
  progress: HTMLElement;
  coords: HTMLElement;
}

export interface MapHandlers {
  /** A marker was tapped (null: the player's own position). */
  onSelect(id: string | null): void;
  /** The already-selected marker was tapped again. */
  onTravel(id: string): void;
}

/**
 * The city: blocks and streets drawn to canvas, fog over everything unexplored, routes that
 * follow the streets, and tappable markers. Only a few labels show at once, and a label that
 * can't fit without covering another is left off.
 */
export class CityMap {
  private world: World | null = null;
  private state: MapState | null = null;
  private selected: string | null = null;
  private plannedRoute: string[] = [];
  private width = 0;
  private height = 0;
  private traveling = false;
  private readonly fog = document.createElement('canvas');

  constructor(
    private readonly els: MapElements,
    private readonly handlers: MapHandlers,
    private readonly reducedMotion: boolean,
  ) {
    new ResizeObserver(() => this.render()).observe(els.stage);
    // District names are drawn on the canvas in the display font; redraw once it has loaded.
    void document.fonts?.ready.then(() => this.render());
  }

  get selection(): string | null {
    return this.selected;
  }

  setWorld(world: World): void {
    this.world = world;
    this.state = null;
    this.selected = null;
    this.plannedRoute = [];
  }

  update(state: MapState): void {
    this.state = state;
    if (this.selected === state.current || (this.selected && !state.discovered.has(this.selected))) {
      this.selected = null;
      this.plannedRoute = [];
    }
    this.render();
  }

  /** Highlights a destination and the route there; null clears it. */
  select(id: string | null, route: string[] = []): void {
    this.selected = id;
    this.plannedRoute = id ? route : [];
    this.render();
  }

  /** Runs a tracer along the route's streets and lights the path behind it. Resolves on arrival. */
  async animateRoute(route: string[]): Promise<void> {
    const points = this.routePoints(route);
    if (this.reducedMotion || points.length < 2) return;
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      cumulative.push((cumulative[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
    }
    const total = cumulative.at(-1) ?? 0;
    if (total === 0) return;

    const { routes, tracer, stage } = this.els;
    const duration = Math.min(1600, 340 + total * 1.5);
    const easing = 'cubic-bezier(0.45, 0, 0.55, 1)';

    const trail = document.createElementNS(SVG_NS, 'polyline');
    trail.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '));
    trail.setAttribute('class', 'route-trace');
    trail.style.strokeDasharray = `${total}`;
    routes.append(trail);
    trail.animate([{ strokeDashoffset: total }, { strokeDashoffset: 0 }], { duration, easing, fill: 'forwards' });

    this.traveling = true;
    stage.classList.add('is-traveling');
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
      this.traveling = false;
      stage.classList.remove('is-traveling');
    }
  }

  private project(point: Point): Px {
    return {
      x: PAD + (point.x / 100) * (this.width - PAD * 2),
      y: PAD + (point.y / 100) * (this.height - PAD * 2),
    };
  }

  /** The street corners a multi-stop route passes through, in px. */
  private routePoints(route: string[]): Px[] {
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
    return points.map((p) => this.project(p));
  }

  private render(): void {
    const { world, state } = this;
    const { stage, sweep, progress, coords } = this.els;
    this.width = stage.clientWidth;
    this.height = stage.clientHeight;
    if (!world || !state || !this.width || !this.height) return;

    const markerBoxes = new Map<string, Box>();
    for (const location of Object.values(world.locations)) {
      const p = this.project(location);
      markerBoxes.set(location.id, { x: p.x - MARKER_BOX / 2, y: p.y - MARKER_BOX / 2, w: MARKER_BOX, h: MARKER_BOX });
    }

    const labelBoxes = this.placeLabels(world, state, markerBoxes);
    const obstacles = [...markerBoxes.values(), ...labelBoxes.values(), ...this.routeSamples(world, state)];
    this.drawCity(world, state, obstacles);
    this.drawRoutes(world, state);
    this.drawMarkers(world, state, labelBoxes);

    const here = world.locations[state.current];
    if (here) {
      const p = this.project(here);
      sweep.style.left = `${p.x}px`;
      sweep.style.top = `${p.y}px`;
      coords.textContent = `Grid ${here.x.toFixed(1)} · ${here.y.toFixed(1)}`;
    }
    progress.textContent = `Mapped ${state.visited.size}/${Object.keys(world.locations).length}`;
  }

  // ───────────── City ─────────────

  private drawCity(world: World, state: MapState, obstacles: Box[]): void {
    const { city } = this.els;
    const { width: w, height: h } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    city.width = Math.round(w * dpr);
    city.height = Math.round(h * dpr);
    const ctx = city.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = ASPHALT;
    ctx.fillRect(0, 0, w, h);

    const districts = Object.values(world.districts);
    const known = new Set(Object.values(world.locations).flatMap((l) => (state.discovered.has(l.id) ? [l.district] : [])));
    const territory = (p: Point) =>
      districts.reduce<District | null>((best, d) => (!best || Math.hypot(d.x - p.x, d.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? d : best), null);

    const { avenues, streets, coast } = world.layout;
    const xs = [0, ...avenues, 100];
    const ys = [0, ...streets, 100];

    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < ys.length - 1; j++) {
        const x0 = xs[i] ?? 0;
        const x1 = xs[i + 1] ?? 100;
        const y0 = ys[j] ?? 0;
        const y1 = ys[j + 1] ?? 100;
        const district = territory({ x: (x0 + x1) / 2, y: (y0 + y1) / 2 });
        if (!district) continue;
        const a = this.project({ x: x0, y: y0 });
        const b = this.project({ x: x1, y: y1 });
        // Edge cells run out to the frame; inner cells stop short of the street.
        const left = i === 0 ? 0 : a.x + STREET_HALF;
        const top = j === 0 ? 0 : a.y + STREET_HALF;
        const right = i === xs.length - 2 ? w : b.x - STREET_HALF;
        const bottom = j === ys.length - 2 ? h : b.y - STREET_HALF;
        const cell = { x: left, y: top, w: right - left, h: bottom - top };
        if (cell.w < 3 || cell.h < 3) continue;
        const rng = createRng(`${world.seed}:${i}:${j}`);
        if (district.terrain === 'desert') drawDesert(ctx, cell, rng, known.has(district.id));
        else drawBlock(ctx, cell, rng, district.theme.primary, known.has(district.id));
      }
    }

    this.drawArterials(ctx, world.layout);
    if (coast) this.drawSea(ctx, coast, world.seed);
    this.drawFog(ctx, world, state, dpr);
    this.drawDistrictNames(ctx, districts.filter((d) => known.has(d.id)), obstacles);
  }

  /** Every third street is a main road, a little brighter than the rest. */
  private drawArterials(ctx: CanvasRenderingContext2D, layout: CityLayout): void {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(150, 170, 220, 0.09)';
    ctx.beginPath();
    layout.avenues.forEach((x, i) => {
      if (i % 3 !== 1) return;
      const p = this.project({ x, y: 0 });
      ctx.moveTo(p.x, 0);
      ctx.lineTo(p.x, this.height);
    });
    layout.streets.forEach((y, i) => {
      if (i % 3 !== 1) return;
      const p = this.project({ x: 0, y });
      ctx.moveTo(0, p.y);
      ctx.lineTo(this.width, p.y);
    });
    ctx.stroke();
  }

  /** Water from the map edge to a wavy shoreline, with a few swell lines. */
  private drawSea(ctx: CanvasRenderingContext2D, coast: NonNullable<CityLayout['coast']>, seed: string): void {
    const rng = createRng(`${seed}:coast`);
    const phase = rng.range(0, Math.PI * 2);
    const shore = (t: number, offset = 0) =>
      coast.depth - offset + Math.sin(t * 0.19 + phase) * 1.1 + Math.sin(t * 0.06 + phase * 2) * 1.4;
    const toPoint = (t: number, depth: number): Point => {
      switch (coast.side) {
        case 'west':
          return { x: depth, y: t };
        case 'east':
          return { x: 100 - depth, y: t };
        case 'north':
          return { x: t, y: depth };
        case 'south':
          return { x: t, y: 100 - depth };
      }
    };
    // Stretch past the frame so the water reaches the canvas edge.
    const line = (offset: number) => {
      const points: Px[] = [];
      for (let t = -10; t <= 110; t += 2) points.push(this.project(toPoint(t, shore(t, offset))));
      return points;
    };
    const trace = (points: Px[]) => points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));

    const shoreline = line(0);
    ctx.beginPath();
    trace([...shoreline, this.project(toPoint(110, -20)), this.project(toPoint(-10, -20))]);
    ctx.closePath();
    ctx.fillStyle = SEA;
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 110, 255, 0.07)';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(90, 150, 255, 0.5)';
    ctx.beginPath();
    trace(shoreline);
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

  /** Darkness over the whole city, cut away around everywhere the player knows. */
  private drawFog(ctx: CanvasRenderingContext2D, world: World, state: MapState, dpr: number): void {
    const { fog } = this;
    fog.width = Math.round(this.width * dpr);
    fog.height = Math.round(this.height * dpr);
    const f = fog.getContext('2d');
    if (!f) return;
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.fillStyle = 'rgba(3, 4, 9, 0.86)';
    f.fillRect(0, 0, this.width, this.height);
    f.globalCompositeOperation = 'destination-out';
    const block = ((this.width + this.height) / 2 - PAD * 2) * 0.08;
    for (const location of Object.values(world.locations)) {
      if (!state.discovered.has(location.id)) continue;
      const p = this.project(location);
      const r = block * (state.visited.has(location.id) ? 3.4 : 2.1);
      const glow = f.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
      glow.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      f.fillStyle = glow;
      f.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.drawImage(fog, 0, 0, this.width, this.height);
  }

  /**
   * Big district names across their territory. Each tries spots around the district's center,
   * at full size and then smaller, and takes the first clear of markers, labels, routes and the
   * other names. A name with no clear spot is left off rather than drawn over something.
   */
  private drawDistrictNames(ctx: CanvasRenderingContext2D, districts: District[], obstacles: Box[]): void {
    const base = Math.max(11, Math.min(22, Math.min(this.width, this.height) / 20));
    const taken = [...obstacles];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const district of districts) {
      const text = district.name.toUpperCase();
      const c = this.project(district);
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
        ctx.shadowBlur = 12;
        ctx.fillStyle = hexToRgba(district.theme.primary, 0.42);
        ctx.fillText(text, spot.x, spot.y);
        break;
      }
    }
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  // ───────────── Routes ─────────────

  private drawRoutes(world: World, state: MapState): void {
    const { routes } = this.els;
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
        const line = polyline(streetPath(a, b).map((p) => this.project(p)));
        if (aKnown && bKnown) {
          const gid = `route-${++gradientId}`;
          defs.append(gradient(gid, this.project(a), this.project(b), colorOf(world, a), colorOf(world, b)));
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
          sample(streetPath(a, b).map((p) => this.project(p)));
        }
      }
    }
    sample(this.routePoints(this.plannedRoute));
    return samples;
  }

  /** Where you are and your selection always get a label; places one step away only if they fit. */
  private placeLabels(world: World, state: MapState, markerBoxes: Map<string, Box>): Map<string, Box> {
    const neighbors = new Set(world.locations[state.current]?.links ?? []);
    const labelBoxes = new Map<string, Box>();
    const placed: Box[] = [];
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

// ───────────── Drawing helpers ─────────────

/** A city block: usually split into a few buildings, sometimes a park. */
function drawBlock(ctx: CanvasRenderingContext2D, cell: Box, rng: Rng, color: string, known: boolean): void {
  if (rng.chance(0.07)) {
    ctx.fillStyle = `rgba(57, 255, 136, ${known ? 0.07 : 0.03})`;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.fillStyle = `rgba(57, 255, 136, ${known ? 0.18 : 0.06})`;
    for (let i = rng.int(3, 7); i > 0; i--) {
      ctx.beginPath();
      ctx.arc(cell.x + rng.range(3, Math.max(3.5, cell.w - 3)), cell.y + rng.range(3, Math.max(3.5, cell.h - 3)), rng.range(1.2, 2.4), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  for (const building of splitBlock(cell, rng)) {
    ctx.fillStyle = BUILDING;
    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.fillStyle = hexToRgba(color, known ? 0.1 : 0.035);
    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.strokeStyle = hexToRgba(color, known ? 0.36 : 0.12);
    ctx.lineWidth = 1;
    ctx.strokeRect(building.x + 0.5, building.y + 0.5, building.w - 1, building.h - 1);
    // A few lit windows.
    if (known && rng.chance(0.35)) {
      ctx.fillStyle = hexToRgba(color, 0.55);
      for (let i = rng.int(1, 3); i > 0; i--) {
        ctx.fillRect(
          building.x + rng.range(2, Math.max(2.5, building.w - 3)),
          building.y + rng.range(2, Math.max(2.5, building.h - 3)),
          1.5,
          1.5,
        );
      }
    }
  }
}

/** Open desert: sand, scrub and the odd shack. */
function drawDesert(ctx: CanvasRenderingContext2D, cell: Box, rng: Rng, known: boolean): void {
  // Sand runs across the streets too; out here there are no blocks.
  ctx.fillStyle = `rgba(255, 158, 61, ${known ? 0.055 : 0.02})`;
  ctx.fillRect(cell.x - STREET_HALF, cell.y - STREET_HALF, cell.w + STREET_HALF * 2, cell.h + STREET_HALF * 2);
  ctx.fillStyle = `rgba(255, 190, 120, ${known ? 0.22 : 0.07})`;
  for (let i = rng.int(1, 4); i > 0; i--) ctx.fillRect(cell.x + rng.range(0, cell.w), cell.y + rng.range(0, cell.h), 1.2, 1.2);
  if (rng.chance(0.12) && cell.w > 10 && cell.h > 10) {
    const w = rng.range(4, 8);
    const h = rng.range(3, 6);
    const x = cell.x + rng.range(1, cell.w - w - 1);
    const y = cell.y + rng.range(1, cell.h - h - 1);
    ctx.fillStyle = BUILDING;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(255, 158, 61, ${known ? 0.4 : 0.12})`;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

/** Cuts a block into one to four buildings with alleys between them. */
function splitBlock(cell: Box, rng: Rng): Box[] {
  const pieces = [cell];
  for (let cuts = rng.int(0, 3); cuts > 0; cuts--) {
    pieces.sort((a, b) => b.w * b.h - a.w * a.h);
    const piece = pieces[0];
    if (!piece) break;
    const vertical = piece.w >= piece.h;
    const span = vertical ? piece.w : piece.h;
    if (span < 14) break;
    const at = Math.round(span * rng.range(0.35, 0.65));
    const gap = 2;
    pieces.shift();
    if (vertical) {
      pieces.push({ ...piece, w: at - gap / 2 }, { ...piece, x: piece.x + at + gap / 2, w: piece.w - at - gap / 2 });
    } else {
      pieces.push({ ...piece, h: at - gap / 2 }, { ...piece, y: piece.y + at + gap / 2, h: piece.h - at - gap / 2 });
    }
  }
  return pieces;
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

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
