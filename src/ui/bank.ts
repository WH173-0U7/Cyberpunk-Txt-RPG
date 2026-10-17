import { MapOverlay, type OverlayElements } from './overlay';

/** Everything a bank's counter shows. */
export interface BankView {
  name: string;
  /** "€$ 120". */
  account: string;
  /** "€$ 45 of 1,000", "€$ 7 · 42 g". */
  bills: string;
  coins: string;
  /** The credchips on you: "2 · €$ 340, 1 locked", or "None". */
  chips: string;
  /** What the bank keeps for counting coins, e.g. "5% on coins". */
  fee: string;
  /** What last happened at the counter. */
  status: string;
  canDeposit: boolean;
  canChange: boolean;
  /** Whether there's a chip in the player's name to bank. */
  canBankChips: boolean;
  /** Sums the counter hands over, and whether each can be had. */
  withdrawals: Array<{ amount: number; enabled: boolean }>;
  withdrawOpen: boolean;
  /** The loan the player has, as a figure ("€$ 230 owed · €$ 29/wk"), the sums the bank would lend, and whether it can be paid off here. */
  loan: string;
  loans: number[];
  loanOpen: boolean;
  canRepay: boolean;
}

export interface BankElements extends OverlayElements {
  name: HTMLElement;
  figures: HTMLElement;
  status: HTMLElement;
  picker: HTMLElement;
  commands: HTMLElement;
}

export interface BankHandlers {
  onDeposit(): void;
  onWithdraw(amount: number): void;
  onChange(): void;
  onChips(): void;
  onToggleWithdraw(): void;
  onToggleLoan(): void;
  onBorrow(amount: number): void;
  onRepay(): void;
}

/**
 * A bank's counter, over the map: the account, the cash and the chips on you, and four things
 * to do with them. It shows whatever view it's given; the game decides what each does. Opened
 * from the panel inside a bank.
 */
export class Bank {
  readonly overlay: MapOverlay;

  constructor(
    private readonly els: BankElements,
    onOpen: () => void,
    handlers: BankHandlers,
    reducedMotion: boolean,
  ) {
    this.overlay = new MapOverlay(els, onOpen, () => {}, reducedMotion);
    const act = (e: Event) => {
      const button = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-cmd], [data-amount], [data-loan]') : null;
      if (!button || button.disabled) return;
      const { cmd, amount, loan } = button.dataset;
      if (cmd === 'deposit') handlers.onDeposit();
      else if (cmd === 'change') handlers.onChange();
      else if (cmd === 'chips') handlers.onChips();
      else if (cmd === 'withdraw') handlers.onToggleWithdraw();
      else if (cmd === 'loan') handlers.onToggleLoan();
      else if (cmd === 'repay') handlers.onRepay();
      else if (amount) handlers.onWithdraw(Number(amount));
      else if (loan) handlers.onBorrow(Number(loan));
    };
    els.commands.addEventListener('click', act);
    els.picker.addEventListener('click', act);
  }

  render(view: BankView): void {
    const { els } = this;
    els.name.textContent = view.name;
    els.figures.replaceChildren(figure('Account', view.account, 'is-account'), figure('Bills', view.bills), figure('Coins', view.coins), figure('Chips', view.chips), figure('Loan', view.loan), figure('Fee', view.fee, 'is-fee'));
    els.status.textContent = view.status;
    const active = document.activeElement instanceof HTMLElement ? (document.activeElement.dataset.cmd ?? document.activeElement.dataset.amount ?? document.activeElement.dataset.loan) : undefined;
    // One picker under the commands: the sums to take out, or the sums to borrow.
    els.picker.hidden = !view.withdrawOpen && !view.loanOpen;
    els.picker.replaceChildren(
      ...(view.loanOpen
        ? view.loans.map((amount) => {
            const chip = el('button', 'person-chip', `Borrow ${amount} €$`);
            chip.type = 'button';
            chip.dataset.loan = String(amount);
            return chip;
          })
        : view.withdrawals.map((w) => {
            const chip = el('button', 'person-chip', `${w.amount} €$`);
            chip.type = 'button';
            chip.dataset.amount = String(w.amount);
            chip.disabled = !w.enabled;
            return chip;
          })),
    );
    const commands: Array<{ cmd: string; label: string; enabled: boolean; active?: boolean }> = [
      { cmd: 'deposit', label: 'Deposit', enabled: view.canDeposit },
      { cmd: 'withdraw', label: 'Withdraw', enabled: view.withdrawals.some((w) => w.enabled) || view.withdrawOpen, active: view.withdrawOpen },
      { cmd: 'change', label: 'Change', enabled: view.canChange },
      { cmd: 'chips', label: 'Chips', enabled: view.canBankChips },
      { cmd: 'loan', label: 'Loan', enabled: view.loans.length > 0 || view.loanOpen, active: view.loanOpen },
      { cmd: 'repay', label: 'Repay', enabled: view.canRepay },
    ];
    els.commands.replaceChildren(
      ...commands.map((c) => {
        const button = el('button', `person-cmd${c.active ? ' is-active' : ''}`, c.label);
        button.type = 'button';
        button.dataset.cmd = c.cmd;
        button.disabled = !c.enabled;
        button.title = c.cmd === 'deposit' ? 'All your cash into the account' : c.cmd === 'withdraw' ? 'Bills out of the account' : c.cmd === 'chips' ? 'The chips in your name into the account' : c.cmd === 'loan' ? 'Borrow against what your work pays' : c.cmd === 'repay' ? 'Pay the loan off, account first' : 'Coins for bills, less the cut';
        if (c.active !== undefined) button.setAttribute('aria-pressed', String(c.active));
        return button;
      }),
    );
    if (active) (els.root.querySelector<HTMLElement>(`[data-cmd="${active}"], [data-amount="${active}"], [data-loan="${active}"]`) ?? els.close).focus({ preventScroll: true });
  }
}

function figure(label: string, value: string, className = ''): HTMLElement {
  const row = el('div', `bank-figure ${className}`.trim());
  row.append(el('span', 'bank-figure-label', label), el('span', 'bank-figure-value', value));
  return row;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
