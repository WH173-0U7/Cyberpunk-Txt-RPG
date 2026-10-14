export interface StatusRow {
  label: string;
  value: string;
  /** How the value reads: trouble, good news, or plain. */
  tone?: 'bad' | 'good' | 'warn';
}

export interface StatusElements {
  toggle: HTMLButtonElement;
  summary: HTMLElement;
  list: HTMLElement;
  /** A row that stays at the bottom whatever the rows say: the way into the settings. */
  foot?: HTMLElement;
}

/**
 * The drop-down under the energy bar: one line that says the most (the energy level, when the
 * next point comes, and anything the matter with the player), and, unfolded, everything else
 * about the player that used to crowd the screen: experience, charisma, eddies and the bank,
 * the NCART pass, the job, the condition, the mask, every reputation, the map, the weather
 * and the date, and the settings at the bottom. It only touches the page when something it
 * shows has changed, so it can be filled on every tick.
 */
export class StatusPanel {
  private open = false;
  private shown = '';

  constructor(private readonly els: StatusElements) {
    els.toggle.addEventListener('click', () => this.toggle());
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(open = !this.open): void {
    this.open = open;
    this.els.toggle.setAttribute('aria-expanded', String(open));
    this.els.toggle.classList.toggle('is-open', open);
    this.els.list.hidden = !open;
  }

  render(summary: string, rows: StatusRow[]): void {
    const key = `${summary}|${rows.map((r) => `${r.label}=${r.value}:${r.tone ?? ''}`).join('|')}`;
    if (key === this.shown) return;
    this.shown = key;
    this.els.summary.textContent = summary;
    this.els.list.replaceChildren(
      ...rows.map((row) => {
        const item = document.createElement('div');
        item.className = `status-row${row.tone ? ` is-${row.tone}` : ''}`;
        const dt = document.createElement('dt');
        dt.textContent = row.label;
        const dd = document.createElement('dd');
        dd.textContent = row.value;
        item.append(dt, dd);
        return item;
      }),
      ...(this.els.foot ? [this.els.foot] : []),
    );
  }
}
