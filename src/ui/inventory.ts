import type { Item, ItemKind } from '../engine/types';
import { MapOverlay, type OverlayElements } from './overlay';

/** One kind of item and what the player has of it. */
export interface InventorySection {
  kind: ItemKind;
  label: string;
  hint: string;
  items: Item[];
}

/** Everything the inventory shows. */
export interface InventoryView {
  eddies: string;
  pass: string;
  sections: InventorySection[];
}

export interface InventoryElements extends OverlayElements {
  eddies: HTMLElement;
  pass: HTMLElement;
  total: HTMLElement;
  sections: HTMLElement;
}

/**
 * The inventory, over the map. It shows whatever view it's given; the game decides what that
 * is. Only kinds of item the player actually carries get a section, so with nothing carried
 * it's empty.
 */
export class Inventory {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: InventoryElements,
    /** Called just before it opens, to fill it with what the player carries right now. */
    onOpen: () => void,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
  }

  render(view: InventoryView): void {
    const { eddies, pass, total, sections } = this.els;
    eddies.textContent = view.eddies;
    pass.textContent = view.pass;
    const count = view.sections.reduce((sum, s) => sum + s.items.reduce((n, item) => n + item.count, 0), 0);
    total.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    const carried = view.sections.filter((s) => s.items.length > 0);
    sections.replaceChildren(...carried.map(section));
    sections.hidden = carried.length === 0;
  }
}

function section(s: InventorySection): HTMLElement {
  const count = s.items.reduce((n, item) => n + item.count, 0);
  const li = el('li', 'inv-section');
  li.dataset.kind = s.kind;
  const head = el('div', 'inv-section-head');
  head.append(el('h3', 'inv-section-label', s.label), el('span', 'inv-section-count', String(count)));
  li.append(head, el('p', 'inv-section-hint', s.hint));
  const list = el('ul', 'inv-items');
  for (const item of s.items) {
    const row = el('li', 'inv-item');
    row.append(el('span', 'inv-item-name', item.name));
    if (item.count > 1) row.append(el('span', 'inv-item-count', `×${item.count}`));
    list.append(row);
  }
  li.append(list);
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
