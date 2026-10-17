import { blockAt, canEnter } from './buildings';
import { energyAt, energyStatus, freshEnergy, spendEnergy, type EnergyRules, type EnergyState, type EnergyStatus } from './energy';
import { EventBus } from './events';
import { changeRoom, loadOf, loads, newChipId, newPocketId, outfit, placeFor, pocketGrams, totalGrams, walletRoom, type GearContent, type PocketLoad, type PocketState, type Style } from './carry';
import { chromeStatus, chromeStockFor, fitCheck, implantDetail, implantOf, type ChromeStatus, type Fitted } from './cyberware';
import { NO_EDGE, perkFamily, perksAt, trainedEdge, RANGES, resolveBeat, stepRange, talkOdds, theirMove, worth, type Arm, type Arms, type BeatEvent, type ClassRules, type CombatContent, type Edge, type FightClass, type Fighter, type FightOutcome, type FightState, type FightView, type FinishKind, type FinishRules, type JoinRules, type HealthStatus, type Meter, type Move, type Perk, type Range, type WeaponMastery } from './combat';
import { accountOf, holderOf as ownerNow, homeKind as blockKind, leftOf, ledgerOf, ownersOf, priceFactor, staffCostOf, stockOf, tillOf, tradeAt, turfFrom, weekdayOf, type BusinessView, type Health, type MarketNews, type PriceLevel, type Vice } from './economy';
import { crewSize, freshRunner, frontRunner, leanOdds, runnerDay, runnerLeft, runnerShort, settle, writeOff, type Runner, type RunnerView } from './crew';
import { dependenceAt, edgeAt, effectsAt, freshHabit, overdoseOdds, stageAt, takeDose, type HabitState, type HabitView } from './habit';
import { cutShare, foundOdds, harmOdds, mixedShare, sickOdds } from './cutting';
import { askOf, blockOf, buyersIn, canMoveUp, dealRungOf, drugLevel, freshDealing, habitOf, heatAt, owedFor, pushOdds, streetPrice, withInterest, type CollectorView, type DealChoice, type DealingRules, type DealingState, type DealMomentView, type DealOption, type DealState, type DealView, type Front, type Habit } from './dealing';
import { cash, changeCoins as coinsToBills, chipCut, deposit as toAccount, freshMoney, payCash, splitLoot, takeCash, withdraw as fromAccount, type Money, type MoneyRules } from './money';
import { drawQuality, menuFor, priceFor, type FoodContent, type Menu, type MenuItem, type Quality, type Venue } from './food';
import { medDetail, medTotal, TREATMENT, type Coverage, type CoverageStatus, type MedicalStock, type MedKind } from './medical';
import { answer, compose, deflect, describeStranger, drawnWord, eloquenceOf, FAMILY, fill, finish, historyOf, saidIn, kinWord, line, momentOf, moodOf, openness, openTopics, reactionTo, repeat, replyTo, smallTalk, textOf, varsFor, voiceOf, type Approach, type DialogueLines, type Line, type Question, type Speaker, type Topic } from './dialogue';
import { drink, freshInebriation, inebriationStatus, type InebriationRules, type InebriationStage, type InebriationState, type InebriationStatus } from './inebriation';
import { bossAt, bossOf, canPromote, ladderFor, lineOf, nextRung, overlaps, overnight, rungOf, shiftDay, shiftOpen, shiftPay, startOf, type JobRules, type JobState, type JobStatus, type Ladder, type Rung, type ShiftChoice, type ShiftEventKind } from './jobs';
import { applyLife, freshLife, heldBy, learned, liveUntil, newsFor, scenesAt, type Held, type LifeEvent, type LifeRules, type LifeState, type Scene } from './life';
import { forgetMemories, GRIEVANCES, memoriesOf, memoryAge, memoryOf, recall, recalled, regard, remember, type Memory } from './memory';
import { chargesFor, freshPolice, issueWarrant, policing, warrantsAt, worstCrime, type Confrontation, type Crime, type Dispatch, type PoliceChoice, type PoliceContent, type PoliceState, type PoliceView } from './police';
import { floorsOf, mainRoom, roomById, roomOf, roomsOn, unitOf, walkableFloors, type Lodging, type Room, type RoomAccess, type RoomsContent, type RoomsView } from './rooms';
import { stackIn, stashFits, stashLoad, type HomeKind, type HomeRules, type HomeState, type HomeView } from './home';
import { creditLimit, honestyOf, loanAmounts, type CreditRules, type CreditState } from './credit';
import { tradeKindOf, valuableOf, worthOf, type TradeKind, type TradeRules } from './trade';
import { buildingById, GUARD_ROLE, openingHours, rotaStaff, readOf, skillsOf, walkOf, type PersonSkills, dreamOf, drawnTo, generatePeople, handleOf, heartOf, hospitalOf, hospitalsOf, isCorpo, nearestHospital, isNetrunner, localClock, peopleAt, personById, pronounsOf, sexOf, tiesOf, whereIs, type Clock, type Heart, type PeopleContent, type Person, type Population, type Pronouns, type Spot, type Tie, type TieKind } from './people';
import { dateHour, freshRomance, type RomanceMove, type RomanceStage, type You } from './romance';
import { createRng, type Rng } from './rng';
import { ammoFor, drawWeapon, isGun, isLong, newWeaponId, stockFor, weaponDetail, weaponOf } from './weapons';
import { freshSkill, gainXp, skillBonus, skillEdge, skillStatus, xpToNext, type SkillRules, type SkillState, type SkillStatus } from './skills';
import {
  applyIncident,
  attitude,
  changeRep,
  changeStanding,
  dueThreats,
  freshSociety,
  heardFrom,
  knowledgeOf,
  knownPeople,
  learnFact,
  learnLink,
  learnOf,
  linkOf,
  logLine,
  passGoodWord,
  pinIncident,
  relearnLink,
  repOf,
  saidBy,
  settleThreat,
  STANCE_LABEL,
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
import { districtAt, subdistrictAt, WORLD } from './geography';
import { eat, fillOf, freshHunger, hungerStatus, type HungerStage, type HungerState, type HungerStatus, type NeedsRules } from './needs';
import type { Progress } from './save';
import { pointAlong, snapToStreet } from './streets';
import { planTrip, startTrip, tripProgress, walkedSoFar, type TravelRules } from './travel';
import type {
  AmbientLine,
  Building,
  BuildingCategory,
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
export const CELLS = Math.ceil(WORLD / CELL);
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
/** The market where the player is, for the status drop-down: what's dearer or cheaper than usual in the district, and the latest headlines. */
export interface MarketView {
  district: string;
  prices: Array<{ goods: string; change: number }>;
  news: Array<{ text: string; ago: string }>;
}

export interface GameRules extends TravelRules {
  energy: EnergyRules;
  food: FoodContent;
  inebriation: InebriationRules;
  people: PeopleContent;
  society: SocietyRules;
  lines: DialogueLines;
  charisma: SkillRules;
  /** Trading: what the player pays and gets, against the seller's own. Without it (the tests' rules leave it out), prices are as they're set and nobody learns to trade. */
  trading?: SkillRules;
  /** What things weigh and what they're carried in. */
  gear: GearContent;
  /** How eddies change hands: cash, change, transfers, the bank's cut. */
  money: MoneyRules;
  /** Where the player can work, and how far up. */
  jobs: JobRules;
  /** Fighting: the ways of fighting, the clock, what people carry, what chrome does. */
  combat: CombatContent;
  /** The people's own days: what happens between them, and what they're seen doing together. */
  life: LifeRules;
  /** The time of day people's days run on. The phone's local time if not said (tests say). */
  clock?: (now: number) => Clock;
  /** Opening hours: counters shut while nobody who works them is in. Not said, every counter is always open. */
  hours?: HoursRules;
  /** The rooms inside buildings. Without them (the tests' rules leave them out), a building is one room, as it was. */
  rooms?: RoomsContent;
  /** The player's home: renting or squatting, the rent, the stash (missing: nowhere to live). */
  home?: HomeRules;
  /** Borrowing and lending: a bank's loans, a gang's loan shark, lending to people (missing: none of it). */
  credit?: CreditRules;
  /** Selling to the stores and fencing valuables (missing: nobody buys off the player). */
  trade?: TradeRules;
  /** Eating and resting: hunger on the clock, and energy back faster in a bed (missing: the player never goes hungry, and rests anywhere alike). */
  needs?: NeedsRules;
  /** The NCPD: who calls it in, how fast it comes, warrants. Without it (the tests' rules leave it out), nobody ever calls. */
  police?: PoliceContent;
  /** Who throws in on a fight. Without it (the tests' rules leave it out), every fight is the player and one other. */
  join?: JoinRules;
  /** Dealing for a gang: the drugs, who fronts them, the rungs, the corner, debts. Without it, nobody deals and nobody has a habit. */
  dealing?: DealingRules;
}

/** Whether counters keep the hours of whoever works them, and how many hours ahead to look for when one opens. */
export interface HoursRules {
  close: boolean;
  ahead: number;
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
  /** Their sex, plain to see ("Female", "Male · goes by they"). */
  sex: string;
  /** How they strike the player as a fighter, plain to see ("Harmless", "Dangerous"); as a talker once they've talked a few times, else null. */
  fight: string;
  talk: string | null;
}

const HOUR = 3_600_000;

/** What a night's room is on a motel's or a capsule hotel's menu. */
export const ROOM_FOR_THE_NIGHT = 'room-for-the-night';

/** A fight, between beats. */
interface Fight {
  with: string;
  state: FightState;
  indoors: boolean;
  startedAt: number;
  /** When the player's time to choose runs out. */
  deadline: number;
  /** What they'll do this beat, drawn when it began; and what gave it away, if the player caught it. */
  next: Move;
  tell: string | null;
  /** What's happened, a beat to an entry; and the beat being told. */
  log: string[];
  beatLines: string[];
  revived: boolean;
  /** The launcher in the palm has been fired. */
  launched: boolean;
  nerve: { courage: number; temper: number };
  /** Who here could have put a name to the player's face when it began: what a call names them by. */
  knew: Set<string>;
  /** Everyone else in it: more of theirs, and anyone on the player's side. */
  others: Combatant[];
  /** Who it was with first, and whether the player went for them (an assault on them) or they for the player. */
  started: string;
  byYou: boolean;
  /** Whoever's been dealt with (down, out, gone), and what was said of those the player went for along the way. */
  settled: Set<string>;
  notes: string[];
  over: FightOutcome | null;
  result: string;
}

/** Someone else in a fight of more than two: of theirs, or on the player's side (`ally`); who they're fighting (`mark`: `you`, or someone's id) and how far off; their move to come. */
interface Combatant {
  id: string;
  ally: boolean;
  fighter: Fighter;
  range: Range;
  mark: string;
  next: Move;
  nerve: { courage: number; temper: number };
}

/** Bare hands. */
const FISTS: Arm = { id: 'fists', name: 'Fists', short: 'fists', cls: 'fists', magazine: 0 };
/** The jobs that come armed and armored. */
const GUARD = GUARD_ROLE;
/** The NCPD's own. */
const NCPD = /^NCPD /;
/** A way of starting a chat as someone remembering it says it: "liked your joke". */
const WAY_WORDS: Record<string, string> = { joke: 'joke', compliment: 'compliment', gossip: 'gossip', care: 'concern', flirt: 'flirting' };
/** What an attack is called, by what it's made with. */
const VERB: Record<ClassRules['kind'], string> = { gun: 'Shoot', blade: 'Slash', blunt: 'Strike', fists: 'Punch', wire: 'Lash', launcher: 'Fire' };
/** Which lines tell a hit, by what it's made with. */
const HIT_LINE: Record<ClassRules['kind'], string> = { gun: 'Shoot', blade: 'Cut', blunt: 'Bash', fists: 'Punch', wire: 'Lash', launcher: 'Blast' };
const RANGE_LABEL: Record<Range, string> = { reach: 'Arm\'s reach', close: 'Close', far: 'Far' };

/** Where the player stood with someone before an exchange: their regard, any grudge, their stance, and the player's charisma. */
interface Snapshot {
  rapport: number;
  grudge: number;
  spark: number;
  stance: Stance;
  level: number;
  xp: number;
}

/** A copy of plain save data, the way a save is read back. */
function copyOf<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

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
  /** How full the player was when it was last written down, and the stage they were last told of. */
  private hungerState: HungerState;
  private hungerTold: HungerStage | null = null;
  /** Everyone who lives here, made up for this city. */
  readonly population: Population;
  private society: SocietyState;
  private charismaState: SkillState;
  /** The fighting skills: Street Brawler (blows landed bare-handed) and Toughness (blows taken). */
  private brawlerState: SkillState;
  /** Trading: buying and selling. */
  private tradingState: SkillState;
  /** The Dealing and Cutting skills. */
  private dealerState: SkillState;
  private cutterState: SkillState;
  private toughnessState: SkillState;
  /** How well the player knows each kind of weapon, and each weapon. */
  private armsState: Arms;
  /** Whoever's been knocked out cold, till when and where they lie (not saved: they come to). */
  private readonly outColdState = new Map<string, { until: number; spot: Spot; room: string }>();
  /** The room the player is in, inside a building (`main` is the one you walk into). */
  private roomState = 'main';
  /** The units someone has let the player into, this time inside. */
  private readonly letIn = new Set<string>();
  /** The room the player has rented at a motel or a capsule hotel, and till when. */
  private lodgingState: Lodging | null;
  /** The jobs the player holds: the main one, and any side gigs, none whose hours clash with another's. */
  private jobs: JobState[];
  /** Shifts worked in each line of work (by the ladder's key), the experience a new job starts higher with. */
  private career: Record<string, number>;
  /** The people's own days so far, and what everyone started with in eddies, for earning it back. */
  private life: LifeState;
  /** The player, as people see them: the pronouns they go by. */
  private you: You;
  /** The chrome a ripperdoc has fitted into the player. */
  private fitted: Fitted[];
  /** The player's health as last written down (it comes back on the clock). */
  private healthState: Meter;
  /** What the NCPD has on the player: reports, a unit on its way, warrants, officers here, a hold. */
  private policeState: PoliceState;
  /** The NCPD's officers, found once a city. */
  private officerList: Person[] | null = null;
  /** Everyone's own levels, worked out as they're needed: again on a new day, or after a fight. */
  private readonly skillCache = new Map<string, { day: number; fights: number; skills: PersonSkills }>();
  /** The player's dealing for a gang: the one they deal for now, any they walked away from or were cut off by. */
  private dealState: DealingState;
  /** The player's own habit: what they've taken, what's working, how dependent they are, the edge. */
  private habitState: HabitState;
  /** A buyer at the player's corner, waiting on an answer (not saved: they don't wait). */
  private dealMomentState: { kind: 'buy' | 'robber' | 'rivals'; gang?: string; person: string; drug: string; ask: number; pay: number; short: boolean; regular: boolean; tab?: boolean; undercover?: boolean; at: number; text: string } | null = null;
  /** A collector on the player, waiting on an answer (not saved: they come back for it). */
  private collectState: { by: string; gang: string; at: number } | null = null;
  /** The drugs dealt in each district, everyone's habit, and who has one by district and drug: worked out once a city. */
  private readonly dealtCache = new Map<string, Set<string>>();
  private readonly habitCache = new Map<string, Habit | null>();
  private userIndex: Map<string, Person[]> | null = null;
  /** The fight the player is in, or has just finished. */
  private fightState: Fight | null = null;
  /** Whether the player fights to kill; they don't unless they say so. */
  private lethalOn: boolean;
  /** The Trauma Team plan the player is on, if any (it may have run out). */
  private coverage: Coverage | null;
  private readonly baseEddies: ReadonlyMap<string, number>;
  /** Where the player lives, and what they keep there: a rented home has a bed, which raises the most energy. */
  private homeState: HomeState | null;
  private stashItems: Item[];
  /** What the player owes (a bank, a loan shark) and is owed (by the people they've lent to). */
  private creditState: CreditState;
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
    this.hungerState = progress?.hunger ? { ...progress.hunger } : rules.needs ? freshHunger(rules.needs.hunger) : { value: 100, updatedAt: 0 };
    this.population = generatePeople(world, rules.people, rules.food.dishes);
    this.baseEddies = new Map(this.population.people.map((p) => [p.id, p.eddies]));
    // The days the people have had since the city was made are put back onto them. Copied the
    // way a save is read (JSON): a structured clone of a record with a key per person makes
    // every first write to it slow in V8, which stalled the first day lived after loading for seconds.
    this.life = progress?.life ? { ...freshLife(), ...copyOf(progress.life) } : freshLife();
    // Who owns what is the city's as it was made, so it's worked out before the days are put back.
    ownersOf(world, this.population, rules.life.economy, world.seed);
    applyLife(this.population, this.life);
    // The storefronts' rotas, with the jobs as the days have left them.
    if (rules.people.shifts) rotaStaff(this.population, this.world, rules.people.shifts);
    this.society = progress?.society ? { ...freshSociety(), ...copyOf(progress.society) } : freshSociety();
    this.charismaState = progress?.charisma ? { ...progress.charisma } : freshSkill();
    this.brawlerState = progress?.brawler ? { ...progress.brawler } : freshSkill();
    this.tradingState = progress?.trading ? { ...progress.trading } : freshSkill();
    this.dealerState = progress?.dealer ? { ...progress.dealer } : freshSkill();
    this.cutterState = progress?.cutter ? { ...progress.cutter } : freshSkill();
    this.toughnessState = progress?.toughness ? { ...progress.toughness } : freshSkill();
    this.armsState = { types: { ...progress?.arms?.types }, models: { ...progress?.arms?.models } };
    // Before anything works out the player's health: a dose can change the most of it.
    this.habitState = progress?.habit ? { ...freshHabit(), ...copyOf(progress.habit) } : freshHabit();
    // Saves from before the player said otherwise go by they.
    this.you = progress?.you ? { ...progress.you } : { pronouns: 'they' };
    // Implants the game no longer has are gone, and one fitted twice is fitted once.
    const implants = rules.gear.chrome.implants;
    this.fitted = (progress?.chrome ?? []).filter((f, i, all) => f.id in implants && all.findIndex((g) => g.id === f.id) === i).map((f) => ({ ...f }));
    // Saves from before fighting start the player well; from before the NCPD, with nothing on record.
    this.healthState = progress?.health ? { ...progress.health } : { value: this.maxHealth(), at: 0 };
    this.policeState = progress?.police ? { ...freshPolice(), ...copyOf(progress.police) } : freshPolice();
    this.lethalOn = progress?.lethal ?? false;
    this.dealState = progress?.dealing ? { ...freshDealing(), ...copyOf(progress.dealing) } : freshDealing();
    this.coverage = progress?.coverage ? { ...progress.coverage } : null;
    // A job at a place this city doesn't have, or that doesn't hire anymore, is no job (an older save has one, as `job`).
    const held = progress?.jobs ?? (progress?.job ? [progress.job] : []);
    this.jobs = held.flatMap((j) => {
      const workplace = world.buildings.find((b) => b.id === j.building);
      return workplace && ladderFor(workplace, rules.jobs) ? [{ ...j, ...(j.days ? { days: [...j.days] } : {}) }] : [];
    });
    this.career = { ...(progress?.career ?? {}) };
    // People this city doesn't have (the generator changed) are forgotten.
    const known = new Set(this.population.people.map((p) => p.id));
    for (const id of Object.keys(this.society.standings)) if (!known.has(id)) delete this.society.standings[id];
    for (const id of Object.keys(this.society.known)) if (!known.has(id)) delete this.society.known[id];
    for (const key of Object.keys(this.society.links)) if (!key.split('|').every((id) => known.has(id))) delete this.society.links[key];
    this.society.threats = this.society.threats.filter((t) => !t.by || known.has(t.by));
    forgetMemories(this.society, known);
    if (this.society.romance && !known.has(this.society.romance.with)) this.society.romance = null;
    // Dealing for a connect this city doesn't have is no dealing; customers it doesn't have are forgotten.
    const dealt = this.dealState.current;
    if (dealt && (!known.has(dealt.connect) || !rules.dealing?.gangs[dealt.gang])) this.dealState.current = null;
    else if (dealt) dealt.customers = Object.fromEntries(Object.entries(dealt.customers).filter(([id]) => known.has(id)));
    // So are runners it doesn't have.
    for (const id of Object.keys(this.dealState.crew)) if (!known.has(id)) delete this.dealState.crew[id];
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
    // The room they were in, if the building still has it; a unit they were let into, they're still let into.
    const room = this.inside && progress?.room && rules.rooms ? roomById(this.inside, progress.room, rules.rooms) : null;
    this.roomState = room?.id ?? 'main';
    if (room?.kind === 'unit') this.letIn.add(room.id);
    this.lodgingState = progress?.lodging ? { ...progress.lodging } : null;
    // A home in a building the city has, and what's kept there; no home, nothing kept anywhere.
    const home = progress?.home && world.buildings.some((b) => b.id === progress.home?.building) ? progress.home : null;
    this.homeState = home ? { ...home } : null;
    this.stashItems = home ? (progress?.stash ?? []).map((item) => ({ ...item })) : [];
    this.creditState = progress?.credit ? copyOf(progress.credit) : { bank: null, barred: false, shark: null, lent: {} };
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
    // The coins go first, so the room for change is what's left once they're out of the pocket.
    const spent = { ...this.money, coins: this.money.coins - Math.min(this.money.coins, price) };
    const room = changeRoom(this.pockets, this.items, spent, this.rules.gear, this.rules.food.dishes);
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

  /** The player's energy at `now`: refilled on the clock since it was last spent, and capped by hunger. */
  energy(now: number): EnergyStatus {
    return energyStatus(this.energyState, this.rules.energy, this.rules.timeScale, this.hasBed, now, this.hunger(now)?.energy ?? 1);
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
    const spent = spendEnergy(this.energyState, amount, this.rules.energy, this.rules.timeScale, this.hasBed, now, this.hunger(now)?.energy ?? 1);
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
    return Boolean(this.homeState && !this.homeState.squat);
  }

  // ───────────── Needs ─────────────

  /** How hungry the player is at `now` (null in a city without hunger). */
  hunger(now: number): HungerStatus | null {
    const rules = this.rules.needs?.hunger;
    return rules ? hungerStatus(this.hungerState, rules, this.rules.timeScale, now) : null;
  }

  get hungerSaved(): HungerState {
    return { ...this.hungerState };
  }

  /** Whether the player is resting where they are: energy comes back faster here. */
  resting(now: number): boolean {
    return this.restRate(now) > 1;
  }

  /** How many times as fast as usual energy comes back where the player is: in a bed (their own, or a room rented for the night), in a squat, or anywhere else. */
  private restRate(now: number): number {
    const rest = this.rules.needs?.rest;
    if (!rest || !this.inside) return 1;
    if (this.atHome()) return this.hasBed ? rest.bed : rest.squat;
    const room = this.rented(now);
    return room && room.building === this.inside.id && (!this.rules.rooms || this.roomState === room.room) ? rest.bed : 1;
  }

  /**
   * Writes energy and health down as they are at `now`, before anything that would let them
   * come back faster or hold more (eating, lying down): what came back before then came back
   * as it did.
   */
  private settleMeters(now: number): void {
    const cap = this.hunger(now)?.energy ?? 1;
    this.energyState = { ...this.energyState, current: energyAt(this.energyState, this.rules.energy, this.rules.timeScale, this.hasBed, now, cap), updatedAt: now };
    this.healthState = { value: this.healthAt(now), at: now };
  }

  /** Resting or not: when where the player is changes how fast energy comes back, it's written down at the old rate first. */
  private rest(now: number): void {
    const rate = this.restRate(now);
    if (rate === (this.energyState.rate ?? 1)) return;
    this.settleMeters(now);
    const { rate: _was, ...state } = this.energyState;
    this.energyState = rate === 1 ? state : { ...state, rate };
    this.events.emit('energyChanged', this.energy(now));
  }

  /** Getting hungrier on the clock: a line as each stage sets in (and none for one the player was already in when they came back). */
  private getHungry(now: number): void {
    const status = this.hunger(now);
    if (!status || status.stage === this.hungerTold) return;
    const worse = status.stage && (!this.hungerTold || status.stage.below < this.hungerTold.below);
    this.hungerTold = status.stage;
    if (worse && status.stage) this.say(status.stage.down, 'system');
    this.events.emit('energyChanged', this.energy(now));
    this.events.emit('healthChanged', this.health(now));
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

  /** The pocket with room for one of something (or `count`, all together), if any. */
  private pocketFor(item: Pick<Item, 'id' | 'kind' | 'gear' | 'weapon' | 'loaded'>, count = 1): string | null {
    return placeFor(this.pockets, this.items, this.money, item, count, this.rules.gear, this.rules.food.dishes);
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
    // Failing room anywhere, the roomiest thing worn takes it (never a tank top with no pockets).
    const worn = this.pockets.filter((p) => p.in === null && this.rules.gear.kinds[p.kind]?.holds === undefined);
    const fallback = [...worn].sort((a, b) => (this.rules.gear.kinds[b.kind]?.slots ?? 0) - (this.rules.gear.kinds[a.kind]?.slots ?? 0))[0] ?? this.pockets[0];
    for (const item of [...this.items]) {
      if (item.in && ids.has(item.in)) continue;
      const others = this.items.filter((i) => i !== item);
      this.putAway(this.items, item, placeFor(this.pockets, others, this.money, item, item.count, this.rules.gear, this.rules.food.dishes) ?? fallback?.id);
    }
  }

  /** What's for sale where the player is: an eatery's menu, a store's rack, a ripperdoc's chrome, or nothing. */
  menu(now = Date.now()): Menu | null {
    const at = this.inside ?? this.location;
    if (!at || !this.atCounter() || !this.counterOpen(at, now) || this.detained(now)) return null;
    const counter = this.counterMenu(at, now);
    if (!counter) return null;
    const menu = 'block' in at ? this.marketPriced(counter, at, now) : counter;
    // At work, the staff price; anywhere else, what the player's Trading gets them against the seller's.
    return this.jobs.some((j) => j.building === at.id) || this.owns(at.id) ? this.staffPriced(menu) : this.haggled(menu, at, now);
  }

  /**
   * A storefront's menu as its shelves have it: how many of each thing are left, and its prices
   * by supply and demand (dearer as the shelves empty, cheaper at a slow place sitting on full
   * ones) and, in an eatery's last hour, a share off what won't keep. A chain's and a hospital's
   * prices are set; a service is never short.
   */
  private marketPriced(menu: Menu, building: Building, now: number): Menu {
    const economy = this.rules.life.economy;
    const till = this.life.tills[building.id];
    const set = Boolean(building.business && this.rules.food.fixed[building.business]) || building.business === 'hospital';
    const factor = set ? 1 : priceFactor(stockOf(till), this.trade(building).health, economy);
    const closing = !set && economy.prices.closing.categories.includes(building.category) && this.closingSoon(building, now) ? economy.prices.closing.off : 0;
    const services = new Set(['plan', 'treatment', 'room']);
    // The player's own place, at the prices they've set.
    const mine = this.life.owned?.[building.id];
    const level = mine ? (economy.business?.levels[mine.prices]?.price ?? 1) : 1;
    const by = factor * (1 - closing) * level;
    return {
      ...menu,
      ...(Math.round((factor - 1) * 100) ? { market: factor - 1 } : {}),
      ...(closing ? { closing } : {}),
      items: menu.items.map((i) => (services.has(i.kind) ? i : { ...i, left: leftOf(i.id, i.price, till, economy), price: Math.max(1, Math.round(i.price * by)) })),
    };
  }

  /** Whether a storefront is in its last hours (`prices.closing.hours`) before it shuts. */
  private closingSoon(building: Building, now: number): boolean {
    const hours = this.hoursOf(building);
    if (!hours || hours === 'always') return false;
    const left = (((hours[1] - this.clockAt(now).hour) % 24) + 24) % 24;
    return left > 0 && left <= this.rules.life.economy.prices.closing.hours;
  }

  /** A menu at the staff price: the player's own workplace takes a share off everything but Trauma Team's plans. */
  private staffPriced(menu: Menu): Menu {
    const off = this.rules.jobs.perks.discount;
    return { ...menu, staff: off, items: menu.items.map((i) => (i.kind === 'plan' ? i : { ...i, price: Math.max(1, Math.round(i.price * (1 - off))) })) };
  }

  /**
   * A counter's prices as the player's Trading gets them, against the seller's (the sharpest of
   * the hands there; a stall's vendor, ordinary): over or under, to `MONEY.haggle`'s power. A
   * chain's prices are set, and so are a hospital's, Trauma Team's and a room for the night.
   */
  private haggled(menu: Menu, at: Building | Location, now: number): Menu {
    const building = 'block' in at ? at : null;
    if ((building?.business && this.rules.food.fixed[building.business]) || building?.business === 'hospital') return menu;
    const factor = this.haggleFactor(at, now);
    if (Math.abs(factor - 1) < 0.005) return menu;
    const fixed = new Set(['plan', 'treatment', 'room']);
    return { ...menu, haggle: factor - 1, items: menu.items.map((i) => (fixed.has(i.kind) ? i : { ...i, price: Math.max(1, Math.round(i.price * factor)) })) };
  }

  /** What a counter's Trading against the player's does to its prices (over 1, dearer), and what the hands in remember of them; 1 without Trading. */
  private haggleFactor(at: Building | Location, now: number): number {
    const rules = this.rules.trading;
    const power = this.rules.money.haggle ?? 0;
    if (!rules || !power) return 1;
    const building = 'block' in at ? at : null;
    const staff = building ? this.staffOf(building) : [];
    const seller = staff.reduce((best, p) => Math.max(best, this.skillsFor(p, now).trading), staff.length ? 1 : rules.average);
    // And what the hands in remember of the player: a friend's price from the fondest, a sore one's from the sorest.
    const clock = this.clockAt(now);
    const ins = staff.filter((p) => whereIs(p, this.world, clock, this.rules.food.dishes, this.rules.people.out)?.spot.id === building?.id);
    const regards = ins.map((p) => this.regardOf(p.id, now));
    const lean = (this.rules.money.regard ?? 0) * (Math.max(0, ...regards) - Math.max(0, ...regards.map((r) => -r)));
    return Math.pow(skillBonus(rules, seller) / skillBonus(rules, this.tradingState.level), power) * (1 - lean);
  }

  /** What a counter sells, open or not. */
  private counterMenu(at: Building | Location, now: number): Menu | null {
    return menuFor(this.world, at, this.rules.food) ?? this.rack(at, now);
  }

  /** Who works at a building, the living of them, from the staff kept below. */
  private readonly livingStaff = (id: string): Person[] => {
    const building = buildingById(this.world, id);
    return building ? this.staffOf(building).filter((p) => p.diedOn === undefined) : [];
  };
  /** The people who work at a storefront, kept until a day is lived (when hires, layoffs and deaths change them). */
  private readonly staffCache = new Map<string, Person[]>();
  private staffOf(building: Building): Person[] {
    let staff = this.staffCache.get(building.id);
    if (!staff) this.staffCache.set(building.id, (staff = this.population.people.filter((p) => p.job.building === building.id)));
    return staff;
  }

  /**
   * Whether a counter is open: with opening hours on, a storefront's only while someone who
   * works there is in (its rota keeps one that never closes staffed round the clock); a hospital
   * always, and a place of its own (a market, a stall) never closes.
   */
  private counterOpen(at: Building | Location, now: number): boolean {
    // Gone under: nobody's behind the counter till new management takes it on.
    if ('block' in at && this.life.closed?.[at.id]) return false;
    if (!this.rules.hours?.close || !('block' in at) || !at.business || at.business === 'hospital') return true;
    // Keys: the player's own counter, high enough up the ladder (or their own place), is open to them whoever's in.
    if (this.owns(at.id) || this.jobs.some((j) => j.building === at.id && j.rung >= this.rules.jobs.perks.keys)) return true;
    const clock = this.clockAt(now);
    return this.staffOf(at).some((p) => {
      const where = whereIs(p, this.world, clock, this.rules.food.dishes, this.rules.people.out);
      return where?.spot.kind === 'building' && where.spot.id === at.id;
    });
  }

  /**
   * The counter in here, if it's shut for now: what it would be (a menu, a rack, a bank) and
   * when someone's next in, to the hour (null: nobody is, as far ahead as `hours.ahead` looks).
   */
  closed(now = Date.now()): { what: 'menu' | 'shop' | 'bank'; opensAt: number | null; down?: boolean } | null {
    const at = this.inside;
    if (!at || this.counterOpen(at, now)) return null;
    const menu = this.counterMenu(at, now);
    const what = menu ? (menu.kind === 'gear' ? 'shop' : 'menu') : at.business === 'bank' ? 'bank' : null;
    if (!what) return null;
    return this.life.closed?.[at.id] ? { what, opensAt: null, down: true } : { what, opensAt: this.opensAgain(at, now) };
  }

  /** When someone who works a counter is next in, to the hour (null: nobody is, as far ahead as `hours.ahead` looks). */
  private opensAgain(at: Building, now: number): number | null {
    const HOUR_MS = 3_600_000;
    const from = Math.floor(now / HOUR_MS) * HOUR_MS;
    for (let k = 1; k <= (this.rules.hours?.ahead ?? 0); k++) if (this.counterOpen(at, from + k * HOUR_MS)) return from + k * HOUR_MS;
    return null;
  }

  /**
   * A storefront locked up for now, with opening hours on: nobody who works there is in, so the
   * shutters are down, and when someone's next in. A hospital never locks, nor does the player's
   * own workplace to them, in their shift's hours or with its keys. Null: the door is open.
   */
  locked(building: Building, now = Date.now()): { opensAt: number | null; down?: boolean } | null {
    // Gone under: locked to everyone, the player's own job there included (it went with the place).
    if (building.business && this.life.closed?.[building.id]) return { opensAt: null, down: true };
    if (!building.business || this.counterOpen(building, now)) return null;
    const hour = this.clockAt(now).hour;
    if (this.jobs.some((j) => j.building === building.id && shiftOpen(hour, ladderFor(building, this.rules.jobs)?.hours ?? [0, 0]))) return null;
    return { opensAt: this.opensAgain(building, now) };
  }

  /** A storefront's opening hours as its door says them (null: it keeps none, or the city has none). */
  hoursOf(building: Building): [number, number] | 'always' | null {
    const shifts = this.rules.people.shifts;
    if (!this.rules.hours?.close || !building.business || !shifts) return null;
    return openingHours(building, shifts);
  }

  /** The medical counter where the player is, if there's one: what it does (meds, treatment, Trauma Team's plans), and the key it's kept under. */
  medical(): { key: string; stock: MedicalStock } | null {
    const at = this.inside ?? this.location;
    const key = at ? this.chromeKey(at) : null;
    const stock = key ? this.rules.gear.medical.stores[key] : undefined;
    return key && stock ? { key, stock } : null;
  }

  /** What a store's chrome is kept under: a storefront's business, or the kind of place (a ripperdoc's clinic is either). */
  private chromeKey(at: Building | Location): string | null {
    return 'business' in at ? at.business : at.kind;
  }

  /**
   * A store's rack: garments at their own price, bags priced by how good a store it is; at a
   * weapon store, its guns or blades at their own price and boxes of rounds priced like the
   * bags; at a ripperdoc or a chrome dealer (a storefront, or a clinic that's a place of its
   * own), its implants at their own price; at a hospital, a clinic or a ripperdoc, treatment
   * for what's missing of the player's health, and meds and Trauma Team's plans where they're sold.
   */
  private rack(at: Building | Location, now: number): Menu | null {
    const { gear, food } = this.rules;
    const business = 'business' in at ? at.business : null;
    const key = business && (gear.racks[business] || gear.arms.stores[business]) ? business : null;
    const chromeKey = this.chromeKey(at);
    const chrome = chromeKey ? gear.chrome.stores[chromeKey] : undefined;
    const hackStock = business ? gear.hacks.stores[business] : undefined;
    const care = chromeKey ? gear.medical.stores[chromeKey] : undefined;
    // A motel's or a capsule hotel's desk rents its rooms by the night.
    const rent = business && this.rules.rooms ? this.rules.rooms.rent[business] : undefined;
    // Components a store racks, the cutting agent among them (only where there's dealing).
    const parts = business && this.rules.dealing ? Object.entries(gear.components).filter(([, c]) => c.stores.includes(business)) : [];
    if (!key && !chrome && !hackStock && !care && !rent && !parts.length) return null;
    const ids = key ? (gear.racks[key] ?? []) : [];
    const stock = key ? gear.arms.stores[key] : undefined;
    // A clothing store sells at its tier; a store with only bags on the rack prices them the way its district eats.
    const quality = (key ? gear.quality[key] : undefined) ?? drawQuality(this.world, at);
    const venue: Venue = { id: at.id, name: at.name, district: at.district, kindLabel: at.kindLabel, quality, chain: false };
    // The chrome first, then the weapons, then the rounds, then whatever carries them.
    const implants = chrome ? chromeStockFor(this.world.seed, at.id, quality, chrome, gear.chrome) : [];
    const ware = implants.flatMap((id): MenuItem[] => {
      const implant = gear.chrome.implants[id];
      return implant ? [{ id, name: implant.name, note: implant.note, kind: 'cyberware', price: implant.price, detail: implantDetail(implant, gear.chrome) }] : [];
    });
    // A quickhack dealer has every program its tier sells, a tier up as well.
    const hackTiers = new Set(gear.hacks.tiers[quality]);
    if (hackStock?.up) for (const t of gear.hacks.tiers[quality === 'poverty' ? 'everyday' : 'luxury']) hackTiers.add(t);
    const programs = hackStock
      ? Object.entries(gear.hacks.hacks)
          .filter(([, h]) => hackTiers.has(h.quality))
          .sort(([, a], [, b]) => a.type.localeCompare(b.type) || a.price - b.price)
          .map(([id, h]): MenuItem => ({ id, name: h.name, note: h.note, kind: 'quickhack', price: h.price, detail: `${h.type} · ${h.ram} RAM` }))
      : [];
    const arms = stock ? stockFor(this.world.seed, at.id, at.district, quality, stock, gear.arms) : [];
    const weapons = arms.flatMap((id): MenuItem[] => {
      const weapon = gear.arms.weapons[id];
      if (!weapon) return [];
      const detail = [weaponDetail(weapon, gear.arms), weapon.magazine ? `${weapon.magazine} rounds` : '', gear.arms.classes[weapon.class]?.long ? 'Needs a bag' : ''].filter(Boolean).join(' · ');
      return [{ id, name: weapon.name, note: weapon.note, kind: 'weapon', price: weapon.price, detail }];
    });
    const ammo = stock?.ammo
      ? Object.entries(gear.arms.ammo).map(([id, a]): MenuItem => ({ id, name: a.name, note: a.note, kind: 'ammo', price: priceFor(a.price, quality, food), detail: `Box of ${a.box} · ${a.for}` }))
      : [];
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
    // Patching up first, when there's anything to patch; then the meds; then Trauma Team.
    const health = this.health(now);
    const missing = health.max - health.current;
    const treatment: MenuItem[] =
      care?.treats && missing > 0
        ? [{ id: TREATMENT, name: gear.medical.treatment.name, note: gear.medical.treatment.note, kind: 'treatment', price: priceFor(missing * gear.medical.perPoint, quality, food), detail: `${missing} health to full` }]
        : [];
    // A plan with a discount on prescriptions takes it off the meds.
    const off = this.covered(now)?.plan.medsOff ?? 0;
    const meds = care?.meds ? Object.entries(gear.medical.meds).map(([id, m]): MenuItem => ({ id, name: m.name, note: m.note, kind: 'med', price: Math.max(1, Math.round(priceFor(m.price, quality, food) * (1 - off))), detail: medDetail(m) })) : [];
    const plans = care?.plans ? Object.entries(gear.medical.plans).map(([id, p]): MenuItem => ({ id, name: p.name, note: p.note, kind: 'plan', price: p.price, detail: `Trauma Team · ${p.days} days` })) : [];
    const room = rent && 'block' in at ? this.roomToRent(at) : null;
    const lodging: MenuItem[] = rent && room ? [{ id: ROOM_FOR_THE_NIGHT, name: rent.name, note: rent.note, kind: 'room', price: priceFor(rent.price, quality, food), detail: `${room.name} · till noon` }] : [];
    const components = parts.map(([id, c]): MenuItem => ({ id, name: c.name, note: c.note, kind: 'component', price: priceFor(c.price, quality, food) }));
    const all = [...lodging, ...treatment, ...ware, ...meds, ...plans, ...programs, ...weapons, ...ammo, ...items, ...components];
    return all.length ? { venue, items: all, kind: 'gear' } : null;
  }

  /** The room a motel's or a capsule hotel's desk would hand the player tonight: the one they have, else one drawn for the night. */
  private roomToRent(building: Building): Room | null {
    const rules = this.rules.rooms;
    if (!rules) return null;
    const had = this.lodgingState?.building === building.id ? roomById(building, this.lodgingState.room, rules) : null;
    if (had) return had;
    const floors = walkableFloors(building, rules);
    const rng = createRng(`${building.id}:rent:${this.clockAt(Date.now()).day}`);
    const guests = roomsOn(building, rng.int(1, floors), rules).filter((r) => r.kind === 'guest');
    return guests.length ? rng.pick(guests) : null;
  }

  /** Whether the player can pay for something on the menu here: in cash, or by transfer where the counter takes one. */
  affords(id: string, now = Date.now()): boolean {
    const menu = this.menu(now);
    const item = menu?.items.find((i) => i.id === id);
    return Boolean(menu && item && this.canPay(item.price, this.takesTransfers(menu)));
  }

  /** Whether the player can pay the NCART this much: in cash, or by transfer. */
  affordsFare(amount: number): boolean {
    return this.canPay(amount, this.rules.money.transfers.ncart);
  }

  /** What buying something off a menu puts in a pocket: a dish, a garment to wear later, a weapon (its magazine full only if it's sold loaded), or a box of rounds. */
  private protoFor(item: MenuItem): Pick<Item, 'id' | 'kind' | 'gear' | 'weapon' | 'loaded'> {
    if (item.kind === 'clothing') return { id: item.id, kind: 'clothing', gear: item.id };
    if (item.kind === 'weapon') {
      const weapon = this.rules.gear.arms.weapons[item.id];
      return { id: item.id, kind: 'weapon', weapon: item.id, ...(weapon && isGun(weapon, this.rules.gear.arms) ? { loaded: weapon.disposable ? (weapon.magazine ?? 0) : 0 } : {}) };
    }
    if (item.kind === 'ammo') return { id: item.id, kind: 'ammo' };
    if (item.kind === 'cyberware') return { id: item.id, kind: 'cyberware' };
    if (item.kind === 'quickhack') return { id: item.id, kind: 'quickhack' };
    if (item.kind === 'component') return { id: item.id, kind: 'component' };
    return { id: item.id, kind: 'consumable' };
  }

  /** How many of something one purchase is: a box of rounds, else one. */
  private boxOf(item: MenuItem): number {
    return item.kind === 'ammo' ? (this.rules.gear.arms.ammo[item.id]?.box ?? 1) : 1;
  }

  /** Why the player can't buy something here, or null if they can: it isn't for sale, they're barred, short of eddies, or out of room. */
  canBuy(id: string, now = Date.now()): string | null {
    const menu = this.menu(now);
    const item = menu?.items.find((i) => i.id === id);
    const shut = this.closed(now);
    if (shut) return shut.down ? 'Closed down. Nobody works here any more.' : shut.opensAt === null ? 'Closed. Nobody works the counter any more.' : `Closed. Nobody's behind the counter till ${clockWord(shut.opensAt, this.clockAt(shut.opensAt))}.`;
    if (!menu || !item) return 'Not for sale here.';
    const barred = this.barred(now);
    if (barred) return barred;
    // A ripperdoc fits what it sells there and then: it wants the room in the body, not a pocket.
    const fitting = item.kind === 'cyberware' && this.clinic(now) !== null;
    if (fitting) {
      const why = this.cantFit(item.id);
      if (why) return why;
    }
    // A program is a program: one copy runs as well as two.
    if (item.kind === 'quickhack' && this.items.some((i) => i.kind === 'quickhack' && i.id === item.id)) return `You've got ${item.name} already.`;
    if (item.left === 0) return `Sold out of ${item.name}. The shelves fill again when the next delivery comes.`;
    if (!this.canPay(item.price, this.takesTransfers(menu))) return this.shortBy(item.name, item.price, this.takesTransfers(menu));
    // Treatment and a plan are services: nothing to carry.
    const service = item.kind === 'treatment' || item.kind === 'plan' || item.kind === 'room';
    if (item.kind !== 'gear' && !service && !fitting && !this.pocketFor(this.protoFor(item), this.boxOf(item))) {
      const proto = this.protoFor(item);
      // Something long wants a bag that takes it, and the pockets of your clothes never will.
      if (isLong(proto, this.rules.gear.arms)) return `No room for the ${item.name}: it's too long for a pocket. It wants a bag with room: a messenger bag, a backpack, a duffel or a gun case.`;
      if (item.kind === 'ammo') return `No room for a box of ${item.name}: a box wants a slot with room for its weight. Drop something, or carry a bag.`;
      if (item.kind === 'cyberware') return `No room to carry the ${item.name}: it wants a slot with room for its weight. Drop something, or carry a bag.`;
      return `No room for ${item.name}: your pockets are full. Eat something, or drop something.`;
    }
    return null;
  }

  /** Buys something off the menu here: a dish into a pocket with room, or a bag to wear. False, and why, if it can't be. */
  buy(id: string, now = Date.now()): boolean {
    const menu = this.menu(now);
    const item = menu?.items.find((i) => i.id === id);
    if (!menu || !item) return false;
    const why = this.canBuy(id, now);
    if (why) {
      this.say(why, 'error');
      return false;
    }
    // What's bought goes in its pocket before it's paid for, so the change only comes back where there's room left for it.
    const pockets = [...this.pockets];
    const items = this.items.map((i) => ({ ...i }));
    const fitted = [...this.fitted];
    const chromed = item.kind === 'cyberware' && this.clinic(now) !== null;
    let bought: string;
    const on = this.covered(now);
    const plan = item.kind === 'plan' ? this.rules.gear.medical.plans[item.id] : undefined;
    const renting = item.kind === 'room' && this.inside ? this.roomToRent(this.inside) : null;
    if (item.kind === 'treatment') {
      bought = `Treated for ${item.price} €$: back to full health.`;
    } else if (renting && this.rules.rooms) {
      bought = `${this.narration(this.rules.rooms.lines.rented, { room: renting.name }, createRng(`${this.world.seed}:rent:${now}`))} (${item.price} €$)`;
    } else if (plan) {
      bought = on?.id === item.id ? `Renewed ${plan.name} for ${item.price} €$: ${plan.days} more days.` : `Signed up with Trauma Team for ${item.price} €$: ${plan.name}, ${plan.days} days.${on ? ` It replaces your ${on.plan.name}.` : ''}`;
    } else if (chromed) {
      bought = `Bought the ${item.name} for ${item.price} €$, and the doc fits it there and then.${this.fitIn(item.id, now)}`;
    } else if (item.kind === 'gear') {
      this.pockets.push({ id: newPocketId(item.id, this.pockets), kind: item.id, in: null });
      bought = `Bought a ${item.name.toLowerCase()} for ${item.price} €$. More room.`;
    } else if (item.kind === 'weapon') {
      // Each weapon is its own thing, with its own magazine.
      const proto = this.protoFor(item);
      const weapon = this.rules.gear.arms.weapons[item.id];
      const pocket = this.pocketFor(proto) ?? undefined;
      this.items.push({ ...proto, id: newWeaponId(item.id, this.items), name: item.name, count: 1, in: pocket });
      const rounds = weapon ? ammoFor(weapon, this.rules.gear.arms) : null;
      const where = this.pockets.find((p) => p.id === pocket);
      const whereName = where ? this.rules.gear.kinds[where.kind]?.name.toLowerCase() : '';
      const tail = !weapon || !rounds ? '' : weapon.disposable ? ` It comes loaded: ${weapon.magazine} rounds, and no reloading it.` : ` Empty: it takes ${this.rules.gear.arms.ammo[rounds]?.name ?? 'ammo'}, loaded from the inventory.`;
      bought = `Bought the ${item.name} for ${item.price} €$${whereName ? `, into your ${whereName}` : ''}.${tail}`;
    } else {
      const proto = this.protoFor(item);
      const count = this.boxOf(item);
      const pocket = this.pocketFor(proto, count) ?? undefined;
      const owned = this.items.find((i) => i.id === item.id && i.kind === proto.kind && i.in === pocket);
      if (owned) owned.count += count;
      else this.items.push({ id: item.id, kind: proto.kind, name: item.name, count, in: pocket, ...(proto.gear ? { gear: proto.gear } : {}) });
      bought = item.kind === 'ammo' ? `Bought a box of ${item.name} for ${item.price} €$: ${count} rounds.` : `Bought ${item.name} for ${item.price} €$.${proto.gear ? ' Put it on from the inventory.' : ''}`;
    }
    if (!this.pay(item.price, this.takesTransfers(menu))) {
      this.pockets.splice(0, this.pockets.length, ...pockets);
      this.items.splice(0, this.items.length, ...items);
      this.fitted = fitted;
      return false;
    }
    // Spent at a storefront, it's in the till when the day is lived, and one fewer is on its shelves till they're stocked again.
    if (this.inside?.business && menu.venue.id === this.inside.id) {
      const till = tillOf(this.life.tills, this.inside.id);
      till.pending += item.price;
      if (item.left !== undefined) till.bought = { ...till.bought, [item.id]: (till.bought?.[item.id] ?? 0) + 1 };
    }
    if (item.kind === 'treatment') this.healthState = { value: this.maxHealth(), at: now };
    // The same plan again runs on from when it ends; another starts now, in its place.
    if (plan) this.coverage = { plan: item.id, until: (on?.id === item.id ? on.until : now) + plan.days * DAY };
    // A night's room is the player's till noon: the next noon, or this one when it's still the small hours.
    if (renting && this.inside) {
      const hour = this.clockAt(now).hour;
      const hours = hour < 6 ? 12 - hour : 36 - hour;
      const from = this.rented(now)?.room === renting.id ? (this.lodgingState?.until ?? now) : now;
      this.lodgingState = { building: this.inside.id, room: renting.id, until: Math.max(from, now + hours * HOUR) };
    }
    this.say(bought, 'system');
    // Every purchase is a little Trading experience, where there's a price to talk.
    if (!['plan', 'treatment'].includes(item.kind)) this.trainTrading(this.rules.money.tradeXp ?? 0);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    if (chromed) this.events.emit('chromeChanged', this.chrome());
    if (item.kind === 'treatment') this.events.emit('healthChanged', this.health(now));
    if (plan) this.events.emit('coverageChanged', this.covered(now));
    return true;
  }

  /**
   * Puts on a garment carried in a pocket (`from`, when there's one in more than one). What was worn in that slot comes off and goes in a
   * pocket with room (or stays where you stand, if there is none); whatever was in its
   * pockets, the wallet included, moves to pockets with room first, or the swap is off.
   */
  wear(itemId: string, now = Date.now(), from?: string): boolean {
    const { gear, food } = this.rules;
    const item = this.items.find((i) => i.id === itemId && i.kind === 'clothing' && (from === undefined || i.in === from));
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
    // The pockets inside it (the wallet) need a slot and the weight for them somewhere worn, the new garment first; never a holster or a gun case.
    for (const p of inner) {
      p.in = null;
      const grams = pocketGrams(p, pockets, items, this.money, gear, food.dishes);
      const home = [fresh, ...pockets].find((q) => {
        const k = gear.kinds[q.kind];
        if (q === p || q.in !== null || !k || k.only || k.holds !== undefined) return false;
        const load = loadOf(q, pockets, items, this.money, gear, food.dishes);
        return k.slots > load.slots && load.grams + grams <= k.maxGrams;
      });
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
    // The loose change rides in whatever's on the legs: new legwear has to bear it.
    const freshLoad = loadOf(fresh, pockets, items, this.money, gear, food.dishes);
    if (kind.change && this.money.coins > 0 && freshLoad.grams > kind.maxGrams) {
      this.say(`The ${kind.name} won't bear the weight of your coins (${this.money.coins} €$). Change them for bills at a bank first.`, 'error');
      return false;
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

  /** Drops one of something carried (from the pocket `from`, when it's in more than one), for good: room for something else; loose rounds go all at once. False if there's none. */
  drop(id: string, from?: string): boolean {
    const item = this.items.find((i) => i.id === id && (from === undefined || i.in === from));
    if (!item) return false;
    if (item.kind === 'ammo') {
      this.items.splice(this.items.indexOf(item), 1);
      this.say(`You drop ${item.count} ${item.count === 1 ? 'round' : 'rounds'} of ${item.name}.`);
    } else {
      this.takeOne(item);
      this.say(`You drop the ${item.name}.`);
    }
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  // ───────────── Cyberware ─────────────

  /** The chrome in the player: each implant with its part of the body, and the capacity it takes of what there is. */
  chrome(): ChromeStatus {
    return chromeStatus(this.fitted, this.rules.gear.chrome.capacity, this.rules.gear.chrome);
  }

  /** The chrome fitted, for saving. */
  get chromeSaved(): Fitted[] {
    return this.fitted.map((f) => ({ ...f }));
  }

  /** The ripperdoc the player is at (a storefront or a clinic of its own), and its fee for fitting chrome bought elsewhere, or taking chrome out. Null anywhere else. */
  clinic(now = Date.now()): { name: string; fee: number } | null {
    const at = this.inside ?? this.location;
    const key = at ? this.chromeKey(at) : null;
    if (!at || !key || !this.rules.gear.chrome.stores[key]?.fits || !this.atCounter() || !this.counterOpen(at, now)) return null;
    return { name: at.name, fee: priceFor(this.rules.gear.chrome.fitting, drawQuality(this.world, at), this.rules.food) };
  }

  /** Why an implant can't go in, or null if it can: it's in already, or it would take more capacity than is left. */
  private cantFit(id: string): string | null {
    const { chrome } = this.rules.gear;
    const check = fitCheck(this.fitted, id, chrome.capacity, chrome);
    if (check.ok) return null;
    const implant = chrome.implants[id];
    if (!implant) return 'The doc has never heard of it.';
    if (check.why === 'fitted') return `You've got the ${implant.name} in you already.`;
    return `Not enough capacity for the ${implant.name}: it takes ${implant.capacity}, and you've ${Math.max(0, check.left)} left of ${chrome.capacity}.`;
  }

  /**
   * Fits an implant there and then (the check has passed). A part with every slot taken gives
   * up the implant fitted there longest: it comes out into a pocket with room, or, with none,
   * the doc keeps it. What to say about that, if anything.
   */
  private fitIn(id: string, now: number): string {
    const { chrome } = this.rules.gear;
    const check = fitCheck(this.fitted, id, chrome.capacity, chrome);
    if (!check.ok) return '';
    let out = '';
    if (check.replaces) {
      const old = chrome.implants[check.replaces];
      const name = old?.name ?? check.replaces;
      this.fitted = this.fitted.filter((f) => f.id !== check.replaces);
      const item: Item = { id: check.replaces, kind: 'cyberware', name, count: 1 };
      const home = this.pocketFor(item);
      const stack = home ? this.items.find((i) => i.id === item.id && i.kind === 'cyberware' && i.in === home) : undefined;
      if (stack) stack.count++;
      else if (home) this.items.push({ ...item, in: home });
      const pocket = this.pockets.find((p) => p.id === home);
      out = pocket ? ` The ${name} comes out, into your ${this.rules.gear.kinds[pocket.kind]?.name.toLowerCase() ?? 'pocket'}.` : ` The ${name} comes out, and with no room to carry it, the doc keeps it.`;
    }
    this.fitted = [...this.fitted, { id, since: now }];
    return out;
  }

  /** Why a ripperdoc can't fit an implant the player carries (from the pocket `from`), or null if one can: not at a clinic, barred, no room in the body, or short of the fee. */
  canInstall(id: string, now = Date.now(), from?: string): string | null {
    const item = this.items.find((i) => i.id === id && i.kind === 'cyberware' && (from === undefined || i.in === from));
    const implant = item ? implantOf(item, this.rules.gear.chrome) : null;
    if (!item || !implant) return 'Nothing like that on you.';
    const clinic = this.clinic();
    if (!clinic) return 'Only a ripperdoc can fit chrome. Take it to one.';
    const barred = this.barred(now);
    if (barred) return barred;
    const why = this.cantFit(id);
    if (why) return why;
    const transfers = this.rules.money.transfers.gear;
    return this.canPay(clinic.fee, transfers) ? null : this.shortBy(`Fitting the ${implant.name}`, clinic.fee, transfers);
  }

  /** Has the ripperdoc here fit an implant the player carries, for the fee. False, and why, if it can't be. */
  install(id: string, now = Date.now(), from?: string): boolean {
    const why = this.canInstall(id, now, from);
    const clinic = this.clinic();
    const item = this.items.find((i) => i.id === id && i.kind === 'cyberware' && (from === undefined || i.in === from));
    if (why || !clinic || !item) {
      this.say(why ?? 'Nothing like that on you.', 'error');
      return false;
    }
    // Out of the pocket first, so the room it leaves can take what comes out in its place.
    const items = this.items.map((i) => ({ ...i }));
    const fitted = [...this.fitted];
    this.takeOne(item);
    const out = this.fitIn(id, now);
    if (!this.pay(clinic.fee, this.rules.money.transfers.gear)) {
      this.items.splice(0, this.items.length, ...items);
      this.fitted = fitted;
      return false;
    }
    if (this.inside?.business) tillOf(this.life.tills, this.inside.id).pending += clinic.fee;
    this.say(`The doc fits the ${item.name}: ${clinic.fee} €$.${out}`, 'system');
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('chromeChanged', this.chrome());
    return true;
  }

  /** Why a ripperdoc can't take an implant out, or null if one can: not at a clinic, barred, nowhere to carry it, or short of the fee. */
  canUninstall(id: string, now = Date.now()): string | null {
    const implant = this.fitted.some((f) => f.id === id) ? this.rules.gear.chrome.implants[id] : undefined;
    if (!implant) return "That isn't in you.";
    const clinic = this.clinic();
    if (!clinic) return 'Only a ripperdoc takes chrome out.';
    const barred = this.barred(now);
    if (barred) return barred;
    if (!this.pocketFor({ id, kind: 'cyberware' })) return `No room to carry the ${implant.name} once it's out. Make room first.`;
    const transfers = this.rules.money.transfers.gear;
    return this.canPay(clinic.fee, transfers) ? null : this.shortBy(`Taking out the ${implant.name}`, clinic.fee, transfers);
  }

  /** Has the ripperdoc here take an implant out, for the fee: it goes in a pocket with room. False, and why, if it can't be. */
  uninstall(id: string, now = Date.now()): boolean {
    const why = this.canUninstall(id, now);
    const clinic = this.clinic();
    const implant = this.rules.gear.chrome.implants[id];
    if (why || !clinic || !implant) {
      this.say(why ?? "That isn't in you.", 'error');
      return false;
    }
    const items = this.items.map((i) => ({ ...i }));
    const fitted = [...this.fitted];
    const home = this.pocketFor({ id, kind: 'cyberware' }) ?? undefined;
    const stack = this.items.find((i) => i.id === id && i.kind === 'cyberware' && i.in === home);
    if (stack) stack.count++;
    else this.items.push({ id, kind: 'cyberware', name: implant.name, count: 1, in: home });
    this.fitted = this.fitted.filter((f) => f.id !== id);
    if (!this.pay(clinic.fee, this.rules.money.transfers.gear)) {
      this.items.splice(0, this.items.length, ...items);
      this.fitted = fitted;
      return false;
    }
    if (this.inside?.business) tillOf(this.life.tills, this.inside.id).pending += clinic.fee;
    const pocket = this.pockets.find((p) => p.id === home);
    this.say(`The doc takes out the ${implant.name}: ${clinic.fee} €$. It goes in your ${pocket ? (this.rules.gear.kinds[pocket.kind]?.name.toLowerCase() ?? 'pocket') : 'pocket'}.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('chromeChanged', this.chrome());
    return true;
  }

  // ───────────── Fighting ─────────────

  /** The player's health at `now`: back on the clock since it was last written down. */
  health(now: number): HealthStatus {
    const max = this.maxHealth(now);
    const { regenPerHour } = this.rules.combat.health;
    const value = this.healthAt(now);
    const fullAt = value >= max ? null : now + ((max - value) / regenPerHour) * (HOUR / this.rules.timeScale);
    return { current: Math.floor(value), max, fullAt };
  }

  /** Health at `now`, fractions included: back on the clock since it was last written down, never over the most. */
  private healthAt(now: number): number {
    const { regenPerHour } = this.rules.combat.health;
    return Math.min(this.maxHealth(now), this.healthState.value + (Math.max(0, now - this.healthState.at) / HOUR) * this.rules.timeScale * regenPerHour);
  }

  /** Health as it was last written down, for saving. */
  get healthSaved(): Meter {
    return { ...this.healthState };
  }

  /** The most health the player has: the base, and more for chrome that gives it. */
  private maxHealth(now = Date.now()): number {
    const bonus = this.fitted.reduce((sum, f) => sum + (this.rules.combat.chrome[f.id]?.health ?? 0), 0);
    return Math.round(this.rules.combat.health.base * (1 + bonus) * this.habitNow(now).maxHealth * (this.hunger(now)?.health ?? 1));
  }

  /** Whether the player fights to kill (true) or to wound; kept between fights. */
  get lethal(): boolean {
    return this.lethalOn;
  }

  /** Fights to kill, or to wound, from now on: in a fight it counts from the next blow. */
  setLethal(on: boolean): void {
    if (on === this.lethalOn) return;
    this.lethalOn = on;
    this.say(on ? 'You fight to kill now.' : 'You fight to wound: nobody dies at your hand.', 'system');
    if (this.fightState) this.events.emit('fightChanged', this.fightView());
  }

  /** The Trauma Team plan the player is on at `now`, or null (none, or it ran out). */
  covered(now: number): CoverageStatus | null {
    const c = this.coverage;
    const plan = c ? this.rules.gear.medical.plans[c.plan] : undefined;
    return c && plan && c.until > now ? { id: c.plan, plan, until: c.until } : null;
  }

  /** The Trauma Team plan, as last written down, for saving. */
  get coverageSaved(): Coverage | null {
    return this.coverage ? { ...this.coverage } : null;
  }

  /** The meds the player carries, the strongest first: what a Heal in a fight would take. */
  private medsOnHand(): Array<{ item: Item; med: MedKind }> {
    const { meds } = this.rules.gear.medical;
    return this.items
      .filter((i) => i.kind === 'consumable' && meds[i.id])
      .map((item) => ({ item, med: meds[item.id]! }))
      .sort((a, b) => b.med.heal - a.med.heal || medTotal(b.med) - medTotal(a.med));
  }

  /** Whether a fight is on (one that's over waits on the player to look away from it). */
  get fighting(): boolean {
    return Boolean(this.fightState && !this.fightState.over);
  }

  /** Who the fight is with, if there's one to show. */
  get fightWith(): string | null {
    return this.fightState?.with ?? null;
  }

  /**
   * Goes for someone here. They fight back with whatever they carry (a gun, a blade, chrome,
   * their fists), and it's an assault on them, the way an incident goes: seen by whoever's
   * here, known by the face unless there's a mask over it. Then it goes a beat at a time
   * (`fightMove`), both moves at once, the player against the clock.
   */
  attack(id: string, now: number): boolean {
    if (this.fighting || this.trip || this.heldAt(now)) return false;
    // With officers on the player, the only one to go for is an officer.
    const confront = this.policeState.confront;
    if (confront && !confront.officers.includes(id)) return false;
    // With a collector on them, the only one to go for is the collector.
    if (this.collectState && this.collectState.by !== id) return false;
    const here = this.isHere(id, now);
    if (!here || here.person.diedOn !== undefined) return false;
    this.openFight(here, now, null);
    return true;
  }

  /**
   * A fight with someone here: one the player starts (`lead` null: an assault, the way an
   * incident goes, and whoever saw it may call it in), or one they do, told by `lead` (someone
   * stepping in to stop the player: no incident of the player's, they started it).
   */
  private openFight(here: Presence, now: number, lead: string | null): void {
    const { person, stance, doing } = here;
    const id = person.id;
    const { society, timeScale } = this.rules;
    const indoors = Boolean(this.inside);
    const health = this.health(now);
    const range: Range = 'close';
    const them = this.fighterOf(person);
    const ram = this.ramMax();
    const state: FightState = { range, beat: 0, you: { ...this.yourFighter(range, 1), hp: health.current, max: health.max }, them, ram, ramMax: ram, ramSpent: 0 };
    const before = this.snapshot(person, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    // Who could name the player, before this makes them known to the victim.
    const knew = this.facesHere(now);
    const fallout = lead === null ? this.incident('assault', person, 0, now) : [id];
    learnOf(this.society, id, 'met');
    changeStanding(this.society, id, this.masked() ? {} : { met: true }, society, timeScale, now);
    this.fightState = { with: id, state, indoors, startedAt: now, deadline: now, next: 'attack', tell: null, log: [], beatLines: [], revived: false, over: null, result: '', launched: false, nerve: { courage: person.traits.courage, temper: person.traits.temper }, knew, others: [], started: id, byYou: lead === null, settled: new Set(), notes: [] };
    if (lead === null) this.fightLine('start', person, { ...speaker.vars, ...this.fightVars(person, state.you, state.them) });
    else this.fightState.beatLines.push(lead);
    // Whoever here throws in, on one side or the other.
    this.joinFight(now, true);
    this.closeBeat();
    this.nextBeat(person, now);
    if (lead === null) {
      // Whoever saw it go for a phone, or don't; the one it's done to, once it's over.
      this.crime('assault', person, now, knew, 'witnesses');
      this.noteFeedback(person, before, now, this.masked() ? this.rules.lines.notes.masked : '', speaker.vars);
      this.checkFired(now);
    }
    this.events.emit('societyChanged', { people: fallout });
    this.events.emit('fightChanged', this.fightView());
  }

  /** Someone's side of a fight, fresh: their health, what they carry and the rounds for it, their armor. */
  private fighterOf(person: Person): Fighter {
    const { combat } = this.rules;
    const arm = this.armOf(person);
    const hp = this.healthOf(person);
    return { hp, max: hp, arm, loaded: arm.magazine, spare: arm.magazine * combat.spareMags, armor: this.armorOf(person), covered: false, blind: 0, jammed: 0, crippled: 0, chromeOff: 0, burn: 0, burning: 0, regen: 0, regening: 0, charges: combat.classes[arm.cls]?.charges ?? 0 };
  }

  /**
   * What someone other than the player brings to a fight: a smart gun's tracking, how hard
   * they are to knock out by nature, and their own levels, counted the way the player's are
   * (Street Brawler, Toughness, and the kind of weapon in hand, its perks with it).
   */
  private edgeOf(person: Person, fighter: Fighter): Edge {
    const skills = this.skillsFor(person);
    const base = { ...NO_EDGE, smart: fighter.arm.tech === 'Smart', steady: this.steadyOf(person) };
    return trainedEdge(base, fighter.arm, { brawler: skills.brawler, toughness: skills.toughness, type: skills.arms, model: skills.arms }, perksAt(fighter.arm, skills.arms, this.rules.combat), this.rules.combat);
  }

  /** Someone's own levels now, by id (what the reads on their card come from); null for nobody. */
  levelsOf(id: string, now = Date.now()): PersonSkills | null {
    const person = this.person(id);
    return person ? { ...this.skillsFor(person, now) } : null;
  }

  /** Someone's own levels now: Street Brawler, Toughness, the kind of weapon they carry, Charisma, Trading; what they were born to, and what practice has made of it. */
  private skillsFor(person: Person, now = Date.now()): PersonSkills {
    const day = this.clockAt(now).day;
    const fights = this.life.fights?.[person.id] ?? 0;
    const kept = this.skillCache.get(person.id);
    if (kept && kept.day === day && kept.fights === fights) return kept.skills;
    const skills = this.practiced(person, skillsOf(person, this.world, this.rules.people), day, fights);
    this.skillCache.set(person.id, { day, fights, skills });
    return skills;
  }

  /**
   * What practice has made of someone's levels: every day since the city started (or since
   * they took on what they do now) at what they do (`practice.walks`, and `staff` for working
   * a storefront's counter), and every fight they've been in, as experience on the player's
   * own curves, so each level takes longer than the last.
   */
  private practiced(person: Person, base: PersonSkills, day: number, fights: number): PersonSkills {
    const profile = this.rules.people.skills;
    if (!profile) return base;
    const { practice, most } = profile;
    const start = this.life.start ?? day;
    const days = Math.max(0, day - Math.max(start, this.life.jobs[person.id]?.day ?? start));
    const walk = walkOf(person, this.world);
    const work = person.job.building ? buildingById(this.world, person.job.building) : undefined;
    const staff = Boolean(work?.business) && !person.gang;
    const { combat } = this.rules;
    const curves: Record<keyof PersonSkills, SkillRules | undefined> = { brawler: combat.skills.brawler, toughness: combat.skills.toughness, arms: combat.mastery.types, charisma: this.rules.charisma, trading: this.rules.trading, dealing: this.rules.dealing?.skill, cutting: this.rules.dealing?.cut.skill };
    const out = { ...base };
    for (const skill of Object.keys(curves) as Array<keyof PersonSkills>) {
      const curve = curves[skill];
      if (!curve) continue;
      let xp = days * ((practice.walks[walk][skill] ?? 0) + (staff ? (practice.staff[skill] ?? 0) : 0)) + fights * (practice.fight[skill] ?? 0);
      // Selling for the player is practice at trading, and at dealing.
      if (skill === 'trading' || skill === 'dealing') xp += (this.dealState?.dealt?.[person.id] ?? 0) * (this.rules.dealing?.crew.practice ?? 0);
      let level = base[skill];
      while (level < most && xp >= xpToNext(curve, level)) {
        xp -= xpToNext(curve, level);
        level++;
      }
      out[skill] = level;
    }
    return out;
  }

  /** What there is to do in the fight this beat, and what each would be done with. */
  fightView(): FightView | null {
    const f = this.fightState;
    const person = f ? this.person(f.with) : undefined;
    if (!f || !person) return null;
    const { combat } = this.rules;
    const s = f.state;
    const you = this.yourFighter(s.range, s.you.hp);
    const furthest: Range = f.indoors ? 'close' : 'far';
    const reach = combat.classes[you.arm.cls]?.hit[s.range] ?? 0;
    const gun = combat.classes[you.arm.cls]?.kind === 'gun';
    const hacks = this.hacksOnHand();
    const deck = this.ramMax() > 0;
    const meds = this.medsOnHand();
    const next = meds[0];
    const doses = meds.filter((m) => m.item.id === next?.item.id).reduce((n, m) => n + m.item.count, 0);
    const numb = this.habitNow(Date.now()).numb;
    const moves: FightView['moves'] = f.over
      ? []
      : [
          { id: 'attack', label: VERB[combat.classes[you.arm.cls]?.kind ?? 'fists'], sub: reach > 0 ? `${you.arm.short}${gun ? ` ${you.loaded}/${you.arm.magazine}` : ''}` : 'Out of reach', enabled: reach > 0 },
          ...(s.range !== 'reach' ? [{ id: 'advance' as const, label: 'Close in', sub: RANGE_LABEL[stepRange(s.range, -1)], enabled: s.you.crippled <= 0 }] : []),
          ...(s.range !== furthest ? [{ id: 'back' as const, label: 'Back off', sub: RANGE_LABEL[stepRange(s.range, 1, furthest)], enabled: s.you.crippled <= 0 }] : []),
          { id: 'cover', label: 'Cover', sub: gun && you.loaded < you.arm.magazine && you.spare > 0 ? 'and reload' : 'Duck', enabled: true },
          ...(deck && hacks.length ? [{ id: 'hack' as const, label: 'Hack', sub: `${s.ram}/${s.ramMax} RAM`, enabled: hacks.some((h) => h.ram <= s.ram) }] : []),
          // Heal says the med it would take, and how many of that one there are.
          ...(next ? [{ id: 'heal' as const, label: 'Heal', sub: `${next.med.name}${doses > 1 ? ` ×${doses}` : ''}`, enabled: s.you.hp < s.you.max }] : []),
          // On the edge, there's no talking and no running: only the fight.
          { id: 'talk', label: 'Talk down', sub: numb ? 'Past words' : '', enabled: !numb },
          { id: 'run', label: 'Run', sub: numb ? 'Not now' : '', enabled: s.you.crippled <= 0 && !numb },
        ];
    const theirs = this.theirArmNow(s.them);
    return {
      name: this.fightName(person, true),
      range: s.range,
      rangeLabel: RANGE_LABEL[s.range],
      beat: s.beat,
      deadline: f.deadline,
      window: this.fightWindow(s.you),
      you: { hp: s.you.hp, max: s.you.max, arm: you.arm.short },
      them: { hp: s.them.hp, max: s.them.max, arm: theirs.short },
      tell: f.over ? null : f.tell,
      log: [...f.log],
      moves,
      hacks: deck ? hacks.map((h) => ({ id: h.id, name: h.name, ram: h.ram, enabled: h.ram <= s.ram })) : [],
      ram: s.ram,
      ramMax: s.ramMax,
      lethal: this.lethalOn,
      foes: [
        { id: f.with, name: this.fightName(person, true), hp: s.them.hp, max: s.them.max, arm: theirs.short, target: true },
        ...f.others.filter((c) => !c.ally).flatMap((c) => {
          const p = this.person(c.id);
          return p ? [{ id: c.id, name: this.fightName(p, true), hp: c.fighter.hp, max: c.fighter.max, arm: this.theirArmNow(c.fighter).short, target: false }] : [];
        }),
      ],
      allies: f.others.filter((c) => c.ally).flatMap((c) => {
        const p = this.person(c.id);
        return p ? [{ id: c.id, name: this.fightName(p, true), hp: c.fighter.hp, max: c.fighter.max, arm: this.theirArmNow(c.fighter).short }] : [];
      }),
      over: f.over,
      result: f.result,
    };
  }

  /**
   * One beat of the fight: the player's move and theirs, drawn when the beat began, land
   * together. `hack` names the quickhack for a hack. When the clock runs out it's `freeze`
   * (`tick` does that). False if there's no fight on, or the move can't be made.
   */
  fightMove(move: Move, now: number, hack?: string): boolean {
    const f = this.fightState;
    const person = f ? this.person(f.with) : undefined;
    if (!f || f.over || !person) return false;
    const view = this.fightView();
    if (move !== 'freeze' && !view?.moves.some((m) => m.id === move && m.enabled)) return false;
    const { combat, gear } = this.rules;
    const chosen = move === 'hack' ? this.hacksOnHand().find((h) => h.id === hack && h.ram <= f.state.ram) : undefined;
    if (move === 'hack' && !chosen) return false;
    // A heal takes the strongest med carried, and it's used up whatever lands.
    const dose = move === 'heal' ? this.medsOnHand()[0] : undefined;
    if (move === 'heal' && !dose) return false;
    // What each side has in hand this beat: the player the best they carry for the range, they what they brought (fists, with their chrome knocked out).
    const you = this.yourFighter(f.state.range, f.state.you.hp);
    const state: FightState = { ...f.state, you: { ...f.state.you, arm: you.arm, loaded: you.loaded, spare: you.spare, armor: you.armor, max: f.state.you.max, charges: f.launched ? 0 : you.charges }, them: { ...f.state.them, arm: this.theirArmNow(f.state.them) } };
    const theirs = f.next;
    const rng = createRng(`${this.world.seed}:fight:${f.with}:${f.startedAt}:${state.beat}`);
    const armed = Boolean(drawWeapon(this.items, gear.arms)?.gun);
    const result = resolveBeat(state, move, theirs, {
      you: this.yourEdge(state.you),
      them: this.edgeOf(person, state.them),
      ...(chosen ? { hack: { id: chosen.id, ram: chosen.ram, effect: gear.hacks.hacks[chosen.id]!.effect } } : {}),
      ...(dose ? { med: { heal: dose.med.heal, ...(dose.med.regen ? { regen: dose.med.regen } : {}) } } : {}),
      indoors: f.indoors,
      // Talking them down is the player's way with words against theirs.
      talkOdds: talkOdds(state, f.nerve, this.charismaEdge, armed, combat, skillEdge(this.rules.charisma, this.skillsFor(person).charisma)),
      rng,
      rules: combat,
    });
    const s = result.state;
    // The rounds fired and reloaded come out of what the player carries; a launcher's one shot is spent.
    this.spendRounds(state.you, s.you);
    if (combat.classes[state.you.arm.cls]?.charges && s.you.charges < state.you.charges) f.launched = true;
    if (dose) {
      this.takeOne(dose.item);
      this.events.emit('inventoryChanged', this.inventory);
    }
    // Their weapon is back in their hands for next time (a knocked-out arm comes back with the chrome).
    s.them.arm = f.state.them.arm;
    f.state = s;
    const speaker = this.speakerFor(person, 'hostile', '', now);
    const vars = { ...speaker.vars, ...this.fightVars(person, state.you, state.them), ...(dose ? { med: dose.med.name } : {}) };
    let finisher: FightClass | 'hack' | null = null;
    for (const e of result.events) {
      const key = this.eventLine(e);
      if (!key) continue;
      if (e.what === 'hack') this.fightLine(this.hackLine(e.hack), person, { ...vars, hack: gear.hacks.hacks[e.hack]?.name ?? 'The hack', dmg: String(e.dmg) });
      else this.fightLine(key, person, { ...vars, dmg: 'dmg' in e ? String(e.dmg) : '' });
      if (e.what === 'hit' && e.who === 'you' && e.crit) this.fightLine('youCrit', person, vars);
      if (e.who === 'you' && (e.what === 'hit' || e.what === 'hack') && s.them.hp <= 0 && !finisher) finisher = e.what === 'hack' ? 'hack' : state.you.arm.cls;
    }
    if (s.them.hp <= 0 && !finisher) finisher = 'hack';
    // Everyone else in it has their beat too: whoever else is on the player, and the allies with theirs.
    const others = result.fled === 'you' ? null : this.otherBeats(move);
    const events = [...result.events, ...(others?.events ?? [])];
    this.trainFrom(events, state.you.arm, finisher !== null && finisher !== 'hack');
    // How it stands: someone down, someone gone, or talked out of it.
    if (s.you.hp <= 0 && !f.revived && this.fitted.some((x) => combat.chrome[x.id]?.revive)) {
      f.revived = true;
      s.you.hp = s.you.max;
      this.fightLine('revive', person, vars);
    }
    // Aiming to wound, nobody dies of it; aiming to kill, as often as what dropped them does. Downed by an ally (no finisher of the player's), nobody's killed.
    const lethal = !this.lethalOn || !finisher ? 0 : finisher === 'hack' ? combat.hackLethal : (combat.classes[finisher]?.lethal ?? 0);
    // The one the player's going for: down, out, gone, or talked out of it.
    const done: FightOutcome | null = s.them.hp <= 0 ? 'won' : result.out === 'them' || others?.target === 'out' ? 'out' : result.fled === 'them' || others?.target === 'escaped' ? 'escaped' : result.talked && result.fled !== 'you' ? 'talked' : null;
    // Whoever else is out of it goes, before it's said whether anyone's left.
    for (const d of others?.dropped ?? []) this.dropOut(d.id, d.how, d.by, now);
    const left = f.others.some((c) => !c.ally);
    const downer = others?.downedBy ? this.person(others.downedBy) : undefined;
    const knocker = others?.knockedBy ? this.person(others.knockedBy) : undefined;
    const varsOf = (p: Person) => ({ ...this.speakerFor(p, 'hostile', '', now).vars, ...this.fightVars(p, s.you, this.combatant(p.id)?.fighter ?? s.them) });
    if (done === 'won' && !left) this.endFight(person, lethal, rng, vars, now);
    else if (s.you.hp <= 0) this.endFight(downer ?? person, 0, rng, downer ? varsOf(downer) : vars, now, 'lost');
    else if (result.out === 'you' || knocker) this.endFight(knocker ?? person, 0, rng, knocker ? varsOf(knocker) : vars, now, 'knocked');
    else if (result.fled === 'you') this.endFight(person, 0, rng, vars, now, 'fled');
    else if (done && !left) this.endFight(person, 0, rng, vars, now, done);
    else {
      // Someone else is still in it: this one's dealt with, and the next one is up.
      if (done) this.nextFoe(person, done === 'won' ? null : done, lethal, rng, vars, now);
      this.joinFight(now, false);
      this.nextBeat(this.person(f.with) ?? person, now);
    }
    this.closeBeat();
    this.events.emit('fightChanged', this.fightView());
    return true;
  }

  /**
   * The beat for everyone in the fight but the player and the one they're going for: anyone
   * else on the player gets a free go at them (the player's `busy`, but for cover, which covers
   * them from everyone), and each ally has it out with their own. Each fighter's own exchange
   * moves them and wears off what's on them; anywhere else, only what lands counts. What lands
   * on the player is in `events`; who's out of it in `dropped`; what an ally did to the one the
   * player's going for in `target`.
   */
  private otherBeats(move: Move): { events: BeatEvent[]; dropped: Array<{ id: string; how: 'down' | 'out' | 'fled' | 'talked'; by: string | null }>; downedBy: string | null; knockedBy: string | null; target: 'out' | 'escaped' | 'down' | null } {
    const f = this.fightState!;
    const { combat } = this.rules;
    const s = f.state;
    const events: BeatEvent[] = [];
    const dropped: Array<{ id: string; how: 'down' | 'out' | 'fled' | 'talked'; by: string | null }> = [];
    let downedBy: string | null = null;
    let knockedBy: string | null = null;
    let target: 'out' | 'escaped' | 'down' | null = null;
    const gone = (id: string) => dropped.some((d) => d.id === id) || (id === f.with && (target !== null || s.them.hp <= 0));
    for (const c of f.others) {
      const cp = this.person(c.id);
      if (!cp || gone(c.id)) continue;
      const rng = createRng(`${this.world.seed}:fight:${f.with}:${f.startedAt}:${s.beat}:${c.id}`);
      if (!c.ally && c.mark === 'you') {
        // Someone else on the player: they swing, the player's taken up with the one they're going for.
        if (s.you.hp <= 0 || knockedBy) break;
        const pairYou = { ...s.you, burning: 0, regening: 0 };
        const r = resolveBeat({ ...s, range: c.range, you: pairYou, them: { ...c.fighter, arm: this.theirArmNow(c.fighter) } }, move === 'cover' ? 'cover' : 'busy', c.next, { you: this.yourEdge(s.you), them: this.edgeOf(cp, c.fighter), indoors: f.indoors, talkOdds: 0, rng, rules: combat });
        s.you.hp = Math.max(0, s.you.hp - (pairYou.hp - r.state.you.hp));
        c.fighter = { ...r.state.them, arm: c.fighter.arm };
        c.range = r.state.range;
        // Not the one the player's going for: named, never "he", so it's plain who; a named subject takes the singular verb.
        const named = this.fightVars(cp, s.you, c.fighter);
        const vars = { ...named, he: named.who!, He: named.Who!, s: 's', es: 'es', ies: 'ies', is: 'is', has: 'has' };
        for (const e of r.events) {
          if (e.who !== 'them') continue;
          const key = this.eventLine(e);
          if (key) this.fightLine(key, cp, { ...vars, dmg: 'dmg' in e ? String(e.dmg) : '' });
          events.push(e);
        }
        if (r.out === 'you') knockedBy = cp.id;
        if (s.you.hp <= 0 && !downedBy) downedBy = cp.id;
        if (c.fighter.hp <= 0) dropped.push({ id: c.id, how: 'down', by: null });
        else if (r.fled === 'them') dropped.push({ id: c.id, how: 'fled', by: null });
        else if (r.talked) dropped.push({ id: c.id, how: 'talked', by: null });
        continue;
      }
      if (!c.ally) continue;
      // An ally and the one they're fighting: the one the player's going for, or someone else of theirs.
      const main = c.mark === f.with;
      const foe = main ? null : f.others.find((o) => o.id === c.mark && !o.ally);
      const fp = this.person(c.mark);
      if (!fp || (!main && !foe) || gone(c.mark)) continue;
      const theirs = main ? s.them : foe!.fighter;
      // The foe's own exchange only if it's this ally they're fighting.
      const primary = Boolean(foe && foe.mark === c.id);
      const pairThem = primary ? { ...theirs, arm: this.theirArmNow(theirs) } : { ...theirs, arm: this.theirArmNow(theirs), burning: 0, regening: 0 };
      const r = resolveBeat({ ...s, range: c.range, you: c.fighter, them: pairThem, ram: 0, ramMax: 0, ramSpent: 0 }, c.next, primary ? foe!.next : 'busy', { you: this.edgeOf(cp, c.fighter), them: this.edgeOf(fp, theirs), indoors: f.indoors, talkOdds: 0, rng, rules: combat });
      c.fighter = { ...r.state.you, arm: c.fighter.arm };
      c.range = r.state.range;
      const lost = pairThem.hp - r.state.them.hp;
      if (main) s.them.hp = Math.max(0, s.them.hp - lost);
      else if (primary) {
        foe!.fighter = { ...r.state.them, arm: foe!.fighter.arm };
        foe!.range = r.state.range;
      } else foe!.fighter.hp = Math.max(0, foe!.fighter.hp - lost);
      const vars = { ally: this.fightName(cp, false), Ally: this.fightName(cp, true), foe: this.fightName(fp, false), Foe: this.fightName(fp, true) };
      for (const e of r.events) {
        const pool = e.what === 'hit' ? (e.who === 'you' ? 'allyHit' : 'allyHurt') : e.what === 'miss' && e.who === 'you' ? 'allyMiss' : null;
        if (pool) this.groupLine(pool, `${c.id}:${s.beat}:${events.length}`, { ...vars, dmg: 'dmg' in e ? String(e.dmg) : '' });
      }
      const foeHp = main ? s.them.hp : foe!.fighter.hp;
      if (c.fighter.hp <= 0) dropped.push({ id: c.id, how: 'down', by: c.mark });
      else if (r.out === 'you') dropped.push({ id: c.id, how: 'out', by: c.mark });
      else if (r.fled === 'you') dropped.push({ id: c.id, how: 'fled', by: null });
      if (main) {
        if (foeHp <= 0) target = 'down';
        else if (r.out === 'them') target = 'out';
        else if (r.fled === 'them') target = 'escaped';
      } else if (foeHp <= 0) dropped.push({ id: c.mark, how: 'down', by: c.id });
      else if (r.out === 'them') dropped.push({ id: c.mark, how: 'out', by: c.id });
      else if (r.fled === 'them') dropped.push({ id: c.mark, how: 'fled', by: null });
    }
    return { events, dropped, downedBy, knockedBy, target };
  }

  /** Someone else in the fight, by id. */
  private combatant(id: string): Combatant | undefined {
    return this.fightState?.others.find((c) => c.id === id);
  }

  /** A group fight's line, picked fresh, as part of the beat. */
  private groupLine(pool: string, salt: string, vars: Record<string, string>): void {
    const f = this.fightState;
    const lines = this.rules.combat.group[pool];
    if (!f || !lines?.length) return;
    const rng = createRng(`${this.world.seed}:groupline:${f.startedAt}:${salt}:${pool}`);
    const lately = [...f.log.slice(-4), ...f.beatLines];
    const filled = lines.map((text) => finish(text, vars));
    const fresh = filled.filter((text) => !saidIn(lately, text));
    f.beatLines.push(rng.pick(fresh.length ? fresh : filled)!);
  }

  /**
   * Someone else out of the fight: down (an ally laid up, or killed as often as what dropped
   * them does; anyone else of theirs laid up), out cold where they fell, or gone (run off, or
   * backed down). Whoever was fighting them turns to someone else.
   */
  private dropOut(id: string, how: 'down' | 'out' | 'fled' | 'talked', by: string | null, now: number): void {
    const f = this.fightState;
    const c = f ? this.combatant(id) : undefined;
    const person = this.person(id);
    if (!f || !c || !person) return;
    const { combat } = this.rules;
    const rng = createRng(`${this.world.seed}:dropout:${id}:${f.startedAt}:${f.state.beat}`);
    const other = by ? this.person(by) : undefined;
    const vars = c.ally
      ? { ally: this.fightName(person, false), Ally: this.fightName(person, true), foe: other ? this.fightName(other, false) : 'them', Foe: other ? this.fightName(other, true) : 'Them' }
      : { foe: this.fightName(person, false), Foe: this.fightName(person, true), ally: other ? this.fightName(other, false) : 'someone', Ally: other ? this.fightName(other, true) : 'Someone' };
    const day = this.clockAt(now).day;
    if (how === 'down') {
      // An ally dropped by one of theirs may die of it; anyone dropped by an ally lives.
      const killer = c.ally && other ? this.combatant(other.id)?.fighter.arm ?? (other.id === f.with ? f.state.them.arm : undefined) : undefined;
      if (killer && rng.chance(combat.classes[killer.cls]?.lethal ?? 0)) {
        this.life.dead[id] = day;
        person.diedOn = day;
        if (this.society.romance?.with === id) this.society.romance = null;
        this.groupLine('allyDown', `${id}:down`, vars);
        f.beatLines.push(`${capitalize(this.fightName(person, false))} is dead.`);
      } else {
        const until = day + rng.int(combat.hurtDays[0], combat.hurtDays[1]);
        this.life.hurt[id] = until;
        person.hurtUntil = until;
        this.groupLine(c.ally ? 'allyDown' : 'foeDown', `${id}:down`, vars);
      }
    } else if (how === 'out') {
      const minutes = rng.int(combat.knockout.minutes[0], combat.knockout.minutes[1]);
      const spot = this.spot;
      if (spot) this.outColdState.set(id, { until: now + (minutes * 60_000) / this.rules.timeScale, spot, room: this.roomState });
      this.groupLine(c.ally ? 'allyOut' : 'foeOut', `${id}:out`, vars);
    } else this.groupLine(how === 'fled' ? 'fled' : 'backDown', `${id}:${how}`, { who: this.fightName(person, false), Who: this.fightName(person, true) });
    f.settled.add(id);
    f.others = f.others.filter((o) => o.id !== id);
    // Whoever was fighting them turns to someone else: the player, for one of theirs; for an ally, another of theirs.
    for (const o of f.others) if (o.mark === id) o.mark = o.ally ? this.markFor() : 'you';
  }

  /** Who an ally goes for: someone of theirs nobody on the player's side has, else the one the player's going for. */
  private markFor(): string {
    const f = this.fightState!;
    const free = f.others.find((o) => !o.ally && o.mark === 'you' && !f.others.some((a) => a.ally && a.mark === o.id));
    return free?.id ?? f.with;
  }

  /**
   * The one the player was going for is dealt with (down, out, gone, or talked out of it) while
   * someone else of theirs is still in it: what comes of it is told, and the next one is up.
   */
  private nextFoe(person: Person, how: 'out' | 'escaped' | 'talked' | null, lethal: number, rng: Rng, vars: Record<string, string>, now: number): void {
    const f = this.fightState!;
    const scene = { spot: this.spot, where: { ...this.where } };
    const done = this.settleFoe(person, how, lethal, rng, vars, now, scene);
    f.notes.push(done.result);
    f.beatLines.push(done.result);
    done.report();
    const next = f.others.find((o) => !o.ally);
    if (!next) return;
    this.target(next.id);
    // Whoever on the player's side had the one dealt with turns to someone else.
    for (const o of f.others) if (o.ally && o.mark === person.id) o.mark = this.markFor();
    const p = this.person(next.id);
    if (p) this.groupLine('nextUp', `${next.id}:next`, { who: this.fightName(p, false), Who: this.fightName(p, true) });
  }

  /** Turns to someone else of theirs: the one gone for now steps out of the main exchange, and the other steps in (their range, their state, their next move). */
  private target(id: string): void {
    const f = this.fightState!;
    const c = this.combatant(id);
    if (!c || c.ally) return;
    const was = this.person(f.with);
    // The one the player was going for keeps on at them, unless they're out of it.
    if (was && !f.settled.has(f.with) && was.diedOn === undefined) f.others.push({ id: f.with, ally: false, fighter: f.state.them, range: f.state.range, mark: 'you', next: f.next, nerve: f.nerve });
    f.others = f.others.filter((o) => o.id !== id);
    f.with = id;
    f.state = { ...f.state, range: c.range, them: c.fighter };
    f.next = c.next;
    f.nerve = c.nerve;
    f.tell = null;
  }

  /** Goes for someone else of theirs, in a fight of more than two. */
  fightTarget(id: string, now: number): boolean {
    const f = this.fightState;
    if (!f || f.over || id === f.with || !this.combatant(id) || this.combatant(id)!.ally) return false;
    this.target(id);
    const person = this.person(id);
    if (person) this.nextBeat(person, now);
    this.events.emit('fightChanged', this.fightView());
    return true;
  }

  /**
   * Whoever here throws in: against the player (by what they are to someone on the other side,
   * the place's guard, an officer), or for them (a friend, the one they're seeing). When it
   * starts, everyone here has a go at it; once it's on, a share of that a beat.
   */
  private joinFight(now: number, start: boolean): void {
    const f = this.fightState;
    const join = this.rules.join;
    if (!f || f.over || !join) return;
    const { society, timeScale } = this.rules;
    const inIt = new Set([f.with, ...f.others.map((c) => c.id), ...f.settled]);
    const here = this.peopleHere(now).filter((p) => !inIt.has(p.person.id) && p.doing !== 'out cold' && p.person.diedOn === undefined);
    if (!here.length) return;
    const rng = createRng(`${this.world.seed}:join:${f.startedAt}:${f.state.beat}`);
    const share = start ? 1 : join.perBeat;
    const crowd = Math.max(1, here.length) ** join.crowd;
    const target = this.person(f.with);
    for (const { person } of here) {
      const foes = [target, ...f.others.filter((c) => !c.ally).map((c) => this.person(c.id))].filter((p): p is Person => Boolean(p));
      const nerve = 0.5 + person.traits.courage;
      // Against the player: an officer always; the place's own guard; the strongest tie to anyone of theirs; a stranger hardly ever.
      let against = NCPD.test(person.job.role) ? 1 : GUARD.test(person.job.role) && person.job.building === this.inside?.id ? join.guard * nerve : (join.stranger * nerve) / crowd;
      for (const foe of foes) {
        const tie = tiesOf(this.population, person.id).find((t) => t.to === foe.id);
        if (tie) against = Math.max(against, (FAMILY.includes(tie.kind) ? join.kin : join.friend) * nerve);
        if (person.gang && person.gang === foe.gang) against = Math.max(against, join.gang * nerve);
      }
      // For the player: the one they're seeing, a friend, or someone who owes them; against, someone who holds a lot against them.
      const standing = standingOf(this.society, person.id, society, timeScale, now);
      const owed = join.owed ?? Infinity;
      const regard = owed < Infinity ? this.regardOf(person.id, now) : 0;
      if (regard <= -owed) against = Math.max(against, join.friend * nerve);
      const forYou = this.society.romance?.with === person.id ? join.partner * nerve : standing.rapport >= join.friendly || regard >= owed ? join.ally * nerve : 0;
      const foeCount = f.others.filter((c) => !c.ally).length;
      const allyCount = f.others.filter((c) => c.ally).length;
      const side = forYou > against ? 'ally' : 'foe';
      if (side === 'foe' ? foeCount >= join.foes - 1 : allyCount >= join.allies) continue;
      if (!rng.chance(Math.min(1, (side === 'ally' ? forYou : against) * share))) continue;
      const ally = side === 'ally';
      const mark = ally ? this.markFor() : 'you';
      f.others.push({ id: person.id, ally, fighter: this.fighterOf(person), range: 'close', mark, next: 'attack', nerve: { courage: person.traits.courage, temper: person.traits.temper } });
      // Someone of theirs an ally has gone for turns on the ally.
      if (ally) {
        const foe = this.combatant(mark);
        if (foe && !foe.ally) foe.mark = person.id;
      }
      learnOf(this.society, person.id, 'seen');
      // Throwing in with the player is something they remember.
      if (ally) this.remember(person.id, { kind: 'backed', at: now, what: (this.inside ?? this.location)?.name ?? 'the street' }, now);
      this.groupLine(ally ? 'joinYou' : 'joinThem', `${person.id}:join`, { ...this.whoVars(person), target: target ? this.fightName(target, false) : 'them' });
    }
  }

  /** Done looking at a fight that's over. */
  leaveFight(): void {
    if (this.fightState?.over) this.fightState = null;
  }

  /** Their move for the beat to come, what might give it away, and the clock on the player's; and everyone else's moves. */
  private nextBeat(person: Person, now: number): void {
    const f = this.fightState;
    if (!f) return;
    const { combat } = this.rules;
    const rng = createRng(`${this.world.seed}:fight:${f.with}:${f.startedAt}:${f.state.beat}:next`);
    f.next = theirMove({ ...f.state, them: { ...f.state.them, arm: this.theirArmNow(f.state.them) } }, f.nerve, f.indoors, rng, combat);
    // Everyone else: against whoever they're fighting.
    for (const c of f.others) {
      const opp = c.mark === 'you' ? f.state.you : c.mark === f.with ? f.state.them : this.combatant(c.mark)?.fighter;
      if (!opp) continue;
      const own = createRng(`${this.world.seed}:fight:${f.with}:${f.startedAt}:${f.state.beat}:next:${c.id}`);
      c.next = theirMove({ ...f.state, range: c.range, you: opp, them: { ...c.fighter, arm: this.theirArmNow(c.fighter) } }, c.nerve, f.indoors, own, combat);
    }
    // Whether the player catches what they're about to do: likelier knowing their nature, and with charisma.
    const odds = combat.tell.base + (knowledgeOf(this.society, person.id).facts.includes('nature') ? combat.tell.nature : 0) + this.charismaEdge * combat.tell.charisma;
    const key = `tell${f.next[0]!.toUpperCase()}${f.next.slice(1)}`;
    const pool = combat.lines[key];
    f.tell = pool?.length && rng.chance(odds) ? finish(rng.pick(pool)!, { ...this.speakerFor(person, 'hostile', '', now).vars, ...this.fightVars(person, f.state.you, f.state.them) }) : null;
    f.deadline = now + this.fightWindow(f.state.you);
  }

  /**
   * How a fight ends, and what comes of it: someone downed (dead, by the odds of what dropped
   * them; a corpo's Trauma Team gets them out alive; anyone else laid up for days), the player
   * downed (robbed of some of the cash on them), or one of them gone, or talked out of it.
   */
  private endFight(person: Person, lethal: number, rng: Rng, vars: Record<string, string>, now: number, how?: FightOutcome): void {
    const f = this.fightState;
    if (!f) return;
    const { combat } = this.rules;
    const name = this.fightName(person, false);
    // Where it happened, before Trauma Team or the door take the player anywhere else.
    const scene = { spot: this.spot, where: { ...this.where } };
    let outcome: FightOutcome = how ?? 'won';
    let result = '';
    let report = () => {};
    // Put down by the NCPD, the player comes to in cuffs, their pockets their own.
    const cuffed = (how === 'lost' || how === 'knocked') && Boolean(this.rules.police) && NCPD.test(person.job.role);
    if (!how || how === 'won' || how === 'out' || how === 'escaped' || how === 'talked') {
      const done = this.settleFoe(person, how === 'out' || how === 'escaped' || how === 'talked' ? how : null, lethal, rng, vars, now, scene);
      ({ outcome, result, report } = done);
    } else if (cuffed) {
      this.fightLine(how === 'knocked' ? 'youOut' : 'youDown', person, vars);
      if (how === 'lost') f.state.you.hp = 1;
      result = `${capitalize(name)} put you down. You come to in cuffs.`;
    } else if (how === 'lost' && this.covered(now)) {
      this.fightLine('youDown', person, vars);
      result = this.pickedUp(this.covered(now)!, person, vars);
    } else if (how === 'lost' || how === 'knocked') {
      // Put down, or knocked out cold: either way they go through the player's pockets.
      this.fightLine(how === 'knocked' ? 'youOut' : 'youDown', person, vars);
      const share = rng.range(combat.robbed[0], combat.robbed[1]);
      const { money, taken } = takeCash(this.money, Math.round(cash(this.money) * share));
      this.money = money;
      if (taken) {
        person.eddies += taken;
        this.life.eddies[person.id] = person.eddies;
        this.fightLine('robbed', person, { ...vars, took: String(taken) });
        this.events.emit('walletChanged', this.wallet);
      }
      if (how === 'lost') f.state.you.hp = 1;
      result = how === 'knocked' ? `${capitalize(name)} knocked you out cold${taken ? `, and took ${taken} €$` : ''}. You come to on the floor.` : `${capitalize(name)} put you down${taken ? `, and took ${taken} €$` : ''}.`;
    } else {
      result = `You got away from ${name}.`;
    }
    f.over = outcome;
    f.result = [...f.notes, result].join(' ');
    // Everyone who was in it has learned from it.
    for (const id of new Set([f.started, f.with, ...f.others.map((c) => c.id), ...f.settled])) learned(this.life, id);
    // Walking away from it on their own feet toughens the player up.
    if (outcome !== 'lost' && outcome !== 'knocked' && f.state.beat > 0) this.train('toughness', combat.training.toughness.stood);
    f.tell = null;
    this.healthState = { value: Math.max(1, f.state.you.hp), at: now };
    this.drainEnergy(Math.min(4, f.state.beat), now);
    if (outcome === 'fled') this.leave();
    this.say(result, 'system');
    report();
    // Whoever the player went for and hasn't been dealt with may call it in: they were assaulted.
    const victim = f.byYou ? this.person(f.started) : undefined;
    if (victim && !f.settled.has(victim.id)) {
      f.settled.add(victim.id);
      this.crime('assault', victim, now, f.knew, 'victim', scene);
    }
    // ...and is taken in for it, held the longer for having fought.
    if (cuffed) this.arrest({ officers: [person.id], crime: 'assault', why: 'scene', at: now }, now, this.rules.police!.run.resisting);
    this.events.emit('healthChanged', this.health(now));
  }

  /**
   * What comes of someone the player was fighting being dealt with: downed (`how` null: dead,
   * by `lethal`; a corpo's Trauma Team gets them out alive; anyone else laid up for days), out
   * cold where they fell, gone, or talked out of it. `report` is the call it may bring (a
   * killing, or the one the player went for, who was assaulted), to make once it's been told.
   */
  private settleFoe(person: Person, how: 'out' | 'escaped' | 'talked' | null, lethal: number, rng: Rng, vars: Record<string, string>, now: number, scene: { spot: Spot | null; where: Whereabouts }): { outcome: FightOutcome; result: string; report: () => void } {
    const f = this.fightState!;
    const { combat } = this.rules;
    const day = this.clockAt(now).day;
    const name = this.fightName(person, false);
    let outcome: FightOutcome = how ?? 'won';
    let result: string;
    if (!how) {
      if (isCorpo(person, this.world)) {
        outcome = 'trauma';
        this.fightLine('trauma', person, vars);
      } else if (rng.chance(lethal)) {
        outcome = 'killed';
        this.fightLine('theyDie', person, vars);
      } else this.fightLine('theyDown', person, vars);
      if (outcome === 'killed') {
        this.life.dead[person.id] = day;
        person.diedOn = day;
        delete this.life.hurt[person.id];
        delete person.hurtUntil;
        const fallout = this.incident('murder', person, 0, now);
        if (this.society.romance?.with === person.id) this.society.romance = null;
        this.events.emit('societyChanged', { people: fallout });
        result = `${capitalize(name)} is dead.`;
      } else {
        const until = day + rng.int(combat.hurtDays[0], combat.hurtDays[1]);
        this.life.hurt[person.id] = until;
        person.hurtUntil = until;
        // Laid up in the hospital nearest their home, if the city has one.
        const ward = this.hospitalName(hospitalOf(person, this.world));
        const where = ward ? ` in ${ward}` : '';
        result = outcome === 'trauma' ? `Trauma Team got ${name} out. ${capitalize(vars.he ?? 'they')} will live, laid up${where} for days.` : `${capitalize(name)} is down, and will be laid up${where} for days.`;
      }
    } else if (how === 'out') {
      // Out cold, not hurt past a night's sleep: they lie where they fell for a while, then come to.
      this.fightLine('theyOut', person, vars);
      const minutes = rng.int(combat.knockout.minutes[0], combat.knockout.minutes[1]);
      const spot = this.spot;
      if (spot) this.outColdState.set(person.id, { until: now + (minutes * 60_000) / this.rules.timeScale, spot, room: this.roomState });
      result = `${capitalize(name)} is out cold, and won't come to for a while.`;
    } else if (how === 'escaped') {
      result = `${capitalize(name)} got away.`;
    } else {
      result = `It ended in words, with ${name}.`;
    }
    // A killing, whoever's still here may call in; the one the player went for, assaulted, may themselves (now, or when they come to).
    const victim = f.byYou && person.id === f.started;
    f.settled.add(person.id);
    const report = () => {
      if (outcome === 'killed') this.crime('murder', person, now, f.knew, 'witnesses', scene);
      else if (victim) this.crime('assault', person, now, f.knew, 'victim', scene);
    };
    return { outcome, result, report };
  }

  /** A hospital's name, by where it is. */
  private hospitalName(spot: Spot | null): string | null {
    return spot ? (hospitalsOf(this.world).find((h) => h.spot.kind === spot.kind && h.spot.id === spot.id)?.name ?? null) : null;
  }

  /**
   * Trauma Team's pickup, for a player on a plan who went down: nobody robs them, they're
   * patched up as far as the plan goes and dropped at the nearest hospital, and billed their
   * share of the treatment there (from the account, else in cash). What they can't pay of it,
   * Trauma Team takes from the account and drops them from the plan. What the result says.
   */
  private pickedUp(cover: CoverageStatus, person: Person, vars: Record<string, string>): string {
    const f = this.fightState;
    if (!f) return '';
    const { gear, food } = this.rules;
    const ward = nearestHospital(this.world, this.where);
    const at = ward ? (ward.spot.kind === 'location' ? this.world.locations[ward.spot.id] : buildingById(this.world, ward.spot.id)) : undefined;
    const restored = Math.max(1, Math.round(f.state.you.max * cover.plan.restore));
    f.state.you.hp = restored;
    // Their bill: the hospital's fee for what it put back, the plan's share of it.
    const bill = Math.round(priceFor(restored * gear.medical.perPoint, at ? drawQuality(this.world, at) : 'everyday', food) * cover.plan.copay);
    let billed = '';
    if (bill > 0) {
      if (this.canPay(bill, true) && this.pay(bill, true)) billed = ` The bill: ${bill} €$.`;
      else {
        const took = this.money.account;
        this.money = { ...this.money, account: 0 };
        this.coverage = null;
        billed = ` The bill is ${bill} €$${took ? `; they take the ${took} €$ in your account` : ''}, and drop you from the plan.`;
        this.events.emit('coverageChanged', null);
      }
      this.events.emit('walletChanged', this.wallet);
    }
    this.fightLine('traumaYou', person, { ...vars, plan: cover.plan.name, ward: at?.name ?? 'the hospital' });
    if (at) this.carryTo(at);
    return `Trauma Team picked you up${at ? ` and dropped you at ${at.name}` : ''}.${billed}`;
  }

  /** Puts the player somewhere at once (Trauma Team's AV): at a place, or inside a building, off any trip. */
  private carryTo(at: Building | Location): void {
    const from = { ...this.where };
    const building = 'block' in at ? at : null;
    this.inside = null;
    this.roomState = 'main';
    this.letIn.clear();
    this.where = building ? { ...streetSpot(snapToStreet(this.world.layout, { x: building.x + building.w / 2, y: building.y + building.h / 2 })), building: building.id } : { ...streetSpot(at), place: at.id };
    if (building && canEnter(building)) this.inside = building;
    this.settle(this.where);
    this.emitArrived(from);
    this.events.emit('interiorChanged', this.inside);
    this.events.emit('mapChanged', this.mapState);
  }

  /** A line of the fight, told as part of the beat going on. */
  private fightLine(key: string, person: Person, vars: Record<string, string>): void {
    const f = this.fightState;
    const pool = this.rules.combat.lines[key];
    if (!f || !pool?.length) return;
    const rng = createRng(`${this.world.seed}:fightline:${person.id}:${f.startedAt}:${f.log.length}:${f.beatLines.length}:${key}`);
    // Not what the last few beats said, while there's another way to tell it.
    const lately = [...f.log.slice(-4), ...f.beatLines];
    const filled = pool.map((text) => finish(text, vars));
    const fresh = filled.filter((text) => !saidIn(lately, text));
    f.beatLines.push(rng.pick(fresh.length ? fresh : filled));
  }

  /** The beat's lines, kept as one entry of the fight's log. */
  private closeBeat(): void {
    const f = this.fightState;
    if (!f || !f.beatLines.length) return;
    f.log.push(f.beatLines.join(' '));
    f.beatLines = [];
    if (f.log.length > 30) f.log.splice(0, f.log.length - 30);
  }

  /** Which pool tells what happened. */
  private eventLine(e: BeatEvent): string | null {
    const who = e.who === 'you' ? 'you' : 'they';
    if (e.what === 'hit') return `${who}${HIT_LINE[e.kind]}`;
    if (e.what === 'miss') return `${who}${e.kind === 'gun' || e.kind === 'launcher' ? 'MissShot' : e.kind === 'fists' ? 'MissPunch' : 'MissSwing'}`;
    if (e.what === 'talk') return e.who === 'you' ? (e.ok ? 'youTalkOk' : 'youTalkNo') : e.ok ? 'theyBackDown' : 'theyBegIgnored';
    if (e.what === 'run') return `${who}Run${e.ok ? 'Ok' : 'No'}`;
    if (e.what === 'hack') return 'hack';
    if (e.what === 'outOfReach') return `${who}Reachless`;
    if (e.what === 'jammed') return e.who === 'them' ? 'theyJammed' : null;
    if (e.what === 'freeze') return e.who === 'you' ? 'youFreeze' : null;
    // A knockout is told as the fight ends.
    if (e.what === 'out') return null;
    return `${who}${e.what[0]!.toUpperCase()}${e.what.slice(1)}`;
  }

  /** The line for a quickhack, by what it does. */
  private hackLine(id: string): string {
    const effect = this.rules.gear.hacks.hacks[id]?.effect;
    if (!effect) return 'hackDamage';
    if (effect.burn) return 'hackBurn';
    if (effect.blind) return 'hackBlind';
    if (effect.jam) return 'hackJam';
    if (effect.cripple) return 'hackCripple';
    if (effect.chromeOff) return 'hackChrome';
    return 'hackDamage';
  }

  /** The vars a fight's lines are filled with: who, their pronouns and how verbs go with them, and the arms on both sides. */
  private fightVars(person: Person, you: Fighter, them: Fighter): Record<string, string> {
    const p = pronounsOf(person);
    const they = person.pronouns === 'they';
    const who = this.fightName(person, false);
    return {
      who,
      Who: capitalize(who),
      he: p.he,
      He: capitalize(p.he),
      him: p.him,
      his: p.his,
      His: capitalize(p.his),
      s: they ? '' : 's',
      es: they ? '' : 'es',
      ies: they ? 'y' : 'ies',
      is: they ? 'are' : 'is',
      has: they ? 'have' : 'has',
      arm: you.arm.short,
      theirArm: this.theirArmNow(them).short,
    };
  }

  /** Who the player is fighting, as they know them: by name, or "the young woman in Mox colors". */
  private fightName(person: Person, capital: boolean): string {
    const named = knowledgeOf(this.society, person.id).facts.includes('name');
    const name = named ? person.given : describeStranger(person, this.rules.people).replace(/^An? /, 'the ');
    return capital ? capitalize(name) : name;
  }

  /** The player in a fight: the best they've got for the range (a gun with rounds in it, chrome, a blade, their fists), the rounds for it, and their armor. */
  private yourFighter(range: Range, hp: number): Fighter {
    const { combat, gear } = this.rules;
    const options: Array<{ arm: Arm; loaded: number; spare: number }> = [];
    for (const item of this.items) {
      const weapon = weaponOf(item, gear.arms);
      if (!weapon) continue;
      const ammo = ammoFor(weapon, gear.arms);
      const spare = ammo && !weapon.disposable ? this.items.filter((i) => i.kind === 'ammo' && i.id === ammo).reduce((n, i) => n + i.count, 0) : 0;
      options.push({ arm: { id: item.weapon ?? item.id, item: item.id, name: weapon.name, short: weapon.short, cls: weapon.class, ...(weapon.tech ? { tech: weapon.tech } : {}), magazine: weapon.magazine ?? 0 }, loaded: item.loaded ?? 0, spare });
    }
    for (const fit of this.fitted) {
      const cls = combat.chrome[fit.id]?.arm;
      const implant = gear.chrome.implants[fit.id];
      if (cls && implant && !(cls === 'launcher' && this.fightState?.launched)) options.push({ arm: { id: fit.id, name: implant.name, short: implant.short, cls, magazine: 0 }, loaded: 0, spare: 0 });
    }
    // Fists last, so anything carried wins a tie with them.
    options.push({ arm: FISTS, loaded: 0, spare: 0 });
    // The best for here; if nothing reaches, the best anywhere (the one to close in with).
    const score = (o: (typeof options)[number], r: Range) => worth(o.arm, combat.classes[o.arm.cls]?.kind === 'gun' ? o.loaded + (o.spare > 0 ? 0.5 : 0) : 1, r, combat);
    const best = [...options].sort((a, b) => score(b, range) - score(a, range))[0]!;
    const pick = score(best, range) > 0 ? best : [...options].sort((a, b) => Math.max(...RANGES.map((r) => score(b, r))) - Math.max(...RANGES.map((r) => score(a, r))))[0]!;
    const armor = this.fitted.reduce((sum, x) => sum + (combat.chrome[x.id]?.armor ?? 0), 0) + Math.round(this.habitNow(Date.now()).armor);
    return { hp, max: this.maxHealth(), arm: pick.arm, loaded: pick.loaded, spare: pick.spare, armor, covered: false, blind: 0, jammed: 0, crippled: 0, chromeOff: 0, burn: 0, burning: 0, regen: 0, regening: 0, charges: combat.classes[pick.arm.cls]?.charges ?? 0 };
  }

  /** What the player's chrome and state do for them in a fight: a Sandevistan's aim, drink's lack of it, a Berserk's guard in a melee, a Smart Link, optical camo. */
  private yourEdge(you: Fighter): Edge {
    const { combat, gear } = this.rules;
    let aim = 1;
    let melee = 1;
    let guard = 1;
    let evade = 0;
    let smart = false;
    const kind = combat.classes[you.arm.cls]?.kind;
    const close = kind === 'blade' || kind === 'blunt' || kind === 'fists' || kind === 'wire';
    for (const f of this.fitted) {
      const effect = combat.chrome[f.id];
      const system = gear.chrome.implants[f.id]?.system;
      const sys = system ? combat.systems[system] : undefined;
      if (effect?.aim) aim *= effect.aim;
      if (effect?.melee) melee *= effect.melee;
      if (effect?.guard) guard *= effect.guard;
      if (effect?.evade) evade = Math.max(evade, effect.evade);
      if (effect?.smart) smart = true;
      if (sys?.aim) aim *= sys.aim;
      if (sys?.guard && (system !== 'berserk' || close)) guard *= sys.guard;
    }
    aim *= 1 - 0.3 * this.inebriation(Date.now()).severity;
    // Whatever the player has taken: Black Lace's damage and crits, Glitter's blur, withdrawal's shakes, nerves gone.
    const high = this.habitNow(Date.now());
    aim *= high.aim;
    melee *= high.melee;
    const edge: Edge = { ...NO_EDGE, aim, melee, guard, smart, evade, wound: this.lethalOn ? 1 : combat.nonLethal };
    // The player's levels, the way anyone's count: Street Brawler, Toughness, the weapon's kind and the weapon, and its perks.
    const trained = trainedEdge(edge, you.arm, { brawler: this.brawler().level, toughness: this.toughness().level, type: this.weaponType(you.arm.cls).level, model: this.weaponModel(you.arm.id).level }, this.weaponPerks(you.arm), combat);
    return { ...trained, power: trained.power * high.power, crit: trained.crit + high.crit, steady: trained.steady * high.steady };
  }

  /** The time the player has for a move: the base, and more with reflex chrome (some of it only when they're hurt). */
  private fightWindow(you: Fighter): number {
    const { combat } = this.rules;
    return this.fitted.reduce((ms, f) => {
      const effect = combat.chrome[f.id];
      if (!effect?.window) return ms;
      return effect.below && you.hp > you.max * effect.below ? ms : ms + effect.window;
    }, combat.window + this.habitNow(Date.now()).window);
  }

  /** The RAM the player's cyberdeck has for quickhacks, with what the frontal cortex adds; none without a deck. */
  private ramMax(): number {
    const { combat } = this.rules;
    const deck = this.fitted.reduce((n, f) => Math.max(n, combat.chrome[f.id]?.deck ?? 0), 0);
    return deck ? deck + this.fitted.reduce((n, f) => n + (combat.chrome[f.id]?.ram ?? 0), 0) : 0;
  }

  /** The quickhacks the player carries. */
  private hacksOnHand(): Array<{ id: string; name: string; ram: number }> {
    const { hacks } = this.rules.gear.hacks;
    return [...new Set(this.items.filter((i) => i.kind === 'quickhack' && hacks[i.id]).map((i) => i.id))].map((id) => ({ id, name: hacks[id]!.name, ram: hacks[id]!.ram }));
  }

  /** Takes the rounds fired and reloaded out of the player's gun and pockets. */
  private spendRounds(before: Fighter, after: Fighter): void {
    const item = before.arm.item ? this.items.find((i) => i.id === before.arm.item) : undefined;
    // A blade has no magazine; a gun that didn't fire or reload is as it was.
    if (!item || !before.arm.magazine || (after.loaded === before.loaded && after.spare === before.spare)) return;
    item.loaded = after.loaded;
    let reloaded = before.spare - after.spare;
    const weapon = weaponOf(item, this.rules.gear.arms);
    const ammo = weapon ? ammoFor(weapon, this.rules.gear.arms) : null;
    for (const stack of this.items.filter((i) => i.kind === 'ammo' && i.id === ammo)) {
      if (reloaded <= 0) break;
      const n = Math.min(stack.count, reloaded);
      stack.count -= n;
      reloaded -= n;
    }
    for (let i = this.items.length - 1; i >= 0; i--) if (this.items[i]!.kind === 'ammo' && this.items[i]!.count <= 0) this.items.splice(i, 1);
    this.events.emit('inventoryChanged', this.inventory);
  }

  /** What someone carries into a fight, drawn on their own stream: by their gang, their job, their walk of life. Most people carry nothing and fight with their fists. */
  armOf(person: Person): Arm {
    const { combat } = this.rules;
    const rng = createRng(`${person.id}:arms`);
    const walk = walkOf(person, this.world);
    if (!rng.chance(combat.carry.chance[walk])) return FISTS;
    const pool = person.gang ? (combat.carry.gangs[person.gang] ?? combat.carry.street) : walk === 'guard' ? combat.carry.guard : walk === 'corpo' ? combat.carry.corpo : combat.carry.street;
    const total = pool.reduce((n, [, w]) => n + w, 0);
    let roll = rng.next() * total;
    let id = pool[0]?.[0] ?? 'fists';
    for (const [entry, w] of pool) {
      roll -= w;
      if (roll < 0) {
        id = entry;
        break;
      }
    }
    return this.armFor(id) ?? FISTS;
  }

  /** A weapon or an implant that fights, by its id, as an arm; null for anything else. */
  private armFor(id: string): Arm | null {
    const { combat, gear } = this.rules;
    const weapon = gear.arms.weapons[id];
    if (weapon) return { id, name: weapon.name, short: weapon.short, cls: weapon.class, ...(weapon.tech ? { tech: weapon.tech } : {}), magazine: weapon.magazine ?? 0 };
    const implant = gear.chrome.implants[id];
    const cls = combat.chrome[id]?.arm;
    if (implant && cls) return { id, name: implant.name, short: implant.short, cls, magazine: 0 };
    return null;
  }

  /** Their arm this beat: chrome knocked out by a quickhack leaves them their fists. */
  private theirArmNow(them: Fighter): Arm {
    return them.chromeOff > 0 && this.rules.gear.chrome.implants[them.arm.id] ? FISTS : them.arm;
  }

  /** Someone's health in a fight: more for the brave, for gangers and guards, less for their years. */
  private healthOf(person: Person): number {
    const p = this.rules.combat.people;
    return Math.round(p.base + person.traits.courage * p.courage + (person.gang ? p.gang : 0) + (GUARD.test(person.job.role) ? p.guard : 0) + (person.age >= 56 ? p.elder : 0));
  }

  /** Someone's armor: by their gang, a guard's vest, a corpo's tailoring, or nothing. */
  private armorOf(person: Person): number {
    const a = this.rules.combat.armor;
    if (person.gang) return a.gangs[person.gang] ?? a.gang;
    if (GUARD.test(person.job.role)) return a.guard;
    return isCorpo(person, this.world) ? a.corpo : a.street;
  }


  // ───────────── Weapons ─────────────

  /** The weapon the player would pull on someone, and how it stands: a loaded gun before an empty one, any gun before a blade. Null when they carry none. */
  armed(): { id: string; name: string; short: string; gun: boolean; loaded: number; magazine: number } | null {
    const drawn = drawWeapon(this.items, this.rules.gear.arms);
    if (!drawn) return null;
    return { id: drawn.item.id, name: drawn.weapon.name, short: drawn.weapon.short, gun: drawn.gun, loaded: drawn.item.loaded ?? 0, magazine: drawn.weapon.magazine ?? 0 };
  }

  /** What can be done with a weapon carried: load it (there are rounds for it and room in the magazine), or unload it. Neither for a blade, or a gun sold sealed. */
  canLoad(id: string): { load: boolean; unload: boolean } {
    const arms = this.rules.gear.arms;
    const item = this.items.find((i) => i.id === id && i.kind === 'weapon');
    const weapon = item ? weaponOf(item, arms) : null;
    const ammo = weapon ? ammoFor(weapon, arms) : null;
    if (!item || !weapon || !ammo || weapon.disposable) return { load: false, unload: false };
    const loaded = item.loaded ?? 0;
    return { load: loaded < (weapon.magazine ?? 0) && this.items.some((i) => i.kind === 'ammo' && i.id === ammo), unload: loaded > 0 };
  }

  /**
   * Loads a gun from the rounds carried for it: as many as its magazine takes and the
   * pockets have, the ones in its own pocket first. The rounds weigh with the gun once
   * they're in it, so it takes from another pocket only as many as its own will bear. A
   * gun sold sealed takes none.
   */
  load(id: string): boolean {
    const arms = this.rules.gear.arms;
    const item = this.items.find((i) => i.id === id && i.kind === 'weapon');
    const weapon = item ? weaponOf(item, arms) : null;
    const ammoId = weapon ? ammoFor(weapon, arms) : null;
    if (!item || !weapon || !ammoId) return false;
    const ammo = arms.ammo[ammoId];
    const magazine = weapon.magazine ?? 0;
    const loaded = item.loaded ?? 0;
    if (weapon.disposable) {
      this.say(`The ${weapon.short} is sealed: there is no reloading it.`, 'error');
      return false;
    }
    if (loaded >= magazine) {
      this.say(`The ${weapon.short} is full: ${loaded}/${magazine}.`);
      return false;
    }
    const stacks = this.items.filter((i) => i.kind === 'ammo' && i.id === ammoId).sort((a, b) => Number(b.in === item.in) - Number(a.in === item.in));
    const have = stacks.reduce((n, stack) => n + stack.count, 0);
    if (!have) {
      this.say(`No ${ammo?.name ?? 'ammo'} on you for the ${weapon.short}.`, 'error');
      return false;
    }
    // Rounds already in the gun's pocket weigh the same in the gun; the rest must fit the pocket's weight.
    const pocket = this.pockets.find((p) => p.id === item.in);
    const own = stacks.filter((stack) => stack.in === item.in).reduce((n, stack) => n + stack.count, 0);
    const kind = pocket ? this.rules.gear.kinds[pocket.kind] : undefined;
    const spare = pocket && kind ? kind.maxGrams - loadOf(pocket, this.pockets, this.items, this.money, this.rules.gear, this.rules.food.dishes).grams : Infinity;
    const bears = own + Math.max(0, Math.floor(spare / Math.max(1, ammo?.grams ?? 1)));
    const take = Math.min(magazine - loaded, have, bears);
    if (take <= 0) {
      this.say(`The ${kind?.name.toLowerCase() ?? 'pocket'} can't bear the weight of the rounds. Move the ${weapon.short}, or lighten it.`, 'error');
      return false;
    }
    let left = take;
    for (const stack of stacks) {
      const from = Math.min(stack.count, left);
      stack.count -= from;
      left -= from;
      if (stack.count <= 0) this.items.splice(this.items.indexOf(stack), 1);
      if (!left) break;
    }
    item.loaded = loaded + take;
    const short = take < magazine - loaded && take < have ? ` Its ${kind?.name.toLowerCase() ?? 'pocket'} won't bear more.` : take < magazine - loaded ? ` That's all the ${ammo?.name ?? 'ammo'} you had.` : '';
    this.say(`You load the ${weapon.short}: ${item.loaded}/${magazine}.${short}`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /** Takes the rounds out of a gun, into a pocket with room for them (one with a stack of them first); as many as fit, if not all. */
  unload(id: string): boolean {
    const arms = this.rules.gear.arms;
    const item = this.items.find((i) => i.id === id && i.kind === 'weapon');
    const weapon = item ? weaponOf(item, arms) : null;
    const ammoId = weapon ? ammoFor(weapon, arms) : null;
    if (!item || !weapon || !ammoId || weapon.disposable || !item.loaded) return false;
    const rounds = item.loaded;
    const name = arms.ammo[ammoId]?.name ?? 'ammo';
    // Weighed out of the gun, then put away (onto a stack of them, where one has room): as many as one pocket will take.
    item.loaded = 0;
    const proto = { id: ammoId, kind: 'ammo' as const };
    let count = rounds;
    let home = this.pocketFor(proto, count);
    while (!home && count > 1) home = this.pocketFor(proto, --count);
    if (!home) {
      item.loaded = rounds;
      this.say(`No room on you for the rounds: they stay in the ${weapon.short}.`, 'error');
      return false;
    }
    item.loaded = rounds - count;
    const stack = this.items.find((i) => i.kind === 'ammo' && i.id === ammoId && i.in === home);
    if (stack) stack.count += count;
    else this.items.push({ id: ammoId, kind: 'ammo', name, count, in: home });
    this.say(count < rounds ? `You take ${count} rounds out of the ${weapon.short}: no room on you for the other ${rounds - count}.` : `You unload the ${weapon.short}: ${count} rounds of ${name} into your pockets.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  // ───────────── The bank ─────────────

  /** The bank the player is inside, if any: its name, its cut for coins, and what it hands over in one go. */
  bank(now = Date.now()): { name: string; fee: number; withdrawals: number[] } | null {
    const at = this.inside;
    // A branch whose people the player has crossed keeps its counter closed to them, like any storefront.
    if (at?.business !== 'bank' || !this.atCounter() || this.barred(now) || !this.counterOpen(at, now)) return null;
    return { name: at.name, fee: this.rules.money.coinFee, withdrawals: [...this.rules.money.withdrawals] };
  }

  /** Puts all the cash in the account, less the bank's cut for counting the coins. False with no bank or no cash. */
  deposit(): boolean {
    if (!this.bank() || !cash(this.money)) return false;
    const put = cash(this.money);
    const { money, fee } = toAccount(this.money, this.rules.money);
    this.money = money;
    this.say(`Deposited ${put} €$${fee ? `, less ${fee} €$ for counting the coins` : ''}. ${money.account} €$ in the bank.`, 'system');
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** Takes bills out of the account, as far as the account has them and the wallet will hold them. */
  withdraw(amount: number): boolean {
    if (!this.bank()) return false;
    const room = walletRoom(this.pockets, this.money, this.rules.gear);
    const money = fromAccount(this.money, amount);
    if (!money) {
      this.say(`There isn't ${amount} €$ in the account: ${this.money.account} €$.`, 'error');
      return false;
    }
    if (amount > room) {
      this.say(`Your wallet won't hold ${amount} €$ more in bills${room ? ` (room for ${room})` : ''}.`, 'error');
      return false;
    }
    this.money = money;
    this.say(`Withdrew ${amount} €$ in bills. ${money.account} €$ left in the bank.`, 'system');
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
    this.say(`Banked ${clean.length === 1 ? 'the chip' : `${clean.length} chips`}: ${sum} €$ into the account. ${this.money.account} €$ in the bank.${back}`, 'system');
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
   * Eats or drinks one of something carried (from the pocket `from`, when it's in more than
   * one). False if there's none, or it isn't for eating.
   * Food and soft drinks do nothing yet; alcohol goes to the head.
   */
  consume(id: string, now: number, from?: string): boolean {
    const item = this.items.find((i) => i.id === id && i.kind === 'consumable' && (from === undefined || i.in === from));
    const med = item ? this.rules.gear.medical.meds[id] : undefined;
    if (item && med) return this.medicate(item, med, now);
    if (item && this.rules.gear.drugs[id]) return this.useDrug(item, now);
    const dish = item ? this.rules.food.dishes.find((d) => d.id === id) : undefined;
    if (!item || !dish) return false;
    const hunger = this.rules.needs?.hunger;
    const was = this.hunger(now);
    // Full, there's no eating more; a drink still goes down.
    if (hunger && was && dish.kind === 'food' && was.value >= hunger.full) {
      this.say(this.narration(hunger.lines.full, {}, createRng(`${this.world.seed}:full:${now}`)), 'system');
      return false;
    }
    this.takeOne(item);
    if (hunger) {
      this.settleMeters(now);
      this.hungerState = eat(this.hungerState, fillOf(dish, hunger), hunger, this.rules.timeScale, now);
    }
    if (dish.kind === 'alcohol') this.drink(dish.name, dish.alcohol ?? 0, now);
    else this.say(`You ${dish.kind === 'food' ? 'eat' : 'drink'} the ${dish.name}.`);
    const fed = this.hunger(now);
    if (hunger && was?.stage && fed && fed.stage !== was.stage && (!fed.stage || fed.stage.below > was.stage.below) && was.stage.energy * was.stage.health < 1) this.say(this.narration(hunger.lines.better, {}, createRng(`${this.world.seed}:fed:${now}`)), 'system');
    this.hungerTold = fed?.stage ?? null;
    this.events.emit('inventoryChanged', this.inventory);
    if (hunger) {
      this.events.emit('energyChanged', this.energy(now));
      this.events.emit('healthChanged', this.health(now));
    }
    return true;
  }

  /** Takes a med out of a fight: all it gives back, at once. Not when the player is whole, and not mid-fight (that's the Heal move). */
  private medicate(item: Item, med: MedKind, now: number): boolean {
    if (this.fighting) return false;
    const health = this.health(now);
    if (health.current >= health.max) {
      this.say(`You're not hurt: the ${med.name} keeps for when you are.`, 'system');
      return false;
    }
    this.takeOne(item);
    const value = Math.min(health.max, health.current + medTotal(med));
    this.healthState = { value, at: now };
    this.say(`You take the ${med.name}: +${value - health.current} health.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('healthChanged', this.health(now));
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

  /** The player's main job, for saving (an older build reads only this). */
  get jobSaved(): JobState | null {
    return this.jobs[0] ? { ...this.jobs[0] } : null;
  }

  /** Every job the player holds, the main one first, for saving. */
  get jobsSaved(): JobState[] {
    return this.jobs.map((j) => ({ ...j, ...(j.days ? { days: [...j.days] } : {}) }));
  }

  /** Shifts worked in each line of work, for saving. */
  get careerSaved(): Record<string, number> {
    return { ...this.career };
  }

  private buildingOf(id: string): Building | undefined {
    return this.world.buildings.find((b) => b.id === id);
  }

  /** A job as it stands now: where, for whom, which rung, when, what's owed, and whether a shift can start. */
  private statusOf(job: JobState, now: number): JobStatus | null {
    const building = this.buildingOf(job.building);
    const ladder = building ? ladderFor(building, this.rules.jobs) : null;
    if (!building || !ladder) return null;
    const rung = rungOf(job, ladder.rungs);
    const shift = shiftDay(this.clockAt(now), ladder.hours);
    const days = this.daysOf(job, ladder);
    const here = this.inside?.id === building.id;
    const off = !days.includes(shift.weekday);
    const done = job.lastShiftDay === shift.day;
    const closed = !shiftOpen(this.clockAt(now).hour, ladder.hours);
    const blocked = !here ? 'away' : off ? 'off' : done ? 'done' : closed ? 'closed' : null;
    const side = this.jobs.indexOf(job) > 0;
    return { building, boss: bossOf(building, this.population), rung, next: nextRung(job, ladder.rungs), trust: job.trust, shifts: job.shifts, pay: this.shiftPayAt(rung, building, job.raise ?? 0), side, hours: ladder.hours, days, owed: job.owed ?? 0, here, open: !off && !done && !closed, blocked, perks: this.perksOf(job, building) };
  }

  /** The days a job has the player on: as set, else the roster a new job of its hours starts with. */
  private daysOf(job: JobState, ladder: Ladder): number[] {
    return job.days ?? (overnight(ladder.hours) ? this.rules.jobs.roster.night : this.rules.jobs.roster.day);
  }

  /** Every job the player holds as it stands now, the main one first. */
  jobsStatus(now: number): JobStatus[] {
    return this.jobs.flatMap((j) => this.statusOf(j, now) ?? []);
  }

  /** The job at the building the player is in, else the main one; null without a job. */
  jobStatus(now: number): JobStatus | null {
    const here = this.inside ? this.jobs.find((j) => j.building === this.inside?.id) : undefined;
    const job = here ?? this.jobs[0];
    return job ? this.statusOf(job, now) : null;
  }

  /** The tier a storefront runs at: its menu's, its rack's, or drawn the way its district eats. */
  private tierOf(building: Building): Quality {
    const { food, gear } = this.rules;
    return menuFor(this.world, building, food)?.venue.quality ?? (building.business ? gear.quality[building.business] : undefined) ?? drawQuality(this.world, building);
  }

  /** The job a new one at `building` would take the place of: one whose hours overlap it. As many as fit the day, none overlapping. */
  private displacedBy(building: Building): JobState | undefined {
    const ladder = ladderFor(building, this.rules.jobs);
    if (!ladder) return undefined;
    const clash = this.jobs.find((j) => {
      const other = this.buildingOf(j.building);
      const hours = other ? ladderFor(other, this.rules.jobs)?.hours : undefined;
      return hours ? overlaps(hours, ladder.hours) : false;
    });
    return clash;
  }

  /**
   * What there is to do about work with someone who runs a place that hires: ask them for a job
   * (`hire`), ask for one that means handing in notice elsewhere (`switch`: its hours clash with
   * one the player has), or, for a boss of the player's, `quit`. Null for anyone else.
   */
  workWith(id: string): 'hire' | 'switch' | 'quit' | null {
    const person = this.person(id);
    const runs = person ? bossAt(person, this.world, this.population, this.rules.jobs) : null;
    if (!runs) return null;
    if (this.jobs.some((j) => j.building === runs.id)) return 'quit';
    return this.displacedBy(runs) ? 'switch' : 'hire';
  }

  /** The job a yes from someone would mean handing in notice at: its place's name, or null. */
  switchingFrom(id: string): string | null {
    const person = this.person(id);
    const runs = person ? bossAt(person, this.world, this.population, this.rules.jobs) : null;
    const leaving = runs && !this.jobs.some((j) => j.building === runs.id) ? this.displacedBy(runs) : undefined;
    return leaving ? (this.buildingOf(leaving.building)?.name ?? null) : null;
  }

  /** The hours a job's shifts run, as people say them. */
  private shiftHours(hours: [number, number]): string {
    const h = (n: number) => `${((n + 11) % 12) + 1}${n < 12 ? 'am' : 'pm'}`;
    return `${h(hours[0])} to ${h(hours[1])}`;
  }

  /** Weekdays as a roster says them, the week from Monday: "Mon–Fri", "Thu, Fri, Sat", "Sat, Sun". */
  private daysWord(days: number[]): string {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const order = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const run = order.length > 3 && order.every((d, i) => i === 0 || d === ((order[i - 1] as number) + 1) % 7);
    return run ? `${names[order[0] as number]}–${names[order[order.length - 1] as number]}` : order.map((d) => names[d]).join(', ');
  }

  /**
   * Asks a boss here for work. A yes starts the player on a rung their experience in that line
   * reaches (`JOBS.experience` of the shifts worked in it, and a reference from a boss who liked
   * them, `JOBS.reference`); a job whose hours clash with it (or the last, with no room for
   * another) is handed in, with notice: less than walking out, and the boss let go of it says
   * a word for the player if they liked them. A second job beside the first is a side gig.
   */
  askForWork(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    const runs = here ? bossAt(here.person, this.world, this.population, this.rules.jobs) : null;
    if (!here || !runs || this.jobs.some((j) => j.building === runs.id)) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines, jobs } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const ladder = ladderFor(runs, jobs) as Ladder;
    const leaving = this.displacedBy(runs);
    // A reference from the boss of the job being left, if they liked the player.
    const oldBoss = leaving ? bossOf(this.buildingOf(leaving.building) as Building, this.population) : null;
    const reference = Boolean(oldBoss && jobs.reference.stances.includes(this.stanceOf(oldBoss, now)));
    const line_ = lineOf(runs, jobs) as string;
    const start = startOf(ladder, this.career[line_] ?? 0, reference, jobs);
    const first = ladder.rungs[start.rung] as Rung;
    const pay = this.shiftPayAt(first, runs, 0);
    const speaker = this.speakerFor(person, stance, doing, now);
    speaker.vars = { ...speaker.vars, title: first.title.toLowerCase(), work: runs.name, pay: String(pay), ...(start.rung > 0 ? { experienced: 'yes' } : {}), ...(reference && oldBoss ? { referee: oldBoss.given } : {}) };
    const rng = createRng(`${this.world.seed}:${id}:hire:${standing.asks}`);
    const before = this.snapshot(person, now);
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
      const reply = replyTo(openness('hire', stance, this.charismaEdge, person.traits, society.openness) + this.leaning(person.id, now), society.openness, rng);
      if (reply === 'answer') {
        hired = true;
        // The new job takes the place of the one handed in: a day job for a day job.
        const slot = leaving ? this.jobs.indexOf(leaving) : this.jobs.length;
        if (leaving) this.leaveJob(leaving, now, 'notice');
        const today = shiftDay(this.clockAt(now), ladder.hours).day;
        const job: JobState = { building: runs.id, rung: start.rung, trust: start.trust, shifts: 0, lastShiftDay: -1, days: [...this.daysOf({} as JobState, ladder)], owed: 0, raise: 0, missed: 0, checked: today, paidOn: today - ((weekdayOf(today) - this.rules.life.economy.payday + 7) % 7) };
        this.jobs.splice(slot, 0, job);
        // A second job is a side gig; the main job's boss hasn't heard of it yet.
        if (this.jobs.length > 1) (this.jobs[0] as JobState).heard = false;
        this.remember(id, { kind: 'hired', at: now, what: runs.name }, now);
        this.speech(person, compose(lines.work.hire, speaker, lines, rng, { opener: false }), now);
        // The boss has a name and a job now, as far as the player's concerned.
        learnFact(this.society, id, 'name');
        learnFact(this.society, id, 'job');
        const what = this.jobs.indexOf(job) > 0 ? 'a side gig' : 'work';
        this.say(`You've got ${what} at ${runs.name}: ${first.title.toLowerCase()}, ${pay} €$ a shift, ${this.shiftHours(ladder.hours)}, ${this.daysWord(job.days ?? [])}. Pay comes on payday.${reference && oldBoss ? ` ${oldBoss.given} put in a word for you.` : ''}`, 'system');
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
    this.noteFeedback(person, before, now, pressed ? lines.notes.pressed : hired ? lines.notes.hired : '', speaker.vars);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /**
   * Works a shift at the job here: on a rostered day, in its hours, once that day, for the
   * rung's energy. The pay is owed, paid on payday; the shift is trust, and regard with the
   * boss, and standing with the place, and a shift more in that line of work; the boss, if
   * about, says something, and moves the player up once there's trust enough and they've
   * warmed to them. The main job's boss who hears of a side gig may mind.
   */
  work(now: number): boolean {
    if (this.detained(now) || this.checkFired(now)) return false;
    const job = this.inside ? this.jobs.find((j) => j.building === this.inside?.id) : undefined;
    const status = job ? this.statusOf(job, now) : this.jobStatus(now);
    if (!status) return false;
    const { society, timeScale, lines, jobs } = this.rules;
    const { building, boss, rung, pay } = status;
    const mask = this.masked();
    if (status.blocked === 'away') this.say(`Your shift is at ${building.name}.`, 'error');
    else if (status.blocked === 'off') this.say(`You're not on today. Your days at ${building.name}: ${this.daysWord(status.days)}.`, 'error');
    else if (status.blocked === 'done') this.say("You've done your shift today. Back next time you're on.", 'error');
    else if (status.blocked === 'closed') this.say(`Shifts run ${this.shiftHours(status.hours)}. Come back then.`, 'error');
    else if (mask) this.say(`Nobody works a shift in a ${mask.word}. Take it off.`, 'error');
    if (!job || status.blocked || mask) return false;
    if (!this.spendEnergy(rung.energy, now)) return false;
    job.shifts += 1;
    job.trust += jobs.trustPerShift;
    job.lastShiftDay = shiftDay(this.clockAt(now), status.hours).day;
    job.missed = 0;
    job.owed = (job.owed ?? 0) + pay;
    const line_ = lineOf(building, jobs);
    if (line_) this.career[line_] = (this.career[line_] ?? 0) + 1;
    this.say(`A shift ${rung.doing} at ${building.name}: ${pay} €$ on your pay, ${job.owed} €$ owed by payday.${this.staffMeal(building)}`, 'system');
    changeRep(this.society, `business:${building.id}`, jobs.rep, society, timeScale, now);
    if (boss) {
      learnOf(this.society, boss.id, 'met');
      changeStanding(this.society, boss.id, { met: true, rapport: jobs.rapport }, society, timeScale, now);
      const about = this.isHere(boss.id, now);
      if (about) {
        const stance = this.stanceOf(boss, now);
        const speaker = this.speakerFor(boss, stance, about.doing, now);
        const rng = createRng(`${this.world.seed}:shift:${building.id}:${job.shifts}`);
        const ladder = ladderFor(building, jobs) as Ladder;
        const side = this.jobs[1] ? this.buildingOf(this.jobs[1].building) : undefined;
        if (job === this.jobs[0] && side && job.heard === false) {
          // Word of the side gig reaches the main boss; a loyal one minds.
          job.heard = true;
          const minds = boss.traits.loyalty >= jobs.moonlight.loyalty;
          speaker.vars = { ...speaker.vars, work: building.name, gig: side.name };
          this.speech(boss, line(minds ? lines.work.moonlight : lines.work.sideGig, speaker, rng), now);
          if (minds) changeStanding(this.society, boss.id, { rapport: -jobs.moonlight.rapport }, society, timeScale, now);
        } else if (canPromote(job, ladder.rungs, stance, jobs)) {
          job.rung += 1;
          const up = rungOf(job, ladder.rungs);
          const raise = this.shiftPayAt(up, building, job.raise ?? 0);
          this.remember(boss.id, { kind: 'promoted', at: now, what: up.title.toLowerCase() }, now);
          speaker.vars = { ...speaker.vars, title: up.title.toLowerCase(), work: building.name, pay: String(raise) };
          this.speech(boss, compose(lines.work.promote, speaker, lines, rng, { opener: false }), now);
          this.say(`You're moved up: ${up.title.toLowerCase()} at ${building.name}, ${raise} €$ a shift.`, 'system');
        } else if (rng.chance(0.5)) {
          speaker.vars = { ...speaker.vars, title: rung.title.toLowerCase(), work: building.name, pay: String(pay) };
          this.speech(boss, line(lines.work.shift, speaker, rng), now);
        }
      } else if (job === this.jobs[0] && this.jobs[1] && job.heard === false) {
        job.heard = true;
      }
    }
    this.staffUniform(job, building, now);
    this.drawShiftEvent(job, building, pay, now);
    this.events.emit('jobChanged', this.jobStatus(now));
    this.events.emit('societyChanged', { people: boss ? [boss.id] : [] });
    return true;
  }

  /** Puts the player on a job's roster for these weekdays (0 Sunday – 6 Saturday; at least one). From the boss's card. */
  setRoster(bossId: string, days: number[], now: number): boolean {
    const job = this.jobOfBoss(bossId);
    const building = job ? this.buildingOf(job.building) : undefined;
    const clean = [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
    if (!job || !building || !clean.length) return false;
    job.days = clean;
    this.say(`Your days at ${building.name}: ${this.daysWord(clean)}.`, 'system');
    this.events.emit('jobChanged', this.jobStatus(now));
    return true;
  }

  /** The player's job at the place someone runs. */
  private jobOfBoss(bossId: string): JobState | undefined {
    const person = this.person(bossId);
    const runs = person ? bossAt(person, this.world, this.population, this.rules.jobs) : null;
    return runs ? this.jobs.find((j) => j.building === runs.id) : undefined;
  }

  /** Quits a job: the one at the place `bossId` runs, else the main one. If the boss is about, they hear it from the player. What's owed is paid out. */
  quit(now: number, bossId?: string): boolean {
    const job = (bossId ? this.jobOfBoss(bossId) : undefined) ?? this.jobs[0];
    if (!job || !this.statusOf(job, now)) return false;
    this.leaveJob(job, now, 'quit');
    return true;
  }

  /**
   * The end of a job: walked out on (`quit`, the boss remembers it), handed in with notice
   * (`notice`, for another job: less to forgive), let go for missing days (`fired`), or gone with
   * the place (`closed`). What's owed is paid out to the account, out of the place's till.
   */
  private leaveJob(job: JobState, now: number, how: 'quit' | 'notice' | 'fired' | 'closed'): void {
    const status = this.statusOf(job, now);
    const { lines, society, timeScale, jobs } = this.rules;
    this.jobs = this.jobs.filter((j) => j !== job);
    if (this.jobs[0]) delete this.jobs[0].heard;
    this.payOut(job, status?.building.name ?? 'the place');
    // Gone under, nobody's to blame for it but the books: nothing to say, nothing to remember.
    if (!status || how === 'closed') {
      this.events.emit('jobChanged', this.jobStatus(now));
      return;
    }
    const { boss, building, rung } = status;
    const about = boss ? this.isHere(boss.id, now) : undefined;
    const before = boss ? this.snapshot(boss, now) : null;
    if (boss && about && how !== 'fired') {
      const speaker = this.speakerFor(boss, about.stance, about.doing, now);
      speaker.vars = { ...speaker.vars, work: building.name, title: rung.title.toLowerCase() };
      const rng = createRng(`${this.world.seed}:${how}:${building.id}:${status.shifts}`);
      this.logged(boss.id, 'you', line(how === 'notice' ? lines.you.notice : lines.you.quit, speaker, rng), now);
      this.speech(boss, line(how === 'notice' ? lines.work.notice : lines.work.quit, speaker, rng), now);
    }
    if (boss) {
      // Told to their face or heard from the staff, the boss remembers it: walking out costs more than notice.
      this.remember(boss.id, { kind: how, at: now, what: how === 'fired' ? building.name : rung.title.toLowerCase() }, now);
      if (how !== 'fired') changeStanding(this.society, boss.id, { rapport: -(how === 'notice' ? jobs.notice : jobs.quit) }, society, timeScale, now);
      if (before && how !== 'fired') this.noteFeedback(boss, before, now, how === 'notice' ? lines.notes.notice : lines.notes.quit);
    }
    if (how === 'quit') this.say(`You don't work at ${building.name} anymore.`, 'system');
    else if (how === 'notice') this.say(`You hand in your notice at ${building.name}.`, 'system');
    this.events.emit('jobChanged', this.jobStatus(now));
    if (boss) this.events.emit('societyChanged', { people: [boss.id] });
  }

  /** Pays a job's owed pay into the account, out of the place's till. */
  private payOut(job: JobState, name: string): void {
    const owed = job.owed ?? 0;
    if (owed <= 0) return;
    job.owed = 0;
    this.money = { ...this.money, account: this.money.account + owed };
    tillOf(this.life.tills, job.building).pending -= owed;
    this.say(`${owed} €$ from ${name} to your account.`, 'system');
    this.events.emit('walletChanged', this.wallet);
  }

  /**
   * Goes over each job's days since it was last looked at, as each is over: a rostered day with
   * no shift costs trust and rapport with the boss (enough in a row, and the player's let go).
   * Come payday, what's owed is paid, with a raise at a place that's thriving for a week worked.
   */
  private punchClock(now: number): void {
    const { jobs, life } = this.rules;
    const clock = this.clockAt(now);
    for (const job of [...this.jobs]) {
      const building = this.buildingOf(job.building);
      const ladder = building ? ladderFor(building, jobs) : null;
      if (!building || !ladder) continue;
      // The place went under, and the job with it.
      if (this.life.closed?.[building.id]) {
        this.say(`${building.name} has gone under: it couldn't pay its people, and now there's nobody to pay. Your job there is gone with it.`, 'error');
        this.leaveJob(job, now, 'closed');
        continue;
      }
      const today = shiftDay(clock, ladder.hours).day;
      if (job.checked === undefined) job.checked = today - 1;
      const days = this.daysOf(job, ladder);
      for (let d = job.checked + 1; d < today && this.jobs.includes(job); d++) {
        if (days.includes(weekdayOf(d))) {
          if (job.lastShiftDay === d) job.missed = 0;
          else {
            job.missed = (job.missed ?? 0) + 1;
            job.trust = Math.max(0, job.trust - jobs.noShow.trust);
            const boss = bossOf(building, this.population);
            if (boss) changeStanding(this.society, boss.id, { rapport: -jobs.noShow.rapport }, this.rules.society, this.rules.timeScale, now);
          }
        }
        job.checked = d;
        if ((job.missed ?? 0) >= jobs.noShow.fireAfter) {
          this.say(`${building.name} has let you go: you stopped showing up.`, 'error');
          this.leaveJob(job, now, 'fired');
        }
      }
      if (!this.jobs.includes(job)) continue;
      // Payday's morning pays for the week through the day before.
      const payday = today - ((weekdayOf(today) - life.economy.payday + 7) % 7);
      if (job.paidOn === undefined) job.paidOn = payday;
      if (job.paidOn >= payday) continue;
      job.paidOn = payday;
      if ((job.owed ?? 0) <= 0) continue;
      const raise = job.lastShiftDay >= payday - 7 && this.trade(building).health === 'thriving' && (job.raise ?? 0) < jobs.raise.most;
      this.payOut(job, building.name);
      if (raise) {
        job.raise = Math.min(jobs.raise.most, (job.raise ?? 0) + jobs.raise.thriving);
        this.say(`${building.name} is doing well, and it shows: a raise, to ${this.shiftPayAt(rungOf(job, ladder.rungs), building, job.raise)} €$ a shift.`, 'system');
        this.events.emit('jobChanged', this.jobStatus(now));
      }
    }
  }

  /** Lets the player go from every job at a place that has had enough of them (a storefront that won't serve them won't keep them either). True if it did. */
  private checkFired(now: number): boolean {
    const { society, timeScale } = this.rules;
    let fired = false;
    for (const job of [...this.jobs]) {
      const building = this.buildingOf(job.building);
      const banned = !building || repOf(this.society, `business:${job.building}`, society, timeScale, now) <= society.rep.banAt || (building.business ? repOf(this.society, `chain:${building.business}`, society, timeScale, now) <= society.rep.banAt : false);
      if (!banned) continue;
      fired = true;
      this.say(`${building?.name ?? 'The place'} is done with you: after what you did to its people, nobody there wants you on a shift.`, 'error');
      this.leaveJob(job, now, 'fired');
    }
    return fired;
  }

  /** What a job gets the player besides pay, as the status says it. */
  private perksOf(job: JobState, building: Building): string[] {
    const { perks } = this.rules.jobs;
    const line_ = lineOf(building, this.rules.jobs) ?? '';
    const meal = perks.meal[line_];
    return [`${Math.round(perks.discount * 100)}% off`, meal === 'food' ? 'a meal a shift' : meal === 'drink' ? 'a drink a shift' : '', job.uniform ? 'uniform' : '', job.rung >= perks.keys ? 'keys' : ''].filter(Boolean);
  }

  /** After a shift, the staff meal or drink where the line of work has one: the cheapest of its kind on the menu, into a pocket. What the shift's line says of it. */
  private staffMeal(building: Building): string {
    const meal = this.rules.jobs.perks.meal[lineOf(building, this.rules.jobs) ?? ''];
    const dish = meal ? [...(menuFor(this.world, building, this.rules.food)?.items.filter((i) => i.kind === meal) ?? [])].sort((a, b) => a.price - b.price || a.id.localeCompare(b.id))[0] : undefined;
    if (!dish) return '';
    const what = meal === 'food' ? 'meal' : 'drink';
    const pocket = this.pocketFor({ id: dish.id, kind: 'consumable' });
    if (!pocket) return ` There's a staff ${what}, ${dish.name}, but no room on you for it.`;
    const owned = this.items.find((i) => i.id === dish.id && i.kind === 'consumable' && i.in === pocket);
    if (owned) owned.count += 1;
    else this.items.push({ id: dish.id, kind: 'consumable', name: dish.name, count: 1, in: pocket });
    this.events.emit('inventoryChanged', this.inventory);
    return ` Staff ${what} on the house: ${dish.name}.`;
  }

  /** The uniform off the rack, once the rung comes with one where the line of work has them. */
  private staffUniform(job: JobState, building: Building, now: number): void {
    const at = this.rules.jobs.perks.uniform[lineOf(building, this.rules.jobs) ?? ''];
    if (at === undefined || job.rung < at || job.uniform) return;
    // The store's uniform: a top off its rack (a shirt, else a jacket), never a mask, the same for everyone there.
    const { kinds } = this.rules.gear;
    const tops = (slot: string) => (this.rack(building, now)?.items ?? []).filter((i) => i.kind === 'clothing' && kinds[i.id]?.slot === slot && !kinds[i.id]?.mask).sort((a, b) => a.id.localeCompare(b.id));
    const choice = tops('inner').length ? tops('inner') : tops('outer');
    const garment = choice.length ? createRng(`${this.world.seed}:uniform:${building.id}`).pick(choice) : undefined;
    if (!garment) return;
    const proto = this.protoFor(garment);
    const pocket = this.pocketFor(proto);
    if (!pocket) {
      this.say(`Your uniform's waiting at the counter, a ${garment.name.toLowerCase()}, for when you've room on you for it.`, 'system');
      return;
    }
    this.items.push({ ...proto, name: garment.name, count: 1, in: pocket });
    job.uniform = true;
    this.say(`Your uniform, on the house: ${garment.name}. Put it on from the inventory.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
  }

  /** A shift's moment waiting on the player (not saved: closing the game lets it pass). */
  private shiftEventState: { kind: ShiftEventKind; building: string; job: JobState; pay: number; person?: string; gang?: string; text: string } | null = null;

  /**
   * Now and then a shift brings something that wants a choice, with the people there: a rush
   * (where the line of work has them), a customer here palming something, someone from the
   * gang whose turf it is come for the cut, a coworker here asking for cover.
   */
  private drawShiftEvent(job: JobState, building: Building, pay: number, now: number): void {
    const { jobs, people, lines } = this.rules;
    const { events } = jobs;
    const rng = createRng(`${this.world.seed}:shift-event:${building.id}:${job.shifts}`);
    if (!rng.chance(events.chance)) return;
    const line_ = lineOf(building, jobs) ?? '';
    const fits = (kind: ShiftEventKind) => !events.where[kind] || (events.where[kind] as string[]).includes(line_);
    const here = this.peopleHere(now);
    const staff = new Set(this.staffOf(building).map((p) => p.id));
    const boss = bossOf(building, this.population);
    const options: Array<{ kind: ShiftEventKind; person?: Person; gang?: string }> = [];
    if (fits('rush')) options.push({ kind: 'rush' });
    if (fits('shoplifter')) {
      // A customer here, else someone from the district who's out and about, nowhere in particular, and walks in.
      const customers = here.filter((p) => !staff.has(p.person.id) && p.person.age >= 16);
      let thief = customers.length ? rng.pick(customers).person : undefined;
      if (!thief) {
        const clock = this.clockAt(now);
        const homes = new Set(this.world.buildings.filter((b) => b.district === building.district).map((b) => b.id));
        const around = this.population.people.filter((p) => p.diedOn === undefined && p.age >= 16 && p.home !== null && homes.has(p.home) && !staff.has(p.id));
        for (let i = 0; i < 12 && around.length && !thief; i++) {
          const p = rng.pick(around);
          if (!whereIs(p, this.world, clock, this.rules.food.dishes, people.out)) thief = p;
        }
      }
      if (thief) options.push({ kind: 'shoplifter', person: thief });
    }
    const turf = turfFrom(people.turf)(building.district).filter(([gang, share]) => share > 0 && people.gangs[gang]);
    if (fits('cut') && turf.length) {
      const total = turf.reduce((n, [, share]) => n + share, 0);
      let roll = rng.next() * total;
      const gang = (turf.find(([, share]) => (roll -= share) < 0) ?? turf[0])?.[0] as string;
      const today = this.clockAt(now).day;
      const inHere = here.filter((p) => p.person.gang === gang).map((p) => p.person);
      const members = inHere.length ? inHere : this.population.people.filter((p) => p.gang === gang && p.diedOn === undefined && !(p.hurtUntil !== undefined && today <= p.hurtUntil));
      if (members.length) options.push({ kind: 'cut', person: rng.pick(members), gang });
    }
    const mates = here.filter((p) => staff.has(p.person.id) && p.person.id !== boss?.id);
    if (fits('cover') && mates.length) options.push({ kind: 'cover', person: rng.pick(mates).person });
    const weighed = options.filter((o) => events.weights[o.kind] > 0);
    if (!weighed.length) return;
    let roll = rng.next() * weighed.reduce((n, o) => n + events.weights[o.kind], 0);
    const event = weighed.find((o) => (roll -= events.weights[o.kind]) < 0) ?? (weighed[weighed.length - 1] as (typeof weighed)[number]);
    const state = { kind: event.kind, building: building.id, job, pay, ...(event.person ? { person: event.person.id } : {}), ...(event.gang ? { gang: event.gang } : {}), text: '' };
    const vars = this.shiftVars(state, now);
    state.text = this.narration(events.lines[`${event.kind}Open`] ?? [], vars, rng);
    // The panel tells it, and waits on the choice; the feed is left for what comes of it.
    this.shiftEventState = state;
    // The coworker asks, and the one come for the cut says what they want.
    const person = event.person;
    if (person && (event.kind === 'cover' || event.kind === 'cut')) {
      const speaker = this.speakerFor(person, this.stanceOf(person, now), event.kind === 'cut' ? 'collecting' : 'on shift', now);
      speaker.vars = { ...speaker.vars, work: building.name };
      learnOf(this.society, person.id, 'seen');
      this.speech(person, line(event.kind === 'cut' ? lines.work.cutDemand : lines.work.coverAsk, speaker, rng), now);
    }
  }

  /** What a shift's moment is told with: who (by name if the player knows it, else their look), their pronouns, the place, the gang. */
  private shiftVars(state: { building: string; person?: string; gang?: string }, now: number): Record<string, string> {
    const person = state.person ? this.person(state.person) : undefined;
    const known = person ? this.describe(person.id, now) : null;
    const who = known ? (known.named ? known.name : known.name.charAt(0).toLowerCase() + known.name.slice(1)) : '';
    const said = person ? this.speakerFor(person, this.stanceOf(person, now), '', now).vars : {};
    return { who, he: said.he ?? 'they', his: said.his ?? 'their', him: said.him ?? 'them', work: this.buildingOf(state.building)?.name ?? '', gang: state.gang ? (this.rules.people.gangs[state.gang]?.name ?? '') : '' };
  }

  /** The shift's moment waiting on the player here, and the choices it offers; null when there's none. */
  shiftEvent(now = Date.now()): { kind: ShiftEventKind; text: string; choices: ShiftChoice[]; person?: string; gang?: string } | null {
    const state = this.shiftEventState;
    if (!state || this.inside?.id !== state.building) return null;
    const { rush, cover } = this.rules.jobs.events;
    const energy = this.energy(now).current;
    const choices: Record<ShiftEventKind, ShiftChoice[]> = {
      rush: [{ id: 'hustle', label: 'Hustle', sub: `${rush.energy} energy, tips`, disabled: energy < rush.energy }, { id: 'pace', label: 'Keep pace' }],
      shoplifter: [{ id: 'stop', label: 'Stop them' }, { id: 'let', label: 'Let it go' }],
      cut: [{ id: 'pay', label: 'Hand it over' }, { id: 'stand', label: 'Stand up' }],
      cover: [{ id: 'cover', label: 'Cover', sub: `+${Math.round(state.pay * cover.pay)} €$, ${cover.energy} energy`, disabled: energy < cover.energy }, { id: 'decline', label: 'Not today' }],
    };
    return { kind: state.kind, text: state.text, choices: choices[state.kind] ?? [], ...(state.person ? { person: state.person } : {}), ...(state.gang ? { gang: state.gang } : {}) };
  }

  /** Answers the shift's moment here: what it costs and gets the player, with the place, the boss and whoever was in it. */
  answerShift(choice: string, now = Date.now()): boolean {
    const state = this.shiftEventState;
    const view = this.shiftEvent(now);
    const pick = view?.choices.find((c) => c.id === choice);
    if (!state || !pick || pick.disabled) return false;
    this.shiftEventState = null;
    const { jobs, society, timeScale, lines } = this.rules;
    const { events } = jobs;
    const building = this.buildingOf(state.building) as Building;
    const { job } = state;
    const rng = createRng(`${this.world.seed}:shift-answer:${state.building}:${job.shifts}:${choice}`);
    const person = state.person ? this.person(state.person) : undefined;
    const before = person ? this.snapshot(person, now) : null;
    const vars = this.shiftVars(state, now);
    const boss = bossOf(building, this.population);
    const tell = (key: string, more: Record<string, string> = {}) => this.say(this.narration(events.lines[key] ?? [], { ...vars, ...more }, rng), 'system');
    const to = (who: Person | null | undefined, by: { rapport?: number; grudge?: number }) => {
      if (who) changeStanding(this.society, who.id, by, society, timeScale, now);
    };
    const says = (who: Person | undefined, pool: Line[]) => {
      if (!who) return;
      const speaker = this.speakerFor(who, this.stanceOf(who, now), 'on shift', now);
      speaker.vars = { ...speaker.vars, work: building.name };
      this.speech(who, line(pool, speaker, rng), now);
    };
    // The boss, if they're about, says something to the player who stood up for the place.
    const bossSaw = () => {
      if (boss && this.isHere(boss.id, now)) says(boss, lines.work.stood);
    };
    // Too tired after all: the moment waits.
    const tired = (energy: number) => {
      if (this.spendEnergy(energy, now)) return false;
      this.shiftEventState = state;
      return true;
    };
    if (choice === 'hustle') {
      if (tired(events.rush.energy)) return false;
      const tips = Math.max(1, Math.round(rng.int(events.rush.tips[0], events.rush.tips[1]) * jobs.tiers[this.tierOf(building)]));
      // Tips are cash: what the wallet and the change pocket hold, and the rest on the pay.
      const loot = splitLoot(tips, this.rules.money);
      const bills = Math.min(loot.bills, walletRoom(this.pockets, this.money, this.rules.gear));
      const coins = Math.min(loot.coins, changeRoom(this.pockets, this.items, this.money, this.rules.gear, this.rules.food.dishes));
      this.money = { ...this.money, bills: this.money.bills + bills, coins: this.money.coins + coins };
      job.owed = (job.owed ?? 0) + tips - bills - coins;
      job.trust += events.rush.trust;
      changeRep(this.society, `business:${building.id}`, events.rush.rep, society, timeScale, now);
      tell('rushHustle', { tips: String(tips) });
      this.events.emit('walletChanged', this.wallet);
    } else if (choice === 'pace') {
      tell('rushPace');
    } else if (choice === 'stop') {
      job.trust += events.shoplifter.trust;
      changeRep(this.society, `business:${building.id}`, events.shoplifter.rep, society, timeScale, now);
      to(boss, { rapport: events.shoplifter.rapport });
      to(person, { grudge: events.shoplifter.grudge });
      if (person) learnOf(this.society, person.id, 'met');
      tell('shoplifterStop');
      says(person, lines.work.caught);
      bossSaw();
    } else if (choice === 'let') {
      to(person, { rapport: events.shoplifter.thanks });
      tillOf(this.life.tills, building.id).pending -= events.shoplifter.loss;
      tell('shoplifterLet');
    } else if (choice === 'pay') {
      if (state.gang) changeRep(this.society, `gang:${state.gang}`, events.cut.paid, society, timeScale, now);
      tell('cutPay');
      says(person, lines.work.cutPaid);
    } else if (choice === 'stand') {
      const odds = Math.min(0.9, events.cut.odds + this.charismaEdge * events.cut.perLevel);
      const backed = rng.chance(odds);
      if (state.gang) changeRep(this.society, `gang:${state.gang}`, -events.cut.gangRep, society, timeScale, now);
      to(person, { grudge: events.cut.grudge });
      if (backed) {
        to(boss, { rapport: events.cut.rapport });
        job.trust += events.cut.trust;
        tell('cutStand');
        says(person, lines.work.cutBack);
        bossSaw();
      } else {
        to(boss, { rapport: -events.cut.worse });
        tell('cutWorse');
        says(person, lines.work.cutWorse);
      }
    } else if (choice === 'cover') {
      if (tired(events.cover.energy)) return false;
      const extra = Math.round(state.pay * events.cover.pay);
      job.owed = (job.owed ?? 0) + extra;
      to(person, { rapport: events.cover.rapport });
      if (person) this.remember(person.id, { kind: 'covered', at: now, what: building.name }, now);
      tell('coverYes', { pay: String(extra) });
      says(person, lines.work.coverThanks);
    } else if (choice === 'decline') {
      to(person, { rapport: -events.cover.refuse });
      tell('coverNo');
      says(person, lines.work.coverSnub);
    }
    if (person && before) this.noteFeedback(person, before, now);
    this.events.emit('jobChanged', this.jobStatus(now));
    this.events.emit('societyChanged', { people: [person?.id, boss?.id].filter((x): x is string => Boolean(x)) });
    return true;
  }

  // ───────────── Dealing ─────────────

  /** The drugs dealt in a district: those of the gangs whose turf it is. */
  private dealtIn(district: string): Set<string> {
    let set = this.dealtCache.get(district);
    if (!set) {
      const dealing = this.rules.dealing;
      set = new Set(turfFrom(this.rules.people.turf)(district).flatMap(([gang, share]) => (share > 0 && dealing?.gangs[gang] ? dealing.gangs[gang].drugs : [])));
      this.dealtCache.set(district, set);
    }
    return set;
  }

  /** Someone's habit, if they have one: drawn on their own stream, so it's theirs for good. */
  private habitFor(person: Person): Habit | null {
    const dealing = this.rules.dealing;
    if (!dealing) return null;
    let habit = this.habitCache.get(person.id);
    if (habit === undefined) {
      habit = habitOf(person, walkOf(person, this.world), this.dealtIn(person.district), dealing, this.world.seed);
      this.habitCache.set(person.id, habit);
    }
    return habit;
  }

  /** What someone's habit costs them a day, and the gang that sells it where they live: worked out once a person. */
  private readonly vices = new Map<string, Vice | null>();
  private viceOf(person: Person): Vice | null {
    const dealing = this.rules.dealing;
    if (!dealing) return null;
    let vice = this.vices.get(person.id);
    if (vice === undefined) {
      const habit = this.habitFor(person);
      const drug = habit ? dealing.drugs[habit.drug] : undefined;
      const gang = habit && drug ? turfFrom(this.rules.people.turf)(person.district).find(([g, share]) => share > 0 && dealing.gangs[g]?.drugs.includes(habit.drug))?.[0] : undefined;
      vice = habit && drug && gang ? { gang, perDay: Math.round((drug.price * habit.need * this.rules.life.economy.vice) / 7) } : null;
      this.vices.set(person.id, vice);
    }
    return vice;
  }

  /** Everyone living in a district with a habit for a drug: found once a city, since nobody's habit changes. */
  private usersOf(drug: string, district: string): Person[] {
    if (!this.userIndex) {
      const index = new Map<string, Person[]>();
      for (const person of this.population.people) {
        const habit = this.habitFor(person);
        if (!habit) continue;
        const key = `${person.district}:${habit.drug}`;
        const list = index.get(key);
        if (list) list.push(person);
        else index.set(key, [person]);
      }
      this.userIndex = index;
    }
    return this.userIndex.get(`${district}:${drug}`) ?? [];
  }

  /** The districts a gang has turf in. */
  private turfOf(gang: string): Set<string> {
    const shares = turfFrom(this.rules.people.turf);
    return new Set(Object.keys(this.rules.people.turf).filter((d) => shares(d).some(([g, share]) => g === gang && share > 0)));
  }

  /**
   * Where a gang has the player sell: one of its canon spots on its turf (in the connect's own
   * district first), else the place of a corner's kind on its turf nearest the connect's home.
   */
  private cornerFor(gang: string, connect: Person): Location | null {
    const dealing = this.rules.dealing!;
    const turf = this.turfOf(gang);
    // Never a corner another gang holds.
    const places = Object.values(this.world.locations).filter((l) => turf.has(l.district) && (this.holderOf(l) ?? gang) === gang);
    const spots = (dealing.gangs[gang]?.spots ?? []).flatMap((name) => places.filter((l) => l.name === name));
    const spot = spots.find((l) => l.district === connect.district) ?? spots[0];
    if (spot) return spot;
    const home = connect.home ? buildingById(this.world, connect.home) : undefined;
    const from: Point = home ? { x: home.x + home.w / 2, y: home.y + home.h / 2 } : (places[0] ?? { x: 0, y: 0 });
    const far = (p: Point) => Math.hypot(p.x - from.x, p.y - from.y);
    return places.filter((l) => dealing.corner.kinds.includes(l.kind)).sort((a, b) => far(a) - far(b) || a.id.localeCompare(b.id))[0] ?? null;
  }

  /** Who holds a corner: whoever took it or claimed it, else the gang whose canon spot it is, else nobody. */
  private holderOf(place: Location): string | null {
    const held = this.dealState.corners[place.id];
    if (held) return held;
    const gangs = this.rules.dealing?.gangs ?? {};
    return Object.keys(gangs).find((g) => gangs[g]?.spots?.includes(place.name) && this.turfOf(g).has(place.district)) ?? null;
  }

  /** The gangs at war with a gang. */
  private rivalsOf(gang: string): string[] {
    return this.rules.people.gangs[gang]?.rivals ?? [];
  }

  /**
   * Corners changing hands in the people's own days: a fight in a held corner's district, won
   * by a rival of the gang holding it, may take it; the gang that held it takes it back the
   * same way. The player's own corner lost, their connect puts them on another, if there is one.
   */
  private cornerWars(happened: LifeEvent[], now: number): void {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    if (!dealing || !d) return;
    const corners = new Set([...Object.keys(this.dealState.corners), ...(d.corner ? [d.corner] : [])]);
    let changed = false;
    for (const event of happened) {
      if (event.kind !== 'fight' && event.kind !== 'death') continue;
      const winner = this.person(event.who[0])?.gang;
      const loser = this.person(event.who[1])?.gang;
      if (!winner || !loser || winner === loser || !this.rivalsOf(loser).includes(winner)) continue;
      for (const id of corners) {
        const place = this.world.locations[id];
        if (!place || place.district !== event.district || this.holderOf(place) !== loser) continue;
        const rng = createRng(`${this.world.seed}:corner-war:${id}:${event.id}`);
        if (!rng.chance(dealing.war.take)) continue;
        this.dealState.corners[id] = winner;
        changed = true;
        const vars = { gang: this.rules.people.gangs[winner === d.gang ? loser : winner]?.name ?? '', ours: this.rules.people.gangs[d.gang]?.name ?? d.gang, corner: place.name };
        if (winner === d.gang) this.say(this.narration(dealing.lines.retaken, vars, rng), 'system');
        else if (id === d.corner) this.loseCorner(d, vars, rng);
      }
    }
    if (changed) this.events.emit('dealChanged', this.dealing(now));
  }

  /** The player's corner gone to a rival: told, and another one from the connect, or none. */
  private loseCorner(d: DealState, vars: Record<string, string>, rng: Rng): void {
    const dealing = this.rules.dealing!;
    this.say(this.narration(dealing.lines.lost, vars, rng), 'error');
    this.dealMomentState = null;
    d.yielded = 0;
    const connect = this.person(d.connect);
    const next = connect ? this.cornerFor(d.gang, connect) : null;
    d.corner = next?.id ?? null;
    if (next) {
      this.dealState.corners[next.id] = d.gang;
      if (!this.discovered.has(next.id)) {
        this.discovered.add(next.id);
        this.events.emit('mapChanged', this.mapState);
      }
      this.say(this.narration(dealing.lines.newCorner, { ...vars, corner: next.name }, rng), 'system');
    } else this.say(this.narration(dealing.lines.noCorner, vars, rng), 'system');
  }

  /** A gang's members in these roles, alive and on their feet: who'd front the player, or come to collect. */
  private membersIn(gang: string, roles: string[], now: number): Person[] {
    const day = this.clockAt(now).day;
    return this.population.people.filter((p) => p.gang === gang && roles.includes(p.job.role) && p.diedOn === undefined && !(p.hurtUntil !== undefined && day <= p.hurtUntil) && !this.outCold(p.id, now));
  }

  /** Whether someone fronts for the gang the player deals for: the connect, or, with the connect dead, another of their connects (who takes it over). */
  private isConnect(person: Person, d: DealState): boolean {
    if (person.id === d.connect) return true;
    const connect = this.person(d.connect);
    return Boolean((!connect || connect.diedOn !== undefined) && person.gang === d.gang && this.rules.dealing?.gangs[d.gang]?.connects.includes(person.job.role));
  }

  /** The doses of a drug the player carries, all pockets. */
  private carrying(drug: string): number {
    return this.items.filter((i) => i.kind === 'consumable' && i.id === drug).reduce((n, i) => n + i.count, 0);
  }

  /** The drugs the player carries, by id. */
  private drugsCarried(): string[] {
    const drugs = this.rules.gear.drugs;
    return [...new Set(this.items.filter((i) => i.kind === 'consumable' && drugs[i.id]).map((i) => i.id))];
  }

  /** Puts doses of a drug into pockets with room, a stack at a time; false, and nothing moved, if they won't all fit. */
  private stowDoses(drug: string, doses: number): boolean {
    const { gear, food } = this.rules;
    const name = gear.drugs[drug]?.name ?? drug;
    const items = this.items.map((i) => ({ ...i }));
    let left = doses;
    while (left > 0) {
      let pocket: string | null = null;
      let n = left;
      for (; n > 0; n--) if ((pocket = placeFor(this.pockets, items, this.money, { id: drug, kind: 'consumable' }, n, gear, food.dishes))) break;
      if (!pocket) return false;
      const stack = items.find((i) => i.id === drug && i.kind === 'consumable' && i.in === pocket);
      if (stack?.cut) stack.cut = mixedShare(stack.count, stack.cut, n);
      if (stack) stack.count += n;
      else items.push({ id: drug, kind: 'consumable', name, count: n, in: pocket });
      left -= n;
    }
    this.items.splice(0, this.items.length, ...items);
    return true;
  }

  /** Cash the player's pockets could take of this much: what the wallet and the change pocket hold. */
  private cashRoom(amount: number): number {
    const loot = splitLoot(amount, this.rules.money);
    return Math.min(loot.bills, walletRoom(this.pockets, this.money, this.rules.gear)) + Math.min(loot.coins, changeRoom(this.pockets, this.items, this.money, this.rules.gear, this.rules.food.dishes));
  }

  /** Cash into the player's pockets, as far as they hold it; what it came to. */
  private pocketCash(amount: number): number {
    const loot = splitLoot(amount, this.rules.money);
    const bills = Math.min(loot.bills, walletRoom(this.pockets, this.money, this.rules.gear));
    const coins = Math.min(loot.coins, changeRoom(this.pockets, this.items, this.money, this.rules.gear, this.rules.food.dishes));
    this.money = { ...this.money, bills: this.money.bills + bills, coins: this.money.coins + coins };
    return bills + coins;
  }

  /** What the player's Trading against a buyer's does to a price they ask: theirs over the buyer's, to the haggle's power. */
  private sellFactor(buyer: Person, now: number): number {
    const rules = this.rules.trading;
    const power = this.rules.money.haggle ?? 0;
    if (!rules || !power) return 1;
    return Math.pow(skillBonus(rules, this.tradingState.level) / skillBonus(rules, this.skillsFor(buyer, now).trading), power);
  }

  /** What the player would ask someone here for a dose: the street price where they are, by Trading. */
  private askFor(buyer: Person, drug: string, now: number): number {
    const dealing = this.rules.dealing!;
    const spot = this.spot;
    const tier = spot ? this.tierOfSpot(spot) : 'everyday';
    return askOf(streetPrice(dealing.drugs[drug]!, tier, dealing), this.sellFactor(buyer, now));
  }

  /** Who someone is in a line told about them: by name if the player knows it, else their look; and their pronouns. */
  private dealVars(person: Person, now: number, more: Record<string, string> = {}): Record<string, string> {
    const known = this.describe(person.id, now);
    const who = known ? (known.named ? known.name : known.name.charAt(0).toLowerCase() + known.name.slice(1)) : 'someone';
    const said = this.speakerFor(person, this.stanceOf(person, now), '', now).vars;
    const he = said.he ?? 'they';
    return { who, Who: who.charAt(0).toUpperCase() + who.slice(1), he, He: he.charAt(0).toUpperCase() + he.slice(1), his: said.his ?? 'their', him: said.him ?? 'them', ...more };
  }

  /** A clock time as the panel says it: "Fri 18:00". */
  private whenWord(at: number): string {
    const d = new Date(at);
    return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /** Where the player stands with the gang they deal for; null when they don't. */
  dealing(now: number): DealView | null {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    if (!dealing || !d) return null;
    const gang = dealing.gangs[d.gang];
    const rung = dealRungOf(d, dealing);
    const next = dealing.rungs[d.rung + 1];
    const corner = d.corner ? this.world.locations[d.corner] : undefined;
    const connect = this.person(d.connect);
    const front = d.front;
    return {
      gang: d.gang,
      gangName: this.rules.people.gangs[d.gang]?.name ?? d.gang,
      title: gang?.titles[d.rung] ?? rung.id,
      rung: d.rung,
      trust: d.trust,
      next: next ? { title: gang?.titles[d.rung + 1] ?? next.id, trust: next.at, fronts: next.paid } : null,
      connect: d.connect,
      connectName: connect ? (this.describe(connect.id, now)?.name ?? connect.given) : '',
      corner: corner ? { id: corner.id, name: corner.name } : null,
      front: front ? { drug: front.drug, name: dealing.drugs[front.drug]?.name ?? front.drug, doses: front.doses, owed: front.owed, paid: front.paid, left: front.owed - front.paid, due: front.due } : null,
      carried: (gang?.drugs ?? []).reduce((n, id) => n + this.carrying(id), 0),
      debt: d.debt,
      collectAt: d.collectAt,
      fronts: d.fronts,
      sold: d.sold,
      take: d.take,
      crewMost: crewSize(d.rung, dealing.crew),
      line: (gang?.drugs ?? []).map((id) => ({ drug: id, name: dealing.drugs[id]?.name ?? id, at: drugLevel(gang!, id), open: drugLevel(gang!, id) <= this.dealerState.level })),
    };
  }

  /** What there is to do about dealing with someone, as their card offers it. */
  dealWith(id: string, now: number): DealOption[] {
    const dealing = this.rules.dealing;
    const person = this.person(id);
    if (!dealing || !person || this.detained(now) || this.fighting || !this.isHere(id, now)) return [];
    const d = this.dealState.current;
    const options: DealOption[] = [];
    if (d && this.isConnect(person, d)) {
      const left = (d.front ? d.front.owed - d.front.paid : 0) + d.debt;
      const cash = this.money.bills + this.money.coins;
      if (left > 0) options.push({ id: 'pay', label: 'Pay up', sub: `${Math.min(cash, left)} of ${left} €$`, disabled: cash <= 0 });
      else {
        const rung = dealRungOf(d, dealing);
        const gang = dealing.gangs[d.gang];
        // What the player knows the trade well enough to be fronted, and the next of the line, shut till they do.
        let shown = false;
        for (const drug of gang?.drugs ?? []) {
          const kind = dealing.drugs[drug]!;
          const at = drugLevel(gang!, drug);
          if (at <= this.dealerState.level) options.push({ id: `front:${drug}`, label: `${kind.name} ×${rung.front}`, sub: `Owe ${owedFor(kind, rung)} €$ in ${rung.days} days` });
          else if (!shown) {
            shown = true;
            options.push({ id: `front:${drug}`, label: kind.name, sub: `At Dealing Lv ${at}`, disabled: true });
          }
        }
        options.push({ id: 'walk', label: 'Walk away', danger: true });
      }
    } else if (!d && person.gang && dealing.gangs[person.gang] && this.dealState.burned[person.gang] === undefined) {
      options.push({ id: 'ask', label: `Deal for the ${this.rules.people.gangs[person.gang]?.name ?? person.gang}` });
    }
    // One of the player's runners: their package, settling up; anyone else who might be one.
    const runner = this.dealState.crew[person.id];
    if (runner) return [...options, ...this.runnerOptions(person, runner, now)];
    if (this.canRecruit(person)) options.push({ id: 'recruit', label: 'Take on as a runner', sub: `${Object.keys(this.dealState.crew).length} of ${this.crewMost()} runners` });
    // Whatever the player carries, anyone else here could be pitched it.
    if (!(d && this.isConnect(person, d)) && !NCPD.test(person.job.role)) {
      for (const drug of this.drugsCarried()) {
        options.push({ id: `sell:${drug}`, label: `Sell ${dealing.drugs[drug]?.name ?? drug}`, sub: `${this.askFor(person, drug, now)} €$` });
      }
    }
    return options;
  }

  /** Does one of the things `dealWith` offers. */
  deal(id: string, option: string, now: number): boolean {
    const offered = this.dealWith(id, now).find((o) => o.id === option);
    const person = this.person(id);
    if (!offered || offered.disabled || !person) return false;
    const [what, drug] = option.split(':');
    if (what === 'ask') return this.askToDeal(person, now);
    if (what === 'front' && drug) return this.takeFront(person, drug, now);
    if (what === 'pay') return this.payUp(person, now);
    if (what === 'walk') return this.walkAway(person, now);
    if (what === 'sell' && drug) return this.pitch(person, drug, now);
    if (what === 'recruit') return this.recruit(person, now);
    if (what === 'crew-front' && drug) return this.frontToRunner(person, drug, Number(option.split(':')[2]), now);
    if (what === 'crew-collect') return this.collectFrom(person, now);
    if (what === 'crew-lean') return this.leanOn(person, now);
    if (what === 'crew-slide') return this.letSlide(person, now);
    if (what === 'crew-letgo') return this.letGo(person, now);
    return false;
  }

  /**
   * Asks a gang member about dealing for them. Anyone but a connect points the player to one
   * (and puts in a word, if they like the player); a connect takes them on if they like them
   * well enough (or, vouched for, don't dislike them) and the gang doesn't, and says yes the
   * way anyone answers anything: then the first package is the player's.
   */
  private askToDeal(person: Person, now: number): boolean {
    const dealing = this.rules.dealing!;
    const here = this.isHere(person.id, now);
    const gang = person.gang;
    const crew = gang ? dealing.gangs[gang] : undefined;
    if (!here || !gang || !crew || this.dealState.current) return false;
    const { society, timeScale, lines } = this.rules;
    const { stance, doing } = here;
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:deal:${standing.asks}`);
    const before = this.snapshot(person, now);
    learnOf(this.society, person.id, 'met');
    this.logged(person.id, 'you', line(lines.you.deal, speaker, rng), now);
    const refused = { ...standing.refused };
    let pressed = false;
    let joined = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.masked()) {
      this.speech(person, line(lines.deal.masked, speaker, rng), now);
    } else if (!crew.connects.includes(person.job.role)) {
      // Not theirs to give: they name someone whose it is, nearest first, and where they hang out.
      const connects = this.membersIn(gang, crew.connects, now).sort((a, b) => Number(b.district === person.district) - Number(a.district === person.district) || a.id.localeCompare(b.id));
      const connect = connects[0];
      if (connect) {
        const spot = connect.likes.hangout;
        const where = spot ? (spot.kind === 'building' ? buildingById(this.world, spot.id)?.name : this.world.locations[spot.id]?.name) : undefined;
        speaker.vars = { ...speaker.vars, connect: connect.given, where: where ?? '' };
        this.speech(person, line(lines.deal.refer, speaker, rng), now);
        learnOf(this.society, connect.id, 'told');
        learnFact(this.society, connect.id, 'name');
        learnFact(this.society, connect.id, 'job');
        if (dealing.join.stances.includes(stance)) this.dealState.vouched[gang] = person.id;
      } else this.speech(person, line(lines.deal.notYet, speaker, rng), now);
    } else if (this.pressing(standing, 'deal', now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const vouched = this.dealState.vouched[gang];
      const voucher = vouched ? this.person(vouched) : undefined;
      const stances = voucher && voucher.diedOn === undefined ? dealing.join.vouched : dealing.join.stances;
      const rep = repOf(this.society, `gang:${gang}`, society, timeScale, now);
      const reply = stances.includes(stance) && rep > dealing.join.rep ? replyTo(openness('deal', stance, this.charismaEdge, person.traits, society.openness) + this.leaning(person.id, now), society.openness, rng) : 'refuse';
      if (reply === 'answer') {
        joined = true;
        const past = this.dealState.past[gang];
        delete this.dealState.past[gang];
        const corner = past?.corner && this.world.locations[past.corner] ? this.world.locations[past.corner]! : this.cornerFor(gang, person);
        this.dealState.current = past
          ? { ...past, connect: person.id, corner: corner?.id ?? null }
          : { gang, connect: person.id, rung: 0, trust: 0, corner: corner?.id ?? null, front: null, debt: 0, debtAt: now, collectAt: null, collections: 0, fronts: 0, sold: 0, take: 0, customers: {}, block: { key: -1, served: 0 } };
        learnFact(this.society, person.id, 'name');
        learnFact(this.society, person.id, 'job');
        // The corner is the gang's, for the player, and on their map now.
        if (corner) this.dealState.corners[corner.id] = gang;
        if (corner && !this.discovered.has(corner.id)) {
          this.discovered.add(corner.id);
          this.events.emit('mapChanged', this.mapState);
        }
        const d = this.dealState.current;
        const drug = crew.drugs[0] as string;
        const front = this.frontFor(d, drug, now);
        speaker.vars = { ...speaker.vars, ...this.frontVars(d, front), corner: corner?.name ?? 'the corner' };
        this.speech(person, compose(lines.deal.join, speaker, lines, rng, { opener: false }), now);
        this.handOver(d, front, now);
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, 'deal', lines, rng) : line(lines.deal.notYet, speaker, rng), now);
        refused.deal = now;
      }
    }
    changeStanding(this.society, person.id, { met: true, asks: standing.asks + 1, refused, rapport: pressed ? -society.openness.press : joined ? 2 : 0 }, society, timeScale, now);
    this.noteFeedback(person, before, now, pressed ? lines.notes.pressed : '', speaker.vars);
    this.events.emit('societyChanged', { people: [person.id] });
    if (joined) this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** The package the player's rung is fronted of a drug, owed back by its day. */
  private frontFor(d: DealState, drug: string, now: number): Front {
    const dealing = this.rules.dealing!;
    const rung = dealRungOf(d, dealing);
    const kind = dealing.drugs[drug]!;
    return { drug, doses: rung.front, owed: owedFor(kind, rung), paid: 0, at: now, due: now + (rung.days * DAY) / this.rules.timeScale };
  }

  /** A package as a line says it. */
  private frontVars(d: DealState, front: Front): Record<string, string> {
    const dealing = this.rules.dealing!;
    return { drug: dealing.drugs[front.drug]?.name ?? front.drug, doses: String(front.doses), owed: String(front.owed), when: this.whenWord(front.due), title: (dealing.gangs[d.gang]?.titles[d.rung] ?? '').toLowerCase() };
  }

  /** Hands the player a package: into their pockets if it all fits (and it's theirs to sell, owed by its day), else a word that it doesn't. */
  private handOver(d: DealState, front: Front, now: number): void {
    const kind = this.rules.dealing!.drugs[front.drug]!;
    const doses = front.doses;
    if (!this.stowDoses(front.drug, doses)) {
      this.say(`No room on you for ${doses} doses of ${kind.name}. Something with more pockets would do it; ask again when you have it.`, 'error');
      return;
    }
    d.front = front;
    this.say(`${doses} doses of ${kind.name} on you, fronted: ${front.owed} €$ owed by ${this.whenWord(front.due)}.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('dealChanged', this.dealing(now));
  }

  /** Takes another package from the connect: only with nothing owed. */
  private takeFront(person: Person, drug: string, now: number): boolean {
    const d = this.dealState.current;
    const dealing = this.rules.dealing!;
    const here = this.isHere(person.id, now);
    const gang = d ? dealing.gangs[d.gang] : undefined;
    if (!d || !here || !gang?.drugs.includes(drug) || drugLevel(gang, drug) > this.dealerState.level) return false;
    d.connect = person.id;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:front:${d.fronts}:${d.sold}`);
    const left = (d.front ? d.front.owed - d.front.paid : 0) + d.debt;
    if (left > 0) {
      speaker.vars = { ...speaker.vars, left: String(left) };
      this.speech(person, line(this.rules.lines.deal.owing, speaker, rng), now);
      return true;
    }
    if (this.masked()) {
      this.speech(person, line(this.rules.lines.deal.masked, speaker, rng), now);
      return true;
    }
    const front = this.frontFor(d, drug, now);
    speaker.vars = { ...speaker.vars, ...this.frontVars(d, front) };
    this.speech(person, line(this.rules.lines.deal.front, speaker, rng), now);
    this.handOver(d, front, now);
    this.events.emit('societyChanged', { people: [person.id] });
    return true;
  }

  /**
   * Pays the connect what the player has on them, up to what's owed: the debt first, then the
   * front. A front paid off before its day is trust (more before half its time is up), a fronts
   * paid more, and maybe a rung up; a debt paid off is a little trust back. It's the gang's.
   */
  private payUp(person: Person, now: number): boolean {
    const d = this.dealState.current;
    const dealing = this.rules.dealing!;
    const here = this.isHere(person.id, now);
    if (!d || !here) return false;
    d.connect = person.id;
    const left = (d.front ? d.front.owed - d.front.paid : 0) + d.debt;
    const grab = takeCash(this.money, left);
    if (left <= 0 || grab.taken <= 0) return false;
    const { society, timeScale, lines } = this.rules;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:pay:${d.fronts}:${d.sold}:${grab.taken}`);
    const before = this.snapshot(person, now);
    this.logged(person.id, 'you', line(lines.you.payUp, speaker, rng), now);
    this.money = grab.money;
    this.life.treasuries[d.gang] = (this.life.treasuries[d.gang] ?? 0) + grab.taken;
    let pay = grab.taken;
    const debt = Math.min(d.debt, pay);
    d.debt -= debt;
    pay -= debt;
    if (debt > 0 && d.debt <= 0) {
      // Late, but paid: something back, and it counts as a front paid.
      d.trust += Math.max(0, dealing.trust.paid - dealing.trust.late);
      d.fronts += 1;
      d.collectAt = null;
      this.collectState = null;
    }
    let moved = false;
    if (d.front && pay > 0) {
      d.front.paid += pay;
      if (d.front.paid >= d.front.owed) {
        const early = now - d.front.at < (d.front.due - d.front.at) / 2;
        d.trust += dealing.trust.paid + (early ? dealing.trust.early : 0);
        d.fronts += 1;
        d.front = null;
        this.trainDealing(dealing.xp.front);
      }
    }
    const still = (d.front ? d.front.owed - d.front.paid : 0) + d.debt;
    speaker.vars = { ...speaker.vars, owed: String(grab.taken), pay: String(grab.taken), left: String(still) };
    this.speech(person, line(still > 0 ? lines.deal.some : lines.deal.paid, speaker, rng), now);
    if (still <= 0 && canMoveUp(d, dealing)) {
      d.rung += 1;
      moved = true;
      this.trainDealing(dealing.xp.rung);
      const title = dealing.gangs[d.gang]?.titles[d.rung] ?? '';
      speaker.vars = { ...speaker.vars, title: title.toLowerCase() };
      this.speech(person, compose(lines.deal.promote, speaker, lines, rng, { opener: false }), now);
      const rung = dealRungOf(d, dealing);
      this.say(`You're a ${title.toLowerCase()} for the ${this.rules.people.gangs[d.gang]?.name ?? d.gang} now: ${rung.front} doses a package, ${rung.days} days to pay.`, 'system');
    }
    changeStanding(this.society, person.id, { rapport: still > 0 ? 0 : moved ? 4 : 2 }, society, timeScale, now);
    this.noteFeedback(person, before, now, '', speaker.vars);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** Stops dealing for the gang, with nothing owed: they remember where the player stood, if they come back. */
  private walkAway(person: Person, now: number): boolean {
    const d = this.dealState.current;
    const here = this.isHere(person.id, now);
    if (!d || !here || d.front || d.debt > 0) return false;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:walk:${d.fronts}`);
    this.logged(person.id, 'you', line(this.rules.lines.you.walkAway, speaker, rng), now);
    this.speech(person, line(this.rules.lines.deal.leave, speaker, rng), now);
    this.dealState.past[d.gang] = { ...d, front: null, collectAt: null };
    this.dealState.current = null;
    this.dealMomentState = null;
    this.say(`You're out with the ${this.rules.people.gangs[d.gang]?.name ?? d.gang}.`, 'system');
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', null);
    return true;
  }

  /**
   * A sale: a dose out of the player's pockets, the price into them (none if there's no room
   * for the cash), out of the buyer's; a customer, warmer for it; Trading. False with no room.
   */
  private sale(buyer: Person, drug: string, price: number, now: number): boolean {
    const dealing = this.rules.dealing!;
    if (this.cashRoom(price) < price) {
      this.say('No room on you for the cash. Something with a wallet that holds more would help.', 'error');
      return false;
    }
    const item = this.items.find((i) => i.kind === 'consumable' && i.id === drug);
    if (!item) return false;
    const share = item.cut ?? 0;
    this.takeOne(item);
    const got = this.pocketCash(price);
    buyer.eddies = Math.max(0, buyer.eddies - got);
    this.life.eddies[buyer.id] = buyer.eddies;
    const d = this.dealState.current;
    if (d && dealing.gangs[d.gang]?.drugs.includes(drug)) {
      d.sold += 1;
      d.take += got;
      d.heat = heatAt(d, now, dealing, this.rules.timeScale) + 1;
      d.heatAt = now;
      const was = d.customers[buyer.id];
      d.customers[buyer.id] = { bought: (was?.bought ?? 0) + 1, last: now };
    }
    const knew = Boolean(this.society.known[buyer.id]?.met);
    learnOf(this.society, buyer.id, 'met');
    changeStanding(this.society, buyer.id, { met: true, rapport: dealing.corner.rapport }, this.rules.society, this.rules.timeScale, now);
    this.trainTrading(this.rules.money.tradeXp ?? 0);
    this.trainDealing(dealing.xp.sale);
    if (share > 0) this.soldCut(buyer, drug, share, knew, now);
    this.dealingSeen(buyer, now);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /**
   * A cut dose sold: a bad batch may get to the buyer (told the next day lived, `badBatches`),
   * and a cut of the gang's own product may get back to the connect, which costs trust. Both
   * likelier the heavier the cut, and the cruder the player's Cutting.
   */
  private soldCut(buyer: Person, drug: string, share: number, knew: boolean, now: number): void {
    const dealing = this.rules.dealing!;
    const rules = dealing.cut;
    const bonus = skillBonus(rules.skill, this.cutterState.level);
    const rng = createRng(`${this.world.seed}:cut-sold:${buyer.id}:${now}`);
    if (rng.chance(harmOdds(share, bonus, rules))) this.dealState.harms.push({ id: buyer.id, drug, day: this.clockAt(now).day, deadly: rng.chance(rules.harm.deadly), knew });
    const d = this.dealState.current;
    if (d && dealing.gangs[d.gang]?.drugs.includes(drug) && rng.chance(foundOdds(share, bonus, rules))) {
      d.trust -= rules.found.trust;
      this.say(this.narration(rules.lines.found, { connect: this.person(d.connect)?.given ?? 'your connect', gang: this.rules.people.gangs[d.gang]?.name ?? d.gang, drug: dealing.drugs[drug]?.name ?? drug }, rng), 'error');
      if (d.trust <= dealing.trust.cutOff) this.cutOff(d, now);
    }
  }

  /**
   * Bad batches getting to whoever bought them, a day on: laid up, or dead. Word reaches the
   * player; whoever it was won't buy again and holds it against them; a death the NCPD hears
   * of, with the player's name if the buyer's people knew whose product it was.
   */
  private badBatches(today: number, now: number): void {
    const dealing = this.rules.dealing;
    if (!dealing || !this.dealState.harms.length) return;
    const rules = dealing.cut;
    const due = this.dealState.harms.filter((h) => h.day < today);
    if (!due.length) return;
    this.dealState.harms = this.dealState.harms.filter((h) => h.day >= today);
    for (const harm of due) {
      const person = this.person(harm.id);
      if (!person || person.diedOn !== undefined) continue;
      const rng = createRng(`${this.world.seed}:bad-batch:${harm.id}:${harm.day}`);
      const vars = this.dealVars(person, now, { drug: dealing.drugs[harm.drug]?.name ?? harm.drug });
      if (harm.deadly) {
        this.life.dead[person.id] = today;
        person.diedOn = today;
        delete this.life.hurt[person.id];
        delete person.hurtUntil;
        if (this.society.romance?.with === person.id) this.society.romance = null;
        this.say(this.narration(rules.lines.killed, vars, rng), 'error');
        this.onRecord('dealing', person.district, harm.knew, 'a bad batch', 'whose product it was', now);
      } else {
        const until = today + rng.int(rules.harm.days[0], rules.harm.days[1]);
        this.life.hurt[person.id] = until;
        person.hurtUntil = until;
        this.say(this.narration(rules.lines.harmed, vars, rng), 'error');
        changeStanding(this.society, person.id, { grudge: 20, rapport: -10 }, this.rules.society, this.rules.timeScale, now);
      }
      if (this.dealState.current) delete this.dealState.current.customers[person.id];
    }
    this.events.emit('societyChanged', { people: due.map((h) => h.id) });
    this.events.emit('dealChanged', this.dealing(now));
  }

  /** Whoever here saw a sale may call it in as dealing: only some of them notice a hand-off, and nothing's said when nobody calls. */
  private dealingSeen(buyer: Person, now: number): void {
    const dealing = this.rules.dealing!;
    if (!this.rules.police) return;
    const rng = createRng(`${this.world.seed}:seen:${buyer.id}:${now}`);
    const noticed = new Set(this.peopleHere(now).filter((p) => p.person.id !== buyer.id && p.doing !== 'out cold' && rng.chance(dealing.bad.seen)).map((p) => p.person.id));
    if (noticed.size) this.crime('dealing', buyer, now, this.facesHere(now), 'witnesses', undefined, undefined, { quiet: true, only: noticed });
  }

  /**
   * Pitches someone here a drug the player carries. Someone with a habit for it buys, if they'd
   * trust the player that far (an ask like any other, a regular always); someone who takes
   * something else passes; someone who takes nothing is put out by being asked, the straighter
   * the more.
   */
  private pitch(person: Person, drug: string, now: number): boolean {
    const dealing = this.rules.dealing!;
    const here = this.isHere(person.id, now);
    if (!here || this.carrying(drug) <= 0) return false;
    const { society, timeScale, lines } = this.rules;
    const { stance, doing } = here;
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    const price = this.askFor(person, drug, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    speaker.vars = { ...speaker.vars, drug: dealing.drugs[drug]?.name ?? drug, price: String(price) };
    const rng = createRng(`${this.world.seed}:${person.id}:pitch:${standing.asks}:${drug}`);
    const before = this.snapshot(person, now);
    learnOf(this.society, person.id, 'met');
    this.logged(person.id, 'you', line(lines.you.pitch, speaker, rng), now);
    const habit = this.habitFor(person);
    const d = this.dealState.current;
    const refused = { ...standing.refused };
    let rapport = 0;
    let note = '';
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.pressing(standing, 'pitch', now)) {
      rapport = -society.openness.press;
      note = lines.notes.pressed;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else if (d && person.gang && this.rivalsOf(d.gang).includes(person.gang)) {
      // One of a rival gang, offered the player's gang's product: war, and maybe here and now.
      speaker.vars = { ...speaker.vars, ours: this.rules.people.gangs[d.gang]?.name ?? d.gang };
      this.speech(person, line(lines.deal.rival, speaker, rng), now);
      changeStanding(this.society, person.id, { met: true, asks: standing.asks + 1, rapport: -dealing.pitch.rapport * 2, grudge: 15 }, society, timeScale, now);
      this.setOnPlayer(person.gang, now, rng);
      this.noteFeedback(person, before, now, '', speaker.vars);
      if (rng.chance(person.traits.temper)) this.openFight({ person, doing, stance: this.stanceOf(person, now), scene: null }, now, `${person.given} takes it as war, and swings.`);
      this.events.emit('societyChanged', { people: [person.id] });
      return true;
    } else if (habit?.drug === drug) {
      const regular = (this.dealState.current?.customers[person.id]?.bought ?? 0) >= dealing.corner.regularAt;
      const reply = regular ? 'answer' : replyTo(openness('pitch', stance, this.charismaEdge, person.traits, society.openness, Boolean(this.masked())) + habit.need + this.leaning(person.id, now), society.openness, rng);
      if (reply === 'answer' && person.eddies >= price) {
        this.speech(person, line(lines.deal.buy, speaker, rng), now);
        if (this.sale(person, drug, price, now)) {
          this.say(`Sold: a dose of ${dealing.drugs[drug]?.name ?? drug} to ${person.given}, ${price} €$.`, 'system');
          // On a rival's turf, they may hear of it.
          const turf = d ? turfFrom(this.rules.people.turf)(this.districtOf(this.where)?.id ?? '').map(([g]) => g).filter((g) => this.rivalsOf(d.gang).includes(g)) : [];
          if (d && turf.length && rng.chance(dealing.war.threat.chance)) {
            const rival = rng.pick(turf);
            this.say(this.narration(dealing.lines.rivalTurf, { gang: this.rules.people.gangs[rival]?.name ?? rival, ours: this.rules.people.gangs[d.gang]?.name ?? d.gang }, rng), 'system');
            this.setOnPlayer(rival, now, rng);
          }
        }
      } else {
        this.speech(person, line(lines.deal.wary, speaker, rng), now);
        refused.pitch = now;
      }
    } else if (habit) {
      this.speech(person, line(lines.deal.pass, speaker, rng), now);
      refused.pitch = now;
    } else {
      // Nothing they take: some just say no; the straight-laced take it badly.
      const walk = walkOf(person, this.world);
      const prim = walk === 'corpo' || walk === 'elder' || walk === 'guard' || rng.chance(0.4 + (person.traits.warmth - 0.5) * 0.4);
      this.speech(person, line(prim ? lines.deal.offended : lines.deal.pass, speaker, rng), now);
      rapport = prim ? -dealing.pitch.rapport : -1;
      refused.pitch = now;
    }
    changeStanding(this.society, person.id, { met: true, asks: standing.asks + 1, refused, rapport }, society, timeScale, now);
    this.noteFeedback(person, before, now, note, speaker.vars);
    this.events.emit('societyChanged', { people: [person.id] });
    return true;
  }

  /** A rival gang set on the player: they'll come for them, as a gang comes to settle a score. */
  private setOnPlayer(gang: string, now: number, rng: Rng): void {
    const { threat } = this.rules.dealing!.war;
    if (this.society.threats.some((t) => t.gang === gang)) return;
    this.society.threats.push({ id: this.society.nextId++, due: now + (rng.range(threat.hours[0], threat.hours[1]) * HOUR) / this.rules.timeScale, by: null, gang, incident: 0, amount: rng.int(threat.amount[0], threat.amount[1]) });
  }

  /** Whether the player is at the corner the gang gave them. */
  private atCorner(): boolean {
    const d = this.dealState.current;
    return Boolean(d?.corner && !this.trip && !this.inside && this.location?.id === d.corner);
  }

  /** How many more buyers the corner sees this three-hour block. */
  private buyersLeft(d: DealState, clock: Clock): number {
    const corner = d.corner ? this.world.locations[d.corner] : undefined;
    if (!corner) return 0;
    const key = blockOf(clock.day, clock.hour);
    return buyersIn(clock.hour, corner.kind, this.rules.dealing!) - (d.block.key === key ? d.block.served : 0);
  }

  /** The Deal button at the player's corner: what they're holding, or why nothing would come of it now; null anywhere else. */
  cornerAction(now: number): DealChoice | null {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    if (!dealing || !d || !this.atCorner()) return null;
    const held = (dealing.gangs[d.gang]?.drugs ?? []).map((id) => [id, this.carrying(id)] as const).filter(([, n]) => n > 0);
    const quiet = this.buyersLeft(d, this.clockAt(now)) <= 0;
    const tired = this.energy(now).current < dealing.corner.energy;
    const sub = !held.length ? 'Nothing to sell' : quiet ? 'Quiet now' : tired ? 'Too tired' : held.map(([id, n]) => `${dealing.drugs[id]?.name ?? id} ×${n}`).join(' · ');
    return { id: 'deal', label: 'Deal', sub, disabled: !held.length || quiet || tired };
  }

  /**
   * Works the corner: the next buyer comes by and waits on the player (`dealMoment`), if anyone's
   * buying this block: someone who lives round here with a habit for what the player has, who
   * isn't at home or work (or is here already) and has the money for at least part of it; a
   * regular likelier, settling any tab first (or not). Now and then it's no buyer at all: an
   * NCPD officer undercover (where the NCPD goes, read for one by the player's eye), or someone
   * with a weapon and nothing to lose. A buyer is a point of energy.
   */
  walkUp(now: number): boolean {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    const action = this.cornerAction(now);
    if (!dealing || !d || !action || action.disabled || this.dealMomentState || this.detained(now) || this.fighting) return false;
    const clock = this.clockAt(now);
    const corner = this.world.locations[d.corner as string] as Location;
    const key = blockOf(clock.day, clock.hour);
    if (d.block.key !== key) d.block = { key, served: 0 };
    const rng = createRng(`${this.world.seed}:walk-up:${corner.id}:${key}:${d.block.served}:${d.sold}`);
    const drugs = (dealing.gangs[d.gang]?.drugs ?? []).filter((id) => this.carrying(id) > 0);
    const pool = drugs.flatMap((drug) => this.usersOf(drug, corner.district).map((person) => ({ person, drug })));
    const found: Array<{ person: Person; drug: string; ask: number; weight: number }> = [];
    const seen = new Set<string>();
    for (let tries = 0; tries < 30 && found.length < 6 && pool.length; tries++) {
      const { person, drug } = rng.pick(pool);
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      if (person.diedOn !== undefined || person.id === d.connect || (person.hurtUntil !== undefined && clock.day <= person.hurtUntil) || this.outCold(person.id, now)) continue;
      const last = d.customers[person.id]?.last;
      if (last !== undefined && blockOf(this.clockAt(last).day, this.clockAt(last).hour) === key) continue;
      const at = whereIs(person, this.world, clock, this.rules.food.dishes, this.rules.people.out);
      if (at && !(at.spot.kind === 'location' && at.spot.id === corner.id)) continue;
      const ask = this.askFor(person, drug, now);
      if (person.eddies < ask * dealing.short.least) continue;
      const regular = (d.customers[person.id]?.bought ?? 0) >= dealing.corner.regularAt;
      found.push({ person, drug, ask, weight: regular ? dealing.corner.regulars : 1 });
    }
    if (!found.length) {
      // Nobody about who's buying: the block is done.
      d.block.served = buyersIn(clock.hour, corner.kind, dealing);
      this.say(this.narration(dealing.lines.quiet, {}, rng), 'system');
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    if (!this.spendEnergy(dealing.corner.energy, now)) return false;
    d.block.served += 1;
    const { bad } = dealing;
    const policed = this.policingAt(corner);
    const drugName = (id: string) => dealing.drugs[id]?.name ?? id;
    // Rivals of the player's gang, come to take the corner: more for the player's heat and the rivals' turf here.
    const rival = this.rivalsAt(d, corner, now, rng);
    if (rival?.gang) {
      const vars = this.dealVars(rival, now, { gang: this.rules.people.gangs[rival.gang]?.name ?? rival.gang, ours: this.rules.people.gangs[d.gang]?.name ?? d.gang });
      learnOf(this.society, rival.id, 'seen');
      this.dealMomentState = { kind: 'rivals', gang: rival.gang, person: rival.id, drug: drugs[0] as string, ask: 0, pay: 0, short: false, regular: false, at: now, text: this.narration(dealing.lines.rivals, vars, rng) };
      this.events.emit('fx', { effect: 'shake' });
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    // An NCPD officer posing as a buyer, where the NCPD goes.
    const officer = policed && rng.chance(Math.min(1, bad.undercover * policed.call)) ? this.undercoverFor(corner.district, now, rng) : undefined;
    if (officer) {
      const drug = rng.pick(drugs) as string;
      const ask = this.askFor(officer, drug, now);
      const vars = this.dealVars(officer, now, { drug: drugName(drug), price: String(ask) });
      // An eye for a deal or a face may catch what's wrong with this one.
      const eye = Math.max(this.tradingState.level, this.charismaState.level, this.dealerState.level);
      const spotted = rng.chance(Math.max(0, Math.min(bad.read.most, bad.read.base + bad.read.perLevel * (eye - 4))));
      const text = [this.narration(dealing.lines.walkUp, vars, rng), spotted ? this.narration(dealing.lines.tell, vars, rng) : ''].filter(Boolean).join(' ');
      this.dealMomentState = { kind: 'buy', person: officer.id, drug, ask, pay: ask, short: false, regular: false, undercover: true, at: now, text };
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    // Someone with a weapon and nothing to lose, who comes up like a buyer: one of the users round here, armed and hard.
    let robber: Person | undefined;
    if (rng.chance(Math.min(1, bad.robber * (bad.rough[corner.district] ?? 1)))) {
      for (let tries = 0; tries < 40 && !robber && pool.length; tries++) {
        const p = rng.pick(pool).person;
        if (p.diedOn === undefined && p.id !== d.connect && !(p.hurtUntil !== undefined && clock.day <= p.hurtUntil) && !this.outCold(p.id, now) && this.armOf(p).id !== 'fists' && (p.traits.temper > 0.55 || p.traits.greed > 0.6 || p.traits.warmth < 0.4)) robber = p;
      }
    }
    if (robber) {
      const drug = drugs[0] as string;
      const vars = this.dealVars(robber, now, { drug: drugName(drug), weapon: this.armOf(robber).short });
      this.dealMomentState = { kind: 'robber', person: robber.id, drug, ask: 0, pay: 0, short: false, regular: false, at: now, text: this.narration(dealing.lines.robber, vars, rng) };
      this.events.emit('fx', { effect: 'shake' });
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    let roll = rng.next() * found.reduce((n, f) => n + f.weight, 0);
    const buyer = found.find((f) => (roll -= f.weight) < 0) ?? (found[found.length - 1] as (typeof found)[number]);
    const regular = buyer.weight > 1;
    learnOf(this.society, buyer.person.id, 'seen');
    // A tab to settle first: paid with a little over, or not, and written off in time.
    const settled = this.settleTab(d, buyer.person, now, rng);
    const short = buyer.person.eddies < buyer.ask;
    const tab = short && regular && !d.customers[buyer.person.id]?.tab;
    const vars = this.dealVars(buyer.person, now, { drug: drugName(buyer.drug), pay: String(buyer.person.eddies), price: String(buyer.ask) });
    const text = [settled, this.narration(tab ? dealing.lines.tabAsk : regular ? dealing.lines.regular : short ? dealing.lines.short : dealing.lines.walkUp, vars, rng)].filter(Boolean).join(' ');
    this.dealMomentState = { kind: 'buy', person: buyer.person.id, drug: buyer.drug, ask: buyer.ask, pay: short ? buyer.person.eddies : buyer.ask, short, regular, tab, at: now, text };
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** A rival of the player's gang come to the corner, by the odds (`war.rivals`): one of theirs who lives in the corner's district. */
  private rivalsAt(d: DealState, corner: Location, now: number, rng: Rng): Person | undefined {
    const { war } = this.rules.dealing!;
    const shares = turfFrom(this.rules.people.turf)(corner.district);
    const rivals = this.rivalsOf(d.gang);
    const share = shares.filter(([g]) => rivals.includes(g)).reduce((n, [, w]) => n + w, 0);
    const heat = heatAt(d, now, this.rules.dealing!, this.rules.timeScale);
    if (!rivals.length || !rng.chance(Math.min(1, war.rivals.base * (1 + heat * war.rivals.heat) * (war.rivals.near + share)))) return undefined;
    const gang = rng.pick(rivals);
    const roles = this.rules.people.gangs[gang]?.roles ?? [];
    // One of theirs from round here, else a crew come over from their own turf.
    const members = this.membersIn(gang, roles, now);
    const local = members.filter((p) => p.district === corner.district);
    const pool = local.length ? local : members;
    return pool.length ? rng.pick(pool) : undefined;
  }

  /** A tab a buyer runs with the player: paid off, with a little over, by the odds and their loyalty; else dodged, and written off once it's old. The line that says so, or nothing. */
  private settleTab(d: DealState, buyer: Person, now: number, rng: Rng): string {
    const dealing = this.rules.dealing!;
    const customer = d.customers[buyer.id];
    if (!customer?.tab) return '';
    const { tab } = dealing.bad;
    const owed = customer.tab;
    const old = customer.tabAt !== undefined && now - customer.tabAt > (tab.days * DAY) / this.rules.timeScale;
    const pay = Math.min(buyer.eddies, Math.round(owed * (1 + tab.extra)));
    if (pay >= owed && this.cashRoom(pay) >= pay && rng.chance(Math.max(0, Math.min(1, tab.payBack + tab.loyalty * (buyer.traits.loyalty - 0.5) * 2)))) {
      const got = this.pocketCash(pay);
      buyer.eddies = Math.max(0, buyer.eddies - got);
      this.life.eddies[buyer.id] = buyer.eddies;
      delete customer.tab;
      delete customer.tabAt;
      d.take += got;
      this.events.emit('walletChanged', this.wallet);
      return this.narration(dealing.lines.tabPaid, this.dealVars(buyer, now, { pay: String(got) }), rng);
    }
    if (old) {
      delete customer.tab;
      delete customer.tabAt;
    }
    return this.narration(dealing.lines.tabDodged, this.dealVars(buyer, now), rng);
  }

  /** An NCPD officer of the district to pose as a buyer: alive, on their feet, out and about. */
  private undercoverFor(district: string, now: number, rng: Rng): Person | undefined {
    const clock = this.clockAt(now);
    const fit = this.officers.filter((p) => p.district === district && p.diedOn === undefined && !(p.hurtUntil !== undefined && clock.day <= p.hurtUntil) && !this.outCold(p.id, now) && !this.policeState.confront?.officers.includes(p.id));
    return fit.length ? rng.pick(fit) : undefined;
  }

  /** The buyer (or not) waiting on the player at their corner, and the choices: sell, take what a short one has, put a regular on tab, push for more, pass; with a robber, hand it over, talk, or fight. */
  dealMoment(now: number): DealMomentView | null {
    const m = this.dealMomentState;
    const dealing = this.rules.dealing;
    if (!m || !dealing || !this.atCorner() || this.detained(now) || this.fighting) return null;
    if (m.kind === 'rivals') {
      const by = this.person(m.person);
      const arm = by ? this.armOf(by) : null;
      const cash = this.money.bills + this.money.coins;
      const cut = Math.round(cash * dealing.war.rivals.pay[0]);
      return {
        text: m.text,
        person: m.person,
        choices: [
          { id: 'clear', label: 'Clear off' },
          { id: 'pay', label: 'Pay them', sub: `${cut} €$`, disabled: cut <= 0 },
          { id: 'fight', label: 'Fight', sub: arm && arm.id !== 'fists' ? arm.short : 'Bare hands' },
        ],
      };
    }
    if (m.kind === 'robber') {
      const by = this.person(m.person);
      const arm = by ? this.armOf(by) : null;
      return {
        text: m.text,
        person: m.person,
        choices: [
          { id: 'hand', label: 'Hand it over', sub: 'Product, cash' },
          { id: 'talk', label: 'Talk', sub: 'Talk them down' },
          { id: 'fight', label: 'Fight', sub: arm && arm.id !== 'fists' ? arm.short : 'Bare hands' },
        ],
      };
    }
    const more = Math.round(m.ask * dealing.push.more);
    const choices: DealChoice[] = m.tab
      ? [{ id: 'sell', label: 'Take it', sub: `${m.pay} €$` }, { id: 'tab', label: 'Tab', sub: `${m.ask - m.pay} €$ on it` }, { id: 'turn', label: 'Pass' }]
      : m.short
        ? [{ id: 'sell', label: 'Take it', sub: `${m.pay} €$` }, { id: 'turn', label: 'Pass' }]
        : [{ id: 'sell', label: 'Sell', sub: `${m.ask} €$` }, { id: 'push', label: 'Push', sub: `${more} €$?` }, { id: 'turn', label: 'Pass' }];
    return { text: m.text, person: m.person, choices };
  }

  /**
   * Answers whoever's at the corner. A buyer: a sale at the price (or what they have, or on
   * tab), a push that comes off or loses them, or no sale; any of them may call it in after,
   * and an undercover officer sold to busts the player there and then. A robber: hand it over
   * (a share of the doses and the cash), talk them down (charisma against theirs; no good and
   * they take it anyway, with a blow), or fight them.
   */
  answerDeal(choice: string, now: number): boolean {
    const m = this.dealMomentState;
    const dealing = this.rules.dealing;
    const view = this.dealMoment(now);
    const buyer = m ? this.person(m.person) : undefined;
    if (!m || !dealing || !view || !buyer || !view.choices.some((c) => c.id === choice)) return false;
    this.dealMomentState = null;
    const rng = createRng(`${this.world.seed}:deal-answer:${m.person}:${m.at}:${choice}`);
    const name = dealing.drugs[m.drug]?.name ?? m.drug;
    const tell = (pool: string[], more: Record<string, string> = {}, tone: Tone = 'system') => this.say(this.narration(pool, this.dealVars(buyer, now, { drug: name, ...more }), rng), tone);
    const before = this.snapshot(buyer, now);
    if (m.kind === 'rivals') {
      const d = this.dealState.current;
      const gang = m.gang ?? buyer.gang ?? '';
      const vars = { gang: this.rules.people.gangs[gang]?.name ?? gang, ours: d ? (this.rules.people.gangs[d.gang]?.name ?? d.gang) : '' };
      if (!d) return false;
      if (choice === 'fight') {
        d.yielded = 0;
        d.trust += dealing.war.rivals.trust;
        this.openFight({ person: buyer, doing: 'taking your corner', stance: this.stanceOf(buyer, now), scene: null }, now, this.narration(dealing.lines.stoodUp, this.dealVars(buyer, now, vars), rng));
        this.events.emit('dealChanged', this.dealing(now));
        return true;
      }
      if (choice === 'pay') {
        const cash = this.money.bills + this.money.coins;
        const grab = takeCash(this.money, Math.round(cash * rng.range(dealing.war.rivals.pay[0], dealing.war.rivals.pay[1])));
        this.money = grab.money;
        this.life.treasuries[gang] = (this.life.treasuries[gang] ?? 0) + grab.taken;
        tell(dealing.lines.paidOff, { ...vars, pay: String(grab.taken) });
        this.events.emit('walletChanged', this.wallet);
      } else {
        // Off the corner for the block; give it up often enough and it's theirs.
        const clock = this.clockAt(now);
        d.block = { key: blockOf(clock.day, clock.hour), served: Number.MAX_SAFE_INTEGER };
        d.yielded = (d.yielded ?? 0) + 1;
        tell(dealing.lines.clearedOff, vars);
        const corner = d.corner ? this.world.locations[d.corner] : undefined;
        if (corner && d.yielded >= dealing.war.rivals.yield && gang) {
          this.dealState.corners[corner.id] = gang;
          this.loseCorner(d, { ...vars, corner: corner.name }, rng);
        }
      }
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    if (m.kind === 'robber') {
      const weapon = this.armOf(buyer).short;
      if (choice === 'fight') {
        this.openFight({ person: buyer, doing: 'holding you up', stance: this.stanceOf(buyer, now), scene: null }, now, this.narration(dealing.lines.robber, this.dealVars(buyer, now, { drug: name, weapon }), rng));
        return true;
      }
      const talked = choice === 'talk' && rng.chance(Math.max(0.05, Math.min(dealing.bad.talk.most, dealing.bad.talk.base + dealing.bad.talk.perLevel * (this.charismaState.level - this.skillsFor(buyer, now).charisma))));
      if (talked) tell(dealing.lines.talkedDown, { weapon });
      else {
        const took = this.robbedOf(buyer, rng);
        if (choice === 'talk') {
          const health = this.health(now);
          this.healthState = { value: Math.max(1, Math.round(health.current - health.max * 0.1)), at: now };
          this.events.emit('healthChanged', this.health(now));
          tell(dealing.lines.talkFailed, { weapon, took }, 'error');
        } else tell(dealing.lines.handOver, { weapon, took }, 'error');
      }
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    // An undercover officer sold to: the badge comes out.
    const bust = () => {
      const item = this.items.find((i) => i.kind === 'consumable' && i.id === m.drug);
      if (item) this.takeOne(item);
      const district = this.districtOf(this.where)?.id ?? '';
      const partner = this.unitFor(district, now, rng).filter((id) => id !== buyer.id);
      const text = this.narration(dealing.lines.busted, this.dealVars(buyer, now, { drug: name }), rng);
      learnOf(this.society, buyer.id, 'met');
      this.confront([buyer.id, ...partner].slice(0, 2), 'dealing', 'scene', now, [text]);
      this.events.emit('inventoryChanged', this.inventory);
      this.events.emit('policeChanged', this.police(now));
    };
    let how: 'sold' | 'pushed' | 'walked' | 'turned' = 'turned';
    if (choice === 'turn') tell(dealing.lines.turned);
    else if (m.undercover && (choice === 'sell' || choice === 'push')) {
      bust();
      return true;
    } else if (choice === 'push') {
      const habit = this.habitFor(buyer);
      const odds = pushOdds(this.tradingState.level, this.skillsFor(buyer, now).trading, habit?.need ?? 0, dealing);
      const price = Math.min(buyer.eddies, Math.round(m.ask * dealing.push.more));
      if (rng.chance(odds) && price > m.ask && this.sale(buyer, m.drug, price, now)) {
        how = 'pushed';
        tell(dealing.lines.pushed, { price: String(price) });
        this.trainTrading(this.rules.money.tradeXp ?? 0);
      } else {
        how = 'walked';
        changeStanding(this.society, buyer.id, { rapport: -dealing.push.rapport }, this.rules.society, this.rules.timeScale, now);
        tell(dealing.lines.walked);
      }
    } else if (this.sale(buyer, m.drug, m.pay, now)) {
      how = 'sold';
      if (choice === 'tab') {
        const d = this.dealState.current;
        const customer = d?.customers[buyer.id];
        if (customer) {
          customer.tab = m.ask - m.pay;
          customer.tabAt = now;
        }
        tell(dealing.lines.tabTaken, { owed: String(m.ask - m.pay) });
      } else tell(dealing.lines.sold, { price: String(m.pay) });
    } else this.dealMomentState = m;
    if (!this.dealMomentState && !m.undercover) this.snitch(buyer, how, m.regular, now, rng);
    this.noteFeedback(buyer, before, now);
    this.events.emit('societyChanged', { people: [buyer.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** What a robber at the corner takes: a share of the gang's product on the player and of their cash; said as a line has it. */
  private robbedOf(robber: Person, rng: Rng): string {
    const dealing = this.rules.dealing!;
    const d = this.dealState.current;
    const { rob } = dealing.bad;
    const took: string[] = [];
    for (const drug of d ? (dealing.gangs[d.gang]?.drugs ?? []) : []) {
      const carried = this.carrying(drug);
      const n = Math.min(carried, Math.max(1, Math.round(carried * rng.range(rob.doses[0], rob.doses[1]))));
      if (!carried || !n) continue;
      for (let left = n; left > 0; ) {
        const item = this.items.find((i) => i.kind === 'consumable' && i.id === drug)!;
        const take = Math.min(left, item.count);
        item.count -= take;
        left -= take;
        if (item.count <= 0) this.items.splice(this.items.indexOf(item), 1);
      }
      took.push(`${n} ${n === 1 ? 'dose' : 'doses'} of ${dealing.drugs[drug]?.name ?? drug}`);
    }
    const cash = this.money.bills + this.money.coins;
    const grab = takeCash(this.money, Math.round(cash * rng.range(rob.cash[0], rob.cash[1])));
    this.money = grab.money;
    robber.eddies += grab.taken;
    this.life.eddies[robber.id] = robber.eddies;
    if (grab.taken) took.push(`${grab.taken} €$`);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('walletChanged', this.wallet);
    return took.length ? took.join(' and ') : 'nothing much';
  }

  /**
   * A buyer calling it in after, unseen: the more so pushed or turned away, less a regular,
   * never a ganger; with the player's face, a named report (and so a warrant). Only where the
   * NCPD goes.
   */
  private snitch(buyer: Person, how: 'sold' | 'pushed' | 'walked' | 'turned', regular: boolean, now: number, rng: Rng): void {
    const police = this.rules.police;
    const { snitch } = this.rules.dealing!.bad;
    const where = this.policingAt(this.where);
    if (!police || !where || buyer.gang) return;
    const odds = (snitch.base + (how === 'pushed' || how === 'walked' ? snitch.pushed : 0) + (how === 'turned' ? snitch.turned : 0)) * (regular ? snitch.regular : 1) * (1 + (buyer.traits.courage - 0.5));
    if (!rng.chance(odds)) return;
    const mask = this.masked();
    this.report('dealing', buyer, !mask, mask ? `a ${mask.word}` : 'your face', this.spot, this.where, where.district.id, where.minutes, now, rng, null);
  }

  /**
   * The deadline and the debt, on the clock: a front not paid off by its day is a debt, less
   * trust, and collectors three hours on; a debt grows by the day; collectors come when it's
   * time (not on a train), and a gang that's lost all trust in the player cuts them off.
   */
  private dealTick(now: number): void {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    if (!dealing || !d) return;
    const { timeScale } = this.rules;
    const gang = this.rules.people.gangs[d.gang]?.name ?? d.gang;
    let changed = false;
    if (d.front && now >= d.front.due) {
      const left = d.front.owed - d.front.paid;
      d.front = null;
      if (left > 0) {
        if (d.debt <= 0) d.debtAt = now;
        d.debt += left;
        d.trust -= dealing.trust.short;
        d.collectAt ??= now + (dealing.debt.graceHours * HOUR) / timeScale;
        this.say(this.narration(dealing.lines.due, { gang, owed: String(left) }, createRng(`${this.world.seed}:due:${now}`)), 'error');
      }
      changed = true;
    }
    // A tenth more a day, whole days at a time.
    const day = DAY / timeScale;
    if (d.debt > 0 && now - d.debtAt >= day) {
      const days = Math.floor((now - d.debtAt) / day);
      d.debt = withInterest(d.debt, days, dealing);
      d.debtAt += days * day;
      changed = true;
    }
    if (d.trust <= dealing.trust.cutOff) {
      this.cutOff(d, now);
      return;
    }
    if (d.debt > 0 && d.collectAt !== null && now >= d.collectAt && !this.collectState && !this.fighting && !this.detained(now) && this.trip?.mode !== 'ncart') {
      this.collectorComes(d, now);
      changed = true;
    }
    if (changed) this.events.emit('dealChanged', this.dealing(now));
  }

  /** Someone from the gang turns up wherever the player is, for the debt: nothing else till it's settled (`answerCollector`). */
  private collectorComes(d: DealState, now: number): void {
    const dealing = this.rules.dealing!;
    const crew = dealing.gangs[d.gang];
    const district = this.districtOf(this.trip ? this.positionAt(now) : this.where)?.id;
    const members = this.membersIn(d.gang, crew?.collectors ?? [], now).filter((p) => p.id !== d.connect);
    const local = members.filter((p) => p.district === district);
    const rng = createRng(`${this.world.seed}:collector:${d.gang}:${d.collections}`);
    const pool = local.length ? local : members;
    const by = pool.length ? rng.pick(pool) : this.person(d.connect);
    if (!by || by.diedOn !== undefined) return;
    if (this.trip) this.stop(now);
    d.collections += 1;
    this.collectState = { by: by.id, gang: d.gang, at: now };
    this.dealMomentState = null;
    this.shiftEventState = null;
    learnOf(this.society, by.id, 'met');
    this.events.emit('fx', { effect: 'shake' });
    this.say(this.narration(dealing.lines.collect, this.dealVars(by, now, { gang: this.rules.people.gangs[d.gang]?.name ?? d.gang, owed: String(d.debt) }), rng), 'error');
  }

  /** The collector on the player, here with them wherever that is. */
  private collectorHere(now: number): Presence[] {
    const c = this.collectState;
    const person = c ? this.person(c.by) : undefined;
    if (!c || !person || person.diedOn !== undefined || this.outCold(person.id, now)) return [];
    return [{ person, doing: 'here to collect', stance: this.stanceOf(person, now), scene: null }];
  }

  /** The collector on the player, what they want, and what the player can do: pay what they have, plead, or fight. */
  collector(now: number): CollectorView | null {
    const c = this.collectState;
    const d = this.dealState.current;
    const by = c ? this.person(c.by) : undefined;
    if (!c || !d || !by || this.fighting) return null;
    const cash = this.money.bills + this.money.coins;
    const theirs = this.armOf(by);
    const vars = this.dealVars(by, now);
    const gang = this.rules.people.gangs[c.gang]?.name ?? c.gang;
    return {
      text: `${vars.Who} wants the ${d.debt} €$ you owe the ${gang}.`,
      person: by.id,
      gang,
      owed: d.debt,
      choices: [
        { id: 'pay', label: 'Pay', sub: cash >= d.debt ? `${d.debt} €$` : `${cash} of ${d.debt} €$`, disabled: cash <= 0 },
        { id: 'plead', label: 'Plead', sub: 'Talk for time' },
        { id: 'fight', label: 'Fight', sub: theirs.id === 'fists' ? 'Bare hands' : theirs.short },
      ],
    };
  }

  /**
   * What the player does with a collector on them. Pay: what they have, up to the debt (all of
   * it, and they're square; part, and the collector's back in a day). Plead: the player's way
   * with words against the collector's, for a few hours (a little trust for the asking); no
   * good, and it's a beating (hurt, winded, and the cash taken anyway). Fight: an assault on one
   * of the gang, trust lost, and they'll send someone else.
   */
  answerCollector(choice: string, now: number): boolean {
    const c = this.collectState;
    const d = this.dealState.current;
    const dealing = this.rules.dealing;
    const view = this.collector(now);
    const by = c ? this.person(c.by) : undefined;
    const pick = view?.choices.find((x) => x.id === choice);
    if (!c || !d || !dealing || !by || !pick || pick.disabled) return false;
    const { timeScale } = this.rules;
    const rng = createRng(`${this.world.seed}:collect-answer:${c.by}:${c.at}:${choice}`);
    const again = now + (dealing.debt.againHours * HOUR) / timeScale;
    const gang = this.rules.people.gangs[c.gang]?.name ?? c.gang;
    const tell = (pool: string[], more: Record<string, string>, tone: Tone = 'system') => this.say(this.narration(pool, this.dealVars(by, now, { gang, owed: String(d.debt), ...more }), rng), tone);
    // Cash to the gang, what there is of it up to the debt.
    const hand = () => {
      const grab = takeCash(this.money, d.debt);
      this.money = grab.money;
      d.debt -= grab.taken;
      this.life.treasuries[c.gang] = (this.life.treasuries[c.gang] ?? 0) + grab.taken;
      this.events.emit('walletChanged', this.wallet);
      return grab.taken;
    };
    if (choice === 'fight') {
      // The fight first, with them here to fight; then they're no longer waiting on an answer.
      if (!this.attack(by.id, now)) return false;
      this.collectState = null;
      d.trust -= dealing.trust.fought;
      d.collectAt = again;
      if (d.trust <= dealing.trust.cutOff) this.cutOff(d, now);
      this.events.emit('dealChanged', this.dealing(now));
      return true;
    }
    this.collectState = null;
    if (choice === 'pay') {
      const paid = hand();
      if (d.debt <= 0) {
        d.collectAt = null;
        d.trust += Math.max(0, dealing.trust.paid - dealing.trust.late);
        d.fronts += 1;
        tell(dealing.lines.collectPaid, { pay: String(paid) });
      } else {
        d.collectAt = again;
        tell(dealing.lines.collectSome, { pay: String(paid), left: String(d.debt), owed: String(d.debt + paid) });
      }
    } else {
      const { plead, beat } = dealing.debt;
      const odds = Math.max(0.05, Math.min(plead.most, plead.base + plead.perLevel * (this.charismaState.level - this.skillsFor(by, now).charisma)));
      if (rng.chance(odds)) {
        d.collectAt = now + (plead.hours * HOUR) / timeScale;
        d.trust -= plead.trust;
        tell(dealing.lines.pleaded, { when: this.whenWord(d.collectAt) });
      } else {
        tell(dealing.lines.pleadFailed, {});
        hand();
        const health = this.health(now);
        this.healthState = { value: Math.max(1, Math.round(health.current - health.max * beat.health)), at: now };
        this.drainEnergy(beat.energy, now);
        d.trust -= beat.trust;
        d.collectAt = d.debt > 0 ? again : null;
        this.events.emit('fx', { effect: 'shake' });
        tell(dealing.lines.beaten, { left: String(d.debt) }, 'error');
        this.events.emit('healthChanged', this.health(now));
      }
    }
    if (d.trust <= dealing.trust.cutOff) this.cutOff(d, now);
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** The gang is done with the player: no more product, and what's owed is a score they'll settle. */
  private cutOff(d: DealState, now: number): void {
    const dealing = this.rules.dealing!;
    const { society, timeScale } = this.rules;
    const owed = d.debt + (d.front ? d.front.owed - d.front.paid : 0);
    const gang = this.rules.people.gangs[d.gang]?.name ?? d.gang;
    this.dealState.burned[d.gang] = now;
    this.dealState.current = null;
    delete this.dealState.past[d.gang];
    delete this.dealState.vouched[d.gang];
    this.collectState = null;
    this.dealMomentState = null;
    changeRep(this.society, `gang:${d.gang}`, -10, society, timeScale, now);
    if (owed > 0) this.society.threats.push({ id: this.society.nextId++, due: now + (dealing.debt.againHours * HOUR) / timeScale, by: null, gang: d.gang, incident: 0, amount: Math.round(owed * dealing.debt.threat) });
    this.say(this.narration(dealing.lines.cutOff, { gang, owed: String(owed) }, createRng(`${this.world.seed}:cut-off:${now}`)), 'error');
    this.events.emit('dealChanged', null);
  }

  /** The player's dealing, for saving. */
  get dealingSaved(): DealingState {
    return copyOf(this.dealState);
  }

  // ───────────── The player's crew ─────────────

  /** How many runners the player could have now: none without a gang to deal for, or below its rung. */
  private crewMost(): number {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    return dealing && d ? crewSize(d.rung, dealing.crew) : 0;
  }

  /** Whether someone could be asked to run for the player: grown, not an officer or the connect, of no gang or the player's, and not on the crew already. */
  private canRecruit(person: Person): boolean {
    const dealing = this.rules.dealing;
    const d = this.dealState.current;
    if (!dealing || !d || this.dealState.crew[person.id]) return false;
    if (Object.keys(this.dealState.crew).length >= this.crewMost()) return false;
    if (person.age < dealing.habits.adultAt || NCPD.test(person.job.role) || this.isConnect(person, d)) return false;
    return !person.gang || person.gang === d.gang;
  }

  /** The player's runners, as the UI shows them. */
  crew(now: number): RunnerView[] {
    const dealing = this.rules.dealing;
    if (!dealing) return [];
    const day = this.clockAt(now).day;
    return Object.entries(this.dealState.crew).map(([id, r]) => ({
      id,
      name: this.describe(id, now)?.name ?? id,
      drug: r.drug ? (dealing.drugs[r.drug]?.name ?? r.drug) : null,
      stock: r.stock,
      cash: r.cash,
      owed: r.owed,
      left: runnerLeft(r),
      due: r.due,
      short: runnerShort(r, now),
      fronts: r.fronts,
      held: r.heldTill !== undefined && day <= r.heldTill,
      quit: Boolean(r.quit),
      ran: Boolean(r.ran),
    }));
  }

  /** What a runner's card offers: a package when they're on nothing, settling up when they hold anything or owe, leaning on them or letting it slide when they're short, letting them go. */
  private runnerOptions(person: Person, runner: Runner, now: number): DealOption[] {
    const dealing = this.rules.dealing!;
    const rules = dealing.crew;
    const left = runnerLeft(runner);
    const short = runnerShort(runner, now);
    const options: DealOption[] = [];
    if (runner.ran) {
      options.push({ id: 'crew-lean', label: 'Make them pay', sub: `${left} €$ owed`, danger: true });
      options.push({ id: 'crew-slide', label: 'Let it go' });
      return options;
    }
    if (runner.stock > 0 || runner.cash > 0 || left > 0) {
      options.push({ id: 'crew-collect', label: runner.quit ? 'Settle up' : 'Collect', sub: left > 0 ? `${left} €$ owed${runner.due ? ` by ${this.whenWord(runner.due)}` : ''}` : runner.drug ? `${dealing.drugs[runner.drug]?.name ?? runner.drug} out` : undefined });
    }
    if (short && runner.cash <= 0 && runner.stock <= 0) {
      options.push({ id: 'crew-lean', label: 'Lean on them', sub: `${left} €$ short`, danger: true });
      options.push({ id: 'crew-slide', label: 'Let it slide' });
    }
    if (!runner.quit && runner.stock <= 0 && left <= 0 && runner.cash <= 0) {
      for (const drug of this.drugsCarried()) {
        const kind = dealing.drugs[drug];
        if (!kind) continue;
        const have = this.carrying(drug);
        const street = this.runnerStreet(person, drug);
        for (const n of rules.sizes.filter((n) => n <= have)) options.push({ id: `crew-front:${drug}:${n}`, label: `${kind.name} ×${n}`, sub: `Owes ${Math.round(n * street * rules.owe)} €$ in ${rules.days} days` });
      }
      options.push({ id: 'crew-letgo', label: 'Let go', danger: true });
    }
    return options;
  }

  /** A dose's street price where a runner sells: round where they live. */
  private runnerStreet(person: Person, drug: string): number {
    const dealing = this.rules.dealing!;
    const tier = person.home ? this.tierOfSpot({ kind: 'building', id: person.home }) : 'everyday';
    return streetPrice(dealing.drugs[drug]!, tier, dealing);
  }

  /**
   * Asks someone here to run for the player: an ask like any other (openness with the
   * `recruit` cost), only of someone who likes them well enough, the keener for being of the
   * player's gang or using what it deals, the less for being straight.
   */
  private recruit(person: Person, now: number): boolean {
    const dealing = this.rules.dealing!;
    const d = this.dealState.current;
    const here = this.isHere(person.id, now);
    if (!d || !here || !this.canRecruit(person)) return false;
    const rules = dealing.crew;
    const { society, timeScale, lines } = this.rules;
    const { stance, doing } = here;
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:recruit:${standing.asks}`);
    const before = this.snapshot(person, now);
    learnOf(this.society, person.id, 'met');
    this.logged(person.id, 'you', line(lines.you.recruit, speaker, rng), now);
    const refused = { ...standing.refused };
    let rapport = 0;
    let note = '';
    let joined = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.masked()) {
      this.speech(person, line(lines.deal.masked, speaker, rng), now);
    } else if (this.pressing(standing, 'recruit', now)) {
      rapport = -society.openness.press;
      note = lines.notes.pressed;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const habit = this.habitFor(person);
      const user = Boolean(habit && dealing.gangs[d.gang]?.drugs.includes(habit.drug));
      const keen = (person.gang === d.gang ? rules.keen.gang : 0) + (user ? rules.keen.user : 0) + (!person.gang && !habit ? rules.keen.straight : 0);
      const reply = rules.stances.includes(stance) ? replyTo(openness('recruit', stance, this.charismaEdge, person.traits, society.openness) + keen + this.leaning(person.id, now), society.openness, rng) : 'refuse';
      if (reply === 'answer') {
        joined = true;
        this.dealState.crew[person.id] = freshRunner(now, this.clockAt(now).day, rules);
        learnFact(this.society, person.id, 'name');
        this.speech(person, line(lines.deal.recruit, speaker, rng), now);
        this.say(`${person.given} runs for you now. Front ${this.pronounsOf(person).him} a package from what you carry.`, 'system');
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, 'recruit', lines, rng) : line(lines.deal.recruitNo, speaker, rng), now);
        refused.recruit = now;
      }
    }
    changeStanding(this.society, person.id, { met: true, asks: standing.asks + 1, refused, rapport }, society, timeScale, now);
    this.noteFeedback(person, before, now, note, speaker.vars);
    this.events.emit('societyChanged', { people: [person.id] });
    if (joined) this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** A runner's pronouns, for a line the game says. */
  private pronounsOf(person: Person): { he: string; him: string; his: string } {
    const vars = this.dealVars(person, Date.now());
    return { he: vars.he ?? 'they', him: vars.him ?? 'them', his: vars.his ?? 'their' };
  }

  /** Fronts a runner here a package out of the player's pockets: they owe its share by the day. */
  private frontToRunner(person: Person, drug: string, doses: number, now: number): boolean {
    const dealing = this.rules.dealing!;
    const runner = this.dealState.crew[person.id];
    const here = this.isHere(person.id, now);
    if (!runner || !here || this.carrying(drug) < doses) return false;
    const { lines } = this.rules;
    const street = this.runnerStreet(person, drug);
    const next = frontRunner(runner, drug, doses, street, now, this.rules.timeScale, dealing.crew);
    for (let n = 0; n < doses; n++) {
      const item = this.items.find((i) => i.kind === 'consumable' && i.id === drug);
      if (item) this.takeOne(item);
    }
    this.dealState.crew[person.id] = next;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    speaker.vars = { ...speaker.vars, drug: dealing.drugs[drug]?.name ?? drug, doses: String(doses), owed: String(next.owed), when: this.whenWord(next.due ?? now) };
    const rng = createRng(`${this.world.seed}:${person.id}:front-runner:${runner.fronts}:${now}`);
    this.logged(person.id, 'you', line(lines.you.frontRunner, speaker, rng), now);
    this.speech(person, line(lines.deal.runnerFront, speaker, rng), now);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /**
   * Settles up with a runner here: what they hold, up to what they owe (as far as the player's
   * pockets take it), and anything over theirs once the package is paid; a runner who's walked
   * hands back what didn't sell, and is off the crew once square. They say how it went.
   */
  private collectFrom(person: Person, now: number): boolean {
    const dealing = this.rules.dealing!;
    const runner = this.dealState.crew[person.id];
    const here = this.isHere(person.id, now);
    if (!runner || !here || runner.ran) return false;
    const { lines, society, timeScale } = this.rules;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:collect:${runner.fronts}:${runner.paid}:${now}`);
    const before = this.snapshot(person, now);
    this.logged(person.id, 'you', line(lines.you.collect, speaker, rng), now);
    const short = runnerShort(runner, now);
    const busted = runner.news.some((n) => n.kind === 'busted');
    const robbed = runner.news.some((n) => n.kind === 'robbed');
    // What the player's pockets take of what they'd hand over; the rest stays with them.
    const due = Math.min(runner.cash, runnerLeft(runner));
    const room = Math.min(due, this.cashRoom(due));
    const out = settle({ ...runner, cash: runner.cash - (due - room) }, dealing.crew);
    const got = this.pocketCash(out.handed);
    let r = out.runner;
    r.cash += due - room;
    if (out.settled) {
      // Anything over is theirs to keep.
      const kept = out.kept + r.cash;
      r.cash = 0;
      person.eddies += kept;
      this.life.eddies[person.id] = person.eddies;
      speaker.vars = { ...speaker.vars, kept: String(kept) };
    }
    if (room < due) this.say('No room on you for all of it. They hold on to the rest for now.', 'error');
    // A runner who's walked hands back what didn't sell.
    if (r.quit && r.stock > 0 && r.drug) {
      if (this.stowDoses(r.drug, r.stock)) r = { ...r, stock: 0 };
      else this.say(`No room on you for the ${r.stock} doses ${person.given} hands back. They hold on to them.`, 'error');
    }
    const left = runnerLeft(r);
    speaker.vars = { ...speaker.vars, handed: String(got), left: String(left), when: r.due ? this.whenWord(r.due) : 'soon', ...(busted ? { busted: 'yes' } : {}), ...(robbed ? { robbed: 'yes' } : {}), ...(!busted && !robbed && (runner.hidden ?? 0) > 0 ? { lying: 'yes' } : {}) };
    if (r.quit) this.speech(person, line(lines.deal.runnerQuit, speaker, rng), now);
    else if (short && left > 0) this.speech(person, line(lines.deal.runnerShort, speaker, rng), now);
    else if (out.settled) {
      this.speech(person, line(lines.deal.runnerPaid, speaker, rng), now);
      if (speaker.vars.kept && speaker.vars.kept !== '0') this.speech(person, line(lines.deal.runnerKept, speaker, rng), now);
    } else if (got > 0) this.speech(person, line(lines.deal.runnerSome, speaker, rng), now);
    else this.speech(person, line(lines.deal.runnerNothing, speaker, rng), now);
    if (r.quit && left <= 0 && r.stock <= 0) {
      delete this.dealState.crew[person.id];
      this.say(`${person.given} is off your crew.`, 'system');
    } else this.dealState.crew[person.id] = r;
    if (got > 0) this.say(`${got} €$ from ${person.given}${left > 0 ? `; ${left} €$ still owed` : ''}.`, 'system');
    changeStanding(this.society, person.id, { met: true, rapport: out.settled ? 1 : 0 }, society, timeScale, now);
    this.noteFeedback(person, before, now, '', speaker.vars);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** Leans on a runner who's short, or ran: the player's fists against theirs; found, the rest out of their own pocket; not, a grudge. Either way they like it less. */
  private leanOn(person: Person, now: number): boolean {
    const dealing = this.rules.dealing!;
    const rules = dealing.crew;
    const runner = this.dealState.crew[person.id];
    const here = this.isHere(person.id, now);
    if (!runner || !here || (!runner.ran && !runnerShort(runner, now))) return false;
    const { lines, society, timeScale } = this.rules;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:lean:${runner.paid}:${now}`);
    const before = this.snapshot(person, now);
    this.logged(person.id, 'you', line(lines.you.lean, speaker, rng), now);
    const left = runnerLeft(runner);
    const odds = here.stance === 'hostile' ? 0 : leanOdds(this.brawlerState.level, this.skillsFor(person, now).brawler, rules);
    const found = Math.min(left, person.eddies, this.cashRoom(Math.min(left, person.eddies)));
    let r: Runner = { ...runner, mood: runner.mood - rules.mood.leaned };
    if (found > 0 && rng.chance(odds)) {
      const got = this.pocketCash(found);
      person.eddies -= got;
      this.life.eddies[person.id] = person.eddies;
      r = { ...r, paid: r.paid + got };
      speaker.vars = { ...speaker.vars, handed: String(got) };
      this.speech(person, line(lines.deal.leanPaid, speaker, rng), now);
      this.say(`${got} €$ out of ${person.given}.`, 'system');
      changeStanding(this.society, person.id, { met: true, rapport: -rules.lean.rapport }, society, timeScale, now);
    } else {
      this.speech(person, line(lines.deal.leanFailed, speaker, rng), now);
      changeStanding(this.society, person.id, { met: true, rapport: -rules.lean.rapport, grudge: rules.lean.grudge }, society, timeScale, now);
    }
    if (runnerLeft(r) <= 0) {
      r = settle(r, rules).runner;
      if (r.ran || r.quit) delete this.dealState.crew[person.id];
      else this.dealState.crew[person.id] = r;
    } else this.dealState.crew[person.id] = r;
    this.noteFeedback(person, before, now, '', speaker.vars);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** Lets what a runner owes go: glad of it, and warmer; one who's walked or ran is off the crew. */
  private letSlide(person: Person, now: number): boolean {
    const dealing = this.rules.dealing!;
    const runner = this.dealState.crew[person.id];
    const here = this.isHere(person.id, now);
    if (!runner || !here) return false;
    const { lines, society, timeScale } = this.rules;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:slide:${runner.shorted}:${now}`);
    const before = this.snapshot(person, now);
    this.logged(person.id, 'you', line(lines.you.slide, speaker, rng), now);
    this.speech(person, line(lines.deal.slide, speaker, rng), now);
    if (runner.ran || runner.quit) delete this.dealState.crew[person.id];
    else this.dealState.crew[person.id] = writeOff(runner, dealing.crew);
    changeStanding(this.society, person.id, { met: true, rapport: dealing.crew.lean.slide }, society, timeScale, now);
    this.noteFeedback(person, before, now, '', speaker.vars);
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /** Lets a runner with nothing out go. */
  private letGo(person: Person, now: number): boolean {
    const runner = this.dealState.crew[person.id];
    const here = this.isHere(person.id, now);
    if (!runner || !here) return false;
    const { lines } = this.rules;
    const speaker = this.speakerFor(person, here.stance, here.doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:let-go:${runner.fronts}`);
    this.logged(person.id, 'you', line(lines.you.letGo, speaker, rng), now);
    this.speech(person, line(lines.deal.letGo, speaker, rng), now);
    delete this.dealState.crew[person.id];
    this.say(`${person.given} is off your crew.`, 'system');
    this.events.emit('societyChanged', { people: [person.id] });
    this.events.emit('dealChanged', this.dealing(now));
    return true;
  }

  /**
   * The crew's own days, each runner on their own stream: out selling near home, picked up,
   * robbed, skimming or using, walking out; word reaches the player of what anyone would hear
   * of, and a runner who talks to the NCPD puts the player's name on a warrant.
   */
  private crewDays(today: number, now: number): void {
    const dealing = this.rules.dealing;
    if (!dealing) return;
    const rules = dealing.crew;
    const { police, timeScale } = this.rules;
    let changed = false;
    for (const [id, start] of Object.entries(this.dealState.crew)) {
      const person = this.person(id);
      if (!person || person.diedOn !== undefined) {
        delete this.dealState.crew[id];
        if (person) this.say(this.narration(rules.lines.dead, this.dealVars(person, now, { drug: start.drug ? (dealing.drugs[start.drug]?.name ?? start.drug) : 'product' }), createRng(`${this.world.seed}:crew-dead:${id}`)), 'error');
        changed = true;
        continue;
      }
      let r = start;
      for (let day = Math.max(r.day + 1, today - this.rules.life.catchUpDays); day <= today; day++) {
        if (person.hurtUntil !== undefined && day <= person.hurtUntil) {
          r = { ...r, day };
          continue;
        }
        const drug = r.drug ? dealing.drugs[r.drug] : undefined;
        const { trading, dealing: knows } = this.skillsFor(person, now);
        const power = this.rules.money.haggle ?? 0;
        const priceFactor = this.rules.trading && power ? Math.pow(skillBonus(this.rules.trading, trading) / skillBonus(this.rules.trading, 4), power) : 1;
        const rapport = standingOf(this.society, id, this.rules.society, timeScale, now).rapport;
        const rng = createRng(`${this.world.seed}:crew:${id}:${day}`);
        const res = runnerDay(r, {
          day,
          users: r.drug ? this.usersOf(r.drug, person.district).length : 0,
          dealing: knows,
          priceFactor,
          street: drug && r.drug ? this.runnerStreet(person, r.drug) : 0,
          call: police ? (policing(person.district, null, police)?.call ?? 0) : 0,
          rough: dealing.bad.rough[person.district] ?? 1,
          greed: person.traits.greed,
          hooked: Boolean(r.drug && this.habitFor(person)?.drug === r.drug),
          rapport,
        }, rules, rng);
        const fresh = res.runner.news.filter((n) => n.day === day);
        r = res.runner;
        if (res.sold) {
          this.dealState.dealt[id] = (this.dealState.dealt[id] ?? 0) + res.sold;
          this.trainDealing(res.sold * dealing.xp.runner);
        }
        if (res.skimmed) {
          person.eddies += res.skimmed;
          this.life.eddies[id] = person.eddies;
        }
        const vars = this.dealVars(person, now, { drug: drug?.name ?? 'product' });
        for (const news of fresh) {
          if (news.kind === 'busted') this.say(this.narration(rules.lines.busted, { ...vars, doses: String(news.doses ?? 0) }, rng), 'error');
          if (news.kind === 'robbed') this.say(this.narration(rules.lines.robbed, { ...vars, doses: String(news.doses ?? 0), cash: String(news.cash ?? 0) }, rng), 'error');
          changed = true;
        }
        if (res.named && police) {
          this.namedBy(person, now);
          this.say(this.narration(rules.lines.named, vars, rng), 'error');
        }
        if (res.hurtDays) {
          const until = day + res.hurtDays;
          this.life.hurt[id] = until;
          person.hurtUntil = until;
        }
        if (res.walked === 'ran') {
          // They keep the cash, and what didn't sell.
          person.eddies += r.cash;
          this.life.eddies[id] = person.eddies;
          r = { ...r, cash: 0, stock: 0 };
          this.say(this.narration(rules.lines.ran, vars, rng), 'error');
          changed = true;
        } else if (res.walked === 'quit') {
          changed = true;
          if (r.stock <= 0 && r.cash <= 0 && runnerLeft(r) <= 0) {
            this.say(this.narration(rules.lines.walked, vars, rng), 'system');
            break;
          }
          this.say(this.narration(rules.lines.quit, vars, rng), 'system');
        }
        if (res.sold) changed = true;
      }
      if (r.quit && r.stock <= 0 && r.cash <= 0 && runnerLeft(r) <= 0) delete this.dealState.crew[id];
      else this.dealState.crew[id] = r;
    }
    if (changed) this.events.emit('dealChanged', this.dealing(now));
  }

  /** A runner gave the NCPD the player's name: on record, and a warrant for dealing. */
  private namedBy(runner: Person, now: number): void {
    this.onRecord('dealing', runner.district, true, 'a cell', "a runner's word", now);
  }

  /** Something the NCPD hears of with nobody calling it in from the scene: a report, and a warrant when it names the player. */
  private onRecord(crime: Crime, district: string, named: boolean, place: string, seen: string, now: number): void {
    const police = this.rules.police;
    if (!police) return;
    const p = this.policeState;
    p.reports.push({ id: p.nextId++, crime, at: now, district, place, named, seen });
    if (p.reports.length > police.keep) p.reports.splice(0, p.reports.length - police.keep);
    if (named) issueWarrant(p, crime, district, now, police, this.rules.timeScale);
    this.events.emit('policeChanged', this.police(now));
  }

  // ───────────── The player's habit ─────────────

  /** What the player's habit does to them now; nothing at all without dealing's rules. */
  private habitNow(now: number): ReturnType<typeof effectsAt> {
    const rules = this.rules.dealing?.habit;
    return rules ? effectsAt(this.habitState, now, rules, this.rules.timeScale) : { charisma: 0, aim: 1, power: 1, melee: 1, armor: 0, window: 0, crit: 0, maxHealth: 1, steady: 1, numb: false };
  }

  /** Where the player's habit stands, for the UI: what's working and till when, the worst of craving or withdrawal, how dependent on each drug, the edge, the nerves. */
  habit(now: number): HabitView | null {
    const dealing = this.rules.dealing;
    if (!dealing) return null;
    const rules = dealing.habit;
    const { timeScale } = this.rules;
    const name = (id: string) => dealing.drugs[id]?.name ?? id;
    const stage = stageAt(this.habitState, now, rules, timeScale);
    const fx = this.habitNow(now);
    return {
      active: this.habitState.active.filter((a) => a.until > now).map((a) => ({ drug: a.drug, name: name(a.drug), until: a.until })),
      stage: stage ? { drug: stage.drug, name: name(stage.drug), stage: stage.stage } : null,
      drugs: Object.entries(this.habitState.drugs).map(([id, use]) => ({ drug: id, name: name(id), dependence: Math.round(dependenceAt(use, now, rules, timeScale)) })).filter((d) => d.dependence > 0),
      edge: Math.round(edgeAt(this.habitState, now, rules, timeScale)),
      numb: fx.numb,
      nerve: this.habitState.nerve,
    };
  }

  get habitSaved(): HabitState {
    return copyOf(this.habitState);
  }

  /**
   * Takes a dose: what it does at once (health, energy), what it does while it lasts, the
   * dependence it adds and the tolerance that comes with it, any lasting harm; and the odds it's
   * an overdose (`overdose`). Not in a fight, nor with officers or a collector on the player.
   */
  private useDrug(item: Item, now: number): boolean {
    const dealing = this.rules.dealing;
    const drug = this.rules.gear.drugs[item.id];
    if (!dealing || !drug || this.fighting || this.detained(now)) return false;
    const rules = dealing.habit;
    const { timeScale } = this.rules;
    const rng = createRng(`${this.world.seed}:dose:${item.id}:${now}`);
    const odds = overdoseOdds(this.habitState, item.id, now, rules, timeScale);
    const health = this.health(now);
    const energy = this.energy(now);
    const edge = edgeAt(this.habitState, now, rules, timeScale);
    // A cut dose is weaker by its filler, and a bad cut can make the player sick.
    const share = item.cut ?? 0;
    const { state, strength, nerve } = takeDose(this.habitState, item.id, drug.hook, now, rules, timeScale, rng, 1 - share);
    this.habitState = { ...state, told: undefined };
    this.takeOne(item);
    const effect = rules.effects[item.id];
    this.say(this.narration(rules.lines.use[item.id] ?? [], { drug: drug.name }, rng), 'system');
    // What it gives at once: a second wind, a little health.
    if (effect?.heal) this.healthState = { value: Math.min(this.maxHealth(now), health.current + effect.heal * strength), at: now };
    else this.healthState = { value: Math.min(this.maxHealth(now), health.current), at: now };
    if (effect?.energy) this.energyState = { ...this.energyState, current: Math.min(energy.max, energy.current + Math.round(effect.energy * strength)), updatedAt: now };
    if (nerve) this.say(this.narration(rules.lines.nerve, {}, rng), 'error');
    if (share > 0 && rng.chance(sickOdds(share, skillBonus(dealing.cut.skill, this.cutterState.level), dealing.cut))) {
      this.events.emit('fx', { effect: 'shake' });
      this.healthState = { value: Math.max(1, this.health(now).current - Math.round(this.maxHealth(now) * dealing.cut.sick.health)), at: now };
      this.say(this.narration(dealing.cut.lines.sick, { drug: drug.name }, rng), 'error');
    }
    if (strength < 0.7) this.say(this.narration(rules.lines.tolerant, { drug: drug.name }, rng), 'system');
    if (edge < rules.edge.numb && edgeAt(this.habitState, now, rules, timeScale) >= rules.edge.numb) this.say(this.narration(rules.lines.numb, {}, rng), 'error');
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('healthChanged', this.health(now));
    this.events.emit('energyChanged', this.energy(now));
    if (rng.chance(odds)) this.overdose(item.id, now, rng);
    this.events.emit('habitChanged', this.habit(now));
    return true;
  }

  /** A hospital's bill, paid from the account or the cash if it can be, else whatever there is taken; the line that says so. */
  private hospitalBill(bill: number): string {
    if (bill <= 0) return '';
    if (this.canPay(bill, true) && this.pay(bill, true)) {
      this.events.emit('walletChanged', this.wallet);
      return `The bill: ${bill} €$.`;
    }
    const took = this.money.account + this.money.bills + this.money.coins;
    this.money = { bills: 0, coins: 0, account: 0 };
    this.events.emit('walletChanged', this.wallet);
    return `The bill is ${bill} €$, and they take the ${took} €$ you have.`;
  }

  /** Carried to the hospital nearest, put back to a share of the most health, and billed for it; where it was, and the bill's line. */
  private toHospital(share: number, copay: number, now: number): { ward: string; bill: string } {
    const { gear, food } = this.rules;
    const ward = nearestHospital(this.world, this.where);
    const at = ward ? (ward.spot.kind === 'location' ? this.world.locations[ward.spot.id] : buildingById(this.world, ward.spot.id)) : undefined;
    const restored = Math.max(1, Math.round(this.maxHealth(now) * share));
    this.healthState = { value: restored, at: now };
    if (this.trip) this.stop(now);
    this.dealMomentState = null;
    this.shiftEventState = null;
    const bill = this.hospitalBill(Math.round(priceFor(restored * gear.medical.perPoint, at ? drawQuality(this.world, at) : 'everyday', food) * copay));
    if (at) this.carryTo(at);
    this.events.emit('healthChanged', this.health(now));
    return { ward: at?.name ?? 'a hospital', bill };
  }

  /**
   * An overdose. On a Trauma Team plan, they get the player out. Else someone here may get help
   * in time (the odds `saved`), and the player wakes in the hospital, billed. Nobody, and the
   * player is dead: the city goes on without them (`flatlined`).
   */
  private overdose(drug: string, now: number, rng: Rng): void {
    const rules = this.rules.dealing!.habit;
    const name = this.rules.gear.drugs[drug]?.name ?? drug;
    this.events.emit('fx', { effect: 'shake' });
    this.say(this.narration(rules.lines.overdose, { drug: name }, rng), 'error');
    const cover = this.covered(now);
    if (cover) {
      const { ward, bill } = this.toHospital(cover.plan.restore, cover.plan.copay, now);
      this.say(this.narration(rules.lines.trauma, { ward, bill }, rng), 'system');
      return;
    }
    const here = this.peopleHere(now).filter((p) => p.doing !== 'out cold' && p.person.diedOn === undefined);
    if (here.length && rng.chance(rules.overdose.saved)) {
      const helper = rng.pick(here).person;
      const who = this.dealVars(helper, now).who ?? 'someone';
      const { ward, bill } = this.toHospital(0.2, 1, now);
      this.say(this.narration(rules.lines.saved, { who, ward, bill }, rng), 'system');
      return;
    }
    const place = this.inside?.name ?? this.location?.name ?? this.nameOf(this.where);
    this.events.emit('flatlined', { text: this.narration(rules.lines.flatline, { place }, rng) });
  }

  /**
   * The habit on the clock: doses wearing off; craving, then withdrawal (told once each, and
   * energy draining while it lasts), then a collapse into the hospital, detoxed; and on the
   * edge, now and then, lashing out at whoever's here.
   */
  private habitTick(now: number): void {
    const dealing = this.rules.dealing;
    if (!dealing) return;
    const rules = dealing.habit;
    const { timeScale } = this.rules;
    const h = this.habitState;
    const name = (id: string) => dealing.drugs[id]?.name ?? id;
    let changed = false;
    const worn = h.active.filter((a) => a.until <= now);
    if (worn.length) {
      h.active = h.active.filter((a) => a.until > now);
      for (const a of worn) this.say(this.narration(rules.lines.wearOff, { drug: name(a.drug) }, createRng(`${this.world.seed}:worn:${a.drug}:${a.until}`)), 'system');
      // Black Lace's toll on the most health lifts; what's left of it stays as it is.
      this.events.emit('healthChanged', this.health(now));
      changed = true;
    }
    const busy = this.fighting || this.detained(now) || this.trip?.mode === 'ncart';
    const stage = stageAt(h, now, rules, timeScale);
    const key = stage ? `${stage.stage}:${stage.drug}` : undefined;
    if (stage && key !== h.told && !busy) {
      h.told = key;
      changed = true;
      const rng = createRng(`${this.world.seed}:stage:${key}:${now}`);
      if (stage.stage === 'severe') {
        // The body gives up waiting: a collapse, the hospital, a detox that takes the edge off the habit.
        this.events.emit('fx', { effect: 'shake' });
        const use = h.drugs[stage.drug] as NonNullable<HabitState['drugs'][string]>;
        h.drugs[stage.drug] = { ...use, dependence: dependenceAt(use, now, rules, timeScale) * (1 - rules.severe.detox), last: now };
        const { ward, bill } = this.toHospital(rules.severe.health, 1, now);
        this.say(this.narration(rules.lines.severe, { drug: name(stage.drug), ward, bill }, rng), 'error');
        h.told = undefined;
      } else this.say(this.narration(stage.stage === 'withdrawal' ? rules.lines.withdrawal : rules.lines.craving, { drug: name(stage.drug) }, rng), stage.stage === 'withdrawal' ? 'error' : 'system');
    } else if (!stage && h.told) h.told = undefined;
    // Withdrawal drains the player, a point at a time.
    if ((stage?.stage === 'withdrawal' || stage?.stage === 'severe') && now - (h.drainAt ?? 0) >= (rules.withdrawal.drainMinutes * 60_000) / timeScale) {
      h.drainAt = now;
      this.drainEnergy(1, now);
    }
    // Past the edge: now and then, the player goes for whoever's here.
    const edge = edgeAt(h, now, rules, timeScale);
    if (edge >= rules.edge.snap && !busy && now - (h.snapAt ?? 0) >= HOUR / timeScale) {
      h.snapAt = now;
      const rng = createRng(`${this.world.seed}:snap:${now}`);
      const here = this.peopleHere(now).filter((p) => p.doing !== 'out cold' && !NCPD.test(p.person.job.role));
      if (here.length && rng.chance(rules.edge.snapChance)) {
        const victim = rng.pick(here);
        this.say(this.narration(rules.lines.snap, { who: this.dealVars(victim.person, now).who ?? 'someone' }, rng), 'error');
        this.openFight(victim, now, null);
      }
    }
    if (changed) this.events.emit('habitChanged', this.habit(now));
  }

  // ───────────── Finishing someone ─────────────

  /** The ways the player could kill someone lying out cold here, by what they carry and have fitted: their hands always, and a blade, a loaded gun, something blunt or a monowire if they have one. */
  finishes(id: string, now: number): Array<{ id: FinishKind; label: string; with: string }> {
    if (this.fighting || this.detained(now) || !this.outCold(id, now) || !this.peopleHere(now).some((p) => p.person.id === id)) return [];
    const tools = this.finishTools();
    return (Object.entries(this.rules.combat.finish.ways) as Array<[FinishKind, FinishRules]>).flatMap(([way, r]) => {
      const tool = r.needs === 'hands' ? { name: 'your hands' } : tools[r.needs];
      return tool ? [{ id: way, label: r.label, with: tool.name }] : [];
    });
  }

  /** What the player has to kill with, by what it takes: the first blade, loaded gun, blunt thing and wire they carry or have fitted. */
  private finishTools(): Partial<Record<'blade' | 'gun' | 'blunt' | 'wire', { name: string; item?: Item }>> {
    const { combat, gear } = this.rules;
    const tools: Partial<Record<'blade' | 'gun' | 'blunt' | 'wire', { name: string; item?: Item }>> = {};
    for (const item of this.items) {
      const weapon = weaponOf(item, gear.arms);
      const kind = weapon ? combat.classes[weapon.class]?.kind : undefined;
      if (!weapon || !kind) continue;
      if (kind === 'gun') {
        if ((item.loaded ?? 0) > 0) tools.gun ??= { name: weapon.short, item };
      } else if (kind === 'blade' || kind === 'blunt' || kind === 'wire') tools[kind] ??= { name: weapon.short };
    }
    for (const fit of this.fitted) {
      const cls = combat.chrome[fit.id]?.arm;
      const kind = cls ? combat.classes[cls]?.kind : undefined;
      const implant = gear.chrome.implants[fit.id];
      if (implant && (kind === 'blade' || kind === 'blunt' || kind === 'wire')) tools[kind] ??= { name: implant.short };
    }
    return tools;
  }

  /**
   * Kills someone lying out cold, the way chosen (`finishes`). Someone here may get there first
   * and stop it (by their nerve, what the victim is to them, a guard's job; slower ways give
   * them longer): then it's an assault, and a fight with whoever stopped it; an NCPD officer
   * draws on the player instead. Done, it's a murder: whoever's in the room saw it, and a
   * gunshot the whole building heard.
   */
  killCold(id: string, way: FinishKind, now: number): boolean {
    const chosen = this.finishes(id, now).find((f) => f.id === way);
    const person = this.person(id);
    if (!chosen || !person) return false;
    const rules = this.rules.combat.finish;
    const how = rules.ways[way];
    const rng = createRng(`${this.world.seed}:finish:${id}:${now}`);
    const knew = this.facesHere(now);
    const here = this.peopleHere(now).filter((p) => p.person.id !== id && p.doing !== 'out cold');
    const officer = this.rules.police ? here.find((p) => NCPD.test(p.person.job.role)) : undefined;
    const crowd = Math.max(1, here.length) ** rules.intervene.crowd;
    const stopper = officer ?? here.find((p) => rng.chance(Math.min(rules.intervene.most, (this.interveneOdds(p.person, person) * how.slow) / crowd)));
    if (stopper) {
      const text = finish(rng.pick(rules.stopped)!, this.whoVars(stopper.person));
      // A try at it is an assault on them all the same.
      const fallout = this.incident('assault', person, 0, now);
      this.crime('assault', person, now, knew, 'witnesses');
      if (officer) {
        this.confront([officer.person.id], 'assault', 'scene', now, [text]);
        this.events.emit('policeChanged', this.police(now));
      } else this.openFight(stopper, now, text);
      this.checkFired(now);
      this.events.emit('societyChanged', { people: fallout });
      return true;
    }
    const gun = how.needs === 'gun' ? this.finishTools().gun?.item : undefined;
    if (gun) {
      gun.loaded = Math.max(0, (gun.loaded ?? 1) - 1);
      this.events.emit('inventoryChanged', this.inventory);
    }
    this.say(finish(rng.pick(how.lines)!, { ...this.whoVars(person), weapon: chosen.with }), 'error');
    const day = this.clockAt(now).day;
    this.life.dead[id] = day;
    person.diedOn = day;
    delete this.life.hurt[id];
    delete person.hurtUntil;
    this.outColdState.delete(id);
    const fallout = this.incident('murder', person, 0, now);
    if (this.society.romance?.with === id) this.society.romance = null;
    this.say(`${capitalize(this.fightName(person, false))} is dead.`, 'system');
    // Whoever's here saw it; a gunshot, the whole building heard.
    this.crime('murder', person, now, knew, 'witnesses', undefined, how.loud ? { people: this.heardInBuilding(now), share: rules.heard } : undefined);
    this.checkFired(now);
    this.events.emit('societyChanged', { people: fallout });
    return true;
  }

  /** The odds someone here would stop the player killing someone: their nerve, what the victim is to them, a guard's job. */
  private interveneOdds(p: Person, victim: Person): number {
    const r = this.rules.combat.finish.intervene;
    let odds = r.base * p.traits.courage * 2;
    const tie = tiesOf(this.population, p.id).find((t) => t.to === victim.id);
    if (tie) odds *= FAMILY.includes(tie.kind) ? r.kin : r.friend;
    if (p.gang && p.gang === victim.gang) odds *= r.gang;
    if (GUARD.test(p.job.role)) odds *= r.guard;
    return odds;
  }

  /** Everyone in the building the player is in but out of the room: who'd hear a gunshot. */
  private heardInBuilding(now: number): Person[] {
    const spot = this.spot;
    if (!this.inside || !spot || !this.rules.rooms) return [];
    const here = new Set(this.peopleHere(now).map((p) => p.person.id));
    return peopleAt(this.population, this.world, spot, this.clockAt(now), this.rules.food.dishes, this.rules.people.out)
      .map((p) => p.person)
      .filter((p) => !here.has(p.id));
  }

  /** Someone, for a line about them: who (as the player knows them), their pronouns, and the verb endings after `{he}`. */
  private whoVars(person: Person): Record<string, string> {
    const p = pronounsOf(person);
    const they = person.pronouns === 'they';
    const who = this.fightName(person, false);
    return { who, Who: capitalize(who), he: p.he, He: capitalize(p.he), him: p.him, his: p.his, His: capitalize(p.his), s: they ? '' : 's', es: they ? '' : 'es' };
  }

  // ───────────── The NCPD ─────────────

  /**
   * What the NCPD has on the player at `now`: a unit they know is on its way, the warrants out
   * for them, a hold they're sitting out, and officers on them with what they want.
   */
  police(now: number): PoliceView {
    const p = this.policeState;
    const d = p.dispatch;
    return {
      dispatch: d?.told ? { crime: d.crime, arriveAt: d.arriveAt } : null,
      warrants: warrantsAt(p, now).map((w) => ({ ...w })),
      held: this.heldAt(now) ? p.held : null,
      reports: p.reports.length,
      confront: p.confront ? this.facing(p.confront, now) : null,
    };
  }

  /** What the NCPD has on the player, for saving. */
  get policeSaved(): PoliceState {
    return copyOf(this.policeState);
  }

  /** Whether the player is sitting out a hold at the precinct. */
  private heldAt(now: number): boolean {
    const held = this.policeState.held;
    return held !== null && held > now;
  }

  /** Whether the NCPD has the player, at gunpoint or in a cell: nothing else can be done till it's settled. */
  private detained(now: number): boolean {
    return Boolean(this.policeState.confront) || this.heldAt(now) || Boolean(this.collectState);
  }

  private get officers(): Person[] {
    return (this.officerList ??= this.population.people.filter((p) => NCPD.test(p.job.role)));
  }

  /** Two officers to send: from the district if it has two who can come, else from wherever; nobody dead, laid up or out cold. */
  private unitFor(district: string, now: number, rng: Rng): string[] {
    const day = this.clockAt(now).day;
    const fit = this.officers.filter((p) => p.diedOn === undefined && !(p.hurtUntil !== undefined && day <= p.hurtUntil) && !this.outCold(p.id, now));
    const local = fit.filter((p) => p.district === district);
    const pool = local.length >= 2 ? [...local] : [...fit];
    const unit: string[] = [];
    while (unit.length < 2 && pool.length) unit.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!.id);
    return unit;
  }

  /** The officers who have the player, here with them wherever that is. */
  private copsHere(now: number): Presence[] {
    const c = this.policeState.confront;
    if (!c) return [];
    return c.officers.flatMap((id) => {
      const person = this.person(id);
      return person && person.diedOn === undefined && !this.outCold(id, now) ? [{ person, doing: 'holding a gun on you', stance: this.stanceOf(person, now), scene: null }] : [];
    });
  }

  /** How the NCPD works somewhere: the district, the odds a witness calls and the minutes a unit takes; null where it doesn't go. */
  private policingAt(where: Point & Partial<Whereabouts>): { district: District; call: number; minutes: [number, number] } | null {
    const police = this.rules.police;
    const district = this.districtOf(where);
    if (!police || !district) return null;
    const how = policing(district.id, this.neighborhoodOf(where), police);
    return how ? { district, ...how } : null;
  }

  /** Who here could put a name to the player's face: anyone who'd met them, and any NCPD officer, who has it on file. Nobody, in a mask. */
  private facesHere(now: number): Set<string> {
    if (this.masked()) return new Set();
    const { society, timeScale } = this.rules;
    return new Set(
      this.peopleHere(now)
        .map((p) => p.person)
        .filter((p) => NCPD.test(p.job.role) || standingOf(this.society, p.id, society, timeScale, now).met)
        .map((p) => p.id),
    );
  }

  /**
   * How likely someone is to call the NCPD over a crime: the district's odds for an ordinary
   * witness alone (`base`), times more for the one it was done to, their people, a guard's job,
   * a corpo's, nerve either way; a ganger hardly ever, and never on their gang's own turf. An
   * officer always does.
   */
  private callOdds(caller: Person, victim: Person, base: number, turf: Set<string>, now: number): number {
    const odds = this.rules.police!.caller;
    if (NCPD.test(caller.job.role)) return 1;
    if (caller.gang && turf.has(caller.gang)) return 0;
    let chance = base * (1 + odds.courage * (caller.traits.courage - 0.5) * 2);
    // What they remember of the player: someone they owe looks the other way; someone they hold a lot against reaches for the phone.
    chance *= 1 - (odds.regard ?? 0) * this.regardOf(caller.id, now);
    if (caller.id === victim.id) chance *= odds.victim;
    else {
      const tie = tiesOf(this.population, caller.id).find((t) => t.to === victim.id);
      if (tie) chance *= FAMILY.includes(tie.kind) ? odds.kin : odds.friend;
    }
    if (GUARD.test(caller.job.role)) chance *= odds.guard;
    if (isCorpo(caller, this.world)) chance *= odds.corpo;
    if (caller.gang) chance *= odds.ganger;
    return Math.max(0, Math.min(odds.most, chance));
  }

  /**
   * Something the NCPD would want to hear of, done here. Whoever saw it (`witnesses`), the one
   * it was done to (`victim`), or both (`all`), may call it in, each by their own odds; out
   * cold, the victim may once they come to. Nobody calls, and there's nothing on record. A call
   * files a report, names the player if a caller could put a name to their face, and sends a unit.
   */
  private crime(kind: Crime, victim: Person, now: number, knew: Set<string>, who: 'witnesses' | 'victim' | 'all', scene = { spot: this.spot, where: this.where }, heard?: { people: Person[]; share: number }, opts: { quiet?: boolean; only?: Set<string> } = {}): void {
    const police = this.rules.police;
    const { spot, where: at } = scene;
    if (!police) return;
    const { lines } = police;
    const p = this.policeState;
    const rng = createRng(`${this.world.seed}:crime:${p.nextId}:${kind}:${victim.id}:${now}`);
    const where = this.policingAt(at);
    const mask = this.masked();
    const seen = mask ? `a ${mask.word}` : 'your face';
    const named = (id: string) => !mask && knew.has(id);
    const witnesses = who === 'victim' ? [] : this.peopleHere(now).filter((x) => x.person.id !== victim.id && x.doing !== 'out cold' && (!opts.only || opts.only.has(x.person.id))).map((x) => x.person);
    const alive = victim.diedOn === undefined;
    const cold = alive && this.outCold(victim.id, now);
    const callers = who !== 'witnesses' && alive && !cold ? [victim, ...witnesses] : witnesses;
    const district = this.districtOf(at);
    if (!where) {
      if (!opts.quiet && (witnesses.length || callers.length)) this.say(this.policeLine(lines.zone, `zone:${spot?.id ?? 'street'}`, { district: district?.name ?? 'here' }), 'system');
      return;
    }
    const turf = new Set((this.rules.people.turf[where.district.id] ?? []).map(([g]) => g));
    // Out cold, they'll make up their mind when they come to (on the street, nobody's out cold for long).
    if (who !== 'witnesses' && cold && spot) {
      p.pending.push({ person: victim.id, crime: kind, at: now, named: named(victim.id), seen, odds: this.callOdds(victim, victim, where.call, turf, now), district: where.district.id, minutes: where.minutes, spot, x: at.x, y: at.y });
    }
    // A witness leaves it to someone else the more of them there are; the one it was done to doesn't.
    const crowd = Math.max(1, witnesses.length) ** police.caller.crowd;
    const alarm = police.crimes[kind].alarm;
    const called = callers.filter((c) => NCPD.test(c.job.role) || rng.chance(c.id === victim.id ? this.callOdds(c, victim, where.call, turf, now) : Math.min(1, (this.callOdds(c, victim, where.call, turf, now) * alarm) / crowd)));
    // Whoever only heard it, through the walls, calls less, and can't say whose face it was.
    const ears = heard ? heard.people.filter((c) => rng.chance(Math.min(1, (this.callOdds(c, victim, where.call, turf, now) * alarm * heard.share) / Math.max(1, heard.people.length) ** police.caller.crowd))) : [];
    if (!called.length && ears.length) {
      this.report(kind, ears[0]!, false, 'nothing', spot, at, where.district.id, where.minutes, now, rng, null);
      return;
    }
    if (!called.length) {
      if (!witnesses.length || opts.quiet) return;
      const local = witnesses.find((c) => c.gang && turf.has(c.gang));
      const gang = local?.gang ? this.rules.people.gangs[local.gang]?.name : undefined;
      this.say(gang ? this.policeLine(lines.turf, `turf:${spot?.id ?? 'street'}`, { gang }) : this.policeLine(lines.noCall, `quiet:${spot?.id ?? 'street'}`), 'system');
      return;
    }
    const caller = called[0]!;
    this.report(kind, caller, called.some((c) => named(c.id)), seen, spot, at, where.district.id, where.minutes, now, rng, NCPD.test(caller.job.role) ? lines.backup : lines.calls);
  }

  /** Puts a crime on record and sends a unit to where it happened (a building, a place, that corner of the street); told in `pool`'s words when the player is there to see the call made. */
  private report(kind: Crime, caller: Person, named: boolean, seen: string, spot: Spot | null, at: Point, district: string, minutes: [number, number], now: number, rng: Rng, pool: string[] | null): void {
    const police = this.rules.police!;
    const p = this.policeState;
    const id = p.nextId++;
    p.reports.push({ id, crime: kind, at: now, district, place: spot ? this.spotName(spot) : 'the street', named, seen });
    if (p.reports.length > police.keep) p.reports.splice(0, p.reports.length - police.keep);
    if (named) issueWarrant(p, kind, district, now, police, this.rules.timeScale);
    const arriveAt = now + (rng.range(minutes[0], minutes[1]) * police.urgency[kind] * 60_000) / this.rules.timeScale;
    const told = Boolean(pool);
    const d = p.dispatch;
    // A unit already on its way here comes for the worse of it, and no later.
    if (d && this.dispatchedTo(d, spot, at)) {
      if (police.crimes[kind].rank > police.crimes[d.crime].rank) d.crime = kind;
      d.arriveAt = Math.min(d.arriveAt, arriveAt);
      d.report = id;
      d.told ||= told;
    } else p.dispatch = { report: id, crime: kind, spot, x: at.x, y: at.y, arriveAt, officers: this.unitFor(district, now, rng), told };
    if (pool) {
      this.say(`${this.policeLine(pool, `call:${id}`, this.whoVars(caller))} ${this.policeLine(police.lines.dispatch, `unit:${id}`)}`, 'error');
    }
    this.events.emit('policeChanged', this.police(now));
  }

  /** Whether a unit is on its way to here: the same building or place, or, out on the street, the same corner of it. */
  private dispatchedTo(d: Dispatch, spot: Spot | null, at: Point): boolean {
    if (d.spot || spot) return Boolean(d.spot && spot && d.spot.kind === spot.kind && d.spot.id === spot.id);
    return Math.hypot(d.x - at.x, d.y - at.y) < 1;
  }

  /** A building's or a place's name. */
  private spotName(spot: Spot): string {
    return (spot.kind === 'building' ? buildingById(this.world, spot.id)?.name : this.world.locations[spot.id]?.name) ?? '';
  }

  /** A line about the NCPD, picked fresh for the moment. */
  private policeLine(pool: string[], salt: string, vars: Record<string, string> = {}): string {
    const rng = createRng(`${this.world.seed}:ncpd:${salt}:${this.policeState.nextId}:${this.policeState.reports.length}`);
    return pool.length ? finish(rng.pick(pool)!, vars) : '';
  }

  /** The NCPD on the clock: a hold served, warrants lapsing, someone come to who calls it in, a unit getting there, a patrol that knows the player's face. */
  private policeTick(now: number): void {
    const police = this.rules.police;
    if (!police) return;
    const p = this.policeState;
    const { lines, crimes } = police;
    let changed = false;
    if (p.held !== null && now >= p.held) {
      p.held = null;
      changed = true;
      this.say(this.policeLine(lines.released, 'released'), 'system');
    }
    for (const w of p.warrants.filter((w) => w.until !== null && w.until <= now)) {
      this.say(this.policeLine(lines.lapsed, `lapsed:${w.crime}`, { crime: crimes[w.crime].label }), 'system');
      changed = true;
    }
    p.warrants = warrantsAt(p, now);
    // Whoever was out cold when it happened, come to: they may call it in now.
    for (const call of [...p.pending]) {
      const person = this.person(call.person);
      if (person && person.diedOn === undefined && this.outCold(call.person, now)) continue;
      p.pending = p.pending.filter((c) => c !== call);
      changed = true;
      const rng = createRng(`${this.world.seed}:came-to:${call.person}:${call.at}`);
      if (!person || person.diedOn !== undefined || !rng.chance(call.odds)) continue;
      const spot = this.trip ? null : this.spot;
      const there = Boolean(spot && spot.kind === call.spot.kind && spot.id === call.spot.id);
      this.report(call.crime, person, call.named, call.seen, call.spot, call, call.district, call.minutes, now, rng, there ? lines.cameTo : null);
    }
    // The unit gets there: the player still there is found; gone, they've missed them. It waits on a fight to finish.
    const d = p.dispatch;
    if (d && now >= d.arriveAt && !this.fighting && !this.detained(now)) {
      p.dispatch = null;
      changed = true;
      if (!this.trip && this.dispatchedTo(d, this.spot, this.where)) this.confront(d.officers, d.crime, 'scene', now, lines.arrive);
      else if (d.told) this.say(this.policeLine(lines.missed, `missed:${d.report}`), 'system');
    } else if (!d || now < d.arriveAt) {
      // A patrol: out on the streets where the NCPD goes, wanted, and a face to know. A train goes by too fast; indoors is out of sight.
      const wanted = worstCrime(p.warrants.map((w) => w.crime), police);
      // Or anyone carrying, now and then, the more so with a dealer's weight on them or on the corner they deal from; a mask is no help there.
      const carried = this.searchFinds();
      const carrying = this.drugsCarried().length > 0;
      const every = (police.stop.minutes * 60_000) / this.rules.timeScale;
      if ((wanted || carrying) && !this.detained(now) && !this.fighting && !this.inside && this.trip?.mode !== 'ncart' && now - p.lastStop >= every) {
        p.lastStop = now;
        const where = this.policingAt(this.trip ? this.positionAt(now) : this.where);
        const rng = createRng(`${this.world.seed}:stop:${now}`);
        const search = police.search;
        const frisk = carrying ? search.stop * (carried.doses.dealing ? search.weighed : 1) * (this.atCorner() ? search.corner : 1) : 0;
        if (where && wanted && !this.masked() && rng.chance(police.stop.chance * where.call * (1 + police.stop.rank * (crimes[wanted].rank - 1)))) {
          if (this.trip) this.stop(now);
          this.confront(this.unitFor(where.district.id, now, rng), wanted, 'warrant', now, lines.stop);
          changed = true;
        } else if (where && carrying && rng.chance(Math.min(1, frisk * where.call))) {
          if (this.trip) this.stop(now);
          this.confront(this.unitFor(where.district.id, now, rng), 'possession', 'search', now, lines.frisk);
          changed = true;
        }
      }
    }
    if (changed) this.events.emit('policeChanged', this.police(now));
  }

  /** Officers on the player, weapons out: nothing else till it's settled (`answerPolice`). */
  private confront(officers: string[], crime: Crime, why: Confrontation['why'], now: number, pool: string[]): void {
    this.policeState.confront = { officers, crime, why, at: now };
    // A shift's moment passes; a card or the counter closes on its own.
    this.shiftEventState = null;
    this.events.emit('fx', { effect: 'shake' });
    this.say(this.policeLine(pool, `confront:${now}`), 'error');
  }

  /** What the officers who have the player want, as the panel says it, and what it'd cost to go quietly. */
  private facing(c: Confrontation, now: number): NonNullable<PoliceView['confront']> {
    const police = this.rules.police!;
    const charges = chargesFor([...(c.why === 'search' ? [] : [c.crime]), ...warrantsAt(this.policeState, now).map((w) => w.crime)], police, this.searchFinds().doses);
    const short = !this.canPay(charges.fine, true);
    const hold = charges.hold + (short ? police.shortHold : 0);
    const cops = this.copsHere(now).map((x) => x.person);
    const names = cops.map((o) => `Officer ${o.family}`);
    const officers = names.length === 2 ? `${names[0]} and ${names[1]}` : (names[0] ?? 'Two NCPD officers');
    const crime = charges.crimes.map((x) => police.crimes[x].label).join(' and ');
    const theirs = cops[0] ? this.armOf(cops[0]) : null;
    return {
      crime: c.crime,
      why: c.why,
      // At the scene, it's what happened here; on a warrant, everything they have the player for.
      text: finish(police.lines.facing[c.why], { officers, crime: c.why === 'scene' ? police.crimes[c.crime].label : crime }),
      choices: [
        { id: 'comply', label: 'Comply', sub: !charges.crimes.length ? 'Pockets out' : short ? `Short · ${hold} min held` : hold ? `${charges.fine} €$ · ${hold} min` : `${charges.fine} €$ fine` },
        { id: 'run', label: 'Run', sub: this.masked() ? 'Masked' : 'Face seen' },
        ...(theirs ? [{ id: 'fight' as const, label: 'Fight', sub: theirs.id === 'fists' ? 'Bare hands' : theirs.short }] : []),
      ],
    };
  }

  /**
   * What the player does with officers on them. Comply: the fine for everything they have on
   * the player, paid there and then (or held, short of it), and a hold for anything worse;
   * every warrant settled. Run: away, by the odds (less hurt, more in a mask), and a warrant if
   * they saw the face; caught, held longer for it. Fight: the nearest officer, while the other
   * calls in backup.
   */
  answerPolice(choice: PoliceChoice, now: number): boolean {
    const police = this.rules.police;
    const p = this.policeState;
    const c = p.confront;
    if (!police || !c || this.fighting) return false;
    const { lines } = police;
    if (choice === 'fight') {
      const officer = this.copsHere(now)[0]?.person;
      if (!officer) return false;
      this.say(this.policeLine(lines.fight, `fight:${c.at}`), 'error');
      // The other one sees it, and calls it in: that's the backup.
      if (!this.attack(officer.id, now)) return false;
      p.confront = null;
      // What they came for is on a warrant now, if they saw the face (a stop and search came for nothing in particular).
      if (!this.masked() && c.why !== 'search') issueWarrant(p, c.crime, this.districtOf(this.where)?.id ?? '', now, police, this.rules.timeScale);
      this.events.emit('policeChanged', this.police(now));
      return true;
    }
    if (choice === 'run') {
      const rng = createRng(`${this.world.seed}:run:${c.at}`);
      const health = this.health(now);
      const mask = this.masked();
      const odds = police.run.base - (health.current < health.max / 2 ? police.run.hurt : 0) + (mask ? police.run.masked : 0);
      if (!rng.chance(odds)) {
        this.say(this.policeLine(lines.caught, `caught:${c.at}`), 'error');
        this.arrest(c, now, police.run.resisting);
        return true;
      }
      p.confront = null;
      p.lastStop = now;
      this.say(this.policeLine(lines.ran, `ran:${c.at}`), 'system');
      // They saw the face: it's on a warrant now, if it wasn't.
      const district = this.districtOf(this.where)?.id ?? '';
      if (!mask && c.why !== 'search') issueWarrant(p, c.crime, district, now, police, this.rules.timeScale);
      this.leave();
      this.events.emit('policeChanged', this.police(now));
      return true;
    }
    this.arrest(c, now, 0);
    return true;
  }

  /**
   * What a search of the player's pockets turns up: the illegal drugs are possession, a dose at
   * a time, and a dealer's weight of any is dealing; what's charged is taken (a little of a
   * legal one is the player's own business).
   */
  private searchFinds(): { found: Item[]; doses: Partial<Record<Crime, number>>; text: string } {
    const police = this.rules.police;
    const drugs = this.rules.gear.drugs;
    const carried = this.items.filter((i) => i.kind === 'consumable' && drugs[i.id]);
    const count = (items: Item[]) => items.reduce((n, i) => n + i.count, 0);
    const total = count(carried);
    const weight = Boolean(police && total >= police.search.weight);
    const found = weight ? carried : carried.filter((i) => drugs[i.id]?.illegal);
    const byDrug = new Map<string, number>();
    for (const item of found) byDrug.set(item.id, (byDrug.get(item.id) ?? 0) + item.count);
    const text = [...byDrug].map(([id, n]) => `${n} ${n === 1 ? 'dose' : 'doses'} of ${drugs[id]?.name ?? id}`).join(' and ');
    return { found, doses: { possession: count(carried.filter((i) => drugs[i.id]?.illegal)), dealing: weight ? total : 0 }, text };
  }

  /** Taken in: the fine for everything on the player, paid if it can be; held for the worst of it (and `extra`, for running), or instead of a fine they can't pay. */
  private arrest(c: Confrontation, now: number, extra: number): void {
    const police = this.rules.police!;
    const p = this.policeState;
    const { lines } = police;
    // Pockets out: whatever drugs they find, they keep, and charge.
    const search = this.searchFinds();
    if (search.found.length) {
      for (const item of search.found) this.items.splice(this.items.indexOf(item), 1);
      const d = this.dealState.current;
      const owed = d ? (d.front ? d.front.owed - d.front.paid : 0) + d.debt : 0;
      const gang = d ? (this.rules.people.gangs[d.gang]?.name ?? d.gang) : '';
      this.say(this.policeLine(lines.seized, `seized:${c.at}`, { found: search.text }) + (owed > 0 ? ` The ${gang} will still want their ${owed} €$.` : ''), 'error');
      this.events.emit('inventoryChanged', this.inventory);
      if (d) this.events.emit('dealChanged', this.dealing(now));
    }
    const charges = chargesFor([...(c.why === 'search' ? [] : [c.crime]), ...warrantsAt(p, now).map((w) => w.crime)], police, search.doses);
    // Stopped and searched with nothing on them, and nothing on file: they're let go.
    if (!charges.crimes.length) {
      p.confront = null;
      p.lastStop = now;
      this.say(this.policeLine(lines.clean, `clean:${c.at}`), 'system');
      this.events.emit('policeChanged', this.police(now));
      return;
    }
    const short = !this.canPay(charges.fine, true);
    const minutes = charges.hold + extra + (short ? police.shortHold : 0);
    if (!short) this.pay(charges.fine, true);
    const vars = { crime: charges.crimes.map((x) => police.crimes[x].label).join(' and '), fine: String(charges.fine), minutes: String(minutes) };
    p.confront = null;
    p.warrants = [];
    p.dispatch = null;
    p.lastStop = now;
    if (minutes > 0) {
      // Out of wherever they were, into the back of a cruiser.
      this.leave();
      p.held = now + (minutes * 60_000) / this.rules.timeScale;
    }
    this.say(this.policeLine(short ? lines.short : minutes > 0 ? lines.held : lines.fined, `booked:${c.at}`, vars), minutes > 0 ? 'error' : 'system');
    if (!short) this.events.emit('walletChanged', this.wallet);
    this.events.emit('policeChanged', this.police(now));
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
    // In a cell, there's nobody; with officers on the player, they're here wherever that is.
    if (this.heldAt(now)) return [];
    const cops = [...this.copsHere(now), ...this.collectorHere(now)];
    const spot = this.spot;
    if (!spot) return cops;
    const clock = this.clockAt(now);
    // Whoever was knocked out lies where they fell till they come to, wherever their day would have them.
    const cold: string[] = [];
    const elsewhere = new Set<string>(cops.map((c) => c.person.id));
    const rooms = this.inside ? this.rules.rooms : undefined;
    for (const [id, o] of this.outColdState) {
      if (!this.outCold(id, now)) continue;
      if (o.spot.kind === spot.kind && o.spot.id === spot.id && (!rooms || o.room === this.roomState)) cold.push(id);
      else elsewhere.add(id);
    }
    // Inside, only whoever is in the same room: everyone else in the building is out of sight.
    const inside = this.inside;
    const present = peopleAt(this.population, this.world, spot, clock, this.rules.food.dishes, this.rules.people.out).filter(
      (p) => !elsewhere.has(p.person.id) && (!rooms || !inside || roomOf(p.person, inside, p.doing, clock, this.population, rooms) === this.roomState),
    );
    for (const id of cold) {
      const person = this.person(id);
      if (person && person.diedOn === undefined && !present.some((p) => p.person.id === id)) present.push({ person, doing: 'out cold' });
    }
    const scenes = scenesAt(present.map((p) => p.person).filter((p) => !cold.includes(p.id)), this.population, spot, clock, this.world, this.rules.people.turf, (gang) => this.rules.people.gangs[gang]?.rivals ?? [], this.rules.life, this.world.seed, (id) => heldBy(this.life, id, this.rules.life.held, clock.day));
    return [
      ...present.map(({ person, doing }) => ({
        person,
        doing: cold.includes(person.id) ? 'out cold' : doing,
        stance: this.stanceOf(person, now),
        scene: cold.includes(person.id) ? null : (scenes.get(person.id) ?? null),
      })),
      ...cops,
    ];
  }

  // ───────────── The heart ─────────────

  /** The player as people see them: the pronouns they go by, for saving. */
  get youSaved(): You {
    return { ...this.you };
  }

  /** The pronouns the player goes by, which decides who's drawn to them. */
  get pronouns(): Pronouns {
    return this.you.pronouns;
  }

  /** Changes the pronouns the player goes by (Settings). */
  setPronouns(pronouns: Pronouns): void {
    if (this.you.pronouns === pronouns) return;
    this.you = { ...this.you, pronouns };
    this.events.emit('youChanged', this.youSaved);
  }

  /** Someone's heart: whom they're drawn to, the way in that wins them over, the look they go for. */
  private heartOf(person: Person): Heart {
    return heartOf(person, this.world, this.rules.people, this.population);
  }

  /** Who someone is with, alive, other than the player: their spouse, or someone they're seeing. */
  private partnerOf(person: Person): { person: Person; kind: TieKind } | null {
    for (const tie of tiesOf(this.population, person.id)) {
      if (tie.kind !== 'spouse' && tie.kind !== 'partner') continue;
      const other = this.person(tie.to);
      if (other && other.diedOn === undefined) return { person: other, kind: tie.kind };
    }
    return null;
  }

  /** The look the player has on: the style most of what they wear is in. */
  private styleWorn(): Style | null {
    const { worn } = outfit(this.pockets, this.rules.gear);
    const counts = new Map<Style, number>();
    for (const pocket of Object.values(worn)) {
      const style = pocket ? this.rules.gear.kinds[pocket.kind]?.style : undefined;
      if (style) counts.set(style, (counts.get(style) ?? 0) + 1);
    }
    let best: Style | null = null;
    for (const [style, n] of counts) if (!best || n > (counts.get(best) ?? 0)) best = style;
    return best;
  }

  /**
   * Someone's heart as line variables, as it stands with the player: drawn to them (`drawn`,
   * never for anyone too young), spoken for (`taken`, the name, and `takenWord`), seeing the
   * player (`withYou`, `together`), sweet on them (`sweet`), the player's look their type
   * (`yourType`).
   */
  private heartVars(person: Person, standing: Standing): Record<string, string> {
    const rules = this.rules.society.romance;
    const heart = this.heartOf(person);
    const partner = this.partnerOf(person);
    const romance = this.society.romance;
    const mine = romance?.with === person.id;
    return {
      drawn: person.age >= rules.adultAt && drawnTo(heart, this.you.pronouns) ? 'yes' : '',
      taken: partner?.person.given ?? '',
      takenWord: partner ? kinWord(person, partner.kind, partner.person) : '',
      withYou: mine ? 'yes' : '',
      together: mine && romance?.stage === 'together' ? 'yes' : '',
      sweet: (standing.spark ?? 0) >= rules.sweetAt ? 'yes' : '',
      yourType: heart.style && this.styleWorn() === heart.style ? 'yes' : '',
    };
  }

  /** Who the player is seeing, if anyone: who, how far along, since when, how many dates, and the spark. */
  romance(now: number): { id: string; name: string; stage: RomanceStage; since: number; dates: number; spark: number } | null {
    const romance = this.society.romance;
    const person = romance ? this.person(romance.with) : undefined;
    if (!romance || !person) return null;
    const spark = Math.round(standingOf(this.society, person.id, this.rules.society, this.rules.timeScale, now).spark ?? 0);
    return { id: person.id, name: this.describe(person.id, now)?.name ?? person.name, stage: romance.stage, since: romance.since, dates: romance.dates, spark };
  }

  /**
   * What the heart command offers with someone: asking them out (someone here the player
   * knows by name, old enough, while the player is seeing no one); with the one the player
   * is seeing, a date and making it official (both here) and ending it (anywhere).
   */
  romanceWith(id: string, now: number): RomanceMove[] {
    const person = this.person(id);
    if (!person || person.diedOn !== undefined) return [];
    const romance = this.society.romance;
    const here = Boolean(this.isHere(id, now));
    if (romance?.with === id) return [...(here ? (['date'] as const) : []), ...(here && romance.stage === 'dating' ? (['official'] as const) : []), 'end'];
    if (romance || !here || person.age < this.rules.society.romance.adultAt || !knowledgeOf(this.society, id).facts.includes('name')) return [];
    return ['askOut'];
  }

  /**
   * Asks someone here out. A yes takes someone drawn to the player, free, warm or better, with
   * enough spark and rapport; a no says why (not drawn to the player, spoken for, not yet, or
   * not in a mask), and asking again within the talk cooldown is pressing.
   */
  askOut(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const rules = society.romance;
    const current = this.society.romance;
    if (current) {
      if (current.with !== id) this.say(`You're seeing ${this.person(current.with)?.given ?? 'someone'}.`, 'error');
      return false;
    }
    const standing = standingOf(this.society, id, society, timeScale, now);
    const before = this.snapshot(person, now);
    learnOf(this.society, id, 'met');
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${id}:askOut:${standing.talks}:${standing.asks}`);
    this.logged(id, 'you', line(lines.you.askOut, speaker, rng), now);
    const refused = { ...standing.refused };
    let rapport = 0;
    let spark = 0;
    let why = '';
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (this.pressing(standing, 'askOut', now)) {
      this.speech(person, line(lines.pressed, speaker, rng), now);
      rapport = -society.openness.press;
      why = lines.notes.pressed;
    } else {
      const masked = Boolean(this.masked());
      const yes = !masked && speaker.vars.drawn && !speaker.vars.taken && standing.spark !== undefined && standing.spark >= rules.ask.spark && standing.rapport >= rules.ask.rapport && rules.ask.stances.includes(stance);
      const pool = masked ? lines.romance.ask.masked : !speaker.vars.drawn ? lines.romance.ask.notDrawn : speaker.vars.taken ? lines.romance.ask.taken : yes ? lines.romance.ask.yes : lines.romance.ask.notYet;
      this.speech(person, compose(pool, speaker, lines, rng, { opener: false }), now);
      if (yes) {
        this.society.romance = freshRomance(id, now);
        spark = rules.ask.yes;
        this.say(`You're seeing ${person.given} now. Take ${pronounsOf(person).him} out of an evening: ♥ on ${pronounsOf(person).his} card, somewhere with a menu.`, 'system');
      } else if (!masked) {
        // A no to a mask is a no to the mask: asked again bare-faced, it isn't pressing.
        refused.askOut = now;
      }
    }
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport, spark }, society, timeScale, now);
    this.noteFeedback(person, before, now, why, speaker.vars);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /**
   * Takes the one the player is seeing out, here and now: an evening, somewhere with a menu,
   * the player paying for two of what they like if it's on it (else the cheapest drink). Once a
   * day; worth spark and rapport, and more when it's their favorite.
   */
  date(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    const romance = this.society.romance;
    if (!here || romance?.with !== id) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines, food } = this.rules;
    const rules = society.romance;
    const menu = this.menu();
    const clock = this.clockAt(now);
    const speaker = this.speakerFor(person, stance, doing, now);
    // Asked out by someone they're done with, they say so.
    if (this.theyEndIt(person, speaker, createRng(`${this.world.seed}:${id}:date:${romance.dates}:end`), now)) return true;
    if (!menu || menu.kind !== 'food' || !menu.items.length) {
      this.say(`Not here: take ${person.given} somewhere with a menu. A bar, a diner, a noodle place.`, 'error');
      return false;
    }
    if (!dateHour(clock.hour, rules)) {
      this.say(`A date's an evening thing: from ${rules.date.from}:00 till ${String(rules.date.to).padStart(2, '0')}:00.`, 'error');
      return false;
    }
    if (speaker.vars.atWork) {
      this.say(`${person.given} is working. Come back when ${pronounsOf(person).he} ${person.pronouns === 'they' ? "aren't" : "isn't"}.`, 'error');
      return false;
    }
    // One a night, by the clock: a night runs past midnight, so the small hours count as the evening before.
    const nightOf = (c: { hour: number; day: number }) => (c.hour < rules.date.to ? c.day - 1 : c.day);
    if (romance.lastDateAt && nightOf(this.clockAt(romance.lastDateAt)) === nightOf(clock)) {
      this.say(`You've been out with ${person.given} tonight already.`, 'error');
      return false;
    }
    const barred = this.barred(now);
    if (barred) {
      this.say(barred, 'error');
      return false;
    }
    // What they like, if it's on; else the cheapest drink; else the cheapest thing.
    const liked = menu.items.find((i) => i.id === person.likes.drink || i.id === person.likes.dish);
    const drinks = menu.items.filter((i) => i.kind === 'drink' || i.kind === 'alcohol').sort((a, b) => a.price - b.price);
    const order = liked ?? drinks[0] ?? [...menu.items].sort((a, b) => a.price - b.price)[0];
    if (!order) return false;
    const price = order.price * 2;
    const transfers = this.takesTransfers(menu);
    if (!this.canPay(price, transfers)) {
      this.say(this.shortBy(`Two ${order.name}`, price, transfers), 'error');
      return false;
    }
    const before = this.snapshot(person, now);
    this.pay(price, transfers);
    if (this.inside?.business && menu.venue.id === this.inside.id) tillOf(this.life.tills, this.inside.id).pending += price;
    const favorite = Boolean(liked);
    speaker.vars = { ...speaker.vars, item: order.name, favorite: favorite ? 'yes' : '' };
    const rng = createRng(`${this.world.seed}:${id}:date:${romance.dates}`);
    this.logged(id, 'you', line(lines.you.date, speaker, rng), now);
    this.speech(person, compose(lines.romance.date, speaker, lines, rng, { opener: false }), now);
    romance.dates += 1;
    romance.lastDateAt = now;
    changeStanding(this.society, id, { met: true, spark: rules.date.spark + (favorite ? rules.date.favorite : 0), rapport: rules.date.rapport, lastTalkAt: now }, society, timeScale, now);
    this.remember(id, { kind: 'date', at: now, what: menu.venue.name }, now);
    if (favorite) learnFact(this.society, id, food.dishes.find((d) => d.id === order.id)?.kind === 'food' ? 'likes' : 'drinks');
    this.noteFeedback(person, before, now, [lines.notes.date, favorite ? lines.notes.favorite : ''].filter(Boolean).join(' · '), speaker.vars);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /** Asks the one the player is seeing to make it official: a yes after enough dates and spark, from someone who feels warmly. */
  makeOfficial(id: string, now: number): boolean {
    const here = this.isHere(id, now);
    const romance = this.society.romance;
    if (!here || romance?.with !== id || romance.stage !== 'dating') return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const rules = society.romance;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${id}:official:${romance.dates}:${standing.asks}`);
    if (this.theyEndIt(person, speaker, rng, now)) return true;
    const before = this.snapshot(person, now);
    this.logged(id, 'you', line(lines.you.official, speaker, rng), now);
    const yes = romance.dates >= rules.official.dates && (standing.spark ?? 0) >= rules.official.spark && rules.ask.stances.includes(stance);
    this.speech(person, compose(yes ? lines.romance.official.yes : lines.romance.official.notYet, speaker, lines, rng, { opener: false }), now);
    if (yes) {
      romance.stage = 'together';
      changeStanding(this.society, id, { rapport: rules.official.rapport }, society, timeScale, now);
    }
    this.noteFeedback(person, before, now, yes ? lines.notes.official : '', speaker.vars);
    this.events.emit('societyChanged', { people: [id] });
    return true;
  }

  /** Ends it with the one the player is seeing: to their face if they're here, by message if not. It hurts them, and their people think less of the player. */
  endRomance(now: number): boolean {
    const romance = this.society.romance;
    const person = romance ? this.person(romance.with) : undefined;
    if (!romance || !person) return false;
    const { society, timeScale, lines } = this.rules;
    const rules = society.romance;
    const here = this.isHere(person.id, now);
    const before = this.snapshot(person, now);
    const speaker = this.speakerFor(person, here?.stance ?? this.stanceOf(person, now), here?.doing ?? '', now);
    const rng = createRng(`${this.world.seed}:${person.id}:end:${romance.since}`);
    this.society.romance = null;
    if (here) {
      this.logged(person.id, 'you', line(lines.you.endIt, speaker, rng), now);
      this.speech(person, compose(lines.romance.dumped, speaker, lines, rng, { opener: false }), now);
    } else {
      this.logged(person.id, 'you', `You message ${person.given}: it's over.`, now);
      this.say(`You message ${person.given}: it's over.`, 'system');
    }
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    changeStanding(this.society, person.id, { rapport: -rules.dumped.rapport, grudge: rules.dumped.grudge, spark: -(standing.spark ?? 0) }, society, timeScale, now);
    this.remember(person.id, { kind: 'dumped', at: now }, now);
    // Their people take their side.
    const touched = [person.id];
    for (const tie of tiesOf(this.population, person.id)) {
      if (!FAMILY.includes(tie.kind) && tie.kind !== 'friend') continue;
      changeStanding(this.society, tie.to, { rapport: -Math.round(rules.dumped.kin * (society.closeness[tie.kind] ?? 0)) }, society, timeScale, now);
      touched.push(tie.to);
    }
    this.noteFeedback(person, before, now, lines.notes.dumped, speaker.vars);
    this.events.emit('societyChanged', { people: touched });
    return true;
  }

  /** Whether the one the player is seeing ends it now: the spark gone, turned against the player, or the player caught flirting once too often this time round. Says so if they do. */
  private theyEndIt(person: Person, speaker: Speaker, rng: Rng, now: number): boolean {
    const { society, timeScale, lines } = this.rules;
    const rules = society.romance;
    const romance = this.society.romance;
    if (romance?.with !== person.id || speaker.mood === 'asleep') return false;
    const standing = standingOf(this.society, person.id, society, timeScale, now);
    const cheated = memoryOf(this.society, person.id, 'cheated', society.memory, timeScale, now);
    const caught = (romance.caught ?? 0) >= rules.cheats;
    const fizzled = (standing.spark ?? 0) < rules.endAt || speaker.stance === 'hostile';
    if (!caught && !fizzled) return false;
    const before = this.snapshot(person, now);
    const other = caught && cheated?.about ? this.person(cheated.about) : undefined;
    const vars = { ...speaker.vars, fizzled: caught ? '' : 'yes', caught: caught ? 'yes' : '', other: other?.given ?? '' };
    this.speech(person, compose(lines.romance.theyEnd, { ...speaker, vars }, lines, rng, { opener: false }), now);
    this.society.romance = null;
    // Done with the player, the spark's gone with it.
    changeStanding(this.society, person.id, { met: true, talks: standing.talks + 1, lastTalkAt: now, spark: -(standing.spark ?? 0) }, society, timeScale, now);
    this.say(`${person.given} ended it.`, 'system');
    this.noteFeedback(person, before, now, lines.notes.ended, vars);
    this.events.emit('societyChanged', { people: [person.id] });
    return true;
  }

  /** The one the player is seeing, here, seeing them flirt with someone else: it stings, and they remember. */
  private jealous(other: Person, now: number): void {
    const romance = this.society.romance;
    const partner = romance && romance.with !== other.id ? this.isHere(romance.with, now) : undefined;
    if (!partner || !romance) return;
    const { society, timeScale, lines } = this.rules;
    const rules = society.romance;
    const speaker = this.speakerFor(partner.person, partner.stance, partner.doing, now);
    // Asleep, they never saw it.
    if (speaker.mood === 'asleep') return;
    const before = this.snapshot(partner.person, now);
    speaker.vars = { ...speaker.vars, other: other.given };
    romance.caught = (romance.caught ?? 0) + 1;
    const rng = createRng(`${this.world.seed}:${partner.person.id}:jealous:${now}`);
    this.narrate(partner.person, line(lines.romance.jealous, speaker, rng), now, 'error');
    changeStanding(this.society, partner.person.id, { spark: -rules.jealous.spark, rapport: -rules.jealous.rapport, grudge: rules.jealous.grudge }, society, timeScale, now);
    this.remember(partner.person.id, { kind: 'cheated', at: now, about: other.id }, now);
    this.noteFeedback(partner.person, before, now, lines.notes.jealous, speaker.vars);
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
    // A day lived can hire, lay off or kill: who works where is worked out afresh.
    this.staffCache.clear();
    // Whoever the player is seeing is no one else's to fall for.
    const spokenFor = new Set(this.society.romance ? [this.society.romance.with] : []);
    const vice = this.rules.dealing ? (p: Person) => this.viceOf(p) : undefined;
    const lived = this.life.day;
    const happened = liveUntil(this.world, this.population, this.life, this.rules.life, this.baseEddies, today, this.world.seed, this.tierFn, turfFrom(this.rules.people.turf), this.rules.people, spokenFor, vice);
    // The market's headlines from the days just lived, the latest few.
    for (const news of (this.life.market?.news ?? []).filter((n) => n.day > lived).slice(-3)) this.say(`News: ${this.headline(news)}`, 'system');
    this.cornerWars(happened, now);
    this.crewDays(today, now);
    this.badBatches(today, now);
    this.businessDays();
    // Seeing someone who has died: word reaches the player, and it's over.
    const partner = this.society.romance ? this.person(this.society.romance.with) : undefined;
    if (partner?.diedOn !== undefined) {
      this.society.romance = null;
      learnFact(this.society, partner.id, 'dead');
      this.say(`Word reaches you: ${partner.given} is dead.`, 'error');
    }
    if (happened.length || partner?.diedOn !== undefined) this.events.emit('societyChanged', { people: partner ? [partner.id] : [] });
  }

  /** The tier a place runs at, for what an evening there costs, remembered per place; and the same as a function that stays the same one, for the economy to remember by. */
  private readonly tiers: Record<Spot['kind'], Map<string, Quality>> = { building: new Map(), location: new Map() };
  private readonly tierFn = (spot: Spot): Quality => this.tierOfSpot(spot);
  private tierOfSpot(spot: Spot): Quality {
    const known = this.tiers[spot.kind].get(spot.id);
    if (known) return known;
    const at = spot.kind === 'building' ? this.world.buildings.find((b) => b.id === spot.id) : this.world.locations[spot.id];
    const tier: Quality = !at ? 'everyday' : spot.kind === 'building' ? this.tierOf(at as Building) : (menuFor(this.world, at, this.rules.food)?.venue.quality ?? drawQuality(this.world, at));
    this.tiers[spot.kind].set(spot.id, tier);
    return tier;
  }

  /** A market headline, in words. */
  private headline(news: MarketNews): string {
    const { market } = this.rules.life.economy;
    const goods = market.goods[news.category] ?? news.category;
    const text = createRng(`${this.world.seed}:news:${news.day}:${news.district}:${news.category}:${news.kind}${news.building ? `:${news.building}` : ''}`).pick(market.lines[news.kind]);
    const place = news.building ? (buildingById(this.world, news.building)?.name ?? 'A shop') : '';
    return text
      .replace(/\{place\}/g, place)
      .replace(/\{Goods\}/g, goods.charAt(0).toUpperCase() + goods.slice(1))
      .replace(/\{goods\}/g, goods)
      .replace(/\{district\}/g, this.world.districts[news.district]?.name ?? news.district);
  }

  /**
   * The market where the player is: what's dearer or cheaper than usual in the district, by the
   * kind of store (at least a twentieth either way, the biggest first), and the city's latest
   * headlines, newest first.
   */
  market(now: number): MarketView {
    const economy = this.rules.life.economy;
    const district = this.districtOf(this.where);
    // Prices move only when a day is lived: the status line asks every tick.
    const key = `${district?.id ?? ''}|${this.life.day}|${this.clockAt(now).day}`;
    if (this.marketCache?.key === key) return this.marketCache.view;
    const by = new Map<BuildingCategory, { sum: number; n: number }>();
    for (const b of this.world.buildings) {
      if (!b.business || b.district !== district?.id || this.rules.food.fixed[b.business] || b.business === 'hospital' || this.life.closed?.[b.id]) continue;
      const level = by.get(b.category) ?? { sum: 0, n: 0 };
      level.sum += priceFactor(stockOf(this.life.tills[b.id]), this.trade(b).health, economy);
      level.n++;
      by.set(b.category, level);
    }
    const prices = [...by]
      .map(([category, { sum, n }]) => ({ goods: economy.market.goods[category] ?? category, change: Math.round((sum / n - 1) * 100) / 100 }))
      .filter((p) => Math.abs(p.change) >= 0.05)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 3);
    const today = this.clockAt(now).day;
    const news = [...(this.life.market?.news ?? [])].reverse().slice(0, 4).map((n) => ({ text: this.headline(n), ago: this.agoWord(today - n.day) }));
    const view = { district: district?.name ?? '', prices, news };
    this.marketCache = { key, view };
    return view;
  }
  private marketCache: { key: string; view: MarketView } | null = null;

  /** How a storefront is doing on its last week's books, and the line that says so inside. */
  trade(building: Building): { health: Health; line: string } {
    // The books change only when a day is lived: kept till then, since menus and the status ask often.
    const known = this.tradeCache.get(building.id);
    if (known && known.day === this.life.day) return known.trade;
    const trade = tradeAt(building, this.population, this.life.tills, this.tierOf(building), this.rules.life.economy);
    this.tradeCache.set(building.id, { day: this.life.day, trade });
    return trade;
  }
  private readonly tradeCache = new Map<string, { day: number; trade: { health: Health; line: string } }>();

  /** What a shift pays the player at a storefront: its rung by its tier, and more or less by how the place is doing. */
  private shiftPayAt(rung: Rung, building: Building, raise = 0): number {
    return Math.max(1, Math.round(shiftPay(rung, this.tierOf(building), this.rules.jobs) * this.rules.life.economy.pay[this.trade(building).health] * (1 + raise)));
  }

  /** How long ago something was, said the way people say it, from a number of days. */
  private agoWord(days: number): string {
    if (days < 1) return 'today';
    if (days < 2) return 'last night';
    if (days < 3) return 'two nights back';
    if (days < 7) return 'a few days back';
    if (days < 14) return 'last week';
    if (days < 28) return 'a few weeks back';
    if (days < 60) return 'last month';
    return 'months back';
  }

  /** What someone would bring up about what happened between people lately, as the variables their lines are filled by; nothing when there's no news. */
  private newsVars(person: Person, now: number): Record<string, string> {
    const news = newsFor(person, this.population, this.life, this.rules.life, this.clockAt(now).day);
    if (!news) return {};
    const { event, role, other, tie, won } = news;
    const ago = this.agoWord(this.clockAt(now).day - event.day);
    const pronouns = pronounsOf(other);
    const where = event.where ? (event.where.kind === 'building' ? this.world.buildings.find((b) => b.id === event.where?.id)?.name : this.world.locations[event.where.id]?.name) : undefined;
    // Someone who shares the speaker's given name goes by their whole name, or it sounds like the speaker means themselves.
    const called = (p: Person) => (p.given === person.given && p.id !== person.id ? p.name : p.given);
    return {
      news: 'yes',
      [`news${event.kind.charAt(0).toUpperCase()}${event.kind.slice(1)}`]: 'yes',
      // What the speaker was to it: `newsMine`, `newsKin`, `newsOurs` (their gang's doing) or `newsHeard`; `newsGang` is the gang's name.
      [{ me: 'newsMine', kin: 'newsKin', gang: 'newsOurs', heard: 'newsHeard' }[role]]: 'yes',
      newsWho: called(other),
      newsGang: event.gang ? (this.rules.people.gangs[event.gang]?.name ?? '') : '',
      newsWord: tie ? kinWord(person, tie.kind, other) : '',
      newsAgo: ago,
      newsTook: String(event.took),
      // Whether anything changed hands: a collector can find nothing on someone.
      newsPaid: event.took > 0 ? 'yes' : '',
      newsWhere: where ?? '',
      newsHe: pronouns.he,
      newsS: pronouns.s,
      newsHim: pronouns.him,
      newsHis: pronouns.his,
      newsWon: won ? 'yes' : '',
      newsHurt: event.kind === 'fight' && event.who[1] === other.id ? 'yes' : '',
      // The other one in it, for a relative's news or the district's; and, for a death, whether someone did it.
      newsWith: news.with ? called(news.with) : '',
      newsKilled: event.kind === 'death' && event.who[0] !== event.who[1] ? 'yes' : '',
    };
  }

  /** What someone remembers of the player, as the variables a line of theirs is filled by (`mem`, `mem<Kind>`, and what's in it). */
  private memoryVars(person: Person, memory: Memory, now: number): Record<string, string> {
    const about = memory.about ? this.person(memory.about) : undefined;
    const tie = about ? tiesOf(this.population, person.id).find((t) => t.to === about.id) : undefined;
    const days = memoryAge(memory.at, this.rules.society.memory, this.rules.timeScale, now);
    const ago = days < 0.5 ? 'earlier' : days < 1.5 ? 'yesterday' : days < 2.5 ? 'two days back' : days < 7 ? 'a few days back' : days < 14 ? 'last week' : days < 28 ? 'a few weeks back' : days < 60 ? 'last month' : 'months back';
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
      memAssault: memory.what === 'assault' ? 'yes' : '',
      memMurder: memory.what === 'murder' ? 'yes' : '',
      memTook: memory.amount ? String(memory.amount) : '',
      memItem: dish?.name ?? '',
      memFavorite: dish && (dish.id === person.likes.dish || dish.id === person.likes.drink) ? 'yes' : '',
      memTitle: memory.kind === 'promoted' || memory.kind === 'quit' ? (memory.what ?? '') : '',
      memPlace: memory.kind === 'date' || memory.kind === 'covered' || memory.kind === 'backed' ? (memory.what ?? '') : '',
      // A chat they remember, by the way it started.
      ...(memory.kind === 'chat' || memory.kind === 'rebuffed' ? { [`mem${(memory.what ?? 'chat').charAt(0).toUpperCase()}${(memory.what ?? 'chat').slice(1)}`]: 'yes' } : {}),
    };
  }

  /** Writes something down in someone's memory of the player. */
  private remember(id: string, memory: Omit<Memory, 'said' | 'times'>, now: number): void {
    remember(this.society, id, memory, this.rules.society.memory, this.rules.timeScale, now);
  }

  /** Where someone's memories of the player leave them, -1 to 1 (memory.ts's `regard`). */
  private regardOf(id: string, now: number): number {
    return regard(this.society, id, this.rules.society.memory, this.rules.timeScale, now);
  }

  /** How much readier (or less) someone is to answer, or do what's asked, for what they remember of the player. */
  private leaning(id: string, now: number): number {
    return this.regardOf(id, now) * (this.rules.society.openness.memory ?? 0);
  }

  /** Where the player stands with someone right now, for telling them after an exchange what it did. */
  private snapshot(person: Person, now: number): Snapshot {
    const s = standingOf(this.society, person.id, this.rules.society, this.rules.timeScale, now);
    return { rapport: s.rapport, grudge: s.grudge, spark: s.spark ?? 0, stance: this.stanceOf(person, now), level: this.charismaState.level, xp: this.charismaState.xp };
  }

  /** How many questions in a row this one makes, and how many of those are past the free ones. */
  private grilling(standing: Standing, now: number): { sitting: number; grilled: number } {
    const { grill } = this.rules.society.openness;
    const going = standing.lastAskAt !== undefined && now - standing.lastAskAt < (grill.minutes * 60_000) / this.rules.timeScale;
    const sitting = going ? (standing.sitting ?? 0) + 1 : 1;
    return { sitting, grilled: Math.max(0, sitting - grill.free) };
  }

  /**
   * A note on the record after an exchange, so the player can see how it went: why, if it
   * was something they liked or didn't ("Likes a laugh"), what it did to their rapport and
   * grudge, the charisma it earned (or the level), and their stance if it moved. Nothing
   * when nothing changed and there's nothing to say.
   */
  private noteFeedback(person: Person, before: Snapshot, now: number, why = '', vars: Record<string, string> = {}): void {
    const after = this.snapshot(person, now);
    const rapport = Math.round(after.rapport - before.rapport);
    const grudge = Math.round(after.grudge - before.grudge);
    const spark = Math.round(after.spark - before.spark);
    const rank: Record<Stance, number> = { hostile: 0, cold: 1, wary: 2, neutral: 3, warm: 4, friend: 5 };
    const parts: string[] = [];
    if (why) parts.push(finish(why, { ...pronounsOf(person), given: person.given, ...vars }));
    if (rapport) parts.push(`Rapport ${rapport > 0 ? '+' : '−'}${Math.abs(rapport)}`);
    if (grudge > 0) parts.push(`Grudge +${grudge}`);
    if (spark) parts.push(`♥ ${spark > 0 ? '+' : '−'}${Math.abs(spark)}`);
    if (after.level > before.level) parts.push(`Charisma Lv ${after.level}`);
    else if (after.xp > before.xp) parts.push(`Charisma +${after.xp - before.xp} XP`);
    if (after.stance !== before.stance) parts.push(`${STANCE_LABEL[before.stance]} → ${STANCE_LABEL[after.stance]}`);
    if (!parts.length) return;
    const worse = rapport < 0 || grudge > 0 || spark < 0 || rank[after.stance] < rank[before.stance];
    const better = !worse && (rapport > 0 || spark > 0 || rank[after.stance] > rank[before.stance]);
    this.logged(person.id, 'note', parts.join(' · '), now, better ? 'good' : worse ? 'bad' : 'even');
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
    if (k.facts.includes('dream')) facts.dream = this.rules.lines.dreams[dreamOf(person, this.world, people)];
    if (k.facts.includes('type')) facts.type = this.typeLine(person);
    const order: Fact[] = ['dead', 'job', 'age', 'home', 'likes', 'drinks', 'hates', 'type', 'dream', 'nature'];
    // Introduced, they go by their street name too, if they have one.
    const handle = handleOf(person, this.world, people);
    const name = handle ? `${person.given} "${handle}" ${person.name.slice(person.given.length + 1)}` : person.name;
    // Seeing the player: that first.
    const romance = this.society.romance?.with === id ? this.society.romance : null;
    const heart = romance ? `${romance.stage === 'together' ? 'Together with you' : 'Seeing you'} · ${romance.dates} ${romance.dates === 1 ? 'date' : 'dates'}` : '';
    const sex = `${capitalize(sexOf(person))}${person.pronouns === 'they' ? ' · goes by they' : ''}`;
    // How they strike the player: as a fighter, plain to see (their bearing, their colors); as a talker, once they've talked a few times.
    const skills = this.skillsFor(person);
    const reads = people.skills?.reads;
    const fight = reads ? readOf(Math.round((skills.brawler + skills.toughness + skills.arms) / 3), reads.fight) : '';
    const talks = standingOf(this.society, id, this.rules.society, this.rules.timeScale, now).talks;
    const talk = reads && talks >= reads.talks ? readOf(skills.charisma, reads.talk) : null;
    return { name: named ? name : describeStranger(person, people), named, facts, lines: [heart, ...order.map((f) => facts[f])].filter((line): line is string => Boolean(line)), sex, fight, talk };
  }

  /** Someone's type, as the card says it: whom they're drawn to, what wins them over, the look they like. */
  private typeLine(person: Person): string {
    const heart = this.heartOf(person);
    const who = drawnWord(heart.drawnTo);
    if (!who) return this.rules.lines.romance.notLooking;
    const style = heart.style ? this.rules.gear.styleLabels[heart.style] : '';
    return [`Into ${who}`, this.rules.lines.romance.wants[heart.wants], style ? `Likes ${style}` : ''].filter(Boolean).join(' · ');
  }

  /**
   * What someone remembers of the player, freshest first, as a profile lists it: a few words
   * a memory ("Gift: Ramen ×2 · last week", "Heard you robbed Ana · today"), at most `limit`.
   */
  between(id: string, now: number, limit = 4): string[] {
    const { society, timeScale, food } = this.rules;
    const nameOf = (other?: string) => (other ? this.describe(other, now)?.name : undefined) ?? 'someone';
    const did: Record<string, [string, string]> = { robbery: ['robbed', 'rob'], insult: ['insulted', 'insult'], assault: ['attacked', 'attack'], murder: ['killed', 'kill'] };
    return memoriesOf(this.society, id, society.memory, timeScale, now)
      .slice(0, limit)
      .map((m) => {
        const [past, base] = did[m.what ?? ''] ?? ['crossed', 'cross'];
        const eddies = m.amount ? ` ${m.amount} €$` : '';
        const said: Record<Memory['kind'], string> = {
          wronged: m.what === 'robbery' ? `Robbed by you${eddies ? ` of${eddies}` : ''}` : m.what === 'insult' ? 'Insulted by you' : m.what === 'assault' ? 'Attacked by you' : 'Wronged by you',
          heard: `Heard you ${past} ${nameOf(m.about)}`,
          saw: `Saw you ${base} ${nameOf(m.about)}`,
          settled: `Collected${eddies || ' what you owed'} off you`,
          gift: `Gift: ${food.dishes.find((d) => d.id === m.what)?.name ?? 'something'}`,
          goodWord: `A good word from ${nameOf(m.about)}`,
          hired: 'Took you on',
          promoted: `Moved you up${m.what ? ` to ${m.what}` : ''}`,
          quit: 'You walked out',
          notice: 'You gave notice',
          fired: 'Let you go',
          chopped: `Chopped a chip for you${eddies ? ` (${eddies.trim()})` : ''}`,
          date: `A date${m.what ? ` at ${m.what}` : ''}`,
          dumped: 'You ended it',
          cheated: `Caught you with ${nameOf(m.about)}`,
          chat: `Liked your ${WAY_WORDS[m.what ?? ''] ?? 'way'}`,
          rebuffed: `Didn't like your ${WAY_WORDS[m.what ?? ''] ?? 'way'}`,
          covered: `You covered a shift${m.what ? ` at ${m.what}` : ''}`,
          backed: `Fought at your side${m.what ? ` at ${m.what}` : ''}`,
        };
        return `${said[m.kind]}${m.times > 1 ? ` ×${m.times}` : ''} · ${this.agoWord(memoryAge(m.at, society.memory, timeScale, now))}`;
      });
  }

  /**
   * Everyone the player has met or knows by name, the latest dealt with first: for a list to
   * open anyone from, here or not. Their name or look, how they feel, what's known of their
   * work, whether they're dead, and when the player last had to do with them.
   */
  acquaintances(now: number): Array<{ person: Person; name: string; stance: Stance; job?: string; dead: boolean; last: number }> {
    const { society, timeScale } = this.rules;
    return knownPeople(this.society)
      .flatMap((id) => {
        const person = this.person(id);
        const k = knowledgeOf(this.society, id);
        if (!person || !(k.met || k.facts.includes('name'))) return [];
        const described = this.describe(id, now);
        const standing = standingOf(this.society, id, society, timeScale, now);
        // When they last had to do with the player: the last line between them, or a talk (0: only ever heard of).
        const last = Math.max(k.log.at(-1)?.at ?? 0, standing.lastTalkAt ?? 0);
        return [{ person, name: described?.name ?? person.name, stance: this.stanceOf(person, now), ...(described?.facts.job ? { job: described.facts.job } : {}), dead: person.diedOn !== undefined && k.facts.includes('dead'), last }];
      })
      .sort((a, b) => b.last - a.last || a.name.localeCompare(b.name));
  }

  /** What has passed between the player and a person, oldest first. */
  conversation(id: string): LogEntry[] {
    return knowledgeOf(this.society, id).log.map((entry) => ({ ...entry }));
  }

  /** Writes down a line of a conversation, on the record for that person. */
  private logged(id: string, who: LogEntry['who'], text: string, now: number, tone?: LogEntry['tone']): void {
    logLine(this.society, id, who, text, now, tone);
    // What the player says, they say to everyone: kept a while, so they don't put it the same way twice running.
    if (who === 'you') this.heard(text);
  }

  /** The player's own lines and the narration lately, which lines steer clear of (not saved). */
  private readonly saidLately: string[] = [];
  private heard(text: string): void {
    this.saidLately.push(text);
    if (this.saidLately.length > 16) this.saidLately.shift();
  }

  /** A line of narration from a pool, filled in, never what was just told while there's another. */
  private narration(pool: readonly string[], vars: Record<string, string>, rng: Rng): string {
    const filled = pool.map((text) => fill(text, vars));
    const fresh = filled.filter((text) => !saidIn(this.saidLately, text));
    const text = rng.pick(fresh.length ? fresh : filled.length ? filled : ['']);
    this.heard(text);
    return text;
  }

  /** How far the player's words go. */
  charisma(): SkillStatus {
    return skillStatus(this.charismaState, this.rules.charisma);
  }

  /** Charisma as levels past an ordinary person's (short of it, below nothing): what openness and the odds of a word landing go by. */
  private get charismaEdge(): number {
    // A high, withdrawal or the edge moves the player's way with words, a level at a time.
    return skillEdge(this.rules.charisma, Math.max(1, this.charismaState.level + this.habitNow(Date.now()).charisma));
  }

  get charismaSaved(): SkillState {
    return { ...this.charismaState };
  }

  /** Street Brawler: how the player's bare hands (and clubs, and Gorilla Arms) do. */
  brawler(): SkillStatus {
    return skillStatus(this.brawlerState, this.rules.combat.skills.brawler);
  }

  /** Toughness: how much it takes to knock the player out. */
  toughness(): SkillStatus {
    return skillStatus(this.toughnessState, this.rules.combat.skills.toughness);
  }

  /** Trading: how good a price the player gets. Level 1 without the rules for it. */
  trading(): SkillStatus {
    return skillStatus(this.tradingState, this.rules.trading ?? this.rules.charisma);
  }

  get tradingSaved(): SkillState {
    return { ...this.tradingState };
  }

  /** Dealing: knowing the trade, which decides what a gang fronts the player. Null without dealing's rules. */
  dealingSkill(): SkillStatus | null {
    return this.rules.dealing ? skillStatus(this.dealerState, this.rules.dealing.skill) : null;
  }

  /** Cutting: how clean the player's cuts are. Null without dealing's rules. */
  cuttingSkill(): SkillStatus | null {
    return this.rules.dealing ? skillStatus(this.cutterState, this.rules.dealing.cut.skill) : null;
  }

  get dealerSaved(): SkillState {
    return { ...this.dealerState };
  }

  get cutterSaved(): SkillState {
    return { ...this.cutterState };
  }

  /** Dealing experience: a sale, a package paid off, a rung, a runner's sale. A level that opens more of the gang's line says so. */
  private trainDealing(amount: number): void {
    const dealing = this.rules.dealing;
    if (!dealing || amount <= 0) return;
    const before = this.dealerState.level;
    const { state, levels } = gainXp(this.dealerState, amount, dealing.skill);
    this.dealerState = state;
    if (levels) {
      this.say(fill(dealing.skill.levelLine, { level: String(state.level), standing: this.standingLine(dealing.skill, state.level) }), 'system');
      const d = this.dealState.current;
      const gang = d ? dealing.gangs[d.gang] : undefined;
      const opened = gang ? gang.drugs.filter((drug) => drugLevel(gang, drug) > before && drugLevel(gang, drug) <= state.level) : [];
      for (const drug of opened) this.say(`The ${this.rules.people.gangs[d!.gang]?.name ?? d!.gang} will front you ${dealing.drugs[drug]?.name ?? drug} now. Ask your connect.`, 'system');
    }
    this.events.emit('skillChanged', { skill: 'dealing', status: this.dealingSkill()! });
  }

  /** Cutting experience: a dose cut. */
  private trainCutting(amount: number): void {
    const dealing = this.rules.dealing;
    if (!dealing || amount <= 0) return;
    const { state, levels } = gainXp(this.cutterState, amount, dealing.cut.skill);
    this.cutterState = state;
    if (levels) this.say(fill(dealing.cut.skill.levelLine, { level: String(state.level), standing: this.standingLine(dealing.cut.skill, state.level) }), 'system');
    this.events.emit('skillChanged', { skill: 'cutting', status: this.cuttingSkill()! });
  }

  /** Whether the player can cut a stack of a drug they carry (in the pocket it was tapped in) with a dose of agent: null if so, else why not. */
  canCut(id: string, from?: string): string | null {
    const dealing = this.rules.dealing;
    if (!dealing) return 'Nothing to cut with.';
    const stack = this.items.find((i) => i.kind === 'consumable' && i.id === id && (!from || i.in === from));
    if (!stack || !this.rules.gear.drugs[id]) return 'Nothing to cut.';
    if (this.fighting || this.detained(Date.now())) return 'Not now.';
    if (!this.items.some((i) => i.kind === 'component' && i.id === dealing.cut.agent)) return 'No cutting agent on you.';
    if ((stack.cut ?? 0) >= dealing.cut.most) return 'As cut as it gets.';
    if (!this.cutItems(stack)) return 'No room in there for another dose.';
    return null;
  }

  /** What the player would carry with a dose of agent out and a dose more in this stack, or null if its pocket has no room for it. */
  private cutItems(stack: Item): Item[] | null {
    const agentId = this.rules.dealing!.cut.agent;
    const items = this.items.map((i) => ({ ...i }));
    const agent = items.find((i) => i.kind === 'component' && i.id === agentId);
    if (!agent) return null;
    agent.count -= 1;
    const without = items.filter((i) => i.count > 0);
    if (placeFor(this.pockets, without, this.money, { id: stack.id, kind: 'consumable' }, 1, this.rules.gear, this.rules.food.dishes) !== stack.in) return null;
    const held = without.find((i) => i.kind === 'consumable' && i.id === stack.id && i.in === stack.in)!;
    held.cut = cutShare(held.count, held.cut ?? 0, 1);
    held.count += 1;
    return without;
  }

  /**
   * Cuts a stack of a drug with a dose of agent: a dose more in the stack, mixed all through
   * (its filler share up), as long as there's room for it there; Cutting experience.
   */
  cut(id: string, from?: string): boolean {
    const dealing = this.rules.dealing;
    if (!dealing || this.canCut(id, from)) return false;
    const rules = dealing.cut;
    const stack = this.items.find((i) => i.kind === 'consumable' && i.id === id && (!from || i.in === from))!;
    const name = this.rules.gear.drugs[id]?.name ?? id;
    const rng = createRng(`${this.world.seed}:cut:${id}:${stack.count}:${stack.cut ?? 0}`);
    const after = this.cutItems(stack)!;
    const share = after.find((i) => i.kind === 'consumable' && i.id === id && i.in === stack.in)!.cut ?? 0;
    this.items.splice(0, this.items.length, ...after);
    this.say(this.narration(share >= rules.most ? rules.lines.full : rules.lines.cut, { drug: name, share: String(Math.round(share * 100)) }, rng), 'system');
    this.trainCutting(rules.xp);
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /** Trading experience: every purchase, every sale. */
  private trainTrading(amount: number): void {
    const rules = this.rules.trading;
    if (!rules || amount <= 0) return;
    const { state, levels } = gainXp(this.tradingState, amount, rules);
    this.tradingState = state;
    if (levels) this.say(fill(rules.levelLine, { level: String(state.level), standing: this.standingLine(rules, state.level) }), 'system');
    this.events.emit('skillChanged', { skill: 'trading', status: this.trading() });
  }

  get brawlerSaved(): SkillState {
    return { ...this.brawlerState };
  }

  get toughnessSaved(): SkillState {
    return { ...this.toughnessState };
  }

  /** How well the player knows a kind of weapon (pistols, katanas, Mantis Blades…). */
  weaponType(cls: FightClass): SkillStatus {
    return skillStatus(this.armsState.types[cls] ?? freshSkill(), this.rules.combat.mastery.types);
  }

  /** How well the player knows one weapon, the model (a Lexington, the Gorilla Arms). */
  weaponModel(id: string): SkillStatus {
    return skillStatus(this.armsState.models[id] ?? freshSkill(), this.rules.combat.mastery.models);
  }

  /** What a kind of weapon is called: its class's label, or for chrome that fights, the implant's name. */
  private typeLabel(cls: FightClass): string {
    const { gear, combat } = this.rules;
    const label = (gear.arms.classes as Partial<Record<string, { label: string }>>)[cls]?.label;
    if (label) return label;
    const implant = Object.keys(combat.chrome).find((id) => combat.chrome[id]?.arm === cls);
    return (implant && gear.chrome.implants[implant]?.name) || cls;
  }

  /** The perks a weapon has brought the player so far, at its level. */
  private weaponPerks(arm: Arm): Perk[] {
    const { combat } = this.rules;
    const family = perkFamily(arm, combat);
    const level = this.weaponModel(arm.id).level;
    return family ? combat.mastery.perks[family].filter((p) => p.at <= level) : [];
  }

  /** A weapon as the player knows it: its kind's level and its own, the perks it's brought and the next one; null for fists or anything that isn't one. */
  masteryOf(id: string): WeaponMastery | null {
    const arm = this.armFor(id);
    const family = arm ? perkFamily(arm, this.rules.combat) : null;
    if (!arm || !family) return null;
    const model = this.weaponModel(id);
    const perks = this.rules.combat.mastery.perks[family];
    return { id, name: arm.short, cls: arm.cls, type: this.typeLabel(arm.cls), typeStatus: this.weaponType(arm.cls), status: model, perks: perks.filter((p) => p.at <= model.level), next: perks.find((p) => p.at > model.level) ?? null };
  }

  /** Every kind of weapon and every weapon the player has used, best known first. */
  mastery(): { types: Array<{ cls: FightClass; label: string; status: SkillStatus }>; models: WeaponMastery[] } {
    const best = (a: SkillState, b: SkillState) => b.level - a.level || b.xp - a.xp;
    const types = (Object.keys(this.armsState.types) as FightClass[]).map((cls) => ({ cls, label: this.typeLabel(cls), status: this.weaponType(cls) })).sort((a, b) => best(a.status, b.status));
    const models = Object.keys(this.armsState.models).flatMap((id) => this.masteryOf(id) ?? []).sort((a, b) => best(a.status, b.status));
    return { types, models };
  }

  get armsSaved(): Arms {
    return { types: { ...this.armsState.types }, models: { ...this.armsState.models } };
  }

  /** Where a level leaves the player, past (or short of) an ordinary person's. */
  private standingLine(rules: SkillRules, level: number): string {
    const past = level - rules.average;
    return [...this.rules.combat.mastery.standing].reverse().find((s) => past >= s.from)?.line ?? '';
  }

  /** Experience for the weapon the player fought with, and its kind: a line on each level, and on each perk it brings. */
  private trainArm(arm: Arm, amount: number): void {
    const { mastery } = this.rules.combat;
    if (amount <= 0 || !perkFamily(arm, this.rules.combat)) return;
    const type = gainXp(this.armsState.types[arm.cls] ?? freshSkill(), amount, mastery.types);
    const model = gainXp(this.armsState.models[arm.id] ?? freshSkill(), amount, mastery.models);
    this.armsState = { types: { ...this.armsState.types, [arm.cls]: type.state }, models: { ...this.armsState.models, [arm.id]: model.state } };
    if (type.levels) this.say(fill(mastery.types.levelLine, { type: this.typeLabel(arm.cls), level: String(type.state.level), standing: this.standingLine(mastery.types, type.state.level) }), 'system');
    if (model.levels) {
      const before = model.state.level - model.levels;
      const family = perkFamily(arm, this.rules.combat)!;
      const won = mastery.perks[family].filter((p) => p.at > before && p.at <= model.state.level);
      const line = fill(mastery.models.levelLine, { weapon: arm.short, level: String(model.state.level), standing: this.standingLine(mastery.models, model.state.level) });
      this.say([line, ...won.map((p) => `${p.name}: ${p.note}.`)].join(' '), 'system');
    }
    this.events.emit('skillChanged', { skill: 'weapon', status: this.weaponModel(arm.id) });
  }

  /** Experience for a fighting skill, and the line when it goes up a level. */
  private train(skill: 'brawler' | 'toughness', amount: number): void {
    if (amount <= 0) return;
    const rules = this.rules.combat.skills[skill];
    const { state, levels } = gainXp(skill === 'brawler' ? this.brawlerState : this.toughnessState, amount, rules);
    if (skill === 'brawler') this.brawlerState = state;
    else this.toughnessState = state;
    if (levels) this.say(fill(rules.levelLine, { level: String(state.level), standing: this.standingLine(rules, state.level) }), 'system');
    this.events.emit('skillChanged', { skill, status: skill === 'brawler' ? this.brawler() : this.toughness() });
  }

  /**
   * What a beat trains: Street Brawler, every blow the player lands bare-handed or with
   * Gorilla Arms (a club less), a knockout more; Toughness, every blow they take, more for one
   * that could have knocked them out; the weapon they fought with and its kind, every go with
   * it, a hit more, and the blow that ends it (`downed`) most.
   */
  private trainFrom(events: BeatEvent[], arm: Arm, downed: boolean): void {
    const { training, mastery } = this.rules.combat;
    const { brawler, toughness } = training;
    let brawl = 0;
    let tough = 0;
    let used = 0;
    for (const e of events) {
      if (e.what === 'hit' && e.who === 'you') {
        brawl += e.kind === 'fists' || arm.cls === 'gorilla-arms' ? brawler.hit : e.kind === 'blunt' ? brawler.blunt : 0;
        used += mastery.training.hit;
      } else if (e.what === 'miss' && e.who === 'you') used += mastery.training.swing;
      else if (e.what === 'hit' && e.who === 'them') tough += toughness.hit + (e.kind === 'fists' || e.kind === 'blunt' ? toughness.blow : 0);
      else if (e.what === 'out' && e.who === 'them') {
        brawl += brawler.knockout;
        downed = true;
      }
    }
    this.train('brawler', brawl);
    this.train('toughness', tough);
    this.trainArm(arm, used + (downed ? mastery.training.down : 0));
  }

  /** How hard someone is to knock out: the brave less likely, a ganger less again. */
  private steadyOf(person: Person): number {
    const { steady } = this.rules.combat;
    return (steady.base - person.traits.courage * steady.courage) * (person.gang ? steady.gang : 1);
  }

  /** Whether someone is lying out cold, knocked out, and not come to yet. */
  outCold(id: string, now: number): boolean {
    const out = this.outColdState.get(id);
    if (out && out.until <= now) this.outColdState.delete(id);
    return Boolean(out && out.until > now);
  }

  private gainCharisma(amount: number): void {
    const { state, levels } = gainXp(this.charismaState, amount, this.rules.charisma);
    this.charismaState = state;
    if (levels) this.say(fill(this.rules.charisma.levelLine, { level: String(state.level), standing: this.standingLine(this.rules.charisma, state.level) }), 'system');
    this.events.emit('charismaChanged', this.charisma());
  }

  /** A chain by its sign: what its outlets' names share ("Buck-A-Slice Japantown", "Buck-A-Slice Kabuki"), or its one outlet's name. */
  private chainName(business: string): string {
    const names = this.world.buildings.filter((b) => b.business === business).map((b) => b.name.split(' '));
    const [first, ...rest] = names;
    if (!first) return business;
    let words = first.length;
    for (const name of rest) {
      let same = 0;
      while (same < Math.min(words, name.length) && name[same] === first[same]) same++;
      words = same;
    }
    return first.slice(0, Math.max(1, words)).join(' ');
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
      else if (kind === 'chain') label = `${this.rules.food.fixed[id] ? 'every ' : ''}${this.chainName(id)}`;
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
    if (this.outCold(id, now)) return undefined;
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
      // A gang's own slang over the gang voice's.
      ...(person.gang && voice === 'gang' ? (lines.gangLexicon[person.gang] ?? {}) : {}),
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
      ...this.momentVars(person, now),
      ...this.heartVars(person, standing),
      ...this.grudgeVars(person, now),
    };
    // What they said to the player lately, and what the player's been saying, which their lines steer clear of.
    const recent = [...knowledgeOf(this.society, person.id).log.filter((e) => e.who !== 'note').slice(-8).map((e) => e.text), ...this.saidLately];
    return { person, voice, mood: moodOf(doing), stance, history: historyOf(standing, timeScale, now), eloquence: eloquenceOf(this.charismaState.level), vars, recent };
  }

  /**
   * The moment, as line variables: the player drunk (`youDrunk`), the speaker grieving a
   * relative who died lately (`grief`, their name, and `griefWord`, what they were), and
   * someone from the gang the speaker hates right here (`enemyHere`, the gang's name).
   */
  private momentVars(person: Person, now: number): Record<string, string> {
    const stage = this.inebriation(now).stage?.id;
    const today = this.clockAt(now).day;
    const lost = tiesOf(this.population, person.id)
      .filter((t) => FAMILY.includes(t.kind))
      .map((t) => ({ t, p: this.person(t.to) }))
      .find(({ p }) => p?.diedOn !== undefined && today - p.diedOn <= this.rules.life.griefDays);
    const enemy = person.hates && this.spot ? this.peopleHere(now).some((p) => p.person.gang === person.hates && p.person.id !== person.id) : false;
    return {
      youDrunk: stage && stage !== 'tipsy' ? 'yes' : '',
      grief: lost?.p?.given ?? '',
      griefWord: lost?.p ? kinWord(person, lost.t.kind, lost.p) : '',
      enemyHere: enemy && person.hates ? (this.rules.people.gangs[person.hates]?.name ?? '') : '',
    };
  }

  /** The grudge on someone's mind, of what they hold against others from their own days: the worst, then the freshest, against someone still breathing. */
  private grudgeOf(person: Person, now: number): Held | null {
    const order: Held['kind'][] = ['killed', 'dumped', 'robbed', 'beaten', 'shook', 'fallout', 'laidOff'];
    const held = heldBy(this.life, person.id, this.rules.life.held, this.clockAt(now).day).filter((h) => this.person(h.by)?.diedOn === undefined);
    return held.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.day - a.day)[0] ?? null;
  }

  /**
   * What someone holds against someone else, as line variables: the one (`grudgeWho`, named in
   * full when they share the speaker's given name), what they did (`grudgeRobbed`, `grudgeShook`,
   * `grudgeBeaten`, `grudgeDumped`, `grudgeFallout`, `grudgeLaidOff`, `grudgeKilled`), when
   * (`grudgeAgo`), and for a killing, whose (`grudgeKin`, `grudgeWord`).
   */
  private grudgeVars(person: Person, now: number): Record<string, string> {
    const grudge = this.grudgeOf(person, now);
    const by = grudge ? this.person(grudge.by) : undefined;
    if (!grudge || !by) return {};
    const about = grudge.about ? this.person(grudge.about) : undefined;
    const tie = about ? tiesOf(this.population, person.id).find((t) => t.to === about.id) : undefined;
    const days = this.clockAt(now).day - grudge.day;
    return {
      grudgeWho: by.given === person.given ? by.name : by.given,
      [`grudge${grudge.kind.charAt(0).toUpperCase()}${grudge.kind.slice(1)}`]: 'yes',
      grudgeAgo: days < 1 ? 'earlier today' : days < 2 ? 'yesterday' : days < 7 ? 'a few days back' : days < 14 ? 'last week' : days < 28 ? 'a few weeks back' : days < 60 ? 'last month' : 'months back',
      grudgeKin: about?.given ?? '',
      grudgeWord: about && tie ? kinWord(person, tie.kind, about) : '',
    };
  }

  /**
   * How someone is fixed, as line variables: `broke` (what they have in all won't see out the
   * week's food and rent), `flush` (it would see out months of them), `behind` on the rent;
   * whose their home is (`landlordName`, a person's; `corpRent`, a corp's; `squat`, nobody's) and
   * what they own (`landlord` of a block or more, `ownsPlace` the walls of the storefront they
   * run); how the place they work is doing (`slow`, `brisk`) and whether it paid them short
   * (`shortPaid`). Hard times: what they owe a gang (`inDebt`, `debtGang`, `debtLate` when they've
   * paid nothing back in too long), put out of their home lately (`evicted`, `evictedFrom`, by
   * `evictedBy`, and `rough` with nowhere since), the storefront they worked lately gone under
   * (`closedPlace`, `closedRan` if they ran it), and things walking out of their shop (`lifted`).
   */
  private meansVars(person: Person): Record<string, string> {
    const economy = this.rules.life.economy;
    const ledger = ledgerOf(person, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
    const money = person.eddies + accountOf(person, this.life, ledger, economy);
    const work = person.job.building ? buildingById(this.world, person.job.building) : undefined;
    const health = work?.business ? this.trade(work).health : 'steady';
    const owners = ownersOf(this.world, this.population, economy, this.world.seed);
    const holds = owners.holdings.get(person.id) ?? [];
    const landlord = ledger.landlord ? this.person(ledger.landlord) : undefined;
    const home = person.home ? buildingById(this.world, person.home) : undefined;
    const boss = work?.business ? bossOf(work, this.population, this.livingStaff(work.id)) : null;
    // What's short where they live: what they'd shop for first.
    const short = ['food', 'commodity', 'medical', 'nightlife', 'clothing'].map((c) => `${person.district}:${c}`).find((key) => this.life.market?.short.includes(key));
    // Hard times, as fresh as a month and a half.
    const today = this.life.day;
    const debt = this.life.debts?.[person.id];
    const moved = this.life.homes?.[person.id];
    const evicted = moved?.why === 'evicted' && today - moved.day <= 45 ? moved : undefined;
    const putOutBy = evicted?.from ? ownerNow(owners.of.get(evicted.from), (id) => this.person(id), (id) => tiesOf(this.population, id)) : null;
    const by = putOutBy && putOutBy !== person.id ? this.person(putOutBy) : undefined;
    const was = this.life.jobs[person.id];
    const closedAt = was?.was && !person.job.building && today - was.day <= 45 ? buildingById(this.world, was.was) : undefined;
    const name = (p: Person) => (p.given === person.given ? p.name : p.given);
    return {
      broke: money < ledger.essentials ? 'yes' : '',
      flush: money > ledger.essentials * 10 ? 'yes' : '',
      behind: (this.life.arrears?.[person.id] ?? 0) > 0 ? 'yes' : '',
      landlordName: landlord && landlord !== person && landlord.diedOn === undefined ? (landlord.given === person.given ? landlord.name : landlord.given) : '',
      corpRent: ledger.landlord === null && ledger.rent > 0 ? 'yes' : '',
      squat: home?.kind === 'shack' || home?.kind === 'derelict' ? 'yes' : '',
      landlord: holds.some((id) => buildingById(this.world, id)?.category === 'residential') ? 'yes' : '',
      ownsPlace: work && boss === person && holds.includes(work.id) ? 'yes' : '',
      shortPaid: work?.business && boss !== person && (this.life.tills[work.id]?.short ?? 0) > 0 ? 'yes' : '',
      shortGoods: short ? (economy.market.goods[short.split(':')[1] as BuildingCategory] ?? '') : '',
      lowStock: work?.business && stockOf(this.life.tills[work.id]) < economy.prices.low ? 'yes' : '',
      slow: health === 'struggling' ? 'yes' : '',
      brisk: health === 'thriving' ? 'yes' : '',
      inDebt: debt ? 'yes' : '',
      debtGang: debt ? (this.rules.people.gangs[debt.gang]?.name ?? '') : '',
      debtLate: debt && today - debt.paid >= (this.rules.life.hard?.collect.late ?? Infinity) ? 'yes' : '',
      evicted: evicted ? 'yes' : '',
      evictedFrom: evicted?.from ? (buildingById(this.world, evicted.from)?.name ?? '') : '',
      evictedBy: by && by.diedOn === undefined ? name(by) : '',
      rough: evicted && !person.home ? 'yes' : '',
      closedPlace: closedAt?.name ?? '',
      closedRan: closedAt && was?.ran ? 'yes' : '',
      lifted: work?.business && (this.life.tills[work.id]?.lifted ?? 0) > 0 ? 'yes' : '',
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
  talk(id: string, now: number, approach: Approach = 'chat'): boolean {
    const here = this.isHere(id, now);
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const before = this.snapshot(person, now);
    learnOf(this.society, id, 'met');
    const rng = createRng(`${this.world.seed}:${id}:talk:${standing.talks}:${standing.asks}${approach === 'chat' ? '' : `:${approach}`}`);
    // A line about family names one relative: one the player hasn't heard of yet, if there is one.
    const family = tiesOf(this.population, id).filter((t) => FAMILY.includes(t.kind));
    const untold = family.filter((t) => !linkOf(this.society, id, t.to)?.kind);
    const kin = untold.length ? rng.pick(untold) : family.length ? rng.pick(family) : undefined;
    const speaker = this.speakerFor(person, stance, doing, now, kin);
    const news = newsFor(person, this.population, this.life, this.rules.life, this.clockAt(now).day);
    speaker.vars = { ...speaker.vars, ...this.newsVars(person, now) };
    const how = approach === 'chat' ? null : lines.approaches[approach];
    this.logged(id, 'you', line(how ? how.you : lines.you.talk, speaker, rng), now);
    // Seeing the player, and done with it (turned against them, too).
    if (this.theyEndIt(person, speaker, rng, now)) return true;
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
    // Talking is an introduction: the first time, they say who they are.
    const intro = saidBy(this.society, id, 'name') ? '' : line(lines.introduce, speaker, rng);
    this.speech(person, [line(lines.greeting, speaker, rng), intro].filter(Boolean).join(' '), now);
    if (intro) heardFrom(this.society, id, 'name');
    let topic: Topic | null = null;
    const learned = [id];
    // What they remember of the player, they may bring up; a grievance is all they'll say.
    const memory = recall(this.society, id, society.memory, timeScale, now);
    let aired = false;
    if (memory && rng.chance(society.memory.recall)) {
      // An aside, if any, comes at the end of all they say, not in the middle of it.
      const said = compose(lines.memory, { ...speaker, vars: { ...speaker.vars, ...this.memoryVars(person, memory, now) } }, lines, rng, { opener: false, tail: false });
      if (said) {
        this.speech(person, said, now);
        recalled(this.society, id, memory);
        aired = GRIEVANCES.has(memory.kind);
        if (memory.about && learnOf(this.society, memory.about, 'told')) learned.push(memory.about);
      }
    }
    // How they take the way the player came at them: a joke to someone who likes a laugh, a compliment to someone who sees through it.
    const reaction = reactionTo(society.reactions.approach[approach], speaker);
    if (how && !aired) {
      const pool = reaction.score > 0 ? how.liked : reaction.score < 0 ? how.disliked : how.flat;
      this.speech(person, compose(pool, speaker, lines, rng, { opener: false, tail: false }), now);
    }
    if (aired || (how && reaction.score < 0)) {
      // Said their piece, or put off: nothing more out of them this time.
    } else if (standing.grudge >= 10 && rng.chance(0.6)) {
      this.speech(person, line(lines.grudge, speaker, rng), now);
    } else {
      // They bring up what they're open about with this player: the neighborhood and their lot for a stranger, their life and their people for a friend; asked for the word, the news; asked how they are, their lot.
      const topics = openTopics(speaker, this.charismaEdge, society.openness, rng, standing.rapport >= society.talk.revealAt);
      const prefer: Topic[] = approach === 'gossip' ? ['news', 'rumor', 'here', 'district'] : approach === 'care' ? ['life', 'kin'] : [];
      const chat = smallTalk(speaker, topics, lines, rng, prefer);
      // Come at a way they took, and with nothing more to say, they leave it at their answer to it.
      if (chat.topic || !how) this.speech(person, chat.said, now);
      topic = chat.topic;
    }
    // What they talk about, the player now knows, from them; a few chats, and the player has their measure.
    if (topic === 'job') heardFrom(this.society, id, 'job');
    if (topic === 'likes') {
      heardFrom(this.society, id, 'likes');
      heardFrom(this.society, id, 'drinks');
    }
    if (topic === 'hates') heardFrom(this.society, id, 'hates');
    if (topic === 'dream') heardFrom(this.society, id, 'dream');
    // Told of a grudge, the player has a name for whoever it's against.
    const grudge = topic === 'life' ? this.grudgeOf(person, now) : null;
    const against = grudge ? this.person(grudge.by) : undefined;
    if (against && knowledgeOf(this.society, id).log.at(-1)?.text.includes(speaker.vars.grudgeWho ?? '\u0000') && learnOf(this.society, against.id, 'told')) learned.push(against.id);
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
    // A chat is worth a little, by their warmth (less with the cold), and more or less by how they took the way it started; put off, it's worth nothing but the offense.
    const base = Math.round(society.talk.base * (0.6 + person.traits.warmth * 0.8) * (stance === 'cold' ? 0.4 : 1) * this.charisma().bonus);
    const gain = (how && reaction.score < 0 ? 0 : base) + Math.round(reaction.score * society.reactions.rapport);
    // A flirt that lands with someone drawn to the player, and free, sparks something (one that doesn't, puts it out a little); so does the way in they fall for.
    const free = !speaker.vars.taken || speaker.vars.withYou;
    const drawn = Boolean(speaker.vars.drawn) && free && !aired;
    const romance = society.romance;
    const spark = !drawn ? 0 : approach === 'flirt' ? (reaction.score > 0 ? reaction.score * romance.flirt : -romance.miss) : approach === this.heartOf(person).wants && reaction.score > 0 ? romance.wants : 0;
    changeStanding(this.society, id, { met: true, rapport: gain, spark, talks: standing.talks + 1, lastTalkAt: now }, society, timeScale, now);
    // A way in they liked, or didn't, they remember (a plain chat, they don't).
    if (approach !== 'chat' && reaction.score) this.remember(id, { kind: reaction.score > 0 ? 'chat' : 'rebuffed', at: now, what: approach }, now);
    // Flirting in front of the one the player is seeing.
    if (approach === 'flirt') this.jealous(person, now);
    // Getting on with someone counts for a little with their people.
    if (person.gang) changeRep(this.society, `gang:${person.gang}`, 1, society, timeScale, now);
    changeRep(this.society, `district:${person.district}`, 0.5, society, timeScale, now);
    // Practice: a little more for what landed, a little less for what didn't.
    this.gainCharisma(2 + Math.sign(reaction.score));
    this.noteFeedback(person, before, now, reaction.why);
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
    const before = this.snapshot(person, now);
    learnOf(this.society, id, 'met');
    const { sitting, grilled } = this.grilling(standing, now);
    const speaker = this.speakerFor(person, stance, doing, now);
    // How they take being asked this, here and now: touchy about it, or glad to be asked.
    const reaction = reactionTo(society.reactions.asked[fact], speaker);
    speaker.vars = { ...speaker.vars, grilled: grilled ? 'yes' : '', touchy: reaction.score < 0 ? 'yes' : '', keen: reaction.score > 0 ? 'yes' : '' };
    const rng = createRng(`${this.world.seed}:${id}:fact:${fact}:${standing.asks}`);
    this.logged(id, 'you', `"${line(lines.questions[fact].lines, speaker, rng)}"`, now);
    const refused = { ...standing.refused };
    let pressed = false;
    let news = false;
    let heard = true;
    let answered = false;
    let repeated = false;
    if (speaker.mood === 'asleep' || stance === 'hostile') {
      heard = false;
      this.narrate(person, line(stance === 'hostile' ? lines.hostile : lines.asleep, speaker, rng), now);
    } else if (saidBy(this.society, id, fact)) {
      // Told the player already; asked again, they say so (and it's no compliment to be asked twice).
      repeated = true;
      this.speech(person, repeat(speaker, fact, lines, rng), now);
    } else if (this.pressing(standing, fact, now)) {
      pressed = true;
      this.speech(person, line(lines.pressed, speaker, rng), now);
    } else {
      const score = openness(fact, stance, this.charismaEdge, person.traits, society.openness, Boolean(this.masked()), momentOf(speaker, grilled)) + reaction.score * society.reactions.openness + this.leaning(person.id, now);
      const reply = replyTo(score, society.openness, rng);
      if (reply === 'answer') {
        answered = true;
        // Answering at all is an introduction: if they haven't said who they are, they do now.
        const intro = fact === 'name' || saidBy(this.society, id, 'name') ? '' : line(lines.introduce, speaker, rng);
        this.speech(person, [answer(speaker, fact, lines, rng), intro].filter(Boolean).join(' '), now);
        news = heardFrom(this.society, id, fact);
        // Asked what they like, they say what they eat and what they drink.
        if (fact === 'likes') heardFrom(this.society, id, 'drinks');
        if (intro) heardFrom(this.society, id, 'name');
      } else {
        this.speech(person, reply === 'deflect' ? deflect(speaker, fact, lines, rng) : line(lines.refuse, speaker, rng), now);
        refused[fact] = now;
      }
    }
    // Pressing after a no costs; so does a question they're touchy about, and one too many in a row; one they're glad of is worth a little,
    // but only if they answer it (and not asked twice): glad of a question they then won't answer, they weren't.
    const took = reaction.score < 0 || (answered && !repeated) ? reaction : { score: 0, why: '' };
    const rapport = heard ? (pressed ? -society.openness.press : 0) + Math.round(took.score * society.reactions.rapport) - grilled * society.openness.grill.rapport : 0;
    changeStanding(this.society, id, { met: true, asks: standing.asks + 1, refused, rapport, ...(heard ? { lastAskAt: now, sitting } : {}) }, society, timeScale, now);
    if (news) this.gainCharisma(2);
    this.noteFeedback(person, before, now, !heard ? '' : [pressed ? lines.notes.pressed : '', grilled ? lines.notes.grilled : '', took.why].filter(Boolean).join(' · '), speaker.vars);
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
    const hadIt = memoriesOf(this.society, id, society.memory, timeScale, now).some((m) => m.kind === 'gift' && m.what === dish.id);
    speaker.vars = { ...speaker.vars, item: dish.name, again: hadIt ? 'yes' : '' };
    const rng = createRng(`${this.world.seed}:${id}:gift:${now}`);
    if (speaker.mood === 'asleep') {
      this.narrate(person, line(lines.asleep, speaker, rng), now);
      return false;
    }
    if (stance === 'hostile') {
      this.logged(id, 'you', line(lines.you.gift, speaker, rng), now);
      this.narrate(person, line(lines.gift.refuse, speaker, rng), now);
      this.events.emit('societyChanged', { people: [id] });
      return false;
    }
    const before = this.snapshot(person, now);
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
    // Their favorite, from someone they're drawn to: a spark too.
    const sparked = favorite && speaker.vars.drawn && (!speaker.vars.taken || speaker.vars.withYou) ? society.romance.gift : 0;
    changeStanding(this.society, id, { met: true, rapport: gain, spark: sparked, gifts: standing.gifts + 1, lastGiftAt: now }, society, timeScale, now);
    this.remember(id, { kind: 'gift', at: now, what: dish.id }, now);
    // They tell their people: a good word goes round.
    const heard = passGoodWord(this.society, this.population, person, gain, society, timeScale, now);
    this.gainCharisma(3);
    this.noteFeedback(person, before, now, favorite ? lines.notes.favorite : recent ? lines.notes.twice : '', speaker.vars);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('societyChanged', { people: [id, ...heard] });
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
    // Asleep, it's lost on them.
    if (speaker.mood === 'asleep') {
      this.narrate(person, line(lines.asleep, speaker, rng), now);
      return true;
    }
    const before = this.snapshot(person, now);
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
    this.noteFeedback(person, before, now, this.masked() ? lines.notes.masked : '', speaker.vars);
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
    if (this.detained(now)) return false;
    // Someone out cold here can be robbed too, with nobody to stop it.
    const cold = this.outCold(id, now) ? this.peopleHere(now).find((p) => p.person.id === id) : undefined;
    const here = this.isHere(id, now) ?? cold;
    if (!here) return false;
    const { person, stance, doing } = here;
    const { society, timeScale, lines } = this.rules;
    const standing = standingOf(this.society, id, society, timeScale, now);
    const rng = createRng(`${this.world.seed}:${id}:rob:${now}`);
    const emptied = standing.robbedAt && now - standing.robbedAt < (7 * 24 * HOUR) / timeScale;
    // What the player pulls on them: fewer fight back against a gun (loaded or not; they can't tell), more against a blade, most against bare hands. Out cold, nobody fights, and the pockets come out near enough empty.
    const arms = this.rules.gear.arms;
    const drawn = drawWeapon(this.items, arms);
    const fought = !cold && !emptied && rng.chance(person.traits.courage * (drawn ? (drawn.gun ? arms.rob.gun : arms.rob.melee) : arms.rob.bare));
    const wanted = emptied ? 0 : Math.round(person.eddies * (cold ? rng.range(0.8, 1) : rng.range(0.4, 0.8)) * (fought ? 0.5 : 1));
    // Their credchip too, if they carry one and there's a slot for it: it comes locked, and wants chopping before any of it is yours.
    const chipWanted = emptied ? 0 : person.chip;
    const chipPocket = chipWanted ? this.pocketFor({ id: 'credchip', kind: 'credchip' }) : null;
    const chipItem: Item | null = chipPocket ? { id: newChipId(this.items), kind: 'credchip', name: 'CredChip', count: 1, in: chipPocket, balance: chipWanted, locked: true } : null;
    const chip = chipItem ? chipWanted : 0;
    // And whatever of worth they have on them, if there's room for it: only a fence will buy it.
    const valuableId = emptied ? null : this.valuableOn(person, now);
    const valuable = valuableId ? this.rules.gear.valuables?.[valuableId] : undefined;
    const valuablePocket = valuableId && valuable ? this.pocketFor({ id: valuableId, kind: 'junk' }) : null;
    const taken: Item | null = valuableId && valuable && valuablePocket ? { id: valuableId, kind: 'junk', name: valuable.name, count: 1, in: valuablePocket } : null;
    // Cash is cash: bills as far as the wallet will hold them, coins as far as the pocket will (with the chip in it).
    const loot = splitLoot(wanted, this.rules.money);
    const bills = Math.min(loot.bills, walletRoom(this.pockets, this.money, this.rules.gear));
    const coins = Math.min(loot.coins, changeRoom(this.pockets, [...this.items, ...(chipItem ? [chipItem] : []), ...(taken ? [taken] : [])], this.money, this.rules.gear, this.rules.food.dishes));
    const take = bills + coins;
    const speaker = this.speakerFor(person, stance, doing, now);
    // A valuable by whose it was ("her Cufflinks", "his Omamori"): no article fits them all.
    const haul = [take ? `${take} €$` : '', chip ? `a credchip with ${chip} €$ on it` : '', taken ? `${speaker.vars.his ?? 'their'} ${taken.name}` : ''].filter(Boolean).join(' and ');
    const cut = drawn && !drawn.gun ? arms.classes[drawn.weapon.class]?.cut : undefined;
    // A thrown weapon (a knife, an axe) is a blade in the hand.
    speaker.vars = { ...speaker.vars, take: String(take), haul, weapon: drawn?.weapon.short ?? '', gun: drawn?.gun ? 'yes' : '', blade: cut === 'blade' || cut === 'thrown' ? 'yes' : '', blunt: cut === 'blunt' ? 'yes' : '' };
    const mask = this.masked();
    const before = this.snapshot(person, now);
    // Who could name the player, before this makes them known to the victim.
    const knew = this.facesHere(now);
    const fallout = this.incident('robbery', person, take + chip, now);
    learnOf(this.society, id, 'met');
    // Robbed is robbed, mask or not: their pockets stay empty a while. Whose doing it was, they know only with the face.
    changeStanding(this.society, id, mask ? { robbedAt: now } : { met: true, robbedAt: now }, society, timeScale, now);
    this.logged(id, 'you', line(cold ? lines.you.robCold : lines.you.rob, speaker, rng), now);
    const got = take > 0 || chip > 0 || Boolean(taken);
    const outcome =
      (wanted || chipWanted) && !got
        ? `No room on you for the eddies. ${person.given} keeps ${speaker.vars.his}${mask || cold ? '.' : ', and remembers your face.'}`
        : line(cold ? (got ? lines.rob.cold : lines.rob.coldNothing) : got ? (fought ? lines.rob.fought : lines.rob.done) : lines.rob.nothing, speaker, rng);
    this.logged(id, 'them', outcome, now);
    if (got) {
      this.money = { ...this.money, bills: this.money.bills + bills, coins: this.money.coins + coins };
      // What's taken is gone from them: less in their pockets, and their chip in yours.
      person.eddies = Math.max(0, person.eddies - take);
      this.life.eddies[person.id] = person.eddies;
      if (chipItem) {
        person.chip = 0;
        this.life.chips[person.id] = 0;
        this.items.push(chipItem);
      }
      if (taken) this.putAway(this.items, (this.items.push(taken), taken), taken.in);
      this.say(outcome, 'system');
      if (wanted > take) this.say(`Your pockets won't hold the rest: ${wanted - take} €$ stays with ${person.given}.`, 'system');
      if (chipWanted && !chip) this.say(`No room on you for ${speaker.vars.his} credchip: it stays in ${speaker.vars.his} hand.`, 'system');
      if (chip) this.say(`The chip is locked to ${person.given}. A netrunner will have to chop it before any of it is yours.`, 'system');
      if (fought) this.drainEnergy(2, now);
      this.events.emit('walletChanged', this.wallet);
      if (chipItem || taken) this.events.emit('inventoryChanged', this.inventory);
    } else {
      this.say(outcome);
    }
    const witnesses = this.peopleHere(now).filter((p) => p.person.id !== id).length;
    const saw = witnesses === 1 ? 'Someone' : `${witnesses} people`;
    if (mask) this.say(witnesses ? `${saw} saw that, and all they saw was a ${mask.word}. Anyone here who sees it on you again will know.` : `Nobody saw your face. ${person.given} will know the ${mask.word} if ${speaker.vars.he} sees it on you again.`, 'system');
    else if (witnesses) this.say(`${saw} saw that. Word will get around ${this.world.districts[person.district]?.name ?? 'the district'}.`, 'system');
    const work = person.job.building ? this.world.buildings.find((b) => b.id === person.job.building) : undefined;
    if (work && repOf(this.society, `business:${work.id}`, society, timeScale, now) <= society.rep.banAt) this.say(`${work.name} won't be serving you again.`, 'system');
    // Anyone here may call it in, and the one robbed too (out cold, once they come to).
    this.crime('robbery', person, now, knew, 'all');
    this.noteFeedback(person, before, now, mask ? lines.notes.masked : '', speaker.vars);
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
    const before = this.snapshot(person, now);
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
      const reply = replyTo(openness('chop', stance, this.charismaEdge, person.traits, society.openness, Boolean(this.masked())) + this.leaning(person.id, now), society.openness, rng);
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
        // Their cut is theirs now.
        person.eddies += cut;
        this.life.eddies[person.id] = person.eddies;
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
    this.noteFeedback(person, before, now, pressed ? lines.notes.pressed : done ? lines.notes.chopped : '', speaker.vars);
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
  /**
   * A heads-up before someone comes to collect (`SOCIETY.warning`): the one who thinks best of
   * the player among those who know whoever's coming (or are of the gang that is), have met the
   * player and are still breathing, sends word. Each threat is looked at once.
   */
  private warnings(now: number): void {
    const rules = this.rules.society.warning;
    if (!rules) return;
    for (const threat of this.society.threats) {
      if (threat.warned || threat.due - now > (rules.hours * HOUR) / this.rules.timeScale) continue;
      threat.warned = true;
      const by = threat.by ? this.person(threat.by) : undefined;
      const knows = by ? tiesOf(this.population, by.id).map((t) => this.person(t.to)) : threat.gang ? this.population.people.filter((p) => p.gang === threat.gang) : [];
      let warner: Person | undefined;
      let best = rules.regard;
      for (const p of knows) {
        if (!p || p.diedOn !== undefined || p.id === by?.id || !this.society.standings[p.id]?.met) continue;
        const r = this.regardOf(p.id, now);
        if (r >= best) [warner, best] = [p, r];
      }
      if (!warner) continue;
      const rng = createRng(`${this.world.seed}:warning:${threat.id}`);
      const name = (id: string) => this.describe(id, now)?.name ?? 'someone';
      const text = finish(rng.pick(by ? rules.lines.person : rules.lines.gang) ?? '', { who: name(warner.id), name: by ? name(by.id).replace(/^\p{Lu}/u, (c) => (this.describe(by.id, now)?.named ? c : c.toLowerCase())) : '', gang: threat.gang ? (this.rules.people.gangs[threat.gang]?.name ?? '') : '' });
      this.say(text, 'system');
      // On their card, what they said: the message itself.
      this.logged(warner.id, 'them', text.match(/"(.+)"/)?.[1] ?? text, now);
      this.events.emit('societyChanged', { people: [warner.id] });
    }
  }

  private settleThreats(now: number): void {
    this.warnings(now);
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
      // Whoever it is, the player has met them now; named as far as the player knows them, else by their look.
      if (by) learnOf(this.society, by.id, 'met');
      const known = by ? this.describe(by.id, now)?.name : undefined;
      const vars = { ...(by ? this.speakerFor(by, this.stanceOf(by, now), 'killing time', now).vars : {}), ...(known ? { name: known } : {}), gang: gang?.name ?? '', take: String(take), where: this.nameOf(this.where) };
      const rng = createRng(`${this.world.seed}:threat:${threat.id}`);
      this.events.emit('fx', { effect: 'shake' });
      const hit = finish(textOf(rng.pick(by ? lines.revenge.person : threat.why === 'debt' ? lines.revenge.debt : lines.revenge.gang)), vars);
      this.say(hit, 'error');
      if (by) this.logged(by.id, 'them', hit, now);
      this.money = grab.money;
      for (const chip of lost) this.items.splice(this.items.indexOf(chip), 1);
      if (lost.length) this.say(`${lost.length === 1 ? 'The credchip on you goes' : `The ${lost.length} credchips on you go`} with them.`, 'error');
      this.drainEnergy(Infinity, now);
      // Come for a loan shark's money, what they took comes off it, and the clock starts again.
      const shark = this.creditState.shark;
      if (threat.why === 'debt' && shark?.gang === threat.gang) {
        shark.owed = Math.max(0, shark.owed - take);
        shark.paid = this.clockAt(now).day;
        delete shark.sent;
        if (threat.gang) this.life.treasuries[threat.gang] = (this.life.treasuries[threat.gang] ?? 0) + take;
        if (!shark.owed) this.creditState.shark = null;
      }
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
    this.punchClock(now);
    this.homeTick(now);
    this.creditTick(now);
    this.dealTick(now);
    this.say(this.resumed ? this.world.welcomeBack : this.world.welcome);
    if (!this.resumed) this.settle(this.where);
    this.emitArrived(null);
    if (this.inside) this.events.emit('interiorChanged', this.inside);
    this.events.emit('walletChanged', this.wallet);
    // A new player's stomach starts emptying now; one coming back is as hungry as the time away has made them, told once.
    if (this.rules.needs && !this.hungerState.updatedAt) this.hungerState = { ...this.hungerState, updatedAt: now };
    const hungry = this.hunger(now);
    if (hungry?.stage && hungry.stage.energy * hungry.stage.health < 1) this.say(hungry.stage.down, 'system');
    this.hungerTold = hungry?.stage ?? null;
    this.rest(now);
    // Whatever was drunk before has been clearing since; pick up from where it stands now, without a word.
    const drunk = this.inebriation(now);
    this.drunkStage = drunk.stage;
    this.events.emit('inebriationChanged', drunk);
    if (this.trip) {
      this.events.emit('tripChanged', this.trip);
      this.tick(now, true);
    }
    // Back in a cell, or with officers still on them: the panel and the sign say so.
    if (this.rules.police && (this.detained(now) || this.policeState.dispatch)) this.events.emit('policeChanged', this.police(now));
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
    if (this.trip?.mode === 'ncart' || this.fighting || this.detained(now)) return false;
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
    // Out of time to choose: the player freezes, and the beat goes on without them.
    if (this.fightState && !this.fightState.over && now >= this.fightState.deadline) this.fightMove('freeze', now);
    this.live(now);
    this.punchClock(now);
    this.homeTick(now);
    this.creditTick(now);
    this.soberUp(now);
    this.getHungry(now);
    this.rest(now);
    this.settleThreats(now);
    this.policeTick(now);
    this.dealTick(now);
    this.habitTick(now);
    this.recognize(now);
    this.closingTime(now);
    const trip = this.trip;
    if (!trip) return;
    const changed = this.exploreTrip(now);
    if (now >= trip.endsAt) this.finish(trip, away);
    else if (changed) this.events.emit('mapChanged', this.mapState);
  }

  /** The last hand out locks up: the player, still inside a storefront that's shut, is seen out the door (not mid-fight, nor with anyone on them). */
  private closingTime(now: number): void {
    const at = this.inside;
    const shut = at && !this.fighting && !this.detained(now) && !this.shiftEventState ? this.locked(at, now) : null;
    if (!at || !shut) return;
    if (this.leave()) this.say(shut.down ? `${at.name} has gone under. Everyone's being sent home, and the shutters come down behind you for good.` : `Closing time at ${at.name}: the lights go down and the shutters come down behind you.`, 'system');
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
    if (!building || this.fighting || this.detained(now)) return false;
    // Shut, it's locked: a storefront is the whole building, so there's no getting in till someone who works there is.
    const shut = this.locked(building, now);
    if (shut) {
      if (shut.down) this.say(`${building.name} has gone under: the shutters are chained, and there's a notice from the landlord on them.`, 'error');
      else this.say(`Locked. The shutters are down and nobody's in${shut.opensAt ? `: someone's back ${this.whenWord(shut.opensAt)}` : ''}.`, 'error');
      return false;
    }
    this.inside = building;
    // In through the front: the room you walk into, and no door anyone's opened for you yet.
    this.roomState = 'main';
    this.letIn.clear();
    this.events.emit('interiorChanged', building);
    this.recognize(now);
    return true;
  }

  /** Steps back out onto the street, at the building's door. */
  leave(): boolean {
    // Officers on the player: they're going nowhere unless they run (`answerPolice`).
    if (!this.inside || this.fighting || this.policeState.confront) return false;
    this.inside = null;
    this.roomState = 'main';
    this.letIn.clear();
    // Walking out on a shift's moment lets it pass.
    this.shiftEventState = null;
    this.events.emit('interiorChanged', null);
    return true;
  }

  // ───────────── Rooms ─────────────

  /** The room the player is in, inside a building; null outside, or with no rooms in the rules. */
  room(): Room | null {
    const rules = this.rules.rooms;
    if (!this.inside || !rules) return null;
    return roomById(this.inside, this.roomState, rules) ?? mainRoom(this.inside, rules);
  }

  get roomSaved(): string | null {
    return this.inside ? this.roomState : null;
  }

  get lodgingSaved(): Lodging | null {
    return this.lodgingState ? { ...this.lodgingState } : null;
  }

  /** The room the player has rented, while it's theirs. */
  rented(now: number): Lodging | null {
    return this.lodgingState && this.lodgingState.until > now ? { ...this.lodgingState } : null;
  }

  // ───────────── Home ─────────────

  get homeSaved(): HomeState | null {
    return this.homeState ? { ...this.homeState } : null;
  }

  get stashSaved(): Item[] {
    return this.stashItems.map((item) => ({ ...item }));
  }

  /** What kind of home a building could be: a unit of a block or of a megabuilding, a squat in an abandoned building or a shack, or none. */
  private homeKindOf(building: Building): HomeKind | null {
    if (building.kind === 'apartments' || building.kind === 'megabuilding') return building.kind;
    return building.kind === 'derelict' || building.kind === 'shack' ? 'squat' : null;
  }

  /** A unit's rent a week in a block: what its tenants pay a head there, times a whole unit's worth. */
  private homeRentOf(building: Building): number {
    const economy = this.rules.life.economy;
    const kind = blockKind(building, economy);
    return kind ? Math.round(economy.homes[kind][this.tierFn({ kind: 'building', id: building.id })] * (this.rules.home?.unit ?? 1)) : 0;
  }

  /** Whether the player is home: in their own unit (or anywhere in their squat, or their building, without rooms). */
  private atHome(): boolean {
    const home = this.homeState;
    return Boolean(home && this.inside?.id === home.building && (!this.rules.rooms || this.roomState === home.room));
  }

  /** The name of the player's room at home: "Unit 12C", or the building's for a squat. */
  private homeRoomName(home: HomeState, building: Building): string {
    const room = this.rules.rooms && home.room !== 'main' ? roomById(building, home.room, this.rules.rooms) : null;
    return room?.name ?? building.name;
  }

  /**
   * What a home button offers where the player is: a unit to rent at a block's door, a corner to
   * squat, the way up to their own unit, or (in it) their stash. Null anywhere else.
   */
  homeOffer(): { kind: 'rent'; rent: number } | { kind: 'squat' } | { kind: 'go'; room: string } | { kind: 'stash'; count: number; room: string } | null {
    const building = this.inside;
    if (!this.rules.home || !building) return null;
    const kind = this.homeKindOf(building);
    if (!kind) return null;
    const home = this.homeState;
    if (home?.building === building.id) {
      const room = this.homeRoomName(home, building);
      return this.atHome() ? { kind: 'stash', count: this.stashItems.length, room } : { kind: 'go', room };
    }
    // A place is taken at its door: the lobby.
    if (!this.atCounter()) return null;
    return kind === 'squat' ? { kind: 'squat' } : { kind: 'rent', rent: this.homeRentOf(building) };
  }

  /** A unit of a block nobody lives in, drawn for the building (any of them, if every one is someone's). */
  private freeUnit(building: Building, rooms: RoomsContent): string {
    const taken = new Set(this.population.people.filter((p) => p.home === building.id && p.diedOn === undefined).map((p) => unitOf(p, building, this.population, rooms)));
    const units: Room[] = [];
    for (let floor = 1; floor <= floorsOf(building); floor++) units.push(...roomsOn(building, floor, rooms).filter((r) => r.kind === 'unit'));
    const free = units.filter((u) => !taken.has(u.id));
    const rng = createRng(`${this.world.seed}:home:${building.id}`);
    return (free.length ? rng.pick(free) : units.length ? rng.pick(units) : null)?.id ?? 'main';
  }

  /** Pays rent: out of the account first, then cash, as far as it goes, to whoever owns the building (a corp's leaves the city). What was paid. */
  private payRent(amount: number, building: Building): number {
    const fromAccount = Math.min(this.money.account, Math.max(0, amount));
    this.money = { ...this.money, account: this.money.account - fromAccount };
    const { money, taken } = takeCash(this.money, amount - fromAccount);
    this.money = money;
    const paid = fromAccount + taken;
    const economy = this.rules.life.economy;
    const owner = ownerNow(ownersOf(this.world, this.population, economy, this.world.seed).of.get(building.id), (id) => this.person(id), (id) => tiesOf(this.population, id));
    const landlord = owner ? this.person(owner) : undefined;
    if (landlord && paid > 0) {
      const ledger = ledgerOf(landlord, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
      (this.life.savings ??= {})[landlord.id] = accountOf(landlord, this.life, ledger, economy) + paid;
    }
    if (paid > 0) this.events.emit('walletChanged', this.wallet);
    return paid;
  }

  /** A line about the player's home, filled in. */
  private homeLine(pool: string[], vars: Record<string, string>, key: string): void {
    this.say(this.narration(pool, vars, createRng(`${this.world.seed}:home:${key}`)), 'system');
  }

  /**
   * Takes the place here as home: a unit of a block for a week's rent up front (never to a mask),
   * or a corner of a squat for nothing. An old home is given up for it, once its stash is empty.
   */
  takeHome(now: number): boolean {
    const rules = this.rules.home;
    const building = this.inside;
    const offer = this.homeOffer();
    if (!rules || !building || !offer || (offer.kind !== 'rent' && offer.kind !== 'squat') || this.fighting || this.detained(now)) return false;
    const key = `${building.id}:${now}`;
    const mask = this.masked();
    if (offer.kind === 'rent' && mask) {
      this.homeLine(rules.lines.masked, { mask: mask.word }, key);
      return false;
    }
    const old = this.homeState;
    const oldPlace = old ? this.buildingOf(old.building) : undefined;
    if (old && this.stashItems.length) {
      this.homeLine(rules.lines.clear, { place: oldPlace?.name ?? 'your old place' }, key);
      return false;
    }
    if (offer.kind === 'rent' && cash(this.money) + this.money.account < offer.rent) {
      this.homeLine(rules.lines.short, { rent: String(offer.rent) }, key);
      return false;
    }
    if (old) this.homeLine(rules.lines.left, { place: oldPlace?.name ?? 'the old place' }, key);
    if (offer.kind === 'rent') this.payRent(offer.rent, building);
    const today = this.clockAt(now).day;
    const room = offer.kind === 'rent' && this.rules.rooms ? this.freeUnit(building, this.rules.rooms) : 'main';
    this.homeState = { building: building.id, room, rent: offer.kind === 'rent' ? offer.rent : 0, since: today, due: today + 7, owed: 0, squat: offer.kind === 'squat' };
    const vars = { place: building.name, room: this.homeRoomName(this.homeState, building), rent: String(offer.kind === 'rent' ? offer.rent : 0) };
    this.homeLine(offer.kind === 'rent' ? rules.lines.rented : rules.lines.squatted, vars, key);
    this.events.emit('homeChanged', this.home(now));
    this.events.emit('energyChanged', this.energy(now));
    return true;
  }

  /** Goes up to the player's own unit, from the lobby of their block. */
  goHome(now: number): boolean {
    const home = this.homeState;
    if (!home || this.inside?.id !== home.building || this.atHome()) return false;
    return this.goRoom(home.room, now);
  }

  /** Hands back the keys (or walks out of a squat), once the stash is empty. */
  moveOut(now: number): boolean {
    const rules = this.rules.home;
    const home = this.homeState;
    const building = home ? this.buildingOf(home.building) : undefined;
    if (!rules || !home || !building || this.inside?.id !== building.id || this.fighting || this.detained(now)) return false;
    const key = `${building.id}:out:${now}`;
    if (this.stashItems.length) {
      this.homeLine(rules.lines.clear, { place: building.name }, key);
      return false;
    }
    this.homeLine(rules.lines.movedOut, { place: building.name, room: this.homeRoomName(home, building) }, key);
    this.homeState = null;
    this.events.emit('homeChanged', null);
    this.events.emit('energyChanged', this.energy(now));
    return true;
  }

  /** Where the player lives, for the UI: the place and the room, the rent and what's owed, when the next week falls due, and whether they're there. Null: nowhere. */
  home(now: number): HomeView | null {
    const home = this.homeState;
    const building = home ? this.buildingOf(home.building) : undefined;
    if (!home || !building) return null;
    return {
      building,
      room: this.homeRoomName(home, building),
      rent: home.rent,
      owed: home.owed,
      behind: home.rent > 0 ? Math.floor(home.owed / home.rent) : 0,
      dueIn: Math.max(0, home.due - this.clockAt(now).day),
      squat: home.squat,
      bed: !home.squat,
      inside: this.inside?.id === building.id,
      atHome: this.atHome(),
      stashed: this.stashItems.length,
    };
  }

  /** The stash, while the player is home: what's in it, and how full it is. */
  stash(): { items: Item[]; slots: number; maxSlots: number; grams: number; maxGrams: number } | null {
    const rules = this.rules.home;
    const home = this.homeState;
    const building = home ? this.buildingOf(home.building) : undefined;
    const kind = building ? this.homeKindOf(building) : null;
    if (!rules || !kind || !this.atHome()) return null;
    const { slots, grams } = stashLoad(this.stashItems, this.rules.gear, this.rules.food.dishes);
    return { items: this.stashItems.map((item) => ({ ...item })), slots, maxSlots: rules.stash[kind].slots, grams, maxGrams: rules.stash[kind].maxGrams };
  }

  /** Puts a stack carried (from the pocket `from`, when it's in more than one) in the stash, all of it, while the player is home. */
  stashIt(id: string, from?: string): boolean {
    const rules = this.rules.home;
    const home = this.homeState;
    const building = home ? this.buildingOf(home.building) : undefined;
    const kind = building ? this.homeKindOf(building) : null;
    const item = this.items.find((i) => i.id === id && (from === undefined || i.in === from));
    if (!rules || !building || !kind || !item || !this.atHome()) return false;
    if (!stashFits(this.stashItems, item, item.count, rules.stash[kind], this.rules.gear, this.rules.food.dishes)) {
      this.homeLine(rules.lines.full, {}, `${building.id}:full:${this.stashItems.length}`);
      return false;
    }
    this.items.splice(this.items.indexOf(item), 1);
    const stack = stackIn(this.stashItems, item);
    if (stack) stack.count += item.count;
    else {
      const kept: Item = { ...item };
      delete kept.in;
      this.stashItems.push(kept);
    }
    this.say(`Into the stash: ${item.count > 1 ? `${item.count} × ` : ''}${item.name}.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /** Takes a stack out of the stash into pockets with room: all of it if it fits together, else as many as fit. */
  unstash(id: string): boolean {
    const stack = this.stashItems.find((i) => i.id === id);
    if (!stack || !this.atHome()) return false;
    const name = stack.name;
    const move = (count: number, pocket: string) => {
      const piece: Item = { ...stack, count, in: pocket };
      this.items.push(piece);
      this.putAway(this.items, piece, pocket);
      stack.count -= count;
    };
    let taken = 0;
    const all = this.pocketFor(stack, stack.count);
    if (all) {
      taken = stack.count;
      move(stack.count, all);
    } else {
      for (let pocket = this.pocketFor(stack, 1); pocket && stack.count > 0; pocket = this.pocketFor(stack, 1)) {
        move(1, pocket);
        taken++;
      }
    }
    if (stack.count <= 0) this.stashItems.splice(this.stashItems.indexOf(stack), 1);
    if (!taken) {
      this.say(`No room on you for the ${name}.`, 'error');
      return false;
    }
    this.say(`Out of the stash: ${taken > 1 ? `${taken} × ` : ''}${name}.`, 'system');
    this.events.emit('inventoryChanged', this.inventory);
    return true;
  }

  /**
   * The weeks of a home as each falls due: a rented one's rent (and what's owed) out of the
   * account, then cash, as far as it goes, the rest owed; owing `warnAt` weeks, a warning;
   * `evictAt`, put out, and the stash lost. A squat's week has a chance of someone going through
   * the stash.
   */
  private homeTick(now: number): void {
    const rules = this.rules.home;
    const home = this.homeState;
    if (!rules || !home) return;
    const building = this.buildingOf(home.building);
    if (!building) {
      this.homeState = null;
      this.stashItems = [];
      return;
    }
    const today = this.clockAt(now).day;
    if (home.due > today) return;
    const vars = { place: building.name, room: this.homeRoomName(home, building) };
    while (this.homeState === home && home.due <= today) {
      const day = home.due;
      home.due += 7;
      const key = `${building.id}:${day}`;
      if (home.squat) {
        const rng = createRng(`${this.world.seed}:home:raid:${key}`);
        if (!this.stashItems.length || !rng.chance(rules.squat.raid)) continue;
        const gone: string[] = [];
        for (const item of [...this.stashItems]) {
          const take = item.count > 1 ? Math.ceil(item.count * rules.squat.take) : rng.chance(rules.squat.take) ? 1 : 0;
          if (!take) continue;
          gone.push(take > 1 ? `${take} × ${item.name}` : item.name);
          item.count -= take;
          if (item.count <= 0) this.stashItems.splice(this.stashItems.indexOf(item), 1);
        }
        if (gone.length) this.homeLine(rules.lines.raided, { ...vars, what: gone.join(', ') }, key);
        continue;
      }
      const due = home.owed + home.rent;
      const paid = this.payRent(due, building);
      home.owed = due - paid;
      if (!home.owed) {
        delete home.warned;
        this.homeLine(rules.lines.paid, { ...vars, rent: String(paid) }, key);
        continue;
      }
      this.homeLine(rules.lines.behind, { ...vars, owed: String(home.owed) }, key);
      if (home.owed >= rules.evictAt * home.rent) {
        this.homeLine(rules.lines.evicted, { ...vars, weeks: String(Math.floor(home.owed / home.rent)) }, `${key}:out`);
        this.homeState = null;
        this.stashItems = [];
        // Out of the unit, if they're in it: the locks have changed.
        if (this.inside?.id === building.id && this.rules.rooms && this.roomState !== 'main') this.moveTo(mainRoom(building, this.rules.rooms), now);
        this.events.emit('energyChanged', this.energy(now));
      } else if (home.owed >= rules.warnAt * home.rent && home.warned === undefined) {
        home.warned = day;
        this.homeLine(rules.lines.warn, { ...vars, owed: String(home.owed) }, `${key}:warn`);
      }
    }
    this.events.emit('homeChanged', this.home(now));
  }

  // ───────────── Borrowing and lending ─────────────

  get creditSaved(): CreditState {
    return copyOf(this.creditState);
  }

  /** A line of the borrowing and lending, filled in. */
  private creditLine(pool: string[], vars: Record<string, string>, key: string): void {
    this.say(this.narration(pool, vars, createRng(`${this.world.seed}:credit:${key}`)), 'system');
  }

  /** What the player's work pays a week: each job's shift pay on its rostered days. */
  private weeklyPay(now: number): number {
    return this.jobsStatus(now).reduce((n, j) => n + j.pay * j.days.length, 0);
  }

  /** The bank here as a lender: what it would lend (nothing to a player it's barred, or with a loan out), its amounts, and the loan the player has, wherever it's from. */
  credit(now: number): { limit: number; amounts: number[]; loan: { bank: string; owed: number; installment: number; dueIn: number; missed: number; defaulted: boolean } | null; barred: boolean } | null {
    const rules = this.rules.credit;
    if (!rules || !this.bank(now)) return null;
    const loan = this.creditState.bank;
    const limit = loan || this.creditState.barred ? 0 : creditLimit(this.weeklyPay(now), rules.bank);
    return {
      limit,
      amounts: limit ? loanAmounts(limit, rules.bank) : [],
      loan: loan ? { bank: this.buildingOf(loan.bank)?.name ?? 'the bank', owed: loan.owed, installment: loan.installment, dueIn: Math.max(0, loan.due - this.clockAt(now).day), missed: loan.missed, defaulted: Boolean(loan.defaulted) } : null,
      barred: this.creditState.barred,
    };
  }

  /** Takes a bank loan here, into the account: the interest on top, paid back a week at a time. */
  borrow(amount: number, now: number): boolean {
    const rules = this.rules.credit;
    const offer = this.credit(now);
    const bank = this.inside;
    if (!rules || !offer || !bank || !offer.amounts.includes(amount)) return false;
    const owed = Math.round(amount * (1 + rules.bank.interest));
    const installment = Math.ceil(owed / rules.bank.term);
    const today = this.clockAt(now).day;
    this.creditState.bank = { bank: bank.id, owed, installment, due: today + 7, missed: 0, since: today };
    this.money = { ...this.money, account: this.money.account + amount };
    this.creditLine(rules.lines.borrowed, { bank: bank.name, amount: String(amount), owed: String(owed), installment: String(installment) }, `${bank.id}:${now}`);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** Pays a bank loan off at a bank, as far as the account and then cash go. */
  repayLoan(now: number): boolean {
    const rules = this.rules.credit;
    const loan = this.creditState.bank;
    if (!rules || !loan || !this.bank(now)) return false;
    const fromAccount = Math.min(this.money.account, loan.owed);
    this.money = { ...this.money, account: this.money.account - fromAccount };
    const { money, taken } = takeCash(this.money, loan.owed - fromAccount);
    this.money = money;
    const paid = fromAccount + taken;
    if (!paid) return false;
    loan.owed -= paid;
    const name = this.buildingOf(loan.bank)?.name ?? 'the bank';
    if (loan.owed <= 0) {
      this.creditState.bank = null;
      this.creditLine(rules.lines.cleared, { bank: name }, `${loan.bank}:clear:${now}`);
    } else this.creditLine(rules.lines.paid, { bank: name, installment: String(paid), owed: String(loan.owed) }, `${loan.bank}:pay:${now}`);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /**
   * What a person's €$ command offers: with a boss, buying their storefront off them; with a
   * ganger, borrowing from their gang's loan shark (one gang at a time, up to what it will) and
   * paying back what's owed it; with anyone else but an officer, lending them something, or
   * asking for back what they owe.
   */
  moneyWith(id: string, now: number): Array<{ id: string; label: string; sub?: string; disabled?: boolean }> {
    const rules = this.rules.credit;
    const here = this.isHere(id, now);
    if (!here) return [];
    const { person } = here;
    const options: Array<{ id: string; label: string; sub?: string; disabled?: boolean }> = [];
    // A boss's own storefront, for sale to the player if they'd sell it.
    const place = this.placeOffer(person, here.stance);
    if (place) options.push(place);
    if (!rules) return options;
    if (person.gang) {
      const shark = this.creditState.shark;
      const theirs = !shark || shark.gang === person.gang;
      if (shark && theirs) options.push({ id: 'repay', label: 'Pay back', sub: `€$ ${shark.owed} owed`, disabled: !cash(this.money) });
      for (const amount of rules.shark.amounts) options.push({ id: `borrow:${amount}`, label: `Borrow ${amount}`, disabled: !theirs || (shark?.owed ?? 0) + amount > rules.shark.most });
      return options;
    }
    if (/NCPD/.test(person.job.role)) return options;
    const lent = this.creditState.lent[id];
    if (lent) return [...options, { id: 'ask', label: 'Ask for it back', sub: `€$ ${lent.owed}` }];
    for (const amount of rules.lend.amounts) options.push({ id: `lend:${amount}`, label: `Lend ${amount}`, disabled: cash(this.money) < amount });
    return options;
  }

  /** Does what a person's €$ command offered: borrow, pay back, lend, or ask for it back. */
  moneyMove(id: string, option: string, now: number): boolean {
    const here = this.isHere(id, now);
    const choice = this.moneyWith(id, now).find((o) => o.id === option);
    if (!here || !choice || choice.disabled || this.detained(now) || this.fighting) return false;
    const [what, amount] = option.split(':');
    if (what === 'borrow') return this.borrowFrom(here.person, Number(amount), here.stance, here.doing, now);
    if (what === 'repay') return this.payShark(here.person, here.stance, here.doing, now);
    if (what === 'lend') return this.lendTo(here.person, Number(amount), here.stance, here.doing, now);
    if (what === 'ask') return this.askBack(here.person, here.stance, here.doing, now);
    if (what === 'buy') return this.buyFrom(here.person, here.stance, here.doing, now);
    return false;
  }

  /** What someone has over a week's food and rent, as the economy sees them. */
  private spareOf(person: Person): number {
    const economy = this.rules.life.economy;
    const ledger = ledgerOf(person, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
    return person.eddies + accountOf(person, this.life, ledger, economy) - ledger.essentials;
  }

  /** Takes eddies out of someone's money as the economy keeps it: their account first, then what's on them. */
  private takeFrom(person: Person, amount: number): number {
    const economy = this.rules.life.economy;
    const ledger = ledgerOf(person, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
    const savings = (this.life.savings ??= {});
    const account = accountOf(person, this.life, ledger, economy);
    const fromAccount = Math.max(0, Math.min(account, amount));
    savings[person.id] = account - fromAccount;
    const fromCash = Math.max(0, Math.min(person.eddies, amount - fromAccount));
    person.eddies -= fromCash;
    this.life.eddies[person.id] = person.eddies;
    return fromAccount + fromCash;
  }

  private borrowFrom(person: Person, amount: number, stance: Stance, doing: string, now: number): boolean {
    const rules = this.rules.credit!;
    const gang = person.gang as string;
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:borrow:${amount}:${now}`);
    const before = this.snapshot(person, now);
    const shark = this.creditState.shark;
    const today = this.clockAt(now).day;
    // Cash, into the wallet: as much as it'll hold.
    if (walletRoom(this.pockets, this.money, this.rules.gear) < amount) {
      this.creditLine(rules.lines.noRoom, { amount: String(amount) }, `${person.id}:room:${now}`);
      return false;
    }
    speaker.vars = { ...speaker.vars, amount: String(amount), owed: String(shark?.owed ?? 0), gang: this.rules.people.gangs[gang]?.name ?? '' };
    this.logged(person.id, 'you', line(this.rules.lines.you.borrow, speaker, rng), now);
    // Nothing for a player they're cold to, nor more for one behind on what they owe already, nor out of an empty chest.
    const late = shark && today - shark.paid >= rules.shark.grace;
    const no = stance === 'hostile' || stance === 'cold' ? this.rules.lines.money.sharkNo : late ? this.rules.lines.money.sharkFull : (this.life.treasuries[gang] ?? 0) < amount ? this.rules.lines.money.sharkDry : null;
    if (no) {
      this.speech(person, line(no, speaker, rng), now);
      this.noteFeedback(person, before, now);
      return false;
    }
    const loan = (this.creditState.shark ??= { gang, owed: 0, borrowed: 0, since: today, paid: today, due: today + 7 });
    loan.owed += amount;
    loan.borrowed += amount;
    loan.paid = today;
    this.life.treasuries[gang] = (this.life.treasuries[gang] ?? 0) - amount;
    this.money = { ...this.money, bills: this.money.bills + amount };
    this.speech(person, line(this.rules.lines.money.sharkLend, speaker, rng), now);
    this.creditLine(rules.lines.sharkLent, { gang: speaker.vars.gang ?? '', owed: String(loan.owed) }, `${gang}:${now}`);
    this.noteFeedback(person, before, now);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  private payShark(person: Person, stance: Stance, doing: string, now: number): boolean {
    const rules = this.rules.credit!;
    const loan = this.creditState.shark;
    if (!loan || loan.gang !== person.gang) return false;
    const grab = takeCash(this.money, loan.owed);
    if (!grab.taken) return false;
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:payshark:${loan.owed}:${now}`);
    const before = this.snapshot(person, now);
    this.money = grab.money;
    loan.owed -= grab.taken;
    loan.paid = this.clockAt(now).day;
    delete loan.sent;
    this.life.treasuries[loan.gang] = (this.life.treasuries[loan.gang] ?? 0) + grab.taken;
    const gang = this.rules.people.gangs[loan.gang]?.name ?? '';
    speaker.vars = { ...speaker.vars, amount: String(grab.taken), owed: String(loan.owed), gang };
    this.logged(person.id, 'you', line(this.rules.lines.you.payShark, speaker, rng), now);
    if (loan.owed <= 0) {
      this.creditState.shark = null;
      // Square: nobody's coming for it any more.
      this.society.threats = this.society.threats.filter((t) => !(t.why === 'debt' && t.gang === loan.gang));
      this.speech(person, line(this.rules.lines.money.sharkSquare, speaker, rng), now);
      this.creditLine(rules.lines.sharkCleared, { gang }, `${loan.gang}:clear:${now}`);
    } else {
      this.speech(person, line(this.rules.lines.money.sharkPaid, speaker, rng), now);
      this.creditLine(rules.lines.sharkPaid, { gang, amount: String(grab.taken), owed: String(loan.owed) }, `${loan.gang}:pay:${now}`);
    }
    this.noteFeedback(person, before, now);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  private lendTo(person: Person, amount: number, stance: Stance, doing: string, now: number): boolean {
    const rules = this.rules.credit!;
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:lend:${amount}:${now}`);
    const before = this.snapshot(person, now);
    speaker.vars = { ...speaker.vars, amount: String(amount) };
    this.logged(person.id, 'you', line(this.rules.lines.you.lend, speaker, rng), now);
    // The broke take it gladly; anyone else only from someone they're warm to.
    const vars = this.meansVars(person);
    const needs = Boolean(vars.broke || vars.behind || vars.inDebt);
    if (!needs && !rules.lend.stances.includes(stance)) {
      this.speech(person, line(this.rules.lines.money.refuse, speaker, rng), now);
      this.noteFeedback(person, before, now);
      return false;
    }
    const grab = takeCash(this.money, amount);
    if (grab.taken < amount) return false;
    this.money = grab.money;
    const economy = this.rules.life.economy;
    const ledger = ledgerOf(person, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
    (this.life.savings ??= {})[person.id] = accountOf(person, this.life, ledger, economy) + amount;
    const today = this.clockAt(now).day;
    this.creditState.lent[person.id] = { owed: amount, since: today, paid: today, due: today + 7 };
    changeStanding(this.society, person.id, { rapport: needs ? 4 : 2 }, this.rules.society, this.rules.timeScale, now);
    this.speech(person, line(this.rules.lines.money.lend, speaker, rng), now);
    this.creditLine(rules.lines.lent, { who: this.describe(person.id, now)?.name ?? 'them', amount: String(amount) }, `${person.id}:${now}`);
    this.noteFeedback(person, before, now, this.rules.lines.notes.lent);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('societyChanged', { people: [person.id] });
    return true;
  }

  private askBack(person: Person, stance: Stance, doing: string, now: number): boolean {
    const rules = this.rules.credit!;
    const lent = this.creditState.lent[person.id];
    if (!lent) return false;
    const speaker = this.speakerFor(person, stance, doing, now);
    const today = this.clockAt(now).day;
    const rng = createRng(`${this.world.seed}:${person.id}:askback:${lent.owed}:${today}:${lent.asked ?? -1}`);
    const before = this.snapshot(person, now);
    speaker.vars = { ...speaker.vars, owed: String(lent.owed) };
    this.logged(person.id, 'you', line(this.rules.lines.you.askBack, speaker, rng), now);
    const pressed = lent.asked !== undefined && today - lent.asked < rules.lend.patience;
    lent.asked = today;
    if (pressed) {
      changeStanding(this.society, person.id, { rapport: -rules.lend.pressing }, this.rules.society, this.rules.timeScale, now);
      this.speech(person, line(this.rules.lines.money.pressed, speaker, rng), now);
      this.noteFeedback(person, before, now, this.rules.lines.notes.dunned);
      return true;
    }
    const can = honestyOf(person) >= rules.lend.honest ? Math.min(lent.owed, Math.floor(this.spareOf(person))) : 0;
    if (can <= 0) {
      this.speech(person, line(this.rules.lines.money.excuse, speaker, rng), now);
      this.noteFeedback(person, before, now);
      return true;
    }
    const paid = this.takeFrom(person, can);
    this.money = { ...this.money, account: this.money.account + paid };
    lent.owed -= paid;
    lent.paid = today;
    speaker.vars = { ...speaker.vars, amount: String(paid), owed: String(lent.owed) };
    this.speech(person, line(this.rules.lines.money.payBack, speaker, rng), now);
    if (lent.owed <= 0) delete this.creditState.lent[person.id];
    this.noteFeedback(person, before, now);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /**
   * The weeks of what the player owes and is owed, as each falls due: a bank loan's installment
   * out of the account (missed, a fee; too many missed, default, and the account swept every week);
   * a loan shark's interest, and someone sent to collect when nothing's been paid back in too long;
   * and whoever owes the player paying back what they can, if they're the kind who does.
   */
  private creditTick(now: number): void {
    const rules = this.rules.credit;
    if (!rules) return;
    const today = this.clockAt(now).day;
    const loan = this.creditState.bank;
    let changed = false;
    while (this.creditState.bank === loan && loan && loan.due <= today) {
      changed = true;
      const day = loan.due;
      loan.due += 7;
      const name = this.buildingOf(loan.bank)?.name ?? 'the bank';
      const key = `${loan.bank}:${day}`;
      if (loan.defaulted) {
        const swept = Math.min(this.money.account, loan.owed);
        this.money = { ...this.money, account: this.money.account - swept };
        loan.owed -= swept;
        if (swept) this.creditLine(rules.lines.swept, { bank: name, amount: String(swept), owed: String(loan.owed) }, key);
      } else {
        const want = Math.min(loan.installment, loan.owed);
        const pay = Math.min(this.money.account, want);
        this.money = { ...this.money, account: this.money.account - pay };
        loan.owed -= pay;
        if (pay < want) {
          loan.missed += 1;
          loan.owed += Math.ceil((want - pay) * rules.bank.late);
          if (loan.missed >= rules.bank.default) {
            loan.defaulted = true;
            this.creditState.barred = true;
            const swept = Math.min(this.money.account, loan.owed);
            this.money = { ...this.money, account: this.money.account - swept };
            loan.owed -= swept;
            this.creditLine(rules.lines.defaulted, { bank: name, owed: String(loan.owed) }, key);
          } else this.creditLine(rules.lines.missed, { bank: name, installment: String(want), owed: String(loan.owed) }, key);
        } else {
          loan.missed = 0;
          if (loan.owed > 0) this.creditLine(rules.lines.paid, { bank: name, installment: String(pay), owed: String(loan.owed) }, key);
        }
      }
      if (loan.owed <= 0) {
        this.creditState.bank = null;
        this.creditLine(rules.lines.cleared, { bank: name }, `${key}:clear`);
      }
    }
    const shark = this.creditState.shark;
    if (shark) {
      while (shark.due <= today) {
        shark.due += 7;
        shark.owed = Math.min(Math.ceil(shark.borrowed * rules.shark.cap), Math.ceil(shark.owed * (1 + rules.shark.interest)));
        changed = true;
      }
      // Nothing paid back in too long: the gang sends someone for it.
      if (!shark.sent && today - shark.paid >= rules.shark.grace) {
        shark.sent = true;
        changed = true;
        const rng = createRng(`${this.world.seed}:shark:${shark.gang}:${today}`);
        this.society.threats = this.society.threats.filter((t) => !(t.why === 'debt' && t.gang === shark.gang));
        this.society.threats.push({ id: this.society.nextId++, due: now + (rng.range(rules.shark.hours[0], rules.shark.hours[1]) * HOUR) / this.rules.timeScale, by: null, gang: shark.gang, incident: 0, amount: shark.owed, why: 'debt' });
      }
    }
    for (const [id, lent] of Object.entries(this.creditState.lent)) {
      const person = this.person(id);
      if (!person || person.diedOn !== undefined) {
        delete this.creditState.lent[id];
        changed = true;
        continue;
      }
      while (lent.due <= today && lent.owed > 0) {
        lent.due += 7;
        if (honestyOf(person) < rules.lend.honest) continue;
        const spare = Math.floor(this.spareOf(person) * rules.lend.share);
        const pay = Math.min(lent.owed, spare);
        if (pay <= 0) continue;
        const paid = this.takeFrom(person, pay);
        this.money = { ...this.money, account: this.money.account + paid };
        lent.owed -= paid;
        lent.paid = lent.due - 7;
        changed = true;
        const who = this.describe(id, now)?.name ?? 'Someone';
        this.creditLine(lent.owed > 0 ? rules.lines.repaid : rules.lines.repaidAll, { who, amount: String(paid), owed: String(lent.owed) }, `${id}:${lent.due}`);
      }
      if (lent.owed <= 0) delete this.creditState.lent[id];
    }
    if (changed) this.events.emit('walletChanged', this.wallet);
  }

  /** Everything the player owes and is owed, for the status: the bank loan, the loan shark, and who owes them. */
  debts(now: number): { bank: { name: string; owed: number; installment: number; dueIn: number; missed: number; defaulted: boolean } | null; shark: { gang: string; owed: number; late: boolean } | null; owedYou: number; owers: number } {
    const loan = this.creditState.bank;
    const shark = this.creditState.shark;
    const today = this.clockAt(now).day;
    const lent = Object.values(this.creditState.lent);
    return {
      bank: loan ? { name: this.buildingOf(loan.bank)?.name ?? 'the bank', owed: loan.owed, installment: loan.installment, dueIn: Math.max(0, loan.due - today), missed: loan.missed, defaulted: Boolean(loan.defaulted) } : null,
      shark: shark ? { gang: this.rules.people.gangs[shark.gang]?.name ?? shark.gang, owed: shark.owed, late: today - shark.paid >= (this.rules.credit?.shark.grace ?? Infinity) } : null,
      owedYou: lent.reduce((n, l) => n + l.owed, 0),
      owers: lent.length,
    };
  }

  // ───────────── The player's business ─────────────

  /** Whether the player owns a storefront. */
  owns(id: string): boolean {
    return Boolean(this.life.owned?.[id]);
  }

  /** A line of the player's business, filled in. */
  private businessLine(pool: string[], vars: Record<string, string>, key: string): void {
    this.say(this.narration(pool, vars, createRng(`${this.world.seed}:business:${key}`)), 'system');
  }

  /** Whether a storefront can be bought at all: a business of its own, never a corp's, a bank, a hospital or a real place. */
  private sellable(building: Building): boolean {
    const economy = this.rules.life.economy;
    const never = economy.hard?.close.never;
    if (!economy.business || !building.business) return false;
    return !economy.owners.corp.includes(building.business) && !never?.businesses.includes(building.business) && !never?.names.includes(building.name);
  }

  /** What a week costs a storefront: its people's wages and its rent; one gone under, as if two hands and a boss. */
  private weekCostOf(building: Building): number {
    const economy = this.rules.life.economy;
    const tier = this.tierOf(building);
    const rent = economy.rent[tier] * 7;
    if (this.life.closed?.[building.id]) return economy.staff[tier] * (2 + economy.boss) + rent;
    const staff = this.livingStaff(building.id);
    return staffCostOf(staff, bossOf(building, this.population, staff), tier, economy) + rent;
  }

  /** What a storefront goes for: weeks of its costs and of what it cleared last week, or as one gone under, to the nearest fifty. */
  private priceOfPlace(building: Building): number {
    const rules = this.rules.life.economy.business;
    if (!rules) return 0;
    const cost = this.weekCostOf(building);
    const net = Math.max(0, (this.life.tills[building.id]?.days ?? []).reduce((n, d) => n + d, 0));
    const price = this.life.closed?.[building.id] ? rules.price.closed * cost : rules.price.costs * cost + rules.price.profits * net;
    return Math.max(50, Math.round(price / 50) * 50);
  }

  /** Takes eddies off the player, the account first and then cash; what was taken. */
  private takePlayers(amount: number): number {
    const fromAccount = Math.min(this.money.account, Math.max(0, amount));
    this.money = { ...this.money, account: this.money.account - fromAccount };
    const { money, taken } = takeCash(this.money, amount - fromAccount);
    this.money = money;
    return fromAccount + taken;
  }

  /** Pays someone from the player's account and cash into their own account; nobody, and it leaves the city. What was paid. */
  private payInto(amount: number, payee: Person | undefined): number {
    const paid = this.takePlayers(amount);
    if (payee && paid > 0) {
      const economy = this.rules.life.economy;
      const ledger = ledgerOf(payee, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
      (this.life.savings ??= {})[payee.id] = accountOf(payee, this.life, ledger, economy) + paid;
    }
    return paid;
  }

  /** The storefront gone under at the player's door, for sale off its building's owner, at its price (null: none, or it's theirs). */
  forSale(): { price: number; affordable: boolean } | null {
    const door = this.door;
    if (!door || !this.life.closed?.[door.id] || !this.sellable(door) || this.owns(door.id)) return null;
    const price = this.priceOfPlace(door);
    return { price, affordable: this.money.account + cash(this.money) >= price };
  }

  /** Buys the storefront gone under at the player's door off whoever owns the building: new hands open it the next day, the player's. */
  buyClosed(now: number): boolean {
    const rules = this.rules.life.economy.business;
    const door = this.door;
    const offer = this.forSale();
    const closure = door ? this.life.closed?.[door.id] : undefined;
    if (!rules || !door || !offer || !offer.affordable || !closure || this.fighting || this.detained(now)) return false;
    const economy = this.rules.life.economy;
    const owner = ownerNow(ownersOf(this.world, this.population, economy, this.world.seed).of.get(door.id), (id) => this.person(id), (id) => tiesOf(this.population, id));
    this.payInto(offer.price, owner ? this.person(owner) : undefined);
    (this.life.owned ??= {})[door.id] = { since: this.clockAt(now).day, prices: 'fair', due: 0 };
    // New management is the player's people: they start the next day lived.
    closure.until = Math.min(closure.until, this.life.day + 1);
    this.businessLine(rules.lines.boughtClosed, { place: door.name, amount: String(offer.price) }, `${door.id}:${now}`);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('businessChanged', null);
    return true;
  }

  /** What a boss's €$ command offers for their storefront: buying it at its price, if they'd sell it to the player as they stand and as it's doing (null: nothing of theirs to sell). */
  private placeOffer(person: Person, stance: Stance): { id: string; label: string; sub?: string; disabled?: boolean } | null {
    const rules = this.rules.life.economy.business;
    const place = rules ? bossAt(person, this.world, this.population, this.rules.jobs) : null;
    if (!rules || !place || !this.sellable(place) || this.owns(place.id) || this.life.closed?.[place.id]) return null;
    const willing = rules.sellers[this.trade(place).health].includes(stance);
    const price = this.priceOfPlace(place);
    return { id: 'buy', label: 'Buy the place', sub: willing ? `€$ ${price}` : 'Not selling', disabled: !willing || this.money.account + cash(this.money) < price };
  }

  /** Buys a boss's storefront off them: paid into their account, and they stay on to run it. */
  private buyFrom(person: Person, stance: Stance, doing: string, now: number): boolean {
    const rules = this.rules.life.economy.business;
    const place = bossAt(person, this.world, this.population, this.rules.jobs);
    if (!rules || !place) return false;
    const price = this.priceOfPlace(place);
    const speaker = this.speakerFor(person, stance, doing, now);
    const rng = createRng(`${this.world.seed}:${person.id}:buy:${place.id}:${now}`);
    const before = this.snapshot(person, now);
    speaker.vars = { ...speaker.vars, amount: String(price), work: place.name };
    this.logged(person.id, 'you', line(this.rules.lines.you.buyPlace, speaker, rng), now);
    if (this.payInto(price, person) < price) return false;
    (this.life.owned ??= {})[place.id] = { since: this.clockAt(now).day, prices: 'fair', due: 0 };
    changeStanding(this.society, person.id, { rapport: 3 }, this.rules.society, this.rules.timeScale, now);
    this.speech(person, line(this.rules.lines.money.sellYes, speaker, rng), now);
    this.businessLine(rules.lines.bought, { place: place.name, amount: String(price) }, `${place.id}:${now}`);
    this.noteFeedback(person, before, now);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('businessChanged', null);
    return true;
  }

  /** A storefront of the player's as the UI shows it. */
  private businessOf(building: Building): BusinessView | null {
    const rules = this.rules.life.economy.business;
    const mine = this.life.owned?.[building.id];
    if (!rules || !mine) return null;
    const economy = this.rules.life.economy;
    const till = this.life.tills[building.id];
    const cost = this.weekCostOf(building);
    const staff = this.livingStaff(building.id);
    const boss = staff.length ? bossOf(building, this.population, staff) : null;
    const trade = this.trade(building);
    const cashIn = Math.max(0, Math.floor(till?.cash ?? 0));
    return {
      building,
      health: trade.health,
      line: trade.line,
      week: (till?.days ?? []).reduce((n, d) => n + d, 0),
      till: cashIn,
      over: Math.max(0, cashIn - Math.ceil(economy.float * cost)),
      stock: stockOf(till),
      staff: staff.length,
      manager: boss ? this.nameInLine(boss.id) : null,
      prices: mine.prices,
      worth: Math.round((this.priceOfPlace(building) * rules.sell) / 50) * 50,
      lean: till?.lean ?? 0,
      opening: Boolean(this.life.closed?.[building.id]),
    };
  }

  /** Someone as a line names them mid-sentence: by name if the player knows it, else by their look ("a woman"). */
  private nameInLine(id: string): string | null {
    const d = this.describe(id, Date.now());
    return d ? (d.named ? d.name : d.name.replace(/^\p{Lu}/u, (c) => c.toLowerCase())) : null;
  }

  /** Every storefront the player owns, for the status. */
  businesses(): BusinessView[] {
    return Object.keys(this.life.owned ?? {})
      .map((id) => this.buildingOf(id))
      .filter((b): b is Building => Boolean(b))
      .map((b) => this.businessOf(b))
      .filter((v): v is BusinessView => Boolean(v));
  }

  /** The books of the storefront of the player's they're in: out back, where it has a back (null: not theirs, or not there). */
  books(): BusinessView | null {
    const at = this.inside;
    if (!at || !this.owns(at.id)) return null;
    if (this.rules.rooms && roomsOn(at, 1, this.rules.rooms).some((r) => r.kind === 'back') && this.room()?.kind !== 'back') return null;
    return this.businessOf(at);
  }

  /** Puts eddies into the till of the storefront of the player's they're at the books of, the account first. */
  putIn(amount: number, now: number): boolean {
    const rules = this.rules.life.economy.business;
    const view = this.books();
    if (!rules || !view || !rules.amounts.includes(amount) || this.detained(now) || this.money.account + cash(this.money) < amount) return false;
    const paid = this.takePlayers(amount);
    const till = tillOf(this.life.tills, view.building.id);
    till.cash = (till.cash ?? 0) + paid;
    this.businessLine(rules.lines.putIn, { place: view.building.name, amount: String(paid) }, `${view.building.id}:in:${now}`);
    this.tradeCache.delete(view.building.id);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('businessChanged', null);
    return true;
  }

  /** Takes what's over its float out of the till, into the player's account. */
  takeOut(now: number): boolean {
    const rules = this.rules.life.economy.business;
    const view = this.books();
    if (!rules || !view || !view.over || this.detained(now)) return false;
    const till = tillOf(this.life.tills, view.building.id);
    till.cash = (till.cash ?? 0) - view.over;
    this.money = { ...this.money, account: this.money.account + view.over };
    this.businessLine(rules.lines.tookOut, { place: view.building.name, amount: String(view.over) }, `${view.building.id}:out:${now}`);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('businessChanged', null);
    return true;
  }

  /** Prices the storefront of the player's they're at the books of. */
  setPrices(level: PriceLevel, now: number): boolean {
    const rules = this.rules.life.economy.business;
    const view = this.books();
    const mine = view ? this.life.owned?.[view.building.id] : undefined;
    if (!rules || !view || !mine || !rules.levels[level] || mine.prices === level || this.detained(now)) return false;
    mine.prices = level;
    this.businessLine(rules.lines.prices, { place: view.building.name, level }, `${view.building.id}:${level}:${now}`);
    this.events.emit('businessChanged', null);
    return true;
  }

  /** Sells the storefront of the player's they're at the books of, for what it fetches, into the account; its boss runs it for themselves again. */
  sellBusiness(now: number): boolean {
    const rules = this.rules.life.economy.business;
    const view = this.books();
    if (!rules || !view || view.opening || this.detained(now)) return false;
    delete this.life.owned?.[view.building.id];
    this.money = { ...this.money, account: this.money.account + view.worth };
    this.businessLine(rules.lines.sold, { place: view.building.name, amount: String(view.worth) }, `${view.building.id}:sold:${now}`);
    this.events.emit('walletChanged', this.wallet);
    this.events.emit('businessChanged', null);
    return true;
  }

  /**
   * After the days are lived: what each storefront of the player's made over its reserve on payday,
   * into the account; one that went under is theirs no longer (what was left in its till comes to
   * them); and a till short of its wages says so, each payday running.
   */
  private businessDays(): void {
    const rules = this.rules.life.economy.business;
    const owned = this.life.owned;
    if (!rules || !owned) return;
    let changed = false;
    for (const [id, mine] of Object.entries(owned)) {
      const place = this.buildingOf(id);
      const name = place?.name ?? 'Your place';
      const due = Math.floor(mine.due);
      if (due > 0) {
        this.money = { ...this.money, account: this.money.account + due };
        changed = true;
      }
      mine.due = 0;
      if (mine.lost !== undefined || !place) {
        this.businessLine(rules.lines.lost, { place: name }, `${id}:lost:${mine.lost ?? 0}`);
        if (due > 0) this.businessLine(rules.lines.left, { place: name, amount: String(due) }, `${id}:left:${mine.lost ?? 0}`);
        delete owned[id];
        changed = true;
        continue;
      }
      if (due > 0) this.businessLine(rules.lines.profit, { place: name, amount: String(due) }, `${id}:profit:${this.life.day}`);
      const lean = this.life.tills[id]?.lean ?? 0;
      if (lean > (mine.told ?? 0)) this.businessLine(rules.lines.short, { place: name, weeks: String(lean), under: String(this.rules.life.economy.hard?.close.weeks ?? lean) }, `${id}:short:${this.life.day}`);
      if (lean !== (mine.told ?? 0)) changed = true;
      if (lean) mine.told = lean;
      else delete mine.told;
    }
    if (changed) {
      this.events.emit('walletChanged', this.wallet);
      this.events.emit('businessChanged', null);
    }
  }

  // ───────────── Trade ─────────────

  /** The counter here as a buyer: what it deals in, its share, its tier, what's in its till, its shelves' factor, and the haggling (null: nobody buys here, it's shut, or the player is barred). */
  private buyerHere(now: number): { building: Building; buys: TradeKind[]; share: number; fence: number; tier: Quality; till: number; factor: number; haggle: number } | null {
    const rules = this.rules.trade;
    const at = this.inside;
    if (!rules || !at?.business || !this.atCounter() || this.detained(now) || this.fighting) return null;
    const buys = rules.buys[at.business];
    if (!buys || !this.counterOpen(at, now) || this.barred(now)) return null;
    const till = this.life.tills[at.id];
    return {
      building: at,
      buys,
      share: rules.shares[at.business] ?? rules.share,
      fence: rules.fences[at.business] ?? 0,
      tier: this.tierOf(at),
      till: Math.max(0, Math.floor(till?.cash ?? 0)),
      factor: priceFactor(stockOf(till), this.trade(at).health, this.rules.life.economy),
      haggle: this.haggleFactor(at, now),
    };
  }

  /** What the counter here would give for one of a thing (a box's worth of rounds, or what's left of one), and how many that is; null if it doesn't deal in it. */
  private offerFor(item: Item, buyer: NonNullable<ReturnType<Game['buyerHere']>>): { amount: number; units: number; kind: TradeKind } | null {
    const rules = this.rules.trade;
    const valuables = this.rules.gear.valuables ?? {};
    const kind = rules ? tradeKindOf(item, this.rules.gear, this.rules.food.dishes, valuables) : null;
    if (!rules || !kind || !buyer.buys.includes(kind)) return null;
    const units = kind === 'ammo' ? Math.min(item.count, this.rules.gear.arms.ammo[item.id]?.box ?? 1) : 1;
    const worth = worthOf(item, this.rules.gear, this.rules.food.dishes, valuables) * units;
    // A fence gives a valuable its price; a store, a share of what a thing is worth, more while its shelves are short.
    // And never more than a share of what it would charge for it itself, however the haggling goes.
    const amount = kind === 'valuable' ? (worth * buyer.fence * rules.tier[buyer.tier]) / buyer.haggle : Math.min((worth * buyer.share * rules.tier[buyer.tier] * buyer.factor) / buyer.haggle, worth * buyer.factor * buyer.haggle * rules.resale);
    return { amount: Math.max(1, Math.round(amount)), units, kind };
  }

  /**
   * What the player could sell at the counter here: each thing they carry that it deals in, at
   * its offer, or why not (a gun still loaded, more than the till holds); and a valuable, which
   * only a fence takes. Null where nobody buys.
   */
  sellables(now: number): { name: string; till: number; fence: boolean; items: Array<{ id: string; from: string | undefined; name: string; kind: TradeKind; count: number; units: number; offer: number; why?: string }> } | null {
    const buyer = this.buyerHere(now);
    if (!buyer) return null;
    const valuables = this.rules.gear.valuables ?? {};
    const items: Array<{ id: string; from: string | undefined; name: string; kind: TradeKind; count: number; units: number; offer: number; why?: string }> = [];
    for (const item of this.items) {
      const offer = this.offerFor(item, buyer);
      if (!offer) {
        // A valuable anywhere but a fence: shown, so the player knows where to take it.
        if (tradeKindOf(item, this.rules.gear, this.rules.food.dishes, valuables) === 'valuable') items.push({ id: item.id, from: item.in, name: item.name, kind: 'valuable', count: item.count, units: 1, offer: 0, why: 'Only a fence' });
        continue;
      }
      const why = item.kind === 'weapon' && item.loaded ? 'Unload it first' : offer.amount > buyer.till ? 'Till too light' : undefined;
      items.push({ id: item.id, from: item.in, name: item.name, kind: offer.kind, count: item.count, units: offer.units, offer: offer.amount, ...(why ? { why } : {}) });
    }
    return { name: buyer.building.name, till: buyer.till, fence: buyer.fence > 0, items };
  }

  /** A line of the player's trade, filled in. */
  private tradeLine(pool: string[], vars: Record<string, string>, key: string, tone?: 'error'): void {
    this.say(this.narration(pool, vars, createRng(`${this.world.seed}:trade:${key}`)), tone ?? 'system');
  }

  /**
   * Sells one of a thing the player carries (a box's worth of rounds) to the counter here, out of
   * its till, in cash: onto its shelves, and Trading for the deal. A valuable only to a fence.
   */
  sell(id: string, from: string | undefined, now: number): boolean {
    const rules = this.rules.trade;
    const buyer = this.buyerHere(now);
    const item = this.items.find((i) => i.id === id && (from === undefined || i.in === from));
    if (!rules || !buyer || !item) return false;
    const place = buyer.building.name;
    const offer = this.offerFor(item, buyer);
    if (!offer) {
      if (tradeKindOf(item, this.rules.gear, this.rules.food.dishes, this.rules.gear.valuables ?? {}) === 'valuable') this.tradeLine(rules.lines.hot, { item: item.name, place }, `${buyer.building.id}:hot:${now}`, 'error');
      return false;
    }
    if (item.kind === 'weapon' && item.loaded) return false;
    const vars = { item: item.name, amount: String(offer.amount), place };
    if (offer.amount > buyer.till) {
      this.tradeLine(rules.lines.broke, vars, `${buyer.building.id}:broke:${now}`, 'error');
      return false;
    }
    // The cash, as far as the wallet and the change pocket hold it, with the thing gone from the pocket.
    const left = this.items.map((i) => (i === item ? { ...i, count: i.count - offer.units } : i)).filter((i) => i.count > 0);
    const loot = splitLoot(offer.amount, this.rules.money);
    if (loot.bills > walletRoom(this.pockets, this.money, this.rules.gear) || loot.coins > changeRoom(this.pockets, left, this.money, this.rules.gear, this.rules.food.dishes)) {
      this.tradeLine(rules.lines.noRoom, vars, `${buyer.building.id}:room:${now}`, 'error');
      return false;
    }
    item.count -= offer.units;
    if (item.count <= 0) this.items.splice(this.items.indexOf(item), 1);
    this.money = { ...this.money, bills: this.money.bills + loot.bills, coins: this.money.coins + loot.coins };
    // Out of its till, and onto its shelves.
    const till = tillOf(this.life.tills, buyer.building.id);
    till.cash = (till.cash ?? 0) - offer.amount;
    const worth = worthOf(item, this.rules.gear, this.rules.food.dishes, this.rules.gear.valuables ?? {}) * offer.units;
    const shelves = Math.max(1, this.rules.life.economy.stock.weeks * this.weekCostOf(buyer.building));
    till.stock = Math.min(1, stockOf(till) + worth / shelves);
    this.tradeCache.delete(buyer.building.id);
    this.trainTrading(this.rules.money.tradeXp ?? 0);
    this.tradeLine(offer.kind === 'valuable' ? rules.lines.fenced : rules.lines.sold, vars, `${buyer.building.id}:${item.id}:${now}`);
    this.events.emit('inventoryChanged', this.inventory);
    this.events.emit('walletChanged', this.wallet);
    return true;
  }

  /** The valuable someone has on them this week, if any (none without trade). */
  private valuableOn(person: Person, now: number): string | null {
    const rules = this.rules.trade;
    const valuables = this.rules.gear.valuables;
    if (!rules || !valuables) return null;
    const economy = this.rules.life.economy;
    const ledger = ledgerOf(person, this.world, this.population, economy, this.tierFn, this.world.seed, this.livingStaff);
    return valuableOf(person, walkOf(person, this.world), ledger.means, Math.floor(this.clockAt(now).day / 7), valuables, rules, this.world.seed);
  }

  /** Whether the player is where a building's counter is (the room you walk into); anywhere but inside a building, they are. */
  private atCounter(): boolean {
    return !this.inside || !this.rules.rooms || this.roomState === 'main';
  }

  /** Where the player can go from the room they're in: the rooms on this floor, whether each is open to them, and the floors there are. */
  roomsView(now: number): RoomsView | null {
    const rules = this.rules.rooms;
    const here = this.room();
    if (!this.inside || !rules || !here) return null;
    const rooms = roomsOn(this.inside, here.floor, rules).map((room) => ({ room, access: this.accessTo(room, now) }));
    return { room: here, floor: here.floor, floors: walkableFloors(this.inside, rules), rooms };
  }

  /** Whether the player can walk into a room: the staff's rooms are theirs alone, a home's units take being let in, a rented room the key. */
  private accessTo(room: Room, now: number): RoomAccess {
    if (room.id === this.roomState) return 'here';
    const works = this.jobs.some((j) => j.building === this.inside?.id) || Boolean(this.inside && this.owns(this.inside.id));
    if (room.kind === 'back' || room.kind === 'office') return works ? 'open' : 'staff';
    if (room.kind === 'unit') return this.homeState?.building === this.inside?.id && this.homeState?.room === room.id ? 'yours' : this.letIn.has(room.id) ? 'open' : 'locked';
    if (room.kind === 'guest') {
      const rented = this.rented(now);
      return rented && rented.building === this.inside?.id && rented.room === room.id ? 'yours' : 'locked';
    }
    return 'open';
  }

  /** Walks into another room of the building, on this floor or another: false (and why) if it isn't open to the player. */
  goRoom(id: string, now: number): boolean {
    const rules = this.rules.rooms;
    if (!this.inside || !rules || this.fighting || this.trip || this.detained(now)) return false;
    const room = roomById(this.inside, id, rules);
    if (!room || room.id === this.roomState) return false;
    const access = this.accessTo(room, now);
    const rng = createRng(`${this.world.seed}:${this.inside.id}:${room.id}:${now}`);
    const vars = { room: room.name, work: this.inside.name };
    if (access === 'staff') {
      this.say(this.narration(rules.lines.staffOnly, vars, rng), 'error');
      return false;
    }
    if (access === 'locked') {
      this.say(this.narration(room.kind === 'unit' ? rules.lines.locked : rules.lines.guestLocked, vars, rng), 'error');
      return false;
    }
    this.moveTo(room, now);
    return true;
  }

  /** Takes the stairs (or the elevator) to a floor: its corridor, or on the ground floor the room you walk in to. */
  goFloor(floor: number, now: number): boolean {
    const rules = this.rules.rooms;
    if (!this.inside || !rules || this.fighting || this.trip || this.detained(now)) return false;
    if (!Number.isInteger(floor) || floor < 1 || floor > walkableFloors(this.inside, rules)) return false;
    const room = roomById(this.inside, floor === 1 ? 'main' : `hall:${floor}`, rules);
    if (!room || room.id === this.roomState) return false;
    this.moveTo(room, now);
    return true;
  }

  private moveTo(room: Room, now: number): void {
    this.roomState = room.id;
    this.events.emit('roomChanged', room);
    this.recognize(now);
  }

  /**
   * Knocks on a unit's door. Whoever lives there and is in answers it, or doesn't: someone who
   * likes the player (or is seeing them) lets them in; someone who knows them talks through the
   * door; a stranger, or a masked face at the peephole, gets nothing. Nobody home, no answer.
   */
  knock(id: string, now: number): boolean {
    const rules = this.rules.rooms;
    const building = this.inside;
    if (!building || !rules || this.fighting || this.detained(now)) return false;
    const room = roomById(building, id, rules);
    if (!room || (room.kind !== 'unit' && room.kind !== 'guest')) return false;
    const rng = createRng(`${this.world.seed}:${building.id}:${room.id}:knock:${now}`);
    const clock = this.clockAt(now);
    const home = peopleAt(this.population, this.world, { kind: 'building', id: building.id }, clock, this.rules.food.dishes, this.rules.people.out).filter((p) => roomOf(p.person, building, p.doing, clock, this.population, rules) === room.id);
    const awake = home.filter((p) => !/asleep/.test(p.doing));
    const say = (pool: string[], vars: Record<string, string> = {}) => this.say(this.narration(pool, { room: room.name, ...vars }, rng), 'system');
    if (!home.length) {
      say(rules.lines.noAnswer);
      return true;
    }
    if (!awake.length) {
      say(rules.lines.asleep);
      return true;
    }
    const mask = this.masked();
    if (mask) {
      say(rules.lines.masked, { mask: mask.word });
      return true;
    }
    // Whoever likes the player best comes to the door.
    const warmth: Record<Stance, number> = { hostile: 0, cold: 1, wary: 2, neutral: 3, warm: 4, friend: 5 };
    const rank = (p: Person) => (this.society.romance?.with === p.id ? 9 : warmth[this.stanceOf(p, now)]);
    const door = [...awake].sort((a, b) => rank(b.person) - rank(a.person))[0]!.person;
    const stance = this.stanceOf(door, now);
    const name = this.describe(door.id, now)?.name ?? 'Someone';
    const known = knowledgeOf(this.society, door.id).met;
    if (this.society.romance?.with === door.id || stance === 'warm' || stance === 'friend') {
      this.letIn.add(room.id);
      say(rules.lines.letIn, { who: name });
      this.moveTo(room, now);
    } else if (known && stance !== 'hostile') {
      say(rules.lines.through, { who: name });
    } else {
      say(rules.lines.stranger);
    }
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

  /** The neighborhood a spot is in: a place's own, else the one its streets belong to (null for a district without them). */
  neighborhoodOf(where: Point & Partial<Whereabouts>): string | null {
    const place = where.place ? this.world.locations[where.place] : undefined;
    if (place) return place.area ?? null;
    // A building's own neighborhood, its block's (the one its name was given in), not the street outside's.
    const building = where.building ? buildingById(this.world, where.building) : undefined;
    const block = building ? blockAt(this.world.layout, { x: building.x + building.w / 2, y: building.y + building.h / 2 }) : null;
    const at = block ? { x: (block.x0 + block.x1) / 2, y: (block.y0 + block.y1) / 2 } : where;
    return subdistrictAt(Object.values(this.world.districts), at)?.subdistrict?.name ?? null;
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

/** An hour as a counter's sign would put it: "09:00", by the game's clock. */
function clockWord(at: number, clock: Clock): string {
  return `${String(clock.hour).padStart(2, '0')}:${String(new Date(at).getMinutes()).padStart(2, '0')}`;
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
