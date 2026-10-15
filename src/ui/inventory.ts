import { MapOverlay, type OverlayElements } from './overlay';

/** An item as the inventory shows it: what it is, how many, a word on it, what it weighs, and what can be done with it. */
export interface InventoryItemView {
  id: string;
  /** The pocket it's in: the same thing can be in two. */
  in: string;
  name: string;
  count: number;
  /** What the stack weighs, e.g. "500 g". */
  weight: string;
  /** A word on the thing itself: a credchip's balance and lock, a garment's brand and style. */
  detail?: string;
  /** "Eat", "Drink"… Nothing for things that can't be used from here. */
  use?: string;
  /** A gun with rounds in it that could take more: it can be unloaded as well as loaded. */
  unload?: boolean;
  /** Clothing carried: it can be put on. */
  wear?: boolean;
}

/** A pocket as a row: a garment worn, a bag carried, or the wallet in the pants. Tapping one that opens shows what's in it. */
export interface PocketRowView {
  id: string;
  name: string;
  /** "Arasaka · Neomilitarism · Luxury"; nothing for a bag. */
  sub: string;
  /** "2/4 · 0.6 / 2.0 kg", "€$ 100 of 1000 · 2/4 chips", "No pockets". */
  detail: string;
  weight: string;
  over: boolean;
  opens: boolean;
  /** Worn on the head or the face: it can come off. */
  removable?: boolean;
}

/** The player head to toe: a row per slot, then the bags, then the chrome in them. */
export interface OutfitView {
  kind: 'outfit';
  slots: Array<{ label: string; garment: PocketRowView | null }>;
  bags: PocketRowView[];
  /** A row that opens onto the chrome fitted. */
  chrome: PocketRowView;
}

/** The chrome in the player, a row per part of the body: what a ripperdoc has fitted there, or nothing. */
export interface ChromePageView {
  kind: 'chrome';
  name: string;
  /** Where chrome is fitted and taken out, and for how much. */
  note: string;
  /** "22/50 capacity". */
  load: string;
  back: string;
  /** Each part of the body: its name, how many of its slots are taken ("1/3"), and what's in them. */
  parts: Array<{ label: string; count: string; implants: Array<{ id: string; name: string; sub: string; removable: boolean }> }>;
}

/** Inside one pocket: what it is, how full it is, what's in it, and the pockets inside it. */
export interface PocketPageView {
  kind: 'pocket';
  id: string;
  name: string;
  sub: string;
  note: string;
  /** "2/4 slots · 0.6 / 2.0 kg". */
  load: string;
  over: boolean;
  /** Where going back leads: "On you", or the pocket this one is in. */
  back: string;
  items: InventoryItemView[];
  inside: PocketRowView[];
  /** Figures with no row of their own: the bills in a wallet, the coins in the pants. */
  figures: Array<{ label: string; value: string }>;
}

/** Everything the inventory shows. */
export interface InventoryView {
  /** All of it, e.g. "1.3 kg". */
  weight: string;
  count: number;
  page: OutfitView | PocketPageView | ChromePageView;
}

export interface InventoryElements extends OverlayElements {
  total: HTMLElement;
  sections: HTMLElement;
}

export interface InventoryHandlers {
  /** A pocket row was tapped: open it. */
  onOpen(id: string): void;
  /** Back up a level. */
  onBack(): void;
  /** The player tapped Eat, Drink… on an item, in the pocket it's in. */
  onUse(id: string, pocket: string): void;
  /** The player tapped Unload on a gun that could also be loaded. */
  onUnload(id: string): void;
  onDrop(id: string, pocket: string): void;
  /** The player tapped Wear on a garment carried. */
  onWear(id: string, pocket: string): void;
  /** The player tapped Take off on something worn. */
  onTakeOff(id: string): void;
  /** The player tapped Take out on an implant, at a ripperdoc. */
  onTakeOut(id: string): void;
}

/**
 * The inventory, over the map: the player head to toe, each garment and bag a row that
 * opens onto its pockets, and the pockets inside those (the wallet) opening in turn. It
 * shows whatever view it's given; the game decides what that is and what using, wearing or
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
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-open], [data-back], [data-doff], [data-unfit], .inv-use, .inv-unload, .inv-drop, .inv-wear') : null;
      if (!button) return;
      const { open, back, doff, unfit, id, in: pocket = '' } = button.dataset;
      if (open) this.handlers.onOpen(open);
      else if (back !== undefined) this.handlers.onBack();
      else if (doff) this.handlers.onTakeOff(doff);
      else if (unfit) this.handlers.onTakeOut(unfit);
      else if (id && button.classList.contains('inv-drop')) this.handlers.onDrop(id, pocket);
      else if (id && button.classList.contains('inv-wear')) this.handlers.onWear(id, pocket);
      else if (id && button.classList.contains('inv-unload')) this.handlers.onUnload(id);
      else if (id) this.handlers.onUse(id, pocket);
    });
  }

  render(view: InventoryView): void {
    const { total, sections } = this.els;
    total.textContent = `${view.count} ${view.count === 1 ? 'item' : 'items'} · ${view.weight}`;
    // Whatever was tapped keeps focus through the redraw: a button on an item, or, once it's gone, the close button;
    // a row that opened hands focus to Back, and Back to the first row.
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const wasId = active?.dataset.id;
    const wasIn = active?.dataset.in;
    const wasClass = ['inv-drop', 'inv-wear', 'inv-unload', 'inv-use'].find((c) => active?.classList.contains(c)) ?? 'inv-use';
    const wasOpen = active?.dataset.open;
    const wasBack = active?.dataset.back !== undefined;
    const wasDoff = active?.dataset.doff ?? active?.dataset.unfit;
    sections.replaceChildren(...(view.page.kind === 'outfit' ? outfitPage(view.page) : view.page.kind === 'chrome' ? chromePage(view.page) : pocketPage(view.page)));
    let next: HTMLElement | null = null;
    if (wasId) next = sections.querySelector<HTMLElement>(`.${wasClass}[data-id="${wasId}"]${wasIn ? `[data-in="${wasIn}"]` : ''}`) ?? sections.querySelector<HTMLElement>(`[data-id="${wasId}"]`);
    else if (wasOpen) next = sections.querySelector<HTMLElement>('[data-back]') ?? sections.querySelector<HTMLElement>(`[data-open="${wasOpen}"]`);
    else if (wasBack) next = sections.querySelector<HTMLElement>('[data-open]') ?? sections.querySelector<HTMLElement>('[data-back]');
    else if (wasDoff) next = sections.querySelector<HTMLElement>(`[data-doff="${wasDoff}"], [data-unfit="${wasDoff}"]`) ?? sections.querySelector<HTMLElement>('[data-open], [data-back]');
    if (wasId || wasOpen || wasBack || wasDoff) (next ?? this.els.close).focus({ preventScroll: true });
  }
}

/** The player head to toe, then what they carry over a shoulder. */
function outfitPage(page: OutfitView): HTMLElement[] {
  const you = section('On you');
  const list = el('ul', 'inv-items');
  for (const { label, garment } of page.slots) list.append(pocketRow(garment, label));
  you.append(list);
  const out = [you];
  if (page.bags.length) {
    const carried = section('Carried');
    const bags = el('ul', 'inv-items');
    for (const bag of page.bags) bags.append(pocketRow(bag));
    carried.append(bags);
    out.push(carried);
  }
  const chrome = section('Chrome');
  const rows = el('ul', 'inv-items');
  rows.append(pocketRow(page.chrome));
  chrome.append(rows);
  out.push(chrome);
  return out;
}

/** The chrome fitted, part by part of the body; at a ripperdoc, each implant can come out. */
function chromePage(page: ChromePageView): HTMLElement[] {
  const li = el('li', 'inv-section is-page');
  const back = el('button', 'inv-back', `‹ ${page.back}`);
  back.type = 'button';
  back.dataset.back = '';
  li.append(back);
  const head = el('div', 'inv-page-head');
  head.append(el('h3', 'inv-page-name', page.name), el('p', 'inv-page-note', page.note), el('p', 'inv-page-load', page.load));
  li.append(head);
  const list = el('ul', 'inv-items');
  // Each part of the body is a heading the width of the page (some of the wiki's names are long), its implants under it.
  for (const part of page.parts) {
    const head = el('li', `inv-item inv-part${part.implants.length ? '' : ' is-empty'}`);
    head.append(el('span', 'inv-part-label', part.label), el('span', 'inv-part-count', part.count));
    list.append(head);
    for (const implant of part.implants) {
      const row = el('li', 'inv-item inv-row');
      const body = el('div', 'inv-open is-still');
      const text = el('span', 'inv-open-text');
      text.append(el('span', 'inv-item-name', implant.name), el('span', 'inv-item-sub', implant.sub));
      body.append(text);
      row.append(body);
      if (implant.removable) {
        const out = el('button', 'inv-wear inv-doff', 'Take out');
        out.type = 'button';
        out.dataset.unfit = implant.id;
        out.setAttribute('aria-label', `Have the ${implant.name} taken out`);
        row.append(out);
      }
      list.append(row);
    }
  }
  li.append(list);
  return [li];
}

/** Inside one pocket. */
function pocketPage(page: PocketPageView): HTMLElement[] {
  const li = el('li', `inv-section is-page${page.over ? ' is-over' : ''}`);
  const back = el('button', 'inv-back', `‹ ${page.back}`);
  back.type = 'button';
  back.dataset.back = '';
  li.append(back);
  const head = el('div', 'inv-page-head');
  head.append(el('h3', 'inv-page-name', page.name));
  if (page.sub) head.append(el('p', 'inv-page-sub', page.sub));
  if (page.note) head.append(el('p', 'inv-page-note', page.note));
  head.append(el('p', `inv-page-load${page.over ? ' is-over' : ''}`, page.load));
  li.append(head);
  const list = el('ul', 'inv-items');
  for (const figure of page.figures) {
    const row = el('li', 'inv-item inv-figure');
    row.append(el('span', 'inv-item-name', figure.label), el('span', 'inv-item-detail', figure.value));
    list.append(row);
  }
  for (const inner of page.inside) list.append(pocketRow(inner));
  for (const item of page.items) list.append(itemRow(item));
  if (!page.figures.length && !page.inside.length && !page.items.length) list.append(el('li', 'inv-item is-empty', 'Empty.'));
  li.append(list);
  return [li];
}

function section(title: string): HTMLElement {
  const li = el('li', 'inv-section is-outfit');
  const head = el('div', 'inv-section-head');
  head.append(el('h3', 'inv-section-label', title));
  li.append(head);
  return li;
}

/** A pocket as a row, with the slot's label beside it on the outfit page, and nothing where nothing is worn. */
function pocketRow(p: PocketRowView | null, label?: string): HTMLElement {
  const li = el('li', `inv-item inv-row${p?.over ? ' is-over' : ''}${p ? '' : ' is-bare'}`);
  if (label) li.append(el('span', 'inv-slot-label', label));
  if (!p) {
    li.append(el('span', 'inv-item-name', 'Nothing'));
    return li;
  }
  const body = p.opens ? el('button', 'inv-open') : el('div', 'inv-open is-still');
  if (body instanceof HTMLButtonElement) {
    body.type = 'button';
    body.dataset.open = p.id;
    body.setAttribute('aria-label', `Open ${p.name}: ${p.detail}`);
  }
  const text = el('span', 'inv-open-text');
  text.append(el('span', 'inv-item-name', p.name));
  if (p.sub) text.append(el('span', 'inv-item-sub', p.sub));
  // A row with Take off on it skips its detail (a hat has no pockets to speak of) so the name keeps its room.
  body.append(text, ...(p.removable ? [] : [el('span', 'inv-item-detail', p.detail)]), el('span', 'inv-item-weight', p.weight));
  if (p.opens) body.append(el('span', 'inv-chevron', '›'));
  li.append(body);
  if (p.removable) {
    const doff = el('button', 'inv-wear inv-doff', 'Take off');
    doff.type = 'button';
    doff.dataset.doff = p.id;
    doff.setAttribute('aria-label', `Take off ${p.name}`);
    li.append(doff);
  }
  return li;
}

/** One thing carried: its name, how many, a word on it, what it weighs, and what can be done with it. */
function itemRow(item: InventoryItemView): HTMLElement {
  const row = el('li', `inv-item${item.detail && /locked/.test(item.detail) ? ' is-locked' : ''}`);
  const text = el('span', 'inv-open-text');
  text.append(el('span', 'inv-item-name', item.name));
  if (item.detail) text.append(el('span', 'inv-item-sub', item.detail));
  row.append(text);
  if (item.count > 1) row.append(el('span', 'inv-item-count', `×${item.count}`));
  row.append(el('span', 'inv-item-weight', item.weight));
  if (item.use) {
    const use = el('button', 'inv-use', item.use);
    use.type = 'button';
    use.dataset.id = item.id;
    use.dataset.in = item.in;
    use.setAttribute('aria-label', `${item.use} ${item.name}`);
    row.append(use);
  }
  if (item.unload) {
    const unload = el('button', 'inv-use inv-unload', 'Unload');
    unload.type = 'button';
    unload.dataset.id = item.id;
    unload.dataset.in = item.in;
    unload.setAttribute('aria-label', `Unload ${item.name}`);
    row.append(unload);
  }
  if (item.wear) {
    const wear = el('button', 'inv-wear', 'Wear');
    wear.type = 'button';
    wear.dataset.id = item.id;
    wear.dataset.in = item.in;
    wear.setAttribute('aria-label', `Wear ${item.name}`);
    row.append(wear);
  }
  const drop = el('button', 'inv-drop', 'Drop');
  drop.type = 'button';
  drop.dataset.id = item.id;
  drop.dataset.in = item.in;
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
