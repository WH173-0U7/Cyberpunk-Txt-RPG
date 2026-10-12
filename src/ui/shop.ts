import { MapOverlay, type OverlayElements } from './overlay';

export interface ShopItemView {
  id: string;
  name: string;
  note: string;
  kind: 'food' | 'drink' | 'alcohol';
  price: number;
  affordable: boolean;
  /** How many the player already carries. */
  carried: number;
}

/** Everything a menu shows. */
export interface ShopView {
  title: string;
  /** Quality, kind of place, district. */
  kicker: string;
  blurb: string;
  eddies: string;
  /** What just happened: a purchase, or why one didn't go through. */
  status: string;
  items: ShopItemView[];
}

export interface ShopElements extends OverlayElements {
  title: HTMLElement;
  kicker: HTMLElement;
  blurb: HTMLElement;
  eddies: HTMLElement;
  status: HTMLElement;
  list: HTMLElement;
}

const KIND_LABEL: Record<ShopItemView['kind'], string> = { food: 'Food', drink: 'Drink', alcohol: 'Alcohol' };

/**
 * An eatery's menu, over the map. It shows whatever view it's given; the game decides what's
 * for sale and what buying does. Opened from the panel, so focus goes back there on close.
 */
export class Shop {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: ShopElements,
    /** Called just before it opens, to fill it in. */
    onOpen: () => void,
    private readonly onBuy: (id: string) => void,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.list.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.shop-buy') : null;
      if (button?.dataset.id && !button.disabled) this.onBuy(button.dataset.id);
    });
  }

  render(view: ShopView): void {
    const { title, kicker, blurb, eddies, status, list } = this.els;
    title.textContent = view.title;
    kicker.textContent = view.kicker;
    blurb.textContent = view.blurb;
    eddies.textContent = view.eddies;
    status.textContent = view.status;
    // Buying redraws the list; the Buy that was tapped keeps focus, or, if that's now out of
    // reach, the close button takes it (the status line is read out as it changes).
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.id : undefined;
    list.replaceChildren(...view.items.map(row));
    if (!focused) return;
    const again = list.querySelector<HTMLButtonElement>(`[data-id="${focused}"]`);
    (again && !again.disabled ? again : this.els.close).focus({ preventScroll: true });
  }
}

function row(item: ShopItemView): HTMLElement {
  const li = el('li', `shop-item is-${item.kind}`);
  const text = el('div', 'shop-item-text');
  const head = el('div', 'shop-item-head');
  const kind = item.carried ? `${KIND_LABEL[item.kind]} · ×${item.carried} carried` : KIND_LABEL[item.kind];
  head.append(el('span', 'shop-item-name', item.name), el('span', 'shop-item-kind', kind));
  text.append(head, el('p', 'shop-item-note', item.note));
  const buy = el('button', 'shop-buy');
  buy.type = 'button';
  buy.dataset.id = item.id;
  buy.disabled = !item.affordable;
  buy.append(el('span', 'shop-buy-label', 'Buy'), el('span', 'shop-price', `${item.price} €$`));
  buy.setAttribute('aria-label', `Buy ${item.name}, ${item.price} eddies${item.affordable ? '' : ', not enough eddies'}`);
  li.append(text, buy);
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
