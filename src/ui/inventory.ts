import type { Item, ItemKind } from '../engine/types';
import { MapOverlay, type OverlayElements } from './overlay';

/** An item as the inventory shows it: what it is, and what using it is called, if it can be used. */
export interface InventoryItemView extends Item {
  /** "Eat", "Drink"… Nothing for things that can't be used from here. */
  use?: string;
}

/** One kind of item and what the player has of it. */
export interface InventorySection {
  kind: ItemKind;
  label: string;
  hint: string;
  items: InventoryItemView[];
}

/** Everything the inventory shows. */
export interface InventoryView {
  pass: string;
  sections: InventorySection[];
}

export interface InventoryElements extends OverlayElements {
  pass: HTMLElement;
  total: HTMLElement;
  sections: HTMLElement;
}

/**
 * The inventory, over the map. It shows whatever view it's given; the game decides what that
 * is and what using something does. Only kinds of item the player actually carries get a
 * section, so with nothing carried it's empty.
 */
export class Inventory {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: InventoryElements,
    /** Called just before it opens, to fill it with what the player carries right now. */
    onOpen: () => void,
    /** The player tapped Eat, Drink… on an item. */
    private readonly onUse: (id: string) => void,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.sections.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.inv-use') : null;
      if (button?.dataset.id) this.onUse(button.dataset.id);
    });
  }

  render(view: InventoryView): void {
    const { pass, total, sections } = this.els;
    pass.textContent = view.pass;
    const count = view.sections.reduce((sum, s) => sum + s.items.reduce((n, item) => n + item.count, 0), 0);
    total.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    const carried = view.sections.filter((s) => s.items.length > 0);
    // Using something redraws the list; the button that was tapped keeps focus, or, once the
    // last one is gone, the close button takes it.
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.id : undefined;
    sections.replaceChildren(...carried.map(section));
    sections.hidden = carried.length === 0;
    if (focused) (sections.querySelector<HTMLElement>(`[data-id="${focused}"]`) ?? this.els.close).focus({ preventScroll: true });
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
    if (item.use) {
      const use = el('button', 'inv-use', item.use);
      use.type = 'button';
      use.dataset.id = item.id;
      use.setAttribute('aria-label', `${item.use} ${item.name}`);
      row.append(use);
    }
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
