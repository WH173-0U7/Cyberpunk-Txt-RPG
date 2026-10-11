import type { Weather } from '../engine/types';

const WEATHER_LABEL: Record<Weather, string> = {
  rain: 'Heavy rain',
  drizzle: 'Drizzle',
  dust: 'Dust storm',
  haze: 'Indoors',
  clear: 'Clear',
};

export interface HudElements {
  sign: HTMLElement;
  path: HTMLElement;
  weather: HTMLElement;
  clock: HTMLElement;
}

const slug = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const pad = (n: number) => String(n).padStart(2, '0');

/** The status bar and neon location sign above the terminal. */
export class Hud {
  constructor(private readonly els: HudElements) {
    this.tick();
    setInterval(() => this.tick(), 1000);
  }

  setLocation(name: string, district: string, weather: Weather): void {
    this.els.sign.textContent = name;
    this.els.path.textContent = `NCNET://${slug(district)}/${slug(name)}`;
    this.els.weather.textContent = WEATHER_LABEL[weather];
    this.flickerSign();
  }

  /** Replays the sign's power-up flicker, as if its tubes just came back on. */
  flickerSign(): void {
    const { sign } = this.els;
    sign.classList.remove('sign-boot');
    void sign.offsetWidth; // restart the CSS animation
    sign.classList.add('sign-boot');
  }

  private tick(): void {
    const now = new Date();
    this.els.clock.textContent =
      `2077.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}
