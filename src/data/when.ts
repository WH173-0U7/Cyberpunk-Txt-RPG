import type { Fragment, When } from '../engine/dialogue';

/**
 * The conditions lines are picked by, shared by every file of lines: `only(text, when)` fits the
 * people it says, `loud` wins over the plain ones whenever it fits, `vague` gives way to the ones
 * that say more, and `both` adds conditions up (what must be filled and what must be empty too).
 */
export const only = (text: string, when: When): Fragment => ({ text, when });
/** A line that should win over the plain ones whenever it fits. */
export const loud = (text: string, when: When, weight = 6): Fragment => ({ text, when, weight });
/** A line for when nothing more particular fits: it gives way to the ones that say more. */
export const vague = (text: string, when: When): Fragment => ({ text, when, weight: 0.3 });

// Who they are.
export const ganger: When = { voice: ['gang'] };
export const corpo: When = { voice: ['corpo'] };
export const nomad: When = { voice: ['nomad'] };
export const elder: When = { voice: ['elder'] };
export const young: When = { voice: ['young'] };
// What they're doing.
export const busy: When = { mood: ['busy'] };
export const eating: When = { mood: ['eating'] };
export const drinking: When = { mood: ['drinking'] };
export const court: When = { mood: ['court'] };
export const home: When = { mood: ['home'] };
// How they feel about the player.
export const wary: When = { stance: ['wary'] };
export const neutral: When = { stance: ['neutral'] };
export const warm: When = { stance: ['warm', 'friend'] };
export const friend: When = { stance: ['friend'] };
export const cold: When = { stance: ['cold'] };
// How well they know the player.
export const first: When = { history: ['first'] };
export const recent: When = { history: ['recent'] };
export const regular: When = { history: ['regular'] };
export const long: When = { history: ['long'] };
// Their nature.
export const chatty: When = { traits: { chatty: 'high' } };
export const quiet: When = { traits: { chatty: 'low' } };
export const hot: When = { traits: { temper: 'high' } };
export const kind: When = { traits: { warmth: 'high' } };
export const hard: When = { traits: { warmth: 'low' } };
export const greedy: When = { traits: { greed: 'high' } };
export const brave: When = { traits: { courage: 'high' } };
export const timid: When = { traits: { courage: 'low' } };
export const loyal: When = { traits: { loyalty: 'high' } };
// The moment: a mask on the player, or a face.
export const masked: When = { needs: ['mask'] };
export const bare: When = { lacks: ['mask'] };
// What the player pulls in a robbery: a gun, a blade, a club, or nothing but their hands.
export const gunDrawn: When = { needs: ['gun'] };
export const bladeDrawn: When = { needs: ['blade'] };
export const bluntDrawn: When = { needs: ['blunt'] };
export const armed: When = { needs: ['weapon'] };
export const unarmed: When = { lacks: ['weapon'] };
// The heart: whom they're drawn to, spoken for, seeing the player, sweet on them, the player's look their type.
export const hasType: When = { needs: ['typeWho'] };
export const noType: When = { needs: ['typeNone'] };
export const spokenFor: When = { needs: ['taken'] };
export const yours: When = { needs: ['withYou'] };
export const notDrawn: When = { lacks: ['drawn'] };
// The moment: the player drunk, the speaker grieving, one question too many, a question they're touchy about or glad of, a street name to give.
export const sloshed: When = { needs: ['youDrunk'] };
export const grieving: When = { needs: ['grief'] };
export const grilled: When = { needs: ['grilled'] };
export const touchy: When = { needs: ['touchy'] };
export const keen: When = { needs: ['keen'] };
export const handled: When = { needs: ['handle'] };
// Which district is theirs.
export const watson: When = { needs: ['inWatson'] };
export const westbrook: When = { needs: ['inWestbrook'] };
export const cityCenter: When = { needs: ['inCityCenter'] };
export const heywood: When = { needs: ['inHeywood'] };
export const santoDomingo: When = { needs: ['inSantoDomingo'] };
export const pacifica: When = { needs: ['inPacifica'] };
export const badlands: When = { needs: ['inBadlands'] };
// The player's way with words.
export const blunt: When = { eloquence: ['blunt'] };
export const easy: When = { eloquence: ['easy'] };
export const smooth: When = { eloquence: ['smooth'] };

/** Every condition of every part; what must be filled and what must be empty add up. */
export const both = (...parts: When[]): When =>
  parts.reduce<When>((all, part) => {
    const needs = [...(all.needs ?? []), ...(part.needs ?? [])];
    const lacks = [...(all.lacks ?? []), ...(part.lacks ?? [])];
    return { ...all, ...part, ...(needs.length ? { needs } : {}), ...(lacks.length ? { lacks } : {}) };
  }, {});
