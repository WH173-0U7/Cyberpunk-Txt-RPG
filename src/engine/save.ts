import { CELLS } from './game';
import type { PocketState } from './carry';
import type { Fitted } from './cyberware';
import type { DealingState, DealState, Front } from './dealing';
import type { Runner, RunnerNews } from './crew';
import type { HabitState } from './habit';
import type { HomeState } from './home';
import type { CreditState } from './credit';
import type { HungerState } from './needs';
import type { Let, Owned } from './economy';
import type { Arms, Meter } from './combat';
import type { Lodging } from './rooms';
import type { Confrontation, Crime, Dispatch, PendingCall, PoliceState, Report, Warrant } from './police';
import type { Coverage } from './medical';
import type { Money } from './money';
import type { EnergyState } from './energy';
import type { InebriationState } from './inebriation';
import type { JobState } from './jobs';
import type { LifeState } from './life';
import { MEMORY_KINDS, type Memory } from './memory';
import type { Romance, You } from './romance';
import type { SkillState } from './skills';
import type { SocietyState } from './society';
import type { Item, ItemKind, Leg, MapState, Point, Trip, Wallet, Whereabouts, World } from './types';

const ITEM_KINDS: ReadonlySet<string> = new Set<ItemKind>(['weapon', 'ammo', 'attachment', 'cyberware', 'quickhack', 'clothing', 'consumable', 'shard', 'credchip', 'junk', 'component']);

/** Where a player has got to in their city: enough to put them back exactly there. */
export interface Progress {
  where: Whereabouts;
  visited: string[];
  discovered: string[];
  explored: number[];
  eddies: number;
  passUntil: number;
  /** A trip still underway. It keeps going on the clock while the game is closed. */
  trip: Trip | null;
  /** The building the player is inside (always the one at `where`), if any. */
  inside: string | null;
  /** What the player carries. */
  items: Item[];
  /** The pockets they carry it in (null: a save from before pockets; the player wears the usual). */
  gear: PocketState[] | null;
  /** Cash in bills and coins, and the account (null: a save from before, when `eddies` was all of it, in bills). */
  money: Money | null;
  /** The player's energy, as last written down (null: a new player's). */
  energy: EnergyState | null;
  /** The drink in the player, as last written down (null: sober). */
  inebriation: InebriationState | null;
  /** The player's dealings with the people (null: none yet). */
  society: SocietyState | null;
  /** Charisma, as last written down (null: a new player's). */
  charisma: SkillState | null;
  /** The fighting skills (null or missing: an older save, level 1). */
  brawler?: SkillState | null;
  /** Trading (null or missing: an older save, level 1). */
  trading?: SkillState | null;
  /** The Dealing and Cutting skills. */
  dealer?: SkillState | null;
  cutter?: SkillState | null;
  toughness?: SkillState | null;
  /** How well the player knows each kind of weapon and each weapon. */
  arms?: Arms | null;
  /** The room the player is in, inside a building. */
  room?: string | null;
  /** The room the player has rented for the night. */
  lodging?: Lodging | null;
  /** The player's main job (null: none); every job they hold is `jobs`. */
  job: JobState | null;
  /** Every job the player holds, the main one first (missing or null: a save from before side gigs; just `job`). */
  jobs?: JobState[] | null;
  /** Shifts worked in each line of work (missing or null: a save from before; none counted). */
  career?: Record<string, number> | null;
  /** The people's own days so far (null: none lived yet). */
  life: LifeState | null;
  /** The pronouns the player goes by (missing or null: a save from before; they go by they). */
  you?: You | null;
  /** The chrome a ripperdoc has fitted into the player (missing or null: a save from before; none). */
  chrome?: Fitted[] | null;
  /** The player's health, as last written down (missing or null: a save from before fighting; well). */
  health?: Meter | null;
  /** What the NCPD has on the player (missing or null: a save from before; nothing). */
  police?: PoliceState | null;
  /** Whether the player fights to kill (missing or null: a save from before; they don't). */
  lethal?: boolean | null;
  /** The Trauma Team plan the player signed up for (missing or null: a save from before, or none). */
  coverage?: Coverage | null;
  /** The player's dealing for a gang (missing or null: a save from before; none). */
  dealing?: DealingState | null;
  /** The player's own habit (missing or null: a save from before; none). */
  habit?: HabitState | null;
  /** Where the player lives, and what they keep there (missing or null: a save from before homes; nowhere, nothing). */
  home?: HomeState | null;
  stash?: Item[] | null;
  /** What the player owes and is owed (missing or null: a save from before; nothing either way). */
  credit?: CreditState | null;
  /** How full the player is (missing or null: a save from before hunger; fed). */
  hunger?: HungerState | null;
}

/** What a save takes from a game in progress (a `Game` has all of it). */
export interface SaveSource {
  readonly mapState: MapState;
  readonly wallet: Wallet;
  readonly currentTrip: Trip | null;
  readonly interior: { id: string } | null;
  readonly inventory: readonly Item[];
  readonly gearSaved: readonly PocketState[];
  readonly moneySaved: Money;
  readonly energySaved: EnergyState;
  readonly inebriationSaved: InebriationState;
  readonly societySaved: SocietyState;
  readonly charismaSaved: SkillState;
  readonly brawlerSaved: SkillState;
  readonly tradingSaved: SkillState;
  readonly dealerSaved: SkillState;
  readonly cutterSaved: SkillState;
  readonly toughnessSaved: SkillState;
  readonly armsSaved: Arms;
  readonly roomSaved: string | null;
  readonly lodgingSaved: Lodging | null;
  readonly jobSaved: JobState | null;
  readonly jobsSaved: readonly JobState[];
  readonly careerSaved: Record<string, number>;
  readonly lifeSaved: LifeState;
  readonly youSaved: You;
  readonly chromeSaved: readonly Fitted[];
  readonly healthSaved: Meter;
  readonly policeSaved: PoliceState;
  readonly lethal: boolean;
  readonly coverageSaved: Coverage | null;
  readonly dealingSaved: DealingState;
  readonly habitSaved: HabitState;
  readonly homeSaved: HomeState | null;
  readonly stashSaved: readonly Item[];
  readonly creditSaved: CreditState;
  readonly hungerSaved: HungerState;
}

/** What gets written to the player's device. The city itself is rebuilt from its seed. */
export interface SaveData extends Progress {
  /** Save format. */
  version: 2;
  /** `GENERATOR_VERSION` when saved. A different one means the seed no longer builds this city. */
  generator: number;
  seed: string;
  /** Milliseconds since 1970. */
  savedAt: number;
}

export function createSave(seed: string, game: SaveSource, generator: number, now = Date.now()): SaveData {
  const { mapState: state, wallet } = game;
  return {
    version: 2,
    generator,
    seed,
    where: { ...state.where },
    visited: [...state.visited].sort(),
    discovered: [...state.discovered].sort(),
    explored: [...state.explored].sort((a, b) => a - b),
    eddies: wallet.eddies,
    passUntil: wallet.passUntil,
    trip: game.currentTrip,
    inside: game.interior?.id ?? null,
    items: game.inventory.map((item) => ({ ...item })),
    gear: game.gearSaved.map((pocket) => ({ ...pocket })),
    money: { ...game.moneySaved },
    energy: { ...game.energySaved },
    inebriation: { ...game.inebriationSaved },
    society: game.societySaved,
    charisma: { ...game.charismaSaved },
    brawler: { ...game.brawlerSaved },
    trading: { ...game.tradingSaved },
    dealer: { ...game.dealerSaved },
    cutter: { ...game.cutterSaved },
    toughness: { ...game.toughnessSaved },
    arms: game.armsSaved,
    room: game.roomSaved,
    lodging: game.lodgingSaved,
    job: game.jobSaved ? { ...game.jobSaved } : null,
    jobs: game.jobsSaved.map((j) => ({ ...j })),
    career: { ...game.careerSaved },
    life: game.lifeSaved,
    you: { ...game.youSaved },
    chrome: game.chromeSaved.map((f) => ({ ...f })),
    health: { ...game.healthSaved },
    police: game.policeSaved,
    lethal: game.lethal,
    coverage: game.coverageSaved ? { ...game.coverageSaved } : null,
    dealing: game.dealingSaved,
    habit: game.habitSaved,
    home: game.homeSaved ? { ...game.homeSaved } : null,
    stash: game.stashSaved.map((item) => ({ ...item })),
    credit: game.creditSaved,
    hunger: { ...game.hungerSaved },
    savedAt: now,
  };
}

/** The seed of anything that looks like a save, even an old one, so its city can start over. */
export function savedSeed(raw: unknown): string | null {
  const seed = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).seed : null;
  return typeof seed === 'string' && /^[0-9a-f]{8}$/.test(seed) ? seed : null;
}

/** Reads back something that was saved, or null if it isn't a save this game understands. */
export function readSave(raw: unknown): SaveData | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const save = raw as Record<string, unknown>;
  const seed = savedSeed(raw);
  if (save.version !== 2 || !seed) return null;
  if (!isNumber(save.generator) || !isNumber(save.savedAt) || !isNumber(save.eddies) || !isNumber(save.passUntil)) return null;
  if (!isWhereabouts(save.where) || !isStrings(save.visited) || !isStrings(save.discovered) || !isNumbers(save.explored)) return null;
  if (save.trip !== null && !isTrip(save.trip)) return null;
  return {
    version: 2,
    generator: save.generator,
    seed,
    where: save.where,
    visited: save.visited,
    discovered: save.discovered,
    explored: save.explored,
    eddies: save.eddies,
    passUntil: save.passUntil,
    trip: save.trip,
    // Saves from before buildings could be entered don't have it: the player was outside.
    inside: typeof save.inside === 'string' ? save.inside : null,
    // Nor do saves from before the inventory: the player carried nothing. Anything unreadable is dropped.
    items: Array.isArray(save.items) ? save.items.filter(isItem) : [],
    gear: Array.isArray(save.gear) ? save.gear.filter(isPocket) : null,
    money: isMoney(save.money) ? save.money : null,
    // And saves from before energy start the player off fresh, and before drink, sober.
    energy: isEnergy(save.energy) ? save.energy : null,
    inebriation: isInebriation(save.inebriation) ? save.inebriation : null,
    // And before there were people to deal with, nobody knew the player (and before they could be known of, no one was).
    society: isSociety(save.society)
      ? {
          ...save.society,
          // Anything in it that isn't a record of something is dropped rather than tripped over.
          standings: objectsIn(save.society.standings),
          incidents: save.society.incidents.filter(isObject),
          threats: save.society.threats.filter(isObject),
          known: knownOf(save.society.known),
          links: save.society.links ?? {},
          memories: memoriesOf(save.society.memories),
          romance: romanceOf(save.society.romance),
        }
      : null,
    charisma: isSkill(save.charisma) ? save.charisma : null,
    brawler: isSkill(save.brawler) ? save.brawler : null,
    trading: isSkill(save.trading) ? save.trading : null,
    dealer: isSkill(save.dealer) ? save.dealer : null,
    cutter: isSkill(save.cutter) ? save.cutter : null,
    toughness: isSkill(save.toughness) ? save.toughness : null,
    arms: armsOf(save.arms),
    room: typeof save.room === 'string' ? save.room : null,
    lodging: isLodging(save.lodging) ? save.lodging : null,
    // And before there was work, the player had none.
    job: isJob(save.job) ? save.job : null,
    jobs: Array.isArray(save.jobs) ? save.jobs.filter(isJob).map(jobOf) : null,
    career: isObject(save.career) ? Object.fromEntries(Object.entries(save.career).filter(([, n]) => isNumber(n) && n >= 0)) as Record<string, number> : null,
    // And before the people had days of their own, none had passed.
    life: isLife(save.life) ? { ...save.life, events: save.life.events.filter((e) => isObject(e) && Array.isArray(e.who)), ...(save.life.owned !== undefined ? { owned: ownedOf(save.life.owned) } : {}), ...(save.life.lets !== undefined ? { lets: letsOf(save.life.lets) } : {}) } : null,
    // And before the player said who they are, they went by they.
    you: isYou(save.you) ? save.you : null,
    // And before there was chrome, the player had none; an implant that isn't one is dropped.
    chrome: Array.isArray(save.chrome) ? save.chrome.filter(isFitted) : null,
    // And before there was fighting, the player was well; before the NCPD, nobody was looking for them.
    health: isMeter(save.health) ? save.health : null,
    police: policeOf(save.police),
    lethal: typeof save.lethal === 'boolean' ? save.lethal : null,
    // And before Trauma Team, nobody was signed up.
    coverage: isCoverage(save.coverage) ? save.coverage : null,
    // And before dealing, the player dealt for nobody.
    dealing: dealingOf(save.dealing),
    habit: habitOf(save.habit),
    // And before homes, the player had none, and kept nothing anywhere.
    home: isHome(save.home) ? save.home : null,
    stash: Array.isArray(save.stash) ? save.stash.filter(isItem) : null,
    // And before borrowing and lending, nobody owed anybody.
    credit: creditOf(save.credit),
    // And before hunger, the player had just eaten.
    hunger: isHunger(save.hunger) ? save.hunger : null,
    savedAt: save.savedAt,
  };
}

/**
 * What a save picks up with in this build: nothing when another version of the generator made
 * it (the seed no longer builds the city it knew, so the game starts that city over), or when
 * it doesn't fit the city (see `resume`).
 */
export function progressFor(world: World, save: SaveData, generator: number): Progress | null {
  return save.generator === generator ? resume(world, save) : null;
}

/** The progress in a save, checked against the city rebuilt from its seed. Null if they don't match. */
export function resume(world: World, save: SaveData): Progress | null {
  const known = (id: string) => id in world.locations;
  const fits = (w: Whereabouts) =>
    (!w.place || known(w.place)) && (!w.station || w.station in world.transit.stations) && (!w.building || world.buildings.some((b) => b.id === w.building));
  if (save.seed !== world.seed || !fits(save.where) || (save.trip && !fits(save.trip.to))) return null;
  if (!save.visited.every(known) || !save.discovered.every(known)) return null;
  if (!save.explored.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < CELLS * CELLS)) return null;
  const { where, visited, discovered, explored, eddies, passUntil, trip, items, gear, money, energy, inebriation, society, charisma, brawler, trading, dealer, cutter, toughness, arms, room, lodging, job, jobs, career, life, you, chrome, health, police, lethal, coverage, dealing, habit, home, stash, credit, hunger } = save;
  const exists = (j: JobState) => world.buildings.some((b) => b.id === j.building);
  const here = where.place && !trip && !visited.includes(where.place) ? [where.place] : [];
  // Only ever inside the building the player stands at, and never mid-trip.
  const inside = !trip && save.inside && save.inside === where.building ? save.inside : null;
  // A job at a building this city doesn't have is no job.
  return { where, visited: [...visited, ...here], discovered, explored, eddies, passUntil, trip, inside, items, gear, money, energy, inebriation, society, charisma, brawler: brawler ?? null, trading: trading ?? null, dealer: dealer ?? null, cutter: cutter ?? null, toughness: toughness ?? null, arms: arms ?? null, room: room ?? null, lodging: lodging ?? null, job: job && exists(job) ? job : null, ...(jobs ? { jobs: jobs.filter(exists) } : {}), career: career ?? null, life, you: you ?? null, chrome: chrome ?? null, health: health ?? null, police: police ?? null, lethal: lethal ?? null, coverage: coverage ?? null, dealing: dealing ?? null, habit: habit ?? null, home: home && world.buildings.some((b) => b.id === home.building) ? home : null, stash: stash ?? null, credit: credit ? { ...credit, bank: credit.bank && world.buildings.some((b) => b.id === credit.bank?.bank) ? credit.bank : null } : null, hunger: hunger ?? null };
}

const CRIMES: ReadonlySet<string> = new Set<Crime>(['assault', 'robbery', 'murder', 'possession', 'dealing']);

function isSpot(value: unknown): boolean {
  return isObject(value) && (value.kind === 'building' || value.kind === 'location') && typeof value.id === 'string';
}

function isRange(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isNumber);
}

/** What the NCPD has on the player, as saved: anything in it that isn't a record of something is dropped. */
function policeOf(value: unknown): PoliceState | null {
  if (!isObject(value)) return null;
  const crime = (v: unknown) => typeof v === 'string' && CRIMES.has(v);
  const list = <T>(v: unknown, ok: (x: Record<string, unknown>) => boolean) => (Array.isArray(v) ? v.filter((x): x is T => isObject(x) && ok(x)) : []);
  const d = value.dispatch;
  const c = value.confront;
  return {
    reports: list<Report>(value.reports, (r) => isNumber(r.id) && crime(r.crime) && isNumber(r.at) && typeof r.district === 'string' && typeof r.place === 'string' && typeof r.named === 'boolean' && typeof r.seen === 'string'),
    dispatch: isObject(d) && isNumber(d.report) && crime(d.crime) && (d.spot === null || isSpot(d.spot)) && isNumber(d.x) && isNumber(d.y) && isNumber(d.arriveAt) && isStrings(d.officers) ? { ...(d as unknown as Dispatch), told: d.told === true } : null,
    warrants: list<Warrant>(value.warrants, (w) => crime(w.crime) && typeof w.district === 'string' && isNumber(w.since) && (w.until === null || isNumber(w.until))),
    held: isNumber(value.held) ? value.held : null,
    confront: isObject(c) && isStrings(c.officers) && crime(c.crime) && (c.why === 'scene' || c.why === 'warrant' || c.why === 'search') && isNumber(c.at) ? (c as unknown as Confrontation) : null,
    pending: list<PendingCall>(value.pending, (q) => typeof q.person === 'string' && crime(q.crime) && isNumber(q.at) && typeof q.named === 'boolean' && typeof q.seen === 'string' && isNumber(q.odds) && typeof q.district === 'string' && isRange(q.minutes) && isSpot(q.spot) && isNumber(q.x) && isNumber(q.y)),
    lastStop: isNumber(value.lastStop) ? value.lastStop : 0,
    nextId: isNumber(value.nextId) ? value.nextId : 1,
  };
}

/** The player's dealing, as far as a save's record of it is one: a deal that isn't one is dropped. */
function dealingOf(value: unknown): DealingState | null {
  if (!isObject(value)) return null;
  const deal = (v: unknown): DealState | null => {
    if (!isObject(v) || typeof v.gang !== 'string' || typeof v.connect !== 'string' || !isNumber(v.rung) || !isNumber(v.trust)) return null;
    const f = v.front;
    const front = isObject(f) && typeof f.drug === 'string' && isNumber(f.doses) && isNumber(f.owed) && isNumber(f.paid) && isNumber(f.at) && isNumber(f.due) ? (f as unknown as Front) : null;
    const block = isObject(v.block) && isNumber(v.block.key) && isNumber(v.block.served) ? { key: v.block.key, served: v.block.served } : { key: -1, served: 0 };
    const customers = isObject(v.customers) ? Object.fromEntries(Object.entries(v.customers).filter(([, c]) => isObject(c) && isNumber(c.bought) && isNumber(c.last))) as DealState['customers'] : {};
    const n = (x: unknown) => (isNumber(x) ? x : 0);
    return { gang: v.gang, connect: v.connect, rung: v.rung, trust: v.trust, corner: typeof v.corner === 'string' ? v.corner : null, front, debt: n(v.debt), debtAt: n(v.debtAt), collectAt: isNumber(v.collectAt) ? v.collectAt : null, collections: n(v.collections), fronts: n(v.fronts), sold: n(v.sold), take: n(v.take), customers, block, ...(isNumber(v.heat) ? { heat: v.heat } : {}), ...(isNumber(v.heatAt) ? { heatAt: v.heatAt } : {}), ...(isNumber(v.yielded) ? { yielded: v.yielded } : {}) };
  };
  const strings = (v: unknown) => (isObject(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string')) as Record<string, string> : {});
  const numbers = (v: unknown) => (isObject(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => isNumber(x))) as Record<string, number> : {});
  const past = isObject(value.past) ? Object.fromEntries(Object.entries(value.past).flatMap(([k, v]) => { const d = deal(v); return d ? [[k, d]] : []; })) : {};
  const runner = (v: unknown): Runner | null => {
    if (!isObject(v) || !isNumber(v.since) || !isNumber(v.stock) || !isNumber(v.owed) || !isNumber(v.paid) || !isNumber(v.cash) || !isNumber(v.day) || !isNumber(v.mood)) return null;
    const n = (x: unknown) => (isNumber(x) ? x : 0);
    const news = Array.isArray(v.news) ? v.news.filter((e): e is RunnerNews => isObject(e) && (e.kind === 'busted' || e.kind === 'robbed' || e.kind === 'hurt') && isNumber(e.day)) : [];
    return {
      since: v.since, drug: typeof v.drug === 'string' ? v.drug : null, stock: v.stock, fronted: n(v.fronted), owed: v.owed, paid: v.paid, due: isNumber(v.due) ? v.due : null, cash: v.cash, fronts: n(v.fronts), shorted: n(v.shorted), day: v.day, mood: v.mood, news,
      ...(isNumber(v.heldTill) ? { heldTill: v.heldTill } : {}), ...(isNumber(v.hidden) ? { hidden: v.hidden } : {}), ...(v.quit === true ? { quit: true } : {}), ...(v.ran === true ? { ran: true } : {}),
    };
  };
  const crew = isObject(value.crew) ? Object.fromEntries(Object.entries(value.crew).flatMap(([k, v]) => { const r = runner(v); return r ? [[k, r]] : []; })) : {};
  const harms = Array.isArray(value.harms) ? value.harms.filter((h): h is DealingState['harms'][number] => isObject(h) && typeof h.id === 'string' && typeof h.drug === 'string' && isNumber(h.day) && typeof h.deadly === 'boolean' && typeof h.knew === 'boolean') : [];
  return { current: deal(value.current), vouched: strings(value.vouched), past, burned: numbers(value.burned), corners: strings(value.corners), crew, dealt: numbers(value.dealt), harms };
}

/** The player's habit, as far as a save's record of it is one. */
function habitOf(value: unknown): HabitState | null {
  if (!isObject(value)) return null;
  const drugs = isObject(value.drugs)
    ? Object.fromEntries(Object.entries(value.drugs).flatMap(([id, u]) => (isObject(u) && isNumber(u.dependence) && isNumber(u.last) ? [[id, { dependence: u.dependence, last: u.last, recent: Array.isArray(u.recent) ? u.recent.filter(isNumber) : [] }]] : [])))
    : {};
  const active = Array.isArray(value.active) ? value.active.filter((a): a is HabitState['active'][number] => isObject(a) && typeof a.drug === 'string' && isNumber(a.until) && isNumber(a.strength)) : [];
  const n = (x: unknown) => (isNumber(x) ? x : 0);
  return { drugs, active, nerve: n(value.nerve), edge: n(value.edge), edgeAt: n(value.edgeAt), ...(typeof value.told === 'string' ? { told: value.told } : {}), ...(isNumber(value.drainAt) ? { drainAt: value.drainAt } : {}), ...(isNumber(value.snapAt) ? { snapAt: value.snapAt } : {}) };
}

function isCoverage(value: unknown): value is Coverage {
  return isObject(value) && typeof value.plan === 'string' && typeof value.until === 'number' && Number.isFinite(value.until);
}

function isItem(value: unknown): value is Item {
  const item = value as Record<string, unknown> | null;
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.kind === 'string' &&
    ITEM_KINDS.has(item.kind) &&
    Number.isInteger(item.count) &&
    (item.count as number) > 0 &&
    (item.in === undefined || typeof item.in === 'string') &&
    (item.balance === undefined || (isNumber(item.balance) && item.balance >= 0)) &&
    (item.locked === undefined || typeof item.locked === 'boolean') &&
    (item.gear === undefined || typeof item.gear === 'string') &&
    (item.weapon === undefined || typeof item.weapon === 'string') &&
    (item.loaded === undefined || (Number.isInteger(item.loaded) && (item.loaded as number) >= 0)) &&
    (item.cut === undefined || (isNumber(item.cut) && item.cut >= 0 && item.cut <= 1))
  );
}

function isMeter(value: unknown): value is Meter {
  const meter = value as Record<string, unknown> | null;
  return typeof meter === 'object' && meter !== null && isNumber(meter.value) && meter.value >= 0 && isNumber(meter.at);
}

function isFitted(value: unknown): value is Fitted {
  const fitted = value as Record<string, unknown> | null;
  return typeof fitted === 'object' && fitted !== null && typeof fitted.id === 'string' && isNumber(fitted.since);
}

function isYou(value: unknown): value is You {
  const you = value as Record<string, unknown> | null;
  return typeof you === 'object' && you !== null && (you.pronouns === 'she' || you.pronouns === 'he' || you.pronouns === 'they');
}

/** Who the player is seeing, if it makes sense; else no one. */
function romanceOf(value: unknown): Romance | null {
  const r = value as Record<string, unknown> | null;
  if (typeof r !== 'object' || r === null) return null;
  if (typeof r.with !== 'string' || (r.stage !== 'dating' && r.stage !== 'together') || !isNumber(r.since) || !isNumber(r.lastDateAt) || !Number.isInteger(r.dates) || (r.dates as number) < 0) return null;
  const caught = Number.isInteger(r.caught) && (r.caught as number) > 0 ? { caught: r.caught as number } : {};
  return { with: r.with, stage: r.stage, since: r.since, dates: r.dates as number, lastDateAt: r.lastDateAt, ...caught };
}

function isMoney(value: unknown): value is Money {
  const m = value as Record<string, unknown> | null;
  return typeof m === 'object' && m !== null && isNumber(m.bills) && m.bills >= 0 && isNumber(m.coins) && m.coins >= 0 && isNumber(m.account) && m.account >= 0;
}

function isPocket(value: unknown): value is PocketState {
  const p = value as Record<string, unknown> | null;
  return typeof p === 'object' && p !== null && typeof p.id === 'string' && typeof p.kind === 'string' && (p.in === null || typeof p.in === 'string');
}

function isEnergy(value: unknown): value is EnergyState {
  const e = value as Record<string, unknown> | null;
  return (
    typeof e === 'object' &&
    e !== null &&
    isNumber(e.current) &&
    e.current >= 0 &&
    Number.isInteger(e.level) &&
    (e.level as number) >= 1 &&
    isNumber(e.xp) &&
    e.xp >= 0 &&
    isNumber(e.updatedAt) &&
    (e.rate === undefined || (isNumber(e.rate) && e.rate > 0))
  );
}

function isHunger(value: unknown): value is HungerState {
  const h = value as Record<string, unknown> | null;
  return typeof h === 'object' && h !== null && isNumber(h.value) && h.value >= 0 && h.value <= 100 && isNumber(h.updatedAt) && h.updatedAt >= 0;
}

/** What's known of each person, with the facts and the log that older saves don't have. */
function knownOf(known: SocietyState['known'] | undefined): SocietyState['known'] {
  const out: SocietyState['known'] = {};
  for (const [id, k] of Object.entries(known ?? {})) {
    if (!isObject(k)) continue;
    const { said, ...rest } = k;
    out[id] = { ...rest, facts: Array.isArray(k.facts) ? k.facts : [], log: Array.isArray(k.log) ? k.log : [], ...(Array.isArray(said) ? { said } : {}) };
  }
  return out;
}

function isObject(value: unknown): value is Record<string, unknown> & object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The entries of a record that are records themselves. */
function objectsIn<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => isObject(v)));
}

/** The weapon levels, as far as they read: a kind or a weapon whose level doesn't is forgotten (starting again from the first). */
function armsOf(value: unknown): Arms | null {
  if (!isObject(value)) return null;
  const levels = (record: unknown): Record<string, SkillState> => (isObject(record) ? Object.fromEntries(Object.entries(record).filter((e): e is [string, SkillState] => isSkill(e[1]))) : {});
  return { types: levels(value.types), models: levels(value.models) };
}

/** What people remember of the player, as far as it reads: older saves have none, and anything unreadable is forgotten. */
function memoriesOf(memories: unknown): SocietyState['memories'] {
  const out: SocietyState['memories'] = {};
  if (typeof memories !== 'object' || memories === null || Array.isArray(memories)) return out;
  for (const [id, list] of Object.entries(memories as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const kept = list.filter((m): m is Memory => typeof m === 'object' && m !== null && MEMORY_KINDS.has((m as Memory).kind) && isNumber((m as Memory).at) && Number.isInteger((m as Memory).times) && Number.isInteger((m as Memory).said));
    if (kept.length) out[id] = kept;
  }
  return out;
}

function isLife(value: unknown): value is LifeState {
  const l = value as Record<string, unknown> | null;
  if (typeof l !== 'object' || l === null) return false;
  const record = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  const optional = (v: unknown) => v === undefined || record(v);
  return (
    Number.isInteger(l.day) &&
    Number.isInteger(l.nextId) &&
    Array.isArray(l.events) &&
    record(l.eddies) &&
    record(l.hurt) &&
    record(l.hates) &&
    Array.isArray(l.made) &&
    Array.isArray(l.broken) &&
    [l.chips, l.tills, l.treasuries, l.jobs, l.gangs, l.dead, l.since].every(optional)
  );
}

/** A job as read: only the extras that read right (the roster's weekdays, what's owed, the raise, the days missed and checked). */
function jobOf(j: JobState): JobState {
  const { building, rung, trust, shifts, lastShiftDay } = j;
  const days = Array.isArray(j.days) ? j.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : undefined;
  const count = (n: unknown) => (isNumber(n) && n >= 0 ? n : undefined);
  const extras = { days: days?.length ? days : undefined, owed: count(j.owed), raise: count(j.raise), missed: count(j.missed), checked: Number.isInteger(j.checked) ? j.checked : undefined, paidOn: Number.isInteger(j.paidOn) ? j.paidOn : undefined, heard: typeof j.heard === 'boolean' ? j.heard : undefined, uniform: j.uniform === true ? true : undefined };
  return { building, rung, trust, shifts, lastShiftDay, ...Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined)) };
}

function isJob(value: unknown): value is JobState {
  const j = value as Record<string, unknown> | null;
  return typeof j === 'object' && j !== null && typeof j.building === 'string' && Number.isInteger(j.rung) && (j.rung as number) >= 0 && isNumber(j.trust) && j.trust >= 0 && Number.isInteger(j.shifts) && (j.shifts as number) >= 0 && Number.isInteger(j.lastShiftDay);
}

/** What the player owes and is owed, as saved: a loan that isn't one is dropped, and so is a debt to someone with no amount. */
function creditOf(value: unknown): CreditState | null {
  if (!isObject(value)) return null;
  const bank = isObject(value.bank) && typeof value.bank.bank === 'string' && isNumber(value.bank.owed) && isNumber(value.bank.installment) && isNumber(value.bank.due) && isNumber(value.bank.missed) && isNumber(value.bank.since) ? (value.bank as unknown as CreditState['bank']) : null;
  const shark = isObject(value.shark) && typeof value.shark.gang === 'string' && isNumber(value.shark.owed) && isNumber(value.shark.borrowed) && isNumber(value.shark.since) && isNumber(value.shark.paid) && isNumber(value.shark.due) ? (value.shark as unknown as CreditState['shark']) : null;
  const lent: CreditState['lent'] = {};
  if (isObject(value.lent)) for (const [id, l] of Object.entries(value.lent)) if (isObject(l) && isNumber(l.owed) && isNumber(l.since) && isNumber(l.paid) && isNumber(l.due)) lent[id] = l as unknown as CreditState['lent'][string];
  return { bank, barred: value.barred === true, shark, lent };
}

/** The storefronts the player owns, as saved: one that isn't one is dropped. */
function ownedOf(value: unknown): Record<string, Owned> {
  const owned: Record<string, Owned> = {};
  if (!isObject(value)) return owned;
  for (const [id, o] of Object.entries(value)) {
    if (isObject(o) && isNumber(o.since) && isNumber(o.due) && (o.prices === 'low' || o.prices === 'fair' || o.prices === 'high') && (o.lost === undefined || isNumber(o.lost)) && (o.told === undefined || isNumber(o.told))) owned[id] = o as unknown as Owned;
  }
  return owned;
}

/** The blocks' rents as read: only the ones that read right. */
function letsOf(value: unknown): Record<string, Let> {
  const lets: Record<string, Let> = {};
  if (!isObject(value)) return lets;
  const count = (n: unknown) => Number.isInteger(n) && (n as number) >= 0;
  for (const [id, l] of Object.entries(value)) {
    if (isObject(l) && isNumber(l.level) && l.level > 0 && l.level < 10 && count(l.paid) && count(l.short)) lets[id] = l as unknown as Let;
  }
  return lets;
}

function isHome(value: unknown): value is HomeState {
  return isObject(value) && typeof value.building === 'string' && typeof value.room === 'string' && isNumber(value.rent) && isNumber(value.since) && isNumber(value.due) && isNumber(value.owed) && typeof value.squat === 'boolean' && (value.warned === undefined || isNumber(value.warned));
}

function isLodging(value: unknown): value is Lodging {
  return isObject(value) && typeof value.building === 'string' && typeof value.room === 'string' && isNumber(value.until);
}

function isSkill(value: unknown): value is SkillState {
  const s = value as Record<string, unknown> | null;
  return typeof s === 'object' && s !== null && Number.isInteger(s.level) && (s.level as number) >= 1 && isNumber(s.xp) && s.xp >= 0;
}

function isSociety(value: unknown): value is SocietyState {
  const s = value as Record<string, unknown> | null;
  if (typeof s !== 'object' || s === null) return false;
  const record = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  return record(s.standings) && record(s.rep) && Array.isArray(s.incidents) && Array.isArray(s.threats) && Number.isInteger(s.nextId);
}

function isInebriation(value: unknown): value is InebriationState {
  const d = value as Record<string, unknown> | null;
  return typeof d === 'object' && d !== null && isNumber(d.units) && d.units >= 0 && isNumber(d.updatedAt);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

function isPoint(value: unknown): value is Point {
  const p = value as Record<string, unknown> | null;
  return typeof p === 'object' && p !== null && isNumber(p.x) && isNumber(p.y);
}

function isWhereabouts(value: unknown): value is Whereabouts {
  if (!isPoint(value)) return false;
  const w = value as unknown as Record<string, unknown>;
  const idOrNull = (v: unknown) => v === null || typeof v === 'string';
  return idOrNull(w.place) && idOrNull(w.station) && idOrNull(w.building);
}

function isLeg(value: unknown): value is Leg {
  const leg = value as Record<string, unknown> | null;
  if (typeof leg !== 'object' || leg === null) return false;
  const kindOk = leg.kind === 'walk' || leg.kind === 'wait' || leg.kind === 'ride';
  const pathOk = Array.isArray(leg.path) && leg.path.length > 0 && leg.path.every(isPoint);
  return kindOk && pathOk && isNumber(leg.minutes) && (leg.stations === undefined || isStrings(leg.stations));
}

function isTrip(value: unknown): value is Trip {
  const trip = value as Record<string, unknown> | null;
  if (typeof trip !== 'object' || trip === null) return false;
  return (
    (trip.mode === 'foot' || trip.mode === 'ncart') &&
    isPoint(trip.from) &&
    isWhereabouts(trip.to) &&
    Array.isArray(trip.legs) &&
    trip.legs.length > 0 &&
    trip.legs.every(isLeg) &&
    isNumber(trip.minutes) &&
    isNumber(trip.fare) &&
    isNumber(trip.startedAt) &&
    isNumber(trip.endsAt)
  );
}
