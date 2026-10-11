import { COMMANDS, type CommandDef } from './commands';
import { EventBus } from './events';
import { parseInput } from './parser';
import type { AmbientLine, Direction, GameEvents, Location, Tone, World } from './types';

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

  /** Runs one line of player input. */
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

  describeLocation(): void {
    this.say(this.current.name, 'heading');
    this.say(this.current.description);
    this.describeExits();
  }

  describeExits(): void {
    const directions = Object.keys(this.current.exits);
    this.say(
      directions.length ? `Exits: ${directions.map((d) => `{h|${d}}`).join(' · ')}` : 'There is no obvious way out.',
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

  private enter(to: Location, from: Location | null): void {
    const district = this.world.districts[to.district];
    if (!district) throw new Error(`Location "${to.id}" is in unknown district "${to.district}"`);
    this.current = to;
    this.lastAmbient = null;
    this.events.emit('locationChanged', { from, to, district });
    this.describeLocation();
  }

  private locationById(id: string): Location {
    const location = this.world.locations[id];
    if (!location) throw new Error(`Unknown location "${id}"`);
    return location;
  }
}
