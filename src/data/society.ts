import type { When } from '../engine/dialogue';
import type { SocietyRules } from '../engine/society';

// Who people are, for what they like and don't (see `reactions`).
const gang: When = { gang: true };
const corpo: When = { voice: ['corpo'] };
const stranger: When = { stance: ['neutral', 'wary', 'cold'] };
const chatty: When = { traits: { chatty: 'high' } };
const quiet: When = { traits: { chatty: 'low' } };
const kind: When = { traits: { warmth: 'high' } };
const hard: When = { traits: { warmth: 'low' } };
const hot: When = { traits: { temper: 'high' } };
const timid: When = { traits: { courage: 'low' } };
const loyal: When = { traits: { loyalty: 'high' } };
const smooth: When = { eloquence: ['smooth'] };
const blunt: When = { eloquence: ['blunt'] };

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
 *
 * The moment moves people too: a drink in hand is worth half a point on anything; being busy
 * or eating costs a little on anything but their work; from the fourth question in a row
 * (within twenty minutes of the last) each costs 0.4 more and a point of rapport; the gang
 * they hate sitting right there costs up to 2.4 on who they hate, less the braver they are;
 * grief costs 0.4; the small hours cost 0.6 on where they live; a drunk player costs 0.4
 * with anyone short of warm.
 *
 * And people like and dislike things. Each reaction that fits adds up, two rapport a point
 * (just chatting is the safe way in: the chatty and the drinking like it, nobody minds it)
 * and 0.4 openness: a ganger likes running down rivals and hates saying where they sleep; a
 * stranger is put off being asked their address, an older one their age; anyone (not busy)
 * likes talking food. A compliment lands with the warm and the young and falls flat with the
 * hard, the suspicious and a corpo; a joke lands with the chatty and the drinking, not with a
 * temper, the busy or the grieving; gossip with the chatty, not with the loyal or the
 * nervous; asking how they're holding up means most to the grieving and the broke, and is
 * pity to the hard and to a gang. How well the player puts it counts: smooth lands better,
 * blunt worse.
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
    perLevel: 0.8,
    traits: { chatty: 1.2, warmth: 0.8, loyalty: 1, courage: 1, greed: 1 },
    cost: { name: -1, job: 0, likes: 0, age: 0.6, hates: 1.2, home: 2, kin: 1.6, district: -1, life: -1, here: -1, rumor: -1, news: -1.5, dream: 0.3, views: -0.5, type: 0.8, chop: 0.4, hire: 0.6, deal: 0.9, pitch: 0.3, recruit: 1.1 },
    mask: 1.2,
    answerAt: 1,
    deflectAt: -1,
    press: 2,
    moment: { drinking: 0.5, busy: 0.4, eating: 0.2, grilled: 0.4, enemy: 1.6, grieving: 0.4, late: 0.6, drunk: 0.4 },
    grill: { free: 3, minutes: 20, rapport: 1 },
    // What they remember of the player: all good is near a friend's openness again, all bad near a cold one's.
    memory: 2,
  },
  memory: {
    // On the calendar: a robbery is a month and a half of being remembered, a killing heard of the best part of a year.
    clock: 1,
    cap: 24,
    deep: { murder: 8, assault: 2, robbery: 1.5 },
    days: { wronged: 30, heard: 14, saw: 10, settled: 21, gift: 14, goodWord: 14, hired: 30, promoted: 30, quit: 30, notice: 14, fired: 30, chopped: 14, date: 21, dumped: 45, cheated: 30, chat: 10, rebuffed: 14, covered: 30, backed: 60 },
    weight: { wronged: 10, heard: 6, saw: 5, settled: 7, gift: 3, goodWord: 4, hired: 3, promoted: 4, quit: 6, notice: 3, fired: 6, chopped: 2, date: 3, dumped: 8, cheated: 7, chat: 2, rebuffed: 3, covered: 4, backed: 6 },
    repeat: { wronged: 3, heard: 2, saw: 1, settled: 1, gift: 1, goodWord: 1, hired: 1, promoted: 1, quit: 2, notice: 1, fired: 2, chopped: 1, date: 1, dumped: 2, cheated: 2, chat: 1, rebuffed: 1, covered: 2, backed: 2 },
    recall: 0.75,
    heardAt: 5,
    goodWord: 0.4,
    // A fresh gift and a good chat, or a robbery, go a third of the way; a killing heard of goes all of it.
    regard: 12,
  },
  // A friend in the right place: two hours before someone comes to collect, whoever thinks well of you and knows them sends word.
  warning: {
    hours: 2,
    regard: 0.25,
    lines: {
      person: [
          'A message from {who}: "Heads up: {name} has been asking where you drink. Watch your back tonight."',
          '{who} pings you: "Heads up. {name} is coming for you, and soon. You didn\'t hear it from me."',
          'Word from {who}: "Heads up: {name} wants a word with you, the kind with fists. Keep your eddies somewhere safe."',
      ],
      gang: [
          'A message from {who}: "{gang} have your name. Stay off the street a while."',
          '{who} pings you: "Heard {gang} talking about you. It wasn\'t friendly. Bank what you\'re carrying."',
          'Word from {who}: "{gang} are sending someone your way. Be smart about it."',
      ],
    },
  },
  // A flirt that lands with someone drawn to you is worth five spark a point, the way in they fall for three more; twenty spark and fifteen
  // rapport, warm or better, and they'll say yes. A date is twelve, three dates and forty-five spark and it can be official. Spark fades
  // a point and a half a day; under four, or caught flirting twice, and they end it.
  romance: {
    adultAt: 18,
    fadePerDay: 1.5,
    flirt: 5,
    miss: 3,
    wants: 3,
    gift: 4,
    ask: { spark: 20, rapport: 15, stances: ['warm', 'friend'], yes: 8 },
    date: { from: 18, to: 2, spark: 12, rapport: 5, favorite: 4 },
    official: { dates: 3, spark: 45, rapport: 6 },
    endAt: 4,
    cheats: 2,
    jealous: { spark: 15, rapport: 8, grudge: 6 },
    dumped: { rapport: 20, grudge: 15, kin: 4 },
    sweetAt: 25,
  },
  reactions: {
    rapport: 2,
    openness: 0.4,
    asked: {
      name: [{ when: { gang: true, needs: ['handle'] }, by: 1, why: 'Proud of {his} street name' }],
      job: [
        { when: gang, by: 1, why: 'Proud of {his} colors' },
        { when: { needs: ['isBoss'] }, by: 1, why: 'Proud of {his} place' },
        { when: { needs: ['jobless'] }, by: -1, why: 'Sore about being out of work' },
        { when: { needs: ['slow'] }, by: -1, why: 'Business is bad: a sore subject' },
      ],
      age: [
        { when: { needs: ['ageOld'] }, by: -1, why: "Doesn't like being asked {his} age" },
        { when: corpo, by: -1, why: 'Finds it an unprofessional question' },
        { when: { needs: ['ageElder'], traits: { chatty: 'high' } }, by: 2, why: 'Happy to talk about the old days' },
      ],
      home: [
        { when: stranger, by: -1, why: 'Wary of a stranger asking where {he} live{s}' },
        { when: gang, by: -1, why: 'Gangers keep where they sleep quiet' },
        { when: { needs: ['mask'] }, by: -2, why: "Won't tell a mask where {he} sleep{s}" },
        { when: { needs: ['late'] }, by: -1, why: 'Too late at night for that question' },
      ],
      likes: [
        { when: { mood: ['easy', 'eating', 'drinking', 'court', 'home'] }, by: 1, why: 'Likes talking food' },
        { when: { mood: ['eating'] }, by: 1, why: 'Mid-meal, and happy to talk about it' },
      ],
      hates: [
        { when: gang, by: 2, why: 'Loves running down {his} rivals' },
        { when: { needs: ['hate'], traits: { temper: 'high' } }, by: 1, why: 'Glad of the chance to vent' },
        { when: timid, by: -1, why: 'Nervous talking about gangs' },
        { when: { needs: ['enemyHere'] }, by: -2, why: '{enemyHere} are right here' },
      ],
      type: [
        { when: { needs: ['drawn', 'sweet'] }, by: 1, why: 'Glad you asked' },
        { when: stranger, by: -1, why: 'A personal question from a stranger' },
        { when: { needs: ['taken'] }, by: -1, why: 'Spoken for, and you know it' },
      ],
    },
    approach: {
      chat: [
        { when: { needs: ['drawn', 'wantsChat'], lacks: ['taken'] }, by: 1, why: 'Likes how easy you are to talk to' },
        { when: chatty, by: 1, why: 'Likes a chat' },
        { when: { mood: ['drinking'] }, by: 1, why: 'Glad of the company over a drink' },
      ],
      compliment: [
        { when: { needs: ['drawn', 'wantsCompliment'], lacks: ['taken'] }, by: 1, why: 'Weak for a way with words' },
        { when: kind, by: 2, why: 'Likes a kind word' },
        { when: { needs: ['ageYoung'] }, by: 1, why: 'Likes being noticed' },
        { when: gang, by: 1, why: 'Likes respect' },
        { when: smooth, by: 1, why: 'You put it well' },
        { when: hard, by: -2, why: 'Not one for flattery' },
        { when: corpo, by: -1, why: 'Hears a sales pitch' },
        { when: { stance: ['wary', 'cold'] }, by: -1, why: 'Suspicious of compliments from you' },
        { when: blunt, by: -1, why: 'It came out clumsy' },
      ],
      joke: [
        { when: { needs: ['drawn', 'wantsJoke'], lacks: ['taken'] }, by: 1, why: 'Falls for anyone who makes {him} laugh' },
        { when: chatty, by: 1, why: 'Likes a laugh' },
        { when: { mood: ['drinking'] }, by: 1, why: "A few drinks in: everything's funny" },
        { when: smooth, by: 1, why: 'Good delivery' },
        { when: hot, by: -2, why: 'Not in the mood for jokes' },
        { when: quiet, by: -1, why: "Doesn't do jokes" },
        { when: { mood: ['busy'] }, by: -1, why: 'Too busy to laugh' },
        { when: corpo, by: -1, why: "Humor isn't in the job description" },
        { when: blunt, by: -1, why: 'The joke fell flat' },
        { when: { needs: ['grief'] }, by: -3, why: 'Grieving {his} {griefWord}' },
      ],
      gossip: [
        { when: { needs: ['drawn', 'wantsGossip'], lacks: ['taken'] }, by: 1, why: 'Likes someone who knows what goes on' },
        { when: chatty, by: 2, why: 'Loves gossip' },
        { when: { needs: ['news'] }, by: 1, why: 'Has news to tell' },
        { when: { mood: ['drinking'] }, by: 1, why: 'Loose-lipped with a drink in hand' },
        { when: loyal, by: -1, why: "Doesn't talk behind people's backs" },
        { when: timid, by: -1, why: 'Nervous about loose talk' },
        { when: corpo, by: -1, why: 'Careful what gets around' },
      ],
      flirt: [
        { when: { needs: ['withYou'] }, by: 2, why: 'Already seeing you' },
        { when: { needs: ['drawn'], lacks: ['taken', 'withYou'] }, by: 1, why: 'Drawn to you' },
        { when: { needs: ['sweet'], lacks: ['withYou'] }, by: 1, why: 'Sweet on you' },
        { when: { needs: ['yourType'] }, by: 1, why: 'Likes your look' },
        { when: { lacks: ['drawn'] }, by: -2, why: 'Not drawn to you' },
        { when: { needs: ['taken', 'drawn'], lacks: ['withYou'] }, by: -2, why: 'Spoken for: {his} {takenWord}' },
        { when: { needs: ['taken'], lacks: ['drawn', 'withYou'] }, by: -1, why: 'Spoken for: {his} {takenWord}' },
        { when: { stance: ['wary', 'cold'] }, by: -2, why: "Doesn't trust you that far" },
        { when: { mood: ['drinking'] }, by: 1, why: 'A drink in, and in the mood' },
        { when: { mood: ['busy'] }, by: -1, why: 'Working' },
        { when: smooth, by: 1, why: 'Smooth' },
        { when: blunt, by: -1, why: 'The line came out clumsy' },
        { when: { needs: ['youDrunk'] }, by: -1, why: "You're drunk" },
        { when: { needs: ['mask'] }, by: -2, why: 'Hard to flirt with a {mask}' },
        { when: { needs: ['grief'] }, by: -3, why: 'Grieving {his} {griefWord}' },
      ],
      care: [
        { when: { needs: ['drawn', 'wantsCare'], lacks: ['taken'] }, by: 1, why: 'Likes someone who listens' },
        { when: { needs: ['grief'] }, by: 3, why: 'Needed someone to ask, after losing {his} {griefWord}' },
        { when: { needs: ['broke'] }, by: 2, why: 'Glad someone noticed how tight things are' },
        { when: { needs: ['slow'] }, by: 1, why: 'Work has been rough: glad you asked' },
        { when: kind, by: 1, why: 'Touched you asked' },
        { when: hard, by: -1, why: "Doesn't want your pity" },
        { when: gang, by: -1, why: '{gang} take no pity' },
        { when: { stance: ['wary', 'cold'] }, by: -1, why: 'Thinks you are prying' },
      ],
    },
  },
};
