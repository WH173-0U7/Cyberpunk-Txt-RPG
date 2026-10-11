import { COMMANDS, type CommandDef } from './commands';
import { EventBus } from './events';
import { parseInput } from './parser';
import {
  DIRECTIONS,
  type AmbientLine,
  type Direction,
  type GameEvents,
  type Location,
  type PointOfInterest,
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
  private readonly commands = new Map<string, CommandDef>();
  private current: Location;
  private lastAmbient: AmbientLine | null = null;

  constructor(private readonly world: World) {
    this.current = this.locationById(world.start);
    for (const cmd of COMMANDS) {
      for (const word of [cmd.name, ...(cmd.aliases ?? [])]) this.commands.set(word, cmd);
    }
  }

  get location(): Location {
    return this.current;
  }

  /** Boots the terminal and drops the player into the starting location. */
  start(): void {
    for (const line of this.world.intro) this.say(line, 'system');
    this.say(this.world.welcome);
    this.enter(this.current, null);
  }

  /** Runs one line of typed player input. */
  handle(input: string): void {
    const parsed = parseInput(input);
    if (!parsed) return;
    const cmd = this.commands.get(parsed.verb);
    if (!cmd) {
      this.say(`Unknown command "${parsed.verb}". Type {h|help} for a list.`, 'error');
      return;
    }
    cmd.run(this, parsed.args);
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

  /** Takes a closer look at a point of interest, matched by id or (part of) its name. */
  examine(query: string): void {
    const poi = findPoi(this.current, query);
    if (!poi) {
      this.say(`You don't see "${query}" here.`, 'error');
      return;
    }
    if (poi.fx) this.events.emit('fx', { effect: poi.fx });
    this.events.emit('examined', { poi });
  }

  describeExits(): void {
    const exits = this.scene().exits;
    this.say(
      exits.length
        ? `Exits: ${exits.map((exit) => `{h|${exit.direction}} ${exit.name}`).join(' · ')}`
        : 'There is no obvious way out.',
      'system',
    );
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

function findPoi(location: Location, query: string): PointOfInterest | undefined {
  const q = query.trim().toLowerCase();
  const pois = location.pois ?? [];
  if (!q) return undefined;
  return (
    pois.find((poi) => poi.id === q) ??
    pois.find((poi) => poi.name.toLowerCase() === q) ??
    pois.find((poi) => poi.name.toLowerCase().includes(q))
  );
}
