import type { Item, ItemKind } from '../engine/types';

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

export interface InventoryElements {
  root: HTMLElement;
  /** The button in the map's header that opens and closes it. */
  toggle: HTMLButtonElement;
  close: HTMLButtonElement;
  eddies: HTMLElement;
  pass: HTMLElement;
  total: HTMLElement;
  sections: HTMLElement;
}

/**
 * The inventory: an overlay that covers the map, opened from the map's header. It shows
 * whatever view it's given; the game decides what that is. Only kinds of item the player
 * actually carries get a section, so with nothing carried it's empty. The panel under the
 * map stays usable while it's open.
 */
export class Inventory {
  constructor(
    private readonly els: InventoryElements,
    /** Called just before it opens, to fill it with what the player carries right now. */
    private readonly onOpen: () => void,
    private readonly reducedMotion: boolean,
  ) {
    els.toggle.addEventListener('click', () => this.toggle());
    els.close.addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return !this.els.root.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    if (this.isOpen) return;
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
    const { root, toggle } = this.els;
    root.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    // Only take focus back if it was inside, so closing never steals it from the panel.
    if (root.contains(document.activeElement) || document.activeElement === document.body) toggle.focus({ preventScroll: true });
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
