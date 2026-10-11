import type { Tone } from '../engine/types';
import { stripMarkup } from './markup';
import { typewrite, type Typing } from './typewriter';

type LineTone = Tone | 'echo' | 'divider';

interface QueuedLine {
  text: string;
  tone: LineTone;
  markup: boolean;
  seq: number;
}

/** Milliseconds per character. Lower is faster; 0 prints instantly. */
const TYPE_SPEED: Record<LineTone, number> = {
  narrative: 11,
  system: 4,
  ambient: 18,
  error: 5,
  echo: 0,
  divider: 0,
};

const MAX_LINES = 300;
const MAX_ANNOUNCEMENTS = 20;

export interface FeedElements {
  log: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  /** Visually hidden live region so screen readers get each message once, not letter by letter. */
  announcer: HTMLElement;
}

export interface FeedHandlers {
  onCommand(input: string): void;
  /** Called when a glitch-styled span finishes typing, so effects can animate it. */
  onGlitchText?(el: HTMLElement, text: string): void;
}

/** The scrolling event feed and the optional command line under it. */
export class Feed {
  private queue: QueuedLine[] = [];
  private draining = false;
  private current: Typing | null = null;
  private seq = 0;
  /** Lines queued at or before this sequence number render instantly. */
  private skipThrough = 0;
  /** Whether the log should follow new output (false while the player scrolls back). */
  private pinned = true;
  private autoScrollTop = 0;
  private history: string[] = [];
  private historyIndex = 0;

  constructor(
    private readonly els: FeedElements,
    private readonly handlers: FeedHandlers,
  ) {
    els.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
    els.input.addEventListener('keydown', (event) => this.onKeyDown(event));
    els.log.addEventListener('click', () => this.skipTyping());
    els.log.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = els.log;
      // Only an upward scroll from where we last put it counts as the player reading back;
      // new output landing between frames must not unpin the log.
      if (scrollHeight - scrollTop - clientHeight < 40) this.pinned = true;
      else if (scrollTop < this.autoScrollTop - 4) this.pinned = false;
    });
    // Keep the newest line in view when the window resizes or a phone keyboard opens.
    new ResizeObserver(() => this.follow()).observe(els.log);

    // On a keyboard, start typing anywhere to use the command line.
    document.addEventListener('keydown', (event) => {
      if (event.target === els.input || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length === 1 && event.key !== ' ') els.input.focus();
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

  /** A labeled rule across the feed, e.g. marking arrival somewhere new. */
  divider(label: string): void {
    this.enqueue(label, 'divider', false);
  }

  clear(): void {
    this.skipTyping();
    this.queue = [];
    this.els.log.replaceChildren();
  }

  /** Instantly finishes everything already queued. New output still types normally. */
  skipTyping(): void {
    this.skipThrough = this.seq;
    this.current?.finish();
  }

  announce(text: string): void {
    const note = document.createElement('p');
    note.textContent = text;
    this.els.announcer.append(note);
    while (this.els.announcer.childElementCount > MAX_ANNOUNCEMENTS) this.els.announcer.firstElementChild?.remove();
  }

  private enqueue(text: string, tone: LineTone, markup: boolean): void {
    this.queue.push({ text, tone, markup, seq: ++this.seq });
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    for (let line = this.queue.shift(); line; line = this.queue.shift()) {
      const block = document.createElement('div');
      block.className = `line tone-${line.tone}`;
      this.els.log.append(block);
      while (this.els.log.childElementCount > MAX_LINES) this.els.log.firstElementChild?.remove();

      this.current = typewrite(block, line.text, {
        msPerChar: line.seq <= this.skipThrough ? 0 : TYPE_SPEED[line.tone],
        markup: line.markup,
        onGlitch: (el, text) => this.handlers.onGlitchText?.(el, text),
        onProgress: () => this.follow(),
      });
      await this.current.done;
      this.current = null;
    }
    this.draining = false;
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
      this.els.input.blur();
    }
  }

  private follow(): void {
    if (!this.pinned) return;
    this.els.log.scrollTop = this.els.log.scrollHeight;
    this.autoScrollTop = this.els.log.scrollTop;
  }
}
