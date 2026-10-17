import type { TradeRules } from '../engine/trade';

/**
 * Selling to the stores and fencing (all ours). A store buys what it deals in at half of what a
 * thing is worth, a thrift shop, a pawn shop or a junk shop less, a luxury store a little more
 * and a secondhand one a little less, and more again while its shelves are short; so what's
 * bought cheap where the shelves are full sells dear where they're bare. A chain buys nothing
 * off the street, and none gives more than four fifths of what it would charge for the thing
 * itself. A pawn shop gives a valuable its price, a junk shop four fifths of it. About a
 * third of the poor carry something worth taking, half of the rest, two thirds of the rich;
 * jewellery is a third as likely as junk, and a gang's own things, a walk of life's and a
 * means' are likelier on their people.
 */
export const TRADE: TradeRules = {
  buys: {
    'gun-shop': ['gun', 'ammo'],
    gunsmith: ['gun', 'ammo'],
    'ammo-shop': ['ammo'],
    'blade-shop': ['melee'],
    ripperdoc: ['cyberware', 'deck'],
    'cyberware-outlet': ['cyberware'],
    'cyberdeck-shop': ['deck'],
    'quickhack-dealer': ['quickhack'],
    'clothing-store': ['clothing'],
    boutique: ['clothing'],
    'thrift-shop': ['clothing'],
    pharmacy: ['med'],
    'street-clinic': ['med'],
    bodega: ['food', 'component'],
    'general-store': ['food', 'component'],
    'pawn-shop': ['gun', 'melee', 'clothing', 'cyberware', 'deck', 'quickhack', 'valuable'],
    'junk-shop': ['valuable', 'component', 'clothing', 'melee'],
  },
  shares: { 'thrift-shop': 0.35, 'pawn-shop': 0.35, 'junk-shop': 0.25 },
  share: 0.5,
  tier: { luxury: 1.15, everyday: 1, poverty: 0.85 },
  fences: { 'pawn-shop': 1, 'junk-shop': 0.8 },
  resale: 0.8,
  carry: { chance: { poverty: 0.35, everyday: 0.5, luxury: 0.65 }, jewellery: 0.35, gang: 5, walk: 3, means: 2 },
  lines: {
    sold: ['{place} gives you {amount} €$ for the {item}.', 'Sold: the {item}, for {amount} €$.', '{amount} €$ for the {item}, counted out on the counter.'],
    fenced: ['{amount} €$ for the {item}, no questions asked.', 'The {item} goes under the counter. {amount} €$ comes over it.', "{place} doesn't ask where the {item} came from. {amount} €$."],
    broke: ["The till's too light to pay {amount} €$ for that.", "Not today: there isn't {amount} €$ in the till."],
    noRoom: ["No room on you for {amount} €$ in cash.", 'Your wallet won\'t hold another {amount} €$.'],
    hot: ['"Where\'d you get that? Take it somewhere else."', '"We don\'t buy that kind of thing. Try a pawn shop."'],
  },
};
