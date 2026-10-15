export interface OverlayElements {
  root: HTMLElement;
  /** A button in the map's header that opens and closes it, if it has one. */
  toggle?: HTMLButtonElement;
  close: HTMLButtonElement;
}

/**
 * A panel that covers the map and the panel under it, opened from a button in the map's
 * header (the inventory, settings) or from the panel (people, the menu). Only one is open
 * at a time; opening one closes the other. Its header is one strip: what it is, a count,
 * and the close; the place the player is at stays on the sign above.
 */
export class MapOverlay {
  private static current: MapOverlay | null = null;
  /** What an open overlay covers (the map and the panel): out of reach of taps, keys and screen readers while it's open. */
  static behind: HTMLElement[] = [];
  /** Whatever opened it, which gets focus back when it closes. */
  private opener: HTMLElement | null = null;

  constructor(
    private readonly els: OverlayElements,
    /** Called just before it opens, to fill it in. */
    private readonly onOpen: () => void,
    /** Called once it has closed. */
    private readonly onClose: () => void,
    private readonly reducedMotion: boolean,
  ) {
    els.toggle?.addEventListener('click', () => this.toggle());
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

  /** Opens it. `opener` is the button that did, for focus to go back to; the header button if not said. */
  show(opener?: HTMLElement): void {
    if (this.isOpen) return;
    MapOverlay.current?.close();
    MapOverlay.current = this;
    this.opener = opener ?? this.els.toggle ?? null;
    this.onOpen();
    const { root, toggle, close } = this.els;
    root.hidden = false;
    for (const el of MapOverlay.behind) el.inert = true;
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.classList.add('is-open');
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
    if (!MapOverlay.current) for (const el of MapOverlay.behind) el.inert = false;
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.classList.remove('is-open');
    // Only take focus back if it was inside, so closing never steals it from the panel.
    if ((hadFocus || document.activeElement === document.body) && this.opener?.isConnected) this.opener.focus({ preventScroll: true });
    this.onClose();
  }
}
