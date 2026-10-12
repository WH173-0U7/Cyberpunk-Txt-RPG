import { EventBus } from './events';
import type { Progress } from './save';
import type { AmbientLine, District, GameEvents, Location, MapState, Tone, World } from './types';

/**
 * The game rules and state. It never touches the DOM: everything the player
 * sees or feels is driven by the events it emits.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();
  private current: Location;
  private readonly visited = new Set<string>();
  private readonly discovered = new Set<string>();
  private lastAmbient: AmbientLine | null = null;
  private fullyMapped = false;
  private readonly resumed: boolean;

  /** A new game at the city's start, or, given saved progress, right where the player left off. */
  constructor(
    readonly world: World,
    progress?: Progress,
  ) {
    this.current = this.locationById(progress?.current ?? world.start);
    this.resumed = Boolean(progress);
    if (!progress) return;
    for (const id of progress.visited) this.visit(this.locationById(id));
    for (const id of progress.discovered) this.discovered.add(this.locationById(id).id);
    this.fullyMapped = this.visited.size === Object.keys(world.locations).length;
  }

  get location(): Location {
    return this.current;
  }

  get mapState(): MapState {
    return { current: this.current.id, visited: new Set(this.visited), discovered: new Set(this.discovered) };
  }

  /** Greets the player (or welcomes them back) and drops them into their location. */
  start(): void {
    this.say(this.resumed ? this.world.welcomeBack : this.world.welcome);
    this.arrive([this.current.id], null);
  }

  say(text: string, tone: Tone = 'narrative'): void {
    this.events.emit('output', { text, tone });
  }

  /**
   * The shortest route from here to a known location, through known locations only,
   * starting with the current location. Null if the place is unknown or unreachable.
   */
  routeTo(id: string): string[] | null {
    if (!this.discovered.has(id)) return null;
    const previous = new Map<string, string | null>([[this.current.id, null]]);
    const queue = [this.current.id];
    for (let at = queue.shift(); at !== undefined; at = queue.shift()) {
      if (at === id) {
        const route: string[] = [];
        for (let step: string | null | undefined = at; step; step = previous.get(step)) route.unshift(step);
        return route;
      }
      for (const next of this.locationById(at).links) {
        if (this.discovered.has(next) && !previous.has(next)) {
          previous.set(next, at);
          queue.push(next);
        }
      }
    }
    return null;
  }

  /** Travels to a known location, passing through everything on the way. */
  travel(id: string): void {
    if (id === this.current.id) return;
    const route = this.routeTo(id);
    if (!route) {
      this.say('No known route there yet.', 'error');
      return;
    }
    this.arrive(route, this.current);
  }

  /** Plays a random ambient line for the current location, never the same one twice in a row. */
  ambient(random: () => number = Math.random): void {
    const lines = this.current.ambient;
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

  private arrive(route: string[], from: Location | null): void {
    for (const id of route) this.visit(this.locationById(id));
    const to = this.locationById(route.at(-1) ?? this.current.id);
    this.current = to;
    this.lastAmbient = null;
    this.events.emit('locationChanged', { from, to, district: this.districtOf(to), route });
    this.events.emit('mapChanged', this.mapState);

    if (!this.fullyMapped && this.visited.size === Object.keys(this.world.locations).length) {
      this.fullyMapped = true;
      this.say('City grid fully mapped. Every district, every dive.', 'system');
    }
  }

  /** Being somewhere reveals everywhere its routes lead. */
  private visit(location: Location): void {
    this.visited.add(location.id);
    this.discovered.add(location.id);
    for (const link of location.links) this.discovered.add(link);
  }

  private districtOf(location: Location): District {
    const district = this.world.districts[location.district];
    if (!district) throw new Error(`Location "${location.id}" is in unknown district "${location.district}"`);
    return district;
  }

  private locationById(id: string): Location {
    const location = this.world.locations[id];
    if (!location) throw new Error(`Unknown location "${id}"`);
    return location;
  }
}
