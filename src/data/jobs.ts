import type { JobRules, Ladder, Rung } from '../engine/jobs';

/**
 * Where the player can work, and how far up. Every kind of storefront hires (the ladders and
 * their titles are ours, bottom rung first), a bank and a tattoo studio on ladders of their
 * own: a shift a rostered day, in the ladder's hours (a bar's, a club's and an arcade's run from
 * six in the evening till two), for pay owed and paid on payday and a little trust with the
 * boss. The pay is low on purpose and climbs with the rung; a luxury place pays more than a
 * secondhand one. Six shifts of trust and a boss who's warmed to the player is the first step
 * up; the top takes the better part of a month of showing up. Two jobs at once if their hours
 * don't overlap: a day job and a night one. Walking out costs four rapport with the boss,
 * notice one; half the shifts worked in a line of work count as trust starting elsewhere in it,
 * and a boss who liked the player puts in a word worth four. Four rostered days missed in a row
 * and the job's gone. Working somewhere is a fifth off at its counter, a staff meal at an eatery
 * or a drink at a bar after each shift, a uniform at a clothing store from the shop floor up,
 * and keys from the third rung. About one shift in three, something happens that wants a
 * choice: a rush, a shoplifter, a gang come for its cut, a coworker who needs cover.
 */
const rung = (id: string, title: string, doing: string, pay: number, energy: number, at: number): Rung => ({ id, title, doing, pay, energy, at });
const DAY: [number, number] = [9, 17];
const SHOP: [number, number] = [10, 18];
const NIGHT: [number, number] = [18, 2];
const ladder = (hours: [number, number], ...rungs: Rung[]): Ladder => ({ hours, rungs });

export const JOBS: JobRules = {
  ladders: {
    food: ladder(DAY, rung('dishes', 'Dish pit', 'washing dishes', 24, 4, 0), rung('prep', 'Prep', 'on prep', 40, 4, 6), rung('counter', 'Counter', 'working the counter', 60, 3, 14), rung('line', 'Line cook', 'on the line', 85, 4, 24)),
    clothing: ladder(SHOP, rung('stockroom', 'Stockroom', 'in the stockroom', 26, 3, 0), rung('floor', 'Shop floor', 'folding on the floor', 42, 3, 6), rung('register', 'Register', 'on the register', 62, 2, 14), rung('fitting', 'Fitting', 'fitting customers', 90, 3, 24)),
    nightlife: ladder(NIGHT, rung('barback', 'Barback', 'hauling crates behind the bar', 30, 4, 0), rung('server', 'Server', 'working the floor', 48, 3, 6), rung('bartender', 'Bartender', 'pouring behind the bar', 70, 3, 14), rung('floor-manager', 'Floor manager', 'running the floor', 100, 3, 24)),
    entertainment: ladder(NIGHT, rung('attendant', 'Attendant', 'sweeping between the machines', 26, 3, 0), rung('cashier', 'Cashier', 'on the token counter', 42, 2, 6), rung('rig-tech', 'Rig tech', 'calibrating the rigs', 64, 3, 14), rung('floor-boss', 'Floor boss', 'keeping the floor', 90, 3, 24)),
    firearms: ladder(SHOP, rung('stock', 'Stock hand', 'unboxing ammo', 30, 3, 0), rung('gun-counter', 'Gun counter', 'working the gun counter', 48, 2, 6), rung('range', 'Range officer', 'running the range', 68, 3, 14), rung('bench', "Gunsmith's hand", 'at the bench', 95, 4, 24)),
    melee: ladder(SHOP, rung('sweeper', 'Sweeper', 'sweeping up shavings', 24, 3, 0), rung('sharpener', 'Sharpener', 'at the whetstone', 40, 3, 6), rung('blade-counter', 'Counter', 'working the counter', 58, 2, 14), rung('forge', "Smith's hand", 'at the forge', 85, 4, 24)),
    cyberware: ladder(SHOP, rung('cleaner', 'Cleaner', 'scrubbing down the chair', 28, 3, 0), rung('assistant', "Doc's assistant", 'assisting in the chair', 50, 3, 6), rung('chrome-tech', 'Chrome tech', 'calibrating implants', 75, 3, 14), rung('surgical', 'Surgical tech', 'in surgery', 110, 4, 24)),
    netrunning: ladder(SHOP, rung('shelving', 'Stock hand', 'shelving shards', 28, 2, 0), rung('net-counter', 'Counter', 'working the counter', 46, 2, 6), rung('deck-tech', 'Deck tech', 'flashing decks', 70, 3, 14), rung('ice', 'ICE tester', 'testing ICE', 100, 3, 24)),
    commodity: ladder(DAY, rung('stocker', 'Stocker', 'stocking shelves', 22, 3, 0), rung('till', 'Register', 'on the register', 36, 2, 6), rung('buyer', 'Buyer', 'appraising junk', 52, 2, 14), rung('store-manager', 'Store manager', 'running the store', 74, 2, 24)),
    services: ladder(DAY, rung('errands', 'Errand runner', 'running errands', 22, 3, 0), rung('front', 'Front counter', 'at the front counter', 36, 2, 6), rung('technician', 'Technician', 'on repairs', 56, 3, 14), rung('shop-manager', 'Shop manager', 'running the shop', 78, 2, 24)),
    bank: ladder(DAY, rung('runner', 'Cash runner', 'carrying cash bags', 30, 2, 0), rung('teller', 'Teller', 'at the teller window', 50, 2, 6), rung('loans', 'Loans clerk', 'working loans', 72, 2, 14), rung('branch', 'Branch manager', 'running the branch', 105, 2, 24)),
    'tattoo-studio': ladder(SHOP, rung('needles', 'Shop hand', 'cleaning the needles', 24, 2, 0), rung('apprentice', 'Apprentice', 'inking flash', 40, 3, 6), rung('tattooist', 'Tattooist', 'inking clients', 65, 3, 14), rung('lead', 'Lead artist', 'drawing custom pieces', 95, 3, 24)),
    vehicles: ladder(DAY, rung('parts', 'Parts runner', 'running parts', 26, 4, 0), rung('courier', 'Courier', 'on a delivery run', 42, 4, 6), rung('mechanic', 'Mechanic', 'under a car', 64, 4, 14), rung('chief', 'Chief mechanic', 'running the bays', 92, 3, 24)),
    lodging: ladder(DAY, rung('housekeeping', 'Housekeeping', 'changing sheets', 22, 4, 0), rung('desk', 'Front desk', 'on the front desk', 36, 2, 6), rung('duty', 'Duty manager', 'running the desk', 54, 2, 14), rung('house', 'House manager', 'running the place', 76, 2, 24)),
    medical: ladder([8, 16], rung('orderly', 'Orderly', 'mopping the ward', 28, 4, 0), rung('pharmacy-tech', 'Pharmacy tech', 'filling prescriptions', 46, 2, 6), rung('medtech', 'Medtech', 'patching people up', 70, 3, 14), rung('charge', 'Charge medtech', 'running the shift', 100, 3, 24)),
  },
  most: 2,
  roster: { day: [1, 2, 3, 4, 5], night: [4, 5, 6] },
  tiers: { luxury: 1.6, everyday: 1, poverty: 0.7 },
  trustPerShift: 1,
  rapport: 3,
  rep: 1,
  quit: 4,
  notice: 1,
  experience: 0.5,
  reference: { trust: 4, stances: ['warm', 'friend'] },
  noShow: { trust: 2, rapport: 2, fireAfter: 4 },
  raise: { thriving: 0.05, most: 0.25 },
  moonlight: { loyalty: 0.65, rapport: 3 },
  promoteAt: ['warm', 'friend'],
  perks: {
    discount: 0.2,
    meal: { food: 'food', nightlife: 'drink' },
    uniform: { clothing: 1 },
    keys: 2,
  },
  events: {
    chance: 0.35,
    weights: { rush: 3, shoplifter: 2, cut: 1, cover: 2 },
    where: {
      rush: ['food', 'nightlife', 'clothing', 'commodity', 'entertainment', 'lodging'],
      shoplifter: ['clothing', 'commodity', 'firearms', 'melee', 'cyberware', 'netrunning', 'tattoo-studio', 'medical'],
    },
    rush: { energy: 2, tips: [6, 18], trust: 1, rep: 1 },
    shoplifter: { trust: 2, rep: 1, rapport: 3, grudge: 10, thanks: 3, loss: 25 },
    cut: { odds: 0.35, perLevel: 0.08, rapport: 4, trust: 1, gangRep: 3, grudge: 10, paid: 1, worse: 2 },
    cover: { energy: 2, pay: 0.5, rapport: 6, refuse: 2 },
    lines: {
      rushOpen: [
        "A rush hits {work}: the line's out the door and everyone wants it now.",
        'Out of nowhere {work} is packed, and nobody in it wants to wait.',
        'A crowd off the last train floods in, every one of them in a hurry.',
        'Something lets out down the street, and half of it ends up in {work}.',
      ],
      rushHustle: [
        'You put your head down and keep up with it. {tips} €$ in tips by the end, and the boss noticed.',
        'You hustle through it, two at a time. It comes to {tips} €$ in tips.',
        'Somewhere in the middle of it you stop thinking and just move. {tips} €$ in tips, and sore feet.',
        "You make it look easy. It isn't. {tips} €$ in tips says somebody noticed.",
      ],
      rushPace: [
        'You keep your own pace. The line thins out on its own, eventually.',
        'You let the rush come to you. Nobody tips, and nobody dies.',
        'You work at the speed you work. A few people give up and leave.',
        "Slow and steady. The crowd grumbles, then thins. Nobody's tipping.",
      ],
      shoplifterOpen: [
        '{Who} is palming something off a shelf by the door.',
        'You catch {who} slipping something into a jacket.',
        "{Who} keeps glancing at the door, one hand in a pocket that wasn't that full a minute ago.",
        'In the corner of your eye, {who} tucks something away and drifts toward the exit.',
      ],
      shoplifterStop: [
        "You step in front of the door. {Who} hands it back and won't look at you on the way out.",
        'You stop {who} at the door and take it back. The boss will hear about it.',
        'A hand on the shoulder, a quiet word. {Who} puts it back on the shelf, red to the ears.',
        'You block the way out until {who} gives it up. Nobody claps, but the boss saw.',
      ],
      shoplifterLet: [
        'You look the other way. {Who} is gone, and so is the stock.',
        'Not your eddies, not your problem. {Who} walks out with it.',
        "You pretend to count something. When you look up, {who}'s gone, and so is a gap on the shelf.",
        '{Who} catches your eye on the way out. You both pretend it never happened.',
      ],
      cutOpen: [
        '{Who}, in {gang} colors, leans on the counter: collection day.',
        '{Who} walks in like {work} belongs to the {gang}. They want their cut.',
        "{Who} doesn't queue. The {gang} never queue. It's collection day.",
        'Everybody in {work} goes quiet when {who} walks in. The {gang} have come for their cut.',
      ],
      cutPay: [
        "The envelope comes out from under the till and into {who}'s jacket. Another week paid for.",
        'You hand it over. {Who} counts it, nods, and goes.',
        "You pay. {Who} doesn't say thank you. The {gang} never do.",
        'The cut changes hands without a word. The room breathes again.',
      ],
      cutStand: [
        'You tell {who} the place is short this week. A long look, and then {who} lets it go. For now.',
        "You don't hand it over, and {who} doesn't push. Not today.",
        'You hold the stare until {who} looks away first, and goes without it.',
        'You say no, and mean it. {Who} weighs it, and decides {work} can wait a week.',
      ],
      cutWorse: [
        'You stand your ground. The {gang} will take double next week, and the boss knows who to thank.',
        '{Who} hears you out, smiles, and says the price just went up.',
        '{Who} laughs, and names a new number. It is a lot bigger than the old one.',
        "It doesn't land. {Who} leaves with a promise the {gang} will be back, and back hungry.",
      ],
      coverOpen: [
        '{Who} catches you on the way out: could you cover the rest of {his} shift?',
        "{Who} asks if you'll take the back half of {his} shift.",
        '{Who} looks wrecked, and asks if you can stay on a few more hours.',
        'Before you can clock out, {who} grabs your sleeve. Something came up; could you cover?',
      ],
      coverYes: [
        'You stay on and cover for {who}: half a shift more, {pay} €$ on your pay.',
        'You take the rest of the shift off {his} hands. {pay} €$ more, and a friend.',
        "Back to it, then. {Who}'s gone before you can change your mind. {pay} €$ on your pay.",
        "You cover. It's long and it's dull and it's {pay} €$, and {who} won't forget it.",
      ],
      coverNo: [
        "You tell {who} not today. Someone else can, or nobody will.",
        "You shake your head. {Who} nods like {he} expected it.",
        'Not tonight. {Who} goes looking for someone who owes {him} a favor.',
        "You're out the door. {Who}'s problem stays {who}'s.",
      ],
    },
  },
};
