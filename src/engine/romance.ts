import type { Lifepath, Look } from './character';
import type { Pronouns } from './people';
import type { Stance } from './society';

/**
 * Romance with the player. Everyone has a heart (people.ts's `heartOf`): whom they're drawn
 * to, by the pronouns people go by, the way in that wins them over, and the look they go
 * for. The player says their own pronouns in Settings. Flirting with someone drawn to the
 * player, and coming at them the way they like, raises their spark (`Standing.spark`, fading
 * on the clock); with enough of it, and enough rapport, they'll say yes to being asked out.
 * Then come dates (an evening at a place with a menu, the player paying for two), making it
 * official, and, sooner or later for some, the end of it: the player's doing, or theirs when
 * the spark is gone or they've caught the player flirting once too often. One at a time:
 * someone the player is seeing is no one else's to fall for (life.ts skips them). The numbers
 * are in `src/data/society.ts` (`SOCIETY.romance`); `Game` does the rest.
 */

export type RomanceStage = 'dating' | 'together';

/** The player, as the people see them: the pronouns they go by (Settings), which decides who's drawn to them. */
export interface You {
  pronouns: Pronouns;
  /** Who they made themselves at the start (character.ts): a save from before the builder has none of it. */
  name?: string;
  lifepath?: Lifepath;
  look?: Look;
}

/** Who the player is seeing, since when, and how many dates so far. */
export interface Romance {
  with: string;
  stage: RomanceStage;
  since: number;
  dates: number;
  lastDateAt: number;
  /** Times they've caught the player flirting with someone else, this time round. */
  caught?: number;
}

/** What can be done about the heart with someone: ask them out, take them out, make it official, end it. */
export type RomanceMove = 'askOut' | 'date' | 'official' | 'end';

export interface RomanceRules {
  /** The youngest anyone can be for any of it. */
  adultAt: number;
  /** Spark lost per day on the game's clock. */
  fadePerDay: number;
  /** Spark per point a flirt lands by, with someone drawn to the player; lost when one falls flat or worse. */
  flirt: number;
  miss: number;
  /** Spark when the way in they fall for (their heart's `wants`) lands. */
  wants: number;
  /** Spark for their favorite as a gift, from someone they're drawn to. */
  gift: number;
  /** What it takes for a yes when asked out (spark, rapport, how they feel), and the spark a yes brings. */
  ask: { spark: number; rapport: number; stances: Stance[]; yes: number };
  /** A date: the hours it can be (from the evening, to past midnight), and what it does; their favorite on the menu adds. */
  date: { from: number; to: number; spark: number; rapport: number; favorite: number };
  /** Making it official: the dates and the spark it takes, and what it brings. */
  official: { dates: number; spark: number; rapport: number };
  /** They end it when the spark falls under this, or they've caught the player this many times. */
  endAt: number;
  cheats: number;
  /** Caught flirting with someone else in front of them: spark and rapport lost, grudge taken. */
  jealous: { spark: number; rapport: number; grudge: number };
  /** The player ending it: rapport lost and grudge taken with them, and rapport with their people, by closeness. */
  dumped: { rapport: number; grudge: number; kin: number };
  /** The spark at which they're sweet on the player (lines and the note). */
  sweetAt: number;
}

/** A romance just begun. */
export function freshRomance(id: string, now: number): Romance {
  return { with: id, stage: 'dating', since: now, dates: 0, lastDateAt: 0 };
}

/** Whether an evening's hour is one for a date: from `from` until `to` past midnight. */
export function dateHour(hour: number, rules: RomanceRules): boolean {
  return rules.date.from <= rules.date.to ? hour >= rules.date.from && hour < rules.date.to : hour >= rules.date.from || hour < rules.date.to;
}
