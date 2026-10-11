import type { Tone } from '../engine/types';
import { parseMarkup, stripMarkup, type SpanStyle } from './markup';

type LineTone = Tone | 'echo';

interface QueuedLine {
  text: string;
  tone: LineTone;
  markup: boolean;
  seq: number;
}

/** Milliseconds per character. Lower is faster; 0 prints instantly. */
const TYPE_SPEED: Record<LineTone, number> = {
  narrative: 11,
  heading: 30,
  system: 4,
  ambient: 22,
  error: 5,
  echo: 0,
};

const SPAN_CLASS: Record<SpanStyle, string> = { highlight: 'hl', danger: 'danger', glitch: 'gl' };

const MAX_LINES = 400;
const MAX_ANNOUNCEMENTS = 20;

export interface TerminalElements {
  log: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  /** Visually hidden live region so screen readers get each line once, not letter by letter. */
  announcer: HTMLElement;
}

export interface TerminalHandlers {
  onCommand(input: string): void;
  /** Called when a glitch-styled span finishes typing, so effects can animate it. */
  onGlitchText?(el: HTMLElement, text: string): void;
}

/** The scrolling text log and command prompt, with a skippable typewriter. */
export class Terminal {
  private queue: QueuedLine[] = [];
  private draining = false;
  private seq = 0;
  /** Lines queued at or before this sequence number render instantly. */
  private skipThrough = 0;
  /** Whether the log should follow new output (false while the player scrolls back). */
  private pinned = true;
  private autoScrollTop = 0;
  private history: string[] = [];
  private historyIndex = 0;

  constructor(
    private readonly els: TerminalElements,
    private readonly handlers: TerminalHandlers,
  ) {
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
    els.input.addEventListener('keydown', (event) => this.onKeyDown(event));
    els.log.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = els.log;
      // Only an upward scroll from where we last put it counts as the player reading back;
      // new output landing between frames must not unpin the log.
      if (scrollHeight - scrollTop - clientHeight < 40) this.pinned = true;
      else if (scrollTop < this.autoScrollTop - 4) this.pinned = false;
    });
    // Keep the newest line in view when the window resizes or a phone keyboard opens.
    new ResizeObserver(() => this.follow()).observe(els.log);
    // Clicking anywhere finishes the current text and returns focus to the prompt.
    document.addEventListener('click', () => {
      this.skipTyping();
      if (!getSelection()?.toString()) els.input.focus();
    });
  }

  /** True when nothing is typing or waiting to type. */
  get idle(): boolean {
    return !this.draining && this.queue.length === 0;
  }

  print(text: string, tone: Tone): void {
    this.enqueue(text, tone, true);
    this.announce(stripMarkup(text));
  }

  clear(): void {
    this.skipTyping();
    this.queue = [];
    this.els.log.replaceChildren();
  }

  /** Instantly finishes everything already queued. New output still types normally. */
  skipTyping(): void {
    this.skipThrough = this.seq;
  }

  private enqueue(text: string, tone: LineTone, markup: boolean): void {
    this.queue.push({ text, tone, markup, seq: ++this.seq });
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    for (let line = this.queue.shift(); line; line = this.queue.shift()) {
      await this.typeLine(line);
    }
    this.draining = false;
  }

  private typeLine(line: QueuedLine): Promise<void> {
    const block = document.createElement('div');
    block.className = `line tone-${line.tone}`;
    const segments = line.markup ? parseMarkup(line.text) : [{ text: line.text }];
    const parts = segments.map((segment) => {
      const span = document.createElement('span');
      if (segment.style) span.className = SPAN_CLASS[segment.style];
      block.append(span);
      return { span, segment };
    });
    this.els.log.append(block);
    while (this.els.log.childElementCount > MAX_LINES) this.els.log.firstElementChild?.remove();

    const finish = () => {
      block.classList.remove('typing');
      for (const { span, segment } of parts) {
        span.textContent = segment.text;
        if (segment.style === 'glitch') {
          span.dataset.text = segment.text;
          span.style.setProperty('--gl-delay', `${(-Math.random() * 4).toFixed(2)}s`);
          this.handlers.onGlitchText?.(span, segment.text);
        }
      }
      this.follow();
    };

    const total = parts.reduce((sum, { segment }) => sum + segment.text.length, 0);
    const msPerChar = TYPE_SPEED[line.tone];
    if (total === 0 || msPerChar === 0 || line.seq <= this.skipThrough) {
      finish();
      return Promise.resolve();
    }

    block.classList.add('typing');
    return new Promise((resolve) => {
      const startedAt = performance.now();
      let shown = 0;
      let partIndex = 0;
      let partShown = 0;

      const step = (now: number) => {
        if (line.seq <= this.skipThrough || !block.isConnected) {
          finish();
          resolve();
          return;
        }
        const target = Math.min(total, Math.floor((now - startedAt) / msPerChar) + 1);
        while (shown < target) {
          const part = parts[partIndex];
          if (!part) break;
          const take = Math.min(part.segment.text.length - partShown, target - shown);
          partShown += take;
          shown += take;
          part.span.textContent = part.segment.text.slice(0, partShown);
          if (partShown >= part.segment.text.length) {
            partIndex++;
            partShown = 0;
          }
        }
        this.follow();
        if (shown >= total) {
          finish();
          resolve();
        } else {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    });
  }

  private submit(): void {
    const value = this.els.input.value;
    this.els.input.value = '';
    this.skipTyping();
    if (!value.trim()) return;

    if (this.history.at(-1) !== value) this.history.push(value);
    this.historyIndex = this.history.length;
    this.pinned = true;
    this.enqueue(value, 'echo', false);
    this.handlers.onCommand(value);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      this.historyIndex = Math.max(0, Math.min(this.history.length, this.historyIndex + delta));
      this.els.input.value = this.history[this.historyIndex] ?? '';
    } else if (event.key === 'Escape') {
      this.skipTyping();
    }
  }

  private follow(): void {
    if (!this.pinned) return;
    this.els.log.scrollTop = this.els.log.scrollHeight;
    this.autoScrollTop = this.els.log.scrollTop;
  }

  private announce(text: string): void {
    const note = document.createElement('p');
    note.textContent = text;
    this.els.announcer.append(note);
    while (this.els.announcer.childElementCount > MAX_ANNOUNCEMENTS) this.els.announcer.firstElementChild?.remove();
  }
}
