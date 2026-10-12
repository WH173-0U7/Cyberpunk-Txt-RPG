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
  strips first. The header counts how much you've mapped.
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
  houses, diners, restaurants, fast food) and at places that serve it, **Menu** covers the map
  with what's on. Every dish and drink is a real Night City one, from RaMMMMen and Hawt Dawgs
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
  you come back: a few hundred of them, with names from their district's communities
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
  you and a line about their life (their work, their district, their food, the gang they
  can't stand), and builds rapport a little each time (not twice in an hour). Give them food
  or drink from your inventory (their favorite counts double). Once you're on good terms they
  tell you about their people, and their card lists them: who's family, who's a friend, who's
  in their crew. The card shows where you stand: Stranger, Wary, Warm, Friend, Cold, Hostile.
- **Crossing people**: **Insult** someone and they hold it against you (a temper shoves you
  into the wall, which costs energy); **Rob** them and you take a share of their eddies. Every
  such thing spreads: the victim holds a grudge, so do their spouse, parents, children,
  siblings, cousins, friends, crew and coworkers (by how close they are and how loyal), and
  their people a little; anyone who saw it talks. The victim's gang thinks less of you (its
  rivals a little more), their workplace stops serving you (the whole chain, for a chain),
  their neighborhood cools. Whoever has the grudge and the nerve comes to collect, hours or a
  day later, wherever you are: they take eddies back with interest and leave you with no
  energy; a gang that's had enough of you comes hunting the same way. Grudges fade a point a
  day and reputations recover two, on the game's clock. The **People** overlay lists every
  reputation that stands at anything. (Violence, once there is combat, goes through the same
  machinery: assault and murder are already kinds of incident, with heavier consequences.)
- **Eating and drinking**: in the inventory, every dish has an **Eat** or **Drink** button.
  Food and soft drinks do nothing yet. Alcohol goes to your head: every drink has its units
  (a beer about one, a shot of Moonshine three), they add up, and the body clears a unit an
  hour on the game's clock (a unit a minute at the testing speed), even while the game is
  closed. From one unit you're **Tipsy**, from three **Drunk**, from five **Wasted**, from
  eight **Blackout drunk**; the line under the energy bar says which and when you'll be
  sober. The only effect so far is that the whole terminal blurs and sways with it (blurs
  only, with "reduce motion" on), worse the more you've had.
- **Energy**: the bar under the sign. Energy is what doing things will cost, and it refills
  on the clock, a point every 6 minutes (faster at the testing speed), even while the game is
  closed. Max energy starts very low (10). Spending energy trains it: every point spent is
  experience, running right down to empty earns a bonus, and the energy level (and the max)
  goes up very slowly; level 2 alone takes 600 points spent. A home with a bed will raise
  the max too. Nothing spends energy yet; it's ready for jobs, training and the rest.
- **Inventory**: the **Inventory** button in the map's header (or **I**) covers the map with
  what you carry: your eddies and NCART pass, then your items, sorted by the kinds of item
  in Night City (weapons, attachments & mods, cyberware, quickhacks, clothing, consumables,
  shards, junk, components). A kind only shows once you carry something of it: food and
  drink you've bought are under consumables, with their Eat and Drink buttons, and the rest
  comes with shops and loot. **×** or **Esc** closes it. The panel under the map keeps
  working while it's open.
- **Settings**: the gear next to it covers the map with settings. For now that's the save:
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
- **Saving**: progress saves automatically on your device after every move (the header says
  **Saved**, or **Not saved** if the browser won't allow it, e.g. in a private window). Come
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
            (society.ts), what they say (dialogue.ts), discovery, ambient chatter, the
            save format. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts), travel times and
            prices (travel.ts), energy's numbers (energy.ts), the kinds of item the
            inventory sorts by (items.ts), what there is to eat (food.ts), the stages
            of being drunk (inebriation.ts), the people's names, gangs, jobs and lines
            (people.ts) and how grudges and reputations work (society.ts).
  ui/       City map (camera, gestures, routes, markers), city renderer (draw-city.ts:
            ground, sea, buildings), the fog (fog.ts), the overlays over the map (overlay.ts:
            the inventory in inventory.ts, settings in settings.ts, a menu in shop.ts, who's
            here in people.ts), the energy bar (energy.ts), place panel, transmissions, HUD,
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
  freelance work, the kinds of place people hang out at, and everything they say (`LINES`,
  with `{given}`, `{work}`, `{gang}`, `{dish}`, `{kinName}`… filled in). The cascade's numbers
  (closeness of each tie, severity of each incident, reputation costs, the ban threshold,
  how fast grudges fade, when someone comes to collect) are in
  [`src/data/society.ts`](src/data/society.ts). People never change the city, so they need
  no generator bump; a change to how they're made only loses the player's standings with
  people who no longer exist.
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
