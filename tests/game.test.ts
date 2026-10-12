import { describe, expect, it } from 'vitest';
import { cellOf, Game, streetSpot, type GameRules } from '../src/engine/game';
import type { Progress } from '../src/engine/save';
import type { TravelRules } from '../src/engine/travel';
import type { GameEvents, Location, Whereabouts, World } from '../src/engine/types';

// A small city on a 3×3 grid of streets:
//
//   alley ── market ── bar        (y = 20)
//   [S1]       |       [S2]       (y = 50, NCART stations on Line 1)
//             roof        dock    (y = 80; the dock has no routes, you find it on foot)
//
// Off the top street between the alley and the market, a gun shop you can go into; off the
// middle street, a park you can't.
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
      x: 50,
      y: 50,
    },
  },
  locations: {
    alley: place('alley', 20, 20, ['market'], { ambient: ['drip', { text: 'thunder', fx: 'lightning' }] }),
    market: place('market', 50, 20, ['alley', 'bar', 'roof']),
    bar: place('bar', 80, 20, ['market']),
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
  for (const type of ['output', 'arrived', 'tripChanged', 'interiorChanged', 'mapChanged', 'walletChanged', 'energyChanged', 'fx'] as const) {
    game.events.on(type, (payload) => events.push({ type, payload } as Recorded));
  }
  const take = () => events.splice(0);
  const outputs = (recorded: Recorded[]) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { game, take, outputs };
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
        energy: null,
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
      energy: null,
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
