import type { EnergyStatus } from '../engine/energy';
import { formatCountdown } from './format';

export interface EnergyElements {
  root: HTMLElement;
  fill: HTMLElement;
}

/** Above this many points the bar is marked off in fives instead of one segment per point. */
const MAX_SEGMENTS = 40;

/**
 * The energy bar under the sign: how much there is and how much there could be, a segment a
 * point. The figures, the level, the experience and when the next point comes back are the
 * status line's and the drop-down's. It only touches the page when something it shows has
 * changed, so it can be updated on every tick of the clock.
 */
export class EnergyMeter {
  private shown = '';

  constructor(private readonly els: EnergyElements) {}

  update(status: EnergyStatus, now: number): void {
    const { current, max, level, xp, xpToNext, nextPointAt } = status;
    const refill = nextPointAt === null ? 'Full' : `+1 in ${formatCountdown(nextPointAt - now)}`;
    const key = `${current}/${max}|${level}|${xp}|${refill}`;
    if (key === this.shown) return;
    this.shown = key;

    const { root, fill } = this.els;
    fill.style.width = `${(100 * current) / Math.max(1, max)}%`;
    root.style.setProperty('--segments', String(max <= MAX_SEGMENTS ? max : Math.ceil(max / 5)));
    root.classList.toggle('is-empty', current === 0);
    root.setAttribute('aria-valuenow', String(current));
    root.setAttribute('aria-valuemax', String(max));
    root.setAttribute('aria-valuetext', `${current} of ${max} energy. Level ${level}, ${xp} of ${xpToNext} experience. ${refill}.`);
  }
}
