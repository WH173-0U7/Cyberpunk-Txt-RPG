import type { Direction, ExitView } from '../engine/types';

type Cell = Direction | 'look' | null;

/** 3×3 pad: compass points on the cross, scan in the middle, up/down in the right-hand corners. */
const LAYOUT: Cell[] = [null, 'north', 'up', 'west', 'look', 'east', null, 'south', 'down'];

/** Rotation of the chevron, which points up at 0°. */
const ROTATION: Record<Direction, number> = { north: 0, east: 90, south: 180, west: 270, up: 0, down: 180 };

/** Shown only when the location actually has them. */
const OPTIONAL = new Set<Direction>(['up', 'down']);

export interface CompassHandlers {
  onMove(direction: Direction): void;
  onLook(): void;
}

function span(className: string, text = ''): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

/** Tap-to-move pad. Each button shows where it leads; blocked directions are dimmed. */
export class Compass {
  private readonly buttons = new Map<Direction, { button: HTMLButtonElement; dest: HTMLElement }>();

  constructor(root: HTMLElement, handlers: CompassHandlers) {
    for (const cell of LAYOUT) {
      if (cell === null) {
        root.append(span('dir-spacer'));
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      if (cell === 'look') {
        button.className = 'dir dir-look';
        button.setAttribute('aria-label', 'Look around');
        button.append(span('reticle'), span('dir-label', 'Scan'));
        button.addEventListener('click', () => handlers.onLook());
      } else {
        const arrow = span('chevron');
        arrow.style.setProperty('--rot', `${ROTATION[cell]}deg`);
        const dest = span('dir-dest');
        const head = span('dir-head');
        head.append(arrow, span('dir-label', cell));
        button.className = 'dir';
        button.append(head, dest);
        button.addEventListener('click', () => handlers.onMove(cell));
        this.buttons.set(cell, { button, dest });
      }
      root.append(button);
    }
  }

  setExits(exits: ExitView[]): void {
    for (const [direction, { button, dest }] of this.buttons) {
      const exit = exits.find((e) => e.direction === direction);
      button.disabled = !exit;
      button.classList.toggle('is-absent', !exit && OPTIONAL.has(direction));
      dest.textContent = exit?.name ?? 'No exit';
      button.setAttribute('aria-label', exit ? `Go ${direction} to ${exit.name}` : `No exit ${direction}`);
    }
  }
}
