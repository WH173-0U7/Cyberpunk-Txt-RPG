import { typewrite, type Typing } from './typewriter';

const TYPE_MS = 9;

export type ActionId = 'walk' | 'ride' | 'pass' | 'stop' | 'enter' | 'leave' | 'menu' | 'people' | 'bank' | 'work';

export interface PanelAction {
  id: ActionId;
  label: string;
  /** A second, smaller line: how long, how much. */
  sub?: string;
  disabled?: boolean;
  /** A lesser choice, drawn small and plain. */
  quiet?: boolean;
}

/** One state of the panel: where you are, inside a building, something you've picked, or a trip underway. */
export interface PanelView {
  mode: 'here' | 'inside' | 'target' | 'trip';
  kicker: string;
  title?: string;
  meta?: string;
  /** Typed out, and only when it changes. */
  description?: string;
  actions: PanelAction[];
  closable: boolean;
  /** How far through a trip, 0–1. */
  progress?: number;
  /** What a screen reader hears when the view appears. */
  announce: string;
}

export interface PlaceElements {
  root: HTMLElement;
  beam: HTMLElement;
  kicker: HTMLElement;
  title: HTMLElement;
  meta: HTMLElement;
  description: HTMLElement;
  progress: HTMLElement;
  actions: HTMLElement;
  buttons: Record<ActionId, HTMLButtonElement>;
  close: HTMLButtonElement;
}

export interface PlaceHandlers {
  onAction(id: ActionId): void;
  onClose(): void;
  onGlitchText(el: HTMLElement, text: string): void;
  announce(text: string): void;
}

/** The strip under the map. It shows whatever view it's given; the game decides what that is. */
export class PlacePanel {
  private typing: Typing | null = null;
  private typed = '';
  private announced = '';

  constructor(
    private readonly els: PlaceElements,
    private readonly handlers: PlaceHandlers,
    private readonly reducedMotion: boolean,
  ) {
    for (const [id, button] of Object.entries(els.buttons) as Array<[ActionId, HTMLButtonElement]>) {
      button.addEventListener('click', () => handlers.onAction(id));
    }
    els.close.addEventListener('click', () => handlers.onClose());
  }

  show(view: PanelView): void {
    const { els } = this;
    els.root.classList.remove('is-here', 'is-inside', 'is-target', 'is-trip');
    els.root.classList.add(`is-${view.mode}`);
    els.kicker.textContent = view.kicker;
    setText(els.title, view.title);
    setText(els.meta, view.meta);

    if (view.description) {
      els.description.hidden = false;
      if (view.description !== this.typed) {
        this.typed = view.description;
        this.typing?.finish();
        this.typing = typewrite(els.description, view.description, {
          msPerChar: TYPE_MS,
          onGlitch: (el, glitchText) => this.handlers.onGlitchText(el, glitchText),
        });
      }
    } else {
      this.typing?.finish();
      this.typed = '';
      els.description.hidden = true;
    }

    els.progress.hidden = view.progress === undefined;
    if (view.progress !== undefined) this.setProgress(view.progress);

    const shown = new Set(view.actions.map((a) => a.id));
    for (const [id, button] of Object.entries(els.buttons) as Array<[ActionId, HTMLButtonElement]>) {
      button.hidden = !shown.has(id);
    }
    for (const action of view.actions) {
      const button = els.buttons[action.id];
      const [label, sub] = button.children;
      if (label) label.textContent = action.label;
      if (sub) sub.textContent = action.sub ?? '';
      button.disabled = Boolean(action.disabled);
      button.classList.toggle('is-quiet', Boolean(action.quiet));
      button.setAttribute('aria-label', [action.label, action.sub].filter(Boolean).join(', '));
    }
    els.actions.hidden = view.actions.length === 0;
    els.close.hidden = !view.closable;
    // Redrawing the same view (the wallet changed, say) doesn't read it out again.
    if (view.announce !== this.announced) {
      this.announced = view.announce;
      this.handlers.announce(view.announce);
    }
  }

  /** Moves a trip's progress on without redrawing the rest. */
  update(progress: number, meta: string): void {
    this.setProgress(progress);
    this.els.meta.textContent = meta;
  }

  /** Sweeps a band of light across the panel, like an optic scan. */
  scan(): void {
    if (this.reducedMotion) return;
    this.els.beam.animate(
      [
        { transform: 'translateY(-100%)', opacity: 1 },
        { transform: 'translateY(100%)', opacity: 0.2 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.3, 0.6, 0.4, 1)' },
    );
  }

  private setProgress(progress: number): void {
    this.els.progress.style.setProperty('--progress', `${Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 10}%`);
  }
}

function setText(el: HTMLElement, text: string | undefined): void {
  el.hidden = !text;
  el.textContent = text ?? '';
}
