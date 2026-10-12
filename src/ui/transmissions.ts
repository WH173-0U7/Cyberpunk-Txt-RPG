import type { Tone } from '../engine/types';
import { stripMarkup } from './markup';
import { typewrite, type Typing } from './typewriter';

/** Milliseconds per character, and how long a finished message stays up. */
const TYPE_MS = 16;
const HOLD_MS = 4200;
/** Older messages are dropped rather than piling up. */
const MAX_WAITING = 2;
const MAX_ANNOUNCEMENTS = 20;

interface Message {
  text: string;
  tone: Tone;
}

export interface TransmissionElements {
  /** Where messages appear, over the top of the map. */
  root: HTMLElement;
  /** Visually hidden live region so screen readers get each message once, not letter by letter. */
  announcer: HTMLElement;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Short messages that type across the map one at a time, then fade. Nothing is kept. */
export class Transmissions {
  private queue: Message[] = [];
  private active = false;
  private typing: Typing | null = null;
  /** Bumped by clear(), so a message mid-display knows it was cancelled. */
  private generation = 0;

  constructor(
    private readonly els: TransmissionElements,
    private readonly onGlitchText: (el: HTMLElement, text: string) => void,
    private readonly reducedMotion: boolean,
  ) {}

  /** True when nothing is showing or waiting. */
  get idle(): boolean {
    return !this.active && this.queue.length === 0;
  }

  push(text: string, tone: Tone): void {
    this.announce(stripMarkup(text));
    this.queue.push({ text, tone });
    while (this.queue.length > MAX_WAITING) this.queue.shift();
    if (!this.active) void this.next();
  }

  clear(): void {
    this.generation++;
    this.queue = [];
    this.typing?.finish();
    this.els.root.replaceChildren();
    this.active = false;
  }

  announce(text: string): void {
    const note = document.createElement('p');
    note.textContent = text;
    this.els.announcer.append(note);
    while (this.els.announcer.childElementCount > MAX_ANNOUNCEMENTS) this.els.announcer.firstElementChild?.remove();
  }

  private async next(): Promise<void> {
    const message = this.queue.shift();
    if (!message) {
      this.active = false;
      return;
    }
    this.active = true;
    const generation = this.generation;

    const card = document.createElement('div');
    card.className = `transmission tone-${message.tone}`;
    const body = document.createElement('span');
    card.append(body);
    this.els.root.replaceChildren(card);
    if (!this.reducedMotion) {
      card.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
    }

    this.typing = typewrite(body, message.text, {
      msPerChar: this.reducedMotion ? 0 : TYPE_MS,
      onGlitch: (el, text) => this.onGlitchText(el, text),
    });
    await this.typing.done;
    await wait(HOLD_MS + stripMarkup(message.text).length * 20);
    if (generation !== this.generation) return;

    await card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.catch(() => undefined);
    if (generation !== this.generation) return;
    card.remove();
    void this.next();
  }
}
