import type { Location } from '../engine/types';
import { stripMarkup } from './markup';
import { typewrite, type Typing } from './typewriter';

const TYPE_MS = 9;

export interface SceneElements {
  beam: HTMLElement;
  text: HTMLElement;
}

export interface SceneHandlers {
  onGlitchText(el: HTMLElement, text: string): void;
  announce(text: string): void;
}

/** The location card: the place's short description, typed out under an optic-scan sweep. */
export class SceneView {
  private typing: Typing | null = null;

  constructor(
    private readonly els: SceneElements,
    private readonly handlers: SceneHandlers,
    private readonly reducedMotion: boolean,
  ) {}

  show(location: Location): void {
    this.typing?.finish();
    this.typing = typewrite(this.els.text, location.description, {
      msPerChar: TYPE_MS,
      onGlitch: (el, text) => this.handlers.onGlitchText(el, text),
    });
    this.scan();
    this.handlers.announce(`${location.name}. ${stripMarkup(location.description)}`);
  }

  /** Sweeps a band of light down the card, like an optic scan. */
  private scan(): void {
    if (this.reducedMotion) return;
    this.els.beam.animate(
      [
        { transform: 'translateY(-100%)', opacity: 1 },
        { transform: 'translateY(100%)', opacity: 0.2 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' },
    );
  }
}
