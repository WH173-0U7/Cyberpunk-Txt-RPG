import { blockAt, canEnter } from './buildings';
import { energyStatus, freshEnergy, spendEnergy, type EnergyRules, type EnergyState, type EnergyStatus } from './energy';
import { EventBus } from './events';
import { changeRoom, loadOf, loads, newChipId, newPocketId, placeFor, totalGrams, walletRoom, type GearContent, type PocketLoad, type PocketState } from './carry';
import { tillOf, tradeAt, turfFrom, type Health } from './economy';
import { cash, changeCoins as coinsToBills, chipCut, deposit as toAccount, freshMoney, payCash, splitLoot, takeCash, withdraw as fromAccount, type Money, type MoneyRules } from './money';
import { drawQuality, menuFor, priceFor, type FoodContent, type Menu, type MenuItem, type Quality, type Venue } from './food';
import { answer, compose, deflect, describeStranger, eloquenceOf, FAMILY, fill, finish, historyOf, kinWord, line, moodOf, openness, openTopics, repeat, replyTo, smallTalk, textOf, varsFor, voiceOf, type DialogueLines, type Line, type Question, type Speaker, type Topic } from './dialogue';
import { drink, freshInebriation, inebriationStatus, type InebriationRules, type InebriationStage, type InebriationState, type InebriationStatus } from './inebriation';
import { bossAt, bossOf, canPromote, ladderFor, nextRung, rungOf, shiftOpen, shiftPay, type JobRules, type JobState, type JobStatus, type Rung } from './jobs';
import { applyLife, freshLife, liveUntil, newsFor, scenesAt, type LifeRules, type LifeState, type Scene } from './life';
import { daysSince, forgetMemories, GRIEVANCES, memoriesOf, memoryOf, recall, recalled, remember, type Memory } from './memory';
import { generatePeople, isNetrunner, localClock, peopleAt, personById, pronounsOf, tiesOf, type Clock, type PeopleContent, type Person, type Population, type Spot, type Tie, type TieKind } from './people';
import { createRng } from './rng';
import { freshSkill, gainXp, skillStatus, type SkillRules, type SkillState, type SkillStatus } from './skills';
import {
  applyIncident,
  attitude,
  changeRep,
  changeStanding,
  dueThreats,
  freshSociety,
  knowledgeOf,
  knownPeople,
  knowsOf,
  learnFact,
  learnLink,
  learnOf,
  linkOf,
  logLine,
  passGoodWord,
  pinIncident,
  relearnLink,
  repOf,
  settleThreat,
  standingOf,
  stanceOf,
  webOf,
  type Fact,
  type IncidentKind,
  type IncidentLinks,
  type Knowledge,
  type KnownHow,
  type LogEntry,
  type SocietyRules,
  type SocietyState,
  type Stance,
  type Standing,
  unpinnedIncidents,
} from './society';
import { districtAt } from './geography';
import type { Progress } from './save';
import { pointAlong, snapToStreet } from './streets';
import { planTrip, startTrip, tripProgress, walkedSoFar, type TravelRules } from './travel';
import type {
  AmbientLine,
  Building,
  District,
  GameEvents,
  Item,
  Location,
  MapState,
  Point,
  Station,
  Tone,
  TravelMode,
  Trip,
  TripPlan,
  Wallet,
  Whereabouts,
  World,
} from './types';

/** The fog lifts in square cells this many map units across (a couple of building widths). */
export const CELL = 2;
export const CELLS = Math.ceil(100 / CELL);
/**
 * Walking lifts the fog this far either side of the player, in map units: the street and the
 * block along it. Blocks run up to 9.5 across, so the deepest fog cell sits 5 from a street;
 * this reaches it with the walk's 1.5-unit stride to spare, and nothing stays under the fog
 * for good.
 */
const SIGHT = 5.5;
const DAY = 86_400_000;

/** The fog cell a map point falls in. */
export function cellOf(p: Point): number {
  const cx = Math.min(CELLS - 1, Math.max(0, Math.floor(p.x / CELL)));
  const cy = Math.min(CELLS - 1, Math.max(0, Math.floor(p.y / CELL)));
  return cy * CELLS + cx;
}

export function cellCenter(cell: number): Point {
  return { x: ((cell % CELLS) + 0.5) * CELL, y: (Math.floor(cell / CELLS) + 0.5) * CELL };
}

/** Standing at a map point with nothing in particular there. */
export function streetSpot(p: Point): Whereabouts {
  return { x: p.x, y: p.y, place: null, station: null, building: null };
}

/** How the game plays: getting around, energy, what there is to eat and drink, who lives here and how they take things. The numbers are in `src/data/`. */
export interface GameRules extends TravelRules {
  energy: EnergyRules;
  food: FoodContent;
  inebriation: InebriationRules;
  people: PeopleContent;
  society: SocietyRules;
  lines: DialogueLines;
  charisma: SkillRules;
  /** What things weigh and what they're carried in. */
  gear: GearContent;
  /** How eddies change hands: cash, change, transfers, the bank's cut. */
  money: MoneyRules;
  /** Where the player can work, and how far up. */
  jobs: JobRules;
  /** The people's own days: what happens between them, and what they're seen doing together. */
  life: LifeRules;
  /** The time of day people's days run on. The phone's local time if not said (tests say). */
  clock?: (now: number) => Clock;
}

/** Someone where the player is, how they feel about the player, and who they're with. */
export interface Presence {
  person: Person;
  doing: string;
  stance: Stance;
  /** Who they're with here and what the two are at, if anyone. */
  scene: Scene | null;
}

/** A mask the player has on: the garment's kind, the word for it ("gas mask"), and its name. */
export interface Mask {
  kind: string;
  word: string;
  name: string;
}

/** What the player stands with a person, all told, and what they know of them. */
export interface PersonStanding {
  stance: Stance;
  attitude: number;
  standing: Standing;
  knowledge: Knowledge;
  /** Who the player knows this person to be connected to, and how if they know that. */
  web: Array<{ person: Person; kind: Tie['kind'] | null; how: KnownHow }>;
}

export interface Reputation {
  key: string;
  label: string;
  value: number;
}

/** A person as the player can tell them: by name once introduced, else by their look; and what's known of them. */
export interface Description {
  name: string;
  named: boolean;
  /** Each fact the player knows, as a line. */
  facts: Partial<Record<Fact, string>>;
  /** The same, in order, for reading out. */
  lines: string[];
}

const HOUR = 3_600_000;

/**
 * The game rules and state. It never touches the DOM: everything the player
 * sees or feels is driven by the events it emits. Time comes in as `now`
 * (ms since 1970) from the phone's clock, so trips run in real time.
 */
export class Game {
  readonly events = new EventBus<GameEvents>();
  private where: Whereabouts;
  private trip: Trip | null;
  /** The building the player has gone into, if any. They're inside it, standing at its door on the map. */
  private inside: Building | null = null;
  private readonly visited = new Set<string>();
  private readonly discovered = new Set<string>();
  private readonly explored = new Set<number>();
  /** What the player carries: food and drink from eateries, so far. Each thing is in a pocket. */
  private readonly items: Item[];
  /** The pockets to carry things in: the clothes' own, the wallet, and any bag bought. */
  private readonly pockets: PocketState[];
  /** Cash in bills and coins, and the account. */
  private money: Money;
  private passUntil: number;
  private energyState: EnergyState;
  private drunkState: InebriationState;
  /** The stage the player was last told about, so sobering up gets a line as it eases. */
  private drunkStage: InebriationStage | null = null;
  /** Everyone who lives here, made up for this city. */
  readonly population: Population;
  private society: SocietyState;
  private charismaState: SkillState;
  /** The player's job, if they have one. */
  private job: JobState | null;
  /** The people's own days so far, and what everyone started with in eddies, for earning it back. */
  private life: LifeState;
  private readonly baseEddies: ReadonlyMap<string, number>;
  /** Where the player lives. Nowhere yet: once there are homes, one with a bed raises the most energy. */
  private readonly home: { building: string; bed: boolean } | null = null;
  private lastAmbient: AmbientLine | null = null;
  /** The scene (where, when, which mask) last looked over for someone who knows the mask; see `recognize`. */
  private noticed = '';
  private fullyMapped = false;
  private readonly resumed: boolean;

  /** A new game at the city's start, or, given saved progress, right where the player left off. */
  constructor(
    readonly world: World,
    readonly rules: GameRules,
    progress?: Progress,
  ) {
    const start = this.locationById(world.start);
    this.where = progress ? { ...progress.where } : { ...streetSpot(start), place: start.id };
    this.trip = progress?.trip ?? null;
    // Saves from before cash was bills and coins had one number: it was bills.
    this.money = progress?.money ? { ...progress.money } : freshMoney(progress?.eddies ?? rules.startingEddies);
    this.passUntil = progress?.passUntil ?? 0;
    this.energyState = progress?.energy ? { ...progress.energy } : freshEnergy(rules.energy);
    this.drunkState = progress?.inebriation ? { ...progress.inebriation } : freshInebriation();
    this.population = generatePeople(world, rules.people, rules.food.dishes);
    this.baseEddies = new Map(this.population.people.map((p) => [p.id, p.eddies]));
    // The days the people have had since the city was made are put back onto them.
    this.life = progress?.life ? { ...freshLife(), ...structuredClone(progress.life) } : freshLife();
    applyLife(this.population, this.life);
    this.society = progress?.society ? { ...freshSociety(), ...structuredClone(progress.society) } : freshSociety();
    this.charismaState = progress?.charisma ? { ...progress.charisma } : freshSkill();
    // A job at a place this city doesn't have, or that doesn't hire anymore, is no job.
    const workplace = progress?.job ? world.buildings.find((b) => b.id === progress.job?.building) : undefined;
    this.job = progress?.job && workplace && ladderFor(workplace, rules.jobs) ? { ...progress.job } : null;
    // People this city doesn't have (the generator changed) are forgotten.
    const known = new Set(this.population.people.map((p) => p.id));
    for (const id of Object.keys(this.society.standings)) if (!known.has(id)) delete this.society.standings[id];
    for (const id of Object.keys(this.society.known)) if (!known.has(id)) delete this.society.known[id];
    for (const key of Object.keys(this.society.links)) if (!key.split('|').every((id) => known.has(id))) delete this.society.links[key];
    this.society.threats = this.society.threats.filter((t) => !t.by || known.has(t.by));
    forgetMemories(this.society, known);
    // Pockets of kinds the game no longer has are gone, and with none left the player wears the usual; anything not in a pocket is put away.
    const pockets = (progress?.gear ?? []).filter((p) => p.kind in rules.gear.kinds).map((p) => ({ ...p }));
    this.pockets = pockets.length ? pockets : rules.gear.start.map((p) => ({ ...p }));
    // A save from before the player was dressed, or missing a slot, wears the usual wherever it has nothing on.
    for (const start of rules.gear.start) {
      const kind = rules.gear.kinds[start.kind];
      if (!kind?.slot || this.pockets.some((p) => p.in === null && rules.gear.kinds[p.kind]?.slot === kind.slot)) continue;
      this.pockets.push({ ...start, id: this.pockets.some((p) => p.id === start.id) ? newPocketId(start.kind, this.pockets) : start.id });
    }
    this.items = (progress?.items ?? []).map((item) => ({ ...item }));
    this.stow();
    this.resumed = Boolean(progress);
    const indoors = progress?.inside ? world.buildings.find((b) => b.id === progress.inside) : undefined;
    if (indoors && !this.trip && this.where.building === indoors.id && canEnter(indoors)) this.inside = indoors;
    if (progress) {
      for (const id of progress.visited) this.visit(this.locationById(id));
      for (const id of progress.discovered) this.discovered.add(this.locationById(id).id);
      for (const cell of progress.explored) this.explored.add(cell);
    }
    this.fullyMapped = this.visited.size === Object.keys(world.locations).length;
  }

  /** Where the player is, or set off from while on the move. */
  get whereabouts(): Whereabouts {
    return { ...this.where };
  }

  /** The place the player is standing in, if any (none while on the move). */
  get location(): Location | null {
    return this.trip || !this.where.place ? null : (this.world.locations[this.where.place] ?? null);
  }

  get currentTrip(): Trip | null {
    return this.trip;
  }

  /** The building the player is inside, if any. */
  get interior(): Building | null {
    return this.inside;
  }

  /** The building the player is standing outside, if it has an inside they could go into. */
  get door(): Building | null {
    if (this.trip || this.inside || !this.where.building) return null;
    const building = this.world.buildings.find((b) => b.id === this.where.building);
    return building && canEnter(building) ? building : null;
  }

  get wallet(): Wallet {
    const { bills, coins, account } = this.money;
    return { eddies: cash(this.money), bills, coins, account, chips: this.chipTotal(), passUntil: this.passUntil };
  }

  /** The credchips carried: all of them, the clean ones (in the player's name), or the locked ones (somebody else's still). */
  private chips(which: 'all' | 'clean' | 'locked' = 'all'): Item[] {
    return this.items.filter((i) => i.kind === 'credchip' && (which === 'all' || Boolean(i.locked) === (which === 'locked')));
  }

  /** Eddies on the clean chips. */
  private chipTotal(): number {
    return this.chips('clean').reduce((sum, c) => sum + (c.balance ?? 0), 0);
  }

  /** The clean chip to pay a price with: the one with the least on it that covers it. */
  private chipFor(price: number): Item | undefined {
    return this.chips('clean')
      .filter((c) => (c.balance ?? 0) >= price)
      .sort((a, b) => (a.balance ?? 0) - (b.balance ?? 0))[0];
  }

  /** A netrunner's cut for chopping a chip with `balance` on it. */
  chopCut(balance: number): number {
    return chipCut(balance, this.rules.money);
  }

  /** Cash and the account, for saving. */
  get moneySaved(): Money {
    return { ...this.money };
  }

  /** Whether the player can pay a price: in cash, or by transfer where the counter takes one. */
  private canPay(price: number, transfers: boolean): boolean {
    return cash(this.money) >= price || (transfers && (this.money.account >= price || Boolean(this.chipFor(price))));
  }

  /** Why the player can't pay a price, by what the counter takes. */
  private shortBy(what: string, price: number, transfers: boolean): string {
    const parts = [`${cash(this.money)} €$ in cash`];
    if (transfers) parts.push(`${this.money.account} €$ in the bank`);
    if (transfers && this.chipTotal()) parts.push(`${this.chipTotal()} €$ on chips`);
    const have = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
    return `${what} is ${price} €$. You've got ${have}.`;
  }

  /**
   * Pays a price: by transfer from the account where the counter takes one and the account
   * covers it (the holo's way), else in cash, coins first, the change back in coins as far
   * as there's room for it, the counter keeping the rest. False if it can't be paid.
   */
  private pay(price: number, transfers: boolean): boolean {
    if (transfers) {
      // A chip in your name first (a chip can be lost; the account can't), then the account.
      const chip = this.chipFor(price);
      if (chip) {
        chip.balance = (chip.balance ?? 0) - price;
        if (!chip.balance) {
          this.items.splice(this.items.indexOf(chip), 1);
          this.say('That empties the chip; you toss it.', 'system');
        }
        this.events.emit('inventoryChanged', this.inventory);
        return true;
      }
      if (this.money.account >= price) {
        this.money = { ...this.money, account: this.money.account - price };
        return true;
      }
    }
    const room = changeRoom(this.pockets, this.items, this.money, this.rules.gear, this.rules.food.dishes);
    const paid = payCash(this.money, price, this.rules.money, room);
    if (!paid) return false;
    this.money = paid.money;
    if (paid.kept) this.say(`No room for the change: ${paid.kept} €$ stays on the counter.`, 'system');
    return true;
  }

  /** Whether a counter takes a transfer from the account: chains, luxury places, racks of gear. */
  private takesTransfers(menu: Menu): boolean {
    const { transfers } = this.rules.money;
    return (menu.kind === 'gear' && transfers.gear) || (menu.venue.chain && transfers.chain) || (menu.venue.quality === 'luxury' && transfers.luxury);
  }

  /** The player's energy at `now`: refilled on the clock since it was last spent. */
  energy(now: number): EnergyStatus {
    return energyStatus(this.energyState, this.rules.energy, this.rules.timeScale, this.hasBed, now);
  }

  /** Energy as it was last written down, for saving. */
  get energySaved(): EnergyState {
    return { ...this.energyState };
  }

  /**
   * Spends energy on doing something, which also trains it. False if there isn't enough.
   * Nothing spends it yet: jobs, training and the rest will.
   */
  spendEnergy(amount: number, now: number): boolean {
    const spent = spendEnergy(this.energyState, amount, this.rules.energy, this.rules.timeScale, this.hasBed, now);
    if (!spent) {
      this.say(`Not enough energy: that takes ${amount}, you've got ${this.energy(now).current}.`, 'error');
      return false;
    }
    this.energyState = spent.state;
    const status = this.energy(now);
    if (spent.levels > 0) this.say(`Energy level ${status.level}. You can hold ${status.max} energy now.`, 'system');
    this.events.emit('energyChanged', status);
    return true;
  }

  private get hasBed(): boolean {
    return this.home?.bed ?? false;
  }

  /** How drunk the player is at `now`: what's left of their drinks, clearing on the clock. */
  inebriation(now: number): InebriationStatus {
    return inebriationStatus(this.drunkState, this.rules.inebriation, this.rules.timeScale, now);
  }

  /** The drink in the player as it was last written down, for saving. */
  get inebriationSaved(): InebriationState {
    return { ...this.drunkState };
  }

  /** Everything the player carries, as copies the UI can't change the game through. */
  get inventory(): Item[] {
    return this.items.map((item) => ({ ...item }));
  }

  /** The pockets the player has, for saving. */
  get gearSaved(): PocketState[] {
    return this.pockets.map((p) => ({ ...p }));
  }

  /** Every pocket and what it holds, worked out, and the weight of all of it. */
  carry(): { grams: number; pockets: PocketLoad[] } {
    const { gear, food } = this.rules;
    return { grams: totalGrams(this.pockets, this.items, this.money, gear, food.dishes), pockets: loads(this.pockets, this.items, this.money, gear, food.dishes) };
  }

  /** The pocket with room for one of something, if any. */
  private pocketFor(item: Pick<Item, 'id' | 'kind'>): string | null {
    return placeFor(this.pockets, this.items, this.money, item, 1, this.rules.gear, this.rules.food.dishes);
  }

  /**
   * Puts a stack into a pocket: onto the stack of the same thing already there, if there is
   * one (a pocket holds one stack of a thing, and that's how its room was counted), else as
   * its own. Nothing to put it in leaves it where it was.
   */
  private putAway(items: Item[], item: Item, home: string | undefined): void {
    if (!home) return;
    const stack = items.find((i) => i !== item && i.id === item.id && i.kind === item.kind && i.in === home);
    if (stack) {
      stack.count += item.count;
      items.splice(items.indexOf(item), 1);
    } else item.in = home;
  }

  /** Puts away anything not in a pocket the player has: where it fits, or, failing that, the first pocket, overfull. */
  private stow(): void {
    const ids = new Set(this.pockets.map((p) => p.id));
    const fallback = this.pockets.find((p) => p.in === null && !this.rules.gear.kinds[p.kind]?.holds) ?? this.pockets[0];
    for (const item of [...this.items]) {
      if (item.in && ids.has(item.in)) continue;
      const others = this.items.filter((i) => i !== item);
      this.putAway(this.items, item, placeFor(this.pockets, others, this.money, item, item.count, this.rules.gear, this.rules.food.dishes) ?? fallback?.id);
    }
  }

  /** What's for sale where the player is: an eatery's menu, a store's rack of bags, or nothing. */
  menu(): Menu | null {
    const at = this.inside ?? this.location;
    if (!at) return null;
    return menuFor(this.world, at, this.rules.food) ?? (this.inside ? this.rack(this.inside) : null);
  }

  /** A store's rack of bags and belts, priced by how good a store it is. */
  private rack(building: Building): Menu | null {
    const { gear, food } = this.rules;
    const key = building.business && gear.racks[building.business] ? building.business : null;
    const ids = key ? gear.racks[key] : undefined;
    if (!key || !ids?.length) return null;
    // A clothing store sells at its tier; a store with only bags on the rack prices them the way its district eats.
    const quality = gear.quality[key] ?? drawQuality(this.world, building);
    const venue: Venue = { id: building.id, name: building.name, district: building.district, kindLabel: building.kindLabel, quality, chain: false };
    const items = ids.flatMap((id): MenuItem[] => {
      const kind = gear.kinds[id];
      if (!kind?.price) return [];
      // A garment is priced for what it is (its tier is in it); a bag by the store.
      if (kind.slot) {
        const detail = [gear.slotLabels[kind.slot], kind.style ? gear.styleLabels[kind.style] : '', kind.brand ?? ''].filter(Boolean).join(' · ');
        return [{ id, name: kind.name, note: kind.note ?? '', kind: 'clothing' as const, price: kind.price, detail }];
      }
      return [{ id, name: kind.name, note: kind.note ?? '', kind: 'gear' as const, price: priceFor(kind.price, quality, food) }];
    });
    return { venue, items, kind: 'gear' };
  }

  /** Whether the player can pay for something on the menu here: in cash, or by transfer where the counter takes one. */
  affords(id: string): boolean {
    const menu = this.menu();
    const item = menu?.items.find((i) => i.id === id);
    return Boolean(menu && item && this.canPay(item.price, this.takesTransfers(menu)));
  }

  /** Whether the player can pay the NCART this much: in cash, or by transfer. */
  affordsFare(amount: number): boolean {
    return this.canPay(amount, this.rules.money.transfers.ncart);
  }

  /** What buying something off a menu puts in a pocket: a dish, or a garment to wear later. */
  private protoFor(item: MenuItem): Pick<Item, 'id' | 'kind' | 'gear'> {
    return item.kind === 'clothing' ? { id: item.id, kind: 'clothing', gear: item.id } : { id: item.id, kind: 'consumable' };
  }

  /** Why the player can't buy something here, or null if they can: it isn't for sale, they're barred, short of eddies, or out of room. */
  canBuy(id: string, now = Date.now()): string | null {
    const menu = this.menu();
    const item = menu?.items.find((i) => i.id === id);
    if (!menu || !item) return 'Not for sale here.';
    const barred = this.barred(now);
    if (barred) return barred;
    if (!this.canPay(item.price, this.takesTransfers(menu))) return this.shortBy(item.name, item.price, this.takesTransfers(menu));
    if (item.kind !== 'gear' && !this.pocketFor(this.protoFor(item))) return `No room for ${item.name}: your pockets are full. Eat something, or drop something.`;
    return null;
  }

  /** Buys something off the menu here: a dish into a pocket with room, or a bag to wear. False, and why, if it can't be. */
  buy(id: string, now = Date.now()): boolean {
    const menu = this.menu();
    const item = menu?.items.find((i) => i.id === id);
    if (!menu || !item) return false;
    const why = this.canBuy(id, now);
    if (why) {
      this.say(why, 'error');
      return false;
    }
    this.pay(item.price, this.takesTransfers(menu));
    // Spent at a storefront, it's in the till when the day is lived.
    if (this.inside?.business && menu.venue.id === this.inside.id) tillOf(this.life.tills, this.inside.id).pending += item.price;
    if (item.kind === 'gear') {
      this.pockets.push({ id: newPocketId(item.id, this.pockets), kind: item.id, in: null });
      this.say(`Bought a ${item.name.toLowerCase()} for ${item.price} €$. More room.`, 'system');
    } else {
      const proto = this.protoFor(item);
      const pocket = this.pocketFor(proto) ?? undefined;
      const owned = this.items.find((i) => i.id === item.id && i.kind === proto.kind && i.in === pocket);
      if (owned) owned.count++;
      else this.items.push({ id: item.id, kind: proto.kind, name: item.name, count: 1, in: pocket, ...(proto.gear ? { gear: proto.gear } : {}) });
      this.say(`Bought ${item.name} for ${item.price} €$.${proto.gear ? ' Put it on from the inventory.' : ''}`, 'system');
    }
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /**
   * Puts on a garment carried in a pocket. What was worn in that slot comes off and goes in a
   * pocket with room (or stays where you stand, if there is none); whatever was in its
   * pockets, the wallet included, moves to pockets with room first, or the swap is off.
   */
  wear(itemId: string, now = Date.now()): boolean {
    const { gear, food } = this.rules;
    const item = this.items.find((i) => i.id === itemId && i.kind === 'clothing');
    const kind = item?.gear ? gear.kinds[item.gear] : undefined;
    if (!item?.gear || !kind?.slot) return false;
    const current = this.pockets.find((p) => p.in === null && gear.kinds[p.kind]?.slot === kind.slot);
    const currentKind = current ? gear.kinds[current.kind] : undefined;
    const fresh: PocketState = { id: newPocketId(item.gear, this.pockets), kind: item.gear, in: null };
    // Everything is tried on copies first: nothing changes unless all of it fits.
    const pockets = [...this.pockets.filter((p) => p !== current).map((p) => ({ ...p })), fresh];
    const items = this.items.map((i) => ({ ...i }));
    const taken = items.find((i) => i.id === item.id && i.in === item.in);
    if (taken) {
      taken.count--;
      if (taken.count <= 0) items.splice(items.indexOf(taken), 1);
    }
    const moving = current ? items.filter((i) => i.in === current.id) : [];
    const inner = current ? pockets.filter((p) => p.in === current.id) : [];
    for (const i of moving) delete i.in;
    // The pockets inside it (the wallet) need a slot somewhere worn, the new garment first.
    for (const p of inner) {
      p.in = null;
      const home = [fresh, ...pockets].find((q) => q !== p && q.in === null && (gear.kinds[q.kind]?.slots ?? 0) > loadOf(q, pockets, items, this.money, gear, food.dishes).slots);
      if (!home) {
        this.say(`Nowhere to move the ${gear.kinds[p.kind]?.name.toLowerCase() ?? p.kind} that's in your ${currentKind?.name ?? 'pockets'}. Make room first.`, 'error');
        return false;
      }
      p.in = home.id;
    }
    // Then what was in its pockets, then the garment itself.
    for (const i of moving) {
      const home = placeFor(pockets, items, this.money, i, i.count, gear, food.dishes);
      if (!home) {
        this.say(`No room for the ${i.name} that's in your ${currentKind?.name ?? 'pockets'}. Make room first.`, 'error');
        return false;
      }
      this.putAway(items, i, home);
    }
    let left = '';
    if (current && currentKind) {
      const old: Item = { id: current.kind, kind: 'clothing', name: currentKind.name, count: 1, gear: current.kind };
      const home = placeFor(pockets, items, this.money, old, 1, gear, food.dishes);
      const stack = home ? items.find((i) => i.id === old.id && i.kind === 'clothing' && i.in === home) : undefined;
      if (stack) stack.count++;
      else if (home) items.push({ ...old, in: home });
      else left = ` No room to carry the ${currentKind.name}: it stays where you stand.`;
    }
    this.pockets.splice(0, this.pockets.length, ...pockets);
    this.items.splice(0, this.items.length, ...items);
    this.say(`You put on the ${kind.name}.${left}`, 'system');
    if (kind.mask) this.say(`Behind the ${kind.mask} nobody knows your face. Nobody with a counter serves one, either.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    this.recognize(now);
    return true;
  }

  /**
   * Takes off something worn on the head or the face: it goes in a pocket with room, else
   * stays on. The clothes a new player comes with (torso, legs, feet) are swapped, never
   * shed: nobody walks Night City half-dressed.
   */
  takeOff(pocketId: string): boolean {
    const { gear, food } = this.rules;
    const pocket = this.pockets.find((p) => p.id === pocketId && p.in === null);
    const kind = pocket ? gear.kinds[pocket.kind] : undefined;
    if (!pocket || !kind?.slot) return false;
    const required = new Set(gear.start.map((p) => gear.kinds[p.kind]?.slot));
    if (required.has(kind.slot)) {
      this.say(`The ${kind.name} stays on until you've something else to wear there.`, 'error');
      return false;
    }
    if (this.items.some((i) => i.in === pocket.id) || this.pockets.some((p) => p.in === pocket.id)) {
      this.say(`Empty the pockets of the ${kind.name} first.`, 'error');
      return false;
    }
    const item: Item = { id: pocket.kind, kind: 'clothing', name: kind.name, count: 1, gear: pocket.kind };
    const home = placeFor(this.pockets.filter((p) => p !== pocket), this.items, this.money, item, 1, gear, food.dishes);
    if (!home) {
      this.say(`No room in your pockets for the ${kind.name}. Make room first.`, 'error');
      return false;
    }
    this.pockets.splice(this.pockets.indexOf(pocket), 1);
    const stack = this.items.find((i) => i.id === item.id && i.kind === 'clothing' && i.in === home);
    if (stack) stack.count++;
    else this.items.push({ ...item, in: home });
    this.say(`You take off the ${kind.name}.${kind.mask ? ' Your face is your own again.' : ''}`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /** The mask the player has on, if any: a garment worn that hides the face. */
  masked(): Mask | null {
    for (const p of this.pockets) {
      if (p.in !== null) continue;
      const kind = this.rules.gear.kinds[p.kind];
      if (kind?.mask) return { kind: p.kind, word: kind.mask, name: kind.name };
    }
    return null;
  }

  /** Drops one of something carried, for good: room for something else. False if there's none. */
  drop(id: string): boolean {
    const item = this.items.find((i) => i.id === id);
    if (!item) return false;
    this.takeOne(item);
    this.say(`You drop the ${item.name}.`);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  // ───────────── The bank ─────────────

  /** The bank the player is inside, if any: its name, its cut for coins, and what it hands over in one go. */
  bank(now = Date.now()): { name: string; fee: number; withdrawals: number[] } | null {
    const at = this.inside;
    // A branch whose people the player has crossed keeps its counter closed to them, like any storefront.
    if (at?.business !== 'bank' || this.barred(now)) return null;
    return { name: at.name, fee: this.rules.money.coinFee, withdrawals: [...this.rules.money.withdrawals] };
  }

  /** Puts all the cash in the account, less the bank's cut for counting the coins. False with no bank or no cash. */
  deposit(): boolean {
    if (!this.bank() || !cash(this.money)) return false;
    const put = cash(this.money);
    const { money, fee } = toAccount(this.money, this.rules.money);
    this.money = money;
    this.say(`Deposited ${put} €$${fee ? `, less ${fee} €$ for counting the coins` : ''}. €$ ${money.account} in the bank.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** Takes bills out of the account, as far as the account has them and the wallet will hold them. */
  withdraw(amount: number): boolean {
    if (!this.bank()) return false;
    const room = walletRoom(this.pockets, this.money, this.rules.gear);
    const money = fromAccount(this.money, amount);
    if (!money) {
      this.say(`There isn't ${amount} €$ in the account: €$ ${this.money.account}.`, 'error');
      return false;
    }
    if (amount > room) {
      this.say(`Your wallet won't hold ${amount} €$ more in bills${room ? ` (room for ${room})` : ''}.`, 'error');
      return false;
    }
    this.money = money;
    this.say(`Withdrew ${amount} €$ in bills. €$ ${money.account} left in the bank.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** Changes the coins for bills, less the bank's cut. False with no coins, or no room for the bills. */
  exchange(): boolean {
    if (!this.bank()) return false;
    const changed = coinsToBills(this.money, this.rules.money);
    if (!changed) {
      this.say('No coins to change.', 'error');
      return false;
    }
    const notes = changed.money.bills - this.money.bills;
    if (notes > walletRoom(this.pockets, this.money, this.rules.gear)) {
      this.say(`Your wallet won't hold ${notes} €$ more in bills.`, 'error');
      return false;
    }
    const coins = this.money.coins;
    this.money = changed.money;
    this.say(`Changed ${coins} €$ in coins for ${notes} €$ in bills${changed.fee ? `; the bank kept ${changed.fee} €$` : ''}.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** Banks the credchips in the player's name: what's on them into the account. A locked chip is somebody else's; the teller slides it back. */
  bankChips(): boolean {
    const at = this.bank();
    if (!at) return false;
    const clean = this.chips('clean');
    const locked = this.chips('locked').length;
    if (!clean.length) {
      this.say(locked ? `${locked === 1 ? "That chip isn't" : "Those chips aren't"} in your name. ${at.name} won't touch ${locked === 1 ? 'it' : 'them'}.` : 'No chips to bank.', 'error');
      return false;
    }
    const sum = clean.reduce((n, c) => n + (c.balance ?? 0), 0);
    for (const chip of clean) this.items.splice(this.items.indexOf(chip), 1);
    this.money = { ...this.money, account: this.money.account + sum };
    const back = locked ? ` The teller slides the ${locked === 1 ? 'other one' : 'others'} back: not in your name.` : '';
    this.say(`Banked ${clean.length === 1 ? 'the chip' : `${clean.length} chips`}: ${sum} €$ into the account. €$ ${this.money.account} in the bank.${back}`, 'system');
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /** One fewer of a stack; none left, and it's gone. */
  private takeOne(item: Item): void {
    item.count--;
    if (item.count <= 0) this.items.splice(this.items.indexOf(item), 1);
  }

  /**
   * Eats or drinks one of something carried. False if there's none, or it isn't for eating.
   * Food and soft drinks do nothing yet; alcohol goes to the head.
   */
  consume(id: string, now: number): boolean {
    const item = this.items.find((i) => i.id === id && i.kind === 'consumable');
    const dish = item ? this.rules.food.dishes.find((d) => d.id === id) : undefined;
    if (!item || !dish) return false;
    this.takeOne(item);
    if (dish.kind === 'alcohol') this.drink(dish.name, dish.alcohol ?? 0, now);
    else this.say(`You ${dish.kind === 'food' ? 'eat' : 'drink'} the ${dish.name}.`);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  private drink(name: string, units: number, now: number): void {
    this.drunkState = drink(this.drunkState, units, this.rules.inebriation, this.rules.timeScale, now);
    const status = this.inebriation(now);
    const worse = status.stage && status.stage !== this.drunkStage ? ` ${status.stage.up}` : '';
    this.drunkStage = status.stage;
    this.say(`You drink the ${name}.${worse}`);
    this.events.emit('inebriationChanged', status);
  }

  // ───────────── Work ─────────────

  /** The player's job, for saving. */
  get jobSaved(): JobState | null {
    return this.job ? { ...this.job } : null;
  }

  /** The player's job as it stands now: where, for whom, which rung, what a shift pays, and whether one can start. Null without one. */
  jobStatus(now: number): JobStatus | null {
    const job = this.job;
    if (!job) return null;
    const building = this.world.buildings.find((b) => b.id === job.building);
    const ladder = building ? ladderFor(building, this.rules.jobs) : null;
    if (!building || !ladder) return null;
    const rung = rungOf(job, ladder);
    const clock = this.clockAt(now);
    const here = this.inside?.id === building.id;
    const blocked = !here ? 'away' : job.lastShiftDay === clock.day ? 'done' : !shiftOpen(clock.hour, this.rules.jobs) ? 'closed' : null;
    return { building, boss: bossOf(building, this.population), rung, next: nextRung(job, ladder), trust: job.trust, shifts: job.shifts, pay: this.shiftPayAt(rung, building), here, blocked };
  }

  /** The tier a storefront runs at: its menu's, its rack's, or drawn the way its district eats. */
  private tierOf(building: Building): Quality {
    const { food, gear } = this.rules;
    return menuFor(this.world, building, food)?.venue.quality ?? (building.business ? gear.quality[building.business] : undefined) ?? drawQuality(this.world, building);
  }

  /** What there is to do about work with someone: ask them for a job (they run a place that hires), quit the job they gave the player, or nothing. */
  workWith(id: string): 'hire' | 'quit' | null {
    const person = this.person(id);
    const runs = person ? bossAt(person, this.world, this.population, this.rules.jobs) : null;
    if (!runs) return null;
    return this.job?.building === runs.id ? 'quit' : 'hire';
  }

  /** The hours shifts run, as people say them. */
  private shiftHours(): string {
    const [from, to] = this.rules.jobs.hours;
    const h = (n: number) => `${((n + 11) % 12) + 1}${n < 12 ? 'am' : 'pm'}`;
    return `${h(from)} to ${h(to)}`;
  }

  /**
   * Asks someone here for work. They have to run a place that hires; whether they take the
   * player on is their openness to it (how they feel about them, the player's way with words),
   * and never with a mask on the player, nor while the player has a job elsewhere. Taken on,
   * the player starts at the bottom of that place's ladder.
   */
  askForWork(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    const runs = here ? bossAt(here.person, this.world, this.population, this.rules.jobs) : null;
    if (!here || !runs || this.job?.building === runs.id) return false;
    if (this.job) {
      this.say(`You've got work at ${this.world.buildings.find((b) => b.id === this.job?.building)?.name ?? 'another place'}. Quit that first.`, 'error');
      return false;
    }
    const { person, stance, doing } = here;
    const { society, timeScale, lines, jobs } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const bottom = (ladderFor(runs, jobs) as Rung[])[0] as Rung;
    const pay = this.shiftPayAt(bottom, runs);
    const speaker = this.speakerFor(person, stance, doing, now);
    speaker.vars = { ...speaker.vars, title: bottom.title.toLowerCase(), work: runs.name, pay: String(pay) };
    const rng = createRng(`${this.world.seed}:${id}:hire:${standing.asks}`);
    learnOf(this.society, id, 'met');
    this.logged(id, 'you', line(lines.you.work, speaker, rng), now);
    const refused = { ...standing.refused };
    let pressed = false;
    let hired = false;
    // A boss who let the player go, or whom they walked out on, remembers it a while.
    const burned = memoryOf(this.society, id, 'fired', society.memory, timeScale, now) ?? memoryOf(this.society, id, 'quit', society.memory, timeScale, now);
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.masked()) {
      this.speech(person, line(lines.work.masked, speaker, rng), now);
    } else if (burned) {
      this.speech(person, line(lines.work.rehire, { ...speaker, vars: { ...speaker.vars, ...this.memoryVars(person, burned, now) } }, rng), now);
      refused.hire = now;
    } else if (this.trade(runs).health === 'struggling') {
      // A place in the red takes nobody on, whatever the boss thinks of the player.
      this.speech(person, line(lines.work.broke, speaker, rng), now);
      refused.hire = now;
    } else if (this.pressing(standing, 'hire', now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const reply = replyTo(openness('hire', stance, this.charismaState.level, person.traits, society.openness), society.openness, rng);
      if (reply === 'answer') {
        hired = true;
        this.job = { building: runs.id, rung: 0, trust: 0, shifts: 0, lastShiftDay: -1 };
        this.remember(id, { kind: 'hired', at: now, what: runs.name }, now);
        this.speech(person, compose(lines.work.hire, speaker, lines, rng, { opener: false }), now);
        // The boss has a name and a job now, as far as the player's concerned.
        learnFact(this.society, id, 'name');
        learnFact(this.society, id, 'job');
        this.say(`You work at ${runs.name} now: ${bottom.title.toLowerCase()}, ${pay} €$ a shift, ${this.shiftHours()}. Come in and Work.`, 'system');
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, 'hire', lines, rng) : line(lines.work.refuse, speaker, rng), now);
        refused.hire = now;
      }
    }
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport: pressed ? -society.openness.press : hired ? 2 : 0 }, society, timeScale, now);
    if (hired) {
      this.gainCharisma(3);
      this.events.emit('jobChanged', this.jobStatus(now));
    }
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /**
   * Works a shift: at the workplace, in working hours, one a day, for the rung's energy. The
   * pay goes to the account; the shift is trust, and regard with the boss, and standing with
   * the place; the boss, if about, says something, and moves the player up once there's
   * trust enough and they've warmed to them.
   */
  work(now: number): boolean {
    if (this.checkFired(now)) return false;
    const status = this.jobStatus(now);
    if (!status) return false;
    const { society, timeScale, lines, jobs } = this.rules;
    const { building, boss, rung, pay } = status;
    const mask = this.masked();
    if (status.blocked === 'away') this.say(`Your shift is at ${building.name}.`, 'error');
    else if (status.blocked === 'done') this.say("You've done your shift today. Back tomorrow.", 'error');
    else if (status.blocked === 'closed') this.say(`Shifts run ${this.shiftHours()}. Come back then.`, 'error');
    else if (mask) this.say(`Nobody works a shift in a ${mask.word}. Take it off.`, 'error');
    if (status.blocked || mask) return false;
    if (!this.spendEnergy(rung.energy, now)) return false;
    const job = this.job as JobState;
    job.shifts += 1;
    job.trust += jobs.trustPerShift;
    job.lastShiftDay = this.clockAt(now).day;
    this.money = { ...this.money, account: this.money.account + pay };
    this.say(`A shift ${rung.doing} at ${building.name}: ${pay} €$ to your account.`, 'system');
    changeRep(this.society, `business:${building.id}`, jobs.rep, society, timeScale, now);
    if (boss) {
      learnOf(this.society, boss.id, 'met');
      changeStanding(this.society, boss.id, { met: true, rapport: jobs.rapport }, society, timeScale, now);
      const about = this.isHere(boss.id, now);
      if (about) {
        const stance = this.stanceOf(boss, now);
        const speaker = this.speakerFor(boss, stance, about.doing, now);
        const rng = createRng(`${this.world.seed}:shift:${building.id}:${job.shifts}`);
        const ladder = ladderFor(building, jobs) as Rung[];
        if (canPromote(job, ladder, stance, jobs)) {
          job.rung += 1;
          const up = rungOf(job, ladder);
          const raise = this.shiftPayAt(up, building);
          this.remember(boss.id, { kind: 'promoted', at: now, what: up.title.toLowerCase() }, now);
          speaker.vars = { ...speaker.vars, title: up.title.toLowerCase(), work: building.name, pay: String(raise) };
          this.speech(boss, compose(lines.work.promote, speaker, lines, rng, { opener: false }), now);
          this.say(`You're moved up: ${up.title.toLowerCase()} at ${building.name}, ${raise} €$ a shift.`, 'system');
        } else if (rng.chance(0.5)) {
          speaker.vars = { ...speaker.vars, title: rung.title.toLowerCase(), work: building.name, pay: String(pay) };
          this.speech(boss, line(lines.work.shift, speaker, rng), now);
        }
      }
    }
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('jobChanged', this.jobStatus(now));
    this.events.emit('societyChanged', { people: boss ? [boss.id] : [] });
    return true;
  }

  /** Quits the job. If the boss is about, they hear it from the player. */
  quit(now: number): boolean {
    const status = this.jobStatus(now);
    if (!status) return false;
    const { lines } = this.rules;
    const { boss, building, rung } = status;
    const about = boss ? this.isHere(boss.id, now) : undefined;
    if (boss && about) {
      const speaker = this.speakerFor(boss, about.stance, about.doing, now);
      speaker.vars = { ...speaker.vars, work: building.name, title: rung.title.toLowerCase() };
      const rng = createRng(`${this.world.seed}:quit:${building.id}:${status.shifts}`);
      this.logged(boss.id, 'you', line(lines.you.quit, speaker, rng), now);
      this.speech(boss, line(lines.work.quit, speaker, rng), now);
    }
    this.job = null;
    // Told to their face or heard from the staff, the boss remembers being walked out on.
    if (boss) this.remember(boss.id, { kind: 'quit', at: now, what: rung.title.toLowerCase() }, now);
    this.say(`You don't work at ${building.name} anymore.`, 'system');
    this.events.emit('jobChanged', null);
    if (boss) this.events.emit('societyChanged', { people: [boss.id] });
    return true;
  }

  /** Lets the player go from a job at a place that has had enough of them (a storefront that won't serve them won't keep them either). True if it did. */
  private checkFired(now: number): boolean {
    const job = this.job;
    if (!job) return false;
    const { society, timeScale } = this.rules;
    const building = this.world.buildings.find((b) => b.id === job.building);
    const banned = !building || repOf(this.society, `business:${job.building}`, society, timeScale, now) <= society.rep.banAt || (building.business ? repOf(this.society, `chain:${building.business}`, society, timeScale, now) <= society.rep.banAt : false);
    if (!banned) return false;
    this.job = null;
    const boss = building ? bossOf(building, this.population) : null;
    if (boss) this.remember(boss.id, { kind: 'fired', at: now, what: building?.name ?? '' }, now);
    this.say(`${building?.name ?? 'The place'} is done with you: after what you did to its people, nobody there wants you on a shift.`, 'error');
    this.events.emit('jobChanged', null);
    return true;
  }

  // ───────────── People ─────────────

  private clockAt(now: number): Clock {
    return (this.rules.clock ?? localClock)(now);
  }

  /** Where the player is, as somewhere people can be: inside a building, or at a place. Null on the street or on the move. */
  private get spot(): Spot | null {
    if (this.inside) return { kind: 'building', id: this.inside.id };
    const location = this.location;
    return location ? { kind: 'location', id: location.id } : null;
  }

  /** Everyone where the player is right now, and who they're with. */
  peopleHere(now: number): Presence[] {
    const spot = this.spot;
    if (!spot) return [];
    const clock = this.clockAt(now);
    const present = peopleAt(this.population, this.world, spot, clock, this.rules.food.dishes);
    const scenes = scenesAt(present.map((p) => p.person), this.population, spot, clock, this.world, this.rules.people.turf, (gang) => this.rules.people.gangs[gang]?.rivals ?? [], this.rules.life, this.world.seed);
    return present.map(({ person, doing }) => ({
      person,
      doing,
      stance: this.stanceOf(person, now),
      scene: scenes.get(person.id) ?? null,
    }));
  }

  // ───────────── The people's own days ─────────────

  /** The people's own days so far, for saving. */
  get lifeSaved(): LifeState {
    return structuredClone(this.life);
  }

  /** Lives the people through the days since the last one lived, if any have passed. */
  private live(now: number): void {
    const today = this.clockAt(now).day;
    if (this.life.day >= today) return;
    const happened = liveUntil(this.world, this.population, this.life, this.rules.life, this.baseEddies, today, this.world.seed, (spot) => this.tierOfSpot(spot), turfFrom(this.rules.people.turf), this.rules.people);
    if (happened.length) this.events.emit('societyChanged', { people: [] });
  }

  /** The tier a place runs at, for what an evening there costs, remembered per place. */
  private readonly tiers = new Map<string, Quality>();
  private tierOfSpot(spot: Spot): Quality {
    const key = `${spot.kind}:${spot.id}`;
    const known = this.tiers.get(key);
    if (known) return known;
    const at = spot.kind === 'building' ? this.world.buildings.find((b) => b.id === spot.id) : this.world.locations[spot.id];
    const tier: Quality = !at ? 'everyday' : spot.kind === 'building' ? this.tierOf(at as Building) : (menuFor(this.world, at, this.rules.food)?.venue.quality ?? drawQuality(this.world, at));
    this.tiers.set(key, tier);
    return tier;
  }

  /** How a storefront is doing on its last week's books, and the line that says so inside. */
  trade(building: Building): { health: Health; line: string } {
    return tradeAt(building, this.population, this.life.tills, this.tierOf(building), this.rules.life.economy);
  }

  /** What a shift pays the player at a storefront: its rung by its tier, and more or less by how the place is doing. */
  private shiftPayAt(rung: Rung, building: Building): number {
    return Math.max(1, Math.round(shiftPay(rung, this.tierOf(building), this.rules.jobs) * this.rules.life.economy.pay[this.trade(building).health]));
  }

  /** How long ago something was, said the way people say it, from a number of days. */
  private agoWord(days: number): string {
    if (days < 1) return 'today';
    if (days < 2) return 'last night';
    if (days < 3) return 'two nights back';
    if (days < 7) return 'a few days back';
    if (days < 14) return 'last week';
    if (days < 28) return 'a few weeks back';
    return 'a while back';
  }

  /** What someone would bring up about what happened between people lately, as the variables their lines are filled by; nothing when there's no news. */
  private newsVars(person: Person, now: number): Record<string, string> {
    const news = newsFor(person, this.population, this.life, this.rules.life, this.clockAt(now).day);
    if (!news) return {};
    const { event, role, other, tie, won } = news;
    const ago = this.agoWord(this.clockAt(now).day - event.day);
    const pronouns = pronounsOf(other);
    const where = event.where ? (event.where.kind === 'building' ? this.world.buildings.find((b) => b.id === event.where?.id)?.name : this.world.locations[event.where.id]?.name) : undefined;
    return {
      news: 'yes',
      [`news${event.kind.charAt(0).toUpperCase()}${event.kind.slice(1)}`]: 'yes',
      // What the speaker was to it: `newsMine`, `newsKin`, `newsOurs` (their gang's doing) or `newsHeard`; `newsGang` is the gang's name.
      [{ me: 'newsMine', kin: 'newsKin', gang: 'newsOurs', heard: 'newsHeard' }[role]]: 'yes',
      newsWho: other.given,
      newsGang: event.gang ? (this.rules.people.gangs[event.gang]?.name ?? '') : '',
      newsWord: tie ? kinWord(person, tie.kind, other) : '',
      newsAgo: ago,
      newsTook: String(event.took),
      newsWhere: where ?? '',
      newsHe: pronouns.he,
      newsHim: pronouns.him,
      newsHis: pronouns.his,
      newsWon: won ? 'yes' : '',
      newsHurt: event.kind === 'fight' && event.who[1] === other.id ? 'yes' : '',
      // The other one in it, for a relative's news or the district's; and, for a death, whether someone did it.
      newsWith: news.with?.given ?? '',
      newsKilled: event.kind === 'death' && event.who[0] !== event.who[1] ? 'yes' : '',
    };
  }

  /** What someone remembers of the player, as the variables a line of theirs is filled by (`mem`, `mem<Kind>`, and what's in it). */
  private memoryVars(person: Person, memory: Memory, now: number): Record<string, string> {
    const about = memory.about ? this.person(memory.about) : undefined;
    const tie = about ? tiesOf(this.population, person.id).find((t) => t.to === about.id) : undefined;
    const days = daysSince(memory.at, this.rules.timeScale, now);
    const ago = days < 0.5 ? 'earlier' : days < 1.5 ? 'yesterday' : days < 2.5 ? 'two days back' : days < 7 ? 'a few days back' : days < 14 ? 'last week' : 'a while back';
    const dish = memory.kind === 'gift' ? this.rules.food.dishes.find((d) => d.id === memory.what) : undefined;
    const pronouns = about ? pronounsOf(about) : null;
    return {
      mem: 'yes',
      [`mem${memory.kind.charAt(0).toUpperCase()}${memory.kind.slice(1)}`]: 'yes',
      memWho: about?.given ?? '',
      memWord: tie && about ? kinWord(person, tie.kind, about) : '',
      memHe: pronouns?.he ?? '',
      memHim: pronouns?.him ?? '',
      memHis: pronouns?.his ?? '',
      memAgo: ago,
      memTwice: memory.times > 1 ? 'yes' : '',
      // Brought up before: said differently the second time.
      memAgain: memory.said > 0 ? 'yes' : '',
      memRobbery: memory.what === 'robbery' ? 'yes' : '',
      memInsult: memory.what === 'insult' ? 'yes' : '',
      memTook: memory.amount ? String(memory.amount) : '',
      memItem: dish?.name ?? '',
      memFavorite: dish && (dish.id === person.likes.dish || dish.id === person.likes.drink) ? 'yes' : '',
      memTitle: memory.kind === 'promoted' || memory.kind === 'quit' ? (memory.what ?? '') : '',
    };
  }

  /** Writes something down in someone's memory of the player. */
  private remember(id: string, memory: Omit<Memory, 'said' | 'times'>, now: number): void {
    remember(this.society, id, memory, this.rules.society.memory, this.rules.timeScale, now);
  }

  person(id: string): Person | undefined {
    return personById(this.population, id);
  }

  private stanceOf(person: Person, now: number): Stance {
    return stanceOf(attitude(person, this.society, this.rules.society, this.rules.timeScale, now, Boolean(this.masked())), this.rules.society);
  }

  /** What the player stands with a person, and knows of them. */
  standingWith(id: string, now: number): PersonStanding | null {
    const person = this.person(id);
    if (!person) return null;
    const { society, timeScale } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const score = attitude(person, this.society, society, timeScale, now, Boolean(this.masked()));
    const web = webOf(this.society, id)
      .map((link) => ({ person: this.person(link.id), kind: link.kind, how: link.how }))
      .filter((link): link is PersonStanding['web'][number] => Boolean(link.person))
      .sort((a, b) => a.person.name.localeCompare(b.person.name));
    return { stance: stanceOf(score, society), attitude: score, standing, knowledge: knowledgeOf(this.society, id), web };
  }

  /** Everyone the player knows of: met, seen about, or heard of. */
  knownPeople(): Person[] {
    return knownPeople(this.society)
      .map((id) => this.person(id))
      .filter((p): p is Person => Boolean(p))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Takes in who's here: the player now knows of everyone present, and has seen together
   * any two of them who really are connected (how, they can't tell).
   */
  look(now: number): void {
    const present = this.peopleHere(now);
    const here = present.map((p) => p.person);
    const learned: string[] = [];
    const spot = this.spot;
    for (const { person, doing } of present) {
      if (learnOf(this.society, person.id, 'seen')) learned.push(person.id);
      // What's plain to see: who works here, who lives here, who's eating what they love.
      if (spot?.kind === 'building' && person.job.building === spot.id && learnFact(this.society, person.id, 'job')) learned.push(person.id);
      if (spot?.kind === 'building' && person.home === spot.id && learnFact(this.society, person.id, 'home')) learned.push(person.id);
      if (doing.startsWith('eating') && learnFact(this.society, person.id, 'likes')) learned.push(person.id);
      if (doing.startsWith('nursing') && learnFact(this.society, person.id, 'drinks')) learned.push(person.id);
    }
    // Who here is tied to whom: the ties among those present, once, not a scan per pair.
    const hereIds = new Set(here.map((p) => p.id));
    const linked = new Set<string>();
    for (const t of this.population.ties) if (hereIds.has(t.from) && hereIds.has(t.to)) linked.add(`${t.from}|${t.to}`);
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        const a = here[i] as Person;
        const b = here[j] as Person;
        if (!linked.has(`${a.id}|${b.id}`)) continue;
        if (learnLink(this.society, a.id, b.id, null, 'seen', now)) learned.push(a.id, b.id);
      }
    }
    if (learned.length) this.events.emit('societyChanged', { people: [...new Set(learned)] });
    this.recognize(now);
  }

  /** A person as the player can tell them, and what the player knows of them (as of `now`, for how long someone's been dead). */
  describe(id: string, now = Date.now()): Description | null {
    const person = this.person(id);
    if (!person) return null;
    const k = knowledgeOf(this.society, id);
    const { people, food } = this.rules;
    const named = k.facts.includes('name');
    const facts: Description['facts'] = {};
    const work = person.job.building ? this.world.buildings.find((b) => b.id === person.job.building) : undefined;
    const gang = person.gang ? people.gangs[person.gang] : undefined;
    if (k.facts.includes('job')) facts.job = gang ? `${gang.name} ${person.job.role}` : work ? `${capitalize(person.job.role)} at ${work.name}` : capitalize(person.job.role);
    if (k.facts.includes('age')) facts.age = `${person.age}`;
    if (k.facts.includes('home')) facts.home = person.home ? `Lives at ${this.world.buildings.find((b) => b.id === person.home)?.name ?? 'somewhere'}` : 'No fixed address';
    if (k.facts.includes('likes')) facts.likes = `Likes ${food.dishes.find((d) => d.id === person.likes.dish)?.name ?? 'a hot meal'}`;
    if (k.facts.includes('drinks')) facts.drinks = `Drinks ${food.dishes.find((d) => d.id === person.likes.drink)?.name ?? 'anything'}`;
    if (k.facts.includes('hates')) facts.hates = person.hates ? `Hates the ${people.gangs[person.hates]?.name ?? person.hates}` : 'Hates nobody in particular';
    if (k.facts.includes('nature')) facts.nature = person.bio.split('. ').slice(1, 2).join('').replace(/\.$/, '');
    if (k.facts.includes('dead') && person.diedOn !== undefined) facts.dead = `Died ${this.agoWord(this.clockAt(now).day - person.diedOn)}`;
    const order: Fact[] = ['dead', 'job', 'age', 'home', 'likes', 'drinks', 'hates', 'nature'];
    return { name: named ? person.name : describeStranger(person, people), named, facts, lines: order.map((f) => facts[f]).filter((line): line is string => Boolean(line)) };
  }

  /** What has passed between the player and a person, oldest first. */
  conversation(id: string): LogEntry[] {
    return knowledgeOf(this.society, id).log.map((entry) => ({ ...entry }));
  }

  /** Writes down a line of a conversation, on the record for that person. */
  private logged(id: string, who: LogEntry['who'], text: string, now: number): void {
    logLine(this.society, id, who, text, now);
  }

  /** How far the player's words go. */
  charisma(): SkillStatus {
    return skillStatus(this.charismaState, this.rules.charisma);
  }

  get charismaSaved(): SkillState {
    return { ...this.charismaState };
  }

  private gainCharisma(amount: number): void {
    const { state, levels } = gainXp(this.charismaState, amount, this.rules.charisma);
    this.charismaState = state;
    if (levels) this.say(fill(this.rules.charisma.levelLine, { level: String(state.level) }), 'system');
    this.events.emit('charismaChanged', this.charisma());
  }

  /** The player's reputations that stand at anything, worst first. */
  reputation(now: number): Reputation[] {
    const { society, timeScale, people } = this.rules;
    const out: Reputation[] = [];
    for (const key of Object.keys(this.society.rep)) {
      const value = Math.round(repOf(this.society, key, society, timeScale, now));
      if (!value) continue;
      const [kind, id] = key.split(':') as [string, string];
      let label = id;
      if (kind === 'gang') label = people.gangs[id]?.name ?? id;
      else if (kind === 'district') label = this.world.districts[id]?.name ?? id;
      else if (kind === 'business') label = this.world.buildings.find((b) => b.id === id)?.name ?? id;
      else if (kind === 'chain') label = `${this.rules.food.fixed[id] ? 'every ' : ''}${this.world.buildings.find((b) => b.business === id)?.business ?? id}`;
      out.push({ key, label, value });
    }
    return out.sort((a, b) => a.value - b.value);
  }

  /** Why the counter the player is at won't serve them, if it won't: what they did to its people, or the mask on them (no counter serves a mask: not a kitchen, not a rack, not a bank). */
  barred(now: number): string | null {
    const at = this.inside;
    const { society, timeScale, lines } = this.rules;
    if (at?.business) {
      const banned = repOf(this.society, `business:${at.id}`, society, timeScale, now) <= society.rep.banAt || repOf(this.society, `chain:${at.business}`, society, timeScale, now) <= society.rep.banAt;
      if (banned) return this.pickLine(lines.barred, `${at.id}:barred`, { work: at.name });
    }
    const mask = this.masked();
    const counter = at?.business ? at : this.menu() ? this.location : null;
    if (mask && counter) return this.pickLine(lines.masked.barred, `${counter.id}:mask`, { work: counter.name, mask: mask.word });
    return null;
  }

  private isHere(id: string, now: number): Presence | undefined {
    return this.peopleHere(now).find((p) => p.person.id === id);
  }

  /** A line for anyone, by the state of the world rather than a speaker. */
  private pickLine(pool: Line[], salt: string, vars: Record<string, string> = {}): string {
    const rng = createRng(`${this.world.seed}:${salt}:${this.society.nextId}:${this.society.incidents.length}`);
    return pool.length ? finish(textOf(rng.pick(pool)), vars) : '';
  }

  /**
   * Everything a line of someone's is picked and filled by: who they are, what they're doing,
   * how they feel about the player, how well they know them, the player's way with words,
   * and the moment (where this is, the hour, what's said of the player around here).
   */
  private speakerFor(person: Person, stance: Stance, doing: string, now: number, kin?: Tie): Speaker {
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    const voice = voiceOf(person, this.world);
    const spot = this.spot;
    const here = spot ? ((spot.kind === 'building' ? this.world.buildings.find((b) => b.id === spot.id)?.name : this.world.locations[spot.id]?.name) ?? '') : '';
    const hour = this.clockAt(now).hour;
    const rep = (key: string) => repOf(this.society, key, society, timeScale, now);
    const gangRep = person.gang ? rep(`gang:${person.gang}`) : 0;
    const districtRep = rep(`district:${person.district}`);
    const vars: Record<string, string> = {
      ...lines.lexicon[voice],
      ...varsFor(person, this.world, this.population, this.rules.people, this.rules.food.dishes, kin),
      here,
      late: hour < 5 || hour >= 23 ? 'this late' : '',
      early: hour >= 5 && hour < 9 ? 'yes' : '',
      atWork: spot?.kind === 'building' && person.job.building === spot.id ? 'yes' : '',
      atHome: spot?.kind === 'building' && person.home === spot.id ? 'yes' : '',
      gangGood: gangRep >= 10 ? 'yes' : '',
      gangBad: gangRep <= -10 ? 'yes' : '',
      districtGood: districtRep >= 10 ? 'yes' : '',
      districtBad: districtRep <= -10 ? 'yes' : '',
      mask: this.masked()?.word ?? '',
      ...this.meansVars(person),
    };
    return { person, voice, mood: moodOf(doing), stance, history: historyOf(standing, timeScale, now), eloquence: eloquenceOf(this.charismaState.level), vars };
  }

  /** How someone is fixed (`broke`, `flush`: against what they started with) and how the place they work is doing (`slow`, `brisk`), as line variables. */
  private meansVars(person: Person): Record<string, string> {
    const base = this.baseEddies.get(person.id) ?? person.eddies;
    const work = person.job.building ? this.world.buildings.find((b) => b.id === person.job.building) : undefined;
    const health = work?.business ? this.trade(work).health : 'steady';
    return {
      broke: person.eddies < base * 0.3 ? 'yes' : '',
      flush: person.eddies > base * 1.6 ? 'yes' : '',
      slow: health === 'struggling' ? 'yes' : '',
      brisk: health === 'thriving' ? 'yes' : '',
    };
  }

  /** A line of someone's: on the feed under their name, and on their record. */
  private speech(person: Person, text: string, now: number): void {
    if (!text) return;
    this.say(`${person.given}: "${text}"`, 'talk');
    this.logged(person.id, 'them', text, now);
  }

  /** A line about someone: on the feed as it is, and on their record. */
  private narrate(person: Person, text: string, now: number, tone: Tone = 'talk'): void {
    if (!text) return;
    this.say(text, tone);
    this.logged(person.id, 'them', text, now);
  }

  /** Whether asking someone this again, after a no, comes too soon. */
  private pressing(standing: Standing, asked: string, now: number): boolean {
    const at = standing.refused[asked];
    return at !== undefined && now - at < (this.rules.society.talk.cooldownMinutes * 60_000) / this.rules.timeScale;
  }

  /** Talks to someone here. What they say depends on who they are and how they feel about the player; it warms them a little. */
  talk(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    learnOf(this.society, id, 'met');
    const rng = createRng(`${this.world.seed}:${id}:talk:${standing.talks}:${standing.asks}`);
    // A line about family names one relative: one the player hasn't heard of yet, if there is one.
    const family = tiesOf(this.population, id).filter((t) => FAMILY.includes(t.kind));
    const untold = family.filter((t) => !linkOf(this.society, id, t.to)?.kind);
    const kin = untold.length ? rng.pick(untold) : family.length ? rng.pick(family) : undefined;
    const speaker = this.speakerFor(person, stance, doing, now, kin);
    const news = newsFor(person, this.population, this.life, this.rules.life, this.clockAt(now).day);
    speaker.vars = { ...speaker.vars, ...this.newsVars(person, now) };
    this.logged(id, 'you', line(lines.you.talk, speaker, rng), now);
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
      changeStanding(this.society, id, { met: true }, society, timeScale, now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    if (standing.lastTalkAt && now - standing.lastTalkAt < (society.talk.cooldownMinutes * 60_000) / timeScale) {
      this.speech(person, line(lines.talkedOut, speaker, rng), now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    this.speech(person, line(lines.greeting, speaker, rng), now);
    let topic: Topic | null = null;
    const learned = [id];
    // What they remember of the player, they may bring up; a grievance is all they'll say.
    const memory = recall(this.society, id, society.memory, timeScale, now);
    let aired = false;
    if (memory && rng.chance(society.memory.recall)) {
      const said = compose(lines.memory, { ...speaker, vars: { ...speaker.vars, ...this.memoryVars(person, memory, now) } }, lines, rng, { opener: false });
      if (said) {
        this.speech(person, said, now);
        recalled(this.society, id, memory);
        aired = GRIEVANCES.has(memory.kind);
        if (memory.about && learnOf(this.society, memory.about, 'told')) learned.push(memory.about);
      }
    }
    if (aired) {
      // Said their piece.
    } else if (standing.grudge >= 10 && rng.chance(0.6)) {
      this.speech(person, line(lines.grudge, speaker, rng), now);
    } else {
      // They bring up what they're open about with this player: the neighborhood and their lot for a stranger, their life and their people for a friend.
      const topics = openTopics(speaker, this.charismaState.level, society.openness, rng, standing.rapport >= society.talk.revealAt);
      const chat = smallTalk(speaker, topics, lines, rng);
      this.speech(person, chat.said, now);
      topic = chat.topic;
    }
    // Talking is an introduction; what they talk about, the player now knows; a few chats, and the player has their measure.
    learnFact(this.society, id, 'name');
    if (topic === 'job') learnFact(this.society, id, 'job');
    if (topic === 'likes') {
      learnFact(this.society, id, 'likes');
      learnFact(this.society, id, 'drinks');
    }
    if (topic === 'hates') learnFact(this.society, id, 'hates');
    if (standing.talks + 1 >= 3) learnFact(this.society, id, 'nature');
    if (topic === 'kin' && kin) {
      learnLink(this.society, id, kin.to, kin.kind, 'told', now);
      learnOf(this.society, kin.to, 'told');
      if (this.person(kin.to)?.diedOn !== undefined) learnFact(this.society, kin.to, 'dead');
      learned.push(kin.to);
    }
    // Told of what happened to someone, the player has their name; told it was a relative, the tie too; told who got together, married, split up or fell out, what they knew of that pair is out of date; told of a death, they know.
    if (topic === 'news' && news) {
      learnOf(this.society, news.other.id, 'told');
      if (news.tie) learnLink(this.society, id, news.other.id, news.tie.kind, 'told', now);
      learned.push(news.other.id);
      if (news.with) {
        learnOf(this.society, news.with.id, 'told');
        learned.push(news.with.id);
      }
      const [a, b] = news.event.who;
      const becomes: Partial<Record<string, TieKind | 'none'>> = { friends: 'friend', makeup: 'friend', fallout: 'none', breakup: 'none', romance: 'partner', wedding: 'spouse' };
      const changed = becomes[news.event.kind];
      if (changed && a !== b) relearnLink(this.society, a, b, changed, 'told', now);
      if (news.event.kind === 'death') learnFact(this.society, b, 'dead');
    }
    const gain = Math.round(society.talk.base * (0.6 + person.traits.warmth * 0.8) * (stance === 'cold' ? 0.4 : 1) * this.charisma().bonus);
    changeStanding(this.society, id, { met: true, rapport: gain, talks: standing.talks + 1, lastTalkAt: now }, society, timeScale, now);
    // Getting on with someone counts for a little with their people.
    if (person.gang) changeRep(this.society, `gang:${person.gang}`, 1, society, timeScale, now);
    changeRep(this.society, `district:${person.district}`, 0.5, society, timeScale, now);
    this.events.emit('societyChanged', { people: learned });
    this.gainCharisma(2);
    return true;
  }

  /**
   * Asks someone here about someone the player knows of. Whether they answer is their
   * openness: how they feel about the player, the player's charisma, how loyal they are;
   * what they say is the truth. Asked what they've said already, they say so; asked again
   * soon after a no, they think less of the player.
   */
  ask(id: string, aboutId: string, now: number): boolean {
    const here = this.isHere(id, now);
    const other = this.person(aboutId);
    // Only someone the player can name.
    if (!here || !other || aboutId === id || !knowsOf(this.society, aboutId) || !knowledgeOf(this.society, aboutId).facts.includes('name')) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    learnOf(this.society, id, 'met');
    const otherPronouns = pronounsOf(other);
    const tie = tiesOf(this.population, id).find((t) => t.to === aboutId);
    const today = this.clockAt(now).day;
    // Someone they're done with lately: an ex, a friend fallen out with, and nothing between them since.
    const ex = !tie && this.life.events.some((e) => (e.kind === 'breakup' || e.kind === 'fallout') && e.who.includes(id) && e.who.includes(aboutId));
    const speaker = this.speakerFor(person, stance, doing, now);
    speaker.vars = { ...speaker.vars, other: other.given, otherHe: otherPronouns.he, otherHim: otherPronouns.him, otherHis: otherPronouns.his, word: tie ? kinWord(person, tie.kind, other) : '', otherAgo: other.diedOn !== undefined ? this.agoWord(today - other.diedOn) : '' };
    const rng = createRng(`${this.world.seed}:${id}:ask:${aboutId}:${standing.asks}`);
    this.logged(id, 'you', line(lines.you.askAbout, speaker, rng), now);
    const key = `about:${aboutId}`;
    const known = linkOf(this.society, id, aboutId);
    const refused = { ...standing.refused };
    const learned = [id];
    let pressed = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (known && known.kind !== null) {
      this.speech(person, line(lines.ask.repeat, speaker, rng), now);
    } else if (this.pressing(standing, key, now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const reply = replyTo(openness('kin', stance, this.charismaState.level, person.traits, society.openness, Boolean(this.masked())), society.openness, rng);
      if (reply === 'answer') {
        const dead = other.diedOn !== undefined;
        this.speech(person, compose(tie ? (dead ? lines.ask.dead : lines.ask.knows) : ex ? lines.ask.ex : lines.ask.unknown, speaker, lines, rng), now);
        if (tie) {
          learnLink(this.society, id, aboutId, tie.kind, 'asked', now);
          learnOf(this.society, aboutId, 'told');
          if (dead) learnFact(this.society, aboutId, 'dead');
          learned.push(aboutId);
          this.gainCharisma(2);
        } else {
          relearnLink(this.society, id, aboutId, 'none', 'asked', now);
        }
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, 'kin', lines, rng) : line(lines.refuse, speaker, rng), now);
        refused[key] = now;
      }
    }
    // Awake and willing to hear it, they remember being asked.
    if (speaker.mood !== 'asleep' && stance !== 'hostile') this.remember(id, { kind: 'asked', at: now, about: aboutId }, now);
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport: pressed ? -society.openness.press : 0 }, society, timeScale, now);
    this.events.emit('societyChanged', { people: learned });
    return true;
  }

  /**
   * Asks someone here about themselves: their name, work, age, home, tastes or hates. Whether
   * they answer is their openness (how they feel, the player's charisma, their nature, and
   * what the question asks of them); what they say, the player then knows. A non-answer or a
   * no is remembered: asking again soon is pressing, and costs rapport.
   */
  askFact(id: string, fact: Question, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    learnOf(this.society, id, 'met');
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${id}:fact:${fact}:${standing.asks}`);
    this.logged(id, 'you', `"${line(lines.questions[fact].lines, speaker, rng)}"`, now);
    const refused = { ...standing.refused };
    let pressed = false;
    let news = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (knowledgeOf(this.society, id).facts.includes(fact)) {
      this.speech(person, repeat(speaker, fact, lines, rng), now);
    } else if (this.pressing(standing, fact, now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const reply = replyTo(openness(fact, stance, this.charismaState.level, person.traits, society.openness, Boolean(this.masked())), society.openness, rng);
      if (reply === 'answer') {
        this.speech(person, answer(speaker, fact, lines, rng), now);
        news = learnFact(this.society, id, fact);
        // Asked what they like, they say what they eat and what they drink; answering at all is an introduction.
        if (fact === 'likes') learnFact(this.society, id, 'drinks');
        if (fact !== 'name') learnFact(this.society, id, 'name');
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, fact, lines, rng) : line(lines.refuse, speaker, rng), now);
        refused[fact] = now;
      }
    }
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport: pressed ? -society.openness.press : 0 }, society, timeScale, now);
    if (news) this.gainCharisma(2);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /** Gives someone here something to eat or drink from the inventory. Their favorite counts double. */
  gift(id: string, itemId: string, now: number): boolean {
    const here = this.isHere(id, now);
    const item = this.items.find((i) => i.id === itemId && i.kind === 'consumable');
    const dish = item ? this.rules.food.dishes.find((d) => d.id === itemId) : undefined;
    if (!here || !item || !dish) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const speaker = this.speakerFor(person, stance, doing, now);
    // Something they've been given before, and remember: `again`.
    const before = memoriesOf(this.society, id, society.memory, timeScale, now).some((m) => m.kind === 'gift' && m.what === dish.id);
    speaker.vars = { ...speaker.vars, item: dish.name, again: before ? 'yes' : '' };
    const rng = createRng(`${this.world.seed}:${id}:gift:${now}`);
    if (stance === 'hostile') {
      this.logged(id, 'you', line(lines.you.gift, speaker, rng), now);
      this.narrate(person, line(lines.gift.refuse, speaker, rng), now);
      this.events.emit('societyChanged', { people: [id] });
      return false;
    }
    this.takeOne(item);
    const standing = standingOf(this.society, id, society, timeScale, now);
    const favorite = dish.id === person.likes.dish || dish.id === person.likes.drink;
    // The second gift of the day means half as much.
    const recent = standing.lastGiftAt && now - standing.lastGiftAt < (24 * HOUR) / timeScale;
    const gain = Math.round((favorite ? society.gift.favorite : society.gift.base) * (recent ? 0.5 : 1) * this.charisma().bonus);
    learnOf(this.society, id, 'met');
    this.logged(id, 'you', line(lines.you.gift, speaker, rng), now);
    this.speech(person, compose(favorite ? lines.gift.favorite : lines.gift.thanks, speaker, lines, rng, { opener: false }), now);
    if (favorite) learnFact(this.society, id, dish.id === person.likes.dish ? 'likes' : 'drinks');
    changeStanding(this.society, id, { met: true, rapport: gain, gifts: standing.gifts + 1, lastGiftAt: now }, society, timeScale, now);
    this.remember(id, { kind: 'gift', at: now, what: dish.id }, now);
    // They tell their people: a good word goes round.
    const heard = passGoodWord(this.society, this.population, person, gain, society, timeScale, now);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('societyChanged', { people: [id, ...heard] });
    this.gainCharisma(3);
    return true;
  }

  /** Insults someone here. They, and the people who hear of it, think less of the player; a temper answers in kind. */
  insult(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${id}:insult:${now}`);
    const fallout = this.incident('insult', person, 0, now);
    learnOf(this.society, id, 'met');
    // From behind a mask it's nobody's insult, until someone here sees the mask again (`recognize`).
    if (!this.masked()) changeStanding(this.society, id, { met: true, rapport: -society.insult.rapport }, society, timeScale, now);
    this.logged(id, 'you', line(lines.you.insult, speaker, rng), now);
    this.speech(person, line(lines.insult.reply, speaker, rng), now);
    if (person.traits.temper > 0.55 && rng.chance(person.traits.temper)) {
      this.narrate(person, line(lines.insult.shove, speaker, rng), now, 'error');
      this.drainEnergy(1, now);
    }
    this.checkFired(now);
    this.events.emit('societyChanged', { people: fallout });
    return true;
  }

  /**
   * Robs someone here of what they carry. They won't forget it, nor will their family, friends,
   * crew and coworkers, nor anyone who saw; their workplace stops serving the player, their gang
   * takes note, and someone with a grudge and the nerve for it will come to collect.
   */
  rob(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const rng = createRng(`${this.world.seed}:${id}:rob:${now}`);
    const emptied = standing.robbedAt && now - standing.robbedAt < (7 * 24 * HOUR) / timeScale;
    const fought = !emptied && rng.chance(person.traits.courage * 0.5);
    const wanted = emptied ? 0 : Math.round(person.eddies * rng.range(0.4, 0.8) * (fought ? 0.5 : 1));
    // Their credchip too, if they carry one and there's a slot for it: it comes locked, and wants chopping before any of it is yours.
    const chipWanted = emptied ? 0 : person.chip;
    const chipPocket = chipWanted ? this.pocketFor({ id: 'credchip', kind: 'credchip' }) : null;
    const chipItem: Item | null = chipPocket ? { id: newChipId(this.items), kind: 'credchip', name: 'CredChip', count: 1, in: chipPocket, balance: chipWanted, locked: true } : null;
    const chip = chipItem ? chipWanted : 0;
    // Cash is cash: bills as far as the wallet will hold them, coins as far as the pocket will (with the chip in it).
    const loot = splitLoot(wanted, this.rules.money);
    const bills = Math.min(loot.bills, walletRoom(this.pockets, this.money, this.rules.gear));
    const coins = Math.min(loot.coins, changeRoom(this.pockets, chipItem ? [...this.items, chipItem] : this.items, this.money, this.rules.gear, this.rules.food.dishes));
    const take = bills + coins;
    const speaker = this.speakerFor(person, stance, doing, now);
    const haul = [take ? `${take} €$` : '', chip ? `a credchip with ${chip} €$ on it` : ''].filter(Boolean).join(' and ');
    speaker.vars = { ...speaker.vars, take: String(take), haul };
    const mask = this.masked();
    const fallout = this.incident('robbery', person, take + chip, now);
    learnOf(this.society, id, 'met');
    // Robbed is robbed, mask or not: their pockets stay empty a while. Whose doing it was, they know only with the face.
    changeStanding(this.society, id, mask ? { robbedAt: now } : { met: true, robbedAt: now }, society, timeScale, now);
    this.logged(id, 'you', line(lines.you.rob, speaker, rng), now);
    const got = take > 0 || chip > 0;
    const outcome = (wanted || chipWanted) && !got ? `No room on you for the eddies. ${person.given} keeps ${speaker.vars.his}${mask ? '.' : ', and remembers your face.'}` : line(got ? (fought ? lines.rob.fought : lines.rob.done) : lines.rob.nothing, speaker, rng);
    this.logged(id, 'them', outcome, now);
    if (got) {
      this.money = { ...this.money, bills: this.money.bills + bills, coins: this.money.coins + coins };
      if (chipItem) this.items.push(chipItem);
      this.say(outcome, 'system');
      if (wanted > take) this.say(`Your pockets won't hold the rest: ${wanted - take} €$ stays with ${person.given}.`, 'system');
      if (chipWanted && !chip) this.say(`No room on you for ${speaker.vars.his} credchip: it stays in ${speaker.vars.his} hand.`, 'system');
      if (chip) this.say(`The chip is locked to ${person.given}. A netrunner will have to chop it before any of it is yours.`, 'system');
      if (fought) this.drainEnergy(2, now);
      this.events.emit('walletChanged', this.wallet);
      if (chipItem) this.events.emit('inventoryChanged', this.inventory);
    } else {
      this.say(outcome);
    }
    const witnesses = this.peopleHere(now).filter((p) => p.person.id !== id).length;
    const saw = witnesses === 1 ? 'Someone' : `${witnesses} people`;
    if (mask) this.say(witnesses ? `${saw} saw that, and all they saw was a ${mask.word}. Anyone here who sees it on you again will know.` : `Nobody saw your face. ${person.given} will know the ${mask.word} if ${speaker.vars.he} sees it on you again.`, 'system');
    else if (witnesses) this.say(`${saw} saw that. Word will get around ${this.world.districts[person.district]?.name ?? 'the district'}.`, 'system');
    const work = person.job.building ? this.world.buildings.find((b) => b.id === person.job.building) : undefined;
    if (work && repOf(this.society, `business:${work.id}`, society, timeScale, now) <= society.rep.banAt) this.say(`${work.name} won't be serving you again.`, 'system');
    this.checkFired(now);
    this.events.emit('societyChanged', { people: fallout });
    return true;
  }

  /** Writes an incident down and spreads it; returns everyone it touched, the victim first. */
  /**
   * Whether someone could chop a stolen credchip for the player, as far as the player can
   * tell: a netrunner whose line of work they know, or who is at it behind a netrunning
   * counter right here.
   */
  canChop(id: string): boolean {
    const person = this.person(id);
    if (!person || !isNetrunner(person, this.world)) return false;
    return knowledgeOf(this.society, id).facts.includes('job') || (Boolean(person.job.building) && this.inside?.id === person.job.building);
  }

  /**
   * Asks someone here to chop a stolen credchip: a netrunner cracks it for a cut, and the
   * rest is the player's to spend or bank. Whether they will is their openness (the greedy
   * are readier); a no holds for the talk cooldown, and pressing costs rapport.
   */
  chop(id: string, chipId: string, now: number): boolean {
    const here = this.isHere(id, now);
    const chip = this.items.find((i) => i.id === chipId && i.kind === 'credchip' && i.locked);
    if (!here || !chip || !isNetrunner(here.person, this.world)) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const balance = chip.balance ?? 0;
    const cut = this.chopCut(balance);
    const speaker = this.speakerFor(person, stance, doing, now);
    speaker.vars = { ...speaker.vars, balance: String(balance), cut: String(cut), left: String(balance - cut) };
    const rng = createRng(`${this.world.seed}:${id}:chop:${standing.asks}`);
    learnOf(this.society, id, 'met');
    this.logged(id, 'you', line(lines.you.chop, speaker, rng), now);
    const refused = { ...standing.refused };
    let pressed = false;
    let done = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.pressing(standing, 'chop', now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const reply = replyTo(openness('chop', stance, this.charismaState.level, person.traits, society.openness, Boolean(this.masked())), society.openness, rng);
      if (reply === 'answer') {
        done = true;
        chip.locked = false;
        chip.balance = balance - cut;
        this.remember(id, { kind: 'chopped', at: now, amount: balance }, now);
        this.speech(person, compose(lines.chop.done, speaker, lines, rng, { opener: false }), now);
        // A chip the cut empties is nothing now; it goes in the gutter.
        if (chip.balance <= 0) {
          this.items.splice(this.items.indexOf(chip), 1);
          this.say('Nothing left on the chip after the cut. You toss it.', 'system');
        }
        // Watching them work is as good as being told what they do.
        learnFact(this.society, id, 'name');
        learnFact(this.society, id, 'job');
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, 'chop', lines, rng) : line(lines.chop.refuse, speaker, rng), now);
        refused.chop = now;
      }
    }
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport: pressed ? -society.openness.press : done ? society.chop.rapport : 0 }, society, timeScale, now);
    if (done) {
      this.gainCharisma(3);
      this.events.emit('inventoryChanged', this.inventory);
      this.events.emit('walletChanged', this.wallet);
    }
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  private incident(kind: IncidentKind, victim: Person, took: number, now: number): string[] {
    const { society, timeScale } = this.rules;
    const witnesses = this.peopleHere(now).map((p) => p.person.id).filter((pid) => pid !== victim.id);
    const rng = createRng(`${this.world.seed}:incident:${this.society.nextId}`);
    const mask = this.masked();
    const fallout = applyIncident(this.society, this.population, { at: now, kind, victim: victim.id, witnesses, district: victim.district, took, ...(mask ? { mask: mask.kind, where: this.scene(now, mask) } : {}) }, society, timeScale, now, rng, this.incidentLinks());
    return [victim.id, ...fallout.affected.map((a) => a.id).filter((pid) => pid !== victim.id)];
  }

  /** What an incident's cascade needs to know of the city. */
  private incidentLinks(): IncidentLinks {
    return {
      // A chain is a business with its own fixed menu: every outlet hears about it.
      chainOf: (p) => {
        const building = p.job.building ? this.world.buildings.find((b) => b.id === p.job.building) : undefined;
        return building?.business && this.rules.food.fixed[building.business] ? building.business : null;
      },
      rivalsOf: (gang) => this.rules.people.gangs[gang]?.rivals ?? [],
    };
  }

  /** Where the player is, the hour it is and the mask they have on, as one key: the people about change on the hour. Empty with no mask, or nowhere people can be. */
  private scene(now: number, mask: Mask | null): string {
    const spot = this.spot;
    if (!mask || !spot) return '';
    const clock = this.clockAt(now);
    return `${spot.kind}:${spot.id}|${clock.day}:${clock.hour}|${mask.kind}`;
  }

  /**
   * Whether anyone here knows the mask the player has on: the victim of something done in it,
   * or a witness, sees it again somewhere else or later and puts it together, and the whole
   * of it lands on the player now. Looked into once per scene, since where, the hour and the
   * mask are what change who's about.
   */
  private recognize(now: number): void {
    const mask = this.masked();
    const scene = this.scene(now, mask);
    if (scene === this.noticed) return;
    this.noticed = scene;
    if (!mask || !scene) return;
    const open = unpinnedIncidents(this.society, mask.kind).filter((i) => i.where !== scene);
    if (!open.length) return;
    const { society, timeScale, lines } = this.rules;
    const here = this.peopleHere(now);
    const touched: string[] = [];
    for (const incident of open) {
      const spotter = here.find((p) => p.person.id === incident.victim || incident.witnesses.includes(p.person.id));
      if (!spotter) continue;
      const rng = createRng(`${this.world.seed}:pin:${incident.id}`);
      const fallout = pinIncident(this.society, this.population, incident.id, society, timeScale, now, rng, this.incidentLinks());
      if (!fallout) continue;
      const speaker = this.speakerFor(spotter.person, spotter.stance, spotter.doing, now);
      this.narrate(spotter.person, line(lines.masked.recognized, speaker, rng), now, 'error');
      const victim = this.person(incident.victim)?.given ?? 'someone';
      const what = incident.kind === 'robbery' ? `the robbery of ${victim}` : incident.kind === 'insult' ? `what you said to ${victim}` : `the ${incident.kind} of ${victim}`;
      this.say(`That's ${what} on you now. Word will get around ${this.world.districts[incident.district]?.name ?? 'the district'}.`, 'system');
      touched.push(spotter.person.id, incident.victim, ...fallout.affected.map((a) => a.id));
    }
    if (touched.length) {
      this.checkFired(now);
      this.events.emit('societyChanged', { people: [...new Set(touched)] });
    }
  }

  /** Whoever has come to collect does, if the player isn't on a train: eddies, and the wind out of them. */
  private settleThreats(now: number): void {
    const { society, timeScale, lines, people } = this.rules;
    for (const threat of dueThreats(this.society, now)) {
      if (this.trip?.mode === 'ncart') {
        threat.due = now + (10 * 60_000) / timeScale;
        continue;
      }
      const by = threat.by ? this.person(threat.by) : undefined;
      // Whoever meant to come is dead: nobody comes.
      if (by?.diedOn !== undefined) {
        this.society.threats = this.society.threats.filter((t) => t.id !== threat.id);
        continue;
      }
      const gang = threat.gang ? people.gangs[threat.gang] : undefined;
      const grab = takeCash(this.money, threat.amount);
      let take = grab.taken;
      // Short of cash, they take the chips on you, whoever's name is on them, biggest first.
      const lost: Item[] = [];
      for (const chip of this.chips().sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))) {
        if (take >= threat.amount) break;
        lost.push(chip);
        take += chip.balance ?? 0;
      }
      const vars = { ...(by ? this.speakerFor(by, this.stanceOf(by, now), 'killing time', now).vars : {}), gang: gang?.name ?? '', take: String(take), where: this.nameOf(this.where) };
      const rng = createRng(`${this.world.seed}:threat:${threat.id}`);
      this.events.emit('fx', { effect: 'shake' });
      const hit = finish(textOf(rng.pick(by ? lines.revenge.person : lines.revenge.gang)), vars);
      this.say(hit, 'error');
      if (by) this.logged(by.id, 'them', hit, now);
      this.money = grab.money;
      for (const chip of lost) this.items.splice(this.items.indexOf(chip), 1);
      if (lost.length) this.say(`${lost.length === 1 ? 'The credchip on you goes' : `The ${lost.length} credchips on you go`} with them.`, 'error');
      this.drainEnergy(Infinity, now);
      settleThreat(this.society, threat, society, timeScale, now);
      if (by) this.remember(by.id, { kind: 'settled', at: now, amount: take }, now);
      this.events.emit('walletChanged', this.wallet);
      if (lost.length) this.events.emit('inventoryChanged', this.inventory);
      this.events.emit('societyChanged', { people: by ? [by.id] : [] });
    }
  }

  /** Takes energy away without the training that spending it gives: a shove, a beating. */
  private drainEnergy(amount: number, now: number): void {
    const status = this.energy(now);
    if (!status.current) return;
    this.energyState = { ...this.energyState, current: Math.max(0, status.current - amount), updatedAt: now };
    this.events.emit('energyChanged', this.energy(now));
  }

  /** The player's dealings with the people, for saving. */
  get societySaved(): SocietyState {
    return structuredClone(this.society);
  }

  /** Sobering up on the clock: a line each time the stage eases, and one when it's over. */
  private soberUp(now: number): void {
    if (!this.drunkStage) return;
    const status = this.inebriation(now);
    if (status.stage === this.drunkStage) return;
    this.drunkStage = status.stage;
    this.say(status.stage?.down ?? this.rules.inebriation.sober);
    this.events.emit('inebriationChanged', status);
  }

  get mapState(): MapState {
    return { where: { ...this.where }, visited: new Set(this.visited), discovered: new Set(this.discovered), explored: new Set(this.explored) };
  }

  passActive(now: number): boolean {
    return this.passUntil > now;
  }

  /** Greets the player (or welcomes them back) and puts them where they are. A trip that ended while they were away lands now. */
  start(now: number): void {
    this.live(now);
    this.say(this.resumed ? this.world.welcomeBack : this.world.welcome);
    if (!this.resumed) this.settle(this.where);
    this.emitArrived(null);
    if (this.inside) this.events.emit('interiorChanged', this.inside);
    this.events.emit('walletChanged', this.wallet);
    // Whatever was drunk before has been clearing since; pick up from where it stands now, without a word.
    const drunk = this.inebriation(now);
    this.drunkStage = drunk.stage;
    this.events.emit('inebriationChanged', drunk);
    if (this.trip) {
      this.events.emit('tripChanged', this.trip);
      this.tick(now, true);
    }
    this.events.emit('mapChanged', this.mapState);
  }

  say(text: string, tone: Tone = 'narrative'): void {
    this.events.emit('output', { text, tone });
  }

  /** Where the player is at `now`: somewhere along the way while on the move. */
  positionAt(now: number): Point {
    return this.trip ? tripProgress(this.trip, now).at : { x: this.where.x, y: this.where.y };
  }

  /**
   * How to get somewhere from right here. Null when it can't be done: mid-ride, already there,
   * or the NCART when the player isn't standing at a stop (or is already at the nearest one).
   */
  plan(to: Whereabouts, mode: TravelMode, now: number): TripPlan | null {
    if (this.trip?.mode === 'ncart') return null;
    if (mode === 'ncart' && (this.trip || !this.where.station)) return null;
    if (!this.trip && sameSpot(this.where, to)) return null;
    return planTrip(this.world, mode === 'ncart' ? this.where : this.positionAt(now), to, mode, this.rules);
  }

  /** Whether the player is standing at an NCART stop, so could board a train. */
  get atStation(): boolean {
    return !this.trip && Boolean(this.where.station);
  }

  /** Sets off. Walking can change course partway; a train ride has to finish first. Pays the fare unless the pass covers it. */
  go(plan: TripPlan, now: number): boolean {
    if (this.trip?.mode === 'ncart') return false;
    const covered = plan.mode === 'ncart' && this.passActive(now);
    const fare = plan.mode === 'ncart' && !covered ? plan.fare : 0;
    if (fare && !this.canPay(fare, this.rules.money.transfers.ncart)) {
      this.say(`Not enough eddies for the NCART fare (${fare} €$).`, 'error');
      return false;
    }
    // Heading off from inside a building: out the door first.
    this.leave();
    if (this.trip) {
      // Changing course: whatever was walked so far still counts.
      this.exploreTrip(now);
      this.where = streetSpot(plan.from);
    }
    this.trip = startTrip(plan, now, this.rules);
    if (fare) {
      this.pay(fare, this.rules.money.transfers.ncart);
      this.events.emit('walletChanged', this.wallet);
      this.say(`NCART fare paid: ${fare} €$.`, 'system');
    } else if (covered) {
      this.say('Monthly pass scanned. The gate slides open.', 'system');
    }
    this.events.emit('tripChanged', this.trip);
    return true;
  }

  /** Moves the clock on: sobers up, reveals what's been walked past, and lands the player once the trip is over. */
  tick(now: number, away = false): void {
    this.live(now);
    this.soberUp(now);
    this.settleThreats(now);
    this.recognize(now);
    const trip = this.trip;
    if (!trip) return;
    const changed = this.exploreTrip(now);
    if (now >= trip.endsAt) this.finish(trip, away);
    else if (changed) this.events.emit('mapChanged', this.mapState);
  }

  /** Stops walking right where the player is. (No getting off a moving train.) */
  stop(now: number): boolean {
    const trip = this.trip;
    if (!trip || trip.mode !== 'foot') return false;
    this.exploreTrip(now);
    const from = this.where;
    this.where = streetSpot(snapToStreet(this.world.layout, tripProgress(trip, now).at));
    this.trip = null;
    this.settle(this.where);
    this.events.emit('tripChanged', null);
    this.emitArrived(from);
    this.events.emit('mapChanged', this.mapState);
    return true;
  }

  /** Goes into the building the player is standing outside. Nothing to do in there yet. */
  enter(now = Date.now()): boolean {
    const building = this.door;
    if (!building) return false;
    this.inside = building;
    this.events.emit('interiorChanged', building);
    this.recognize(now);
    return true;
  }

  /** Steps back out onto the street, at the building's door. */
  leave(): boolean {
    if (!this.inside) return false;
    this.inside = null;
    this.events.emit('interiorChanged', null);
    return true;
  }

  /** Buys (or extends) a monthly NCART pass. Only sold at stations. */
  buyPass(now: number): boolean {
    if (this.trip || !this.where.station) return false;
    const { passPrice, passDays } = this.rules;
    if (!this.canPay(passPrice, this.rules.money.transfers.ncart)) {
      this.say(this.shortBy('A monthly pass', passPrice, this.rules.money.transfers.ncart), 'error');
      return false;
    }
    this.pay(passPrice, this.rules.money.transfers.ncart);
    this.passUntil = Math.max(now, this.passUntil) + passDays * DAY;
    this.events.emit('walletChanged', this.wallet);
    this.say(`Monthly NCART pass bought. Unlimited rides for ${passDays} days.`, 'system');
    return true;
  }

  /** Plays a random ambient line for where the player is, never the same one twice in a row. */
  ambient(random: () => number = Math.random): void {
    const lines = this.location?.ambient ?? this.districtOf(this.where)?.ambient ?? [];
    if (!lines.length) return;
    let index = Math.floor(random() * lines.length);
    if (lines.length > 1 && lines[index] === this.lastAmbient) index = (index + 1) % lines.length;
    const line = lines[index];
    if (line === undefined) return;
    this.lastAmbient = line;

    if (typeof line === 'string') {
      this.say(line, 'ambient');
    } else {
      this.events.emit('fx', { effect: line.fx });
      this.say(line.text, 'ambient');
    }
  }

  /** What to call a spot: a place's or station's name, the building outside, or the block. */
  nameOf(where: Whereabouts): string {
    if (where.place) return this.world.locations[where.place]?.name ?? 'Somewhere';
    if (where.station) return this.world.transit.stations[where.station]?.name ?? 'NCART';
    const building = where.building ? this.world.buildings.find((b) => b.id === where.building) : undefined;
    if (building) return `Outside ${building.name}`;
    const block = blockAt(this.world.layout, where);
    return block ? `Block ${block.address}` : 'The streets';
  }

  districtOf(where: Point & Partial<Whereabouts>): District | null {
    const { districts, locations, transit, buildings } = this.world;
    const id =
      (where.place && locations[where.place]?.district) ||
      (where.station && transit.stations[where.station]?.district) ||
      (where.building && buildings.find((b) => b.id === where.building)?.district) ||
      districtAt(Object.values(districts), where)?.id;
    return (id && districts[id]) || null;
  }

  private finish(trip: Trip, away: boolean): void {
    const from = this.where;
    this.trip = null;
    this.where = { ...trip.to };
    this.settle(this.where);
    this.events.emit('tripChanged', null);
    this.emitArrived(from);
    if (away) this.say(`You made it to ${this.nameOf(this.where)} while you were away.`, 'system');
    this.events.emit('mapChanged', this.mapState);

    if (!this.fullyMapped && this.visited.size === Object.keys(this.world.locations).length) {
      this.fullyMapped = true;
      this.say('City grid fully mapped. Every district, every dive.', 'system');
    }
  }

  /** Arriving: a place counts as visited and reveals where its routes lead, and the area around lights up. */
  private settle(where: Whereabouts): void {
    if (where.place) this.visit(this.locationById(where.place));
    this.exploreAround(where);
  }

  /** Walking lifts the fog along the way and turns up any place close by. Ridden stretches don't count. */
  private exploreTrip(now: number): boolean {
    const trip = this.trip;
    if (!trip) return false;
    let changed = false;
    for (const { path, distance } of walkedSoFar(trip, now)) {
      for (let d = 0; d < distance; d += 1.5) changed = this.exploreAround(pointAlong(path, d)) || changed;
      changed = this.exploreAround(pointAlong(path, distance)) || changed;
    }
    return changed;
  }

  private exploreAround(p: Point): boolean {
    let changed = false;
    const reach = Math.ceil(SIGHT / CELL);
    const cx = Math.floor(p.x / CELL);
    const cy = Math.floor(p.y / CELL);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= CELLS || y >= CELLS) continue;
        const cell = y * CELLS + x;
        const center = cellCenter(cell);
        if (this.explored.has(cell) || Math.hypot(center.x - p.x, center.y - p.y) > SIGHT) continue;
        this.explored.add(cell);
        changed = true;
      }
    }
    for (const location of Object.values(this.world.locations)) {
      if (!this.discovered.has(location.id) && Math.hypot(location.x - p.x, location.y - p.y) <= this.rules.discoverRadius) {
        this.discovered.add(location.id);
        changed = true;
      }
    }
    return changed;
  }

  /** Being somewhere reveals everywhere its routes lead. */
  private visit(location: Location): void {
    this.visited.add(location.id);
    this.discovered.add(location.id);
    for (const link of location.links) this.discovered.add(link);
  }

  private emitArrived(from: Whereabouts | null): void {
    const { locations, transit, buildings } = this.world;
    const where = { ...this.where };
    const place: Location | null = (where.place && locations[where.place]) || null;
    const station: Station | null = (where.station && transit.stations[where.station]) || null;
    const building: Building | null = (where.building && buildings.find((b) => b.id === where.building)) || null;
    this.lastAmbient = null;
    this.events.emit('arrived', { from, where, place, station, building, district: this.districtOf(where) });
  }

  private locationById(id: string): Location {
    const location = this.world.locations[id];
    if (!location) throw new Error(`Unknown location "${id}"`);
    return location;
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Whether two spots are the same: the same place, station or building, or the same bit of street. */
function sameSpot(a: Whereabouts, b: Whereabouts): boolean {
  if (a.place || b.place) return a.place === b.place;
  if (a.station || b.station) return a.station === b.station;
  if (a.building || b.building) return a.building === b.building;
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.5;
}
