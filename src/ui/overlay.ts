export interface OverlayElements {
  root: HTMLElement;
  /** The button in the map's header that opens and closes it. */
  toggle: HTMLButtonElement;
  close: HTMLButtonElement;
}

/**
 * A panel that covers the map, opened from a button in the map's header: the inventory,
 * settings. Only one is open at a time; opening one closes the other. The panel under the
 * map stays usable while it's open.
 */
export class MapOverlay {
  private static current: MapOverlay | null = null;

  constructor(
    private readonly els: OverlayElements,
    /** Called just before it opens, to fill it in. */
    private readonly onOpen: () => void,
    /** Called once it has closed. */
    private readonly onClose: () => void,
    private readonly reducedMotion: boolean,
  ) {
    els.toggle.addEventListener('click', () => this.toggle());
    els.close.addEventListener('click', () => this.close());
  }

  /** Whichever overlay is open, if any. */
  static get open(): MapOverlay | null {
    return MapOverlay.current;
  }

  get isOpen(): boolean {
    return !this.els.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.show();
  }

  show(): void {
    if (this.isOpen) return;
    MapOverlay.current?.close();
    MapOverlay.current = this;
    this.onOpen();
    const { root, toggle, close } = this.els;
    root.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.classList.add('is-open');
    close.focus({ preventScroll: true });
    if (!this.reducedMotion) {
      // Powers on like a screen: a bright flash that settles. Nothing moves or clips, so it
      // takes taps from the first frame instead of letting them fall through to the map.
      root.animate(
        [
          { opacity: 0, filter: 'brightness(2.5)' },
          { opacity: 1, filter: 'brightness(1)' },
        ],
        { duration: 180, easing: 'ease-out' },
      );
    }
  }

  close(): void {
    if (!this.isOpen) return;
    if (MapOverlay.current === this) MapOverlay.current = null;
    const { root, toggle } = this.els;
    const hadFocus = root.contains(document.activeElement);
    root.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    // Only take focus back if it was inside, so closing never steals it from the panel.
    if (hadFocus || document.activeElement === document.body) toggle.focus({ preventScroll: true });
    this.onClose();
  }
}
