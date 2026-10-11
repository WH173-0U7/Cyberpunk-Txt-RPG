import { EventBus } from './events';
import {
  DIRECTIONS,
  type AmbientLine,
  type Direction,
  type GameEvents,
  type Location,
  type Scene,
  type Tone,
  type World,
} from './types';

/**
 * The game rules and state. It never touches the DOM: everything the player
 * sees or feels is driven by the events it emits.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();
  private current: Location;
  private lastAmbient: AmbientLine | null = null;

  constructor(private readonly world: World) {
    this.current = this.locationById(world.start);
  }

  get location(): Location {
    return this.current;
  }

  /** Plays the boot sequence and drops the player into the starting location. */
  start(): void {
    for (const line of this.world.intro) this.say(line, 'system');
    this.say(this.world.welcome);
    this.enter(this.current, null);
  }

  say(text: string, tone: Tone = 'narrative'): void {
    this.events.emit('output', { text, tone });
  }

  move(direction: Direction): void {
    const targetId = this.current.exits[direction];
    if (!targetId) {
      this.say(`You can't go ${direction} from here.`, 'error');
      return;
    }
    this.enter(this.locationById(targetId), this.current);
  }

  /** Re-sends the current scene so the UI can rescan it. */
  look(): void {
    this.events.emit('scene', this.scene());
  }

  /** Takes a closer look at one of the current location's points of interest. */
  examine(poiId: string): void {
    const poi = this.current.pois?.find((p) => p.id === poiId);
    if (!poi) {
      this.say("You don't see that here.", 'error');
      return;
    }
    if (poi.fx) this.events.emit('fx', { effect: poi.fx });
    this.events.emit('examined', { poi });
  }

  /** Plays a random ambient line for the current location, never the same one twice in a row. */
  ambient(random: () => number = Math.random): void {
    const lines = this.current.ambient;
    if (!lines?.length) return;
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

  private scene(): Scene {
    const exits = DIRECTIONS.flatMap((direction) => {
      const id = this.current.exits[direction];
      return id ? [{ direction, name: this.locationById(id).name }] : [];
    });
    return { location: this.current, district: this.districtOf(this.current), exits };
  }

  private enter(to: Location, from: Location | null): void {
    const district = this.districtOf(to);
    this.current = to;
    this.lastAmbient = null;
    this.events.emit('locationChanged', { from, to, district });
    this.events.emit('scene', this.scene());
  }

  private districtOf(location: Location) {
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
