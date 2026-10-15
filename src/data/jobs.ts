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
 * and the job's gone.
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
};
