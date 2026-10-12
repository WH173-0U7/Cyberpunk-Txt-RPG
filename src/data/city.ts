import type { BuildingContent } from '../engine/buildings';
import type { CityContent, DistrictTemplate, LocationKind } from '../engine/generate';

/*
 * Everything the city generator builds from. Each game picks some districts, fills them
 * with kinds of location, and combines the sentences below into names and descriptions.
 *
 * Keep each sentence short: a description is one kind sentence plus one district mood
 * sentence, and must fit in 160 characters. Each kind's `label` is what the panel shows
 * ("Street market", "Ripperdoc").
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
    anchor: { x: 36, y: 24 },
    areas: ['Kabuki', 'Little China', 'Northside', 'Arasaka Waterfront'],
    kinds: ['market', 'bar', 'ripperdoc', 'alley', 'megabuilding', 'noodle', 'metro', 'docks'],
    landmarks: [
      { name: 'Afterlife', kind: 'bar', description: 'The merc bar of Night City. Every drink is named after a legend who died on the job.' },
      { name: "Tom's Diner", kind: 'diner', description: 'A cheap all-night diner with cracked booths, bottomless synthcoffee and a jukebox.' },
      { name: "Misty's Esoterica", kind: 'curio', description: 'A little shop of tarot cards, crystals and incense, glowing softly in the dark.' },
      { name: "Viktor's Clinic", kind: 'ripperdoc', description: "Vik's ripperdoc clinic, down a flight of stairs, with old boxing posters on the walls." },
      { name: 'Megabuilding H10', kind: 'megabuilding', description: 'A city inside a tower: thousands of apartments, shops, a gun range and one crowded elevator.' },
      { name: "Lizzie's Bar", kind: 'club', description: 'A pink-lit club and braindance bar run by the {w|Mox}, who look after their own.' },
      { name: 'Kabuki Market', kind: 'market', description: 'A maze of stalls under tarps, selling street food, cheap chrome and things nobody asks about.' },
      { name: 'Totentanz', kind: 'club', description: 'A {w|Maelstrom} club where chrome-heavy dancers move to music like a factory falling down stairs.' },
      { name: 'All Foods Plant', kind: 'factory', description: 'An old food processing plant turned {w|Maelstrom} fortress, full of borgs and bad ideas.' },
    ],
    zoning: { apartments: 4, shops: 3, megabuilding: 1, warehouse: 1, derelict: 0.6, lot: 0.6, park: 0.3 },
    atmosphere: {
      outdoor: [
        'Rain hammers everything, and the gutters run with neon.',
        'Trauma Team AVs scream overhead every few minutes.',
        'Somewhere close, a {w|Maelstrom} radio is blasting static.',
        '{w|Tyger Claws} on bikes idle at the corner, watching the street.',
        'Word is the {w|Scavengers} are harvesting chrome in the alleys again.',
      ],
      indoor: ['Rain drums on the roof like it wants in.', 'The walls shake every time a train passes.'],
    },
    ambient: {
      outdoor: [
        'A Trauma Team AV screams overhead, searchlights sweeping the street.',
        { text: 'Lightning splits the sky. Every sign on the block dies, then {g|snaps} back on.', fx: 'lightning' },
        'A vendor and a customer start haggling in three languages at once.',
        'A Delamain cab glides past, its AI politely honking at a jaywalker.',
      ],
      indoor: [
        { text: 'Thunder cracks so close the lights flicker.', fx: 'lightning' },
        'Rainwater drips steadily from a crack in the ceiling.',
        'A radio in the next room plays an old Samurai track.',
      ],
    },
  },
  {
    id: 'westbrook',
    name: 'Westbrook',
    theme: { primary: '#ff4fd8', secondary: '#a46bff' },
    weather: ['drizzle', 'drizzle', 'clear'],
    anchor: { x: 68, y: 34 },
    areas: ['Japantown', 'Charter Hill', 'North Oak'],
    kinds: ['club', 'shrine', 'noodle', 'rooftop', 'bar', 'metro', 'alley', 'market'],
    landmarks: [
      { name: 'Jig-Jig Street', kind: 'street', description: 'A narrow street of neon, bars and pleasure houses, crowded at every hour of the night.' },
      { name: 'Cherry Blossom Market', kind: 'market', description: "Japantown's night market, all food stalls and paper lanterns under the towers." },
      { name: "Wakako's Pachinko Parlor", kind: 'pachinko', description: 'A roaring pachinko parlor. The fixer Wakako Okada does her business in the back.' },
      { name: 'Clouds', kind: 'dollhouse', description: 'An upscale doll house in Japantown, where every doll runs a chip and never stops smiling.' },
    ],
    zoning: { shops: 4, apartments: 2, tower: 1.5, park: 0.8, plaza: 0.6 },
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
    anchor: { x: 46, y: 48 },
    areas: ['Corpo Plaza', 'Downtown'],
    kinds: ['plaza', 'rooftop', 'metro', 'club', 'bar', 'ripperdoc'],
    landmarks: [
      { name: 'Corpo Plaza', kind: 'plaza', description: 'The open plaza at the foot of Arasaka Tower, swept by drones and private security.' },
      { name: 'Konpeki Plaza', kind: 'hotel', description: 'An Arasaka luxury hotel, all glass and gold, with security on every floor.' },
    ],
    zoning: { tower: 5, plaza: 1.2, shops: 1, park: 0.5, lot: 0.4 },
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
        'An N54 News feed scrolls across a tower: another merger, another layoff.',
        'MaxTac AVs circle a tower, searchlights sweeping the windows.',
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
    anchor: { x: 44, y: 68 },
    areas: ['Wellsprings', 'The Glen', 'Vista del Rey'],
    kinds: ['bar', 'noodle', 'shrine', 'alley', 'megabuilding', 'market', 'ripperdoc'],
    landmarks: [
      { name: 'El Coyote Cojo', kind: 'bar', description: "Mama Welles' bar, where the neighborhood comes to drink, eat and argue about everything." },
    ],
    zoning: { apartments: 4, shops: 2, park: 0.8, lot: 0.8, megabuilding: 0.4 },
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
      indoor: ['A radio plays an old corrido somewhere upstairs.', 'Someone laughs in the next room.', 'A radio upstairs is tuned to 89.7 Growl FM, turned all the way up.'],
    },
  },
  {
    id: 'santo_domingo',
    name: 'Santo Domingo',
    theme: { primary: '#ff5a3c', secondary: '#4dd0c8' },
    weather: ['haze', 'dust', 'clear'],
    anchor: { x: 68, y: 68 },
    areas: ['Arroyo', 'Rancho Coronado'],
    kinds: ['factory', 'junkyard', 'megabuilding', 'ripperdoc', 'bar', 'noodle'],
    zoning: { factory: 3, warehouse: 3, apartments: 1.5, lot: 1, megabuilding: 0.8 },
    atmosphere: {
      outdoor: [
        'Smokestacks paint the sky a sick orange.',
        'Power lines buzz and spark overhead.',
        'The air tastes like rust and diesel.',
        '{w|6th Street} flags hang from the overpass. This is their turf.',
      ],
      indoor: ['Machinery thumps through the walls like a heartbeat.', 'Every surface wears a thin coat of grime.'],
    },
    ambient: {
      outdoor: [
        { text: 'A transformer blows down the street in a shower of sparks.', fx: 'flash' },
        'A freight train rumbles past, endless and slow.',
        'Factory sirens wail for the shift change.',
        'A {w|6th Street} truck rolls past, flag snapping in the wind.',
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
    anchor: { x: 26, y: 76 },
    areas: ['Coastview', 'West Wind Estate', 'Dogtown'],
    kinds: ['boardwalk', 'alley', 'megabuilding', 'market', 'bar', 'club'],
    landmarks: [
      { name: 'Grand Imperial Mall', kind: 'mall', description: 'A giant shopping mall, abandoned when the money ran out of Pacifica.' },
      { name: 'Black Sapphire', kind: 'club', description: "Dogtown's most exclusive club, where the elite party behind {w|Barghest} guns." },
      { name: 'Heavy Hearts', kind: 'club', description: 'A rowdy Dogtown club with a stage, a long bar and a crowd that likes it loud.' },
    ],
    zoning: { derelict: 3, apartments: 2, shops: 1, lot: 1, park: 0.4 },
    atmosphere: {
      outdoor: [
        'Half-finished resorts rot along the shore.',
        '{w|Voodoo Boys} graffiti marks the territory.',
        'Salt wind blows trash across the empty streets.',
        '{w|Animals} lift weights in an empty lot, juiced to the eyeballs.',
        '{w|Barghest} soldiers watch the street from the Dogtown wall.',
      ],
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
    anchor: { x: 86, y: 50 },
    areas: ['Rocky Ridge', 'Red Peaks', 'Jackson Plains', 'Laguna Bend', 'Biotechnica Flats', 'Sierra Sonora'],
    kinds: ['checkpoint', 'gas_station', 'nomad_camp', 'junkyard'],
    landmarks: [
      { name: 'Sunset Motel', kind: 'motel', description: 'A roadside motel out in the desert, with a buzzing sign and a view of nothing but sand.' },
      { name: 'Aldecaldos Camp', kind: 'nomad_camp', description: 'The Aldecaldos clan camp: armored trucks, tents and a fire that never goes out.' },
    ],
    zoning: { shack: 1, container: 1 },
    placement: 'edge',
    atmosphere: {
      outdoor: [
        'A dry wind full of grit stings your face.',
        'Night City is a smear of light on the horizon.',
        'Nothing grows out here but rust and rumors.',
        '{w|Wraiths} raiders kick up dust on the horizon.',
      ],
      indoor: ['Sand hisses against the windows.', 'A dusty ceiling fan turns slowly overhead.'],
    },
    ambient: {
      outdoor: [
        'A dust devil spins across the road and collapses into nothing.',
        "Far off, an Aldecaldos convoy's headlights crawl along the horizon.",
        { text: 'Something big detonates way out in the desert. The shockwave reaches you a second later.', fx: 'shake' },
      ],
      indoor: ['The wind howls through gaps in the walls.', 'A radio crackles with nomad chatter, then goes quiet.'],
    },
  },
];

const KINDS: Record<string, LocationKind> = {
  market: {
    label: 'Street market',
    indoor: false,
    names: ['{area} Market', '{area} Night Market', '{area} Bazaar'],
    descriptions: [
      'Tarps and holo-signs crammed under a dead monorail line, selling bootleg chrome and worse.',
      'A maze of stalls where everything is for sale and most of it fell off a truck.',
    ],
    ambient: ['A vendor holds up a pair of secondhand optics and winks at you.', "Someone's pocket gets picked right in front of you. Nobody reacts."],
  },
  bar: {
    label: 'Bar',
    indoor: true,
    weather: 'haze',
    theme: { primary: '#ff3b3b', secondary: '#ffb347' },
    names: ['The Red Lantern', 'The Broken Halo', 'The Drowned Rat', 'The Lucky Ronin', 'Chrome & Bourbon', 'Last Call'],
    descriptions: [
      'A low-lit dive where the bartender never takes their eyes off the door.',
      "Sticky tables, cheap synth-sake and regulars who don't like new faces.",
    ],
    ambient: [
      'Glasses clink. Someone laughs a little too loud.',
      'The jukebox skips, then lurches into an old Samurai anthem.',
      { text: 'A bass drop from upstairs rattles every bottle behind the bar.', fx: 'shake' },
    ],
  },
  ripperdoc: {
    label: 'Ripperdoc',
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
    label: 'Back alley',
    indoor: false,
    names: ['{area} Back Alley', 'Gutter Lane', 'Neon Alley', "Rat's Run"],
    descriptions: ['Steam vents, overflowing dumpsters and gang tags layered three deep.', 'A narrow gap between towers where the neon never quite reaches the ground.'],
    ambient: ['A rat the size of a cat watches you from a dumpster.', "Footsteps echo behind you. When you turn, nobody's there."],
  },
  megabuilding: {
    label: 'Megabuilding',
    indoor: true,
    names: ['Megabuilding H{n}', '{area} Tower Block'],
    descriptions: ['Forty floors of cramped apartments stacked like shipping crates.', 'A concrete hive where the elevators stopped working years ago.'],
    ambient: ["Somebody's arguing through a paper-thin wall.", 'The elevator chimes. The doors open on nothing.'],
  },
  plaza: {
    label: 'Corporate plaza',
    indoor: false,
    names: ['Glass Square', 'Corporate Plaza', 'Memorial Square'],
    descriptions: [
      'Glass towers lean over a spotless plaza while the {g|ARASAKA} logo turns slowly overhead.',
      'Fountains, security drones and people pretending not to see each other.',
    ],
    ambient: ['A news feed scrolls across a tower: stocks up, sanity down.', 'Guards in matte armor rotate through their patrol.'],
  },
  club: {
    label: 'Nightclub',
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
    label: 'Docks',
    indoor: false,
    names: ['{area} Docks', '{area} Container Yard', 'Pier {n}'],
    descriptions: ['Cranes loom over stacked containers, and half the cargo never sees customs.', "Rusting piers where smugglers unload at night and nobody asks what's in the crates."],
    ambient: ['A crane groans as it swings a container overhead.', "Somewhere a ship's horn moans across the water."],
  },
  noodle: {
    label: 'Street food',
    indoor: false,
    names: ['{area} Noodle Stand', 'Ramen Cart', "Mama Wen's Noodles"],
    descriptions: ['A noodle cart with four stools and a cook who has seen absolutely everything.', 'A steaming street-food stand that serves the best ramen in the city, allegedly.'],
    ambient: ['The cook flips a cleaver without looking.', 'A drone drops a box of dumplings on the stool next to you.'],
  },
  metro: {
    label: 'Metro station',
    indoor: true,
    names: ['{area} Metro', '{area} NCART Station'],
    descriptions: ['An NCART platform tiled in flickering ads, where the next train is always late.', 'A metro station where commuters stare into their optics and never at each other.'],
    ambient: ['A train screeches in, three minutes late.', 'A busker with a cybernetic voice box sings for spare eddies.'],
  },
  rooftop: {
    label: 'Rooftop',
    indoor: false,
    names: ['{area} Rooftops', 'Antenna Garden', 'Skyline Ledge'],
    descriptions: ['Antenna farms and humming AC units, with the skyline burning neon all around you.', 'A rooftop above the traffic, the city spread out below like a circuit board.'],
    ambient: ['An AV roars past close enough to feel the heat.', 'Down below, sirens weave through traffic.'],
  },
  junkyard: {
    label: 'Scrapyard',
    indoor: false,
    names: ['{area} Scrapyard', 'The Boneyard', 'Rust Heap'],
    descriptions: ['Mountains of rusting cars and dead robots, picked over by scavengers.', 'A scrapyard where anything with a chip in it gets stripped and sold.'],
    ambient: ['A scavenger drone buzzes past carrying a car door.', 'Something under a pile of scrap is still beeping.'],
  },
  checkpoint: {
    label: 'Checkpoint',
    indoor: false,
    names: ['Militech Checkpoint', 'Old Border Checkpoint'],
    descriptions: ['A burned-out Militech checkpoint, its warning sign still blinking {g|RESTRICTED ZONE}.', 'An abandoned border checkpoint with a rusted turret still pointed at the road.'],
    ambient: ['The checkpoint sign stutters. {g|RESTRICTED ZONE}.', 'A rusted turret twitches, then goes still.'],
  },
  gas_station: {
    label: 'Truck stop',
    indoor: true,
    names: ['Sunrise Gas & Go', 'Last Stop Diner', 'Coyote Fuel'],
    descriptions: ['A gas station with one working pump and coffee strong enough to strip paint.', 'A lonely truck stop whose neon sign flickers against the dark.'],
    ambient: ['The neon OPEN sign buzzes, dies, then flickers back.', 'A truck rolls in, refuels, and leaves without a word.'],
  },
  nomad_camp: {
    label: 'Nomad camp',
    indoor: false,
    names: ['{area} Camp', 'Convoy Camp'],
    descriptions: ['Armored trucks circled around a fire, and a clan that watches you closely.', "A nomad camp of patched tents, solar rigs and dogs that don't bark."],
    ambient: ['Someone tunes a guitar by the fire.', 'A mechanic curses at an engine that refuses to start.'],
  },
  factory: {
    label: 'Factory',
    indoor: true,
    weather: 'haze',
    names: ['{area} Assembly Plant', '{area} Works', 'Plant {n}'],
    descriptions: ['A half-automated factory where robot arms keep working long after the pay stopped.', 'An assembly plant wrapped in chain-link and fluorescent light.'],
    ambient: ['A robotic arm keeps welding an empty frame.', { text: 'Sparks shower from a broken conveyor.', fx: 'flash' }],
  },
  boardwalk: {
    label: 'Boardwalk',
    indoor: false,
    names: ['{area} Boardwalk', '{area} Pier'],
    descriptions: ['A half-built luxury boardwalk, abandoned before it ever opened.', 'Broken resort piers stretching out over black water.'],
    ambient: ['Waves slap the pilings under your feet.', 'An abandoned carousel turns a quarter-rotation in the wind.'],
  },
  diner: {
    label: 'Diner',
    indoor: true,
    theme: { primary: '#ffb347', secondary: '#ff3b3b' },
    names: ['{area} Diner', 'Night Owl Diner'],
    descriptions: ['A greasy diner where the coffee is synthetic and the conversations are not.'],
    ambient: ['A waitress tops up your coffee without asking.', 'The jukebox clicks over to a new song.'],
  },
  curio: {
    label: 'Curio shop',
    indoor: true,
    theme: { primary: '#c58bff', secondary: '#ffd36b' },
    names: ['{area} Curios', 'The Third Eye'],
    descriptions: ['A cramped shop of charms, crystals and fortunes, thick with incense.'],
    ambient: ['Wind chimes stir though nobody came in.', 'Incense smoke drifts past a row of tarot cards.'],
  },
  pachinko: {
    label: 'Pachinko parlor',
    indoor: true,
    weather: 'haze',
    theme: { primary: '#ffd84d', secondary: '#ff2bd6' },
    names: ['{area} Pachinko', 'Lucky Seven Pachinko'],
    descriptions: ['Rows of pachinko machines roaring like a waterfall of steel balls.'],
    ambient: [{ text: 'Someone hits a jackpot and every machine flashes at once.', fx: 'flash' }, 'Steel balls rattle down a thousand machines.'],
  },
  street: {
    label: 'Street',
    indoor: false,
    names: ['{area} Strip', 'Neon Row'],
    descriptions: ['A street of neon signs and open doors, every one of them selling something.'],
    ambient: ['A doorman calls out a price as you pass.', 'A holo-sign flickers through three languages.'],
  },
  dollhouse: {
    label: 'Doll house',
    indoor: true,
    weather: 'haze',
    theme: { primary: '#9fd8ff', secondary: '#ff8fd8' },
    names: ['{area} Doll House', 'Velvet Dolls'],
    descriptions: ['A hushed doll house of soft light and smiling staff who remember nothing afterward.'],
    ambient: ['Soft music drifts down a hallway of closed doors.', 'A doll glides past, smile perfectly in place.'],
  },
  hotel: {
    label: 'Hotel',
    indoor: true,
    theme: { primary: '#ffd84d', secondary: '#5ce1ff' },
    names: ['{area} Grand Hotel', 'The Sky Suites'],
    descriptions: ['A luxury hotel with a lobby of marble and guards who look straight through you.'],
    ambient: ['A bellbot glides past with a stack of designer luggage.', 'Soft music plays in the lobby. Nobody listens.'],
  },
  mall: {
    label: 'Abandoned mall',
    indoor: true,
    names: ['{area} Galleria', 'Seaside Mall'],
    descriptions: ['An abandoned shopping mall, its escalators frozen and its fountains full of trash.'],
    ambient: ['A dead escalator creaks under nobody.', 'Wind moans through the broken skylights.'],
  },
  motel: {
    label: 'Motel',
    indoor: true,
    names: ['{area} Motel', 'Desert Rose Motel'],
    descriptions: ['A desert motel with thin walls, a humming ice machine and a view of nothing.'],
    ambient: ['The ice machine rattles awake.', 'A truck pulls in, headlights sweeping the curtains.'],
  },
  shrine: {
    label: 'Shrine',
    indoor: false,
    names: ['{area} Shrine', 'Lantern Shrine'],
    descriptions: ['A tiny shrine squeezed between two pachinko parlors, incense curling through the neon.', 'A quiet shrine of paper lanterns and wishes tied to wire.'],
    ambient: ['Incense smoke curls up through the neon.', 'Someone leaves an offering of instant noodles and a data shard.'],
  },
};

const BUILDINGS: BuildingContent = {
  styles: {
    tower: { label: 'Corporate tower', floors: [40, 96], names: ['{corp} Tower', '{corp} Plaza One', '{corp} Spire', '{corp} Regional HQ'] },
    apartments: { label: 'Apartment block', floors: [8, 26], names: ['{area} Block {n}', '{area} Residences', '{area} Heights', 'Unit Block {n}'] },
    megabuilding: { label: 'Megabuilding', floors: [60, 110], names: ['Megabuilding H{n}', '{area} Arcology', 'Megabuilding {n}'] },
    shops: { label: 'Storefront', floors: [2, 5], names: ['{shop}', '{area} {shop}', 'Neon {shop}', '24/7 {shop}'] },
    warehouse: { label: 'Warehouse', floors: [2, 4], names: ['Warehouse {n}', '{corp} Depot', 'Cold Storage {n}', 'Freight Hall {n}'] },
    factory: { label: 'Factory', floors: [3, 7], names: ['{corp} Assembly {n}', '{area} Works', 'Fab Plant {n}', 'Refinery {n}'] },
    derelict: { label: 'Abandoned building', floors: [3, 16], names: ['Derelict Block {n}', 'Unfinished Hotel', 'Gutted Tower {n}', 'Condemned Flats {n}'] },
    park: { label: 'Park', floors: [0, 0], names: ['{area} Park', 'Memorial Garden', 'Pocket Park {n}'] },
    plaza: { label: 'Plaza', floors: [0, 0], names: ['{area} Square', '{corp} Plaza', 'Founders Plaza'] },
    lot: { label: 'Parking lot', floors: [0, 0], names: ['Parking Lot {n}', 'Car Park {n}', 'Impound Lot {n}'] },
    shack: { label: 'Shack', floors: [1, 1], names: ['Scrap Shack', 'Squatter Hut', 'Water Still', 'Signal Shack'] },
    container: { label: 'Shipping container', floors: [1, 1], names: ['Container {n}', 'Smuggler Cache', 'Rusted Container'] },
  },
  corps: [
    'Arasaka',
    'Militech',
    'Kang Tao',
    'Biotechnica',
    'Petrochem',
    'Zetatech',
    'Kiroshi',
    'NightCorp',
    'Trauma Team',
    'Orbital Air',
    'Ziggurat',
    'Dynalar',
    'Tsunami',
    'Budget Arms',
    'Darra Polytechnic',
    'Techtronika',
    'SovOil',
  ],
  landmarks: [{ district: 'city_center', kind: 'tower', name: 'Arasaka Tower' }],
  shops: [
    'Noodle Bar',
    'Pawn Shop',
    'Braindance Parlor',
    'Gun Shop',
    'Pachinko Hall',
    'Laundromat',
    'Capsule Hotel',
    'Arcade',
    'Bodega',
    'Cyberware Outlet',
    'Synth-Meat Grill',
    'Tattoo Studio',
    'Repair Shop',
    'Karaoke Box',
    'Pharmacy',
  ],
};

export const CITY: CityContent = {
  // The real Night City has the Pacific to the west and the Badlands to the east.
  coast: 'west',
  welcome: 'Welcome to Night City, choom. Tap a place, then hit {h|Travel}. Tap a block to zoom in on its buildings.',
  districts: DISTRICTS,
  kinds: KINDS,
  buildings: BUILDINGS,
};
