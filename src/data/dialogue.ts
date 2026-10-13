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
// The player's way with words.
const blunt: When = { eloquence: ['blunt'] };
const easy: When = { eloquence: ['easy'] };
const smooth: When = { eloquence: ['smooth'] };

const both = (...parts: When[]): When => Object.assign({}, ...parts);

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
    only("New face. What's your sitch?", both(first, neutral)),
    only('Can I help you?', both(first, corpo, neutral)),
    only('You lost, {choom}?', both(first, ganger)),
    only("Don't think we've met.", both(first, elder)),
    only("{hey}. Who're you?", both(first, young)),
    only("Don't see many city faces out here.", both(first, nomad)),
    only('Keep your hands where I can see them.', both(first, wary)),
    only("I don't talk to strangers much.", both(first, wary)),
    only('Make it quick.', wary),
    only('{hey}, stranger. A friendly face, for once.', both(first, warm)),
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
      only('My {kinWord} {kinName} is at {kinWork}. Good people.', { needs: ['kinName'] }),
      only("Family's everything. My {kinWord} {kinName} would tell you the same.", { needs: ['kinName'] }),
      only("Got a {kinWord}, {kinName}. Don't go bothering {kinHim}.", { needs: ['kinName'] }),
      only("{kinName}, my {kinWord}, says I talk too much. {KinHe}'s not wrong.", { needs: ['kinName'] }),
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
    knows: ["{other}? {OtherHe}'s my {word}.", 'Sure, I know {other}. My {word}.', '{other} is my {word}. Why?', '{other}. My {word}. What about {otherHim}?'],
    unknown: ['{other}? Never heard of {otherHim}.', "Doesn't ring a bell.", 'No idea who that is.', "{other}... no. There's a lot of people in {district}."],
    repeat: [
      only('{other}? I told you. My {word}.', { needs: ['word'] }),
      only('Still my {word}, last I checked.', { needs: ['word'] }),
      only('{other} again? Never heard of {otherHim}. Still.', { lacks: ['word'] }),
      only("I told you. Don't know any {other}.", { lacks: ['word'] }),
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
    ],
    favorite: ['{item}! You know me.', "No way. {item}. You're alright.", "{item}. Now we're talking.", "How'd you know? {item}'s the one thing I'd kill for."],
    refuse: ['{given} knocks it out of your hand. "Keep it."', "{given} doesn't even look at it."],
  },

  insult: {
    reply: ['Say that again.', 'Big words for a nobody.', only('...Okay.', timid), only('Charming.', corpo), only("You're going to regret that.", hot), only("You know whose turf you're on?", ganger)],
    shove: ['{given} shoves you hard into the wall. The whole street sees it.', "{given}'s fist finds your ribs before you can move."],
  },

  rob: {
    done: ["You take {haul} off {given}. {He} won't forget your face.", '{given} hands it over, eyes burning. {haul}.'],
    nothing: ['{given} turns out empty pockets. "Already been done this week."', 'Nothing on {given} worth taking. {He} laughs, which is worse.'],
    fought: ['{given} fights back. You get {haul} and a split lip.', 'It takes a struggle. {haul}, and {given} marks your face for later.'],
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

  revenge: {
    person: ['{name} and two friends catch up with you at {where}. They take {take} €$ and leave you in the gutter.', '{name} has been waiting. At {where} it costs you {take} €$ and everything you had left.'],
    gang: ['{gang} colors step out of the dark at {where}. They take {take} €$ and make sure you remember.', 'The {gang} find you at {where}. It goes badly: {take} €$, and the rest of your night.'],
  },

  barred: ["{work} won't serve you. Not after what you did to their people.", 'The counter at {work} closes the moment they see your face.'],

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
