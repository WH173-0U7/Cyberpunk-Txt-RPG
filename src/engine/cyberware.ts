import type { Quality } from './food';
import { createRng } from './rng';
import type { Item } from './types';

/**
 * Cyberware: implants a ripperdoc fits into the body. Every implant is a real 2077 one from
 * the wiki (its name, its maker, the part of the body it goes in, the capacity it takes); a
 * ripperdoc sells a handful, drawn for the clinic from what its tier stocks, and fits what it
 * sells there and then. A cyberware outlet sells them to carry; a carried implant (an `Item`
 * of kind `cyberware`, named by its id) waits on a ripperdoc to fit it, for a fee. The body
 * has the wiki's ten parts, each with the wiki's number of slots, and the player's capacity
 * caps what all of it adds up to. The numbers are in `src/data/cyberware.ts`; fitting and
 * taking out are `Game`'s.
 */

/** The wiki's ten parts of the body that take 2077 cyberware. */
export type BodyPart = 'frontal-cortex' | 'operating-system' | 'arms' | 'face' | 'skeleton' | 'hands' | 'nervous-system' | 'circulatory-system' | 'integumentary-system' | 'legs';

/** The wiki's three kinds of operating system. */
export type SystemKind = 'cyberdeck' | 'sandevistan' | 'berserk';

/** A part of the body: what the wiki calls it, how many implants it takes, and what one weighs carried. */
export interface PartInfo {
  label: string;
  slots: number;
  grams: number;
}

/** An implant as the wiki has it, with our tier, price and note. */
export interface ImplantKind {
  /** The wiki's name for it (its infobox's title): "Mantis Blades", "Sentry"; a cyberdeck by its first mark, "Paraline Mk.1". */
  name: string;
  /** What it's called in a sentence: "Mantis Blades", "Sentry optics". */
  short: string;
  maker?: string;
  part: BodyPart;
  /** For an operating system, which of the wiki's three kinds. */
  system?: SystemKind;
  /** The cyberware capacity it takes (the wiki's). */
  capacity: number;
  /** The wiki's tier it's first sold at, I to V. */
  tier: 1 | 2 | 3 | 4 | 5;
  /** The tier of store that stocks it. */
  quality: Quality;
  price: number;
  note: string;
  /** False for one no ripperdoc sells (it comes off a body, or out of a job): real, but on no rack. */
  sold?: boolean;
}

/** What a store stocks: how many implants, no more than so many for one part of the body, only some parts, a tier up, and whether it fits them. */
export interface ChromeStock {
  count: number;
  perPart?: number;
  /** Only these parts of the body, or kinds of operating system. */
  only?: Array<BodyPart | SystemKind>;
  /** A ripperdoc's rack: the tier above its own as well. */
  up?: boolean;
  /** A ripperdoc: what it sells, it fits there and then, and it fits (or takes out) chrome bought elsewhere for a fee. */
  fits?: boolean;
}

export interface ChromeContent {
  parts: Record<BodyPart, PartInfo>;
  systems: Record<SystemKind, string>;
  implants: Record<string, ImplantKind>;
  /** By business id, or kind of place (a ripperdoc's clinic). */
  stores: Record<string, ChromeStock>;
  /** The tiers of implant a store of each tier stocks. */
  tiers: Record<Quality, Quality[]>;
  /** The cyberware capacity a body has: what everything fitted may add up to. */
  capacity: number;
  /** An everyday ripperdoc's fee for fitting an implant bought elsewhere, or taking one out; other tiers scale it like a dish. */
  fitting: number;
}

/** An implant fitted into the player: which one, and when. */
export interface Fitted {
  id: string;
  since: number;
}

/** The implant an item is, if it is one. */
export function implantOf(item: Pick<Item, 'id' | 'kind'>, chrome: ChromeContent): ImplantKind | null {
  return item.kind === 'cyberware' ? (chrome.implants[item.id] ?? null) : null;
}

/** What an implant weighs carried, in grams: an arm weighs more than a chip for the brain. */
export function implantGrams(implant: ImplantKind, chrome: ChromeContent): number {
  return chrome.parts[implant.part]?.grams ?? 400;
}

/** The capacity everything fitted takes. */
export function capacityUsed(fitted: readonly Fitted[], chrome: ChromeContent): number {
  return fitted.reduce((sum, f) => sum + (chrome.implants[f.id]?.capacity ?? 0), 0);
}

/** What's fitted in one part of the body, earliest first. */
export function fittedIn(fitted: readonly Fitted[], part: BodyPart, chrome: ChromeContent): Fitted[] {
  return fitted.filter((f) => chrome.implants[f.id]?.part === part).sort((a, b) => a.since - b.since);
}

/**
 * Whether an implant can go in: not if it's in already, nor if it would take more capacity
 * than is left once whatever it replaces is out. A part with every slot taken gives up the
 * implant fitted there longest (`replaces`), the way a new one goes in at a ripperdoc.
 */
export function fitCheck(fitted: readonly Fitted[], id: string, capacity: number, chrome: ChromeContent): { ok: true; replaces: string | null } | { ok: false; why: 'unknown' | 'fitted' | 'capacity'; left: number } {
  const implant = chrome.implants[id];
  if (!implant) return { ok: false, why: 'unknown', left: 0 };
  if (fitted.some((f) => f.id === id)) return { ok: false, why: 'fitted', left: 0 };
  const there = fittedIn(fitted, implant.part, chrome);
  const replaces = there.length >= (chrome.parts[implant.part]?.slots ?? 1) ? (there[0]?.id ?? null) : null;
  const left = capacity - capacityUsed(fitted, chrome) + (replaces ? (chrome.implants[replaces]?.capacity ?? 0) : 0);
  return implant.capacity > left ? { ok: false, why: 'capacity', left } : { ok: true, replaces };
}

/** Whether a stock takes an implant: the part it goes in, or its kind of operating system, is one the stock is limited to. */
function stocks(stock: ChromeStock, implant: ImplantKind): boolean {
  return !stock.only || stock.only.includes(implant.part) || Boolean(implant.system && stock.only.includes(implant.system));
}

/**
 * The implants on a store's rack, by id: `count` of those its tier stocks (and ripperdocs sell),
 * no more than `perPart` for any part of the body so a clinic has a spread of them, drawn for
 * the store on its own stream (the same store always has the same rack), and listed by part,
 * then price.
 */
export function chromeStockFor(seed: string, at: string, quality: Quality, stock: ChromeStock, chrome: ChromeContent): string[] {
  const tiers = new Set(chrome.tiers[quality]);
  if (stock.up) for (const t of chrome.tiers[quality === 'poverty' ? 'everyday' : 'luxury']) tiers.add(t);
  const pool = Object.entries(chrome.implants)
    .filter(([, implant]) => implant.sold !== false && tiers.has(implant.quality) && stocks(stock, implant))
    .map(([id]) => id);
  const rng = createRng(`${seed}:chrome:${at}`);
  const perPart = new Map<BodyPart, number>();
  const out: string[] = [];
  for (const id of rng.shuffle(pool)) {
    if (out.length >= stock.count) break;
    const part = chrome.implants[id]!.part;
    const n = perPart.get(part) ?? 0;
    if (stock.perPart && n >= stock.perPart) continue;
    perPart.set(part, n + 1);
    out.push(id);
  }
  const order = Object.keys(chrome.parts);
  const rank = (id: string) => order.indexOf(chrome.implants[id]?.part ?? '');
  const price = (id: string) => chrome.implants[id]?.price ?? 0;
  return out.sort((a, b) => rank(a) - rank(b) || price(a) - price(b));
}

/** "Arms · Arasaka · 8 capacity"; an operating system by its kind: "Cyberdeck · Militech · 14 capacity". */
export function implantDetail(implant: ImplantKind, chrome: ChromeContent): string {
  const where = implant.system ? chrome.systems[implant.system] : chrome.parts[implant.part]?.label;
  return [where, implant.maker, `${implant.capacity} capacity`].filter(Boolean).join(' · ');
}

/** The chrome in the player, worked out: the capacity it takes of what there is, and each implant with its part of the body, in the order of the parts. */
export interface ChromeStatus {
  used: number;
  capacity: number;
  fitted: Array<{ id: string; name: string; short: string; part: BodyPart; label: string; capacity: number; since: number }>;
}

export function chromeStatus(fitted: readonly Fitted[], capacity: number, chrome: ChromeContent): ChromeStatus {
  const order = Object.keys(chrome.parts);
  const rows = fitted.flatMap((f) => {
    const implant = chrome.implants[f.id];
    if (!implant) return [];
    const label = implant.system ? chrome.systems[implant.system] : (chrome.parts[implant.part]?.label ?? implant.part);
    return [{ id: f.id, name: implant.name, short: implant.short, part: implant.part, label, capacity: implant.capacity, since: f.since }];
  });
  rows.sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part) || a.since - b.since);
  return { used: capacityUsed(fitted, chrome), capacity, fitted: rows };
}
