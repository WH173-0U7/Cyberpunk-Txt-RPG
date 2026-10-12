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

export interface PersonCardView {
  id: string;
  name: string;
  /** Stance, gang, age. */
  kicker: string;
  bio: string;
  stance: Stance;
  /** Their people, once earned; otherwise a line saying how to earn it. */
  ties: string[] | null;
  tiesHint: string;
  actions: Array<{ id: PersonAction; label: string; sub?: string; danger?: boolean }>;
  /** What the player could give them. */
  gifts: Array<{ id: string; name: string; count: number }>;
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
  card: PersonCardView | null;
}

export interface PeopleElements extends OverlayElements {
  title: HTMLElement;
  kicker: HTMLElement;
  count: HTMLElement;
  reputation: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  card: HTMLElement;
  cardName: HTMLElement;
  cardKicker: HTMLElement;
  cardBio: HTMLElement;
  cardTies: HTMLElement;
  cardActions: HTMLElement;
  cardGifts: HTMLElement;
  back: HTMLButtonElement;
}

export interface PeopleHandlers {
  /** A person was picked from the list, or (null) the list was gone back to. */
  onSelect(id: string | null): void;
  onAction(action: PersonAction, id: string): void;
  onGift(id: string, itemId: string): void;
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
    els.cardTies.replaceChildren(
      ...(card.ties ? card.ties.map((t) => el('li', 'person-tie', t)) : [el('li', 'person-tie is-hint', card.tiesHint)]),
    );
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
  }
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
