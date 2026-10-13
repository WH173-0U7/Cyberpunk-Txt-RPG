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

export interface LogLineView {
  who: 'you' | 'them';
  text: string;
}

/** Which set of choices is unfolded under the conversation, if any. */
export type Picker = 'ask' | 'give' | 'more' | null;

export interface PersonCardView {
  id: string;
  /** Their name, or how they look until introduced. */
  name: string;
  stance: Stance;
  stanceLabel: string;
  /** Gang colors, what they're doing (or that they're not here). */
  kicker: string;
  /** What the player knows of them, or a line saying nothing yet; one line unless unfolded. */
  facts: string;
  factsOpen: boolean;
  /** Whether they're here to be dealt with. */
  here: boolean;
  /** Who the player knows them to be connected to. */
  web: WebNodeView[];
  webHint: string;
  webOpen: boolean;
  picker: Picker;
  /** Things to ask them about themselves. */
  questions: Array<{ fact: string; label: string }>;
  /** People the player knows of, to ask this person about. */
  askAbout: Array<{ id: string; name: string }>;
  /** What the player could give them. */
  gifts: Array<{ id: string; name: string; count: number }>;
  /** What has passed between them, oldest first. */
  log: LogLineView[];
}

export interface PeopleView {
  count: string;
  /** "Charisma Lv 2 · 7/91 XP", "Valentinos −28"… */
  reputation: string[];
  rows: PersonRowView[];
  /** Shown instead of the list when nobody is here. */
  empty: string;
  /** Everyone the player knows of, to look up. */
  known: Array<{ id: string; name: string }>;
  card: PersonCardView | null;
}

export interface PeopleElements extends OverlayElements {
  count: HTMLElement;
  reputation: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  known: HTMLElement;
  card: HTMLElement;
  cardName: HTMLElement;
  cardStance: HTMLElement;
  cardKicker: HTMLElement;
  cardFacts: HTMLButtonElement;
  cardWeb: HTMLElement;
  cardLog: HTMLElement;
  cardPicker: HTMLElement;
  cardCommands: HTMLElement;
  back: HTMLButtonElement;
}

export interface PeopleHandlers {
  /** A person was picked from the list, or (null) the list was gone back to. */
  onSelect(id: string | null): void;
  onAction(action: PersonAction, id: string): void;
  onGift(id: string, itemId: string): void;
  onAsk(id: string, aboutId: string): void;
  onQuestion(id: string, fact: string): void;
  onToggleWeb(): void;
  onToggleFacts(): void;
  onPicker(picker: Picker): void;
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
 * card: who they are as far as the player knows, the conversation so far, and one row of
 * things to do, each unfolding its choices only when tapped. The game decides who is here
 * and what comes of it.
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
    els.cardFacts.addEventListener('click', () => handlers.onToggleFacts());
    // Everything on the card goes through one listener: commands, the choices they unfold, names in the web.
    els.card.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest<HTMLElement>('[data-cmd], [data-fact], [data-about], [data-item], [data-action], [data-open]');
      if (!button) return;
      const { cmd, fact, about, item, action, open, id } = button.dataset;
      if (cmd === 'talk' && id) handlers.onAction('talk', id);
      else if (cmd === 'web') handlers.onToggleWeb();
      else if (cmd === 'ask' || cmd === 'give' || cmd === 'more') handlers.onPicker(cmd);
      else if (fact && id) handlers.onQuestion(id, fact);
      else if (about && id) handlers.onAsk(id, about);
      else if (item && id) handlers.onGift(id, item);
      else if (action && id && !(button as HTMLButtonElement).disabled) handlers.onAction(action as PersonAction, id);
      else if (open) handlers.onSelect(open);
    });
    els.known.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-open]') : null;
      if (button?.dataset.open) handlers.onSelect(button.dataset.open);
    });
  }

  render(view: PeopleView): void {
    const { els } = this;
    els.count.textContent = view.count;
    els.reputation.replaceChildren(...view.reputation.map((line) => el('span', 'people-rep-item', line)));
    els.reputation.hidden = view.reputation.length === 0;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focused = active ? Object.entries(active.dataset).find(([key]) => ['cmd', 'fact', 'about', 'item', 'action', 'open', 'id'].includes(key)) : undefined;
    const focusedId = active?.dataset.id;
    if (view.card) {
      els.list.hidden = true;
      els.empty.hidden = true;
      els.known.hidden = true;
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
    // Whatever was tapped keeps focus through the redraw.
    if (focused) {
      const [key, value] = focused;
      const selector = key === 'id' ? `[data-id="${value}"]` : `[data-${key}="${value}"]${focusedId ? `[data-id="${focusedId}"]` : ''}`;
      els.root.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
    }
  }

  private renderCard(card: PersonCardView): void {
    const { els } = this;
    els.cardName.textContent = card.name;
    els.cardStance.textContent = card.stanceLabel;
    els.cardStance.className = `stance is-${card.stance}`;
    els.cardKicker.textContent = card.kicker;
    els.cardFacts.textContent = card.facts;
    els.cardFacts.classList.toggle('is-open', card.factsOpen);
    els.cardFacts.setAttribute('aria-expanded', String(card.factsOpen));
    // The web stands in for the transcript while it's open, so the card never grows and the commands stay put.
    els.cardWeb.hidden = !card.webOpen;
    els.cardWeb.replaceChildren(card.web.length ? web(card) : emptyWeb(card.webHint));

    const { cardLog } = els;
    cardLog.hidden = card.webOpen;
    cardLog.replaceChildren(
      ...(card.log.length
        ? card.log.map((line) => {
            const li = el('li', `person-log-line is-${line.who}`);
            li.append(el('span', 'person-log-who', line.who === 'you' ? '›' : (card.name.split(' ')[0] ?? card.name)), el('span', 'person-log-text', line.text));
            return li;
          })
        : [el('li', 'person-log-line is-empty', card.here ? 'Nothing said yet.' : 'Nothing said.')]),
    );
    cardLog.scrollTop = cardLog.scrollHeight;

    // The choices the open command unfolds, if any.
    const picker: HTMLElement[] = [];
    if (card.here && card.picker === 'ask') {
      if (card.questions.length) picker.push(...card.questions.map((q) => chip(q.label, { id: card.id, fact: q.fact }, 'person-chip')));
      if (card.askAbout.length) picker.push(el('span', 'person-gifts-label', 'About'), ...card.askAbout.map((a) => chip(a.name, { id: card.id, about: a.id }, 'person-chip')));
    } else if (card.here && card.picker === 'give') {
      picker.push(...card.gifts.map((g) => chip(g.count > 1 ? `${g.name} ×${g.count}` : g.name, { id: card.id, item: g.id }, 'person-gift')));
    } else if (card.here && card.picker === 'more') {
      picker.push(chip('Insult', { id: card.id, action: 'insult' }, 'person-chip is-danger'), chip('Rob', { id: card.id, action: 'rob' }, 'person-chip is-danger'));
    }
    els.cardPicker.hidden = picker.length === 0;
    els.cardPicker.replaceChildren(...picker);

    // One row of commands; what isn't possible isn't shown.
    const commands: Array<{ cmd: string; label: string; active?: boolean; quiet?: boolean }> = card.here
      ? [
          { cmd: 'talk', label: 'Talk' },
          ...(card.questions.length || card.askAbout.length ? [{ cmd: 'ask', label: 'Ask', active: card.picker === 'ask' }] : []),
          ...(card.gifts.length ? [{ cmd: 'give', label: 'Give', active: card.picker === 'give' }] : []),
          { cmd: 'web', label: `Web ${card.web.length}`, active: card.webOpen },
          { cmd: 'more', label: '⋯', active: card.picker === 'more', quiet: true },
        ]
      : [{ cmd: 'web', label: `Web ${card.web.length}`, active: card.webOpen }];
    els.cardCommands.replaceChildren(
      ...commands.map((c) => {
        const button = el('button', `person-cmd${c.active ? ' is-active' : ''}${c.quiet ? ' is-quiet' : ''}`, c.label);
        button.type = 'button';
        button.dataset.cmd = c.cmd;
        button.dataset.id = card.id;
        if (c.cmd === 'more') button.setAttribute('aria-label', 'More: insult, rob');
        if (c.active !== undefined) button.setAttribute('aria-pressed', String(c.active));
        return button;
      }),
    );
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
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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

/** A web with nobody in it yet: the person alone in the middle, and how to change that. */
function emptyWeb(hint: string): HTMLElement {
  const box = el('div', 'person-web-empty');
  box.append(el('span', 'person-web-empty-ring'), el('p', 'person-web-hint', hint));
  return box;
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
  button.append(
    el('span', 'person-row-name', person.name),
    el('span', `stance is-${person.stance}`, person.stanceLabel),
    el('span', 'person-row-sub', [person.sub, person.doing].filter(Boolean).join(' · ')),
  );
  button.setAttribute('aria-label', `${person.name}${person.sub ? `, ${person.sub}` : ''}, ${person.doing}. ${person.stanceLabel}.`);
  li.append(button);
  return li;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
