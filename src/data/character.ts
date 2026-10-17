import type { CharacterRules } from '../engine/character';

/**
 * Character creation, after the wiki's 2077 one: its three lifepaths, and a few parts of a
 * look. Where each lifepath starts is where its prologue does on the wiki (the Streetkid at El
 * Coyote Cojo in the Glen, the Nomad in the Badlands, the Corpo at the foot of Arasaka Tower),
 * and what it wears is the nearest the racks have to its starting clothes (a tank top and
 * streetwear; a vest and AT-AK pants; an office suit). The money, the reputations, who already
 * knows them and how each kind of person takes to them are ours.
 */
export const CHARACTER: CharacterRules = {
  lifepaths: {
    streetkid: {
      name: 'Streetkid',
      blurb: "Raised by Night City's streets: gangs, fixers, dolls and corner pushers all had a hand in it. You know the slang, the turf and who to stay clear of, and the street knows you.",
      district: 'heywood',
      place: 'El Coyote Cojo',
      cash: 50,
      account: 0,
      outfit: {},
      rep: { 'district:heywood': 10, 'gang:valentinos': 8 },
      known: { count: 2, district: 'heywood', gang: 'valentinos', rapport: 35 },
      voices: { gang: 0.6, street: 0.4, young: 0.3, corpo: -0.3 },
    },
    nomad: {
      name: 'Nomad',
      blurb: "You grew up on the road with a clan, out in the Badlands, and left it behind. Honest, loyal, at home in the desert, and still learning a city that keeps different books.",
      district: 'badlands',
      place: 'Sunset Motel',
      cash: 35,
      account: 0,
      outfit: { outer: 'duolayer-nylon-vest', legs: 'at-ak-utility-pants', feet: 'used-leather-combat-boots' },
      rep: { 'district:badlands': 12, 'gang:wraiths': -10 },
      known: { count: 1, district: 'badlands', rapport: 40 },
      voices: { nomad: 1, elder: 0.3, corpo: -0.4 },
    },
    corpo: {
      name: 'Corpo',
      blurb: 'You had a desk in a tower and a career climbing it, until the company was done with you. You read people and know how deals get made; the street can smell the tower on you.',
      district: 'city_center',
      place: 'Corpo Plaza',
      cash: 40,
      account: 300,
      outfit: { outer: 'synthetic-corporate-jacket', inner: 'reinforced-dress-shirt', legs: 'simple-office-pants', feet: 'designer-fleets' },
      rep: { 'district:city_center': 10 },
      known: { count: 2, district: 'city_center', corpo: true, rapport: 25 },
      voices: { corpo: 0.8, gang: -0.6, street: -0.2 },
    },
  },
  // The parts of a look are the wiki's creator's (hair and its color, eyes, a mark, body type, chest, genitals), in words, with our options.
  looks: {
    color: {
      label: 'Hair color',
      options: [
        { id: 'black', label: 'Black', words: 'black' },
        { id: 'brown', label: 'Brown', words: 'brown' },
        { id: 'blonde', label: 'Blonde', words: 'blonde' },
        { id: 'red', label: 'Red', words: 'red' },
        { id: 'grey', label: 'Grey', words: 'grey' },
        { id: 'platinum', label: 'Platinum', words: 'platinum', bold: true },
        { id: 'pink', label: 'Neon pink', words: 'neon pink', bold: true },
        { id: 'cyan', label: 'Cyan', words: 'cyan', bold: true },
        { id: 'green', label: 'Acid green', words: 'acid green', bold: true },
        { id: 'violet', label: 'Violet', words: 'violet', bold: true },
      ],
    },
    length: {
      label: 'Hair length',
      options: [
        { id: 'shaved', label: 'Shaved', words: 'shaved head', bold: true },
        { id: 'buzzed', label: 'Buzzed', words: '{color} buzz cut' },
        { id: 'short', label: 'Short', words: 'short' },
        { id: 'shoulder', label: 'Shoulder', words: 'shoulder-length' },
        { id: 'long', label: 'Long', words: 'long' },
      ],
    },
    style: {
      label: 'Hair style',
      options: [
        { id: 'loose', label: 'Loose', words: '{length} {color} hair' },
        { id: 'ponytail', label: 'Ponytail', words: '{length} {color} hair in a ponytail' },
        { id: 'braids', label: 'Braids', words: '{length} {color} braids' },
        { id: 'bun', label: 'Bun', words: '{length} {color} hair in a bun' },
        { id: 'slicked', label: 'Slicked back', words: '{length} {color} hair, slicked back' },
        { id: 'undercut', label: 'Undercut', words: '{length} {color} hair, undercut', bold: true },
        { id: 'mohawk', label: 'Mohawk', words: '{length} {color} mohawk', bold: true },
        { id: 'spiked', label: 'Spiked', words: 'spiked {length} {color} hair', bold: true },
      ],
    },
    eyes: {
      label: 'Eyes',
      options: [
        { id: 'brown', label: 'Brown', words: 'brown eyes' },
        { id: 'hazel', label: 'Hazel', words: 'hazel eyes' },
        { id: 'blue', label: 'Blue', words: 'blue eyes' },
        { id: 'green', label: 'Green', words: 'green eyes' },
        { id: 'grey', label: 'Grey', words: 'grey eyes' },
        { id: 'optics', label: 'Chrome optics', words: 'chrome optics' },
        { id: 'red', label: 'Red optics', words: 'red optics' },
      ],
    },
    mark: {
      label: 'Mark',
      options: [
        { id: 'none', label: 'None', words: '' },
        { id: 'tattoo', label: 'Face tattoo', words: 'face tattoo' },
        { id: 'scar', label: 'Scar', words: 'scar' },
        { id: 'piercings', label: 'Piercings', words: 'piercings' },
        { id: 'chrome', label: 'Chrome jaw', words: 'chrome jaw' },
      ],
    },
    build: {
      label: 'Build',
      options: [
        { id: 'slight', label: 'Slight', words: 'slight build' },
        { id: 'lean', label: 'Lean', words: 'lean build' },
        { id: 'average', label: 'Average', words: 'average build' },
        { id: 'athletic', label: 'Athletic', words: 'athletic build' },
        { id: 'muscular', label: 'Muscular', words: 'muscular build' },
        { id: 'heavy', label: 'Heavy-set', words: 'heavy-set build' },
      ],
    },
    chest: {
      label: 'Chest',
      options: [
        { id: 'flat', label: 'Flat', words: 'flat chest' },
        { id: 'small', label: 'Small breasts', words: 'small breasts' },
        { id: 'medium', label: 'Medium breasts', words: 'medium breasts' },
        { id: 'large', label: 'Large breasts', words: 'large breasts' },
      ],
    },
    genitals: {
      label: 'Genitals',
      options: [
        { id: 'vulva', label: 'Vulva', words: 'vulva' },
        { id: 'penis', label: 'Penis', words: 'penis' },
      ],
    },
    size: {
      label: 'Size',
      options: [
        { id: 'small', label: 'Small', words: 'small' },
        { id: 'average', label: 'Average', words: 'average' },
        { id: 'large', label: 'Large', words: 'large' },
      ],
    },
  },
  // The people's looks: dark hair most of all, grey with age, a dye now and then among the young; the gangs as the wiki has them
  // (Maelstrom more chrome than face, the Animals juiced, the Mox punk, ink on the Tyger Claws and the Valentinos); bodies by pronouns.
  people: {
    color: {
      base: { black: 5, brown: 5, blonde: 1.5, red: 0.6 },
      old: { grey: 9 },
      young: { platinum: 0.4, pink: 0.4, cyan: 0.4, green: 0.25, violet: 0.3 },
      gang: { mox: { pink: 3, cyan: 2, violet: 2, platinum: 1 }, tyger_claws: { cyan: 1.5, pink: 1.5, platinum: 1 }, maelstrom: { platinum: 1, cyan: 0.5 } },
    },
    length: {
      base: { short: 4, shoulder: 2, long: 2, buzzed: 1.5, shaved: 0.6 },
      pronouns: { she: { long: 4, shoulder: 3, short: 1 }, he: { short: 3, buzzed: 2.5, shaved: 1 } },
      gang: { animals: { buzzed: 3, shaved: 3 }, maelstrom: { shaved: 3 }, sixth_street: { buzzed: 3 }, barghest: { buzzed: 4 } },
    },
    style: {
      base: { loose: 6, ponytail: 1.5, braids: 1.2, bun: 1, slicked: 1, undercut: 1, mohawk: 0.3, spiked: 0.3 },
      young: { undercut: 1, mohawk: 0.6, spiked: 0.6 },
      old: { bun: 1 },
      gang: { mox: { mohawk: 3, undercut: 2, spiked: 2 }, tyger_claws: { undercut: 2, spiked: 1.5 }, valentinos: { slicked: 3 } },
    },
    eyes: {
      base: { brown: 6, hazel: 2, blue: 1.5, green: 1, grey: 1, optics: 0.6, red: 0.15 },
      young: { optics: 0.4 },
      gang: { maelstrom: { optics: 14, red: 6 }, tyger_claws: { optics: 2 }, sixth_street: { optics: 1 }, barghest: { optics: 2 } },
    },
    mark: {
      base: { none: 10, tattoo: 1, scar: 0.8, piercings: 0.8, chrome: 0.2 },
      young: { piercings: 1.5, tattoo: 1 },
      gang: { valentinos: { tattoo: 4 }, tyger_claws: { tattoo: 4 }, voodoo_boys: { tattoo: 3 }, mox: { piercings: 4 }, maelstrom: { chrome: 8 }, animals: { scar: 2 }, scavengers: { scar: 2, chrome: 1 }, wraiths: { scar: 3 }, sixth_street: { scar: 1 }, barghest: { scar: 2 } },
    },
    build: {
      base: { slight: 1, lean: 2, average: 4, athletic: 1.5, muscular: 0.8, heavy: 2 },
      young: { lean: 1, athletic: 1 },
      old: { heavy: 1, slight: 1 },
      gang: { animals: { muscular: 12 }, barghest: { athletic: 3, muscular: 2 }, sixth_street: { athletic: 2, muscular: 1 }, maelstrom: { lean: 2 } },
    },
    chest: {
      base: {},
      pronouns: { she: { flat: 0.4, small: 3, medium: 4, large: 2 }, he: { flat: 8, small: 0.6 }, they: { flat: 2.5, small: 2, medium: 2, large: 1 } },
    },
    genitals: {
      base: {},
      pronouns: { she: { vulva: 97, penis: 3 }, he: { penis: 97, vulva: 3 }, they: { vulva: 1, penis: 1 } },
    },
    size: { base: { small: 1, average: 3, large: 1 } },
  },
  styleless: ['shaved', 'buzzed'],
  sized: ['penis'],
  adultAt: 18,
};
