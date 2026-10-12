import type { Building, District, Location } from '../engine/types';
import { stripMarkup } from './markup';
import { typewrite, type Typing } from './typewriter';

const TYPE_MS = 9;

export interface PlaceElements {
  root: HTMLElement;
  beam: HTMLElement;
  kicker: HTMLElement;
  title: HTMLElement;
  meta: HTMLElement;
  description: HTMLElement;
  actions: HTMLElement;
  travel: HTMLButtonElement;
  close: HTMLButtonElement;
}

export interface PlaceHandlers {
  onTravel(): void;
  onClose(): void;
  onGlitchText(el: HTMLElement, text: string): void;
  announce(text: string): void;
}

/** The strip under the map: where you are, the destination you've picked, or a building you tapped. */
export class PlacePanel {
  private typing: Typing | null = null;

  constructor(
    private readonly els: PlaceElements,
    private readonly handlers: PlaceHandlers,
    private readonly reducedMotion: boolean,
  ) {
    els.travel.addEventListener('click', () => handlers.onTravel());
    els.close.addEventListener('click', () => handlers.onClose());
  }

  showCurrent(location: Location, district: District): void {
    const { els } = this;
    els.root.classList.remove('is-destination', 'is-building');
    els.kicker.textContent = `You are here · ${district.name} · ${location.kindLabel}`;
    els.title.hidden = true;
    els.meta.hidden = true;
    els.description.hidden = false;
    els.actions.hidden = true;
    this.type(location.description);
    this.scan();
    this.handlers.announce(`${location.name}. ${stripMarkup(location.description)}`);
  }

  /** `stops` is how many legs the trip takes. The full description waits until you arrive. */
  showDestination(location: Location, district: District, stops: number, explored: boolean): void {
    const { els } = this;
    const distance = stops === 1 ? 'Next door' : `${stops} stops away`;
    this.typing?.finish();
    els.root.classList.remove('is-building');
    els.root.classList.add('is-destination');
    els.kicker.textContent = `${distance} · ${district.name}`;
    els.title.textContent = location.name;
    els.title.hidden = false;
    els.meta.textContent = `${location.kindLabel} · ${explored ? 'Been here' : 'Unexplored'}`;
    els.meta.hidden = false;
    els.description.hidden = true;
    els.actions.hidden = false;
    els.travel.hidden = false;
    els.travel.disabled = false;
    this.handlers.announce(`${location.name}, ${district.name}. ${distance}. Press Travel to go there.`);
  }

  /** A building picked out on the map: what it is and where. Nothing to do inside, yet. */
  showBuilding(building: Building, district: District | undefined): void {
    const { els } = this;
    const where = district ? `Block ${building.block} · ${district.name}` : `Block ${building.block}`;
    const height = building.floors > 1 ? `${building.floors} floors` : '';
    this.typing?.finish();
    els.root.classList.remove('is-destination');
    els.root.classList.add('is-building');
    els.kicker.textContent = where;
    els.title.textContent = building.name;
    els.title.hidden = false;
    els.meta.textContent = [building.kindLabel, height].filter(Boolean).join(' · ');
    els.meta.hidden = false;
    els.description.hidden = true;
    els.actions.hidden = false;
    els.travel.hidden = true;
    this.handlers.announce(`${building.name}. ${[building.kindLabel, height].filter(Boolean).join(', ')}. ${where}.`);
  }

  /** Locks the Travel button while a trip is underway. */
  setTraveling(traveling: boolean): void {
    this.els.travel.disabled = traveling;
  }

  private type(text: string): void {
    this.typing?.finish();
    this.typing = typewrite(this.els.description, text, {
      msPerChar: TYPE_MS,
      onGlitch: (el, glitchText) => this.handlers.onGlitchText(el, glitchText),
    });
  }

  /** Sweeps a band of light across the panel, like an optic scan. */
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
