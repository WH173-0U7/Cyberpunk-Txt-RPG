# Cyberpunk-Txt-RPG
Game designed to be within the universe of cyberpunk 2077, text based RPG, with in depth mechanics.

**▶ Play it: https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/** (updates automatically on every merge to `main`)

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
| `npm run build` | Builds a static site into `dist/` that can be hosted anywhere (e.g. GitHub Pages) |

## Playing

Every game is a new, procedurally generated Night City: a different mix of districts
(Watson, Westbrook, City Center, Heywood, Santo Domingo, Pacifica, sometimes the Badlands),
different places in them, weather and streets.

**Canon first.** Districts sit where they are in the real Night City (Watson north, City
Center in the middle, Westbrook east, Heywood and Santo Domingo south, Pacifica south-west,
the Pacific to the west and the Badlands to the east), nudged a little each game. Each
district fills up with real places from Cyberpunk 2077 first (the Afterlife, Tom's Diner,
Viktor's Clinic, Lizzie's Bar, Jig-Jig Street, Konpeki Plaza, El Coyote Cojo, the Sunset
Motel…) and only makes up places once it runs out of those. The NCART uses the real 2077
network's station names (Eisenhower Street, MedCenter, Memorial Park, Monroe & Sagan…) and
its line names and colors. Neighborhoods, gangs, corporations and street terms all come
from the game. Arasaka Tower always stands downtown. Names, locations and lore are checked
against the [Cyberpunk Wiki](https://cyberpunk.fandom.com); prices and times are the game's
own.

- **City map**: a street grid of city blocks, desert and coastline, tinted by district.
  Unexplored areas sit under heavy fog. It only lifts along the streets you actually walk
  and a little way around places you've been; riding the NCART doesn't clear it. Arriving
  somewhere reveals the places its routes lead to, and walking past a place turns it up
  (their markers show through the fog). Uncovered ground never pops out of the dark: the
  fog lights up and thins like smoke, thin wisps first and thick ones last, with swirling
  edges, while puffs of smoke roll away from it. Walking flickers the edge of the fog with
  scanlines, and wherever an arrival uncovers new ground the map glitches open in torn
  strips first. The map's foot counts how much you've mapped.
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
- **Zoom**: drag to pan; pinch, scroll or use the **+ / −** buttons to zoom; the target button
  flies back to where you are. Zoomed out, tapping a block flies in to it. Close in, tapping a
  building picks it out and the panel shows its name, category, what it is, its block
  address and size.
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
  you come back: five or six hundred of them, with names from their district's communities
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
- **Getting on with people**: **Talk** gets a greeting that depends on how they feel about
  you and how well they know you (a stranger, someone who saw you yesterday, a regular, a
  face they haven't seen in days), then something about their life, and builds rapport a
  little each time (not twice in an hour). Give them food or drink from your inventory
  (their favorite counts double). The card shows where you stand: Stranger, Wary, Warm,
  Friend, Cold, Hostile.
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
  your charisma and what the question asks of them. Watching tells you things too: open **People** inside a
  shop and its workers are plainly its workers, at night in an apartment block its
  residents plainly live there, and someone eating is eating what they like. Their card
  lists what you know and nothing else.
- **Who knows whom**: the same rule. Opening **People** takes in everyone there, and any
  two who are actually connected you've *seen together* (connected somehow, you don't know
  how). Once someone likes you they drop names ("My sister Ana works at…"), which tells you
  the relation and the name. And you can **Ask about** anyone whose name you have: they'll
  tell you what the person is to them, that they've never heard of them, or nothing. The
  card's **Web** unfolds to show them in the middle and everyone you know them to know
  around them, each spoke labeled with the relation or "?" (dashed) when all you know is
  that they're connected; tap a name to open that person's card (even if they're not here,
  then you can only look).
- **The conversation**: a person's card is a terminal: a short header (who they are as far
  as you know, how they feel about you, what they're doing; what you know of them folded to
  one line, tap to unfold), the transcript filling the rest (your lines after a `›`, theirs
  under their name, newest at the bottom), and one row of commands at the bottom: **Talk**,
  **Ask** (unfolds the questions and the people you can ask about), **Give** (what you
  carry), **Chop** (a hot credchip, when you can tell they're a netrunner), **Web** (their
  web, in the transcript's place until you tap it again or say something) and **⋯** (insult,
  rob). A command's choices show only while it's open. While the card is open, what they
  say stays off the map's feed; it's on the card.
- **Crossing people**: **Insult** someone and they hold it against you (a temper shoves you
  into the wall, which costs energy); **Rob** them and you take a share of their eddies, and
  their credchip if they carry one (locked to them: see **Eddies**). Every
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
- **Their own lives**: the people have days without you. Every day on the clock, in every
  district, a few things happen between them where the people for them exist: a gang leans
  on a storefront for its cut or jumps someone on the way home (the victim loses eddies and
  comes to hate that gang, and earns the eddies back over the week); someone with the nerve
  picks a fight with a gang they hate, or rival crews go at it, and the loser is laid up at
  home for days (missing from the counter and the bar); two regulars of the same place become
  friends; a hot temper ends a friendship. It all happens the same way for a seed whenever
  the days are lived through, up to a month at a time when you've been away, and it sticks:
  the city you come back to has moved on. People talk about it. Chatting turns to the news
  two times in three when there is any: what happened to them, to a relative ("my cousin
  Rosa got jumped by Maelstrom two nights back"), what their gang did, or what they heard
  around the district, and being told of someone is an introduction (the name, and the tie
  when it was family). Wherever you are, the people there are with each other too: a couple
  sharing a table or not speaking, family arguing, friends drinking, a crew holding court,
  coworkers on a break, a ganger leaning on the help, rivals staring each other down. The
  **People** list says who is with whom.
- **Work**: every eatery and clothing store has a boss, the one who runs it (the cook at a
  one-cook noodle bar, whoever runs the counter or the shop otherwise). Find them and their
  card gets a **Work** command: **Ask for work**, and whether they take you on is their
  openness to it, like any ask (how they feel about you, your charisma; never with a mask
  on, never while you've a job elsewhere, and a boss you've crossed says no). Taken on, you
  start at the bottom of that kind of place's ladder: the dish pit at an eatery, the
  stockroom at a store. Inside your workplace between nine and five by the clock the panel
  has **Work**: one shift a day, for the rung's energy, paid into your account (a luxury
  place pays more, a secondhand one less). Every shift is a point of trust and a little
  rapport with the boss; once the trust is there for the next rung and the boss has warmed to
  you, they move you up on the spot, with better pay: prep, then the counter, then the line
  at an eatery; the shop floor, the register, then fitting at a store. **Quit** is on the
  boss's card. A place that won't serve you (you robbed or insulted its people) won't keep
  you either. The line under the energy bar names your rung, and the status drop-down says
  where you work, how many shifts you've put in and what the next rung takes. (People's own
  troubles, and helping with them, come later, once there's combat and
  more to do with a person.)
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
  it's locked. **‹** goes back a level. The strip counts everything and weighs it. Your cash
  is in the map's header too.
- **Settings**: the gear next to it opens the settings. For now that's the save:
  **Restart this city** puts the same city back to the start, and **Erase save** deletes the
  save from this device and starts a brand new city. Both ask first, with Cancel as the
  default.
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
- **Status**: the sign says where you are and the address above it the district; under
  the energy bar one line says your energy level, when the next point comes, and anything
  the matter (drunk, masked, on a shift somewhere). Tap it and a drop-down unfolds the rest:
  energy and charisma experience, your cash, the bank and your chips, the NCART pass, your
  job, your condition, your mask, every reputation that stands at anything, and how much of
  the city you've mapped. Nothing else repeats it.
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
            menus (food.ts), drink (inebriation.ts), the people (people.ts: who lives
            here and where they are), what they think of the player and what comes of it
            (society.ts, which also keeps what the player knows of people and of who knows
            whom), what they say (dialogue.ts), skills that grow with use (skills.ts),
            discovery, ambient chatter, the save format. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts), travel times and
            prices (travel.ts), energy's numbers (energy.ts), the kinds of item the
            inventory sorts by (items.ts), what there is to eat (food.ts), the stages
            of being drunk (inebriation.ts), the people's names, gangs, jobs and lines
            (people.ts), how grudges and reputations work (society.ts) and charisma's
            numbers (skills.ts).
  ui/       City map (camera, gestures, routes, markers), city renderer (draw-city.ts:
            ground, sea, buildings), the fog (fog.ts), the overlays over the map (overlay.ts:
            the inventory in inventory.ts, settings in settings.ts, a menu in shop.ts, who's
            here in people.ts, with the relationship web), the energy bar (energy.ts), place
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
  real neighborhoods, their real places (`landmarks`, used before anything is made up), the
  kinds of place they can make up, mood sentences and ambient lines (separate indoor and
  outdoor sets).
- **Kinds of place** (bar, ripperdoc, night market, rooftop, nomad camp…) have name templates,
  description sentences and ambient lines. In names, `{area}` becomes one of the district's
  neighborhoods and `{n}` a small number: `{area} Night Market` → `Kabuki Night Market`.
- **Buildings**: each district's `zoning` weights what its blocks are built as, and `BUILDINGS`
  gives every kind of building its label, height range and name templates (which can also use
  `{corp}` and `{shop}`). A storefront's business comes from `businesses`, weighted by the
  district's `trade`; a `chain` business is named after its sign, and `where` keeps it to some
  districts. Real eateries are `landmarks` with a `business`.
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
  and openness (what each question costs, what each stance and each level of charisma is
  worth) are in [`src/data/society.ts`](src/data/society.ts). People never change the city,
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
