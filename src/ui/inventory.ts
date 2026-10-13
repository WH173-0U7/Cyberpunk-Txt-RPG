import type { Item } from '../engine/types';
import { MapOverlay, type OverlayElements } from './overlay';

/** An item as the inventory shows it: what it is, what it weighs, and what using it is called, if it can be used. */
export interface InventoryItemView extends Item {
  /** "Eat", "Drink"… Nothing for things that can't be used from here. */
  use?: string;
  /** What the stack weighs, e.g. "500 g". */
  weight: string;
  /** A word on the thing itself: for a credchip, what's on it and whether it's locked. */
  detail?: string;
}

/** A pocket inside another: the wallet in the pants. */
export interface InnerPocketView {
  id: string;
  name: string;
  /** "€$ 50 of 1,000". */
  detail: string;
  weight: string;
  over: boolean;
  /** What's in it, if anything can be: the credchips in the wallet. */
  items?: InventoryItemView[];
}

/** A pocket the player wears and what's in it. */
export interface PocketView {
  id: string;
  name: string;
  /** "2/4". */
  slots: string;
  /** "0.4 / 2.0 kg". */
  weight: string;
  over: boolean;
  items: InventoryItemView[];
  inside: InnerPocketView[];
}

/** Everything the inventory shows. */
export interface InventoryView {
  pass: string;
  /** All of it, e.g. "1.3 kg". */
  weight: string;
  pockets: PocketView[];
}

export interface InventoryElements extends OverlayElements {
  pass: HTMLElement;
  total: HTMLElement;
  sections: HTMLElement;
}

export interface InventoryHandlers {
  /** The player tapped Eat, Drink… on an item. */
  onUse(id: string): void;
  /** The player tapped Drop on an item. */
  onDrop(id: string): void;
}

/**
 * The inventory, over the map: every pocket the player wears, how full it is, and what's in
 * it. It shows whatever view it's given; the game decides what that is and what using or
 * dropping something does.
 */
export class Inventory {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: InventoryElements,
    /** Called just before it opens, to fill it with what the player carries right now. */
    onOpen: () => void,
    private readonly handlers: InventoryHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.sections.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.inv-use, .inv-drop') : null;
      if (!button?.dataset.id) return;
      if (button.classList.contains('inv-drop')) this.handlers.onDrop(button.dataset.id);
      else this.handlers.onUse(button.dataset.id);
    });
  }

  render(view: InventoryView): void {
    const { pass, total, sections } = this.els;
    pass.textContent = view.pass;
    const tally = (items: InventoryItemView[] = []) => items.reduce((n, item) => n + item.count, 0);
    const count = view.pockets.reduce((sum, p) => sum + tally(p.items) + p.inside.reduce((n, inner) => n + tally(inner.items), 0), 0);
    total.textContent = `${count} ${count === 1 ? 'item' : 'items'} · ${view.weight}`;
    // Using or dropping something redraws the list; the button that was tapped keeps focus, or, once it's gone, the close button takes it.
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focused = active?.dataset.id ? { id: active.dataset.id, drop: active.classList.contains('inv-drop') } : null;
    sections.replaceChildren(...view.pockets.map(pocket));
    sections.hidden = view.pockets.length === 0;
    if (focused) (sections.querySelector<HTMLElement>(`${focused.drop ? '.inv-drop' : '.inv-use'}[data-id="${focused.id}"]`) ?? this.els.close).focus({ preventScroll: true });
  }
}

function pocket(p: PocketView): HTMLElement {
  const li = el('li', `inv-section${p.over ? ' is-over' : ''}`);
  li.dataset.pocket = p.id;
  const head = el('div', 'inv-section-head');
  head.append(el('h3', 'inv-section-label', p.name), el('span', 'inv-section-count', `${p.slots} · ${p.weight}`));
  li.append(head);
  const list = el('ul', 'inv-items');
  for (const inner of p.inside) {
    const row = el('li', `inv-item inv-pocket${inner.over ? ' is-over' : ''}`);
    row.append(el('span', 'inv-item-name', inner.name), el('span', 'inv-item-detail', inner.detail), el('span', 'inv-item-weight', inner.weight));
    list.append(row);
    // What's in the inner pocket sits under it, set in a little.
    for (const item of inner.items ?? []) list.append(itemRow(item, true));
  }
  for (const item of p.items) list.append(itemRow(item, false));
  if (!p.inside.length && !p.items.length) list.append(el('li', 'inv-item is-empty', 'Empty.'));
  li.append(list);
  return li;
}

/** One thing carried: its name, how many, a word on it, what it weighs, and what can be done with it. */
function itemRow(item: InventoryItemView, inner: boolean): HTMLElement {
  const row = el('li', `inv-item${inner ? ' is-inner' : ''}${item.detail && /locked/.test(item.detail) ? ' is-locked' : ''}`);
  row.append(el('span', 'inv-item-name', item.name));
  if (item.count > 1) row.append(el('span', 'inv-item-count', `×${item.count}`));
  if (item.detail) row.append(el('span', 'inv-item-detail', item.detail));
  row.append(el('span', 'inv-item-weight', item.weight));
  if (item.use) {
    const use = el('button', 'inv-use', item.use);
    use.type = 'button';
    use.dataset.id = item.id;
    use.setAttribute('aria-label', `${item.use} ${item.name}`);
    row.append(use);
  }
  const drop = el('button', 'inv-drop', 'Drop');
  drop.type = 'button';
  drop.dataset.id = item.id;
  drop.setAttribute('aria-label', `Drop ${item.name}${item.detail ? ` (${item.detail})` : ''}`);
  row.append(drop);
  return row;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
