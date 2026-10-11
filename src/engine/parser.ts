import type { Direction } from './types';

const DIRECTION_WORDS = new Map<string, Direction>([
  ['n', 'north'],
  ['north', 'north'],
  ['s', 'south'],
  ['south', 'south'],
  ['e', 'east'],
  ['east', 'east'],
  ['w', 'west'],
  ['west', 'west'],
  ['u', 'up'],
  ['up', 'up'],
  ['d', 'down'],
  ['down', 'down'],
]);

export interface ParsedInput {
  verb: string;
  args: string[];
}

/** Resolves "n", "north", etc. to a direction. */
export function toDirection(word: string | undefined): Direction | undefined {
  return word === undefined ? undefined : DIRECTION_WORDS.get(word);
}

/**
 * Splits raw player input into a lowercase verb and arguments.
 * A bare direction ("n", "west") is shorthand for "go <direction>".
 */
export function parseInput(input: string): ParsedInput | null {
  const [verb, ...args] = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (verb === undefined) return null;
  if (args.length === 0 && toDirection(verb)) return { verb: 'go', args: [verb] };
  return { verb, args };
}
