import type { Stance } from '../engine/society';
import { MapOverlay, type OverlayElements } from './overlay';

export interface PersonRowView {
  id: string;
  name: string;
  /** Role, gang. */
  sub: string;
  doing: string;
  stance: Stance;
  stanceLabel: string;
}

export type PersonAction = 'talk' | 'insult' | 'rob';

/** Someone the player knows a person to be connected to. */
export interface WebNodeView {
  id: string;
  name: string;
  /** "sister", "crewmate"… or "?" when all the player knows is that they're connected. */
  label: string;
  /** Seen together, told, or asked. */
  how: string;
}

export interface PersonCardView {
  id: string;
  name: string;
  /** Stance, gang, what they're doing (or that they're not here). */
  kicker: string;
  bio: string;
  stance: Stance;
  /** Whether they're here to be dealt with. */
  here: boolean;
  /** Who the player knows them to be connected to. */
  web: WebNodeView[];
  webHint: string;
  actions: Array<{ id: PersonAction; label: string; sub?: string; danger?: boolean }>;
  /** What the player could give them. */
  gifts: Array<{ id: string; name: string; count: number }>;
  /** People the player knows of, to ask this person about. */
  askAbout: Array<{ id: string; name: string }>;
}

export interface PeopleView {
  title: string;
  kicker: string;
  count: string;
  /** "Valentinos −28"… */
  reputation: string[];
  rows: PersonRowView[];
  /** Shown instead of the list when nobody is here. */
  empty: string;
  /** Everyone the player knows of, to look up. */
  known: Array<{ id: string; name: string }>;
  card: PersonCardView | null;
}

export interface PeopleElements extends OverlayElements {
  title: HTMLElement;
  kicker: HTMLElement;
  count: HTMLElement;
  reputation: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  known: HTMLElement;
  card: HTMLElement;
  cardName: HTMLElement;
  cardKicker: HTMLElement;
  cardBio: HTMLElement;
  cardWeb: HTMLElement;
  cardActions: HTMLElement;
  cardGifts: HTMLElement;
  cardAsk: HTMLElement;
  back: HTMLButtonElement;
}

export interface PeopleHandlers {
  /** A person was picked from the list, or (null) the list was gone back to. */
  onSelect(id: string | null): void;
  onAction(action: PersonAction, id: string): void;
  onGift(id: string, itemId: string): void;
  onAsk(id: string, aboutId: string): void;
}

export const STANCE_LABEL: Record<Stance, string> = {
  hostile: 'Hostile',
  cold: 'Cold',
  wary: 'Wary',
  neutral: 'Stranger',
  warm: 'Warm',
  friend: 'Friend',
};

/**
 * Who's here, over the map: a list of everyone at the place the player is, and one person's
 * card with what can be done with them. The game decides who is here and what comes of it.
 */
export class People {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: PeopleElements,
    onOpen: () => void,
    handlers: PeopleHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.list.addEventListener('click', (e) => {
      const row = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.person-row') : null;
      if (row?.dataset.id) handlers.onSelect(row.dataset.id);
    });
    els.back.addEventListener('click', () => handlers.onSelect(null));
    els.cardActions.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.person-action') : null;
      if (button?.dataset.id && button.dataset.action && !button.disabled) handlers.onAction(button.dataset.action as PersonAction, button.dataset.id);
    });
    els.cardGifts.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.person-gift') : null;
      if (button?.dataset.id && button.dataset.item) handlers.onGift(button.dataset.id, button.dataset.item);
    });
    els.cardAsk.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.person-ask') : null;
      if (button?.dataset.id && button.dataset.about) handlers.onAsk(button.dataset.id, button.dataset.about);
    });
    // Anyone in the web, or among the people known of, opens on a tap.
    const open = (e: Event) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-open]') : null;
      if (button?.dataset.open) handlers.onSelect(button.dataset.open);
    };
    els.cardWeb.addEventListener('click', open);
    els.known.addEventListener('click', open);
  }

  render(view: PeopleView): void {
    const { els } = this;
    els.title.textContent = view.title;
    els.kicker.textContent = view.kicker;
    els.count.textContent = view.count;
    els.reputation.replaceChildren(...view.reputation.map((line) => el('span', 'people-rep-item', line)));
    els.reputation.hidden = view.reputation.length === 0;
    const focused = document.activeElement instanceof HTMLElement ? `${document.activeElement.dataset.action ?? ''}:${document.activeElement.dataset.id ?? ''}` : '';
    if (view.card) {
      els.list.hidden = true;
      els.empty.hidden = true;
      els.card.hidden = false;
      this.renderCard(view.card);
    } else {
      els.card.hidden = true;
      els.list.hidden = view.rows.length === 0;
      els.empty.hidden = view.rows.length > 0;
      els.empty.textContent = view.empty;
      els.list.replaceChildren(...view.rows.map(row));
      els.known.hidden = view.known.length === 0;
      els.known.replaceChildren(el('span', 'person-gifts-label', `You know of ${view.known.length}`), ...view.known.map((k) => chip(k.name, { open: k.id })));
    }
    // Acting on someone redraws the card; whatever was tapped keeps focus.
    if (focused && focused !== ':') {
      const [action, id] = focused.split(':');
      const again = els.root.querySelector<HTMLElement>(action ? `[data-action="${action}"][data-id="${id}"]` : `.person-row[data-id="${id}"]`);
      again?.focus({ preventScroll: true });
    }
  }

  private renderCard(card: PersonCardView): void {
    const { els } = this;
    els.cardName.textContent = card.name;
    els.cardKicker.textContent = card.kicker;
    els.cardKicker.dataset.stance = card.stance;
    els.cardBio.textContent = card.bio;
    els.cardWeb.replaceChildren(card.web.length ? web(card) : el('p', 'person-web-hint', card.webHint));
    els.cardActions.hidden = !card.here;
    els.cardGifts.hidden = !card.here;
    els.cardAsk.hidden = !card.here;
    els.cardActions.replaceChildren(
      ...card.actions.map((action) => {
        const button = el('button', `action person-action${action.danger ? ' is-danger' : ''}`);
        button.type = 'button';
        button.dataset.action = action.id;
        button.dataset.id = card.id;
        button.append(el('span', 'action-label', action.label), el('span', 'action-sub', action.sub ?? ''));
        return button;
      }),
    );
    const gifts = card.gifts.map((gift) => {
      const button = el('button', 'person-gift');
      button.type = 'button';
      button.dataset.id = card.id;
      button.dataset.item = gift.id;
      button.textContent = gift.count > 1 ? `${gift.name} ×${gift.count}` : gift.name;
      button.setAttribute('aria-label', `Give ${gift.name}`);
      return button;
    });
    els.cardGifts.replaceChildren(el('span', 'person-gifts-label', gifts.length ? 'Give' : 'Nothing to give: buy food or drink first.'), ...gifts);
    const asks = card.askAbout.map((about) => chip(about.name, { id: card.id, about: about.id }, 'person-ask'));
    els.cardAsk.replaceChildren(el('span', 'person-gifts-label', asks.length ? 'Ask about' : 'Ask about: nobody yet. Meet people first.'), ...asks);
  }
}

/** The person in the middle, everyone the player knows them to know around them, names on the outside. */
function web(card: PersonCardView): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 320;
  const H = card.web.length > 6 ? 300 : 250;
  const cx = W / 2;
  const cy = H / 2;
  const rx = cx - 62;
  const ry = cy - 42;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'person-web');
  svg.setAttribute('role', 'list');
  svg.setAttribute('aria-label', `${card.name}'s web: ${card.web.map((n) => `${n.name}, ${n.label}`).join('; ')}`);
  const text = (x: number, y: number, content: string, className: string, anchor = 'middle') => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('class', className);
    t.setAttribute('text-anchor', anchor);
    t.textContent = content;
    return t;
  };
  card.web.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i / card.web.length) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const x = cx + dx * rx;
    const y = cy + dy * ry;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', String(cx));
    line.setAttribute('y1', String(cy));
    line.setAttribute('x2', String(x));
    line.setAttribute('y2', String(y));
    line.setAttribute('class', `person-web-line${node.label === '?' ? ' is-unknown' : ''}`);
    svg.append(line);
    // The relation sits halfway along the spoke, nudged off it so it never covers the line.
    svg.append(text((cx + x) / 2 - dy * 7, (cy + y) / 2 + dx * 7 + 3, node.label, 'person-web-label'));
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'person-web-node');
    g.setAttribute('role', 'listitem');
    g.setAttribute('tabindex', '0');
    g.dataset.open = node.id;
    g.setAttribute('aria-label', `${node.name}, ${node.label} (${node.how})`);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
    dot.setAttribute('r', '7');
    // The name goes on the far side of the dot from the middle: above the top ones, below the bottom ones, beside the rest.
    const [first = '', ...rest] = node.name.split(' ');
    const anchor = dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle';
    const tx = x + (anchor === 'middle' ? 0 : dx > 0 ? 12 : -12);
    const ty = anchor === 'middle' ? (dy < 0 ? y - 25 : y + 20) : y - 2;
    g.append(dot, text(tx, ty, first, 'person-web-name', anchor), text(tx, ty + 11, rest.join(' '), 'person-web-name is-family', anchor));
    svg.append(g);
  });
  const me = document.createElementNS(NS, 'circle');
  me.setAttribute('cx', String(cx));
  me.setAttribute('cy', String(cy));
  me.setAttribute('r', '9');
  me.setAttribute('class', 'person-web-center');
  svg.append(me);
  return svg;
}

function chip(label: string, data: Record<string, string>, className = 'person-chip'): HTMLButtonElement {
  const button = el('button', className);
  button.type = 'button';
  for (const [key, value] of Object.entries(data)) button.dataset[key] = value;
  button.textContent = label;
  return button;
}

function row(person: PersonRowView): HTMLElement {
  const li = el('li', 'people-item');
  const button = el('button', 'person-row');
  button.type = 'button';
  button.dataset.id = person.id;
  const head = el('div', 'person-row-head');
  head.append(el('span', 'person-row-name', person.name), el('span', `stance is-${person.stance}`, person.stanceLabel));
  button.append(head, el('span', 'person-row-sub', person.sub), el('span', 'person-row-doing', person.doing));
  button.setAttribute('aria-label', `${person.name}, ${person.sub}, ${person.doing}. ${person.stanceLabel}.`);
  li.append(button);
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
