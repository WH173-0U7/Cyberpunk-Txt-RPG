import { describe, expect, it } from 'vitest';
import { parseMarkup, stripMarkup } from '../src/ui/markup';

describe('parseMarkup', () => {
  it('splits text into plain and styled segments', () => {
    expect(parseMarkup('Watch the {w|Tyger Claws} near the {g|ARASAKA} sign.')).toEqual([
      { text: 'Watch the ' },
      { text: 'Tyger Claws', style: 'danger' },
      { text: ' near the ' },
      { text: 'ARASAKA', style: 'glitch' },
      { text: ' sign.' },
    ]);
  });

  it('handles markup at the very start and end', () => {
    expect(parseMarkup('{h|chrome}')).toEqual([{ text: 'chrome', style: 'highlight' }]);
  });

  it('leaves unknown tags and stray braces as literal text', () => {
    expect(parseMarkup('a {x|b} c {oops')).toEqual([{ text: 'a {x|b} c {oops' }]);
  });

  it('returns nothing for empty text', () => {
    expect(parseMarkup('')).toEqual([]);
  });
});

describe('stripMarkup', () => {
  it('returns just the visible text', () => {
    expect(stripMarkup('Type {h|help} if you get lost.')).toBe('Type help if you get lost.');
  });
});
