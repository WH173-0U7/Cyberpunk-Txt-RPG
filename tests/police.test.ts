import { describe, expect, it } from 'vitest';
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
import { POLICE } from '../src/data/police';
import { CHARISMA } from '../src/data/skills';
import { SOCIETY } from '../src/data/society';
import { TRAVEL } from '../src/data/travel';
import { Game, streetSpot, type GameRules } from '../src/engine/game';
import { generateWorld } from '../src/engine/generate';
import { generatePeople, peopleAt, type Clock, type Person } from '../src/engine/people';
import { chargesFor, policing, type PoliceContent, type PoliceState } from '../src/engine/police';
import { createSave, readSave, resume, type Progress } from '../src/engine/save';
import { freshSociety, type Standing } from '../src/engine/society';
import type { Building } from '../src/engine/types';

const world = generateWorld('7f3a29c1', CITY);
const population = generatePeople(world, PEOPLE, FOOD.dishes);
const MINUTE = 60_000;
const clockOf = (now: number): Clock => ({ hour: new Date(now).getUTCHours(), weekday: new Date(now).getUTCDay(), day: Math.floor(now / 86_400_000) });
/** A weekday at noon: storefronts open, people about. */
const NOON = Date.UTC(2077, 9, 13, 12, 0);
const ts = TRAVEL.timeScale;

/** The NCPD with every witness calling: anyone who sees anything (but a ganger on their own turf) picks up the phone. */
const CALLING: PoliceContent = {
  ...POLICE,
  districts: Object.fromEntries(Object.entries(POLICE.districts).map(([d, how]) => [d, how && { ...how, call: 10 }])),
  areas: {},
  caller: { ...POLICE.caller, crowd: 0, most: 1 },
};
/** The NCPD nobody calls. */
const QUIET: PoliceContent = {
  ...POLICE,
  districts: Object.fromEntries(Object.entries(POLICE.districts).map(([d, how]) => [d, how && { ...how, call: 0 }])),
};
const rulesWith = (police: PoliceContent, combat = COMBAT): GameRules => ({ ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat, clock: clockOf, police });

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

/** A storefront in a district (one the NCPD goes to, unless said) with a few people in it at noon, none of them NCPD. */
const busy = (policed = true): Building => {
  const found = world.buildings.find((b) => {
    if (!b.business || b.kind !== 'shops') return false;
    if (Boolean(POLICE.districts[b.district]) !== policed) return false;
    const here = peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(NOON), FOOD.dishes, PEOPLE.out);
    return here.length >= 3 && here.every((p) => !p.person.job.role.startsWith('NCPD'));
  });
  if (!found) throw new Error('no busy storefront');
  return found;
};

const play = (b: Building, police: PoliceContent, extra: Partial<Progress> = {}, combat = COMBAT) => {
  const game = new Game(world, rulesWith(police, combat), progressAt(b, extra));
  const said: string[] = [];
  game.events.on('output', ({ text }) => said.push(text));
  game.start(NOON);
  const here = game.peopleHere(NOON);
  const victim = here.find((p) => p.doing !== 'out cold')?.person as Person;
  return { game, said, victim, others: here.map((p) => p.person).filter((p) => p.id !== victim.id) };
};

/** Anyone who'd met the player before, as a save has it. */
const metAll = (people: Person[]): Partial<Progress> => {
  const standing: Standing = { met: true, rapport: 0, grudge: 0, at: NOON, talks: 1, lastTalkAt: 0, gifts: 0, lastGiftAt: 0, robbedAt: 0, asks: 0, refused: {} };
  return { society: { ...freshSociety(), standings: Object.fromEntries(people.map((p) => [p.id, { ...standing }])) } };
};
/** Whether something said is one of a pool's lines, whatever filled it. */
const said = (lines: string[], pool: string[]) => {
  const res = pool.map((p) => new RegExp(p.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*'), 'i'));
  return lines.some((l) => res.some((re) => re.test(l)));
};

describe('the NCPD', () => {
  const shop = busy();

  it('has nothing on record when nobody calls it in, however many saw', () => {
    const { game, said: out, victim } = play(shop, QUIET);
    expect(game.rob(victim.id, NOON)).toBe(true);
    expect(game.police(NOON)).toMatchObject({ reports: 0, dispatch: null, warrants: [] });
    expect(said(out, [...POLICE.lines.noCall, ...POLICE.lines.turf])).toBe(true);
  });

  it('sends a unit on the district clock when someone calls, and holds the player at gunpoint if they are still there', () => {
    const { game, said: out, victim } = play(shop, CALLING);
    game.rob(victim.id, NOON);
    const police = game.police(NOON);
    expect(police.reports).toBe(1);
    expect(said(out, POLICE.lines.calls)).toBe(true);
    // Whoever called is named mid-sentence as they would be: "Behind you, the woman…", never "Behind you, A woman…".
    for (const line of out) expect(line).not.toMatch(/[a-z,] An? [a-z]/);
    const how = policing(shop.district, game.neighborhoodOf(game.whereabouts), CALLING)!;
    const urgency = POLICE.urgency.robbery;
    expect(police.dispatch?.crime).toBe('robbery');
    expect(police.dispatch!.arriveAt).toBeGreaterThanOrEqual(NOON + (how.minutes[0] * urgency * MINUTE) / ts - 1);
    expect(police.dispatch!.arriveAt).toBeLessThanOrEqual(NOON + (how.minutes[1] * urgency * MINUTE) / ts + 1);
    // The two coming are real officers of the NCPD.
    const unit = game.policeSaved.dispatch!.officers;
    expect(unit).toHaveLength(2);
    for (const id of unit) expect(game.person(id)?.job.role).toMatch(/^NCPD /);
    // Strangers saw it: nobody can name the player, so no warrant.
    expect(police.warrants).toEqual([]);
    const t = police.dispatch!.arriveAt + 1;
    game.tick(t);
    const confront = game.police(t).confront;
    expect(confront).toMatchObject({ crime: 'robbery', why: 'scene' });
    expect(confront?.choices.map((c) => c.id)).toEqual(['comply', 'run', 'fight']);
    expect(game.peopleHere(t).filter((p) => unit.includes(p.person.id)).map((p) => p.doing)).toEqual(['holding a gun on you', 'holding a gun on you']);
    // Nowhere to go and nothing else to do till it's settled.
    expect(game.leave()).toBe(false);
    expect(game.menu(t)).toBeNull();
    expect(game.rob(victim.id, t)).toBe(false);
    expect(game.attack(victim.id, t)).toBe(false);
  });

  it('fines the player for going quietly, and holds them for a robbery, in a cell where nothing can be done till they let them out', () => {
    const { game, said: out, victim } = play(shop, CALLING);
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t);
    const cash = game.wallet.eddies;
    expect(game.answerPolice('comply', t)).toBe(true);
    expect(game.wallet.eddies).toBe(cash - POLICE.crimes.robbery.fine);
    const police = game.police(t);
    expect(police.confront).toBeNull();
    expect(police.held).toBe(t + (POLICE.crimes.robbery.hold * MINUTE) / ts);
    expect(game.interior).toBeNull();
    expect(game.peopleHere(t)).toEqual([]);
    expect(game.enter(t)).toBe(false);
    expect(said(out, POLICE.lines.held)).toBe(true);
    game.tick(police.held! + 1);
    expect(game.police(police.held! + 1).held).toBeNull();
    expect(said(out, POLICE.lines.released)).toBe(true);
    expect(game.enter(police.held! + 1)).toBe(true);
  });

  it('holds the player longer instead of a fine they cannot pay', () => {
    const { game, victim } = play(shop, CALLING, { money: { bills: 0, coins: 0, account: 0 } });
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t);
    const cash = game.wallet.eddies;
    const charges = chargesFor(['robbery'], POLICE);
    expect(cash).toBeLessThan(charges.fine);
    expect(game.police(t).confront?.choices[0]?.sub).toContain('held');
    game.answerPolice('comply', t);
    expect(game.wallet.eddies).toBe(cash);
    expect(game.police(t).held).toBe(t + ((charges.hold + POLICE.shortHold) * MINUTE) / ts);
  });

  it('puts a name to the face only when a caller had met the player, and to nobody in a mask', () => {
    const first = play(shop, CALLING);
    const known = play(shop, CALLING, metAll([first.victim, ...first.others]));
    known.game.rob(known.victim.id, NOON);
    expect(known.game.police(NOON).warrants.map((w) => w.crime)).toEqual(['robbery']);
    expect(known.game.policeSaved.reports[0]).toMatchObject({ named: true, seen: 'your face' });
    const masked = play(shop, CALLING, { ...metAll([first.victim, ...first.others]), gear: [...GEAR.start, { id: 'nami-balaclava-1', kind: 'nami-balaclava', in: null }] });
    expect(masked.game.masked()?.word).toBe('balaclava');
    masked.game.rob(masked.victim.id, NOON);
    expect(masked.game.police(NOON).warrants).toEqual([]);
    expect(masked.game.policeSaved.reports[0]).toMatchObject({ named: false, seen: 'a balaclava' });
  });

  it('never gets called in Pacifica or the Badlands: nobody there has anyone to call', () => {
    const zone = busy(false);
    const { game, said: out, victim } = play(zone, CALLING);
    game.rob(victim.id, NOON);
    expect(game.police(NOON)).toMatchObject({ reports: 0, dispatch: null });
    expect(said(out, POLICE.lines.zone)).toBe(true);
  });

  it('misses the player who is gone by the time the unit gets there', () => {
    const { game, said: out, victim } = play(shop, CALLING);
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    expect(game.leave()).toBe(true);
    game.tick(t);
    expect(game.police(t)).toMatchObject({ confront: null, dispatch: null, reports: 1 });
    expect(said(out, POLICE.lines.missed)).toBe(true);
  });

  it('lets the player run for it, with a warrant for the face they saw; caught, they hold them longer', () => {
    const away = play(shop, { ...CALLING, run: { ...POLICE.run, base: 1 } });
    away.game.rob(away.victim.id, NOON);
    let t = away.game.police(NOON).dispatch!.arriveAt + 1;
    away.game.tick(t);
    expect(away.game.answerPolice('run', t)).toBe(true);
    expect(away.game.police(t)).toMatchObject({ confront: null, held: null });
    expect(away.game.police(t).warrants.map((w) => w.crime)).toEqual(['robbery']);
    expect(away.game.interior).toBeNull();
    const caught = play(shop, { ...CALLING, run: { ...POLICE.run, base: -1 } });
    caught.game.rob(caught.victim.id, NOON);
    t = caught.game.police(NOON).dispatch!.arriveAt + 1;
    caught.game.tick(t);
    caught.game.answerPolice('run', t);
    expect(caught.game.police(t).held).toBe(t + ((POLICE.crimes.robbery.hold + POLICE.run.resisting) * MINUTE) / ts);
    expect(caught.game.police(t).warrants).toEqual([]);
  });

  it('has the other officer call in backup when the player goes for one', () => {
    const { game, victim } = play(shop, CALLING);
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t);
    expect(game.answerPolice('fight', t)).toBe(true);
    expect(game.fighting).toBe(true);
    expect(game.fightWith && game.person(game.fightWith)?.job.role).toMatch(/^NCPD /);
    const police = game.police(t);
    expect(police.confront).toBeNull();
    expect(police.dispatch?.crime).toBe('assault');
    // An officer has the player's face on file: assaulting one is a warrant.
    expect(police.warrants.map((w) => w.crime).sort()).toEqual(['assault', 'robbery']);
  });

  it('keeps officers on the player through a save', () => {
    const { game, victim } = play(shop, CALLING);
    game.rob(victim.id, NOON);
    const t = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t);
    const save = readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, 0, t))))!;
    const again = new Game(world, rulesWith(CALLING), resume(world, save)!);
    expect(again.policeSaved).toEqual(game.policeSaved);
    expect(again.police(t).confront?.crime).toBe('robbery');
    expect(again.peopleHere(t).filter((p) => p.doing === 'holding a gun on you')).toHaveLength(2);
  });

  it('stops a wanted player out on the streets now and then, and lets a warrant lapse in its time', () => {
    const place = Object.values(world.locations).find((l) => POLICE.districts[l.district] && l.kind !== 'hospital')!;
    const wanted: PoliceState = { reports: [], dispatch: null, warrants: [{ crime: 'assault', district: place.district, since: NOON - MINUTE, until: NOON + (7 * 24 * 60 * MINUTE) / ts }], held: null, confront: null, pending: [], lastStop: 0, nextId: 1 };
    const always = { ...POLICE, stop: { ...POLICE.stop, chance: 100 } };
    const game = new Game(world, rulesWith(always), { ...progressAt(world.buildings[0]!), where: { ...streetSpot(place), place: place.id }, inside: null, police: wanted });
    game.start(NOON);
    game.tick(NOON + 1);
    expect(game.police(NOON + 1).confront).toMatchObject({ why: 'warrant', crime: 'assault' });
    // Indoors, nobody stops them; and the warrant runs out.
    const hiding = new Game(world, rulesWith(always), progressAt(shop, { police: wanted }));
    const out: string[] = [];
    hiding.events.on('output', ({ text }) => out.push(text));
    hiding.start(NOON);
    hiding.tick(NOON + 1);
    expect(hiding.police(NOON + 1).confront).toBeNull();
    const later = wanted.warrants[0]!.until! + 1;
    hiding.tick(later);
    expect(hiding.police(later).warrants).toEqual([]);
    expect(said(out, POLICE.lines.lapsed)).toBe(true);
  });

  it('sends backup to the corner of the street where the player went for an officer, and finds them still standing there', () => {
    const door = world.buildings.find((b) => b.district === 'westbrook' && b.kind === 'shops')!;
    const corner = streetSpot({ x: door.x + door.w / 2, y: door.y - 0.5 });
    const wanted: PoliceState = { reports: [], dispatch: null, warrants: [{ crime: 'assault', district: 'westbrook', since: NOON - MINUTE, until: null }], held: null, confront: null, pending: [], lastStop: 0, nextId: 1 };
    const always = { ...POLICE, stop: { ...POLICE.stop, chance: 100 } };
    const game = new Game(world, rulesWith(always), { ...progressAt(door), where: corner, inside: null, police: wanted });
    game.start(NOON);
    game.tick(NOON + 1);
    expect(game.police(NOON + 1).confront?.why).toBe('warrant');
    // On the street, the officers are here all the same.
    expect(game.peopleHere(NOON + 1)).toHaveLength(2);
    expect(game.answerPolice('fight', NOON + 1)).toBe(true);
    const unit = game.policeSaved.dispatch;
    expect(unit).toMatchObject({ spot: null, x: corner.x, y: corner.y, crime: 'assault', told: true });
    let t = NOON + 1;
    for (let n = 0; n < 40 && game.fighting; n++) game.fightMove('cover', (t += 1000));
    const over = game.fightView()?.over;
    game.leaveFight();
    if (over === 'lost' || over === 'knocked') {
      // Put down by an officer: in cuffs, not robbed, and taken in.
      expect(game.fightView()).toBeNull();
      expect(game.police(t).held).toBeGreaterThan(t);
      return;
    }
    game.tick(unit!.arriveAt + 1);
    expect(game.police(unit!.arriveAt + 1).confront?.why).toBe('scene');
  });

  it('takes the player in, pockets and all, when an officer puts them down', () => {
    const { game, victim } = play(shop, CALLING, { items: [] });
    game.rob(victim.id, NOON);
    const t0 = game.police(NOON).dispatch!.arriveAt + 1;
    game.tick(t0);
    const cash = game.wallet.eddies;
    // Officers hit hard here, and the player can't hit back.
    const brutal = { ...COMBAT, classes: Object.fromEntries(Object.entries(COMBAT.classes).map(([k, c]) => [k, { ...c, hit: { reach: 1, close: 1, far: 1 }, damage: [500, 500] as [number, number], lethal: 0 }])) as typeof COMBAT.classes };
    const hard = new Game(world, rulesWith(CALLING, brutal), resume(world, readSave(JSON.parse(JSON.stringify(createSave(world.seed, game, 0, t0))))!)!);
    hard.start(t0);
    hard.answerPolice('fight', t0);
    let t = t0;
    for (let n = 0; n < 40 && hard.fighting; n++) hard.fightMove('cover', (t += 1000));
    expect(hard.fightView()?.over).toMatch(/lost|knocked/);
    expect(hard.fightView()?.result).toContain('in cuffs');
    const police = hard.police(t);
    expect(police.held).toBeGreaterThan(t);
    // The fine for the robbery and the assault, nobody's hands in their pockets.
    const fine = chargesFor(['robbery', 'assault'], POLICE).fine;
    expect(hard.wallet.eddies).toBe(cash >= fine ? cash - fine : cash);
  });

  it('has someone knocked out cold call it in once they come to', () => {
    // Everyone fights with their fists, every blow lands, and a blow that lands knocks someone out cold.
    const knockouts = {
      ...COMBAT,
      classes: Object.fromEntries(Object.entries(COMBAT.classes).map(([k, c]) => [k, { ...c, hit: { reach: 1, close: 1, far: 1 }, damage: [5, 5] as [number, number], lethal: 0 }])) as typeof COMBAT.classes,
      carry: { ...COMBAT.carry, chance: { gang: 0, guard: 0, corpo: 0, street: 0, elder: 0 } },
      knockout: { ...COMBAT.knockout, kinds: { fists: 100, blunt: 100 }, least: 0, most: 1, minutes: [10, 10] as [number, number] },
    };
    const { game, victim } = play(shop, CALLING, {}, knockouts);
    game.attack(victim.id, NOON);
    let t = NOON;
    for (let n = 0; n < 30 && game.fighting; n++) game.fightMove('attack', (t += 1000));
    expect(game.fightView()?.over).toBe('out');
    game.leaveFight();
    expect(game.policeSaved.pending.map((p) => p.person)).toEqual([victim.id]);
    const reports = game.police(t).reports;
    const later = t + 11 * MINUTE;
    game.tick(later);
    expect(game.policeSaved.pending).toEqual([]);
    expect(game.police(later).reports).toBeGreaterThanOrEqual(reports);
  });
});

describe('killing someone out cold', () => {
  const shop = busy();
  /** Every blow lands and knocks someone out cold, whatever it's made with; nobody fights back with anything but fists. */
  const knockouts = (finish = COMBAT.finish) => ({
    ...COMBAT,
    classes: Object.fromEntries(Object.entries(COMBAT.classes).map(([k, c]) => [k, { ...c, hit: { reach: 1, close: 1, far: 1 }, damage: [5, 5] as [number, number], lethal: 0 }])) as typeof COMBAT.classes,
    carry: { ...COMBAT.carry, chance: { gang: 0, guard: 0, corpo: 0, street: 0, elder: 0 } },
    knockout: { ...COMBAT.knockout, kinds: { fists: 100, blunt: 100, blade: 100, gun: 100, wire: 100 }, least: 0, most: 1, minutes: [30, 30] as [number, number] },
    finish,
  });
  const nobodyStops = { ...COMBAT.finish, intervene: { ...COMBAT.finish.intervene, base: 0 } };
  const knife: Progress['items'][number] = { id: 'knife', kind: 'weapon', weapon: 'knife', name: 'Knife', count: 1, in: 'jacket' };
  const lexington: Progress['items'][number] = { id: 'lexington-1', kind: 'weapon', weapon: 'lexington', name: 'M-10AF Lexington', count: 1, in: 'jacket', loaded: 20 };
  /** The player knocks someone out cold at the shop, carrying what's said. */
  const knockedOut = (items: Progress['items'], finish = nobodyStops, police = QUIET, extra: Partial<Progress> = {}) => {
    const { game, said: out, victim } = play(shop, police, { items, ...extra }, knockouts(finish));
    game.attack(victim.id, NOON);
    let t = NOON;
    for (let n = 0; n < 30 && game.fighting; n++) game.fightMove('attack', (t += 1000));
    if (game.fightView()?.over !== 'out') throw new Error(`not out cold: ${game.fightView()?.over}`);
    game.leaveFight();
    return { game, out, victim, t };
  };

  it('offers the ways the player has to do it: bare hands always, and a blade, a loaded gun, chrome', () => {
    const bare = knockedOut([]);
    expect(bare.game.finishes(bare.victim.id, bare.t).map((f) => f.id)).toEqual(['choke', 'stomp']);
    const armed = knockedOut([knife, lexington]);
    expect(armed.game.finishes(armed.victim.id, armed.t).map((f) => [f.id, f.with])).toEqual([['choke', 'your hands'], ['stomp', 'your hands'], ['cut', 'knife'], ['shoot', 'Lexington']]);
    // An empty gun shoots nobody.
    const empty = knockedOut([{ ...lexington, loaded: 0 }]);
    expect(empty.game.finishes(empty.victim.id, empty.t).map((f) => f.id)).not.toContain('shoot');
    const bladed = knockedOut([], nobodyStops, QUIET, { chrome: [{ id: 'mantis-blades', since: 0 }] });
    expect(bladed.game.finishes(bladed.victim.id, bladed.t).find((f) => f.id === 'cut')?.with).toBe('Mantis Blades');
    // Someone awake gets none of it.
    const awake = play(shop, QUIET);
    expect(awake.game.finishes(awake.victim.id, NOON)).toEqual([]);
    expect(awake.game.killCold(awake.victim.id, 'choke', NOON)).toBe(false);
  });

  it('kills them the way chosen, told the way it was done: a murder, and a round gone for a shot', () => {
    const { game, out, victim, t } = knockedOut([lexington]);
    const loaded = game.inventory.find((i) => i.id === 'lexington-1')!.loaded!;
    expect(game.killCold(victim.id, 'shoot', t)).toBe(true);
    expect(victim.diedOn).toBe(Math.floor(t / 86_400_000));
    expect(game.lifeSaved.dead[victim.id]).toBe(victim.diedOn);
    expect(game.outCold(victim.id, t)).toBe(false);
    expect(game.peopleHere(t).some((p) => p.person.id === victim.id)).toBe(false);
    expect(game.societySaved.incidents.map((i) => i.kind)).toEqual(['assault', 'murder']);
    expect(game.inventory.find((i) => i.id === 'lexington-1')?.loaded).toBe(loaded - 1);
    expect(said(out, COMBAT.finish.ways.shoot.lines)).toBe(true);
    expect(out.some((l) => /is dead\.$/.test(l))).toBe(true);
    for (const line of out) expect(line).not.toMatch(/[{}]|undefined/);
    // Done is done.
    expect(game.killCold(victim.id, 'choke', t)).toBe(false);
  });

  it('can be stopped by someone here, who takes the player on instead, and it is an assault all the same', () => {
    const always = { ...COMBAT.finish, intervene: { ...COMBAT.finish.intervene, base: 100, most: 1 } };
    const { game, out, victim, t } = knockedOut([], always);
    expect(game.killCold(victim.id, 'choke', t)).toBe(true);
    expect(victim.diedOn).toBeUndefined();
    expect(game.outCold(victim.id, t)).toBe(true);
    expect(game.fighting).toBe(true);
    expect(game.fightWith).not.toBe(victim.id);
    expect(game.fightView()?.log[0]).toMatch(new RegExp(COMBAT.finish.stopped.map((l) => l.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*')).join('|'), 'i'));
    expect(game.societySaved.incidents.map((i) => i.kind)).toEqual(['assault', 'assault']);
    expect(out.some((l) => /is dead/.test(l))).toBe(false);
  });

  it('is stopped by an NCPD officer in the room, who draws on the player', () => {
    // Somewhere an officer is, off duty, with someone else to knock out.
    let found: { b: Building; at: number } | null = null;
    for (let hour = 10; hour < 22 && !found; hour++) {
      const at = Date.UTC(2077, 9, 13, hour, 0);
      for (const b of world.buildings) {
        if (!b.business || b.kind !== 'shops') continue;
        const here = peopleAt(population, world, { kind: 'building', id: b.id }, clockOf(at), FOOD.dishes, PEOPLE.out);
        if (here.length >= 2 && here.some((p) => p.person.job.role.startsWith('NCPD')) && here.some((p) => !p.person.job.role.startsWith('NCPD'))) {
          found = { b, at };
          break;
        }
      }
    }
    if (!found) throw new Error('no officer anywhere');
    const game = new Game(world, rulesWith(CALLING, knockouts(nobodyStops)), progressAt(found.b, { items: [] }));
    game.start(found.at);
    const victim = game.peopleHere(found.at).find((p) => !p.person.job.role.startsWith('NCPD'))!.person;
    game.attack(victim.id, found.at);
    let t = found.at;
    for (let n = 0; n < 30 && game.fighting; n++) game.fightMove('attack', (t += 1000));
    expect(game.fightView()?.over).toBe('out');
    game.leaveFight();
    // The officer saw the fight and called it in, but it's the killing they step in for.
    expect(game.police(t).confront).toBeNull();
    expect(game.killCold(victim.id, 'stomp', t)).toBe(true);
    expect(victim.diedOn).toBeUndefined();
    expect(game.police(t).confront).toMatchObject({ crime: 'assault', why: 'scene' });
    expect(game.fighting).toBe(false);
  });
});

describe('the lines for killing someone out cold', () => {
  it('fill for anyone, whatever pronouns they go by, and there are enough of them', () => {
    const forms = [
      { he: 'she', He: 'She', him: 'her', his: 'her', His: 'Her', s: 's', es: 'es' },
      { he: 'he', He: 'He', him: 'him', his: 'his', His: 'His', s: 's', es: 'es' },
      { he: 'they', He: 'They', him: 'them', his: 'their', His: 'Their', s: '', es: '' },
    ];
    const pools = [...Object.values(COMBAT.finish.ways).map((w) => w.lines), COMBAT.finish.stopped];
    for (const pool of pools) {
      expect(pool.length).toBeGreaterThanOrEqual(4);
      for (const line of pool) {
        for (const form of forms) {
          const text = line.replace(/\{(\w+)\}/g, (_, k: string) => ({ ...form, who: 'the woman', Who: 'The woman', weapon: 'knife' } as Record<string, string>)[k] ?? `{${k}}`);
          expect(text, line).not.toMatch(/[{}]/);
        }
        // A verb ending only ever goes with a {he} earlier in the sentence.
        for (const m of line.matchAll(/\{(s|es)\}/g)) expect(line.slice(0, m.index).match(/\{[Hh]e\}[^.!?]*$/), line).toBeTruthy();
      }
    }
  });
});

