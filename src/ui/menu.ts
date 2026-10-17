/** What the main menu shows: whether there's a game to go back to and what it is, what a new game means, a word on why the player is here, and the build. */
export interface MenuView {
  /** The saved game, if any: "Ana Reyes · Streetkid · The Glen, Heywood". */
  saved: string | null;
  /** What starting a new game means: a new city, the city of a shared link, or replacing the save. */
  fresh: string;
  /** Why the menu is up, when there's a reason: a save from before the city changed, a death. */
  notice: string;
  build: string;
}

export interface MenuElements {
  root: HTMLElement;
  /** Everything else on the page, out of reach while the menu is up. */
  behind: HTMLElement[];
  notice: HTMLElement;
  continueButton: HTMLButtonElement;
  continueSub: HTMLElement;
  newButton: HTMLButtonElement;
  newSub: HTMLElement;
  build: HTMLElement;
}

export interface MenuHandlers {
  onContinue(): void;
  onNew(): void;
}

/**
 * The title screen, before the city: go back to the saved game, or start a new one (the
 * character builder). It covers everything and puts the rest of the page out of reach.
 */
export class MainMenu {
  constructor(
    private readonly els: MenuElements,
    handlers: MenuHandlers,
  ) {
    els.continueButton.addEventListener('click', () => handlers.onContinue());
    els.newButton.addEventListener('click', () => handlers.onNew());
  }

  get isOpen(): boolean {
    return !this.els.root.hidden;
  }

  show(view: MenuView): void {
    const { els } = this;
    els.notice.textContent = view.notice;
    els.notice.hidden = !view.notice;
    els.continueButton.hidden = !view.saved;
    els.continueSub.textContent = view.saved ?? '';
    els.newSub.textContent = view.fresh;
    els.build.textContent = view.build;
    els.root.hidden = false;
    for (const el of els.behind) el.inert = true;
    (view.saved ? els.continueButton : els.newButton).focus({ preventScroll: true });
  }

  hide(): void {
    this.els.root.hidden = true;
    for (const el of this.els.behind) el.inert = false;
  }
}
