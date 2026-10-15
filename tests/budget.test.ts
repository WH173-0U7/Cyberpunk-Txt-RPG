import { describe, expect, it } from 'vitest';
import { CHARISMA } from '../src/data/skills';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { LINES } from '../src/data/dialogue';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game, type GameRules } from '../src/engine/game';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { peopleAt } from '../src/engine/people';
import { createSave, progressFor, readSave } from '../src/engine/save';

/**
 * The performance budget: how long the slow things may take, on a desktop-class machine (a
 * mid-range phone is about four times slower). Measured on the biggest cities the generator
 * makes, as the median of a few runs. Only `npm run bench` runs it (timings on a shared
 * runner say little); run it before and after anything that touches the city or its people.
 */
const BUDGET = {
  /** The city itself, from its seed. */
  generateWorld: 50,
  /** A new game: the people made for the city. */
  newGame: 250,
  /** A save picked up again: read, the city built, the people put back. */
  reload: 300,
  /** The people's days lived up to today, a whole month of them (as far as a catch-up goes). */
  monthAway: 500,
  /** One day lived: what happens at midnight while the game is open. */
  oneDay: 25,
  /** Who's at a spot of an evening, at the slowest spot in the city. */
  peopleHere: 5,
  /** Saving the game. */
  save: 30,
};

const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, jobs: JOBS, life: LIFE, gear: GEAR, money: MONEY, combat: COMBAT };
/** The three biggest cities of sixty seeds, then two ordinary ones. */
const SEEDS = ['b0a7be72', '0c890e08', '7f3a29c1', '0badc0de', '1c0ffee5'];
const DAY = 86_400_000;
const NOW = Date.UTC(2077, 9, 12, 20, 0);

function median(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function timed<T>(run: () => T): [T, number] {
  const t = performance.now();
  const result = run();
  return [result, performance.now() - t];
}

describe.runIf(process.env.BENCH)('the performance budget', () => {
  it('keeps every slow thing inside it, with room to spare', () => {
    const worst: Record<keyof typeof BUDGET, number> = { generateWorld: 0, newGame: 0, reload: 0, monthAway: 0, oneDay: 0, peopleHere: 0, save: 0 };
    let people = 0;
    for (const seed of SEEDS) {
      const runs: Record<keyof typeof BUDGET, number[]> = { generateWorld: [], newGame: [], reload: [], monthAway: [], oneDay: [], peopleHere: [], save: [] };
      for (let round = 0; round < 3; round++) {
        const [world, built] = timed(() => generateWorld(seed, CITY));
        runs.generateWorld.push(built);
        const [game, made] = timed(() => new Game(world, RULES));
        runs.newGame.push(made);
        people = Math.max(people, game.population.people.length);
        game.start(NOW - 31 * DAY);
        runs.monthAway.push(timed(() => game.tick(NOW - DAY))[1]);
        runs.oneDay.push(timed(() => game.tick(NOW))[1]);
        const clock = { hour: 20, weekday: new Date(NOW).getUTCDay(), day: Math.floor(NOW / DAY) };
        // Every storefront and place, and the slowest of them.
        const spots = [...world.buildings.filter((b) => b.business).map((b) => ({ kind: 'building' as const, id: b.id })), ...Object.keys(world.locations).map((id) => ({ kind: 'location' as const, id }))];
        runs.peopleHere.push(Math.max(...spots.map((spot) => timed(() => peopleAt(game.population, world, spot, clock, FOOD.dishes))[1])));
        const [raw, saved] = timed(() => JSON.stringify(createSave(seed, game, GENERATOR_VERSION, NOW)));
        runs.save.push(saved);
        runs.reload.push(
          timed(() => {
            const save = readSave(JSON.parse(raw));
            const again = save && generateWorld(save.seed, CITY);
            const progress = save && again && progressFor(again, save, GENERATOR_VERSION);
            if (again && progress) new Game(again, RULES, progress).start(NOW + 60_000);
          })[1],
        );
      }
      for (const key of Object.keys(worst) as Array<keyof typeof BUDGET>) worst[key] = Math.max(worst[key], median(runs[key]));
    }
    console.log(`The performance budget, the worst of ${SEEDS.length} cities (up to ${people} people), in ms:`);
    console.table(Object.fromEntries((Object.keys(BUDGET) as Array<keyof typeof BUDGET>).map((key) => [key, { took: Number(worst[key].toFixed(1)), budget: BUDGET[key], used: `${Math.round((worst[key] / BUDGET[key]) * 100)}%` }])));
    for (const key of Object.keys(BUDGET) as Array<keyof typeof BUDGET>) expect(worst[key], key).toBeLessThan(BUDGET[key]);
  }, 600_000);
});
