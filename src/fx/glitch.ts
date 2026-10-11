const GLYPHS = '!<>-_\\/[]{}=+*^?#%&01';
const MAX_TRACKED = 30;

interface GlitchSpan {
  el: HTMLElement;
  text: string;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Every few seconds, briefly scrambles one of the recent {g|glitch} words on screen. */
export class GlitchText {
  private spans: GlitchSpan[] = [];

  constructor(private readonly reducedMotion: boolean) {
    if (!reducedMotion) this.schedule();
  }

  register(el: HTMLElement, text: string): void {
    this.spans.push({ el, text });
    if (this.spans.length > MAX_TRACKED) this.spans.shift();
    if (!this.reducedMotion) this.scramble({ el, text }, 420);
  }

  private schedule(): void {
    setTimeout(() => {
      this.spans = this.spans.filter((span) => span.el.isConnected);
      const recent = this.spans.slice(-6);
      const pick = recent[Math.floor(Math.random() * recent.length)];
      if (pick && !document.hidden) this.scramble(pick, rand(180, 320));
      this.schedule();
    }, rand(1500, 4000));
  }

  private scramble({ el, text }: GlitchSpan, duration: number): void {
    const start = performance.now();
    const frame = (now: number) => {
      const progress = (now - start) / duration;
      if (progress >= 1 || !el.isConnected) {
        el.textContent = text;
        return;
      }
      // Corruption is heaviest at the start and resolves back to the real text.
      const corruption = 0.7 * (1 - progress) + 0.05;
      el.textContent = Array.from(text, (ch) =>
        ch !== ' ' && Math.random() < corruption ? (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ch) : ch,
      ).join('');
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
