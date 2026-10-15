import type { Weather } from '../engine/types';

export const WEATHER_LABEL: Record<Weather, string> = {
  rain: 'Heavy rain',
  drizzle: 'Drizzle',
  dust: 'Dust storm',
  haze: 'Hazy',
  clear: 'Clear',
};

export interface HudElements {
  sign: HTMLElement;
  path: HTMLElement;
  clock: HTMLElement;
}

const slug = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const pad = (n: number) => String(n).padStart(2, '0');

/** The sign's letters never go below this, in pixels; a name longer than that gets an ellipsis. */
const SIGN_MIN = 12;
/** Nor the address's. */
const PATH_MIN = 7;

/** Shrinks an element's letters, as far as `min`, until its text fits on its one line. */
function shrinkToFit(el: HTMLElement, min: number, step: number): void {
  el.style.fontSize = '';
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth && size > min) {
    size -= step;
    el.style.fontSize = `${size}px`;
  }
}

/** The status bar and neon location sign above the terminal. */
export class Hud {
  constructor(private readonly els: HudElements) {
    this.tick();
    setInterval(() => this.tick(), 1000);
    // The sign refits when the screen turns or the window changes, and once its font has come in
    // (measured in the fallback, a long name fits at a size the real letters overflow).
    window.addEventListener('resize', () => this.fit());
    document.fonts?.addEventListener('loadingdone', () => this.fit());
    void document.fonts?.ready.then(() => this.fit());
  }

  /**
   * The sign says where you are; the address above it says the neighborhood and the district
   * (the sign has the name), most particular first like a host name, so a long one loses the
   * district to the ellipsis rather than the neighborhood.
   */
  setLocation(name: string, district: string, neighborhood: string | null = null): void {
    this.els.sign.textContent = name;
    this.els.path.textContent = neighborhood ? `NCNET://${slug(neighborhood)}.${slug(district)}` : `NCNET://${slug(district)}`;
    this.fit();
    this.flickerSign();
  }

  private fit(): void {
    shrinkToFit(this.els.sign, SIGN_MIN, 1);
    // The address too: the district is the only place it's said, so it mustn't go to the ellipsis.
    shrinkToFit(this.els.path, PATH_MIN, 0.5);
  }

  /** Replays the sign's power-up flicker, as if its tubes just came back on. */
  flickerSign(): void {
    const { sign } = this.els;
    sign.classList.remove('sign-boot');
    void sign.offsetWidth; // restart the CSS animation
    sign.classList.add('sign-boot');
  }

  /** The time of day, and no more: the date is the status drop-down's. */
  private tick(): void {
    const now = new Date();
    this.els.clock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}
