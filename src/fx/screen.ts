import type { FxName } from '../engine/types';

export interface ScreenElements {
  /** The element that shakes and tears (the whole game UI). */
  app: HTMLElement;
  /** Full-screen overlay used for flashes. */
  flash: HTMLElement;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Whole-screen effects. Motion-heavy ones are toned down for prefers-reduced-motion. */
export class ScreenFx {
  constructor(
    private readonly els: ScreenElements,
    private readonly reducedMotion: boolean,
  ) {}

  play(effect: FxName): void {
    switch (effect) {
      case 'glitch':
        return this.glitch();
      case 'shake':
        return this.shake();
      case 'flash':
        return this.flash();
      case 'lightning':
        return this.lightning();
    }
  }

  /** Signal tear: random horizontal slices, sideways jumps and an RGB split. Different every time. */
  glitch(duration = 520): void {
    if (this.reducedMotion) {
      this.els.app.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 200 });
      return;
    }
    const frames: Keyframe[] = [];
    for (let i = 0; i < 9; i++) {
      const dx = rand(-16, 16);
      const top = rand(0, 70);
      const bottom = rand(0, 95 - top);
      frames.push({
        clipPath: i % 2 ? 'inset(0 0 0 0)' : `inset(${top}% 0 ${bottom}% 0)`,
        transform: `translateX(${dx}px) skewX(${rand(-4, 4)}deg)`,
        filter: `drop-shadow(${dx / 3}px 0 0 rgba(255, 0, 84, 0.85)) drop-shadow(${-dx / 3}px 0 0 rgba(0, 240, 255, 0.85)) brightness(1.3)`,
        easing: 'steps(1, end)',
      });
    }
    frames.push({ clipPath: 'inset(0 0 0 0)', transform: 'none', filter: 'none' });
    this.els.app.animate(frames, { duration });
  }

  /** Impact jolt that settles quickly. */
  shake(strength = 12, duration = 450): void {
    if (this.reducedMotion) return;
    const frames: Keyframe[] = [];
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const force = strength * (1 - i / steps);
      frames.push({ transform: `translate(${rand(-force, force)}px, ${rand(-force, force)}px)` });
    }
    frames.push({ transform: 'none' });
    this.els.app.animate(frames, { duration });
  }

  /** A burst of colored light, like taking a hit. */
  flash(color = 'var(--secondary)', peak = 0.4, duration = 380): void {
    const { flash } = this.els;
    flash.style.background = color;
    flash.animate([{ opacity: this.reducedMotion ? peak / 3 : peak }, { opacity: 0 }], { duration, easing: 'ease-out' });
  }

  /** A double flicker of cold white light. */
  lightning(): void {
    if (this.reducedMotion) return;
    const { flash } = this.els;
    flash.style.background = '#dfe8ff';
    flash.animate(
      [
        { opacity: 0 },
        { opacity: 0.3, offset: 0.08 },
        { opacity: 0.03, offset: 0.22 },
        { opacity: 0.2, offset: 0.32 },
        { opacity: 0 },
      ],
      { duration: 1000, easing: 'ease-out' },
    );
  }

  /** A small jitter and red pulse on one element, e.g. the prompt after a bad command. */
  nudge(el: HTMLElement): void {
    const red = 'rgba(255, 51, 85, 0.18)';
    if (this.reducedMotion) {
      el.animate([{ backgroundColor: red }, { backgroundColor: 'transparent' }], { duration: 300 });
      return;
    }
    el.animate(
      [
        { transform: 'none', backgroundColor: red },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(2px)' },
        { transform: 'none', backgroundColor: 'transparent' },
      ],
      { duration: 300 },
    );
  }
}
