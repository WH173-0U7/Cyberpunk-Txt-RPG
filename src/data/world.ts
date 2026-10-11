import type { World } from '../engine/types';

/*
 * Inline markup for any text in here:
 *   {h|text}  highlight (district accent color)
 *   {w|text}  danger (red)
 *   {g|text}  glitch (tearing, scrambling text)
 */
export const WORLD: World = {
  start: 'kabuki_market',

  intro: [
    'NCNET OS v0.1 // cold boot',
    '[ OK ] neural link handshake',
    '[ OK ] optical overlay calibrated',
    '[ OK ] city grid uplink: Night City',
    '[WARN] {w|unregistered cyberware detected} — ignoring',
  ],
  welcome: 'Welcome to Night City, choom. Type {h|help} if you get lost.',

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
        'Vendors hawk bootleg {h|chrome}, pirated braindances and noodles of questionable origin, ' +
        'their faces lit blue by cheap holo-displays. Overhead, a cracked billboard stutters between ads, ' +
        'the {g|ARASAKA} logo tearing in and out of existence.\n\n' +
        'North, the pink glow of Japantown bleeds into the clouds. A red lantern sways over a bar door ' +
        'to the east. South, a freeway on-ramp climbs toward the edge of the city.',
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
      description:
        'Low ceilings, lower lighting. Paper lanterns bathe everything in red, and the bar top is sticky ' +
        'with spilled synth-sake. The bartender, all scar tissue and a {h|chrome forearm}, polishes the same ' +
        'glass over and over without ever taking their eyes off the door. In the corner booth, somebody\'s ' +
        'bodyguard pretends not to notice you.\n\n' +
        'The rain-soaked market waits back out to the west.',
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
      description:
        'Pink and violet neon drips down a canyon of Japantown towers. Holographic koi swim lazily through ' +
        'the drizzle overhead, scattering whenever an AV roars past. Lanterns, noodle bars and pachinko ' +
        'parlors crowd every inch of street level.\n\n' +
        'Outside one parlor, a handful of {w|Tyger Claws} lounge on their bikes, gang tattoos glowing beneath ' +
        'their sleeves. Best not to stare.\n\n' +
        'Kabuki Market lies back to the south.',
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
      description:
        'The skyline shrinks behind you to a smear of light on the horizon. Out here it\'s cracked asphalt, ' +
        'dead wind turbines and a dry wind full of grit. A burned-out Militech checkpoint slouches by the ' +
        'roadside, its warning sign still blinking: {g|RESTRICTED ZONE}.\n\n' +
        'Beyond it, the Badlands stretch out into the dark. The freeway back into Night City runs north.',
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
