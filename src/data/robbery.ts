import type { RobberyRules } from '../engine/robbery';

/**
 * How a robbery goes, by fear (all ours). Somebody bare-handed starts a stranger half way to
 * terrified, before their own nerve; a gun adds two fifths, a blade a quarter, a club a fifth,
 * chrome in the arms a sixth, a mask a tenth, being better than them with what you'd use three
 * hundredths a level up to five (worse, as much off: a new player, pathetic with their fists, is
 * nothing to be afraid of), and what they've heard of you up to a quarter (a killing). A weapon
 * of their own takes a tenth back, their nerve up to half, their people here an eighth each (up
 * to three), a crowd a little, their own turf a fifth, and an officer is never afraid of a
 * mugger. Looking hurt or drunk takes a tenth off each.
 *
 * Under a fifth someone hands over nothing, and the brave and the hot-tempered fight (by the
 * square of their nerve and their temper, so an ordinary one mostly just says no); from three
 * twentieths their share of the cash climbs to all of it at nine tenths, the greedy holding back
 * up to half of what they'd give. The chip goes from two thirds afraid, a valuable from three
 * quarters (jewellery a little more), the greedy needing more. What they kept back can be gone
 * after for a point of energy, within ten minutes, at their fear plus a tenth, less a third of
 * their nerve; failing, the hot-tempered swing (three fifths of their temper), and the rest pull
 * free. Over a city: bare-handed and new to it, about one in seven fights and nearly half say no;
 * with a gun, about two fifths of the cash comes over, two thirds with a search; at the top, with
 * a mask, nine tenths.
 */
export const ROBBERY: RobberyRules = {
  search: { energy: 1, bonus: 0.1, courage: 0.35, least: 0.05, most: 0.95, minutes: 10, temper: 0.6 },
  fear: {
    base: 0.5,
    drawn: { gun: 0.4, blade: 0.25, blunt: 0.2, none: 0 },
    chrome: 0.15,
    perLevel: 0.03,
    levels: 5,
    armed: 0.1,
    mask: 0.1,
    dread: { murder: 0.25, assault: 0.15, robbed: 0.1 },
    courage: 0.5,
    backup: { each: 0.12, most: 0.36 },
    watching: { each: 0.03, most: 0.15 },
    turf: 0.2,
    officer: 0.8,
    hurt: 0.1,
    drunk: 0.1,
  },
  bands: [
    { at: 0.85, label: 'Terrified' },
    { at: 0.65, label: 'Scared' },
    { at: 0.45, label: 'Nervous' },
    { at: 0.3, label: 'Uneasy' },
    { at: 0, label: 'Unafraid' },
  ],
  hand: { from: 0.15, to: 0.9, greed: 0.5 },
  chip: { at: 0.65, greed: 0.15 },
  valuable: { at: 0.75, greed: 0.15, jewellery: 0.05 },
  refuse: { below: 0.2 },
  fight: { below: 0.2, courage: 0.5, temper: 0.3 },
};
