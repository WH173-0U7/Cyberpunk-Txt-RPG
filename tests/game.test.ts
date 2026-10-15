import { describe, expect, it } from 'vitest';
import { ASK_ABOUT, cellOf, Game, streetSpot, type GameRules } from '../src/engine/game';
import { outfit, type GearContent } from '../src/engine/carry';
import { FOOD } from '../src/data/food';
import { GEAR as ALL_GEAR } from '../src/data/gear';
import { ARMS } from '../src/data/weapons';
import { MONEY } from '../src/data/money';
import { LINES } from '../src/data/dialogue';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { COMBAT } from '../src/data/combat';
import { MEDICAL } from '../src/data/medical';
import { HOURS } from '../src/data/hours';
import { priceFor } from '../src/engine/food';
import { freshLife, newsFor, tieKey } from '../src/engine/life';
import { FAMILY, openness } from '../src/engine/dialogue';
import { bossOf, type JobState } from '../src/engine/jobs';
import { memoriesOf } from '../src/engine/memory';
import { dreamOf, handleOf, tiesOf, type Person, type Pronouns } from '../src/engine/people';
import { SOCIETY } from '../src/data/society';
import type { Progress } from '../src/engine/save';
import { freshSociety, linkKey, type SocietyState } from '../src/engine/society';
import type { TravelRules } from '../src/engine/travel';
import type { Building, GameEvents, Item, Location, Whereabouts, World } from '../src/engine/types';

/** The test city's chrome outlet stands in for any store with a rack, so its own chrome is left off unless a test is about chrome (`ALL_GEAR`). */
const GEAR: GearContent = { ...ALL_GEAR, chrome: { ...ALL_GEAR.chrome, stores: {} } };

// A small city on a 3×3 grid of streets:
//
//   alley ── market ── bar        (y = 20)
//   [S1]       |       [S2]       (y = 50, NCART stations on Line 1)
//             roof        dock    (y = 80; the dock has no routes, you find it on foot)
//
// Off the top street between the alley and the market, a gun shop you can go into, a noodle
// bar with a menu, a bank and a cyberdeck shop; off the middle street, a park you can't go
// into. The bar is a diner.
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
    { id: 'b-shop', block: 'B1', district: 'test', kind: 'shops', kindLabel: 'Cyberware outlet', category: 'cyberware', business: 'cyberware-outlet', name: 'Test Chrome', floors: 3, x: 30, y: 21, w: 4, h: 4 },
    { id: 'b-park', block: 'B2', district: 'test', kind: 'park', kindLabel: 'Park', category: 'public', business: null, name: 'Test Park', floors: 0, x: 30, y: 51, w: 6, h: 6 },
    { id: 'b-noodle', block: 'B1', district: 'test', kind: 'shops', kindLabel: 'Noodle bar', category: 'food', business: 'noodle-bar', name: 'Test Noodles', floors: 2, x: 36, y: 21, w: 4, h: 4 },
    { id: 'b-bank', block: 'B1', district: 'test', kind: 'shops', kindLabel: 'Bank', category: 'services', business: 'bank', name: 'EuroBank', floors: 2, x: 42, y: 21, w: 4, h: 4 },
    { id: 'b-deck', block: 'A1', district: 'test', kind: 'shops', kindLabel: 'Cyberdeck shop', category: 'netrunning', business: 'cyberdeck-shop', name: 'Test Decks', floors: 1, x: 24, y: 21, w: 4, h: 4 },
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
      subdistricts: [],
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
  jobs: JOBS,
  life: LIFE,
  combat: COMBAT,
  gear: GEAR,
  money: MONEY,
  // People's days run on UTC here, whatever machine the tests run on.
  clock: (now) => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) }),
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const T0 = Date.UTC(2077, 9, 12, 20, 0);
/** Well after any test's clock: a meter written down then hasn't moved yet. */
const LATER = Date.UTC(2077, 11, 1);

/** The test city with a hospital along the top street, past the market. */
const clinicWorld: World = {
  ...world,
  buildings: [...world.buildings, { id: 'b-hospital', block: 'C1', district: 'test', kind: 'shops', kindLabel: 'Hospital', category: 'medical', business: 'hospital', name: 'Test General', floors: 4, x: 52, y: 21, w: 4, h: 4 }],
};
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
/** What was said with someone, without the notes on how it went. */
const spoken = (game: Game, id: string) => game.conversation(id).filter((l) => l.who !== 'note');

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
    expect(game.wallet).toEqual({ eddies: 5, bills: 5, coins: 0, account: 0, chips: 0, passUntil: 0 });
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
      expect(game.wallet).toMatchObject({ eddies: 5, passUntil: bought + 30 * 86_400_000 });
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
        money: null,
        energy: null,
        inebriation: null,
        society: null,
        charisma: null,
        job: null,
        life: null,
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
      expect(outputs(take())).toEqual([{ text: `${dear.name} is ${dear.price} €$. You've got 1 €$ in cash.`, tone: 'error' }]);

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
      money: null,
      energy: null,
      inebriation,
      society: null,
      charisma: null,
      job: null,
      life: null,
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
      money: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
      job: null,
      life: null,
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
      expect(spoken(told, worker.id).at(-1)?.text).toMatch(/told you|last I checked/i);
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

    it('offers a few people worth asking about, from what the player knows, however many names they have', () => {
      const { game: probe, now, worker } = shiftAt();
      const everyone = probe.population.people.filter((p) => p.id !== worker.id);
      // Every name in the city known, someone seen with them, someone already asked about.
      const [seen, asked] = everyone as [Person, Person];
      const society: SocietyState = {
        ...freshSociety(),
        known: Object.fromEntries(everyone.map((p) => [p.id, { met: true, seen: true, told: false, facts: ['name'], log: [] }])),
        links: { [linkKey(worker.id, seen.id)]: { kind: null, how: 'seen', at: now }, [linkKey(worker.id, asked.id)]: { kind: 'none', how: 'asked', at: now } },
      };
      const inside = { ...carryingProgress([]), where: outside('b-noodle', 38, 20), inside: 'b-noodle' };
      const game = new Game(world, { ...RULES, startingEddies: 100 }, { ...inside, society });
      game.start(now);
      const offered = game.worthAsking(worker.id, now).map((p) => p.id);
      expect(everyone.length).toBeGreaterThan(ASK_ABOUT);
      expect(offered.length).toBeLessThanOrEqual(ASK_ABOUT);
      expect(offered[0]).toBe(seen.id);
      expect(offered).not.toContain(asked.id);
      expect(offered).not.toContain(worker.id);
      // Family by the name come before strangers; nobody the player can't name.
      for (const p of everyone.filter((q) => q.family === worker.family)) if (offered.length < ASK_ABOUT && p.id !== asked.id) expect(offered).toContain(p.id);
      const stranger = new Game(world, RULES, inside);
      stranger.start(now);
      expect(stranger.worthAsking(worker.id, now)).toEqual([]);
    });

    it('tells people apart by their look until introduced, and learns the rest by watching, talking and asking', () => {
      const { game, now, worker } = shiftAt();
      const { take, outputs } = record(game);
      // A stranger: no name, no facts; only what's plain to see.
      const stranger = game.describe(worker.id);
      expect(stranger).toMatchObject({ named: false, lines: [] });
      expect(stranger?.name).toMatch(/^(A|An) (young |older )?(man|woman|person)/);
      expect(spoken(game, worker.id)).toEqual([]);
      // Looking around the noodle bar: whoever is at work here plainly works here.
      game.look(now);
      expect(game.describe(worker.id)?.facts.job).toContain('Test Noodles');
      expect(game.describe(worker.id)?.named).toBe(false);
      // Talking is an introduction, on the record both ways.
      expect(game.talk(worker.id, now)).toBe(true);
      // Their name, with the street name in the middle if they go by one.
      expect(game.describe(worker.id)?.named).toBe(true);
      expect(game.describe(worker.id)?.name).toMatch(new RegExp(`^${worker.given}( "[^"]+")? ${worker.family}$`));
      const log = spoken(game, worker.id);
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
      const asked = spoken(game, worker.id).at(-2);
      expect(asked?.who).toBe('you');
      expect(LINES.questions.age.lines.map((l) => `"${typeof l === 'string' ? l : l.text}"`)).toContain(asked?.text);
      expect(spoken(game, worker.id).at(-1)?.who).toBe('them');
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
      // Asking again right away is pressing: still nothing, and they think less of the player for it (and a stranger is put off being asked where they live, again).
      expect(game.askFact(worker.id, 'home', now + MINUTE)).toBe(true);
      expect(game.describe(worker.id)?.facts.home).toBeUndefined();
      expect(game.standingWith(worker.id, now + MINUTE)?.standing.rapport).toBe((standing?.rapport ?? 0) - SOCIETY.openness.press - SOCIETY.reactions.rapport);
      expect(game.conversation(worker.id).at(-1)).toMatchObject({ who: 'note', text: expect.stringMatching(/^Pushed after a no · (.+ · )?Rapport −4/), tone: 'bad' });
      expect(LINES.pressed.map((l) => (typeof l === 'string' ? l : l.text))).toContain(spoken(game, worker.id).at(-1)?.text);
      // A smooth talker puts it differently, and hears it. Asked again, they've said already, which is no practice.
      const smooth = new Game(world, { ...RULES, startingEddies: 100 }, { ...carryingProgress([]), where: outside('b-noodle', 38, 20), inside: 'b-noodle', charisma: { level: 12, xp: 0 } });
      smooth.start(now);
      expect(smooth.askFact(worker.id, 'home', now)).toBe(true);
      expect(smooth.describe(worker.id)?.facts.home).toBeDefined();
      expect(spoken(smooth, worker.id).at(-2)?.text).toBe('"Whereabouts do you lay your head? Just so I know where to send the good word."');
      const xp = smooth.charisma().xp;
      expect(smooth.askFact(worker.id, 'home', now + MINUTE)).toBe(true);
      expect(smooth.charisma().xp).toBe(xp);
      expect(spoken(smooth, worker.id).at(-1)?.text).toMatch(/told you already|listening|again\?|short memory/i);
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
      money: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
      job: null,
      life: null,
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
      kinds: { ...GEAR.kinds, jacket: { ...GEAR.kinds.jacket!, slots: 1 }, pants: { ...GEAR.kinds.pants!, slots: 2, change: false } },
    };

    it('wears the usual clothes, with the wallet in the pants weighing what the eddies weigh', () => {
      const { game } = inside('b-noodle', 38, 20);
      expect(game.gearSaved).toEqual(GEAR.start);
      const { grams, pockets } = game.carry();
      expect(pockets.map((p) => p.id)).toEqual(['tank', 'jacket', 'pants', 'high-tops', 'wallet']);
      const walletGrams = Math.round(GEAR.kinds.wallet!.grams + 100 * GEAR.gramsPerBill);
      expect(pockets[4]).toMatchObject({ bills: 100, holds: GEAR.kinds.wallet!.holds, grams: walletGrams, over: false });
      expect(pockets[2]?.load).toEqual({ slots: 1, grams: walletGrams });
      const clothes = GEAR.start.filter((p) => p.in === null).reduce((sum, p) => sum + (GEAR.kinds[p.kind]?.grams ?? 0), 0);
      expect(grams).toBe(clothes + walletGrams);
      expect(game.wallet).toMatchObject({ eddies: 100, bills: 100, coins: 0, account: 0 });
      // Each garment says where it's worn and what it is.
      expect(pockets[1]).toMatchObject({ slot: 'outer', style: 'entropism', quality: 'poverty', name: 'Old duolayer jacket with buckles' });
      expect(pockets[0]).toMatchObject({ slot: 'inner', slots: 0 });
    });

    it('dresses a new player head to toe, and an older save the same, keeping what it wore', () => {
      const { game } = inside('b-noodle', 38, 20);
      const { worn, bags } = outfit(game.gearSaved, GEAR);
      expect(Object.keys(worn).sort()).toEqual(['feet', 'inner', 'legs', 'outer']);
      expect(bags).toEqual([]);
      // A save from before clothes had a jacket, pants and the wallet: it keeps those and gets the rest.
      const old = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), gear: [{ id: 'jacket', kind: 'jacket', in: null }, { id: 'pants', kind: 'pants', in: null }, { id: 'wallet', kind: 'wallet', in: 'pants' }] });
      expect(old.gearSaved.map((p) => p.kind).sort()).toEqual(['high-tops', 'jacket', 'pants', 'tank', 'wallet']);
      // One wearing something else in a slot keeps it.
      const dressed = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), gear: [{ id: 'zebriger-led-jacket-1', kind: 'zebriger-led-jacket', in: null }, { id: 'pants', kind: 'pants', in: null }, { id: 'wallet', kind: 'wallet', in: 'pants' }] });
      expect(outfit(dressed.gearSaved, GEAR).worn.outer?.kind).toBe('zebriger-led-jacket');
      expect(dressed.gearSaved.some((p) => p.kind === 'jacket')).toBe(false);
    });

    it("sells clothing off a store's rack at its tier, to wear from the inventory, the pockets' contents and the wallet moving over", () => {
      // The gun shop stands in for Stylishly: an everyday rack with a chain's stock and a bag.
      const racked: GearContent = { ...GEAR, racks: { ...GEAR.racks, 'cyberware-outlet': GEAR.racks.stylishly! }, quality: { ...GEAR.quality, 'cyberware-outlet': 'everyday' } };
      const taco = { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 1, in: 'jacket' };
      const game = new Game(world, { ...RULES, gear: racked }, { ...progressInside('b-shop', 32, 20, [taco]), money: { bills: 400, coins: 0, account: 0 } });
      game.start(T0);
      const { take, outputs } = record(game);
      const menu = game.menu();
      expect(menu?.kind).toBe('gear');
      expect(menu?.venue.quality).toBe('everyday');
      const jacket = { ...GEAR.kinds['zebriger-led-jacket']!, price: GEAR.kinds['zebriger-led-jacket']?.price ?? 0 };
      expect(jacket.price).toBeGreaterThan(0);
      expect(menu?.items.find((i) => i.id === 'zebriger-led-jacket')).toMatchObject({ kind: 'clothing', price: jacket.price, detail: 'Outer torso · Kitsch' });
      expect(menu?.items.find((i) => i.id === 'icon-america-fleets')?.detail).toBe('Feet · Kitsch · ICON America');
      expect(menu?.items.find((i) => i.id === 'backpack')?.kind).toBe('gear');
      // Bought, it's carried, not worn.
      expect(game.buy('zebriger-led-jacket')).toBe(true);
      expect(outputs(take()).at(-1)?.text).toBe(`Bought ${jacket.name} for ${jacket.price} €$. Put it on from the inventory.`);
      expect(game.inventory.find((i) => i.id === 'zebriger-led-jacket')).toMatchObject({ kind: 'clothing', gear: 'zebriger-led-jacket', count: 1, in: 'jacket' });
      expect(game.wallet.eddies).toBe(400 - jacket.price);
      // Put on: the old jacket and the taco in it find pockets, and the old jacket is one to wear again.
      expect(game.wear('zebriger-led-jacket')).toBe(true);
      expect(outputs(take()).at(-1)?.text).toBe(`You put on the ${jacket.name}.`);
      expect(outfit(game.gearSaved, GEAR).worn.outer).toMatchObject({ id: 'zebriger-led-jacket-1', kind: 'zebriger-led-jacket' });
      expect(game.gearSaved.some((p) => p.id === 'jacket')).toBe(false);
      const old = game.inventory.find((i) => i.id === 'jacket');
      expect(old).toMatchObject({ kind: 'clothing', gear: 'jacket', count: 1 });
      expect(game.gearSaved.some((p) => p.id === old?.in)).toBe(true);
      expect(game.gearSaved.some((p) => p.id === game.inventory.find((i) => i.id === 'taco')?.in)).toBe(true);
      expect(game.wear('nothing')).toBe(false);
      expect(game.wear('taco')).toBe(false);
      // New pants take the wallet with them, and the loose change.
      expect(game.buy('dark-sapphire-rocker-pants')).toBe(true);
      expect(game.wear('dark-sapphire-rocker-pants')).toBe(true);
      expect(game.gearSaved.find((p) => p.kind === 'wallet')?.in).toBe('dark-sapphire-rocker-pants-1');
      expect(game.carry().pockets.find((p) => p.id === 'dark-sapphire-rocker-pants-1')).toMatchObject({ slot: 'legs', coins: 0 });
      expect(game.inventory.find((i) => i.id === 'pants')).toMatchObject({ kind: 'clothing', gear: 'pants' });
    });

    it('takes off a hat or face wear into a pocket, never the clothes a player comes with', () => {
      const cap = { id: 'worn-baseball-cap', kind: 'clothing' as const, name: GEAR.kinds['worn-baseball-cap']!.name, count: 1, gear: 'worn-baseball-cap' };
      const { game, take, outputs } = inside('b-noodle', 38, 20, {}, [cap]);
      expect(game.wear('worn-baseball-cap')).toBe(true);
      expect(outfit(game.gearSaved, GEAR).worn.head?.id).toBe('worn-baseball-cap-1');
      expect(game.inventory.some((i) => i.id === 'worn-baseball-cap')).toBe(false);
      take();
      // Off it comes, back into a pocket.
      expect(game.takeOff('worn-baseball-cap-1')).toBe(true);
      expect(outputs(take()).at(-1)).toEqual({ text: `You take off the ${cap.name}.`, tone: 'system' });
      expect(outfit(game.gearSaved, GEAR).worn.head).toBeUndefined();
      expect(game.inventory.find((i) => i.id === 'worn-baseball-cap')).toMatchObject({ kind: 'clothing', gear: 'worn-baseball-cap', count: 1 });
      expect(game.gearSaved.some((p) => p.id === game.inventory.find((i) => i.id === 'worn-baseball-cap')?.in)).toBe(true);
      // The jacket, the pants, the tank and the shoes stay on; the wallet and nothing aren't garments.
      expect(game.takeOff('jacket')).toBe(false);
      expect(outputs(take()).at(-1)).toEqual({ text: `The ${GEAR.kinds.jacket!.name} stays on until you've something else to wear there.`, tone: 'error' });
      for (const id of ['tank', 'pants', 'high-tops', 'wallet', 'nothing']) expect(game.takeOff(id), id).toBe(false);
      expect(outfit(game.gearSaved, GEAR).worn.outer?.id).toBe('jacket');
      // With no pocket for it, it stays on.
      const packed: GearContent = { ...GEAR, items: { ...GEAR.items, consumable: { grams: 250, perSlot: 1 } }, kinds: { ...GEAR.kinds, jacket: { ...GEAR.kinds.jacket!, slots: 1 }, pants: { ...GEAR.kinds.pants!, slots: 2 } } };
      const full = new Game(world, { ...RULES, gear: packed }, { ...progressInside('b-noodle', 38, 20, [{ id: 'taco', kind: 'consumable', name: 'Taco', count: 1, in: 'jacket' }, { id: 'burrito-xxl', kind: 'consumable', name: 'Burrito XXL', count: 1, in: 'pants' }]), gear: [...GEAR.start, { id: 'worn-baseball-cap-1', kind: 'worn-baseball-cap', in: null }] });
      full.start(T0);
      const { take: takeFull, outputs: outFull } = record(full);
      expect(full.takeOff('worn-baseball-cap-1')).toBe(false);
      expect(outFull(takeFull()).at(-1)).toEqual({ text: `No room in your pockets for the ${cap.name}. Make room first.`, tone: 'error' });
      expect(outfit(full.gearSaved, GEAR).worn.head?.id).toBe('worn-baseball-cap-1');
    });

    it("won't swap a garment whose pockets have nowhere to empty into, and leaves behind one it can't carry", () => {
      // Five slots in the jacket, one thing to a slot: four tacos and a vest to put on, which has two slots; the pants are full.
      const packed: GearContent = { ...GEAR, items: { ...GEAR.items, consumable: { grams: 250, perSlot: 1 } }, kinds: { ...GEAR.kinds, jacket: { ...GEAR.kinds.jacket!, slots: 5 }, pants: { ...GEAR.kinds.pants!, slots: 1 } } };
      const tacos = { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 4, in: 'jacket' };
      const vest = { id: 'duolayer-nylon-vest', kind: 'clothing' as const, name: GEAR.kinds['duolayer-nylon-vest']!.name, count: 1, gear: 'duolayer-nylon-vest', in: 'jacket' };
      const { game, take, outputs } = inside('b-noodle', 38, 20, { gear: packed }, [tacos, vest]);
      expect(game.wear('duolayer-nylon-vest')).toBe(false);
      expect(outputs(take()).at(-1)).toEqual({ text: "No room for the Taco that's in your Old duolayer jacket with buckles. Make room first.", tone: 'error' });
      expect(outfit(game.gearSaved, GEAR).worn.outer?.id).toBe('jacket');
      expect(game.inventory.find((i) => i.id === 'duolayer-nylon-vest')?.in).toBe('jacket');
      // Hotpants with one small pocket, put on with the jacket near its weight: the wallet moves into them and takes their one slot, so the old pants fit nowhere and stay behind.
      const heavy = { id: 'sake-utagawa', kind: 'consumable' as const, name: 'Sake Utagawa', count: 2, in: 'jacket' };
      const snack = { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 2, in: 'jacket' };
      const hotpants = { id: 'golden-pocket-hotpants', kind: 'clothing' as const, name: GEAR.kinds['golden-pocket-hotpants']!.name, count: 1, gear: 'golden-pocket-hotpants', in: 'pants' };
      const tight = new Game(world, { ...RULES, startingEddies: 100 }, progressInside('b-noodle', 38, 20, [heavy, snack, hotpants]));
      tight.start(T0);
      const { take: takeTight, outputs: outTight } = record(tight);
      expect(tight.wear('golden-pocket-hotpants')).toBe(true);
      expect(outTight(takeTight()).at(-1)?.text).toBe(`You put on the ${hotpants.name}. No room to carry the Worn cargo pants: it stays where you stand.`);
      expect(tight.inventory.some((i) => i.id === 'pants')).toBe(false);
      expect(tight.gearSaved.find((p) => p.kind === 'wallet')?.in).toBe('golden-pocket-hotpants-1');
    });

    it('moves a stack out of a swapped garment onto the stack of the same thing, never beside it', () => {
      // Two slots in the pants, the wallet in one and a taco in the other; another taco in the jacket, with the vest to put on.
      const snug: GearContent = { ...GEAR, kinds: { ...GEAR.kinds, pants: { ...GEAR.kinds.pants!, slots: 2, change: false } } };
      const inJacket = { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 1, in: 'jacket' };
      const inPants = { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 1, in: 'pants' };
      const vest = { id: 'duolayer-nylon-vest', kind: 'clothing' as const, name: GEAR.kinds['duolayer-nylon-vest']!.name, count: 1, gear: 'duolayer-nylon-vest', in: 'jacket' };
      const { game } = inside('b-noodle', 38, 20, { gear: snug }, [inJacket, inPants, vest]);
      expect(game.wear('duolayer-nylon-vest')).toBe(true);
      // The jacket's taco joined the pants' one: one stack of two, and the pants are not over.
      expect(game.inventory.filter((i) => i.id === 'taco')).toEqual([expect.objectContaining({ count: 2, in: 'pants' })]);
      expect(game.carry().pockets.find((p) => p.id === 'pants')).toMatchObject({ load: { slots: 2, grams: expect.any(Number) }, over: false });
      expect(game.carry().pockets.some((p) => p.over)).toBe(false);
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
      expect(game.carry().pockets.map((p) => `${p.load.slots}/${p.slots}`)).toEqual(['0/0', '1/1', '2/2', '0/0', '0/0']);
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
      const rack: GearContent = { ...tiny, racks: { 'cyberware-outlet': ['duffel-bag', 'belt-pouch'] } };
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

    it('nets a robbery only what the wallet and the pocket will hold', () => {
      // A wallet that holds exactly the bills carried and no chips, and pants with no room for a first coin.
      const full: GearContent = { ...GEAR, kinds: { ...GEAR.kinds, wallet: { ...GEAR.kinds.wallet!, holds: 100, chips: 0 }, pants: { ...GEAR.kinds.pants!, slots: 1 } } };
      for (let day = 0; day < 14; day++) {
        const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
        const game = new Game(world, { ...RULES, startingEddies: 100, gear: full }, progressInside('b-noodle', 38, 20));
        game.start(now);
        const worker = game.peopleHere(now).find((p) => p.person.job.building === 'b-noodle' && p.person.eddies > 0);
        if (!worker) continue;
        const { take, outputs } = record(game);
        expect(game.rob(worker.person.id, now)).toBe(true);
        // No room for bills or coins: nothing comes away, but it was still a robbery.
        expect(game.wallet.eddies).toBe(100);
        expect(outputs(take()).some((o) => /No room on you/.test(o.text))).toBe(true);
        expect(game.standingWith(worker.person.id, now)?.stance).toBe('hostile');
        return;
      }
      throw new Error('nobody at the noodle bar');
    });

    it('pays cash coins first and gets change in coins, which weigh', () => {
      const { game, take, outputs } = inside('b-noodle', 38, 20);
      const dish = game.menu()?.items.find((i) => i.price % 5 !== 0);
      if (!dish) throw new Error('every price is a round one');
      expect(game.buy(dish.id)).toBe(true);
      // A note or two handed over, the difference back in coins.
      const change = Math.ceil(dish.price / MONEY.noteMin) * MONEY.noteMin - dish.price;
      expect(game.wallet).toMatchObject({ bills: 100 - dish.price - change, coins: change, eddies: 100 - dish.price });
      expect(game.carry().pockets.find((p) => p.id === 'pants')).toMatchObject({ coins: change });
      take();
      // Next time the coins go first.
      expect(game.buy(dish.id)).toBe(true);
      const paidFromCoins = Math.min(change, dish.price);
      expect(game.wallet.coins).toBeLessThan(change + MONEY.noteMin);
      expect(game.wallet.eddies).toBe(100 - 2 * dish.price);
      expect(paidFromCoins).toBeGreaterThan(0);
      expect(outputs(take()).map((o) => o.text)).not.toContain('No room for the change');
    });

    it('puts what was bought in its pocket before the change comes back, so the coins never take its place', () => {
      // No room in the jacket and one slot to spare in the pants, where the first coin would go too.
      const snug: GearContent = { ...GEAR, items: { ...GEAR.items, consumable: { grams: 250, perSlot: 1 } }, kinds: { ...GEAR.kinds, jacket: { ...GEAR.kinds.jacket!, slots: 0 }, pants: { ...GEAR.kinds.pants!, slots: 2 } } };
      const { game, take, outputs } = inside('b-noodle', 38, 20, { gear: snug });
      const dish = game.menu()?.items.find((i) => i.price % MONEY.noteMin !== 0);
      if (!dish) throw new Error('every price is a round one');
      expect(game.canBuy(dish.id)).toBeNull();
      expect(game.buy(dish.id)).toBe(true);
      expect(game.inventory.find((i) => i.id === dish.id)?.in).toBe('pants');
      // The pants are full with it, so the counter keeps the change.
      const change = Math.ceil(dish.price / MONEY.noteMin) * MONEY.noteMin - dish.price;
      expect(game.wallet).toMatchObject({ coins: 0, bills: 100 - dish.price - change });
      expect(outputs(take()).map((o) => o.text)).toEqual([`No room for the change: ${change} €$ stays on the counter.`, `Bought ${dish.name} for ${dish.price} €$.`]);
      expect(game.carry().pockets.every((p) => !p.over)).toBe(true);
    });

    it('makes room for change once the coins paid are out of the pocket', () => {
      // Pants a few grams from full, with two coins in: paying with them first leaves room for the change.
      const tight: GearContent = { ...GEAR, kinds: { ...GEAR.kinds, pants: { ...GEAR.kinds.pants!, maxGrams: Math.round(GEAR.kinds.wallet!.grams + 100 * GEAR.gramsPerBill + 2 * GEAR.gramsPerCoin) + 1 } } };
      const game = new Game(world, { ...RULES, gear: tight }, { ...progressInside('b-noodle', 38, 20), money: { bills: 100, coins: 2, account: 0 } });
      game.start(T0);
      const { take, outputs } = record(game);
      const dish = game.menu()?.items.find((i) => i.price > 2 && (i.price - 2) % MONEY.noteMin !== 0);
      if (!dish) throw new Error('no dish to make change on');
      expect(game.buy(dish.id)).toBe(true);
      const change = Math.ceil((dish.price - 2) / MONEY.noteMin) * MONEY.noteMin - (dish.price - 2);
      expect(game.wallet.coins).toBe(Math.min(change, 2));
      expect(outputs(take()).some((o) => o.text.startsWith('No room for the change') && change <= 2)).toBe(false);
    });

    it('drops, eats and puts on the one in the pocket it was picked from', () => {
      const racked: GearContent = { ...GEAR, racks: { ...GEAR.racks, 'cyberware-outlet': GEAR.racks.stylishly! }, quality: { ...GEAR.quality, 'cyberware-outlet': 'everyday' } };
      const tacos = [
        { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 2, in: 'jacket' },
        { id: 'taco', kind: 'consumable' as const, name: 'Taco', count: 1, in: 'pants' },
      ];
      const game = new Game(world, { ...RULES, gear: racked }, progressInside('b-shop', 32, 20, tacos));
      game.start(T0);
      expect(game.drop('taco', 'pants')).toBe(true);
      expect(game.inventory.filter((i) => i.id === 'taco').map((i) => [i.in, i.count])).toEqual([['jacket', 2]]);
      expect(game.consume('taco', T0, 'pants')).toBe(false);
      expect(game.consume('taco', T0, 'jacket')).toBe(true);
      expect(game.inventory.find((i) => i.id === 'taco')?.count).toBe(1);
    });

    it('never moves the wallet into a holster, and new legwear has to bear the coins', () => {
      // A holster on, the jacket full, and hotpants with one golden pocket waiting.
      const full = Array.from({ length: 4 }, (_, i) => ({ id: `junk-${i}`, kind: 'junk' as const, name: 'Junk', count: 1, in: 'jacket' }));
      const hotpants = { id: 'golden-pocket-hotpants', kind: 'clothing' as const, name: 'Hotpants', count: 1, in: 'pants', gear: 'golden-pocket-hotpants' };
      const holster = { id: 'holster-1', kind: 'holster', in: null };
      const game = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20, [...full, hotpants]), gear: [...GEAR.start, holster], money: { bills: 50, coins: 1, account: 0 } });
      game.start(T0);
      game.wear('golden-pocket-hotpants');
      expect(game.gearSaved.find((p) => p.kind === 'wallet')?.in).not.toBe('holster-1');
      for (const p of game.carry().pockets) expect(p.over, p.id).toBe(false);
      // With a pocketful of coins, the hotpants won't take them.
      const heavy = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20, [hotpants]), money: { bills: 50, coins: 150, account: 0 } });
      heavy.start(T0);
      const { take, outputs } = record(heavy);
      expect(heavy.wear('golden-pocket-hotpants')).toBe(false);
      expect(outputs(take()).at(-1)?.text).toMatch(/won't bear the weight of your coins/);
      expect(outfit(heavy.gearSaved, GEAR).worn.legs?.kind).toBe('pants');
    });

    it('takes what a robbery takes off the victim for good, chip and all', () => {
      for (let day = 0; day < 14; day++) {
        const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
        const game = new Game(world, { ...RULES, startingEddies: 10 }, progressInside('b-noodle', 38, 20));
        game.start(now);
        const victim = game.peopleHere(now).find((p) => p.person.eddies > 20 && p.person.chip > 0)?.person;
        if (!victim) continue;
        const had = victim.eddies;
        const cash = game.wallet.eddies;
        expect(game.rob(victim.id, now)).toBe(true);
        const took = game.wallet.eddies - cash;
        expect(took).toBeGreaterThan(0);
        expect(victim.eddies).toBe(had - took);
        expect(victim.chip).toBe(0);
        // Their days, saved and put back, bring them back without it.
        const again = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), life: JSON.parse(JSON.stringify(game.lifeSaved)) });
        expect(again.population.people.find((p) => p.id === victim.id)).toMatchObject({ eddies: had - took, chip: 0 });
        return;
      }
      throw new Error('nobody at the noodle bar with a chip on them');
    });

    it('takes a transfer where the counter does, and cash where it does not', () => {
      // A rack of gear takes a transfer when the account covers it; a neighborhood noodle bar wants cash.
      const rack: GearContent = { ...GEAR, racks: { 'cyberware-outlet': ['belt-pouch'] } };
      const banked = new Game(world, { ...RULES, startingEddies: 100, gear: rack }, { ...progressInside('b-shop', 32, 20), money: { bills: 5, coins: 0, account: 200 } });
      banked.start(T0);
      const pouch = banked.menu()?.items[0];
      if (!pouch) throw new Error('no pouch');
      expect(banked.canBuy(pouch.id)).toBeNull();
      expect(banked.affords(pouch.id)).toBe(true);
      expect(banked.buy(pouch.id)).toBe(true);
      expect(banked.wallet).toMatchObject({ bills: 5, coins: 0, account: 200 - pouch.price });
      const street = new Game(world, { ...RULES, startingEddies: 100 }, { ...progressInside('b-noodle', 38, 20), money: { bills: 1, coins: 0, account: 200 } });
      street.start(T0);
      const dish = street.menu()?.items[0];
      if (!dish) throw new Error('no dish');
      expect(street.canBuy(dish.id)).toBe(`${dish.name} is ${dish.price} €$. You've got 1 €$ in cash.`);
      expect(street.affords(dish.id)).toBe(false);
      expect(street.affords('nothing')).toBe(false);
      expect(street.buy(dish.id)).toBe(false);
      // The NCART takes a transfer too.
      const rider = new Game(world, { ...RULES, startingEddies: 0, fare: 3 }, { ...progressInside('b-noodle', 38, 20), where: station('s1'), inside: null, money: { bills: 0, coins: 0, account: 10 } });
      rider.start(T0);
      expect(rider.affordsFare(3)).toBe(true);
      expect(rider.affordsFare(30)).toBe(false);
      expect(go(rider, station('s2'), 'ncart', T0).started).toBe(true);
      expect(rider.wallet).toMatchObject({ account: 7, eddies: 0 });
    });

    it('banks: deposits cash less the cut for coins, hands out bills as far as the wallet holds them, and changes coins', () => {
      const { game, take, outputs } = inside('b-bank', 44, 20);
      expect(game.bank()).toMatchObject({ name: 'EuroBank', fee: MONEY.coinFee, withdrawals: MONEY.withdrawals });
      // Nothing to change yet; a deposit of 100 €$ in bills is free.
      expect(game.exchange()).toBe(false);
      expect(game.deposit()).toBe(true);
      expect(game.wallet).toMatchObject({ bills: 0, coins: 0, account: 100 });
      expect(outputs(take()).at(-1)?.text).toBe('Deposited 100 €$. 100 €$ in the bank.');
      expect(game.deposit()).toBe(false);
      // Out again, in bills.
      expect(game.withdraw(200)).toBe(false);
      expect(game.withdraw(50)).toBe(true);
      expect(game.wallet).toMatchObject({ bills: 50, account: 50 });
      // Coins get counted for a cut, in or out.
      const coined = new Game(world, { ...RULES, startingEddies: 0 }, { ...progressInside('b-bank', 44, 20), money: { bills: 10, coins: 40, account: 0 } });
      coined.start(T0);
      expect(coined.exchange()).toBe(true);
      expect(coined.wallet).toMatchObject({ bills: 48, coins: 0, account: 0 });
      const depositor = new Game(world, { ...RULES, startingEddies: 0 }, { ...progressInside('b-bank', 44, 20), money: { bills: 10, coins: 40, account: 0 } });
      depositor.start(T0);
      expect(depositor.deposit()).toBe(true);
      expect(depositor.wallet).toMatchObject({ bills: 0, coins: 0, account: 48 });
      // No counter outside a bank, nor for someone the branch has barred.
      const { game: elsewhere } = inside('b-noodle', 38, 20);
      expect(elsewhere.bank()).toBeNull();
      expect(elsewhere.deposit()).toBe(false);
      expect(elsewhere.withdraw(10)).toBe(false);
      const barred = new Game(world, RULES, { ...progressInside('b-bank', 44, 20), society: { ...freshSociety(), rep: { 'business:b-bank': { value: SOCIETY.rep.banAt, at: T0 } } } });
      barred.start(T0);
      expect(barred.barred(T0)).toMatch(/won't serve|closes/);
      expect(barred.bank(T0)).toBeNull();
      expect(barred.deposit()).toBe(false);
    });

    /** A weekday at 11:00 UTC with someone working at a storefront, the game standing inside it. */
    function atWork(building: string, x: number, y: number, progress: Partial<Progress> = {}, rules: Partial<GameRules> = {}) {
      for (let day = 0; day < 14; day++) {
        const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
        if (new Date(now).getUTCDay() % 6 === 0) continue;
        const game = new Game(world, { ...RULES, startingEddies: 100, ...rules }, { ...progressInside(building, x, y), ...progress });
        game.start(now);
        const worker = game.peopleHere(now).find((p) => p.person.job.building === building);
        if (worker) return { game, now, worker: worker.person, ...record(game) };
      }
      throw new Error(`nobody works at ${building}`);
    }
    const hot = (balance: number, n = 1): Item => ({ id: `credchip-${n}`, kind: 'credchip', name: 'CredChip', count: 1, balance, locked: true });
    /** Standing with someone that makes them a friend as of `now`. */
    const friendOf = (id: string, now: number) => ({
      ...freshSociety(),
      standings: { [id]: { met: true, rapport: 80, grudge: 0, at: now, talks: 0, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} } },
    });

    it('robs a credchip too, which comes locked, into the wallet', () => {
      const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20);
      worker.chip = 120;
      take();
      expect(game.rob(worker.id, now)).toBe(true);
      const chip = game.inventory.find((i) => i.kind === 'credchip');
      expect(chip).toMatchObject({ name: 'CredChip', count: 1, in: 'wallet', balance: 120, locked: true });
      const said = outputs(take()).map((o) => o.text);
      expect(said.some((t) => /a credchip with 120 €\$ on it/.test(t))).toBe(true);
      expect(said.some((t) => /locked to .*netrunner/.test(t))).toBe(true);
      // Locked, it's nobody's money yet: not the header's, not a counter's.
      expect(game.wallet.chips).toBe(0);
      expect(game.carry().pockets.find((p) => p.id === 'wallet')).toMatchObject({ chips: 1, chipSlots: GEAR.kinds.wallet!.chips });
      // Robbed again this week, they have nothing, chip included.
      expect(game.rob(worker.id, now + HOUR)).toBe(true);
      expect(game.inventory.filter((i) => i.kind === 'credchip')).toHaveLength(1);
      // With no card slots and no pockets, the chip stays with them.
      const { game: full, now: later, worker: other } = atWork('b-noodle', 38, 20, {}, { gear: { ...GEAR, kinds: { ...GEAR.kinds, wallet: { ...GEAR.kinds.wallet!, chips: 0 }, jacket: { ...GEAR.kinds.jacket!, slots: 0 }, pants: { ...GEAR.kinds.pants!, slots: 1 } } } });
      other.chip = 60;
      const { take: takeFull, outputs: outFull } = record(full);
      expect(full.rob(other.id, later)).toBe(true);
      expect(full.inventory).toEqual([]);
      expect(outFull(takeFull()).some((o) => /No room on you for (his|her|their) credchip/.test(o.text))).toBe(true);
    });

    it('has a netrunner chop a hot chip for a cut, after which it spends where transfers are taken and banks', () => {
      // Behind the counter of a cyberdeck shop is someone who can, and the player can tell as much.
      const tech = atWork('b-deck', 26, 20);
      expect(tech.game.canChop(tech.worker.id)).toBe(true);
      const { now } = tech;
      const { game, take, outputs } = atWork('b-deck', 26, 20, { items: [hot(120)], money: { bills: 0, coins: 0, account: 0 }, society: friendOf(tech.worker.id, now) });
      expect(game.inventory[0]?.in).toBe('wallet');
      expect(game.canBuy('x')).toBe('Not for sale here.');
      take();
      expect(game.chop(tech.worker.id, 'credchip-1', now)).toBe(true);
      const said = outputs(take());
      expect(game.inventory[0]).toMatchObject({ balance: 90, locked: false });
      expect(game.wallet.chips).toBe(90);
      expect(said.some((o) => o.tone === 'talk' && /30/.test(o.text) && /90/.test(o.text))).toBe(true);
      expect(spoken(game, tech.worker.id).map((l) => l.who)).toEqual(['you', 'them']);
      // Watching them work, the player knows their trade; and there's nothing more to chop.
      expect(game.describe(tech.worker.id)?.facts.job).toMatch(/Test Decks/);
      expect(game.chop(tech.worker.id, 'credchip-1', now)).toBe(false);
      // A chip with an eddie on it is all cut: nothing left to keep.
      const token = atWork('b-deck', 26, 20, { items: [hot(1)], money: { bills: 0, coins: 0, account: 0 }, society: friendOf(tech.worker.id, now) });
      token.take();
      expect(token.game.chop(tech.worker.id, 'credchip-1', now)).toBe(true);
      expect(token.game.inventory.filter((i) => i.kind === 'credchip')).toEqual([]);
      expect(token.outputs(token.take()).some((o) => /Nothing left on the chip/.test(o.text))).toBe(true);
      // A stranger might say no; then asking again soon is pressing, which costs rapport and gets nowhere.
      const stranger = atWork('b-deck', 26, 20, { items: [hot(40)], money: { bills: 0, coins: 0, account: 0 } });
      stranger.take();
      expect(stranger.game.chop(stranger.worker.id, 'credchip-1', stranger.now)).toBe(true);
      expect(stranger.outputs(stranger.take()).some((o) => o.tone === 'talk')).toBe(true);
      if (stranger.game.inventory[0]?.locked) {
        const before = stranger.game.standingWith(stranger.worker.id, stranger.now)?.standing.rapport ?? 0;
        expect(stranger.game.chop(stranger.worker.id, 'credchip-1', stranger.now + MINUTE)).toBe(true);
        expect(stranger.game.inventory[0]?.locked).toBe(true);
        expect(stranger.game.standingWith(stranger.worker.id, stranger.now + MINUTE)?.standing.rapport).toBeLessThan(before);
      } else {
        expect(stranger.game.wallet.chips).toBe(30);
      }
      // Someone who is not a netrunner, as far as the player can tell, is never asked.
      const cook = atWork('b-noodle', 38, 20, { items: [hot(40)] });
      expect(cook.game.canChop(cook.worker.id)).toBe(false);
      expect(cook.game.chop(cook.worker.id, 'credchip-1', cook.now)).toBe(false);

      // Clean, the chip pays where a transfer is taken (the chip before the account), and not where cash is wanted.
      const rack: GearContent = { ...GEAR, racks: { 'cyberware-outlet': ['belt-pouch'] } };
      const clean: Item = { ...hot(90), locked: false };
      const shop = new Game(world, { ...RULES, startingEddies: 0, gear: rack }, { ...progressInside('b-shop', 32, 20, [clean]), money: { bills: 0, coins: 0, account: 50 } });
      shop.start(T0);
      const pouch = shop.menu()?.items[0];
      if (!pouch) throw new Error('no pouch');
      expect(shop.canBuy(pouch.id)).toBeNull();
      expect(shop.buy(pouch.id)).toBe(true);
      expect(shop.wallet).toMatchObject({ chips: 90 - pouch.price, account: 50, eddies: 0 });
      const locked = new Game(world, { ...RULES, startingEddies: 0, gear: rack }, { ...progressInside('b-shop', 32, 20, [hot(90)]), money: { bills: 0, coins: 0, account: 0 } });
      locked.start(T0);
      expect(locked.canBuy(pouch.id)).toBe(`${pouch.name} is ${pouch.price} €$. You've got 0 €$ in cash and 0 €$ in the bank.`);
      const street = new Game(world, { ...RULES, startingEddies: 0 }, { ...progressInside('b-noodle', 38, 20, [clean]), money: { bills: 0, coins: 0, account: 0 } });
      street.start(T0);
      const dish = street.menu()?.items[0];
      if (!dish) throw new Error('no dish');
      expect(street.canBuy(dish.id)).toBe(`${dish.name} is ${dish.price} €$. You've got 0 €$ in cash.`);
      // Spent to nothing, a chip is tossed.
      const exact = new Game(world, { ...RULES, startingEddies: 0, gear: rack }, { ...progressInside('b-shop', 32, 20, [{ ...hot(pouch.price), locked: false }]), money: { bills: 0, coins: 0, account: 0 } });
      exact.start(T0);
      const { take: takeExact, outputs: outExact } = record(exact);
      expect(exact.buy(pouch.id)).toBe(true);
      expect(exact.inventory.filter((i) => i.kind === 'credchip')).toEqual([]);
      expect(outExact(takeExact()).some((o) => /empties the chip/.test(o.text))).toBe(true);

      // The bank takes the chips in your name into the account, and slides the others back.
      const teller = new Game(world, { ...RULES, startingEddies: 0 }, { ...progressInside('b-bank', 44, 20, [clean, hot(50, 2)]), money: { bills: 0, coins: 0, account: 10 } });
      teller.start(T0);
      const { take: takeBank, outputs: outBank } = record(teller);
      expect(teller.bankChips()).toBe(true);
      expect(teller.wallet).toMatchObject({ account: 100, chips: 0 });
      expect(teller.inventory.map((i) => i.id)).toEqual(['credchip-2']);
      expect(outBank(takeBank()).at(-1)?.text).toBe('Banked the chip: 90 €$ into the account. 100 €$ in the bank. The teller slides the other one back: not in your name.');
      expect(teller.bankChips()).toBe(false);
      expect(outBank(takeBank()).at(-1)?.text).toBe("That chip isn't in your name. EuroBank won't touch it.");
      const { game: nothing } = inside('b-bank', 44, 20);
      expect(nothing.bankChips()).toBe(false);
      expect(inside('b-noodle', 38, 20).game.bankChips()).toBe(false);
    });

    it('loses the chips on you to whoever comes to collect, when the cash runs short', () => {
      // No cash on the player, next to none on them, and a chip: whoever collects wants more than the cash.
      const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, { eddies: 0 }, { startingEddies: 0 });
      worker.eddies = 4;
      worker.chip = 50;
      expect(game.rob(worker.id, now)).toBe(true);
      expect(game.inventory.find((i) => i.kind === 'credchip')).toMatchObject({ balance: 50, locked: true });
      const threats = game.societySaved.threats;
      expect(threats.length).toBeGreaterThan(0);
      // What they come for is more than the cash on the player: the chip goes too.
      expect(Math.max(...threats.map((t) => t.amount))).toBeGreaterThan(game.wallet.eddies);
      take();
      game.tick(Math.max(...threats.map((t) => t.due)) + 1);
      const said = outputs(take()).map((o) => o.text);
      expect(said.some((t) => /credchip on you goes with them/.test(t))).toBe(true);
      expect(game.inventory.filter((i) => i.kind === 'credchip')).toEqual([]);
      expect(game.wallet.eddies).toBe(0);
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

    describe('masks', () => {
      const gasMask = { id: 'old-plastic-gas-mask-1', kind: 'old-plastic-gas-mask', in: null };
      const inMask = [...GEAR.start, gasMask];

      it('robs from behind a mask without anyone knowing whose doing it was, until the victim sees the mask again', () => {
        const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, { gear: inMask });
        expect(game.masked()).toEqual({ kind: 'old-plastic-gas-mask', word: 'gas mask', name: 'Old plastic gas mask' });
        const others = game.peopleHere(now).filter((p) => p.person.id !== worker.id);
        take();
        expect(game.rob(worker.id, now)).toBe(true);
        const said = outputs(take()).map((o) => o.text);
        expect(said.some((t) => /gas mask/.test(t))).toBe(true);
        expect(said.some((t) => /forget your face|remembers your face|Word will get around/.test(t))).toBe(false);
        expect(said.some((t) => /Nobody saw your face|all they saw was a gas mask/.test(t))).toBe(true);
        // Robbed is robbed; but nobody holds it against the player: not the victim, not the witnesses, not the house.
        expect(game.standingWith(worker.id, now)?.standing).toMatchObject({ grudge: 0, met: false, robbedAt: now });
        for (const o of others) expect(game.standingWith(o.person.id, now)?.standing.grudge, o.person.name).toBe(0);
        expect(game.reputation(now)).toEqual([]);
        expect(game.societySaved.threats).toEqual([]);
        expect(game.societySaved.incidents).toHaveLength(1);
        expect(game.societySaved.incidents[0]).toMatchObject({ kind: 'robbery', victim: worker.id, mask: 'old-plastic-gas-mask', pinned: false });
        // The counter serves no mask, which is not the same as a ban.
        expect(game.barred(now)).toMatch(/mask/i);
        expect(game.barred(now)).not.toMatch(/won't serve you|closes the moment/);
        expect(game.canBuy(game.menu()?.items[0]?.id ?? '', now)).toMatch(/mask/i);
        // Still here an hour on, in the same mask, and the victim puts it together: all of it lands now.
        take();
        game.tick(now + HOUR);
        expect(game.peopleHere(now + HOUR).some((p) => p.person.id === worker.id)).toBe(true);
        const pinned = outputs(take());
        expect(pinned.some((o) => o.tone === 'error' && /gas mask/.test(o.text))).toBe(true);
        expect(pinned.some((o) => /on you now/.test(o.text))).toBe(true);
        expect(game.standingWith(worker.id, now + HOUR)?.standing.grudge).toBe(SOCIETY.severity.robbery);
        expect(game.standingWith(worker.id, now + HOUR)?.stance).toBe('hostile');
        expect(game.reputation(now + HOUR).find((r) => r.key === 'business:b-noodle')?.value).toBeLessThanOrEqual(SOCIETY.rep.banAt);
        expect(game.barred(now + HOUR)).toMatch(/won't serve you|closes the moment/);
        expect(game.societySaved.incidents[0]?.pinned).toBe(true);
        // Pinned once: looking again brings nothing.
        take();
        game.tick(now + 2 * HOUR);
        expect(outputs(take())).toEqual([]);
      });

      it("keeps a masked robbery nobody's when the mask comes off before anyone sees it again, and pins it the moment it goes back on", () => {
        const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, { gear: inMask });
        expect(game.rob(worker.id, now)).toBe(true);
        expect(game.takeOff('old-plastic-gas-mask-1')).toBe(true);
        expect(game.masked()).toBeNull();
        expect(outputs(take()).at(-1)?.text).toMatch(/Your face is your own again/);
        // Bare-faced in front of the victim an hour on: nothing. They never saw a face.
        game.tick(now + HOUR);
        expect(outputs(take())).toEqual([]);
        expect(game.standingWith(worker.id, now + HOUR)?.standing.grudge).toBe(0);
        expect(game.barred(now + HOUR)).toBeNull();
        expect(game.talk(worker.id, now + HOUR)).toBe(true);
        expect(game.standingWith(worker.id, now + HOUR)?.stance).not.toBe('hostile');
        // The mask back on in front of them, and it clicks.
        take();
        expect(game.wear('old-plastic-gas-mask', now + HOUR)).toBe(true);
        const said = outputs(take());
        expect(said.some((o) => /nobody knows your face/.test(o.text))).toBe(true);
        expect(said.some((o) => /on you now/.test(o.text))).toBe(true);
        expect(game.standingWith(worker.id, now + HOUR)?.standing.grudge).toBe(SOCIETY.severity.robbery);
        expect(game.societySaved.incidents[0]?.pinned).toBe(true);
      });

      it('makes an insult from behind a mask nobody\'s either, and the people colder to a mask', () => {
        const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, { gear: inMask });
        const bare = new Game(world, { ...RULES, startingEddies: 100 }, progressInside('b-noodle', 38, 20));
        bare.start(now);
        take();
        expect(game.insult(worker.id, now)).toBe(true);
        expect(outputs(take()).length).toBeGreaterThan(0);
        expect(game.standingWith(worker.id, now)?.standing).toMatchObject({ grudge: 0, rapport: 0 });
        expect(game.societySaved.incidents[0]).toMatchObject({ kind: 'insult', pinned: false });
        // A mask gets less out of people: the same stranger, asked the same thing, with the mask on and off.
        const open = (g: Game, asked: Parameters<typeof openness>[0]) => openness(asked, g.standingWith(worker.id, now)?.stance ?? 'neutral', 1, worker.traits, SOCIETY.openness, Boolean(g.masked()));
        expect(open(game, 'job')).toBe(open(bare, 'job') - SOCIETY.openness.mask);
      });

      it('serves no mask at any counter, the bank and a stall included, until it comes off', () => {
        const bank = new Game(world, RULES, { ...progressInside('b-bank', 44, 20), gear: inMask, money: { bills: 50, coins: 0, account: 100 } });
        bank.start(T0);
        expect(bank.bank(T0)).toBeNull();
        expect(bank.barred(T0)).toMatch(/mask/i);
        expect(bank.deposit()).toBe(false);
        expect(bank.takeOff('old-plastic-gas-mask-1')).toBe(true);
        expect(bank.bank(T0)).toMatchObject({ name: 'EuroBank' });
        expect(bank.barred(T0)).toBeNull();
        expect(bank.deposit()).toBe(true);
        // A diner's kitchen out at a place is a counter too.
        const stall = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), where: at('bar'), inside: null, gear: inMask, money: { bills: 50, coins: 0, account: 0 } });
        stall.start(T0);
        const dish = stall.menu()?.items[0]?.id ?? '';
        expect(dish).not.toBe('');
        expect(stall.barred(T0)).toMatch(/mask/i);
        expect(stall.canBuy(dish, T0)).toMatch(/mask/i);
        expect(stall.affords(dish)).toBe(true);
        expect(stall.takeOff('old-plastic-gas-mask-1')).toBe(true);
        expect(stall.canBuy(dish, T0)).toBeNull();
        // Nowhere with a counter, a mask is nobody's business.
        const street = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), where: at('alley'), inside: null, gear: inMask });
        street.start(T0);
        expect(street.barred(T0)).toBeNull();
      });
    });

    describe('work', () => {
      /** A weekday at 11:00 (or `hour`) with the boss of a storefront in, and the player inside with a friend's standing with them unless said otherwise. */
      function withBoss(building: string, x: number, y: number, progress: Partial<Progress> = {}, friend = true, on: World = world, hour = 11) {
        const b = on.buildings.find((it) => it.id === building);
        if (!b) throw new Error(`no ${building}`);
        for (let day = 0; day < 14; day++) {
          const now = Date.UTC(2077, 9, 12, hour, 0) + day * 24 * HOUR;
          if (new Date(now).getUTCDay() % 6 === 0) continue;
          const probe = new Game(on, RULES, progressInside(building, x, y));
          const boss = bossOf(b, probe.population);
          if (!boss) throw new Error(`nobody runs ${building}`);
          const game = new Game(on, { ...RULES, startingEddies: 100 }, { ...progressInside(building, x, y), ...(friend ? { society: friendOf(boss.id, now) } : {}), ...progress });
          game.start(now);
          if (game.peopleHere(now).some((p) => p.person.id === boss.id)) return { game, now, boss, ...record(game) };
        }
        throw new Error(`the boss of ${building} is never in`);
      }
      /** The test city with a bar on the top street, which works nights. */
      const barWorld: World = {
        ...world,
        buildings: [...world.buildings, { id: 'b-bar', block: 'C1', district: 'test', kind: 'shops', kindLabel: 'Bar', category: 'nightlife', business: 'bar', name: 'Test Bar', floors: 2, x: 52, y: 21, w: 4, h: 4 }],
      };
      const noodleJob = (extra: Partial<JobState> = {}): JobState => ({ building: 'b-noodle', rung: 0, trust: 0, shifts: 0, lastShiftDay: -1, ...extra });

      /** A week of books for a storefront: a day's net, seven times. */
      const books = (building: string, net: number) => ({ life: { ...freshLife(), tills: { [building]: { days: Array.from({ length: 7 }, () => net), pending: 0 } } } });

      it('reads a place by its books: a week in the red pays less and takes nobody on, a good week pays more', () => {
        const noodle = world.buildings.find((b) => b.id === 'b-noodle') as Building;
        // Fresh books: steady, the plain rate.
        const plain = withBoss('b-noodle', 38, 20);
        expect(plain.game.trade(noodle)).toEqual({ health: 'steady', line: LIFE.economy.trade.steady });
        // In the red: the boss won't hire, whatever they think of the player.
        const { game, now, boss, take, outputs } = withBoss('b-noodle', 38, 20, books('b-noodle', -40));
        expect(game.trade(noodle).health).toBe('struggling');
        take();
        expect(game.askForWork(boss.id, now)).toBe(true);
        expect(game.jobStatus(now)).toBeNull();
        const refusal = spoken(game, boss.id).at(-1);
        expect(refusal?.who).toBe('them');
        expect(LINES.work.broke.map((l) => (typeof l === 'string' ? l : l.text).replace(/\{[a-z]+\}/gi, '')).some((t) => refusal?.text.includes(t.split(' ').slice(0, 3).join(' ')))).toBe(true);
        expect(outputs(take()).some((o) => /You've got work at/.test(o.text))).toBe(false);
        // Doing well: the same job pays a quarter more.
        const good = withBoss('b-noodle', 38, 20, books('b-noodle', 400));
        expect(good.game.trade(noodle).health).toBe('thriving');
        expect(good.game.askForWork(good.boss.id, good.now)).toBe(true);
        expect(good.game.jobStatus(good.now)?.pay).toBe(Math.round(24 * LIFE.economy.pay.thriving));
        const bad = new Game(world, { ...RULES, startingEddies: 100 }, { ...progressInside('b-noodle', 38, 20), ...books('b-noodle', -40), job: noodleJob() });
        bad.start(now);
        expect(bad.jobStatus(now)?.pay).toBe(Math.round(24 * LIFE.economy.pay.struggling));
      });

      it('puts what the player spends at a storefront in its till, for the day to be lived', () => {
        const { game } = inside('b-noodle', 38, 20);
        const dish = game.menu()?.items.find((i) => i.kind === 'food');
        if (!dish) throw new Error('Nothing on the menu');
        expect(game.buy(dish.id)).toBe(true);
        expect(game.buy(dish.id)).toBe(true);
        // Starting the game lived the last days' books already; what the player spent waits for the next.
        expect(game.lifeSaved.tills['b-noodle']?.pending).toBe(dish.price * 2);
      });

      it('takes the player on at the bottom of the ladder when the boss will, owes a shift a day till payday, and moves them up on trust', () => {
        const { game, now, boss, take, outputs } = withBoss('b-noodle', 38, 20);
        expect(game.jobStatus(now)).toBeNull();
        expect(game.workWith(boss.id)).toBe('hire');
        expect(game.switchingFrom(boss.id)).toBeNull();
        for (const other of game.peopleHere(now).filter((p) => p.person.id !== boss.id && p.person.job.building === 'b-noodle')) expect(game.workWith(other.person.id), other.person.name).toBeNull();
        take();
        expect(game.askForWork(boss.id, now)).toBe(true);
        const said = outputs(take());
        expect(said.some((o) => /^You've got work at Test Noodles: dish pit, 24 €\$ a shift, 9am to 5pm, Mon–Fri\. Pay comes on payday\.$/.test(o.text))).toBe(true);
        expect(spoken(game, boss.id).at(-1)?.who).toBe('them');
        const status = game.jobStatus(now);
        expect(status).toMatchObject({ rung: { id: 'dishes' }, next: { id: 'prep' }, trust: 0, shifts: 0, pay: 24, side: false, hours: [9, 17], days: [1, 2, 3, 4, 5], owed: 0, here: true, open: true, blocked: null });
        expect(status?.boss?.id).toBe(boss.id);
        expect(game.workWith(boss.id)).toBe('quit');
        expect(game.standingWith(boss.id, now)?.knowledge.facts).toEqual(expect.arrayContaining(['name', 'job']));
        // Asked again, there's nothing to ask: the player works here.
        expect(game.askForWork(boss.id, now)).toBe(false);

        // A shift: energy spent, pay owed, trust and the boss's regard up; and only one a day.
        const account = game.wallet.account;
        const rapport = game.standingWith(boss.id, now)?.standing.rapport ?? 0;
        expect(game.work(now)).toBe(true);
        expect(game.wallet.account).toBe(account);
        expect(game.energy(now).current).toBe(1);
        expect(game.jobStatus(now)).toMatchObject({ trust: 1, shifts: 1, owed: 24, open: false, blocked: 'done' });
        expect(game.standingWith(boss.id, now)?.standing.rapport).toBe(Math.min(100, rapport + JOBS.rapport));
        expect(outputs(take()).some((o) => /A shift washing dishes at Test Noodles: 24 €\$ on your pay, 24 €\$ owed by payday/.test(o.text))).toBe(true);
        expect(game.work(now + MINUTE)).toBe(false);
        expect(outputs(take()).at(-1)?.text).toMatch(/done your shift today/);
        expect(game.careerSaved).toEqual({ food: 1 });

        // A shift a day, and the day the trust is there and the boss is in, a step up.
        let moved: number | null = null;
        for (let day = 1; day <= 12 && moved === null; day++) {
          const later = now + day * 24 * HOUR;
          if (new Date(later).getUTCDay() % 6 === 0) continue;
          take();
          expect(game.work(later), `day ${day}`).toBe(true);
          if (outputs(take()).some((o) => /You're moved up: prep at Test Noodles, 40 €\$ a shift/.test(o.text))) moved = day;
        }
        expect(moved).not.toBeNull();
        expect(game.jobStatus(now + (moved as number) * 24 * HOUR)).toMatchObject({ rung: { id: 'prep' }, pay: 40 });
        expect(game.jobStatus(now)?.trust).toBeGreaterThanOrEqual(JOBS.ladders.food!.rungs[1]!.at);
        expect(spoken(game, boss.id).some((l) => l.who === 'them' && /prep/i.test(l.text))).toBe(true);

        // Quitting, to the boss's face: what's owed is paid out, from the till.
        const last = now + (moved as number) * 24 * HOUR;
        const owed = game.jobStatus(last)?.owed ?? 0;
        expect(owed).toBeGreaterThan(0);
        const pending = game.lifeSaved.tills['b-noodle']?.pending ?? 0;
        take();
        expect(game.quit(last, boss.id)).toBe(true);
        expect(game.jobStatus(last)).toBeNull();
        expect(game.workWith(boss.id)).toBe('hire');
        expect(game.wallet.account).toBe(account + owed);
        expect(game.lifeSaved.tills['b-noodle']?.pending).toBe(pending - owed);
        const quitting = outputs(take());
        expect(quitting.some((o) => o.text === `${owed} €$ from Test Noodles to your account.`)).toBe(true);
        expect(quitting.some((o) => /You don't work at Test Noodles anymore/.test(o.text))).toBe(true);
        expect(spoken(game, boss.id).at(-2)?.who).toBe('you');
        expect(game.quit(last)).toBe(false);
      });

      it('is turned down by a boss who thinks little of the player, or sees a mask, and lets a thief go', () => {
        // Insulted, the boss is cold, and cold is a no; asking again at once is pressing.
        const { game, now, boss, take, outputs } = withBoss('b-noodle', 38, 20, {}, false);
        expect(game.insult(boss.id, now)).toBe(true);
        expect(game.standingWith(boss.id, now)?.stance).toBe('cold');
        take();
        expect(game.askForWork(boss.id, now)).toBe(true);
        expect(game.jobStatus(now)).toBeNull();
        expect(outputs(take()).length).toBeGreaterThan(0);
        expect(game.standingWith(boss.id, now)?.standing.refused.hire).toBe(now);
        const rapport = game.standingWith(boss.id, now)?.standing.rapport ?? 0;
        expect(game.askForWork(boss.id, now + MINUTE)).toBe(true);
        expect(game.standingWith(boss.id, now + MINUTE)?.standing.rapport).toBe(rapport - SOCIETY.openness.press);
        // A mask gets a no from anyone, friend or not.
        const masked = withBoss('b-noodle', 38, 20, { gear: [...GEAR.start, { id: 'old-plastic-gas-mask-1', kind: 'old-plastic-gas-mask', in: null }] });
        masked.take();
        expect(masked.game.askForWork(masked.boss.id, masked.now)).toBe(true);
        expect(masked.game.jobStatus(masked.now)).toBeNull();
        expect(spoken(masked.game, masked.boss.id).at(-1)?.text).toMatch(/face|mask/i);
        // Hired, then robbing the boss: the place is done with the player.
        const hired = withBoss('b-noodle', 38, 20);
        expect(hired.game.askForWork(hired.boss.id, hired.now)).toBe(true);
        expect(hired.game.jobStatus(hired.now)).not.toBeNull();
        hired.take();
        expect(hired.game.rob(hired.boss.id, hired.now)).toBe(true);
        expect(hired.game.jobStatus(hired.now)).toBeNull();
        expect(hired.outputs(hired.take()).some((o) => o.tone === 'error' && /done with you/.test(o.text))).toBe(true);
        expect(hired.game.work(hired.now)).toBe(false);
      });

      it("lives the people's days on the clock, keeps them through a save, and hears the news from them", () => {
        const { game, now } = withBoss('b-noodle', 38, 20);
        const today = Math.floor(now / (24 * HOUR));
        expect(game.lifeSaved.day).toBe(today);
        // Yesterday and today were lived through on starting; the days since, on the next tick.
        const saved = game.lifeSaved;
        const later = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), life: saved });
        later.start(now + 3 * 24 * HOUR);
        expect(later.lifeSaved.day).toBe(today + 3);
        expect(later.lifeSaved.events.every((e) => e.day > today + 3 - LIFE.keepDays)).toBe(true);
        // Put back from a save, the people are as they were left.
        const again = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), life: game.lifeSaved });
        expect(again.population.people).toEqual(game.population.people);
        expect(again.lifeSaved).toEqual(game.lifeSaved);
        // Everyone here is with someone or not, and the news, when there is any, names someone real.
        for (const p of game.peopleHere(now)) {
          if (p.scene) expect(game.person(p.scene.with), p.person.name).toBeDefined();
        }
        const told = game.population.people.map((p) => newsFor(p, game.population, game.lifeSaved, LIFE, today)).filter((n) => n !== null);
        for (const n of told) expect(game.person(n.other.id)).toBeDefined();
        // The test city has no gangs, so its days are quiet: friendships, and fallings out.
        for (const e of game.lifeSaved.events) expect(['friends', 'fallout']).toContain(e.kind);
      });

      it('keeps shifts to working hours and the workplace, and keeps the jobs through a save', () => {
        const { game, now, boss } = withBoss('b-noodle', 38, 20);
        expect(game.askForWork(boss.id, now)).toBe(true);
        const evening = Date.UTC(2077, 9, 12, 20, 0) + Math.floor((now - Date.UTC(2077, 9, 12, 11, 0)) / (24 * HOUR)) * 24 * HOUR;
        expect(game.jobStatus(evening)?.blocked).toBe('closed');
        expect(game.work(evening)).toBe(false);
        game.leave();
        expect(game.jobStatus(now)?.blocked).toBe('away');
        expect(game.work(now)).toBe(false);
        // Saved and read back, the job is the same; at a place that doesn't hire, or isn't there, it's none.
        const today = Math.floor(now / (24 * HOUR));
        expect(game.jobSaved).toMatchObject({ building: 'b-noodle', rung: 0, trust: 0, shifts: 0, lastShiftDay: -1, days: [1, 2, 3, 4, 5], owed: 0, checked: today });
        expect(game.jobsSaved).toEqual([game.jobSaved]);
        const again = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), job: noodleJob({ rung: 1, trust: 7, shifts: 7 }) });
        expect(again.jobStatus(now)).toMatchObject({ rung: { id: 'prep' }, trust: 7, shifts: 7, days: [1, 2, 3, 4, 5], owed: 0, blocked: null });
        expect(new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), job: { ...noodleJob(), building: 'b-park' } }).jobSaved).toBeNull();
        expect(new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), job: { ...noodleJob(), building: 'b-gone' } }).jobSaved).toBeNull();
        // Both jobs, and the shifts worked in each line, come back from a newer save; its jobs over an older one's.
        const two = [noodleJob({ owed: 48, days: [1, 3] }), { building: 'b-deck', rung: 2, trust: 15, shifts: 15, lastShiftDay: today - 1 }];
        const both = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), job: { ...noodleJob(), building: 'b-bank' }, jobs: two, career: { food: 9, netrunning: 15 } });
        expect(both.jobsSaved).toEqual(two);
        expect(both.careerSaved).toEqual({ food: 9, netrunning: 15 });
        expect(both.jobsStatus(now).map((j) => [j.building.id, j.side, j.days])).toEqual([['b-noodle', false, [1, 3]], ['b-deck', true, [1, 2, 3, 4, 5]]]);
      });

      it("takes a side gig on hours that don't clash, which a loyal boss at the day job minds hearing of", () => {
        // Evenings at the bar: the noodle bar's hours are over by then.
        const { game, now, boss, take, outputs } = withBoss('b-bar', 54, 20, { jobs: [noodleJob()] }, true, barWorld, 20);
        expect(game.workWith(boss.id)).toBe('hire');
        expect(game.switchingFrom(boss.id)).toBeNull();
        take();
        expect(game.askForWork(boss.id, now)).toBe(true);
        expect(outputs(take()).some((o) => /^You've got a side gig at Test Bar: barback, \d+ €\$ a shift, 6pm to 2am, Thu, Fri, Sat\./.test(o.text))).toBe(true);
        expect(game.jobsStatus(now).map((j) => [j.building.id, j.side, j.hours])).toEqual([['b-noodle', false, [9, 17]], ['b-bar', true, [18, 2]]]);
        // Inside the bar, its job is the one the panel works.
        expect(game.jobStatus(now)?.building.id).toBe('b-bar');
        expect(game.jobsSaved[0]?.heard).toBe(false);
        // No room for a third: asking anywhere else means handing one in.
        const deck = bossOf(world.buildings.find((b) => b.id === 'b-deck') as Building, game.population) as Person;
        expect(game.workWith(deck.id)).toBe('switch');
        expect(game.switchingFrom(deck.id)).toBe('Test Noodles');

        // Back at the noodle bar, a boss who's loyal hears of it and minds: the shift's regard is gone.
        const noodle = bossOf(barWorld.buildings.find((b) => b.id === 'b-noodle') as Building, game.population) as Person;
        const day = withBoss('b-noodle', 38, 20, { jobs: [noodleJob({ heard: false }), { building: 'b-bar', rung: 0, trust: 0, shifts: 0, lastShiftDay: -1 }] }, true, barWorld);
        (day.game.person(noodle.id) as Person).traits.loyalty = 0.9;
        const rapport = day.game.standingWith(noodle.id, day.now)?.standing.rapport ?? 0;
        expect(day.game.work(day.now)).toBe(true);
        expect(day.game.standingWith(noodle.id, day.now)?.standing.rapport).toBe(rapport + JOBS.rapport - JOBS.moonlight.rapport);
        const minded = spoken(day.game, noodle.id).at(-1)?.text ?? '';
        expect(minded).toContain('Test Bar');
        expect(day.game.jobsSaved[0]?.heard).toBe(true);
        // Heard once is enough.
        const tomorrow = day.now + 24 * HOUR;
        const after = day.game.standingWith(noodle.id, tomorrow)?.standing.rapport ?? 0;
        if (new Date(tomorrow).getUTCDay() % 6 !== 0 && day.game.peopleHere(tomorrow).some((p) => p.person.id === noodle.id)) {
          expect(day.game.work(tomorrow)).toBe(true);
          expect(day.game.standingWith(noodle.id, tomorrow)?.standing.rapport).toBe(Math.min(100, after + JOBS.rapport));
        }
      });

      it('hands in notice at a job whose hours clash, with a good word from a boss who liked the player, and starts a rung up on experience', () => {
        const deck = barWorld.buildings.find((b) => b.id === 'b-deck') as Building;
        const noodle = barWorld.buildings.find((b) => b.id === 'b-noodle') as Building;
        const probe = new Game(barWorld, RULES, progressInside('b-deck', 26, 20));
        const old = bossOf(noodle, probe.population) as Person;
        const first = withBoss('b-deck', 26, 20, {}, true, barWorld);
        const society = { ...first.game.societySaved, standings: { ...first.game.societySaved.standings, [old.id]: { ...friendOf(old.id, first.now).standings[old.id]! } } };
        const { game, now, boss, take, outputs } = withBoss('b-deck', 26, 20, { society, jobs: [noodleJob({ owed: 48, trust: 3, shifts: 3 }), { building: 'b-bar', rung: 0, trust: 0, shifts: 0, lastShiftDay: -1 }], career: { netrunning: 12 } }, true, barWorld);
        expect(game.workWith(boss.id)).toBe('switch');
        expect(game.switchingFrom(boss.id)).toBe('Test Noodles');
        const account = game.wallet.account;
        const rapport = game.standingWith(old.id, now)?.standing.rapport ?? 0;
        take();
        expect(game.askForWork(boss.id, now)).toBe(true);
        const said = outputs(take()).map((o) => o.text);
        // Notice handed in, the pay owed paid out, and the old boss puts in a word.
        expect(said).toContain('48 €$ from Test Noodles to your account.');
        expect(said).toContain('You hand in your notice at Test Noodles.');
        expect(said.some((t) => t.startsWith("You've got work at Test Decks: counter, ") && t.endsWith(`${old.given} put in a word for you.`))).toBe(true);
        expect(game.wallet.account).toBe(account + 48);
        expect(game.standingWith(old.id, now)?.standing.rapport).toBe(rapport - JOBS.notice);
        expect(game.societySaved.memories[old.id]?.some((m) => m.kind === 'notice')).toBe(true);
        // Twelve shifts in the line are six of trust, and the word four more: a rung up, not two.
        // The new day job takes the old one's place; the bar stays the side gig.
        expect(game.jobsSaved.map((j) => j.building)).toEqual(['b-deck', 'b-bar']);
        expect(game.jobsSaved[0]).toMatchObject({ building: 'b-deck', rung: 1, trust: 10 });
        expect(game.jobStatus(now)?.rung.id).toBe('net-counter');
        expect(deck.category).toBe('netrunning');
      });

      it('keeps the player to their days, pays on payday out of the till, gives a raise at a place doing well, and lets a no-show go', () => {
        // Tuesday the 12th, 11:00: a day job, Monday and Wednesday only.
        const { game, now, boss, take, outputs } = withBoss('b-noodle', 38, 20, books('b-noodle', 400));
        expect(new Date(now).getUTCDay()).toBe(2);
        expect(game.askForWork(boss.id, now)).toBe(true);
        expect(game.setRoster(boss.id, [3, 1], now)).toBe(true);
        expect(game.setRoster(boss.id, [], now)).toBe(false);
        expect(game.jobStatus(now)).toMatchObject({ days: [1, 3], blocked: 'off', open: false });
        take();
        expect(game.work(now)).toBe(false);
        expect(outputs(take()).at(-1)?.text).toBe("You're not on today. Your days at Test Noodles: Mon, Wed.");
        // Wednesday's shift; Thursday's tick owes nothing yet.
        const wednesday = now + 24 * HOUR;
        expect(game.work(wednesday)).toBe(true);
        const pay = game.jobStatus(wednesday)?.pay ?? 0;
        expect(game.jobStatus(wednesday)?.owed).toBe(pay);
        const account = game.wallet.account;
        game.tick(wednesday + 24 * HOUR);
        expect(game.wallet.account).toBe(account);
        // Friday morning is payday: the week's pay to the account, out of the till; and the place is doing well.
        const friday = wednesday + 2 * 24 * HOUR - 10 * HOUR;
        expect(game.trade(world.buildings.find((b) => b.id === 'b-noodle') as Building).health).toBe('thriving');
        take();
        game.tick(friday);
        expect(game.wallet.account).toBe(account + pay);
        expect(game.jobStatus(friday)?.owed).toBe(0);
        const said = outputs(take()).map((o) => o.text);
        expect(said).toContain(`${pay} €$ from Test Noodles to your account.`);
        expect(game.jobsSaved[0]?.raise).toBe(JOBS.raise.thriving);
        expect(said.some((t) => /doing well, and it shows: a raise/.test(t))).toBe(true);
        expect(game.jobStatus(friday)?.pay).toBe(Math.round(pay * (1 + JOBS.raise.thriving)));
        // Paid once a payday.
        game.tick(friday + 6 * HOUR);
        expect(game.wallet.account).toBe(account + pay);
        // No misses on days off; then a fortnight of no-shows, four rostered days, and the job's gone.
        expect(game.jobsSaved[0]?.missed ?? 0).toBe(0);
        const trust = game.jobsSaved[0]?.trust ?? 0;
        const regard = game.standingWith(boss.id, friday)?.standing.rapport ?? 0;
        game.tick(friday + 4 * 24 * HOUR);
        expect(game.jobsSaved[0]?.missed).toBe(1);
        expect(game.jobsSaved[0]?.trust).toBe(Math.max(0, trust - JOBS.noShow.trust));
        expect(game.standingWith(boss.id, friday + 4 * 24 * HOUR)?.standing.rapport).toBeLessThan(regard);
        take();
        game.tick(friday + 14 * 24 * HOUR);
        expect(game.jobsSaved).toEqual([]);
        expect(outputs(take()).some((o) => o.tone === 'error' && /let you go: you stopped showing up/.test(o.text))).toBe(true);
        expect(game.societySaved.memories[boss.id]?.some((m) => m.kind === 'fired')).toBe(true);
      });

      describe('how people take things', () => {
        /** Someone at the noodle counter, made into whoever the test needs. */
        function someone(traits: Partial<Person['traits']>, progress: Partial<Progress> = {}, rules: Partial<GameRules> = {}) {
          const at = atWork('b-noodle', 38, 20, progress, rules);
          const person = at.game.person(at.worker.id) as Person;
          person.traits = { warmth: 0.5, temper: 0.5, loyalty: 0.5, greed: 0.5, courage: 0.5, chatty: 0.5, ...traits };
          return at;
        }
        const notes = (game: Game, id: string) => game.conversation(id).filter((l) => l.who === 'note');

        it('lands a compliment with someone warm, and says so after', () => {
          const { game, now, worker } = someone({ warmth: 0.9 }, { charisma: { level: 3, xp: 0 } });
          expect(game.talk(worker.id, now, 'compliment')).toBe(true);
          const said = spoken(game, worker.id);
          expect(said[0]?.who).toBe('you');
          expect(LINES.approaches.compliment.you.map((l) => (typeof l === 'string' ? l : l.text))).toContain(said[0]?.text);
          // Liked: more than a chat is worth, and the note says why.
          const base = Math.round(SOCIETY.talk.base * (0.6 + 0.9 * 0.8) * game.charisma().bonus);
          const rapport = game.standingWith(worker.id, now)?.standing.rapport ?? 0;
          expect(rapport).toBe(base + 2 * SOCIETY.reactions.rapport);
          const note = notes(game, worker.id).at(-1);
          expect(note).toMatchObject({ tone: 'good' });
          expect(note?.text).toMatch(/^Likes a kind word · Rapport \+\d+ · Charisma \+3 XP/);
        });

        it("has a joke fall flat with a temper, which puts them off saying anything else", () => {
          const { game, now, worker } = someone({ temper: 0.9, chatty: 0.2, warmth: 0.5 });
          expect(game.talk(worker.id, now, 'joke')).toBe(true);
          const theirs = spoken(game, worker.id).filter((l) => l.who === 'them');
          // A greeting and the brush-off; no small talk after.
          expect(theirs).toHaveLength(2);
          expect(LINES.approaches.joke.disliked.map((l) => (typeof l === 'string' ? l : l.text)).some((t) => theirs[1]?.text.includes(t))).toBe(true);
          expect(game.standingWith(worker.id, now)?.standing.rapport).toBeLessThan(0);
          expect(notes(game, worker.id).at(-1)).toMatchObject({ tone: 'bad', text: expect.stringMatching(/^Not in the mood for jokes · Rapport −\d+ · Charisma \+1 XP/) });
        });

        it('wears people out with question after question, and says so', () => {
          const { game, now, worker } = someone({});
          const facts = ['name', 'job', 'likes', 'age'] as const;
          facts.forEach((fact, i) => game.askFact(worker.id, fact, now + i * MINUTE));
          const last = notes(game, worker.id).at(-1);
          expect(last?.text).toMatch(/^Tired of all the questions · (.+ · )?Rapport −/);
          expect(game.standingWith(worker.id, now + 3 * MINUTE)?.standing.sitting).toBe(4);
          // A while later, it's a fresh start.
          game.askFact(worker.id, 'hates', now + 3 * MINUTE + (SOCIETY.openness.grill.minutes + 1) * MINUTE);
          expect(game.standingWith(worker.id, now + 30 * MINUTE)?.standing.sitting).toBe(1);
        });

        it('notes what a gift and an insult did: rapport, a grudge, the stance', () => {
          const probe = atWork('b-noodle', 38, 20);
          const dish = FOOD.dishes.find((d) => d.id === probe.worker.likes.dish) as (typeof FOOD.dishes)[number];
          const { game, now, worker } = atWork('b-noodle', 38, 20, { items: [{ id: dish.id, kind: 'consumable', name: dish.name, count: 1 }] });
          expect(game.gift(worker.id, dish.id, now)).toBe(true);
          expect(notes(game, worker.id).at(-1)).toMatchObject({ tone: 'good', text: expect.stringMatching(new RegExp(`^${dish.name} is \\w+ favorite · Rapport \\+${SOCIETY.gift.favorite} · Charisma \\+3 XP`)) });
          expect(game.insult(worker.id, now + MINUTE)).toBe(true);
          expect(notes(game, worker.id).at(-1)).toMatchObject({ tone: 'bad', text: expect.stringMatching(new RegExp(`Rapport −${SOCIETY.insult.rapport + Math.round(SOCIETY.severity.insult / 3)} · Grudge \\+${SOCIETY.severity.insult}`)) });
        });

        const REPEATED = /^(Told you already|Weren't you listening|Again\?|You've got a short memory|Write it down|Ha, you forgot|Third time)|Same as last time\.$/;

        it('says who they are the first time, so asking their name after is asking twice; known only by hearsay, they just say it', () => {
          const { game, now, worker } = someone({});
          expect(game.talk(worker.id, now)).toBe(true);
          const greeting = spoken(game, worker.id).find((l) => l.who === 'them')?.text ?? '';
          const handle = handleOf(worker, world, PEOPLE);
          expect(greeting.includes(worker.given) || (handle !== null && greeting.includes(handle)), greeting).toBe(true);
          expect(game.describe(worker.id, now)?.named).toBe(true);
          game.askFact(worker.id, 'name', now + MINUTE);
          expect(spoken(game, worker.id).at(-1)?.text).toMatch(REPEATED);
          // Told of them by someone else: the player has the name, but they never said it, so they just do.
          const heard = someone({}, { society: { ...freshSociety(), known: { [worker.id]: { met: false, seen: false, told: true, facts: ['name'], log: [] } } } });
          expect(heard.game.describe(heard.worker.id, heard.now)?.named).toBe(true);
          heard.game.askFact(heard.worker.id, 'name', heard.now);
          const said = spoken(heard.game, heard.worker.id).at(-1)?.text ?? '';
          expect(said).not.toMatch(REPEATED);
          // Answering anything else first, they say who they are with it.
          const asked = someone({}, {}, { society: { ...SOCIETY, openness: { ...SOCIETY.openness, answerAt: -99, deflectAt: -100 } } });
          asked.game.askFact(asked.worker.id, 'job', asked.now);
          const reply = spoken(asked.game, asked.worker.id).at(-1)?.text ?? '';
          expect(reply.includes(asked.worker.given) || reply.includes(handleOf(asked.worker, world, PEOPLE) ?? '\u0000'), reply).toBe(true);
        });

        it('is glad of a question only when they answer it, and only the first time it is asked', () => {
          const glad = (answerAt: number) => ({ society: { ...SOCIETY, openness: { ...SOCIETY.openness, answerAt, deflectAt: answerAt - 1 }, reactions: { ...SOCIETY.reactions, asked: { ...SOCIETY.reactions.asked, likes: [{ when: {}, by: 2, why: 'Likes talking food' }] } } } });
          // They won't say: no gladness, on the note or in the rapport.
          const shy = someone({}, {}, glad(99));
          shy.game.askFact(shy.worker.id, 'likes', shy.now);
          expect(notes(shy.game, shy.worker.id).at(-1)?.text ?? '').not.toContain('Likes talking food');
          expect(shy.game.standingWith(shy.worker.id, shy.now)?.standing.rapport ?? 0).toBeLessThanOrEqual(0);
          // They say: glad of it, once.
          const keen = someone({}, {}, glad(-99));
          keen.game.askFact(keen.worker.id, 'likes', keen.now);
          expect(notes(keen.game, keen.worker.id).at(-1)?.text).toMatch(/^Likes talking food · Rapport \+/);
          const once = keen.game.standingWith(keen.worker.id, keen.now)?.standing.rapport ?? 0;
          keen.game.askFact(keen.worker.id, 'likes', keen.now + MINUTE);
          expect(spoken(keen.game, keen.worker.id).at(-1)?.text).toMatch(REPEATED);
          expect(keen.game.standingWith(keen.worker.id, keen.now + MINUTE)?.standing.rapport).toBeLessThanOrEqual(once);
        });

        it('leaves a compliment that landed at that, when there is nothing more they would bring up', () => {
          const shut = Object.fromEntries(Object.keys(SOCIETY.openness.cost).map((k) => [k, 50])) as typeof SOCIETY.openness.cost;
          const { game, now, worker } = someone({ warmth: 0.9 }, { charisma: { level: 3, xp: 0 } }, { society: { ...SOCIETY, openness: { ...SOCIETY.openness, cost: shut } } });
          game.talk(worker.id, now, 'compliment');
          const theirs = spoken(game, worker.id).filter((l) => l.who === 'them').map((l) => l.text);
          // The greeting (with who they are) and the thanks: no brush-off after.
          expect(theirs).toHaveLength(2);
          const brushOffs = LINES.brushOff.map((l) => (typeof l === 'string' ? l : l.text));
          expect(brushOffs.some((b) => theirs[1]?.includes(b.replace(/\{[^}]+\}/g, '')))).toBe(false);
        });

        it('goes by a street name once introduced, and tells the player what they want out of life', () => {
          const cost = { ...SOCIETY.openness.cost, district: 50, life: 50, here: 50, job: 50, likes: 50, hates: 50, kin: 50, rumor: 50, news: 50, views: 50 };
          const { game, now, worker } = atWork('b-noodle', 38, 20, {}, { society: { ...SOCIETY, openness: { ...SOCIETY.openness, cost: { ...cost, dream: -5 } } } });
          expect(game.talk(worker.id, now)).toBe(true);
          expect(game.describe(worker.id, now)?.facts.dream).toBe(LINES.dreams[dreamOf(worker, world, PEOPLE)]);
          const handle = handleOf(worker, world, PEOPLE);
          expect(game.describe(worker.id, now)?.name).toBe(handle ? `${worker.given} "${handle}" ${worker.name.slice(worker.given.length + 1)}` : worker.name);
        });
      });

      describe('memory and the people\'s ties', () => {
        const DAY = 24 * HOUR;
        /** Rules under which whoever has something to bring up always does. */
        const remembering: Partial<GameRules> = { society: { ...SOCIETY, memory: { ...SOCIETY.memory, recall: 1 } } };

        it('has someone the player insulted bring it up when they next talk, and keeps it through a save', () => {
          const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, {}, remembering);
          expect(game.insult(worker.id, now)).toBe(true);
          take();
          expect(game.talk(worker.id, now + MINUTE)).toBe(true);
          const said = outputs(take()).map((o) => o.text).join(' ');
          expect(said).toMatch(/what you said to me|run your mouth|say it again|what you did to me/i);
          expect(game.societySaved.memories[worker.id]?.[0]).toMatchObject({ kind: 'wronged', what: 'insult', times: 1, said: 1 });
          const again = new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), society: game.societySaved });
          expect(again.societySaved.memories).toEqual(game.societySaved.memories);
        });

        it('remembers a gift, the same again as twice over, and passes a good word to the people closest to them', () => {
          const probe = atWork('b-noodle', 38, 20);
          const dish = FOOD.dishes.find((d) => d.kind === 'food' && d.id !== probe.worker.likes.dish) as (typeof FOOD.dishes)[number];
          const { game, now, worker } = atWork('b-noodle', 38, 20, { items: [{ id: dish.id, kind: 'consumable', name: dish.name, count: 2 }] });
          expect(game.gift(worker.id, dish.id, now)).toBe(true);
          for (const t of tiesOf(game.population, worker.id).filter((u) => SOCIETY.closeness[u.kind] >= 0.5)) {
            expect(game.standingWith(t.to, now)?.standing.rapport, t.kind).toBeGreaterThan(0);
            expect(game.societySaved.memories[t.to]?.[0], t.kind).toMatchObject({ kind: 'goodWord', about: worker.id });
          }
          expect(game.gift(worker.id, dish.id, now + MINUTE)).toBe(true);
          expect(game.societySaved.memories[worker.id]?.find((m) => m.kind === 'gift')).toMatchObject({ what: dish.id, times: 2 });
        });

        it("won't be taken back by a boss they walked out on, while the boss remembers it", () => {
          const { game, now, boss } = withBoss('b-noodle', 38, 20);
          expect(game.askForWork(boss.id, now)).toBe(true);
          expect(game.quit(now + MINUTE)).toBe(true);
          expect(game.askForWork(boss.id, now + 2 * MINUTE)).toBe(true);
          expect(game.jobStatus(now + 2 * MINUTE)).toBeNull();
          expect(spoken(game, boss.id).at(-1)?.text).toMatch(/last time|quit on me|walked out|do not rehire/i);
          expect(game.standingWith(boss.id, now + 2 * MINUTE)?.standing.refused.hire).toBe(now + 2 * MINUTE);
          // Three weeks on, it's forgotten.
          expect(memoriesOf(game.societySaved, boss.id, SOCIETY.memory, 1, now + 22 * DAY).some((m) => m.kind === 'quit')).toBe(false);
        });

        it("keeps the dead out of everywhere, and has their people say so when asked about them", () => {
          const probe = atWork('b-noodle', 38, 20);
          const ties = tiesOf(probe.game.population, probe.worker.id);
          const tie = ties.find((t) => FAMILY.includes(t.kind)) ?? ties[0];
          if (!tie) throw new Error(`${probe.worker.name} knows nobody`);
          const today = Math.floor(probe.now / DAY);
          const life = { ...freshLife(), day: today, dead: { [tie.to]: today - 3 } };
          const society = { ...friendOf(probe.worker.id, probe.now), known: { [tie.to]: { met: false, seen: false, told: true, facts: ['name' as const], log: [] } } };
          const game = new Game(world, { ...RULES, startingEddies: 100 }, { ...progressInside('b-noodle', 38, 20), life, society });
          game.start(probe.now);
          expect(game.person(tie.to)?.diedOn).toBe(today - 3);
          expect(game.peopleHere(probe.now).some((p) => p.person.id === tie.to)).toBe(false);
          expect(game.talk(tie.to, probe.now)).toBe(false);
          expect(game.describe(tie.to, probe.now)?.facts.dead).toBeUndefined();
          expect(game.ask(probe.worker.id, tie.to, probe.now)).toBe(true);
          expect(spoken(game, probe.worker.id).at(-1)?.text).toMatch(/died|buried|gone|was my/i);
          expect(game.describe(tie.to, probe.now)?.facts.dead).toBe('Died a few days back');
        });

        it('hears who got married from one of the two, and knows them for a couple after', () => {
          const probe = atWork('b-noodle', 38, 20);
          const tied = new Set(tiesOf(probe.game.population, probe.worker.id).map((t) => t.to));
          const other = probe.game.population.people.find((p) => p.id !== probe.worker.id && !tied.has(p.id));
          if (!other) throw new Error('everyone knows everyone');
          const today = Math.floor(probe.now / DAY);
          const life = {
            ...freshLife(),
            day: today,
            nextId: 2,
            events: [{ id: 1, day: today - 2, kind: 'wedding' as const, who: [probe.worker.id, other.id] as [string, string], gang: null, district: 'test', took: 0, where: null }],
            made: [{ from: probe.worker.id, to: other.id, kind: 'spouse' as const }],
            since: { [tieKey(probe.worker.id, other.id)]: today - 20 },
          };
          // Nothing on their mind but the news.
          const cost = { ...SOCIETY.openness.cost, district: 50, life: 50, here: 50, job: 50, likes: 50, hates: 50, kin: 50, rumor: 50, dream: 50, views: 50 };
          const { game, now, worker, take, outputs } = atWork('b-noodle', 38, 20, { life, society: friendOf(probe.worker.id, probe.now) }, { society: { ...SOCIETY, openness: { ...SOCIETY.openness, cost } } });
          expect(tiesOf(game.population, worker.id).find((t) => t.to === other.id)?.kind).toBe('spouse');
          take();
          expect(game.talk(worker.id, now)).toBe(true);
          expect(outputs(take()).map((o) => o.text).join(' ')).toContain(other.given);
          expect(game.standingWith(worker.id, now)?.web.find((l) => l.person.id === other.id)?.kind).toBe('spouse');
          expect(game.describe(other.id)?.named).toBe(true);
        });
      });
    });

    describe('weapons', () => {
      // The test chrome shop racks guns for these: a store of the gun shop's kind, at the everyday tier.
      const armory: GearContent = {
        ...GEAR,
        racks: { 'cyberware-outlet': ['holster', 'gun-case', 'messenger-bag'] },
        quality: { 'cyberware-outlet': 'everyday' },
        arms: { ...ARMS, stores: { 'cyberware-outlet': { guns: 8, ammo: true } } },
      };
      const rich = (rules: Partial<GameRules> = {}, items: Progress['items'] = []) => {
        const game = new Game(world, { ...RULES, startingEddies: 100, gear: armory, ...rules }, { ...progressInside('b-shop', 32, 20, items), money: { bills: 0, coins: 0, account: 20_000 } });
        game.start(T0);
        const { take, outputs } = record(game);
        return { game, take, outputs };
      };
      const lexington: Item = { id: 'lexington-1', kind: 'weapon', weapon: 'lexington', name: 'M-10AF Lexington', count: 1, in: 'jacket', loaded: 0 };

      it('racks a store\'s guns first, then a box of each kind of round, then what carries them', () => {
        const { game } = rich();
        const menu = game.menu();
        expect(menu?.kind).toBe('gear');
        const kinds = menu?.items.map((i) => i.kind) ?? [];
        expect(kinds.filter((k) => k === 'weapon')).toHaveLength(8);
        expect(kinds.filter((k) => k === 'ammo')).toHaveLength(4);
        expect(kinds.indexOf('ammo')).toBeGreaterThan(kinds.lastIndexOf('weapon'));
        expect(kinds.indexOf('gear')).toBeGreaterThan(kinds.lastIndexOf('ammo'));
        // Everyday stores stock everyday and cheap guns, never the tower's smart guns; the same store always has the same rack.
        for (const item of menu?.items.filter((i) => i.kind === 'weapon') ?? []) expect(['everyday', 'poverty']).toContain(ARMS.weapons[item.id]?.quality);
        expect(rich().game.menu()).toEqual(menu);
        const box = menu?.items.find((i) => i.id === 'handgun-ammo');
        expect(box?.detail).toMatch(/Box of 50/);
      });

      it('sells a gun empty, into a pocket, and a box of rounds by the box, which loads it and comes back out', () => {
        const { game, take, outputs } = rich({ gear: { ...armory, arms: { ...ARMS, weapons: { lexington: ARMS.weapons.lexington! }, stores: { 'cyberware-outlet': { guns: 1, ammo: true } } } } });
        expect(game.menu()?.items[0]?.id).toBe('lexington');
        expect(game.buy('lexington')).toBe(true);
        const gun = game.inventory.find((i) => i.kind === 'weapon');
        expect(gun).toMatchObject({ weapon: 'lexington', loaded: 0, count: 1 });
        expect(outputs(take()).at(-1)?.text).toMatch(/Empty: it takes Handgun Ammo/);
        // Nothing to load it with yet.
        expect(game.canLoad(gun!.id)).toEqual({ load: false, unload: false });
        expect(game.load(gun!.id)).toBe(false);
        expect(game.buy('handgun-ammo')).toBe(true);
        expect(game.inventory.find((i) => i.kind === 'ammo')).toMatchObject({ id: 'handgun-ammo', count: 50 });
        expect(game.canLoad(gun!.id)).toEqual({ load: true, unload: false });
        const before = game.carry().grams;
        expect(game.load(gun!.id)).toBe(true);
        expect(game.inventory.find((i) => i.id === gun!.id)?.loaded).toBe(20);
        expect(game.inventory.find((i) => i.kind === 'ammo')?.count).toBe(30);
        // The rounds weigh the same in the gun as loose.
        expect(game.carry().grams).toBe(before);
        expect(game.armed()).toMatchObject({ short: 'Lexington', gun: true, loaded: 20, magazine: 20 });
        expect(game.canLoad(gun!.id)).toEqual({ load: false, unload: true });
        expect(game.load(gun!.id)).toBe(false);
        expect(game.unload(gun!.id)).toBe(true);
        expect(game.inventory.find((i) => i.id === gun!.id)?.loaded).toBe(0);
        expect(game.inventory.filter((i) => i.kind === 'ammo').reduce((n, i) => n + i.count, 0)).toBe(50);
        // Loose rounds drop all at once.
        take();
        expect(game.drop('handgun-ammo')).toBe(true);
        expect(game.inventory.some((i) => i.kind === 'ammo')).toBe(false);
        expect(outputs(take())[0]?.text).toMatch(/50 rounds/);
      });

      it('wants a bag for a long gun, and puts it in one', () => {
        const ajax = { ...armory, arms: { ...ARMS, weapons: { ajax: ARMS.weapons.ajax! }, stores: { 'cyberware-outlet': { guns: 1 } } } };
        const { game } = rich({ gear: ajax });
        expect(game.canBuy('ajax')).toMatch(/too long for a pocket/);
        expect(game.buy('ajax')).toBe(false);
        expect(game.buy('messenger-bag')).toBe(true);
        expect(game.canBuy('ajax')).toBeNull();
        expect(game.buy('ajax')).toBe(true);
        const bag = game.gearSaved.find((p) => p.kind === 'messenger-bag');
        expect(game.inventory.find((i) => i.weapon === 'ajax')?.in).toBe(bag?.id);
      });

      it('keeps a holster for weapons, and a sealed gun loaded and beyond reloading', () => {
        const cheap = { ...armory, arms: { ...ARMS, weapons: { 'slaught-o-matic': ARMS.weapons['slaught-o-matic']! }, stores: { 'cyberware-outlet': { guns: 1, ammo: true } } } };
        const { game } = rich({ gear: cheap });
        expect(game.buy('holster')).toBe(true);
        const holster = game.gearSaved.find((p) => p.kind === 'holster');
        // A box of rounds is no weapon: it goes in a pocket, never the holster.
        expect(game.buy('handgun-ammo')).toBe(true);
        expect(game.inventory.find((i) => i.kind === 'ammo')?.in).not.toBe(holster?.id);
        expect(game.buy('slaught-o-matic')).toBe(true);
        const gun = game.inventory.find((i) => i.weapon === 'slaught-o-matic');
        expect(gun?.loaded).toBe(36);
        expect(game.canLoad(gun!.id)).toEqual({ load: false, unload: false });
        expect(game.unload(gun!.id)).toBe(false);
        expect(game.load(gun!.id)).toBe(false);
      });

      it('robs with the gun on the player, and the line says so', () => {
        for (let day = 0; day < 14; day++) {
          const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
          const game = new Game(world, { ...RULES, startingEddies: 100 }, progressInside('b-noodle', 38, 20, [{ ...lexington, loaded: 20 }]));
          game.start(now);
          const worker = game.peopleHere(now).find((p) => p.person.job.building === 'b-noodle');
          if (!worker) continue;
          expect(game.armed()?.short).toBe('Lexington');
          expect(game.rob(worker.person.id, now)).toBe(true);
          const said = game.conversation(worker.person.id).filter((e) => e.who === 'you').map((e) => e.text);
          expect(said.join(' ')).toContain('Lexington');
          return;
        }
        throw new Error('nobody at the noodle bar');
      });
    });

    describe('chrome', () => {
      // The test city's outlet as a ripperdoc's clinic, and the roof as a clinic of its own.
      const clinic: World = {
        ...world,
        buildings: world.buildings.map((b) => (b.id === 'b-shop' ? { ...b, business: 'ripperdoc', kindLabel: 'Ripperdoc clinic' } : b)),
        locations: { ...world.locations, roof: { ...world.locations.roof!, kind: 'ripperdoc', kindLabel: 'Ripperdoc' } },
      };
      /** Chrome stores with only these implants, all of them on every rack. */
      const only = (ids: string[], capacity = ALL_GEAR.chrome.capacity): GearContent => ({
        ...GEAR,
        chrome: { ...ALL_GEAR.chrome, capacity, implants: Object.fromEntries(ids.map((id) => [id, ALL_GEAR.chrome.implants[id]!])), stores: { ripperdoc: { count: ids.length, fits: true }, 'cyberware-outlet': { count: ids.length } } },
      });
      const rich = (w: World, gear: GearContent, extra: Partial<Progress> = {}) => {
        const game = new Game(w, { ...RULES, gear }, { ...progressInside('b-shop', 32, 20), money: { bills: 0, coins: 0, account: 20_000 }, ...extra });
        game.start(T0);
        const { take, outputs } = record(game);
        take();
        return { game, take, outputs };
      };
      const said = (recorded: ReturnType<ReturnType<typeof record>['take']>) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload.text] : [])).join(' ');

      it("sells a ripperdoc's chrome and fits it there and then, counting the capacity it takes", () => {
        const { game, take } = rich(clinic, only(['subdermal-armor', 'mantis-blades']));
        const menu = game.menu();
        // Listed by the part of the body: the arms before the skin.
        expect(menu?.items.map((i) => i.id)).toEqual(['mantis-blades', 'subdermal-armor']);
        expect(menu?.items[0]).toMatchObject({ kind: 'cyberware', price: 1800, detail: 'Arms · Arasaka · 8 capacity' });
        expect(game.clinic()?.name).toBe('Test Chrome');
        expect(game.buy('mantis-blades', T0)).toBe(true);
        expect(game.chrome().fitted.map((f) => f.id)).toEqual(['mantis-blades']);
        expect(game.chrome().used).toBe(8);
        expect(game.inventory.some((i) => i.kind === 'cyberware')).toBe(false);
        // A rack of gear takes a transfer.
        expect(game.wallet.account).toBe(20_000 - 1800);
        expect(said(take())).toContain('fits it there and then');
        // In once is all.
        expect(game.canBuy('mantis-blades', T0)).toContain('in you already');
        expect(game.buy('mantis-blades', T0)).toBe(false);
        expect(game.chrome().fitted).toHaveLength(1);
      });

      it('takes out what a full part had, into a pocket, and refuses what the capacity left won\'t take', () => {
        // A pair of arms wants a bag: with one, the old pair goes in it.
        const bag = [...GEAR.start, { id: 'backpack-1', kind: 'backpack', in: null }];
        const { game, take } = rich(clinic, only(['mantis-blades', 'subdermal-armor', 'gorilla-arms']), { chrome: [{ id: 'gorilla-arms', since: 1 }], gear: bag });
        expect(game.buy('mantis-blades', T0)).toBe(true);
        expect(game.chrome().fitted.map((f) => f.id)).toEqual(['mantis-blades']);
        expect(game.inventory.find((i) => i.kind === 'cyberware')).toMatchObject({ id: 'gorilla-arms', count: 1, in: 'backpack-1' });
        expect(said(take())).toContain('The Gorilla Arms comes out, into your backpack');
        // Without one, the doc keeps them.
        const bare = rich(clinic, only(['mantis-blades', 'gorilla-arms']), { chrome: [{ id: 'gorilla-arms', since: 1 }] });
        expect(bare.game.buy('mantis-blades', T0)).toBe(true);
        expect(bare.game.inventory.some((i) => i.kind === 'cyberware')).toBe(false);
        expect(said(bare.take())).toContain('the doc keeps it');
        // Ten capacity, eight of it taken: the arms can swap, but nothing else needing more than two goes in.
        const tight = rich(clinic, only(['mantis-blades', 'subdermal-armor', 'gorilla-arms'], 10), { chrome: [{ id: 'mantis-blades', since: 1 }] });
        expect(tight.game.canBuy('subdermal-armor', T0)).toContain('Not enough capacity for the Subdermal Armor: it takes 5');
        expect(tight.game.canBuy('gorilla-arms', T0)).toBeNull();
      });

      it('sells chrome to take away at an outlet, which a ripperdoc then fits for a fee, and takes out again', () => {
        const outlet = rich(world, only(['smart-link']));
        expect(outlet.game.clinic()).toBeNull();
        expect(outlet.game.buy('smart-link', T0)).toBe(true);
        const carried = outlet.game.inventory.find((i) => i.kind === 'cyberware');
        expect(carried).toMatchObject({ id: 'smart-link', name: 'Smart Link', in: expect.any(String) });
        expect(outlet.game.chrome().fitted).toEqual([]);
        expect(outlet.game.canInstall('smart-link', T0)).toContain('Only a ripperdoc');
        // At the roof's clinic, an everyday one: the fee is the everyday fee.
        const doc = new Game(clinic, { ...RULES, gear: only(['smart-link']) }, { ...progressInside('b-shop', 32, 20, outlet.game.inventory), where: at('roof'), inside: null, money: { bills: 0, coins: 0, account: 1000 } });
        doc.start(T0);
        expect(doc.clinic()).toEqual({ name: 'Roof', fee: 150 });
        expect(doc.menu()?.kind).toBe('gear');
        expect(doc.install('smart-link', T0)).toBe(true);
        expect(doc.chrome().fitted.map((f) => f.id)).toEqual(['smart-link']);
        expect(doc.inventory.some((i) => i.kind === 'cyberware')).toBe(false);
        expect(doc.wallet.account).toBe(850);
        expect(doc.uninstall('smart-link', T0)).toBe(true);
        expect(doc.chrome().fitted).toEqual([]);
        expect(doc.inventory.find((i) => i.kind === 'cyberware')?.id).toBe('smart-link');
        expect(doc.wallet.account).toBe(700);
        // Out of the clinic, nobody takes chrome out.
        const away = new Game(clinic, { ...RULES, gear: only(['smart-link']) }, { ...progressInside('b-shop', 32, 20), where: at('alley'), inside: null, chrome: [{ id: 'smart-link', since: 1 }] });
        expect(away.canUninstall('smart-link', T0)).toContain('Only a ripperdoc');
      });

      it('fits nothing for a masked face, and keeps the chrome through a save', () => {
        const masked = rich(clinic, only(['smart-link']), { gear: [...GEAR.start, { id: 'old-plastic-gas-mask-1', kind: 'old-plastic-gas-mask', in: null }] });
        expect(masked.game.canBuy('smart-link', T0)).toBe(masked.game.barred(T0));
        expect(masked.game.buy('smart-link', T0)).toBe(false);
        const { game } = rich(clinic, only(['smart-link', 'subdermal-armor']));
        game.buy('smart-link', T0);
        game.buy('subdermal-armor', T0 + MINUTE);
        expect(game.chromeSaved).toEqual([{ id: 'smart-link', since: T0 }, { id: 'subdermal-armor', since: T0 + MINUTE }]);
        const again = new Game(clinic, { ...RULES, gear: only(['smart-link', 'subdermal-armor']) }, { ...progressInside('b-shop', 32, 20), chrome: [...game.chromeSaved, { id: 'smart-link', since: 5 }, { id: 'no-such-implant', since: 5 }] });
        // Twice is once, and what the game doesn't have is gone.
        expect(again.chromeSaved).toEqual(game.chromeSaved);
        expect(again.chrome()).toMatchObject({ used: 9, capacity: ALL_GEAR.chrome.capacity });
      });
    });

    describe('fighting', () => {
      const lexington: Item = { id: 'lexington-1', kind: 'weapon', weapon: 'lexington', name: 'M-10AF Lexington', count: 1, in: 'jacket', loaded: 20 };
      /** Rules where every way of fighting always lands this hard, and kills as often as `lethal` says. */
      const brutal = (damage: number, lethal: number, extra: Partial<typeof COMBAT> = {}) => ({
        ...COMBAT,
        classes: Object.fromEntries(Object.entries(COMBAT.classes).map(([k, c]) => [k, { ...c, hit: { reach: 1, close: 1, far: 1 }, damage: [damage, damage] as [number, number], lethal }])) as typeof COMBAT.classes,
        ...extra,
      });
      /** Someone at work at the noodle bar, on a weekday morning, and the game there. */
      const atTheBar = (progress: Partial<Progress> = {}, combat = COMBAT, city = world) => {
        for (let day = 0; day < 14; day++) {
          const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
          if (new Date(now).getUTCDay() % 6 === 0) continue;
          const game = new Game(city, { ...RULES, combat }, { ...progressInside('b-noodle', 38, 20, [lexington]), money: { bills: 100, coins: 0, account: 0 }, ...progress });
          game.start(now);
          const worker = game.peopleHere(now).find((p) => p.person.job.building === 'b-noodle');
          if (worker) return { game, now, worker: worker.person, ...record(game) };
        }
        throw new Error('nobody at the noodle bar');
      };
      const fightOut = (game: Game, now: number, move: 'attack' | 'run' | 'talk' | 'cover' = 'attack') => {
        let t = now;
        for (let n = 0; n < 30 && game.fighting; n++) game.fightMove(move, (t += 1000));
        return t;
      };

      it('is an assault the moment it starts, and a killing writes the dead down for good, with the heat', () => {
        const { game, now, worker } = atTheBar({ lethal: true }, brutal(500, 1));
        expect(game.attack(worker.id, now)).toBe(true);
        expect(game.fighting).toBe(true);
        expect(game.societySaved.incidents.map((i) => i.kind)).toEqual(['assault']);
        const view = game.fightView();
        expect(view).toMatchObject({ beat: 0, range: 'close', you: { arm: 'Lexington' } });
        expect(view?.moves.map((m) => m.id)).toEqual(['attack', 'advance', 'cover', 'talk', 'run']);
        // In a fight there's no leaving.
        expect(game.leave()).toBe(false);
        const t = fightOut(game, now);
        expect(game.fightView()?.over).toBe('killed');
        expect(worker.diedOn).toBe(Math.floor(now / 86_400_000));
        expect(game.lifeSaved.dead[worker.id]).toBe(worker.diedOn);
        expect(game.societySaved.incidents.map((i) => i.kind)).toEqual(['assault', 'murder']);
        expect(game.heat(t).stars).toBeGreaterThanOrEqual(COMBAT.heat.murder);
        expect(game.heat(t + 30 * 24 * HOUR).stars).toBe(0);
        // Two rounds a shot from the Lexington.
        expect(game.inventory.find((i) => i.id === 'lexington-1')?.loaded).toBe(18);
        game.leaveFight();
        expect(game.fightView()).toBeNull();
        expect(game.leave()).toBe(true);
        // A save brings the dead back dead.
        const again = new Game(world, { ...RULES, combat: brutal(500, 1) }, { ...progressInside('b-noodle', 38, 20), life: game.lifeSaved, heat: game.heatSaved, health: game.healthSaved });
        expect(again.population.people.find((p) => p.id === worker.id)?.diedOn).toBe(worker.diedOn);
        expect(again.heat(t).stars).toBe(game.heat(t).stars);
      });

      it('lays someone up instead when the blow is not a killing one, and they are gone from here', () => {
        const { game, now, worker } = atTheBar({}, brutal(500, 0));
        game.attack(worker.id, now);
        const t = fightOut(game, now);
        expect(game.fightView()?.over).toBe('won');
        expect(worker.hurtUntil).toBeGreaterThan(Math.floor(now / 86_400_000));
        expect(game.lifeSaved.hurt[worker.id]).toBe(worker.hurtUntil);
        expect(game.peopleHere(t).some((p) => p.person.id === worker.id)).toBe(false);
      });

      it('puts the player down and robs them when it goes the other way; a Second Heart gets them up once', () => {
        const { game, now, worker } = atTheBar({ items: [], health: { value: 5, at: Date.UTC(2077, 9, 12, 11, 0) } }, brutal(10, 0));
        const had = worker.eddies;
        game.attack(worker.id, now);
        const t = fightOut(game, now, 'cover');
        expect(game.fightView()?.over).toBe('lost');
        expect(game.wallet.eddies).toBeLessThan(100);
        expect(worker.eddies).toBe(had + (100 - game.wallet.eddies));
        expect(game.health(t).current).toBe(1);
        const hearty = atTheBar({ items: [], chrome: [{ id: 'second-heart', since: 1 }], health: { value: 5, at: Date.UTC(2077, 9, 12, 11, 0) } }, brutal(10, 0));
        hearty.game.attack(hearty.worker.id, hearty.now);
        hearty.game.fightMove('cover', hearty.now + 1000);
        expect(hearty.game.fightView()?.log.join(' ')).toContain('Second Heart');
        expect(hearty.game.fightView()?.you.hp).toBe(hearty.game.fightView()?.you.max);
      });

      it('gets away out the door on a run, and ends in words when it is talked down', () => {
        const run = atTheBar({}, { ...COMBAT, escape: { reach: 1, close: 1, far: 1 }, escapeAdvanced: 1 });
        run.game.attack(run.worker.id, run.now);
        fightOut(run.game, run.now, 'run');
        expect(run.game.fightView()?.over).toBe('fled');
        expect(run.game.interior).toBeNull();
        const talk = atTheBar({}, { ...COMBAT, talk: { ...COMBAT.talk, base: 1 } });
        talk.game.attack(talk.worker.id, talk.now);
        fightOut(talk.game, talk.now, 'talk');
        expect(talk.game.fightView()?.over).toBe('talked');
        expect(talk.worker.diedOn).toBeUndefined();
      });

      it('freezes the player when the clock runs out, and gives more time with reflexes fitted', () => {
        const { game, now, worker } = atTheBar();
        game.attack(worker.id, now);
        const view = game.fightView()!;
        expect(view.window).toBe(COMBAT.window);
        game.tick(view.deadline - 1);
        expect(game.fightView()?.beat).toBe(0);
        game.tick(view.deadline + 1);
        expect(game.fightView()?.beat).toBe(1);
        expect(game.fightView()?.log.at(-1)).toMatch(/hesitate|Too slow/);
        const quick = atTheBar({ chrome: [{ id: 'kerenzikov', since: 1 }, { id: 'dynalar-sandevistan', since: 1 }] });
        quick.game.attack(quick.worker.id, quick.now);
        expect(quick.game.fightView()?.window).toBe(COMBAT.window + 1500 + 7000);
      });

      it('fights with chrome in the arms up close, and quickhacks with a deck and the RAM for them', () => {
        const { game, now, worker } = atTheBar({ items: [{ id: 'short-circuit', kind: 'quickhack', name: 'Short Circuit', count: 1, in: 'jacket' }], chrome: [{ id: 'mantis-blades', since: 1 }, { id: 'paraline', since: 2 }, { id: 'ram-upgrade', since: 3 }] });
        game.attack(worker.id, now);
        const view = game.fightView()!;
        // Across the room, the blades can't reach: fists can't either, so the blades are what to close in with.
        expect(view.you.arm).toBe('Mantis Blades');
        expect(view.moves.find((m) => m.id === 'attack')?.enabled).toBe(false);
        expect(view).toMatchObject({ ram: 6, ramMax: 6, hacks: [{ id: 'short-circuit', ram: 3, enabled: true }] });
        expect(game.fightMove('hack', now + 1000, 'short-circuit')).toBe(true);
        expect(game.fightView()?.log.join(' ')).toContain('Short Circuit');
        expect(game.fightView()?.ram).toBe(6 - 3 + COMBAT.ramPerBeat);
        // No deck, no hack.
        const plain = atTheBar({ items: [{ id: 'short-circuit', kind: 'quickhack', name: 'Short Circuit', count: 1, in: 'jacket' }] });
        plain.game.attack(plain.worker.id, plain.now);
        expect(plain.game.fightView()?.moves.some((m) => m.id === 'hack')).toBe(false);
        expect(plain.game.fightMove('hack', plain.now + 1000, 'short-circuit')).toBe(false);
      });

      it('sells quickhacks at a quickhack dealer, one copy of each', () => {
        const dealer: World = { ...world, buildings: world.buildings.map((b) => (b.id === 'b-deck' ? { ...b, business: 'quickhack-dealer', kindLabel: 'Quickhack dealer' } : b)) };
        const game = new Game(dealer, { ...RULES, startingEddies: 100 }, { ...progressInside('b-deck', 26, 20), money: { bills: 0, coins: 0, account: 5000 } });
        game.start(T0);
        const menu = game.menu();
        expect(menu?.items.every((i) => i.kind === 'quickhack')).toBe(true);
        expect(menu?.items.find((i) => i.id === 'short-circuit')).toMatchObject({ price: 300, detail: 'Combat · 3 RAM' });
        expect(game.buy('short-circuit', T0)).toBe(true);
        expect(game.inventory.find((i) => i.kind === 'quickhack')?.id).toBe('short-circuit');
        expect(game.canBuy('short-circuit', T0)).toContain('already');
      });

      it('heals on the clock, and carries health and heat through a save', () => {
        const { game, now, worker } = atTheBar({}, brutal(30, 0));
        game.attack(worker.id, now);
        const t = fightOut(game, now, 'cover');
        const hurt = game.health(t);
        expect(hurt.current).toBeLessThan(hurt.max);
        expect(game.health(t + 10 * HOUR).current).toBe(hurt.max);
        expect(hurt.fullAt).toBeGreaterThan(t);
        expect(game.healthSaved.value).toBeLessThan(hurt.max);
      });

      it('aims to wound unless told to kill: a killing blow lays them up in the hospital nearest home instead', () => {
        const { game, now, worker } = atTheBar({}, brutal(500, 1), clinicWorld);
        expect(game.lethal).toBe(false);
        game.attack(worker.id, now);
        expect(game.fightView()?.lethal).toBe(false);
        fightOut(game, now);
        expect(game.fightView()).toMatchObject({ over: 'won', result: expect.stringContaining('laid up in Test General') });
        expect(worker.diedOn).toBeUndefined();
        expect(game.societySaved.incidents.map((i) => i.kind)).toEqual(['assault']);
        // The choice is kept, and said.
        game.leaveFight();
        game.setLethal(true);
        expect(game.lethal).toBe(true);
        expect(new Game(world, RULES, { ...progressInside('b-noodle', 38, 20), lethal: game.lethal }).lethal).toBe(true);
      });

      it('heals in a fight with the strongest med carried, and it is used up', () => {
        const meds: Item[] = [
          { id: 'bounce-back', kind: 'consumable', name: 'Bounce Back', count: 1, in: 'jacket' },
          { id: 'maxdoc', kind: 'consumable', name: 'MaxDoc', count: 1, in: 'jacket' },
        ];
        const { game, now, worker } = atTheBar({ items: meds, health: { value: 30, at: LATER } }, brutal(1, 0));
        game.attack(worker.id, now);
        expect(game.fightView()?.moves.find((m) => m.id === 'heal')).toMatchObject({ label: 'Heal', sub: 'MaxDoc', enabled: true });
        expect(game.fightMove('heal', now + 1000)).toBe(true);
        expect(game.inventory.map((i) => i.id)).toEqual(['bounce-back']);
        if (game.fighting) expect(game.fightView()?.moves.find((m) => m.id === 'heal')?.sub).toBe('Bounce Back');
        expect(game.fightView()?.log.join(' ')).toContain('MaxDoc');
        expect(game.fightView()?.you.hp).toBeGreaterThanOrEqual(30 + MEDICAL.meds.maxdoc!.heal - 1);
        // Nothing to heal with, no Heal.
        const none = atTheBar({ items: [], health: { value: 30, at: LATER } });
        none.game.attack(none.worker.id, none.now);
        expect(none.game.fightView()?.moves.some((m) => m.id === 'heal')).toBe(false);
        expect(none.game.fightMove('heal', none.now + 1000)).toBe(false);
      });

      it('has Trauma Team pick up a player on a plan who goes down: not robbed, dropped at the nearest hospital, and billed', () => {
        const covered = { plan: 'silver', until: LATER };
        const { game, now, worker } = atTheBar({ items: [], health: { value: 5, at: LATER }, coverage: covered, money: { bills: 100, coins: 0, account: 1000 } }, brutal(10, 0), clinicWorld);
        const had = worker.eddies;
        game.attack(worker.id, now);
        const t = fightOut(game, now, 'cover');
        expect(game.fightView()?.over).toBe('lost');
        expect(game.fightView()?.result).toContain('Trauma Team picked you up and dropped you at Test General');
        expect(game.fightView()?.log.join(' ')).toContain('Silver Package');
        expect(game.wallet.eddies).toBe(100);
        expect(worker.eddies).toBe(had);
        expect(game.interior?.id).toBe('b-hospital');
        // The Silver Package puts back half, and the bill is the hospital's whole fee for it.
        const back = COMBAT.health.base * MEDICAL.plans['silver']!.restore;
        expect(game.health(t).current).toBe(back);
        expect(game.wallet.account).toBe(1000 - priceFor(back * MEDICAL.perPoint, 'everyday', FOOD));
        expect(game.covered(t)?.id).toBe('silver');
        // Short of the bill, they take what's in the account and drop the player from the plan.
        const broke = atTheBar({ items: [], health: { value: 5, at: LATER }, coverage: covered, money: { bills: 0, coins: 0, account: 10 } }, brutal(10, 0), clinicWorld);
        broke.game.attack(broke.worker.id, broke.now);
        const u = fightOut(broke.game, broke.now, 'cover');
        expect(broke.game.wallet.account).toBe(0);
        expect(broke.game.covered(u)).toBeNull();
        expect(broke.game.fightView()?.result).toContain('drop you from the plan');
        // A hospital that's a place of its own (the Night City Medical Center), and they're left there, outside.
        const medCenter: World = { ...world, locations: { ...world.locations, roof: { ...world.locations.roof!, kind: 'hospital', name: 'Test Med Center' } } };
        const placed = atTheBar({ items: [], health: { value: 5, at: LATER }, coverage: covered }, brutal(10, 0), medCenter);
        placed.game.attack(placed.worker.id, placed.now);
        fightOut(placed.game, placed.now, 'cover');
        expect(placed.game.fightView()?.result).toContain('dropped you at Test Med Center');
        expect(placed.game.location?.id).toBe('roof');
        expect(placed.game.interior).toBeNull();
      });
    });

    describe('opening hours', () => {
      const HOURLY = { hours: HOURS };

      it('shuts a counter while nobody who works it is in, says when someone will be, and opens with them', () => {
        const { game, now } = atWork('b-noodle', 38, 20, {}, HOURLY);
        expect(game.menu(now)).not.toBeNull();
        expect(game.closed(now)).toBeNull();
        // Three in the morning: the day's hands are home asleep.
        const late = now + 16 * HOUR;
        expect(game.menu(late)).toBeNull();
        const shut = game.closed(late);
        expect(shut?.what).toBe('menu');
        expect(shut?.opensAt).toBeGreaterThan(late);
        expect(game.menu(shut?.opensAt ?? 0)).not.toBeNull();
        expect(game.canBuy(game.menu(now)?.items[0]?.id ?? '', late)).toMatch(/^Closed\. Nobody's behind the counter till \d\d:\d\d\./);
        expect(game.buy(game.menu(now)?.items[0]?.id ?? '', late)).toBe(false);
        // Without opening hours, every counter is always open.
        expect(atWork('b-noodle', 38, 20).game.menu(late)).not.toBeNull();
      });

      it('shuts a bank the same way, and keeps a hospital and anywhere whose sign says 24/7 open all hours', () => {
        const night = T0 + 7 * HOUR;
        const bank = new Game(world, { ...RULES, ...HOURLY }, progressInside('b-bank', 44, 20));
        bank.start(T0);
        expect(bank.bank(night)).toBeNull();
        expect(bank.closed(night)?.what).toBe('bank');
        const allNight: World = { ...world, buildings: world.buildings.map((b) => (b.id === 'b-noodle' ? { ...b, name: '24/7 Noodles' } : b)) };
        const noodles = new Game(allNight, { ...RULES, ...HOURLY }, progressInside('b-noodle', 38, 20));
        noodles.start(T0);
        expect(noodles.menu(night)).not.toBeNull();
        expect(noodles.closed(night)).toBeNull();
        const hospital = new Game(clinicWorld, { ...RULES, ...HOURLY }, progressInside('b-hospital', 54, 20));
        hospital.start(T0);
        expect(hospital.menu(night)).not.toBeNull();
      });
    });

    describe('medicine', () => {
      const atHospital = (progress: Partial<Progress> = {}) => {
        const game = new Game(clinicWorld, { ...RULES, startingEddies: 100 }, { ...progressInside('b-hospital', 54, 20), money: { bills: 100, coins: 0, account: 5000 }, ...progress });
        game.start(T0);
        return game;
      };

      it('treats what is missing at a hospital, priced by what is missing, and has nothing to treat in someone whole', () => {
        const game = atHospital({ health: { value: 40, at: T0 } });
        const menu = game.menu(T0);
        const missing = COMBAT.health.base - 40;
        expect(menu?.items[0]).toMatchObject({ id: 'treatment', kind: 'treatment', price: priceFor(missing * MEDICAL.perPoint, 'everyday', FOOD), detail: `${missing} health to full` });
        expect(menu?.items.filter((i) => i.kind === 'med').map((i) => i.id)).toEqual(Object.keys(MEDICAL.meds));
        expect(menu?.items.filter((i) => i.kind === 'plan').map((i) => i.id)).toEqual(Object.keys(MEDICAL.plans));
        expect(game.medical()).toMatchObject({ key: 'hospital', stock: { meds: true, treats: true, plans: true } });
        // A service: nothing to carry, so it wants no room in a pocket.
        expect(game.buy('treatment', T0)).toBe(true);
        expect(game.health(T0).current).toBe(COMBAT.health.base);
        expect(game.wallet.account).toBe(5000 - (menu?.items[0]?.price ?? 0));
        expect(game.menu(T0)?.items.some((i) => i.kind === 'treatment')).toBe(false);
        expect(game.canBuy('treatment', T0)).toBe('Not for sale here.');
      });

      it('sells meds that heal from the inventory, all at once out of a fight, and keep while the player is whole', () => {
        const game = atHospital({ health: { value: 30, at: T0 } });
        expect(game.buy('maxdoc', T0)).toBe(true);
        expect(game.buy('bounce-back', T0)).toBe(true);
        expect(game.inventory.find((i) => i.id === 'maxdoc')).toMatchObject({ kind: 'consumable', name: 'MaxDoc', count: 1 });
        expect(game.consume('maxdoc', T0)).toBe(true);
        expect(game.health(T0).current).toBe(70);
        expect(game.consume('bounce-back', T0)).toBe(true);
        expect(game.health(T0).current).toBe(COMBAT.health.base);
        game.buy('maxdoc', T0);
        expect(game.consume('maxdoc', T0)).toBe(false);
        expect(game.inventory.find((i) => i.id === 'maxdoc')?.count).toBe(1);
        // A pharmacy has the meds and nothing else; a street clinic patches up as well.
        const shops = (business: string): World => ({ ...clinicWorld, buildings: clinicWorld.buildings.map((b) => (b.id === 'b-hospital' ? { ...b, business, kindLabel: business } : b)) });
        const pharmacy = new Game(shops('pharmacy'), RULES, { ...progressInside('b-hospital', 54, 20), health: { value: 40, at: T0 } });
        expect(pharmacy.menu(T0)?.items.map((i) => i.kind)).toEqual(Object.keys(MEDICAL.meds).map(() => 'med'));
        const clinic = new Game(shops('street-clinic'), RULES, { ...progressInside('b-hospital', 54, 20), health: { value: 40, at: T0 } });
        expect(clinic.menu(T0)?.items.map((i) => i.kind)).toEqual(['treatment', ...Object.keys(MEDICAL.meds).map(() => 'med')]);
      });

      it('signs the player up with Trauma Team, runs the same plan on from when it ends, and keeps it in a save', () => {
        const game = atHospital();
        expect(game.covered(T0)).toBeNull();
        expect(game.buy('silver', T0)).toBe(true);
        expect(game.covered(T0)).toMatchObject({ id: 'silver', until: T0 + 30 * DAY });
        expect(game.buy('silver', T0)).toBe(true);
        expect(game.covered(T0)?.until).toBe(T0 + 60 * DAY);
        // Another plan starts now, in its place.
        expect(game.buy('gold', T0)).toBe(true);
        expect(game.covered(T0)).toMatchObject({ id: 'gold', until: T0 + 30 * DAY });
        expect(game.covered(T0 + 31 * DAY)).toBeNull();
        expect(game.wallet.account).toBe(5000 - 500 - 500 - 1500);
        const again = new Game(clinicWorld, RULES, { ...progressInside('b-hospital', 54, 20), coverage: game.coverageSaved });
        expect(again.covered(T0)?.id).toBe('gold');
        // Platinum takes 90% off the meds at the counter.
        const price = (g: Game) => g.menu(T0)?.items.find((i) => i.id === 'maxdoc')?.price ?? 0;
        const platinum = atHospital({ coverage: { plan: 'platinum', until: LATER } });
        expect(price(platinum)).toBe(Math.round(price(again) * 0.1));
      });
    });

    describe('romance', () => {
      // Hearts drawn to everyone, or to no one, so a test knows where it stands.
      const hearts = (to: Pronouns[]) => ({ ...PEOPLE, hearts: { ...PEOPLE.hearts, drawn: { she: [{ to, weight: 1 }], he: [{ to, weight: 1 }], they: [{ to, weight: 1 }] } } });
      const everyone = hearts(['she', 'he', 'they']);
      /** Someone the player knows by name, likes, and has a spark with. */
      const sweetOn = (id: string, now: number, spark: number, romance: SocietyState['romance'] = null): SocietyState => ({
        ...freshSociety(),
        standings: { [id]: { met: true, rapport: 60, grudge: 0, at: now, talks: 0, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {}, spark } },
        known: { [id]: { met: true, seen: true, told: false, facts: ['name'], log: [] } },
        romance,
      });
      /** An evening at the noodle bar, with someone free there who doesn't work there. */
      function evening(progress: (id: string, now: number) => Partial<Progress> = () => ({}), rules: Partial<GameRules> = {}) {
        for (let day = 0; day < 21; day++) {
          for (const hour of [18, 19, 20, 21, 22, 23]) {
            const now = Date.UTC(2077, 9, 12, hour, 5) + day * 24 * HOUR;
            const probe = new Game(world, { ...RULES, people: everyone, ...rules }, progressInside('b-noodle', 38, 20));
            probe.start(now);
            const guest = probe.peopleHere(now).find((p) => p.person.job.building !== 'b-noodle' && p.person.age >= 18);
            if (!guest) continue;
            // Free, whoever it is: a couple they were in is over, written off in their life as a breakup leaves it.
            const over = tiesOf(probe.population, guest.person.id).filter((t) => t.kind === 'spouse' || t.kind === 'partner').map((t) => tieKey(guest.person.id, t.to));
            const life = over.length ? { life: { ...freshLife(), broken: over } } : {};
            const game = new Game(world, { ...RULES, startingEddies: 400, people: everyone, ...rules }, { ...progressInside('b-noodle', 38, 20), ...life, ...progress(guest.person.id, now) });
            game.start(now);
            // And still free once the day is lived (the people's own days could pair them off).
            if (tiesOf(game.population, guest.person.id).some((t) => t.kind === 'spouse' || t.kind === 'partner')) continue;
            return { game, now, guest: guest.person, ...record(game) };
          }
        }
        throw new Error('nobody out at the noodle bar of an evening');
      }

      it('sparks someone drawn to you with a flirt, and nobody who is not', () => {
        const { game, now, guest } = evening((id, at) => ({ society: sweetOn(id, at, 30) }));
        expect(game.talk(guest.id, now, 'flirt')).toBe(true);
        expect(game.standingWith(guest.id, now)?.standing.spark).toBeGreaterThan(30);
        expect(game.conversation(guest.id).at(-1)).toMatchObject({ who: 'note', text: expect.stringMatching(/♥ \+/) });
        // Drawn to no one: no spark, and the note says why; asked out, a no.
        const cold = evening((id, at) => ({ society: sweetOn(id, at, 30) }), { people: hearts([]) });
        expect(cold.game.talk(cold.guest.id, cold.now, 'flirt')).toBe(true);
        expect(cold.game.standingWith(cold.guest.id, cold.now)?.standing.spark).toBe(30);
        expect(cold.game.conversation(cold.guest.id).at(-1)?.text).toMatch(/Not drawn to you/);
        expect(cold.game.romanceWith(cold.guest.id, cold.now)).toEqual(['askOut']);
        expect(cold.game.askOut(cold.guest.id, cold.now)).toBe(true);
        expect(cold.game.romance(cold.now)).toBeNull();
      });

      it('goes by the pronouns the player picks: only those drawn to them are', () => {
        const { game, now, guest } = evening((id, at) => ({ society: sweetOn(id, at, 30) }), { people: hearts(['she']) });
        expect(game.pronouns).toBe('they');
        game.talk(guest.id, now, 'flirt');
        expect(game.standingWith(guest.id, now)?.standing.spark).toBe(30);
        expect(game.conversation(guest.id).at(-1)?.text).toMatch(/Not drawn to you/);
        game.setPronouns('she');
        expect(game.youSaved).toEqual({ pronouns: 'she' });
        expect(game.askOut(guest.id, now)).toBe(true);
        expect(game.romance(now)?.id).toBe(guest.id);
      });

      it('asks out, takes out of an evening, makes it official, and ends it', () => {
        const { game, now, guest, take, outputs } = evening((id, at) => ({ society: sweetOn(id, at, 40) }));
        expect(game.romanceWith(guest.id, now)).toEqual(['askOut']);
        expect(game.askOut(guest.id, now)).toBe(true);
        expect(game.romance(now)).toMatchObject({ id: guest.id, stage: 'dating', dates: 0 });
        expect(game.romanceWith(guest.id, now)).toEqual(['date', 'official', 'end']);
        expect(game.describe(guest.id, now)?.lines[0]).toBe('Seeing you · 0 dates');
        // Too soon to make it official.
        expect(game.makeOfficial(guest.id, now)).toBe(true);
        expect(game.romance(now)?.stage).toBe('dating');
        take();
        const cash = game.wallet.eddies + game.wallet.account;
        const spark = game.standingWith(guest.id, now)?.standing.spark ?? 0;
        expect(game.date(guest.id, now)).toBe(true);
        expect(game.wallet.eddies + game.wallet.account).toBeLessThan(cash);
        expect(game.romance(now)?.dates).toBe(1);
        expect(game.standingWith(guest.id, now)?.standing.spark).toBeGreaterThan(spark);
        expect(memoriesOf(game.societySaved, guest.id, SOCIETY.memory, RULES.timeScale, now).some((m) => m.kind === 'date' && m.what === 'Test Noodles')).toBe(true);
        // Once a night.
        expect(game.date(guest.id, now + MINUTE)).toBe(false);
        expect(outputs(take()).at(-1)?.text).toMatch(/tonight already/);
        // Ended: it hurts, and they remember.
        expect(game.endRomance(now + MINUTE)).toBe(true);
        expect(game.romance(now)).toBeNull();
        const after = game.standingWith(guest.id, now + MINUTE)?.standing;
        expect(after?.grudge).toBeGreaterThan(0);
        expect(after?.spark).toBe(0);
        expect(memoriesOf(game.societySaved, guest.id, SOCIETY.memory, RULES.timeScale, now + MINUTE).some((m) => m.kind === 'dumped')).toBe(true);
      });

      it('makes it official after enough dates and spark, and dates only of an evening, somewhere with a menu', () => {
        const going = (id: string, at: number) => ({ society: sweetOn(id, at, 60, { with: id, stage: 'dating' as const, since: at, dates: SOCIETY.romance.official.dates, lastDateAt: 0 }) });
        const { game, now, guest } = evening(going);
        expect(game.makeOfficial(guest.id, now)).toBe(true);
        expect(game.romance(now)?.stage).toBe('together');
        expect(game.romanceWith(guest.id, now)).toEqual(['date', 'end']);
        // Not in the morning.
        const morning = evening(going, { society: { ...SOCIETY, romance: { ...SOCIETY.romance, date: { ...SOCIETY.romance.date, from: 3, to: 4 } } } });
        expect(morning.game.date(morning.guest.id, morning.now)).toBe(false);
        expect(morning.outputs(morning.take()).at(-1)?.text).toMatch(/evening thing/);
      });

      it('stings the one you are seeing when you flirt in front of them, and twice is once too often', () => {
        // Seeing the noodle bar's worker, with someone else there to flirt with.
        for (let day = 0; day < 14; day++) {
          const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
          const probe = new Game(world, { ...RULES, people: everyone }, progressInside('b-noodle', 38, 20));
          probe.start(now);
          const here = probe.peopleHere(now);
          // Both still there two hours on, for the second time.
          const stay = new Set(probe.peopleHere(now + 2 * HOUR).map((p) => p.person.id));
          const partner = here.find((p) => p.person.job.building === 'b-noodle' && stay.has(p.person.id))?.person;
          const other = here.find((p) => p.person.id !== partner?.id && p.person.age >= 18 && stay.has(p.person.id))?.person;
          if (!partner || !other) continue;
          const society = sweetOn(partner.id, now, 50, { with: partner.id, stage: 'dating', since: now, dates: 1, lastDateAt: 0 });
          const game = new Game(world, { ...RULES, people: everyone }, { ...progressInside('b-noodle', 38, 20), society });
          game.start(now);
          expect(game.talk(other.id, now, 'flirt')).toBe(true);
          const stung = game.standingWith(partner.id, now)?.standing;
          expect(stung?.spark).toBeLessThan(50);
          expect(memoriesOf(game.societySaved, partner.id, SOCIETY.memory, RULES.timeScale, now).find((m) => m.kind === 'cheated')?.about).toBe(other.id);
          // Again, after the talk cooldown: twice, and the next time they talk, they end it.
          const later = now + 2 * HOUR;
          expect(game.talk(other.id, later, 'flirt')).toBe(true);
          expect(game.peopleHere(later).some((p) => p.person.id === partner.id), 'still at work two hours on').toBe(true);
          expect(game.talk(partner.id, later)).toBe(true);
          expect(game.romance(later)).toBeNull();
          expect(game.conversation(partner.id).at(-1)?.text).toMatch(/ended it/);
          return;
        }
        throw new Error('never two people at the noodle bar');
      });

      it('is ended by someone who has turned on the player, rather than taken out', () => {
        const sour = (id: string, at: number) => {
          const society = sweetOn(id, at, 40, { with: id, stage: 'dating', since: at, dates: 1, lastDateAt: 0 });
          society.standings[id] = { ...society.standings[id]!, rapport: -100, grudge: 150 };
          return { society };
        };
        const { game, now, guest } = evening(sour);
        expect(game.standingWith(guest.id, now)?.stance).toBe('hostile');
        const cash = game.wallet.eddies + game.wallet.account;
        expect(game.date(guest.id, now)).toBe(true);
        expect(game.romance(now)).toBeNull();
        expect(game.wallet.eddies + game.wallet.account).toBe(cash);
        // The spark goes with it, and the note reads as the bad news it is.
        expect(game.standingWith(guest.id, now)?.standing.spark).toBe(0);
        expect(game.conversation(guest.id).at(-1)).toMatchObject({ who: 'note', tone: 'bad' });
      });

      it('dates once a night by the clock, small hours included, and never where the counter is barred', () => {
        // Out at 23:30 the evening before: half past midnight is still that night.
        const late = Date.UTC(2077, 9, 13, 0, 30);
        const night = (id: string) => ({ society: sweetOn(id, late, 40, { with: id, stage: 'dating', since: late - 24 * HOUR, dates: 1, lastDateAt: late - HOUR }) });
        const probe = new Game(world, { ...RULES, people: everyone }, progressInside('b-noodle', 38, 20));
        probe.start(late);
        const guest = probe.peopleHere(late).find((p) => p.person.job.building !== 'b-noodle' && p.person.age >= 18);
        if (!guest) throw new Error('nobody out at the noodle bar at half past midnight');
        const game = new Game(world, { ...RULES, startingEddies: 400, people: everyone }, { ...progressInside('b-noodle', 38, 20), ...night(guest.person.id) });
        game.start(late);
        const { take, outputs } = record(game);
        expect(game.date(guest.person.id, late)).toBe(false);
        expect(outputs(take()).at(-1)?.text).toMatch(/tonight already/);
        // Barred at the counter: no table for two either.
        const banned = evening((id, at) => {
          const society = sweetOn(id, at, 40, { with: id, stage: 'dating', since: at, dates: 1, lastDateAt: 0 });
          return { society: { ...society, rep: { 'business:b-noodle': { value: -100, at } } } };
        });
        expect(banned.game.barred(banned.now)).toBeTruthy();
        expect(banned.game.date(banned.guest.id, banned.now)).toBe(false);
        expect(banned.outputs(banned.take()).at(-1)?.text).toBe(banned.game.barred(banned.now));
      });

      it('takes a no to a mask as a no to the mask: asked again bare-faced, it is not pressing', () => {
        const gasMask = { id: 'old-plastic-gas-mask-1', kind: 'old-plastic-gas-mask', in: null };
        const { game, now, guest } = evening((id, at) => ({ society: sweetOn(id, at, 40), gear: [...GEAR.start, gasMask] }));
        expect(game.askOut(guest.id, now)).toBe(true);
        expect(game.romance(now)).toBeNull();
        expect(game.conversation(guest.id).map((l) => l.text).join(' ')).not.toMatch(/Nobody knows it's you/);
        expect(game.takeOff('old-plastic-gas-mask-1')).toBe(true);
        expect(game.askOut(guest.id, now + MINUTE)).toBe(true);
        expect(game.romance(now + MINUTE)?.id).toBe(guest.id);
      });

      it('counts being caught this time round, whoever with, and not what came before', () => {
        for (let day = 0; day < 14; day++) {
          const now = Date.UTC(2077, 9, 12, 11, 0) + day * 24 * HOUR;
          const probe = new Game(world, { ...RULES, people: everyone }, progressInside('b-noodle', 38, 20));
          probe.start(now);
          const here = probe.peopleHere(now);
          const partner = here.find((p) => p.person.job.building === 'b-noodle')?.person;
          const others = here.filter((p) => p.person.id !== partner?.id && p.person.age >= 18).map((p) => p.person);
          if (!partner || others.length < 2) continue;
          const [a, b] = others as [Person, Person];
          const seeing = () => sweetOn(partner.id, now, 60, { with: partner.id, stage: 'dating', since: now, dates: 1, lastDateAt: 0 });
          // Once with one, once with another: twice, and they end it.
          const game = new Game(world, { ...RULES, people: everyone }, { ...progressInside('b-noodle', 38, 20), society: seeing() });
          game.start(now);
          game.talk(a.id, now, 'flirt');
          game.talk(b.id, now, 'flirt');
          expect(game.talk(partner.id, now + MINUTE)).toBe(true);
          expect(game.romance(now + MINUTE)).toBeNull();
          // Caught three times before this began: forgiven, or they'd not have said yes.
          const before = seeing();
          before.memories = { [partner.id]: [{ kind: 'cheated', at: now - HOUR, about: a.id, times: 3, said: 0 }] };
          const again = new Game(world, { ...RULES, people: everyone }, { ...progressInside('b-noodle', 38, 20), society: before });
          again.start(now);
          expect(again.talk(partner.id, now)).toBe(true);
          expect(again.romance(now)?.id).toBe(partner.id);
          return;
        }
        throw new Error('never three people at the noodle bar');
      });

      it('knows someone\'s type once asked, and saves who the player goes by and who they see', () => {
        const probe = atWork('b-noodle', 38, 20);
        const society = sweetOn(probe.worker.id, probe.now, 30, { with: probe.worker.id, stage: 'together', since: probe.now, dates: 4, lastDateAt: 0 });
        society.known[probe.worker.id] = { met: true, seen: true, told: false, facts: ['name', 'type'], log: [] };
        const { game, worker } = atWork('b-noodle', 38, 20, { society, you: { pronouns: 'he' } }, { people: everyone });
        expect(game.describe(worker.id)?.facts.type).toMatch(/^Into anyone · /);
        expect(game.describe(worker.id)?.lines[0]).toBe('Together with you · 4 dates');
        expect(game.pronouns).toBe('he');
        expect(game.romance(probe.now)).toMatchObject({ id: worker.id, stage: 'together', dates: 4 });
      });
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
      money: null,
      energy: null,
      inebriation: null,
      society: null,
      charisma: null,
      job: null,
      life: null,
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
