import type { Approach, Reaction } from './dialogue';
import { remember, type Memory, type MemoryRules } from './memory';
import { INVERSE, tiesOf, type Person, type Population, type TieKind } from './people';
import type { Romance, RomanceRules } from './romance';
import type { Rng } from './rng';

/**
 * The player's place among the people: what each thinks of them, what the gangs, the
 * neighborhoods and the businesses think, what the player has done to whom, and who is
 * coming to collect for it. Anything done to a person spreads to their family, friends,
 * crew and coworkers, and from them a little further; witnesses talk; a gang remembers;
 * a storefront stops serving someone who hurt its people.
 */
export type Stance = 'hostile' | 'cold' | 'wary' | 'neutral' | 'warm' | 'friend';
export type IncidentKind = 'insult' | 'robbery' | 'assault' | 'murder';

/** What one person makes of the player, as last written down. Rapport and grudge drift toward nothing since. */
export interface Standing {
  met: boolean;
  rapport: number;
  grudge: number;
  at: number;
  talks: number;
  lastTalkAt: number;
  gifts: number;
  lastGiftAt: number;
  robbedAt: number;
  /** Questions the player has put to them. */
  asks: number;
  /** When they last wouldn't say, by what was asked (`age`, `home`, `about:<id>`…): asking again soon is pressing. */
  refused: Record<string, number>;
  /** When the player last asked them something, and how many questions in a row that makes (one after another, within `openness.grill.minutes`). */
  lastAskAt?: number;
  sitting?: number;
  /** How taken they are with the player, 0 to 100 (romance.ts): flirts that land and dates raise it, and it fades on the clock. */
  spark?: number;
}

/** What each stance is called where the player can see it. */
export const STANCE_LABEL: Record<Stance, string> = {
  hostile: 'Hostile',
  cold: 'Cold',
  wary: 'Wary',
  neutral: 'Stranger',
  warm: 'Warm',
  friend: 'Friend',
};

/** Something the player can want from someone: a fact about them, a topic, their people, (`chop`) their hands on a stolen credchip, or (`hire`) a job at the place they run. */
export type Asked = 'name' | 'job' | 'age' | 'home' | 'likes' | 'hates' | 'type' | 'kin' | 'district' | 'life' | 'here' | 'rumor' | 'news' | 'dream' | 'views' | 'chop' | 'hire';

/**
 * How ready people are to tell the player things: a base by how they feel, a step per level
 * of charisma, their nature, less what each thing asks of them; an answer for sure from
 * `answerAt`, a flat no below `deflectAt`, in between a chance of either or a non-answer.
 */
export interface OpennessRules {
  stance: Record<Stance, number>;
  perLevel: number;
  /** How much each trait moves it: chatty and warmth on everything, loyalty on their people (against), courage on who they hate (for), greed on chopping a chip (for). */
  traits: { chatty: number; warmth: number; loyalty: number; courage: number; greed: number };
  cost: Record<Asked, number>;
  /** What a mask on the player costs with everyone: people don't open up to a face they can't see. */
  mask: number;
  answerAt: number;
  deflectAt: number;
  /** Rapport lost for asking again soon after a no. */
  press: number;
  /**
   * The moment, as it moves people: a few drinks loosen tongues, being busy or eating tightens
   * them (on anything but their work); every question past `grill.free` in a row costs this
   * much more; someone from the gang they hate being right here costs this much on who they
   * hate (less the braver they are); grief costs on everything; the small hours on where they
   * live; a drunk player with anyone short of warm.
   */
  moment: { drinking: number; busy: number; eating: number; grilled: number; enemy: number; grieving: number; late: number; drunk: number };
  /** Questions in a row: the first `free` are fine; within `minutes` (on the game's clock) of the last, each one past that costs `rapport` and openness. */
  grill: { free: number; minutes: number; rapport: number };
}

/** A reputation, as last written down; it recovers toward nothing since. */
export interface Rep {
  value: number;
  at: number;
}

export interface Incident {
  id: number;
  at: number;
  kind: IncidentKind;
  victim: string;
  witnesses: string[];
  district: string;
  /** Eddies taken, for a robbery. */
  took: number;
  /** The mask the player had on doing it (a garment kind), if any. */
  mask?: string;
  /**
   * Whether people know it was the player. Only something done in a mask starts out not pinned
   * on them; it is once someone who was there sees the mask again (`pinIncident`). Missing
   * means pinned.
   */
  pinned?: boolean;
  /** Where and when a masked one was done, as the game keys a scene: the same scene can't be seeing the mask again. */
  where?: string;
}

/** Someone coming to settle a score, when it's due. */
export interface Threat {
  id: number;
  due: number;
  /** The person coming, or null when it's a gang. */
  by: string | null;
  gang: string | null;
  incident: number;
  /** Eddies they mean to take. */
  amount: number;
}

/** How the player came to know of someone, or of a tie between two people. */
export type KnownHow = 'seen' | 'told' | 'asked';

/** Something about a person that takes asking (or watching, or being told) to know; `dead`, that they are, takes being told. */
export type Fact = 'name' | 'job' | 'age' | 'home' | 'likes' | 'drinks' | 'hates' | 'type' | 'nature' | 'dream' | 'dead';

/** One line of what passed between the player and a person; a `note` is how it went down (rapport, charisma, their stance, and why), `tone` whether that was good for the player. */
export interface LogEntry {
  at: number;
  who: 'you' | 'them' | 'note';
  text: string;
  tone?: 'good' | 'bad' | 'even';
}

/** Lines kept per person. */
export const LOG_CAP = 40;

/** What the player knows of a person: met them, seen them about, or heard of them; which of their facts; and what's been said. */
export interface Knowledge {
  met: boolean;
  seen: boolean;
  told: boolean;
  facts: Fact[];
  log: LogEntry[];
}

/**
 * What the player knows of a tie between two people, keyed by both ids in order (`a|b`):
 * that they're connected somehow (`kind` null), how (`kind` is what b is to a), or that
 * they aren't (`'none'`: they were asked, and had never heard of them).
 */
export interface KnownLink {
  kind: TieKind | 'none' | null;
  how: KnownHow;
  at: number;
}

export interface SocietyState {
  standings: Record<string, Standing>;
  rep: Record<string, Rep>;
  incidents: Incident[];
  threats: Threat[];
  nextId: number;
  known: Record<string, Knowledge>;
  links: Record<string, KnownLink>;
  /** What each person remembers of the player (memory.ts), by person. */
  memories: Record<string, Memory[]>;
  /** Who the player is seeing, if anyone (romance.ts). */
  romance?: Romance | null;
}

export interface SocietyRules {
  /** How much of what happens to someone their ties feel. */
  closeness: Record<TieKind, number>;
  /** Grudge a victim takes from each kind of incident. */
  severity: Record<IncidentKind, number>;
  /** How much of a tie's grudge their own ties feel in turn. */
  gossip: number;
  /** How much of it a witness feels. */
  witness: number;
  rep: {
    /** Of the severity, lost with the victim's gang, their workplace, their neighborhood; gained with the gang's rivals. */
    gang: number;
    business: number;
    district: number;
    rival: number;
    /** A business stops serving at this reputation or below. */
    banAt: number;
    /** Recovered per day on the game's clock. */
    recoverPerDay: number;
  };
  /** Grudge forgiven per day on the game's clock. */
  forgivePerDay: number;
  /** Attitude thresholds. */
  stances: { hostile: number; cold: number; wary: number; warm: number; friend: number };
  revenge: {
    /** Grudge it takes for someone to come after the player. */
    grudgeAt: number;
    /** Hours on the game's clock before they do. */
    delayHours: [number, number];
    /** Eddies they take: this much, plus what was stolen times `takeBack`. */
    base: number;
    takeBack: number;
    /** A gang that's hunting the player finds them within this many hours. */
    huntHours: [number, number];
  };
  talk: {
    /** Rapport a chat is worth, before warmth. */
    base: number;
    /** Minutes on the game's clock before another chat counts. */
    cooldownMinutes: number;
    /** Rapport at which someone tells the player about their people. */
    revealAt: number;
  };
  gift: { base: number; favorite: number };
  insult: { rapport: number };
  /** Rapport a chop done is worth: business done together. */
  chop: { rapport: number };
  /** A mask on the player, as a gang reads it: this much attitude against them, with anyone in a gang. */
  mask: { turf: number };
  openness: OpennessRules;
  /** What people remember of the player, how long, and what they bring up (memory.ts). */
  memory: MemoryRules;
  /** Romance with the player (romance.ts). */
  romance: RomanceRules;
  /**
   * What people like and don't like being asked, and how they take each way of starting a
   * chat: each reaction that fits the speaker (dialogue.ts `fits`) adds its `by`, worth
   * `rapport` a point, and the strongest says why.
   */
  reactions: { rapport: number; openness: number; asked: Partial<Record<Asked, Reaction[]>>; approach: Record<Approach, Reaction[]> };
}

export function freshSociety(): SocietyState {
  return { standings: {}, rep: {}, incidents: [], threats: [], nextId: 1, known: {}, links: {}, memories: {}, romance: null };
}

// ───────────── What the player knows ─────────────

export function knowledgeOf(state: SocietyState, id: string): Knowledge {
  const k = state.known[id];
  return k ? { ...k, facts: k.facts ?? [], log: k.log ?? [] } : { met: false, seen: false, told: false, facts: [], log: [] };
}

/** Whether the player knows of someone at all. */
export function knowsOf(state: SocietyState, id: string): boolean {
  const k = knowledgeOf(state, id);
  return k.met || k.seen || k.told;
}

/** Writes down that the player met, saw or heard of someone (being told of someone comes with their name). True if that's news. */
export function learnOf(state: SocietyState, id: string, how: 'met' | 'seen' | 'told'): boolean {
  const k = knowledgeOf(state, id);
  if (how === 'told' && !k.facts.includes('name')) k.facts = [...k.facts, 'name'];
  if (k[how]) {
    state.known[id] = k;
    return false;
  }
  state.known[id] = { ...k, [how]: true };
  return true;
}

/** Writes down a fact the player found out about someone. True if that's news. */
export function learnFact(state: SocietyState, id: string, fact: Fact): boolean {
  const k = knowledgeOf(state, id);
  if (k.facts.includes(fact)) return false;
  state.known[id] = { ...k, facts: [...k.facts, fact] };
  return true;
}

/** Keeps a line of what was said, the last `LOG_CAP` per person. */
export function logLine(state: SocietyState, id: string, who: LogEntry['who'], text: string, now: number, tone?: LogEntry['tone']): void {
  const k = knowledgeOf(state, id);
  state.known[id] = { ...k, log: [...k.log, { at: now, who, text, ...(tone ? { tone } : {}) }].slice(-LOG_CAP) };
}

export function linkKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** What the player knows of the tie between two people, from `a`'s side (`kind` is what `b` is to `a`). */
export function linkOf(state: SocietyState, a: string, b: string): KnownLink | null {
  const link = state.links[linkKey(a, b)];
  if (!link) return null;
  const kind = link.kind && link.kind !== 'none' && a > b ? INVERSE[link.kind] : link.kind;
  return { ...link, kind };
}

/**
 * Writes down what the player learned of the tie between `a` and `b`: `kind` is what `b` is
 * to `a`, null for "connected somehow", 'none' for "not at all". Knowing how beats knowing
 * that; nothing is unlearned. True if that's news.
 */
export function learnLink(state: SocietyState, a: string, b: string, kind: TieKind | 'none' | null, how: KnownHow, now: number): boolean {
  if (a === b) return false;
  const key = linkKey(a, b);
  const had = state.links[key];
  if (had && (had.kind !== null || kind === null)) return false;
  const stored = kind && kind !== 'none' && a > b ? INVERSE[kind] : kind;
  state.links[key] = { kind: stored, how, at: now };
  return true;
}

/**
 * What the player hears of a tie that has changed (a couple got together, married or split
 * up; friends fell out or made up): unlike `learnLink`, it replaces what they knew, since
 * what they knew isn't so anymore. True if that's news.
 */
export function relearnLink(state: SocietyState, a: string, b: string, kind: TieKind | 'none', how: KnownHow, now: number): boolean {
  if (a === b) return false;
  const key = linkKey(a, b);
  const stored = kind !== 'none' && a > b ? INVERSE[kind] : kind;
  if (state.links[key]?.kind === stored) return false;
  state.links[key] = { kind: stored, how, at: now };
  return true;
}

export interface WebLink {
  id: string;
  /** What they are to the person, if known. */
  kind: TieKind | null;
  how: KnownHow;
}

/** Everyone the player knows a person to be connected to, and how if they know that. */
export function webOf(state: SocietyState, id: string): WebLink[] {
  const web: WebLink[] = [];
  for (const key of Object.keys(state.links)) {
    const [a, b] = key.split('|') as [string, string];
    if (a !== id && b !== id) continue;
    const other = a === id ? b : a;
    const link = linkOf(state, id, other);
    if (!link || link.kind === 'none') continue;
    web.push({ id: other, kind: link.kind, how: link.how });
  }
  return web;
}

/** Everyone the player knows of. */
export function knownPeople(state: SocietyState): string[] {
  return Object.keys(state.known).filter((id) => knowsOf(state, id));
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function blank(at: number): Standing {
  return { met: false, rapport: 0, grudge: 0, at, talks: 0, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} };
}

/** Toward zero by `perDay` for every day on the game's clock since `at`. */
function drift(value: number, at: number, perDay: number, timeScale: number, now: number): number {
  const days = Math.max(0, now - at) / (DAY / timeScale);
  return value > 0 ? Math.max(0, value - perDay * days) : Math.min(0, value + perDay * days);
}

/** Someone's standing with the player at `now`, grudge faded as far as it has. */
export function standingOf(state: SocietyState, id: string, rules: SocietyRules, timeScale: number, now: number): Standing {
  const s = state.standings[id] ?? blank(now);
  // Saves from before questions were counted have neither.
  return { ...s, asks: s.asks ?? 0, refused: s.refused ?? {}, grudge: drift(s.grudge, s.at, rules.forgivePerDay, timeScale, now), spark: drift(s.spark ?? 0, s.at, rules.romance.fadePerDay, timeScale, now) };
}

/** Writes a standing down at `now`, grudge faded first, then changed by `by`. */
export function changeStanding(state: SocietyState, id: string, by: Partial<Standing> & { rapport?: number; grudge?: number; spark?: number }, rules: SocietyRules, timeScale: number, now: number): Standing {
  const faded = standingOf(state, id, rules, timeScale, now);
  const next: Standing = {
    ...faded,
    ...by,
    rapport: Math.max(-100, Math.min(100, faded.rapport + (by.rapport ?? 0))),
    grudge: Math.max(0, Math.min(200, faded.grudge + (by.grudge ?? 0))),
    spark: Math.max(0, Math.min(100, (faded.spark ?? 0) + (by.spark ?? 0))),
    at: now,
  };
  state.standings[id] = next;
  return next;
}

export function repOf(state: SocietyState, key: string, rules: SocietyRules, timeScale: number, now: number): number {
  const r = state.rep[key];
  return r ? drift(r.value, r.at, rules.rep.recoverPerDay, timeScale, now) : 0;
}

export function changeRep(state: SocietyState, key: string, by: number, rules: SocietyRules, timeScale: number, now: number): number {
  const value = Math.max(-100, Math.min(100, repOf(state, key, rules, timeScale, now) + by));
  state.rep[key] = { value, at: now };
  return value;
}

/** The reputation keys a person's standing with the player is colored by. */
export function circlesOf(person: Person): string[] {
  const keys = [`district:${person.district}`];
  if (person.gang) keys.push(`gang:${person.gang}`);
  if (person.job.building) keys.push(`business:${person.job.building}`);
  return keys;
}

/** How a person feels about the player, all told: their own dealings, their circles' reputation, their nature; and, for anyone in a gang, a mask on the player reads as a threat. */
export function attitude(person: Person, state: SocietyState, rules: SocietyRules, timeScale: number, now: number, masked = false): number {
  const s = standingOf(state, person.id, rules, timeScale, now);
  let score = s.rapport - s.grudge + (person.traits.warmth - 0.5) * 12;
  if (masked && person.gang) score -= rules.mask.turf;
  score += repOf(state, `district:${person.district}`, rules, timeScale, now) * 0.25;
  if (person.gang) score += repOf(state, `gang:${person.gang}`, rules, timeScale, now) * 0.6;
  if (person.job.building) score += repOf(state, `business:${person.job.building}`, rules, timeScale, now) * 0.4;
  if (person.hates) score -= Math.max(0, repOf(state, `gang:${person.hates}`, rules, timeScale, now)) * 0.3;
  return Math.round(score);
}

export function stanceOf(score: number, rules: SocietyRules): Stance {
  const { hostile, cold, wary, warm, friend } = rules.stances;
  if (score <= hostile) return 'hostile';
  if (score <= cold) return 'cold';
  if (score <= wary) return 'wary';
  if (score >= friend) return 'friend';
  if (score >= warm) return 'warm';
  return 'neutral';
}

export interface Fallout {
  /** Everyone whose standing changed, worst hit first. */
  affected: Array<{ id: string; grudge: number }>;
  /** Reputations changed, by key. */
  rep: Record<string, number>;
  threats: Threat[];
}

/** What the cascade of an incident needs to know of the city. */
export interface IncidentLinks {
  /** The chain a person's workplace belongs to, if any. */
  chainOf: (person: Person) => string | null;
  /** The gangs that fight a gang. */
  rivalsOf: (gang: string) => string[];
}

/** Whether people know an incident was the player's. */
export function isPinned(incident: Incident): boolean {
  return incident.pinned !== false;
}

/**
 * Something done to someone. The victim holds it against the player; so do their family,
 * friends, crew and coworkers, by how close they are and how loyal they are, and their ties
 * in turn a little; witnesses too, and the people witnesses talk to. The victim's gang,
 * workplace and neighborhood think less of the player (the gang's rivals a little more).
 * Then whoever has the grudge and the nerve for it comes to settle up, and a gang that has
 * had enough comes looking. Done from behind a mask, none of that: nobody knows whose doing
 * it was, until someone who was there sees the mask again (`pinIncident`).
 */
export function applyIncident(state: SocietyState, population: Population, incident: Omit<Incident, 'id'>, rules: SocietyRules, timeScale: number, now: number, rng: Rng, links: IncidentLinks): Fallout {
  const id = state.nextId++;
  const written: Incident = { ...incident, id, ...(incident.mask ? { pinned: false } : {}) };
  state.incidents.push(written);
  if (!isPinned(written)) return { affected: [], rep: {}, threats: [] };
  return cascade(state, population, written, rules, timeScale, now, rng, links);
}

/**
 * Pins a masked incident on the player: someone who was there has seen the mask again, and
 * all of it lands now, as if they'd seen the face at the time. Null if there's no such
 * incident, or it's pinned already.
 */
export function pinIncident(state: SocietyState, population: Population, id: number, rules: SocietyRules, timeScale: number, now: number, rng: Rng, links: IncidentLinks): Fallout | null {
  const incident = state.incidents.find((i) => i.id === id);
  if (!incident || isPinned(incident)) return null;
  incident.pinned = true;
  return cascade(state, population, incident, rules, timeScale, now, rng, links);
}

/** What was done in a mask that nobody has pinned on the player yet. */
export function unpinnedIncidents(state: SocietyState, mask: string): Incident[] {
  return state.incidents.filter((i) => !isPinned(i) && i.mask === mask);
}

function cascade(state: SocietyState, population: Population, incident: Incident, rules: SocietyRules, timeScale: number, now: number, rng: Rng, links: IncidentLinks): Fallout {
  const { id } = incident;
  const severity = rules.severity[incident.kind];
  const victim = population.people.find((p) => p.id === incident.victim);
  if (!victim) return { affected: [], rep: {}, threats: [] };
  const grudges = new Map<string, number>();
  const add = (person: Person, amount: number) => {
    if (amount < 0.5) return;
    grudges.set(person.id, (grudges.get(person.id) ?? 0) + amount);
  };
  const people = new Map(population.people.map((p) => [p.id, p]));
  const spread = (from: Person, amount: number, depth: number, seen: Set<string>) => {
    for (const t of tiesOf(population, from.id)) {
      const other = people.get(t.to);
      // The dead hear nothing, pass nothing on, and come for no one.
      if (!other || other.diedOn !== undefined || seen.has(other.id)) continue;
      const felt = amount * rules.closeness[t.kind] * (0.5 + other.traits.loyalty / 2);
      add(other, felt);
      if (depth > 1) spread(other, felt * rules.gossip, depth - 1, new Set([...seen, other.id]));
    }
  };
  add(victim, severity);
  spread(victim, severity, 2, new Set([victim.id]));
  for (const wid of incident.witnesses) {
    const witness = people.get(wid);
    if (!witness || witness.id === victim.id) continue;
    const felt = severity * rules.witness;
    add(witness, felt);
    spread(witness, felt * rules.gossip, 1, new Set([witness.id, victim.id]));
  }

  const affected: Fallout['affected'] = [];
  for (const [pid, grudge] of grudges) {
    const amount = Math.round(grudge);
    if (!amount) continue;
    changeStanding(state, pid, { grudge: amount, rapport: -Math.round(amount / 3) }, rules, timeScale, now);
    affected.push({ id: pid, grudge: amount });
  }
  affected.sort((a, b) => b.grudge - a.grudge);

  // What it was, as each of them will remember it: done to them, seen, or heard of from their people.
  remember(state, victim.id, { kind: 'wronged', at: incident.at, what: incident.kind, ...(incident.took ? { amount: incident.took } : {}) }, rules.memory, timeScale, now);
  for (const { id: pid, grudge } of affected) {
    if (pid === victim.id || grudge < rules.memory.heardAt) continue;
    remember(state, pid, { kind: incident.witnesses.includes(pid) ? 'saw' : 'heard', at: incident.at, about: victim.id, what: incident.kind }, rules.memory, timeScale, now);
  }

  const rep: Record<string, number> = {};
  const hit = (key: string, by: number) => {
    if (!by) return;
    rep[key] = changeRep(state, key, Math.round(by), rules, timeScale, now);
  };
  hit(`district:${victim.district}`, -severity * rules.rep.district);
  if (victim.gang) {
    hit(`gang:${victim.gang}`, -severity * rules.rep.gang);
  }
  if (victim.job.building) {
    hit(`business:${victim.job.building}`, -severity * rules.rep.business);
    const chain = links.chainOf(victim);
    if (chain) hit(`chain:${chain}`, -severity * rules.rep.business * 0.6);
  }
  if (victim.gang) {
    const here = new Set(population.people.map((p) => p.gang));
    for (const rival of links.rivalsOf(victim.gang)) if (here.has(rival)) hit(`gang:${rival}`, severity * rules.rep.rival);
  }

  const threats: Threat[] = [];
  if (incident.kind !== 'insult') {
    // Whoever is angriest and has the nerve comes to collect.
    const avengers = affected
      .map((a) => ({ person: people.get(a.id), standing: standingOf(state, a.id, rules, timeScale, now) }))
      .filter((a): a is { person: Person; standing: Standing } => Boolean(a.person) && a.standing.grudge >= rules.revenge.grudgeAt);
    for (const { person } of avengers) {
      if (!rng.chance(person.traits.courage * (0.4 + person.traits.temper * 0.6))) continue;
      const [min, max] = rules.revenge.delayHours;
      threats.push({
        id: state.nextId++,
        due: now + (rng.range(min, max) * HOUR) / timeScale,
        by: person.id,
        gang: null,
        incident: id,
        amount: Math.round(rules.revenge.base + incident.took * rules.revenge.takeBack),
      });
      break;
    }
    const gang = victim.gang;
    if (gang && repOf(state, `gang:${gang}`, rules, timeScale, now) <= rules.rep.banAt && !state.threats.some((t) => t.gang === gang)) {
      const [min, max] = rules.revenge.huntHours;
      threats.push({ id: state.nextId++, due: now + (rng.range(min, max) * HOUR) / timeScale, by: null, gang, incident: id, amount: Math.round(rules.revenge.base * 1.5 + incident.took * rules.revenge.takeBack) });
    }
  }
  state.threats.push(...threats);
  return { affected, rep, threats };
}

/**
 * Word that the player was good to someone (a gift): the people closest to them (closeness
 * a half or more: family, a partner, friends) warm to the player a little, by how close they
 * are, and remember hearing it. Returns who heard.
 */
export function passGoodWord(state: SocietyState, population: Population, from: Person, worth: number, rules: SocietyRules, timeScale: number, now: number): string[] {
  const heard: string[] = [];
  for (const t of tiesOf(population, from.id)) {
    const closeness = rules.closeness[t.kind];
    const rapport = Math.round(worth * rules.memory.goodWord * closeness);
    if (closeness < 0.5 || rapport < 1) continue;
    const other = population.people.find((p) => p.id === t.to);
    if (!other || other.diedOn !== undefined) continue;
    changeStanding(state, other.id, { rapport }, rules, timeScale, now);
    remember(state, other.id, { kind: 'goodWord', at: now, about: from.id }, rules.memory, timeScale, now);
    heard.push(other.id);
  }
  return heard;
}

/** Threats that have come due. */
export function dueThreats(state: SocietyState, now: number): Threat[] {
  return state.threats.filter((t) => t.due <= now);
}

export function settleThreat(state: SocietyState, threat: Threat, rules: SocietyRules, timeScale: number, now: number): void {
  state.threats = state.threats.filter((t) => t.id !== threat.id);
  // Getting even takes the edge off.
  if (threat.by) {
    const s = standingOf(state, threat.by, rules, timeScale, now);
    changeStanding(state, threat.by, { grudge: -Math.round(s.grudge / 2) }, rules, timeScale, now);
  }
  if (threat.gang) changeRep(state, `gang:${threat.gang}`, 15, rules, timeScale, now);
}
