import { blockAt, canEnter } from './buildings';
import { energyStatus, freshEnergy, spendEnergy, type EnergyRules, type EnergyState, type EnergyStatus } from './energy';
import { EventBus } from './events';
import { menuFor, type FoodContent, type Menu } from './food';
import { describeStranger, FAMILY, fill, kinWord, talkLines, varsFor, type DialogueLines } from './dialogue';
import { drink, freshInebriation, inebriationStatus, type InebriationRules, type InebriationStage, type InebriationState, type InebriationStatus } from './inebriation';
import { generatePeople, localClock, peopleAt, personById, pronounsOf, tiesOf, type Clock, type PeopleContent, type Person, type Population, type Spot, type Tie } from './people';
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
  repOf,
  settleThreat,
  standingOf,
  stanceOf,
  webOf,
  type Fact,
  type IncidentKind,
  type Knowledge,
  type KnownHow,
  type LogEntry,
  type SocietyRules,
  type SocietyState,
  type Stance,
  type Standing,
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
/** Walking lifts the fog this far either side of the player, in map units: the street and the buildings along it. */
const SIGHT = 2.5;
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
  /** The time of day people's days run on. The phone's local time if not said (tests say). */
  clock?: (now: number) => Clock;
}

/** Someone where the player is, and how they feel about the player. */
export interface Presence {
  person: Person;
  doing: string;
  stance: Stance;
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
  /** What the player carries: food and drink from eateries, so far. */
  private readonly items: Item[];
  private eddies: number;
  private passUntil: number;
  private energyState: EnergyState;
  private drunkState: InebriationState;
  /** The stage the player was last told about, so sobering up gets a line as it eases. */
  private drunkStage: InebriationStage | null = null;
  /** Everyone who lives here, made up for this city. */
  readonly population: Population;
  private society: SocietyState;
  private charismaState: SkillState;
  /** Where the player lives. Nowhere yet: once there are homes, one with a bed raises the most energy. */
  private readonly home: { building: string; bed: boolean } | null = null;
  private lastAmbient: AmbientLine | null = null;
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
    this.eddies = progress?.eddies ?? rules.startingEddies;
    this.passUntil = progress?.passUntil ?? 0;
    this.energyState = progress?.energy ? { ...progress.energy } : freshEnergy(rules.energy);
    this.drunkState = progress?.inebriation ? { ...progress.inebriation } : freshInebriation();
    this.population = generatePeople(world, rules.people, rules.food.dishes);
    this.society = progress?.society ? { ...freshSociety(), ...structuredClone(progress.society) } : freshSociety();
    this.charismaState = progress?.charisma ? { ...progress.charisma } : freshSkill();
    // People this city doesn't have (the generator changed) are forgotten.
    const known = new Set(this.population.people.map((p) => p.id));
    for (const id of Object.keys(this.society.standings)) if (!known.has(id)) delete this.society.standings[id];
    for (const id of Object.keys(this.society.known)) if (!known.has(id)) delete this.society.known[id];
    for (const key of Object.keys(this.society.links)) if (!key.split('|').every((id) => known.has(id))) delete this.society.links[key];
    this.society.threats = this.society.threats.filter((t) => !t.by || known.has(t.by));
    this.items = (progress?.items ?? []).map((item) => ({ ...item }));
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
    return { eddies: this.eddies, passUntil: this.passUntil };
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

  /** What's for sale where the player is: inside an eatery, or at a place that serves food. Null elsewhere. */
  menu(): Menu | null {
    const at = this.inside ?? this.location;
    return at ? menuFor(this.world, at, this.rules.food) : null;
  }

  /** Buys something off the menu here, into the inventory. False if it isn't on the menu or the eddies aren't there. */
  buy(id: string, now = Date.now()): boolean {
    const item = this.menu()?.items.find((i) => i.id === id);
    if (!item) return false;
    const barred = this.barred(now);
    if (barred) {
      this.say(barred, 'error');
      return false;
    }
    if (item.price > this.eddies) {
      this.say(`${item.name} is ${item.price} €$. You've got ${this.eddies} €$.`, 'error');
      return false;
    }
    this.eddies -= item.price;
    const owned = this.items.find((i) => i.id === item.id);
    if (owned) owned.count++;
    else this.items.push({ id: item.id, kind: 'consumable', name: item.name, count: 1 });
    this.say(`Bought ${item.name} for ${item.price} €$.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /**
   * Eats or drinks one of something carried. False if there's none, or it isn't for eating.
   * Food and soft drinks do nothing yet; alcohol goes to the head.
   */
  consume(id: string, now: number): boolean {
    const item = this.items.find((i) => i.id === id && i.kind === 'consumable');
    const dish = item ? this.rules.food.dishes.find((d) => d.id === id) : undefined;
    if (!item || !dish) return false;
    item.count--;
    if (item.count <= 0) this.items.splice(this.items.indexOf(item), 1);
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

  /** Everyone where the player is right now. */
  peopleHere(now: number): Presence[] {
    const spot = this.spot;
    if (!spot) return [];
    return peopleAt(this.population, this.world, spot, this.clockAt(now), this.rules.food.dishes).map(({ person, doing }) => ({
      person,
      doing,
      stance: this.stanceOf(person, now),
    }));
  }

  person(id: string): Person | undefined {
    return personById(this.population, id);
  }

  private stanceOf(person: Person, now: number): Stance {
    return stanceOf(attitude(person, this.society, this.rules.society, this.rules.timeScale, now), this.rules.society);
  }

  /** What the player stands with a person, and knows of them. */
  standingWith(id: string, now: number): PersonStanding | null {
    const person = this.person(id);
    if (!person) return null;
    const { society, timeScale } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const score = attitude(person, this.society, society, timeScale, now);
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
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        const a = here[i] as Person;
        const b = here[j] as Person;
        if (!tiesOf(this.population, a.id).some((t) => t.to === b.id)) continue;
        if (learnLink(this.society, a.id, b.id, null, 'seen', now)) learned.push(a.id, b.id);
      }
    }
    if (learned.length) this.events.emit('societyChanged', { people: [...new Set(learned)] });
  }

  /** A person as the player can tell them, and what the player knows of them. */
  describe(id: string): Description | null {
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
    const order: Fact[] = ['job', 'age', 'home', 'likes', 'drinks', 'hates', 'nature'];
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

  /** Why the eatery the player is at won't serve them, if it won't. */
  barred(now: number): string | null {
    const at = this.inside;
    if (!at?.business) return null;
    const { society, timeScale } = this.rules;
    const banned = repOf(this.society, `business:${at.id}`, society, timeScale, now) <= society.rep.banAt || repOf(this.society, `chain:${at.business}`, society, timeScale, now) <= society.rep.banAt;
    return banned ? fill(this.pickLine(this.rules.lines.barred, `${at.id}:barred`), { work: at.name }) : null;
  }

  private isHere(id: string, now: number): Presence | undefined {
    return this.peopleHere(now).find((p) => p.person.id === id);
  }

  private pickLine(lines: string[], salt: string): string {
    const rng = createRng(`${this.world.seed}:${salt}:${this.society.nextId}:${this.society.incidents.length}`);
    return lines.length ? rng.pick(lines) : '';
  }

  private varsFor(person: Person, kin?: Tie): Record<string, string> {
    return varsFor(person, this.world, this.population, this.rules.people, this.rules.food.dishes, kin);
  }

  /** Talks to someone here. What they say depends on how they feel about the player; it warms them a little. */
  talk(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    learnOf(this.society, id, 'met');
    const rng = createRng(`${this.world.seed}:${id}:talk:${standing.talks}`);
    // A line about family names one relative: one the player hasn't heard of yet, if there is one.
    const family = tiesOf(this.population, id).filter((t) => FAMILY.includes(t.kind));
    const untold = family.filter((t) => !linkOf(this.society, id, t.to)?.kind);
    const kin = untold.length ? rng.pick(untold) : family.length ? rng.pick(family) : undefined;
    const vars = this.varsFor(person, kin);
    this.logged(id, 'you', fill(rng.pick(lines.you.talk), vars), now);
    if (stance === 'hostile') {
      const line = fill(rng.pick(lines.refuse), vars);
      this.say(line, 'talk');
      this.logged(id, 'them', line, now);
      changeStanding(this.society, id, { met: true }, society, timeScale, now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    if (standing.lastTalkAt && now - standing.lastTalkAt < (society.talk.cooldownMinutes * 60_000) / timeScale) {
      const line = fill(rng.pick(lines.talkedOut), vars);
      this.say(line, 'talk');
      this.logged(id, 'them', line, now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    const talk = talkLines({ stance, reveal: standing.rapport >= society.talk.revealAt, grudge: standing.grudge }, vars, lines, rng);
    for (const line of talk.said) {
      this.say(`${person.given}: "${line}"`, 'talk');
      this.logged(id, 'them', line, now);
    }
    const learned = [id];
    // Talking is an introduction; what they talk about, the player now knows; a few chats, and the player has their measure.
    learnFact(this.society, id, 'name');
    if (talk.topic === 'job') learnFact(this.society, id, 'job');
    if (talk.topic === 'likes') {
      learnFact(this.society, id, 'likes');
      learnFact(this.society, id, 'drinks');
    }
    if (talk.topic === 'hates') learnFact(this.society, id, 'hates');
    if (standing.talks + 1 >= 3) learnFact(this.society, id, 'nature');
    if (talk.topic === 'kin' && kin) {
      learnLink(this.society, id, kin.to, kin.kind, 'told', now);
      learnOf(this.society, kin.to, 'told');
      learned.push(kin.to);
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
   * Asks someone here about someone the player knows of. Whether they answer depends on how
   * they feel about the player (and the player's charisma); what they say is the truth.
   */
  ask(id: string, aboutId: string, now: number): boolean {
    const here = this.isHere(id, now);
    const other = this.person(aboutId);
    // Only someone the player can name.
    if (!here || !other || aboutId === id || !knowsOf(this.society, aboutId) || !knowledgeOf(this.society, aboutId).facts.includes('name')) return false;
    const { person, stance } = here;
    const { society, timeScale, lines } = this.rules;
    learnOf(this.society, id, 'met');
    const otherPronouns = pronounsOf(other);
    const tie = tiesOf(this.population, id).find((t) => t.to === aboutId);
    const vars = {
      ...this.varsFor(person),
      other: other.given,
      otherHe: otherPronouns.he,
      otherHim: otherPronouns.him,
      OtherHe: capitalize(otherPronouns.he),
      word: tie ? kinWord(person, tie.kind, other) : '',
    };
    const rng = createRng(`${this.world.seed}:${id}:ask:${aboutId}:${now}`);
    this.logged(id, 'you', fill(rng.pick(lines.you.askAbout), vars), now);
    if (!this.answers(stance, rng)) {
      const line = fill(rng.pick(lines.ask.refuse), vars);
      this.say(line, 'talk');
      this.logged(id, 'them', line, now);
      changeStanding(this.society, id, { met: true }, society, timeScale, now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    const line = fill(rng.pick(tie ? lines.ask.knows : lines.ask.unknown), vars);
    this.say(`${person.given}: "${line}"`, 'talk');
    this.logged(id, 'them', line, now);
    if (tie) {
      learnLink(this.society, id, aboutId, tie.kind, 'asked', now);
      learnOf(this.society, aboutId, 'told');
      this.gainCharisma(2);
    } else {
      learnLink(this.society, id, aboutId, 'none', 'asked', now);
    }
    changeStanding(this.society, id, { met: true }, society, timeScale, now);
    this.events.emit('societyChanged', { people: [id, aboutId] });
    return true;
  }

  /** Whether someone answers a question, by how they feel about the player; charisma helps the wary and the cold along. */
  private answers(stance: Stance, rng: { chance(p: number): boolean }): boolean {
    const odds = stance === 'hostile' ? 0 : stance === 'cold' ? 0.25 : stance === 'wary' ? 0.55 : 1;
    return rng.chance(Math.min(1, odds + (this.charismaState.level - 1) * 0.1));
  }

  /** Asks someone here about themselves: their name, work, age, home, tastes or hates. What they say, the player then knows. */
  askFact(id: string, fact: Exclude<Fact, 'nature' | 'drinks'>, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance } = here;
    const { society, timeScale, lines } = this.rules;
    learnOf(this.society, id, 'met');
    const vars = this.varsFor(person);
    const rng = createRng(`${this.world.seed}:${id}:fact:${fact}:${now}`);
    this.logged(id, 'you', `"${lines.questions[fact]}"`, now);
    if (!this.answers(stance, rng)) {
      const line = fill(rng.pick(stance === 'hostile' ? lines.refuse : lines.ask.refuse), vars);
      this.say(line, 'talk');
      this.logged(id, 'them', line, now);
      changeStanding(this.society, id, { met: true }, society, timeScale, now);
      this.events.emit('societyChanged', { people: [id] });
      return true;
    }
    const pool = fact === 'job' && !person.job.building && !person.gang ? lines.facts.freelance : fact === 'home' && !person.home ? lines.facts.homeless : fact === 'hates' && !person.hates ? lines.facts.nobody : lines.facts[fact];
    const line = fill(rng.pick(pool), vars);
    this.say(`${person.given}: "${line}"`, 'talk');
    this.logged(id, 'them', line, now);
    const news = learnFact(this.society, id, fact);
    // Asked what they like, they say what they eat and what they drink.
    if (fact === 'likes') learnFact(this.society, id, 'drinks');
    if (fact !== 'name') learnFact(this.society, id, 'name');
    if (news) this.gainCharisma(2);
    changeStanding(this.society, id, { met: true }, society, timeScale, now);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /** Gives someone here something to eat or drink from the inventory. Their favorite counts double. */
  gift(id: string, itemId: string, now: number): boolean {
    const here = this.isHere(id, now);
    const item = this.items.find((i) => i.id === itemId && i.kind === 'consumable');
    const dish = item ? this.rules.food.dishes.find((d) => d.id === itemId) : undefined;
    if (!here || !item || !dish) return false;
    const { person, stance } = here;
    const { society, timeScale, lines } = this.rules;
    const vars = { ...this.varsFor(person), item: dish.name };
    const rng = createRng(`${this.world.seed}:${id}:gift:${now}`);
    if (stance === 'hostile') {
      const line = fill(rng.pick(lines.gift.refuse), vars);
      this.say(line, 'talk');
      this.logged(id, 'you', fill(rng.pick(lines.you.gift), vars), now);
      this.logged(id, 'them', line, now);
      this.events.emit('societyChanged', { people: [id] });
      return false;
    }
    item.count--;
    if (item.count <= 0) this.items.splice(this.items.indexOf(item), 1);
    const standing = standingOf(this.society, id, society, timeScale, now);
    const favorite = dish.id === person.likes.dish || dish.id === person.likes.drink;
    // The second gift of the day means half as much.
    const recent = standing.lastGiftAt && now - standing.lastGiftAt < (24 * HOUR) / timeScale;
    const gain = Math.round((favorite ? society.gift.favorite : society.gift.base) * (recent ? 0.5 : 1) * this.charisma().bonus);
    const thanks = fill(rng.pick(favorite ? lines.gift.favorite : lines.gift.thanks), vars);
    this.say(`${person.given}: "${thanks}"`, 'talk');
    learnOf(this.society, id, 'met');
    this.logged(id, 'you', fill(rng.pick(lines.you.gift), vars), now);
    this.logged(id, 'them', thanks, now);
    if (favorite) learnFact(this.society, id, dish.id === person.likes.dish ? 'likes' : 'drinks');
    changeStanding(this.society, id, { met: true, rapport: gain, gifts: standing.gifts + 1, lastGiftAt: now }, society, timeScale, now);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('societyChanged', { people: [id] });
    this.gainCharisma(3);
    return true;
  }

  /** Insults someone here. They, and the people who hear of it, think less of the player; a temper answers in kind. */
  insult(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person } = here;
    const { society, timeScale, lines } = this.rules;
    const vars = this.varsFor(person);
    const rng = createRng(`${this.world.seed}:${id}:insult:${now}`);
    const fallout = this.incident('insult', person, 0, now);
    learnOf(this.society, id, 'met');
    changeStanding(this.society, id, { met: true, rapport: -society.insult.rapport }, society, timeScale, now);
    this.logged(id, 'you', fill(rng.pick(lines.you.insult), vars), now);
    const reply = fill(rng.pick(lines.insult.reply), vars);
    this.say(reply, 'talk');
    this.logged(id, 'them', reply, now);
    if (person.traits.temper > 0.55 && rng.chance(person.traits.temper)) {
      const shove = fill(rng.pick(lines.insult.shove), vars);
      this.say(shove, 'error');
      this.logged(id, 'them', shove, now);
      this.drainEnergy(1, now);
    }
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
    const { person } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const rng = createRng(`${this.world.seed}:${id}:rob:${now}`);
    const emptied = standing.robbedAt && now - standing.robbedAt < (7 * 24 * HOUR) / timeScale;
    const fought = !emptied && rng.chance(person.traits.courage * 0.5);
    const take = emptied ? 0 : Math.round(person.eddies * rng.range(0.4, 0.8) * (fought ? 0.5 : 1));
    const vars = { ...this.varsFor(person), take: String(take) };
    const fallout = this.incident('robbery', person, take, now);
    learnOf(this.society, id, 'met');
    changeStanding(this.society, id, { met: true, robbedAt: now }, society, timeScale, now);
    this.logged(id, 'you', fill(rng.pick(lines.you.rob), vars), now);
    const outcome = fill(rng.pick(take ? (fought ? lines.rob.fought : lines.rob.done) : lines.rob.nothing), vars);
    this.logged(id, 'them', outcome, now);
    if (take) {
      this.eddies += take;
      this.say(outcome, 'system');
      if (fought) this.drainEnergy(2, now);
      this.events.emit('walletChanged', this.wallet);
    } else {
      this.say(outcome);
    }
    const witnesses = this.peopleHere(now).filter((p) => p.person.id !== id).length;
    if (witnesses) this.say(`${witnesses === 1 ? 'Someone' : `${witnesses} people`} saw that. Word will get around ${this.world.districts[person.district]?.name ?? 'the district'}.`, 'system');
    const work = person.job.building ? this.world.buildings.find((b) => b.id === person.job.building) : undefined;
    if (work && repOf(this.society, `business:${work.id}`, society, timeScale, now) <= society.rep.banAt) this.say(`${work.name} won't be serving you again.`, 'system');
    this.events.emit('societyChanged', { people: fallout });
    return true;
  }

  /** Writes an incident down and spreads it; returns everyone it touched, the victim first. */
  private incident(kind: IncidentKind, victim: Person, took: number, now: number): string[] {
    const { society, timeScale, people } = this.rules;
    const witnesses = this.peopleHere(now).map((p) => p.person.id).filter((pid) => pid !== victim.id);
    const rng = createRng(`${this.world.seed}:incident:${this.society.nextId}`);
    const fallout = applyIncident(this.society, this.population, { at: now, kind, victim: victim.id, witnesses, district: victim.district, took }, society, timeScale, now, rng, {
      // A chain is a business with its own fixed menu: every outlet hears about it.
      chainOf: (p) => {
        const building = p.job.building ? this.world.buildings.find((b) => b.id === p.job.building) : undefined;
        return building?.business && this.rules.food.fixed[building.business] ? building.business : null;
      },
      rivalsOf: (gang) => people.gangs[gang]?.rivals ?? [],
    });
    return [victim.id, ...fallout.affected.map((a) => a.id).filter((pid) => pid !== victim.id)];
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
      const gang = threat.gang ? people.gangs[threat.gang] : undefined;
      const take = Math.min(this.eddies, threat.amount);
      const vars = { ...(by ? this.varsFor(by) : {}), gang: gang?.name ?? '', take: String(take), where: this.nameOf(this.where) };
      const rng = createRng(`${this.world.seed}:threat:${threat.id}`);
      this.events.emit('fx', { effect: 'shake' });
      const hit = fill(rng.pick(by ? lines.revenge.person : lines.revenge.gang), vars);
      this.say(hit, 'error');
      if (by) this.logged(by.id, 'them', hit, now);
      this.eddies -= take;
      this.drainEnergy(Infinity, now);
      settleThreat(this.society, threat, society, timeScale, now);
      this.events.emit('walletChanged', this.wallet);
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
    if (fare > this.eddies) {
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
      this.eddies -= fare;
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
    this.soberUp(now);
    this.settleThreats(now);
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
  enter(): boolean {
    const building = this.door;
    if (!building) return false;
    this.inside = building;
    this.events.emit('interiorChanged', building);
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
    if (this.eddies < passPrice) {
      this.say(`A monthly pass costs ${passPrice} €$. You've got ${this.eddies} €$.`, 'error');
      return false;
    }
    this.eddies -= passPrice;
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
