import { MapOverlay, type OverlayElements } from './overlay';

/** Which choices are unfolded under the figures: the sums to put in, the prices, or selling up. */
export type BooksPicker = 'in' | 'prices' | 'sell' | null;

/** Everything the books of a storefront of the player's show. */
export interface BooksView {
  name: string;
  /** "Thriving · €$ 240 this week", "€$ 1,420 · €$ 380 over its float", "62%", "4 · run by Ana Ruiz", "Fair", "€$ 3,150". */
  trade: string;
  till: string;
  stock: string;
  staff: string;
  prices: string;
  worth: string;
  /** What last happened at the books. */
  status: string;
  picker: BooksPicker;
  /** The sums the player can put in, and whether each can be had. */
  amounts: Array<{ amount: number; enabled: boolean }>;
  /** What's over its float, to take out (0: nothing). */
  over: number;
  /** The price levels, and which is on. */
  levels: Array<{ id: string; label: string; on: boolean }>;
  /** What it would fetch, and whether it can be sold now (not before it's opened). */
  canSell: boolean;
}

export interface BooksElements extends OverlayElements {
  name: HTMLElement;
  figures: HTMLElement;
  status: HTMLElement;
  picker: HTMLElement;
  commands: HTMLElement;
}

export interface BooksHandlers {
  onPicker(picker: BooksPicker): void;
  onPutIn(amount: number): void;
  onTakeOut(): void;
  onPrices(level: string): void;
  onSell(): void;
}

/**
 * The books of a storefront the player owns, over the map: how it's doing, the till, the shelves,
 * its people, its prices and what it would fetch, and four things to do about it. It shows
 * whatever view it's given; the game decides what each does. Opened from the panel out back.
 */
export class Books {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: BooksElements,
    onOpen: () => void,
    handlers: BooksHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    const act = (e: Event) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-cmd], [data-amount], [data-level], [data-sell]') : null;
      if (!button || button.disabled) return;
      const { cmd, amount, level, sell } = button.dataset;
      if (cmd === 'in' || cmd === 'prices' || cmd === 'sell') handlers.onPicker(cmd);
      else if (cmd === 'out') handlers.onTakeOut();
      else if (amount) handlers.onPutIn(Number(amount));
      else if (level) handlers.onPrices(level);
      else if (sell) handlers.onSell();
    };
    els.commands.addEventListener('click', act);
    els.picker.addEventListener('click', act);
  }

  render(view: BooksView): void {
    const { els } = this;
    els.name.textContent = view.name;
    els.figures.replaceChildren(figure('Trade', view.trade, 'is-account'), figure('Till', view.till), figure('Shelves', view.stock), figure('Staff', view.staff), figure('Prices', view.prices), figure('Worth', view.worth, 'is-fee'));
    els.status.textContent = view.status;
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const active = focused ? (focused.dataset.cmd ?? focused.dataset.amount ?? focused.dataset.level ?? focused.dataset.sell) : undefined;
    els.picker.hidden = !view.picker;
    const chip = (label: string, data: Record<string, string>, disabled = false, on?: boolean) => {
      const button = el('button', 'person-chip', label);
      button.type = 'button';
      Object.assign(button.dataset, data);
      button.disabled = disabled;
      if (on !== undefined) button.setAttribute('aria-pressed', String(on));
      return button;
    };
    els.picker.replaceChildren(
      ...(view.picker === 'in'
        ? view.amounts.map((a) => chip(`Put in ${a.amount} €$`, { amount: String(a.amount) }, !a.enabled))
        : view.picker === 'prices'
          ? view.levels.map((l) => chip(l.label, { level: l.id }, l.on, l.on))
          : view.picker === 'sell'
            ? [chip(`Sell for ${view.worth}`, { sell: 'yes' }, !view.canSell)]
            : []),
    );
    const commands: Array<{ cmd: string; label: string; enabled: boolean; title: string; open?: boolean }> = [
      { cmd: 'in', label: 'Put in', enabled: view.amounts.some((a) => a.enabled) || view.picker === 'in', title: 'Eddies into the till', open: view.picker === 'in' },
      { cmd: 'out', label: 'Take out', enabled: view.over > 0, title: "What's over its float, into your account" },
      { cmd: 'prices', label: 'Prices', enabled: true, title: 'Under the going rate, at it, or over', open: view.picker === 'prices' },
      { cmd: 'sell', label: 'Sell', enabled: view.canSell || view.picker === 'sell', title: 'Sell the place back', open: view.picker === 'sell' },
    ];
    els.commands.replaceChildren(
      ...commands.map((c) => {
        const button = el('button', 'person-cmd', c.label);
        button.type = 'button';
        button.dataset.cmd = c.cmd;
        button.disabled = !c.enabled;
        button.title = c.title;
        if (c.open !== undefined) button.setAttribute('aria-pressed', String(c.open));
        return button;
      }),
    );
    if (active) (els.root.querySelector<HTMLElement>(`[data-cmd="${active}"], [data-amount="${active}"], [data-level="${active}"], [data-sell="${active}"]`) ?? els.close).focus({ preventScroll: true });
  }
}

function figure(label: string, value: string, className = ''): HTMLElement {
  const row = el('div', `bank-figure ${className}`.trim());
  row.append(el('span', 'bank-figure-label', label), el('span', 'bank-figure-value', value));
  return row;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
