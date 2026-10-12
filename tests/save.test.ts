import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { Game } from '../src/engine/game';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { hashSeed } from '../src/engine/rng';
import { createSave, readSave, resume } from '../src/engine/save';
import type { World } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);

/** Plays a few moves: travels to whatever is next door, a few times over. */
function played(steps: number): Game {
  const game = new Game(world);
  game.start();
  for (let i = 0; i < steps; i++) {
    const next = game.location.links.find((id) => !game.mapState.visited.has(id)) ?? game.location.links[0];
    if (next) game.travel(next);
  }
  return game;
}

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe('saving', () => {
  it('reads back exactly what it wrote', () => {
    const game = played(3);
    const save = createSave(world.seed, game.mapState, GENERATOR_VERSION, 1234);
    expect(readSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(save).toMatchObject({ version: 1, generator: GENERATOR_VERSION, seed: world.seed, current: game.location.id, savedAt: 1234 });
  });

  it('ignores anything that is not a save it understands', () => {
    const good = createSave(world.seed, played(1).mapState, GENERATOR_VERSION);
    for (const bad of [
      null,
      'save',
      42,
      [],
      { ...good, version: 2 },
      { ...good, seed: 'not-a-seed' },
      { ...good, current: 7 },
      { ...good, visited: 'watson-1' },
      { ...good, discovered: [1, 2] },
      { ...good, generator: '1' },
    ]) {
      expect(readSave(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('picks up exactly where the player left off', () => {
    const before = played(4);
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, before.mapState, GENERATOR_VERSION))));
    const progress = save && resume(generateWorld(save.seed, CITY), save);
    expect(progress).not.toBeNull();
    const after = new Game(generateWorld(world.seed, CITY), progress ?? undefined);
    expect(after.location.id).toBe(before.location.id);
    expect(sorted(after.mapState.visited)).toEqual(sorted(before.mapState.visited));
    expect(sorted(after.mapState.discovered)).toEqual(sorted(before.mapState.discovered));
    // Routes work from the restored state just as they did before.
    for (const id of before.mapState.discovered) expect(after.routeTo(id)).toEqual(before.routeTo(id));
  });

  it('welcomes a returning player back instead of from the top', () => {
    const progress = resume(world, createSave(world.seed, played(2).mapState, GENERATOR_VERSION));
    const game = new Game(world, progress ?? undefined);
    const said: string[] = [];
    game.events.on('output', ({ text }) => said.push(text));
    game.start();
    expect(said[0]).toBe(CITY.welcomeBack);
    expect(said).not.toContain(CITY.welcome);
  });

  it("won't resume a save that doesn't match its city", () => {
    const save = createSave(world.seed, played(2).mapState, GENERATOR_VERSION);
    const other = generateWorld('0badc0de', CITY);
    expect(resume(other, save)).toBeNull();
    expect(resume(world, { ...save, current: 'nowhere-1' })).toBeNull();
    expect(resume(world, { ...save, visited: [...save.visited, 'nowhere-1'] })).toBeNull();
    expect(resume(world, { ...save, discovered: [...save.discovered, 'nowhere-1'] })).toBeNull();
  });

  it('counts where the player stands as visited, even if the save left it out', () => {
    const save = createSave(world.seed, played(2).mapState, GENERATOR_VERSION);
    const progress = resume(world, { ...save, visited: save.visited.filter((id) => id !== save.current) });
    expect(progress?.visited).toContain(save.current);
  });
});

describe('generator version', () => {
  /** The places three seeds build, boiled down to one number. */
  function fingerprint(build: (seed: string) => World): string {
    const places = ['7f3a29c1', '0badc0de', '1c0ffee5'].map((seed) => {
      const w = build(seed);
      const list = Object.values(w.locations)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((l) => [l.id, l.name, l.x, l.y, [...l.links].sort()].join(':'));
      return [w.start, ...list].join('|');
    });
    return hashSeed(places.join('||')).toString(16);
  }

  // When this fails, seeds now build different places, and saves made before can't be trusted.
  // Bump GENERATOR_VERSION in src/engine/generate.ts, then add the new fingerprint here.
  const FINGERPRINTS: Record<number, string> = {
    1: '1b8af260',
  };

  it('matches the places this version of the generator builds', () => {
    expect(fingerprint((seed) => generateWorld(seed, CITY))).toBe(FINGERPRINTS[GENERATOR_VERSION]);
  });
});
