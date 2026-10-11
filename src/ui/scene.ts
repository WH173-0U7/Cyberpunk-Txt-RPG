import type { PointOfInterest, Scene } from '../engine/types';
import { stripMarkup } from './markup';
import { typewrite, type Typing } from './typewriter';

const TYPE_MS = 9;

export interface SceneElements {
  card: HTMLElement;
  beam: HTMLElement;
  text: HTMLElement;
  inspect: HTMLElement;
  inspectTitle: HTMLElement;
  inspectText: HTMLElement;
  inspectClose: HTMLButtonElement;
  poiBlock: HTMLElement;
  pois: HTMLElement;
}

export interface SceneHandlers {
  onExamine(poiId: string): void;
  onGlitchText(el: HTMLElement, text: string): void;
  announce(text: string): void;
}

/** The location card: a short description and tappable points of interest. */
export class SceneView {
  private typing: Typing | null = null;
  private location: Scene['location'] | null = null;

  constructor(
    private readonly els: SceneElements,
    private readonly handlers: SceneHandlers,
    private readonly reducedMotion: boolean,
  ) {
    els.inspectClose.addEventListener('click', () => this.closeInspect());
  }

  show(scene: Scene): void {
    const { location } = scene;
    this.closeInspect();
    this.type(this.els.text, location.description);
    if (location !== this.location) this.renderPois(location.pois ?? []);
    this.location = location;
    this.scan();
    this.handlers.announce(`${location.name}. ${stripMarkup(location.description)}`);
  }

  inspect(poi: PointOfInterest): void {
    const { els } = this;
    els.text.hidden = true;
    els.inspect.hidden = false;
    els.inspectTitle.textContent = poi.name;
    this.type(els.inspectText, poi.description);
    this.pressChip(poi.id);
    if (!this.reducedMotion) {
      els.inspect.animate(
        [
          { opacity: 0, transform: 'translateX(-8px)', filter: 'blur(3px)' },
          { opacity: 1, transform: 'none', filter: 'none' },
        ],
        { duration: 240, easing: 'ease-out' },
      );
    }
    this.handlers.announce(`${poi.name}. ${stripMarkup(poi.description)}`);
  }

  /** Back to the location overview. */
  closeInspect(): void {
    const { els } = this;
    if (els.inspect.hidden) return;
    this.typing?.finish();
    els.inspect.hidden = true;
    els.text.hidden = false;
    this.pressChip(null);
  }

  private renderPois(pois: PointOfInterest[]): void {
    const chips = pois.map((poi, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'poi';
      chip.dataset.poi = poi.id;
      chip.textContent = poi.name;
      chip.setAttribute('aria-pressed', 'false');
      chip.style.setProperty('--i', String(index));
      chip.addEventListener('click', () => {
        if (chip.getAttribute('aria-pressed') === 'true') this.closeInspect();
        else this.handlers.onExamine(poi.id);
      });
      return chip;
    });
    this.els.pois.replaceChildren(...chips);
    this.els.poiBlock.hidden = chips.length === 0;
  }

  private pressChip(id: string | null): void {
    for (const chip of this.els.pois.querySelectorAll<HTMLElement>('.poi')) {
      chip.setAttribute('aria-pressed', String(chip.dataset.poi === id));
    }
  }

  private type(target: HTMLElement, text: string): void {
    this.typing?.finish();
    this.typing = typewrite(target, text, {
      msPerChar: TYPE_MS,
      onGlitch: (el, glitchText) => this.handlers.onGlitchText(el, glitchText),
    });
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
