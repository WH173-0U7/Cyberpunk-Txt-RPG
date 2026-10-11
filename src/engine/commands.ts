import type { Game } from './game';
import { toDirection } from './parser';
import { FX_NAMES, type FxName } from './types';

export interface CommandDef {
  name: string;
  aliases?: string[];
  /** Shown in help instead of the bare name, e.g. "go <direction>". */
  usage?: string;
  summary: string;
  run(game: Game, args: string[]): void;
}

/** Words players naturally type that carry no meaning: "look at the billboard". */
const FILLER = new Set(['at', 'the', 'a', 'an', 'to']);

const meaningful = (args: string[]) => args.filter((word) => !FILLER.has(word));

/** Every command the player can type. Add new ones here; help picks them up automatically. */
export const COMMANDS: CommandDef[] = [
  {
    name: 'look',
    aliases: ['l', 'scan'],
    usage: 'look [thing]',
    summary: 'Scan your surroundings, or look at something.',
    run: (game, args) => {
      const target = meaningful(args).join(' ');
      if (target) game.examine(target);
      else game.look();
    },
  },
  {
    name: 'examine',
    aliases: ['x', 'inspect', 'check'],
    usage: 'examine <thing>',
    summary: 'Take a closer look at something nearby.',
    run: (game, args) => {
      const target = meaningful(args).join(' ');
      if (!target) return game.say('Examine what? Tap something under {h|Points of interest}, or type its name.', 'error');
      game.examine(target);
    },
  },
  {
    name: 'go',
    aliases: ['walk', 'move'],
    usage: 'go <direction>',
    summary: 'Move somewhere. Shortcuts: n, e, s, w, u, d.',
    run: (game, args) => {
      const [word] = meaningful(args);
      if (!word) return game.say('Go where? Try {h|north}, {h|east}, {h|south} or {h|west}.', 'error');
      const direction = toDirection(word);
      if (!direction) return game.say(`"${word}" isn't a direction.`, 'error');
      game.move(direction);
    },
  },
  {
    name: 'exits',
    summary: 'List the ways out of here.',
    run: (game) => game.describeExits(),
  },
  {
    name: 'fx',
    usage: 'fx <effect>',
    summary: `Preview an effect: ${FX_NAMES.join(', ')}.`,
    run: (game, [name]) => {
      if (!name || !FX_NAMES.includes(name as FxName)) {
        return game.say(`Effects: ${FX_NAMES.map((fx) => `{h|${fx}}`).join(', ')}. Try {h|fx glitch}.`, 'system');
      }
      game.events.emit('fx', { effect: name as FxName });
    },
  },
  {
    name: 'clear',
    aliases: ['cls'],
    summary: 'Wipe the feed.',
    run: (game) => game.events.emit('clear', undefined),
  },
  {
    name: 'help',
    aliases: ['h', '?', 'commands'],
    summary: 'Show this list.',
    run: (game) => game.say(helpText(), 'system'),
  },
];

function helpText(): string {
  const rows = COMMANDS.map((cmd) => {
    const label = cmd.usage ?? cmd.name;
    const aliases = cmd.aliases?.length ? ` [${cmd.aliases.join(', ')}]` : '';
    return `  {h|${label}}${' '.repeat(Math.max(2, 18 - label.length))}${cmd.summary}${aliases}`;
  });
  return ['AVAILABLE COMMANDS', ...rows].join('\n');
}
