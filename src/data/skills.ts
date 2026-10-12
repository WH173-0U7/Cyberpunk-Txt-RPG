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
