import type { Pronouns } from '../engine/people';
import { MapOverlay, type OverlayElements } from './overlay';

/** What settings shows about the game in progress. */
export interface SettingsView {
  seed: string;
  /** What starting over would lose, e.g. "Mapped 3/14 · €$ 47". */
  progress: string;
  /** Which build this is: "Stable build 0.1.0 (a283362)", or the beta. */
  build: string;
  /** The pronouns the player goes by. */
  pronouns: Pronouns;
}

export interface SettingsElements extends OverlayElements {
  seed: HTMLElement;
  progress: HTMLElement;
  build: HTMLElement;
  restart: HTMLButtonElement;
  erase: HTMLButtonElement;
  confirm: HTMLElement;
  confirmText: HTMLElement;
  confirmYes: HTMLButtonElement;
  confirmNo: HTMLButtonElement;
  /** The pronoun choices, a button each with `data-pronouns`. */
  pronouns: HTMLElement;
  /** Back to the title screen. */
  menu: HTMLButtonElement;
}

export interface SettingsHandlers {
  /** Same city, all progress back to the start. */
  onRestart(): void;
  /** Delete the save from this device and start a brand new city. */
  onErase(): void;
  /** The player picked the pronouns they go by. */
  onPronouns(pronouns: Pronouns): void;
  /** Back to the title screen, the game kept as it is. */
  onMenu(): void;
}

type Danger = 'restart' | 'erase';

const ASK: Record<Danger, { text: string; yes: string }> = {
  restart: {
    text: 'Start this city over? Your map, eddies, NCART pass and items all go back to the start. This can’t be undone.',
    yes: 'Yes, restart',
  },
  erase: {
    text: 'Erase your save? This city and everything you’ve done in it are deleted from this device, and you go back to the main menu to make someone new. This can’t be undone.',
    yes: 'Yes, erase',
  },
};

/**
 * Settings, over the map: who the player is (the pronouns they go by, which decides who's
 * drawn to them), and the save: back to the main menu, start this city over, or erase the save
 * and make someone new. The last two ask first, and nothing happens until the second tap.
 */
export class Settings {
  readonly overlay: MapOverlay;
  private asking: Danger | null = null;

  constructor(
    private readonly els: SettingsElements,
    /** Called just before it opens, to fill it in. */
    onOpen: () => void,
    handlers: SettingsHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => this.ask(null), reducedMotion);
    els.restart.addEventListener('click', () => this.ask('restart'));
    els.erase.addEventListener('click', () => this.ask('erase'));
    els.menu.addEventListener('click', () => handlers.onMenu());
    els.confirmNo.addEventListener('click', () => this.ask(null, true));
    els.pronouns.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-pronouns]') : null;
      const pronouns = button?.dataset.pronouns;
      if (pronouns === 'she' || pronouns === 'he' || pronouns === 'they') handlers.onPronouns(pronouns);
    });
    els.confirmYes.addEventListener('click', () => {
      const danger = this.asking;
      this.ask(null);
      if (danger === 'restart') handlers.onRestart();
      else if (danger === 'erase') handlers.onErase();
    });
  }

  render(view: SettingsView): void {
    this.els.seed.textContent = `Seed ${view.seed}`;
    this.els.progress.textContent = view.progress;
    this.els.build.textContent = view.build;
    for (const button of this.els.pronouns.querySelectorAll<HTMLButtonElement>('[data-pronouns]')) button.setAttribute('aria-pressed', String(button.dataset.pronouns === view.pronouns));
  }

  /** Shows the question for a dangerous choice, or puts it away (null). */
  private ask(danger: Danger | null, refocus = false): void {
    const { confirm, confirmText, confirmYes, restart, erase } = this.els;
    const was = this.asking;
    this.asking = danger;
    confirm.hidden = danger === null;
    restart.setAttribute('aria-expanded', String(danger === 'restart'));
    erase.setAttribute('aria-expanded', String(danger === 'erase'));
    if (danger) {
      confirmText.textContent = ASK[danger].text;
      confirmYes.textContent = ASK[danger].yes;
      // Cancel is the safe default, so focus lands there, not on the button that erases.
      this.els.confirmNo.focus({ preventScroll: true });
    } else if (refocus && was) {
      (was === 'restart' ? restart : erase).focus({ preventScroll: true });
    }
  }
}
