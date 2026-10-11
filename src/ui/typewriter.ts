import { parseMarkup, type SpanStyle } from './markup';

const SPAN_CLASS: Record<SpanStyle, string> = { highlight: 'hl', danger: 'danger', glitch: 'gl' };

export interface TypeOptions {
  /** Milliseconds per character; 0 shows everything at once. */
  msPerChar: number;
  /** Parse {h|…} markup. Off for raw player input. */
  markup?: boolean;
  /** Called for each glitch-styled span once it is fully shown. */
  onGlitch?: (el: HTMLElement, text: string) => void;
  /** Called whenever more text appears, e.g. to keep a log scrolled down. */
  onProgress?: () => void;
}

export interface Typing {
  /** Resolves once all the text is shown (or the target was replaced). */
  done: Promise<void>;
  /** Shows the rest of the text immediately. */
  finish(): void;
}

/** Replaces the target's content with `text`, revealed a character at a time. */
export function typewrite(target: HTMLElement, text: string, options: TypeOptions): Typing {
  const segments = options.markup === false ? [{ text }] : parseMarkup(text);
  const parts = segments.map((segment) => {
    const span = document.createElement('span');
    if (segment.style) span.className = SPAN_CLASS[segment.style];
    return { span, segment };
  });
  target.replaceChildren(...parts.map((part) => part.span));

  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => (resolveDone = resolve));
  let finished = false;
  // Someone else may reuse the target before we're done; then stop without touching it.
  const stillOwned = () => target.isConnected && (parts[0]?.span.parentNode ?? target) === target;

  const finish = () => {
    if (finished) return;
    finished = true;
    if (stillOwned()) {
      target.classList.remove('typing');
      for (const { span, segment } of parts) {
        span.textContent = segment.text;
        if (segment.style === 'glitch') {
          span.dataset.text = segment.text;
          span.style.setProperty('--gl-delay', `${(-Math.random() * 4).toFixed(2)}s`);
          options.onGlitch?.(span, segment.text);
        }
      }
      options.onProgress?.();
    }
    resolveDone();
  };

  const total = parts.reduce((sum, { segment }) => sum + segment.text.length, 0);
  if (total === 0 || options.msPerChar <= 0) {
    finish();
    return { done, finish };
  }

  target.classList.add('typing');
  const startedAt = performance.now();
  let shown = 0;
  let partIndex = 0;
  let partShown = 0;

  const step = (now: number) => {
    if (finished) return;
    if (!stillOwned()) {
      finished = true;
      resolveDone();
      return;
    }
    const goal = Math.min(total, Math.floor((now - startedAt) / options.msPerChar) + 1);
    while (shown < goal) {
      const part = parts[partIndex];
      if (!part) break;
      const take = Math.min(part.segment.text.length - partShown, goal - shown);
      partShown += take;
      shown += take;
      part.span.textContent = part.segment.text.slice(0, partShown);
      if (partShown >= part.segment.text.length) {
        partIndex++;
        partShown = 0;
      }
    }
    options.onProgress?.();
    if (shown >= total) finish();
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  return { done, finish };
}
