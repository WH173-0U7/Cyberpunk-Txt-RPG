import { BODY_PARTS, FACE_PARTS, LIFEPATHS, lookWords, validCharacter, type Character, type CharacterRules, type Lifepath, type Look, type LookPart } from '../engine/character';
import type { Pronouns } from '../engine/people';

export interface BuilderElements {
  root: HTMLElement;
  behind: HTMLElement[];
  step: HTMLElement;
  body: HTMLElement;
  back: HTMLButtonElement;
  next: HTMLButtonElement;
}

export interface BuilderHandlers {
  /** Backed out of the first step: the menu again. */
  onCancel(): void;
  /** The player is made. */
  onDone(character: Character): void;
}

/** What the builder needs of the game: the rules, a name for a lifepath, and where each lifepath starts, in words. */
export interface BuilderContent {
  rules: CharacterRules;
  name(lifepath: Lifepath, pronouns: Pronouns): string;
  startsAt(lifepath: Lifepath): string;
}

type Step = 'path' | 'you' | 'look' | 'body' | 'ready';
const STEPS: Step[] = ['path', 'you', 'look', 'body', 'ready'];
/** The body the pronouns suggest, until the player sets one themselves. */
const BODIES: Record<Pronouns, Pick<Look, 'chest' | 'genitals'>> = {
  she: { chest: 'medium', genitals: 'vulva' },
  he: { chest: 'flat', genitals: 'penis' },
  they: { chest: 'small', genitals: 'vulva' },
};
const PRONOUNS: Array<{ id: Pronouns; label: string }> = [
  { id: 'she', label: 'She' },
  { id: 'he', label: 'He' },
  { id: 'they', label: 'They' },
];

/**
 * The character builder, after the 2077 one: a lifepath, a name and pronouns, a look (the hair,
 * its color, length and style, the eyes, a mark) and a body (build, chest, genitals and their
 * size), then a last look before the city. A step at a time, phone-sized; Next only once the
 * step is filled in.
 */
export class Builder {
  private step: Step = 'path';
  private character: Character;
  /** Whether the player has typed a name of their own (else changing lifepath or pronouns draws another), and set the body (else the pronouns suggest one). */
  private named = false;
  private shaped = false;
  private replaces = false;

  constructor(
    private readonly els: BuilderElements,
    private readonly content: BuilderContent,
    private readonly handlers: BuilderHandlers,
  ) {
    this.character = this.blank();
    els.back.addEventListener('click', () => this.go(-1));
    els.next.addEventListener('click', () => this.go(1));
    els.body.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button') : null;
      if (!button || button.disabled) return;
      const { lifepath, pronouns, part, option, random } = button.dataset;
      const c = this.character;
      if (lifepath) {
        c.lifepath = lifepath as Lifepath;
        if (!this.named) c.name = this.content.name(c.lifepath, c.pronouns);
      } else if (pronouns) {
        c.pronouns = pronouns as Pronouns;
        if (!this.named) c.name = this.content.name(c.lifepath, c.pronouns);
        if (!this.shaped) c.look = { ...c.look, ...BODIES[c.pronouns] };
      } else if (part && option) {
        c.look = { ...c.look, [part]: option };
        if (BODY_PARTS.includes(part as LookPart)) this.shaped = true;
      }
      else if (random !== undefined) {
        c.name = this.content.name(c.lifepath, c.pronouns);
        this.named = false;
      } else return;
      this.render(button);
    });
    els.body.addEventListener('input', (e) => {
      if (!(e.target instanceof HTMLInputElement) || e.target.name !== 'name') return;
      this.character.name = e.target.value.slice(0, 40);
      this.named = true;
      this.renderNav();
    });
  }

  get isOpen(): boolean {
    return !this.els.root.hidden;
  }

  /** Opens it at the first step, a fresh character; `replaces` when there's a save the new game will take the place of. */
  show(replaces: boolean): void {
    this.replaces = replaces;
    this.step = 'path';
    this.character = this.blank();
    this.named = false;
    this.shaped = false;
    this.els.root.hidden = false;
    for (const el of this.els.behind) el.inert = true;
    this.render();
  }

  hide(): void {
    this.els.root.hidden = true;
    for (const el of this.els.behind) el.inert = false;
  }

  private blank(): Character {
    const look: Look = { color: 'black', length: 'short', style: 'undercut', eyes: 'brown', mark: 'none', build: 'average', size: 'average', ...BODIES.they };
    return { name: this.content.name('streetkid', 'they'), pronouns: 'they', lifepath: 'streetkid', look };
  }

  /** Whether the step is filled in: a name; the rest always. */
  private ready(step: Step): boolean {
    if (step === 'you') return this.character.name.trim().length > 0;
    if (step === 'ready') return validCharacter(this.character, this.content.rules);
    return true;
  }

  private go(by: number): void {
    const at = STEPS.indexOf(this.step);
    if (by < 0 && at === 0) {
      this.handlers.onCancel();
      return;
    }
    if (by > 0 && !this.ready(this.step)) return;
    if (by > 0 && this.step === 'ready') {
      this.handlers.onDone({ ...this.character, name: this.character.name.trim() });
      return;
    }
    this.step = STEPS[Math.max(0, Math.min(STEPS.length - 1, at + by))] as Step;
    this.render();
    this.els.body.scrollTop = 0;
    this.els.body.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
  }

  private renderNav(): void {
    const { els } = this;
    const at = STEPS.indexOf(this.step);
    els.step.textContent = `${at + 1} / ${STEPS.length}`;
    els.back.textContent = at === 0 ? 'Menu' : 'Back';
    els.next.textContent = this.step === 'ready' ? (this.replaces ? 'Start · replaces save' : 'Start') : 'Next';
    els.next.disabled = !this.ready(this.step);
  }

  private render(focus?: HTMLElement): void {
    const { rules } = this.content;
    const c = this.character;
    const body: HTMLElement[] = [];
    if (this.step === 'path') {
      body.push(el('h2', 'builder-title', 'Lifepath'), el('p', 'builder-note', 'Where you come from: where you start, what you have, who knows you, and how people take to you.'));
      for (const id of LIFEPATHS) {
        const path = rules.lifepaths[id];
        const card = button(`builder-card${c.lifepath === id ? ' is-on' : ''}`, { lifepath: id });
        card.setAttribute('aria-pressed', String(c.lifepath === id));
        card.append(el('span', 'builder-card-name', path.name), el('span', 'builder-card-blurb', path.blurb), el('span', 'builder-card-meta', this.content.startsAt(id)));
        body.push(card);
      }
    } else if (this.step === 'you') {
      body.push(el('h2', 'builder-title', 'You'));
      const label = el('label', 'builder-label', 'Name');
      const row = el('div', 'builder-name');
      const input = document.createElement('input');
      input.className = 'builder-input';
      input.name = 'name';
      input.type = 'text';
      input.maxLength = 40;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.value = c.name;
      input.setAttribute('aria-label', 'Name');
      row.append(input, button('builder-chip', { random: '' }, 'Random'));
      label.append(row);
      body.push(label, el('p', 'builder-label', 'Pronouns'), el('p', 'builder-note', "Who's drawn to you in Night City goes by them too."));
      const choices = el('div', 'builder-chips');
      for (const p of PRONOUNS) choices.append(choice(p.label, { pronouns: p.id }, c.pronouns === p.id));
      body.push(choices);
    } else if (this.step === 'look' || this.step === 'body') {
      const face = this.step === 'look';
      body.push(el('h2', 'builder-title', face ? 'Look' : 'Body'), el('p', 'builder-note', face ? 'What people see, and what they remark on, unless you have a mask on.' : 'Your build is plain to see; what is under your clothes, only to the one you are with.'));
      for (const part of face ? FACE_PARTS : BODY_PARTS) {
        // No style for hair too short to have one; a size only for genitals that have one.
        if (part === 'style' && rules.styleless.includes(c.look.length)) continue;
        if (part === 'size' && !rules.sized.includes(c.look.genitals)) continue;
        const look = rules.looks[part];
        body.push(el('p', 'builder-label', look.label));
        const chips = el('div', 'builder-chips');
        for (const o of look.options) chips.append(choice(o.label, { part, option: o.id }, c.look[part] === o.id));
        body.push(chips);
      }
    } else {
      const path = rules.lifepaths[c.lifepath];
      body.push(el('h2', 'builder-title', c.name.trim() || 'Nameless'));
      const list = el('dl', 'builder-summary');
      const look = lookWords(c.look, rules);
      const rows: Array<[string, string]> = [
        ['Lifepath', path.name],
        ['Starts', this.content.startsAt(c.lifepath)],
        ['Pronouns', PRONOUNS.find((p) => p.id === c.pronouns)?.label ?? ''],
        ['Look', [look.hair, look.eyes, look.mark].filter(Boolean).join(' · ').replace(/^\p{Ll}/u, (m) => m.toUpperCase())],
        ['Body', [look.build, look.chest, look.genitals].filter(Boolean).join(' · ').replace(/^\p{Ll}/u, (m) => m.toUpperCase())],
      ];
      for (const [label, value] of rows) list.append(el('dt', 'builder-label', label), el('dd', 'builder-value', value));
      body.push(list);
      if (this.replaces) body.push(el('p', 'builder-warn', 'Starting replaces your saved game.'));
    }
    this.els.body.replaceChildren(...body);
    this.renderNav();
    // Whatever was tapped keeps focus through the redraw.
    if (focus) {
      const keys = Object.entries(focus.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${v}"]`).join('');
      if (keys) this.els.body.querySelector<HTMLElement>(keys)?.focus({ preventScroll: true });
    }
  }
}

function button(className: string, data: Record<string, string>, text?: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  for (const [key, value] of Object.entries(data)) b.dataset[key] = value;
  return b;
}

function choice(label: string, data: Record<string, string>, on: boolean): HTMLButtonElement {
  const b = button(`builder-chip${on ? ' is-on' : ''}`, data, label);
  b.setAttribute('aria-pressed', String(on));
  return b;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
