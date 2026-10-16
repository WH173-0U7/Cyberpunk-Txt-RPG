import type { RoomsContent } from '../engine/rooms';

/**
 * The rooms inside the city's buildings: what each is called, how many units a floor of a
 * home has and how many rooms a motel or a capsule hotel rents a floor, how often people are
 * out back or in the restroom, and a few words on each kind of room. All ours.
 */
export const ROOMS: RoomsContent = {
  main: {
    business: {
      'capsule-hotel': 'Lobby',
      motel: 'Front office',
      hospital: 'Waiting room',
      bank: 'Banking hall',
      'street-clinic': 'Waiting room',
      ripperdoc: 'Clinic',
      'noodle-bar': 'Counter',
      karaoke: 'Lounge',
      club: 'Dance floor',
      'braindance-parlor': 'Booths',
      laundromat: 'Machines',
    },
    category: {
      food: 'Dining room',
      nightlife: 'Bar',
      firearms: 'Shop floor',
      melee: 'Shop floor',
      cyberware: 'Shop floor',
      netrunning: 'Shop floor',
      clothing: 'Shop floor',
      medical: 'Counter',
      vehicles: 'Garage',
      entertainment: 'Floor',
      services: 'Front room',
      commodity: 'Shop floor',
      lodging: 'Lobby',
    },
    kind: { apartments: 'Lobby', megabuilding: 'Lobby', tower: 'Lobby', warehouse: 'Warehouse floor', factory: 'Factory floor', derelict: 'Ground floor', shack: 'Inside', container: 'Inside' },
    other: 'Inside',
  },
  back: {
    business: { bank: 'Vault room', ripperdoc: 'Operating room', garage: 'Workshop', 'chop-shop': 'Workshop', motel: 'Office', 'capsule-hotel': 'Office' },
    category: { food: 'Kitchen', nightlife: 'Back room', medical: 'Back room', vehicles: 'Workshop' },
    other: 'Stockroom',
  },
  restroom: 'Restroom',
  ward: 'Ward',
  units: { apartments: 6, megabuilding: 12 },
  guests: { motel: { perFloor: 8, word: 'Room' }, 'capsule-hotel': { perFloor: 16, word: 'Capsule' } },
  breakShare: 0.15,
  restroomShare: 0.05,
  wardShare: 0.4,
  lobbyRoles: /guard|security|reception|concierge|doorman/i,
  blurbs: {
    main: [],
    restroom: [
      'A cramped restroom: a cracked mirror, a hand dryer that never worked, a lock that does.',
      'Tile, graffiti, the hum of a fan, and a door that locks.',
      'A single stall and a sink with a sign over it: NO NEEDLES. Someone has crossed out the NO.',
      'It smells of bleach and something under the bleach. The door locks.',
    ],
    back: [
      'Out back: crates, a mop bucket, a chair someone takes their breaks in.',
      'Behind the counter, where the customers never see: stock to the ceiling and a door to the alley.',
      'The back room: a time clock, a fridge, a calendar three years out of date.',
    ],
    ward: [
      'Beds in a row, curtains half drawn, monitors keeping time.',
      'The ward: the smell of disinfectant, the beep of someone else\'s heart.',
    ],
    hall: [
      'A corridor of doors, a light that flickers, somebody\'s screen through the wall.',
      'The hallway: numbered doors, a vending machine, a window onto the next block\'s wall.',
      'A long corridor that smells of synthetic noodles and old carpet.',
    ],
    unit: [
      'Somebody\'s home: a couch, a screen, a kitchen you could cross in two steps.',
      'A unit like every other on the floor, made theirs with what they could afford.',
      'Two rooms, a window with a view of the next tower, the hum of the city through the glass.',
    ],
    guest: [
      'A bed, a screen bolted to the wall, a lock on the door. Nobody asks who you are in here.',
      'Thin walls, clean enough sheets, and the door shuts out the rest of the city.',
    ],
    office: [
      'Desks in rows, screens in the glass, the air conditioning set to corporate.',
      'An open-plan floor of cubicles and quiet, someone in a meeting room behind frosted glass.',
    ],
  },
  rent: {
    motel: { name: 'A room for the night', note: 'A key, a bed and a door that locks, till noon.', price: 40, desk: 'A front office behind scratched glass, keys on a board, a bell nobody hurries to. Rooms by the night, no questions.' },
    'capsule-hotel': { name: 'A capsule for the night', note: 'A pod with a mattress, a screen and a hatch that locks, till noon.', price: 20, desk: 'A clerk behind a counter, and beyond it rows of numbered hatches stacked to the ceiling. A capsule by the night, cheap.' },
  },
  lines: {
    staffOnly: [
      'Staff only. Someone behind the counter waves you back out.',
      '"Hey. Back there\'s staff only." You stay where you are.',
      'The door says STAFF ONLY, and the look you get says it louder.',
    ],
    locked: [
      '{room} is locked. Somebody lives there: knock, and see if they let you in.',
      'The door to {room} doesn\'t give. You could knock.',
      'Locked. It\'s somebody\'s home, not a hallway.',
    ],
    guestLocked: [
      '{room} is locked: it\'s rented to somebody, and it isn\'t you.',
      'The door to {room} won\'t open. Rent a room at the desk if you want one.',
      'Locked. The desk rents the rooms, by the night.',
    ],
    noAnswer: ['You knock on {room}. Nothing. Nobody home.', 'You knock. The door stays shut, and nothing moves behind it.', 'No answer at {room}.'],
    asleep: ['You knock. Somewhere in {room} someone snores, and doesn\'t wake.', 'No answer: whoever lives in {room} is asleep.', 'You knock twice. The lights stay off. Whoever\'s in is asleep.'],
    masked: ['Someone looks through the peephole at the {mask}, and the door stays shut.', 'A voice behind the door: "Not opening to a {mask}. Go away."', 'The peephole goes dark, then light again. Nobody opens the door to a {mask}.'],
    stranger: ["Someone's home: the screen goes quiet. Nobody opens to a stranger.", 'A voice through the door: "Whatever you\'re selling, no."', 'The chain stays on. "Wrong door," says somebody, and that\'s that.'],
    through: ['{who} talks to you through the door, and doesn\'t open it.', '{who} opens the door the width of the chain. "What do you want?" It goes no wider.', '{who} answers without opening up: "Not now."'],
    letIn: ['{who} opens the door and waves you in.', '{who} lets you in: "Come in, quick, before the neighbors see."', 'The chain comes off. {who} steps back to let you in.'],
    rented: ['{room} is yours till noon. The key is a code on your phone.', 'The clerk slides a keycard across: {room}, till noon.', '{room}, till noon. Nobody asks who you are.'],
  },
};
