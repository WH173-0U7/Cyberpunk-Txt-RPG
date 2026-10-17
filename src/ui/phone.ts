import type { Stance } from '../engine/society';
import { MapOverlay, type OverlayElements } from './overlay';

/** Someone in the player's holo, as a row: who, how they stand, the last word between them. */
export interface PhoneContactView {
  id: string;
  name: string;
  stance: Stance;
  stanceLabel: string;
  /** The last text, or how long since the holo was given. */
  last: string;
  unread: number;
}

/** The texts with one contact, and what can be sent. */
export interface PhoneThreadView {
  id: string;
  name: string;
  stance: Stance;
  stanceLabel: string;
  /** "Seeing you", "Dead"… or nothing. */
  kicker: string;
  texts: Array<{ from: 'you' | 'them'; text: string; ago: string }>;
  kinds: Array<{ id: string; label: string }>;
  /** What came of the last call, if anything. */
  status: string;
  canCall: boolean;
}

export interface PhoneView {
  count: string;
  contacts: PhoneContactView[];
  empty: string;
  thread: PhoneThreadView | null;
}

export interface PhoneElements extends OverlayElements {
  count: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  thread: HTMLElement;
  name: HTMLElement;
  stance: HTMLElement;
  kicker: HTMLElement;
  texts: HTMLElement;
  status: HTMLElement;
  picker: HTMLElement;
  commands: HTMLElement;
  back: HTMLButtonElement;
}

export interface PhoneHandlers {
  /** A contact was opened, or (null) the list gone back to. */
  onOpen(id: string | null): void;
  onText(id: string, kind: string): void;
  onCall(id: string): void;
  /** Their card, in the People overlay. */
  onCard(id: string): void;
}

/**
 * The holophone, over the map: everyone whose holo the player has, the latest word first, and
 * one contact's texts, with what to text them, a holocall and their card. The game decides who
 * picks up and what anyone says.
 */
export class Phone {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: PhoneElements,
    onOpen: () => void,
    handlers: PhoneHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.list.addEventListener('click', (e) => {
      const row = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.person-row') : null;
      if (row?.dataset.id) handlers.onOpen(row.dataset.id);
    });
    els.back.addEventListener('click', () => handlers.onOpen(null));
    els.thread.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-kind], [data-cmd]') : null;
      const id = button?.dataset.id;
      if (!button || !id || (button as HTMLButtonElement).disabled) return;
      if (button.dataset.kind) handlers.onText(id, button.dataset.kind);
      else if (button.dataset.cmd === 'call') handlers.onCall(id);
      else if (button.dataset.cmd === 'card') handlers.onCard(id);
    });
  }

  render(view: PhoneView): void {
    const { els } = this;
    els.count.textContent = view.count;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focused = active?.dataset.kind ? `[data-kind="${active.dataset.kind}"]` : active?.dataset.cmd ? `[data-cmd="${active.dataset.cmd}"]` : null;
    if (view.thread) {
      const t = view.thread;
      els.list.hidden = true;
      els.empty.hidden = true;
      els.thread.hidden = false;
      els.name.textContent = t.name;
      els.stance.textContent = t.stanceLabel;
      els.stance.className = `stance is-${t.stance}`;
      els.kicker.textContent = t.kicker;
      els.kicker.hidden = !t.kicker;
      els.texts.replaceChildren(
        ...(t.texts.length
          ? t.texts.map((x) => {
              const li = el('li', `phone-text is-${x.from}`);
              li.append(el('span', 'sr-only', x.from === 'you' ? 'You: ' : `${t.name.split(' ')[0] ?? t.name}: `), el('span', 'phone-text-body', x.text), el('span', 'phone-text-ago', x.ago));
              return li;
            })
          : [el('li', 'phone-text is-empty', 'No texts yet.')]),
      );
      els.texts.scrollTop = els.texts.scrollHeight;
      els.status.textContent = t.status;
      els.status.hidden = !t.status;
      els.picker.replaceChildren(...t.kinds.map((k) => chip(k.label, { id: t.id, kind: k.id })));
      els.picker.hidden = t.kinds.length === 0;
      const call = command('Call', { id: t.id, cmd: 'call' });
      call.disabled = !t.canCall;
      els.commands.replaceChildren(call, command('Card', { id: t.id, cmd: 'card' }));
      if (focused) els.thread.querySelector<HTMLElement>(focused)?.focus({ preventScroll: true });
    } else {
      els.thread.hidden = true;
      els.list.hidden = view.contacts.length === 0;
      els.empty.hidden = view.contacts.length > 0;
      els.empty.textContent = view.empty;
      els.list.replaceChildren(...view.contacts.map(row));
    }
  }
}

function row(c: PhoneContactView): HTMLElement {
  const li = el('li', 'people-item');
  const button = el('button', `person-row${c.unread ? ' is-unread' : ''}`);
  button.type = 'button';
  button.dataset.id = c.id;
  const name = el('span', 'person-row-name', c.name);
  if (c.unread) name.append(el('span', 'phone-unread', String(c.unread)));
  button.append(name, el('span', `stance is-${c.stance}`, c.stanceLabel), el('span', 'person-row-sub', c.last));
  button.setAttribute('aria-label', `${c.name}${c.unread ? `, ${c.unread} unread` : ''}. ${c.last}. ${c.stanceLabel}.`);
  li.append(button);
  return li;
}

function chip(label: string, data: Record<string, string>): HTMLButtonElement {
  const button = el('button', 'person-chip');
  button.type = 'button';
  for (const [key, value] of Object.entries(data)) button.dataset[key] = value;
  button.textContent = label;
  return button;
}

function command(label: string, data: Record<string, string>): HTMLButtonElement {
  const button = el('button', 'person-cmd');
  button.type = 'button';
  for (const [key, value] of Object.entries(data)) button.dataset[key] = value;
  button.textContent = label;
  return button;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
