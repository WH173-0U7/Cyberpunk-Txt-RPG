import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { FOOD } from '../src/data/food';
import { JOBS } from '../src/data/jobs';
import { PEOPLE } from '../src/data/people';
import { generateWorld } from '../src/engine/generate';
import { bossAt, bossOf, canPromote, ladderFor, nextRung, rungOf, shiftOpen, shiftPay, type JobState } from '../src/engine/jobs';
import { generatePeople } from '../src/engine/people';
import { createRng } from '../src/engine/rng';

const seeds = Array.from({ length: 12 }, (_, i) => createRng(`jobs-${i}`).next().toString(16).slice(2, 10));

describe('work', () => {
  it('climbs a ladder at every kind of place that hires, from a cheap bottom rung up', () => {
    expect(Object.keys(JOBS.ladders).sort()).toEqual(['clothing', 'food']);
    for (const [category, ladder] of Object.entries(JOBS.ladders)) {
      expect(ladder.length, category).toBeGreaterThanOrEqual(3);
      expect(ladder[0]?.at, category).toBe(0);
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i]!.at, `${category} ${i}`).toBeGreaterThan(ladder[i - 1]!.at);
        expect(ladder[i]!.pay, `${category} ${i}`).toBeGreaterThan(ladder[i - 1]!.pay);
      }
      for (const rung of ladder) {
        expect(rung.energy).toBeGreaterThan(0);
        expect(rung.title.trim()).toBe(rung.title);
        expect(rung.doing).toMatch(/\S/);
      }
      expect(new Set(ladder.map((r) => r.id)).size).toBe(ladder.length);
    }
    const [from, to] = JOBS.hours;
    // From the opening hour up to the closing one, not into it: nine to five means nothing starts at 5:59.
    expect(shiftOpen(from, JOBS)).toBe(true);
    expect(shiftOpen(to - 1, JOBS)).toBe(true);
    expect(shiftOpen(from - 1, JOBS)).toBe(false);
    expect(shiftOpen(to, JOBS)).toBe(false);
    // A luxury place pays more than a secondhand one for the same rung.
    const dishes = JOBS.ladders.food![0]!;
    expect(shiftPay(dishes, 'luxury', JOBS)).toBeGreaterThan(shiftPay(dishes, 'everyday', JOBS));
    expect(shiftPay(dishes, 'everyday', JOBS)).toBeGreaterThan(shiftPay(dishes, 'poverty', JOBS));
  });

  it('moves up on trust, and only once the boss has warmed to the player', () => {
    const ladder = JOBS.ladders.food!;
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

  it('gives every eatery and clothing store one boss who works there, and nobody else a ladder, city by city', () => {
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
          expect(['food', 'clothing'], `${seed} ${building.name}`).toContain(building.category);
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
