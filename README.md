# Cyberpunk-Txt-RPG
Game designed to be within the universe of cyberpunk 2077, text based RPG, with in depth mechanics.

**▶ Play it: https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/** (the stable release, from `main`)

**▶ Try the beta: https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/beta/** (the next version, from `beta`; it keeps a save of its own, so it never touches the stable game's)

It runs in the browser so the text can be surrounded by neon glow, CRT scanlines, glitch effects,
weather particles and screen effects that react to what's happening in the game.

## Running it

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install      # once
npm run dev      # starts the game at http://localhost:5173 and reloads on every save
```

Other scripts:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (game logic, plus checks on 500 generated cities) |
| `npm run typecheck` | Checks the TypeScript for errors |
| `npm run bench` | Times the slow things (a new game, a reload, a month away, a day) on the biggest cities against the performance budget |
| `npm run build` | Builds a static site into `dist/` that can be hosted anywhere (e.g. GitHub Pages); `CHANNEL=beta` builds the beta, with its own save |

Branches and releases: new work goes to `beta` by pull request, and a push to `beta` or `main`
rebuilds both sites (the beta under `/beta/`, the stable release at the root) and deploys them.
When the beta is good, merge `beta` into `main` and run the **Release** workflow from the Actions
tab with the version (e.g. `0.2.0`): it tags `main` as `v0.2.0` and publishes a GitHub Release
with the notes since the last one and the built site as a zip. Settings says which build you're
on.

## Playing

Every game is a new, procedurally generated Night City, and all of it: every district
(Watson, Westbrook, City Center, Heywood, Santo Domingo, Pacifica) and every neighborhood in
them (Kabuki, Little China, Northside, Japantown, Charter Hill, Corpo Plaza, the Glen,
Wellsprings, Arroyo, Dogtown…), with the Badlands around them, but different places in
them, weather and streets.

**Canon first.** Districts and their neighborhoods sit where they are in the real Night City
(Watson north, City Center in the middle, Westbrook east, Heywood and Santo Domingo south,
Pacifica south-west, the Pacific to the west, and the Badlands' zones round the east and the
south: the oil fields, Red Peaks, Rocky Ridge, Laguna Bend, Sierra Sonora, the Jackson Plains
and Biotechnica Flats), nudged a little each game. Each neighborhood fills up with its own
real places from Cyberpunk 2077 first (the Afterlife and Tom's Diner in Little China, Lizzie's
Bar in Kabuki, Jig-Jig Street in Japantown, Konpeki Plaza on the Arasaka Waterfront, El
Coyote Cojo in the Glen, the Sunset Motel in Red Peaks…) and only makes up places once it
runs out of those. The address over the sign says which neighborhood you're in. The NCART uses the real 2077
network's station names (Eisenhower Street, MedCenter, Memorial Park, Monroe & Sagan…) and
its line names and colors. Neighborhoods, gangs, corporations and street terms all come
from the game. Arasaka Tower always stands downtown. Names, locations and lore are checked
against the [Cyberpunk Wiki](https://cyberpunk.fandom.com); prices and times are the game's
own.

- **City map**: a street grid of city blocks, desert and coastline, tinted by district. It
  opens on you, close enough to read your neighborhood; zoomed out, it's the whole city with
  the districts' names, which give way to their neighborhoods' as you zoom in.
  Unexplored areas sit under heavy fog. It only lifts along the streets you actually walk
  (the block either side, so nothing stays hidden for good) and around places you've been;
  riding the NCART doesn't clear it. Arriving
  somewhere reveals the places its routes lead to, and walking past a place turns it up
  (their markers show through the fog). Uncovered ground never pops out of the dark: the
  fog lights up and thins like smoke, thin wisps first and thick ones last, with swirling
  edges, while puffs of smoke roll away from it. Walking flickers the edge of the fog with
  scanlines, and wherever an arrival uncovers new ground the map glitches open in torn
  strips first. The status drop-down counts how much you've mapped.
- **Buildings**: every block is filled with its own buildings, zoned by district: corporate
  towers downtown, apartment blocks and storefronts in Watson, factories and warehouses in
  Santo Domingo, derelicts in Pacifica, shacks and containers out in the Badlands, plus parks,
  plazas and parking lots. They're kept simple: they stand up off the map with lit windows,
  neon edges, shop signs, holo-ads and red warning lights on the towers.
- **Building categories**: every building lands in exactly one category. Storefronts are
  businesses, named after the kinds of vendor in Night City: commodity (bodegas, pawn and
  junk shops), food, nightlife, firearms, melee weapons, cyberware (ripperdocs), netrunning
  (quickhacks, cyberdecks), clothing, medical, vehicles, entertainment, services and lodging.
  Each district leans its own way: Watson's storefronts run to ripperdocs and gun dealers,
  Japantown's to pachinko and karaoke, Santo Domingo's to garages. Everything else is
  residential, corporate, industrial, storage, public space, parking or abandoned. The
  categories are in `src/data/city.ts` and will drive managing buildings later.
- **Zoom**: drag to pan; pinch or scroll to zoom (+ and − on a keyboard). Zoomed out, tapping
  a block flies in to it. Close in, tapping a building picks it out and the panel shows its
  name, category, what it is, its block address and size. Wander off yourself and a target
  button appears in the map's corner to fly back to where you are; it's gone while you're in
  view.
- **Going inside**: walk to a building and **Go inside** (anything with floors; parks, plazas
  and parking lots are open ground). The map outlines the building, your marker waits at its
  door, and the weather stays outside. Eateries have a menu (below); there's nothing to do
  in the other buildings yet. **Leave** steps back out, and walking off somewhere goes out
  the door first. Being inside is saved.
- **Eating out**: inside anything that sells food (noodle bars, grills, food stalls, dumpling
  houses, diners, restaurants, fast food) and at places that serve it, **Menu** opens what's
  on. Every dish and drink is a real Night City one, from RaMMMMen and Hawt Dawgs
  to Got Escargot? and Chateau Delen 2012, and each kind of kitchen serves its own kind of
  food. How good the place is depends on where it is: City Center eats luxury, Pacifica eats
  cheap, and the rest sit in between, so the same noodle bar is a different place in
  Japantown and in the Combat Zone. Luxury places serve the dear stuff at three times the
  price; cheap ones serve the bottom shelf (Cat Food, Dried Meat, Filtered Rainwater) for
  less. Franchises (Buck-A-Slice, Capitán Caliente, Yagami Market) serve the same menu at the
  same prices wherever they are, and the real eateries that turn up in the city (Tom's Diner,
  Au Cabanon, El Pinche Pollo, Kabuki Market…) have their own menus. **Buy** puts the dish in
  your inventory under consumables.
- **People**: every city has its own people, made up for its seed and the same every time
  you come back: around four thousand of them (three and a half to five thousand), with names from their district's communities
  (Watson's Asian neighborhoods, Heywood's barrios, the Haitian diaspora of Pacifica, corpos
  in City Center), homes in its apartment blocks and megabuildings, jobs in its storefronts,
  towers and factories (or none to speak of), families who share a name (couples, children,
  siblings, cousins, aunts and uncles, in-laws), friends, coworkers, and crews: the gangs
  that run each district by canon (Maelstrom, Tyger Claws and the Mox in Watson, the
  Valentinos in Heywood, 6th Street in Santo Domingo, the Voodoo Boys, Animals and BARGHEST
  in Pacifica, the Wraiths in the Badlands), with their looks, their roles and their feuds.
  Everyone has a personality (warmth, temper, loyalty, greed, courage, how chatty they are),
  a favorite dish and drink, something they hate, a place they go in the evening and eddies
  in their pocket. They keep hours on your phone's clock: home at night, work by day (with
  days off), their hangout in the evening, out on the streets in between. Inside a building
  or at a place, **People** lists who's there and what they're doing; tap one for their card.
  Its **Known** tab lists everyone you've met or know by name, the latest first, so you can
  open anyone's card from anywhere. A card has two tabs: **Talk**, the conversation, and
  **Profile**: how they feel about you (stance, rapport, ♥, grudge), how often you've talked,
  their sex (plain to see), everything you know about them (work, age, home, what they eat and drink, who they hate,
  their type, what they want, their nature), what's still unknown, what they remember of you
  ("Gift: Ramen ×2 · last week", "You walked out · today") and their web.
- **An economy**: the eddies move while you're away. Payday is Friday, when everyone draws a
  week's money (a gang's members from the gang's chest, filled by the cut it takes from the
  storefronts on its turf), and every day living takes some back; most evenings the chatty go
  out and spend at their hangouts, so people are flush on Friday night and short by Thursday,
  and a robbery pays accordingly. Every storefront keeps books: walk-in trade, its regulars,
  what you buy there, against rent, staff and the gang's cut. A week in the red and the place
  is struggling (the boss won't hire, a shift pays a quarter less); a good week and it's
  thriving (a quarter more). The panel inside says how trade is, and people talk about being
  broke, flush, run off their feet or standing in an empty shop.
- **Getting on with people**: **Talk** unfolds the ways in: **Chat** (safe: nobody minds,
  the chatty like it), **Compliment**, **Joke**, **Gossip** or **How are you?**, and each
  lands by who they are. A compliment pleases the warm and the young and falls flat with the
  hard, the suspicious and a corpo; a joke lands with the chatty and the drinking, not with a
  temper, someone at work or someone grieving; gossip with the chatty, not the loyal or the
  nervous; asking how they're holding up means most to the grieving and the broke, and reads
  as pity to the hard and to anyone in a gang. How well you put it counts (charisma: blunt,
  easy, smooth). You get a greeting that depends on how they feel about you and how well they
  know you, their reply, then something about their life, and rapport (not twice in an
  hour); put off, they say nothing more and think a little less of you. Give them food or
  drink from your inventory (their favorite counts double). The card shows where you stand:
  Stranger, Wary, Warm, Friend, Cold, Hostile.
- **Romance**: everyone has a heart: whom they're drawn to (women, men, anyone who goes by
  they, everyone, or no one at all), the way in that wins them over (an easy talker, a way
  with words, a laugh, someone in the know, someone who listens) and the look they go for
  (one of the wiki's four styles, or none). Ask them **Type** and they'll tell you, and the
  card keeps it. Say the pronouns you go by in **Settings** (they, unless you change it): who's
  drawn to you goes by them. **Flirt** (with the other ways in under **Talk**) lands with
  someone drawn to you and free: it lights a spark (the note says ♥ +5), more if you're
  dressed the way they like or they're already sweet on you; coming at them the way they like
  sparks it too, and so does their favorite as a gift. Someone married or seeing someone says
  so. With enough spark and rapport, and once they feel warmly about you, the **♥** command
  on their card can **Ask out**. Seeing someone, ♥ takes them on a **Date**: an evening
  (six till two), somewhere with a menu, not while they're working, once a night; you pay for
  two of their favorite if it's on the menu (they notice), else the cheapest drink. After
  three dates and enough spark you can **Make it official**. Spark fades if you don't see
  them; let it go out and they'll end it. Flirt with someone else in front of them and it
  stings: twice, and they're done with you. **End it** yourself (to their face, or by message)
  and it hurts them, and their family and friends think less of you. One at a time: whoever
  you're seeing won't fall for anyone else in the meantime, and if they die, it's over. The
  status drop-down's **Heart** row says who, how many dates and the spark.
- **How it went**: after everything you say or do with someone, a small note in the
  transcript says how it landed, green when it helped and red when it hurt: why ("Likes a
  kind word", "Not in the mood for jokes", "Doesn't like being asked her age", "Tired of all
  the questions"), what it did to their regard for you and any grudge, the charisma it
  earned (or the level reached), and their stance if it moved ("Stranger → Warm").
- **Personality**: most gangers go by a street name (Static, Rust, Moth…), and so do a few
  others, and once introduced the card shows it. Each gang talks its own way: the Valentinos'
  Spanish, the Voodoo Boys' Kreyòl, the Tyger Claws' Japanese, the Mox calling you "hon",
  BARGHEST calling you "civvie". People want something out of life (out of Night City, new
  chrome, a place of their own, a Trauma Team card, the corner office, payback, a quiet life,
  to be a legend at the Afterlife) and tell you once they're talking, and the card keeps it.
  They have views on Arasaka, the NCPD and Trauma Team, talk about their own district by
  canon (Kabuki's lanterns, the Tyger Claws ruling Japantown by night, Rancho Coronado's
  identical houses, Pacifica off the city's map), their boss and their years at the job, the
  relative they lost. Drunk, your own lines slur, and people notice.
- **How people talk**: nobody reads off a list. Every line is put together on the spot from
  fragments: an opener now and then (someone at the stove says "Hang on", someone three
  drinks in says "Pull up a stool"), the thing itself, and an aside that depends on who they
  are (the talkative run on, the greedy mention eddies, the timid ask you to keep it to
  yourself, the loyal put their people first). Each has a voice: the street, a ganger, a
  corpo, a nomad from the Badlands, their elders, the young, with the wiki's streetslang
  swapped in to match (choom and choomba, gonk, preem and nova, eddies and eds, badges,
  delta, scop and kibble). They know what's going on: where you're talking, how late it is,
  what's being said about you in the district or in their gang. And they remember: ask what
  they've already told you and they say so.
- **Charisma**: how far your words go, and it decides what people will tell you. Every chat,
  gift and answered question is experience; each level (the first takes about fifteen chats,
  each after about twice the one before) makes chats and gifts worth a fifth more rapport
  and opens people up a little more. With none of it, a stranger gives you their name, talks
  about the neighborhood and their lot, tells you their work or their tastes about half the
  time, gives a non-answer about their age and a flat no about where they live or who they
  hate. Around level 3 strangers start giving their age; around level 5, who they hate and
  now and then where they live. Someone warm tells you most things, a friend everything, the
  cold and the hostile nothing. The talkative and the warm open up sooner; the loyal keep
  their people to themselves; the brave name their enemies. Your own lines change with it
  too: at level 1 you ask "How old are you?", later "How old are you, anyway?", later still
  something smoother. Asking again soon after a no is pressing, and costs you rapport. Your
  level and experience are in the status drop-down under the energy bar.
- **What you know of people**: only what you've found out. Until you've been introduced,
  someone is "A young woman in Valentinos colors" or "An older man": what's plain to see
  (their gang's colors, what they're doing) and nothing more. Talking to them gets you
  their name, and whatever they talk about (their work, what they eat, who they hate); a
  few chats and you have their measure. **Ask** them the rest (Name, Work, Age, Home,
  Tastes, Enemies); they answer, give a non-answer, or refuse, by how they feel about you,
  your charisma and what the question asks of them, and the moment: a drink loosens tongues,
  someone at work or eating has less time, a fourth question in a row wears on them, nobody
  says who they hate with that gang in the room (unless they've the nerve), the grieving
  close up, nobody gives out their address at three in the morning, and nobody trusts a
  drunk. Some questions people mind (a stranger asked where they live, someone older asked
  their age) and some they love (food; a ganger asked about rivals), and the answer shows
  it. Watching tells you things too: open **People** inside a
  shop and its workers are plainly its workers, at night in an apartment block its
  residents plainly live there, and someone eating is eating what they like. Their card
  lists what you know and nothing else.
- **Who knows whom**: the same rule. Opening **People** takes in everyone there, and any
  two who are actually connected you've *seen together* (connected somehow, you don't know
  how). Once someone likes you they drop names ("My sister Ana works at…"), which tells you
  the relation and the name, and the news they tell does too. On the card's Profile tab their web closes the page: them in the middle and everyone you
  know them to know around them, each spoke labeled with the relation or "?" (dashed) when
  all you know is that they're connected; tap a name to open that person's card (even if
  they're not here, then you can only look).
- **The conversation**: a person's card is a terminal: a short header (who they are as far
  as you know, how they feel about you, what they're doing; what you know of them folded to
  one line: tap it and all of it unfolds, with their web in the transcript's place until you
  tap again or say something), the transcript filling the rest (your lines after a `›`,
  theirs bare, the notes on how it went small and colored, newest at the bottom), and one row
  of commands at the bottom, each only when it can be done: **Talk** (unfolds the ways in),
  **Ask** (unfolds the questions and the people you can ask
  about), **Give** (what you carry), **Chop** (a hot credchip, when you can tell they're a
  netrunner), **Work** (with a boss), **♥** (ask out, a date, make it official, end it) and
  **⋯** (insult, rob). A command's choices show only
  while it's open. While the card is open, what they say stays off the map's feed; it's on
  the card.
- **Crossing people**: **Insult** someone and they hold it against you (a temper shoves you
  into the wall, which costs energy); **Rob** them and you take a share of their eddies, and
  their credchip if they carry one (locked to them: see **Eddies**); a weapon on you makes
  them likelier to hand it over (see **Weapons and ammo**). Every
  such thing spreads: the victim holds a grudge, so do their spouse, parents, children,
  siblings, cousins, friends, crew and coworkers (by how close they are and how loyal), and
  their people a little; anyone who saw it talks. The victim's gang thinks less of you (its
  rivals a little more), their workplace stops serving you (the whole chain, for a chain),
  their neighborhood cools. Whoever has the grudge and the nerve comes to collect, hours or a
  day later, wherever you are: they take eddies back with interest and leave you with no
  energy; a gang that's had enough of you comes hunting the same way. Grudges fade a point a
  day and reputations recover two, on the game's clock. The status drop-down under the
  energy bar lists every reputation that stands at anything. (Violence, once there is combat, goes through the same
  machinery: assault and murder are already kinds of incident, with heavier consequences.)
- **Hours, and the city out and about**: a shop's counter is open while someone who works
  there is in, so most close at night (the panel says when they open again); hospitals and
  anywhere signed 24/7 never close, with a night shift. Out and about, people turn up at the
  open places near home: browsing a market, smoking on a rooftop, fishing off the docks,
  lighting incense at a shrine, waiting for a megabuilding's elevator.
- **Their own lives**: the people have days without you. Every day on the clock, in every
  district, a few things happen between them where the people for them exist: a gang leans
  on a storefront for its cut or jumps someone on the way home (the victim loses eddies and
  comes to hate that gang, and earns the eddies back over the week); someone with the nerve
  picks a fight with a gang they hate, or rival crews go at it, and the loser is laid up in
  the hospital nearest home for days (missing from the counter and the bar, and in a bed on
  the ward); two regulars of the same place become
  friends; a hot temper ends a friendship, and some get patched up again. Hearts change too:
  two people who are free (friends, or regulars of the same bar, near enough in age) start
  seeing each other, marry after a couple of weeks or so, or one with a temper or a cold
  heart walks out. Work changes with the books: a thriving place takes on someone from the
  neighborhood who's been looking, a struggling one lets the last one taken on go (and their
  coworkers stop being coworkers). Now and then a fight between rival crews ends with someone
  dead (their family come to hate whoever did it, and the gang takes someone young in their
  place), and the oldest die of their years. The dead are gone for good: nowhere to be
  found, and anyone dead who was coming for you never comes. It all happens the same way for
  a seed whenever the days are lived through, up to a month at a time when you've been away,
  and it sticks: the city you come back to has moved on. People talk about it. Chatting
  turns to the news two times in three when there is any: what happened to them, to a
  relative ("my cousin Rosa got jumped by Maelstrom two nights back", "my brother married
  Jun last week"), what their gang did, or what they heard around the district; a death or a
  wedding they bring up for weeks. Being told of someone is an introduction (the name, and
  the tie when it was family), and being told who got together, married, split up or fell
  out puts that right in what you know of them; told of a death, the card says **Dead**
  after. Wherever you are, the people there are with each other too: a couple
  sharing a table or not speaking, family arguing, friends drinking, a crew holding court,
  coworkers on a break, a ganger leaning on the help, rivals staring each other down. The
  **People** list says who is with whom.
- **Memory**: people remember what you did to them, and say so. Rob someone and they
  remember how much and when ("You took 34 eddies off me yesterday"), and twice is twice;
  their family and friends remember hearing about it ("My sister Ana says you robbed her"),
  anyone who saw it remembers that. Give someone a gift and they remember it, and tell their
  people: the ones closest to them warm to you a little and say so ("My cousin says you're
  alright"); the same gift again, they notice. A boss remembers taking you on, moving you up,
  and the day you walked out, and won't take you back while they remember it (three weeks;
  being let go, a month). A netrunner remembers the chip, someone you asked about a relative
  wonders why, and whoever came to collect tells you you're square. Each memory fades on its
  own clock (a gift in a week, a robbery in a month), and when someone talks to you they bring
  up whatever's most on their mind, three times in four, each thing only so often.
- **Work**: every storefront has a boss, the one who runs it (the cook at a one-cook noodle
  bar, whoever runs the counter or the shop otherwise), and every kind of storefront hires,
  each on a ladder of its own: the dish pit, prep, the counter and the line at an eatery;
  the stockroom up to fitting at a clothing store; barback up to floor manager at a bar or a
  club; parts runner, courier, mechanic at a garage; orderly up to charge medtech at a
  clinic; cash runner up to branch manager at a bank, and so on. Find the boss and their
  card gets a **Work** command: **Ask for work**, and whether they take you on is their
  openness to it, like any ask (how they feel about you, your charisma; never with a mask
  on, and a boss you've crossed says no). Each ladder keeps its own hours: shops and
  eateries by day (nine to five, ten to six, a clinic eight to four), Monday to Friday; bars,
  clubs and arcades six till two, Thursday to Saturday. **Two jobs at once**, a day job and a
  side gig on hours that don't clash; asking anywhere else means handing one in (the card
  says "Means notice at…"), which costs less with that boss than walking out, and a boss
  who liked you puts in a word. Half the shifts you've worked in a line of work count as
  trust at the next place in it, so experience and a good word start you a rung or two up
  (never the top: that's earned in-house). Inside your workplace, on a day you're on and in
  its hours, the panel has **Work**: one shift a day, for the rung's energy. The pay is owed
  and comes **Friday morning**, out of the place's till, to your account (a luxury place
  pays more, a secondhand one less, a struggling one a quarter less, a thriving one a
  quarter more, and a week worked at a thriving place is a raise, up to a quarter on top).
  Every shift is a point of trust and a little rapport with the boss; once the trust is
  there for the next rung and the boss has warmed to you, they move you up on the spot. The
  boss's card has your **days** (tap one on or off) and **Quit**, which pays out what's owed.
  A rostered day you don't show costs trust and rapport; four in a row and you're let go. A
  loyal boss at the day job minds hearing about your side gig. A place that won't serve you
  (you robbed or insulted its people) won't keep you either. Your workplaces carry a yellow
  briefcase on the map, glowing while a shift there is on; tap it to plan the walk. The line
  under the energy bar says "Shift on · 7 min" when one's open somewhere else, else your
  rung, and the status drop-down has a row for each job: days, hours, what's owed, shifts and
  what the next rung takes. Working somewhere has its perks: a fifth off at your own
  counter, a staff meal at an eatery or a drink at a bar after every shift, a uniform off the
  rack at a clothing store once you're on the shop floor, and from the third rung the keys,
  so the counter's open to you when nobody else is in. About one shift in three something
  happens, and the panel waits on your choice: a **rush** (hustle through it for tips, or keep
  pace), a **shoplifter** (stop them for the boss and make an enemy, or let the till take the
  loss), someone from the gang whose turf it is **come for the cut** (hand it over, or stand
  up to them and hope they back down), or a coworker asking you to **cover** the rest of their
  shift (half a shift more on your pay, and a friend; or a little sour if you won't). The
  people in it are real, and remember. (People's own troubles, and helping with them, come
  later.)
- **Masks**: a gas mask, a ballistic mask, a balaclava or a menpō (all real 2077 pieces, on
  the thrift rack, at Saeko's and in the clothing stores) hides your face, and anything you
  do to someone from behind it is nobody's doing: no grudge, no word around the district, no
  one coming to collect. They remember the mask, though. The victim, or anyone who saw it,
  who sees that same mask on you again somewhere else or later puts it together, and all of
  it lands on you then as if they'd seen your face at the time. Take the mask off before
  anyone who was there sees it again and you're clear: a bare face is a stranger's. It
  costs: no counter serves a mask (not a kitchen, not a rack, not a bank; the panel says so
  until it comes off), strangers give a mask their name now and then and little else, and
  anyone in a gang reads a mask on their turf as a threat and goes cold. The **People**
  overlay's strip says when you're masked.
- **Eating and drinking**: in the inventory, every dish has an **Eat** or **Drink** button.
  Food and soft drinks do nothing yet. Alcohol goes to your head: every drink has its units
  (a beer about one, a shot of Moonshine three), they add up, and the body clears a unit an
  hour on the game's clock (a unit a minute at the testing speed), even while the game is
  closed. From one unit you're **Tipsy**, from three **Drunk**, from five **Wasted**, from
  eight **Blackout drunk**; the line under the energy bar says which, and the status
  drop-down when you'll be sober. The only effect so far is that the whole terminal blurs and sways with it (blurs
  only, with "reduce motion" on), worse the more you've had.
- **Energy**: the bar under the sign. Energy is what doing things will cost, and it refills
  on the clock, a point every 6 minutes (faster at the testing speed), even while the game is
  closed. Max energy starts very low (10). Spending energy trains it: every point spent is
  experience, running right down to empty earns a bonus, and the energy level (and the max)
  goes up very slowly; level 2 alone takes 600 points spent. A home with a bed will raise
  the max too. Nothing spends energy yet; it's ready for jobs, training and the rest.
- **Overlays**: the inventory, settings, people and menus open over the map and the panel
  under it, so they get the whole lower screen. Each has one strip for a header (what it
  is, a count, **×**); the place you're at stays on the sign above, so nothing is said
  twice. **×** or **Esc** closes one, and the panel comes back.
- **Carrying things**: nothing floats along behind you. Everything you own is in a pocket
  of something you wear: your jacket's, your pants', a bag's. Every item takes a slot (small
  things share one, two to a slot) and weighs something (a taco 250 g, a bottle of sake
  650 g); a pocket holds only so many slots and so much weight. Buying something means a
  pocket with room for it, or the counter says so: eat something, or **Drop** it. General
  stores, thrift shops and clothing stores sell bags (**Shop** on the panel): a belt pouch,
  a messenger bag, a duffel bag, a backpack, each more slots and kilos.
- **Weapons and ammo**: gun shops, gunsmiths, ammo shops and blade shops have a **Shop**
  too. Every weapon is a real 2077 one, checked against its page on the wiki: its name, maker,
  class, Power, Tech or Smart, how many rounds its magazine takes, and what its note says.
  Only what the game's vendors sell is on a rack (no crowbars or machetes: those are only
  ever taken off people), and Dogtown's own guns, Hansen Armory's and the rest sold only
  there, are in Pacifica's stores: the Militech M-10AF Lexington, the Budget Arms Carnage, the
  Arasaka HJKE-11 Yukimura, the Kang Tao G-58 Dian, the Rostović DB-2 Satara, a katana, a
  baseball bat. Each store stocks a handful at its tier, always the same handful: the cheap
  ones sell Budget Arms, Rostović and secondhand Militech; the luxury ones Arasaka, Kang Tao
  and Tsunami smart guns; a gunsmith reaches a tier above its own. Ammo is the wiki's four
  kinds (Handgun Ammo for pistols, revolvers and SMGs; Shotgun Ammo; Heavy Ammo for rifles
  and LMGs; Sniper Ammo), sold by the box and carried loose by the round, so many to a slot
  and so many grams each: fifty handgun rounds are a slot and 600 g, twenty-five shells a
  kilo. A gun is sold empty: **Load** in the inventory fills its magazine from the rounds on
  you (they weigh the same in the gun), **Unload** takes them back out. The Slaught-O-Matic
  comes loaded and sealed, and can't be reloaded. A pistol or a knife goes in a pocket; a
  rifle, a shotgun, a katana or a bat is too long for one, and wants a bag that takes it (a
  messenger bag, a backpack, a duffel) or the gun shop's **gun case**; an LMG is too heavy
  for anything but a duffel or the case. A **holster** carries one handgun or knife off your
  pockets. What you'd pull on someone is in the status drop-down (**Armed**): a loaded gun
  before an empty one (nobody can tell), any gun before a blade. Rob someone with a gun and
  few will fight back; with a blade, more; with bare hands, the brave ones.
- **Cyberware**: ripperdocs (storefronts, and clinics of their own like Viktor's in Little
  China) sell chrome and fit it there and then (**Fit** on the rack); cyberware outlets sell
  it boxed, to take away, and cyberdeck shops sell decks and the RAM for them. Every implant
  is a real 2077 one, checked against its page on the wiki: its name, maker, the part of the
  body it goes in and the capacity it takes: Mantis Blades, Gorilla Arms, a Militech Paraline
  or an Arasaka cyberdeck, a Dynalar or Zetatech Sandevistan, Kiroshi optics, a Smart Link,
  Subdermal Armor, a Kerenzikov, a Second Heart. The body has the wiki's ten parts, each with
  its slots (three in the frontal cortex, one pair of arms), and 50 capacity for all of it; a
  part that's full gives up the implant there longest for the new one (into a pocket if
  there's room, else the doc keeps it). A ripperdoc fits chrome you carry, or takes chrome
  out, for a fee by how good a clinic it is (**Fit** in the inventory; **Take out** on the
  inventory's **Chrome** page). What's in you is on that page and in the status drop-down.
  Chrome counts in a fight (below).
- **Quickhacks**: quickhack dealers sell the wiki's combat and control quickhacks (Short
  Circuit, Overheat, Contagion, Synapse Burnout, Reboot Optics, Weapon Glitch, Cripple
  Movement, Cyberware Malfunction), each with its canon RAM cost. With a cyberdeck fitted,
  they're the **Hack** move in a fight.
- **Fighting**: **Attack** on someone's card (under **⋯**) starts a fight, and it's an
  assault the moment it does. Each beat you both pick a move at once and they land together:
  shoot, slash or punch with the best you have for the range, close in, back off, take cover
  (and reload), quickhack, heal (a MaxDoc or a Bounce Back you carry), talk them down, or
  run. You have seven seconds to choose (more with
  a Kerenzikov, a lot more with a Sandevistan); out of time, you freeze. Range matters: a
  blade or a fist wants arm's reach, a shotgun the room, a rifle the street. Sometimes you
  read what they're about to do, more often if you know their nature. People fight with what
  they carry: Tyger Claws with katanas, Maelstrom with shotguns and chrome, 6th Street and
  BARGHEST with rifles, the Animals with their fists; most people carry nothing. Chrome
  counts: armor, Mantis Blades and Gorilla Arms, a Smart Link for smart guns, a Second Heart.
  You fight to wound unless you say otherwise (the button on the fight's strip, kept between
  fights): nobody dies at your hand, and guns and blades hit a little softer. Fighting to
  kill, few blows kill anyway, a sniper rifle's more than a club's. Put someone down and
  they're laid up in the hospital nearest home for days, or dead (a murder, the whole
  district hears); a corpo's Trauma Team gets them out alive. Go down yourself and they go
  through your pockets, unless you're on a Trauma Team plan. Your health comes back on the
  clock; NCPD heat (stars in the status drop-down) cools off.
- **Knockouts and fighting skills**: a hard punch or a club can knock someone out cold
  before they're beaten, likelier the more worn down they are. They lie where they fell for
  a few minutes, hurt no worse than a headache, and nobody can talk to them till they come
  to. It works on you too: knocked out, you're robbed, but come to with the health you had.
  Two skills grow as you fight: **Street Brawler** (the 2077 skill for fists and blunt
  weapons) with every blow you land bare-handed or with Gorilla Arms, and more for a
  knockout, makes those blows land surer and harder and put people out more often;
  **Toughness** with every blow you take and every fight you walk away from, makes you
  harder to knock out. Both are in the status drop-down.
- **Hospitals and meds**: every district has a hospital (Watson's Kabuki Community Hospital,
  and the Night City Medical Center when the city has it; Dogtown's Haven Clinic; one in
  Westbrook, Heywood, and most cities' downtown and Santo Domingo), in a storefront of its
  own. A hospital, a street clinic or a ripperdoc treats what's missing of your health for a
  fee by how much and how good a place it is (**Treat** on the rack). Pharmacies, clinics and
  hospitals sell the wiki's meds, the MaxDoc and the Bounce Back, to take from the inventory
  (**Use**) or as the **Heal** move in a fight. Hospitals sign you up with Trauma Team's
  2077 packages, Silver, Gold and Platinum, thirty days at a time: go down in a fight and an
  AV picks you up instead of anyone robbing you, patches you up (Silver half way) and drops
  you at the nearest hospital, billing your share of the treatment (all of it on Silver,
  half on Gold, none on Platinum, which also takes 90% off meds). Can't pay, and you're off
  the plan. The status drop-down says which you're on.
- **Clothes**: you're dressed head to toe but the head, in the wiki's six slots (head, face,
  outer torso, inner torso, legs, feet), and every garment is a real piece of 2077 clothing
  from the wiki in one of its four styles (Entropism, Kitsch, Neomilitarism, Neokitsch),
  with its brand where it has one (Arasaka, Kang Tao, Uniware, Sudo, ICON America, AT-AK,
  MaxiWear, Saeko's, Darra Polytechnic, Spunky Monkey). The pockets are ours: a coat has
  deep ones, a tank top none, and the pants take the loose change. A new player wears the
  thrift rack: a Basic tank top, an Old duolayer jacket with buckles, Worn cargo pants and
  Worn aramid high-tops, the wallet in the pants. The wiki's clothing stores sell what the
  wiki shows them selling, each at its tier: **Jinguji**'s flagship downtown and **Avante**
  (**Appel de Paris** on Corpo Plaza, a store in Charter Hill) are luxury neokitsch; the
  **Stylishly** chain keeps to Watson, Heywood and Santo Domingo; **Blossoming Sakura
  Clothier** is Saeko's store on the Japantown boardwalk; **Ded-Zed** is on Richmond Street
  in Northside; and the plain clothing stores, boutiques and thrift shops sell streetwear,
  designer pieces and used clothes. Buying a garment puts it in a pocket; **Wear** in the
  inventory puts it on. What you had on comes off into a pocket with room, or stays where
  you stand if there is none; whatever was in its pockets, the wallet included, moves to
  pockets with room first, or the swap is off. A hat or face wear can also just come off
  (**Take off** on its row) into a pocket with room; the rest of what you wear gets swapped,
  never shed. A garment that hides your face says so in the inventory (see **Masks** above).
- **Eddies**: cash and the account. Cash is **bills** in a wallet in your pants (it holds a
  thousand; a note weighs next to nothing) and **coins** loose in the pocket beside it (a
  slot of their own, and six grams to the eddie, so a pocketful of change is a heavy one).
  The wiki's eurodollars are hologram-marked bills and small coins; the denominations are
  ours. You pay coins first, then in notes of five and up, and the difference comes back in
  coins, as far as your pocket has room for them. The **account** is the holo's side of
  money: weightless and safe, and what chains, luxury places, stores with a rack and the
  NCART take by transfer when it covers the price; everyone else wants cash. A robbery nets
  mostly bills and some coins, each only as far as there's room. **Banks** move eddies
  between the two: Asukaga & Finch downtown and EuroBank branches (both from the wiki) have
  a counter (**Bank** on the panel) to deposit all your cash, withdraw bills, or change
  coins for bills; the bank keeps five percent of any coins it counts. The map's head shows
  your cash; the account is in the status drop-down and at the bank. **CredChips** (the wiki's 2020
  chips of eurodollars; a "chop" in its Streetslang) are items with a balance on them. They
  ride in your wallet's four card slots (a pocket slot each after that), pay where transfers
  are taken (a chip before the account), and the bank's **Chips** command takes the ones in
  your name into the account. One taken off someone comes **locked** to them, worth nothing
  to you or to any counter until a netrunner **chops** it: a netrunner for hire, a Voodoo
  Boys netrunner, or anyone behind a netrunning counter will, for a quarter of what's on it,
  if they're willing (the same openness as any favor, the greedy sooner, a friend always),
  and once they've worked for you, you know their trade. Corpos nearly always carry a chip
  with real money on it, the street often with less, gangers rarely. Whoever comes to
  collect takes the chips on you, too, when your cash runs short.
- **Inventory**: the **Inventory** button in the map's header (or **I**) opens on you head
  to toe: a row per slot with what you wear there, its brand, style and tier, how full its
  pockets are and what it weighs; then the bags you carry. Tap a garment or a bag to open
  its pockets: what's in them with its weight and its Eat, Drink, Wear and Drop buttons,
  and the pockets inside (the wallet in the pants, with the coins beside it), which open in
  turn: the wallet shows the bills in it and the chips, each with what's on it and whether
  it's locked. **‹** goes back a level. The strip counts everything and weighs it. The
  button itself is the one thing in the map's header, with your cash on it.
- **Settings**: the last row of the status drop-down (below). First **You**: the pronouns
  you go by (she, he or they), which decides who's drawn to you. Then the save: **Restart this
  city** puts the same city back to the start, and **Erase save** deletes the save from this
  device and starts a brand new city. Both ask first, with Cancel as the default.
- **Getting around**: tap a place, an NCART station, a building, or (zoomed in) any spot on
  a street. The panel shows two ways there:
  - **Walk**: free, along the streets, to anywhere on the map. Tapping the same thing again
    walks there too. You can stop partway (**Stop here**) or change course by picking
    somewhere else.
  - **NCART**: every city has its own metro lines and stations. You can only board at a
    stop, so walk to one first. From there, pick any station (or anywhere else, and the
    train takes you to the stop nearest it), wait for a train and ride; the rest is on
    foot. A ride costs **1 €$**, or nothing with a **monthly pass** (20 €$ for 30 days,
    sold at any station). You start with 50 €$. Once you've paid, the ride runs to the end.
- **On the move**: your marker moves smoothly along the route the whole way, with the
  trail behind you lit up. Zoomed in, the map glides along to keep you in view (unless
  you've just moved it yourself).
- **Real time**: trips run on your phone's clock, in real minutes: about a minute of walking
  per city block, and much less on the train. They carry on while the game is closed; come
  back and you've arrived (or you're still on your way). **For testing, everything currently
  runs 60× faster**, so a 20-minute walk takes 20 seconds. Set `timeScale` in
  [`src/data/travel.ts`](src/data/travel.ts) to `1` for real time; walking speed, train
  speed, waits, the fare and the pass are all set there too.
- **Panel**: where you are and what it's like, what you've picked and how long getting there
  takes each way, or the trip you're on with a countdown.
- **Transmissions**: the city's chatter types across the top of the map, then fades.
- **Status**: the sign says where you are, the address above it the district, and the clock
  the time of day; under the energy bar one line says your energy, its level, when the next
  point comes, and anything the matter (drunk, masked, on a shift somewhere). Tap it and a
  drop-down unfolds the rest: energy, charisma and fighting experience, your cash, the bank and your
  chips, the NCART pass, your job, your condition, your mask, every reputation that stands at
  anything, how much of the city you've mapped, the weather, the date, and the way into the
  settings. Nothing else repeats it.
- **Saving**: progress saves automatically on your device after every move (the light in the
  map's head stays on; it says **Not saved** if the browser won't allow it, e.g. in a private
  window). Come
  back later and you pick up in the same city, at the same place, with the same map, wallet
  and pass, and any trip still underway.

Each city has a **seed**, shown under the map and in the page address (e.g. `#7f3a29c1`). The
same seed always rebuilds the same city, which is how a save stays small: it keeps only the
seed and where you've been. A new player who opens a link with a seed starts in that city;
anyone with a save carries on with their own.

If an update changes how cities are built, older saves can't line up with their city any
more. The game then starts that city over and says so. (Developers: bump `GENERATOR_VERSION`
in `src/engine/generate.ts` when that happens; a test in `tests/save.test.ts` fails as a
reminder.)

There's no typing. On a keyboard, Tab moves between places and stations on the map, Enter
picks one (and pressed again, walks there), + and − zoom, and Esc clears the pick.

## How it's built

The game logic never touches the screen. It announces what happens as events, and the
effects layer decides how that should look:

```
src/
  engine/   Game rules and state: the city generator, the NCART network, street routes,
            trip planning on the real clock, the wallet and pass, energy (energy.ts),
            menus (food.ts), weapons and what stores stock them (weapons.ts), cyberware
            and fitting it (cyberware.ts), fighting (combat.ts), medicine (medical.ts), drink
            (inebriation.ts), the people (people.ts: who lives
            here and where they are), what they think of the player and what comes of it
            (society.ts, which also keeps what the player knows of people and of who knows
            whom), what they say (dialogue.ts), romance with the player (romance.ts),
            skills that grow with use (skills.ts),
            discovery, ambient chatter, the save format. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts), travel times and
            prices (travel.ts), energy's numbers (energy.ts), the kinds of item the
            inventory sorts by (items.ts), what there is to eat (food.ts), the guns,
            blades and ammo (weapons.ts), the implants and the body (cyberware.ts), the
            quickhacks (quickhacks.ts), fighting's numbers and lines (combat.ts), the meds,
            treatment and Trauma Team's plans (medical.ts), the stages
            of being drunk (inebriation.ts), the people's names, gangs, jobs and lines
            (people.ts), how grudges and reputations work (society.ts) and charisma's
            numbers (skills.ts).
  ui/       City map (camera, gestures, routes, markers), city renderer (draw-city.ts:
            ground, sea, buildings), the fog (fog.ts), the overlays over the map (overlay.ts:
            the inventory in inventory.ts, settings in settings.ts, a menu in shop.ts, a
            fight in fight.ts, who's here in people.ts, with the relationship web), the
            energy bar (energy.ts), place
            panel, transmissions, HUD,
            typewriter, markup parser, the save slot in local storage.
  fx/       Effects: weather particles, screen glitch/shake/flash, glitch text, district colors.
  main.ts   Wires engine events to the UI and effects.
tests/      Vitest unit tests.
```

| Game event | What the player sees |
|---|---|
| Picking somewhere | Its marker lights up, the walk there is drawn along the streets, and the NCART stations a ride would use glow |
| Travelling | Your marker moves along the route in real time, lighting the path behind it, with a countdown in the panel |
| Arriving somewhere | Signal-tear glitch, neon sign flickers on, colors crossfade to the district palette, weather changes, the panel rescans |
| Discovering places | The fog clears like smoke, new markers and routes appear, districts light up and get their names |
| Ambient line with an effect | e.g. lightning flashes the screen and the sign; a bass drop shakes the bar |
| Drinking | The whole terminal blurs and sways, more with every drink, and clears as you sober up |
| Someone collecting on a grudge | The screen shakes, the line comes up red, the energy bar empties |
| `{g\|word}` in any text | The word tears and scrambles every few seconds |

Effects that rely on motion are toned down when the OS "reduce motion" setting is on.

## Adding content

Cities are built from the pools in [`src/data/city.ts`](src/data/city.ts):

- **Districts** have colors, weather options, where they sit on the map (`anchor`), their
  real neighborhoods and where each sits from the anchor (`areas`, `areaAt`), their real
  places (`landmarks`, each with the neighborhood it's in, used before anything is made up),
  the kinds of place they can make up, mood sentences and ambient lines (separate indoor and
  outdoor sets). Every city has every district and every neighborhood in it.
- **Kinds of place** (bar, ripperdoc, night market, rooftop, nomad camp…) have name templates,
  description sentences and ambient lines. In names, `{area}` becomes the place's own
  neighborhood and `{n}` a small number: `{area} Night Market` → `Kabuki Night Market`.
- **Buildings**: each district's `zoning` weights what its blocks are built as, and `BUILDINGS`
  gives every kind of building its label, height range and name templates (which can also use
  `{corp}` and `{shop}`). A storefront's business comes from `businesses`, weighted by the
  district's `trade`; a `chain` business is named after its sign, and `where` keeps it to some
  districts. Every other storefront makes up a name of its own in its neighborhood's flavor
  ("Menya Hotaru" in Japantown, "Cantina La Esquina" in the Glen, "Bon Bagay Bar" in
  Pacifica) or goes by its neighborhood ("Kabuki Noodles"), from the words in
  [`src/data/storefronts.ts`](src/data/storefronts.ts). Real eateries are `landmarks` with a
  `business` (and the neighborhood they're in, where the wiki says).
- **People** are in [`src/data/people.ts`](src/data/people.ts): name pools by community and
  which communities each district draws from, the gangs (their members' look, roles and
  rivals) and each district's turf, job roles by business, category and building kind,
  freelance work and the kinds of place people hang out at. Everything they say is in
  [`src/data/dialogue.ts`](src/data/dialogue.ts): pools of fragments (openers, asides,
  greetings, topics, answers, non-answers, refusals…) with `{given}`, `{work}`, `{gang}`,
  `{dish}`, `{kinName}`, `{here}`… filled in and the slang (`{choom}`, `{gonk}`, `{eddies}`…)
  swapped in by voice; a plain string fits anyone, `only(text, when)` fits the people it
  says (by stance, voice, mood, history, traits, the player's eloquence, or which variables
  are filled). The cascade's numbers (closeness of each tie, severity of each incident,
  reputation costs, the ban threshold, how fast grudges fade, when someone comes to collect)
  openness (what each question costs, what each stance and each level of charisma is worth)
  and memory (how long each kind of memory lasts, how much it weighs, how often it's brought
  up) are in [`src/data/society.ts`](src/data/society.ts); how often people's days bring a
  fight, a romance, a wedding, a hire or a death is in [`src/data/life.ts`](src/data/life.ts). People never change the city,
  so they need no generator bump; a change to how they're made only loses the player's
  standings with people who no longer exist.
- **Food** is in [`src/data/food.ts`](src/data/food.ts): every dish names the menus it turns
  up `on` (noodles, grill, street, diner, fine, market…), which qualities of place serve it
  (`where`; everywhere if not said) and the districts where it's a staple (`favored`).
  `kitchens` say what each business (and kind of place) serves and how long its menu is;
  `fixed` are the real eateries' and the chains' own menus. A district's `dining` weights how
  good its places are. Menus never change the city, so they need no generator bump.

A description is one sentence from the kind plus one mood sentence from the district, and has
to fit in 160 characters, so keep sentences short. Add a new kind to `KINDS`, then list it in
the `kinds` of every district it can appear in. `npm test` generates 500 cities and checks that
every one is connected, has every place on its own street corner, routes that follow the
streets, a coastline that never floods a place, unique names and descriptions that fit, and
buildings that stay off the streets, out of the sea and out of each other's way.

Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
