import type { SocietyRules } from '../engine/society';

/**
 * How what the player does to people spreads, and what comes of it. A robbery is worth 55
 * grudge to the victim; a spouse feels all of it, a cousin half, a coworker a third, each by
 * their loyalty; what they feel spreads on to their own people at a third. A witness feels
 * a third and talks. The victim's gang loses half of it in reputation, their workplace most
 * of it (a storefront stops serving at -30), the neighborhood a fifth. Grudges fade a point a
 * day and reputations recover two, on the game's clock (sped up by the test speed).
 *
 * Openness is what it takes to get something out of someone. A stranger with no charisma
 * (level 1, neutral) gives their name, talks about the neighborhood and their lot, and tells
 * their work or their tastes about half the time; their age gets a non-answer, where they
 * live and who they hate a no. Each level of charisma is worth half a point; a warm person
 * gives a point and a half for free, a friend three. So around level 3 strangers start to
 * give their age, around level 5 who they hate and, now and then, where they live; a warm
 * person tells you most things, a friend everything. Asking again within the talk cooldown
 * after a no costs two rapport.
 */
export const SOCIETY: SocietyRules = {
  closeness: { spouse: 1, parent: 0.9, child: 0.9, sibling: 0.8, cousin: 0.5, uncle: 0.5, nephew: 0.5, kin: 0.4, friend: 0.5, crew: 0.45, coworker: 0.3 },
  severity: { insult: 12, robbery: 55, assault: 75, murder: 100 },
  gossip: 0.35,
  witness: 0.3,
  rep: { gang: 0.5, business: 0.6, district: 0.2, rival: 0.15, banAt: -30, recoverPerDay: 2 },
  forgivePerDay: 1,
  stances: { hostile: -40, cold: -15, wary: -4, warm: 20, friend: 55 },
  revenge: { grudgeAt: 35, delayHours: [2, 36], base: 20, takeBack: 1.5, huntHours: [6, 48] },
  talk: { base: 4, cooldownMinutes: 90, revealAt: 20 },
  gift: { base: 6, favorite: 12 },
  insult: { rapport: 8 },
  openness: {
    stance: { hostile: -9, cold: -2.5, wary: -1.2, neutral: 0, warm: 1.5, friend: 3 },
    perLevel: 0.5,
    traits: { chatty: 1.2, warmth: 0.8, loyalty: 1, courage: 1 },
    cost: { name: -1, job: 0, likes: 0, age: 1, hates: 1.2, home: 2, kin: 1.6, district: -1, life: -1, here: -1, rumor: -1 },
    answerAt: 1,
    deflectAt: -1,
    press: 2,
  },
};
