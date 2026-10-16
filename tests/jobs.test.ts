import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { JOBS } from '../src/data/jobs';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { bossAt, bossOf, canPromote, ladderFor, lineOf, nextRung, overlaps, overnight, rungOf, shiftDay, shiftOpen, shiftPay, startOf, type JobState } from '../src/engine/jobs';
import { generatePeople } from '../src/engine/people';
import { createRng } from '../src/engine/rng';

const seeds = Array.from({ length: 12 }, (_, i) => createRng(`jobs-${i}`).next().toString(16).slice(2, 10));

describe('work', () => {
  it('climbs a ladder at every kind of storefront, from a cheap bottom rung up, in the ladder\'s own hours', () => {
    const categories = Object.entries(CITY.buildings.categories).filter(([, c]) => c.business).map(([id]) => id);
    // Every kind of storefront hires; a business's own ladder is over its category's.
    for (const category of categories) expect(JOBS.ladders[category], category).toBeDefined();
    for (const id of Object.keys(JOBS.ladders)) expect(categories.includes(id) || CITY.buildings.businesses.some((b) => b.id === id), id).toBe(true);
    for (const [line, { hours, rungs }] of Object.entries(JOBS.ladders)) {
      expect(rungs.length, line).toBeGreaterThanOrEqual(3);
      expect(rungs[0]?.at, line).toBe(0);
      for (let i = 1; i < rungs.length; i++) {
        expect(rungs[i]!.at, `${line} ${i}`).toBeGreaterThan(rungs[i - 1]!.at);
        expect(rungs[i]!.pay, `${line} ${i}`).toBeGreaterThan(rungs[i - 1]!.pay);
      }
      for (const rung of rungs) {
        expect(rung.energy).toBeGreaterThan(0);
        expect(rung.title.trim()).toBe(rung.title);
        expect(rung.doing).toMatch(/\S/);
      }
      expect(new Set(rungs.map((r) => r.id)).size).toBe(rungs.length);
      // A shift of hours that fit a day: a day job's, or a night's past midnight.
      const length = overnight(hours) ? 24 - hours[0] + hours[1] : hours[1] - hours[0];
      expect(length, line).toBeGreaterThanOrEqual(6);
      expect(length, line).toBeLessThanOrEqual(10);
    }
    // A bar works nights, and a night job sits beside a day job without a clash; two day jobs clash.
    expect(overnight(JOBS.ladders.nightlife!.hours)).toBe(true);
    expect(overlaps(JOBS.ladders.food!.hours, JOBS.ladders.nightlife!.hours)).toBe(false);
    expect(overlaps(JOBS.ladders.food!.hours, JOBS.ladders.clothing!.hours)).toBe(true);
    // A luxury place pays more than a secondhand one for the same rung.
    const dishes = JOBS.ladders.food!.rungs[0]!;
    expect(shiftPay(dishes, 'luxury', JOBS)).toBeGreaterThan(shiftPay(dishes, 'everyday', JOBS));
    expect(shiftPay(dishes, 'everyday', JOBS)).toBeGreaterThan(shiftPay(dishes, 'poverty', JOBS));
  });

  it('keeps its perks and shift moments to lines of work that exist, with a line for every turn they take', () => {
    const lines = new Set(Object.keys(JOBS.ladders));
    const { perks, events } = JOBS;
    expect(perks.discount).toBeGreaterThan(0);
    expect(perks.discount).toBeLessThan(1);
    for (const line of [...Object.keys(perks.meal), ...Object.keys(perks.uniform)]) expect(lines.has(line), line).toBe(true);
    for (const [line, rung] of Object.entries(perks.uniform)) expect(rung, line).toBeLessThan(JOBS.ladders[line]!.rungs.length);
    expect(perks.keys).toBeLessThan(Math.min(...Object.values(JOBS.ladders).map((l) => l.rungs.length)));
    for (const list of Object.values(events.where)) for (const line of list ?? []) expect(lines.has(line), line).toBe(true);
    expect(Object.values(events.weights).every((w) => w >= 0)).toBe(true);
    const turns = { rush: ['Open', 'Hustle', 'Pace'], shoplifter: ['Open', 'Stop', 'Let'], cut: ['Open', 'Pay', 'Stand', 'Worse'], cover: ['Open', 'Yes', 'No'] };
    const vars = new Set(['who', 'Who', 'he', 'He', 'his', 'His', 'him', 'work', 'gang', 'tips', 'pay']);
    for (const [kind, keys] of Object.entries(turns)) {
      for (const key of keys) {
        const pool = events.lines[`${kind}${key}`];
        expect(pool?.length, `${kind}${key}`).toBeGreaterThan(0);
        for (const text of pool ?? []) for (const [, name] of text.matchAll(/\{(\w+)\}/g)) expect(vars.has(name!), `${text}: {${name}}`).toBe(true);
      }
    }
    expect(Object.keys(events.lines).length).toBe(Object.values(turns).flat().length);
  });

  it('opens a shift from the first hour up to the last, past midnight for a night, and counts the small hours as the night before', () => {
    // Nine to five: nothing starts at five.
    expect(shiftOpen(9, [9, 17])).toBe(true);
    expect(shiftOpen(16, [9, 17])).toBe(true);
    expect(shiftOpen(8, [9, 17])).toBe(false);
    expect(shiftOpen(17, [9, 17])).toBe(false);
    // Six till two.
    for (const hour of [18, 23, 0, 1]) expect(shiftOpen(hour, [18, 2]), String(hour)).toBe(true);
    for (const hour of [2, 9, 17]) expect(shiftOpen(hour, [18, 2]), String(hour)).toBe(false);
    expect(shiftDay({ hour: 1, weekday: 6, day: 100 }, [18, 2])).toEqual({ day: 99, weekday: 5 });
    expect(shiftDay({ hour: 1, weekday: 0, day: 100 }, [18, 2])).toEqual({ day: 99, weekday: 6 });
    expect(shiftDay({ hour: 22, weekday: 5, day: 100 }, [18, 2])).toEqual({ day: 100, weekday: 5 });
    expect(shiftDay({ hour: 1, weekday: 2, day: 100 }, [9, 17])).toEqual({ day: 100, weekday: 2 });
  });

  it('starts someone with experience in the line, or a good word from their last boss, a rung or two up', () => {
    const food = JOBS.ladders.food!;
    expect(startOf(food, 0, false, JOBS)).toEqual({ rung: 0, trust: 0 });
    // A good word alone: trust, not yet a rung.
    expect(startOf(food, 0, true, JOBS)).toEqual({ rung: 0, trust: JOBS.reference.trust });
    // A dozen shifts in the line: half of them count, and that's prep.
    expect(startOf(food, 12, false, JOBS)).toEqual({ rung: 1, trust: 6 });
    // Most of a month of it and a reference: further up; never the top, which is earned at the place.
    expect(startOf(food, 30, true, JOBS)).toEqual({ rung: 2, trust: 19 });
    expect(startOf(food, 400, true, JOBS).rung).toBe(food.rungs.length - 2);
  });

  it('moves up on trust, and only once the boss has warmed to the player', () => {
    const ladder = JOBS.ladders.food!.rungs;
    const job: JobState = { building: 'b', rung: 0, trust: 0, shifts: 0, lastShiftDay: -1 };
    expect(rungOf(job, ladder)).toBe(ladder[0]);
    expect(nextRung(job, ladder)).toBe(ladder[1]);
    expect(canPromote(job, ladder, 'friend', JOBS)).toBe(false);
    job.trust = ladder[1]!.at;
    expect(canPromote(job, ladder, 'neutral', JOBS)).toBe(false);
    expect(canPromote(job, ladder, 'warm', JOBS)).toBe(true);
    expect(canPromote(job, ladder, 'friend', JOBS)).toBe(true);
    const top: JobState = { ...job, rung: ladder.length - 1, trust: 999 };
    expect(nextRung(top, ladder)).toBeNull();
    expect(canPromote(top, ladder, 'friend', JOBS)).toBe(false);
    // A rung past the end of the ladder (a shorter ladder in a later version) is the top.
    expect(rungOf({ ...job, rung: 99 }, ladder)).toBe(ladder[ladder.length - 1]);
  });

  it('gives every storefront one boss who works there, and nothing else a ladder, city by city', () => {
    for (const seed of seeds) {
      const world = generateWorld(seed, CITY);
      const population = generatePeople(world, PEOPLE, FOOD.dishes);
      let hiring = 0;
      for (const building of world.buildings) {
        const ladder = ladderFor(building, JOBS);
        if (!building.business) {
          expect(ladder, `${seed} ${building.name}`).toBeNull();
          continue;
        }
        const boss = bossOf(building, population);
        expect(boss?.job.building, `${seed} ${building.name} has a boss`).toBe(building.id);
        if (ladder) {
          hiring++;
          expect(lineOf(building, JOBS), `${seed} ${building.name}`).toBeTruthy();
          // The boss is the one who runs it, as far as the roles say; and knows it.
          expect(bossAt(boss!, world, population, JOBS)?.id, `${seed} ${building.name}`).toBe(building.id);
          for (const other of population.people.filter((p) => p.job.building === building.id && p.id !== boss!.id)) {
            expect(bossAt(other, world, population, JOBS), `${seed} ${other.name} at ${building.name}`).toBeNull();
          }
        } else {
          expect(bossAt(boss!, world, population, JOBS), `${seed} ${building.name} hires`).toBeNull();
        }
      }
      expect(hiring, seed).toBeGreaterThanOrEqual(6);
    }
  });
});
