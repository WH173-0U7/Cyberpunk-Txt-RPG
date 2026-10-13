import { describe, expect, it } from 'vitest';
import { cellOf, Game, streetSpot, type GameRules } from '../src/engine/game';
import type { GearContent } from '../src/engine/carry';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { LINES } from '../src/data/dialogue';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { openness } from '../src/engine/dialogue';
import { SOCIETY } from '../src/data/society';
import type { Progress } from '../src/engine/save';
import type { TravelRules } from '../src/engine/travel';
import type { GameEvents, Location, Whereabouts, World } from '../src/engine/types';

// A small city on a 3×3 grid of streets:
//
//   alley ── market ── bar        (y = 20)
//   [S1]       |       [S2]       (y = 50, NCART stations on Line 1)
//             roof        dock    (y = 80; the dock has no routes, you find it on foot)
//
// Off the top street between the alley and the market, a gun shop you can go into and a noodle
// bar with a menu; off the middle street, a park you can't go into. The bar is a diner.
function place(id: string, x: number, y: number, links: string[], extra: Partial<Location> = {}): Location {
  return {
    id,
    name: id[0]?.toUpperCase() + id.slice(1),
    kind: 'test',
    kindLabel: 'Test',
    district: 'test',
    weather: 'clear',
    description: `The ${id}.`,
    links,
    ambient: [],
    x,
    y,
    ...extra,
  };
}

const world: World = {
  seed: 'test',
  start: 'alley',
  welcome: 'hello',
  welcomeBack: 'hello again',
  layout: { avenues: [20, 50, 80], streets: [20, 50, 80], coast: null },
  buildings: [
    { id: 'b-shop', block: 'B1', district: 'test', kind: 'shops', kindLabel: 'Gun shop', category: 'firearms', business: 'gun-shop', name: 'Test Guns', floors: 3, x: 30, y: 21, w: 4, h: 4 },
    { id: 'b-park', block: 'B2', district: 'test', kind: 'park', kindLabel: 'Park', category: 'public', business: null, name: 'Test Park', floors: 0, x: 30, y: 51, w: 6, h: 6 },
    { id: 'b-noodle', block: 'B1', district: 'test', kind: 'shops', kindLabel: 'Noodle bar', category: 'food', business: 'noodle-bar', name: 'Test Noodles', floors: 2, x: 36, y: 21, w: 4, h: 4 },
  ],
  districts: {
    test: {
      id: 'test',
      name: 'Testville',
      theme: { primary: '#111111', secondary: '#222222' },
      terrain: 'city',
      weather: 'clear',
      mood: 'Quiet streets.',
      ambient: ['traffic hums'],
      dining: { everyday: 1 },
      x: 50,
      y: 50,
    },
  },
  locations: {
    alley: place('alley', 20, 20, ['market'], { ambient: ['drip', { text: 'thunder', fx: 'lightning' }] }),
    market: place('market', 50, 20, ['alley', 'bar', 'roof']),
    bar: place('bar', 80, 20, ['market'], { kind: 'diner', kindLabel: 'Diner' }),
    roof: place('roof', 50, 80, ['market']),
    dock: place('dock', 80, 80, []),
  },
  transit: {
    stations: {
      s1: { id: 's1', name: 'West Station', district: 'test', lines: ['line-1'], x: 20, y: 50 },
      s2: { id: 's2', name: 'East Station', district: 'test', lines: ['line-1'], x: 80, y: 50 },
    },
    lines: [{ id: 'line-1', name: 'Line 1', color: '#ffd84d', stations: ['s1', 's2'] }],
  },
};

const RULES: GameRules = {
  timeScale: 1,
  walkMinutesPerUnit: 1,
  rideMinutesPerUnit: 0.1,
  waitMinutes: 2,
  stopMinutes: 0.5,
  fare: 1,
  passPrice: 20,
  passDays: 30,
  startingEddies: 5,
  discoverRadius: 9,
  // Small numbers so a test can run energy down and level it up.
  energy: { start: 5, perLevel: 1, bed: 5, regenMinutes: 6, xpPerPoint: 1, exhaustedBonus: 2, xpFirstLevel: 10, xpGrowth: 1.5 },
  food: FOOD,
  // A unit of drink clears a minute, with two stages to climb.
  inebriation: {
    soberPerHour: 60,
    worst: 6,
    sober: 'Sober.',
    stages: [
      { id: 'tipsy', label: 'Tipsy', at: 1, up: 'Tipsy.', down: 'Just tipsy.' },
      { id: 'drunk', label: 'Drunk', at: 3, up: 'Drunk.', down: 'Down to drunk.' },
    ],
  },
  people: PEOPLE,
  society: SOCIETY,
  lines: LINES,
  charisma: CHARISMA,
  gear: GEAR,
  // People's days run on UTC here, whatever machine the tests run on.
  clock: (now) => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) }),
};

const MINUTE = 60_000;
const T0 = Date.UTC(2077, 9, 12, 20, 0);
const at = (id: string): Whereabouts => {
  const l = world.locations[id];
  return { ...streetSpot(l ?? { x: 0, y: 0 }), place: id };
};
/** Standing at a building's door, on the street in front of it. */
const outside = (id: string, x: number, y: number): Whereabouts => ({ ...streetSpot({ x, y }), building: id });
const station = (id: string): Whereabouts => {
  const s = world.transit.stations[id];
  return { ...streetSpot(s ?? { x: 0, y: 0 }), station: id };
};

type Recorded = { [K in keyof GameEvents]: { type: K; payload: GameEvents[K] } }[keyof GameEvents];

function setup(rules: Partial<TravelRules> = {}, progress?: Progress) {
  const game = new Game(world, { ...RULES, ...rules }, progress);
  const events: Recorded[] = [];
  for (const type of ['output', 'arrived', 'tripChanged', 'interiorChanged', 'mapChanged', 'walletChanged', 'inventoryChanged', 'energyChanged', 'inebriationChanged', 'fx'] as const) {
    game.events.on(type, (payload) => events.push({ type, payload } as Recorded));
  }
  const take = () => events.splice(0);
  const outputs = (recorded: Recorded[]) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { game, take, outputs };
}

/** Records a game's events from here on, like `setup` does. */
function record(game: Game) {
  const events: Recorded[] = [];
  for (const type of ['output', 'arrived', 'tripChanged', 'interiorChanged', 'mapChanged', 'walletChanged', 'inventoryChanged', 'energyChanged', 'inebriationChanged', 'societyChanged', 'fx'] as const) {
    game.events.on(type, (payload) => events.push({ type, payload } as Recorded));
  }
  const take = () => events.splice(0);
  const outputs = (recorded: Recorded[]) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { take, outputs };
}

/** Plans and sets off, failing the test if the trip can't be planned. */
function go(game: Game, to: Whereabouts, mode: 'foot' | 'ncart', now: number) {
  const plan = game.plan(to, mode, now);
  if (!plan) throw new Error(`No ${mode} plan to ${JSON.stringify(to)}`);
  return { plan, started: game.go(plan, now) };
}

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe('Game', () => {
  it('greets the player and puts them at the start, knowing its neighbors', () => {
    const { game, take, outputs } = setup();
    game.start(T0);
    const events = take();

    expect(outputs(events)[0]).toEqual({ text: 'hello', tone: 'narrative' });
    const arrived = events.find((e) => e.type === 'arrived');
    expect(arrived?.payload).toMatchObject({ from: null, place: { id: 'alley' }, district: { id: 'test' } });
    expect(sorted(game.mapState.visited)).toEqual(['alley']);
    expect(sorted(game.mapState.discovered)).toEqual(['alley', 'market']);
    expect(game.wallet).toEqual({ eddies: 5, passUntil: 0 });
  });

  describe('on foot', () => {
    it('takes real time along the streets, then arrives', () => {
      const { game, take } = setup();
      game.start(T0);
      const { plan } = go(game, at('market'), 'foot', T0);
      expect(plan.minutes).toBeCloseTo(30);
      expect(game.currentTrip?.endsAt).toBe(T0 + 30 * MINUTE);
      take();

      game.tick(T0 + 29 * MINUTE);
      expect(game.currentTrip).not.toBeNull();
      expect(game.positionAt(T0 + 15 * MINUTE)).toEqual({ x: 35, y: 20 });
      expect(take().some((e) => e.type === 'arrived')).toBe(false);

      game.tick(T0 + 30 * MINUTE);
      expect(game.currentTrip).toBeNull();
      expect(game.location?.id).toBe('market');
      expect(sorted(game.mapState.visited)).toEqual(['alley', 'market']);
      expect(sorted(game.mapState.discovered)).toEqual(['alley', 'bar', 'market', 'roof']);
      expect(take().map((e) => e.type)).toEqual(['tripChanged', 'arrived', 'mapChanged']);
    });

    it('runs faster at a test speed, but plans in real minutes', () => {
      const { game } = setup({ timeScale: 60 });
      game.start(T0);
      const { plan } = go(game, at('market'), 'foot', T0);
      expect(plan.minutes).toBeCloseTo(30);
      expect(game.currentTrip?.endsAt).toBe(T0 + 30_000);
    });

    it('can head for any point on the streets', () => {
      const { game } = setup();
      game.start(T0);
      const spot = streetSpot({ x: 50, y: 65 });
      const { plan } = go(game, spot, 'foot', T0);
      // Along y = 20 to the avenue, then down it: 30 + 45 blocks' worth.
      expect(plan.minutes).toBeCloseTo(75);
      game.tick(T0 + 75 * MINUTE);

      expect(game.whereabouts).toEqual(spot);
      expect(game.location).toBeNull();
      expect(game.nameOf(game.whereabouts)).toMatch(/^Block /);
    });

    it('turns up places it walks past and lifts the fog along the way', () => {
      const { game } = setup();
      game.start(T0);
      const before = game.mapState.explored.size;
      go(game, at('roof'), 'foot', T0);
      game.tick(T0 + 200 * MINUTE);
      expect(game.mapState.discovered.has('dock')).toBe(false);

      go(game, streetSpot({ x: 75, y: 80 }), 'foot', T0 + 200 * MINUTE);
      game.tick(T0 + 300 * MINUTE);
      expect(game.mapState.discovered.has('dock')).toBe(true);
      expect(game.mapState.visited.has('dock')).toBe(false);
      expect(game.mapState.explored.size).toBeGreaterThan(before);
    });

    it('reveals things while still walking, not only on arrival', () => {
      const { game, take } = setup();
      game.start(T0);
      go(game, at('market'), 'foot', T0);
      take();
      game.tick(T0 + 10 * MINUTE);
      expect(take().some((e) => e.type === 'mapChanged')).toBe(true);
    });

    it('stops right where the player is', () => {
      const { game, take } = setup();
      game.start(T0);
      go(game, at('market'), 'foot', T0);
      take();

      expect(game.stop(T0 + 10 * MINUTE)).toBe(true);
      expect(game.currentTrip).toBeNull();
      expect(game.whereabouts).toEqual(streetSpot({ x: 30, y: 20 }));
      expect(take().map((e) => e.type)).toEqual(['tripChanged', 'arrived', 'mapChanged']);
    });

    it('changes course from wherever the walk has got to', () => {
      const { game } = setup();
      game.start(T0);
      go(game, at('market'), 'foot', T0);
      const { plan } = go(game, at('alley'), 'foot', T0 + 10 * MINUTE);

      expect(plan.from).toEqual({ x: 30, y: 20 });
      expect(plan.minutes).toBeCloseTo(10);
    });

    it("won't plan a trip to where the player already is", () => {
      const { game } = setup();
      game.start(T0);
      expect(game.plan(at('alley'), 'foot', T0)).toBeNull();
    });
  });

  describe('NCART', () => {
    /** Walks to the West station and waits there, returning the time on arrival. */
    function atWestStation(game: Game): number {
      go(game, station('s1'), 'foot', T0);
      game.tick(T0 + 30 * MINUTE);
      return T0 + 30 * MINUTE;
    }

    it('only boards at a stop', () => {
      const { game } = setup();
      game.start(T0);
      expect(game.atStation).toBe(false);
      expect(game.plan(at('bar'), 'ncart', T0)).toBeNull();

      const now = atWestStation(game);
      expect(game.atStation).toBe(true);
      expect(game.plan(at('bar'), 'ncart', now)).not.toBeNull();
    });

    it('rides stop to stop: a wait, the ride, and off at the stop nearest the destination', () => {
      const { game, take, outputs } = setup();
      game.start(T0);
      const now = atWestStation(game);
      take();
      const { plan, started } = go(game, at('bar'), 'ncart', now);

      expect(started).toBe(true);
      expect(plan.legs.map((l) => l.kind)).toEqual(['wait', 'ride']);
      expect(plan.legs[1]?.stations).toEqual(['s1', 's2']);
      expect(plan.minutes).toBeCloseTo(2 + 6);
      expect(plan.to).toEqual(station('s2'));
      expect(game.wallet.eddies).toBe(4);
      expect(outputs(take())).toContainEqual({ text: 'NCART fare paid: 1 €$.', tone: 'system' });

      game.tick(now + 8 * MINUTE);
      expect(game.whereabouts).toEqual(station('s2'));
      // The last stretch to the bar is on foot.
      expect(game.plan(at('bar'), 'foot', now + 8 * MINUTE)?.minutes).toBeCloseTo(30);
    });

    it("doesn't explore from the train", () => {
      const { game } = setup({ discoverRadius: 1 });
      game.start(T0);
      const now = atWestStation(game);
      go(game, station('s2'), 'ncart', now);
      game.tick(now + 8 * MINUTE);
      expect(game.mapState.explored.has(cellOf({ x: 50, y: 50 }))).toBe(false);
    });

    it('needs the fare', () => {
      const { game, take, outputs } = setup({ startingEddies: 0 });
      game.start(T0);
      const now = atWestStation(game);
      take();
      const plan = game.plan(station('s2'), 'ncart', now);
      expect(plan && game.go(plan, now)).toBe(false);
      expect(game.currentTrip).toBeNull();
      expect(outputs(take())[0]?.tone).toBe('error');
    });

    it("can't change plans mid-ride", () => {
      const { game } = setup();
      game.start(T0);
      const now = atWestStation(game);
      go(game, station('s2'), 'ncart', now);
      expect(game.plan(at('market'), 'foot', now + MINUTE)).toBeNull();
      expect(game.stop(now + MINUTE)).toBe(false);
    });

    it('has nothing to offer when the destination is nearest the stop you are at', () => {
      const { game } = setup();
      game.start(T0);
      const now = atWestStation(game);
      expect(game.plan(streetSpot({ x: 20, y: 40 }), 'ncart', now)).toBeNull();
    });

    it('sells a monthly pass at stations only, and rides are free while it lasts', () => {
      const { game, take } = setup({ startingEddies: 25 });
      game.start(T0);
      expect(game.buyPass(T0)).toBe(false);

      const bought = atWestStation(game);
      expect(game.buyPass(bought)).toBe(true);
      expect(game.wallet).toEqual({ eddies: 5, passUntil: bought + 30 * 86_400_000 });
      take();

      go(game, at('bar'), 'ncart', bought);
      expect(game.wallet.eddies).toBe(5);
      game.tick(bought + 200 * MINUTE);

      // A month later, the pass has run out and rides cost again.
      const later = bought + 31 * 86_400_000;
      go(game, at('alley'), 'ncart', later);
      expect(game.wallet.eddies).toBe(4);
    });

    it("won't sell a pass the player can't afford", () => {
      const { game, take, outputs } = setup({ startingEddies: 5 });
      game.start(T0);
      go(game, station('s1'), 'foot', T0);
      game.tick(T0 + 30 * MINUTE);
      take();
      expect(game.buyPass(T0 + 30 * MINUTE)).toBe(false);
      expect(outputs(take())[0]?.tone).toBe('error');
    });
  });

  describe('buildings', () => {
    /** Walks to the gun shop's door and waits there. */
    function atTheShop() {
      const { game, take } = setup();
      game.start(T0);
      go(game, outside('b-shop', 32, 20), 'foot', T0);
      game.tick(T0 + 60 * MINUTE);
      take();
      return { game, take };
    }

    it('goes in from the door, and back out', () => {
      const { game, take } = atTheShop();
      expect(game.door?.id).toBe('b-shop');

      expect(game.enter()).toBe(true);
      expect(game.interior?.id).toBe('b-shop');
      expect(game.door).toBeNull();
      expect(game.enter()).toBe(false);
      expect(take()).toEqual([{ type: 'interiorChanged', payload: expect.objectContaining({ id: 'b-shop' }) }]);

      expect(game.leave()).toBe(true);
      expect(game.interior).toBeNull();
      expect(game.whereabouts.building).toBe('b-shop');
      expect(game.leave()).toBe(false);
      expect(take()).toEqual([{ type: 'interiorChanged', payload: null }]);
    });

    it('only goes in from right outside, and never into open ground', () => {
      const { game } = setup();
      game.start(T0);
      expect(game.door).toBeNull();
      expect(game.enter()).toBe(false);

      go(game, outside('b-park', 32, 50), 'foot', T0);
      expect(game.enter()).toBe(false);
      game.tick(T0 + 60 * MINUTE);
      expect(game.whereabouts.building).toBe('b-park');
      expect(game.door).toBeNull();
      expect(game.enter()).toBe(false);
    });

    it('walks out the door on heading off somewhere', () => {
      const { game, take } = atTheShop();
      game.enter();
      take();
      const now = T0 + 60 * MINUTE;
      go(game, at('market'), 'foot', now);

      expect(game.interior).toBeNull();
      expect(take().map((e) => e.type)).toEqual(['interiorChanged', 'tripChanged']);
      expect(game.currentTrip?.from).toMatchObject({ x: 32, y: 20 });
    });

    it('picks up inside the building it was saved in', () => {
      const progress = (inside: string | null, where: Whereabouts): Progress => ({
        where,
        visited: ['alley'],
        discovered: ['alley', 'market'],
        explored: [],
        eddies: 5,
        passUntil: 0,
        trip: null,
        inside,
        items: [],
        gear: null,
        energy: null,
        inebriation: null,
        society: null,
        charisma: null,
      });
      const { game, take } = setup({}, progress('b-shop', outside('b-shop', 32, 20)));
      expect(game.interior?.id).toBe('b-shop');
      game.start(T0);
      expect(take().filter((e) => e.type === 'interiorChanged')).toHaveLength(1);

      // Never inside a building somewhere else, or inside open ground.
      expect(setup({}, progress('b-shop', at('alley'))).game.interior).toBeNull();
      expect(setup({}, progress('b-park', outside('b-park', 32, 50))).game.interior).toBeNull();
    });
  });

  describe('eating', () => {
    /** Walks into the noodle bar with some eddies. */
    function inTheNoodleBar(eddies: number) {
      const { game, take, outputs } = setup({ startingEddies: eddies });
      game.start(T0);
      go(game, outside('b-noodle', 38, 20), 'foot', T0);
      game.tick(T0 + 60 * MINUTE);
      expect(game.enter()).toBe(true);
      take();
      return { game, take, outputs };
    }

    it('has a menu inside an eatery or at a place that serves food, and nowhere else', () => {
      const { game } = setup();
      game.start(T0);
      expect(game.menu()).toBeNull();

      go(game, outside('b-shop', 32, 20), 'foot', T0);
      game.tick(T0 + 60 * MINUTE);
      game.enter();
      expect(game.menu()).toBeNull();
      game.leave();

      go(game, outside('b-noodle', 38, 20), 'foot', T0 + 60 * MINUTE);
      game.tick(T0 + 120 * MINUTE);
      // Only once inside: the door is the street.
      expect(game.menu()).toBeNull();
      game.enter();
      const menu = game.menu();
      expect(menu?.venue).toEqual({ id: 'b-noodle', name: 'Test Noodles', district: 'test', kindLabel: 'Noodle bar', quality: 'everyday', chain: false });
      expect(menu?.items.filter((i) => i.kind === 'food').length).toBeGreaterThanOrEqual(2);
      expect(game.menu()).toEqual(menu);
      game.leave();
      expect(game.menu()).toBeNull();

      go(game, at('bar'), 'foot', T0 + 120 * MINUTE);
      game.tick(T0 + 240 * MINUTE);
      expect(game.menu()?.venue).toMatchObject({ id: 'bar', kindLabel: 'Diner' });
    });

    it('sells what is on the menu, into the inventory', () => {
      const { game, take, outputs } = inTheNoodleBar(50);
      const dish = game.menu()?.items[0];
      if (!dish) throw new Error('Nothing on the menu');

      expect(game.buy(dish.id)).toBe(true);
      expect(game.wallet.eddies).toBe(50 - dish.price);
      expect(game.inventory).toEqual([{ id: dish.id, kind: 'consumable', name: dish.name, count: 1, in: 'jacket' }]);
      const events = take();
      expect(events.map((e) => e.type)).toEqual(['output', 'walletChanged', 'inventoryChanged']);
      expect(outputs(events)[0]).toMatchObject({ text: `Bought ${dish.name} for ${dish.price} €$.`, tone: 'system' });

      expect(game.buy(dish.id)).toBe(true);
      expect(game.wallet.eddies).toBe(50 - 2 * dish.price);
      expect(game.inventory).toEqual([{ id: dish.id, kind: 'consumable', name: dish.name, count: 2, in: 'jacket' }]);
    });

    it('needs the eddies, and only sells what is on the menu', () => {
      const { game, take, outputs } = inTheNoodleBar(1);
      const menu = game.menu();
      const dear = menu?.items.reduce((a, b) => (b.price > a.price ? b : a));
      if (!dear) throw new Error('Nothing on the menu');
      expect(dear.price).toBeGreaterThan(1);

      expect(game.buy(dear.id)).toBe(false);
      expect(game.wallet.eddies).toBe(1);
      expect(game.inventory).toEqual([]);
      expect(outputs(take())).toEqual([{ text: `${dear.name} is ${dear.price} €$. You've got 1 €$.`, tone: 'error' }]);

      // Fine dining is not on a noodle bar's menu, and there's no buying with the menu closed.
      expect(game.buy('got-escargot')).toBe(false);
      expect(game.buy('nothing')).toBe(false);
      game.leave();
      expect(game.buy(dear.id)).toBe(false);
      expect(take()).toEqual([{ type: 'interiorChanged', payload: null }]);
    });

    it('hands out a menu the UI cannot use to change the game', () => {
      const { game } = inTheNoodleBar(50);
      const menu = game.menu();
      if (!menu) throw new Error('Nothing on the menu');
      const item = menu.items[0];
      if (!item) throw new Error('Nothing on the menu');
      item.price = 0;
      expect(game.menu()?.items[0]?.price).toBeGreaterThan(0);
      game.inventory.push({ id: 'x', kind: 'junk', name: 'X', count: 1 });
      expect(game.inventory).toEqual([]);
    });
  });

  describe('eating and drinking', () => {
    /** At the start, carrying a few things. */
    const carrying = (items: Progress['items'], inebriation: Progress['inebriation'] = null): Progress => ({
      where: at('alley'),
      visited: ['alley'],
      discovered: ['alley', 'market'],
      explored: [],
      eddies: 5,
      passUntil: 0,
      trip: null,
      inside: null,
      items,
      gear: null,
      energy: null,
      inebriation,
      society: null,
      charisma: null,
    });
    const lager = { id: 'broseph-lager', kind: 'consumable', name: 'Broseph Lager', count: 1 } as const;
    const moonshine = { id: 'moonshine', kind: 'consumable', name: 'Moonshine', count: 2 } as const;
    const dawg = { id: 'hawt-dawg', kind: 'consumable', name: 'Hawt Dawg', count: 2 } as const;

    it('eats what it carries one at a time, and only that', () => {
      const { game, take, outputs } = setup({}, carrying([dawg, { id: 'shard', kind: 'shard', name: 'A shard', count: 1 }]));
      game.start(T0);
      take();

      expect(game.consume('hawt-dawg', T0)).toBe(true);
      expect(game.inventory).toEqual([{ ...dawg, count: 1, in: 'jacket' }, expect.objectContaining({ id: 'shard', in: 'jacket' })]);
      const events = take();
      expect(events.map((e) => e.type)).toEqual(['output', 'inventoryChanged']);
      expect(outputs(events)[0]).toEqual({ text: 'You eat the Hawt Dawg.', tone: 'narrative' });
      expect(game.inebriation(T0).stage).toBeNull();

      expect(game.consume('hawt-dawg', T0)).toBe(true);
      expect(game.inventory).toEqual([expect.objectContaining({ id: 'shard' })]);
      expect(game.consume('hawt-dawg', T0)).toBe(false);
      // Not a shard, not something that was never there.
      expect(game.consume('shard', T0)).toBe(false);
      expect(game.consume('nothing', T0)).toBe(false);
    });

    it('drinks go to the head stage by stage, and wear off on the clock', () => {
      const { game, take, outputs } = setup({}, carrying([lager, moonshine]));
      game.start(T0);
      take();

      expect(game.consume('broseph-lager', T0)).toBe(true);
      let events = take();
      expect(events.map((e) => e.type)).toEqual(['output', 'inebriationChanged', 'inventoryChanged']);
      expect(outputs(events)[0]?.text).toBe('You drink the Broseph Lager. Tipsy.');
      expect(game.inebriation(T0)).toMatchObject({ units: 1, stage: expect.objectContaining({ id: 'tipsy' }) });

      // Moonshine is three units: straight past tipsy. A second one changes nothing but the count.
      expect(game.consume('moonshine', T0)).toBe(true);
      expect(outputs(take())[0]?.text).toBe('You drink the Moonshine. Drunk.');
      expect(game.consume('moonshine', T0)).toBe(true);
      expect(outputs(take())[0]?.text).toBe('You drink the Moonshine.');
      const status = game.inebriation(T0);
      expect(status).toMatchObject({ units: 7, severity: 1, soberAt: T0 + 6 * MINUTE + 1 });
      expect(game.inventory).toEqual([]);

      // Clearing a unit a minute: still drunk at four minutes, tipsy at five, sober at seven.
      game.tick(T0 + 4 * MINUTE);
      expect(take()).toEqual([]);
      game.tick(T0 + 5 * MINUTE);
      events = take();
      expect(outputs(events)).toEqual([{ text: 'Just tipsy.', tone: 'narrative' }]);
      expect(events.at(-1)).toMatchObject({ type: 'inebriationChanged', payload: { stage: expect.objectContaining({ id: 'tipsy' }) } });
      game.tick(T0 + 7 * MINUTE);
      events = take();
      expect(outputs(events)).toEqual([{ text: 'Sober.', tone: 'narrative' }]);
      expect(events.at(-1)).toMatchObject({ type: 'inebriationChanged', payload: { stage: null, severity: 0, soberAt: null } });
      game.tick(T0 + 8 * MINUTE);
      expect(take()).toEqual([]);
    });

    it('picks the drink up from a save, cleared for the time away, without a word', () => {
      const { game, take, outputs } = setup({}, carrying([], { units: 2, updatedAt: T0 }));
      game.start(T0 + 30_000);
      const events = take();
      expect(outputs(events).map((o) => o.text)).toEqual(['hello again']);
      expect(events.find((e) => e.type === 'inebriationChanged')?.payload).toMatchObject({ units: 1.5, stage: expect.objectContaining({ id: 'tipsy' }) });
      // Sobering up from there says so.
      game.tick(T0 + 2 * MINUTE);
      expect(outputs(take())).toEqual([{ text: 'Sober.', tone: 'narrative' }]);

      const later = setup({}, carrying([], { units: 2, updatedAt: T0 }));
      later.game.start(T0 + 10 * MINUTE);
      expect(later.game.inebriation(T0 + 10 * MINUTE)).toMatchObject({ units: 0, stage: null });
      later.take();
      later.game.tick(T0 + 11 * MINUTE);
      expect(later.take()).toEqual([]);
    });
  });

  describe('people', () => {
    const HOUR = 60 * MINUTE;
    /** A weekday at 11:00 UTC on which someone is working at the noodle bar. */
    function shiftAt() {
      const { game } = setup();
      for (let day = 0; day < 14; day++) {
        // Tuesday 12 October 2077 is day 39366; count on from there.
        const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
        const inside = new Game(world, { ...RULES, startingEddies: 100 }, { ...carryingProgress([]), where: outside('b-noodle', 38, 20), inside: 'b-noodle' });
        inside.start(now);
        const here = inside.peopleHere(now);
        const worker = here.find((p) => p.person.job.building === 'b-noodle');
        if (worker && new Date(now).getUTCDay() % 6 !== 0) return { game: inside, now, worker: worker.person, here };
      }
      throw new Error(`Nobody ever works at the noodle bar (${game.population.people.length} people)`);
    }
    const carryingProgress = (items: Progress['items']): Progress => ({
      where: at('alley'),
      visited: ['alley'],
      discovered: ['alley', 'market'],
      explored: [],
      eddies: 100,
      passUntil: 0,
      trip: null,
      inside: null,
      items,
      gear: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
    });

    it('makes a population for the city, with the noodle bar staffed by day and nobody about on the street', () => {
      const { game } = setup();
      expect(game.population.people.length).toBeGreaterThanOrEqual(8);
      expect(game.population.people.filter((p) => p.job.building === 'b-noodle').length).toBeGreaterThanOrEqual(1);
      expect(game.population.people.filter((p) => p.job.building === 'b-shop').length).toBeGreaterThanOrEqual(1);
      game.start(T0);
      // At the alley (not a hangout kind) nobody turns up; on the street nobody can.
      expect(game.peopleHere(T0)).toEqual([]);
      const { here, worker } = shiftAt();
      expect(here.map((p) => p.person.id)).toContain(worker.id);
      expect(here.find((p) => p.person.id === worker.id)?.doing).toMatch(/stove|counter|shift/);
      expect(here.every((p) => ['neutral', 'wary', 'warm'].includes(p.stance))).toBe(true);
    });

    it('talks: a greeting and a line about their life, rapport growing with each chat, but not twice in an hour', () => {
      const { game, now, worker } = shiftAt();
      const { take, outputs } = record(game);
      expect(game.talk('nobody', now)).toBe(false);
      expect(game.talk(worker.id, now)).toBe(true);
      const said = outputs(take());
      expect(said.length).toBeGreaterThanOrEqual(2);
      expect(said[0]?.text.startsWith(`${worker.given}: "`)).toBe(true);
      const standing = game.standingWith(worker.id, now);
      expect(standing).toMatchObject({ stance: expect.any(String), knowledge: { met: true }, web: [] });
      expect(standing?.standing).toMatchObject({ met: true, talks: 1, lastTalkAt: now });
      expect(standing?.standing.rapport).toBeGreaterThan(0);
      expect(game.reputation(now).find((r) => r.key === 'district:test')?.value ?? 0).toBeGreaterThanOrEqual(0);

      // Too soon: nothing more to say, nothing gained.
      game.talk(worker.id, now + 10 * MINUTE);
      expect(game.standingWith(worker.id, now + 10 * MINUTE)?.standing.talks).toBe(1);
      // Day after day at the counter: more rapport, and once it's there, their people.
      let later = now;
      let chats = 1;
      for (let day = 1; chats < 12 && day < 40; day++) {
        later = now + day * 24 * HOUR;
        if (game.talk(worker.id, later)) chats++;
      }
      const known = game.standingWith(worker.id, later);
      expect(known?.standing.rapport).toBeGreaterThanOrEqual(SOCIETY.talk.revealAt);
      expect(known?.knowledge).toMatchObject({ met: true });
      expect(['warm', 'friend', 'neutral']).toContain(known?.stance);
      // Chatting is practice: charisma has come along, and chats are worth more for it.
      expect(game.charisma().level).toBeGreaterThanOrEqual(1);
      expect(game.charisma().xp + (game.charisma().level - 1) * CHARISMA.xpFirstLevel).toBeGreaterThanOrEqual(chats * 2 - 1);
    });

    it('only knows who someone knows by seeing them together, being told, or asking', () => {
      const { game, now, worker, here } = shiftAt();
      const { take, outputs } = record(game);
      // Nothing is known of anyone until the player looks.
      expect(game.knownPeople()).toEqual([]);
      expect(game.standingWith(worker.id, now)?.web).toEqual([]);
      game.look(now);
      expect(game.knownPeople().map((p) => p.id).sort()).toEqual(here.map((p) => p.person.id).sort());
      // Two coworkers at the counter: seen together, connected somehow.
      const coworker = here.find((p) => p.person.id !== worker.id && p.person.job.building === 'b-noodle');
      if (coworker) {
        const seen = game.standingWith(worker.id, now)?.web.find((l) => l.person.id === coworker.person.id);
        expect(seen).toMatchObject({ kind: null, how: 'seen' });
      }
      // Strangers to each other are not.
      for (const link of game.standingWith(worker.id, now)?.web ?? []) {
        expect(game.population.ties.some((t) => t.from === worker.id && t.to === link.person.id)).toBe(true);
      }

      // Asking about someone the player doesn't know of isn't possible; about someone they do, it is.
      const relative = game.population.ties.find((t) => t.from === worker.id && ['spouse', 'sibling', 'cousin', 'parent', 'child', 'uncle', 'nephew', 'kin', 'friend'].includes(t.kind));
      if (!relative) throw new Error('the worker knows nobody');
      expect(game.ask(worker.id, relative.to, now)).toBe(false);
      // Seen about, then: and with charisma high enough, a neutral person always answers.
      const stranger = game.population.people.find((p) => p.id !== worker.id && !game.population.ties.some((t) => t.from === worker.id && t.to === p.id));
      if (!stranger) throw new Error('everyone knows everyone');
      // Seen about, then: and with charisma high enough, anyone not hostile answers.
      const told = new Game(world, { ...RULES, startingEddies: 100 }, {
        ...carryingProgress([]),
        where: outside('b-noodle', 38, 20),
        inside: 'b-noodle',
        society: { ...game.societySaved, known: { [relative.to]: { met: false, seen: true, told: false, facts: ['name'], log: [] }, [stranger.id]: { met: true, seen: false, told: false, facts: ['name'], log: [] } } },
        charisma: { level: 12, xp: 0 },
      });
      told.start(now);
      const recorded = record(told);
      expect(told.ask(worker.id, relative.to, now)).toBe(true);
      const answer = recorded.outputs(recorded.take())[0]?.text ?? '';
      expect(answer).toContain(`${worker.given}: "`);
      expect(told.standingWith(worker.id, now)?.web.find((l) => l.person.id === relative.to)).toMatchObject({ kind: relative.kind, how: 'asked' });
      expect(told.standingWith(relative.to, now)?.knowledge.told).toBe(true);
      // Asked again, they've said already.
      expect(told.ask(worker.id, relative.to, now + MINUTE)).toBe(true);
      expect(told.conversation(worker.id).at(-1)?.text).toMatch(/told you|last I checked/i);
      expect(told.ask(worker.id, stranger.id, now)).toBe(true);
      expect(told.standingWith(worker.id, now)?.web.some((l) => l.person.id === stranger.id)).toBe(false);
      expect(told.societySaved.links[[worker.id, stranger.id].sort().join('|')]?.kind).toBe('none');
      expect(outputs(take())).toEqual([]);
    });

    it('takes a gift from the inventory, their favorite most of all', () => {
      const { game, now, worker } = shiftAt();
      const favorite = worker.likes.dish;
      const dish = FOOD.dishes.find((d) => d.id === favorite);
      if (!dish) throw new Error('no favorite');
      // Nothing to give yet.
      expect(game.gift(worker.id, favorite, now)).toBe(false);
      const other = FOOD.dishes.find((d) => d.kind === 'food' && d.id !== favorite);
      if (!other) throw new Error('no other dish');
      const stocked = new Game(world, { ...RULES, startingEddies: 100 }, {
        ...carryingProgress([
          { id: favorite, kind: 'consumable', name: dish.name, count: 1 },
          { id: other.id, kind: 'consumable', name: other.name, count: 2 },
        ]),
        where: outside('b-noodle', 38, 20),
        inside: 'b-noodle',
      });
      stocked.start(now);
      const { take, outputs } = record(stocked);
      expect(stocked.gift(worker.id, other.id, now)).toBe(true);
      const plain = stocked.standingWith(worker.id, now)?.standing.rapport ?? 0;
      expect(plain).toBe(SOCIETY.gift.base);
      expect(stocked.inventory.find((i) => i.id === other.id)?.count).toBe(1);
      expect(take().map((e) => e.type)).toEqual(['output', 'inventoryChanged', 'societyChanged']);
      // The favorite, the next day so it counts in full.
      const tomorrow = now + 25 * HOUR;
      expect(stocked.gift(worker.id, favorite, tomorrow)).toBe(true);
      expect(outputs(take())[0]?.text).toContain(dish.name);
      expect(stocked.standingWith(worker.id, tomorrow)?.standing.rapport).toBe(SOCIETY.gift.base + SOCIETY.gift.favorite);
      expect(stocked.inventory.find((i) => i.id === favorite)).toBeUndefined();
    });

    it('insults make an enemy of someone and sour their coworkers; a robbery bars the player and brings someone to collect', () => {
      const { game, now, worker, here } = shiftAt();
      const { take, outputs } = record(game);
      expect(game.insult(worker.id, now)).toBe(true);
      const sour = game.standingWith(worker.id, now);
      expect(sour?.standing.grudge).toBe(SOCIETY.severity.insult);
      expect(['cold', 'hostile', 'wary']).toContain(sour?.stance);
      expect(outputs(take()).length).toBeGreaterThan(0);
      expect(game.barred(now)).toBeNull();

      const eddies = game.wallet.eddies;
      expect(game.rob(worker.id, now)).toBe(true);
      const events = take();
      expect(game.wallet.eddies).toBeGreaterThan(eddies);
      expect(events.some((e) => e.type === 'walletChanged')).toBe(true);
      expect(game.standingWith(worker.id, now)?.stance).toBe('hostile');
      // The noodle bar's people saw it; the counter is closed to the player.
      expect(game.reputation(now).find((r) => r.key === 'business:b-noodle')?.value).toBeLessThanOrEqual(SOCIETY.rep.banAt);
      expect(game.barred(now)).toMatch(/won't serve|closes/);
      expect(game.buy(game.menu()?.items[0]?.id ?? '', now)).toBe(false);
      for (const other of here.filter((p) => p.person.id !== worker.id)) {
        expect(game.standingWith(other.person.id, now)?.standing.grudge, other.person.name).toBeGreaterThan(0);
      }
      // Robbed again this week: nothing left on them, and they won't talk.
      const before = game.wallet.eddies;
      expect(game.rob(worker.id, now + HOUR)).toBe(true);
      expect(game.wallet.eddies).toBe(before);
      take();
      const talks = game.standingWith(worker.id, now + HOUR)?.standing.talks;
      expect(game.talk(worker.id, now + HOUR)).toBe(true);
      expect(outputs(take())).toHaveLength(1);
      expect(game.standingWith(worker.id, now + HOUR)?.standing.talks).toBe(talks);

      // Whoever comes to collect does, with the energy knocked out of the player.
      const threats = game.societySaved.threats;
      if (threats.length) {
        const due = Math.max(...threats.map((t) => t.due));
        game.tick(due + 1);
        const hit = take();
        expect(hit.some((e) => e.type === 'fx' && e.payload.effect === 'shake')).toBe(true);
        expect(outputs(hit)[0]?.tone).toBe('error');
        expect(game.energy(due + 1).current).toBe(0);
        expect(game.societySaved.threats).toEqual([]);
      }
    });

    it('tells people apart by their look until introduced, and learns the rest by watching, talking and asking', () => {
      const { game, now, worker } = shiftAt();
      const { take, outputs } = record(game);
      // A stranger: no name, no facts; only what's plain to see.
      const stranger = game.describe(worker.id);
      expect(stranger).toMatchObject({ named: false, lines: [] });
      expect(stranger?.name).toMatch(/^(A|An) (young |older )?(man|woman|person)/);
      expect(game.conversation(worker.id)).toEqual([]);
      // Looking around the noodle bar: whoever is at work here plainly works here.
      game.look(now);
      expect(game.describe(worker.id)?.facts.job).toContain('Test Noodles');
      expect(game.describe(worker.id)?.named).toBe(false);
      // Talking is an introduction, on the record both ways.
      expect(game.talk(worker.id, now)).toBe(true);
      expect(game.describe(worker.id)).toMatchObject({ named: true, name: worker.name });
      const log = game.conversation(worker.id);
      expect(log[0]?.who).toBe('you');
      expect(log.some((l) => l.who === 'them')).toBe(true);
      take();
      // Asking: a neutral person answers, and the answer is a fact from then on.
      expect(game.askFact(worker.id, 'age', now)).toBe(true);
      const answer = outputs(take())[0]?.text ?? '';
      const known = game.describe(worker.id);
      if (known?.facts.age) {
        expect(known.facts.age).toBe(String(worker.age));
        expect(answer).toContain(String(worker.age));
      }
      // The question was put bluntly: that's all a level of charisma affords.
      const asked = game.conversation(worker.id).at(-2);
      expect(asked?.who).toBe('you');
      expect(LINES.questions.age.lines.map((l) => `"${typeof l === 'string' ? l : l.text}"`)).toContain(asked?.text);
      expect(game.conversation(worker.id).at(-1)?.who).toBe('them');
      expect(game.askFact('nobody', 'age', now)).toBe(false);
      // Only someone whose name the player has can be asked about.
      const other = game.population.people.find((p) => p.id !== worker.id);
      if (other) expect(game.ask(worker.id, other.id, now)).toBe(false);
    });

    it('tells a stranger only what charisma earns: home is a no, pressing costs rapport, and a smooth talker hears it all', () => {
      const { game, now, worker } = shiftAt();
      const { take, outputs } = record(game);
      // Nobody tells a stranger with no way with words where they live.
      expect(openness('home', 'neutral', 1, worker.traits, SOCIETY.openness)).toBeLessThan(SOCIETY.openness.deflectAt);
      expect(game.askFact(worker.id, 'home', now)).toBe(true);
      expect(game.describe(worker.id)?.facts.home).toBeUndefined();
      const said = outputs(take());
      expect(said).toHaveLength(1);
      expect(said[0]?.text.startsWith(`${worker.given}: "`)).toBe(true);
      const standing = game.standingWith(worker.id, now)?.standing;
      expect(standing).toMatchObject({ asks: 1, refused: { home: now } });
      // Asking again right away is pressing: still nothing, and they think less of the player for it.
      expect(game.askFact(worker.id, 'home', now + MINUTE)).toBe(true);
      expect(game.describe(worker.id)?.facts.home).toBeUndefined();
      expect(game.standingWith(worker.id, now + MINUTE)?.standing.rapport).toBe((standing?.rapport ?? 0) - SOCIETY.openness.press);
      expect(LINES.pressed.map((l) => (typeof l === 'string' ? l : l.text))).toContain(game.conversation(worker.id).at(-1)?.text);
      // A smooth talker puts it differently, and hears it. Asked again, they've said already, which is no practice.
      const smooth = new Game(world, { ...RULES, startingEddies: 100 }, { ...carryingProgress([]), where: outside('b-noodle', 38, 20), inside: 'b-noodle', charisma: { level: 12, xp: 0 } });
      smooth.start(now);
      expect(smooth.askFact(worker.id, 'home', now)).toBe(true);
      expect(smooth.describe(worker.id)?.facts.home).toBeDefined();
      expect(smooth.conversation(worker.id).at(-2)?.text).toBe('"Whereabouts do you lay your head? Just so I know where to send the good word."');
      const xp = smooth.charisma().xp;
      expect(smooth.askFact(worker.id, 'home', now + MINUTE)).toBe(true);
      expect(smooth.charisma().xp).toBe(xp);
      expect(smooth.conversation(worker.id).at(-1)?.text).toMatch(/told you already|listening|again\?|short memory/i);
    });

    it('keeps the player\'s standing in the save, and forgets people the city no longer has', () => {
      const { game, now, worker } = shiftAt();
      game.talk(worker.id, now);
      const saved = game.societySaved;
      saved.standings['nobody-here'] = { ...saved.standings[worker.id]!, met: true };
      saved.threats.push({ id: 99, due: now, by: 'nobody-here', gang: null, incident: 0, amount: 5 });
      const again = new Game(world, RULES, { ...carryingProgress([]), society: saved });
      expect(again.standingWith(worker.id, now)?.standing.talks).toBe(1);
      expect(again.societySaved.standings['nobody-here']).toBeUndefined();
      expect(again.societySaved.threats).toEqual([]);
    });
  });

  describe('carrying', () => {
    const HOUR = 60 * MINUTE;
    const progressInside = (building: string, x: number, y: number, items: Progress['items'] = []): Progress => ({
      where: outside(building, x, y),
      visited: ['alley'],
      discovered: ['alley', 'market'],
      explored: [],
      eddies: 100,
      passUntil: 0,
      trip: null,
      inside: building,
      items,
      gear: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
    });
    const inside = (building: string, x: number, y: number, rules: Partial<GameRules> = {}, items: Progress['items'] = []) => {
      const game = new Game(world, { ...RULES, startingEddies: 100, ...rules }, progressInside(building, x, y, items));
      game.start(T0);
      const { take, outputs } = record(game);
      take();
      return { game, take, outputs };
    };
    /** Pockets with one slot in the jacket and one to spare in the pants (the wallet takes the other), one thing to a slot. */
    const tiny: GearContent = {
      ...GEAR,
      items: { ...GEAR.items, consumable: { grams: 250, perSlot: 1 } },
      kinds: { ...GEAR.kinds, jacket: { ...GEAR.kinds.jacket!, slots: 1 }, pants: { ...GEAR.kinds.pants!, slots: 2 } },
    };

    it('wears the usual pockets, with the wallet in the pants weighing what the eddies weigh', () => {
      const { game } = inside('b-noodle', 38, 20);
      expect(game.gearSaved).toEqual(GEAR.start);
      const { grams, pockets } = game.carry();
      expect(pockets.map((p) => p.id)).toEqual(['jacket', 'pants', 'wallet']);
      expect(pockets[2]).toMatchObject({ eddies: 100, holds: GEAR.kinds.wallet!.holds, grams: GEAR.kinds.wallet!.grams + 100 * GEAR.gramsPerEddy, over: false });
      expect(pockets[1]?.load).toEqual({ slots: 1, grams: GEAR.kinds.wallet!.grams + 100 * GEAR.gramsPerEddy });
      expect(grams).toBe(GEAR.kinds.wallet!.grams + 100 * GEAR.gramsPerEddy);
    });

    it('puts what it buys where there is room, refuses when there is none, and drops things to make some', () => {
      const { game, take, outputs } = inside('b-noodle', 38, 20, { gear: tiny });
      const dish = game.menu()?.items.find((i) => i.kind === 'food');
      if (!dish) throw new Error('Nothing on the menu');
      expect(game.buy(dish.id)).toBe(true);
      expect(game.inventory).toEqual([expect.objectContaining({ id: dish.id, count: 1, in: 'jacket' })]);
      // The jacket's one slot is taken: the next goes in the pants, as its own stack.
      expect(game.buy(dish.id)).toBe(true);
      expect(game.inventory.map((i) => i.in)).toEqual(['jacket', 'pants']);
      expect(game.carry().pockets.map((p) => `${p.load.slots}/${p.slots}`)).toEqual(['1/1', '2/2', '0/0']);
      take();
      // Nowhere left: no sale, no charge, and the reason.
      const eddies = game.wallet.eddies;
      expect(game.canBuy(dish.id)).toMatch(/No room/);
      expect(game.buy(dish.id)).toBe(false);
      expect(game.wallet.eddies).toBe(eddies);
      expect(outputs(take())).toEqual([{ text: `No room for ${dish.name}: your pockets are full. Eat something, or drop something.`, tone: 'error' }]);
      // Dropping one makes room again.
      expect(game.drop(dish.id)).toBe(true);
      expect(outputs(take())).toEqual([{ text: `You drop the ${dish.name}.`, tone: 'narrative' }]);
      expect(game.inventory).toHaveLength(1);
      expect(game.canBuy(dish.id)).toBeNull();
      expect(game.buy(dish.id)).toBe(true);
      expect(game.drop('nothing')).toBe(false);
    });

    it('sells bags at a store with a rack, which are more pockets', () => {
      const rack: GearContent = { ...tiny, racks: { 'gun-shop': ['duffel-bag', 'belt-pouch'] } };
      const { game, take, outputs } = inside('b-shop', 32, 20, { gear: rack });
      const menu = game.menu();
      expect(menu?.kind).toBe('gear');
      expect(menu?.items.map((i) => i.kind)).toEqual(['gear', 'gear']);
      const bag = menu?.items.find((i) => i.id === 'duffel-bag');
      if (!bag) throw new Error('no bag');
      expect(bag.price).toBeGreaterThan(0);
      expect(game.buy('duffel-bag')).toBe(true);
      expect(game.wallet.eddies).toBe(100 - bag.price);
      expect(outputs(take())[0]).toMatchObject({ text: `Bought a duffel bag for ${bag.price} €$. More room.`, tone: 'system' });
      expect(game.gearSaved).toEqual([...GEAR.start, { id: 'duffel-bag-1', kind: 'duffel-bag', in: null }]);
      expect(game.carry().pockets.at(-1)).toMatchObject({ name: 'Duffel bag', slots: 8, load: { slots: 0, grams: 0 } });
      // Nothing to eat at a gun shop, and a second bag gets its own id.
      expect(game.buy('duffel-bag')).toBe(true);
      expect(game.gearSaved.at(-1)?.id).toBe('duffel-bag-2');
      expect(game.canBuy('taco')).toBe('Not for sale here.');
      // Nothing on the rack at the noodle bar: its menu is food.
      expect(inside('b-noodle', 38, 20, { gear: rack }).game.menu()?.kind).toBe('food');
    });

    it('nets a robbery only what the wallet will hold', () => {
      const full: GearContent = { ...GEAR, kinds: { ...GEAR.kinds, wallet: { ...GEAR.kinds.wallet!, holds: 100 } } };
      for (let day = 0; day < 14; day++) {
        const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
        const game = new Game(world, { ...RULES, startingEddies: 100, gear: full }, progressInside('b-noodle', 38, 20));
        game.start(now);
        const worker = game.peopleHere(now).find((p) => p.person.job.building === 'b-noodle' && p.person.eddies > 0);
        if (!worker) continue;
        const { take, outputs } = record(game);
        expect(game.rob(worker.person.id, now)).toBe(true);
        // A wallet full at 100 €$: nothing comes away, but it was still a robbery.
        expect(game.wallet.eddies).toBe(100);
        expect(outputs(take()).some((o) => /wallet is full/.test(o.text))).toBe(true);
        expect(game.standingWith(worker.person.id, now)?.stance).toBe('hostile');
        return;
      }
      throw new Error('nobody at the noodle bar');
    });

    it('keeps pockets and what is in them, and forgets pockets of kinds it no longer has', () => {
      const { game } = inside('b-noodle', 38, 20);
      const dish = game.menu()?.items[0];
      if (!dish) throw new Error('Nothing on the menu');
      game.buy(dish.id);
      const again = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), items: game.inventory, gear: [...game.gearSaved, { id: 'old-1', kind: 'a-bag-of-holding', in: null }] });
      expect(again.gearSaved).toEqual(GEAR.start);
      expect(again.inventory).toEqual(game.inventory);
      // An item in a pocket that is gone is put away where it fits.
      const moved = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), items: game.inventory.map((i) => ({ ...i, in: 'gone' })), gear: game.gearSaved });
      expect(moved.inventory.map((i) => i.in)).toEqual(['jacket']);
    });
  });

  describe('energy', () => {
    it('starts full, and nothing the player does yet spends it', () => {
      const { game } = setup();
      game.start(T0);
      go(game, at('market'), 'foot', T0);
      game.tick(T0 + 60 * MINUTE);
      expect(game.energy(T0 + 60 * MINUTE)).toMatchObject({ current: 5, max: 5, level: 1, xp: 0, nextPointAt: null });
    });

    it('spends it for things that need it, says when there isn’t enough, and levels up', () => {
      const { game, take, outputs } = setup();
      game.start(T0);
      take();
      expect(game.spendEnergy(5, T0)).toBe(true);
      expect(take()).toEqual([{ type: 'energyChanged', payload: expect.objectContaining({ current: 0, xp: 7 }) }]);

      expect(game.spendEnergy(1, T0)).toBe(false);
      expect(outputs(take())[0]?.tone).toBe('error');

      // Back to full in half an hour; spend it all again and it's enough for level 2.
      const later = T0 + 30 * MINUTE;
      expect(game.spendEnergy(5, later)).toBe(true);
      const events = take();
      expect(outputs(events)[0]?.text).toMatch(/Energy level 2/);
      expect(game.energy(later)).toMatchObject({ level: 2, max: 6, current: 0 });
    });
  });

  it('lands a trip that finished while the game was closed', () => {
    const first = setup();
    first.game.start(T0);
    go(first.game, at('market'), 'foot', T0);
    const { mapState, wallet, currentTrip } = first.game;
    const progress: Progress = {
      where: mapState.where,
      visited: [...mapState.visited],
      discovered: [...mapState.discovered],
      explored: [...mapState.explored],
      eddies: wallet.eddies,
      passUntil: wallet.passUntil,
      trip: currentTrip,
      inside: null,
      items: [],
      gear: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
    };

    const { game, take, outputs } = setup({}, progress);
    game.start(T0 + 2 * 60 * MINUTE);
    const said = outputs(take()).map((o) => o.text);
    expect(said[0]).toBe('hello again');
    expect(said).toContain('You made it to Market while you were away.');
    expect(game.location?.id).toBe('market');
  });

  it('announces when the whole city has been mapped, once', () => {
    const { game, take, outputs } = setup();
    game.start(T0);
    let now = T0;
    for (const id of ['market', 'bar', 'market', 'roof']) {
      go(game, at(id), 'foot', now);
      now += 200 * MINUTE;
      game.tick(now);
    }
    expect(outputs(take()).some((o) => o.text.includes('fully mapped'))).toBe(false);

    go(game, at('dock'), 'foot', now);
    game.tick(now + 200 * MINUTE);
    go(game, at('alley'), 'foot', now + 200 * MINUTE);
    game.tick(now + 400 * MINUTE);
    const mapped = outputs(take()).filter((o) => o.text.includes('fully mapped'));
    expect(mapped).toEqual([{ text: 'City grid fully mapped. Every district, every dive.', tone: 'system' }]);
  });

  it('hands out map state the UI cannot use to change the game', () => {
    const { game } = setup();
    game.start(T0);
    const snapshot = game.mapState;
    (snapshot.visited as Set<string>).add('roof');
    expect(game.mapState.visited.has('roof')).toBe(false);
  });

  describe('ambient', () => {
    it('fires a line’s effect before its text', () => {
      const { game, take } = setup();
      game.ambient(() => 0.99);

      expect(take()).toEqual([
        { type: 'fx', payload: { effect: 'lightning' } },
        { type: 'output', payload: { text: 'thunder', tone: 'ambient' } },
      ]);
    });

    it('never plays the same line twice in a row', () => {
      const { game, take, outputs } = setup();
      game.ambient(() => 0);
      game.ambient(() => 0);

      expect(outputs(take()).map((o) => o.text)).toEqual(['drip', 'thunder']);
    });

    it('plays the district’s street lines out between places', () => {
      const { game, take, outputs } = setup();
      game.start(T0);
      go(game, streetSpot({ x: 50, y: 65 }), 'foot', T0);
      game.tick(T0 + 100 * MINUTE);
      take();
      game.ambient(() => 0);

      expect(outputs(take()).map((o) => o.text)).toEqual(['traffic hums']);
    });
  });
});
