import type { CreditRules } from '../engine/credit';

/**
 * The player's borrowing and lending (all ours). A bank lends from 200 €$ to 300 €$ plus two
 * weeks of what the player's work pays, up to 5,000 €$, adds 15% and takes it back in eight
 * weekly installments out of the account; a missed one costs a tenth of it more, and three
 * missed in a row and the bank sweeps the account every week till it's paid, and never lends
 * again. A loan shark lends 100, 250 or 500 €$ in cash, up to 1,500 €$ owed to one gang at a
 * time, at a tenth a week, until what's owed is three times what was borrowed; two weeks without
 * a payment and the gang sends someone to collect, four to twelve hours later. The player can lend 20, 50 or 100 €$ to
 * anyone broke, or warm to them; someone honest enough pays back half of what they have over a
 * week's food and rent each week; asking again within a week costs a little goodwill.
 */
export const CREDIT: CreditRules = {
  bank: { least: 200, base: 300, weeks: 2, most: 5000, step: 50, interest: 0.15, term: 8, late: 0.1, default: 3 },
  shark: { amounts: [100, 250, 500], most: 1500, interest: 0.1, cap: 3, grace: 14, hours: [4, 12] },
  lend: { amounts: [20, 50, 100], stances: ['warm', 'friend'], share: 0.5, honest: 0.2, patience: 7, pressing: 3 },
  lines: {
    borrowed: ['{bank} lends you {amount} €$, into your account: {owed} €$ all told, {installment} €$ a week out of it.', 'Signed: {amount} €$ from {bank}, to pay back {installment} €$ a week, {owed} €$ in all.'],
    paid: ['{installment} €$ to {bank} on the loan. {owed} €$ to go.', '{bank} takes its {installment} €$ for the week. {owed} €$ left on the loan.'],
    missed: ["Not enough in the account for {bank}'s {installment} €$: missed, and a fee on top. {owed} €$ owed now.", "{bank}'s installment bounced. There's a late fee, and {owed} €$ still owed."],
    defaulted: ["{bank} has called in the loan: your account is theirs every week till the {owed} €$ is paid, and they'll never lend to you again.", 'Three missed and {bank} is done waiting. They take what\'s in your account, every week, till {owed} €$ is covered.'],
    swept: ['{bank} takes {amount} €$ from your account toward the loan. {owed} €$ to go.', 'Your account, swept: {amount} €$ to {bank}. Still {owed} €$ owed.'],
    cleared: ['The loan from {bank} is paid off.', "That's the last of {bank}'s loan. Paid."],
    sharkLent: ['You owe the {gang} {owed} €$ now, and it grows a tenth every week.', '{gang} money: {owed} €$ owed, a tenth more a week till it\'s back.'],
    sharkPaid: ['{amount} €$ back to the {gang}. {owed} €$ still owed.', 'You hand over {amount} €$. The {gang} want {owed} €$ more.'],
    sharkCleared: ["You're square with the {gang}. For now.", 'Paid off: you owe the {gang} nothing.'],
    lent: ['You lend {who} {amount} €$.', '{amount} €$ to {who}, on trust.'],
    repaid: ['{who} pays back {amount} €$ of what you lent. {owed} €$ to go.', 'Word from {who}: {amount} €$ into your account, toward what they owe. {owed} €$ left.'],
    repaidAll: ['{who} has paid you back in full: {amount} €$, the last of it.', 'The last {amount} €$ from {who} lands in your account. Square.'],
    noRoom: ["Your wallet won't hold another {amount} €$ in bills. Bank some first.", 'No room in your wallet for {amount} €$ more in cash.'],
  },
};
