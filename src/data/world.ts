import type { World } from '../engine/types';

/*
 * Keep descriptions to one or two sentences; put detail in points of interest,
 * which the player taps to examine.
 *
 * Inline markup for any text in here:
 *   {h|text}  highlight (district accent color)
 *   {w|text}  danger (red)
 *   {g|text}  glitch (tearing, scrambling text)
 */
export const WORLD: World = {
  start: 'kabuki_market',

  intro: [
    'NCNET OS v0.2 // cold boot',
    '[ OK ] neural link handshake',
    '[ OK ] optical overlay calibrated',
    '[WARN] {w|unregistered cyberware detected} — ignoring',
  ],
  welcome: 'Welcome to Night City, choom. Tap a direction to move, or tap anything nearby for a closer look.',

  districts: {
    watson: {
      id: 'watson',
      name: 'Watson',
      theme: { primary: '#00f0ff', secondary: '#ff2a6d' },
    },
    westbrook: {
      id: 'westbrook',
      name: 'Westbrook',
      theme: { primary: '#ff4fd8', secondary: '#a46bff' },
    },
    badlands: {
      id: 'badlands',
      name: 'The Badlands',
      theme: { primary: '#ff9e3d', secondary: '#ffd36b' },
    },
  },

  locations: {
    kabuki_market: {
      id: 'kabuki_market',
      name: 'Kabuki Market',
      district: 'watson',
      weather: 'rain',
      description:
        'Rain hammers the tarps of a hundred stalls crammed beneath a dead monorail line. ' +
        'Everything here is for sale, and most of it is stolen.',
      pois: [
        {
          id: 'billboard',
          name: 'Holo-billboard',
          description:
            'A cracked billboard stutters between ads above the stalls. Every few seconds the {g|ARASAKA} logo ' +
            'tears through whatever is playing, like the corp is haunting its own airtime.',
          fx: 'glitch',
        },
        {
          id: 'chrome_stall',
          name: 'Chrome stall',
          description:
            'Bootleg {h|cyberware} laid out on a wet tarp: optics, finger-blades, a secondhand arm still twitching. ' +
            'The vendor swears it is all lightly used.',
        },
        {
          id: 'noodle_cart',
          name: 'Noodle cart',
          description:
            'Steam, neon and the smell of something that was probably a vegetable once. The cook nods at you without looking up.',
        },
        {
          id: 'street_kid',
          name: 'Street kid',
          description:
            'A kid with mismatched {h|chrome eyes} watches the crowd, counting pockets. By the time you look back, they are gone.',
        },
      ],
      exits: { north: 'hanami_row', east: 'red_lantern', south: 'city_limits' },
      ambient: [
        'A Trauma Team AV screams overhead, searchlights sweeping across the stalls.',
        'Somewhere behind you, a vendor and a customer start haggling in three languages at once.',
        {
          text: 'Lightning splits the sky. For a heartbeat every sign in the market dies — then {g|snaps} back on.',
          fx: 'lightning',
        },
        'A street kid with mismatched chrome eyes watches you a little too long, then melts into the crowd.',
      ],
    },

    red_lantern: {
      id: 'red_lantern',
      name: 'The Red Lantern',
      district: 'watson',
      weather: 'haze',
      theme: { primary: '#ff3b3b', secondary: '#ffb347' },
      description: 'Low ceilings, lower lighting. Paper lanterns bathe everything in red, and nobody here wants to be remembered.',
      pois: [
        {
          id: 'bartender',
          name: 'Bartender',
          description:
            'All scar tissue and a {h|chrome forearm}. They polish the same glass over and over and never take their eyes off the door.',
        },
        {
          id: 'jukebox',
          name: 'Jukebox',
          description:
            'A battered machine loaded with thirty-year-old chrome-rock. Half the buttons are melted, so it plays whatever it wants.',
        },
        {
          id: 'corner_booth',
          name: 'Corner booth',
          description:
            "Somebody's bodyguard sits alone in the corner, optics glowing faintly red. They're pretending not to notice you. " +
            "They're bad at it.",
        },
      ],
      exits: { west: 'kabuki_market' },
      ambient: [
        'The jukebox skips, then lurches into a thirty-year-old chrome-rock anthem.',
        'Glasses clink. Someone at the bar laughs a little too loud.',
        "The bodyguard's optics flicker red as they {g|scan} you.",
        { text: 'A bass drop from the club upstairs rattles every bottle behind the bar.', fx: 'shake' },
      ],
    },

    hanami_row: {
      id: 'hanami_row',
      name: 'Hanami Row',
      district: 'westbrook',
      weather: 'drizzle',
      description: 'Pink and violet neon drips down a canyon of Japantown towers while holographic koi swim through the drizzle overhead.',
      pois: [
        {
          id: 'holo_koi',
          name: 'Holo-koi',
          description: 'Three-meter koi made of light drift between the towers. One dips low, circles you once, and dissolves into {g|pixels}.',
        },
        {
          id: 'tyger_claws',
          name: 'Tyger Claws',
          description:
            'A handful of {w|Tyger Claws} lounge on their bikes outside a pachinko parlor, gang tattoos glowing under their sleeves. ' +
            'One of them clocks you. Best not to stare.',
        },
        {
          id: 'pachinko',
          name: 'Pachinko parlor',
          description: 'A wall of noise and light. Rows of machines, rows of players, and nobody winning.',
        },
      ],
      exits: { south: 'kabuki_market' },
      ambient: [
        'A holographic koi drifts down to street level, circles you once, and dissolves into pixels.',
        'A pachinko parlor door hisses open, spilling noise and light into the street.',
        'Two {w|Tyger Claws} roll past on their bikes, slow. Neither of them blinks.',
        {
          text: 'An ad-drone swoops low and blasts a jingle straight into your audio implant: {g|BUY BUY BUY}.',
          fx: 'glitch',
        },
      ],
    },

    city_limits: {
      id: 'city_limits',
      name: 'City Limits',
      district: 'badlands',
      weather: 'dust',
      description: 'Cracked asphalt, dead wind turbines and a dry wind full of grit. Behind you, Night City is a smear of light on the horizon.',
      pois: [
        {
          id: 'checkpoint',
          name: 'Militech checkpoint',
          description:
            'Burned out and abandoned, but the warning sign still blinks: {g|RESTRICTED ZONE}. ' +
            'Whatever they were guarding, they left in a hurry.',
          fx: 'glitch',
        },
        {
          id: 'turbines',
          name: 'Wind turbines',
          description: 'A row of dead turbines, blades frozen mid-turn. Someone has spray-painted a nomad clan mark on the nearest tower.',
        },
        {
          id: 'badlands',
          name: 'The Badlands',
          description: "Endless dark desert. Far off, a nomad convoy's headlights crawl along the horizon.",
        },
      ],
      exits: { north: 'kabuki_market' },
      ambient: [
        'A dust devil spins across the road and collapses into nothing.',
        "Far off, a nomad convoy's headlights crawl along the horizon.",
        'The checkpoint sign stutters. {g|RESTRICTED ZONE}. {g|RESTRICTED ZONE}.',
        { text: 'Something big detonates way out in the desert. The shockwave reaches you a second later.', fx: 'shake' },
      ],
    },
  },
};
