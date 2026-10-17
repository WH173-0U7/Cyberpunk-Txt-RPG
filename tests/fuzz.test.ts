import { describe, expect, it } from 'vitest';
import { CHARISMA, TRADING } from '../src/data/skills';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { COMBAT, JOIN } from '../src/data/combat';
import { CITY } from '../src/data/city';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { HOURS } from '../src/data/hours';
import { INEBRIATION } from '../src/data/inebriation';
import { LINES } from '../src/data/dialogue';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { ROBBERY } from '../src/data/robbery';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { outfit } from '../src/engine/carry';
import { ladderFor, overlaps } from '../src/engine/jobs';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { createRng, hashSeed } from '../src/engine/rng';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import type { Building } from '../src/engine/types';
import { ROOMS } from '../src/data/rooms';
import { POLICE } from '../src/data/police';
import { DEALING } from '../src/data/dealing';
import { CREDIT } from '../src/data/credit';
import { TRADE } from '../src/data/trade';
import { NEEDS } from '../src/data/needs';
import { freshDealing } from '../src/engine/dealing';
import { generatePeople } from '../src/engine/people';

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
  trading: TRADING,
  jobs: JOBS,
  life: LIFE,
  combat: COMBAT,
  gear: GEAR,
  money: MONEY,
  hours: HOURS,
  rooms: ROOMS,
  police: POLICE,
  join: JOIN,
  credit: CREDIT,
  trade: TRADE,
  needs: NEEDS,
  robbery: ROBBERY,
  // Anyone will run for the player, so the crew gets put through its paces.
  dealing: { ...DEALING, crew: { ...DEALING.crew, stances: ['cold', 'wary', 'neutral', 'warm', 'friend'], keen: { gang: 3, user: 3, straight: 3 } } },
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
  // The NCPD: held is never inside anywhere, a unit is two officers at most, one warrant a crime.
  const ncpd = game.policeSaved;
  if (ncpd.held !== null) expect(game.interior, `${about}: inside while held`).toBeNull();
  expect(ncpd.dispatch?.officers.length ?? 0, `${about}: a unit`).toBeLessThanOrEqual(2);
  expect(new Set(ncpd.warrants.map((w) => w.crime)).size, `${about}: warrants`).toBe(ncpd.warrants.length);
  expect(ncpd.reports.length, `${about}: reports kept`).toBeLessThanOrEqual(POLICE.keep);
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
  // What's owed either way is something, and a loan shark's never more than its cap.
  const credit = game.creditSaved;
  if (credit.bank) expect(credit.bank.owed, `${about}: a bank loan`).toBeGreaterThan(0);
  if (credit.shark) expect(credit.shark.owed, `${about}: a loan shark`).toBeGreaterThan(0);
  if (credit.shark) expect(credit.shark.owed, `${about}: a loan shark's cap`).toBeLessThanOrEqual(Math.ceil(credit.shark.borrowed * CREDIT.shark.cap));
  for (const [id, lent] of Object.entries(credit.lent)) expect(lent.owed, `${about}: lent to ${id}`).toBeGreaterThan(0);
  for (const view of game.businesses()) expect(view.till, `${about}: the till at ${view.building.name}`).toBeGreaterThanOrEqual(0);
  // The notes are what the bills come to, and the wallet holds them.
  const held = Object.entries(game.wallet.notes).reduce((n, [d, k]) => n + Number(d) * k, 0);
  expect(held, `${about}: notes against bills`).toBe(game.wallet.bills);
  expect(Object.entries(game.wallet.notes).every(([d, k]) => MONEY.notes.includes(Number(d)) && Number.isInteger(k) && k > 0), `${about}: notes`).toBe(true);
  const hunger = game.hunger(Date.now())!;
  expect(hunger.value, `${about}: how full`).toBeGreaterThanOrEqual(0);
  expect(hunger.value, `${about}: how full`).toBeLessThanOrEqual(100);
  const energy = game.energy(Date.now());
  expect(energy.current, `${about}: energy over the most`).toBeLessThanOrEqual(energy.max);
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
  expect(again.chromeSaved, `${about}: chrome after a save`).toEqual(game.chromeSaved);
  expect(again.healthSaved, `${about}: health after a save`).toEqual(game.healthSaved);
  expect(again.hungerSaved, `${about}: hunger after a save`).toEqual(game.hungerSaved);
  expect(again.policeSaved, `${about}: the NCPD after a save`).toEqual(game.policeSaved);
  expect(again.tradingSaved, `${about}: Trading after a save`).toEqual(game.tradingSaved);
  expect(again.dealingSaved, `${about}: dealing after a save`).toEqual(game.dealingSaved);
  expect(again.habitSaved, `${about}: the habit after a save`).toEqual(game.habitSaved);
  expect(again.roomSaved, `${about}: the room after a save`).toEqual(game.roomSaved);
  expect(again.lodgingSaved, `${about}: the rented room after a save`).toEqual(game.lodgingSaved);
  // A stack is some share filler, never all of it, nor less than none.
  for (const item of game.inventory) if (item.cut !== undefined) expect(item.cut >= 0 && item.cut <= 1, `${about}: ${item.name} cut ${item.cut}`).toBe(true);
  // A runner never holds less than nothing, nor owes it.
  for (const r of game.crew(Date.now())) {
    expect(r.stock, `${about}: ${r.name}'s stock`).toBeGreaterThanOrEqual(0);
    expect(r.cash, `${about}: ${r.name}'s cash`).toBeGreaterThanOrEqual(0);
    expect(r.left, `${about}: ${r.name} owes`).toBeGreaterThanOrEqual(0);
  }
  const health = game.health(Date.now());
  expect(health.current, `${about}: health`).toBeGreaterThanOrEqual(1);
  expect(health.current, `${about}: health`).toBeLessThanOrEqual(health.max);
  // The chrome fits the body: within the capacity, no part over its slots, nothing in twice.
  const chrome = game.chrome();
  expect(chrome.used, `${about}: capacity`).toBeLessThanOrEqual(chrome.capacity);
  for (const [part, info] of Object.entries(GEAR.chrome.parts)) expect(chrome.fitted.filter((f) => f.part === part).length, `${about}: ${part}`).toBeLessThanOrEqual(info.slots);
  expect(new Set(chrome.fitted.map((f) => f.id)).size, `${about}: chrome twice`).toBe(chrome.fitted.length);
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
  // Every job is at a storefront that hires, on a rung of its ladder; as many as fit, never two whose hours clash.
  const jobs = game.jobsSaved;
  const hours = jobs.map((job) => {
    const at = game.world.buildings.find((b) => b.id === job.building);
    const ladder = at ? ladderFor(at, JOBS) : null;
    expect(ladder?.rungs[job.rung], `${about}: job at ${job.building} rung ${job.rung}`).toBeTruthy();
    expect(job.trust, `${about}: trust`).toBeGreaterThanOrEqual(0);
    expect(job.owed ?? 0, `${about}: owed`).toBeGreaterThanOrEqual(0);
    return ladder?.hours ?? ([0, 0] as [number, number]);
  });
  if (hours.length === 2) expect(overlaps(hours[0]!, hours[1]!), `${about}: two jobs at once`).toBe(false);
}

describe('playing badly', () => {
  it('never breaks what the player carries or owns, whatever they do', () => {
    const seeds = Array.from({ length: 3 }, (_, i) => createRng(`fuzz-${i}`).next().toString(16).slice(2, 10));
    let steps = 0;
    for (const seed of seeds) {
      const world = generateWorld(seed, CITY);
      const rng = createRng(`fuzz:${seed}`);
      const stores = world.buildings.filter((b) => (b.business && ['food', 'clothing', 'commodity', 'services', 'firearms', 'melee', 'cyberware', 'netrunning', 'medical', 'lodging'].includes(b.category)) || b.kind === 'apartments');
      let progress: Progress = {
        where: { ...streetSpot(world.locations[world.start] ?? { x: 50, y: 50 }), place: world.start },
        visited: [world.start],
        discovered: [world.start],
        explored: [],
        eddies: 900,
        passUntil: 0,
        trip: null,
        inside: null,
        // Something to sell, to pitch whoever's about, or front a runner.
        items: [{ id: 'glitter', kind: 'consumable', name: 'Glitter', count: 12, in: 'jacket' }, { id: 'cutting-agent', kind: 'component', name: 'Cutting agent', count: 6, in: 'jacket' }],
        // A supplier for the Tyger Claws, who can take on runners.
        dealing: { ...freshDealing(), current: { gang: 'tyger_claws', connect: generatePeople(world, PEOPLE, FOOD.dishes).people.find((p) => p.gang === 'tyger_claws' && DEALING.gangs.tyger_claws!.connects.includes(p.job.role))!.id, rung: DEALING.crew.from, trust: 40, corner: null, front: null, debt: 0, debtAt: 0, collectAt: null, collections: 0, fronts: 6, sold: 60, take: 900, customers: {}, block: { key: -1, served: 0 } } },
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
        /** A fight, played badly to the end: any move there is, or none in time. */
        const playOut = () => {
          for (let beat = 0; beat < 40 && game.fighting; beat++) {
            const view = game.fightView()!;
            // Now and then, someone else of theirs.
            const rest = view.foes.filter((x) => !x.target);
            if (rest.length && rng.chance(0.2)) game.fightTarget(rng.pick(rest)!.id, now);
            const moves = view.moves.filter((m) => m.enabled);
            const move = rng.chance(0.1) || !moves.length ? null : rng.pick(moves)!;
            if (!move) game.tick(view.deadline + 1);
            else if (move.id === 'hack') game.fightMove('hack', now, rng.pick(view.hacks.filter((h) => h.enabled))?.id);
            else game.fightMove(move.id, now);
            for (const line of game.fightView()?.log ?? []) expect(line, `${about}: a fight's line`).not.toMatch(/[{}]|undefined|NaN/);
          }
          expect(game.fighting, `${about}: a fight that never ends`).toBe(false);
          game.leaveFight();
        };
        for (let act = 0; act < 4; act++) {
          // Officers on the player: they go quietly, run or fight, and nothing else till it's settled.
          const cops = game.police(now).confront;
          if (cops) {
            expect(cops.text, `${about}: the NCPD`).not.toMatch(/[{}]|undefined|NaN/);
            expect(game.leave(), `${about}: walking off from the NCPD`).toBe(false);
            game.answerPolice(rng.pick(cops.choices)!.id, now);
            playOut();
            game.tick(now + act * 60_000);
            check(game, `${about}, act ${act}`);
            steps++;
            continue;
          }
          // A collector on the player for a debt: paid, pleaded with or fought, and nothing else till then.
          const collector = game.collector(now);
          if (collector) {
            expect(collector.text, `${about}: a collector`).not.toMatch(/[{}]|undefined|NaN/);
            expect(game.leave(), `${about}: walking off from a collector`).toBe(false);
            const choice = rng.pick(collector.choices.filter((c) => !c.disabled));
            if (choice) game.answerCollector(choice.id, now);
            playOut();
            game.tick(now + act * 60_000);
            check(game, `${about}, act ${act}`);
            steps++;
            continue;
          }
          const menu = game.menu(now);
          const people = game.peopleHere(now);
          const roll = rng.next();
          if (menu && roll < 0.35) {
            const item = rng.pick(menu.items);
            if (item && !game.canBuy(item.id, now)) game.buy(item.id, now);
            // And now and then something sold back, to a counter that deals in it (a fence for what was taken off someone).
            const sells = game.sellables(now)?.items.filter((i) => !i.why) ?? [];
            if (sells.length && rng.chance(0.3)) {
              const sale = rng.pick(sells)!;
              game.sell(sale.id, sale.from, now);
            }
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
            const pick = food.length ? rng.pick(food)! : null;
            // Now and then a drug's cut first, with an agent if there's one on hand.
            if (pick && game.canCut(pick.id, pick.in) === null && rng.chance(0.5)) game.cut(pick.id, pick.in);
            else if (pick) game.consume(pick.id, now);
          } else if (roll < 0.8 && people.length) {
            const who = rng.pick(people)!.person.id;
            const what = rng.next();
            // Someone lying out cold: gone through, or killed, any way the player has.
            const ways = game.finishes(who, now);
            // Taken on as a runner, fronted, settled with, leaned on, let off, let go.
            const crew = game.dealWith(who, now).filter((o) => !o.disabled && /^(crew|recruit)/.test(o.id));
            if (crew.length && rng.chance(0.4)) {
              game.deal(who, rng.pick(crew)!.id, now);
              // A runner on nothing is fronted a package there and then, so their days have something to sell.
              const front = game.dealWith(who, now).filter((o) => o.id.startsWith('crew-front'));
              if (front.length) game.deal(who, rng.pick(front)!.id, now);
            }
            // Borrowed from a loan shark, paid back, lent, asked for back.
            else if (rng.chance(0.2) && game.moneyWith(who, now).some((o) => !o.disabled)) game.moneyMove(who, rng.pick(game.moneyWith(who, now).filter((o) => !o.disabled))!.id, now);
            else if (ways.length && rng.chance(0.5)) {
              game.killCold(who, rng.pick(ways)!.id, now);
              playOut();
            } else if (what < 0.22) game.talk(who, now);
            else if (what < 0.26) game.talk(who, now, 'flirt');
            else if (what < 0.3) {
              const moves = game.romanceWith(who, now);
              const move = moves.length ? rng.pick(moves) : null;
              if (move === 'askOut') game.askOut(who, now);
              else if (move === 'date') game.date(who, now);
              else if (move === 'official') game.makeOfficial(who, now);
              else if (move === 'end') game.endRomance(now);
            }
            else if (what < 0.45) {
              game.rob(who, now);
              // A robbery by fear can turn into a fight; and what they kept back, gone after.
              if (game.fighting) playOut();
              else if (rng.chance(0.5) && game.canSearch(who, now) && game.search(who, now) && game.fighting) playOut();
            }
            else if (what < 0.55 && game.attack(who, now)) {
              // To kill, now and then; to wound, mostly.
              game.setLethal(rng.chance(0.3));
              playOut();
            }
            else if (what < 0.75 && (game.workWith(who) === 'hire' || game.workWith(who) === 'switch')) game.askForWork(who, now);
            else if (what < 0.78 && game.workWith(who) === 'quit') game.setRoster(who, [rng.int(0, 6), rng.int(0, 6)], now);
            else if (what < 0.8 && game.workWith(who) === 'quit') game.quit(now, who);
            else if (what < 0.9 && game.dealWith(who, now).some((o) => !o.disabled)) {
              // Asked to deal, fronted, paid, walked away from, pitched.
              const option = rng.pick(game.dealWith(who, now).filter((o) => !o.disabled))!;
              game.deal(who, option.id, now);
            }
            else if (game.canChop(who)) {
              const hot = game.inventory.find((i) => i.kind === 'credchip' && i.locked);
              if (hot) game.chop(who, hot.id, now);
            } else game.insult(who, now);
          } else if (roll < 0.86 && game.jobStatus(now)?.here) {
            game.work(now);
            const moment = game.shiftEvent(now);
            if (moment) {
              expect(moment.text, `${about}: a shift's moment`).not.toMatch(/[{}]|undefined|NaN/);
              const choice = rng.pick(moment.choices);
              if (rng.chance(0.85)) game.answerShift(choice.id, now);
            }
          } else if (game.clinic() && roll < 0.95) {
            const carried = game.inventory.filter((i) => i.kind === 'cyberware');
            const fitted = game.chromeSaved;
            if (carried.length && rng.chance(0.6)) game.install(rng.pick(carried)!.id, now);
            else if (fitted.length) game.uninstall(rng.pick(fitted)!.id, now);
          } else if (roll < 0.98 && game.roomsView(now)) {
            // Somewhere else in the building: a room on this floor, a door to knock on, another floor.
            const view = game.roomsView(now)!;
            const room = rng.pick(view.rooms)!.room;
            const what = rng.next();
            if (what < 0.5) game.goRoom(room.id, now);
            else if (what < 0.75) game.knock(room.id, now);
            else game.goFloor(rng.int(1, view.floors), now);
            expect(game.room(), `${about}: a room`).not.toBeNull();
          } else if (game.books()) {
            // The books of a place of the player's: money in and out, its prices, selling it.
            const what = rng.next();
            if (what < 0.3) game.putIn(rng.pick([100, 500, 1000])!, now);
            else if (what < 0.6) game.takeOut(now);
            else if (what < 0.9) game.setPrices(rng.pick(['low', 'fair', 'high'] as const)!, now);
            else game.sellBusiness(now);
          } else if (!menu && game.sellables(now)?.items.some((i) => !i.why)) {
            // A fence: whatever it takes.
            const sale = rng.pick(game.sellables(now)!.items.filter((i) => !i.why))!;
            game.sell(sale.id, sale.from, now);
          } else if (game.forSale() && rng.chance(0.5)) game.buyClosed(now);
          else if (game.bank()) {
            const what = rng.next();
            if (what < 0.3) game.deposit();
            else if (what < 0.6) game.withdraw(rng.pick(MONEY.withdrawals) ?? 20);
            else if (what < 0.75) game.exchange();
            else if (what < 0.85) game.bankChips();
            else {
              // A loan taken, or paid off.
              const offer = game.credit(now);
              if (offer?.amounts.length) game.borrow(rng.pick(offer.amounts)!, now);
              else game.repayLoan(now);
            }
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
