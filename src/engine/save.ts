import { CELLS } from './game';
import type { PocketState } from './carry';
import type { Money } from './money';
import type { EnergyState } from './energy';
import type { InebriationState } from './inebriation';
import type { JobState } from './jobs';
import type { LifeState } from './life';
import type { Memory } from './memory';
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
  /** The player's job (null: none). */
  job: JobState | null;
  /** The people's own days so far (null: none lived yet). */
  life: LifeState | null;
  /** The pronouns the player goes by (missing or null: a save from before; they go by they). */
  you?: You | null;
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
  readonly jobSaved: JobState | null;
  readonly lifeSaved: LifeState;
  readonly youSaved: You;
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
    job: game.jobSaved ? { ...game.jobSaved } : null,
    life: game.lifeSaved,
    you: { ...game.youSaved },
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
    society: isSociety(save.society) ? { ...save.society, known: knownOf(save.society.known), links: save.society.links ?? {}, memories: memoriesOf(save.society.memories), romance: romanceOf(save.society.romance) } : null,
    charisma: isSkill(save.charisma) ? save.charisma : null,
    // And before there was work, the player had none.
    job: isJob(save.job) ? save.job : null,
    // And before the people had days of their own, none had passed.
    life: isLife(save.life) ? save.life : null,
    // And before the player said who they are, they went by they.
    you: isYou(save.you) ? save.you : null,
    savedAt: save.savedAt,
  };
}

/** The progress in a save, checked against the city rebuilt from its seed. Null if they don't match. */
export function resume(world: World, save: SaveData): Progress | null {
  const known = (id: string) => id in world.locations;
  const fits = (w: Whereabouts) =>
    (!w.place || known(w.place)) && (!w.station || w.station in world.transit.stations) && (!w.building || world.buildings.some((b) => b.id === w.building));
  if (save.seed !== world.seed || !fits(save.where) || (save.trip && !fits(save.trip.to))) return null;
  if (!save.visited.every(known) || !save.discovered.every(known)) return null;
  if (!save.explored.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < CELLS * CELLS)) return null;
  const { where, visited, discovered, explored, eddies, passUntil, trip, items, gear, money, energy, inebriation, society, charisma, job, life, you } = save;
  const here = where.place && !trip && !visited.includes(where.place) ? [where.place] : [];
  // Only ever inside the building the player stands at, and never mid-trip.
  const inside = !trip && save.inside && save.inside === where.building ? save.inside : null;
  // A job at a building this city doesn't have is no job.
  return { where, visited: [...visited, ...here], discovered, explored, eddies, passUntil, trip, inside, items, gear, money, energy, inebriation, society, charisma, job: job && world.buildings.some((b) => b.id === job.building) ? job : null, life, you: you ?? null };
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
    (item.loaded === undefined || (Number.isInteger(item.loaded) && (item.loaded as number) >= 0))
  );
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
  return { with: r.with, stage: r.stage, since: r.since, dates: r.dates as number, lastDateAt: r.lastDateAt };
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
    isNumber(e.updatedAt)
  );
}

/** What's known of each person, with the facts and the log that older saves don't have. */
function knownOf(known: SocietyState['known'] | undefined): SocietyState['known'] {
  const out: SocietyState['known'] = {};
  for (const [id, k] of Object.entries(known ?? {})) out[id] = { ...k, facts: Array.isArray(k.facts) ? k.facts : [], log: Array.isArray(k.log) ? k.log : [] };
  return out;
}

/** What people remember of the player, as far as it reads: older saves have none, and anything unreadable is forgotten. */
function memoriesOf(memories: unknown): SocietyState['memories'] {
  const out: SocietyState['memories'] = {};
  if (typeof memories !== 'object' || memories === null || Array.isArray(memories)) return out;
  for (const [id, list] of Object.entries(memories as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const kept = list.filter((m): m is Memory => typeof m === 'object' && m !== null && typeof (m as Memory).kind === 'string' && isNumber((m as Memory).at) && Number.isInteger((m as Memory).times) && Number.isInteger((m as Memory).said));
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
    [l.tills, l.treasuries, l.jobs, l.gangs, l.dead, l.since].every(optional)
  );
}

function isJob(value: unknown): value is JobState {
  const j = value as Record<string, unknown> | null;
  return typeof j === 'object' && j !== null && typeof j.building === 'string' && Number.isInteger(j.rung) && (j.rung as number) >= 0 && isNumber(j.trust) && j.trust >= 0 && Number.isInteger(j.shifts) && (j.shifts as number) >= 0 && Number.isInteger(j.lastShiftDay);
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
