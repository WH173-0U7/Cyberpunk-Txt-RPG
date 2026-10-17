import { MapOverlay, type OverlayElements } from './overlay';

/** A room on the floor the player is on, as the overlay lists it. */
export interface RoomRowView {
  id: string;
  name: string;
  /** "You are here", "Staff only", "Locked", "Your room". */
  note: string;
  /** Whether a tap walks in. */
  open: boolean;
  /** Whether it's a door to knock on (a home's unit, a rented room that isn't the player's). */
  knock: boolean;
  here: boolean;
}

/** Everything the rooms overlay shows: the floor, its rooms, and the way to the others. */
export interface RoomsOverlayView {
  /** "Ground floor", "Floor 7 of 26". */
  floorLabel: string;
  floor: number;
  floors: number;
  rooms: RoomRowView[];
  /** What last happened at a door. */
  status: string;
}

export interface RoomsElements extends OverlayElements {
  floor: HTMLElement;
  list: HTMLElement;
  status: HTMLElement;
  floors: HTMLElement;
}

export interface RoomsHandlers {
  onGo(id: string): void;
  onKnock(id: string): void;
  onFloor(floor: number): void;
}

/**
 * The rooms of the building the player is in, over the map: the ones on this floor, to walk
 * into (or knock on), and the stairs to the others. It shows whatever view it's given; the
 * game decides who's where and what's open. Opened from the room under the panel's kicker.
 */
export class RoomsPanel {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: RoomsElements,
    onOpen: () => void,
    handlers: RoomsHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    els.root.addEventListener('click', (e) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-go], [data-knock], [data-floor]') : null;
      if (!button || button.disabled) return;
      const { go, knock, floor } = button.dataset;
      if (go) handlers.onGo(go);
      else if (knock) handlers.onKnock(knock);
      else if (floor) handlers.onFloor(Number(floor));
    });
  }

  render(view: RoomsOverlayView): void {
    const { els } = this;
    els.floor.textContent = view.floorLabel;
    els.status.textContent = view.status;
    els.status.hidden = !view.status;
    els.list.replaceChildren(
      ...view.rooms.map((room) => {
        const li = document.createElement('li');
        li.className = `rooms-row${room.here ? ' is-here' : ''}`;
        const go = document.createElement('button');
        go.type = 'button';
        go.className = 'rooms-go';
        go.dataset.go = room.id;
        go.disabled = !room.open;
        const name = document.createElement('span');
        name.className = 'rooms-name';
        name.textContent = room.name;
        go.append(name);
        if (room.note) {
          const note = document.createElement('span');
          note.className = 'rooms-note';
          note.textContent = room.note;
          go.append(note);
        }
        go.setAttribute('aria-label', [room.name, room.note].filter(Boolean).join(', '));
        li.append(go);
        if (room.knock) {
          const knock = document.createElement('button');
          knock.type = 'button';
          knock.className = 'person-chip rooms-knock';
          knock.dataset.knock = room.id;
          knock.textContent = 'Knock';
          knock.setAttribute('aria-label', `Knock on ${room.name}`);
          li.append(knock);
        }
        return li;
      }),
    );
    // The stairs: a floor at a time, and ten at a time in a tower.
    els.floors.hidden = view.floors <= 1;
    const step = (label: string, to: number, aria: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'person-chip rooms-step';
      b.textContent = label;
      b.dataset.floor = String(to);
      b.disabled = to < 1 || to > view.floors || to === view.floor;
      b.setAttribute('aria-label', aria);
      return b;
    };
    const at = document.createElement('span');
    at.className = 'rooms-at';
    at.textContent = view.floor === 1 ? 'Ground' : `Floor ${view.floor}`;
    const big = view.floors > 10;
    els.floors.replaceChildren(
      ...(big ? [step('«', Math.max(1, view.floor - 10), 'Down ten floors')] : []),
      step('‹', view.floor - 1, 'Down a floor'),
      at,
      step('›', view.floor + 1, 'Up a floor'),
      ...(big ? [step('»', Math.min(view.floors, view.floor + 10), 'Up ten floors')] : []),
    );
  }
}
