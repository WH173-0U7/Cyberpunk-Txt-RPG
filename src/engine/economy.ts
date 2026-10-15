import type { Quality } from './food';
import { bossOf } from './jobs';
import type { Person, Population, Spot } from './people';
import { createRng, type Rng } from './rng';
import type { Building, World } from './types';

/**
 * Eddies moving around the city without the player. Every day each person loses a little
 * on living, and most evenings some of them go out and spend what their hangout charges; on
 * payday everyone draws a week's pocket money (a gang's members from the gang's treasury).
 * Every storefront takes its regulars' money and a day's walk-in trade, and pays its staff,
 * its rent and the cut the gang on its turf collects. A till keeps the last week of that,
 * and reads as thriving, steady or struggling: what a shift pays the player there, whether
 * the boss can take anyone on, and how trade looks inside all follow from it. The amounts
 * keep to what people carried before (a week's money is most of what they started with),
 * so a robbery still yields what it did; what changes is the rhythm: flush on a Friday
 * night, short by Thursday. Drawn from the seed and the day like the rest of a day; the
 * numbers are in `src/data/economy.ts`.
 */
export type Health = 'thriving' | 'steady' | 'struggling';

/** A storefront's books: the last days' nets (takings less the day's costs), oldest first, a week at most; and what the player has spent there since the last day was lived. */
export interface Till {
  days: number[];
  pending: number;
}

export interface EconomyRules {
  /** The weekday eddies are paid (0 Sunday – 6 Saturday). */
  payday: number;
  /** A week's pocket money, as a share of what someone started with. */
  wage: number;
  /** What living costs a day, as a share of what they started with; and the share of whatever they hold that goes besides, so nobody piles it up. */
  living: number;
  drain: number;
  /** The chance of an evening out, from the least chatty to the most; what one costs by the place's tier; and how many evenings' worth they keep back before they'll go. */
  outing: [number, number];
  spend: Record<Quality, number>;
  stayIn: number;
  /** A storefront's walk-in trade a day by tier (from, to; drawn once per storefront, then a daily swing either way), its rent a day, what a week of one worker costs it, and the boss as a multiple of that. */
  walkIn: Record<Quality, [number, number]>;
  swing: number;
  rent: Record<Quality, number>;
  staff: Record<Quality, number>;
  boss: number;
  /** The share of a storefront's takings the gangs on its turf collect; and the share of a wage a gang's member makes on their own rackets, whatever the chest holds. */
  protection: number;
  rackets: number;
  /** The most a gang's chest holds after payday, in weeks of its members' wages: the rest goes on guns, rides and rent. */
  chestWeeks: number;
  /** A week's margin over its costs that makes a place thriving; below nothing it's struggling. */
  thrivingAt: number;
  /** What a shift pays the player, by how the place is doing. */
  pay: Record<Health, number>;
  /** How trade reads inside, by how the place is doing. */
  trade: Record<Health, string>;
}

/** Who collects in each district, from the people data's turf table: every gang there, by its share of the turf. */
export function turfFrom(turf: Record<string, Array<[string, number]>>): (district: string) => Array<[string, number]> {
  return (district) => {
    const gangs = turf[district] ?? [];
    const total = gangs.reduce((n, [, w]) => n + w, 0);
    return total > 0 ? gangs.map(([gang, w]) => [gang, w / total]) : [];
  };
}

/** The weekday of a clock day (0 Sunday – 6 Saturday): day 0 was a Thursday. */
export function weekdayOf(day: number): number {
  return (((day + 4) % 7) + 7) % 7;
}

/** A storefront's till, started empty if it has none. */
export function tillOf(tills: Record<string, Till>, id: string): Till {
  return (tills[id] ??= { days: [], pending: 0 });
}

/** A week's pocket money. */
export function wageOf(base: number, rules: EconomyRules): number {
  return Math.max(1, Math.round(base * rules.wage));
}

/** What a week of a storefront's people costs it: each worker, the boss more. */
export function staffCostOf(staff: Person[], boss: Person | null, tier: Quality, rules: EconomyRules): number {
  return staff.length * rules.staff[tier] + (boss ? rules.staff[tier] * (rules.boss - 1) : 0);
}

/** How a place is doing on its last week: thriving when the week's net clears a share of its costs, struggling when it lost money, steady in between, and steady until a whole week is on the books. */
export function healthOf(till: Till | undefined, weeklyCosts: number, rules: EconomyRules): Health {
  if (!till || till.days.length < 7) return 'steady';
  const net = till.days.reduce((n, d) => n + d, 0);
  if (net < 0) return 'struggling';
  return net > rules.thrivingAt * weeklyCosts ? 'thriving' : 'steady';
}

/** The eddies and the books a day moves, written onto the people and the state. */
export interface EconomyState {
  eddies: Record<string, number>;
  tills: Record<string, Till>;
  treasuries: Record<string, number>;
  hurt: Record<string, number>;
}

export interface EconomyDay {
  world: World;
  population: Population;
  state: EconomyState;
  rules: EconomyRules;
  /** The tier a place runs at: its menu's, its rack's, or its district's. */
  tier: (spot: Spot) => Quality;
  /** The gangs that collect in a district, each with its share of the turf. */
  turf: (district: string) => Array<[string, number]>;
  /** What everyone started with, for their wages. */
  base: ReadonlyMap<string, number>;
  seed: string;
  day: number;
  rng: Rng;
}

/**
 * One day of the economy: trade and spending into the tills, living off what people hold,
 * the gangs' cut, and on payday a week's money for everyone.
 */
export function economyDay({ world, population, state, rules, tier, turf, base, seed, day, rng }: EconomyDay): void {
  const storefronts = world.buildings.filter((b) => b.business);
  const byId = new Map(storefronts.map((b) => [b.id, b]));
  const staffOf = new Map<string, Person[]>();
  for (const p of population.people) {
    if (!p.job.building || !byId.has(p.job.building) || p.diedOn !== undefined) continue;
    const staff = staffOf.get(p.job.building);
    if (staff) staff.push(p);
    else staffOf.set(p.job.building, [p]);
  }
  const takings = new Map<string, number>();
  // What walked in off the street, and what the player left on the counter.
  for (const b of storefronts) {
    const t = tier({ kind: 'building', id: b.id });
    const [lo, hi] = rules.walkIn[t];
    const usual = createRng(`${seed}:economy:${b.id}`).range(lo, hi);
    const till = tillOf(state.tills, b.id);
    takings.set(b.id, usual * rng.range(1 - rules.swing, 1 + rules.swing) + till.pending);
    till.pending = 0;
  }
  const payday = weekdayOf(day) === rules.payday;
  // Each gang's wage bill today, for what its chest keeps back.
  const payroll = new Map<string, number>();
  for (const person of population.people) {
    // The dead neither spend nor earn.
    if (person.diedOn !== undefined) continue;
    const laidUp = (state.hurt[person.id] ?? -1) >= day;
    const started = base.get(person.id) ?? person.eddies;
    // Living costs a day's share of a week's money, and a little of whatever they hold besides.
    person.eddies = Math.max(0, person.eddies - Math.round(started * rules.living) - Math.floor(person.eddies * rules.drain));
    // An evening out, when they've the money for it: what it costs goes to the place.
    const hangout = person.likes.hangout;
    const chance = rules.outing[0] + person.traits.chatty * (rules.outing[1] - rules.outing[0]);
    if (hangout && !laidUp && rng.chance(chance)) {
      const spend = rules.spend[tier(hangout)];
      if (person.eddies >= spend * rules.stayIn) {
        person.eddies -= spend;
        if (hangout.kind === 'building' && takings.has(hangout.id)) takings.set(hangout.id, (takings.get(hangout.id) as number) + spend);
      }
    }
    // Payday: a week's pocket money; a gang's members make some on their own rackets and draw the rest from the gang's chest, while it lasts.
    if (payday) {
      const wage = wageOf(started, rules);
      if (person.gang) {
        payroll.set(person.gang, (payroll.get(person.gang) ?? 0) + wage);
        const chest = state.treasuries[person.gang] ?? 0;
        const paid = Math.min(wage, chest);
        state.treasuries[person.gang] = chest - paid;
        person.eddies += paid + Math.round(wage * rules.rackets);
      } else person.eddies += wage;
    }
    state.eddies[person.id] = person.eddies;
  }
  // The books: takings against the day's share of the week's wages, the rent and the gang's cut.
  for (const b of storefronts) {
    const t = tier({ kind: 'building', id: b.id });
    const staff = staffOf.get(b.id) ?? [];
    const took = takings.get(b.id) ?? 0;
    const gangs = turf(b.district);
    const cut = gangs.length ? took * rules.protection : 0;
    for (const [gang, share] of gangs) state.treasuries[gang] = (state.treasuries[gang] ?? 0) + cut * share;
    const net = took - cut - rules.rent[t] - staffCostOf(staff, bossOf(b, population, staff), t, rules) / 7;
    const till = tillOf(state.tills, b.id);
    till.days.push(Math.round(net) || 0);
    if (till.days.length > 7) till.days.splice(0, till.days.length - 7);
  }
  // Paid out, a chest keeps a few weeks of wages in hand and spends the rest.
  if (payday) for (const [gang, wages] of payroll) state.treasuries[gang] = Math.min(state.treasuries[gang] ?? 0, wages * rules.chestWeeks);
  for (const gang of Object.keys(state.treasuries)) state.treasuries[gang] = Math.round(state.treasuries[gang] as number) || 0;
}

/** How a storefront is doing, and the line that says so inside. */
export function tradeAt(building: Building, population: Population, tills: Record<string, Till>, tier: Quality, rules: EconomyRules): { health: Health; line: string } {
  const staff = population.people.filter((p) => p.job.building === building.id && p.diedOn === undefined);
  const health = healthOf(tills[building.id], staffCostOf(staff, bossOf(building, population), tier, rules) + rules.rent[tier] * 7, rules);
  return { health, line: rules.trade[health] };
}
