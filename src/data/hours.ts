import type { HoursRules } from '../engine/game';

/**
 * Opening hours. A storefront's counter (its menu, its rack, its bank, its ripperdoc's chair)
 * keeps the hours of whoever works it: with none of them in, it's shut, and so is its door.
 * Its people's rota keeps it open through its kind's hours (`PEOPLE.shifts`), and anywhere
 * whose sign says 24/7 round the clock; a hospital never closes, nor does a place of its own
 * (a market, a stall). How far ahead to look for when a counter opens again.
 */
export const HOURS: HoursRules = { close: true, ahead: 36 };
