import type { Spot } from './people';

/**
 * The NCPD, the way the wiki's 2077 has it: privatized, half its officers fired, gone from
 * Pacifica (a combat zone), rarely in Watson's Northside, thin in the suburbs. Nothing goes
 * on record unless someone calls it in: a witness in the room, or the victim, by who they are
 * and where they are (nobody calls the cops on a gang's own turf). A call files a report and
 * sends a unit, two officers, on a clock by the district; still there when they arrive, the
 * player complies, runs or fights. A report names the player only when someone who knows them
 * saw their face; a named report is a warrant, which lapses in time, but for murder.
 */
export type Crime = 'assault' | 'robbery' | 'murder' | 'possession' | 'dealing';

/** Why officers have the player: at the scene of something called in, on a warrant, or stopped to search their pockets. */
export type ConfrontWhy = 'scene' | 'warrant' | 'search';

export interface PoliceRules {
  /** By district: the chance an ordinary witness, alone, calls it in, and the minutes a unit takes to come; null where the NCPD doesn't go. */
  districts: Record<string, { call: number; minutes: [number, number] } | null>;
  /** By neighborhood, over its district's: where the NCPD hardly goes (Northside). */
  areas: Record<string, { call: number; minutes?: [number, number] }>;
  /**
   * Who calls, as times the district's odds: the one it was done to, their family, their friends
   * and workmates, a guard, a corpo; nerve either way of the middle (`courage`, at most that much
   * more or less); a ganger hardly ever. In a crowd everyone leaves it to someone else: each
   * witness's odds over the number of them to the power of `crowd`. Never more than `most`.
   * What a caller remembers of the player moves it by `regard` times their regard of them.
   */
  caller: { victim: number; kin: number; friend: number; guard: number; corpo: number; courage: number; ganger: number; crowd: number; most: number; regard?: number };
  /** Each crime: what it's called, the fine, the minutes held for it (0: a fine only), the days a warrant for it lasts (null: for good), how bad it is, how much likelier a witness is to call it in, and for a drug found on the player, more of both a dose. */
  crimes: Record<Crime, { label: string; fine: number; hold: number; lapseDays: number | null; rank: number; alarm: number; perDose?: { fine: number; hold: number } }>;
  /**
   * Searching the player's pockets, whenever officers have them: an illegal drug is
   * possession, a dealer's weight of any (`weight` doses) is dealing, and all of it is taken.
   * A patrol stops someone carrying now and then (`stop`, times the district's call; `weighed`
   * times more with a dealer's weight on them, `corner` times on the corner they deal from).
   */
  search: { weight: number; stop: number; weighed: number; corner: number };
  /** A unit comes faster for worse: the minutes, times this, by crime. */
  urgency: Record<Crime, number>;
  /** Running from the officers: the odds, less hurt, more in a mask; caught, held this much longer for resisting. */
  run: { base: number; hurt: number; masked: number; resisting: number };
  /** Short of the fine, the minutes held instead (on top of any hold). */
  shortHold: number;
  /** The chance a patrol picks up a wanted player, unmasked, out on the streets where the NCPD goes (times the district's call, and more a step for worse), and the minutes between chances. */
  stop: { chance: number; rank: number; minutes: number };
  /** The most reports kept on record. */
  keep: number;
}

/** What's said of the NCPD; `{who}`, `{his}`, `{gang}`, `{district}`, `{crime}`, `{fine}`, `{minutes}`, `{officers}`. */
export interface PoliceLines {
  calls: string[];
  noCall: string[];
  turf: string[];
  zone: string[];
  dispatch: string[];
  arrive: string[];
  /** What the panel says while officers have the player, at the scene, on a warrant or stopping them to search them. */
  facing: Record<ConfrontWhy, string>;
  /** A patrol stopping someone carrying; what a search turns up (`{found}`, `{gang}`, `{owed}`), and nothing found. */
  frisk: string[];
  seized: string[];
  clean: string[];
  missed: string[];
  stop: string[];
  fined: string[];
  held: string[];
  short: string[];
  ran: string[];
  caught: string[];
  fight: string[];
  /** The other officer, calling it in when the player goes for one. */
  backup: string[];
  released: string[];
  lapsed: string[];
  cameTo: string[];
}

/** The NCPD's rules and what's said of it. */
export interface PoliceContent extends PoliceRules {
  lines: PoliceLines;
}

/** What's on record: a crime someone called in. */
export interface Report {
  id: number;
  crime: Crime;
  at: number;
  district: string;
  /** Where: the building's or the place's name. */
  place: string;
  /** Whether someone who called knew the player's face. */
  named: boolean;
  /** What the callers saw of them ("a balaclava", "your face"). */
  seen: string;
}

/** A unit on its way to where something was called in: a building or a place, else that spot on the street. */
export interface Dispatch {
  report: number;
  crime: Crime;
  spot: Spot | null;
  x: number;
  y: number;
  arriveAt: number;
  /** The two officers coming. */
  officers: string[];
  /** Whether the player saw it called in, and so knows a unit is coming. */
  told: boolean;
}

/** A warrant out for the player, from a report that named them. */
export interface Warrant {
  crime: Crime;
  district: string;
  since: number;
  /** When it lapses; null, never (murder). */
  until: number | null;
}

/** Officers here, weapons out, for the player: at the scene, on a warrant, or to search them. */
export interface Confrontation {
  officers: string[];
  crime: Crime;
  why: ConfrontWhy;
  at: number;
}

/** Someone out cold who may call it in once they come to: the odds they will, and how the NCPD works where it happened. */
export interface PendingCall {
  person: string;
  crime: Crime;
  at: number;
  /** Whether they'd know the player's face (they knew them, and there was no mask). */
  named: boolean;
  seen: string;
  odds: number;
  district: string;
  minutes: [number, number];
  spot: Spot;
  x: number;
  y: number;
}

export interface PoliceState {
  reports: Report[];
  dispatch: Dispatch | null;
  warrants: Warrant[];
  /** Held at the precinct till then. */
  held: number | null;
  confront: Confrontation | null;
  pending: PendingCall[];
  /** When a patrol last had the chance to stop the player. */
  lastStop: number;
  nextId: number;
}

export function freshPolice(): PoliceState {
  return { reports: [], dispatch: null, warrants: [], held: null, confront: null, pending: [], lastStop: 0, nextId: 1 };
}

/** What the player can tell of the NCPD at `now`: a unit they know is coming, the warrants out, a hold, officers here. */
export interface PoliceView {
  dispatch: { crime: Crime; arriveAt: number } | null;
  warrants: Warrant[];
  held: number | null;
  reports: number;
  confront: {
    crime: Crime;
    why: ConfrontWhy;
    /** What the officers want, as the panel says it. */
    text: string;
    choices: Array<{ id: PoliceChoice; label: string; sub: string }>;
  } | null;
}

/** What the player does with officers on them: goes quietly, runs for it, or takes them on. */
export type PoliceChoice = 'comply' | 'run' | 'fight';

/** What crimes are charged at, all told: the crimes, the fine and the minutes held; with doses found for a drug crime, more of both a dose. */
export function chargesFor(crimes: Crime[], rules: PoliceRules, doses: Partial<Record<Crime, number>> = {}): { crimes: Crime[]; fine: number; hold: number } {
  const all = [...new Set([...crimes, ...(Object.entries(doses) as Array<[Crime, number]>).filter(([, n]) => n > 0).map(([c]) => c)])].sort((a, b) => rules.crimes[b].rank - rules.crimes[a].rank);
  const per = (c: Crime, key: 'fine' | 'hold') => (rules.crimes[c].perDose?.[key] ?? 0) * (doses[c] ?? 0);
  return { crimes: all, fine: all.reduce((n, c) => n + rules.crimes[c].fine + per(c, 'fine'), 0), hold: all.reduce((n, c) => n + rules.crimes[c].hold + per(c, 'hold'), 0) };
}

/** How the NCPD works where something happened: the chance a witness calls, and how long a unit takes; null where it doesn't go. */
export function policing(district: string, area: string | null, rules: PoliceRules): { call: number; minutes: [number, number] } | null {
  const base = rules.districts[district];
  if (!base) return null;
  const over = area ? rules.areas[area] : undefined;
  return over ? { call: over.call, minutes: over.minutes ?? base.minutes } : base;
}

/** The worst of some crimes. */
export function worstCrime(crimes: Crime[], rules: PoliceRules): Crime | null {
  return crimes.reduce<Crime | null>((worst, c) => (!worst || rules.crimes[c].rank > rules.crimes[worst].rank ? c : worst), null);
}

/** The warrants still out at `now`. */
export function warrantsAt(state: PoliceState, now: number): Warrant[] {
  return state.warrants.filter((w) => w.until === null || w.until > now);
}

/** Writes a warrant for a crime, or keeps the one there is for it, made to last from now. */
export function issueWarrant(state: PoliceState, crime: Crime, district: string, now: number, rules: PoliceRules, timeScale: number): void {
  const days = rules.crimes[crime].lapseDays;
  const until = days === null ? null : now + (days * 86_400_000) / timeScale;
  const had = state.warrants.find((w) => w.crime === crime);
  if (had) {
    had.until = had.until === null || until === null ? null : Math.max(had.until, until);
    return;
  }
  state.warrants.push({ crime, district, since: now, until });
}
