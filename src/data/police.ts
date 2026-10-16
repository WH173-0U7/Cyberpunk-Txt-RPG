import type { PoliceContent } from '../engine/police';

/**
 * The NCPD's numbers and lines, all ours, in the shape of the wiki's 2077 force: privatized
 * in 2076 and cut to half its officers, it has given up on Pacifica (a combat zone) and the
 * Badlands, rarely goes into Watson's Northside, and is spread thin in the suburbs, leaving them
 * to 6th Street and corporate security. Downtown it comes fast; elsewhere, when it comes.
 */
export const POLICE: PoliceContent = {
  districts: {
    city_center: { call: 0.24, minutes: [3, 6] },
    westbrook: { call: 0.2, minutes: [5, 10] },
    heywood: { call: 0.12, minutes: [8, 15] },
    watson: { call: 0.06, minutes: [10, 20] },
    santo_domingo: { call: 0.06, minutes: [12, 25] },
    pacifica: null,
    badlands: null,
  },
  areas: { Northside: { call: 0.012, minutes: [25, 45] } },
  caller: { victim: 2.5, kin: 2.5, friend: 1.7, guard: 2.5, corpo: 1.5, courage: 0.5, ganger: 0.15, crowd: 0.5, most: 0.9 },
  crimes: {
    assault: { label: 'assault', fine: 250, hold: 0, lapseDays: 7, rank: 1, alarm: 1 },
    robbery: { label: 'robbery', fine: 600, hold: 10, lapseDays: 14, rank: 2, alarm: 1 },
    murder: { label: 'murder', fine: 3000, hold: 30, lapseDays: null, rank: 3, alarm: 2 },
  },
  urgency: { assault: 1, robbery: 0.9, murder: 0.6 },
  run: { base: 0.45, hurt: 0.25, masked: 0.1, resisting: 10 },
  shortHold: 15,
  stop: { chance: 0.3, rank: 0.5, minutes: 15 },
  keep: 30,
  lines: {
    calls: [
      '{who} already has a phone to {his} ear: the NCPD.',
      '{who} backs off, thumbing a call to the NCPD.',
      'Behind you, {who} is giving the NCPD the address.',
      '{who} gets on the line to the NCPD, voice shaking.',
    ],
    noCall: ['Nobody here reaches for a phone.', 'People look away. Nobody calls it in.', 'Whoever saw it saw nothing, as far as the NCPD will ever know.'],
    turf: ['Nobody calls the NCPD on {gang} turf.', 'This is {gang} turf. Nobody here calls the cops.', 'On {gang} turf the cops are the last people anyone calls.'],
    zone: ["Nobody calls the NCPD in {district}: the NCPD doesn't come.", "This is {district}. There's nobody to call.", "In {district} there's no one to call, and everyone knows it."],
    dispatch: ['NCPD dispatch has it: a unit is on its way.', 'A unit is on its way. The clock is running.', 'Dispatch logs it, and sends a car.'],
    arrive: [
      'Two NCPD officers push through, weapons out: "Hands where we can see them!"',
      'Sirens, then boots: two NCPD officers, guns on you. "Don\'t move!"',
      'A drone first, then two officers behind it: "NCPD! On the ground!"',
    ],
    facing: {
      scene: '{officers}, weapons drawn, here about the {crime}. They want you to come quietly.',
      warrant: '{officers} have your face on a warrant for {crime}, and their weapons out.',
    },
    missed: ['The NCPD shows up where it happened, and finds you gone.', 'A unit rolls up to the scene. You\'re long gone.'],
    stop: [
      'An NCPD cruiser pulls up. Two officers get out: your face is on a warrant.',
      'Two officers on patrol take a second look at you, and a third. "You. Stop right there."',
      'An NCPD drone hums down to eye level, and two officers follow it in. Your face is on file.',
    ],
    fined: ['You put your hands up. They run you, write you up for {crime}, and take {fine} €$ off you.', 'Hands up, face to the wall. {fine} €$ for {crime}, paid there and then, and they let you walk.'],
    held: [
      'Hands up. Cuffs, the back of a cruiser, a cell at the precinct: {minutes} minutes for {crime}, and {fine} €$.',
      'They take you in for {crime}. A holding cell, a bench, {minutes} minutes to think, and {fine} €$.',
    ],
    short: ["You can't cover the fine: they hold you {minutes} minutes instead.", 'Short of the fine, you sit it out: {minutes} minutes in the cell.'],
    ran: ['You bolt past them and lose them in the crowd.', 'You run, and keep running. Behind you, a siren, then nothing.', 'You break for it: a corner, an alley, a fence, gone.'],
    caught: ['You make it three steps. Then the floor, and a knee in your back.', 'You run straight into the second officer. That settles it.'],
    fight: ['You go for the nearest officer.', 'You take your chances with the officers.'],
    backup: ['The other officer backs off, on the radio: backup is coming.', '"Officer down, send backup!" The other one is already on the radio.'],
    released: ['They let you out of the cell. The street is right where you left it.', 'A buzzer, a door, and you\'re back on the street.'],
    lapsed: ["The warrant for {crime} has lapsed: nobody's looking for you for it now."],
    cameTo: ['{who} comes to, and calls the NCPD.', 'Somewhere behind you, {who} has come round and is calling it in.'],
  },
};
