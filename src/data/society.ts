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
 * after a no costs two rapport. A netrunner chops a stolen credchip about as readily as a
 * stranger talks about their work, the greedy more so; a boss takes the player on a little
 * less readily than that (a stranger with no way with words gets a job one time in five; a
 * warm boss nearly always). A mask on the player costs 1.2 with
 * everyone (a stranger in one gets a name out of people, sometimes, and little else; a friend
 * still tells most things), and reads as 20 points against the player to anyone in a gang: a
 * ganger who'd be a stranger is cold to a mask on their turf.
 *
 * Memory is what people keep of the player, thing by thing. The one robbed remembers it a
 * month, the people who heard of it two weeks, a witness ten days; a boss remembers being
 * walked out on three weeks (and won't take the player back while they do), letting them go
 * a month; a gift a week. What's on someone's mind most, and freshest, is what they bring
 * up, three times in four when there's something: a grievance up to three times, the rest
 * once or twice. Something heard of sticks from five grudge up. A gift is worth a good word:
 * the people closest to whoever got it warm to the player by two fifths of it, times how
 * close they are. Twelve memories a person at most.
 */
export const SOCIETY: SocietyRules = {
  closeness: { spouse: 1, partner: 0.8, parent: 0.9, child: 0.9, sibling: 0.8, cousin: 0.5, uncle: 0.5, nephew: 0.5, kin: 0.4, friend: 0.5, crew: 0.45, coworker: 0.3 },
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
  chop: { rapport: 2 },
  mask: { turf: 20 },
  openness: {
    stance: { hostile: -9, cold: -2.5, wary: -1.2, neutral: 0, warm: 1.5, friend: 3 },
    perLevel: 0.5,
    traits: { chatty: 1.2, warmth: 0.8, loyalty: 1, courage: 1, greed: 1 },
    cost: { name: -1, job: 0, likes: 0, age: 1, hates: 1.2, home: 2, kin: 1.6, district: -1, life: -1, here: -1, rumor: -1, news: -1.5, chop: 0.4, hire: 0.6 },
    mask: 1.2,
    answerAt: 1,
    deflectAt: -1,
    press: 2,
  },
  memory: {
    cap: 12,
    days: { wronged: 30, heard: 14, saw: 10, settled: 21, gift: 7, goodWord: 10, hired: 7, promoted: 7, quit: 21, fired: 30, chopped: 10, asked: 5 },
    weight: { wronged: 10, heard: 6, saw: 5, settled: 7, gift: 3, goodWord: 4, hired: 3, promoted: 4, quit: 6, fired: 6, chopped: 2, asked: 2 },
    repeat: { wronged: 3, heard: 2, saw: 1, settled: 1, gift: 1, goodWord: 1, hired: 1, promoted: 1, quit: 2, fired: 2, chopped: 1, asked: 1 },
    recall: 0.75,
    heardAt: 5,
    goodWord: 0.4,
  },
};
