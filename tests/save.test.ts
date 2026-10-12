import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { TRAVEL } from '../src/data/travel';
import { Game } from '../src/engine/game';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { hashSeed } from '../src/engine/rng';
import { createSave, readSave, resume, savedSeed, type SaveData } from '../src/engine/save';
import type { World } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const T0 = Date.UTC(2077, 9, 12, 20, 0);
const rules = { ...TRAVEL, timeScale: 1 };

/** Plays a few moves on foot to places next door, letting each trip finish. Returns the game and the time. */
function played(steps: number): { game: Game; now: number } {
  const game = new Game(world, rules);
  let now = T0;
  game.start(now);
  for (let i = 0; i < steps; i++) {
    const here = game.location;
    const next = here?.links.find((id) => !game.mapState.visited.has(id)) ?? here?.links[0];
    const target = next ? world.locations[next] : undefined;
    if (!target) break;
    const plan = game.plan({ x: target.x, y: target.y, place: target.id, station: null, building: null }, 'foot', now);
    if (!plan) break;
    game.go(plan, now);
    now = game.currentTrip?.endsAt ?? now;
    game.tick(now);
  }
  return { game, now };
}

function saveOf(game: Game, now: number): SaveData {
  return createSave(world.seed, game.mapState, game.wallet, game.currentTrip, game.interior?.id ?? null, GENERATOR_VERSION, now);
}

const sorted = (set: ReadonlySet<string>) => [...set].sort();

describe('saving', () => {
  it('reads back exactly what it wrote', () => {
    const { game, now } = played(3);
    const save = saveOf(game, now);
    expect(readSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(save).toMatchObject({ version: 2, generator: GENERATOR_VERSION, seed: world.seed, eddies: TRAVEL.startingEddies, trip: null });
  });

  it('reads a save from before buildings could be entered as standing outside', () => {
    const { game, now } = played(2);
    const { inside: _, ...old } = saveOf(game, now);
    expect(readSave(JSON.parse(JSON.stringify(old)))?.inside).toBeNull();
  });

  it('keeps the player inside only the building they stand at, and never mid-trip', () => {
    const { game, now } = played(2);
    const building = world.buildings.find((b) => b.floors > 0);
    if (!building) throw new Error('no building');
    const at = { ...game.whereabouts, place: null, station: null, building: building.id };
    const save = { ...saveOf(game, now), where: at, inside: building.id };
    expect(resume(world, save)?.inside).toBe(building.id);
    expect(resume(world, { ...save, inside: 'b-nowhere' })?.inside).toBeNull();
    expect(resume(world, { ...save, where: { ...at, building: null } })?.inside).toBeNull();
  });

  it('ignores anything that is not a save it understands', () => {
    const { game, now } = played(1);
    const good = saveOf(game, now);
    for (const bad of [
      null,
      'save',
      42,
      [],
      { ...good, version: 1 },
      { ...good, seed: 'not-a-seed' },
      { ...good, where: { x: 1 } },
      { ...good, visited: 'watson-1' },
      { ...good, explored: ['a'] },
      { ...good, eddies: 'lots' },
      { ...good, trip: { mode: 'teleport' } },
      { ...good, generator: '1' },
    ]) {
      expect(readSave(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('still finds the seed in an old save, so its city can start over', () => {
    expect(savedSeed({ version: 1, seed: '7f3a29c1' })).toBe('7f3a29c1');
    expect(savedSeed({ seed: 'nope' })).toBeNull();
    expect(savedSeed(null)).toBeNull();
  });

  it('picks up exactly where the player left off', () => {
    const { game: before, now } = played(4);
    const save = readSave(JSON.parse(JSON.stringify(saveOf(before, now))));
    const progress = save && resume(generateWorld(save.seed, CITY), save);
    expect(progress).not.toBeNull();
    const after = new Game(generateWorld(world.seed, CITY), rules, progress ?? undefined);
    expect(after.whereabouts).toEqual(before.whereabouts);
    expect(after.wallet).toEqual(before.wallet);
    expect(sorted(after.mapState.visited)).toEqual(sorted(before.mapState.visited));
    expect(sorted(after.mapState.discovered)).toEqual(sorted(before.mapState.discovered));
    expect([...after.mapState.explored].sort()).toEqual([...before.mapState.explored].sort());
  });

  it('keeps a trip going while the game is closed', () => {
    const { game, now } = played(1);
    const target = Object.values(world.locations).find((l) => l.id !== game.location?.id);
    if (!target) throw new Error('no target');
    const plan = game.plan({ x: target.x, y: target.y, place: target.id, station: null, building: null }, 'foot', now);
    if (!plan) throw new Error('no plan');
    game.go(plan, now);
    const save = readSave(JSON.parse(JSON.stringify(saveOf(game, now))));
    const progress = save && resume(world, save);
    expect(progress?.trip?.endsAt).toBe(game.currentTrip?.endsAt);

    const later = new Game(world, rules, progress ?? undefined);
    later.start((game.currentTrip?.endsAt ?? now) + 1);
    expect(later.location?.id).toBe(target.id);
  });

  it('welcomes a returning player back instead of from the top', () => {
    const { game, now } = played(2);
    const progress = resume(world, saveOf(game, now));
    const back = new Game(world, rules, progress ?? undefined);
    const said: string[] = [];
    back.events.on('output', ({ text }) => said.push(text));
    back.start(now);
    expect(said[0]).toBe(CITY.welcomeBack);
    expect(said).not.toContain(CITY.welcome);
  });

  it("won't resume a save that doesn't match its city", () => {
    const { game, now } = played(2);
    const save = saveOf(game, now);
    expect(resume(generateWorld('0badc0de', CITY), save)).toBeNull();
    expect(resume(world, { ...save, where: { ...save.where, place: 'nowhere-1' } })).toBeNull();
    expect(resume(world, { ...save, where: { ...save.where, station: 'ncart-99' } })).toBeNull();
    expect(resume(world, { ...save, visited: [...save.visited, 'nowhere-1'] })).toBeNull();
    expect(resume(world, { ...save, explored: [...save.explored, 99_999] })).toBeNull();
  });
});

describe('generator version', () => {
  /** The places and stations three seeds build, boiled down to one number. */
  function fingerprint(build: (seed: string) => World): string {
    const places = ['7f3a29c1', '0badc0de', '1c0ffee5'].map((seed) => {
      const w = build(seed);
      const list = Object.values(w.locations)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((l) => [l.id, l.name, l.x, l.y, [...l.links].sort()].join(':'));
      const stations = Object.values(w.transit.stations).map((s) => [s.id, s.x, s.y].join(':'));
      return [w.start, ...list, ...stations].join('|');
    });
    return hashSeed(places.join('||')).toString(16);
  }

  // When this fails, seeds now build different places, and saves made before can't be trusted.
  // Bump GENERATOR_VERSION in src/engine/generate.ts, then add the new fingerprint here.
  const FINGERPRINTS: Record<number, string> = {
    1: '1b8af260',
    2: '518b9b2b',
    3: 'f56e245e',
  };

  // Saves also name the building the player stands at, so its id must still be there. Every
  // building's id, kind, footprint and height (not its name or business) go into this one.
  // When it fails, bump GENERATOR_VERSION too, and record the new value here.
  const BUILDING_LAYOUT = '49f20347';

  it('keeps every building where saves expect it', () => {
    const layout = ['7f3a29c1', '0badc0de', '1c0ffee5'].map((seed) =>
      generateWorld(seed, CITY)
        .buildings.map((b) => [b.id, b.kind, b.x, b.y, b.w, b.h, b.floors].join(':'))
        .join('|'),
    );
    expect(hashSeed(layout.join('||')).toString(16)).toBe(BUILDING_LAYOUT);
  });

  it('matches the places this version of the generator builds', () => {
    expect(fingerprint((seed) => generateWorld(seed, CITY))).toBe(FINGERPRINTS[GENERATOR_VERSION]);
  });
});
