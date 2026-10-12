import { blockAt } from './buildings';
import { EventBus } from './events';
import { districtAt } from './geography';
import type { Progress } from './save';
import { pointAlong, snapToStreet } from './streets';
import { planTrip, startTrip, tripProgress, walkedSoFar, type TravelRules } from './travel';
import type {
  AmbientLine,
  Building,
  District,
  GameEvents,
  Location,
  MapState,
  Point,
  Station,
  Tone,
  TravelMode,
  Trip,
  TripPlan,
  Wallet,
  Whereabouts,
  World,
} from './types';

/** The fog lifts in square cells this many map units across. */
export const CELL = 4;
export const CELLS = Math.ceil(100 / CELL);
const DAY = 86_400_000;

/** The fog cell a map point falls in. */
export function cellOf(p: Point): number {
  const cx = Math.min(CELLS - 1, Math.max(0, Math.floor(p.x / CELL)));
  const cy = Math.min(CELLS - 1, Math.max(0, Math.floor(p.y / CELL)));
  return cy * CELLS + cx;
}

export function cellCenter(cell: number): Point {
  return { x: ((cell % CELLS) + 0.5) * CELL, y: (Math.floor(cell / CELLS) + 0.5) * CELL };
}

/** Standing at a map point with nothing in particular there. */
export function streetSpot(p: Point): Whereabouts {
  return { x: p.x, y: p.y, place: null, station: null, building: null };
}

/**
 * The game rules and state. It never touches the DOM: everything the player
 * sees or feels is driven by the events it emits. Time comes in as `now`
 * (ms since 1970) from the phone's clock, so trips run in real time.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();
  private where: Whereabouts;
  private trip: Trip | null;
  private readonly visited = new Set<string>();
  private readonly discovered = new Set<string>();
  private readonly explored = new Set<number>();
  private eddies: number;
  private passUntil: number;
  private lastAmbient: AmbientLine | null = null;
  private fullyMapped = false;
  private readonly resumed: boolean;

  /** A new game at the city's start, or, given saved progress, right where the player left off. */
  constructor(
    readonly world: World,
    readonly rules: TravelRules,
    progress?: Progress,
  ) {
    const start = this.locationById(world.start);
    this.where = progress ? { ...progress.where } : { ...streetSpot(start), place: start.id };
    this.trip = progress?.trip ?? null;
    this.eddies = progress?.eddies ?? rules.startingEddies;
    this.passUntil = progress?.passUntil ?? 0;
    this.resumed = Boolean(progress);
    if (progress) {
      for (const id of progress.visited) this.visit(this.locationById(id));
      for (const id of progress.discovered) this.discovered.add(this.locationById(id).id);
      for (const cell of progress.explored) this.explored.add(cell);
    }
    this.fullyMapped = this.visited.size === Object.keys(world.locations).length;
  }

  /** Where the player is, or set off from while on the move. */
  get whereabouts(): Whereabouts {
    return { ...this.where };
  }

  /** The place the player is standing in, if any (none while on the move). */
  get location(): Location | null {
    return this.trip || !this.where.place ? null : (this.world.locations[this.where.place] ?? null);
  }

  get currentTrip(): Trip | null {
    return this.trip;
  }

  get wallet(): Wallet {
    return { eddies: this.eddies, passUntil: this.passUntil };
  }

  get mapState(): MapState {
    return { where: { ...this.where }, visited: new Set(this.visited), discovered: new Set(this.discovered), explored: new Set(this.explored) };
  }

  passActive(now: number): boolean {
    return this.passUntil > now;
  }

  /** Greets the player (or welcomes them back) and puts them where they are. A trip that ended while they were away lands now. */
  start(now: number): void {
    this.say(this.resumed ? this.world.welcomeBack : this.world.welcome);
    if (!this.resumed) this.settle(this.where);
    this.emitArrived(null);
    this.events.emit('walletChanged', this.wallet);
    if (this.trip) {
      this.events.emit('tripChanged', this.trip);
      this.tick(now, true);
    }
    this.events.emit('mapChanged', this.mapState);
  }

  say(text: string, tone: Tone = 'narrative'): void {
    this.events.emit('output', { text, tone });
  }

  /** Where the player is at `now`: somewhere along the way while on the move. */
  positionAt(now: number): Point {
    return this.trip ? tripProgress(this.trip, now).at : { x: this.where.x, y: this.where.y };
  }

  /** How to get somewhere from right here. Null when it can't be done: mid-ride, already there, or no NCART that helps. */
  plan(to: Whereabouts, mode: TravelMode, now: number): TripPlan | null {
    if (this.trip?.mode === 'ncart') return null;
    if (!this.trip && sameSpot(this.where, to)) return null;
    return planTrip(this.world, this.positionAt(now), to, mode, this.rules);
  }

  /** Sets off. Walking can change course partway; a train ride has to finish first. Pays the fare unless the pass covers it. */
  go(plan: TripPlan, now: number): boolean {
    if (this.trip?.mode === 'ncart') return false;
    const covered = plan.mode === 'ncart' && this.passActive(now);
    const fare = plan.mode === 'ncart' && !covered ? plan.fare : 0;
    if (fare > this.eddies) {
      this.say(`Not enough eddies for the NCART fare (${fare} €$).`, 'error');
      return false;
    }
    if (this.trip) {
      // Changing course: whatever was walked so far still counts.
      this.exploreTrip(now);
      this.where = streetSpot(plan.from);
    }
    this.trip = startTrip(plan, now, this.rules);
    if (fare) {
      this.eddies -= fare;
      this.events.emit('walletChanged', this.wallet);
      this.say(`NCART fare paid: ${fare} €$.`, 'system');
    } else if (covered) {
      this.say('Monthly pass scanned. The gate slides open.', 'system');
    }
    this.events.emit('tripChanged', this.trip);
    return true;
  }

  /** Moves the clock on: reveals what's been walked past, and lands the player once the trip is over. */
  tick(now: number, away = false): void {
    const trip = this.trip;
    if (!trip) return;
    const changed = this.exploreTrip(now);
    if (now >= trip.endsAt) this.finish(trip, away);
    else if (changed) this.events.emit('mapChanged', this.mapState);
  }

  /** Stops walking right where the player is. (No getting off a moving train.) */
  stop(now: number): boolean {
    const trip = this.trip;
    if (!trip || trip.mode !== 'foot') return false;
    this.exploreTrip(now);
    const from = this.where;
    this.where = streetSpot(snapToStreet(this.world.layout, tripProgress(trip, now).at));
    this.trip = null;
    this.settle(this.where);
    this.events.emit('tripChanged', null);
    this.emitArrived(from);
    this.events.emit('mapChanged', this.mapState);
    return true;
  }

  /** Buys (or extends) a monthly NCART pass. Only sold at stations. */
  buyPass(now: number): boolean {
    if (this.trip || !this.where.station) return false;
    const { passPrice, passDays } = this.rules;
    if (this.eddies < passPrice) {
      this.say(`A monthly pass costs ${passPrice} €$. You've got ${this.eddies} €$.`, 'error');
      return false;
    }
    this.eddies -= passPrice;
    this.passUntil = Math.max(now, this.passUntil) + passDays * DAY;
    this.events.emit('walletChanged', this.wallet);
    this.say(`Monthly NCART pass bought. Unlimited rides for ${passDays} days.`, 'system');
    return true;
  }

  /** Plays a random ambient line for where the player is, never the same one twice in a row. */
  ambient(random: () => number = Math.random): void {
    const lines = this.location?.ambient ?? this.districtOf(this.where)?.ambient ?? [];
    if (!lines.length) return;
    let index = Math.floor(random() * lines.length);
    if (lines.length > 1 && lines[index] === this.lastAmbient) index = (index + 1) % lines.length;
    const line = lines[index];
    if (line === undefined) return;
    this.lastAmbient = line;

    if (typeof line === 'string') {
      this.say(line, 'ambient');
    } else {
      this.events.emit('fx', { effect: line.fx });
      this.say(line.text, 'ambient');
    }
  }

  /** What to call a spot: a place's or station's name, the building outside, or the block. */
  nameOf(where: Whereabouts): string {
    if (where.place) return this.world.locations[where.place]?.name ?? 'Somewhere';
    if (where.station) return this.world.transit.stations[where.station]?.name ?? 'NCART';
    const building = where.building ? this.world.buildings.find((b) => b.id === where.building) : undefined;
    if (building) return `Outside ${building.name}`;
    const block = blockAt(this.world.layout, where);
    return block ? `Block ${block.address}` : 'The streets';
  }

  districtOf(where: Point & Partial<Whereabouts>): District | null {
    const { districts, locations, transit, buildings } = this.world;
    const id =
      (where.place && locations[where.place]?.district) ||
      (where.station && transit.stations[where.station]?.district) ||
      (where.building && buildings.find((b) => b.id === where.building)?.district) ||
      districtAt(Object.values(districts), where)?.id;
    return (id && districts[id]) || null;
  }

  private finish(trip: Trip, away: boolean): void {
    const from = this.where;
    this.trip = null;
    this.where = { ...trip.to };
    this.settle(this.where);
    this.events.emit('tripChanged', null);
    this.emitArrived(from);
    if (away) this.say(`You made it to ${this.nameOf(this.where)} while you were away.`, 'system');
    this.events.emit('mapChanged', this.mapState);

    if (!this.fullyMapped && this.visited.size === Object.keys(this.world.locations).length) {
      this.fullyMapped = true;
      this.say('City grid fully mapped. Every district, every dive.', 'system');
    }
  }

  /** Arriving: a place counts as visited and reveals where its routes lead, and the area around lights up. */
  private settle(where: Whereabouts): void {
    if (where.place) this.visit(this.locationById(where.place));
    this.exploreAround(where);
  }

  /** Walking lifts the fog along the way and turns up any place close by. Ridden stretches don't count. */
  private exploreTrip(now: number): boolean {
    const trip = this.trip;
    if (!trip) return false;
    let changed = false;
    for (const { path, distance } of walkedSoFar(trip, now)) {
      for (let d = 0; d < distance; d += 1.5) changed = this.exploreAround(pointAlong(path, d)) || changed;
      changed = this.exploreAround(pointAlong(path, distance)) || changed;
    }
    return changed;
  }

  private exploreAround(p: Point): boolean {
    let changed = false;
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= CELLS || y >= CELLS) continue;
        const cell = y * CELLS + x;
        if (!this.explored.has(cell)) {
          this.explored.add(cell);
          changed = true;
        }
      }
    }
    for (const location of Object.values(this.world.locations)) {
      if (!this.discovered.has(location.id) && Math.hypot(location.x - p.x, location.y - p.y) <= this.rules.discoverRadius) {
        this.discovered.add(location.id);
        changed = true;
      }
    }
    return changed;
  }

  /** Being somewhere reveals everywhere its routes lead. */
  private visit(location: Location): void {
    this.visited.add(location.id);
    this.discovered.add(location.id);
    for (const link of location.links) this.discovered.add(link);
  }

  private emitArrived(from: Whereabouts | null): void {
    const { locations, transit, buildings } = this.world;
    const where = { ...this.where };
    const place: Location | null = (where.place && locations[where.place]) || null;
    const station: Station | null = (where.station && transit.stations[where.station]) || null;
    const building: Building | null = (where.building && buildings.find((b) => b.id === where.building)) || null;
    this.lastAmbient = null;
    this.events.emit('arrived', { from, where, place, station, building, district: this.districtOf(where) });
  }

  private locationById(id: string): Location {
    const location = this.world.locations[id];
    if (!location) throw new Error(`Unknown location "${id}"`);
    return location;
  }
}

/** Whether two spots are the same: the same place, station or building, or the same bit of street. */
function sameSpot(a: Whereabouts, b: Whereabouts): boolean {
  if (a.place || b.place) return a.place === b.place;
  if (a.station || b.station) return a.station === b.station;
  if (a.building || b.building) return a.building === b.building;
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.5;
}
