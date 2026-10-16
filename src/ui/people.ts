import { STANCE_LABEL as STANCES, type Stance } from '../engine/society';
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

export type PersonAction = 'talk' | 'insult' | 'rob' | 'attack' | 'hire' | 'quit';

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
  who: 'you' | 'them' | 'note';
  text: string;
  /** For a note: whether it went well, badly, or neither. */
  tone?: 'good' | 'bad' | 'even';
}

/** Which set of choices is unfolded under the conversation, if any. */
export type Picker = 'talk' | 'ask' | 'give' | 'chop' | 'work' | 'heart' | 'more' | null;

/** What the heart command offers: asking them out, a date, making it official, ending it. */
export type HeartMove = 'askOut' | 'date' | 'official' | 'end';

const HEART_LABEL: Record<HeartMove, string> = { askOut: 'Ask out', date: 'Date', official: 'Make it official', end: 'End it' };

export interface PersonCardView {
  id: string;
  /** Their name, or how they look until introduced. */
  name: string;
  stance: Stance;
  stanceLabel: string;
  /** Gang colors, what they're doing (or that they're not here). */
  kicker: string;
  /** What the player knows of them, or a line saying nothing yet: one line, on the Talk tab. */
  facts: string;
  /** Which tab of the card is showing: the conversation, or their profile. */
  tab: CardTab;
  /** The profile: how they stand with the player, then each thing known of them, label and value. */
  profile: Array<{ label: string; value: string }>;
  /** What the player hasn't found out yet, to ask: "Age", "Home"… */
  unknown: string[];
  /** What they remember of the player, freshest first. */
  between: string[];
  /** Whether they're here to be dealt with. */
  here: boolean;
  /** Here, but knocked out: nothing to do with them but rob them. */
  cold: boolean;
  /** Who the player knows them to be connected to: on the profile, under the rest. */
  web: WebNodeView[];
  webHint: string;
  picker: Picker;
  /** Ways to start a chat: just talking, a compliment, a joke… */
  approaches: Array<{ id: string; label: string }>;
  /** Things to ask them about themselves. */
  questions: Array<{ fact: string; label: string }>;
  /** People the player knows of, to ask this person about. */
  /** What the player could give them. */
  gifts: Array<{ id: string; name: string; count: number }>;
  /** Locked credchips this person could chop, with what's on each and their cut; empty unless they're a netrunner the player can tell. */
  chops: Array<{ id: string; label: string }>;
  /** What there is to do about work with them: ask them for a job (they run a place that hires; `switch`, one that means handing in notice elsewhere), quit the one they gave the player, or nothing. */
  work: 'hire' | 'switch' | 'quit' | null;
  /** For a switch, the job the player would hand in notice at. */
  leaving?: string;
  /** With the player's own boss, the week's days and whether the player is on each (tapping one puts them on or takes them off). */
  roster: Array<{ day: number; label: string; on: boolean }>;
  /** What there is to do about the heart with them: ask them out, or, with the one the player is seeing, a date, making it official, ending it (that one even when they're not here). */
  heart: HeartMove[];
  /** What has passed between them, oldest first. */
  log: LogLineView[];
}

/** The People overlay's two lists: who's here, and everyone the player has met or knows by name. */
export type PeopleTab = 'here' | 'known';
/** A person's card: what's been said, or who they are. */
export type CardTab = 'talk' | 'profile';

export interface PeopleView {
  count: string;
  tab: PeopleTab;
  /** "Charisma Lv 2 · 7/91 XP", "Valentinos −28"… */
  reputation: string[];
  rows: PersonRowView[];
  /** Shown instead of the list when nobody is here. */
  empty: string;
  card: PersonCardView | null;
}

export interface PeopleElements extends OverlayElements {
  count: HTMLElement;
  reputation: HTMLElement;
  list: HTMLElement;
  empty: HTMLElement;
  card: HTMLElement;
  cardName: HTMLElement;
  cardStance: HTMLElement;
  cardKicker: HTMLElement;
  cardFacts: HTMLButtonElement;
  cardTabs: HTMLElement;
  cardProfile: HTMLElement;
  cardWeb: HTMLElement;
  tabs: HTMLElement;
  cardLog: HTMLElement;
  cardPicker: HTMLElement;
  cardCommands: HTMLElement;
  back: HTMLButtonElement;
}

export interface PeopleHandlers {
  /** A person was picked from the list, or (null) the list was gone back to. */
  onSelect(id: string | null): void;
  onAction(action: PersonAction, id: string): void;
  /** The player started a chat a particular way. */
  onTalk(id: string, approach: string): void;
  onGift(id: string, itemId: string): void;
  /** The player asked a person to chop a locked credchip. */
  onChop(id: string, chipId: string): void;
  onQuestion(id: string, fact: string): void;
  /** The player made a move of the heart: asked them out, took them out, asked to make it official, ended it. */
  onHeart(id: string, move: HeartMove): void;
  /** A tab of the card was picked (the facts line is the way to the profile too). */
  onCardTab(tab: CardTab): void;
  /** A list was picked: who's here, or everyone known. */
  onTab(tab: PeopleTab): void;
  /** A day on the roster was tapped, with the player's boss: on it, or off it. */
  onRoster(id: string, day: number): void;
  onPicker(picker: Picker): void;
}

export const STANCE_LABEL: Record<Stance, string> = STANCES;

/**
 * Who's here, over the map: a list of everyone at the place the player is (or, on the Known
 * tab, everyone they've met or know by name), and one person's card: who they are as far as
 * the player knows, the conversation so far on its Talk tab and all that's known of them on
 * its Profile tab (how they stand, each fact, what they remember of the player, their web),
 * and one row of things to do, each unfolding its choices only when tapped. The game decides
 * who is here and what comes of it.
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
    els.cardFacts.addEventListener('click', () => handlers.onCardTab('profile'));
    els.cardTabs.addEventListener('click', (e) => {
      const tab = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-cardtab]')?.dataset.cardtab : undefined;
      if (tab === 'talk' || tab === 'profile') handlers.onCardTab(tab);
    });
    els.tabs.addEventListener('click', (e) => {
      const tab = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-tab]')?.dataset.tab : undefined;
      if (tab === 'here' || tab === 'known') handlers.onTab(tab);
    });
    // Everything on the card goes through one listener: commands, the choices they unfold, names in the web.
    els.card.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest<HTMLElement>('[data-cmd], [data-approach], [data-fact], [data-item], [data-chip], [data-action], [data-heart], [data-open], [data-day]');
      if (!button) return;
      const { cmd, approach, fact, item, chip, action, heart, open, id, day } = button.dataset;
      if (cmd === 'talk' || cmd === 'ask' || cmd === 'give' || cmd === 'chop' || cmd === 'work' || cmd === 'heart' || cmd === 'more') handlers.onPicker(cmd);
      else if (heart && id) handlers.onHeart(id, heart as HeartMove);
      else if (approach && id) handlers.onTalk(id, approach);
      else if (fact && id) handlers.onQuestion(id, fact);
      else if (item && id) handlers.onGift(id, item);
      else if (chip && id) handlers.onChop(id, chip);
      else if (day !== undefined && id) handlers.onRoster(id, Number(day));
      else if (action && id && !(button as HTMLButtonElement).disabled) handlers.onAction(action as PersonAction, id);
      else if (open) handlers.onSelect(open);
    });
  }

  render(view: PeopleView): void {
    const { els } = this;
    els.count.textContent = view.count;
    els.reputation.replaceChildren(...view.reputation.map((line) => el('span', 'people-rep-item', line)));
    els.reputation.hidden = view.reputation.length === 0;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focused = active ? Object.entries(active.dataset).find(([key]) => ['cmd', 'approach', 'fact', 'about', 'item', 'chip', 'action', 'heart', 'open', 'id', 'tab', 'cardtab'].includes(key)) : undefined;
    const focusedId = active?.dataset.id;
    // The two lists' tabs, over the list; a card has its own.
    els.tabs.hidden = Boolean(view.card);
    els.tabs.replaceChildren(...(['here', 'known'] as const).map((tab) => tabButton(tab === 'here' ? 'Here' : 'Known', { tab }, tab === view.tab)));
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
    // Whatever was tapped keeps focus through the redraw, found in whichever of the list and the card is showing; a row that opened a card hands it to the card's back.
    if (focused) {
      const [key, value] = focused;
      const selector = key === 'id' ? `[data-id="${value}"]` : `[data-${key}="${value}"]${focusedId ? `[data-id="${focusedId}"]` : ''}`;
      const scope = view.card ? els.card : key === 'tab' ? els.tabs : els.list;
      (scope.querySelector<HTMLElement>(selector) ?? (view.card ? els.back : null))?.focus({ preventScroll: true });
    }
  }

  private renderCard(card: PersonCardView): void {
    const { els } = this;
    els.cardName.textContent = card.name;
    els.cardStance.textContent = card.stanceLabel;
    els.cardStance.className = `stance is-${card.stance}`;
    els.cardKicker.textContent = card.kicker;
    const profile = card.tab === 'profile';
    // On the Talk tab, one line of what's known; the Profile has all of it.
    els.cardFacts.hidden = profile;
    els.cardFacts.replaceChildren(el('span', 'person-facts-text', card.facts));
    els.cardTabs.replaceChildren(tabButton('Talk', { cardtab: 'talk' }, !profile), tabButton('Profile', { cardtab: 'profile' }, profile));
    // The profile stands in the transcript's place, so the card never grows and the commands stay put.
    els.cardProfile.hidden = !profile;
    if (profile) {
      const rows = el('dl', 'person-profile-rows');
      for (const { label, value } of card.profile) rows.append(el('dt', 'person-profile-label', label), el('dd', 'person-profile-value', value));
      if (card.unknown.length) rows.append(el('dt', 'person-profile-label', 'Unknown'), el('dd', 'person-profile-value is-unknown', card.unknown.join(' · ')));
      if (card.between.length) {
        rows.append(el('dt', 'person-profile-label', 'Between you'));
        const list = el('dd', 'person-profile-value');
        list.append(...card.between.map((line) => el('span', 'person-profile-line', line)));
        rows.append(list);
      }
      els.cardProfile.replaceChildren(rows, els.cardWeb);
      els.cardWeb.classList.toggle('is-empty', !card.web.length);
      els.cardWeb.replaceChildren(el('p', 'person-profile-label person-web-title', 'Knows'), card.web.length ? web(card) : emptyWeb(card.webHint));
    }

    // Your lines after a prompt mark; theirs bare (the card says who they are).
    const { cardLog } = els;
    cardLog.hidden = profile;
    cardLog.replaceChildren(
      ...(card.log.length
        ? card.log.map((line) => {
            const li = el('li', `person-log-line is-${line.who}${line.tone ? ` is-${line.tone}` : ''}`);
            if (line.who === 'you') li.append(el('span', 'person-log-who', '›'));
            else if (line.who === 'note') li.append(el('span', 'sr-only', 'How it went: '));
            else li.append(el('span', 'sr-only', `${card.name.split(' ')[0] ?? card.name}: `));
            li.append(el('span', 'person-log-text', line.text));
            return li;
          })
        : [el('li', 'person-log-line is-empty', card.here ? 'Nothing said yet.' : 'Nothing said.')]),
    );
    cardLog.scrollTop = cardLog.scrollHeight;

    // The choices the open command unfolds, if any.
    const picker: HTMLElement[] = [];
    if (card.here && card.picker === 'talk') {
      picker.push(...card.approaches.map((a) => chip(a.label, { id: card.id, approach: a.id }, 'person-chip')));
    } else if (card.here && card.picker === 'ask') {
      picker.push(...card.questions.map((q) => chip(q.label, { id: card.id, fact: q.fact }, 'person-chip')));
    } else if (card.here && card.picker === 'give') {
      picker.push(...card.gifts.map((g) => chip(g.count > 1 ? `${g.name} ×${g.count}` : g.name, { id: card.id, item: g.id }, 'person-gift')));
    } else if (card.here && card.picker === 'chop') {
      picker.push(...card.chops.map((c) => chip(c.label, { id: card.id, chip: c.id }, 'person-chip')));
    } else if (card.here && card.picker === 'work' && card.work) {
      if (card.work === 'quit') {
        // Your days here, each a toggle, then walking out.
        picker.push(el('span', 'person-gifts-label', 'Days'));
        for (const d of card.roster) {
          const day = chip(d.label, { id: card.id, day: String(d.day) }, `person-chip person-day${d.on ? ' is-on' : ''}`);
          day.setAttribute('aria-pressed', String(d.on));
          picker.push(day);
        }
        picker.push(chip('Quit', { id: card.id, action: 'quit' }, 'person-chip is-danger'));
      } else {
        if (card.work === 'switch' && card.leaving) picker.push(el('span', 'person-gifts-label', `Means notice at ${card.leaving}`));
        picker.push(chip('Ask for work', { id: card.id, action: 'hire' }, 'person-chip'));
      }
    } else if (card.picker === 'heart' && card.heart.length) {
      picker.push(...card.heart.map((move) => chip(HEART_LABEL[move], { id: card.id, heart: move }, `person-chip${move === 'end' ? ' is-danger' : ' is-heart'}`)));
    } else if (card.cold && card.picker === 'more') {
      picker.push(chip('Rob', { id: card.id, action: 'rob' }, 'person-chip is-danger'));
    } else if (card.here && card.picker === 'more') {
      picker.push(chip('Insult', { id: card.id, action: 'insult' }, 'person-chip is-danger'), chip('Rob', { id: card.id, action: 'rob' }, 'person-chip is-danger'), chip('Attack', { id: card.id, action: 'attack' }, 'person-chip is-danger'));
    }
    els.cardPicker.hidden = picker.length === 0;
    els.cardPicker.replaceChildren(...picker);

    // One row of commands; what isn't possible isn't shown, and someone who isn't here gets none but the heart's (ending it, by message).
    const heart = card.heart.length ? [{ cmd: 'heart', label: '♥', active: card.picker === 'heart' }] : [];
    const commands: Array<{ cmd: string; label: string; active?: boolean; quiet?: boolean }> = card.here
      ? [
          { cmd: 'talk', label: 'Talk', active: card.picker === 'talk' },
          ...(card.questions.length ? [{ cmd: 'ask', label: 'Ask', active: card.picker === 'ask' }] : []),
          ...(card.gifts.length ? [{ cmd: 'give', label: 'Give', active: card.picker === 'give' }] : []),
          ...(card.chops.length ? [{ cmd: 'chop', label: 'Chop', active: card.picker === 'chop' }] : []),
          ...(card.work ? [{ cmd: 'work', label: 'Work', active: card.picker === 'work' }] : []),
          ...heart,
          { cmd: 'more', label: '⋯', active: card.picker === 'more', quiet: true },
        ]
      : card.cold
        ? [...heart, { cmd: 'more', label: '⋯', active: card.picker === 'more', quiet: true }]
        : heart;
    els.cardCommands.hidden = commands.length === 0;
    els.cardCommands.replaceChildren(
      ...commands.map((c) => {
        const button = el('button', `person-cmd${c.active ? ' is-active' : ''}${c.quiet ? ' is-quiet' : ''}${c.cmd === 'heart' ? ' is-heart' : ''}`, c.label);
        button.type = 'button';
        button.dataset.cmd = c.cmd;
        button.dataset.id = card.id;
        if (c.cmd === 'more') button.setAttribute('aria-label', card.cold ? 'More: rob' : 'More: insult, rob, attack');
        if (c.cmd === 'heart') button.setAttribute('aria-label', `Heart: ${card.heart.map((m) => HEART_LABEL[m]).join(', ')}`);
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

/** A tab: a list's, or a card's. */
function tabButton(label: string, data: Record<string, string>, on: boolean): HTMLButtonElement {
  const button = chip(label, data, `people-tab${on ? ' is-on' : ''}`);
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-selected', String(on));
  return button;
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
