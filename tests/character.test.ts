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
import { LIFEPATHS, LOOK_PARTS, lookOf, lookWords, nameFor, validCharacter, type Character, type Lifepath, type Look } from '../src/engine/character';
import { Game, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { createRng } from '../src/engine/rng';
import { createSave, readSave, resume } from '../src/engine/save';

const NOON = Date.UTC(2077, 9, 13, 12, 0);
const RULES: GameRules = { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, phone: PHONE, character: CHARACTER };
const world = generateWorld('7f3a29c1', CITY);
const LOOK: Look = { color: 'cyan', length: 'short', style: 'mohawk', eyes: 'optics', mark: 'scar', build: 'lean', chest: 'small', genitals: 'vulva', size: 'average' };
const made = (lifepath: Lifepath, extra: Partial<Character> = {}): Character => ({ name: 'Ana Reyes', pronouns: 'she', lifepath, look: LOOK, ...extra });
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
    expect(validCharacter(made('corpo', { look: { ...LOOK, color: 'plaid' } }), CHARACTER)).toBe(false);
    expect(validCharacter(made('corpo', { look: { ...LOOK, genitals: '' } }), CHARACTER)).toBe(false);
  });

  it('puts a look into words a line can use', () => {
    expect(lookWords(made('nomad').look, CHARACTER)).toEqual({ hair: 'short cyan mohawk', eyes: 'chrome optics', mark: 'scar', build: 'lean build', chest: 'small breasts', genitals: 'vulva', bold: true });
    const plain: Look = { ...LOOK, color: 'brown', length: 'long', style: 'ponytail', eyes: 'hazel', mark: 'none', chest: 'flat', genitals: 'penis', size: 'large' };
    expect(lookWords(plain, CHARACTER)).toEqual({ hair: 'long brown hair in a ponytail', eyes: 'hazel eyes', mark: '', build: 'lean build', chest: 'flat chest', genitals: 'large penis', bold: false });
    // Too short for a style, whatever style was set before.
    expect(lookWords({ ...plain, length: 'shaved' }, CHARACTER)).toMatchObject({ hair: 'shaved head', bold: true });
    expect(lookWords({ ...plain, length: 'buzzed', color: 'red', style: 'mohawk' }, CHARACTER)).toMatchObject({ hair: 'red buzz cut', bold: false });
    expect(lookWords({ ...plain, color: 'platinum' }, CHARACTER).bold).toBe(true);
    expect(lookWords(undefined, CHARACTER)).toEqual({ hair: '', eyes: '', mark: '', build: '', chest: '', genitals: '', bold: false });
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

describe('looks', () => {
  const g = newGame(made('streetkid'));
  const people = g.population.people;

  it('draws everyone a look of their own, the same every time, from what the builder offers', () => {
    for (const person of people.slice(0, 400)) {
      const look = lookOf(person, CHARACTER);
      expect(lookOf(person, CHARACTER)).toEqual(look);
      for (const part of LOOK_PARTS) {
        if (look[part] === '') continue;
        expect(CHARACTER.looks[part].options.some((o) => o.id === look[part]), `${person.id} ${part} ${look[part]}`).toBe(true);
      }
      if (CHARACTER.styleless.includes(look.length)) expect(look.style).toBe(CHARACTER.looks.style.options[0]!.id);
    }
    // Not everyone alike.
    const hair = new Set(people.slice(0, 400).map((p) => lookWords(lookOf(p, CHARACTER), CHARACTER).hair));
    expect(hair.size).toBeGreaterThan(20);
  });

  it('gives a body only to an adult, and a size only to what has one', () => {
    for (const person of people) {
      const look = lookOf(person, CHARACTER);
      expect(look.chest, person.id).not.toBe('');
      expect(look.genitals, person.id).not.toBe('');
      expect(look.size !== '', person.id).toBe(CHARACTER.sized.includes(look.genitals));
      // Anyone under age (the city has nobody yet) has no body drawn at all.
      const young = lookOf({ ...person, age: CHARACTER.adultAt - 1 }, CHARACTER);
      expect([young.chest, young.genitals, young.size], person.id).toEqual(['', '', '']);
    }
  });

  it('draws them as their people go: grey with age, the Animals built, Maelstrom chromed', () => {
    const share = (of: typeof people, test: (look: Look) => boolean) => of.filter((p) => test(lookOf(p, CHARACTER))).length / Math.max(1, of.length);
    const old = people.filter((p) => p.age >= 60);
    const young = people.filter((p) => p.age >= 18 && p.age < 30);
    expect(share(old, (l) => l.color === 'grey')).toBeGreaterThan(0.3);
    expect(share(young, (l) => l.color === 'grey')).toBe(0);
    const animals = people.filter((p) => p.gang === 'animals');
    const maelstrom = people.filter((p) => p.gang === 'maelstrom');
    expect(animals.length).toBeGreaterThan(0);
    expect(maelstrom.length).toBeGreaterThan(0);
    expect(share(animals, (l) => l.build === 'muscular')).toBeGreaterThan(0.5);
    expect(share(maelstrom, (l) => l.mark === 'chrome' || l.eyes === 'optics' || l.eyes === 'red')).toBeGreaterThan(0.6);
    const she = people.filter((p) => p.age >= 18 && p.pronouns === 'she');
    expect(share(she, (l) => l.genitals === 'vulva')).toBeGreaterThan(0.9);
  });

  it('shows on a profile from the first look, but for what is under the clothes until they are together', () => {
    const adult = people.find((p) => p.age >= 30 && p.diedOn === undefined)!;
    const seen = g.describe(adult.id, NOON)!;
    const words = lookWords(lookOf(adult, CHARACTER), CHARACTER);
    expect(seen.looks.toLowerCase()).toContain(words.hair);
    expect(seen.looks.toLowerCase()).toContain(words.eyes);
    expect(seen.build).not.toBe('');
    expect(seen.chest).not.toBe('');
    expect(seen.genitals).toBe('');
    // Together with them, the player knows: through a save, where what's known is written.
    const save = JSON.parse(JSON.stringify(createSave(world.seed, g, 0, NOON)));
    save.society.known[adult.id] = { ...(save.society.known[adult.id] ?? { how: 'met', at: NOON, facts: [], log: [] }), facts: ['body'] };
    const back = new Game(world, RULES, resume(world, readSave(save)!)!);
    expect(back.describe(adult.id, NOON)!.genitals.toLowerCase()).toBe(words.genitals);
    // Under age, no body to show, whatever's known.
    expect(back.looksOf(lookOf({ ...adult, age: CHARACTER.adultAt - 1 }, CHARACTER), true)).toMatchObject({ chest: '', genitals: '' });
  });

  it('remarks on the player\'s hair only when it stands out, and on nothing behind a mask', () => {
    expect(g.looksOf(LOOK, true)).toEqual({ looks: 'Short cyan mohawk · chrome optics · scar', build: 'Lean', chest: 'Small breasts', genitals: 'Vulva' });
    expect(g.looksOf(LOOK, false).genitals).toBe('');
  });

  it('needs no rules for looks: without them, nobody has one', () => {
    const { character: _, ...bare } = RULES;
    const plain = newGame(made('streetkid'), bare);
    expect(plain.describe(people[0]!.id, NOON)).toMatchObject({ looks: '', build: '', chest: '', genitals: '' });
  });
});
