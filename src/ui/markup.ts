export type SpanStyle = 'highlight' | 'danger' | 'glitch';

export interface Segment {
  text: string;
  style?: SpanStyle;
}

const TAGS = new Map<string, SpanStyle>([
  ['h', 'highlight'],
  ['w', 'danger'],
  ['g', 'glitch'],
]);

const PATTERN = /\{([a-z])\|([^{}]*)\}/g;

/**
 * Splits text with inline markup into styled segments:
 *   {h|text} highlight · {w|text} danger · {g|text} glitch
 * Unknown tags are left as literal text.
 */
export function parseMarkup(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const style = TAGS.get(match[1] ?? '');
    if (!style) continue;
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    segments.push({ text: match[2] ?? '', style });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

export function stripMarkup(text: string): string {
  return parseMarkup(text)
    .map((segment) => segment.text)
    .join('');
}
