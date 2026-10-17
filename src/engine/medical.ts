import type { Quality } from './food';

/**
 * Getting patched up. Meds the player carries (canon 2077 medication, by item id) heal on the
 * spot, in a fight too; a hospital, a street clinic or a ripperdoc treats what's missing for a
 * fee; and a hospital sells Trauma Team's plans, under which a player who goes down in a fight
 * is picked up, kept from being robbed and dropped at the nearest hospital. The numbers are in
 * `src/data/medical.ts`; using, treating and the pickup are `Game`'s.
 */

/** A medication: what it is, what it does (health at once, and more a beat after for a few beats), and our weight, price and note. */
export interface MedKind {
  name: string;
  maker?: string;
  /** The wiki's type: an inhaler, an injector. */
  type: string;
  heal: number;
  /** Health back each beat after, for so many beats (outside a fight, all of it at once). */
  regen?: { perBeat: number; beats: number };
  grams: number;
  /** An everyday counter's price; other tiers scale it like a dish. */
  price: number;
  note: string;
}

/** What a medical counter offers, by business id or kind of place: meds, treatment, Trauma Team's plans. */
export interface MedicalStock {
  meds?: boolean;
  treats?: boolean;
  plans?: boolean;
}

/** One of Trauma Team's plans: its name, how long it runs, what it costs, and what it does when the player goes down. */
export interface CoveragePlan {
  name: string;
  days: number;
  price: number;
  /** The share of their health the player is dropped at the hospital with. */
  restore: number;
  /** The share of the hospital's fee for that the player is billed. */
  copay: number;
  /** The share taken off meds at a counter while on the plan. */
  medsOff?: number;
  note: string;
}

export interface MedicalContent {
  meds: Record<string, MedKind>;
  stores: Record<string, MedicalStock>;
  /** An everyday counter's fee for each point of health treated; other tiers scale it like a dish. */
  perPoint: number;
  /** What patching up is called on the rack, and what it says. */
  treatment: { name: string; note: string };
  plans: Record<string, CoveragePlan>;
  /** What a counter says about itself, by the key its stock is under. */
  blurbs: Record<string, string>;
  /** What kind of care a counter is, by its tier, for the rack's strip. */
  labels: Record<Quality, string>;
}

/** The plan the player is on, and until when. */
export interface Coverage {
  plan: string;
  until: number;
}

/** The plan the player is on now: its id, what it is, and until when. */
export interface CoverageStatus {
  id: string;
  plan: CoveragePlan;
  until: number;
}

/** The menu item a counter's treatment is listed as. */
export const TREATMENT = 'treatment';

/** A word on a med: what it is, who makes it, and what it gives back. */
export function medDetail(med: MedKind): string {
  return [med.type, med.maker ?? '', `+${med.heal} health`, med.regen ? `+${med.regen.perBeat * med.regen.beats} over time` : ''].filter(Boolean).join(' · ');
}

/** All a med gives back, out of a fight: what comes at once, and what would have come after. */
export function medTotal(med: MedKind): number {
  return med.heal + (med.regen ? med.regen.perBeat * med.regen.beats : 0);
}
