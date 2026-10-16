import type { SkillRules } from '../engine/skills';

/**
 * Charisma: how far the player's words go. Every chat, gift and answered question is
 * experience; level 2 takes 30 of it (about fifteen chats), each level after about twice
 * the one before. Each level makes every chat and gift worth a fifth more rapport and makes
 * wary and cold people a little likelier to answer a question.
 */
export const CHARISMA: SkillRules = {
  xpFirstLevel: 30,
  xpGrowth: 1.6,
  perLevel: 0.2,
  levelLine: 'Charisma level {level}. People warm to you faster, and answer more.',
};

/**
 * Street Brawler, the wiki's 2077 skill for fists and blunt weapons: every blow landed bare-
 * handed or with Gorilla Arms is experience (a club or a bat half as much), a knockout more.
 * Each level makes those blows land a little more often, hit a tenth harder, and put people
 * out cold more often.
 */
export const BRAWLER: SkillRules = {
  xpFirstLevel: 25,
  xpGrowth: 1.6,
  perLevel: 0.1,
  levelLine: 'Street Brawler level {level}. Your fists hit harder, and knock people out sooner.',
};

/**
 * Toughness (ours: the wiki has no skill for taking a beating): every blow taken is
 * experience, more for one that could have knocked the player out, and so is walking away
 * from a fight on their own feet. Each level makes it a sixth harder to knock them out.
 */
export const TOUGHNESS: SkillRules = {
  xpFirstLevel: 25,
  xpGrowth: 1.6,
  perLevel: 0.16,
  levelLine: 'Toughness level {level}. It takes more to knock you out.',
};
