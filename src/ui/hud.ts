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
const SIGN_MIN = 16;

/** The status bar and neon location sign above the terminal. */
export class Hud {
  constructor(private readonly els: HudElements) {
    this.tick();
    setInterval(() => this.tick(), 1000);
    // The sign refits when the screen turns or the window changes.
    window.addEventListener('resize', () => this.fitSign());
  }

  /** The sign says where you are; the address above it says the district (the sign has the name). */
  setLocation(name: string, district: string): void {
    this.els.sign.textContent = name;
    this.els.path.textContent = `NCNET://${slug(district)}`;
    this.fitSign();
    this.flickerSign();
  }

  /** Shrinks the sign's letters, as far as they'll go, until a long name fits on its one line. */
  private fitSign(): void {
    const { sign } = this.els;
    sign.style.fontSize = '';
    let size = parseFloat(getComputedStyle(sign).fontSize);
    while (sign.scrollWidth > sign.clientWidth && size > SIGN_MIN) {
      size -= 1;
      sign.style.fontSize = `${size}px`;
    }
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
