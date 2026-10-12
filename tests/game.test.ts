import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import type { GameEvents, Location, World } from '../src/engine/types';

// A small city shaped like a line with a branch:  alley — market — bar
//                                                             |
//                                                            roof
function place(id: string, links: string[], extra: Partial<Location> = {}): Location {
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
    x: 50,
    y: 50,
    ...extra,
  };
}

const world: World = {
  seed: 'test',
  start: 'alley',
  welcome: 'hello',
  layout: { avenues: [50], streets: [50], coast: null },
  districts: {
    test: { id: 'test', name: 'Testville', theme: { primary: '#111111', secondary: '#222222' }, terrain: 'city', x: 50, y: 50 },
  },
  locations: {
    alley: place('alley', ['market'], { ambient: ['drip', { text: 'thunder', fx: 'lightning' }] }),
    market: place('market', ['alley', 'bar', 'roof']),
    bar: place('bar', ['market']),
    roof: place('roof', ['market']),
  },
};

type Recorded = { [K in keyof GameEvents]: { type: K; payload: GameEvents[K] } }[keyof GameEvents];

function setup() {
  const game = new Game(world);
  const events: Recorded[] = [];
  game.events.on('output', (payload) => events.push({ type: 'output', payload }));
  game.events.on('locationChanged', (payload) => events.push({ type: 'locationChanged', payload }));
  game.events.on('mapChanged', (payload) => events.push({ type: 'mapChanged', payload }));
  game.events.on('fx', (payload) => events.push({ type: 'fx', payload }));

  const take = () => events.splice(0);
  const types = (recorded: Recorded[]) => recorded.map((e) => e.type);
  const outputs = (recorded: Recorded[]) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { game, take, types, outputs };
}

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe('Game', () => {
  it('greets the player, then arrives at the start knowing only its neighbors', () => {
    const { game, take, types, outputs } = setup();
    game.start();
    const events = take();

    expect(outputs(events)).toEqual([{ text: 'hello', tone: 'narrative' }]);
    expect(types(events).slice(-2)).toEqual(['locationChanged', 'mapChanged']);
    expect(events.at(-2)?.payload).toMatchObject({ from: null, to: { id: 'alley' }, route: ['alley'] });
    expect(sorted(game.mapState.visited)).toEqual(['alley']);
    expect(sorted(game.mapState.discovered)).toEqual(['alley', 'market']);
  });

  it('reveals what lies beyond each place it visits', () => {
    const { game } = setup();
    game.start();
    game.travel('market');

    expect(game.location.id).toBe('market');
    expect(sorted(game.mapState.visited)).toEqual(['alley', 'market']);
    expect(sorted(game.mapState.discovered)).toEqual(['alley', 'bar', 'market', 'roof']);
  });

  it('refuses to travel somewhere it has not discovered', () => {
    const { game, take, outputs } = setup();
    game.start();
    take();
    game.travel('bar');
    const events = take();

    expect(game.location.id).toBe('alley');
    expect(events.some((e) => e.type === 'locationChanged')).toBe(false);
    expect(outputs(events)).toEqual([{ text: 'No known route there yet.', tone: 'error' }]);
    expect(game.routeTo('bar')).toBeNull();
  });

  it('takes the shortest known route and passes through the places on it', () => {
    const { game, take } = setup();
    game.start();
    game.travel('market');
    game.travel('bar');
    take();

    expect(game.routeTo('roof')).toEqual(['bar', 'market', 'roof']);
    game.travel('roof');
    const arrival = take().find((e) => e.type === 'locationChanged');

    expect(arrival?.payload).toMatchObject({ from: { id: 'bar' }, to: { id: 'roof' }, route: ['bar', 'market', 'roof'] });
  });

  it('ignores a trip to where the player already is', () => {
    const { game, take } = setup();
    game.start();
    take();
    game.travel('alley');

    expect(take()).toEqual([]);
  });

  it('announces when the whole city has been mapped, once', () => {
    const { game, take, outputs } = setup();
    game.start();
    game.travel('market');
    game.travel('bar');
    expect(outputs(take()).some((o) => o.text.includes('fully mapped'))).toBe(false);

    game.travel('roof');
    game.travel('alley');
    const mapped = outputs(take()).filter((o) => o.text.includes('fully mapped'));
    expect(mapped).toEqual([{ text: 'City grid fully mapped. Every district, every dive.', tone: 'system' }]);
  });

  it('hands out map state the UI cannot use to change the game', () => {
    const { game } = setup();
    game.start();
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

    it('stays quiet in locations without ambient lines', () => {
      const { game, take } = setup();
      game.start();
      game.travel('market');
      take();
      game.ambient();

      expect(take()).toEqual([]);
    });
  });
});
