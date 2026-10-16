import type { DrugKind } from '../engine/dealing';

/**
 * Street drugs, by item id: the wiki's 2077 drugs that a gang makes or moves, and two older
 * street drugs (2020, RED) for the Valentinos, whom the wiki has trafficking drugs with no
 * product of their own. Canon: what each is, how it's taken, who makes it, and whether it's
 * illegal to carry at all (the wiki: combat-rated drugs like Black Lace are, Glitter is, Juice
 * is an illegal supplement; most others are legal to hold, and selling any without a license is
 * not). Who takes each, the weights, prices and pull are ours.
 */
export const DRUGS: Record<string, DrugKind> = {
  glitter: {
    name: 'Glitter',
    type: 'Inhaler',
    from: '2077',
    illegal: true,
    grams: 6,
    perSlot: 10,
    price: 18,
    hook: 0.8,
    users: { walks: { street: 3, gang: 2, corpo: 1, guard: 0.5, elder: 0.2 }, age: [18, 35], traits: { chatty: 0.5, courage: 0.3 } },
    note: 'A psychedelic the Tyger Claws cook, breathed in: strong, new on the streets, hooks hard, and one bad dose burns the nerves out.',
  },
  'black-lace': {
    name: 'Black Lace',
    type: 'Inhaler',
    from: '2077',
    illegal: true,
    grams: 8,
    perSlot: 10,
    price: 30,
    hook: 0.7,
    users: { walks: { gang: 4, guard: 1.5, street: 1, corpo: 0.3, elder: 0.1 }, age: [18, 50], traits: { temper: 0.8, courage: 0.5 } },
    note: 'A combat drug from the Corporate Wars: adrenaline and endorphins until pain is a rumor. Maelstrom hands it out; cyberpsychos live on it.',
  },
  juice: {
    name: 'Juice',
    type: 'Drink',
    from: '2077',
    illegal: true,
    grams: 30,
    perSlot: 4,
    price: 20,
    hook: 0.5,
    users: { walks: { gang: 3, guard: 2, street: 1.5, corpo: 0.3, elder: 0.1 }, age: [18, 45], traits: { courage: 0.6, temper: 0.4 } },
    note: "The Animals' own hormone cocktail: anything that grows muscle, in one dose. Size and speed, and a long list of what it does to the rest of you.",
  },
  'deep-dive': {
    name: 'Deep Dive',
    type: 'Inhaler',
    from: '2077',
    illegal: false,
    grams: 6,
    perSlot: 10,
    price: 12,
    hook: 0.35,
    users: { walks: { street: 3, elder: 1, gang: 1, guard: 0.5, corpo: 0.5 }, age: [18, 70], traits: { chatty: -0.4, warmth: -0.3 } },
    note: 'A hallucinogen the Scavengers move, breathed in: say a thing out loud and you see it. Most who start on it move on to Phant.',
  },
  phant: {
    name: 'Phant',
    type: 'Inhaler',
    from: '2077',
    illegal: false,
    grams: 6,
    perSlot: 10,
    price: 25,
    hook: 0.9,
    users: { walks: { street: 2, gang: 1, elder: 0.5, guard: 0.3, corpo: 0.3 }, age: [18, 60], traits: { chatty: -0.4, warmth: -0.4 } },
    note: "Deep Dive's stronger cousin, from the Scavengers: delusions you can touch, and changes to the brain that don't go back.",
  },
  synthcoke: {
    name: 'SynthCoke',
    type: 'Powder',
    from: '2020',
    illegal: false,
    grams: 4,
    perSlot: 20,
    price: 35,
    hook: 0.6,
    users: { walks: { corpo: 4, street: 1, gang: 1, guard: 0.5, elder: 0.2 }, age: [20, 55], traits: { greed: 0.7, chatty: 0.4 } },
    note: 'The synthetic stand-in for cocaine, since the coca plants died: quicker reflexes, and a paranoia that grows with the habit.',
  },
  dorph: {
    name: "'Dorph",
    type: 'Pill',
    from: '2020',
    illegal: false,
    grams: 3,
    perSlot: 25,
    price: 8,
    hook: 0.45,
    users: { walks: { street: 2, elder: 2, guard: 1.5, gang: 1, corpo: 0.3 }, age: [25, 90], traits: { courage: -0.2 } },
    note: 'Synthetic endorphin: a painkiller that feels like a second wind. Every dose has a chance of nerve damage that slows you for good.',
  },
};
