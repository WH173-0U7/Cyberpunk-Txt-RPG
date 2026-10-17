import type { EconomyRules } from '../engine/economy';
import { CITY } from './city';

/**
 * How eddies go round the city (all ours). Payday is Friday: a storefront's people from its till
 * (a cook at an everyday counter about 118 a week, the boss near twice that), the corps' from
 * their payroll (a tower pays best, a warehouse least), an officer, a gang's member from its
 * chest; a freelancer's week swings a good way either side of what their line pays, from clients
 * across the city, while street vendors, buskers, joytoys and delivery drivers share what's
 * spent at the city's markets, stalls and places of their own; the retired draw a small pension
 * and the jobless nothing. Under 80 a week someone lives poorly, over 220 well: a day's food is
 * 2, 5 or 13 eddies, bought once a week at one of the four counters nearest home (any eatery, a
 * bodega, a general store, a noodle stand, a market or a diner), two fifths of it at lunch near
 * work. The rent is a head, paid weekly: a small block (fewer than fourteen floors) is a
 * neighborhood landlord's, a taller one or a megabuilding a corp's, a shack a squat; a landlord
 * spends two fifths of it on the building's upkeep at a store of the district. Everyone keeps two
 * weeks of food and rent back before spending on anything else: evenings out at their hangout,
 * and about one day in eight something at a store in their district, mostly laundry, repairs and
 * odds and ends, meds for the old, chrome and guns for the gangs and the guards; what's well
 * over the cushion goes three percent a day. A day in a hospital bed is billed. Downtown and
 * Westbrook get the most trade from outside, Santo Domingo the least, and the ripperdocs, deck
 * shops, gun shops and motels draw it most. A storefront pays its suppliers a share of what it
 * takes (most for goods off a shelf, least for a service) for what it restocks, from the till,
 * each day up to full shelves (a week and a half of its costs at its prices, never more than half
 * the till in a day): a dish at a few eddies is a dozen on the shelf, a gun at a few hundred one
 * or two. Now and then the trucks stop coming to one kind of store in a district for a few days
 * (food and everyday goods most, then meds), and it gets a fifth of what it would. Under a third
 * full, prices climb, up to two fifths over when the shelves are bare; a struggling place sitting
 * on full shelves takes a tenth off; an eatery's last hour takes a quarter off what won't keep.
 * Across a district, a kind of store under a third stocked is short there, and back over three
 * fifths. It pays the gangs on its turf six percent,
 * its rent on Monday to whoever owns the building (its boss owns about one in three) and its
 * people; it starts with two weeks of costs in the till and keeps three after payday, the rest
 * to its owner. Eight to fourteen landlords a district own its small blocks and the buildings
 * of the storefronts whose boss doesn't; the chains and the hospitals are corps'. Someone who
 * can't make the week gets up to a week's worth from family with money to spare; a habit costs
 * up to two doses a week, to the gang that deals it. A week half clear of its costs is thriving;
 * a week in the red, struggling; thriving pays the player's shift a quarter more, struggling a
 * quarter less, and a struggling boss won't hire.
 * Hard times: someone bold or greedy enough who can't pay for the week's food walks out with half
 * of what they're short. Whoever still can't make the week on payday goes to the loan shark, the
 * gang with the most of their district's turf: up to two weeks of their food and rent, at a tenth a
 * week, which grows to no more than six weeks of it; whatever they have over a week's worth goes
 * on paying it back. Three weeks behind on the rent, they're put out. A storefront that can't pay
 * its people three paydays running goes under, unless it's a corp's, a bank, a hospital or a real
 * place, and new management takes it on one to three weeks later (twice, three times, four times
 * that for a place that went under before).
 */
export const ECONOMY: EconomyRules = {
  payday: 5,
  rentDay: 1,
  staff: { luxury: 185, everyday: 118, poverty: 65 },
  boss: 1.8,
  payroll: { tower: 260, factory: 140, warehouse: 120, default: 110 },
  ncpd: 180,
  gang: 90,
  gigs: {
    "fixer's runner": 85,
    'street vendor': 70,
    'delivery driver': 75,
    'braindance editor': 95,
    'netrunner for hire': 120,
    'NCART mechanic': 105,
    joytoy: 75,
    courier: 75,
    'scrap hauler': 55,
    'street musician': 45,
    'rideshare driver': 80,
    'day laborer': 40,
    techie: 90,
    'bike courier': 65,
    retired: 45,
  },
  street: ['street vendor', 'street musician', 'joytoy', 'delivery driver'],
  swing: 0.4,
  means: [80, 220],
  food: { poverty: 2, everyday: 5, luxury: 13 },
  grocers: { categories: ['food'], businesses: ['bodega', 'general-store'], places: ['market', 'noodle', 'diner'], nearest: 4 },
  lunch: 0.4,
  homes: {
    small: { poverty: 12, everyday: 26, luxury: 55 },
    tall: { poverty: 15, everyday: 30, luxury: 62 },
    megabuilding: { poverty: 12, everyday: 22, luxury: 45 },
  },
  smallBlock: 14,
  savings: 3,
  purse: 2,
  cushion: 2,
  outing: [0.15, 0.55],
  spend: { luxury: 45, everyday: 14, poverty: 5 },
  stayIn: 2,
  goods: {
    chance: 0.12,
    most: 0.5,
    // Weighed so that every kind of store sees about the same trade a week, a dear thing bought the less often.
    kinds: {
      services: { weight: 13, spend: { poverty: 8, everyday: 15, luxury: 40 } },
      commodity: { weight: 7, spend: { poverty: 10, everyday: 20, luxury: 50 } },
      nightlife: { weight: 5, spend: { poverty: 8, everyday: 20, luxury: 60 } },
      entertainment: { weight: 5, spend: { poverty: 8, everyday: 18, luxury: 45 } },
      medical: { weight: 4, spend: { poverty: 12, everyday: 25, luxury: 60 }, walks: { elder: 3 } },
      clothing: { weight: 2.5, spend: { poverty: 25, everyday: 60, luxury: 220 } },
      lodging: { weight: 2.5, spend: { poverty: 15, everyday: 30, luxury: 80 } },
      firearms: { weight: 1, spend: { poverty: 40, everyday: 90, luxury: 250 }, walks: { gang: 6, guard: 4 } },
      vehicles: { weight: 1.1, spend: { poverty: 30, everyday: 70, luxury: 200 } },
      melee: { weight: 0.6, spend: { poverty: 30, everyday: 60, luxury: 180 }, walks: { gang: 5 } },
      netrunning: { weight: 1.2, spend: { poverty: 35, everyday: 80, luxury: 250 }, walks: { gang: 2 } },
      cyberware: { weight: 1.4, spend: { poverty: 60, everyday: 150, luxury: 600 }, walks: { gang: 4, corpo: 2, guard: 2 } },
    },
  },
  splurge: 0.03,
  upkeep: { share: 0.4, categories: ['services', 'commodity', 'vehicles'] },
  ward: { poverty: 15, everyday: 35, luxury: 90 },
  walkIn: { luxury: [120, 260], everyday: [50, 120], poverty: [20, 60] },
  visitors: { city_center: 0.45, westbrook: 0.35, watson: 0.15, heywood: 0.1, pacifica: 0.08, badlands: 0.12, santo_domingo: 0.05 },
  outsiders: { cyberware: 4, netrunning: 4, firearms: 3, melee: 3, lodging: 3, clothing: 2, vehicles: 2, food: 0.3, commodity: 0.5 },
  daySwing: 0.3,
  supplies: { default: 0.35, food: 0.45, nightlife: 0.3, commodity: 0.55, clothing: 0.45, firearms: 0.5, melee: 0.45, cyberware: 0.55, netrunning: 0.5, medical: 0.4, vehicles: 0.4, entertainment: 0.15, services: 0.15, lodging: 0.1 },
  stock: {
    weeks: 1.5,
    restock: 0.5,
    soldOut: 0.05,
    par: 40,
    most: 12,
    shock: { chance: 0.03, days: [2, 5], cut: 0.2, weights: { food: 3, commodity: 3, medical: 2, nightlife: 1, clothing: 1, cyberware: 1, firearms: 1, netrunning: 0.5, vehicles: 0.5 } },
  },
  prices: { low: 0.35, scarce: 0.4, high: 0.85, glut: 0.1, closing: { hours: 1, off: 0.25, categories: ['food'] } },
  market: {
    short: 0.35,
    back: 0.6,
    keep: 24,
    goods: { food: 'food', commodity: 'everyday goods', nightlife: 'drink', firearms: 'guns and ammo', melee: 'blades', cyberware: 'chrome', netrunning: 'decks and quickhacks', clothing: 'clothes', medical: 'meds', vehicles: 'car parts', entertainment: 'BD time', services: 'repairs', lodging: 'rooms' },
    lines: {
      shock: ["No deliveries of {goods} into {district}: the trucks aren't coming.", "{district}'s {goods} suppliers have stopped sending. Stock up while you can.", "The {goods} trucks skipped {district} today, and they'll skip it tomorrow."],
      short: ['{Goods} short in {district}: bare shelves, and prices up.', "Can't find {goods} in {district} for love or eddies.", "{Goods} gone scarce in {district}. What's left costs more."],
      back: ['{Goods} back on the shelves in {district}.', 'The {goods} shortage in {district} is over.', "{district}'s shelves are full of {goods} again."],
      closed: ['{place} in {district} has gone under. Shutters down, staff out.', "{place} couldn't make payroll, and now it's closed. {district} has one shop fewer.", 'Another one gone in {district}: {place} has shut its doors.'],
      reopened: ['{place} is open again in {district}, under new management.', 'New faces behind the counter at {place}: the {district} shop is back in business.', "{place} has reopened. Somebody in {district} thinks they can make it pay."],
    },
  },
  rent: { luxury: 48, everyday: 21, poverty: 9 },
  float: 2,
  reserve: 3,
  owners: { perDistrict: [8, 14], age: 35, bossOwns: 0.35, corp: [...CITY.buildings.businesses.filter((b) => b.chain).map((b) => b.id), 'hospital'] },
  vice: 2,
  family: 1,
  protection: 0.06,
  chestWeeks: 4,
  thrivingAt: 0.5,
  pay: { thriving: 1.25, steady: 1, struggling: 0.75 },
  hard: {
    lift: { nerve: 1.1, share: 0.5 },
    loan: { weeks: 2, interest: 0.1, most: 6, keep: 1 },
    evict: 3,
    close: { weeks: 3, days: [7, 21], again: 3, never: { businesses: ['bank', 'hospital'], names: (CITY.buildings.landmarks ?? []).map((l) => l.name) } },
  },
  business: {
    price: { closed: 3, costs: 4, profits: 8 },
    sellers: { struggling: ['neutral', 'warm', 'friend'], steady: ['warm', 'friend'], thriving: ['friend'] },
    sell: 0.7,
    levels: { low: { price: 0.85, walkIn: 1.35, keep: 1, draw: 0.2 }, fair: { price: 1, walkIn: 1, keep: 1, draw: 0 }, high: { price: 1.2, walkIn: 0.75, keep: 0.85, draw: 0 } },
    amounts: [100, 500, 1000],
    lines: {
      bought: ['{place} is yours. The old boss stays on to run it, and what it makes over its reserve comes to you every payday.', 'You own {place} now. Same faces behind the counter; the profit is yours, paid each payday.'],
      boughtClosed: ["{place} is yours, shutters and all. New hands start tomorrow, and the profit comes to you every payday.", 'You buy {place} off the notice on its shutters. It opens again tomorrow under people you hired.'],
      profit: ['{place} made {amount} €$ over its reserve this week: into your account.', 'Payday at {place}: {amount} €$ for you, into the account.'],
      short: ["{place} couldn't make its wages this payday, {weeks} weeks running. {under} and it goes under: put something in the till.", "Short at {place}: the hands got less than they're owed, {weeks} of {under} weeks before it folds. The till needs money."],
      lost: ["{place} has gone under. It was yours; now it's a chained shutter.", "{place} is finished: the shutters are down, and it isn't yours any more."],
      left: ['What was left in its till, {amount} €$, is in your account.', '{amount} €$ was still in the till: it comes to you.'],
      sold: ['You sell {place} for {amount} €$, into your account.', '{place} goes back to its people for {amount} €$. Not yours any more.'],
      putIn: ['{amount} €$ into the till at {place}.', 'You put {amount} €$ into {place}\'s till.'],
      tookOut: ['You take {amount} €$ out of the till at {place}, leaving it its float.', '{amount} €$ out of {place}\'s till, into your account.'],
      prices: ['{place} is on {level} prices now.', 'New prices at {place}: {level}.'],
    },
  },
  drift: {
    wages: { up: 0.02, down: 0.03, settle: 0.25, least: 0.85, most: 1.25 },
    rents: { up: 0.01, down: 0.03, behind: 0.1, least: 0.8, most: 1.25 },
  },
  trade: {
    thriving: "Packed; the till hasn't stopped all week.",
    steady: 'Trade is steady.',
    struggling: "Trade is slow; the till's been light all week.",
  },
};
