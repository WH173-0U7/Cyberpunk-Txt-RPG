import { describe, expect, it } from 'vitest';
import { CHARISMA } from '../src/data/skills';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
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
import { createRng, hashSeed } from '../src/engine/rng';
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
  life: LIFE,
  gear: GEAR,
  money: MONEY,
  clock: (now) => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) }),
};

/** Plain data equal all the way down, a missing key the same as one left undefined (as `toEqual` has it). */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== undefined);
  const kx = keys(x);
  return kx.length === keys(y).length && kx.every((k) => same(x[k], y[k]));
}

/** A list of ties boiled down to numbers that don't depend on their order. */
function digest(ties: Array<{ from: string; to: string; kind: string }>): string {
  let sum = 0;
  let mixed = 0;
  for (const t of ties) {
    const h = hashSeed(`${t.from}|${t.to}|${t.kind}`);
    sum = (sum + h) >>> 0;
    mixed ^= Math.imul(h, 2654435761);
  }
  return `${ties.length}:${sum}:${mixed >>> 0}`;
}

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
    // A weapon is one it says, its magazine never past full; something long only in a bag that takes it; rounds of a kind there is.
    if (item.kind === 'weapon') {
      const weapon = GEAR.arms.weapons[item.weapon ?? ''];
      expect(weapon, `${about}: ${item.id} weapon`).toBeTruthy();
      expect(item.count, `${about}: ${item.id} is one`).toBe(1);
      expect(item.loaded ?? 0, `${about}: ${item.id} loaded`).toBeLessThanOrEqual(weapon?.magazine ?? 0);
      if (weapon && GEAR.arms.classes[weapon.class]?.long) expect(GEAR.kinds[pockets.find((p) => p.id === item.in)?.kind ?? '']?.long, `${about}: ${item.id} in ${item.in}`).toBe(true);
    }
    if (item.kind === 'ammo') expect(GEAR.arms.ammo[item.id], `${about}: ${item.id} ammo`).toBeTruthy();
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
  expect(again.lifeSaved, `${about}: the people's days after a save`).toEqual(game.lifeSaved);
  expect(again.youSaved, `${about}: who the player is after a save`).toEqual(game.youSaved);
  // Seeing someone alive, and no one else's.
  const romance = game.societySaved.romance;
  if (romance) {
    const partner = game.population.people.find((p) => p.id === romance.with);
    expect(partner && partner.diedOn === undefined, `${about}: seeing ${romance.with}`).toBe(true);
    expect(again.societySaved.romance, `${about}: romance after a save`).toEqual(romance);
  }
  // The people come back the same (their ties as a set: a friendship made again after a falling out sits elsewhere in the list).
  // Compared as text first, which is quick for hundreds of people; the slow deep match only says what differs.
  // Compared quickly first, which matters for thousands of people and tens of thousands of ties; the slow deep match only says what differs.
  const tiesOf = (ties: Array<{ from: string; to: string; kind: string }>) => ties.map((t) => `${t.from}|${t.to}|${t.kind}`);
  if (!same(again.population.people, game.population.people)) expect(again.population.people, `${about}: the people after a save`).toEqual(game.population.people);
  if (digest(again.population.ties) !== digest(game.population.ties)) expect(tiesOf(again.population.ties).sort(), `${about}: the ties after a save`).toEqual(tiesOf(game.population.ties).sort());
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
      const stores = world.buildings.filter((b) => b.business && ['food', 'clothing', 'commodity', 'services', 'firearms', 'melee'].includes(b.category));
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
        life: null,
      };
      let now = Date.UTC(2077, 9, 12, 11, 0);
      // Each step is a session of its own (a Game made and saved and made again): cities of thousands make that the cost, so forty a city.
      for (let step = 0; step < 40; step++) {
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
          } else if (roll < 0.55) {
            const carried = game.inventory;
            if (carried.length) game.drop(rng.pick(carried)!.id);
          } else if (roll < 0.58) {
            const guns = game.inventory.filter((i) => i.kind === 'weapon');
            const gun = guns.length ? rng.pick(guns)! : null;
            if (gun) rng.chance(0.7) ? game.load(gun.id) : game.unload(gun.id);
          } else if (roll < 0.66) {
            const food = game.inventory.filter((i) => i.kind === 'consumable');
            if (food.length) game.consume(rng.pick(food)!.id, now);
          } else if (roll < 0.8 && people.length) {
            const who = rng.pick(people)!.person.id;
            const what = rng.next();
            if (what < 0.22) game.talk(who, now);
            else if (what < 0.26) game.talk(who, now, 'flirt');
            else if (what < 0.3) {
              const moves = game.romanceWith(who, now);
              const move = moves.length ? rng.pick(moves) : null;
              if (move === 'askOut') game.askOut(who, now);
              else if (move === 'date') game.date(who, now);
              else if (move === 'official') game.makeOfficial(who, now);
              else if (move === 'end') game.endRomance(now);
            }
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
    expect(steps).toBe(480);
  }, 240_000);
});
