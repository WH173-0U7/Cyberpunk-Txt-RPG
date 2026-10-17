import { MapOverlay, type OverlayElements } from './overlay';

export interface ShopItemView {
  id: string;
  name: string;
  note: string;
  kind: 'food' | 'drink' | 'alcohol' | 'gear' | 'clothing' | 'weapon' | 'ammo' | 'cyberware' | 'quickhack' | 'med' | 'treatment' | 'plan' | 'room' | 'component';
  /** For clothing: the slot, the style, the brand; for a weapon, its class and maker; for ammo, the box; for an implant, the part of the body: in place of the kind's label. */
  detail?: string;
  price: number;
  affordable: boolean;
  /** The counter won't serve the player (what they did here, or a mask). */
  barred?: boolean;
  /** What the button says, when it isn't Buy: a ripperdoc's chrome is bought and fitted ("Fit"). */
  verb?: string;
  /** Why it can't be had, when that isn't the eddies or the counter: an implant in you already, or no capacity left for it. */
  why?: string;
  /** How many the player already carries. */
  carried: number;
  /** How many are left on the shelves (missing: a service, or a place that never runs out). */
  left?: number;
}

/** Something the player carries, as the counter would buy it: what it gives for one (a box's worth of rounds), how many they carry, and why not, if not. */
export interface SellItemView {
  id: string;
  /** The pocket it's in. */
  from?: string;
  name: string;
  /** "Gun", "Valuable"… */
  label: string;
  count: number;
  /** How many go in one sale (a box of rounds), when that isn't one. */
  units: number;
  offer: number;
  why?: string;
}

/** Everything a menu shows. */
export interface ShopView {
  /** How good a place this is: "Luxury", "Cheap eats"… */
  kicker: string;
  blurb: string;
  /** What just happened: a purchase, or why one didn't go through. */
  status: string;
  items: ShopItemView[];
  /** Buying off the counter, or selling to it; and what the player could sell (missing: it buys nothing off them). */
  mode?: 'buy' | 'sell';
  sells?: SellItemView[];
}

export interface ShopElements extends OverlayElements {
  kicker: HTMLElement;
  blurb: HTMLElement;
  status: HTMLElement;
  tabs: HTMLElement;
  list: HTMLElement;
}

export interface ShopHandlers {
  onBuy(id: string): void;
  onSell(id: string, from: string | undefined): void;
  onMode(mode: 'buy' | 'sell'): void;
}

const KIND_LABEL: Record<ShopItemView['kind'], string> = { food: 'Food', drink: 'Drink', alcohol: 'Alcohol', gear: 'Gear', clothing: 'Clothing', weapon: 'Weapon', ammo: 'Ammo', cyberware: 'Cyberware', quickhack: 'Quickhack', med: 'Meds', treatment: 'Treatment', plan: 'Trauma Team', room: 'Lodging', component: 'Supplies' };

/**
 * An eatery's menu, or a store's rack, over the map. It shows whatever view it's given; the
 * game decides what's for sale and what buying does. Opened from the panel, so focus goes
 * back there on close.
 */
export class Shop {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: ShopElements,
    /** Called just before it opens, to fill it in. */
    onOpen: () => void,
    handlers: ShopHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.list.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.shop-buy') : null;
      if (!button?.dataset.id || button.disabled) return;
      if (button.dataset.sell) handlers.onSell(button.dataset.id, button.dataset.from || undefined);
      else handlers.onBuy(button.dataset.id);
    });
    els.tabs.addEventListener('click', (e) => {
      const tab = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-mode]') : null;
      if (tab?.dataset.mode === 'buy' || tab?.dataset.mode === 'sell') handlers.onMode(tab.dataset.mode);
    });
  }

  render(view: ShopView): void {
    const { kicker, blurb, status, list } = this.els;
    kicker.textContent = view.kicker;
    blurb.textContent = view.blurb;
    status.textContent = view.status;
    // Buying redraws the list; the Buy that was tapped keeps focus, or, if that's now out of
    // reach, the close button takes it (the status line is read out as it changes).
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.id : undefined;
    // Buy and Sell, where the counter does both; Sell alone where it only buys (a fence).
    const mode = view.sells ? (view.mode ?? 'buy') : 'buy';
    const both = Boolean(view.sells) && view.items.length > 0;
    this.els.tabs.hidden = !both;
    this.els.tabs.replaceChildren(...(both ? (['buy', 'sell'] as const).map((m) => tab(m === 'buy' ? 'Buy' : 'Sell', m, m === (view.items.length ? mode : 'sell'))) : []));
    const selling = view.sells && (mode === 'sell' || !view.items.length);
    list.replaceChildren(...(selling ? (view.sells ?? []).map(sellRow) : view.items.map(row)));
    if (selling && !view.sells?.length) list.append(el('li', 'shop-empty', "Nothing on you they'd buy."));
    if (!focused) return;
    const again = list.querySelector<HTMLButtonElement>(`[data-id="${focused}"]`);
    (again && !again.disabled ? again : this.els.close).focus({ preventScroll: true });
  }
}

function row(item: ShopItemView): HTMLElement {
  const li = el('li', `shop-item is-${item.kind}`);
  const text = el('div', 'shop-item-text');
  const head = el('div', 'shop-item-head');
  // Each part of the line keeps together; a long one (a gun's class, maker and magazine) wraps between them.
  const stock = item.left === undefined ? [] : item.left === 0 ? ['Sold out'] : item.left <= 3 ? [`${item.left} left`] : [];
  const parts = [...(item.detail ? item.detail.split(' · ') : [KIND_LABEL[item.kind]]), ...stock, ...(item.carried ? [`×${item.carried} carried`] : [])];
  const kind = el('span', 'shop-item-kind');
  parts.forEach((part, i) => kind.append(...(i ? [' · '] : []), el('span', 'shop-item-part', part)));
  head.append(el('span', 'shop-item-name', item.name), kind);
  text.append(head, el('p', 'shop-item-note', item.note));
  const buy = el('button', 'shop-buy');
  buy.type = 'button';
  buy.dataset.id = item.id;
  buy.disabled = !item.affordable;
  const verb = item.verb ?? 'Buy';
  buy.append(el('span', 'shop-buy-label', verb), el('span', 'shop-price', `${item.price} €$`));
  buy.setAttribute('aria-label', `${verb} ${item.name}, ${item.price} eddies${item.affordable ? '' : item.barred ? ", they won't serve you" : item.left === 0 ? ', sold out' : item.why ? `, ${item.why}` : ', not enough eddies'}`);
  li.append(text, buy);
  return li;
}

function tab(label: string, mode: 'buy' | 'sell', on: boolean): HTMLButtonElement {
  const button = el('button', `people-tab${on ? ' is-on' : ''}`, label);
  button.type = 'button';
  button.dataset.mode = mode;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-selected', String(on));
  return button;
}

/** Something to sell: what it is, how many are carried, and what the counter gives for one. */
function sellRow(item: SellItemView): HTMLElement {
  const li = el('li', 'shop-item is-sell');
  const text = el('div', 'shop-item-text');
  const head = el('div', 'shop-item-head');
  const parts = [item.label, item.units > 1 ? `${item.units} a sale` : '', `×${item.count} carried`, item.why ?? ''].filter(Boolean);
  const kind = el('span', 'shop-item-kind');
  parts.forEach((part, i) => kind.append(...(i ? [' · '] : []), el('span', 'shop-item-part', part)));
  head.append(el('span', 'shop-item-name', item.name), kind);
  text.append(head);
  const sell = el('button', 'shop-buy');
  sell.type = 'button';
  sell.dataset.id = item.id;
  sell.dataset.sell = 'yes';
  if (item.from) sell.dataset.from = item.from;
  sell.disabled = Boolean(item.why);
  sell.append(el('span', 'shop-buy-label', 'Sell'), el('span', 'shop-price', item.offer ? `${item.offer} €$` : '—'));
  sell.setAttribute('aria-label', `Sell ${item.name}${item.offer ? `, ${item.offer} eddies` : ''}${item.why ? `, ${item.why.toLowerCase()}` : ''}`);
  li.append(text, sell);
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
