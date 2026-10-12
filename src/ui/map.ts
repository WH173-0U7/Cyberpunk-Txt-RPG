import type { District, Location, MapState, Point, World } from '../engine/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Room around the edge of the map so markers and labels don't touch the frame. */
const PAD = 24;
/** Estimated label metrics for collision checks (10.5px mono, slightly generous). */
const CHAR_WIDTH = 6.2;
const LABEL_HEIGHT = 17;
const LABEL_GAP = 11;
/** Space reserved around each marker so labels don't cover them. */
const MARKER_BOX = 18;
const ZONE_CHAR_WIDTH = 9.6;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapElements {
  stage: HTMLElement;
  zones: HTMLElement;
  routes: SVGSVGElement;
  nodes: HTMLElement;
  sweep: HTMLElement;
  tracer: HTMLElement;
  progress: HTMLElement;
  coords: HTMLElement;
}

export interface MapHandlers {
  onTravel(id: string): void;
}

/**
 * The city grid: glowing district zones, routes between places and tappable markers.
 * Unknown places show as faint blips; the player's position radiates a radar sweep.
 */
export class CityMap {
  private world: World | null = null;
  private state: MapState | null = null;
  private width = 0;
  private height = 0;
  private traveling = false;

  constructor(
    private readonly els: MapElements,
    private readonly handlers: MapHandlers,
    private readonly reducedMotion: boolean,
  ) {
    new ResizeObserver(() => this.render()).observe(els.stage);
  }

  setWorld(world: World): void {
    this.world = world;
    this.state = null;
    this.render();
  }

  update(state: MapState): void {
    this.state = state;
    this.render();
  }

  /** Runs a tracer along the route and lights the path behind it. Resolves on arrival. */
  async animateRoute(route: string[]): Promise<void> {
    const world = this.world;
    if (!world || this.reducedMotion || route.length < 2) return;
    const points = route.flatMap((id) => {
      const location = world.locations[id];
      return location ? [this.project(location)] : [];
    });
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      cumulative.push((cumulative[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
    }
    const total = cumulative.at(-1) ?? 0;
    if (total === 0) return;

    const { routes, tracer, stage } = this.els;
    const duration = Math.min(1500, 320 + total * 1.7);
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

  private project(point: Point): { x: number; y: number } {
    return {
      x: PAD + (point.x / 100) * (this.width - PAD * 2),
      y: PAD + (point.y / 100) * (this.height - PAD * 2),
    };
  }

  private render(): void {
    const { world, state } = this;
    const { stage, zones, routes, nodes, sweep, progress, coords } = this.els;
    this.width = stage.clientWidth;
    this.height = stage.clientHeight;
    if (!world || !state || !this.width || !this.height) return;

    const focusedId = (document.activeElement as HTMLElement | null)?.dataset?.node;
    const locations = Object.values(world.locations);
    const here = world.locations[state.current];
    const neighbors = new Set(here?.links ?? []);
    const placed: Box[] = [];
    const markerBoxes = new Map<string, Box>();
    for (const location of locations) {
      const p = this.project(location);
      markerBoxes.set(location.id, { x: p.x - MARKER_BOX / 2, y: p.y - MARKER_BOX / 2, w: MARKER_BOX, h: MARKER_BOX });
    }

    // District zones and their labels.
    zones.replaceChildren(
      ...Object.values(world.districts).flatMap((district) => {
        const members = locations.filter((l) => l.district === district.id);
        if (!members.length) return [];
        return this.renderZone(district, members, state, placed, markerBoxes);
      }),
    );

    // Routes. Known routes glow in their districts' colors; routes into the unknown are faint hints.
    const defs = document.createElementNS(SVG_NS, 'defs');
    const lines: SVGElement[] = [];
    let gradientId = 0;
    for (const a of locations) {
      for (const id of a.links) {
        const b = world.locations[id];
        if (!b || a.id > b.id) continue;
        const aKnown = state.discovered.has(a.id);
        const bKnown = state.discovered.has(b.id);
        if (!aKnown && !bKnown) continue;
        const pa = this.project(a);
        const pb = this.project(b);
        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', `${pa.x}`);
        line.setAttribute('y1', `${pa.y}`);
        line.setAttribute('x2', `${pb.x}`);
        line.setAttribute('y2', `${pb.y}`);
        if (aKnown && bKnown) {
          const gradient = document.createElementNS(SVG_NS, 'linearGradient');
          const gid = `route-${++gradientId}`;
          gradient.setAttribute('id', gid);
          gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
          for (const [attr, value] of [['x1', pa.x], ['y1', pa.y], ['x2', pb.x], ['y2', pb.y]] as const) {
            gradient.setAttribute(attr, `${value}`);
          }
          for (const [offset, location] of [['0', a], ['1', b]] as const) {
            const stop = document.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', offset);
            stop.setAttribute('stop-color', world.districts[location.district]?.theme.primary ?? '#ffffff');
            gradient.append(stop);
          }
          defs.append(gradient);
          line.setAttribute('stroke', `url(#${gid})`);
          const live = a.id === state.current || b.id === state.current;
          line.setAttribute('class', live ? 'route is-live' : 'route');
        } else {
          line.setAttribute('class', 'route is-hint');
        }
        lines.push(line);
      }
    }
    routes.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    routes.replaceChildren(defs, ...lines);

    // Markers: every known place is a button; unknown places are blips.
    const known = locations.filter((l) => state.discovered.has(l.id));
    const priority = (l: Location) => (l.id === state.current ? 0 : neighbors.has(l.id) ? 1 : state.visited.has(l.id) ? 2 : 3);
    const labelBoxes = new Map<string, Box>();
    for (const location of [...known].sort((a, b) => priority(a) - priority(b))) {
      labelBoxes.set(location.id, this.placeLabel(location, placed, markerBoxes));
    }

    const markers: HTMLElement[] = [];
    for (const location of [...locations].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const p = this.project(location);
      const color = world.districts[location.district]?.theme.primary ?? '#ffffff';
      if (!state.discovered.has(location.id)) {
        const blip = document.createElement('span');
        blip.className = 'blip';
        blip.style.cssText = `left:${p.x}px;top:${p.y}px;--node:${color};--delay:${(-((p.x * 7 + p.y * 13) % 30) / 10).toFixed(1)}s`;
        markers.push(blip);
        continue;
      }
      markers.push(this.renderNode(location, p, color, state, neighbors, labelBoxes.get(location.id)));
    }
    nodes.replaceChildren(...markers);

    if (focusedId) nodes.querySelector<HTMLElement>(`[data-node="${focusedId}"]`)?.focus({ preventScroll: true });

    if (here) {
      const p = this.project(here);
      sweep.style.left = `${p.x}px`;
      sweep.style.top = `${p.y}px`;
      coords.textContent = `Grid ${here.x.toFixed(1)} · ${here.y.toFixed(1)}`;
    }
    progress.textContent = `Mapped ${state.visited.size}/${locations.length}`;
  }

  private renderZone(
    district: District,
    members: Location[],
    state: MapState,
    placed: Box[],
    markers: Map<string, Box>,
  ): HTMLElement[] {
    const points = members.map((m) => this.project(m));
    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const radius = Math.max(34, ...points.map((p) => Math.hypot(p.x - cx, p.y - cy) + 22));
    const known = members.some((m) => state.discovered.has(m.id));

    const zone = document.createElement('div');
    zone.className = known ? 'zone is-known' : 'zone';
    zone.style.cssText = `left:${cx}px;top:${cy}px;width:${radius * 2}px;height:${radius * 2}px;--zone:${district.theme.primary}`;
    // Uncharted districts are just a dim glow; their name appears once you know a place in them.
    if (!known) return [zone];

    const w = district.name.length * ZONE_CHAR_WIDTH;
    const h = 14;
    const candidates = [cy - radius + 6, cy + radius - h - 6, cy - radius - h - 2, cy + radius + 2].map((y) =>
      this.clamp({ x: cx - w / 2, y, w, h }),
    );
    const covered = (box: Box) =>
      [...markers.values()].reduce((sum, m) => sum + overlap(box, m), 0) + placed.reduce((sum, other) => sum + overlap(box, other), 0);
    const box = candidates.reduce((best, candidate) => (covered(candidate) < covered(best) ? candidate : best));
    placed.push(box);

    const label = document.createElement('span');
    label.className = 'zone-label';
    label.textContent = district.name;
    label.style.cssText = `left:${box.x + w / 2}px;top:${box.y}px;--zone:${district.theme.primary}`;
    return [zone, label];
  }

  /** Tries the four sides of a marker and keeps the label where it covers the least. */
  private placeLabel(location: Location, placed: Box[], markers: Map<string, Box>): Box {
    const p = this.project(location);
    const w = location.name.length * CHAR_WIDTH + 12;
    const h = LABEL_HEIGHT;
    const right = { x: p.x + LABEL_GAP, y: p.y - h / 2, w, h };
    const left = { x: p.x - LABEL_GAP - w, y: p.y - h / 2, w, h };
    const above = { x: p.x - w / 2, y: p.y - LABEL_GAP - h, w, h };
    const below = { x: p.x - w / 2, y: p.y + LABEL_GAP, w, h };
    const candidates = p.x < this.width / 2 ? [right, left, above, below] : [left, right, above, below];

    const cost = (box: Box, index: number) => {
      let covered = placed.reduce((sum, other) => sum + overlap(box, other), 0);
      for (const [id, marker] of markers) if (id !== location.id) covered += overlap(box, marker);
      return covered + this.outOfBounds(box) * 4 + index * 2;
    };
    const best = candidates.reduce((winner, box, index) => (cost(box, index) < cost(winner.box, winner.index) ? { box, index } : winner), {
      box: candidates[0] ?? right,
      index: 0,
    }).box;
    placed.push(best);
    return best;
  }

  private renderNode(
    location: Location,
    p: { x: number; y: number },
    color: string,
    state: MapState,
    neighbors: Set<string>,
    labelBox: Box | undefined,
  ): HTMLElement {
    const district = this.world?.districts[location.district]?.name ?? '';
    const isHere = location.id === state.current;
    const node = document.createElement('button');
    node.type = 'button';
    node.dataset.node = location.id;
    node.className = [
      'node',
      isHere ? 'is-current' : neighbors.has(location.id) ? 'is-adjacent' : 'is-known',
      state.visited.has(location.id) ? 'is-visited' : 'is-unexplored',
    ].join(' ');
    node.style.cssText = `left:${p.x}px;top:${p.y}px;--node:${color}`;
    if (isHere) {
      node.setAttribute('aria-current', 'location');
      node.setAttribute('aria-label', `You are here: ${location.name}, ${district}`);
    } else {
      const explored = state.visited.has(location.id) ? '' : ', unexplored';
      node.setAttribute('aria-label', `Travel to ${location.name}, ${district}${explored}`);
    }

    const mark = document.createElement('span');
    mark.className = 'node-mark';
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = location.name;
    if (labelBox) label.style.transform = `translate(${labelBox.x - p.x}px, ${labelBox.y - p.y}px)`;
    node.append(mark, label);

    node.addEventListener('click', () => {
      if (!isHere && !this.traveling) this.handlers.onTravel(location.id);
    });
    return node;
  }

  private clamp(box: Box): Box {
    return { ...box, x: Math.max(4, Math.min(this.width - box.w - 4, box.x)), y: Math.max(4, Math.min(this.height - box.h - 4, box.y)) };
  }

  private outOfBounds(box: Box): number {
    const inside = overlap(box, { x: 2, y: 2, w: this.width - 4, h: this.height - 4 });
    return box.w * box.h - inside;
  }
}

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}
