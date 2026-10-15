import type { FightView } from '../engine/combat';
import type { Move } from '../engine/combat';
import { MapOverlay, type OverlayElements } from './overlay';

export interface FightElements extends OverlayElements {
  kicker: HTMLElement;
  youArm: HTMLElement;
  youFill: HTMLElement;
  youHp: HTMLElement;
  themName: HTMLElement;
  themArm: HTMLElement;
  themFill: HTMLElement;
  themHp: HTMLElement;
  tell: HTMLElement;
  log: HTMLElement;
  clock: HTMLElement;
  seconds: HTMLElement;
  moves: HTMLElement;
  hacks: HTMLElement;
  result: HTMLElement;
  done: HTMLButtonElement;
  lethal: HTMLButtonElement;
}

export interface FightHandlers {
  /** The player picked a move (a hack names its quickhack). */
  onMove(move: Move, hack?: string): void;
  /** The player chose to fight to kill, or to wound. */
  onLethal(on: boolean): void;
}

/**
 * A fight, over the map: both sides' health and what they hold, how far apart they are, what
 * might give their next move away, what's happened a beat at a time, the clock on the
 * player's move and the moves there are. It can't be closed while it's on; once it's over,
 * Done (or Esc) closes it. The game decides what each move does.
 */
export class FightPanel {
  readonly overlay: MapOverlay;
  private beat = -1;
  private deadline = 0;
  private window = 1;
  private hacksOpen = false;

  constructor(
    private readonly els: FightElements,
    onOpen: () => void,
    onClose: () => void,
    private readonly handlers: FightHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, onClose, reducedMotion);
    els.done.addEventListener('click', () => this.overlay.close());
    els.lethal.addEventListener('click', () => this.handlers.onLethal(els.lethal.getAttribute('aria-pressed') !== 'true'));
    els.moves.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-move]') : null;
      if (!button || button.disabled) return;
      const move = button.dataset.move as Move;
      if (move === 'hack') {
        this.hacksOpen = !this.hacksOpen;
        els.hacks.hidden = !this.hacksOpen;
        button.classList.toggle('is-active', this.hacksOpen);
        button.setAttribute('aria-expanded', String(this.hacksOpen));
        return;
      }
      this.handlers.onMove(move);
    });
    els.hacks.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-hack]') : null;
      if (button?.dataset.hack && !button.disabled) this.handlers.onMove('hack', button.dataset.hack);
    });
  }

  render(view: FightView, now: number): void {
    const { els } = this;
    const fresh = view.beat !== this.beat;
    els.kicker.textContent = view.over ? 'Over' : `${view.rangeLabel} · beat ${view.beat + 1}`;
    els.youArm.textContent = view.you.arm;
    els.youHp.textContent = `${view.you.hp}/${view.you.max}`;
    els.youFill.style.width = `${Math.round((view.you.hp / Math.max(1, view.you.max)) * 100)}%`;
    els.themName.textContent = view.name;
    els.themArm.textContent = view.them.arm;
    els.themHp.textContent = view.them.hp > 0 ? `${view.them.hp}/${view.them.max}` : 'Down';
    els.themFill.style.width = `${Math.round((view.them.hp / Math.max(1, view.them.max)) * 100)}%`;
    els.tell.hidden = !view.tell;
    els.tell.textContent = view.tell ?? '';
    els.log.replaceChildren(...view.log.map((text, i) => el('li', `fight-beat${i === view.log.length - 1 ? ' is-last' : ''}`, text)));
    els.log.scrollTop = els.log.scrollHeight;
    // The moves, and the quickhacks behind Hack.
    if (fresh) this.hacksOpen = false;
    els.moves.hidden = Boolean(view.over);
    els.moves.replaceChildren(
      ...view.moves.map((m) => {
        const button = el('button', `fight-move${m.id === 'attack' ? ' is-attack' : m.id === 'run' ? ' is-run' : ''}${m.id === 'hack' && this.hacksOpen ? ' is-active' : ''}`);
        button.type = 'button';
        button.dataset.move = m.id;
        button.disabled = !m.enabled;
        button.append(el('span', 'fight-move-label', m.label), ...(m.sub ? [el('span', 'fight-move-sub', m.sub)] : []));
        if (m.id === 'hack') button.setAttribute('aria-expanded', String(this.hacksOpen));
        return button;
      }),
    );
    els.hacks.hidden = !this.hacksOpen || Boolean(view.over);
    els.hacks.replaceChildren(
      ...view.hacks.map((h) => {
        const button = el('button', 'fight-hack');
        button.type = 'button';
        button.dataset.hack = h.id;
        button.disabled = !h.enabled;
        button.append(el('span', 'fight-move-label', h.name), el('span', 'fight-move-sub', `${h.ram} RAM`));
        return button;
      }),
    );
    // Aiming to wound, or to kill: pressed means to kill.
    els.lethal.hidden = Boolean(view.over);
    els.lethal.setAttribute('aria-pressed', String(view.lethal));
    els.lethal.classList.toggle('is-lethal', view.lethal);
    els.lethal.textContent = view.lethal ? 'Fighting to kill' : 'Aiming to wound';
    els.lethal.title = view.lethal ? 'Tap to aim to wound instead' : 'Tap to fight to kill';
    els.result.hidden = !view.over;
    els.result.textContent = view.result;
    els.done.hidden = !view.over;
    els.close.hidden = !view.over;
    els.clock.hidden = Boolean(view.over);
    // A new beat: the clock starts again from the top.
    if (fresh) {
      this.beat = view.beat;
      this.deadline = view.deadline;
      this.window = Math.max(1, view.window);
      const fill = el('span', 'fight-clock-fill');
      fill.style.setProperty('--from', String(Math.max(0, Math.min(1, (view.deadline - now) / this.window))));
      fill.style.animationDuration = `${Math.max(0, view.deadline - now)}ms`;
      els.clock.querySelector('.fight-clock-fill')?.replaceWith(fill);
      const first = els.moves.querySelector<HTMLButtonElement>('button:not([disabled])');
      if (view.over) els.done.focus({ preventScroll: true });
      else if (first && this.els.root.contains(document.activeElement) === false) first.focus({ preventScroll: true });
    }
    this.clock(now);
  }

  /** Puts focus on the first move there is (once it's open), or on Done. */
  focusFirst(): void {
    const first = this.els.moves.querySelector<HTMLButtonElement>('button:not([disabled])');
    (this.els.done.hidden ? first : this.els.done)?.focus({ preventScroll: true });
  }

  /** The seconds left to choose, as the clock runs. */
  clock(now: number): void {
    this.els.seconds.textContent = `${Math.max(0, Math.ceil((this.deadline - now) / 1000))}s`;
  }

  /** Back to how it was before any fight, for the next one. */
  reset(): void {
    this.beat = -1;
    this.hacksOpen = false;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
