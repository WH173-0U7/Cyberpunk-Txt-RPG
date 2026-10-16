# Working on Night City Terminal

A browser game (TypeScript + Vite) set in the Cyberpunk 2077 universe, played mostly on phones.
The README covers how it plays and how the code is laid out.

## Content comes from canon: the Cyberpunk Wiki and the Cyberpunk TCG

- **Canon first.** Names, places, districts, factions, corporations, history, slang and how
  systems work (the NCART, ripperdocs, braindance…) come from the Cyberpunk Wiki,
  https://cyberpunk.fandom.com. Use canon until it runs out; only then make something up,
  in the same style, and never reuse a real name for something made up.
- **Numbers are ours.** Prices, travel times, stats and other tuning are game design, not
  canon. They live in `src/data/` (travel and prices are in `src/data/travel.ts`).
- **Check before adding.** Confirm a name, its spelling and where it is (district and
  sub-district) on the wiki. Prefer the wiki's styling (e.g. "Night Corp", "BARGHEST").
- **Reading the wiki.** Its pages sit behind a bot check, but the MediaWiki API works:
  `https://cyberpunk.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=A|B|C`
  (up to 50 titles per call). Keep requests few and send a descriptive User-Agent.
- **Write our own words.** Wiki text is CC BY-SA: take the facts, don't copy the sentences.
- **Images are reference only.** Wiki images are CD Projekt Red's art. Use them as a visual
  baseline for the look; don't add them to the repo or the game.

## The Cyberpunk TCG

https://cyberpunktcg.com is the official Cyberpunk Trading Card Game (Weird Co., licensed by
CD PROJEKT RED). Use it alongside the wiki:

- **Art direction.** Its card art and its look (dark panels, yellow accents, crosshair
  brackets, barcode and data strips) are the inspiration for the game's art, and for making
  the world feel real and lived in. As with the wiki: inspiration only, never copied in.
- **Characters, items, abilities, weapons and attachments.** When these come into the game,
  take their names and details from both the wiki and the TCG: the card database at
  https://cyberpunktcg.com/cards and the rules at https://cyberpunktcg.com/comprehensive-rules.
  Card text and card numbers are theirs: keep the facts, write our own words, and set our
  own numbers.

## The city

Every city is all of Night City: every district of the real one and every neighborhood in
them, about where they are on the real map, with different places, streets and weather:

- `src/engine/generate.ts` builds it from the seed and `src/data/city.ts`. A district's
  `anchor` (0–100, north up) and its neighborhoods' `areaAt` offsets from it place its
  `Subdistrict`s: the wiki's sub-districts (Kabuki, Little China, Japantown, the Glen…), and
  the Badlands' zones round the east and the south. Each game nudges them a little, and they
  are scaled to the map, `WORLD` in `src/engine/geography.ts` (160 units across; anything
  that knows where the map ends goes by it). Every block, street corner and place belongs to
  the nearest neighborhood (`subdistrictAt`, and `districtAt` for its district), so a place
  is always in its own; `Location.area` names it, and `Game.neighborhoodOf` the player's.
- A neighborhood gets two or three places (one or two out in the Badlands): its own real ones
  first (a `Landmark`'s `area`), then its district's with none, then made-up kinds the
  district doesn't have yet. Corners are handed out a round at a time, a place for each
  neighborhood each round, so none is crowded out by its neighbors. A made-up name fills
  `{area}` with its own neighborhood and keeps to `SHORT_NAME` when its kind has a name that
  short (the sign is a phone wide). A real building (`BuildingLandmark`) takes the building of
  its kind nearest the middle of its `area` when it has one, else of its district; one with
  `categories` takes only a storefront of the first of them the district has, and none is
  built without one. A new real place goes in with the `area` the wiki gives it.
- Hospitals are building landmarks of the `hospital` business (never drawn at random:
  `where: []`), one a district but the Badlands, in a clinic, a pharmacy, a laundromat or a
  bodega (`HOSPITAL_GROUND`: never a storefront anyone hangs out at, and with the same number
  of hands, so the people come out the same as without them; `tests/people.test.ts` checks),
  and the Night City Medical Center, a place of kind `hospital`, when Little China draws it.
  `hospitalsOf(world)` lists them, `nearestHospital` finds one.
- The map opens on the player (`OPENING_ZOOM`), and as it zooms in the district names fade
  into their neighborhoods' (those with a place the player knows), which fade in turn; the
  closest zoom is as close as it was on a smaller map (`MAX_ZOOM`). While it moves it draws at
  one pixel a pixel. A district's name goes in the middle of its places, or on its own
  neighborhood nearest it when that middle is someone else's ground (the Badlands').

## Inside buildings

Going inside a building is in place, with nothing to do in there yet. What's added later
(counters, rooms, people, jobs) hangs off the same pieces:

- `Game.interior` is the building the player is in (`enter()`, `leave()`, the
  `interiorChanged` event); it's saved as `inside`. New rules for being inside go in `Game`.
- `insideView` in `src/main.ts` is the panel inside. It has the building's `category` and
  `business` to decide what to show.
- Opening hours (`rules.hours`, `HOURS` in `src/data/hours.ts`): a storefront's counter (its
  menu, rack, bank or ripperdoc's chair) is open only while someone who works there is in
  (`Game`'s private `counterOpen`, by `whereIs` of its staff, kept per building until a day is
  lived); a hospital and anywhere whose sign says 24/7 (`allHours`) never close, and a place
  of its own (a market, a stall) never does. Shut, `menu`, `bank` and `clinic` are null,
  `canBuy` says when it opens, and `Game.closed(now)` gives the panel what it would be and
  when someone's in again (its Closed action). The tests' `RULES` leave `hours` out, so their
  counters are always open; a test about hours passes `HOURS`.

## The inventory

Everything the player owns is in a pocket of something worn, but the chrome in them; food,
drink, meds, credchips, clothing, weapons, ammo, cyberware and quickhacks are the items so far:

- An `Item` has a `kind` (`ItemKind`: weapon, ammo, attachment, cyberware, quickhack, clothing,
  consumable, shard, credchip, junk, component, after the wiki's 2077 item types plus the
  2020 credchip), a name, a count and the pocket it's `in`. `Game.inventory` is what the player carries, saved as `items`;
  `Game.gearSaved` is their pockets, saved as `gear`. Giving and taking items goes in
  `Game`: `Game.buy(id)` (off a menu or a rack; what's bought goes in its pocket before it's
  paid for, so the change only comes back where there's room left), `Game.consume(id, now,
  from)` (eat or drink one), `Game.drop(id, from)` (`from` is the pocket the row was tapped in:
  the same thing can be in two). Anything new that hands the player an item goes through
  `pocketFor` (room, or none) and sets `in`; old saves with items in no pocket are put away
  by `stow`.
- `src/engine/carry.ts` is the arithmetic: what a thing weighs (`itemGrams`: by its kind,
  a dish's own `grams`, a garment's own), how many share a slot (`stackSlots`), a pocket's
  load (its stacks, the pockets inside it a slot each, the bills in a wallet and the coins
  in the change pocket as weight, the coins a slot too), `fits`, `placeFor` (a pocket
  already holding some of it first), `walletRoom` (bills), `changeRoom` (coins) and
  `outfit` (what's worn in each slot, and the bags). `src/data/gear.ts` has the numbers:
  the wallet (`holds` bills, `chips` card slots), grams per €$ in bills and in coins, the
  bags and what stores rack them; the garments come from `src/data/clothing.ts`.
- A garment is a `PocketKind` with a `slot` (the wiki's six: head, face, outer, inner, legs,
  feet), a `style` (its four), a `quality` tier and maybe a `brand`; its pockets are its
  `slots`/`maxGrams`, none for a tank top, and `change` marks the pants. `GARMENTS` are
  real 2077 clothing from the wiki, named as the wiki names them, with our pockets, weights,
  prices and notes; `STORES` is each store's stock (by business id: what the wiki shows its
  vendor selling) and `STORE_QUALITY` its tier. The player's clothes are worn pockets
  (`PocketState` with `in: null`), one per slot; `GEAR.start` is the outfit a new player
  wears, and `Game`'s constructor dresses an older save in whatever slot it has nothing on.
  Clothing carried is an `Item` of kind `clothing` with `gear` naming the garment;
  `Game.wear(itemId)` swaps it in: the garment it replaces goes in a pocket with room (or is
  left behind), after what was in its pockets, the wallet included, has found room, else the
  swap is off; `Game.takeOff(pocketId)` sheds a hat or face wear into a pocket with room,
  and refuses the slots `GEAR.start` covers (those get swapped, never shed). A garment with
  `mask` (the word for it: gas mask, ballistic mask, balaclava, menpō) hides the face;
  `Game.masked()` is the one worn, and what it does is under People below. A rack (`Game.menu()` at a store) sells garments as `clothing` menu items at
  their own price, with the slot, style and brand as `detail`, and bags by the store's tier
  (`GEAR.quality`, else drawn like an eatery's). Stores are businesses in `src/data/city.ts`
  (the wiki's chains and named stores keep to their districts) with roles in
  `src/data/people.ts`.
- Eddies are `Money` (`src/engine/money.ts`): `bills` and `coins` on hand, and the
  `account`; `Game.wallet` has all three and `eddies` (the cash). Every payment goes
  through `Game`'s private `pay(price, transfers)`: a transfer from the account where the
  counter takes one (`MONEY.transfers`: chains, luxury places, racks of gear, the NCART)
  and the account covers it, else cash through `payCash` (coins first, notes of `noteMin`
  and up, change back in coins as far as `changeRoom` allows, measured once the coins paid
  are out of the pocket); `Game.affords(id)` and
  `affordsFare(amount)` tell the UI what can be paid for, by either. Anything that pays the
  player cash goes through `walletRoom`/`changeRoom` (see `rob`); anything that takes it,
  `takeCash` (bills first). A bank is a building whose business is `bank` (the `EuroBank`
  chain and the Asukaga & Finch landmark in `src/data/city.ts`, both canon names):
  `Game.bank()`, `deposit()`, `withdraw(amount)`, `exchange()`, with the numbers in
  `src/data/money.ts`; `src/ui/bank.ts` is its counter. Saved as `money` (old saves' `eddies`
  become bills).
- Credchips (the wiki's 2020 chips of eurodollars) are items of kind `credchip`, each its own
  (`newChipId`) with a `balance` and, taken off someone, `locked`. The wallet's `chips` card
  slots take them first (`placeFor`), a pocket slot each after that. Where transfers are
  taken, `pay` spends a clean chip before the account; `Game.bankChips()` banks the clean
  ones; `rob` hands over the victim's `Person.chip` (drawn on its own RNG stream in
  `generatePeople`, odds and ranges in `PEOPLE.chips`), and collectors take the chips on the
  player when cash runs short. A locked chip is cleared by `Game.chop(personId, chipId, now)`:
  the person must be a netrunner (`isNetrunner` in `src/engine/people.ts`: by role, or
  working a `netrunning` storefront) the player can tell is one (`Game.canChop`: job known,
  or at work behind that counter here); whether they will is `openness` with the `chop` cost,
  their cut `MONEY.chopCut`, their lines `LINES.chop`. `Game.wallet.chips` is the eddies on
  clean chips.
- A store with a rack (`GEAR.racks`, by business id) gets a `Menu` of kind `gear` from
  `Game.menu()`, priced by the store's quality like food; buying gear adds a pocket (worn,
  `in: null`). `Game.canBuy(id)` says why not (barred, short, no room) so the shop can.
- Weapons and ammo: `src/engine/weapons.ts` is the engine, `src/data/weapons.ts` the canon
  and the numbers (`ARMS`, on `GEAR.arms`). Every weapon is a real, non-iconic 2077 weapon
  checked against its own wiki page: the infobox's title (the name without the maker),
  manufacturer, type (our class), technology (Power/Tech/Smart; for melee the wiki's Blade,
  Blunt or Thrown, our class's `cut`) and ammo capacity (the magazine, the game's number when
  the page's prose disagrees). Its note says only what the page says of it (characteristics,
  database entry, intrinsic), in our words; its store tier follows what the page says of its
  price and market. `tests/weapons.test.ts` pins each one's infobox facts (`CANON`): a new
  weapon goes in there from its page too. A weapon no vendor sells in the game (enemy drops
  only, or not to be had) is `sold: false`, on no rack; one the wiki has sold only in some
  districts has `where` (Dogtown's, in Pacifica; the Senkoh LX downtown). The TCG's Gear has
  no shop weapons yet (cyberware, gadgets, and Satori, which is iconic). The ammo is the wiki's four kinds by item id
  (`handgun-ammo`, `shotgun-ammo`, `heavy-ammo`, `sniper-ammo`), the class saying which a
  gun takes; rounds are carried loose (`perSlot` to a slot, `grams` each, sold by the
  `box`). A weapon is an `Item` of kind `weapon`, one each (`newWeaponId`, count 1), naming
  its model in `weapon`, with its rounds in `loaded` (they weigh with it in `itemGrams`). A
  class marked `long` (rifles, shotguns, the katana, the bat…) fits only a `PocketKind` with
  `long` (the messenger bag, duffel, backpack, the gun case); a pocket kind with `only`
  takes only those item kinds (the holster, the gun case). `ARMS.stores` is what each
  weapon store stocks (by business id): `stockFor` draws its guns or blades from `tiers`
  for its quality (a step up with `up`, the gunsmith) on the store's own stream; `Game`'s
  rack lists them first at their own price, then a box of each round priced like a bag,
  then `GEAR.racks`. `Game.canLoad(id)`, `load(id)` and `unload(id)` move rounds between
  the stacks and a magazine (a `disposable` gun is sold loaded and sealed); `Game.armed()`
  is what `drawWeapon` would pull (a loaded gun, then any gun, then a blade), which `rob`
  uses (`ARMS.rob`, the share of courage it takes to fight back against each) and names in
  its lines (`weapon`, `gun`, `blade`, `blunt` in the vars). Shooting, damage, attachments
  and people's own weapons hang off the same pieces when they come.
- Cyberware: `src/engine/cyberware.ts` is the engine, `src/data/cyberware.ts` the canon and
  the numbers (`CHROME`, on `GEAR.chrome`). Every implant is a real, non-iconic 2077 one
  checked against its own wiki page: the infobox's title (a cyberdeck by its first mark,
  "Paraline Mk.1"), manufacturer, type (the part of the body, or an operating system's kind:
  Cyberdeck, Sandevistan, Berserk), capacity and the tier it's first sold at; its note says
  only what the page says it does, in our words. `tests/cyberware.test.ts` pins each one
  (`CANON`): a new implant goes in there from its page. The body is the wiki's ten parts with
  its slots (`parts`); `capacity` is what everything fitted may add up to (ours). A store
  with chrome (`CHROME.stores`, by business id or by kind of place: a ripperdoc is a
  storefront or a place of its own, Viktor's Clinic) gets its rack from `chromeStockFor` (its
  tier, a ripperdoc's a tier up, `perPart` for a spread of the body, `only` for a deck shop)
  on its own stream, listed first on `Game`'s rack. A ripperdoc (`fits`) fits what it sells
  there and then (`Game.buy`); bought anywhere else, an implant is an `Item` of kind
  `cyberware` named by its id, weighing by its part (a pair of arms wants a bag).
  `Game.clinic()` is the ripperdoc here and its fee (`fitting`, by its tier); `canInstall`/
  `install(id, now, from)` fits one carried, `canUninstall`/`uninstall(id, now)` takes one
  out into a pocket. `fitCheck` is the rule: never the same one twice, never past the
  capacity, and a part with every slot taken gives up the implant fitted there longest (into
  a pocket with room, else the doc keeps it). What's fitted is `Game.chrome()` (the
  `chromeChanged` event), saved as `chrome` (`Fitted`: which, and since when); the
  inventory's outfit page ends in a Chrome row opening onto a page by part (Take out at a
  clinic), and the status drop-down has a Chrome row. What chrome does is in a fight (see
  Fighting), by implant id in `COMBAT.chrome`; anything new it does goes there too.
- Quickhacks: `src/data/quickhacks.ts` (`HACKS`, on `GEAR.hacks`) is the eight the wiki has
  netrunner vendors selling that do something in a fight (its Combat and Control ones), each
  checked against its page (name, type, tier, RAM cost; `tests/combat.test.ts` pins them),
  with what it does in a fight (`effect`) and our price. A quickhack dealer (`HACKS.stores`)
  racks every one its tier sells, a tier up; a quickhack is an `Item` of kind `quickhack`
  named by its id, one copy each (`Game.canBuy` refuses a second).
- Meds: `src/engine/medical.ts` and `src/data/medical.ts` (`MEDICAL`, on `GEAR.medical`). The
  meds are the wiki's 2077 healing medication (the MaxDoc, the Bounce Back: its maker and
  type; what they heal is ours), items of kind `consumable` named by their id, weighing their
  own `grams`; `Game.consume` takes one (all it gives, at once; not at full health, not in a
  fight), and in a fight they're the Heal move (see Fighting); where they're sold is under
  Medicine.
- `src/data/items.ts` names each kind and says what goes in it (the order items are listed
  in within a pocket). Real items take their names and details from the wiki and the TCG.
- `src/ui/inventory.ts` shows a page at a time: the outfit (a row per slot, then the bags),
  or inside one pocket (its pockets' load, the items in it with Eat/Drink/Wear/Load/Unload/Drop,
  each row carrying the pocket it's in for `Game` (a part-loaded gun gets both Load and Unload), the
  pockets inside it as rows that open, and figures for the bills and the coins). `main.ts`
  keeps the path of pockets opened; what using or wearing something does is `Game`'s
  business. Weight has no effect on the player yet; `Game.carry()` has the total for when it
  does.

## People

Every city has a population, made up for its seed in `Game`'s constructor (`generatePeople`
in `src/engine/people.ts`, from `src/data/people.ts`): it never touches the city itself, so
it needs no generator bump. The pieces:

- The people come in three draws, each on its own RNG stream, so the first (`seed:people`: the
  staff by `rolesFor`, `residents` per home, the gangs by their district weights) never
  changes and every save keeps the people it knows; the second (`seed:people:more`) fills
  the city out by `PEOPLE.more` (the chance of one more pair of hands per storefront, with a
  role from `roles.extra` by the building's category; residents `perHome`, more in a `tall`
  block and a `megabuilding`; the gangs again, by `gangs`); the third (`seed:people:crowd`,
  `PEOPLE.crowd`, the same shape) is the crowd that fills the homes, most of a city now
  (about four thousand people in all, from three and a half to five thousand). Make a city bigger or smaller with the last draw's numbers, or a fourth draw on a new
  stream, never by changing an earlier one (`tests/people.test.ts` checks the first two come
  out the same with the crowd as without it). Families, ties and hangouts are made within a
  draw; coworkers, crews and bios over everyone at the end, except that the crowd knows only
  `crowdKnows` of the people they work with (on a stream of its own), not a whole tower.
- A city that size has to stay quick on a phone, about four times slower than a desktop.
  `npm run bench` (`tests/budget.test.ts`, skipped by `npm test`) times the slow things on
  the biggest cities against `BUDGET` (a new game, a reload, a month away, a day, the people
  at a spot, a save): run it before and after anything that touches the city or its people,
  and keep inside it. Nothing that runs per person or per day may scan every person or tie.
  `tiesOf` and `personById` keep an index per list (a list of ties is only ever replaced by a
  filter or pushed to, never edited in place: keep it that way); `peopleAt` looks only at
  people whose home, work or hangout is the spot; `bossOf` takes the staff when the caller
  has them; `liveDay` keeps its storefronts' staff indexed until a hire, a layoff or a death,
  and picks a pair out of a crowd by counting (`pickPair`, and the fights and new friendships
  counted from per-gang lists and ties) instead of listing every pair, drawing the same one
  `rng.pick` would; residents and storefronts are grouped by district once a catch-up.
  `liveUntil` keeps the ties in a `TieBook`: a day reads and changes the book's web, and the
  population's list is settled once at the end, in the order changing it there and then
  would have left (so anything in a day reads ties from the book, never `population.ties`);
  the book and the hearts are kept between days with the population (`keptFor`), a heart
  worked out again only when what it's drawn from (spouses, gang, work and role, grudge) changes. A
  save's records
  are copied in with JSON (`copyOf`), never `structuredClone`, which in V8 makes the first
  write to each key of a big record slow (seconds, for a city's eddies).
- A `Person` has a home, a job (`building` null for freelance work), maybe a `gang`,
  `traits`, `likes` (a dish, a drink, a `hangout` spot), `hates` (a gang) and `eddies`.
  `Tie`s link people both ways: `to` is `from`'s `kind` (spouse, partner, parent, uncle,
  friend, crew, coworker…; `INVERSE` gives the other side), one tie a pair. `whereIs` puts a person somewhere by the clock
  (`Clock`: hour, weekday, day; the phone's local time, or `rules.clock` in tests; night work,
  `worksNights`, at a bar, a club or the night desk, and for half the hands of a place that
  never closes, `allHours`, runs from six till three); nobody is placed on the streets, only
  in buildings and at places, so `Game.peopleHere(now)` works inside a building or at a
  location. Out and about (not at home, work or their hangout), people are now and then at an
  open place near home (`hauntOf`: one of the three nearest of `PEOPLE.out.kinds` in their
  district, on its own stream; `out.share` of those times, doing what `out.kinds` says people
  do there, never reading as busy, eating or drinking), else on the move and nowhere;
  `whereIs` and `peopleAt` take `out` (`Game` passes `PEOPLE.out`; without it, as before).
- `src/engine/society.ts` is the player's side: `Standing` per person (rapport, and a grudge
  fading on the clock), `Rep` per circle (`gang:`, `district:`, `business:<building id>`,
  `chain:<business id>`), incidents and threats. `applyIncident` is the cascade; add a new
  kind of incident (assault, murder are already named) by giving it a severity in
  `src/data/society.ts` and calling `Game`'s private `incident()`. Anything that should
  change how someone feels goes through `changeStanding`/`changeRep` so it fades right.
- What the player knows is separate from what is true: `SocietyState.known` (met, seen,
  told of; which `facts` the player has: name, job, age, home, likes, hates, nature, and
  `dead` once they've been told; which of those they `said` themselves (`heardFrom`,
  `saidBy`: asked one again, they say they've said it, `LINES.repeat`; known any other way,
  they just answer); and
  the `log` of what was said, the last `LOG_CAP` lines) and `links` (what the player knows
  of a tie, keyed `a|b`; `kind` null for "connected somehow", `'none'` for "asked, and
  they'd never heard of them"). The UI shows a person only through `Game.describe` (name
  or their look, and the facts known), `standingWith` (web) and `conversation`, never the
  `Person` or the population's ties directly; new ways of finding things out go through
  `learnOf`, `learnFact` and `learnLink` (`Game.look` for what's plain to see, the topics
  in `talk`, `Game.ask` and `Game.askFact`), and everything said goes through `logLine`. The
  Ask picker offers only `Game.worthAsking` to ask someone about (at most `ASK_ABOUT`, from
  what the player knows: seen with them, their family name, here with them, talked to lately,
  and none already asked), never everyone known, which grows with every name learned. A
  tie that has changed since (told of a couple, a wedding, a split, a falling out or a
  making up) is `relearnLink`, which replaces what the player knew.
- People remember what the player did, thing by thing (`src/engine/memory.ts`): a `Memory`
  is a `kind` (`MemoryKind`: wronged, heard, saw, settled, gift, goodWord, hired, promoted,
  quit, fired, chopped, asked), when, `about` whom, `what`, an `amount`, how many `times` and
  how often it's been `said`, kept per person in `SocietyState.memories` (saved under
  `society`), with the numbers in `SOCIETY.memory` (days each kind lasts, its weight, how
  often it's brought up, the `cap`). The incident cascade writes what was done, seen and
  heard (from `heardAt` grudge up); `Game`'s private `remember` writes the rest (gifts, a
  good word through `passGoodWord` to the people closest to whoever got one, work, chops,
  questions, someone collecting). `Game.talk` brings up `recall`'s pick (`memory.recall` of
  the time) from `LINES.memory`, filled by `memoryVars` (`mem`, `mem<Kind>`, `memWho`,
  `memWord`, `memAgo`, `memTook`, `memItem`, `memTwice`…); a grievance (`GRIEVANCES`) is all
  they say. What memory changes goes through it too: a boss with `quit` or `fired` on their
  mind turns the player away (`LINES.work.rehire`), a gift had before is `again`. A new thing
  to remember is another `MemoryKind` with its numbers and lines (the dialogue test pins
  every memory line, and every news line, to exactly one kind).
- `src/engine/skills.ts` is a skill that grows with use (experience, levels, a bonus per
  level); charisma (`src/data/skills.ts`), applied in `Game.talk`, `gift` and `ask`, and
  the two fighting skills, Street Brawler and Toughness (see Fighting). A new skill is another `SkillRules` in `src/data/skills.ts`, a state on
  `Game`, a save field and an event.
- `src/engine/dialogue.ts` puts lines together from fragments in `src/data/dialogue.ts`
  (our own words; slang from the wiki's Streetslang page, by voice through the `lexicon`).
  A `Speaker` is everything a line is picked and filled by (voice, mood, stance, history,
  the player's eloquence, `vars`); `Game.speakerFor` builds it. `compose` adds an opener and
  an aside by how chatty someone is; `fits` is the one place conditions are checked. New
  things people can say are new pools (or new `When` conditions), never new code paths; a
  new variable goes in `varsFor` or `speakerFor` and is guarded with `needs`/`lacks`.
  `tests/dialogue.test.ts` sweeps whole cities for holes (`{...}` left unfilled, empty
  lines, a var empty mid-sentence leaving a space before the punctuation), so a pool that
  can come up empty for some speaker fails there. Combine conditions
  with `both` (it adds `needs`/`lacks` up; it never replaces them). Personality comes through
  the vars: a gang's own slang (`gangLexicon`, over the gang voice), a street name
  (`handleOf`, on its own stream: most gangers, a few others, corpos never; checked against
  the wiki so none is canon), what they want out of life (`dreamOf`, `dream<Kind>`, the
  `dream` topic and a `dream` fact), the `views` topic on the corps and the city, their age
  bracket, their home, their hangout, their boss and years at work, their district
  (`inWatson`…). Loosely-fitting lines can be `vague` (they give way to ones that say more).
  Nobody says the same thing twice running: a `Speaker`'s `recent` (what they said to the
  player lately, from the log, and what the player has said to anyone, `Game`'s
  `saidLately`) steers `pickFragment` clear of a line said lately (`saidIn`, whole or inside
  something longer, whatever numbers are in it) while anything else fits; narration (`Game`'s private `narration`, the
  shift moments) and a fight's beats (`fightLine`, against the last few beats) do the same.
  So a pool wants enough lines that the ones left still fit whoever's talking: three or more
  for any speaker, more for what comes up every time (greetings, the player's questions).
  The first time they talk to the player, or answer something else first, they say who they
  are (`LINES.introduce`), which is how the player learns a name from them. An aside
  (`tails`) comes only at the end of all they say: a memory brought up and the reply to a
  way in take none, and a way in that landed, with nothing more they'd bring up, is left at
  the reply (no brush-off after it). Someone who shares the speaker's given name is named in
  full in their news.
- Whether someone answers is `openness` (engine) with the numbers in `SOCIETY.openness`:
  stance, charisma level and traits against the cost of what's asked (`Asked`: a fact, a
  topic, or `chop`, a favor), less `openness.mask` while the player is masked, and moved by
  the `Moment` (`momentOf`: a drink in hand, a shift on, questions piling up past
  `grill.free` within `grill.minutes`, the gang they hate in the room, grief, the small
  hours, a drunk player; numbers in `openness.moment`). A no is written on their
  `Standing.refused`; asking again within the talk cooldown is pressing and costs rapport;
  `Standing.lastAskAt`/`sitting` count questions in a row. Anything new the player can want
  from someone gets a cost there.
- People like and dislike things (`SOCIETY.reactions`, evaluated by `reactionTo` with
  `fits`): each `Reaction` that fits adds its `by` (two rapport a point, 0.4 openness) and the
  strongest says why. `asked` is per question (a stranger put off by being asked where they
  live, a ganger glad to run down rivals; glad of a question counts only when they answer it,
  and not when it's asked again, while being put off by it always counts); `approach` is per way of starting a chat
  (`Approach`: chat, compliment, joke, gossip, care, flirt; `Game.talk(id, now, approach)`, with
  `LINES.approaches` for the player's line and the liked/flat/disliked reply). The
  speaker's `touchy`/`keen` vars let answers show it. A new thing to react to is another list
  there and a pool of lines.
- After every exchange (`talk`, `ask`, `askFact`, `gift`, `insult`, `rob`, `chop`,
  `askForWork`, `quit`, `askOut`, `date`, `makeOfficial`, `endRomance`) `Game`'s private `noteFeedback` writes a `note` on the record (a
  `LogEntry` with `who: 'note'` and a `tone`): the reasons (`LINES.notes`, a reaction's
  why), rapport and grudge moved, charisma XP or the level, and the stance if it changed,
  from a `snapshot` taken before. Anything new done with a person takes a snapshot first and
  notes after.
- A mask (`Game.masked()`) changes three things, all through what's already there. An
  incident done masked is written with its `mask` (the garment kind), `pinned: false` and
  `where` (the scene: spot, hour and mask, from `Game`'s private `scene()`), and
  `applyIncident` runs no cascade for it; `Game`'s private `recognize(now)` (from `tick`,
  `enter`, `look` and `wear`, once per scene) has the victim or a witness who is here, at
  another scene, see the mask and `pinIncident` it, which runs the cascade then. `rob` and
  `insult` keep their own standing changes to the bare face (the victim's `robbedAt` is set
  either way). `barred(now)` refuses a mask at any counter (a kitchen, a rack, a bank: the
  `masked.barred` lines), and `attitude` takes `masked` for `SOCIETY.mask.turf` against the
  player with anyone in a gang. The speaker's `vars.mask` is the word for it, so lines fit
  with `needs`/`lacks: ['mask']` (`masked.recognized`, the greetings, the robbery lines).
- The people have days of their own (`src/engine/life.ts`, numbers in `src/data/life.ts`):
  `liveUntil` lives each clock day since the last one lived (at most `catchUpDays`), rolling
  a few `LifeEvent`s per district from the seed and the day (a `shakedown`, a `robbery`, a
  `fight`; `romance`, a `wedding`, a `breakup`; `friends` made, a `fallout`, a `makeup`;
  `hired` and `laidOff` by the storefronts' books; a `death`, in a fight between crews or of
  old age; a gang `joined` in a dead member's place) and changing the people as it goes:
  eddies, `hates`, ties (one tie a pair, changed only through `setTie`: `broken` writes off
  a pair's ties from the start, `made` is what they are now), jobs (`LifeState.jobs`, with
  `Person.hiredOn`, so `bossOf` never makes a hire the boss), gangs, what's on someone's
  chip (`LifeState.chips`: a robbery takes the eddies and the chip off the victim for good),
  `Person.hurtUntil`
  (laid up in a bed at the hospital nearest home in `whereIs`, `hospitalOf`, or at home in a
  city with none; `peopleAt` looks at the ward for them too) and `Person.diedOn` (the dead are nowhere, never live a day
  or spend a cent, and anyone dead who meant to come collect never comes; someone who dies in
  the day's fight is out of the rest of that day, and the dead feel nothing of an incident).
  Old events are forgotten day by day, so days caught up on at once come out as they would
  have one at a time (the life test checks a month). The changes are
  the `LifeState` saved as `life`; `applyLife` puts them back onto a population made fresh
  for the seed, so `generatePeople` stays pure and a save brings the same people back.
  `Game` lives the days in `start` and `tick` (`live`), emitting `societyChanged` when
  anything happened. `newsFor(person)` is what someone would bring up (the freshest thing
  that was theirs, a relative's, their gang's doing, or their district's; `LIFE.lasting`
  keeps a death or a wedding in mind longer); `Game.talk` puts it in the speaker's vars
  (`news`, `newsShakedown`…, `newsMine`/`newsKin`/`newsOurs`/`newsHeard`, `newsWho`,
  `newsWith` the other one in it, `newsGang` the gang's name, `newsWord`, `newsAgo`,
  `newsTook`, `newsWon`, `newsHurt`, `newsKilled`) for the `news` topic, whose lines in
  `src/data/dialogue.ts` fit by kind and role; telling it is an introduction to whoever it
  was about, and teaches the player the tie as it is now (or the death). Asked about someone
  dead, their people say so (`LINES.ask.dead`); about an ex, they're done with them
  (`LINES.ask.ex`). `scenesAt` pairs the people at a spot by their ties
  (and a ganger on their turf with the help, who gets the `leanedOn` side of it, rivals with
  each other) with a phrase from
  `LIFE.scenes`, drawn for the place, the day and the three-hour block; it's `Presence.scene`,
  and the People overlay says "eating Wontons · arguing with a woman in Mox colors". A new
  kind of thing that can happen between people is another `LifeKind` with a chance, a roll
  in `liveDay`, and news lines for every side it can be told from (the dialogue sweep checks).
- The eddies move too (`src/engine/economy.ts`, numbers in `src/data/economy.ts`, under
  `LIFE.economy`): `economyDay` runs first in every lived day. Each person pays a day's
  living (a share of what they started with, plus a little of what they hold) and, some
  evenings, an outing at their hangout at its tier's price, which lands in that storefront's
  till; on payday (Friday) everyone draws a week's money (`wageOf`: a share of what they
  started with, so a robbery yields what it did), a gang's members half from rackets and the
  rest from the gang's treasury, which keeps `chestWeeks` of its wages after payday and spends
  the rest. Every storefront takes a day's walk-in trade (drawn once per
  place, swinging daily) plus what the player bought there (`Till.pending`, from `Game.buy`),
  and pays rent, its staff (`staffCostOf`, the boss more) and the gangs' cut (`turfFrom` the
  people data's turf, by share). A till keeps a week of nets; `healthOf` reads it as
  thriving, steady or struggling once a week is on the books, which `Game.trade(building)`
  gives the UI (the line inside, the status row), scales the player's shift pay
  (`economy.pay`) and makes a struggling boss refuse to hire (`LINES.work.broke`). The
  speaker's vars `broke`/`flush` (against what they started with) and `slow`/`brisk` (their
  workplace's books) fit money talk with `needs`. The tills and treasuries are part of the
  `life` save. Anything new that moves eddies between people and places goes in
  `economyDay`; anything that reads them goes through `Game.trade` or the vars.
- Gangs are canon (wiki): keep their turf, looks and rivalries true to it. Names are made
  up in each community's style and must never be a real character's: `tests/people.test.ts`
  puts every given name of a community's pool with every family name of it against the
  wiki's character pages (`tests/fixtures/canon-characters.txt`, the titles of its 2077,
  Edgerunners, comic, fixer and vendor categories), and checks the pools are big enough for
  a city: nobody needs a number to tell them apart. Grow a pool when a city grows, knowing
  that any change to a pool renames everyone (names are picks from it, and ids are names), so
  saved people no longer match: it needs `GENERATOR_VERSION` bumped like a change to the city,
  for saves to start over rather than lose their people quietly.
- People have hearts and the player can win one (`src/engine/romance.ts`, numbers in
  `SOCIETY.romance`). `heartOf(person)` (people.ts, on its own stream, from `PEOPLE.hearts`)
  is whom they're drawn to by pronouns (none at all for a few; a spouse always), the way in
  that wins them over (`wants`, one of the chat approaches) and the look they go for (a
  `Style`, or none); `varsFor` puts it in `typeWho`/`TypeWho`/`typeNone`, `typeWants`,
  `typeStyle` and `wants<Way>`, and the `type` question asks it (the `type` fact, on the
  card as `typeLine`). The player's own pronouns are `Game.you` (saved as `you`, set in
  Settings with `setPronouns`, the `youChanged` event; old saves go by they). `Game`'s
  private `heartVars` adds to the speaker `drawn` (never for anyone under `adultAt`),
  `taken`/`takenWord` (their spouse or partner, alive), `withYou`, `together`, `sweet`
  (`sweetAt` spark) and `yourType` (the style most of the player's clothes are in). How
  taken someone is with the player is `Standing.spark` (fading by `fadePerDay`, through
  `changeStanding` like the rest): a flirt that lands with someone drawn to the player and
  free is `flirt` a point of reaction (one that doesn't costs `miss`), the way in they want
  `wants`, their favorite as a gift `gift`; the note says `♥ +n`. Who the player is seeing
  is `SocietyState.romance` (`Romance`: who, `dating` or `together`, since, dates, the last
  date, the times they've `caught` the player this time round). `Game.romanceWith(id, now)` is
  what the card's ♥ offers (`RomanceMove`); `askOut` (a yes takes `drawn`, free, warm or
  better, `ask.spark` and `ask.rapport`; pressing like any ask, but a no to a mask isn't
  written down), `date` (an evening by `date.from`/`to`, somewhere with a food menu that
  would serve the player, not at their work, once a night by the clock (the small hours
  count as the evening before), paying for two of their favorite if it's on, else the
  cheapest drink),
  `makeOfficial` (`official.dates` and `official.spark`) and `endRomance` (the `dumped`
  numbers, with their people by closeness). Flirting in front of the one the player is seeing
  is `jealous` (a `cheated` memory, and `caught` once more; not while they're asleep); they
  end it themselves (`theyEndIt`, on the next talk, date or ask to make it official, whenever
  they're awake) when the spark is under `endAt`, they've turned hostile, or they've caught
  the player `cheats` times (`LINES.romance.theyEnd`, `fizzled`/`caught`), and the spark goes
  with it. Date memories are lines for while it lasts (`withYou`) and for after. One at a time: `liveUntil` takes the player's partner as `spokenFor`,
  so life never pairs them off, and pairs only people drawn to each other; a partner who dies
  ends it. Lines are `LINES.romance`, `LINES.approaches.flirt`, `LINES.you.askOut`/`date`/
  `official`/`endIt`, and memory lines for `date`, `dumped` and `cheated`.
- `src/ui/people.ts` is the overlay (a `MapOverlay` off the panel's **People** action); the
  game decides who is here and what the actions do. Its list has two tabs (`PeopleTab`):
  **Here**, and **Known**, everyone the player has met or knows by name, the latest dealt
  with first (`Game.acquaintances`), any of them opening their card here or not. A person's
  card is deliberately spare: a header with one line of what's known; two tabs (`CardTab`),
  **Talk**, the transcript (your lines after a `›`, theirs bare, the notes small and colored
  by tone), and **Profile**, in the transcript's place (the facts line opens it too): how they
  stand (stance, rapport, ♥, grudge), how often you've talked, each fact known as a label and
  a value (`profileOf` in `main.ts`), what's still unknown, what they remember of the player
  (`Game.between`, a few words a memory) and their web; one command row (Talk, which unfolds the ways in, Ask, Give,
  Chop, Work, ♥ for the heart's moves, `⋯` for the hostile acts (insult, rob, attack), each only when it can be
  done; ♥ shows on the card of the one the player is seeing even when they're not here, to
  end it by message)
  whose choices (`Picker`) unfold only while open; keep new things to do with a person
  behind a command, not as another row, and new things to know on the Profile tab. Lines
  a person says use the `talk` tone, which the feed skips while the card is open.

## Fighting

Fights are simultaneous exchanges: each beat, the player and whoever they're fighting pick a
move at once and both land together, the player against the clock:

- `src/engine/combat.ts` is the engine, pure: `resolveBeat(state, yours, theirs, ctx)` moves
  first (a step in or out, a run), then cover and reloads, then the attacks at the range left,
  then the player's quickhack, then a knockout, then whatever burns; `theirMove` is what someone does (a blade
  closes in, a gun finds its range or ducks to reload, the scared run or back down when it
  turns on them), `talkOdds` the odds of talking them down, `hitChance`/`damageOf` the dice.
  The moves are `Move`: attack, advance (close in), back (off), cover, hack, heal (a med:
  `ctx.med`, before what lands that beat; a dose with `regen` gives more each beat after),
  talk, run, and freeze (the clock ran out). Ranges are `reach`, `close`, `far` (indoors, no further than
  close). The numbers are `COMBAT` in `src/data/combat.ts`: every `FightClass` (each weapon
  class, fists, and the chrome in an arm) with its odds at each range, its damage, rounds a
  go and how often a downing blow kills (`lethal`, kept low: most people downed live); the
  clock (`window`), cover, armor's `soak`, escape and talk odds.
- The player fights to wound unless they've said to kill (`Game.lethal`, `setLethal`, saved
  as `lethal`, the button on the fight's strip): aiming to wound, nobody dies of it and guns,
  blades and wire hit for `nonLethal` of what they would (`Edge.wound`); fighting to kill, a
  downing blow kills by its class's `lethal`, a quickhack's by `hackLethal`.
- `Game.attack(id, now)` goes for someone here (from the `⋯` on their card): it's an `assault`
  incident at once (the cascade, the mask, witnesses add heat), and a fight in
  `Game`'s `fightState` until it's over. `Game.fightMove(move, now, hack?)` is a beat, their
  move drawn when it began; `Game.tick` freezes the player past the `deadline`. While it's on,
  `go`, `enter` and `leave` refuse, and the UI lets nothing else be done. `Game.fightView()`
  is everything the overlay shows (both sides, the range, the clock, the log a beat to an
  entry, the moves there are); `leaveFight()` drops one that's over. The event is
  `fightChanged`. Fights aren't saved: one in progress when the game closes is gone.
- What each side fights with: the player, whatever's best for the range of what they carry
  and have fitted (`yourFighter`: a loaded gun, chrome in the arms, a blade, then fists, which
  lose a tie), its rounds in the gun item and reloads out of their pockets; the other side,
  `Game.armOf(person)`, drawn on their own stream by gang, a guard's job, a corpo's, or the
  street (`COMBAT.carry`: weapon ids, arm implants, or `fists`; most people carry nothing),
  with `spareMags`, their health from `COMBAT.people` and armor from `COMBAT.armor`.
- Chrome in a fight is `COMBAT.chrome` by implant id: armor (the wiki's number at its first
  tier), health, `window` (a Kerenzikov; a Sandevistan by how much its page says it slows the
  world; `below` for only when hurt), aim, melee, guard, evade on the first beat (optical
  camo), a Smart Link for smart guns (without one they track worse), a Second Heart's revive,
  a deck's RAM (`deck`) and the frontal cortex's (`ram`), and `arm` for chrome that fights;
  `COMBAT.systems` is what a whole kind of operating system does (a Sandevistan's aim, a
  Berserk's guard in a melee). Drink takes the aim off.
- How it ends (`FightOutcome`): them down (`killed` by the odds of what dropped them,
  written to `LifeState.dead` and `diedOn` with a `murder` incident and heat; `trauma` for a
  corpo, whose Trauma Team gets them out alive, with heat; else `won`, laid up for
  `hurtDays` in `LifeState.hurt`, in the hospital nearest home, which the result names), the
  player down (`lost`: robbed of some cash, left at 1; on a Trauma Team plan, picked up
  instead, see Medicine), someone knocked out cold (`out`, `knocked`; below),
  `fled` (out of the building), `escaped`, or `talked`. A Second Heart gets the player up once.
- Knockouts: a blow from fists or anything blunt (`COMBAT.knockout.kinds`, the wiki's blunt
  weapons being its non-lethal ones) that leaves someone standing can knock them out cold,
  by `knockoutOdds`: its share of their health past `least`, more the more worn down they
  are, times the attacker's `Edge.ko` and the target's `Edge.steady`, capped at `most`;
  `resolveBeat` says who in `out` (the player's blow first). Them out (`out`): not hurt, not
  dead, they lie where they fell for `knockout.minutes` (`Game`'s `outColdState`, not
  saved), listed by `peopleHere` as "out cold" wherever their day would have them, past
  talking to (`Game.outCold`; `isHere` refuses them, the card shows no commands). The player
  out (`knocked`): robbed like `lost`, but their health is what it was, and no Trauma Team
  comes for it. How steady someone is is `COMBAT.steady` (the brave and gangers steadier).
- The fighting skills grow with use (`COMBAT.skills`, `SkillRules` in `src/data/skills.ts`;
  the XP is `COMBAT.training`, trained by `Game`'s private `trainFrom` after every beat):
  Street Brawler (the wiki's 2077 skill for fists and blunt weapons), for every blow the
  player lands with fists or Gorilla Arms (a club less) and more for a knockout, adds its
  bonus to their melee damage, a quarter of it to their aim, and all of it to `ko`;
  Toughness (ours), for every blow taken (more for fists and clubs) and for every fight
  walked away from, divides the player's `steady`. Both are `Game.brawler()`/`toughness()`,
  saved as `brawler` and `toughness`, the `skillChanged` event, and rows in the status
  drop-down.
  Every line is `COMBAT.lines`, by what happened, filled with `fightVars` (who, their
  pronouns and the verbs that go with them, the arms on both sides); a named subject takes
  the singular verb, so `{s}`/`{es}`/`{ies}`/`{is}`/`{has}` only follow `{he}`. A tell
  (`tell<Move>`) shows their next move by the odds in `COMBAT.tell`, better knowing their
  nature. A new move, outcome or effect is another pool of lines, which the combat test
  checks for.
- The player's health (`Game.health(now)`, back on the clock by `COMBAT.health`) and NCPD
  heat (`Game.heat(now)`, stars, cooling by `COMBAT.heat`) are saved as `health` and `heat`
  (`Meter`); they show in the status drop-down (and HP and stars on its line when there's
  any). Heat does nothing yet: when the NCPD comes looking, it's read from there.
- `src/ui/fight.ts` is the overlay: both health bars, the range and beat on the strip, the
  log, the tell, the clock, the moves (Hack opens the quickhacks) and the kill-or-wound
  button. It can't be closed while the fight is on, and the header's buttons and the keys
  rest.

## Medicine

Hospitals, street clinics, ripperdocs and pharmacies patch the player up; Trauma Team picks
them up:

- `src/engine/medical.ts` has the shapes (`MedKind`, `MedicalStock`, `CoveragePlan`,
  `Coverage`), `src/data/medical.ts` the content (`MEDICAL`, on `GEAR.medical`): the meds,
  what each counter does by business id or kind of place (`stores`: a pharmacy has meds, a
  street clinic meds and treatment, a hospital those and Trauma Team's plans, a ripperdoc
  treatment), the fee a point of health (`perPoint`), the plans and the counters' blurbs.
- `Game.medical()` is the counter here; its part of `Game`'s rack (listed first) is
  treatment (`TREATMENT`: what's missing of `Game.health(now)`, priced by the point and the
  place's tier, only while the player is hurt), the meds priced like a dish, and the plans at
  their price. Treatment and plans are services: no pocket. `Game.menu(now)`, `affords` and
  `canBuy` take the clock for it.
- Trauma Team's plans are its 2077 premium packages (Silver, Gold, Platinum; what each does
  and costs is ours): `Game.covered(now)` is the one the player is on (the
  `coverageChanged` event), saved as `coverage`. The same plan bought again runs on from when
  it ends; another starts now in its place. Going down in a fight on one (`pickedUp`), nobody
  robs the player: they're put back to the plan's `restore` share of their health, carried
  (`carryTo`) inside the nearest hospital, and billed its `copay` share of the hospital's fee
  for that (from the account, else cash); short of it, Trauma Team takes the account and
  drops them from the plan. A plan's `medsOff` comes off the meds on the rack.
- The rack's buttons say Treat, Sign up or Renew; the inventory says Use for a med; the
  status drop-down has a Trauma Team row.

## Work

Every storefront hires; the player holds up to two jobs, a day job and a side gig on hours
that don't clash, and climbs a ladder of rungs at each:

- `src/engine/jobs.ts` is the engine: `bossOf(building, population)` (the worker whose role
  says they run it, else the first one; every storefront has exactly one), `bossAt(person)`
  (the hiring storefront they run, if any), `lineOf`/`ladderFor(building)` (a `Ladder` by
  business id, else by category, from `JOBS.ladders`: its `hours` and `rungs`),
  `rungOf`/`nextRung`/`canPromote` (trust against the next rung's `at`, and the boss's stance
  in `promoteAt`), `shiftOpen(hour, hours)` and `shiftDay(clock, hours)` (a night shift's
  small hours count as the day it started), `overnight`, `overlaps` (two jobs' hours),
  `startOf` (where a new job starts: `JOBS.experience` of the shifts worked in its line and
  a `reference`, short of the top rung) and `shiftPay(rung, quality)`. The numbers (rungs,
  pay, energy, hours, the `roster` a new job starts with, tiers, trust and rapport per shift,
  `quit` and `notice`, `noShow`, `raise`, `moonlight`) are in `src/data/jobs.ts`; a new kind
  of place that hires is another ladder there, keyed by business id or category (the jobs
  test wants one for every category with a business).
- `Game` keeps the jobs (`JobState`: building, rung, trust, shifts, the shift day of the
  last shift, and its `days`, `owed`, `raise`, `missed`, `checked`, `paidOn`, `heard`; saved
  as `jobs`, the main one also as `job` for older builds, dropped when the building is gone
  or no longer hires) and the shifts worked in each line (`career`, saved). The main job is
  `jobs[0]`, a side gig after it. `Game.jobsStatus(now)` is where each stands (rung, next,
  pay, `side`, `hours`, `days`, `owed`, `here`, `open`, `blocked`: away, off, done today, or
  closed); `Game.jobStatus(now)` is the one here, else the main one. `Game.workWith(id)` says
  what a person's card offers (`hire`; `switch` when taking it means handing one in, its
  hours clashing or no room for another, `switchingFrom` naming it; `quit` for a boss of
  the player's); `Game.askForWork(id, now)` is an ask like any other (`openness` with the
  `hire` cost, pressing, the mask's own refusal, a boss with `quit` or `fired` on their mind),
  and a yes hands in the job it displaces (`notice`, a memory of its own) with a word from
  its boss if they liked the player. `Game.work(now)` is a shift at the job here on a
  rostered day in its hours (energy through `spendEnergy`, its pay onto `owed`, trust,
  `JOBS.rapport` with the boss and `JOBS.rep` with the place, a shift more in `career`, the
  boss's line if they're about, the promotion when `canPromote`, and the main boss hearing
  of a side gig, which a loyal one minds). `Game.setRoster(bossId, days, now)` sets the days;
  `Game.quit(now, bossId?)` walks out. Every way a job ends goes through `Game`'s private
  `leaveJob` (`quit`, `notice` or `fired`), which pays out what's owed (`payOut`: into the account, out of
  the place's till). The private `punchClock(now)` (from `start` and `tick`)
  goes over the days since each job was last checked: a rostered day with no shift costs
  trust and rapport, `noShow.fireAfter` in a row and the player's let go; on payday's morning
  (`LIFE.economy.payday`) what's owed is paid from the till, with a raise for a week worked
  at a thriving place. `checkFired(now)` lets the player go from every job at a place that
  bars them (called after a robbery or an insult lands). Everything said comes from
  `LINES.work` (`hire`, with `experienced` and `referee` in the vars, `notice`,
  `moonlight`/`sideGig` with `{gig}`) and `LINES.you.work`/`quit`/`notice`, with `{title}`,
  `{work}` and `{pay}` in the speaker's vars; the event is `jobChanged`.
- Perks (`JOBS.perks`, `PerkRules`): the player's own counter is at the staff price
  (`Game.menu()` through the private `staffPriced`, everything but Trauma Team's plans, the
  menu's `staff` share for the shop's strip); a shift where the line of work has a meal
  (`perks.meal`: food at an eatery, a drink at a bar) puts the cheapest of that kind on the
  menu into a pocket (`staffMeal`, told on the shift's own line); from `perks.uniform`'s rung
  a clothing store hands over its uniform once (`staffUniform`: a top off its rack, never a
  mask, the same for everyone there, `JobState.uniform`); from `perks.keys` the counter is
  open to the player whoever's in (`counterOpen`). `JobStatus.perks` says them for the status.
- Shift moments (`JOBS.events`, `ShiftEventRules`): after a shift, `events.chance` of the
  time, one of what could happen there by `weights` and `where` (the lines of work each
  comes up in): a `rush`; a `shoplifter` (a customer here, else someone from the district
  out and about, nowhere in particular); someone from the gang whose turf it is come for the
  `cut` (`turfFrom`, a member here first); a coworker here asking for `cover`. It waits in
  `Game`'s private `shiftEventState` (not saved; leaving lets it pass) and is
  `Game.shiftEvent(now)` (its text, its two `ShiftChoice`s, who's in it), answered by
  `Game.answerShift(choice, now)`: tips (cash through `walletRoom`/`changeRoom`, the rest on
  the pay), trust, rep with the place and the gang, rapport and grudges with the real people
  in it (a note on their card), half a shift more for cover, the till's loss for a thief let
  go. The narration is `events.lines` (`{who}`, `{work}`, `{gang}`, `{tips}`, `{pay}`; the
  jobs test wants every turn's pool); what people say is `LINES.work.coverAsk`/`coverThanks`/
  `coverSnub`, `cutDemand`/`cutPaid`/`cutBack`/`cutWorse`, `caught` and the boss's `stood`. A
  new moment is another `ShiftEventKind` with its numbers, its choices in `shiftEvent`, its
  turn in `answerShift` and its lines.
- The UI: a boss's card gets a **Work** command (`Picker` `work`): `Ask for work` (with
  "Means notice at …" over it for a switch), or for the player's own boss the days of the
  week as toggles (`data-day`, `onRoster`) and `Quit`; the panel inside the workplace gets a
  **Work** action (`ActionId` `work`) whose subtitle is the pay and energy, or why not now,
  and while a shift's moment waits, the panel is it ("On shift", its text, its two choices as
  `pick-1`/`pick-2`);
  the status drop-down has a row per job, **Work** and **Side gig**. The map carries a work
  pin on each workplace (`CityMap.setWork`, from `showStatus`), lit while a shift there is
  open; tapping it picks the building like a block, and again goes. The line under the energy
  bar says "Shift on · N min" (the planned walk, `walkTo`, cached per spot) while one is open
  elsewhere. People's troubles to help with are not here yet: when they are, they hang off
  the same card, behind a command.

## Inebriation

Drinking alcohol makes the player drunk; nothing else happens yet:

- `src/engine/inebriation.ts` keeps the units of drink in the player, clearing on the clock
  (same test speed as everything), with stages by units; `src/data/inebriation.ts` has the
  rate, the stages and their lines, and each alcoholic dish's `alcohol` units are on the
  dish in `src/data/food.ts` (a beer about 1, spirits 2–3). `Game.inebriation(now)` is where
  it stands; `Game.tick(now)` says a line as each stage eases off. It's saved as
  `inebriation`.
- The only effect is the screen: `ScreenFx.setInebriation(severity)` sets `--drunk` on
  `#app` and the stylesheet blurs and sways it. Effects that need the stage (walking
  crooked, slurred text, passing out) go in `Game` off the status.

## Energy

Energy is in place, with nothing spending it yet:

- The rules are in `src/engine/energy.ts` (refilling on the clock, spending, experience,
  levels); the numbers are in `src/data/energy.ts`. It starts very low and levels very slowly
  on purpose: keep it a long grind.
- Anything that costs energy calls `Game.spendEnergy(amount, now)`, which says false (and
  tells the player) when there isn't enough, and does the training: experience, the bonus
  for running down to empty, level-ups. `Game.energy(now)` is where it stands. It's saved.
- A home with a bed adds `ENERGY.bed` to the max. There are no homes yet: when there are,
  set `Game`'s `home` (and save it).

## Food

Eateries sell food, into the inventory (eating it comes later):

- `src/engine/food.ts` builds a `Menu` for a building or place (`menuFor`); `Game.menu()` is
  the one where the player is (inside a food storefront, or at a place whose kind has a
  kitchen) and `Game.buy(id)` buys off it. A venue's `quality` (luxury, everyday, poverty) is
  drawn from its district's `dining` weights, fixed for chains and named eateries, and sets
  the prices and what's on; the draws use their own RNG streams, so menus never change the
  city. New things to do with food (eating, energy) go in `Game`.
- `src/data/food.ts` is the content: every dish is a real 2077 product or dish from the wiki
  (its "Cyberpunk 2077 Food", "Drinks" and "Alcohol" lists and the vendor store pages), with
  our own notes and prices; `kitchens` are per business id and place kind; `fixed` menus are
  per chain business id or landmark name. Chains and named eateries are landmarks with a
  `business` in `src/data/city.ts`.
- `src/ui/shop.ts` is the menu overlay (a `MapOverlay` opened from the panel's **Menu**, or
  **Shop** at a store with a rack of gear).

## The header and the status drop-down

The sign (`src/ui/hud.ts`) says where the player is and shrinks its letters to fit a long
name; the address above it says the neighborhood and the district, most particular first like
a host name (`NCNET://kabuki.watson`, so a long one loses the district to the ellipsis), and
the clock only the time of day.
Nothing else on the screen repeats them: the panel's kicker says what's here ("You are
here · Restaurant", "Inside · Block G1"), never the district, and has no title inside a
building or at a place (the target view keeps its own, with the district, since it's
elsewhere). The energy bar has no words: one line under it (`src/ui/status.ts`, filled by
`showStatus` in `main.ts` on every tick) says the figure, the level, when the next point
comes, and anything the matter (drunk, masked, a shift on elsewhere and the walk there, else the job's rung); tapping it unfolds
everything else about the player: experience, charisma, the fighting skills, eddies and the bank, the pass, the
job, the condition, the mask, every reputation, the map count, the weather, the date, and
last the **Settings** link (the drop-down's `foot`, which `StatusPanel.render` keeps at the
bottom). Anything new the player should know about themselves goes in there as a row, not
on the header, the map's head (the save light and the one button: the inventory, with the
cash on it) or the People overlay's strip (only what people here can see: the mask). The
map has no footer; it zooms by pinch, scroll or a tap on a block, and its only button, the
one that finds the player (`CityMap`'s `updateControls`), shows while they're off the
screen. Where the player works is a pin on the map, not a button (see Work). Buttons go away when they can, not into a corner.

## The panel under the map

`.place` has one fixed height per layout (`src/style.css`), so the map stage never resizes
as its text changes or types out: anything longer scrolls inside `.place-text`. Keep it that
way when adding to the panel; the map re-renders (and re-clamps its camera) on every resize.
Inside a building, leaving is the panel's corner button (`closable` with a `closeLabel`), so
the action row keeps to three buttons at most and their words fit a phone.

## Overlays

Every overlay (`MapOverlay` in `src/ui/overlay.ts`: inventory, settings, people, menu) lies
over the map and the panel under it, which are `inert` while it's open (`MapOverlay.behind`),
and its header is one `.overlay-strip`: what it is, a
count or a detail, and the close. Don't put the place's name or district in one; the sign
above has it. Phone taps need room: chips and commands are at least 36px tall, and the
panel's buttons share their row (`flex: 1`) with one-line labels, so keep subtitles short.

## Settings

`src/ui/settings.ts` is the settings overlay: **You** (the pronouns the player goes by, three
choices, `onPronouns`), then the save: restart this city, or erase the save and start a new
one, each asking first. New options go in it as their own groups. Opened from the foot of the
status drop-down, it hands focus back to the drop-down's toggle. A save that reads but won't
play starts the same city over (`boot` in `main.ts`), and `readSave` drops any record inside
a save that isn't one, rather than trip over it.

## Checks before a PR

```bash
npm test           # unit tests, including checks on hundreds of generated cities
npm run typecheck
npm run build
```

- When a change makes seeds build different places (new content counts), bump
  `GENERATOR_VERSION` in `src/engine/generate.ts` and add the new fingerprint in
  `tests/save.test.ts`. The fingerprint test fails as a reminder.
- Saves also point at buildings, so `tests/save.test.ts` pins every building's id, kind,
  footprint and height. A building's name, category and business can change freely (each
  part of a name takes one random draw); moving or resizing buildings needs the same bump.
- `TRAVEL.timeScale` in `src/data/travel.ts` is 60 while testing; 1 is real time.
- Two builds live on GitHub Pages: the stable release at the root
  (https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/, from `main`) and the beta under `/beta/`
  (from `beta`, built with `CHANNEL=beta`: its own save key, "Beta build" in Settings). Pull
  requests go to `beta`; a push to either branch rebuilds both and deploys. A release is `beta`
  merged into `main`, then the **Release** workflow run with the version (bump `version` in
  `package.json` with it): it tags `main` `vX.Y.Z` and publishes a GitHub Release (only the
  workflow's token may push tags). `__CHANNEL__` and `__BUILD__` are the build-time defines.
