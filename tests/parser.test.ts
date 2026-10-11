import { describe, expect, it } from 'vitest';
import { parseInput, toDirection } from '../src/engine/parser';

describe('parseInput', () => {
  it('splits the verb from its arguments, normalizing case and spacing', () => {
    expect(parseInput('  GO   North ')).toEqual({ verb: 'go', args: ['north'] });
  });

  it('treats a bare direction as a move', () => {
    expect(parseInput('n')).toEqual({ verb: 'go', args: ['n'] });
    expect(parseInput('West')).toEqual({ verb: 'go', args: ['west'] });
  });

  it('returns null for blank input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('   ')).toBeNull();
  });
});

describe('toDirection', () => {
  it('resolves full names and shorthand', () => {
    expect(toDirection('s')).toBe('south');
    expect(toDirection('up')).toBe('up');
  });

  it('rejects anything else, including object prototype keys', () => {
    expect(toDirection('sideways')).toBeUndefined();
    expect(toDirection('constructor')).toBeUndefined();
    expect(toDirection(undefined)).toBeUndefined();
  });
});
