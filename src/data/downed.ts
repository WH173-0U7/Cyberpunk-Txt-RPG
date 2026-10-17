import type { DownedRules } from '../engine/downed';

/**
 * The player at someone's mercy (all ours). Whoever put them down takes everything they carry
 * but the clothes on their back; someone who only fought back does it by their greed (an
 * ordinary greed, three times in five), the NCPD never.
 *
 * Then they may finish the player. Come for revenge, by what for: a killing, half the time
 * before anything else; a beating, a fifth; a robbery, an eighth; a gang's hunt, a quarter. A
 * gang's turf, three in twenty; a robbery, six in a hundred; a debt or fighting back, three
 * (dead men don't pay, and most people who only fought back just want it over). An ordinary
 * nature leaves that as it is; the hot-tempered, the brave and the cold make it up to twice and
 * more, the calm, the timid and the warm next to nothing. Every point of grudge they hold adds a
 * hundredth, up to double. Each one watching who isn't in it takes off a seventh or so, but not
 * off a ganger on their own turf; and never past nine in ten.
 *
 * Revenge comes as a fight now: the one with the grudge, or one of the gang's, shows up and
 * goes for the player, and the first beat waits for the player's move. Run from, they come again
 * in four to twelve hours.
 */
export const DOWNED: DownedRules = {
  rob: { defense: 1.2 },
  kill: {
    motive: { turf: 0.15, robbery: 0.06, debt: 0.03, defense: 0.03, police: 0 },
    revenge: { murder: 0.5, assault: 0.2, robbery: 0.12, insult: 0.05, gang: 0.25 },
    temper: 1,
    courage: 0.6,
    warmth: 1,
    grudge: 0.01,
    grudgeMost: 100,
    watching: 0.85,
    most: 0.9,
  },
  again: [4, 12],
  lines: {
    stripped: [
      '{Who} goes through every pocket you have and takes the lot: {haul}.',
      'You feel hands in your pockets, then nothing. {haul}, gone with {who}.',
      '{Who} strips you of everything you carry: {haul}.',
      "When it's over, {who} has {haul}, and you have the clothes you're in.",
    ],
    bare: [
      '{Who} turns out your pockets and finds nothing worth the trouble.',
      'Nothing on you for {who} to take. {He} spit{s} and lets it go.',
      'Empty pockets. {Who} gets nothing off you but the satisfaction.',
    ],
    spared: [
      '{Who} stands over you a long moment, then walks away.',
      '"Not worth it." {Who} leaves you breathing.',
      "{Who} looks down at you, decides you're not worth the time, and goes.",
      'A boot by your face, then footsteps going away. {Who} lets you live.',
    ],
    killed: [
      "{Who} doesn't walk away. The last thing you see is {place}, sideways.",
      '{Who} finishes what {he} started, at {place}. Night City doesn\'t notice.',
      '"Nothing personal." It is, though. At {place}, {who} makes sure you don\'t get up again.',
      'You hear {who} step closer. Then nothing, ever again.',
    ],
    arrive: [
      '{Who} has found you at {where}. "Remember me?"',
      '{Who} steps out at {where} with murder in {his} eyes. "Thought I forgot?"',
      '"You and me. Now." {Who} has been looking for you, and at {where} finds you.',
      "{Who} catches up with you at {where}. There's no talking first.",
    ],
    arriveGang: [
      '{gang} colors close in at {where}, and {who} steps up to settle it.',
      'The {gang} have been looking for you. At {where}, {who} finds you.',
      '"The {gang} send their regards." At {where}, {who} comes at you.',
    ],
    arriveDebt: [
      '{gang} colors at {where}. "The loan\'s come due," {who} says, and doesn\'t wait for an answer.',
      '"You owe the {gang}." At {where}, {who} is here to collect, one way or another.',
      'The {gang} want their money. At {where}, {who} has come to take it out of you.',
    ],
  },
};
