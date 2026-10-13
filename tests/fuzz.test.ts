import { describe, expect, it } from 'vitest';
import { CHARISMA } from '../src/data/skills';
import { JOBS } from '../src/data/jobs';
import { CITY } from '../src/data/city';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { LINES } from '../src/data/dialogue';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { outfit } from '../src/engine/carry';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Building } from '../src/engine/types';

/**
 * Plays badly on purpose: a few hundred random steps in real cities, buying, wearing, dropping,
 * robbing, banking and chopping, and after every one checks what must always hold of what the
 * player carries and owns, and that a save picks it all up again exactly.
 */
const RULES: GameRules = {
  ...TRAVEL,
  energy: ENERGY,
  food: FOOD,
  inebriation: INEBRIATION,
  people: PEOPLE,
  society: SOCIETY,
  lines: LINES,
  charisma: CHARISMA,
  jobs: JOBS,
  gear: GEAR,
  money: MONEY,
  clock: (now) => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) }),
};

function check(game: Game, about: string): void {
  const pockets = game.gearSaved;
  const items = game.inventory;
  const ids = new Set(pockets.map((p) => p.id));
  expect(ids.size, `${about}: pocket ids`).toBe(pockets.length);
  for (const item of items) {
    expect(item.count, `${about}: ${item.id} count`).toBeGreaterThan(0);
    expect(item.in && ids.has(item.in), `${about}: ${item.id} is in ${item.in}, which there is no such pocket as`).toBe(true);
    if (item.kind === 'credchip') expect(item.balance ?? -1, `${about}: ${item.id} balance`).toBeGreaterThanOrEqual(0);
    if (item.kind === 'clothing') expect(item.gear && GEAR.kinds[item.gear], `${about}: ${item.id} gear`).toBeTruthy();
  }
  for (const p of pockets) expect(p.in === null || ids.has(p.in), `${about}: pocket ${p.id} is in ${p.in}`).toBe(true);
  // One garment per slot, always dressed in the four a new player gets, the wallet somewhere with slots.
  const { worn } = outfit(pockets, GEAR);
  for (const slot of ['inner', 'outer', 'legs', 'feet'] as const) expect(worn[slot], `${about}: nothing on the ${slot}`).toBeDefined();
  const garments = pockets.filter((p) => p.in === null && GEAR.kinds[p.kind]?.slot);
  expect(new Set(garments.map((p) => GEAR.kinds[p.kind]?.slot)).size, `${about}: two garments in a slot`).toBe(garments.length);
  const wallet = pockets.find((p) => p.kind === 'wallet');
  expect(wallet?.in && (GEAR.kinds[pockets.find((p) => p.id === wallet.in)?.kind ?? '']?.slots ?? 0) > 0, `${about}: the wallet is in ${wallet?.in}`).toBe(true);
  // Nothing over its limits, ever.
  for (const p of game.carry().pockets) expect(p.over, `${about}: ${p.id} is over (${p.load.slots}/${p.slots}, ${p.load.grams}/${p.maxGrams} g)`).toBe(false);
  const { bills, coins, account, chips } = game.wallet;
  for (const [k, v] of Object.entries({ bills, coins, account, chips })) expect(v, `${about}: ${k}`).toBeGreaterThanOrEqual(0);
  // A save brings all of it back.
  const save = readSave(JSON.parse(JSON.stringify(createSave(game.world.seed, game, GENERATOR_VERSION))));
  const progress = save && resume(game.world, save);
  expect(progress, `${about}: save`).toBeTruthy();
  const again = new Game(game.world, RULES, progress as Progress);
  expect(again.inventory, `${about}: items after a save`).toEqual(items);
  expect(again.gearSaved, `${about}: pockets after a save`).toEqual(pockets);
  expect(again.wallet, `${about}: wallet after a save`).toEqual(game.wallet);
  expect(again.jobSaved, `${about}: job after a save`).toEqual(game.jobSaved);
  // A job is always at a storefront that hires, on a rung of its ladder.
  const job = game.jobSaved;
  if (job) {
    const at = game.world.buildings.find((b) => b.id === job.building);
    expect(at && JOBS.ladders[at.category]?.[job.rung], `${about}: job at ${job.building} rung ${job.rung}`).toBeTruthy();
    expect(job.trust, `${about}: trust`).toBeGreaterThanOrEqual(job.shifts * 0);
  }
}

describe('playing badly', () => {
  it('never breaks what the player carries or owns, whatever they do', () => {
    const seeds = Array.from({ length: 3 }, (_, i) => createRng(`fuzz-${i}`).next().toString(16).slice(2, 10));
    let steps = 0;
    for (const seed of seeds) {
      const world = generateWorld(seed, CITY);
      const rng = createRng(`fuzz:${seed}`);
      const stores = world.buildings.filter((b) => b.business && ['food', 'clothing', 'commodity', 'services'].includes(b.category));
      let progress: Progress = {
        where: { ...streetSpot(world.locations[world.start] ?? { x: 50, y: 50 }), place: world.start },
        visited: [world.start],
        discovered: [world.start],
        explored: [],
        eddies: 900,
        passUntil: 0,
        trip: null,
        inside: null,
        items: [],
        gear: null,
        money: { bills: 900, coins: 0, account: 1500 },
        energy: null,
        inebriation: null,
        society: null,
        charisma: null,
        job: null,
      };
      let now = Date.UTC(2077, 9, 12, 11, 0);
      for (let step = 0; step < 60; step++) {
        // Somewhere new to be, by day or by night.
        const at = rng.pick(stores) as Building;
        now += rng.int(1, 9) * 3_600_000;
        const game = new Game(world, RULES, { ...progress, where: { ...streetSpot({ x: at.x + at.w / 2, y: at.y - 0.5 }), building: at.id }, inside: at.id, trip: null });
        game.start(now);
        const about = `${seed} step ${step} at ${at.name} (${at.business})`;
        for (let act = 0; act < 4; act++) {
          const menu = game.menu();
          const people = game.peopleHere(now);
          const roll = rng.next();
          if (menu && roll < 0.35) {
            const item = rng.pick(menu.items);
            if (item && !game.canBuy(item.id, now)) game.buy(item.id, now);
          } else if (roll < 0.47) {
            const clothes = game.inventory.filter((i) => i.kind === 'clothing');
            if (clothes.length) game.wear(rng.pick(clothes)!.id);
          } else if (roll < 0.5) {
            const worn = game.gearSaved.filter((p) => p.in === null);
            game.takeOff(rng.pick(worn)!.id);
          } else if (roll < 0.58) {
            const carried = game.inventory;
            if (carried.length) game.drop(rng.pick(carried)!.id);
          } else if (roll < 0.66) {
            const food = game.inventory.filter((i) => i.kind === 'consumable');
            if (food.length) game.consume(rng.pick(food)!.id, now);
          } else if (roll < 0.8 && people.length) {
            const who = rng.pick(people)!.person.id;
            const what = rng.next();
            if (what < 0.3) game.talk(who, now);
            else if (what < 0.55) game.rob(who, now);
            else if (what < 0.75 && game.workWith(who) === 'hire') game.askForWork(who, now);
            else if (what < 0.8 && game.workWith(who) === 'quit') game.quit(now);
            else if (game.canChop(who)) {
              const hot = game.inventory.find((i) => i.kind === 'credchip' && i.locked);
              if (hot) game.chop(who, hot.id, now);
            } else game.insult(who, now);
          } else if (roll < 0.86 && game.jobStatus(now)?.here) {
            game.work(now);
          } else if (game.bank()) {
            const what = rng.next();
            if (what < 0.3) game.deposit();
            else if (what < 0.6) game.withdraw(rng.pick(MONEY.withdrawals) ?? 20);
            else if (what < 0.8) game.exchange();
            else game.bankChips();
          }
          game.tick(now + act * 60_000);
          check(game, `${about}, act ${act}`);
          steps++;
        }
        const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, GENERATOR_VERSION))));
        progress = (save && resume(world, save)) as Progress;
        expect(progress, about).toBeTruthy();
      }
    }
    expect(steps).toBe(720);
  }, 120_000);
});
