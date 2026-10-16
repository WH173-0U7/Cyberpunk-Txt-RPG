import type { DealingRules } from '../engine/dealing';
import { DRUGS } from './drugs';

/**
 * Dealing for a gang. Who deals what is canon: the Tyger Claws make and move Glitter, Maelstrom
 * runs a drug trade (Black Lace is what Maelstrom hands V), the Animals brew their own Juice,
 * the Scavengers distribute Deep Dive and Phant, and the Valentinos traffic drugs (the older
 * street drugs, the wiki giving them none of their own). The other gangs front nobody. The
 * connects and collectors are the roles each gang already has; the rungs' titles, the corners
 * (a canon place the gang works first) and every number are ours.
 *
 * A runner is fronted eight doses and owes back over half of what they'd fetch, in two days; a
 * lieutenant forty, owing less, in five. A buyer a three-hour block comes by a corner in the
 * small hours of the morning, four in the last hours of the night. A debt grows a tenth a day,
 * and the collectors come three hours after the deadline, and every twenty after that.
 */
export const DEALING: DealingRules = {
  drugs: DRUGS,
  gangs: {
    tyger_claws: {
      drugs: ['glitter'],
      connects: ['lieutenant'],
      collectors: ['collector', 'foot soldier', 'biker'],
      titles: ['Runner', 'Pusher', 'Supplier', 'Lieutenant'],
      spots: ['Jig-Jig Street', 'Cherry Blossom Market', 'Megabuilding H8'],
    },
    maelstrom: {
      drugs: ['black-lace'],
      connects: ['lieutenant', 'chop-shop runner'],
      collectors: ['enforcer', 'scrapper'],
      titles: ['Runner', 'Slinger', 'Supplier', 'Lieutenant'],
      spots: ['Totentanz', 'Megabuilding H11', 'Northside Docks'],
    },
    animals: {
      drugs: ['juice'],
      connects: ['juice dealer', 'pack leader'],
      collectors: ['brawler', 'pit fighter', 'bouncer'],
      titles: ['Juice runner', 'Juice dealer', 'Supplier', 'Pack lieutenant'],
      spots: ['Grand Imperial Mall', 'Pacifica Pier'],
    },
    scavengers: {
      drugs: ['deep-dive', 'phant'],
      connects: ['crew boss'],
      collectors: ['scav', 'harvester'],
      titles: ['Runner', 'Peddler', 'Supplier', 'Crew boss'],
    },
    valentinos: {
      drugs: ['synthcoke', 'dorph'],
      connects: ['lieutenant'],
      collectors: ['collector', 'soldado'],
      titles: ['Runner', 'Puntero', 'Supplier', 'Teniente'],
      spots: ['Mercado Sonora', 'Megabuilding H5', 'Dicky Twister'],
    },
  },
  rungs: [
    { id: 'runner', at: 0, paid: 0, front: 8, cut: 0.55, days: 2 },
    { id: 'dealer', at: 8, paid: 2, front: 15, cut: 0.5, days: 3 },
    { id: 'supplier', at: 20, paid: 5, front: 25, cut: 0.45, days: 4 },
    { id: 'lieutenant', at: 36, paid: 9, front: 40, cut: 0.4, days: 5 },
  ],
  habits: {
    chance: { gang: 0.45, street: 0.18, corpo: 0.15, guard: 0.12, elder: 0.08 },
    adultAt: 18,
    elsewhere: 0.3,
  },
  join: { stances: ['warm', 'friend'], vouched: ['neutral', 'warm', 'friend'], rep: -20 },
  trust: { paid: 4, early: 2, late: 3, short: 5, fought: 15, cutOff: -12 },
  debt: {
    interest: 0.1,
    graceHours: 3,
    againHours: 20,
    plead: { base: 0.3, perLevel: 0.06, most: 0.85, hours: 12, trust: 1 },
    beat: { health: 0.4, energy: 10, trust: 2 },
    threat: 1.5,
  },
  corner: {
    kinds: ['alley', 'market', 'street', 'club', 'bar', 'megabuilding', 'boardwalk', 'noodle', 'docks', 'junkyard', 'factory', 'pachinko', 'mall', 'park'],
    buyers: [3, 1, 1, 1, 2, 2, 3, 4],
    busy: { club: 1.6, street: 1.5, market: 1.3, bar: 1.3, pachinko: 1.2, megabuilding: 1.2, mall: 1, alley: 1, noodle: 1, boardwalk: 0.9, park: 0.8, docks: 0.8, junkyard: 0.7, factory: 0.7 },
    energy: 1,
    regulars: 3,
    regularAt: 3,
    rapport: 2,
  },
  push: { base: 0.4, perLevel: 0.07, need: 0.3, most: 0.85, more: 1.3, rapport: 3 },
  short: { least: 0.5 },
  pitch: { rapport: 4 },
  tiers: { luxury: 1.5, everyday: 1, poverty: 0.7 },
  bad: {
    robber: 0.06,
    rough: { watson: 1.5, pacifica: 2, badlands: 2, santo_domingo: 1.3, heywood: 1, westbrook: 0.7, city_center: 0.5 },
    undercover: 0.25,
    read: { base: 0.25, perLevel: 0.07, most: 0.9 },
    snitch: { base: 0.03, pushed: 0.05, turned: 0.07, regular: 0.3 },
    seen: 0.15,
    tab: { payBack: 0.55, loyalty: 0.5, extra: 0.15, days: 7 },
    rob: { doses: [0.5, 1], cash: [0.3, 0.8] },
    talk: { base: 0.35, perLevel: 0.06, most: 0.85 },
  },
  // A dose's effects are ours, after what the wiki says each does: Black Lace's armor, damage and crits for less health (300 seconds in 2077), Glitter's strong high, Juice's muscle, SynthCoke's reflexes and paranoia, 'Dorph's second wind and its nerve damage (a 1 in 10 chance a dose, in 2020), Phant's changes to the brain that don't go back. Glitter kills on a bad dose; harsh, any of them can.
  habit: {
    effects: {
      glitter: { minutes: 20, charisma: 2, aim: 0.8 },
      'black-lace': { minutes: 10, armor: 20, power: 1.15, melee: 1.1, crit: 0.1, maxHealth: 0.65, steady: 0.7, edge: 8 },
      juice: { minutes: 30, melee: 1.3, steady: 0.8, maxHealth: 1.1 },
      'deep-dive': { minutes: 30, energy: 3, charisma: -1, aim: 0.85 },
      phant: { minutes: 40, energy: 5, charisma: -2, aim: 0.75, nerve: 0.05 },
      synthcoke: { minutes: 15, window: 1500, aim: 1.1, charisma: -1 },
      dorph: { minutes: 20, heal: 20, energy: 2, steady: 0.85, nerve: 0.1 },
    },
    dependence: { perDose: 12, cleanDay: 4, most: 100 },
    tolerance: 0.6,
    craving: { at: 20, hours: 6 },
    withdrawal: { at: 35, hours: 12, charisma: 2, aim: 0.85, drainMinutes: 30 },
    severe: { at: 65, hours: 24, health: 0.15, detox: 0.5 },
    overdose: { base: { glitter: 0.03, 'black-lace': 0.015, juice: 0.008, 'deep-dive': 0.008, phant: 0.02, synthcoke: 0.012, dorph: 0.005 }, stack: 1, stackHours: 2, most: 0.5, saved: 0.6 },
    nerve: { aim: 0.03, most: 10 },
    edge: { cleanDay: 1.5, numb: 50, snap: 85, charisma: 1, snapChance: 0.15 },
    lines: {
      use: {
        glitter: ['You breathe the Glitter in, and the city comes on like someone turned up its colors.', 'One hit of Glitter: your teeth hum, your thoughts sparkle, and everyone is suddenly worth talking to.', 'The Glitter goes in cold and blooms hot. Everything shines a little too much.'],
        'black-lace': ['The Black Lace hits like a door kicked in: no pain, no fear, nothing but edges.', 'A breath of Black Lace, and your skin goes numb and your hands want something to do.', 'Black Lace: your heart drums, the world slows, and pain becomes a rumor.'],
        juice: ['You knock back the Juice. Your arms feel wider than the doorway.', 'The Juice goes down thick and chemical. Your veins stand up to see what is happening.', 'Juice: a burn in the gut, then the muscles wake up angry.'],
        'deep-dive': ['The Deep Dive takes you somewhere softer. You describe a beach out loud, and there it is.', 'One breath of Deep Dive and the room goes far away, the way you like it.', 'Deep Dive: the city fades to a murmur, and your thoughts float.'],
        phant: ['The Phant comes on like a tide, and something touches your shoulder that is not there.', 'Phant: the walls breathe, the light has a taste, and some part of you knows this is costing you.', 'You take the Phant, and the shadows rearrange themselves into people you used to know.'],
        synthcoke: ['The SynthCoke hits the back of your skull: everything is quick, and everyone is watching you.', 'A line of SynthCoke, and your reflexes outrun your thoughts.', 'SynthCoke: sharp, fast, sure of yourself, and sure somebody is following you.'],
        dorph: ["The 'Dorph smooths you out. The aches go, and a second wind comes.", "You swallow the 'Dorph, and the pain backs off like it has been told.", "'Dorph: warm, easy, and for a while nothing hurts."],
      },
      wearOff: ['The {drug} wears off, and the world comes back ordinary and grey.', 'The {drug} is gone. What it was holding back comes back.', 'The last of the {drug} fades.'],
      craving: ['You want {drug}. Not like a want: like a hunger.', 'Your hands keep finding your pockets, looking for {drug}.', 'Everything would be easier with a little {drug}. You know it is lying.'],
      withdrawal: ['The {drug} withdrawal has you: sweats, shakes, and a head full of broken glass.', 'Without {drug}, your body is making demands. Loudly.', 'Withdrawal: every nerve wants {drug}, and none of them are polite about it.'],
      severe: ['The withdrawal takes your legs out from under you. You come to in {ward}, strapped down and wrung out. {bill}', 'You go down shaking. Someone calls it in; you wake in {ward}, detoxed and billed. {bill}', 'Your body gives up waiting for {drug}. Blackness, then {ward}, a drip in your arm. {bill}'],
      overdose: ['Too much, too fast: the floor tilts up to meet you and your heart forgets its rhythm.', 'The {drug} hits wrong. Your vision whites out and your lungs stop listening.', 'Your heart stutters, races, stutters. You are going down and you know it.'],
      saved: ['{who} sees you go down and calls it in. You wake up in {ward}, alive, and billed for it. {bill}', 'Somebody, {who}, keeps you breathing till the ambulance comes. You wake in {ward}. {bill}', '{who} gets help in time. {ward}, a tube down your throat, and a bill. {bill}'],
      trauma: ['Trauma Team is on you before you hit the ground: a needle, a voice, an AV. You wake in {ward}. {bill}', 'Your plan pays out: Trauma Team pulls you back from the edge and drops you at {ward}. {bill}', 'An AV, a medic, a jolt that brings your heart back. {ward}, alive. {bill}'],
      flatline: ['Your heart stops on the ground at {place}. Nobody comes. Night City goes on without you.', 'At {place}, alone, you flatline. The city does not notice.', 'Nobody is there to call it in. At {place}, your story ends.'],
      tolerant: ['It does not hit like it used to. You are used to {drug}.', 'Half of what it was. Your body has learned {drug}.', 'The {drug} barely lands. You would need more for what one used to do.'],
      nerve: ['Your fingers go numb, and stay a little numb. Something in there will not come back.', 'A cold tremor runs down your arm and never quite leaves.', 'Your hands are not as steady as they were. They will not be again.'],
      numb: ['You feel nothing much about anything. People notice it in your eyes.', 'The Black Lace has worn something away in you. Warmth is hard to find.', 'Faces look like faces, and that is about all. The edge is close.'],
      snap: ['Something in you snaps, and you go for {who}.', 'The world goes red at the edges. You are on {who} before you know why.', 'You do not decide to hit {who}. Your body does.'],
    },
  },
  war: {
    take: 0.35,
    rivals: { base: 0.03, heat: 0.12, near: 0.3, pay: [0.3, 0.6], yield: 2, trust: 2 },
    heat: { decay: 0.5 },
    threat: { chance: 0.35, amount: [40, 120], hours: [2, 8] },
  },
  crew: {
    from: 2,
    most: [2, 4],
    stances: ['warm', 'friend'],
    keen: { gang: 0.6, user: 0.5, straight: -0.8 },
    sizes: [5, 10, 20],
    owe: 0.65,
    days: 5,
    sell: { base: 1, perUsers: 12, perLevel: 0.12, most: 8 },
    practice: 6,
    bust: { base: 0.06, name: 0.45, loyal: 0.6, hold: [1, 3] },
    robbed: { base: 0.035, share: [0.3, 0.8], hurt: 0.4, hurtDays: [1, 4] },
    skim: { greed: 0.62, share: [0.05, 0.2] },
    use: { doses: [0, 2] },
    mood: { start: 55, sold: 2, busted: 25, robbed: 15, leaned: 20, slide: 10, settled: 6, quit: 20, walk: 0.35, runOff: 0.5 },
    lean: { base: 0.45, perLevel: 0.08, most: 0.9, rapport: 6, grudge: 15, slide: 5 },
    lines: {
      busted: [
        'Word reaches you: the NCPD picked up {who} with {doses} doses of {drug}. All of it is gone.',
        'Bad news on the street: {who} got stopped and searched. {doses} doses of {drug}, seized.',
        '{Who} is in a cell tonight, and your {drug} is in an evidence locker.',
      ],
      named: [
        'And {who} gave them your name.',
        'Word is {who} talked. The NCPD has your name now.',
        '{Who} did not keep quiet: your name is on a warrant.',
      ],
      robbed: [
        'Word reaches you: {who} got jumped, and lost {doses} doses and {cash} €$ of what {he} held.',
        'Somebody robbed {who}: {doses} doses of your {drug} gone, and {cash} €$ with them.',
        '{Who} got rolled on the street. {doses} doses and {cash} €$ off {him}.',
      ],
      quit: [
        'Word reaches you that {who} wants out. {He} still has what {he} was holding for you.',
        '{Who} is done running for you, word is. Go get what {he} holds.',
        'You hear {who} has had enough of the life. What {he} owes you is still out there.',
      ],
      walked: [
        'Word reaches you: {who} is done running for you.',
        '{Who} has had enough of the life, word is. {He} is off your crew.',
        'You hear {who} wants nothing more to do with it. One runner fewer.',
      ],
      ran: [
        '{Who} is gone, and your {drug} and your money with {him}.',
        'Word reaches you: {who} skipped out with everything {he} was holding for you.',
        '{Who} took the package and ran. {He} is somewhere in the city with your money.',
      ],
      dead: [
        'Word reaches you: {who} is dead. Whatever {he} held for you is gone.',
        '{Who} will not be running for you again. {He} is dead, and the product with {him}.',
        'Your runner {who} is dead. The street keeps what {he} had on {him}.',
      ],
    },
  },
  lines: {
    walkUp: [
      '{Who} drifts over, eyes on everything but you, and asks if you are holding {drug}.',
      '{Who} waits till the street clears, then comes in close: {drug}, if you have it.',
      'A low whistle, and {who} is at your elbow wanting {drug}, cash balled in a fist.',
      '{Who} comes up fast and twitchy, talking before arriving: {drug}, one, now.',
      '{Who} stops beside you like it is an accident, and says {drug} to the air.',
    ],
    regular: [
      '{Who} again, a regular now. Same as last time: {drug}.',
      "{Who} gives you the nod you've come to know, cash out before asking.",
      'Here comes {who}, right on time, wanting {drug}.',
      'You know the walk before you see the face: {who}, back for more {drug}.',
    ],
    short: [
      '{Who} wants {drug}, then turns out empty pockets: {pay} €$ is all there is.',
      '{Who} counts it twice and it still comes to {pay} €$. Will that do?',
      '{Who} has {pay} €$ and a long story about payday.',
      '{Who} holds out {pay} €$ and a look that says it is everything.',
    ],
    sold: [
      'Cash, a handshake that is not a handshake, and {who} is gone: {price} €$.',
      '{price} €$ into your pocket, a dose into theirs. {Who} does not look back.',
      '{Who} pays {price} €$ and melts back into the street.',
      'Quick and quiet: {price} €$, and {who} is already round the corner.',
    ],
    pushed: [
      '{Who} grumbles, and pays it: {price} €$.',
      '{Who} swears at the price, then pays it anyway: {price} €$.',
      '"Thief," says {who}, and hands over {price} €$.',
      '{Who} sighs like it hurts, and it comes to {price} €$.',
    ],
    walked: [
      '{Who} laughs at the price, and walks.',
      '"Not for that," says {who}, already leaving.',
      '{Who} spits, and takes the money somewhere else.',
      '{Who} stares at you a long second, then goes without a word.',
    ],
    turned: [
      'You shake your head, and {who} goes looking elsewhere.',
      'Not today, you tell {who}, who melts away.',
      'You wave {who} off. No argument.',
      '{Who} gets a look from you and backs off.',
    ],
    quiet: [
      "Nobody's buying. The corner is dead for now.",
      'The street is empty of anyone wanting anything. Give it a few hours.',
      'Quiet. Whoever was buying has bought.',
      'Nothing doing. The corner wakes up later.',
    ],
    dry: [
      'You have nothing left to sell. Your connect has more, once you settle up.',
      'Your pockets are empty of product. Time to see your connect.',
      'Sold out. What you owe goes to your connect.',
    ],
    due: [
      'Time is up on the {gang} package: {owed} €$ still owed, and it is a debt now.',
      'The {gang} wanted {owed} €$ by now. It is late, and growing.',
      'The deadline has passed on what you owe the {gang}: {owed} €$, and the interest is running.',
    ],
    collect: [
      '{Who} steps out of nowhere, close enough to smell. The {gang} want their {owed} €$.',
      'A hand on your shoulder: {who}, from the {gang}, here for the {owed} €$ you owe.',
      '{Who} blocks your way, all smile and no warmth. {owed} €$, for the {gang}. Now.',
      '{Who} falls into step beside you. The {gang} sent {him} for {owed} €$.',
    ],
    collectPaid: [
      '{Who} counts it, and nods. You are square with the {gang}, for now.',
      '{Who} pockets it. Square. Do not make {him} come back.',
      'Every eddie counted twice, and {who} lets you go. The {gang} are paid.',
    ],
    collectSome: [
      '{Who} takes the {pay} €$ you have. {left} €$ to go, and {he} will be back.',
      '{pay} €$ is not {owed}, says {who}, but it is a start. {left} €$ left.',
      '{Who} pockets {pay} €$ and makes a note of the rest: {left} €$.',
    ],
    pleaded: [
      '{Who} hears you out, then gives you till {when}. Not a minute more.',
      'Talked round, just: {who} gives you till {when}.',
      '{Who} lets you go with a warning and a time: {when}.',
    ],
    pleadFailed: [
      '{Who} is not interested in stories.',
      '"Everybody has a reason," says {who}, cracking {his} knuckles.',
      '{Who} lets you finish, then shakes {his} head.',
    ],
    beaten: [
      '{Who} takes it out of you instead: a beating in a doorway, and what cash you had. {left} €$ still owed.',
      'It is quick and it hurts. {Who} leaves you on the ground, {left} €$ still owed.',
      '{Who} makes an example of you. When you can stand, you still owe {left} €$.',
    ],
    cutOff: [
      'The {gang} are done with you: no more product, and they mean to have their {owed} €$ one way or another.',
      'Word comes down: the {gang} have cut you off. What you owe, they will collect.',
      'You are out with the {gang}. The {owed} €$ is not.',
    ],
    robber: [
      '{Who} comes up like a buyer, close, and then there is a {weapon} in your ribs: the product and the cash.',
      'Halfway through asking for {drug}, {who} pulls a {weapon}. "All of it. Now."',
      '{Who} was never buying: the {weapon} comes out, low, where nobody else can see it.',
      '"Easy," says {who}, letting you see the {weapon}. "Hand it over and nobody bleeds."',
    ],
    handOver: [
      'You hand it over: {took}. {Who} backs off into the crowd and is gone.',
      '{took}, gone into {his} pockets. {Who} does not even run.',
      'You give up {took}. {Who} pats your cheek, and walks.',
    ],
    talkedDown: [
      'You keep your voice low and your hands where {who} can see them, and talk. The {weapon} goes away.',
      'Something you say lands: {who} thinks better of it, and slips off.',
      'You talk {him} round, and {who} melts back into the street with nothing.',
    ],
    talkFailed: [
      '{Who} is not listening. The {weapon} jabs, once, to make the point, and then it is all gone: {took}.',
      'Words do not do it. {Who} takes {took}, and a swing at you for wasting {his} time.',
      'You talk; {who} hits you, and takes {took} anyway.',
    ],
    tell: [
      'Something is off: the shoes are too clean for this corner.',
      'Something in the stance is wrong: square and patient, like a course taught it.',
      'You catch it: {his} eyes keep going to the end of the street, where a car is parked with nobody in it.',
      'There is a bulge under the jacket where a holster would be, and nobody round here wears one like that.',
    ],
    busted: [
      'The cash is still in your hand when {who} flips a badge. "NCPD. Do not move." A car pulls up across the street.',
      '"Thanks," says {who}, and then the badge: "You are under arrest." Two more officers step out of nowhere.',
      '{Who} takes the dose and keeps hold of your wrist. "NCPD. You picked the wrong buyer."',
    ],
    tabAsk: [
      '{Who}, a regular, comes up short again: {pay} €$, and could you put the rest on tab?',
      'Your regular {who} has {pay} €$ and a promise. Tab it, just this once?',
      '{Who} has {pay} €$, and asks if it can go on the tab, like friends do.',
    ],
    tabTaken: [
      'On tab: {who} owes you {owed} €$ now.',
      'You let it ride. {Who} owes {owed} €$, and swears on {his} mother.',
      '{owed} €$ on the tab, for {who}. You will see.',
    ],
    tabPaid: [
      '{Who} settles the tab first, and a little over: {pay} €$.',
      'Good as {his} word: {who} pays off the tab, {pay} €$ with something for your trouble.',
      '{Who} hands over {pay} €$ for the tab before you can ask.',
    ],
    tabDodged: [
      "{Who} says nothing about the tab, and you notice.",
      '{Who} talks fast about something else. The tab is still open.',
      '"Next time," says {who}, about the tab. It is always next time.',
    ],
    rivals: [
      '{Who} and two more in {gang} colors come out of the crowd and stand either side of you. This corner is theirs now, they say.',
      '{gang}: {who} at the front, others behind. "You are selling {ours} trash on our corner."',
      'The buyers melt away. {Who}, {gang} to the bone, takes their place: "Clear off, or get cleared."',
      '{Who} leans on the wall beside you, {gang} ink on show. "Funny. I heard this was our corner."',
    ],
    clearedOff: [
      'You pocket what you have and walk. Behind you, {who} takes your spot.',
      'Not today. You clear off, and the {gang} have the corner for the night.',
      'You give {who} the corner. The {ours} will hear about it.',
    ],
    paidOff: [
      '{pay} €$ buys you the rest of the night. {Who} counts it and steps back.',
      '{Who} takes the {pay} €$ like it is owed, and lets you be.',
      'You pay {pay} €$ to stay. {Who} will be back for more.',
    ],
    stoodUp: [
      'You do not move. {Who} takes that the only way the {gang} know how.',
      'You tell {who} where the {gang} can go, and {who} swings first.',
      'It is your corner. {Who} disagrees, with {his} fists.',
    ],
    lost: [
      'Word comes down: the {gang} have taken {corner}. Your connect wants you somewhere else.',
      '{corner} is {gang} ground now, after last night. You will not be selling there.',
      'The {gang} won {corner} off the {ours}. Somebody bled for it, and it was not them.',
    ],
    retaken: [
      'The {ours} have {corner} back. The {gang} paid for it.',
      '{corner} is the {ours}\' again, after a long night.',
      'Word is the {ours} took {corner} back off the {gang}.',
    ],
    newCorner: [
      'Your connect has a new corner for you: {corner}.',
      'You sell at {corner} now. Your connect says it is safer. Your connect says a lot of things.',
      'The {ours} put you on {corner} instead.',
    ],
    noCorner: [
      'There is no corner left for you. Your connect will find you one when there is.',
      'The {ours} have nowhere to put you for now. No corner.',
      'No corner for you, for now. The war has eaten them all.',
    ],
    rivalTurf: [
      'This is {gang} turf. Someone will tell them a {ours} dealer was here.',
      'Selling on {gang} ground: they will hear of it.',
      'Eyes on you from a doorway. The {gang} will know about this.',
    ],
  },
};
