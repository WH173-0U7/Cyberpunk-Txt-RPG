import type { Person } from './people';

/**
 * The player's borrowing and lending. A bank lends against what the player's work pays, with its
 * interest added up front, and takes it back a week at a time out of the account: an installment
 * missed costs a fee, and too many missed in a row and the bank takes the account toward the debt
 * every week until it's paid, and never lends again. A gang's loan shark lends cash to anyone, at
 * interest every week, and when nothing has been paid back in too long, sends someone to collect.
 * And the player can lend to people, who pay it back as they can and as they are: the honest when
 * they've money over their week, the greedy maybe never. The numbers and the words are in
 * `src/data/credit.ts`; `Game` keeps the state and moves the money.
 */
export interface BankLoan {
  /** The bank it's owed to (a building). */
  bank: string;
  owed: number;
  /** A week's installment, and the day the next one falls due. */
  installment: number;
  due: number;
  /** Installments missed in a row. */
  missed: number;
  since: number;
  /** Gone to default: the account is swept toward it every week. */
  defaulted?: boolean;
}

/** What the player owes a gang's loan shark: how much, since when, and the day they last paid any back (or borrowed). */
export interface SharkLoan {
  gang: string;
  owed: number;
  /** What was borrowed, all told: what's owed grows to no more than `cap` times it. */
  borrowed: number;
  since: number;
  paid: number;
  /** The day the next week's interest goes on. */
  due: number;
  /** Whether someone has been sent to collect it this time. */
  sent?: boolean;
}

/** What someone owes the player: how much, since when, the day they last paid any back, and the day the player last asked. */
export interface Lent {
  owed: number;
  since: number;
  paid: number;
  /** The day they'll next pay something back, if they can. */
  due: number;
  asked?: number;
}

/** Everything the player owes and is owed. */
export interface CreditState {
  bank: BankLoan | null;
  /** A bank the player defaulted on lends no more: every bank, as it's one record. */
  barred: boolean;
  shark: SharkLoan | null;
  lent: Record<string, Lent>;
}

export interface CreditRules {
  /**
   * A bank loan: at least `least`, else up to `weeks` of what the player's work pays a week over
   * `base`, never past `most`, offered in `step`s; `interest` of it added on, paid back in `term`
   * weekly installments out of the account; an installment missed costs `late` of it more, and
   * `default` missed in a row sends it to default.
   */
  bank: { least: number; base: number; weeks: number; most: number; step: number; interest: number; term: number; late: number; default: number };
  /** A loan shark: what it lends (`amounts`, all owed to one gang at a time, up to `most`), `interest` a week up to `cap` times what was borrowed, and someone sent to collect after `grace` days without a payment, turning up `hours` later. */
  shark: { amounts: number[]; most: number; interest: number; cap: number; grace: number; hours: [number, number] };
  /**
   * Lending: what the player can lend (`amounts`); who'll take it (the broke, or anyone warm
   * enough, `stances`); a borrower pays back on the week from the day they borrowed, `share` of
   * what they have over a week's food and rent, if honest enough (`honest`, of loyalty less half
   * their greed); asking for it back before `patience` days, or asking again within it, costs
   * `pressing` rapport.
   */
  lend: { amounts: number[]; stances: string[]; share: number; honest: number; patience: number; pressing: number };
  /**
   * The narration (what people say is `LINES.money`): a bank loan `borrowed`, `paid`, `missed`,
   * `defaulted`, `swept`, `cleared`; a shark's `sharkLent`, `sharkPaid`, `sharkCleared`; lending,
   * `lent`, and someone paying the player back, `repaid` and `repaidAll`; cash that won't fit in
   * the wallet, `noRoom`. `{bank}`, `{amount}`, `{owed}`, `{gang}`, `{who}`, `{installment}`.
   */
  lines: Record<'borrowed' | 'paid' | 'missed' | 'defaulted' | 'cleared' | 'swept' | 'sharkLent' | 'sharkPaid' | 'sharkCleared' | 'lent' | 'repaid' | 'repaidAll' | 'noRoom', string[]>;
}

/** What a bank will lend the player, by what their work pays a week. */
export function creditLimit(weekly: number, rules: CreditRules['bank']): number {
  const limit = Math.min(rules.most, Math.max(rules.least, rules.base + rules.weeks * weekly));
  return Math.floor(limit / rules.step) * rules.step;
}

/** The bank's amounts on offer up to a limit, a step at a time from the least (at most six). */
export function loanAmounts(limit: number, rules: CreditRules['bank']): number[] {
  const amounts: number[] = [];
  const step = Math.max(rules.step, Math.ceil((limit - rules.least) / 5 / rules.step) * rules.step);
  for (let a = rules.least; a <= limit && amounts.length < 6; a += step) amounts.push(a);
  if (amounts.at(-1) !== limit && limit >= rules.least) amounts.push(limit);
  return amounts.slice(-6);
}

/** How honest someone is with money they owe: their loyalty, less half their greed. */
export function honestyOf(person: Person): number {
  return person.traits.loyalty - person.traits.greed * 0.5;
}
