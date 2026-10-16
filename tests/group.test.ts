import { describe, expect, it } from 'vitest';
import { CITY } from '../src/data/city';
import { COMBAT, JOIN } from '../src/data/combat';
import { LINES } from '../src/data/dialogue';
import { ENERGY } from '../src/data/energy';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { INEBRIATION } from '../src/data/inebriation';
import { JOBS } from '../src/data/jobs';
import { LIFE } from '../src/data/life';
import { MONEY } from '../src/data/money';
import { PEOPLE } from '../src/data/people';
import { POLICE } from '../src/data/police';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import type { CombatContent, JoinRules } from '../src/engine/combat';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, peopleAt, type Clock } from '../src/engine/people';
import type { PoliceContent } from '../src/engine/police';
import type { Progress } from '../src/engine/save';
import { freshSociety, type Standing } from '../src/engine/society';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
/** A weekday at noon: storefronts open, people about. */
const NOON = Date.UTC(2077, 9, 13, 12, 0);

/** Everyone throws in against the player: no ties needed. */
const EVERYONE: JoinRules = { ...JOIN, stranger: 100, crowd: 0 };
/** Nobody but a friend of the player's: and every friend does. */
const FRIENDS: JoinRules = { ...JOIN, kin: 0, friend: 0, gang: 0, guard: 0, stranger: 0, ally: 100, partner: 100 };
/** Every blow lands, and nothing knocks anyone out. */
const sure = (damage: [number, number], player?: [number, number]): CombatContent => ({
  ...COMBAT,
  classes: Object.fromEntries(Object.entries(COMBAT.classes).map(([k, c]) => [k, { ...c, hit: { reach: 1, close: 1, far: 1 }, damage: k === 'pistol' && player ? player : damage, lethal: 0 }])) as typeof COMBAT.classes,
  carry: { ...COMBAT.carry, chance: { gang: 0, guard: 0, corpo: 0, street: 0, elder: 0 } },
  knockout: { ...COMBAT.knockout, most: 0 },
});
const rulesWith = (join: JoinRules | undefined, combat: CombatContent = COMBAT, police?: PoliceContent): GameRules => ({
  ...TRAVEL,
  energy: ENERGY,
  food: FOOD,
  inebriation: INEBRIATION,
  people: PEOPLE,
  society: SOCIETY,
  lines: LINES,
  charisma: CHARISMA,
  gear: GEAR,
  money: MONEY,
  jobs: JOBS,
  life: LIFE,
  combat,
  clock: clockOf,
  ...(join ? { join } : {}),
  ...(police ? { police } : {}),
});
const lexington: Progress['items'][number] = { id: 'lexington-1', kind: 'weapon', weapon: 'lexington', name: 'M-10AF Lexington', count: 1, in: 'jacket', loaded: 20 };
const progressAt = (b: Building, extra: Partial<Progress> = {}): Progress => ({
  where: { ...streetSpot({ x: b.x + b.w / 2, y: b.y - 0.5 }), building: b.id },
  visited: [],
  discovered: [],
  explored: [],
  eddies: 0,
  passUntil: 0,
  trip: null,
  inside: b.id,
  items: [],
  gear: null,
  money: { bills: 2000, coins: 0, account: 0 },
  energy: null,
  inebriation: null,
  society: null,
  charisma: null,
  job: null,
  life: null,
  ...extra,
});
/** A storefront the NCPD goes to, with a crowd in it at noon and no officer among them. */
const shop = world.buildings.find((b) => {
  if (!b.business || b.kind !== 'shops' || !POLICE.districts[b.district]) return false;
  const here = peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out);
  return here.length >= 5 && here.every((p) => !p.person.job.role.startsWith('NCPD'));
})!;
const play = (join: JoinRules | undefined, combat: CombatContent = COMBAT, extra: Partial<Progress> = {}, police?: PoliceContent) => {
  const game = new Game(world, rulesWith(join, combat, police), progressAt(shop, extra));
  game.start(NOON);
  const here = game.peopleHere(NOON).map((p) => p.person);
  return { game, victim: here[0]!, others: here.slice(1) };
};

describe('fights of more than two', () => {
  it('stays the player and one other with nobody to throw in', () => {
    const { game, victim } = play(undefined);
    game.attack(victim.id, NOON);
    expect(game.fightView()).toMatchObject({ foes: [{ id: victim.id, target: true }], allies: [] });
  });

  it('draws in more of theirs, up to the most a side has, told as they come', () => {
    const { game, victim } = play(EVERYONE);
    game.attack(victim.id, NOON);
    const view = game.fightView()!;
    expect(view.foes).toHaveLength(JOIN.foes);
    expect(view.foes[0]).toMatchObject({ id: victim.id, target: true });
    expect(view.foes.slice(1).every((f) => !f.target)).toBe(true);
    const joined = COMBAT.group.joinThem!.map((l) => new RegExp(l.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*'), 'i'));
    expect(joined.some((re) => re.test(view.log[0] ?? ''))).toBe(true);
    for (const line of view.log) expect(line).not.toMatch(/[{}]|undefined/);
  });

  it('has the rest of them swing at the player while the player goes for the one', () => {
    const { game, victim } = play(EVERYONE, sure([5, 5]), { items: [lexington] });
    game.attack(victim.id, NOON);
    const before = game.fightView()!;
    let t = NOON;
    for (let n = 0; n < 3 && game.fighting; n++) game.fightMove('attack', (t += 1000));
    const after = game.fightView()!;
    // One of them alone could do 5 a beat at most: more of them did more.
    expect(before.you.hp - after.you.hp).toBeGreaterThan(15);
    // Only the one the player's going for took the player's shots.
    for (const f of after.foes.filter((x) => !x.target)) expect(f.hp).toBe(before.foes.find((b) => b.id === f.id)!.max);
  });

  it('lets the player go for another of theirs, and goes on to the next when one is down', () => {
    // The player's pistol drops anyone in one; their fists barely scratch; nobody else comes in once it's on.
    const { game, victim } = play({ ...EVERYONE, perBeat: 0 }, sure([1, 1], [500, 500]), { items: [lexington] });
    game.attack(victim.id, NOON);
    const [, second, third] = game.fightView()!.foes;
    expect(game.fightTarget(third!.id, NOON)).toBe(true);
    expect(game.fightView()!.foes[0]).toMatchObject({ id: third!.id, target: true });
    expect(game.fightView()!.foes.map((f) => f.id)).toContain(victim.id);
    // Down goes the one gone for, and the next is up, until there's nobody left.
    let t = NOON;
    game.fightMove('attack', (t += 1000));
    expect(game.fighting).toBe(true);
    expect(game.fightView()!.foes.map((f) => f.id)).not.toContain(third!.id);
    for (let n = 0; n < 10 && game.fighting; n++) game.fightMove('attack', (t += 1000));
    const view = game.fightView()!;
    expect(view.over).toBe('won');
    // Everyone the player put down is laid up, and the result says so of each.
    for (const id of [victim.id, second!.id, third!.id]) expect(game.person(id)?.hurtUntil).toBeGreaterThan(0);
    expect(view.result.match(/is down/g)?.length).toBe(3);
  });

  it('brings a friend of the player in on their side, fighting one of theirs', () => {
    const first = play(FRIENDS);
    const friend = first.others[0]!;
    const standing: Standing = { met: true, rapport: 80, grudge: 0, at: NOON, talks: 5, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} };
    const { game, victim } = play(FRIENDS, sure([5, 5]), { society: { ...freshSociety(), standings: { [friend.id]: standing } } });
    game.attack(victim.id, NOON);
    expect(game.fightView()!.allies.map((a) => a.id)).toEqual([friend.id]);
    let t = NOON;
    for (let n = 0; n < 2 && game.fighting; n++) game.fightMove('cover', (t += 1000));
    const lines = [...COMBAT.group.allyHit!, ...COMBAT.group.allyMiss!, ...COMBAT.group.allyHurt!].map((l) => new RegExp(l.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*'), 'i'));
    expect(game.fightView()!.log.some((entry) => lines.some((re) => re.test(entry)))).toBe(true);
  });

  it('has the other officer join in when the player fights the NCPD', () => {
    const calling: PoliceContent = { ...POLICE, districts: Object.fromEntries(Object.entries(POLICE.districts).map(([d, how]) => [d, how && { ...how, call: 10 }])), areas: {}, caller: { ...POLICE.caller, crowd: 0, most: 1 } };
    // Nobody else throws in: only the officers, who always do.
    const { game, victim } = play({ ...JOIN, kin: 0, friend: 0, gang: 0, guard: 0, stranger: 0, ally: 0, partner: 0 }, COMBAT, {}, calling);
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t);
    expect(game.answerPolice('fight', t)).toBe(true);
    const foes = game.fightView()!.foes;
    expect(foes).toHaveLength(2);
    for (const f of foes) expect(game.person(f.id)?.job.role).toMatch(/^NCPD /);
  });
});

describe('the lines of a fight of more than two', () => {
  it('fill for anyone, and there are enough of them', () => {
    const vars: Record<string, string> = { who: 'the woman', Who: 'The woman', he: 'she', He: 'She', his: 'her', him: 'her', s: 's', target: 'the man', ally: 'Sam', Ally: 'Sam', foe: 'the man', Foe: 'The man', dmg: '7' };
    for (const [key, pool] of Object.entries(COMBAT.group)) {
      expect(pool.length, key).toBeGreaterThanOrEqual(3);
      for (const line of pool) expect(line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`), `${key}: ${line}`).not.toMatch(/[{}]/);
    }
  });
});

describe('sizing someone up', () => {
  it('shows how they would be in a fight at a look, and how they talk once they have talked a while', () => {
    const { game, victim } = play(undefined);
    const look = game.describe(victim.id, NOON)!;
    expect(PEOPLE.skills!.reads.fight.map(([, word]) => word)).toContain(look.fight);
    expect(look.talk).toBeNull();
    let t = NOON;
    for (let n = 0; n < 6 && game.describe(victim.id, t)!.talk === null; n++) game.talk(victim.id, (t += 20 * 60_000));
    expect(PEOPLE.skills!.reads.talk.map(([, word]) => word)).toContain(game.describe(victim.id, t)!.talk);
  });
});

