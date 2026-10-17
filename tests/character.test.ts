import { describe, expect, it } from 'vitest';
import { CHARACTER } from '../src/data/character';
import { CITY } from '../src/data/city';
import { COMBAT } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { PHONE } from '../src/data/phone';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { LIFEPATHS, lookWords, nameFor, validCharacter, type Character, type Lifepath } from '../src/engine/character';
import { Game, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume } from '../src/engine/save';

const NOON = Date.UTC(2077, 9, 13, 12, 0);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, phone: PHONE, character: CHARACTER };
const world = generateWorld('7f3a29c1', CITY);
const made = (lifepath: Lifepath, extra: Partial<Character> = {}): Character => ({ name: 'Ana Reyes', pronouns: 'she', lifepath, look: { hair: 'mohawk', color: 'cyan', eyes: 'optics', mark: 'scar' }, ...extra });
const newGame = (character: Character, rules: GameRules = RULES) => {
  const g = new Game(world, rules, undefined, character);
  g.start(NOON);
  return g;
};

describe('the character builder', () => {
  it('takes a name, a lifepath and a look it offers, and nothing else', () => {
    expect(validCharacter(made('streetkid'), CHARACTER)).toBe(true);
    expect(validCharacter(made('streetkid', { name: '   ' }), CHARACTER)).toBe(false);
    expect(validCharacter(made('streetkid', { name: 'x'.repeat(41) }), CHARACTER)).toBe(false);
    expect(validCharacter(made('drifter' as Lifepath), CHARACTER)).toBe(false);
    expect(validCharacter(made('corpo', { look: { hair: 'mohawk', color: 'plaid', eyes: 'optics', mark: 'none' } }), CHARACTER)).toBe(false);
  });

  it('puts a look into words a line can use', () => {
    expect(lookWords(made('nomad').look, CHARACTER)).toEqual({ hair: 'cyan mohawk', eyes: 'chrome optics', mark: 'scar' });
    expect(lookWords({ hair: 'long', color: 'platinum', eyes: 'brown', mark: 'none' }, CHARACTER)).toEqual({ hair: 'long platinum hair', eyes: 'brown eyes', mark: '' });
    expect(lookWords({ hair: 'shaved', color: 'red', eyes: 'grey', mark: 'none' }, CHARACTER).hair).toBe('shaved head');
    expect(lookWords(undefined, CHARACTER)).toEqual({ hair: '', eyes: '', mark: '' });
  });

  it('names a new player from the people where their lifepath starts', () => {
    for (const path of LIFEPATHS) {
      const district = CHARACTER.lifepaths[path].district;
      const pools = (PEOPLE.backgrounds[district] ?? [[PEOPLE.fallbackBackground, 1]]).map(([c]) => PEOPLE.names[c]!);
      for (let i = 0; i < 20; i++) {
        const [given, ...family] = nameFor(path, 'he', CHARACTER, PEOPLE, createRng(`${path}:${i}`)).split(' ');
        expect(pools.some((p) => p.masculine.includes(given!) && p.family.includes(family.join(' '))), `${path} ${given}`).toBe(true);
      }
    }
  });
});

describe('a lifepath', () => {
  it('starts each one where its prologue does, as they made themselves', () => {
    for (const path of LIFEPATHS) {
      const content = CHARACTER.lifepaths[path];
      const g = newGame(made(path));
      const start = g.location;
      expect(start?.district, path).toBe(content.district);
      expect(start?.name, `${path} starts at ${content.place}`).toBe(content.place);
      expect(g.character).toEqual(made(path));
      expect(g.pronouns).toBe('she');
      expect(g.wallet.eddies).toBe(content.cash);
      expect(g.wallet.account).toBe(content.account);
    }
  });

  it('dresses them for it, the wallet where it always is', () => {
    const corpo = newGame(made('corpo'));
    const worn = corpo.gearSaved.filter((p) => p.in === null).map((p) => p.kind);
    for (const kind of Object.values(CHARACTER.lifepaths.corpo.outfit)) expect(worn).toContain(kind);
    expect(corpo.gearSaved.find((p) => p.kind === 'wallet')?.in).toBe('pants');
    const kid = newGame(made('streetkid'));
    expect(kid.gearSaved.filter((p) => p.in === null).map((p) => p.kind).sort()).toEqual(GEAR.start.filter((p) => p.in === null).map((p) => p.kind).sort());
  });

  it('starts them known round there: their reputation, and the holos of the people who know them', () => {
    for (const path of LIFEPATHS) {
      const content = CHARACTER.lifepaths[path];
      const g = newGame(made(path));
      const rep = new Map(g.reputation(NOON).map((r) => [r.key, r.value]));
      for (const [key, value] of Object.entries(content.rep)) expect(rep.get(key), `${path} ${key}`).toBe(value);
      const contacts = g.contacts(NOON);
      expect(contacts.length, path).toBe(content.known.count);
      for (const c of contacts) {
        const person = g.person(c.id)!;
        expect(person.district).toBe(content.known.district);
        expect(g.describe(c.id, NOON)?.named).toBe(true);
        expect(g.standingWith(c.id, NOON)!.standing.rapport).toBe(content.known.rapport);
        expect(c.at, 'written down when the game starts').toBe(NOON);
      }
    }
  });

  it('keeps who they made themselves through a save, and an older save plays as it always did', () => {
    const g = newGame(made('nomad', { pronouns: 'they' }));
    const back = new Game(world, RULES, resume(world, readSave(JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON))))!)!);
    expect(back.character).toEqual(made('nomad', { pronouns: 'they' }));
    expect(back.contacts(NOON).map((c) => c.id)).toEqual(g.contacts(NOON).map((c) => c.id));
    // A save from before the builder: no character, the usual start.
    const old = new Game(world, RULES);
    old.start(NOON);
    expect(old.character).toBeNull();
    expect(old.location?.id).toBe(world.start);
    expect(old.wallet.eddies).toBe(RULES.startingEddies);
    // A character that doesn't read right is dropped, the pronouns kept.
    const save = JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON)));
    save.you.lifepath = 'astronaut';
    expect(readSave(save)?.you).toEqual({ pronouns: 'they' });
  });
});
