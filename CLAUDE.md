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
- A storefront's name: a chain's outlet goes by its sign (and its neighborhood when the
  template has `{area}`), a real one by its landmark, and every other one makes its own up
  (`ownName` in `src/engine/buildings.ts`, from `STOREFRONT_NAMES` in `src/data/storefronts.ts`,
  `BuildingContent.shopNames`): a word of a flavor its neighborhood names shops in (`where`,
  by neighborhood, else district: Japanese in Japantown, Cantonese in Little China, Kabuki's
  own East Asian and street mix, Spanish in Heywood and most of Santo Domingo, Kreyòl and
  French in Pacifica, the docks' and the plants' in Northside and the Arasaka Waterfront,
  glass and money downtown and up the hills), with a noun for what it sells (`kinds`, or the
  flavor's own tongue: "Izakaya Hotaru", "Farmacia La Paloma"), or, where the template has
  `{area}`, its neighborhood and a plain noun ("Kabuki Noodles", "Glen Diner"). Never longer
  than `SHOP_NAME`, a landmark's or a place's name, or another storefront's. The template,
  the neighborhood and the business are still drawn on the buildings' stream in the same
  draws as ever; the made-up part is drawn after them on the shop's own (`seed:shop:<id>`), so
  a name never moves a building or changes what it sells, and `24/7 ` stays on the names that
  had it (`allHours`). Every word is checked against the wiki like any name, and the lists it
  was checked against are in `tests/fixtures/canon-places.txt`; a new word goes through the
  same check.
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
- Rooms (`src/engine/rooms.ts`, the words and numbers in `src/data/rooms.ts`, `rules.rooms`):
  worked out from what a building is, never drawn into the city, so a room moves nothing and
  needs no generator bump. A storefront has the room you walk into (`main`, named for what it
  sells), a restroom and the back (staff only; a hospital a ward too), its ground floor only;
  a motel or a capsule hotel its numbered rooms on every floor; an apartment block or a
  megabuilding its lobby and floors of units (`hall:<floor>`, `unit:<floor>:<letter>`); a
  tower its lobby and office floors. `roomsOn`, `roomById`, `walkableFloors`. Who is in which
  room is `roomOf` (at home, their household's unit, `unitOf`; laid up, the ward; at work, the
  floor or now and then out back; anyone else the floor or now and then the restroom, drawn for
  the hour), and `Game.peopleHere` is only whoever is in the player's room, so a witness is
  someone in the same room. `Game.room()`, `roomsView` (what the overlay lists, with each
  room's `RoomAccess`), `goRoom`, `goFloor` and `knock` (someone home who likes the player, or
  is seeing them, lets them in; a stranger or a mask gets nothing) move the player, `roomChanged`
  the event; saved as `room` (a unit they were let into stays open to them). A counter (a menu,
  a rack, a bank, a ripperdoc's chair) is only in the room you walk into (`atCounter`). A motel's
  or a capsule hotel's desk rents a room for the night (`ROOM_FOR_THE_NIGHT`, `rooms.rent`, a
  service like treatment): `Game.rented(now)`, saved as `lodging`, the player's till noon and
  nobody else's. Without `rules.rooms` (the tests' rules leave it out) a building is one room,
  as it was. The panel shows the room under its kicker (`PanelView.room`), which opens the
  rooms overlay (`src/ui/rooms.ts`): this floor's rooms, a door to knock on, the stairs.
- `insideView` in `src/main.ts` is the panel inside. It has the building's `category` and
  `business` to decide what to show.
- Opening hours (`rules.hours`, `HOURS` in `src/data/hours.ts`): a storefront's counter (its
  menu, rack, bank or ripperdoc's chair) is open only while someone who works there is in
  (`Game`'s private `counterOpen`, by `whereIs` of its staff, kept per building until a day is
  lived), which its rota makes its opening hours (see People: `PEOPLE.shifts`), a 24/7's
  (`allHours`) round the clock; a hospital never closes, and a place of its own (a market, a
  stall) never does. Shut, `menu`, `bank` and `clinic` are null, `canBuy` says when it opens,
  and `Game.closed(now)` gives the panel what it would be and when someone's in again (its
  Closed action). A storefront is the whole building, so shut, it's locked:
  `Game.locked(building, now)` (and when someone's next in, `opensAgain`), `enter` refuses it,
  and `closingTime` (from `tick`) sees the player out when the last hand leaves (not mid-fight,
  detained or mid-moment); the player's own workplace isn't locked to them in their shift's
  hours or with its keys. `Game.hoursOf` is what the door says ("Open 11:00–23:00", "Open
  24/7"), on the street panel (Closed · Opens 11:00 instead of Go inside) and the target view.
  The tests' `RULES` leave `hours` out, so their counters are always open and nothing's
  locked; a test about hours passes `HOURS`.

## The inventory

Everything the player owns is in a pocket of something worn, but the chrome in them; food,
drink, meds, credchips, clothing, weapons, ammo, cyberware, quickhacks and valuables (junk taken
off people, for a fence: see Selling and fencing) are the items so far:

- An `Item` has a `kind` (`ItemKind`: weapon, ammo, attachment, cyberware, quickhack, clothing,
  consumable, shard, credchip, junk, component (the cutting agent, `GEAR.components`, by its id), after the wiki's 2077 item types plus the
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

- The people come in five draws, each on its own RNG stream, so the first (`seed:people`: the
  staff by `rolesFor`, `residents` per home, the gangs by their district weights) never
  changes and every save keeps the people it knows; the second (`seed:people:more`) fills
  the city out by `PEOPLE.more` (the chance of one more pair of hands per storefront, with a
  role from `roles.extra` by the building's category; residents `perHome`, more in a `tall`
  block and a `megabuilding`; the gangs again, by `gangs`); the third (`seed:people:crowd`,
  `PEOPLE.crowd`, the same shape) is the crowd that fills the homes, most of a city now
  (about four and a half thousand people in all, from four to five and a half thousand); the
  fourth (`seed:people:ncpd`, `PEOPLE.ncpd`) is the NCPD's officers, `perDistrict` in the
  districts it still polices, living there with no workplace (off duty, they keep a resident's
  day); the fifth (`seed:people:shifts`, `PEOPLE.shifts`) takes on the hands every
  storefront's shifts want (`leastStaff`: `perShift` a shift), living in its district.
  Make a city bigger or smaller with the crowd's numbers, or another draw on a new stream,
  never by changing an earlier one (`tests/people.test.ts` checks the first two come out the
  same with the crowd as without it, the first three with the officers as without them, and
  the first four with the hands as without them). Families, ties and hangouts are made within a
  draw; coworkers, crews and bios over everyone at the end, except that the crowd and the hands
  each know only `crowdKnows` of the people they work with (each on a stream of its own), not a
  whole tower.
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
  (`Clock`: hour, weekday, day; the phone's local time, or `rules.clock` in tests). A
  storefront's hands keep its rota (`PEOPLE.shifts`, `ShiftContent`): its opening hours by
  category, a business's own over them (`shiftsOf`: split in two past `split` hours, a place
  that never closes in the three of `round`), each hand on a shift of their own (a night
  hand on the last, a day hand on the first, the rest as even as they go), off `daysOff` days
  a week in turn with the others on it (one alone on a shift takes one), the laid up and the
  dead skipped day by day and a shift left empty covered by someone off; a shift that runs
  into the small hours is slept off for eight hours after, and the rest of their time is as on
  anyone's day off. A rota (`seatRota`, `rotaStaff`; kept by person, off the `Person`) is made
  at the end of `generatePeople`, by `Game` after `applyLife`, and by `liveDay` after a hire or
  a layoff (everyone who works there, the dead too, as a save's are); a place short of its
  hands hires first, and none lays one off below them. Night work off a rota (a warehouse's
  watch; in a city made without shifts, a bar, a club, the night desk and half a 24/7's hands)
  is `worksNights`, six till three. A storefront someone hangs out at is somewhere to be only
  while it's open (`openAt`), so its regulars aren't in a shut place. Nobody is placed on the streets, only
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
  of a tie, keyed `a|b`; `kind` null for "connected somehow", `'none'` for "they'd never
  heard of them", in an older save that could ask). The UI shows a person only through `Game.describe` (name
  or their look, and the facts known), `standingWith` (web) and `conversation`, never the
  `Person` or the population's ties directly; new ways of finding things out go through
  `learnOf`, `learnFact` and `learnLink` (`Game.look` for what's plain to see, the topics
  in `talk` and `Game.askFact`), and everything said goes through `logLine`. The Ask picker
  asks someone about themselves only: there's no asking one person about another (it went,
  as more odd than useful; the web fills from being seen together, names dropped and the
  news). Someone's sex is plain to see from the first look (`sexOf` in people.ts: a woman's
  female, a man's male, someone who goes by they either, on its own stream; `Description.sex`,
  the Profile's Sex row). A tie that has changed since (told of a couple, a wedding, a split, a falling out or a
  making up) is `relearnLink`, which replaces what the player knew.
- People remember what the player did, thing by thing (`src/engine/memory.ts`): a `Memory`
  is a `kind` (`MemoryKind`: wronged, heard, saw, settled, gift, goodWord, hired, promoted,
  quit, notice, fired, chopped, date, dumped, cheated; chat and rebuffed, a way into a chat
  they liked or didn't, `what` the way; covered, a shift the player covered for them; backed,
  a fight they threw in on the player's side; `MEMORY_KINDS`, which a save is read
  by, so a kind the game drops is forgotten), when, `about` whom, `what`, an `amount`, how many `times` and
  how often it's been `said`, kept per person in `SocietyState.memories` (saved under
  `society`), with the numbers in `SOCIETY.memory` (days each kind lasts, its weight, how
  often it's brought up, the `cap`). They remember on the calendar (`memory.clock`, 1: the
  people's days, whatever the streets' test speed), and so do their grudges, their spark and
  the reputations (`standingOf` and `repOf` drift by it); `deep` makes what was done last
  longer and weigh more (a robbery half again, a beating twice, a killing heard of eight
  times), and every time it happens again, half again (`memoryAge`, `lasts`). The incident cascade writes what was done, seen and
  heard (from `heardAt` grudge up); `Game`'s private `remember` writes the rest (gifts, a
  good word through `passGoodWord` to the people closest to whoever got one, work, chops,
  dates, someone collecting, a way into a chat that landed or didn't (never a plain chat),
  covering a shift, throwing in on a fight). `Game.talk` brings up `recall`'s pick (`memory.recall` of
  the time) from `LINES.memory`, filled by `memoryVars` (`mem`, `mem<Kind>`, `memWho`,
  `memWord`, `memAgo` (to "months back"), `memTook`, `memItem`, `memTwice`, `memRobbery`,
  `memInsult`, `memAssault`, `memMurder`, `memJoke`… for the way in, `memPlace`…); a grievance (`GRIEVANCES`) is all
  they say. What memory changes goes through it too: a boss with `quit` or `fired` on their
  mind turns the player away (`LINES.work.rehire`), a gift had before is `again`; and all
  of it adds up to their `regard` of the player (what counts for them on their mind, less
  what they hold against them, by strength, over `memory.regard`, -1 to 1; `Game`'s private
  `regardOf`), which moves how ready they are to answer or agree (`leaning`: times
  `openness.memory`, on every ask), what they charge behind a counter (`haggled`: the fondest
  hand in takes `MONEY.regard` of it off, the sorest puts it on), whether they'd call the NCPD
  (`callOdds`, `police.caller.regard`), and which side they take in a fight (`JOIN.owed`). And
  before someone comes to collect (`SOCIETY.warning`, `Game`'s private `warnings`, once a
  threat), whoever thinks well enough of the player and knows the one coming (or is of the
  gang that is) sends word, `hours` ahead. A new thing to remember is another `MemoryKind`
  with its numbers and lines, on the side of `FOR` or `AGAINST` if it should count in regard
  (the dialogue test pins every memory line, and every news line, to exactly one kind).
- `src/engine/skills.ts` is a skill that grows with use (experience, levels, a bonus by
  level): charisma (`src/data/skills.ts`), applied in `Game.talk`, `gift` and `askFact`, the
  two fighting skills, Street Brawler and Toughness, and the weapon levels (see Fighting).
  Every skill starts the player off worse than anyone, pathetic to professional: below its
  `average` (4, where an ordinary person stands) its bonus is a penalty, from its `floor` at
  level 1 evenly up to 1, and only past it does each level add `perLevel`. Anything that
  multiplies takes `skillBonus`; anything that adds a little a level takes `skillEdge` (levels
  past an ordinary person's, below nothing short of it: charisma in `openness`, `talkOdds`,
  the tell and the shift moments). A level-up says where it leaves the player (`STANDING`,
  `{standing}` in its `levelLine`). Trading (`TRADING`, `rules.trading`; the tests' `RULES`
  leave it out, so their prices are as set) is the player's buying and selling: a counter's
  prices are their Trading against the seller's (`Game`'s private `haggled`: the sharpest of
  its staff, to `MONEY.haggle`'s power; a chain's, a hospital's, Trauma Team's and a room's
  prices are set; the shop's strip says "prices +8%"), every purchase `MONEY.tradeXp` of it,
  saved as `trading`, a Trading row in the status drop-down. Dealing and Cutting (`DEALER` and
  `CUTTER`, on `DEALING.skill` and `DEALING.cut.skill`; saved as `dealer` and `cutter`) are under
  Dealing below. A new skill is another `SkillRules` in `src/data/skills.ts`
  with its own `average` and `floor`, a state on `Game`, a save field and an event.
- Everyone has their own levels in what the player has levels in (`skillsOf` in people.ts,
  `PersonSkills`: Street Brawler, Toughness, `arms` for the kind of weapon they carry,
  Charisma, Trading, and Dealing and Cutting, drawn last so nobody's others move), on their own
  stream from `PEOPLE.skills`: a range for each by walk of life
  (`walkOf`: a ganger, a guard or an officer, a corpo, someone old, anyone else), moved up to
  `traits` levels by their nature (nerve and temper for their fists, warmth and chattiness for
  words; greed and chattiness for Trading). So a ganger fights well and talks badly, an old
  lady the other way round, and the fight is decided by who the player takes on and how.
  Without `PEOPLE.skills`, everyone is ordinary (4). They grow with practice (`Game`'s private
  `practiced`, on the player's own curves, so each level takes longer than the last): a day's
  experience by walk of life (`practice.walks`: a ganger's rackets, a guard's watch, a corpo's
  meetings) and for working a storefront's counter (`practice.staff`: trading and charisma),
  counted from the day the city started living (`LifeState.start`) or the day they took on
  what they do now (`LifeState.jobs`), and experience for every fight they've been in
  (`LifeState.fights`, counted by `learned`: a fight in their own days, a shakedown or a
  robbery they did, and every fight with the player). Worked out on demand, never a day at a
  time over everyone: `skillsFor` keeps them in `skillCache` until the day or the fights
  change; `levelsOf(id)` reads them. How someone strikes the
  player is on their card (`Description.fight`, plain to see, and `talk`, once they've talked
  `reads.talks` times; the Profile's Fighting and Talking rows, by `readOf` and `reads`).
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
  stance, charisma (its `skillEdge`, so a player short of an ordinary way with words gets
  less than anyone) and traits against the cost of what's asked (`Asked`: a fact, a
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
- After every exchange (`talk`, `askFact`, `gift`, `insult`, `rob`, `chop`,
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
  old age; a gang `joined` in a dead member's place; and hard times' `mugging`, `collected`,
  `evicted`, `closed` and `reopened`, under the eddies below) and changing the people as it goes:
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
  was about, and teaches the player the tie as it is now (or the death). `scenesAt` pairs the people at a spot by their ties
  (and a ganger on their turf with the help, who gets the `leanedOn` side of it, rivals with
  each other) with a phrase from
  `LIFE.scenes`, drawn for the place, the day and the three-hour block; it's `Presence.scene`,
  and the People overlay says "eating Wontons · arguing with a woman in Mox colors". A new
  kind of thing that can happen between people is another `LifeKind` with a chance, a roll
  in `liveDay`, and news lines for every side it can be told from (the dialogue sweep checks).
- People remember each other too (`LifeState.held`, `Held`, numbers in `LIFE.held`): what a
  day's event leaves someone holding against someone else (`HeldKind`: robbed, shook, beaten,
  dumped, fallout both ways, laidOff by their boss, evicted by their landlord, killed, their kin by whoever did it, with
  `about` the one who died), written by `liveDay`'s `write` (`hold`, the same again fresh again,
  `cap` a person, the oldest out) and kept its kind's `days` (`heldBy`; a killing a year). It
  keeps the two from making friends or a couple (`feuding`, checked on the pair drawn, so
  nothing new is counted), a makeup lets a falling out go, and now and then someone with the
  nerve goes for whoever robbed, beat or shook them down or killed their kin (`revenge`, a
  `fight` like any; won, it's settled). `scenesAt` takes the grudges (`held`) and shows them
  from both sides ("glaring at Raul" · "avoiding the eyes of Ana", `scenes.grudge`/`grudged`,
  by `glaring`); `Game`'s private `grudgeOf`/`grudgeVars` put the worst on their mind in the
  speaker's vars (`grudgeWho`, `grudge<Kind>`, `grudgeAgo`, `grudgeKin`, `grudgeWord`) for the
  `life` topic's lines, and telling it gives the player the name. Part of the `life` save;
  `applyLife` drops what anyone holds against someone the city no longer has.
- The eddies go round in a closed loop (`src/engine/economy.ts`, numbers in
  `src/data/economy.ts`, under `LIFE.economy`; `tests/economy.test.ts`): `economyDay` runs first
  in every lived day, on its own stream (`seed:economy:<day>`), and every eddie it moves comes
  from someone and goes to someone, but what it says in its `Flows`: `in` from outside the city
  (the corps' and the NCPD's payroll, freelancers' gigs, pensions, visitors' trade, a corp
  making up its till's short, the player's spending), `out` of it (corp rent, suppliers, a
  corp's takings over its reserve, a gang's chest over its weeks), `opened` (a till's float, an
  account started). The test checks the whole city's money against them every day: anything
  new that moves eddies keeps that true, or says which it is. Who owns what is `ownersOf` (on
  streams of its own, once a population: `perDistrict` landlords a district own its small blocks
  and the buildings of the storefronts whose boss doesn't, `bossOwns`; tall blocks, megabuildings
  and the corps' storefronts, `owners.corp`, the chains and the hospitals, are a corp's, `null`;
  a shack nobody's), and a dead owner's go to `holderOf`'s heir. Someone's money is their
  `Ledger` (`ledgerOf`, kept until their work, gang or home changes): their `earner` and `pay`
  (`staff[tier]` from the till, the boss `boss` times; `payroll` by kind of workplace, `ncpd`,
  `gang` from the chest, `gigs` by role, `street` roles from the city's street trade, `retired`
  a pension, the jobless nothing), their `means` by it, the `grocer` (one of the `nearest`
  counters to home, on `seed:grocer:<id>`) and `lunch` (near work), their `rent` and
  `landlord`. Cash on them is kept at what they started with (`base`, topped up from the
  account, `purse` times it and the rest goes in), so a robbery takes what it did; the account
  is `LifeState.savings` (`accountOf` for one not opened yet), the rent owed `arrears`, the
  street's takings `street`, a till's cash `Till.cash` and what it couldn't pay `Till.short`. A
  day: payday first (Friday: a till pays its hands first and the boss out of what's left; the
  street's trade shared among everyone who works one; a gang's chest among its members; and
  `family` help, account to account, for whoever can't make the week); the laid up billed
  `ward` a day by their hospital; then a seventh of the people (by their place in the list, so
  nothing per day scans everyone) do their week: the food, evenings out (`timesIn` draws how
  many with one roll), purchases at a store of their district (`goods`, weighed so each kind of
  store sees about the same trade, a dear thing bought only by who can half afford it), a
  `splurge` of what's over the `cushion`, a habit (`vice`, from `Game.viceOf`: the gang that deals
  it where they live), the rent (a landlord spends `upkeep` of it at a store of the district);
  then the storefronts' rent on `rentDay` and their books (takings, restocking out, the gangs'
  cut by `turfFrom`, and on payday what's over `reserve` weeks of costs to the boss, or out for
  a corp).
- Stock and prices (`stock`, `prices`, `market` in the same rules): a storefront's `Till.stock`
  is how full its shelves are (0–1; missing, full), and full shelves are `stock.weeks` of its
  costs at its prices. A day's takings take stock off them (fewer things for the money when
  it's dear), and the books buy it back up to full from the suppliers (outside the city: a
  `Flows.out`) at the `supplies` share, with no more than `stock.restock` of the till; under
  `stock.soldOut` a store sells nothing, takes nothing from outside, and its customers go to
  another of its kind in the district (`stocked`). Now and then a supply shock (`stock.shock`)
  cuts one kind of store's deliveries in a district for a few days. `priceFactor` is what the
  shelves make of prices (dearer under `prices.low`; a struggling place on full shelves
  `prices.glut` off, for the player only, since nobody else buys more for it); `parOf` how many
  of a thing at a price full shelves hold, `leftOf` how many are left (less `Till.bought`, the
  player's buys since the last restock). The market's state is `LifeState.market` (`shocks`,
  `short`: `district:category` keys short now, `news`: `MarketNews` headlines, a kind of store
  across a district going `short` under `market.short` and `back` over `market.back`, and each
  `shock`). `Game`'s private `marketPriced` puts it on a storefront's menu (`MenuItem.left`,
  `Menu.market`, and in an eatery's last `prices.closing.hours` `Menu.closing` off; a chain's
  and a hospital's prices are set, a service never runs short); `canBuy` refuses what's sold
  out; `Game.market(now)` is the Market and News rows of the status drop-down (`MarketView`,
  kept until a day is lived), and the headlines of the days just lived go to the feed. The
  speaker's `shortGoods` (what's short where they live) and `lowStock` (their workplace's
  shelves) fit the shortage lines. `Game.trade` is kept until a day is lived too. A till keeps a week of nets; `healthOf` reads it as thriving, steady or struggling,
  which `Game.trade(building)` gives the UI (the line inside, the status row), scales the
  player's shift pay (`economy.pay`) and makes a struggling boss refuse to hire
  (`LINES.work.broke`). The speaker's vars (`Game`'s private `meansVars`): `broke` (not a week's
  food and rent in all), `flush`, `behind`, `landlordName`, `corpRent`, `squat`, `landlord`,
  `ownsPlace`, `shortPaid`, `slow`/`brisk`. The tills, treasuries, accounts, arrears and street are
  part of the `life` save. Anything new that moves eddies between people and places goes in
  `economyDay`; anything that reads them goes through `Game.trade`, `ledgerOf`/`accountOf` or the
  vars. Keep `npm run bench` in mind: the economy is a few milliseconds of every day.
- Hard times (`ECONOMY.hard`, `HardRules`, in `economyDay`; `LIFE.hard`, `HardLifeRules`, in
  `liveDay`; either missing, none of it). The money side: someone short of the week's food with
  the nerve (`lift.nerve`, courage and greed) walks out with `lift.share` of it (`Till.lifted`
  since payday, taking stock off the shelves and nothing into the till); on payday, after
  family, whoever still can't make the week borrows from the gang with the most of their
  district's turf (`lenderIn`, out of its chest) up to `loan.weeks` of their food and rent,
  `LifeState.debts` (`Debt`: gang, owed, since, `paid`), at `loan.interest` a week up to
  `loan.most`, paid back on their own day out of what's over `loan.keep` weeks; a till short of
  its wages counts `Till.lean`, and `close.weeks` paydays running (never a corp's, a bank, a
  hospital or a real place, `close.never`) it goes under at the end of the day: what's in it to
  its boss, a `closed` headline, and `LifeState.closed` (`Closure`: day, `until`, `close.days`
  times one more for each time it failed before, `Till.failed`, up to `close.again`). Shut, a
  place is `bare` to shoppers and takes, pays and restocks nothing. The people's side, after
  the day's other doings and outside its `perDistrict`: a storefront closed today lets everyone
  go (`LifeState.jobs[id].was`, `ran` for its boss; coworker ties gone; a `closed` event, boss
  and one of its people); one shut till `until` is taken on by someone from the district
  looking for work (its first role that `runsIt`, else `manager`), with its shifts' hands from
  the same, fresh books (floated the next day) and a `reopened` headline and event; a tenant
  owing `evict` weeks of rent is put out with their household (`HOUSEHOLD`) to the district's
  nearest squat (a derelict building or a shack) or the street (`home: null`), the arrears
  written off (`LifeState.homes`, `Moved`, why `evicted`; an `evicted` event, the landlord's
  holder or the tenant twice for a corp's; held `evicted` against the landlord), and from
  `rehouse.after` days, weekly, finds one of the `rehouse.cheapest` blocks of the district once
  they've `rehouse.weeks` of its rent and their food (why `housed`). By chance: a `mugging`
  (`chances.mugging`: someone desperate, behind on rent or owing a gang, with `mugging.nerve`,
  robs a stranger of the district, held `robbed`); a loan shark's `collected` (`collect.chance`,
  a collector of the gang for a debt unpaid `collect.late` days: a beating, what's on them toward
  it, held `beaten`, and `paid` set as a warning); and a gang's `joined` of the desperate young
  (`recruit`, while it has under `extra` more in the district than it started with). Every one
  is news from each side it can be told (`LINES.topics.news`), and the speaker's vars say the
  rest: `inDebt`/`debtGang`/`debtLate`, `evicted`/`evictedFrom`/`evictedBy`/`rough`,
  `closedPlace`/`closedRan`, `lifted`. `Game` locks a storefront gone under to everyone
  (`locked(...).down`, `closed(now).down`, the panel's Closed down · Gone under, `enter` and
  `closingTime` say so), its prices out of the Market row, and `punchClock` ends the player's job
  there (`leaveJob` `closed`). Headlines fill `{place}` with the building.
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
  stand (stance, rapport, ♥, grudge), how often you've talked, their sex, each fact known as a
  label and a value (`profileOf` in `main.ts`), what's still unknown, what they remember of the player
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
  incident at once (the cascade, the mask, and whoever saw it may call the NCPD), and a fight in
  `Game`'s `fightState` until it's over. `Game.fightMove(move, now, hack?)` is a beat, their
  move drawn when it began; `Game.tick` freezes the player past the `deadline`. While it's on,
  `go`, `enter` and `leave` refuse, and the UI lets nothing else be done. `Game.fightView()`
  is everything the overlay shows (both sides, the range, the clock, the log a beat to an
  entry, the moves there are); `leaveFight()` drops one that's over. The event is
  `fightChanged`. Fights aren't saved: one in progress when the game closes is gone.
- What each side fights with: the player, whatever's best for the range of what they carry
  and have fitted (`yourFighter`: a loaded gun, chrome in the arms, a blade, then fists, which
  lose a tie), its rounds in the gun item and reloads out of their pockets; the other side,
  `Game.armOf(person)`, drawn on their own stream by their walk of life (`walkOf`: gang, a
  guard's job, a corpo's, or the street; `COMBAT.carry`: weapon ids, arm implants, or `fists`;
  most people carry nothing), with `spareMags`, their health from `COMBAT.people` and armor
  from `COMBAT.armor`. Both sides' levels count the same way (`trainedEdge` in combat.ts:
  Street Brawler on fists and anything blunt, Toughness on `steady`, the weapon's kind and
  model on its damage and aim, `perksAt` its level): the player's from their skills
  (`yourEdge`), anyone else's from their own (`edgeOf`, their `arms` level for both the kind
  and the model). Talking someone down is the player's charisma against theirs (`talkOdds`'
  `theirs`, weighed by `talk.resist`).
- Chrome in a fight is `COMBAT.chrome` by implant id: armor (the wiki's number at its first
  tier), health, `window` (a Kerenzikov; a Sandevistan by how much its page says it slows the
  world; `below` for only when hurt), aim, melee, guard, evade on the first beat (optical
  camo), a Smart Link for smart guns (without one they track worse), a Second Heart's revive,
  a deck's RAM (`deck`) and the frontal cortex's (`ram`), and `arm` for chrome that fights;
  `COMBAT.systems` is what a whole kind of operating system does (a Sandevistan's aim, a
  Berserk's guard in a melee). Drink takes the aim off.
- How it ends (`FightOutcome`): them down (`killed` by the odds of what dropped them,
  written to `LifeState.dead` and `diedOn` with a `murder` incident and crime; `trauma` for a
  corpo, whose Trauma Team gets them out alive; else `won`, laid up for
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
  talking to (`Game.outCold`; `isHere` refuses them, the card shows only `⋯` with Rob and
  the ways to kill them, below:
  `Game.rob` goes through their pockets, no fight, four fifths and more of what they carry,
  `LINES.you.robCold` and `LINES.rob.cold`/`coldNothing`, and once a week like any robbery). The player
  out (`knocked`): robbed like `lost`, but their health is what it was, and no Trauma Team
  comes for it. How steady someone is is `COMBAT.steady` (the brave and gangers steadier).
- Fights of more than two (`GameRules.join`, `JOIN` in `src/data/combat.ts`; the tests' `RULES`
  leave it out, so their fights stay the player and one other): when a fight starts, and a
  `perBeat` share of it every beat after, whoever's here may throw in (`joinFight`): against
  the player, by what they are to anyone on the other side (family, friends and crew, their
  gang), the place's own guard, an NCPD officer always, a stranger hardly ever and less in a
  crowd; for the player, a friend (`friendly` rapport) or the one they're seeing; all by nerve,
  never more than `foes` with the one gone for, or `allies`. Everyone else is a `Combatant`
  (`Fight.others`: their `Fighter`, the `range` to whoever they're fighting, their `mark`, their
  next move). The player and the one they're going for (`Fight.with`, `Fight.state`) fight as
  ever; then `otherBeats`: the rest of theirs on the player each get a free go (the player's
  move there is `busy`, but for cover, which covers them from everyone), and each ally has it
  out with one of theirs; a fighter's own exchange moves them and wears off what's on them,
  anywhere else only what lands counts. `fightTarget(id)` goes for another of theirs; when the
  one gone for is dealt with and more are left, `nextFoe` settles them (`settleFoe`, as the end
  of a fight would) and the next is up; anyone else out of it is `dropOut` (an ally may die of
  what dropped them; anyone downed by an ally lives). The fight is over when the player is
  down, out or away, or nobody of theirs is left; downed by an officer, cuffed. The lines are
  `COMBAT.group`; `FightView.foes` and `allies` are the rows under each side in the overlay
  (theirs tap to go for them).
- Killing someone out cold (`COMBAT.finish`, `FinishKind`): `Game.finishes(id, now)` is the
  ways the player has, by what they carry and have fitted (`finishTools`): choke and stomp
  with bare hands always, cut with a blade (Mantis Blades too), shoot with a loaded gun (a
  round spent), beat with something blunt (Gorilla Arms too), garrote with a monowire; each
  with its `label`, its `lines` (`{weapon}`, and `whoVars`), how `slow` it is and whether
  it's `loud`. `Game.killCold(id, way, now)` does it: someone here may get there first
  (`interveneOdds`: `intervene.base` times their nerve, more for the victim's family, friends
  and gang and for a guard, times `slow`, less each in a crowd, never past `most`), and then it's an `assault`
  and a fight with them (`openFight` with a `stopped` line: a fight they started, no incident
  of the player's); an NCPD officer here always does, and draws on the player instead.
  Done, the victim is dead as by a killing blow, a `murder` incident and crime, and a `loud`
  way is heard through the building (`heardInBuilding`, calling at `heard` of the odds, never
  naming the player). The card's `⋯` lists them after Rob (`data-kill`).
- The fighting skills grow with use (`COMBAT.skills`, `SkillRules` in `src/data/skills.ts`;
  the XP is `COMBAT.training`, trained by `Game`'s private `trainFrom` after every beat):
  Street Brawler (the wiki's 2077 skill for fists and blunt weapons), for every blow the
  player lands with fists or Gorilla Arms (a club less) and more for a knockout, multiplies
  their fists' damage by its bonus and their aim by a quarter of it, and the `ko` of fists and
  anything blunt by all of it (a club's own levels do the rest); Toughness (ours), for every
  blow taken (more for fists and clubs) and for every fight walked away from, divides the
  player's `steady`. Both are `Game.brawler()`/`toughness()`, saved as `brawler` and
  `toughness`, the `skillChanged` event, and rows in the status drop-down.
- Weapon levels (`COMBAT.mastery`, `MasteryRules`; the `SkillRules` are `WEAPON_TYPE` and
  `WEAPON_MODEL` in `src/data/skills.ts`): one for each kind of weapon (a `FightClass`:
  pistols, katanas, Mantis Blades…; fists are Street Brawler's) and one for each weapon
  itself, the model (a weapon's or an implant's id), saved as `arms` (`Arms`) and both trained
  by `trainFrom` (`mastery.training`: every go, a hit more, the blow that ends it most). In a
  fight `yourEdge` runs `masteryEdge`: the two bonuses multiply into `Edge.power` (all
  damage) and `mastery.aim` of it into the aim, so a weapon the player has never used hits
  about two thirds as hard as anyone's. A model brings perks at its levels (`mastery.perks`, by
  `perkFamily`: a gun's technology, Power, Tech or Smart, after what the wiki says each does,
  else its hits, blade, blunt, wire or launcher; each a `Perk` of `aim`, `power`, `guard`,
  `ko`, `crit` (`COMBAT.crit` of the damage, said with `youCrit`), `pierce` (armor) or
  `flank` (cover)), told when one comes. `Game.weaponType(cls)`, `weaponModel(id)`,
  `masteryOf(id)` (a `WeaponMastery`: both levels, the perks, the next) and `mastery()` are
  what the UI reads: the status drop-down's Weapons row, a weapon's row in the inventory
  ("Lv 3 · Ricochet at 5"). A new perk is another `Perk` in a family; a new family, another
  `PerkFamily` with its perks.
  Every line is `COMBAT.lines`, by what happened, filled with `fightVars` (who, their
  pronouns and the verbs that go with them, the arms on both sides); a named subject takes
  the singular verb, so `{s}`/`{es}`/`{ies}`/`{is}`/`{has}` only follow `{he}`. A tell
  (`tell<Move>`) shows their next move by the odds in `COMBAT.tell`, better knowing their
  nature. A new move, outcome or effect is another pool of lines, which the combat test
  checks for.
- The player's health (`Game.health(now)`, back on the clock by `COMBAT.health`) is saved as
  `health` (`Meter`); it shows in the status drop-down (and HP on its line when hurt). Who
  comes looking afterwards is the NCPD's business (below).
- `src/ui/fight.ts` is the overlay: both health bars, the range and beat on the strip, the
  log, the tell, the clock, the moves (Hack opens the quickhacks) and the kill-or-wound
  button. It can't be closed while the fight is on, and the header's buttons and the keys
  rest.

## The NCPD

There are no stars: nothing is on record unless someone calls it in, and the NCPD comes when
it comes. It's the wiki's 2077 force, privatized and cut to half its officers: gone from
Pacifica (a combat zone) and the Badlands, hardly in Watson's Northside, thin in the suburbs.

- `src/engine/police.ts` is the engine's shapes (`Report`, `Dispatch`, `Warrant`,
  `Confrontation`, `PendingCall`, `PoliceState`, `PoliceView`), `policing` (a district's
  odds, over by a neighborhood's in `areas`), `chargesFor`, `issueWarrant`; the numbers and
  the lines are `POLICE` in `src/data/police.ts`, on `GameRules.police` (the tests' `RULES`
  leave it out, so nobody ever calls there).
- A crime is `Game`'s private `crime(kind, victim, now, knew, who)`: an `assault` when a
  fight starts (the witnesses) and ends (the victim), a `robbery` (both), a `murder` (the
  witnesses still there). Each witness in the room and the victim, if they can, roll
  `callOdds`: the district's odds for an ordinary witness alone, times `caller`'s for the
  victim, their people, a guard, a corpo, nerve either way; a ganger hardly ever and never on
  their gang's own turf; an officer always. Witnesses leave it to each other (`crowd`) and
  are likelier to call a murder in (`alarm`). Nobody calls: nothing on record, and a line
  says so (`noCall`, `turf`, `zone`). Someone out cold is a `PendingCall`, rolled when they
  come to.
- A call is a `Report` (up to `keep`) and a `Dispatch` to where it happened (a building, a
  place, or that corner of the street, `dispatchedTo`): two officers of the district (the
  NCPD people, `unitFor`) on the district's minutes times `urgency`. It's `told` when the
  player saw it made: only then does the status line count it down ("NCPD · 4:12"). A report
  names the player only when a caller could put a name to their face (`facesHere`: had met
  them before, or an officer, who has it on file; nobody in a mask), and a named report is a
  `Warrant` (`lapseDays`, never for murder).
- `policeTick` (from `tick`): a hold served, warrants lapsing, pending calls, the unit
  arriving (the player still at the spot is a `Confrontation`, `why: 'scene'`; gone, a
  `missed` line if they knew), and a patrol stopping a wanted, unmasked player out on the
  streets (`stop`, every `minutes`, by the district's odds and the crime's rank; never inside
  or on a train), or anyone carrying a drug, mask or not (`search.stop`, more with a dealer's
  weight on them and on their corner: `why: 'search'`, the `frisk` lines). The officers on the
  player are in `peopleHere` wherever they are.
- Drugs (see Dealing): whenever officers have the player and take them in (`arrest`), they
  search them (`searchFinds`): every illegal dose is `possession`, a dealer's weight of any
  drug (`search.weight` doses) is `dealing`, each charged by the dose too (`chargesFor`'s
  `doses`, the crimes' `perDose`), and whatever's charged is taken (`seized`; the gang still
  wants paying). A search that finds nothing chargeable, with nothing on file, lets them go
  (`clean`). Running from a search, or fighting it, writes no warrant. A sale someone sees is
  `dealing` too: only `bad.seen` of whoever's there notice it, and nothing's said when nobody
  calls (`crime`'s `quiet` and `only`).
- `Game.police(now)` is what the UI shows; `answerPolice(choice, now)` is `comply` (the fine
  for everything they have, `chargesFor`, and the hold for it; short of the fine, held
  `shortHold` longer instead; every warrant settled), `run` (the `run` odds; away, a warrant
  if they saw the face; caught, held `resisting` longer) or `fight` (the first officer, while
  the other's call is backup, and what they came for goes on a warrant if they saw the face;
  put down by an officer, the player comes to in cuffs, not robbed, and is taken in, held
  `resisting` longer). Officers on them or held, `detained` refuses going anywhere,
  rooms, counters, work and robbing; held, nobody's here. Saved as `police`, read by
  `policeOf`. The event is `policeChanged`.
- The UI: `policeView` in `main.ts` puts the panel over everything (the officers' text and
  `pick-1`/`2`/`3`, or the holding cell with the time they let the player out), the sign
  says Holding cell, the status line has the worst of it (Held, NCPD and the count, Wanted)
  and the drop-down an NCPD row.

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

Every storefront hires; the player holds as many jobs as fit the day, a main one and side gigs,
never two whose hours overlap (`overlaps`; with the ladders' hours as they are, a day job and a
night one), and climbs a ladder of rungs at each:

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
  test wants one for every category with a business, with hours inside the opening hours of
  every storefront it's for: a kitchen's eleven to six, within an eatery's eleven to eleven).
- `Game` keeps the jobs (`JobState`: building, rung, trust, shifts, the shift day of the
  last shift, and its `days`, `owed`, `raise`, `missed`, `checked`, `paidOn`, `heard`; saved
  as `jobs`, the main one also as `job` for older builds, dropped when the building is gone
  or no longer hires) and the shifts worked in each line (`career`, saved). The main job is
  `jobs[0]`, the side gigs after it. `Game.jobsStatus(now)` is where each stands (rung, next,
  pay, `side`, `hours`, `days`, `owed`, `here`, `open`, `blocked`: away, off, done today, or
  closed); `Game.jobStatus(now)` is the one here, else the main one. `Game.workWith(id)` says
  what a person's card offers (`hire`; `switch` when taking it means handing one in, its
  hours clashing with one held, `switchingFrom` naming it; `quit` for a boss of
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

## Dealing

The player can deal for a gang: an illegal job, after its own rules rather than Work's
(`rules.dealing`, `DEALING` in `src/data/dealing.ts`; the tests' `RULES` leave it out, so
nobody there has a habit or deals):

- `src/engine/dealing.ts` is the engine, pure: the shapes (`DrugKind`, `Habit`, `DealRung`,
  `DealGang`, `Front`, `DealState`, `DealingState`, the views) and the arithmetic (`habitOf`,
  `dealRungOf`, `canMoveUp`, `streetPrice`, `owedFor`, `askOf`, `pushOdds`, `buyersIn`,
  `blockOf`, `withInterest`, `drugLevel`). The drugs are `DRUGS` in `src/data/drugs.ts` (on
  `GEAR.drugs` too, for their weight and how many share a slot): the wiki's 2077 drugs a gang
  makes or moves (Glitter, Black Lace, Juice, Deep Dive, Phant) and older ones from its 2020
  and RED pages (`from`) that fill out each gang's line (SynthCoke, 'Dorph and Timewarp for the
  Valentinos, whom the wiki has trafficking drugs with none of their own; Boost, Prime Time,
  Berserker, Red Lace, Stim, Speedheal, Blue Glass); each by the wiki's name, what it does and
  whether carrying it at all is illegal (the wiki's combat-rated drugs, Black Lace, Berserker,
  Prime Time and Red Lace, Black Lace's offensive counterpart; Glitter; the Animals' "illegal
  supplement"), with how the older ones are taken, our price, weight, users and `hook`. A
  dose is an `Item` of kind `consumable` named by the drug's id. A new drug wants its habit
  effects, use lines and overdose odds too (the habit test checks every one).
- Who deals what is canon (`DEALING.gangs`: the Tyger Claws, Maelstrom, the Animals, the
  Scavengers, the Valentinos; nobody else fronts anything), with the roles that front
  (`connects`) and collect (`collectors`) from the gang's own, a title a rung in its words,
  and the canon places it works first (`spots`, checked to be on its turf). A gang's `drugs`
  are its line, its own canon product first (the Scavengers' Phant, the wiki's four or five
  times Deep Dive, at the top of theirs), each after it dearer and opened at a higher Dealing
  level (`at`, `drugLevel`); which gang moves the older drugs is ours, and no drug is two
  gangs'.
- The Dealing skill (`DEALING.skill`, `DEALER`; `Game`'s private `trainDealing`): `xp.sale` a
  dose sold (the corner or a pitch, through `sale`), `xp.front` a package paid off, `xp.rung` a
  rung, `xp.runner` a dose a runner sells. It goes with the player from gang to gang. The
  connect's card offers a package of what the player's level opens and, shut, the next of the
  line ("At Dealing Lv 4"), and `takeFront` refuses the rest; a level that opens one says so.
  It's in the undercover read with Trading and charisma. `Game.dealingSkill()`, saved as
  `dealer`; `DealView.line` is the line for the status.
- Cutting (`src/engine/cutting.ts`, the numbers and lines `DEALING.cut`): a cutting agent (a
  component, `GEAR.components`, ours; racked at pharmacies, general stores and bodegas, only
  where there's dealing) stretches a stack of a drug a dose a dose of agent, mixed through
  (`Item.cut`, the stack's filler share; `cutShare`; clean doses stowed into it thin it,
  `mixedShare` in `stowDoses`), up to `most`, and only with room in its pocket (`Game.canCut`,
  `cut`, the inventory's **Cut**; `cutItems`). The Cutting skill (`DEALING.cut.skill`,
  `CUTTER`, a dose cut `xp`, saved as `cutter`) makes a cut cleaner: its bonus divides every
  risk. A cut dose sold (`soldCut`) may hurt the buyer (`harmOdds`: the share squared; queued
  in `DealingState.harms`, and `badBatches` from `live` lays them up or, by `harm.deadly`,
  kills them the next day, told, the NCPD on record by `onRecord` and the player named if the
  buyer knew them; never a customer again) and, of the gang's own product, may get back to the
  connect (`foundOdds`, `found.trust`). A cut dose the player takes is weaker by its share
  (`takeDose`'s `purity`) and can make them sick (`sickOdds`, `sick.health`). Runners take cut
  doses as any; what's cut in them goes no further yet.
- A habit is `habitOf` (on its own stream, `seed:habit:<id>`: never moves anything else): a
  share of each walk of life, adults only, the drug weighed by who takes it and whether a
  gang deals it where they live. `Game`'s private `habitFor` keeps it, `usersOf` finds the
  users of a drug in a district (indexed once a city: nobody's habit changes).
- Getting in (`Game.dealWith(id)` is what a card's **Deal** command offers, `Game.deal(id,
  option)` does it): any member of a dealing gang but a connect points the player to one
  (`LINES.deal.refer`, teaching their name and job) and vouches for them if they like them
  (`DealingState.vouched`); a connect says yes as an ask like any other (`openness` with the
  `deal` cost, pressing, the mask's refusal) once they're warm or better (`join.stances`; a
  vouched-for player, neutral will do) and the gang's rep isn't under `join.rep`. A yes is
  the first package, and the gang's corner (`cornerFor`: a spot, else a place of a
  `corner.kinds` nearest the connect's home), put on the map (`CityMap.setCorner`).
- A front is `rung.front` doses, owed back `owedFor` (a share of their street value, `cut`)
  by `rung.days`; it goes into pockets with room only if it all fits (`stowDoses`). Paying
  (`payUp`, at the connect: the debt first, then the front; cash to the gang's treasury) off
  before the day is `trust.paid` (and `early` before half its time), a front paid, and a
  rung up when `canMoveUp`. The next package is on offer only with nothing owed; walking
  away (nothing owed) keeps where the player stood in `past`.
- The corner (`Game.cornerAction`, the panel's **Deal**, `walkUp`): a buyer a point of
  energy, `buyersIn` a three-hour block by the hour and the kind of place, someone who lives
  in the corner's district with a habit for what the player carries, out and about or here,
  with at least `short.least` of the price on them, a regular (`corner.regularAt` buys)
  likelier. `dealMoment` is the panel while they wait: sell at `askOf` (the street price
  where the player is, by their Trading against the buyer's, to `MONEY.haggle`'s power), or
  take what a short buyer has; push for `push.more` (`pushOdds`: Trading and the buyer's
  need), which may lose them; or pass. A sale (`sale`) is a dose out, the cash in (refused
  without room for it), the buyer's eddies down, a customer, rapport, Trading XP. Pitching
  (`sell:<drug>` on any card but the connect's or an officer's): a user of it buys if
  they'd trust the player (`openness` with `pitch`, plus their need; a regular always), a
  user of something else passes, anyone else is put out, the straight-laced most.
- The clock (`dealTick`, from `start` and `tick`): a front past its day is a debt (less
  `trust.short`), growing `debt.interest` a day; collectors come `graceHours` after and
  every `againHours` while it's owed (not on a train; a walk stops): `collectorComes` picks
  one of the gang's collectors, and `Game.collector(now)` is the panel (pay what's on the
  player, plead with their charisma against the collector's, or fight: an assault, less
  `trust.fought`), answered by `answerCollector`; a failed plea is a beating (health, energy,
  the cash taken anyway). While a collector waits, `detained` refuses moving and counters,
  and `attack` takes only them. Trust down to `trust.cutOff` and the gang cuts the player
  off (`burned`): no more product, and what's owed is a gang `Threat` of `debt.threat` times
  it. Saved as `dealing` (`dealingOf` reads it); a buyer's moment and a collector aren't.
- Bad customers (`DEALING.bad`): at the corner, now and then the one who comes up is an NCPD
  officer undercover (`undercover`, times the district's call; `undercoverFor`), read for one
  by the player's Trading or charisma (`read`, a `tell` line in the moment's text): sold to,
  they bust the player there and then (`busted`, a `dealing` confrontation at the scene). Or
  a robber (`robber`, times `rough` by district: one of the users round there, armed and
  hard): the moment is Hand it over (`robbedOf`: a share of the gang's doses and the cash,
  `bad.rob`), Talk (charisma against theirs, `bad.talk`; no good, they take it anyway, with a
  blow) or Fight (a fight they started). Any buyer may call it in after (`snitch`: unseen,
  more if pushed or turned away, a regular less, a ganger never; a named report, so a
  warrant). A regular short of the price can have the rest on tab (`customers[id].tab`),
  which `settleTab` collects with a little over (`bad.tab`, by their loyalty) the next time
  they come by, or doesn't, and writes off in `tab.days`.
- Turf wars (`DEALING.war`): a corner is held by a gang (`DealingState.corners`, claimed for
  the player's gang when it gives them one; else a gang's own canon spot is its own, and
  anywhere else nobody's: `holderOf`), and `cornerFor` never gives a corner another gang
  holds. The people's own days fight over them: `cornerWars` (from `live`, over the day's
  events, so `life.ts` draws nothing new) has a `fight` or a `death` in a held corner's
  district, won by a rival of the holder, take it by `take`, and the old holder take it back
  the same way; the player's corner lost, `loseCorner` has the connect put them on another,
  or none. At the corner, the rivals of the player's gang come by (`rivalsAt`: `rivals.base`,
  more for the player's `heat`, a point a sale halving a day, `heatAt`, and for the rivals'
  share of the district's turf; one of theirs from round there, else from their own turf):
  Clear off (the block's over, and `rivals.yield` times running gives them the corner), Pay
  them (a share of the cash, to their treasury) or Fight (a fight they started, and
  `rivals.trust` with the player's gang). Pitching one of a rival gang (`LINES.deal.rival`) is
  a grudge, maybe a fight there and then (by their temper), and the gang set on the player
  (`setOnPlayer`: a gang `Threat`); so is a sale made on a rival's turf, by `threat.chance`
  (`rivalTurf`).
- The player's own habit (`src/engine/habit.ts`, the numbers and lines `DEALING.habit`): a
  dose is a drug carried, taken with **Use** (`Game.consume` hands it to `useDrug`; not in a
  fight or with officers or a collector on them). It does what its `effects` say while it
  lasts (after the wiki: Black Lace's armor, damage and crits for less health, Glitter's
  talk and blur, Juice's muscle, SynthCoke's time to think, 'Dorph's second wind), times its
  strength, which tolerance takes down the more dependent the player is (`takeDose`). Each
  dose is `dependence.perDose` times the drug's hook on that drug (`HabitState.drugs`),
  fading `cleanDay` a day clean (`dependenceAt`); hooked and without long enough, `stageAt` is
  craving, then withdrawal (charisma and aim down, a point of energy every `drainMinutes`),
  then `severe`: `habitTick` (from `tick`) collapses the player into the nearest hospital
  (`toHospital`, billed by `hospitalBill`), the dependence `detox` less. Any dose may be an
  overdose (`overdoseOdds`: the drug's `base`, more for every dose in `stackHours`): Trauma
  Team on a plan, else someone here gets help by `saved`, else the player is dead and the
  game emits `flatlined`, and `main.ts` starts the city over. 'Dorph and Phant can damage
  the nerves (`nerve`: aim lost for good); Black Lace takes the player toward the edge
  (`edgeAt`, fading by the day): past `numb`, charisma down and no talking or running in a
  fight; past `snap`, now and then they go for someone here. What it all does is `effectsAt`,
  read through `Game`'s private `habitNow` wherever it counts (`maxHealth`, `fightWindow`,
  `yourEdge`, armor, `charismaEdge`); `Game.habit(now)` is the UI's (`HabitView`, the
  `habitChanged` event), saved as `habit`. Without `rules.dealing` nobody has one.
- The player's crew (`src/engine/crew.ts`, the numbers and lines `DEALING.crew`): from the
  rung `crew.from` (`crewSize`, `most` a rung) a card's **Deal** offers taking someone on
  (`recruit`: an ask like any other, `openness` with the `recruit` cost, only of `stances`, the
  keener for one of the player's gang or a user of what it deals, `keen`; never an officer,
  the connect or one of another gang). A runner (`Runner`, `DealingState.crew`) is fronted a
  package of a `sizes` out of the player's pockets (`frontRunner`), owing `owe` of its street
  value round where they live (`runnerStreet`) in `days`. Their days are lived with the
  people's (`crewDays`, from `live`, each runner on `seed:crew:<id>:<day>`): `runnerDay` has
  them picked up (`bust`, times the district's call: the product gone, held, and maybe the
  player's name on a `dealing` warrant, `namedBy`), robbed (`robbed`, times `bad.rough`, maybe
  laid up), or out selling (by `usersOf` round there and their Dealing, at a price by their
  Trading, both of which every dose sold trains, `DealingState.dealt` in `practiced`), a greedy one skimming and a hooked one using
  (`hidden`, unseen); their `mood` goes down for what goes wrong, and under `mood.quit` they
  walk (`quit`, holding what they held) or run off with it (`ran`). Word of what anyone would
  hear reaches the player (`crew.lines`). Settling up is in person (`collectFrom`, `settle`):
  what they hold up to what's owed, what's over theirs once the package is sold and paid, a
  walked one's unsold doses handed back; short (`runnerShort`: past the day, or nothing left to
  sell), they say why (busted, robbed, or a lie when they skimmed), and the player can lean on
  them (`leanOn`, Street Brawler against theirs, `leanOdds`: the rest from their own pocket,
  else a grudge) or let it slide (`letSlide`, `writeOff`). `Game.crew(now)` is the UI's
  (`RunnerView`; the status drop-down's Crew row). The lines are `LINES.deal.recruit`…`letGo`
  and `LINES.you.recruit`/`frontRunner`/`collect`/`lean`/`slide`/`letGo`.
- The lines: the narration is `DEALING.lines`, `DEALING.habit.lines`, `DEALING.crew.lines` and
  `DEALING.cut.lines`; what people say is `LINES.deal` and `LINES.you.deal`/`pitch`/`payUp`/
  `walkAway`. The status drop-down has a Dealing row and a Cutting row (the skills, once
  there's anything to them), a Gang row (the rung, what's owed, the corner, the next drug of
  the line), a Crew row and a Habit row, and the line under the energy bar says a debt, a drug
  working, a craving or withdrawal.

## The player's home

The player can rent a unit or squat, and keep a stash there (`rules.home`, `HOME` in
`src/data/home.ts`; the tests' `RULES` leave it out, so nobody there has a home):

- `src/engine/home.ts` is the engine's shapes (`HomeState`, `HomeView`, `HomeKind`, `HomeRules`)
  and the stash's arithmetic (`stashLoad`, `stackIn`, `stashFits`, by `stackSlots`/`itemGrams`).
  `Game` keeps the home (`homeState`, saved as `home`) and the stash (`stashItems`, its own list
  of items off the player, saved as `stash`; never in `inventory`, so no robbery, search or
  weight sees it).
- Taking a place is at its door (the lobby, `atCounter`): `Game.homeOffer()` is what the
  panel's home button offers there (`rent` at an apartment block or a megabuilding, at what its
  tenants pay a head, `ECONOMY.homes`, times `HOME.unit`; `squat` at an abandoned building or a
  shack; `go` up to the player's own unit; `stash` in it), and `takeHome(now)` takes it: a week
  up front (never to a mask, nor short of it) through the private `payRent` (the account, then
  cash, to whoever owns the building, `ownersOf`/`holderOf`, into their account; a corp's
  leaves the city), a unit nobody lives in (`freeUnit`, by `unitOf`, on its own stream), and an
  old home given up for it once its stash is empty. The unit is the player's own (`RoomAccess`
  `yours`; `goHome`); `moveOut` hands back the keys with an empty stash.
- At home (`atHome`: in the unit, or anywhere in a squat), `Game.stash()` is the stash, and the
  inventory's drop button is Stash (`stashIt`, a whole stack, by `stashFits`); the stash is a
  page of the inventory (`STASH_PAGE` in `main.ts`: Take, `unstash`, as far as there's room).
- `homeTick(now)` (from `start` and `tick`, after `punchClock`) takes each week as it falls due:
  the rent and what's owed, as far as it goes, the rest owed; `warnAt` weeks owed, a warning
  once; `evictAt`, put out, the stash lost and the player shown out of the unit. A squat's week
  has `squat.raid` of somebody taking `squat.take` of every stack. The lines are `HOME.lines`.
- The UI: the panel's **Rent**/**Squat**/**Home**/**Stash** button (`ActionId` `home`) and in
  the unit **Vacate** (`move`, Leave for a squat), the panel's line on the rent (`homeNote`),
  the status drop-down's Home row (`homeLine`), and a house pin on the map (`CityMap.setHome`).

## Borrowing and lending

The player can take a bank loan, borrow from a gang's loan shark, and lend to people
(`rules.credit`, `CREDIT` in `src/data/credit.ts`; the tests' `RULES` leave it out):

- `src/engine/credit.ts` is the engine's shapes (`BankLoan`, `SharkLoan`, `Lent`, `CreditState`,
  `CreditRules`) and the arithmetic (`creditLimit`, `loanAmounts`, `honestyOf`: loyalty less half
  the greed). `Game` keeps the state (`creditState`, saved as `credit`, read by `creditOf` in
  `save.ts`; a loan from a bank the city doesn't have is dropped) and moves the money.
- A bank (`Game.credit(now)`, at a `bank` counter) lends from `bank.least` to `base` plus
  `weeks` of what the player's jobs pay a week (`weeklyPay`), up to `most`, one loan at a time:
  `borrow(amount, now)` puts it in the account and owes it with `interest` on top, in `term`
  weekly installments; `repayLoan(now)` pays it off at any bank, account first. The private
  `creditTick(now)` (from `start` and `tick`, after `homeTick`) takes each installment from the
  account as it falls due; short, it's missed (`late` of it more), and `default` missed in a row
  is a default: the account swept toward it every week till it's paid, and `barred` for good.
- A loan shark is any ganger (`Game.moneyWith(id, now)`, the card's **€$** command;
  `moneyMove(id, option, now)`): `borrow:<n>` of `shark.amounts`, cash into the wallet (as far as
  it holds, else `noRoom`) out of the gang's chest (`LifeState.treasuries`), all owed to one gang
  at a time up to `most`; never to a player they're cold to (`LINES.money.sharkNo`), more to one
  past `grace` (`sharkFull`) or out of a chest short of it (`sharkDry`); it grows `interest` a
  week up to `cap` times what was borrowed. `repay` pays any of
  that gang back in cash, into its chest. `grace` days without a payment and the gang sends
  someone: a `Threat` with `why: 'debt'` (`settleThreats` uses `LINES.revenge.debt`, and what it
  takes comes off the loan and goes to the chest, the clock starting again); paid off, it's
  called off.
- Lending (`lend:<n>` of `lend.amounts`, to anyone but a ganger or an officer): taken by the
  broke, behind or in debt (`meansVars`), else only by someone `lend.stances` to the player; the
  cash goes into their account (`LifeState.savings`). On the week from the day they borrowed, an
  honest one (`honestyOf` over `lend.honest`) pays back `share` of what they have over a week's
  food and rent (`spareOf`, by their `Ledger`; `takeFrom` takes it, account first) into the
  player's account; `ask` asks for it there and then (all they have over, or an excuse), and
  asking again within `patience` days is pressing (`pressing` rapport, `LINES.notes.dunned`; a loan made is noted `lent`).
  A borrower who dies takes the debt with them.
- What's said: the narration is `CREDIT.lines`; what people say is `LINES.money` (`{amount}`,
  `{owed}`, `{gang}`) and the player's `LINES.you.borrow`/`lend`/`askBack`/`payShark`; the
  dialogue sweep checks them. Every exchange takes a snapshot and notes after, like any other.
- The UI: the bank counter's **Loan** (the sums it lends, in the picker) and **Repay**, and its
  Loan figure (`loanFigure` in `main.ts`); the card's **€$** command (`Picker` `money`,
  `data-money`); the status drop-down's **Debts** row (`Game.debts(now)`, `debtLine`).

## The player's business

The player can own storefronts (`ECONOMY.business`, `BusinessRules` in `src/engine/economy.ts`,
the numbers and narration in `src/data/economy.ts`; missing, nobody sells):

- What's theirs is `LifeState.owned` (`Owned`: since, `prices`, `due`, `lost`, `told`), kept with
  the people's days since the economy pays it: `economyDay` puts what's over a till's `reserve` on
  payday on `due` instead of the boss (a `Flows.out`, the player being outside the city's money),
  and a place of theirs that goes under is `lost`, its till's cash on `due` too. `Game`'s private
  `businessDays` (from `live`, after the days) pays `due` into the account, drops a lost place,
  and says when a till came up short of its wages, once each payday running (`told`, by
  `Till.lean`). `readSave` keeps only owned records that read right (`ownedOf`).
- What can be bought (`Game`'s private `sellable`): a storefront that isn't a corp's
  (`owners.corp`), a bank, a hospital or a real place (`hard.close.never`). Its price
  (`priceOfPlace`): `price.costs` weeks of its costs (`weekCostOf`: its living staff's wages and
  its rent) and `price.profits` weeks of what it cleared last week; gone under, `price.closed`
  weeks of costs as if two hands and a boss. A going one is bought off its boss
  (`Game.moneyWith`'s `buy`, on the card's **€$**, from `placeOffer`: only at the `sellers` stances
  for how it's doing; `buyFrom` pays into their account, `LINES.money.sellYes`,
  `LINES.you.buyPlace`), who stays on to run it. One gone under is bought at its door
  (`Game.forSale()`, `buyClosed(now)`: paid to its building's owner, `ownersOf`/`holderOf`), and
  the next day lived `liveDay`'s `reopen` takes on its people as for any.
- Owning it: its counter is open to the player whoever's in and at the staff price (`counterOpen`,
  `menu`), the back is open to them (`accessTo`), and the books are out back (`Game.books()`, or
  anywhere inside without rooms; a `BusinessView`): `putIn(amount, now)` (`amounts`, the account
  first), `takeOut(now)` (what's over its `float`), `setPrices(level, now)` and
  `sellBusiness(now)` (`sell` of its price, into the account; its boss runs it for themselves
  again). A price level (`levels`: `low`, `fair`, `high`) is a share on its prices (`price`: on the
  menu, `marketPriced`, and on what its shelves give for the money, so dearer costs less to
  restock), on its trade from outside the city (`walkIn`), on the residents it keeps (`keep`: the
  rest go to another of its kind in the district) and on what it draws from its rivals (`draw`, a
  share of one place's trade taken from them all alike, `economyDay`'s `priced`).
- The UI: at the door of one gone under, the panel's **Buy it** (`ActionId` `buy`); out back,
  **Books** (`books`), the books overlay (`src/ui/books.ts`, after the bank's: Put in, Take out,
  Prices, Sell, each with its picker); the status drop-down's **Business** row
  (`businessLine`); and a work pin with a coin on the map for each (`WorkPin.owned`). Lines are
  `ECONOMY.business.lines` (`{place}`, `{amount}`, `{weeks}`, `{under}`, `{level}`).

## Selling and fencing

The player can sell what they carry to the stores that deal in it, and fence what they took off
people (`rules.trade`, `TRADE` in `src/data/trade.ts`; the tests' `RULES` leave it out, so
nobody there buys off the player and nobody carries anything worth taking):

- `src/engine/trade.ts` is the engine, pure: `TradeKind` (what a store deals in: a gun, a melee
  weapon, ammo, clothing, cyberware, a deck, a quickhack, meds, food, supplies, a valuable),
  `tradeKindOf` and `worthOf` (what one of a thing is worth by its own catalogue: a weapon's,
  a garment's, an implant's, a hack's, a med's, a dish's, a component's price, a round its share
  of a box, a valuable its own), and `valuableOf`.
- A store buys what it deals in (`TRADE.buys`, by business id; a chain, absent there, buys
  nothing off the street): `Game.sellables(now)` is what the counter here would give for each
  thing the player carries, by `Game`'s private `offerFor`: `share` of its worth (or `shares`
  for a thrift shop, a pawn shop, a junk shop), times `tier` by the store's, times its shelves'
  `priceFactor` (dearer while they're short, cheaper at a slow place sitting on full ones), over
  `haggleFactor` (the counter's Trading against the player's, and what the hands in remember of
  them, which `haggled` uses too), and never more than `resale` of what it would charge for it
  itself, so no Trading buys and sells back at a profit. So what's bought cheap where the shelves
  are full and the tier is low sells dear where they're bare. `Game.sell(id, from, now)` sells one (ammo a box's
  worth): out of the till (refused short of it, or with no room for the cash, by
  `walletRoom`/`changeRoom`, or for a gun still loaded), the cash in bills and coins
  (`splitLoot`), its worth onto the store's shelves (`Till.stock`), and Trading for the deal.
- Valuables (`VALUABLES` in `src/data/valuables.ts`, on `GEAR.valuables` for their weight) are
  the wiki's 2077 junk and jewellery, by its sets (a gang's own, a corporation's, a casino's, the
  street's, the rich and the poor), with our notes, prices and weights; items of kind `junk`
  named by their id. `valuableOf` is the one someone has on them this week (on
  `seed:valuable:<id>:<week>`: `carry.chance` by their means, of their gang's, walk's or means'
  likelier, jewellery rarer), which `rob` (awake or out cold) takes with the cash and the chip if
  there's room, named in the `haul` by whose it was ("her Cufflinks"). Only a fence buys one
  (`fences`: a pawn shop at its price, a junk shop for less, by the tier and the haggling); any
  other counter lists it as "Only a fence" and turns it away (`lines.hot`).
- The UI: the shop overlay has **Buy** and **Sell** tabs where the counter does both (`ShopView`
  `mode`, `sells`, `SellItemView`), and a fence, with no shelves for the player, is the panel's
  **Sell** (`ActionId` `sell`), the overlay in its sell mode. The narration is `TRADE.lines`.

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
- A home with a bed adds `ENERGY.bed` to the max: a rented one (see The player's home), never a
  squat (`Game`'s private `hasBed`).

## Food

Eateries sell food, into the inventory (eating it comes later):

- `src/engine/food.ts` builds a `Menu` for a building or place (`menuFor`); `Game.menu()` is
  the one where the player is (inside a food storefront, or at a place whose kind has a
  kitchen) and `Game.buy(id)` buys off it. A venue's `quality` (luxury, everyday, poverty) is
  drawn from its district's `dining` weights, fixed for chains and named eateries, and sets
  the prices and what's on; the draws use their own RNG streams, so menus never change the
  city. New things to do with food (eating, energy) go in `Game`. A storefront's menu carries
  its stock and prices by supply and demand (see the economy, under People).
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
everything else about the player: experience, charisma, the fighting skills and the weapon levels, eddies and the bank, the pass, the
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
  part of a name takes one random draw, and the words of a storefront's own name are drawn
  on its own stream, so `src/data/storefronts.ts` can grow as it likes; a style's templates
  keep their number and placeholders); moving or resizing buildings needs the same bump.
- `TRAVEL.timeScale` in `src/data/travel.ts` is 60 while testing; 1 is real time.
- Two builds live on GitHub Pages: the stable release at the root
  (https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/, from `main`) and the beta under `/beta/`
  (from `beta`, built with `CHANNEL=beta`: its own save key, "Beta build" in Settings). Pull
  requests go to `beta`; a push to either branch rebuilds both and deploys. A release is `beta`
  merged into `main`, then the **Release** workflow run with the version (bump `version` in
  `package.json` with it): it tags `main` `vX.Y.Z` and publishes a GitHub Release (only the
  workflow's token may push tags). `__CHANNEL__` and `__BUILD__` are the build-time defines.
