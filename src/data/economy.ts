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
 * takes (most for goods off a shelf, least for a service), the gangs on its turf six percent,
 * its rent on Monday to whoever owns the building (its boss owns about one in three) and its
 * people; it starts with two weeks of costs in the till and keeps three after payday, the rest
 * to its owner. Eight to fourteen landlords a district own its small blocks and the buildings
 * of the storefronts whose boss doesn't; the chains and the hospitals are corps'. Someone who
 * can't make the week gets up to a week's worth from family with money to spare; a habit costs
 * up to two doses a week, to the gang that deals it. A week half clear of its costs is thriving;
 * a week in the red, struggling; thriving pays the player's shift a quarter more, struggling a
 * quarter less, and a struggling boss won't hire.
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
  trade: {
    thriving: "Packed; the till hasn't stopped all week.",
    steady: 'Trade is steady.',
    struggling: "Trade is slow; the till's been light all week.",
  },
};
