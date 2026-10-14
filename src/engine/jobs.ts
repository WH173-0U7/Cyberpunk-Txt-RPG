import type { Quality } from './food';
import type { Person, Population } from './people';
import type { Stance } from './society';
import type { Building, World } from './types';

/**
 * Work: a job behind the counter of a storefront. Every storefront has a boss (the one who
 * runs it); asking them is how a job starts, and it starts at the bottom of the ladder for
 * that kind of place. A shift a day, in working hours, costs energy and pays into the
 * account; every shift is a little trust, and a little rapport with the boss, and once there's
 * enough of both the boss moves the player up a rung. Nothing here touches the clock or the
 * player: `Game` does that. The numbers are in `src/data/jobs.ts`.
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

export interface JobRules {
  /** Who hires, by building category, and their ladder from the bottom up. */
  ladders: Record<string, Rung[]>;
  /** The hours a shift can start, by the clock (from, to inclusive). */
  hours: [number, number];
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

/** The player's job, worked out for a moment: where, for whom, which rung, and whether a shift can start. */
export interface JobStatus {
  building: Building;
  boss: Person | null;
  rung: Rung;
  next: Rung | null;
  trust: number;
  shifts: number;
  /** Eddies a shift pays here. */
  pay: number;
  /** Whether the player is at the workplace right now. */
  here: boolean;
  /** Why a shift can't start now: not here, done for today, or outside the hours. Null when it can. */
  blocked: 'away' | 'done' | 'closed' | null;
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
  /** The clock's day of the last shift (-1: none yet). */
  lastShiftDay: number;
}

const RUNS_IT = /runs the|owner|manager|chef|maître|proprietor/i;

/** Who runs a storefront: the worker whose role says so, else the first one who was there from the start (anyone taken on since is help). Null for a place nobody works at. */
export function bossOf(building: Building, population: Population): Person | null {
  const staff = population.people.filter((p) => p.job.building === building.id && p.diedOn === undefined);
  return staff.find((p) => RUNS_IT.test(p.job.role)) ?? staff.find((p) => p.hiredOn === undefined) ?? staff[0] ?? null;
}

/** The ladder a storefront hires on, if it hires at all. */
export function ladderFor(building: Building, rules: JobRules): Rung[] | null {
  const ladder = building.business ? rules.ladders[building.category] : undefined;
  return ladder?.length ? ladder : null;
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

/** Whether a shift can start at this hour. */
export function shiftOpen(hour: number, rules: JobRules): boolean {
  return hour >= rules.hours[0] && hour <= rules.hours[1];
}

/** A shift's pay at a place of some tier, in whole eddies. */
export function shiftPay(rung: Rung, quality: Quality, rules: JobRules): number {
  return Math.max(1, Math.round(rung.pay * rules.tiers[quality]));
}
