import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { DEALING } from '../src/data/dealing';
import { LINES } from '../src/data/dialogue';
import { DRUGS } from '../src/data/drugs';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { HOME } from '../src/data/home';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { NEEDS } from '../src/data/needs';
import { PEOPLE } from '../src/data/people';
import { ROBBERY } from '../src/data/robbery';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRADE } from '../src/data/trade';
import { TRAVEL } from '../src/data/travel';
import { VALUABLES } from '../src/data/valuables';
import { fillOf } from '../src/engine/needs';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, whereIs, type Clock } from '../src/engine/people';
import { createRng } from '../src/engine/rng';
import { fearOf, respond, searchOdds } from '../src/engine/robbery';
import type { Progress } from '../src/engine/save';

/**
 * What the player earns against what it takes and what living costs, so a change to the numbers
 * can't quietly make one way of getting by pointless. Work is gated by the day (a shift a job), the
 * corner and robbery only by energy and their risks, so they're held to what work pays an energy.
 */
const ECONOMY = LIFE.economy;
const ladders = Object.values(JOBS.ladders);
const perEnergy = (pay: number, energy: number) => pay / energy;
/** What an energy of work pays at the top of a ladder, the middle ladder of them, at an everyday place. */
const tops = ladders.map((l) => perEnergy(l.rungs.at(-1)!.pay, l.rungs.at(-1)!.energy)).sort((a, b) => a - b);
const topWork = tops[Math.floor(tops.length / 2)]!;
/** A day's eating, in points of fill. */
const dayFill = (100 / NEEDS.hunger.hours) * 24;

describe('the balance of what the player earns and spends', () => {
  it('pays work by the energy it takes: a few eddies at the bottom, a few dozen at the top, climbing every rung', () => {
    for (const l of ladders) {
      const [bottom, top] = [l.rungs[0]!, l.rungs.at(-1)!];
      expect(perEnergy(bottom.pay, bottom.energy)).toBeGreaterThanOrEqual(5);
      expect(perEnergy(bottom.pay, bottom.energy)).toBeLessThanOrEqual(15);
      expect(perEnergy(top.pay * JOBS.tiers.luxury, top.energy)).toBeGreaterThanOrEqual(20);
      expect(perEnergy(top.pay * JOBS.tiers.luxury, top.energy)).toBeLessThanOrEqual(100);
    }
    expect(topWork).toBeGreaterThanOrEqual(20);
    expect(topWork).toBeLessThanOrEqual(45);
  });

  it("pays the corner no more an energy than the top of work at a luxury place, even at a gang's top rung with its dearest drug", () => {
    const top = DEALING.rungs.at(-1)!;
    const first = DEALING.rungs[0]!;
    for (const [id, drug] of Object.entries(DRUGS)) {
      expect(perEnergy(drug.price * (1 - top.cut), DEALING.corner.energy), id).toBeLessThanOrEqual(topWork * JOBS.tiers.luxury);
    }
    // And a runner's first package pays about what the bottom of work does, give or take its risks.
    for (const gang of Object.values(DEALING.gangs)) {
      const drug = DRUGS[gang.drugs[0]!]!;
      expect(perEnergy(drug.price * (1 - first.cut), DEALING.corner.energy), gang.drugs[0]).toBeLessThanOrEqual(perEnergy(Math.max(...ladders.map((l) => l.rungs[1]!.pay)), 2));
    }
  });

  it("takes energy to rob someone, so what a mugging hauls an energy is no better than the top of an everyday ladder", () => {
    expect(MONEY.rob?.awake).toBeGreaterThanOrEqual(2);
    // What an awake robbery takes on the average, over a city, at its best by fear (a gun drawn, a mask on, every level that counts, nobody about):
    // what they hand over (the cash by their share, the chip once chopped, a valuable fenced), and with a search after, what's left by its odds.
    const world = generateWorld('a1b2c3d4', CITY);
    const people = generatePeople(world, PEOPLE, FOOD.dishes).people.filter((p) => !/^NCPD/.test(p.job.role));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const chipOf = (p: (typeof people)[number]) => p.chip * (1 - MONEY.chopCut);
    const valuable = TRADE.carry.chance.everyday * mean(Object.values(VALUABLES).map((v) => v.price));
    const rng = createRng('balance:rob');
    const takes = people.map((p) => {
      const fear = fearOf({ drawn: 'gun', chrome: false, edge: ROBBERY.fear.levels, armed: false, masked: true, dread: null, courage: p.traits.courage, backup: 0, watching: 0, turf: false, officer: false, hurt: false, drunk: false }, ROBBERY);
      const r = respond(fear, p.traits, false, ROBBERY, rng);
      const all = p.eddies + chipOf(p) + valuable;
      const handed = p.eddies * r.share + (r.chip ? chipOf(p) : 0) + (r.valuable ? valuable : 0);
      return { handed, searched: handed + (all - handed) * searchOdds(fear, p.traits.courage, ROBBERY) };
    });
    expect(perEnergy(mean(takes.map((t) => t.handed)), MONEY.rob!.awake)).toBeLessThanOrEqual(topWork);
    expect(perEnergy(mean(takes.map((t) => t.searched)), MONEY.rob!.awake + ROBBERY.search.energy)).toBeLessThanOrEqual(topWork);
  });

  it("refuses a robbery when the player hasn't the energy for it", () => {
    const world = generateWorld('7f3a29c1', CITY);
    const people = generatePeople(world, PEOPLE, FOOD.dishes).people;
    const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
    const NOON = Date.UTC(2077, 9, 13, 12, 0);
    const rules: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, clock: clockOf };
    const victim = people.find((p) => !p.gang && !/NCPD/.test(p.job.role) && whereIs(p, world, clockOf(NOON), FOOD.dishes, PEOPLE.out)?.spot.kind === 'building')!;
    const at = world.buildings.find((b) => b.id === whereIs(victim, world, clockOf(NOON), FOOD.dishes, PEOPLE.out)!.spot.id)!;
    const progress = (current: number): Progress => ({
      where: { ...streetSpot({ x: at.x + at.w / 2, y: at.y - 0.5 }), building: at.id },
      visited: [],
      discovered: [],
      explored: [],
      eddies: 0,
      passUntil: 0,
      trip: null,
      inside: at.id,
      items: [],
      gear: null,
      money: { bills: 0, coins: 0, account: 0 },
      energy: { current, level: 1, xp: 0, updatedAt: NOON },
      inebriation: null,
      society: null,
      charisma: null,
      job: null,
      life: null,
    });
    const tired = new Game(world, rules, progress(MONEY.rob!.awake - 1));
    tired.start(NOON);
    expect(tired.rob(victim.id, NOON)).toBe(false);
    const fresh = new Game(world, rules, progress(10));
    fresh.start(NOON);
    expect(fresh.rob(victim.id, NOON)).toBe(true);
    expect(fresh.energy(NOON).current).toBe(10 - MONEY.rob!.awake);
  });

  it('keeps a roof and food in reach of the bottom of work, and good food and a good home well out of it', () => {
    const foods = FOOD.dishes.filter((d) => d.kind === 'food' && d.on.length);
    const perFill = foods.map((d) => d.price / fillOf(d, NEEDS.hunger)).sort((a, b) => a - b);
    const week = (perPoint: number, tier = 1) => perPoint * dayFill * 7 * tier;
    const bottom = Math.min(...ladders.map((l) => l.rungs[0]!.pay)) * JOBS.roster.day.length;
    const unit = (tier: 'poverty' | 'everyday' | 'luxury') => ECONOMY.homes.small[tier] * HOME.unit;
    // Eating cheap and renting a cheap unit, a week at the bottom of work is enough, with a little over.
    expect(bottom).toBeGreaterThan(week(perFill[0]!) + unit('poverty'));
    expect(bottom).toBeGreaterThan(week(perFill[0]!) + unit('everyday'));
    // Eating well at a dear place and living up the hill, it isn't.
    expect(week(perFill[Math.floor(perFill.length / 2)]!, 3) + unit('luxury')).toBeGreaterThan(bottom * 2);
  });
});
