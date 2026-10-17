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
  looks: {
    hair: {
      label: 'Hair',
      options: [
        { id: 'buzz', label: 'Buzz cut', words: '{color} buzz cut' },
        { id: 'mohawk', label: 'Mohawk', words: '{color} mohawk' },
        { id: 'undercut', label: 'Undercut', words: '{color} undercut' },
        { id: 'bob', label: 'Bob', words: '{color} bob' },
        { id: 'braids', label: 'Braids', words: '{color} braids' },
        { id: 'long', label: 'Long', words: 'long {color} hair' },
        { id: 'shaved', label: 'Shaved', words: 'shaved head' },
      ],
    },
    color: {
      label: 'Color',
      options: [
        { id: 'black', label: 'Black', words: 'black' },
        { id: 'brown', label: 'Brown', words: 'brown' },
        { id: 'platinum', label: 'Platinum', words: 'platinum' },
        { id: 'red', label: 'Red', words: 'red' },
        { id: 'pink', label: 'Neon pink', words: 'neon pink' },
        { id: 'cyan', label: 'Cyan', words: 'cyan' },
        { id: 'green', label: 'Acid green', words: 'acid green' },
      ],
    },
    eyes: {
      label: 'Eyes',
      options: [
        { id: 'brown', label: 'Brown', words: 'brown eyes' },
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
  },
};
