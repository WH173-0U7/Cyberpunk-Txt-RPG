import type { DialogueLines, Fragment, When } from '../engine/dialogue';

/**
 * What people say: fragments the engine puts together on the spot (`src/engine/dialogue.ts`).
 * Each is our own words in Night City's voice, with its streetslang from the wiki (choom and
 * choomba, gonk, preem and nova, eddies and eds, badges, delta, scop and kibble, flatlined,
 * the Red…) swapped in by who's talking. A plain string fits anyone; `only(text, when)` fits
 * the people it says. `{...}` is filled in from the speaker's life (`{work}`, `{dish}`,
 * `{kinName}`…), from the moment (`{here}`, `{late}`) and from the lexicon (`{choom}`).
 */
const only = (text: string, when: When): Fragment => ({ text, when });
/** A line that should win over the plain ones whenever it fits. */
const loud = (text: string, when: When, weight = 6): Fragment => ({ text, when, weight });
/** A line for when nothing more particular fits: it gives way to the ones that say more. */
const vague = (text: string, when: When): Fragment => ({ text, when, weight: 0.3 });

// Who they are.
const ganger: When = { voice: ['gang'] };
const corpo: When = { voice: ['corpo'] };
const nomad: When = { voice: ['nomad'] };
const elder: When = { voice: ['elder'] };
const young: When = { voice: ['young'] };
// What they're doing.
const busy: When = { mood: ['busy'] };
const eating: When = { mood: ['eating'] };
const drinking: When = { mood: ['drinking'] };
const court: When = { mood: ['court'] };
const home: When = { mood: ['home'] };
// How they feel about the player.
const wary: When = { stance: ['wary'] };
const neutral: When = { stance: ['neutral'] };
const warm: When = { stance: ['warm', 'friend'] };
const friend: When = { stance: ['friend'] };
const cold: When = { stance: ['cold'] };
// How well they know the player.
const first: When = { history: ['first'] };
const recent: When = { history: ['recent'] };
const regular: When = { history: ['regular'] };
const long: When = { history: ['long'] };
// Their nature.
const chatty: When = { traits: { chatty: 'high' } };
const quiet: When = { traits: { chatty: 'low' } };
const hot: When = { traits: { temper: 'high' } };
const kind: When = { traits: { warmth: 'high' } };
const hard: When = { traits: { warmth: 'low' } };
const greedy: When = { traits: { greed: 'high' } };
const brave: When = { traits: { courage: 'high' } };
const timid: When = { traits: { courage: 'low' } };
const loyal: When = { traits: { loyalty: 'high' } };
// The moment: a mask on the player, or a face.
const masked: When = { needs: ['mask'] };
const bare: When = { lacks: ['mask'] };
// What happened between people lately, and what the speaker was to it (life.ts): theirs, a relative's, their gang's doing, or heard of.
const news = (kind: string, role: string, ...more: When[]): When => both({ needs: [`news${kind}`, `news${role}`] }, ...more);
// The player's way with words.
const blunt: When = { eloquence: ['blunt'] };
const easy: When = { eloquence: ['easy'] };
const smooth: When = { eloquence: ['smooth'] };

/** Every condition of every part; what must be filled and what must be empty add up. */
const both = (...parts: When[]): When =>
  parts.reduce<When>((all, part) => {
    const needs = [...(all.needs ?? []), ...(part.needs ?? [])];
    const lacks = [...(all.lacks ?? []), ...(part.lacks ?? [])];
    return { ...all, ...part, ...(needs.length ? { needs } : {}), ...(lacks.length ? { lacks } : {}) };
  }, {});

export const LINES: DialogueLines = {
  lexicon: {
    street: { choom: 'choom', gonk: 'gonk', preem: 'preem', eddies: 'eddies', badges: 'badges', delta: 'delta', scop: 'scop', hey: 'Hey', yeah: 'yeah', nah: 'Nah' },
    gang: { choom: 'choom', gonk: 'gonk', preem: 'nova', eddies: 'eddies', badges: 'badges', delta: 'delta out', scop: 'scop', hey: 'Yo', yeah: 'yeah', nah: 'Nah' },
    corpo: { choom: 'friend', gonk: 'amateur', preem: 'excellent', eddies: 'eurodollars', badges: 'NCPD', delta: 'leave', scop: 'cafeteria food', hey: 'Hello', yeah: 'yes', nah: 'No' },
    nomad: { choom: 'choom', gonk: 'gonk', preem: 'preem', eddies: 'eddies', badges: 'badges', delta: 'roll out', scop: 'kibble', hey: 'Hey', yeah: 'yep', nah: 'Nope' },
    elder: { choom: 'choomba', gonk: 'gonk', preem: 'nova', eddies: 'eds', badges: 'the law', delta: 'clear out', scop: 'kibble', hey: 'Well, hey', yeah: 'yeah', nah: 'No' },
    young: { choom: 'choom', gonk: 'gonk', preem: 'preem', eddies: 'eddies', badges: 'badges', delta: 'delta', scop: 'scop', hey: 'Hey hey', yeah: 'yeah yeah', nah: 'Nah' },
  },

  openers: [
    only('Hang on.', busy),
    only("Make it quick, I'm on the clock.", busy),
    only('Talk while I work.', busy),
    only('Mm. Hang on.', eating),
    only("Mouth's full. Go on, I'm listening.", eating),
    only('Pull up a stool.', drinking),
    only("Sure. I've got nowhere to be.", drinking),
    only('Everybody hear this? Someone wants a word with me.', court),
    only('Look who comes to me.', court),
    only('At home, and still no peace.', home),
    only('You came all the way up here?', home),
    only('For you? Sure.', warm),
    only('Alright, {choom}.', warm),
    only('...', wary),
    only('Why?', wary),
    only("Who's asking?", wary),
    only('Tch.', cold),
    only('You again.', cold),
    only('Briefly.', corpo),
    only('I have a minute. One.', corpo),
    only('Heh.', ganger),
    only('{hey}.', ganger),
    only('Well now.', elder),
    only('Let me think.', elder),
    only('Okay, so.', young),
    only('Uh.', young),
    only('What.', hot),
    only('Oh, you want the whole story?', chatty),
    only('Mm.', quiet),
    only('Out {late}? Alright.', { needs: ['late'] }),
    only('Early for this. Go on.', { needs: ['early'] }),
  ],

  tails: [
    only("And that's not the half of it.", chatty),
    only('Ask anyone.', chatty),
    only("Don't get me started.", chatty),
    only('I could go on. I will, if you let me.', chatty),
    only("Course, everything's got a price.", greedy),
    only('You buying? Then we keep talking.', greedy),
    only("Speaking of which, I'm owed {eddies}. By everyone.", greedy),
    only('Take care out there, {choom}.', kind),
    only('Eat something. You look half gone.', kind),
    only('Mind yourself in {district}, {yeah}?', kind),
    only("That's all you get.", hard),
    only('Now let me be.', hard),
    only("Don't make me say it twice.", hot),
    only('Keep that to yourself, {yeah}?', timid),
    only("Don't tell anyone I said that.", timid),
    only('Forget I said anything.', timid),
    only("Anyone's got a problem with that, they know where I am.", brave),
    only('My people come first. Always.', loyal),
    only('Off the record.', corpo),
    only('That stays between us, obviously.', corpo),
    only("Don't quote me.", corpo),
    only('{gang} business is {gang} business.', ganger),
    only("You didn't hear it from me.", ganger),
    only('Now {delta}. Nicely.', both(ganger, { stance: ['wary', 'neutral'] })),
    only("Before the Red you couldn't say that out loud.", elder),
    only('Things were different before the Red.', elder),
    only('Ask anyone my age. If you can find one.', elder),
    only('{preem}, right?', young),
    only('Anyway.', young),
    only("Don't tell my mom I said that.", young),
    only("Out here, that's how it is.", nomad),
    only("The road doesn't care.", nomad),
    only('City folk never get it.', nomad),
    only('Now, orders.', busy),
    only('Back to it.', busy),
    only("Boss is watching. Go on, {delta}.", busy),
    only("Another round and I'd tell you more.", drinking),
    only('Now let me eat.', eating),
    only("Word is {gang} rate you. Don't waste it.", { needs: ['gangGood', 'gang'] }),
    only('{gang} have your name, you know. Not in a good way.', { needs: ['gangBad', 'gang'] }),
    only("People in {district} say you're alright.", { needs: ['districtGood'] }),
    only("{district} talks. It's not saying nice things about you.", { needs: ['districtBad'] }),
    only('Good talking, {choom}.', friend),
  ],

  greeting: [
    // A stranger.
    only("{hey}. Don't know you.", both(first, neutral)),
    only('Yeah? What do you need.', both(first, neutral)),
    only("New face. What's your sitch?", both(first, neutral, bare)),
    only('Can I help you?', both(first, corpo, neutral)),
    only('You lost, {choom}?', both(first, ganger)),
    only("Don't think we've met.", both(first, elder)),
    only("{hey}. Who're you?", both(first, young)),
    only("Don't see many city faces out here.", both(first, nomad)),
    only('Keep your hands where I can see them.', both(first, wary)),
    only("I don't talk to strangers much.", both(first, wary)),
    only('Make it quick.', wary),
    only('{hey}, stranger. A friendly face, for once.', both(first, warm, bare)),
    only("Haven't seen you around before. Welcome.", both(first, warm)),
    only('{choom}. Good to see you.', friend),
    // Lately.
    only('Back again?', both(recent, { stance: ['neutral', 'warm', 'friend'] })),
    only('You again. Alright.', both(recent, neutral)),
    only('Still here?', both(recent, neutral)),
    only("Twice in one day. I'm flattered.", both(recent, warm)),
    // A regular.
    only('There you are.', both(regular, warm)),
    only('{choom}! Pull up a stool.', both(regular, friend)),
    only('Look who it is.', both(regular, warm)),
    only('Good to see you again.', both(regular, corpo, warm)),
    only('{choom}. Sit.', both(regular, ganger, warm)),
    only('{hey}.', both(regular, neutral)),
    only("What's the word?", both(regular, neutral)),
    // Not for days.
    only('Been a while. Thought the city ate you.', both(long, warm)),
    only("Where've you been hiding?", both(long, warm)),
    only("Thought you'd been flatlined.", both(long, elder)),
    only("Haven't seen you around.", both(long, neutral)),
    only('You. Still breathing, then.', both(long, wary)),
    // Whenever.
    only('What do you want.', cold),
    only("I've heard things about you.", cold),
    only("You've got some nerve.", cold),
    only('Say it and go.', cold),
    only('Order? No? Then talk fast.', both(busy, { stance: ['neutral', 'wary'] })),
    only('You found where I live. Great.', both(home, { stance: ['neutral', 'wary'] })),
    only('Everybody, quiet. Someone wants a word.', court),
    // A mask on the player.
    loud('Lose the {mask} and maybe we talk.', both(masked, { stance: ['neutral', 'wary'] })),
    loud("{hey}. Nice {mask}. Who's under it?", both(masked, neutral)),
    loud("I don't talk to a {mask}.", both(masked, wary)),
    loud("A {mask}. In here. Say what you want and go.", both(masked, cold)),
    loud('{mask} on our turf? Ten seconds, {gonk}, and then you walk.', both(masked, ganger)),
    loud('Is the {mask} a threat or a fashion statement? Either way, no.', both(masked, corpo)),
    loud("Take that thing off. Can't hear a word through it.", both(masked, elder)),
    loud("Whoa. {hey}. What's the {mask} for?", both(masked, young)),
    loud("Out here a {mask} means dust or trouble. Which are you?", both(masked, nomad)),
    loud("A {mask}, {choom}? What do you know that I don't?", both(masked, warm)),
  ],

  topics: {
    job: [
      only('Working at {work} is a life. Not a good one.', { needs: ['work'] }),
      only('{work} keeps me fed. Just about.', { needs: ['work'] }),
      only('A shift at {work} runs twelve hours. Then I sleep.', { needs: ['work'] }),
      only('Been at {work} longer than the sign has.', { needs: ['work'] }),
      only("{work} owns my days. I'm negotiating for my nights.", both(corpo, { needs: ['work'] })),
      only('{gang} look after {district}. Remember that.', { needs: ['gang'] }),
      only('See the ink? {gang}. You know what that means.', { needs: ['gang'] }),
      only('Mess with one {member}, you mess with all of us.', { needs: ['gang'] }),
      only('{gang} run this block. Be nice.', { needs: ['gang'] }),
      only('Work? {role}, when there is any.', { lacks: ['work', 'gang'] }),
      only('I get by. {role}, mostly.', { lacks: ['work', 'gang'] }),
      only('Around here you take the gig you can get.', { lacks: ['work', 'gang'] }),
      only('{Role}. It pays in {eddies}, when it pays.', { lacks: ['work', 'gang'] }),
      only("{work}'s dead this week. Till's so light the boss counts it twice.", { needs: ['work', 'slow'] }),
      only("Slow week at {work}. If it stays slow, somebody's getting cut, and it won't be the boss.", { needs: ['work', 'slow'] }),
      only("{work} is packed every night lately. I'm run off my feet and I'm not complaining.", { needs: ['work', 'brisk'] }),
      only("Business is good at {work}. Boss even smiled. Once.", { needs: ['work', 'brisk'] }),
    ],
    likes: [
      "You tried the {dish}? Don't leave {district} without it.",
      'All I want after a shift is {dish} and quiet.',
      "{ADrink} and some {dish}. That's the dream.",
      "Most of what they sell around here is {scop}. {dish} isn't.",
      only("Real food's for corpos. {dish} is close enough.", { voice: ['street', 'gang', 'young', 'nomad'] }),
    ],
    hates: [
      only("If you're running with {hate}, keep walking.", { needs: ['hate'] }),
      only("{hate} have been pushing in. Someone's going to push back.", { needs: ['hate'] }),
      only('Saw {hate} colors on the corner again. Bad sign.', { needs: ['hate'] }),
      only('Every {hateMember} I ever met was a {gonk} with a gun.', { needs: ['hate'] }),
    ],
    kin: [
      only('My {kinWord} {kinName} is at {kinWork}. Good people.', { needs: ['kinName'], lacks: ['kinDead'] }),
      only("Family's everything. My {kinWord} {kinName} would tell you the same.", { needs: ['kinName'], lacks: ['kinDead'] }),
      only("Got a {kinWord}, {kinName}. Don't go bothering {kinHim}.", { needs: ['kinName'], lacks: ['kinDead'] }),
      only('{kinName}, my {kinWord}, says I talk too much. Not wrong, either.', { needs: ['kinName'], lacks: ['kinDead'] }),
      // A relative who has died.
      only('My {kinWord} {kinName} passed. I still save {kinHim} a seat.', { needs: ['kinName', 'kinDead'] }),
      only('Lost my {kinWord} {kinName} not long ago. This city takes and takes.', { needs: ['kinName', 'kinDead'] }),
      only("Some days I still go to call my {kinWord} {kinName}. Then I remember.", { needs: ['kinName', 'kinDead'] }),
    ],
    district: [
      "{district} isn't what it was. Nothing is.",
      'Rain, neon, sirens. {district}.',
      'You new to {district}? Watch yourself after dark.',
      "Rent in {district} went up again. The rats didn't get the memo.",
      only("{district} is fine if you don't look down.", corpo),
      only("City folk don't last out here. No offense.", nomad),
      only('{district} used to have trees. I know, I know.', elder),
      only("{district}'s alright. Nowhere else to be, anyway.", young),
    ],
    life: [
      only("Payday can't come soon enough. I'm down to lint and a {dish} coupon.", { needs: ['broke'] }),
      only("Don't ask me for {eddies}. I've got nothing on me till Friday.", { needs: ['broke'] }),
      only('Flush this week, for once. Drinks might even be on me.', { needs: ['flush'] }),
      only("Good week. I've got more {eddies} on me than sense, so don't tell anyone.", { needs: ['flush'] }),
      'Everything in this city costs {eddies}. Even air, one of these days.',
      'NCART was late again. NCART is always late.',
      "The {badges} don't come to {district} unless a corpo calls.",
      'Trauma Team flew right over a guy bleeding out. No subscription, no pickup.',
      'Some {gonk} tried to sell me a cyberdeck made out of a toaster.',
      "My ripper says my chrome's rusted. My ripper says a lot of things.",
      'Saw a cyberpsycho on the news. Three blocks from here.',
      'Cheapest thing in {district} is a BD and a bad night.',
      only('I remember when you could drink the water here.', elder),
      only("I'm getting chrome the second I've got the {eddies}.", young),
      only("Quarterly reviews. Don't ask.", corpo),
      only("Quiet week. I don't trust a quiet week.", ganger),
      only('Fuel is up again. Everything that moves runs on {eddies}.', nomad),
    ],
    news: [
      // A gang leaned on a storefront.
      only("{newsGang} came by {newsAgo} for their cut. {newsTook} {eddies}. What do you do.", news('Shakedown', 'Mine')),
      only("Paid {newsGang} {newsAgo}. Again. One day I won't.", news('Shakedown', 'Mine')),
      only('My {newsWord} {newsWho} got leaned on by {newsGang} {newsAgo}. Paid up, like everyone does.', news('Shakedown', 'Kin')),
      only("{newsGang} squeezed my {newsWord} {newsWho} {newsAgo}. {NewsHe} won't say how much.", news('Shakedown', 'Kin')),
      only("Stopped by {newsWho}'s place {newsAgo}. {NewsHe} knows how it works.", news('Shakedown', 'Ours')),
      only("{newsWho} paid up {newsAgo}. Everyone pays. That's the arrangement.", news('Shakedown', 'Ours')),
      only('Heard {newsGang} were squeezing {newsWho} {newsAgo}. Nobody said anything. Nobody ever does.', news('Shakedown', 'Heard')),
      only('{newsGang} were round {newsWho} {newsAgo}, collecting. You learn not to look.', news('Shakedown', 'Heard')),
      // Someone got jumped.
      only('Got jumped by {newsGang} {newsAgo}. {newsTook} {eddies}, gone.', news('Robbery', 'Mine')),
      only("{newsGang} caught me {newsAgo}. Took {newsTook} {eddies} and my evening.", news('Robbery', 'Mine')),
      only("{newsGang} jumped my {newsWord} {newsWho} {newsAgo}. {NewsHe}'s alright. Angry.", news('Robbery', 'Kin')),
      only('My {newsWord} {newsWho} got robbed {newsAgo}. {newsGang}. Who else.', news('Robbery', 'Kin')),
      only('{newsWho} had {newsTook} {eddies} on {newsHim} {newsAgo}. Had.', news('Robbery', 'Ours')),
      only("Found {newsWho} with {newsTook} {eddies} {newsAgo}. Tax.", news('Robbery', 'Ours')),
      only('{newsWho} got jumped {newsAgo}. {newsGang}, people say.', news('Robbery', 'Heard')),
      only('Someone got done over {newsAgo}. {newsWho}, I heard. {newsGang} colors.', news('Robbery', 'Heard')),
      // A fight.
      only("Had words with {newsWho} {newsAgo}. {NewsHe} came off worst.", news('Fight', 'Mine', { needs: ['newsWon'] })),
      only('Got into it with {newsWho} {newsAgo}. Lost. Don\'t ask.', news('Fight', 'Mine', { lacks: ['newsWon'] })),
      only("My {newsWord} {newsWho} got into a fight {newsAgo}. Laid up at home now.", news('Fight', 'Kin', { needs: ['newsHurt'] })),
      only('My {newsWord} {newsWho} put someone on the floor {newsAgo}. Runs in the family.', news('Fight', 'Kin', { lacks: ['newsHurt'] })),
      only('{newsWho} wanted a go at us {newsAgo}. {NewsHe} got one.', news('Fight', 'Ours')),
      only('Fight {newsAgo}. {newsWho} came off worst, and {newsHe} started it.', news('Fight', 'Heard')),
      only("{newsWho}'s laid up. Picked a fight {newsAgo} and lost it.", news('Fight', 'Heard')),
      // Friends made and lost.
      only('Been drinking with {newsWho} lately. Good people.', news('Friends', 'Mine')),
      only("{newsWho} and me got talking {newsAgo}. {NewsHe}'s alright.", news('Friends', 'Mine')),
      only('My {newsWord} {newsWho} found a new friend {newsAgo}. Good for {newsHim}.', news('Friends', 'Kin')),
      only("Me and {newsWho} are done. Don't ask.", news('Fallout', 'Mine')),
      only('{newsWho} and I had words {newsAgo}. That\'s that.', news('Fallout', 'Mine')),
      only("My {newsWord} {newsWho} fell out with someone {newsAgo}. Won't say who.", news('Fallout', 'Kin')),
      // Friends who made it up.
      only("{newsWho} and me patched it up. Life's too short in this city.", news('Makeup', 'Mine')),
      only("Talking to {newsWho} again. Don't ask what it took.", news('Makeup', 'Mine')),
      only('My {newsWord} {newsWho} made up with {newsWith}. Thank god. The sulking was unbearable.', news('Makeup', 'Kin', { needs: ['newsWith'] })),
      only('My {newsWord} {newsWho} patched things up with an old friend {newsAgo}.', news('Makeup', 'Kin')),
      // A couple got together.
      only("Been seeing {newsWho}. Don't make it a thing.", news('Romance', 'Mine')),
      only('{newsWho} and me are a thing now. Started {newsAgo}.', news('Romance', 'Mine')),
      only('My {newsWord} {newsWho} has been seeing {newsWith}. Moves fast, that one.', news('Romance', 'Kin', { needs: ['newsWith'] })),
      only("My {newsWord} {newsWho} is seeing someone. Won't say who.", news('Romance', 'Kin')),
      only('{newsWith} and {newsWho} are an item now. Everybody in {district} knows.', news('Romance', 'Heard', { needs: ['newsWith'] })),
      only('Heard {newsWho} is seeing someone. Good for {newsHim}.', news('Romance', 'Heard')),
      // A wedding.
      only('{newsWho} and I got married {newsAgo}. Small thing. Real thing.', news('Wedding', 'Mine')),
      only('Married {newsWho} {newsAgo}. Still getting used to the word.', news('Wedding', 'Mine')),
      only('My {newsWord} {newsWho} married {newsWith} {newsAgo}. Whole family cried. Some of it was happy.', news('Wedding', 'Kin', { needs: ['newsWith'] })),
      only('My {newsWord} {newsWho} got married {newsAgo}. I give it a year. Kidding. Mostly.', news('Wedding', 'Kin')),
      only('{newsWith} and {newsWho} tied the knot {newsAgo}. In this city. Brave.', news('Wedding', 'Heard', { needs: ['newsWith'] })),
      only('Heard {newsWho} got married {newsAgo}. Somebody around here is happy.', news('Wedding', 'Heard')),
      // A couple split.
      only('I ended it with {newsWho} {newsAgo}. Had to.', news('Breakup', 'Mine', { needs: ['newsWon'] })),
      only('Me and {newsWho}? Done. My call.', news('Breakup', 'Mine', { needs: ['newsWon'] })),
      only("{newsWho} walked out on me {newsAgo}. Didn't even take {newsHis} stuff.", news('Breakup', 'Mine', { lacks: ['newsWon'] })),
      only("{newsWho} left. That's all I'm saying.", news('Breakup', 'Mine', { lacks: ['newsWon'] })),
      only('My {newsWord} {newsWho} dumped {newsWith} {newsAgo}. About time.', news('Breakup', 'Kin', { needs: ['newsWon', 'newsWith'] })),
      only('My {newsWord} {newsWho} ended things with someone {newsAgo}.', news('Breakup', 'Kin', { needs: ['newsWon'] })),
      only('{newsWith} walked out on my {newsWord} {newsWho} {newsAgo}. Bad few days in our house.', news('Breakup', 'Kin', { needs: ['newsWith'], lacks: ['newsWon'] })),
      only("My {newsWord} {newsWho} got left {newsAgo}. Don't bring it up.", news('Breakup', 'Kin', { lacks: ['newsWon'] })),
      only('{newsWith} walked out on {newsWho} {newsAgo}. Saw it coming a block away.', news('Breakup', 'Heard', { needs: ['newsWith'] })),
      only('Heard {newsWho} got dumped {newsAgo}. Ouch.', news('Breakup', 'Heard')),
      // A storefront took someone on.
      only('Took on {newsWho} {newsAgo}. Business is good enough for another pair of hands.', news('Hired', 'Mine', { needs: ['newsWon'] })),
      only('New face at {newsWhere}: {newsWho}. Keep {newsHim} honest for me.', news('Hired', 'Mine', { needs: ['newsWon'] })),
      only('Got taken on at {newsWhere} {newsAgo}. Steady work, for once.', news('Hired', 'Mine', { lacks: ['newsWon'] })),
      only("I work at {newsWhere} now. Don't laugh.", news('Hired', 'Mine', { lacks: ['newsWon'] })),
      only('My {newsWord} {newsWho} took on {newsWith} at {newsWhere}. Must be doing alright.', news('Hired', 'Kin', { needs: ['newsWon', 'newsWith'] })),
      only('My {newsWord} {newsWho} is hiring at {newsWhere}. Business is good.', news('Hired', 'Kin', { needs: ['newsWon'] })),
      only('My {newsWord} {newsWho} got work at {newsWhere} {newsAgo}. Finally.', news('Hired', 'Kin', { lacks: ['newsWon'] })),
      only("{newsWhere} took on {newsWho} {newsAgo}. Somebody's doing alright.", news('Hired', 'Heard')),
      // A storefront let someone go.
      only("Had to let {newsWho} go {newsAgo}. The books don't lie.", news('LaidOff', 'Mine', { needs: ['newsWon'] })),
      only('Let {newsWho} go. Worst part of the job.', news('LaidOff', 'Mine', { needs: ['newsWon'] })),
      only('{newsWhere} let me go {newsAgo}. Last in, first out.', news('LaidOff', 'Mine', { lacks: ['newsWon'] })),
      only("Got cut at {newsWhere}. So. I'm looking.", news('LaidOff', 'Mine', { lacks: ['newsWon'] })),
      only('My {newsWord} {newsWho} had to let {newsWith} go at {newsWhere}. Took it hard.', news('LaidOff', 'Kin', { needs: ['newsWon', 'newsWith'] })),
      only('My {newsWord} {newsWho} had to cut someone at {newsWhere}.', news('LaidOff', 'Kin', { needs: ['newsWon'] })),
      only('{newsWhere} let my {newsWord} {newsWho} go {newsAgo}. After everything.', news('LaidOff', 'Kin', { lacks: ['newsWon'] })),
      only('{newsWhere} let {newsWho} go {newsAgo}. Times are hard all over.', news('LaidOff', 'Heard')),
      // Someone died: killed in a fight between crews, or of their years.
      only("{newsWho} came at us {newsAgo}. {NewsHe} won't again.", news('Death', 'Mine', { needs: ['newsWon'] })),
      only('Put {newsWho} down {newsAgo}. {NewsHis} crew knows where to find me.', news('Death', 'Mine', { needs: ['newsWon'] })),
      only('My {newsWord} {newsWho} was in the fight that killed {newsWith}. Nobody in our house talks about it.', news('Death', 'Kin', { needs: ['newsWon', 'newsWith'] })),
      only("My {newsWord} {newsWho} was in a fight {newsAgo}. Somebody didn't walk away from it.", news('Death', 'Kin', { needs: ['newsWon'] })),
      only('My {newsWord} {newsWho} got flatlined {newsAgo}. {newsGang}. I know their faces.', news('Death', 'Kin', { needs: ['newsKilled', 'newsGang'], lacks: ['newsWon'] })),
      only('We buried my {newsWord} {newsWho} {newsAgo}. {newsGang} did it, and everyone knows it.', news('Death', 'Kin', { needs: ['newsKilled', 'newsGang'], lacks: ['newsWon'] })),
      only("My {newsWord} {newsWho} passed {newsAgo}. Peaceful, they said. Nothing's peaceful here.", news('Death', 'Kin', { lacks: ['newsWon', 'newsKilled'] })),
      only('Lost my {newsWord} {newsWho} {newsAgo}. Old age. In this city, can you believe it.', news('Death', 'Kin', { lacks: ['newsWon', 'newsKilled'] })),
      only('{newsWho} found out what crossing {newsGang} costs, {newsAgo}.', news('Death', 'Ours')),
      only('{newsWho} got what was coming {newsAgo}. {newsGang} settle what we\'re owed.', news('Death', 'Ours')),
      only('Heard {newsWho} got flatlined {newsAgo}. {newsGang} work, they say.', news('Death', 'Heard', { needs: ['newsKilled', 'newsGang'] })),
      only('Somebody flatlined {newsWho} {newsAgo}. {newsGang} colors all over it.', news('Death', 'Heard', { needs: ['newsKilled', 'newsGang'] })),
      only('{newsWho} passed {newsAgo}. Old age. In Night City. Imagine that.', news('Death', 'Heard', { lacks: ['newsKilled'] })),
      only('Heard {newsWho} died {newsAgo}. In {newsHis} sleep, they say. Lucky.', news('Death', 'Heard', { lacks: ['newsKilled'] })),
      // A gang took someone on.
      only('Brought {newsWho} in {newsAgo}. {newsGang} look after their own.', news('Joined', 'Mine', { needs: ['newsWon'] })),
      only('{newsWho} wears our colors now. I vouched.', news('Joined', 'Mine', { needs: ['newsWon'] })),
      only('I run with {newsGang} now. Started {newsAgo}.', news('Joined', 'Mine', { lacks: ['newsWon'] })),
      only('{newsGang} took me in. {newsWho} vouched for me.', news('Joined', 'Mine', { lacks: ['newsWon'] })),
      only('My {newsWord} {newsWho} brought {newsWith} into {newsGang} {newsAgo}.', news('Joined', 'Kin', { needs: ['newsWon', 'newsWith'] })),
      only('My {newsWord} {newsWho} is bringing kids into {newsGang} now.', news('Joined', 'Kin', { needs: ['newsWon'] })),
      only("My {newsWord} {newsWho} joined {newsGang} {newsAgo}. Nobody's happy about it.", news('Joined', 'Kin', { lacks: ['newsWon'] })),
      only("{newsWho}, my {newsWord}, took {newsGang} colors. I couldn't stop {newsHim}.", news('Joined', 'Kin', { lacks: ['newsWon'] })),
      only('{newsWho} runs with us now. Be nice to the new blood.', news('Joined', 'Ours')),
      only('New face in our colors: {newsWho}.', news('Joined', 'Ours')),
      only('Heard {newsWho} took {newsGang} colors {newsAgo}.', news('Joined', 'Heard')),
      only('{newsWho} is {newsGang} now. Another kid gone.', news('Joined', 'Heard')),
    ],
    here: [
      only('{here}. Not the worst place in {district}.', { needs: ['here'], lacks: ['atWork', 'atHome'] }),
      only("I come to {here} when I can't stand my own four walls.", { needs: ['here'], lacks: ['atWork', 'atHome'] }),
      only('Half of {district} ends up at {here} sooner or later.', { needs: ['here'], lacks: ['atWork', 'atHome'] }),
      only('They water the drinks at {here}. I keep coming anyway.', both(drinking, { needs: ['here'], lacks: ['atWork', 'atHome'] })),
      only("{here}? It's a job. The tips are {scop}.", { needs: ['atWork'] }),
      only("Twelve hours a day at {here}. You get to know the walls.", { needs: ['atWork'] }),
      only('{here}. Home. Such as it is.', { needs: ['atHome'] }),
      only("The walls at {here} are thin. I know my neighbors better than I'd like.", { needs: ['atHome'] }),
    ],
    rumor: [
      only("Heard {gang} rate you. Careful who hears you say that out loud.", { needs: ['gangGood', 'gang'] }),
      only("Word is you've been crossing {gang}. Dangerous habit.", { needs: ['gangBad', 'gang'] }),
      only("People in {district} say you're alright. For now.", { needs: ['districtGood'] }),
      only("There's talk in {district} about you. Not the good kind.", { needs: ['districtBad'] }),
    ],
  },

  brushOff: [
    'That all?',
    "I've got nothing to say to you.",
    'Mm.',
    only('...', quiet),
    only("We done here? I'm working.", busy),
    only('Was there something else.', corpo),
    only('Keep walking, {choom}.', ganger),
  ],

  grudge: [
    "I know what you did. Don't think I don't.",
    'People talk. I heard what happened.',
    "Say your piece and go. I haven't forgotten.",
    only("You've got nerve showing up here after that.", hot),
    only("You hurt my people. That doesn't wash off.", loyal),
    only("{gang} don't forget faces.", ganger),
  ],

  hostile: [
    '{given} looks straight through you and says nothing.',
    '{given} spits at your feet. "Walk away."',
    '{given}: "Get out of my face before I do something about it."',
    only('{given} puts a hand on {his} iron and waits for you to leave.', ganger),
    only('{given} backs away, eyes on the door.', timid),
    only('{given} is already on the holo to security.', corpo),
  ],

  asleep: [
    '{given} is asleep and stays that way.',
    '{given}: "Mmf. It\'s the middle of the night. Go away."',
    '{given} mumbles something and turns over.',
  ],

  talkedOut: [
    "We talked. I've got things to do.",
    "I've said what I had to say.",
    'Later, {choom}. Not now.',
    only("I'm working. Come back after.", busy),
    only("I've given you my minute.", corpo),
    only('Enough for one day.', quiet),
  ],

  facts: {
    name: [
      "{name}. Don't wear it out.",
      'People call me {given}.',
      '{name}. And you are?',
      only("{name}. We haven't been introduced, have we.", corpo),
      only("{given}. That's all the name you need.", ganger),
      only('{name}. Been {name} for {age} years.', elder),
      only('{given}! Hi.', young),
    ],
    job: [
      only('{Role}, at {work}.', { needs: ['work'] }),
      only('I work at {work}. {Role}.', { needs: ['work'] }),
      only("{work}. I'm the {role}.", { needs: ['work'] }),
      only('{Role}, {work}. Twelve hours a day of it.', { needs: ['work'] }),
      only('{gang}. {Role}.', { needs: ['gang'] }),
      only("I'm a {member}. {Role}, if you want a title.", { needs: ['gang'] }),
      only("See the colors? {gang}. I'm their {role}.", { needs: ['gang'] }),
      only("{Role}, when there's work.", { lacks: ['work', 'gang'] }),
      only('This and that. {Role}, lately.', { lacks: ['work', 'gang'] }),
      only('Call it {role}.', { lacks: ['work', 'gang'] }),
      only("{Role}. Don't laugh.", { lacks: ['work', 'gang'] }),
    ],
    age: ['{age}. Why?', 'Old enough. {age}.', '{age} this year, if I make it.', '{age}. Feels like twice that.', only('{age}. Yeah, I know.', young), only('{age}. Every one of them earned.', elder)],
    home: [
      only("I've got a place at {home}.", { needs: ['home'] }),
      only("{home}. Don't come by.", { needs: ['home'] }),
      only('Over at {home}, with everyone else.', { needs: ['home'] }),
      only("{home}. A box with a door, but it's mine.", { needs: ['home'] }),
      only('Wherever I can.', { lacks: ['home'] }),
      only("Nowhere you'd find me.", { lacks: ['home'] }),
      only('Around. Here and there.', { lacks: ['home'] }),
      only('Got a spot. It moves.', { lacks: ['home'] }),
    ],
    likes: ['{dish} and {aDrink}. Every time.', 'Nothing beats {dish}.', '{dish}. And {aDrink} to wash it down.', "Real food's for corpos. {dish} is close enough."],
    hates: [
      only("{hate}. Don't get me started.", { needs: ['hate'] }),
      only("If I never see another {hateMember} it'll be too soon.", { needs: ['hate'] }),
      only('{hate}. Ask anyone around here.', { needs: ['hate'] }),
      only('{hate}. They know why.', { needs: ['hate'] }),
      only('Nobody in particular. Everybody a little.', { lacks: ['hate'] }),
      only('I keep my head down. No enemies, no friends.', { lacks: ['hate'] }),
      only("Hate's expensive. I can't afford it.", { lacks: ['hate'] }),
    ],
  },

  deflect: {
    name: ['Does it matter?', 'Names are for friends.', 'You first.'],
    job: ['I keep busy.', 'This and that.', 'Whatever pays.'],
    age: ['Old enough.', 'Older than I look. Younger than I feel.', 'Why, you writing a book?'],
    home: ['Around.', 'Somewhere with a door that locks.', "Not telling a stranger where I sleep."],
    likes: ["Whatever's hot.", "Food's food."],
    hates: ['Nobody you need to know about.', 'I keep that to myself.', 'Plenty of people. Why?'],
    kin: ['Why do you want to know?', "I don't talk about people I know to people I don't.", 'Maybe. Maybe not.'],
    chop: ['Not here. Too many eyes.', "Come back when it's quieter.", 'Maybe. Depends what else you bring me.', only("Show me you're not working for the {badges} first.", wary)],
    any: ['Pass.', 'Next question.', "I don't know you well enough for that."],
    hire: ["Maybe. Come back when it's quieter.", 'Ask me on a slow day.', "I'll think about it. That's not a yes."],
  },

  refuse: [
    'No.',
    "I'm not talking to you about that.",
    '{nah}.',
    'Not a chance.',
    only("You're asking a lot of questions for a stranger.", wary),
    only("I don't know you.", wary),
    only('Try someone else.', wary),
    only('Why would I tell you anything?', cold),
    only("We're not friends.", cold),
    only("I'm not at liberty to say.", corpo),
    only("Ask again and we'll have a different conversation.", ganger),
    only('What part of no.', hot),
  ],

  pressed: [
    'I said no.',
    'What part of no was unclear?',
    "Asking twice doesn't make me like you.",
    'Drop it.',
    only('Push me again. See what happens.', hot),
    only("I've answered that.", corpo),
    only('Please. Leave it.', kind),
  ],

  repeat: ['Told you already. {answer}', "Weren't you listening? {answer}", 'Again? {answer}', "You've got a short memory. {answer}"],

  ask: {
    knows: ["{other}? That's my {word}.", 'Sure, I know {other}. My {word}.', '{other} is my {word}. Why?', '{other}. My {word}. What about {otherHim}?'],
    unknown: ['{other}? Never heard of {otherHim}.', "Doesn't ring a bell.", 'No idea who that is.', "{other}... no. There's a lot of people in {district}."],
    repeat: [
      only('{other}? I told you. My {word}.', { needs: ['word'] }),
      only('Still my {word}, last I checked.', { needs: ['word'] }),
      only('{other} again? Never heard of {otherHim}. Still.', { lacks: ['word'] }),
      only("I told you. Don't know any {other}.", { lacks: ['word'] }),
    ],
    dead: [
      '{other} was my {word}. Died {otherAgo}.',
      'We buried {other} {otherAgo}. My {word}.',
      "{other}... my {word}. Gone, {otherAgo}. Don't ask me how.",
      only('{other} was my {word}. Was. You understand?', hard),
      only('My {word} {other}. {otherAgo}, we lost {otherHim}. I still set a plate out.', kind),
    ],
    ex: [
      "{other}? We're done. Don't say that name in here.",
      "Ask someone else about {other}. I'm finished with {otherHim}.",
      "{other} and me? Over. That's all you get.",
      only('{other}. Ha. No. Next question.', hot),
    ],
  },

  gift: {
    thanks: [
      "Huh. Thanks. Didn't have to.",
      'For me? Alright. Alright.',
      "That's decent of you.",
      only('Thank you. Unexpected.', corpo),
      only("Huh. {preem}. Don't make it weird.", ganger),
      only("Free? I'll take free.", greedy),
      loud("Another {item}? You're keeping me fed.", { needs: ['again'] }),
      loud('{item} again. You do remember a face, at least.', { needs: ['again'] }),
    ],
    favorite: [
      '{item}! You know me.',
      "No way. {item}. You're alright.",
      "{item}. Now we're talking.",
      "How'd you know? {item}'s the one thing I'd kill for.",
      loud('{item} again! You remember. Nobody remembers.', { needs: ['again'] }),
      loud("You keep bringing me {item}, I'll have to start liking you.", { needs: ['again'] }),
    ],
    refuse: ['{given} knocks it out of your hand. "Keep it."', "{given} doesn't even look at it."],
  },

  insult: {
    reply: ['Say that again.', 'Big words for a nobody.', only('...Okay.', timid), only('Charming.', corpo), only("You're going to regret that.", hot), only("You know whose turf you're on?", ganger)],
    shove: ['{given} shoves you hard into the wall. The whole street sees it.', "{given}'s fist finds your ribs before you can move."],
  },

  rob: {
    done: [
      only("You take {haul} off {given}. {He} won't forget your face.", bare),
      '{given} hands it over, eyes burning. {haul}.',
      only('{given} hands it over, eyes on the {mask}. {haul}, and no face to remember.', masked),
      only('You take {haul} off {given}. All {he} gets of you is the {mask}.', masked),
    ],
    nothing: ['{given} turns out empty pockets. "Already been done this week."', 'Nothing on {given} worth taking. {He} laughs, which is worse.'],
    fought: [
      '{given} fights back. You get {haul} and a split lip.',
      only('It takes a struggle. {haul}, and {given} marks your face for later.', bare),
      only('It takes a struggle. {haul}, and {given} gets a hand on the {mask} but not under it.', masked),
    ],
  },

  chop: {
    done: [
      'Give it here. ... There. Clean as the day it was minted. {cut} {eddies} for my trouble; {left} on it, and it answers to you now.',
      "A hot chip. Alright. Two minutes and some ICE you don't want to hear about. Done. My cut's {cut}; {left} on it for you.",
      'Hand it over. ... Chopped. {left} on it, in no name at all. {cut} stays with me.',
      only('Easy money. {cut} for me, {left} for you, and whoever it belonged to will never know where it went.', greedy),
      only('Done. The Net gives it up quick enough. {left} on it, clean; {cut} stays with the crew.', ganger),
      only('Handled, discreetly. {cut} {eddies} is the fee; {left} remains on the chip. We never spoke.', corpo),
      only("Hold still, this one's got teeth. ... Got it. {left} on it. Mine's {cut}, and don't argue.", hot),
      only("Kids used to pay me in {scop} for this. {cut} {eddies} now. {left}'s yours.", elder),
    ],
    refuse: [
      "I don't chop. Not for you.",
      'Hot chip? {nah}. That is how people end up flatlined.',
      'Take it somewhere else.',
      only("I don't know you. I don't crack chips for people I don't know.", wary),
      only("I've got a counter and a license. I'm not losing either over a chop.", busy),
      only("Not with the {badges} all over {district} lately.", timid),
      only("A chop? For you? {nah}. We're not friends.", cold),
    ],
  },

  work: {
    hire: [
      "Fine. You start at the bottom: {title}. {pay} {eddies} a shift, and don't be late.",
      "You want to work? {title}. It's {pay} {eddies} a shift and nobody says thank you.",
      only("Alright. {title}, on trial. Mess up and you're out.", hard),
      only("We could use a hand. {title} to start; show me you can hold a mop and we'll talk.", kind),
      only("I'll put you on {title}. Don't make me regret it.", quiet),
      only('Standard onboarding: {title}, {pay} {eddies} per shift, probationary. Welcome aboard.', corpo),
      only('At your age I started on {title} too. Go on, then.', elder),
      only("{title}? Sure, why not. Beats doing it myself.", young),
    ],
    refuse: [
      "I'm not hiring.",
      "I don't know you. Come back when I do.",
      only('You? No.', cold),
      only("Not a chance. I've heard about you.", cold),
      only("We're full up. Try next month.", busy),
      only("Can't afford another pair of hands. Can barely afford mine.", hard),
      only("Headcount's frozen. Nothing personal.", corpo),
      only("I've had kids your age rob the till. No.", elder),
    ],
    masked: ['Not with that on your face.', 'Take the {mask} off and ask me again.', "I don't hire a {mask}."],
    broke: [
      "I can't pay the people I've got. Come back when the till's heavier.",
      "Business is dead. I'm not taking anyone on till it picks up.",
      only("Look at the place. You see customers? Neither do I. No.", hard),
      only("I'd like to. I can't. Not this week.", kind),
      only("Headcount's frozen until the numbers turn. Nothing personal.", corpo),
      only("Thirty years, never seen it this slow. Ask me when it isn't.", elder),
      only("Boss says no new hires. Boss says a lot of things lately.", young),
    ],
    rehire: [
      'Not after last time.',
      only('You quit on me {memAgo}. I remember. No.', { needs: ['memQuit'] }),
      only('You walked out on me {memAgo}. Find somebody else to walk out on.', { needs: ['memQuit'] }),
      only("I let you go once. I'm not hiring you twice.", { needs: ['memFired'] }),
      only("After what you did to my people? You don't work here.", { needs: ['memFired'] }),
      only('Your file says "do not rehire." I wrote the file.', corpo),
    ],
    shift: [
      'Not bad. Same time tomorrow.',
      "You're still here. Good.",
      only("Slow week. Don't expect a raise out of it.", { needs: ['slow'] }),
      only("We're packed. Keep up and there's more where that came from.", { needs: ['brisk'] }),
      only("Keep that up and we'll see about more.", kind),
      only('Faster next time.', hard),
      only('Adequate.', corpo),
      only("Go home. You've earned it.", elder),
      only('{preem}. Tomorrow, then.', young),
      only("Don't let it go to your head.", quiet),
    ],
    promote: [
      "You've earned it. {title} from tomorrow. {pay} {eddies} a shift.",
      "Alright. I'm moving you up to {title}. Don't make me look stupid.",
      only("{title}. You've put in the shifts, and I've noticed.", kind),
      only("Fine. {title}. Pay's {pay} {eddies} now. Still don't be late.", hard),
      only('Promotion approved: {title}, {pay} {eddies} per shift. Keep it up.', corpo),
      only("{title}. Took me twice as long, back when.", elder),
    ],
    quit: [
      "Suit yourself. Door's where it was.",
      'Just like that? Fine.',
      only('Thought you had more in you.', hard),
      only('Sorry to lose you. Come by anyway.', kind),
      only('Noted. Your access is revoked at end of day.', corpo),
      only('Everybody leaves. Go on.', elder),
    ],
  },

  revenge: {
    person: ['{name} and two friends catch up with you at {where}. They take {take} €$ and leave you in the gutter.', '{name} has been waiting. At {where} it costs you {take} €$ and everything you had left.'],
    gang: ['{gang} colors step out of the dark at {where}. They take {take} €$ and make sure you remember.', 'The {gang} find you at {where}. It goes badly: {take} €$, and the rest of your night.'],
  },

  memory: [
    // Something the player did to them.
    only('You took {memTook} {eddies} off me {memAgo}. I remember your face.', { needs: ['memWronged', 'memRobbery', 'memTook'], lacks: ['memTwice'] }),
    only("Twice now you've robbed me. {memTook} {eddies}, all told. There won't be a third time.", { needs: ['memWronged', 'memRobbery', 'memTook', 'memTwice'] }),
    only('You robbed me {memAgo}. You think I forgot?', { needs: ['memWronged', 'memRobbery'] }),
    only('{memAgo} you had a blade in my face and your hand in my pockets. Now you want to chat?', { needs: ['memWronged', 'memRobbery'] }),
    only('Nobody robs a {member} and walks around breathing. You\'ve been lucky.', both(ganger, { needs: ['memWronged', 'memRobbery', 'member'] })),
    only('What you said to me {memAgo}? I heard it. I still hear it.', { needs: ['memWronged', 'memInsult'] }),
    only('Come to say it again? Go on. I dare you.', both(hot, { needs: ['memWronged', 'memInsult'] })),
    only("You've run your mouth at me twice now. Third time, I answer.", { needs: ['memWronged', 'memInsult', 'memTwice'] }),
    vague('I remember what you did to me {memAgo}.', { needs: ['memWronged'] }),
    loud("I haven't forgotten. I told you I wouldn't.", { needs: ['memWronged', 'memAgain'] }, 3),
    loud("Still on that, if you were wondering. I'll be on it a while.", { needs: ['memWronged', 'memAgain'] }, 3),
    // Heard of it from their people, or second hand.
    only('My {memWord} {memWho} says you robbed {memHim}. Look me in the eye and say {memHe} made it up.', { needs: ['memHeard', 'memRobbery', 'memWord'] }),
    only("You're the one who robbed my {memWord} {memWho}. I know your face from how {memHe} described it.", { needs: ['memHeard', 'memRobbery', 'memWord'] }),
    only('Heard what you said to my {memWord} {memWho}. Say it to me.', { needs: ['memHeard', 'memInsult', 'memWord'] }),
    only('My {memWord} {memWho} told me about you. All of it.', { needs: ['memHeard', 'memWord'] }),
    only('Word is you robbed {memWho}. People talk around here.', { needs: ['memHeard', 'memRobbery'], lacks: ['memWord'] }),
    only('Heard you mouthed off at {memWho}. Classy.', { needs: ['memHeard', 'memInsult'], lacks: ['memWord'] }),
    vague('I heard what you did to {memWho}.', { needs: ['memHeard'] }),
    loud("I haven't forgotten what you did to {memWho}. Nobody here has.", { needs: ['memHeard', 'memAgain'] }, 3),
    // Saw it.
    only('I was there when you robbed {memWho}. I saw your hands.', { needs: ['memSaw', 'memRobbery'] }),
    only('I heard you go off at {memWho}. The whole place heard.', { needs: ['memSaw', 'memInsult'] }),
    vague('I saw what you did to {memWho} {memAgo}.', { needs: ['memSaw'] }),
    // Came to collect.
    only("We're square now. {memTook} {eddies} square. Keep it that way.", { needs: ['memSettled', 'memTook'] }),
    only("We're even. Don't make me come looking again.", { needs: ['memSettled'] }),
    // Something given.
    only('That {memItem} you brought me {memAgo}? Still thinking about it.', { needs: ['memGift', 'memItem'], lacks: ['memFavorite'] }),
    only('You remembered I like {memItem}. Nobody remembers that.', { needs: ['memGift', 'memItem', 'memFavorite'] }),
    only('{memItem}, {memAgo}. I owe you one. Small one.', both(greedy, { needs: ['memGift', 'memItem'] })),
    vague('Thanks again, for the other day.', { needs: ['memGift'] }),
    // A good word from their people.
    only("My {memWord} {memWho} says you're alright. That counts for something with me.", { needs: ['memGoodWord', 'memWord'] }),
    only("{memWho} says good things about you. Don't make {memHim} a liar.", { needs: ['memGoodWord'] }),
    // Work.
    only("Don't make me regret taking you on.", { needs: ['memHired'] }),
    only('Still glad I took you on. Mostly.', both(warm, { needs: ['memHired'] })),
    only("{memTitle}. Suits you. Don't let it go to your head.", { needs: ['memPromoted', 'memTitle'] }),
    only('Moved you up, and you earned it. Keep it that way.', { needs: ['memPromoted'] }),
    only('You walked out on me {memAgo}. Just so you know, I noticed.', { needs: ['memQuit'] }),
    loud('Still not over you walking out. Just so you know.', { needs: ['memQuit', 'memAgain'] }, 3),
    only('Look who it is. The one who quit.', { needs: ['memQuit'] }),
    only('I had to let you go. You know why.', { needs: ['memFired'] }),
    // A chip chopped.
    only('{memTook} on that chip I cleaned for you. Hope it was worth what it cost someone.', { needs: ['memChopped', 'memTook'] }),
    only("That chip I cleaned. Spend it far from here, {yeah}?", { needs: ['memChopped'] }),
    // Asked about someone.
    only('Why were you asking about my {memWord} {memWho}?', { needs: ['memAsked', 'memWord'] }),
    only('Still looking for {memWho}?', { needs: ['memAsked'] }),
  ],

  barred: ["{work} won't serve you. Not after what you did to their people.", 'The counter at {work} closes the moment they see your face.'],

  masked: {
    barred: ["{work} serves faces, not masks. Take the {mask} off, then we'll talk.", 'The counter at {work}: "Mask off, or out."', 'Nobody at {work} is serving a {mask}. House rule, and the house has a shotgun.'],
    recognized: [
      '{given} takes one look at the {mask} and goes still. {He} knows that {mask}.',
      '{given}: "That {mask}. I know that {mask}." Everyone turns to look at you.',
      '{given} stares at the {mask}, then at your hands, and it clicks.',
      only('{given} says one word to the other {gang} and the room goes quiet. {He} knows the {mask}.', both(ganger, { needs: ['gang'] })),
      only("{given} doesn't say a word. {He} just looks at the {mask} and reaches for the holo.", corpo),
      only('"That {mask}." {given} spits. "You\'ve got some nerve wearing it back in here."', hot),
      only('{given} points at the {mask}, hand shaking. "Him. Her. Them. That one."', timid),
    ],
  },

  questions: {
    name: {
      label: 'Name',
      lines: [only('Who are you?', blunt), only('Name?', blunt), only('What do I call you?', easy), only("I didn't catch your name.", easy), only("I'm bad with faces, worse with names. Yours?", smooth), only("Let's start over. I'm nobody. You?", smooth)],
    },
    job: {
      label: 'Work',
      lines: [only('What do you do?', blunt), only('You work?', blunt), only("What's your line of work?", easy), only('What do you do around here?', easy), only("You don't just hang around {here}. What's the gig?", both(smooth, { needs: ['here'] })), only("Let me guess your line of work. No, tell me. I'd guess wrong.", smooth)],
    },
    age: {
      label: 'Age',
      lines: [only('How old are you?', blunt), only('How old are you, anyway?', easy), only('How many years on these streets? You wear them well.', smooth)],
    },
    home: {
      label: 'Home',
      lines: [only('Where do you live?', blunt), only("Where's home?", easy), only('Whereabouts do you lay your head? Just so I know where to send the good word.', smooth)],
    },
    likes: {
      label: 'Tastes',
      lines: [only('What do you eat?', blunt), only("What do you eat when it's been a day?", easy), only("Best thing to eat in {district}? I'll buy, you pick.", smooth)],
    },
    hates: {
      label: 'Enemies',
      lines: [only('Who do you hate?', blunt), only('Who do you hate around here?', easy), only("Everybody's got one crew they'd cross the street for. Yours?", smooth)],
    },
  },

  you: {
    talk: [
      only('"Hey."', blunt),
      only('"Got a minute?"', blunt),
      only('"What\'s up."', blunt),
      only('"Hey. Got a minute?"', easy),
      only('"How\'s it going?"', easy),
      only('"Busy night?"', easy),
      only('"Hey. Looked like you could use a break."', smooth),
      only('"What\'s the word in {district}?"', smooth),
      only('"Buy you a minute of your time?"', smooth),
    ],
    askAbout: [only('"You know {other}?"', blunt), only('"{other}. Ring a bell?"', easy), only('"What can you tell me about {other}?"', easy), only('"Friend of mine, {other}. Thought you two might have crossed paths."', smooth)],
    gift: ['You hand over {item}.', '"Here. {item}. On me."', only('"Had a feeling you\'d want this. {item}."', smooth)],
    insult: ['"Nice face. Who chewed it?"', '"Your whole family\'s a waste of chrome."', '"Everyone around here says you\'re nothing. They\'re right."'],
    rob: ['You pull a blade. "Eddies. Now."', '"Hand it over. All of it."', 'You get in close. "Pockets. Slowly."'],
    work: [
      only('"You hiring?"', blunt),
      only('"Give me a job."', blunt),
      only('"Need a hand around here?"', easy),
      only('"Any work going? I\'ll start wherever."', easy),
      only('"A place like this could use another pair of hands. Mine, say."', smooth),
      only('"Put me to work. I\'ll earn my keep before you notice I\'m here."', smooth),
    ],
    quit: ['"I\'m done here."', '"Find someone else. I quit."', only('"It\'s been real. I\'m moving on."', smooth)],
    chop: [
      only('"Chop this."', blunt),
      only('"Crack this chip."', blunt),
      only('"Can you crack this chip? {balance} on it."', easy),
      only('"Got a hot chip. Can you clean it?"', easy),
      only('"Hot chip, {balance} on it. Clean it, take a cut, and nobody asks whose it was."', smooth),
      only('"Heard you\'re good with chips. This one\'s got {balance} on it and the wrong name."', smooth),
    ],
  },
};
