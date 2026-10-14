import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { MONEY } from '../src/data/money';
import { INEBRIATION } from '../src/data/inebriation';
import { LINES } from '../src/data/dialogue';
import { PEOPLE } from '../src/data/people';
import { CHARISMA } from '../src/data/skills';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game } from '../src/engine/game';
import { GENERATOR_VERSION, generateWorld } from '../src/engine/generate';
import { hashSeed } from '../src/engine/rng';
import { createSave, readSave, resume, savedSeed, type SaveData } from '../src/engine/save';
import type { World } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const T0 = Date.UTC(2077, 9, 12, 20, 0);
const rules = { ...TRAVEL, timeScale: 1, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE };

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
  return createSave(world.seed, game, GENERATOR_VERSION, now);
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

  it('carries the inventory, dropping anything in it that is not an item', () => {
    const { game, now } = played(1);
    expect(game.inventory).toEqual([]);
    const shard = { id: 'shard-1', kind: 'shard', name: 'Old Shard', count: 1 };
    // A credchip keeps what's on it and whether it's locked; one that makes no sense is dropped with the rest.
    const chip = { id: 'credchip-1', kind: 'credchip', name: 'CredChip', count: 1, in: 'wallet', balance: 120, locked: true };
    // Clothing carried says which garment it is.
    const coat = { id: 'worn-punk-coat', kind: 'clothing', name: 'Worn PUNK coat', count: 1, gear: 'worn-punk-coat', in: 'jacket' };
    const saved = { ...saveOf(game, now), items: [shard, { id: 'x', kind: 'spaceship', name: 'Nope', count: 1 }, { ...shard, count: 0 }, 'junk', chip, { ...chip, id: 'credchip-2', balance: -5 }, { ...chip, id: 'credchip-3', locked: 'yes' }, coat, { ...coat, gear: 7 }] };
    const read = readSave(JSON.parse(JSON.stringify(saved)));
    expect(read?.items).toEqual([shard, chip, coat]);
    const { items: _, ...old } = saveOf(game, now);
    expect(readSave(JSON.parse(JSON.stringify(old)))?.items).toEqual([]);

    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    const resumed = new Game(world, rules, progress);
    // The shard said no pocket: it's put away in the jacket. The chip stays in the wallet, the coat where it was.
    expect(resumed.inventory).toEqual([{ ...shard, in: 'jacket' }, chip, coat]);
    expect(read?.gear).toEqual(GEAR.start);
    // A save from before pockets has none: the player wears the usual.
    const { items: _i, gear: _g, ...older } = saveOf(game, now);
    const olderRead = readSave(JSON.parse(JSON.stringify(older)));
    expect(olderRead?.gear).toBeNull();
    const olderProgress = olderRead && resume(world, olderRead);
    if (!olderProgress) throw new Error('no progress');
    expect(new Game(world, rules, olderProgress).gearSaved).toEqual(GEAR.start);
    // Copies: changing what the UI was handed doesn't change what the player carries.
    const handed = resumed.inventory;
    handed[0]!.count = 99;
    expect(resumed.inventory[0]?.count).toBe(1);
  });

  it('carries cash and the account, and reads an old save\'s eddies as bills', () => {
    const { game, now } = played(1);
    const money = { bills: 30, coins: 7, account: 120 };
    const saved = { ...saveOf(game, now), money };
    const read = readSave(JSON.parse(JSON.stringify(saved)));
    expect(read?.money).toEqual(money);
    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    expect(new Game(world, rules, progress).wallet).toMatchObject({ ...money, eddies: 37 });
    // A save from before: one number, all of it bills, none in the bank.
    const { money: _m, ...old } = saveOf(game, now);
    const oldRead = readSave(JSON.parse(JSON.stringify({ ...old, eddies: 42 })));
    expect(oldRead?.money).toBeNull();
    const oldProgress = oldRead && resume(world, oldRead);
    if (!oldProgress) throw new Error('no progress');
    expect(new Game(world, rules, oldProgress).wallet).toMatchObject({ bills: 42, coins: 0, account: 0, eddies: 42 });
    expect(readSave({ ...saved, money: { bills: -1, coins: 0, account: 0 } })?.money).toBeNull();
  });

  it('carries energy, and starts it fresh for saves from before it or that make no sense', () => {
    const { game, now } = played(1);
    const energy = { current: 3.5, level: 2, xp: 120, updatedAt: now };
    const saved = { ...saveOf(game, now), energy };
    const read = readSave(JSON.parse(JSON.stringify(saved)));
    expect(read?.energy).toEqual(energy);
    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    expect(new Game(world, rules, progress).energy(now)).toMatchObject({ current: 3, level: 2, xp: 120 });

    const { energy: _, ...old } = saveOf(game, now);
    expect(readSave(JSON.parse(JSON.stringify(old)))?.energy).toBeNull();
    expect(readSave({ ...saved, energy: { ...energy, level: 0 } })?.energy).toBeNull();
    expect(readSave({ ...saved, energy: { ...energy, current: -1 } })?.energy).toBeNull();
    const fresh = new Game(world, rules, resume(world, readSave(JSON.parse(JSON.stringify(old))) ?? saved) ?? undefined);
    expect(fresh.energy(now)).toMatchObject({ current: ENERGY.start, max: ENERGY.start, level: 1 });
  });

  it('carries the drink in the player, and starts sober for saves from before it or that make no sense', () => {
    const { game, now } = played(1);
    const inebriation = { units: 2.5, updatedAt: now };
    const saved = { ...saveOf(game, now), inebriation };
    const read = readSave(JSON.parse(JSON.stringify(saved)));
    expect(read?.inebriation).toEqual(inebriation);
    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    expect(new Game(world, rules, progress).inebriation(now)).toMatchObject({ units: 2.5, stage: expect.objectContaining({ id: 'tipsy' }) });

    const { inebriation: _, ...old } = saveOf(game, now);
    expect(readSave(JSON.parse(JSON.stringify(old)))?.inebriation).toBeNull();
    expect(readSave({ ...saved, inebriation: { units: -1, updatedAt: now } })?.inebriation).toBeNull();
    expect(readSave({ ...saved, inebriation: { units: 'two', updatedAt: now } })?.inebriation).toBeNull();
    const fresh = new Game(world, rules, resume(world, readSave(JSON.parse(JSON.stringify(old))) ?? saved) ?? undefined);
    expect(fresh.inebriation(now)).toEqual({ units: 0, stage: null, severity: 0, soberAt: null });
  });

  it('carries the job, and drops one at a building the city does not have', () => {
    const { game, now } = played(1);
    const job = { building: world.buildings[0]?.id ?? 'b', rung: 1, trust: 6, shifts: 6, lastShiftDay: 39366 };
    const read = readSave(JSON.parse(JSON.stringify({ ...saveOf(game, now), job })));
    expect(read?.job).toEqual(job);
    expect(read && resume(world, read)?.job).toEqual(job);
    const gone = readSave(JSON.parse(JSON.stringify({ ...saveOf(game, now), job: { ...job, building: 'b-nowhere' } })));
    expect(gone?.job?.building).toBe('b-nowhere');
    expect(gone && resume(world, gone)?.job).toBeNull();
    expect(readSave({ ...saveOf(game, now), job: { building: 'b', rung: -1 } })?.job).toBeNull();
    expect(readSave({ ...saveOf(game, now), job: 'dishes' })?.job).toBeNull();
    expect(saveOf(game, now).job).toBeNull();
  });

  it('carries charisma and what the player knows of people, and starts fresh without them', () => {
    const { game, now } = played(1);
    const charisma = { level: 3, xp: 12 };
    const someone = game.population.people[0];
    const other = game.population.people[1];
    if (!someone || !other) throw new Error('no people');
    const society = { ...game.societySaved, known: { [someone.id]: { met: true, seen: false, told: false, facts: ['name' as const], log: [{ at: now, who: 'you' as const, text: 'Hey.' }] } }, links: { [[someone.id, other.id].sort().join('|')]: { kind: null, how: 'seen' as const, at: now } } };
    const saved = { ...saveOf(game, now), charisma, society };
    const read = readSave(JSON.parse(JSON.stringify(saved)));
    expect(read?.charisma).toEqual(charisma);
    expect(read?.society?.known).toEqual(society.known);
    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    const again = new Game(world, rules, progress);
    expect(again.charisma()).toMatchObject({ level: 3, xp: 12 });
    expect(again.knownPeople().map((p) => p.id)).toEqual([someone.id]);
    // Introduced, they go by their street name too, if they have one.
    expect(again.describe(someone.id)).toMatchObject({ named: true });
    expect(again.describe(someone.id)?.name.replace(/ "[^"]+"/, '')).toBe(someone.name);
    expect(again.conversation(someone.id)).toEqual([{ at: now, who: 'you', text: 'Hey.' }]);
    // A save from before facts and the log were kept: the person is known, with neither.
    const bare = readSave(JSON.parse(JSON.stringify({ ...saved, society: { ...society, known: { [someone.id]: { met: true, seen: false, told: false } } } })));
    expect(bare?.society?.known[someone.id]).toEqual({ met: true, seen: false, told: false, facts: [], log: [] });
    expect(again.standingWith(someone.id, now)?.web.map((l) => l.person.id)).toEqual([other.id]);

    // A save from before anyone could be known of: nobody is, and charisma starts at 1.
    const { charisma: _c, ...old } = saveOf(game, now);
    const { known: _k, links: _l, ...society0 } = game.societySaved;
    const oldRead = readSave(JSON.parse(JSON.stringify({ ...old, society: society0 })));
    expect(oldRead?.charisma).toBeNull();
    expect(oldRead?.society).toMatchObject({ known: {}, links: {}, memories: {} });
    expect(readSave({ ...saved, charisma: { level: 0, xp: 1 } })?.charisma).toBeNull();
  });

  it('carries what people remember of the player, and forgets what it cannot read', () => {
    const { game, now } = played(1);
    const someone = game.population.people[0];
    if (!someone) throw new Error('no people');
    const memory = { kind: 'wronged' as const, at: now, what: 'robbery', amount: 30, times: 1, said: 0 };
    const society = { ...game.societySaved, memories: { [someone.id]: [memory, { kind: 'gift', at: 'yesterday' }], nobody: 'x' } };
    const read = readSave(JSON.parse(JSON.stringify({ ...saveOf(game, now), society })));
    expect(read?.society?.memories).toEqual({ [someone.id]: [memory] });
    const progress = read && resume(world, read);
    if (!progress) throw new Error('no progress');
    expect(new Game(world, rules, progress).societySaved.memories).toEqual({ [someone.id]: [memory] });
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
