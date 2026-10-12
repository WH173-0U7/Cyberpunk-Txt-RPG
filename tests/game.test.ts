import { describe, expect, it } from 'vitest';
import { Game, streetSpot } from '../src/engine/game';
import type { Progress } from '../src/engine/save';
import type { TravelRules } from '../src/engine/travel';
import type { GameEvents, Location, Whereabouts, World } from '../src/engine/types';

// A small city on a 3×3 grid of streets:
//
//   alley ── market ── bar        (y = 20)
//   [S1]       |       [S2]       (y = 50, NCART stations on Line 1)
//             roof        dock    (y = 80; the dock has no routes, you find it on foot)
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
  buildings: [],
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

const RULES: TravelRules = {
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
};

const MINUTE = 60_000;
const T0 = Date.UTC(2077, 9, 12, 20, 0);
const at = (id: string): Whereabouts => {
  const l = world.locations[id];
  return { ...streetSpot(l ?? { x: 0, y: 0 }), place: id };
};
const station = (id: string): Whereabouts => {
  const s = world.transit.stations[id];
  return { ...streetSpot(s ?? { x: 0, y: 0 }), station: id };
};

type Recorded = { [K in keyof GameEvents]: { type: K; payload: GameEvents[K] } }[keyof GameEvents];

function setup(rules: Partial<TravelRules> = {}, progress?: Progress) {
  const game = new Game(world, { ...RULES, ...rules }, progress);
  const events: Recorded[] = [];
  for (const type of ['output', 'arrived', 'tripChanged', 'mapChanged', 'walletChanged', 'fx'] as const) {
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
    it('walks to the nearest station, waits, rides, and walks the rest', () => {
      const { game, take, outputs } = setup();
      game.start(T0);
      take();
      const { plan, started } = go(game, at('bar'), 'ncart', T0);

      expect(started).toBe(true);
      expect(plan.legs.map((l) => l.kind)).toEqual(['walk', 'wait', 'ride', 'walk']);
      expect(plan.legs[2]?.stations).toEqual(['s1', 's2']);
      expect(plan.minutes).toBeCloseTo(30 + 2 + 6 + 30);
      expect(game.wallet.eddies).toBe(4);
      expect(outputs(take())).toContainEqual({ text: 'NCART fare paid: 1 €$.', tone: 'system' });

      game.tick(T0 + 68 * MINUTE);
      expect(game.location?.id).toBe('bar');
    });

    it("doesn't explore from the train, only on foot", () => {
      const { game } = setup({ discoverRadius: 1 });
      game.start(T0);
      go(game, at('bar'), 'ncart', T0);
      // Halfway along the ride, between the stations.
      game.tick(T0 + 35 * MINUTE);
      const middle = game.mapState.explored;
      game.tick(T0 + 68 * MINUTE);
      expect([...middle].some((cell) => cell === 12 * 25 + 12)).toBe(false);
    });

    it('needs the fare', () => {
      const { game, take, outputs } = setup({ startingEddies: 0 });
      game.start(T0);
      take();
      const plan = game.plan(at('bar'), 'ncart', T0);
      expect(plan && game.go(plan, T0)).toBe(false);
      expect(game.currentTrip).toBeNull();
      expect(outputs(take())[0]?.tone).toBe('error');
    });

    it("can't change plans mid-ride", () => {
      const { game } = setup();
      game.start(T0);
      go(game, at('bar'), 'ncart', T0);
      expect(game.plan(at('market'), 'foot', T0 + MINUTE)).toBeNull();
      expect(game.stop(T0 + MINUTE)).toBe(false);
    });

    it('has nothing to offer when both ends are nearest the same station', () => {
      const { game } = setup();
      game.start(T0);
      expect(game.plan(streetSpot({ x: 20, y: 40 }), 'ncart', T0)).toBeNull();
    });

    it('sells a monthly pass at stations only, and rides are free while it lasts', () => {
      const { game, take } = setup({ startingEddies: 25 });
      game.start(T0);
      expect(game.buyPass(T0)).toBe(false);

      go(game, station('s1'), 'foot', T0);
      game.tick(T0 + 30 * MINUTE);
      const bought = T0 + 30 * MINUTE;
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
