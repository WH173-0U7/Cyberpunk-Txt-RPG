import type { SocietyState } from './society';

/**
 * What people remember of the player: not a number, but the things themselves. The one who
 * was robbed remembers the robbery, how much and when; their sister remembers hearing about
 * it; the boss remembers taking the player on, moving them up, and the day they walked out;
 * whoever got the Taco remembers the Taco. Memories fade on the calendar (`clock`; each kind
 * lasts its own number of days, longer for a killing or a beating, and for what happened more
 * than once), the strongest and freshest is what someone brings up when
 * they talk, and each is brought up only so many times. Some change what people do: a boss
 * the player walked out on won't take them back while they remember it, and a gift they've
 * had before is had again. The numbers are in `src/data/society.ts`; `Game` writes the
 * memories down, the incident cascade (society.ts) writes what was done, seen and heard.
 */
export type MemoryKind =
  /** Something the player did to them: `what` is the incident, `amount` what it took. */
  | 'wronged'
  /** Heard from their people that the player did it to `about`. */
  | 'heard'
  /** Saw the player do it to `about`. */
  | 'saw'
  /** Came to collect for it, and did: `amount`. */
  | 'settled'
  /** Was given something: `what` is the dish. */
  | 'gift'
  /** Heard from `about` that the player was good to them. */
  | 'goodWord'
  /** Took the player on; moved them up (`what` the rung); was walked out on; let them go. */
  | 'hired'
  | 'promoted'
  | 'quit'
  /** Was given notice: the player left for other work (`what` the rung). */
  | 'notice'
  | 'fired'
  /** Chopped a hot chip for the player: `amount` was on it. */
  | 'chopped'
  /** Went out with the player: `what` is where. */
  | 'date'
  /** Was dumped by the player. */
  | 'dumped'
  /** Caught the player flirting with `about`, while they were together. */
  | 'cheated'
  /** A chat the player started a way they liked (`what` the way: a joke, a compliment…), or one they didn't. */
  | 'chat'
  | 'rebuffed'
  /** The player covered a shift for them (`what` where). */
  | 'covered'
  /** Threw in on the player's side in a fight (`what` where). */
  | 'backed';

export interface Memory {
  kind: MemoryKind;
  /** When it happened, on the phone's clock (for something done in a mask, when it was done, not when it was pinned). */
  at: number;
  /** Who it was about, when it wasn't them. */
  about?: string;
  /** What it was: the incident ('robbery', 'insult'…), the dish, the rung. */
  what?: string;
  /** Eddies in it. */
  amount?: number;
  /** How many times it has happened while remembered: robbed twice is remembered as twice. */
  times: number;
  /** Times they've brought it up. */
  said: number;
}

export interface MemoryRules {
  /**
   * The clock people remember by, their grudges, spark and the reputations too: 1 is the
   * calendar, whatever speed the streets run at for testing (missing: the streets' own).
   */
  clock?: number;
  /** The most kept per person: the least of the rest is forgotten. */
  cap: number;
  /** Days each kind is remembered. */
  days: Record<MemoryKind, number>;
  /** How much longer, and how much more on their mind, a memory is for what was done: a killing heard of stays for months. */
  deep: Record<string, number>;
  /** How much each kind is on someone's mind: the strongest, freshest is what they bring up. */
  weight: Record<MemoryKind, number>;
  /** Times each kind is brought up at most. */
  repeat: Record<MemoryKind, number>;
  /** The chance a chat turns to it, when there's something to bring up. */
  recall: number;
  /** The least grudge it takes for something heard of, or seen, to stick. */
  heardAt: number;
  /** Rapport a good word passes on to the people closest to someone the player was good to, as a share of what it was worth to them, by closeness. */
  goodWord: number;
  /** What it takes of memories on someone's mind, good less bad, for their regard of the player to be all the way one way (`regard`). */
  regard: number;
}

/** Every kind there is, for reading a save: anything else (a kind the game no longer has) is forgotten. */
export const MEMORY_KINDS: ReadonlySet<string> = new Set<MemoryKind>(['wronged', 'heard', 'saw', 'settled', 'gift', 'goodWord', 'hired', 'promoted', 'quit', 'notice', 'fired', 'chopped', 'date', 'dumped', 'cheated', 'chat', 'rebuffed', 'covered', 'backed']);

/** The ones that are a grievance: brought up, they're the whole of what's said. */
export const GRIEVANCES: ReadonlySet<MemoryKind> = new Set<MemoryKind>(['wronged', 'heard', 'saw', 'quit', 'fired', 'dumped', 'cheated']);

/** The ones someone holds against the player, for their regard of them: the grievances, and a way in they didn't like. */
const AGAINST: ReadonlySet<MemoryKind> = new Set<MemoryKind>([...GRIEVANCES, 'rebuffed']);
/** The ones that count for the player. */
const FOR: ReadonlySet<MemoryKind> = new Set<MemoryKind>(['gift', 'goodWord', 'hired', 'promoted', 'chopped', 'date', 'chat', 'covered', 'backed']);

const DAY = 86_400_000;

/** How old something is, in days on the game's clock. */
export function daysSince(at: number, timeScale: number, now: number): number {
  return Math.max(0, now - at) / (DAY / timeScale);
}

/** How old a memory is, in days on the clock people remember by. */
export function memoryAge(at: number, rules: MemoryRules, timeScale: number, now: number): number {
  return daysSince(at, rules.clock ?? timeScale, now);
}

/** How many days a memory lasts: its kind's, longer for what was done (`deep`), and half again for every time it happened again. */
function lasts(memory: Memory, rules: MemoryRules): number {
  return rules.days[memory.kind] * (rules.deep[memory.what ?? ''] ?? 1) * (1 + (memory.times - 1) * 0.5);
}

/** How much a memory is on someone's mind now: its weight (more for what was done), fading to nothing over the days it lasts. */
function strength(memory: Memory, rules: MemoryRules, timeScale: number, now: number): number {
  return rules.weight[memory.kind] * (rules.deep[memory.what ?? ''] ?? 1) * Math.max(0, 1 - memoryAge(memory.at, rules, timeScale, now) / lasts(memory, rules)) * (1 + (memory.times - 1) * 0.5);
}

/** What someone still remembers of the player, freshest first. */
export function memoriesOf(state: SocietyState, id: string, rules: MemoryRules, timeScale: number, now: number): Memory[] {
  return (state.memories?.[id] ?? [])
    .filter((m) => memoryAge(m.at, rules, timeScale, now) < lasts(m, rules))
    .sort((a, b) => b.at - a.at)
    .map((m) => ({ ...m }));
}

/** The freshest memory of a kind someone has (about someone, if said), if any. */
export function memoryOf(state: SocietyState, id: string, kind: MemoryKind, rules: MemoryRules, timeScale: number, now: number, about?: string): Memory | null {
  return memoriesOf(state, id, rules, timeScale, now).find((m) => m.kind === kind && (about === undefined || m.about === about)) ?? null;
}

/**
 * Writes something down in someone's memory of the player. The same thing again (the same
 * kind, about the same person, the same what) is one memory, twice: fresh again, and theirs
 * to bring up again. Past the cap, the weakest is forgotten.
 */
export function remember(state: SocietyState, id: string, memory: Omit<Memory, 'said' | 'times'>, rules: MemoryRules, timeScale: number, now: number): Memory {
  const kept = memoriesOf(state, id, rules, timeScale, now);
  const same = kept.find((m) => m.kind === memory.kind && m.about === memory.about && m.what === memory.what);
  const written: Memory = { ...memory, times: (same?.times ?? 0) + 1, said: 0 };
  if (same?.amount !== undefined && memory.amount !== undefined) written.amount = same.amount + memory.amount;
  const all = [written, ...kept.filter((m) => m !== same)];
  const strongest = all
    .map((m) => ({ m, s: m === written ? Infinity : strength(m, rules, timeScale, now) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, rules.cap)
    .map((x) => x.m)
    .sort((a, b) => b.at - a.at);
  (state.memories ??= {})[id] = strongest;
  return { ...written };
}

/** What someone would bring up of the player now, if anything: the strongest memory they haven't brought up as often as it bears. */
export function recall(state: SocietyState, id: string, rules: MemoryRules, timeScale: number, now: number): Memory | null {
  let best: Memory | null = null;
  let score = 0;
  for (const m of memoriesOf(state, id, rules, timeScale, now)) {
    if (m.said >= rules.repeat[m.kind]) continue;
    const s = strength(m, rules, timeScale, now);
    if (s > score) {
      best = m;
      score = s;
    }
  }
  return best;
}

/**
 * Where someone's memories of the player leave them, from -1 (nothing but what they hold
 * against them) to 1 (nothing but good): what counts for the player on their mind, less what
 * they hold against them, each by how strongly, over `regard`. It moves how ready they are to
 * open up, what they charge at their counter, whether they'd call the NCPD on the player, and
 * which side they take in a fight.
 */
export function regard(state: SocietyState, id: string, rules: MemoryRules, timeScale: number, now: number): number {
  let sum = 0;
  for (const m of memoriesOf(state, id, rules, timeScale, now)) {
    if (FOR.has(m.kind)) sum += strength(m, rules, timeScale, now);
    else if (AGAINST.has(m.kind)) sum -= strength(m, rules, timeScale, now);
  }
  return Math.max(-1, Math.min(1, sum / Math.max(1, rules.regard)));
}

/** Writes down that someone brought a memory up. */
export function recalled(state: SocietyState, id: string, memory: Memory): void {
  const held = state.memories?.[id]?.find((m) => m.kind === memory.kind && m.at === memory.at && m.about === memory.about && m.what === memory.what);
  if (held) held.said += 1;
}

/** Forgets the people a city no longer has, and what anyone remembers about them. */
export function forgetMemories(state: SocietyState, known: ReadonlySet<string>): void {
  const memories = state.memories ?? {};
  for (const id of Object.keys(memories)) {
    if (!known.has(id)) delete memories[id];
    else memories[id] = (memories[id] ?? []).filter((m) => m.about === undefined || known.has(m.about));
  }
}
