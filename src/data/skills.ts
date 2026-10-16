import type { SkillRules } from '../engine/skills';

/**
 * Every skill starts the player off worse than anyone, and level 4 is where an ordinary
 * person stands: below it each skill holds the player back (its `floor` at level 1), and
 * only past it does it carry them, by its `perLevel` a level. From pathetic to professional.
 */
const AVERAGE = 4;

/**
 * Charisma: how far the player's words go. Every chat, gift and answered question is
 * experience; level 2 takes 30 of it (about fifteen chats), each level after about twice
 * the one before. At level 1 a chat or a gift is worth seven tenths of what it would be to
 * anyone, and people answer a good deal less; from level 4 each level makes them worth a
 * fifth more and people likelier to answer.
 */
export const CHARISMA: SkillRules = {
  xpFirstLevel: 30,
  xpGrowth: 1.6,
  average: AVERAGE,
  floor: 0.7,
  perLevel: 0.2,
  levelLine: 'Charisma level {level}. People warm to you faster, and answer more. {standing}',
};

/**
 * Street Brawler, the wiki's 2077 skill for fists and blunt weapons: every blow landed bare-
 * handed or with Gorilla Arms is experience (a club or a bat half as much), a knockout more.
 * At level 1 the player's fists land less and hit six tenths as hard as anyone's; from level 4
 * each level makes them land a little more often, hit a tenth harder, and put people out
 * cold more often (with a club, only the knocking out: the club's own levels do the rest).
 */
export const BRAWLER: SkillRules = {
  xpFirstLevel: 25,
  xpGrowth: 1.6,
  average: AVERAGE,
  floor: 0.6,
  perLevel: 0.1,
  levelLine: 'Street Brawler level {level}. Your fists hit harder, and knock people out sooner. {standing}',
};

/**
 * Toughness (ours: the wiki has no skill for taking a beating): every blow taken is
 * experience, more for one that could have knocked the player out, and so is walking away
 * from a fight on their own feet. At level 1 the player goes out cold far easier than anyone;
 * from level 4 each level makes it a sixth harder to knock them out.
 */
export const TOUGHNESS: SkillRules = {
  xpFirstLevel: 25,
  xpGrowth: 1.6,
  average: AVERAGE,
  floor: 0.8,
  perLevel: 0.16,
  levelLine: 'Toughness level {level}. It takes more to knock you out. {standing}',
};

/**
 * A kind of weapon (pistols, katanas, Mantis Blades…; fists are Street Brawler's): every
 * shot or swing with one is experience, a hit more, the blow that ends it most. At level 1
 * the player hits with one seven tenths as hard as anyone, and lands it less; from level 4
 * each level is six percent more.
 */
export const WEAPON_TYPE: SkillRules = {
  xpFirstLevel: 30,
  xpGrowth: 1.5,
  average: AVERAGE,
  floor: 0.7,
  perLevel: 0.06,
  levelLine: '{type} level {level}. {standing}',
};

/**
 * One weapon, the model (a Lexington, a Tsumetogi, the Gorilla Arms): the same experience,
 * on top of the kind's. A gun the player has never fired is a little worse in their hands
 * than one they know; from level 4 each level is four percent more, and the model's perks
 * come at their levels (`COMBAT.mastery.perks`).
 */
export const WEAPON_MODEL: SkillRules = {
  xpFirstLevel: 20,
  xpGrowth: 1.5,
  average: AVERAGE,
  floor: 0.9,
  perLevel: 0.04,
  levelLine: 'Your {weapon}, level {level}. {standing}',
};

/** Where a level leaves the player, by how far it is past an ordinary person's (the last that fits). */
export const STANDING: Array<{ from: number; line: string }> = [
  { from: -99, line: 'Still worse at it than most people.' },
  { from: 0, line: 'As good at it as most people, now.' },
  { from: 1, line: 'Better at it than most.' },
  { from: 4, line: 'Few are better at it.' },
  { from: 6, line: 'A professional.' },
];

/**
 * Trading (the tabletop games' skill for buying and selling): every purchase is experience,
 * and every sale. At level 1 the player pays over what anyone would (and gets under it when
 * they sell); from level 4 each level gets them a twentieth more of a good price. What they
 * pay is their Trading against the seller's (`MONEY.haggle`), so a sharp shopkeeper costs more.
 */
export const TRADING: SkillRules = {
  xpFirstLevel: 30,
  xpGrowth: 1.6,
  average: AVERAGE,
  floor: 0.85,
  perLevel: 0.05,
  levelLine: 'Trading level {level}. You get a better price, buying and selling. {standing}',
};

