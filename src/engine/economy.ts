import type { Quality } from './food';
import { bossOf } from './jobs';
import { buildingById, hospitalOf, walkOf, type Person, type Population, type SkillWalk, type Spot, type Tie, type TieKind } from './people';
import { createRng } from './rng';
import type { Building, BuildingCategory, World } from './types';

/**
 * Eddies moving around the city without the player, in a closed loop: every eddie a person
 * spends lands somewhere, and every eddie they're paid comes from somewhere. A storefront's
 * staff are paid out of its till, on Friday, and only what it holds (a chain's or a hospital's
 * corp makes up the rest); the corps' people, the NCPD and the freelancers with clients across
 * the city are paid from outside it; the street's freelancers live off what's spent at the
 * city's places of their own; a gang's members off its chest, which its cut of the takings on
 * its turf and its users' habits fill; the retired draw a pension, and the jobless get nothing.
 * Once a week, each on a day of their own, everyone buys the week's food at one of the counters
 * nearest home (and lunch near work), by how they live; goes out of an evening to their hangout
 * when there's money to spare; now and then buys clothes, meds, chrome, a gun, a night in a
 * motel, at a real place in their district; and pays the week's rent to whoever owns their
 * home: a person (small blocks are the neighborhood's landlords'), or a corp (the tall blocks
 * and the megabuildings), whose rent leaves the city.
 * A storefront takes what's spent there and a little trade from outside, pays its suppliers
 * (outside), the gangs' cut, its rent to whoever owns the building (its boss, now and then, or
 * a landlord, or a corp) and its people; what's over a few weeks of its costs goes to its
 * owner (the boss, or out of the city for a corp). People keep about what they started with
 * on them (a robbery takes what it did) and the rest in an account; what they couldn't pay of
 * the rent they owe. Drawn from the seed and the day like the rest of a day; the numbers are
 * in `src/data/economy.ts`.
 */
export type Health = 'thriving' | 'steady' | 'struggling';

/** A storefront's books: the last days' nets (takings less the day's costs), oldest first, a week at most; and what the player has spent there since the last day was lived. */
export interface Till {
  days: number[];
  pending: number;
  /** The cash in it (missing in a save from before: its float, on the next day lived). */
  cash?: number;
  /** What it was short of its people's wages on the last payday (missing: paid in full). */
  short?: number;
  /** How full its shelves are, 0 to 1 (missing: full). */
  stock?: number;
  /** What the player has bought off them since they were last stocked, by menu item. */
  bought?: Record<string, number>;
}

/** Where someone's pay comes from: a storefront's till, a payroll from outside the city (the corps', the NCPD's), a gang's chest, the street's trade, clients across the city, a pension, or nowhere. */
export type Earner = 'staff' | 'payroll' | 'gang' | 'street' | 'gig' | 'pension' | 'none';

/** Someone's money as the economy sees it, worked out from what they do and where they live. */
export interface Ledger {
  earner: Earner;
  /** About what a week pays them. */
  pay: number;
  /** How they live, by what they're paid. */
  means: Quality;
  /** Where they buy a day's food: one of the counters nearest home; and, working somewhere, lunch at one of those nearest work. */
  grocer: Spot | null;
  lunch: Spot | null;
  /** A week's rent, and whose it is: a person's id, null for a corp's (a squat or no home: undefined, and no rent). */
  rent: number;
  landlord: string | null | undefined;
  /** A week of food and rent. */
  essentials: number;
  walk: SkillWalk;
}

/** What's bought now and then at a kind of storefront: how often against the rest, what it costs by the place's tier, and the walks of life that buy it more (a multiple of the weight). */
export interface GoodsKind {
  weight: number;
  spend: Record<Quality, number>;
  walks?: Partial<Record<SkillWalk, number>>;
}

export interface EconomyRules {
  /** The weekday eddies are paid (0 Sunday – 6 Saturday), and the weekday a storefront's rent is due (a tenant pays on their own day of the week). */
  payday: number;
  rentDay: number;
  /** A week's pay: a storefront's worker by its tier, the boss a multiple of that; the corps' people by the kind of building they work in (`default` for any other); an officer; a gang's member, from its chest. */
  staff: Record<Quality, number>;
  boss: number;
  payroll: Record<string, number>;
  ncpd: number;
  gang: number;
  /** A freelancer's week by their line of work (a pension for the retired), from outside the city; the lines that live off the city's street trade instead (their figure only says how they live); and how much a week of gigs swings either way. */
  gigs: Record<string, number>;
  street: string[];
  swing: number;
  /** How someone lives, by a week's pay: under the first, poorly; over the second, well. */
  means: [number, number];
  /** A day's food by how someone lives; and where it's bought: a storefront of these categories or businesses, or a place of these kinds, one of the `nearest` few to home, and for anyone who works in a building, `lunch` of it at one of the nearest to work. */
  food: Record<Quality, number>;
  grocers: { categories: string[]; businesses: string[]; places: string[]; nearest: number };
  lunch: number;
  /** A week's rent a head, by the home's tier: a block of fewer floors than `smallBlock` (a landlord's), a taller one (a corp's), a megabuilding (a corp's). A shack is a squat. */
  homes: { small: Record<Quality, number>; tall: Record<Quality, number>; megabuilding: Record<Quality, number> };
  smallBlock: number;
  /** What someone has in the account to begin with, in weeks of their pay (of their food and rent, with none). */
  savings: number;
  /** Cash on them: topped up from the account to what they started with; this many times that, and the rest goes in. */
  purse: number;
  /** Weeks of food and rent kept back before anything else is spent. */
  cushion: number;
  /** The chance of an evening out, from the least chatty to the most; what one costs by the place's tier; and how many evenings' worth over the cushion they keep before they'll go. */
  outing: [number, number];
  spend: Record<Quality, number>;
  stayIn: number;
  /** Something bought now and then: the chance a day; the most of what's spare it takes; what, by category. */
  goods: { chance: number; most: number; kinds: Partial<Record<BuildingCategory, GoodsKind>> };
  /** The share of what's over the cushion that goes a day on everything else, at a storefront of the district. */
  splurge: number;
  /** The share of the rent a landlord takes that goes on the building's upkeep, at a storefront of these categories in its district. */
  upkeep: { share: number; categories: BuildingCategory[] };
  /** A day in a hospital bed, by the hospital's tier. */
  ward: Record<Quality, number>;
  /** Trade from outside the city: a storefront's day of it at its tier (from, to; drawn once a place, then a daily swing either way), times its district's share of visitors and its category's draw for them (1 without). */
  walkIn: Record<Quality, [number, number]>;
  visitors: Record<string, number>;
  outsiders: Partial<Record<BuildingCategory, number>>;
  daySwing: number;
  /** What a storefront's stock costs it from its suppliers, outside the city, as a share of what it sells it for, by category. */
  supplies: Partial<Record<BuildingCategory, number>> & { default: number };
  /**
   * Stock: full shelves are `weeks` of a storefront's costs at its prices; each day it buys back
   * up to full from its suppliers, with no more than `restock` of the cash in the till; under
   * `soldOut` there's nothing left to sell. A counter's `par` (a dish at a few eddies, a dozen of
   * it; a gun at a few hundred, one or two) is how many of a thing full shelves hold, up to
   * `most`. Now and then (`shock.chance` a day, a district) the trucks stop coming for one
   * kind of store there (by `shock.weights`) for `shock.days`, and it gets only `shock.cut` of
   * what it would.
   */
  stock: { weeks: number; restock: number; soldOut: number; par: number; most: number; shock: { chance: number; days: [number, number]; cut: number; weights: Partial<Record<BuildingCategory, number>> } };
  /** Prices by supply and demand: under `low` stock, dearer, up to `scarce` over when the shelves are bare; a struggling place with its shelves over `high`, `glut` off to shift it; and the last `closing.hours` before a counter of these categories shuts, `closing.off` off what won't keep. */
  prices: { low: number; scarce: number; high: number; glut: number; closing: { hours: number; off: number; categories: BuildingCategory[] } };
  /** The market as people hear of it: a kind of store across a district under `short` is short there, and back over `back`; the last `keep` headlines are kept; what each kind of store's goods are called, and the headlines' lines (`{goods}`, `{district}`). */
  market: { short: number; back: number; keep: number; goods: Partial<Record<BuildingCategory, string>>; lines: Record<MarketNews['kind'], string[]> };
  /** A storefront's rent a day by tier, paid weekly to whoever owns the building. */
  rent: Record<Quality, number>;
  /** Weeks of its costs a till starts with, and keeps after payday: what's over goes to its owner. */
  float: number;
  reserve: number;
  /** Who owns what: a few landlords a district (from, to), from its people at least `age` old; the chance a storefront's boss owns the building; the businesses a corp runs. */
  owners: { perDistrict: [number, number]; age: number; bossOwns: number; corp: string[] };
  /** A habit's doses a week, at its street price, for someone who needs it all the way: it goes to the gang that deals it where they live. */
  vice: number;
  /** Help from family on payday for someone who can't make the week: up to this many weeks of their food and rent, from a relative with money over their own cushion. */
  family: number;
  /** The share of a storefront's takings the gangs on its turf collect. */
  protection: number;
  /** The most a gang's chest holds after payday, in weeks of its members' wages: the rest goes on guns, rides and rent. */
  chestWeeks: number;
  /** A week's margin over its costs that makes a place thriving; below nothing it's struggling. */
  thrivingAt: number;
  /** What a shift pays the player, by how the place is doing. */
  pay: Record<Health, number>;
  /** How trade reads inside, by how the place is doing. */
  trade: Record<Health, string>;
}

/** Who collects in each district, from the people data's turf table: every gang there, by its share of the turf. */
export function turfFrom(turf: Record<string, Array<[string, number]>>): (district: string) => Array<[string, number]> {
  return (district) => {
    const gangs = turf[district] ?? [];
    const total = gangs.reduce((n, [, w]) => n + w, 0);
    return total > 0 ? gangs.map(([gang, w]) => [gang, w / total]) : [];
  };
}

/** The weekday of a clock day (0 Sunday – 6 Saturday): day 0 was a Thursday. */
export function weekdayOf(day: number): number {
  return (((day + 4) % 7) + 7) % 7;
}

/** A storefront's till, started empty if it has none. */
export function tillOf(tills: Record<string, Till>, id: string): Till {
  return (tills[id] ??= { days: [], pending: 0 });
}

/** What a week of a storefront's people costs it: each worker, the boss more. */
export function staffCostOf(staff: Person[], boss: Person | null, tier: Quality, rules: EconomyRules): number {
  return staff.length * rules.staff[tier] + (boss ? rules.staff[tier] * (rules.boss - 1) : 0);
}

/** How a place is doing on its last week: thriving when the week's net clears a share of its costs, struggling when it lost money, steady in between, and steady until a whole week is on the books. */
export function healthOf(till: Till | undefined, weeklyCosts: number, rules: EconomyRules): Health {
  if (!till || till.days.length < 7) return 'steady';
  const net = till.days.reduce((n, d) => n + d, 0);
  if (net < 0) return 'struggling';
  return net > rules.thrivingAt * weeklyCosts ? 'thriving' : 'steady';
}

// ───────────── Stock and prices ─────────────

/** How full a storefront's shelves are. */
export function stockOf(till: Till | undefined): number {
  return till?.stock ?? 1;
}

/** What a storefront's prices come to by its stock and its trade: dearer as the shelves empty, cheaper to shift what a slow place is sitting on. */
export function priceFactor(stock: number, health: Health, rules: EconomyRules): number {
  const { low, scarce, high, glut } = rules.prices;
  if (stock < low) return 1 + (scarce * (low - stock)) / low;
  if (health === 'struggling' && stock > high) return 1 - glut;
  return 1;
}

/** How many of something at a price full shelves hold. */
export function parOf(price: number, rules: EconomyRules): number {
  return Math.max(1, Math.min(rules.stock.most, Math.round(rules.stock.par / Math.sqrt(Math.max(1, price)))));
}

/** How many of a menu item are left on a storefront's shelves: its share of them, less what the player has had since they were stocked. */
export function leftOf(id: string, price: number, till: Till | undefined, rules: EconomyRules): number {
  const stock = stockOf(till);
  if (stock < rules.stock.soldOut) return 0;
  return Math.max(0, Math.round(stock * parOf(price, rules)) - (till?.bought?.[id] ?? 0));
}

/** A supply shock: the trucks not coming to one kind of store in a district, until a day. */
export interface Shock {
  district: string;
  category: BuildingCategory;
  until: number;
}

/** A headline: one kind of store's stock across a district gone short, come back, or cut off at the source. */
export interface MarketNews {
  day: number;
  district: string;
  category: BuildingCategory;
  kind: 'shock' | 'short' | 'back';
}

/** The market's state: the shocks on, the kinds of store short where (`district:category`), and the headlines, newest last. */
export interface MarketState {
  shocks: Shock[];
  short: string[];
  news: MarketNews[];
}

// ───────────── Who owns what ─────────────

/** Who owns the city's buildings: each one that's anyone's (a person's id, or null for a corp); what each person owns; the storefronts a corp runs. A squat is nobody's. */
export interface Owners {
  of: Map<string, string | null>;
  holdings: Map<string, string[]>;
  corp: Set<string>;
}

/** Whether a home is a block small enough to be a landlord's, a corp's, or a squat. */
function homeKind(building: Building, rules: EconomyRules): keyof EconomyRules['homes'] | null {
  if (building.kind === 'megabuilding') return 'megabuilding';
  if (building.kind !== 'apartments') return null;
  return building.floors < rules.smallBlock ? 'small' : 'tall';
}

const owning = new WeakMap<Population, Owners>();

/**
 * Who owns what, drawn once a city on streams of its own: a few landlords a district, from its
 * people old enough and outside the gangs and the NCPD, own its small blocks between them and
 * the storefronts whose boss doesn't own the building; the tall blocks, the megabuildings and
 * whatever a corp runs (a chain, a hospital) are the corps'. A business is its boss's.
 */
export function ownersOf(world: World, population: Population, rules: EconomyRules, seed: string): Owners {
  const known = owning.get(population);
  if (known) return known;
  const corp = new Set(rules.owners.corp);
  const of = new Map<string, string | null>();
  const holdings = new Map<string, string[]>();
  const own = (building: Building, owner: string | null) => {
    of.set(building.id, owner);
    if (!owner) return;
    const list = holdings.get(owner);
    if (list) list.push(building.id);
    else holdings.set(owner, [building.id]);
  };
  const byDistrict = new Map<string, Person[]>();
  for (const p of population.people) {
    if (p.gang || p.age < rules.owners.age || /NCPD/.test(p.job.role)) continue;
    const list = byDistrict.get(p.district);
    if (list) list.push(p);
    else byDistrict.set(p.district, [p]);
  }
  const pools = new Map<string, Person[]>();
  for (const district of Object.keys(world.districts)) {
    const rng = createRng(`${seed}:owners:${district}`);
    const candidates = [...(byDistrict.get(district) ?? [])];
    const pool: Person[] = [];
    for (let n = rng.int(rules.owners.perDistrict[0], rules.owners.perDistrict[1]); n > 0 && candidates.length; n--) pool.push(candidates.splice(rng.int(0, candidates.length - 1), 1)[0] as Person);
    pools.set(district, pool);
  }
  const staff = new Map<string, Person[]>();
  for (const p of population.people) {
    if (!p.job.building) continue;
    const list = staff.get(p.job.building);
    if (list) list.push(p);
    else staff.set(p.job.building, [p]);
  }
  for (const b of world.buildings) {
    const rng = createRng(`${seed}:owner:${b.id}`);
    const pool = pools.get(b.district) ?? [];
    if (b.business) {
      if (corp.has(b.business)) own(b, null);
      else {
        const boss = bossOf(b, population, staff.get(b.id) ?? []);
        const landlord = pool.length ? rng.pick(pool) : null;
        own(b, boss && (rng.chance(rules.owners.bossOwns) || !landlord) ? boss.id : (landlord?.id ?? null));
      }
    } else if (b.category === 'residential') {
      const kind = homeKind(b, rules);
      if (kind === 'small') own(b, pool.length ? rng.pick(pool).id : null);
      else if (kind) own(b, null);
    }
  }
  const owners = { of, holdings, corp };
  owning.set(population, owners);
  return owners;
}

/** Who a dead owner's buildings go to: their nearest living family, in this order. */
const HEIRS: TieKind[] = ['spouse', 'child', 'partner', 'sibling', 'parent', 'nephew', 'cousin', 'uncle', 'kin'];
const KIN: ReadonlySet<TieKind> = new Set(HEIRS);

/** Whoever holds what an owner owned now: the owner while they live, else their nearest living family, else nobody (it goes to a corp). */
export function holderOf(owner: string | null | undefined, byId: (id: string) => Person | undefined, ties: (id: string) => Tie[]): string | null {
  if (!owner) return null;
  const person = byId(owner);
  if (person && person.diedOn === undefined) return owner;
  const theirs = ties(owner);
  for (const kind of HEIRS) {
    const heir = theirs.find((t) => t.kind === kind && byId(t.to)?.diedOn === undefined && byId(t.to));
    if (heir) return heir.to;
  }
  return null;
}

// ───────────── A person's money ─────────────

/** The places a district's people buy their food at, with where they are: worked out once a city. */
const grocerLists = new WeakMap<World, Map<string, Array<{ spot: Spot; x: number; y: number }>>>();
function grocersIn(world: World, district: string, rules: EconomyRules): Array<{ spot: Spot; x: number; y: number }> {
  let lists = grocerLists.get(world);
  if (!lists) {
    lists = new Map();
    const add = (d: string, entry: { spot: Spot; x: number; y: number }) => {
      const list = (lists as Map<string, Array<{ spot: Spot; x: number; y: number }>>).get(d);
      if (list) list.push(entry);
      else (lists as Map<string, Array<{ spot: Spot; x: number; y: number }>>).set(d, [entry]);
    };
    const { categories, businesses, places } = rules.grocers;
    for (const b of world.buildings) if (b.business && (categories.includes(b.category) || businesses.includes(b.business))) add(b.district, { spot: { kind: 'building', id: b.id }, x: b.x + b.w / 2, y: b.y + b.h / 2 });
    for (const l of Object.values(world.locations)) if (places.includes(l.kind)) add(l.district, { spot: { kind: 'location', id: l.id }, x: l.x, y: l.y });
    grocerLists.set(world, lists);
  }
  return lists.get(district) ?? [];
}

/** What a week pays someone, and from where. */
function payOf(person: Person, world: World, population: Population, rules: EconomyRules, tier: (spot: Spot) => Quality, staffOf: (id: string) => Person[]): { earner: Earner; pay: number } {
  if (person.gang) return { earner: 'gang', pay: rules.gang };
  const work = person.job.building ? buildingById(world, person.job.building) : undefined;
  if (work?.business) {
    const boss = bossOf(work, population, staffOf(work.id));
    const wage = rules.staff[tier({ kind: 'building', id: work.id })];
    return { earner: 'staff', pay: Math.round(boss === person ? wage * rules.boss : wage) };
  }
  if (work) return { earner: 'payroll', pay: rules.payroll[work.kind] ?? rules.payroll.default ?? 0 };
  if (/NCPD/.test(person.job.role)) return { earner: 'payroll', pay: rules.ncpd };
  const gig = rules.gigs[person.job.role];
  if (gig === undefined) return { earner: 'none', pay: 0 };
  if (person.job.role === 'retired') return { earner: 'pension', pay: gig };
  return { earner: rules.street.includes(person.job.role) ? 'street' : 'gig', pay: gig };
}

interface Kept {
  building: string | null;
  role: string;
  gang: string | null;
  home: string | null;
  ledger: Ledger;
}
const ledgers = new WeakMap<Population, Map<string, Kept>>();

/**
 * Someone's money as the economy sees it: where their pay comes from and about what it is, how
 * they live on it, where they buy their food (one of the few counters nearest home, on a stream
 * of their own), their rent and whose it is. Kept until their work, their gang or their home
 * changes.
 */
export function ledgerOf(person: Person, world: World, population: Population, rules: EconomyRules, tier: (spot: Spot) => Quality, seed: string, staffOf?: (id: string) => Person[]): Ledger {
  let known = ledgers.get(population);
  if (!known) ledgers.set(population, (known = new Map()));
  const had = known.get(person.id);
  if (had && had.building === person.job.building && had.role === person.job.role && had.gang === person.gang && had.home === person.home) return had.ledger;
  const staff = staffOf ?? ((id: string) => population.people.filter((p) => p.job.building === id && p.diedOn === undefined));
  const { earner, pay } = payOf(person, world, population, rules, tier, staff);
  const means: Quality = pay < rules.means[0] ? 'poverty' : pay > rules.means[1] ? 'luxury' : 'everyday';
  const home = person.home ? buildingById(world, person.home) : undefined;
  const from = home ? { x: home.x + home.w / 2, y: home.y + home.h / 2 } : (world.districts[person.district] ?? { x: 0, y: 0 });
  const rng = createRng(`${seed}:grocer:${person.id}`);
  const nearest = (district: string, at: { x: number; y: number }): Spot | null => {
    const near = grocersIn(world, district, rules)
      .map((g) => ({ g, d: Math.hypot(g.x - at.x, g.y - at.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, rules.grocers.nearest);
    return near.length ? rng.pick(near).g.spot : null;
  };
  const grocer = nearest(person.district, from);
  const work = person.job.building ? buildingById(world, person.job.building) : undefined;
  const lunch = work ? nearest(work.district, { x: work.x + work.w / 2, y: work.y + work.h / 2 }) : null;
  const kind = home ? homeKind(home, rules) : null;
  const rent = home && kind ? rules.homes[kind][tier({ kind: 'building', id: home.id })] : 0;
  const landlord = home && kind ? (ownersOf(world, population, rules, seed).of.get(home.id) ?? null) : undefined;
  const ledger: Ledger = { earner, pay, means, grocer, lunch, rent, landlord, essentials: rules.food[means] * 7 + rent, walk: walkOf(person, world) };
  known.set(person.id, { building: person.job.building, role: person.job.role, gang: person.gang, home: person.home, ledger });
  return ledger;
}

/** What's in someone's account: as it stands, or what it opens with (a few weeks of their pay, or of their food and rent with none). */
export function accountOf(person: Person, state: Pick<EconomyState, 'savings'>, ledger: Ledger, rules: EconomyRules): number {
  return state.savings?.[person.id] ?? Math.round(rules.savings * (ledger.pay || ledger.essentials));
}

// ───────────── A day ─────────────

/** The eddies and the books a day moves, written onto the people and the state. */
export interface EconomyState {
  eddies: Record<string, number>;
  /** What's in each person's account (missing in a save from before: started afresh from their pay). */
  savings?: Record<string, number>;
  /** Rent someone owes their landlord. */
  arrears?: Record<string, number>;
  /** What's been spent at each district's places of its own since its street freelancers were last paid. */
  street?: Record<string, number>;
  /** Supply shocks, shortages and the headlines about them. */
  market?: MarketState;
  tills: Record<string, Till>;
  treasuries: Record<string, number>;
  hurt: Record<string, number>;
}

/** Someone's drug habit, as money: the gang it goes to and what it costs a day. */
export interface Vice {
  gang: string;
  perDay: number;
}

/** What a day brought into the city and sent out of it, and what it set up (a till's float, an account): the closed loop is everything else. */
export interface Flows {
  in: number;
  out: number;
  opened: number;
}

export interface EconomyDay {
  world: World;
  population: Population;
  state: EconomyState;
  rules: EconomyRules;
  /** The tier a place runs at: its menu's, its rack's, or its district's. */
  tier: (spot: Spot) => Quality;
  /** The gangs that collect in a district, each with its share of the turf. */
  turf: (district: string) => Array<[string, number]>;
  /** What everyone started with on them: the cash they keep on them. */
  base: ReadonlyMap<string, number>;
  seed: string;
  day: number;
  /** Everyone's ties as they stand: for heirs, and family who help. */
  ties: (id: string) => Tie[];
  /** Someone's habit, as money (missing: nobody's). */
  vice?: (person: Person) => Vice | null;
}

/** Where in its tier's range a storefront's usual trade from outside falls, drawn once a storefront and kept. */
const usuals = new WeakMap<World, Map<string, number>>();
function usualOf(world: World, seed: string, id: string): number {
  let known = usuals.get(world);
  if (!known) usuals.set(world, (known = new Map()));
  let usual = known.get(id);
  if (usual === undefined) known.set(id, (usual = createRng(`${seed}:economy:${id}`).next()));
  return usual;
}

/** How many times in `n` tries something with chance `p` comes off, by one roll `u` (0–1) against the counts' odds. */
export function timesIn(n: number, p: number, u: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  let odds = (1 - p) ** n;
  let below = odds;
  let k = 0;
  while (u >= below && k < n) {
    odds *= ((n - k) / (k + 1)) * (p / (1 - p));
    below += odds;
    k++;
  }
  return k;
}

/** Where each person is in the population's list, by id: worked out once a list. */
const indexes = new WeakMap<Person[], Map<string, number>>();
function indexOf(population: Population): Map<string, number> {
  let index = indexes.get(population.people);
  if (!index) indexes.set(population.people, (index = new Map(population.people.map((p, i) => [p.id, i]))));
  return index;
}

/** The tiers places run at, by the function that says so. */
const tierMemo = new WeakMap<(spot: Spot) => Quality, Record<Spot['kind'], Map<string, Quality>>>();

/** The storefronts of each district by category, and all of them: worked out once a city. */
const shopLists = new WeakMap<World, Map<string, Building[]>>();
function shopsIn(world: World, key: string): Building[] {
  let lists = shopLists.get(world);
  if (!lists) {
    lists = new Map();
    for (const b of world.buildings) {
      if (!b.business) continue;
      for (const k of [`${b.district}:${b.category}`, `${b.district}:*`]) {
        const list = lists.get(k);
        if (list) list.push(b);
        else lists.set(k, [b]);
      }
    }
    shopLists.set(world, lists);
  }
  return lists.get(key) ?? [];
}

/**
 * One day of the economy. Payday first: every storefront's people out of its till, everyone
 * else from wherever theirs comes from, the street's trade shared out, the gangs' members from
 * their chests, and a hand from family for whoever can't make the week. Then everyone's day:
 * a bed at the hospital for the laid up, else food, an evening out, something bought now and
 * then, a habit fed; and on rent day the week's rent. Then the books: what each storefront
 * took, its suppliers and the gangs' cut, its rent on rent day, and on payday what's over its
 * reserve to its owner. Returns what came into the city and what left it.
 */
export function economyDay({ world, population, state, rules, tier: tierOf, turf, base, seed, day, ties, vice }: EconomyDay): Flows {
  const rng = createRng(`${seed}:economy:${day}`);
  // A place's tier asked once (a place's tier never changes).
  let tiers = tierMemo.get(tierOf);
  if (!tiers) tierMemo.set(tierOf, (tiers = { building: new Map(), location: new Map() }));
  const memo = tiers;
  const tier = (spot: Spot): Quality => {
    const known = memo[spot.kind];
    let t = known.get(spot.id);
    if (!t) known.set(spot.id, (t = tierOf(spot)));
    return t;
  };
  const flows: Flows = { in: 0, out: 0, opened: 0 };
  const savings = (state.savings ??= {});
  const arrears = (state.arrears ??= {});
  const street = (state.street ??= {});
  const people = population.people;
  const n = people.length;
  const index = indexOf(population);
  const alive = (p: Person | undefined): p is Person => Boolean(p) && (p as Person).diedOn === undefined;
  const storefronts = world.buildings.filter((b) => b.business);
  const shop = new Map(storefronts.map((b) => [b.id, b]));
  const staffOf = new Map<string, Person[]>();
  for (const p of people) {
    if (!p.job.building || !shop.has(p.job.building) || !alive(p)) continue;
    const staff = staffOf.get(p.job.building);
    if (staff) staff.push(p);
    else staffOf.set(p.job.building, [p]);
  }
  const staffAt = (id: string) => staffOf.get(id) ?? [];
  const owners = ownersOf(world, population, rules, seed);
  const ledger = (p: Person) => ledgerOf(p, world, population, rules, tier, seed, staffAt);
  const anywhere = new Map<string, Building[]>();
  const around = (district: string): Building[] => {
    let list = anywhere.get(district);
    if (!list) anywhere.set(district, (list = shopsIn(world, `${district}:*`)));
    return list;
  };
  const tierAt = (b: Building) => tier({ kind: 'building', id: b.id });
  const bosses = new Map(storefronts.map((b) => [b.id, bossOf(b, population, staffAt(b.id))]));
  const weeklyCost = (b: Building) => staffCostOf(staffAt(b.id), bosses.get(b.id) ?? null, tierAt(b), rules) + rules.rent[tierAt(b)] * 7;
  const holder = (owner: string | null | undefined) => holderOf(owner, (id) => people[index.get(id) ?? -1], ties);
  const payday = weekdayOf(day) === rules.payday;
  const rentDay = weekdayOf(day) === rules.rentDay;
  // What's bought now and then, weighed for each walk of life.
  const goods = Object.entries(rules.goods.kinds) as Array<[BuildingCategory, GoodsKind]>;
  const weighed = new Map<SkillWalk, { weights: number[]; total: number }>();
  const goodsFor = (walk: SkillWalk) => {
    let w = weighed.get(walk);
    if (!w) {
      const weights = goods.map(([, k]) => k.weight * (k.walks?.[walk] ?? 1));
      weighed.set(walk, (w = { weights, total: weights.reduce((x, y) => x + y, 0) }));
    }
    return w;
  };

  // The ledgers and accounts of the people the day touches, by their place in the population (an account in an older save, or a new game, started afresh).
  const books: Array<Ledger | null | undefined> = new Array(n);
  const book = (i: number): Ledger | null => {
    let l = books[i];
    if (l === undefined) {
      const p = people[i];
      books[i] = l = alive(p) ? ledger(p) : null;
    }
    return l;
  };
  const acct = new Float64Array(n);
  const loaded = new Uint8Array(n);
  const touched: number[] = [];
  const bal = (i: number): number => {
    if (!loaded[i]) {
      loaded[i] = 1;
      touched.push(i);
      const p = people[i] as Person;
      let v = savings[p.id];
      if (v === undefined) {
        const l = book(i);
        v = l ? accountOf(p, state, l, rules) : 0;
        flows.opened += v;
      }
      acct[i] = v;
    }
    return acct[i] as number;
  };
  // Money in and out of a person: the cash on them first, then the account.
  const give = (i: number, amount: number) => {
    if (amount > 0) acct[i] = bal(i) + amount;
  };
  const take = (i: number, amount: number): number => {
    const p = people[i] as Person;
    const want = Math.max(0, Math.round(amount));
    const fromCash = Math.min(p.eddies, want);
    if (fromCash > 0) {
      p.eddies -= fromCash;
      state.eddies[p.id] = p.eddies;
    }
    const fromAccount = Math.min(bal(i), want - fromCash);
    acct[i] = (acct[i] as number) - fromAccount;
    return fromCash + fromAccount;
  };
  const money = (i: number) => (people[i] as Person).eddies + bal(i);
  const spare = (i: number) => money(i) - rules.cushion * (book(i) as Ledger).essentials;
  const at = (p: Person) => index.get(p.id) as number;
  // What someone keeps on them: topped up to what they started with, and anything well over that put away.
  const keepOn = (i: number) => {
    const p = people[i] as Person;
    const keep = base.get(p.id) ?? p.eddies;
    if (p.eddies < keep) {
      const out = Math.min(keep - p.eddies, Math.max(0, bal(i)));
      p.eddies += out;
      acct[i] = (acct[i] as number) - out;
    } else if (p.eddies > keep * rules.purse) {
      acct[i] = bal(i) + (p.eddies - keep);
      p.eddies = keep;
    }
    state.eddies[p.id] = p.eddies;
  };
  // Rent a landlord takes: the building's upkeep out of it, spent in its district, and the rest theirs.
  const repairs = new Map<string, Building[]>();
  const collect = (landlord: number, rent: number, district: string) => {
    const upkeep = Math.round(rent * rules.upkeep.share);
    let shops = repairs.get(district);
    if (!shops) repairs.set(district, (shops = rules.upkeep.categories.flatMap((c) => shopsIn(world, `${district}:${c}`))));
    if (shops.length && upkeep > 0) {
      spendAt({ kind: 'building', id: rng.pick(shops).id }, upkeep, district);
      give(landlord, rent - upkeep);
    } else give(landlord, rent);
  };

  // Every till open (in an older save, or a new game, with its float).
  for (const b of storefronts) {
    const till = tillOf(state.tills, b.id);
    if (till.cash === undefined) {
      till.cash = Math.round(rules.float * weeklyCost(b));
      flows.opened += till.cash;
    }
  }

  // What's spent at each storefront today: the player's, trade from outside, and everyone's below.
  const takings = new Map<string, number>();
  const spendAt = (spot: Spot | null, amount: number, district: string) => {
    if (amount <= 0) return;
    if (spot?.kind === 'building' && takings.has(spot.id)) takings.set(spot.id, (takings.get(spot.id) as number) + amount);
    else {
      const where = spot?.kind === 'location' ? (world.locations[spot.id]?.district ?? district) : district;
      street[where] = (street[where] ?? 0) + amount;
    }
  };
  // A storefront with nothing on its shelves sells nothing: its customers go to another of its kind in the district, if one has any.
  const bare = new Set(storefronts.filter((b) => stockOf(state.tills[b.id]) < rules.stock.soldOut).map((b) => b.id));
  const soldOut = (b: Building) => bare.has(b.id);
  const unsold = (shops: Building[]) => (bare.size ? shops.filter((b) => !bare.has(b.id)) : shops);
  const stocked = (spot: Spot | null): Spot | null => {
    if (spot?.kind !== 'building' || !bare.has(spot.id)) return spot;
    const b = shop.get(spot.id);
    if (!b) return spot;
    const others = shopsIn(world, `${b.district}:${b.category}`).filter((o) => !soldOut(o));
    return others.length ? { kind: 'building', id: rng.pick(others).id } : null;
  };
  for (const b of storefronts) {
    const till = tillOf(state.tills, b.id);
    const [lo, hi] = rules.walkIn[tierAt(b)];
    const swing = rng.range(1 - rules.daySwing, 1 + rules.daySwing);
    const outside = soldOut(b) ? 0 : Math.round((lo + usualOf(world, seed, b.id) * (hi - lo)) * (rules.visitors[b.district] ?? 0) * (rules.outsiders[b.category] ?? 1) * swing);
    flows.in += outside + Math.max(0, till.pending);
    flows.out += Math.max(0, -till.pending);
    takings.set(b.id, outside + till.pending);
    till.pending = 0;
  }

  // Payday.
  const members = new Map<string, number[]>();
  if (payday) {
    // A storefront's people, out of its till: all of it when it can, else the same share each; a corp makes up its own places' short.
    for (const b of storefronts) {
      const staff = staffAt(b.id);
      if (!staff.length) continue;
      const till = tillOf(state.tills, b.id);
      const owed = staff.map((p) => (book(at(p)) as Ledger).pay);
      const total = owed.reduce((x, w) => x + w, 0);
      const corp = owners.corp.has(b.business as string);
      if (corp && (till.cash as number) < total) {
        flows.in += total - (till.cash as number);
        till.cash = total;
      }
      // Short, the workers are paid first, the same share each, and the boss takes what's left.
      const boss = bosses.get(b.id);
      const hands = staff.reduce((x, p, i) => x + (p === boss ? 0 : (owed[i] as number)), 0);
      const share = hands > 0 ? Math.min(1, Math.max(0, till.cash as number) / hands) : 1;
      let paid = 0;
      staff.forEach((p, i) => {
        if (p === boss) return;
        const wage = Math.floor((owed[i] as number) * share);
        give(at(p), wage);
        paid += wage;
      });
      const bossAt = boss ? staff.indexOf(boss) : -1;
      if (boss && bossAt >= 0) {
        const wage = Math.max(0, Math.min(owed[bossAt] as number, Math.floor((till.cash as number) - paid)));
        give(at(boss), wage);
        paid += wage;
      }
      till.cash = (till.cash as number) - paid;
      if (paid < total) till.short = total - paid;
      else delete till.short;
    }
    const working: number[] = [];
    for (let i = 0; i < n; i++) {
      const l = book(i);
      if (!l) continue;
      if (l.earner === 'payroll' || l.earner === 'pension') {
        give(i, l.pay);
        flows.in += l.pay;
      } else if (l.earner === 'gig') {
        const week = Math.round(l.pay * rng.range(1 - rules.swing, 1 + rules.swing));
        give(i, week);
        flows.in += week;
      } else if (l.earner === 'street') working.push(i);
      else if (l.earner === 'gang') {
        const gang = (people[i] as Person).gang as string;
        const list = members.get(gang);
        if (list) list.push(i);
        else members.set(gang, [i]);
      }
    }
    // The street's trade, shared among everyone who works a street (they go where the trade is).
    if (working.length) {
      const pool = Object.values(street).reduce((x, v) => x + v, 0);
      const each = Math.floor(pool / working.length);
      for (const i of working) give(i, each);
      let left = pool - each * working.length;
      for (const district of Object.keys(street)) {
        street[district] = Math.min(left, street[district] as number);
        left -= street[district] as number;
      }
    }
    // A gang's chest among its members, while it lasts.
    for (const [gang, list] of members) {
      const chest = state.treasuries[gang] ?? 0;
      const total = list.length * rules.gang;
      const each = Math.floor(rules.gang * (total > 0 ? Math.min(1, chest / total) : 0));
      for (const i of list) give(i, each);
      state.treasuries[gang] = chest - each * list.length;
    }
    // Whoever can't make the week has a hand from family with money to spare.
    for (let i = 0; i < n; i++) {
      const l = book(i);
      if (!l || money(i) >= l.essentials) continue;
      for (const t of ties((people[i] as Person).id)) {
        const k = index.get(t.to);
        if (k === undefined || !KIN.has(t.kind) || !book(k)) continue;
        // Out of their account, not their pocket.
        const help = Math.min(Math.round(rules.family * l.essentials) - money(i), Math.floor(spare(k) / 2), Math.floor(bal(k)));
        if (help <= 0) continue;
        acct[k] = (acct[k] as number) - help;
        give(i, help);
        if (money(i) >= l.essentials) break;
      }
    }
  }

  // The laid up: a bed at the hospital, which feeds them too.
  for (const id of Object.keys(state.hurt)) {
    const i = index.get(id);
    if (i === undefined || (state.hurt[id] as number) < day || !book(i)) continue;
    const p = people[i] as Person;
    const ward = hospitalOf(p, world);
    const fee = ward ? take(i, rules.ward[tier(ward)]) : 0;
    if (ward?.kind === 'building' && takings.has(ward.id)) spendAt(ward, fee, p.district);
    else flows.out += fee;
    keepOn(i);
  }

  // A seventh of the people do their week today, each on a day of their own: the week's food,
  // at the counter near home and lunch near work; evenings out with the money over the cushion
  // for them; something bought now and then; a habit fed; the rent, and what's still owed of it,
  // to the landlord (or the corp, out of the city), and what they can't pay owed.
  const week = weekdayOf(day);
  for (let i = week; i < n; i += 7) {
    const l = book(i);
    if (!l) continue;
    const p = people[i] as Person;
    if ((state.hurt[p.id] ?? -1) < day) {
      const food = take(i, rules.food[l.means] * 7);
      const lunch = l.lunch ? Math.round(food * rules.lunch) : 0;
      spendAt(stocked(l.lunch), lunch, p.district);
      spendAt(stocked(l.grocer), food - lunch, p.district);
      const hangout = p.likes.hangout;
      const nights = hangout ? timesIn(7, rules.outing[0] + p.traits.chatty * (rules.outing[1] - rules.outing[0]), rng.next()) : 0;
      const out = hangout && nights ? stocked(hangout) : null;
      for (let night = 0; out && night < nights; night++) {
        const cost = rules.spend[tier(out)];
        if (spare(i) >= cost * rules.stayIn) spendAt(out, take(i, cost), p.district);
      }
      const buys = timesIn(7, rules.goods.chance, rng.next());
      for (let d = 0; d < buys; d++) {
        if (spare(i) <= 0) break;
        const { weights, total } = goodsFor(l.walk);
        let left = rng.next() * total;
        const pick = goods.find((_, k) => (left -= weights[k] as number) < 0) ?? goods[goods.length - 1];
        const shops = pick ? unsold(shopsIn(world, `${p.district}:${pick[0]}`)) : [];
        if (!pick || !shops.length) continue;
        // What they can't half afford, they don't buy.
        const b = rng.pick(shops);
        const price = pick[1].spend[tierAt(b)];
        const amount = Math.min(price, spare(i) * rules.goods.most);
        if (amount >= price / 2) spendAt({ kind: 'building', id: b.id }, take(i, amount), p.district);
      }
      // What's well over the cushion goes, a little at a time, on everything else.
      const over = spare(i);
      if (over > 0 && rules.splurge > 0) {
        const shops = around(p.district);
        const at = shops.length ? stocked({ kind: 'building', id: rng.pick(shops).id }) : null;
        if (at) spendAt(at, take(i, Math.floor(over * (1 - (1 - rules.splurge) ** 7))), p.district);
      }
    }
    const habit = vice?.(p);
    if (habit && habit.perDay > 0) state.treasuries[habit.gang] = (state.treasuries[habit.gang] ?? 0) + take(i, habit.perDay * 7);
    const to = l.landlord !== undefined && l.rent > 0 ? holder(l.landlord) : undefined;
    if (to !== undefined && to !== p.id) {
      const due = l.rent + (arrears[p.id] ?? 0);
      const paid = take(i, due);
      const landlord = to ? index.get(to) : undefined;
      if (landlord !== undefined && book(landlord)) collect(landlord, paid, p.district);
      else flows.out += paid;
      if (paid < due) arrears[p.id] = due - paid;
      else delete arrears[p.id];
    }
    keepOn(i);
  }

  // Rent on rent day, out of each storefront's till as far as it goes, to whoever owns the building (nothing when it's its boss's).
  if (rentDay) {
    for (const b of storefronts) {
      const owner = holder(owners.of.get(b.id));
      if (owner && owner === bosses.get(b.id)?.id) continue;
      const till = tillOf(state.tills, b.id);
      const rent = Math.max(0, Math.min(rules.rent[tierAt(b)] * 7, till.cash as number));
      till.cash = (till.cash as number) - rent;
      const landlord = owner ? index.get(owner) : undefined;
      if (landlord !== undefined && book(landlord)) collect(landlord, rent, b.district);
      else flows.out += rent;
    }
  }

  // The supply shocks on today.
  const market = (state.market ??= { shocks: [], short: [], news: [] });
  market.shocks = market.shocks.filter((s) => s.until >= day);
  const shocked = new Set(market.shocks.map((s) => `${s.district}:${s.category}`));

  // The books.
  for (const b of storefronts) {
    const t = tierAt(b);
    const staff = staffAt(b.id);
    const took = takings.get(b.id) ?? 0;
    const till = tillOf(state.tills, b.id);
    // What it sold off its shelves (fewer things for the money when it's dear), and what its suppliers, outside the city, sold it back.
    const share = rules.supplies[b.category] ?? rules.supplies.default;
    const shelves = Math.max(1, rules.stock.weeks * weeklyCost(b));
    const stock = stockOf(till);
    // Dear, the money buys fewer things; a slow place's price cut is for the player's haggling, since nobody else here buys more for it.
    const factor = Math.max(1, priceFactor(stock, 'steady', rules));
    const left = Math.max(0, stock - Math.max(0, took) / (shelves * factor));
    const cut = shocked.has(`${b.district}:${b.category}`) ? rules.stock.shock.cut : 1;
    const want = Math.round((1 - left) * shelves * share * cut);
    const supplies = Math.max(0, Math.min(want, Math.floor(Math.max(0, (till.cash as number) + took) * rules.stock.restock)));
    flows.out += supplies;
    till.stock = Math.min(1, left + (share > 0 ? supplies / (shelves * share) : 1 - left));
    delete till.bought;
    const gangs = turf(b.district);
    let protection = 0;
    for (const [gang, part] of gangs) {
      const theirs = Math.max(0, Math.round(took * rules.protection * part));
      state.treasuries[gang] = (state.treasuries[gang] ?? 0) + theirs;
      protection += theirs;
    }
    till.cash = (till.cash as number) + took - supplies - protection;
    // Paid out, what's over its reserve goes to its owner: the boss, or a corp out of the city.
    if (payday) {
      const over = Math.floor((till.cash as number) - rules.reserve * weeklyCost(b));
      if (over > 0) {
        const boss = bosses.get(b.id);
        till.cash = (till.cash as number) - over;
        if (!owners.corp.has(b.business as string) && boss) give(at(boss), over);
        else flows.out += over;
      }
    }
    const net = took - supplies - protection - rules.rent[t] - staffCostOf(staff, bosses.get(b.id) ?? null, t, rules) / 7;
    till.days.push(Math.round(net) || 0);
    if (till.days.length > 7) till.days.splice(0, till.days.length - 7);
  }
  // Paid out, a chest keeps a few weeks of its members' wages in hand and spends the rest (all of it, with nobody left to pay).
  if (payday) {
    for (const gang of Object.keys(state.treasuries)) {
      const keep = (members.get(gang)?.length ?? 0) * rules.gang * rules.chestWeeks;
      const chest = state.treasuries[gang] ?? 0;
      if (chest > keep) {
        flows.out += chest - keep;
        state.treasuries[gang] = keep;
      }
    }
  }
  // The market: a new shock now and then, and the kinds of store gone short across a district, or back.
  const headline = (district: string, category: BuildingCategory, kind: MarketNews['kind']) => {
    market.news.push({ day, district, category, kind });
    if (market.news.length > rules.market.keep) market.news.splice(0, market.news.length - rules.market.keep);
  };
  const { shock } = rules.stock;
  const kinds = Object.entries(shock.weights) as Array<[BuildingCategory, number]>;
  const weight = kinds.reduce((n, [, w]) => n + w, 0);
  for (const district of Object.keys(world.districts)) {
    if (!kinds.length || !rng.chance(shock.chance)) continue;
    let roll = rng.next() * weight;
    const category = (kinds.find(([, w]) => (roll -= w) < 0) ?? kinds[kinds.length - 1])?.[0] as BuildingCategory;
    const key = `${district}:${category}`;
    if (shocked.has(key) || !shopsIn(world, key).length) continue;
    market.shocks.push({ district, category, until: day + rng.int(shock.days[0], shock.days[1]) });
    headline(district, category, 'shock');
  }
  const levels = new Map<string, { sum: number; n: number }>();
  for (const b of storefronts) {
    const key = `${b.district}:${b.category}`;
    const level = levels.get(key) ?? { sum: 0, n: 0 };
    level.sum += stockOf(state.tills[b.id]);
    level.n++;
    levels.set(key, level);
  }
  const short = new Set(market.short);
  for (const [key, { sum, n }] of levels) {
    const level = sum / n;
    const [district, category] = key.split(':') as [string, BuildingCategory];
    if (!short.has(key) && level < rules.market.short) {
      short.add(key);
      headline(district, category, 'short');
    } else if (short.has(key) && level > rules.market.back) {
      short.delete(key);
      headline(district, category, 'back');
    }
  }
  market.short = [...short];

  // The accounts the day touched, written back.
  for (const i of touched) savings[(people[i] as Person).id] = acct[i] as number;
  return flows;
}

/** How a storefront is doing, and the line that says so inside. */
export function tradeAt(building: Building, population: Population, tills: Record<string, Till>, tier: Quality, rules: EconomyRules): { health: Health; line: string } {
  const staff = population.people.filter((p) => p.job.building === building.id && p.diedOn === undefined);
  const health = healthOf(tills[building.id], staffCostOf(staff, bossOf(building, population), tier, rules) + rules.rent[tier] * 7, rules);
  return { health, line: rules.trade[health] };
}
