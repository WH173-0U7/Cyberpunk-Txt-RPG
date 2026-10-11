import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/engine/commands';
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
      exits: { north: 'roof' },
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
  },
};

type Recorded = { [K in keyof GameEvents]: { type: K; payload: GameEvents[K] } }[keyof GameEvents];

function setup() {
  const game = new Game(world);
  const events: Recorded[] = [];
  game.events.on('output', (payload) => events.push({ type: 'output', payload }));
  game.events.on('locationChanged', (payload) => events.push({ type: 'locationChanged', payload }));
  game.events.on('fx', (payload) => events.push({ type: 'fx', payload }));
  game.events.on('clear', (payload) => events.push({ type: 'clear', payload }));

  const take = () => events.splice(0);
  const outputs = (recorded: Recorded[]) =>
    recorded.flatMap((e) => (e.type === 'output' ? [e.payload] : []));
  return { game, take, outputs };
}

describe('Game', () => {
  it('boots with the intro, then enters the start location', () => {
    const { game, take, outputs } = setup();
    game.start();
    const events = take();

    expect(outputs(events)[0]).toEqual({ text: 'booting', tone: 'system' });
    const entered = events.find((e) => e.type === 'locationChanged');
    expect(entered?.payload).toMatchObject({ from: null, to: { id: 'alley' }, district: { id: 'test' } });
    expect(outputs(events)).toContainEqual({ text: 'Alley', tone: 'heading' });
  });

  it('moves through an exit and announces the change before describing the new place', () => {
    const { game, take, outputs } = setup();
    game.start();
    take();

    game.handle('n');
    const events = take();

    expect(game.location.id).toBe('roof');
    expect(events[0]).toMatchObject({ type: 'locationChanged', payload: { from: { id: 'alley' }, to: { id: 'roof' } } });
    expect(outputs(events)).toContainEqual({ text: 'Roof', tone: 'heading' });
    expect(outputs(events)).toContainEqual({ text: 'Exits: {h|south}', tone: 'system' });
  });

  it('refuses to move where there is no exit', () => {
    const { game, take, outputs } = setup();
    game.handle('go east');
    const events = take();

    expect(game.location.id).toBe('alley');
    expect(events.some((e) => e.type === 'locationChanged')).toBe(false);
    expect(outputs(events)).toEqual([{ text: "You can't go east from here.", tone: 'error' }]);
  });

  it('reports bad directions and unknown commands as errors', () => {
    const { game, take, outputs } = setup();
    game.handle('go');
    game.handle('go sideways');
    game.handle('dance');

    const tones = outputs(take()).map((o) => o.tone);
    expect(tones).toEqual(['error', 'error', 'error']);
  });

  it('lists every command in help', () => {
    const { game, take, outputs } = setup();
    game.handle('help');
    const [help] = outputs(take());

    for (const cmd of COMMANDS) expect(help?.text).toContain(cmd.usage ?? cmd.name);
  });

  it('emits preview effects and clear requests', () => {
    const { game, take } = setup();
    game.handle('fx shake');
    game.handle('cls');

    expect(take()).toEqual([
      { type: 'fx', payload: { effect: 'shake' } },
      { type: 'clear', payload: undefined },
    ]);
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
      game.handle('n');
      take();
      game.ambient();

      expect(take()).toEqual([]);
    });
  });
});
