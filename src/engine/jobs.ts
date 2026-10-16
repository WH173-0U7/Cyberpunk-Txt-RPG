import type { Quality } from './food';
import type { Person, Population } from './people';
import type { Stance } from './society';
import type { Building, World } from './types';

/**
 * Work: a job behind the counter of a storefront. Every storefront has a boss (the one who
 * runs it); asking them is how a job starts, at the bottom of the ladder for that kind of
 * place, or higher with experience in that line and a reference from a boss who liked the
 * player. A job has its hours (a night ladder's run past midnight) and a weekly roster of
 * days; a shift a rostered day, in its hours, costs energy and is pay owed, paid on payday;
 * every shift is a little trust and a little rapport with the boss, and once there's enough of
 * both the boss moves the player up a rung. A rostered day missed costs trust, and enough in a
 * row is the end of it. The player can hold two jobs whose hours don't overlap: a main one and
 * a side gig. Nothing here touches the clock or the player: `Game` does that. The numbers are
 * in `src/data/jobs.ts`.
 */

/** One step of a ladder: what it's called, what it looks like, what it pays and costs, and the trust it takes to get there. */
export interface Rung {
  id: string;
  title: string;
  /** What the player is doing on a shift there, for the record ("washing dishes"). */
  doing: string;
  /** Eddies a shift pays, before the place's tier. */
  pay: number;
  /** Energy a shift takes. */
  energy: number;
  /** Shifts of trust it takes to be moved up to it. The bottom rung is 0. */
  at: number;
}

/** A kind of work: the hours a shift can start (from, up to; a night's runs past midnight, `to` under `from`) and the rungs from the bottom up. */
export interface Ladder {
  hours: [number, number];
  rungs: Rung[];
}

export interface JobRules {
  /** Who hires, by business id, else by building category: their hours and ladder. */
  ladders: Record<string, Ladder>;
  /** How many jobs at once (never two whose hours overlap). */
  most: number;
  /** The days a new job puts the player on, by its hours: a day job's, a night job's (0 Sunday – 6 Saturday). */
  roster: { day: number[]; night: number[] };
  /** Rapport lost with a boss given notice (less than walking out). */
  notice: number;
  /** The share of the shifts worked in a line of work that count as trust starting elsewhere in it. */
  experience: number;
  /** Trust a reference is worth, from a boss who felt this way about the player. */
  reference: { trust: number; stances: Stance[] };
  /** A rostered day missed: the trust and rapport it costs, and how many in a row is the end of the job. */
  noShow: { trust: number; rapport: number; fireAfter: number };
  /** A raise on payday at a thriving place, as a share of the pay, up to `most`. */
  raise: { thriving: number; most: number };
  /** A boss this loyal minds a side gig when they hear of it, for this much rapport. */
  moonlight: { loyalty: number; rapport: number };
  /** Pay by the place's tier. */
  tiers: Record<Quality, number>;
  /** Trust a shift is worth. */
  trustPerShift: number;
  /** Rapport with the boss a shift is worth. */
  rapport: number;
  /** Reputation with the place a shift is worth. */
  rep: number;
  /** Rapport lost with the boss for walking out. */
  quit: number;
  /** How the boss has to feel about the player to move them up. */
  promoteAt: Stance[];
}

/** A job, worked out for a moment: where, for whom, which rung, when, what's owed, and whether a shift can start. */
export interface JobStatus {
  building: Building;
  boss: Person | null;
  rung: Rung;
  next: Rung | null;
  trust: number;
  shifts: number;
  /** Eddies a shift pays here, the raise included. */
  pay: number;
  /** The side gig (the second job), not the main one. */
  side: boolean;
  hours: [number, number];
  /** The rostered weekdays. */
  days: number[];
  /** Pay worked for since the last payday. */
  owed: number;
  /** Whether the player is at the workplace right now. */
  here: boolean;
  /** Whether a shift could start now, if the player were there: a rostered day, in the hours, not worked yet. */
  open: boolean;
  /** Why a shift can't start now: not here, not a rostered day, done for today, or outside the hours. Null when it can. */
  blocked: 'away' | 'off' | 'done' | 'closed' | null;
}

/** The player's job, as saved. */
export interface JobState {
  /** The storefront. */
  building: string;
  /** Which rung of its ladder, from 0. */
  rung: number;
  /** Shifts of trust built with the boss. */
  trust: number;
  /** Shifts worked, all told. */
  shifts: number;
  /** The shift day of the last shift (-1: none yet). */
  lastShiftDay: number;
  /** The rostered weekdays, 0 Sunday – 6 Saturday (missing: an older save's, Monday to Friday). */
  days?: number[];
  /** Pay worked for since the last payday. */
  owed?: number;
  /** A raise on the rung's pay, as a share. */
  raise?: number;
  /** Rostered days missed in a row. */
  missed?: number;
  /** The last shift day the roster has been checked through for missed days. */
  checked?: number;
  /** The last payday paid through. */
  paidOn?: number;
  /** The main job's boss has heard of the side gig. */
  heard?: boolean;
}

const RUNS_IT = /runs the|owner|manager|chef|maître|proprietor/i;

/** Who runs a storefront: the worker whose role says so, else the first one who was there from the start (anyone taken on since is help). Null for a place nobody works at. `staff`, the living who work there in the population's order, when the caller has it to hand. */
export function bossOf(building: Building, population: Population, staff = population.people.filter((p) => p.job.building === building.id && p.diedOn === undefined)): Person | null {
  return staff.find((p) => RUNS_IT.test(p.job.role)) ?? staff.find((p) => p.hiredOn === undefined) ?? staff[0] ?? null;
}

/** What a storefront's work is filed under (its business, else its category), for the experience the player has in it; null if it doesn't hire. */
export function lineOf(building: Building, rules: JobRules): string | null {
  if (!building.business) return null;
  if (rules.ladders[building.business]?.rungs.length) return building.business;
  return rules.ladders[building.category]?.rungs.length ? building.category : null;
}

/** The ladder a storefront hires on, if it hires at all: its business's own, else its category's. */
export function ladderFor(building: Building, rules: JobRules): Ladder | null {
  const line = lineOf(building, rules);
  return line ? (rules.ladders[line] ?? null) : null;
}

/** The buildings someone is the boss of, if any: a storefront that hires. */
export function bossAt(person: Person, world: World, population: Population, rules: JobRules): Building | null {
  const building = person.job.building ? world.buildings.find((b) => b.id === person.job.building) : undefined;
  if (!building || !ladderFor(building, rules)) return null;
  return bossOf(building, population)?.id === person.id ? building : null;
}

/** The rung a job is at. */
export function rungOf(job: JobState, ladder: Rung[]): Rung {
  return ladder[Math.min(job.rung, ladder.length - 1)] as Rung;
}

/** The rung above, if there is one. */
export function nextRung(job: JobState, ladder: Rung[]): Rung | null {
  return ladder[job.rung + 1] ?? null;
}

/** Whether the boss would move the player up now: the trust is there, and so is the boss's regard. */
export function canPromote(job: JobState, ladder: Rung[], stance: Stance, rules: JobRules): boolean {
  const next = nextRung(job, ladder);
  return Boolean(next) && job.trust >= (next as Rung).at && rules.promoteAt.includes(stance);
}

/** Whether hours run past midnight (a night's). */
export function overnight(hours: [number, number]): boolean {
  return hours[1] <= hours[0];
}

/** Whether a shift can start at this hour: from the first of `hours` up to, not into, the last (past midnight for a night's). */
export function shiftOpen(hour: number, hours: [number, number]): boolean {
  const [from, to] = hours;
  return overnight(hours) ? hour >= from || hour < to : hour >= from && hour < to;
}

/** The day, and its weekday, a shift at this hour counts for: a night's small hours are the night before. */
export function shiftDay(clock: { hour: number; weekday: number; day: number }, hours: [number, number]): { day: number; weekday: number } {
  const before = overnight(hours) && clock.hour < hours[1];
  return before ? { day: clock.day - 1, weekday: (clock.weekday + 6) % 7 } : { day: clock.day, weekday: clock.weekday };
}

/** Whether two jobs' hours share any hour of the day. */
export function overlaps(a: [number, number], b: [number, number]): boolean {
  for (let h = 0; h < 24; h++) if (shiftOpen(h, a) && shiftOpen(h, b)) return true;
  return false;
}

/** Where a new job starts: the highest rung the trust it starts with reaches (the experience in that line that counts, and a reference), short of the top, which is earned at the place itself. */
export function startOf(ladder: Ladder, experience: number, reference: boolean, rules: JobRules): { rung: number; trust: number } {
  const trust = Math.floor(experience * rules.experience) + (reference ? rules.reference.trust : 0);
  let rung = 0;
  ladder.rungs.forEach((r, i) => {
    if (r.at <= trust && i < ladder.rungs.length - 1) rung = i;
  });
  return { rung, trust };
}

/** A shift's pay at a place of some tier, in whole eddies. */
export function shiftPay(rung: Rung, quality: Quality, rules: JobRules): number {
  return Math.max(1, Math.round(rung.pay * rules.tiers[quality]));
}
