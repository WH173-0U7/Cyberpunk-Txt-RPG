import { describe, expect, it } from 'vitest';
import { COMBAT } from '../src/data/combat';
import { CHROME } from '../src/data/cyberware';
import { HACKS } from '../src/data/quickhacks';
import { ARMS } from '../src/data/weapons';
import { createRng } from '../src/engine/rng';
import { hitChance, NO_EDGE, resolveBeat, stepRange, talkOdds, theirMove, type Arm, type Fighter, type FightState, type Move } from '../src/engine/combat';

/**
 * Each quickhack as its page on the Cyberpunk Wiki has it (checked 2026-10-15, through the
 * MediaWiki API): the infobox's title, type, the tier it's first had at and its RAM cost there.
 */
const CANON: Record<string, [string, string, number, number]> = {
  'short-circuit': ['Short Circuit', 'Combat', 1, 3],
  overheat: ['Overheat', 'Combat', 1, 3],
  contagion: ['Contagion', 'Combat', 2, 5],
  'synapse-burnout': ['Synapse Burnout', 'Combat', 3, 10],
  'reboot-optics': ['Reboot Optics', 'Control', 1, 2],
  'weapon-glitch': ['Weapon Glitch', 'Control', 2, 3],
  'cripple-movement': ['Cripple Movement', 'Control', 2, 3],
  'cyberware-malfunction': ['Cyberware Malfunction', 'Control', 2, 3],
};

const lexington: Arm = { id: 'lexington', name: 'M-10AF Lexington', short: 'Lexington', cls: 'pistol', tech: 'Power', magazine: 20 };
const katana: Arm = { id: 'katana', name: 'Katana', short: 'katana', cls: 'katana', magazine: 0 };
const tactician: Arm = { id: 'tactician', name: 'M2038 Tactician', short: 'Tactician', cls: 'shotgun', tech: 'Power', magazine: 8 };

function fighter(arm: Arm, extra: Partial<Fighter> = {}): Fighter {
  return { hp: 100, max: 100, arm, loaded: arm.magazine, spare: arm.magazine, armor: 0, covered: false, blind: 0, jammed: 0, crippled: 0, chromeOff: 0, burn: 0, burning: 0, charges: 0, ...extra };
}

function fight(you: Arm, them: Arm, extra: Partial<FightState> = {}): FightState {
  return { range: 'close', beat: 0, you: fighter(you), them: fighter(them), ram: 5, ramMax: 5, ramSpent: 0, ...extra };
}

const ctx = (seed: string, extra: object = {}) => ({ you: NO_EDGE, them: NO_EDGE, indoors: false, talkOdds: 0.5, rng: createRng(seed), rules: COMBAT, ...extra });

describe('the quickhacks', () => {
  it('are each exactly as the wiki has them: name, type, tier and RAM', () => {
    expect(Object.keys(HACKS.hacks).sort()).toEqual(Object.keys(CANON).sort());
    for (const [id, hack] of Object.entries(HACKS.hacks)) {
      const [name, type, tier, ram] = CANON[id]!;
      expect([hack.name, hack.type, hack.tier, hack.ram], id).toEqual([name, type, tier, ram]);
      expect(hack.price, id).toBeGreaterThan(0);
      expect(Object.keys(hack.effect).length, id).toBeGreaterThan(0);
    }
  });
});

describe('the numbers', () => {
  it('give every class of weapon a way of fighting, and arm the people with real weapons and chrome', () => {
    for (const cls of Object.keys(ARMS.classes)) expect(COMBAT.classes[cls as keyof typeof COMBAT.classes], cls).toBeDefined();
    const pools = [...Object.values(COMBAT.carry.gangs), COMBAT.carry.guard, COMBAT.carry.corpo, COMBAT.carry.street];
    for (const pool of pools) for (const [id] of pool) expect(id === 'fists' || id in ARMS.weapons || COMBAT.chrome[id]?.arm !== undefined, id).toBe(true);
    for (const gang of Object.keys(COMBAT.carry.gangs)) expect(['maelstrom', 'tyger_claws', 'valentinos', 'sixth_street', 'voodoo_boys', 'animals', 'mox', 'scavengers', 'barghest', 'wraiths']).toContain(gang);
    // Every implant a fight knows of is one there is; every arm implant fights; every deck has RAM.
    for (const id of Object.keys(COMBAT.chrome)) expect(CHROME.implants[id], id).toBeDefined();
    for (const [id, implant] of Object.entries(CHROME.implants)) {
      if (implant.part === 'arms') expect(COMBAT.chrome[id]?.arm, id).toBeDefined();
      if (implant.system === 'cyberdeck') expect(COMBAT.chrome[id]?.deck, id).toBeGreaterThan(0);
      if (implant.system === 'sandevistan') expect(COMBAT.chrome[id]?.window, id).toBeGreaterThan(0);
    }
  });

  it('has a line for everything that can happen, with nothing in one but the vars a fight fills', () => {
    const vars = new Set(['who', 'Who', 'he', 'He', 'him', 'his', 'His', 's', 'es', 'ies', 'is', 'has', 'arm', 'theirArm', 'dmg', 'hack', 'took']);
    for (const [key, pool] of Object.entries(COMBAT.lines)) {
      expect(pool.length, key).toBeGreaterThan(0);
      for (const line of pool) for (const [, name] of line.matchAll(/\{(\w+)\}/g)) expect(vars.has(name!), `${key}: {${name}}`).toBe(true);
    }
    const kinds = ['Shoot', 'Cut', 'Bash', 'Punch', 'Lash', 'Blast'];
    const needed = [...kinds.flatMap((k) => [`you${k}`, `they${k}`]), 'youMissShot', 'youMissSwing', 'youMissPunch', 'theyMissShot', 'theyMissSwing', 'theyMissPunch', 'youAdvance', 'theyAdvance', 'youBack', 'theyBack', 'youCover', 'theyCover', 'youReload', 'theyReload', 'youFreeze', 'youEmpty', 'theyEmpty', 'theyJammed', 'youStuck', 'theyStuck', 'youReachless', 'theyReachless', 'youTalkOk', 'youTalkNo', 'theyBackDown', 'theyBegIgnored', 'youRunOk', 'youRunNo', 'theyRunOk', 'theyRunNo', 'hackDamage', 'hackBurn', 'hackBlind', 'hackJam', 'hackCripple', 'hackChrome', 'youBurn', 'theyBurn', 'start', 'theyDown', 'theyDie', 'trauma', 'youDown', 'revive', 'robbed', 'tellAttack', 'tellAdvance', 'tellBack', 'tellCover', 'tellRun', 'tellTalk'];
    for (const key of needed) expect(COMBAT.lines[key], key).toBeDefined();
  });
});

describe('a beat', () => {
  it('lands both moves at once, the same way for the same dice', () => {
    const state = fight(lexington, lexington);
    const a = resolveBeat(state, 'attack', 'attack', ctx('a'));
    expect(resolveBeat(state, 'attack', 'attack', ctx('a'))).toEqual(a);
    expect(a.state.beat).toBe(1);
    // Both fired: two rounds each from a pistol.
    expect(a.state.you.loaded).toBe(18);
    expect(a.state.them.loaded).toBe(18);
    expect(a.events.filter((e) => e.what === 'hit' || e.what === 'miss').map((e) => e.who).sort()).toEqual(['them', 'you']);
    // The state it came from is untouched.
    expect(state.you.loaded).toBe(20);
  });

  it('moves the range a step in or out, never past arm\'s reach or out of a room indoors', () => {
    expect(stepRange('close', -1)).toBe('reach');
    expect(stepRange('reach', -1)).toBe('reach');
    expect(stepRange('close', 1, 'close')).toBe('close');
    const closing = resolveBeat(fight(katana, lexington), 'advance', 'attack', ctx('b'));
    expect(closing.state.range).toBe('reach');
    // Both stepping in at once covers two steps, as far as there is.
    expect(resolveBeat(fight(katana, katana, { range: 'far' }), 'advance', 'advance', ctx('c')).state.range).toBe('reach');
    expect(resolveBeat(fight(lexington, katana), 'back', 'back', ctx('d', { indoors: true })).state.range).toBe('close');
  });

  it('gives a blade nothing to hit from across a room, and a shotgun the most up close', () => {
    const blade = resolveBeat(fight(katana, lexington), 'attack', 'cover', ctx('e'));
    expect(blade.events).toContainEqual({ who: 'you', what: 'outOfReach' });
    const near = hitChance(fighter(tactician), NO_EDGE, fighter(katana), NO_EDGE, 'attack', 'reach', 2, COMBAT);
    const far = hitChance(fighter(tactician), NO_EDGE, fighter(katana), NO_EDGE, 'attack', 'far', 2, COMBAT);
    expect(near).toBeGreaterThan(far * 3);
  });

  it('makes cover harder to hit and reloads behind it; a run gets away more often from further off', () => {
    const open = hitChance(fighter(lexington), NO_EDGE, fighter(lexington), NO_EDGE, 'attack', 'close', 2, COMBAT);
    const covered = hitChance(fighter(lexington), NO_EDGE, fighter(lexington), NO_EDGE, 'cover', 'close', 2, COMBAT);
    expect(covered).toBeLessThan(open / 2);
    const reload = resolveBeat(fight(lexington, katana, { you: fighter(lexington, { loaded: 2, spare: 10 }) }), 'cover', 'advance', ctx('f'));
    expect(reload.state.you).toMatchObject({ loaded: 12, spare: 0, covered: true });
    let farAway = 0;
    let upClose = 0;
    for (let n = 0; n < 200; n++) {
      if (resolveBeat(fight(lexington, katana, { range: 'far' }), 'run', 'cover', ctx(`r${n}`)).fled === 'you') farAway++;
      if (resolveBeat(fight(lexington, katana, { range: 'reach' }), 'run', 'advance', ctx(`r${n}`)).fled === 'you') upClose++;
    }
    expect(farAway).toBeGreaterThan(upClose * 2);
  });

  it('lands a quickhack whatever the range, spending its RAM; a jammed gun and crippled legs do nothing', () => {
    const glitch = { id: 'weapon-glitch', ram: 3, effect: HACKS.hacks['weapon-glitch']!.effect };
    const hacked = resolveBeat(fight(katana, lexington, { range: 'far' }), 'hack', 'attack', ctx('g', { hack: glitch }));
    expect(hacked.state.ram).toBe(5 - 3 + COMBAT.ramPerBeat);
    expect(hacked.state.them.jammed).toBe(2);
    expect(resolveBeat(hacked.state, 'cover', 'attack', ctx('h')).events).toContainEqual({ who: 'them', what: 'jammed' });
    const cripple = { id: 'cripple-movement', ram: 3, effect: HACKS.hacks['cripple-movement']!.effect };
    const stuck = resolveBeat(fight(lexington, katana), 'hack', 'cover', ctx('i', { hack: cripple }));
    const next = resolveBeat(stuck.state, 'cover', 'advance', ctx('j'));
    expect(next.events).toContainEqual({ who: 'them', what: 'stuck' });
    expect(next.state.range).toBe('close');
    // Too little RAM, and nothing happens.
    const burnout = { id: 'synapse-burnout', ram: 10, effect: HACKS.hacks['synapse-burnout']!.effect };
    expect(resolveBeat(fight(lexington, katana), 'hack', 'cover', ctx('k', { hack: burnout })).events.some((e) => e.what === 'hack')).toBe(false);
    // Something burning keeps burning.
    const overheat = { id: 'overheat', ram: 3, effect: HACKS.hacks.overheat!.effect };
    const lit = resolveBeat(fight(lexington, katana), 'hack', 'cover', ctx('l', { hack: overheat }));
    const after = resolveBeat(lit.state, 'cover', 'cover', ctx('m'));
    expect(after.events).toContainEqual({ who: 'them', what: 'burn', dmg: 7 });
  });

  it('talks someone down when they let it, and they back down when they break', () => {
    const calm = resolveBeat(fight(lexington, katana), 'talk', 'cover', ctx('n', { talkOdds: 1 }));
    expect(calm.talked).toBe(true);
    const ignored = resolveBeat(fight(lexington, katana), 'attack', 'talk', ctx('o'));
    expect(ignored.events).toContainEqual({ who: 'them', what: 'talk', ok: false });
    const coward = { courage: 0.1, temper: 0.1 };
    const brave = { courage: 0.9, temper: 0.9 };
    expect(talkOdds(fight(lexington, katana), coward, 1, true, COMBAT)).toBeGreaterThan(talkOdds(fight(lexington, katana), brave, 1, false, COMBAT));
  });
});

describe('their moves', () => {
  it('close in with a blade, attack in reach, reload an empty gun, and break when it goes badly', () => {
    const rng = createRng('t');
    const nerve = { courage: 0.6, temper: 0.6 };
    expect(theirMove(fight(lexington, katana), nerve, false, rng, COMBAT)).toBe('advance');
    expect(theirMove(fight(lexington, katana, { range: 'reach' }), nerve, false, rng, COMBAT)).toBe('attack');
    expect(theirMove(fight(katana, lexington, { them: fighter(lexington, { loaded: 0, spare: 20 }) }), nerve, false, rng, COMBAT)).toBe('cover');
    const moves = new Set<Move>();
    for (let n = 0; n < 50; n++) moves.add(theirMove(fight(lexington, lexington, { them: fighter(lexington, { hp: 10 }) }), { courage: 0.05, temper: 0.2 }, false, createRng(`b${n}`), COMBAT));
    expect([...moves].some((m) => m === 'run' || m === 'talk')).toBe(true);
  });
});
