import type { HoursRules } from '../engine/game';

/**
 * Opening hours. A storefront's counter (its menu, its rack, its bank, its ripperdoc's chair)
 * keeps the hours of whoever works it: with none of them in, it's shut. A hospital and anywhere
 * whose sign says 24/7 never close (half their hands work nights); a place of its own (a
 * market, a stall) never closes either. How far ahead to look for when a counter opens again.
 */
export const HOURS: HoursRules = { close: true, ahead: 36 };
