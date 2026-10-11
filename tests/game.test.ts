import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game';
import type { GameEvents, World } from '../src/engine/types';

const world: World = {
  start: 'alley',
  intro: ['booting'],
  welcome: 'hello',
  districts: {
    test: { id: 'test', name: 'Testville', theme: { primary: '#111111', secondary: '#222222' } },
  },
  locations: {
    alley: {
      id: 'alley',
      name: 'Alley',
      district: 'test',
      weather: 'rain',
      description: 'A wet alley.',
      exits: { west: 'garage', north: 'roof' },
      ambient: ['drip', { text: 'thunder', fx: 'lightning' }],
    },
    roof: {
      id: 'roof',
      name: 'Roof',
      district: 'test',
      weather: 'clear',
      description: 'A windy roof.',
      exits: { south: 'alley' },
    },
    garage: {
      id: 'garage',
      name: 'Garage',
      district: 'test',
      weather: 'clear',
      description: 'Oil stains.',
      exits: { east: 'alley' },
    },
  },
};

type Recorded = { [K in keyof GameEvents]: { type: K; payload: GameEvents[K] } }[keyof GameEvents];

function setup() {
  const game = new Game(world);
  const events: Recorded[] = [];
  game.events.on('output', (payload) => events.push({ type: 'output', payload }));
  game.events.on('locationChanged', (payload) => events.push({ type: 'locationChanged', payload }));
  game.events.on('scene', (payload) => events.push({ type: 'scene', payload }));
  game.events.on('fx', (payload) => events.push({ type: 'fx', payload }));

  const take = () => events.splice(0);
  const types = (recorded: Recorded[]) => recorded.map((e) => e.type);
  const outputs = (recorded: Recorded[]) => recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { game, take, types, outputs };
}

describe('Game', () => {
  it('boots with the intro, then enters the start location', () => {
    const { game, take, types, outputs } = setup();
    game.start();
    const events = take();

    expect(outputs(events)).toEqual([
      { text: 'booting', tone: 'system' },
      { text: 'hello', tone: 'narrative' },
    ]);
    expect(types(events).slice(-2)).toEqual(['locationChanged', 'scene']);
    expect(events.at(-2)?.payload).toMatchObject({ from: null, to: { id: 'alley' }, district: { id: 'test' } });
  });

  it('lists exits in compass order with their destination names', () => {
    const { game, take } = setup();
    game.look();

    expect(take()).toEqual([
      {
        type: 'scene',
        payload: expect.objectContaining({
          location: expect.objectContaining({ id: 'alley' }),
          exits: [
            { direction: 'north', name: 'Roof' },
            { direction: 'west', name: 'Garage' },
          ],
        }),
      },
    ]);
  });

  it('moves through an exit, announcing the arrival and then the new scene', () => {
    const { game, take, types } = setup();
    game.move('north');
    const events = take();

    expect(game.location.id).toBe('roof');
    expect(types(events)).toEqual(['locationChanged', 'scene']);
    expect(events[0]?.payload).toMatchObject({ from: { id: 'alley' }, to: { id: 'roof' } });
  });

  it('refuses to move where there is no exit', () => {
    const { game, take, outputs } = setup();
    game.move('east');
    const events = take();

    expect(game.location.id).toBe('alley');
    expect(events.some((e) => e.type === 'locationChanged')).toBe(false);
    expect(outputs(events)).toEqual([{ text: "You can't go east from here.", tone: 'error' }]);
  });


  it('rescans the current scene without moving', () => {
    const { game, take, types } = setup();
    game.look();

    expect(types(take())).toEqual(['scene']);
    expect(game.location.id).toBe('alley');
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
      game.move('north');
      take();
      game.ambient();

      expect(take()).toEqual([]);
    });
  });
});
