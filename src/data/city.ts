import type { CityContent, DistrictTemplate, LocationKind } from '../engine/generate';

/*
 * Everything the city generator builds from. Each game picks some districts, fills them
 * with kinds of location, and combines the sentences below into names and descriptions.
 *
 * Keep each sentence short: a description is one kind sentence plus one district mood
 * sentence, and must fit in 160 characters.
 *
 * Inline markup for any text in here:
 *   {h|text}  highlight (district accent color)
 *   {w|text}  danger (red)
 *   {g|text}  glitch (tearing, scrambling text)
 */

const DISTRICTS: DistrictTemplate[] = [
  {
    id: 'watson',
    name: 'Watson',
    theme: { primary: '#00f0ff', secondary: '#ff2a6d' },
    weather: ['rain', 'rain', 'drizzle'],
    areas: ['Kabuki', 'Little China', 'Northside', 'Waterfront'],
    kinds: ['market', 'bar', 'ripperdoc', 'alley', 'megabuilding', 'noodle', 'metro', 'docks'],
    atmosphere: {
      outdoor: [
        'Rain hammers everything, and the gutters run with neon.',
        'Trauma Team AVs scream overhead every few minutes.',
        'Somewhere close, a {w|Maelstrom} radio is blasting static.',
      ],
      indoor: ['Rain drums on the roof like it wants in.', 'The walls shake every time a train passes.'],
    },
    ambient: {
      outdoor: [
        'A Trauma Team AV screams overhead, searchlights sweeping the street.',
        { text: 'Lightning splits the sky. Every sign on the block dies, then {g|snaps} back on.', fx: 'lightning' },
        'A vendor and a customer start haggling in three languages at once.',
      ],
      indoor: [
        { text: 'Thunder cracks so close the lights flicker.', fx: 'lightning' },
        'Rainwater drips steadily from a crack in the ceiling.',
      ],
    },
  },
  {
    id: 'westbrook',
    name: 'Westbrook',
    theme: { primary: '#ff4fd8', secondary: '#a46bff' },
    weather: ['drizzle', 'drizzle', 'clear'],
    areas: ['Japantown', 'Charter Hill', 'North Oak'],
    kinds: ['club', 'shrine', 'noodle', 'rooftop', 'bar', 'metro', 'alley', 'market'],
    atmosphere: {
      outdoor: [
        'Holographic koi swim through the air above the street.',
        'Pink neon drips down a canyon of towers.',
        '{w|Tyger Claws} on bikes watch who comes and goes.',
      ],
      indoor: ['Pink neon from the street bleeds through the blinds.', 'Somewhere upstairs, a karaoke bar is murdering a love song.'],
    },
    ambient: {
      outdoor: [
        'A holographic koi drifts down, circles you once, and dissolves into pixels.',
        { text: 'An ad-drone swoops low and blasts a jingle into your audio implant: {g|BUY BUY BUY}.', fx: 'glitch' },
        'Two {w|Tyger Claws} roll past on their bikes, slow. Neither of them blinks.',
      ],
      indoor: [
        'Muffled karaoke leaks through the wall.',
        { text: 'Your optics flicker as a cheap ad-hack tries to {g|piggyback} your feed.', fx: 'glitch' },
      ],
    },
  },
  {
    id: 'city_center',
    name: 'City Center',
    theme: { primary: '#ffd84d', secondary: '#5ce1ff' },
    weather: ['clear', 'clear', 'drizzle'],
    areas: ['Corpo Plaza', 'Downtown'],
    kinds: ['plaza', 'rooftop', 'metro', 'club', 'bar', 'ripperdoc'],
    atmosphere: {
      outdoor: [
        'Corpo security drones hum overhead, scanning faces.',
        'Glass towers lean in close, every window watching.',
        'The streets are clean here. Suspiciously clean.',
      ],
      indoor: ['The air is filtered, chilled and smells faintly of money.', 'A corporate jingle loops softly from hidden speakers.'],
    },
    ambient: {
      outdoor: [
        { text: 'A security drone locks onto you for a moment. {g|IDENTITY VERIFIED}.', fx: 'glitch' },
        'An executive AV settles onto a rooftop pad, rotors whining.',
        'A corpo in a perfect suit steps around you without looking.',
      ],
      indoor: [
        'Somewhere a phone rings. Nobody answers it.',
        { text: 'The building runs a security sweep. {g|SCAN COMPLETE}.', fx: 'glitch' },
      ],
    },
  },
  {
    id: 'heywood',
    name: 'Heywood',
    theme: { primary: '#39ff88', secondary: '#ffb84d' },
    weather: ['clear', 'haze'],
    areas: ['Wellsprings', 'The Glen', 'Vista del Rey'],
    kinds: ['bar', 'noodle', 'shrine', 'alley', 'megabuilding', 'market', 'ripperdoc'],
    atmosphere: {
      outdoor: [
        '{w|Valentinos} murals cover the walls, saints in gold and chrome.',
        'Lowriders cruise past, bass rattling the windows.',
        'Laundry lines zigzag between the balconies above.',
      ],
      indoor: ['A shrine to the Virgin glows in the corner, candles flickering.', "Someone's grandmother is cooking something incredible next door."],
    },
    ambient: {
      outdoor: [
        'A lowrider rolls by, hydraulics hissing, bass shaking your ribs.',
        'Kids play football in the street, dodging traffic.',
        { text: 'Gunshots crack two blocks over. Then silence.', fx: 'shake' },
      ],
      indoor: ['A radio plays an old corrido somewhere upstairs.', 'Someone laughs in the next room.'],
    },
  },
  {
    id: 'santo_domingo',
    name: 'Santo Domingo',
    theme: { primary: '#ff5a3c', secondary: '#4dd0c8' },
    weather: ['haze', 'dust', 'clear'],
    areas: ['Arroyo', 'Rancho Coronado'],
    kinds: ['factory', 'junkyard', 'megabuilding', 'ripperdoc', 'bar', 'docks', 'noodle'],
    atmosphere: {
      outdoor: ['Smokestacks paint the sky a sick orange.', 'Power lines buzz and spark overhead.', 'The air tastes like rust and diesel.'],
      indoor: ['Machinery thumps through the walls like a heartbeat.', 'Every surface wears a thin coat of grime.'],
    },
    ambient: {
      outdoor: [
        { text: 'A transformer blows down the street in a shower of sparks.', fx: 'flash' },
        'A freight train rumbles past, endless and slow.',
        'Factory sirens wail for the shift change.',
      ],
      indoor: [
        { text: 'A heavy press slams somewhere below, rattling the floor.', fx: 'shake' },
        'A fluorescent tube buzzes, flickers and dies.',
      ],
    },
  },
  {
    id: 'pacifica',
    name: 'Pacifica',
    theme: { primary: '#5b7cff', secondary: '#3dffe0' },
    weather: ['rain', 'drizzle'],
    areas: ['Coastview', 'West Wind'],
    kinds: ['boardwalk', 'alley', 'megabuilding', 'market', 'bar', 'club'],
    atmosphere: {
      outdoor: ['Half-finished resorts rot along the shore.', '{w|Voodoo Boys} graffiti marks the territory.', 'Salt wind blows trash across the empty streets.'],
      indoor: ['The ocean booms against the seawall outside.', 'Water drips through the ceiling into a row of buckets.'],
    },
    ambient: {
      outdoor: [
        'Waves crash against the broken seawall.',
        { text: 'A {w|Voodoo Boys} netrunner pings your cyberdeck. {g|ACCESS DENIED}.', fx: 'glitch' },
        'A stray dog trots past with something in its mouth.',
      ],
      indoor: ['The building groans in the wind.', 'Somewhere below, water sloshes through a flooded basement.'],
    },
  },
  {
    id: 'badlands',
    name: 'The Badlands',
    theme: { primary: '#ff9e3d', secondary: '#ffd36b' },
    weather: ['dust'],
    areas: ['Rocky Ridge', 'Red Peaks', 'Jackson Plains'],
    kinds: ['checkpoint', 'gas_station', 'nomad_camp', 'junkyard'],
    placement: 'edge',
    atmosphere: {
      outdoor: ['A dry wind full of grit stings your face.', 'Night City is a smear of light on the horizon.', 'Nothing grows out here but rust and rumors.'],
      indoor: ['Sand hisses against the windows.', 'A dusty ceiling fan turns slowly overhead.'],
    },
    ambient: {
      outdoor: [
        'A dust devil spins across the road and collapses into nothing.',
        "Far off, a nomad convoy's headlights crawl along the horizon.",
        { text: 'Something big detonates way out in the desert. The shockwave reaches you a second later.', fx: 'shake' },
      ],
      indoor: ['The wind howls through gaps in the walls.', 'A radio crackles with nomad chatter, then goes quiet.'],
    },
  },
];

const KINDS: Record<string, LocationKind> = {
  market: {
    indoor: false,
    names: ['{area} Market', '{area} Night Market', '{area} Bazaar'],
    descriptions: [
      'Tarps and holo-signs crammed under a dead monorail line, selling bootleg chrome and worse.',
      'A maze of stalls where everything is for sale and most of it fell off a truck.',
    ],
    ambient: ['A vendor holds up a pair of secondhand optics and winks at you.', "Someone's pocket gets picked right in front of you. Nobody reacts."],
  },
  bar: {
    indoor: true,
    weather: 'haze',
    theme: { primary: '#ff3b3b', secondary: '#ffb347' },
    names: ['The Red Lantern', 'The Broken Halo', 'The Drowned Rat', 'Afterglow', 'The Lucky Ronin', 'Chrome & Bourbon', 'Last Call'],
    descriptions: [
      'A low-lit dive where the bartender never takes their eyes off the door.',
      "Sticky tables, cheap synth-sake and regulars who don't like new faces.",
    ],
    ambient: [
      'Glasses clink. Someone laughs a little too loud.',
      'The jukebox skips, then lurches into an old chrome-rock anthem.',
      { text: 'A bass drop from upstairs rattles every bottle behind the bar.', fx: 'shake' },
    ],
  },
  ripperdoc: {
    indoor: true,
    theme: { primary: '#5cffc8', secondary: '#3d8bff' },
    names: ['{area} Chrome Clinic', "Doc Vasquez's", 'Second-Hand Surgery', 'Midnight Clinic', 'The Stitch Shop'],
    descriptions: [
      "A ripperdoc's chair under flickering surgical lights, cyberware hanging on hooks like meat.",
      'A back-room clinic that installs chrome with no questions and no refunds.',
    ],
    ambient: ['A surgical drill whines to life in the back room.', { text: 'The surgical lights stutter and {g|reboot}.', fx: 'glitch' }],
  },
  alley: {
    indoor: false,
    names: ['{area} Back Alley', 'Gutter Lane', 'Neon Alley', "Rat's Run"],
    descriptions: ['Steam vents, overflowing dumpsters and gang tags layered three deep.', 'A narrow gap between towers where the neon never quite reaches the ground.'],
    ambient: ['A rat the size of a cat watches you from a dumpster.', "Footsteps echo behind you. When you turn, nobody's there."],
  },
  megabuilding: {
    indoor: true,
    names: ['Megabuilding H{n}', '{area} Tower Block'],
    descriptions: ['Forty floors of cramped apartments stacked like shipping crates.', 'A concrete hive where the elevators stopped working years ago.'],
    ambient: ["Somebody's arguing through a paper-thin wall.", 'The elevator chimes. The doors open on nothing.'],
  },
  plaza: {
    indoor: false,
    names: ['{area} Plaza', 'Corporate Plaza', 'Glass Square'],
    descriptions: [
      'Glass towers lean over a spotless plaza while the {g|ARASAKA} logo turns slowly overhead.',
      'Fountains, security drones and people pretending not to see each other.',
    ],
    ambient: ['A news feed scrolls across a tower: stocks up, sanity down.', 'Guards in matte armor rotate through their patrol.'],
  },
  club: {
    indoor: true,
    weather: 'haze',
    theme: { primary: '#ff2bd6', secondary: '#7a5cff' },
    names: ['Club Static', 'Club Overdrive', 'The Neon Pit', 'Pulse', 'Club Voltage'],
    descriptions: ['Bass you feel in your teeth, lasers slicing through smoke, bouncers with military optics.', 'A packed dance floor under a ceiling of moving light.'],
    ambient: [
      { text: 'The DJ drops the bass and the whole floor shakes.', fx: 'shake' },
      { text: 'A wall of strobes blinds you for a second.', fx: 'flash' },
      'A dancer with chrome arms spins past.',
    ],
  },
  docks: {
    indoor: false,
    names: ['{area} Docks', '{area} Container Yard', 'Pier {n}'],
    descriptions: ['Cranes loom over stacked containers, and half the cargo never sees customs.', "Rusting piers where smugglers unload at night and nobody asks what's in the crates."],
    ambient: ['A crane groans as it swings a container overhead.', "Somewhere a ship's horn moans across the water."],
  },
  noodle: {
    indoor: false,
    names: ['{area} Noodle Stand', 'Ramen Cart', "Mama Wen's Noodles"],
    descriptions: ['A noodle cart with four stools and a cook who has seen absolutely everything.', 'A steaming street-food stand that serves the best ramen in the city, allegedly.'],
    ambient: ['The cook flips a cleaver without looking.', 'A drone drops a box of dumplings on the stool next to you.'],
  },
  metro: {
    indoor: true,
    names: ['{area} Metro', '{area} NCART Station'],
    descriptions: ['An NCART platform tiled in flickering ads, where the next train is always late.', 'A metro station where commuters stare into their optics and never at each other.'],
    ambient: ['A train screeches in, three minutes late.', 'A busker with a cybernetic voice box sings for spare eddies.'],
  },
  rooftop: {
    indoor: false,
    names: ['{area} Rooftops', 'Antenna Garden', 'Skyline Ledge'],
    descriptions: ['Antenna farms and humming AC units, with the skyline burning neon all around you.', 'A rooftop above the traffic, the city spread out below like a circuit board.'],
    ambient: ['An AV roars past close enough to feel the heat.', 'Down below, sirens weave through traffic.'],
  },
  junkyard: {
    indoor: false,
    names: ['{area} Scrapyard', 'The Boneyard', 'Rust Heap'],
    descriptions: ['Mountains of rusting cars and dead robots, picked over by scavengers.', 'A scrapyard where anything with a chip in it gets stripped and sold.'],
    ambient: ['A scavenger drone buzzes past carrying a car door.', 'Something under a pile of scrap is still beeping.'],
  },
  checkpoint: {
    indoor: false,
    names: ['Militech Checkpoint', 'Old Border Checkpoint'],
    descriptions: ['A burned-out Militech checkpoint, its warning sign still blinking {g|RESTRICTED ZONE}.', 'An abandoned border checkpoint with a rusted turret still pointed at the road.'],
    ambient: ['The checkpoint sign stutters. {g|RESTRICTED ZONE}.', 'A rusted turret twitches, then goes still.'],
  },
  gas_station: {
    indoor: true,
    names: ['Sunrise Gas & Go', 'Last Stop Diner', 'Coyote Fuel'],
    descriptions: ['A gas station with one working pump and coffee strong enough to strip paint.', 'A lonely truck stop whose neon sign flickers against the dark.'],
    ambient: ['The neon OPEN sign buzzes, dies, then flickers back.', 'A truck rolls in, refuels, and leaves without a word.'],
  },
  nomad_camp: {
    indoor: false,
    names: ['{area} Camp', 'Convoy Camp'],
    descriptions: ['Armored trucks circled around a fire, and a clan that watches you closely.', "A nomad camp of patched tents, solar rigs and dogs that don't bark."],
    ambient: ['Someone tunes a guitar by the fire.', 'A mechanic curses at an engine that refuses to start.'],
  },
  factory: {
    indoor: true,
    weather: 'haze',
    names: ['{area} Assembly Plant', '{area} Works', 'Plant {n}'],
    descriptions: ['A half-automated factory where robot arms keep working long after the pay stopped.', 'An assembly plant wrapped in chain-link and fluorescent light.'],
    ambient: ['A robotic arm keeps welding an empty frame.', { text: 'Sparks shower from a broken conveyor.', fx: 'flash' }],
  },
  boardwalk: {
    indoor: false,
    names: ['{area} Boardwalk', '{area} Pier'],
    descriptions: ['A half-built luxury boardwalk, abandoned before it ever opened.', 'Broken resort piers stretching out over black water.'],
    ambient: ['Waves slap the pilings under your feet.', 'An abandoned carousel turns a quarter-rotation in the wind.'],
  },
  shrine: {
    indoor: false,
    names: ['{area} Shrine', 'Lantern Shrine'],
    descriptions: ['A tiny shrine squeezed between two pachinko parlors, incense curling through the neon.', 'A quiet shrine of paper lanterns and wishes tied to wire.'],
    ambient: ['Incense smoke curls up through the neon.', 'Someone leaves an offering of instant noodles and a data shard.'],
  },
};

export const CITY: CityContent = {
  intro: [
    'NCNET OS v0.3 // cold boot',
    '[ OK ] neural link handshake',
    '[ OK ] city grid uplink',
    '[WARN] {w|unregistered cyberware detected}, ignoring',
  ],
  welcome: 'Welcome to Night City, choom. Tap a place on the map to travel there.',
  districts: DISTRICTS,
  kinds: KINDS,
};
