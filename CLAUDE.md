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

## Inside buildings

Going inside a building is in place, with nothing to do in there yet. What's added later
(counters, rooms, people, jobs) hangs off the same pieces:

- `Game.interior` is the building the player is in (`enter()`, `leave()`, the
  `interiorChanged` event); it's saved as `inside`. New rules for being inside go in `Game`.
- `insideView` in `src/main.ts` is the panel inside. It has the building's `category` and
  `business` to decide what to show.

## The inventory

Everything the player owns is in a pocket of something worn; food, drink, credchips,
clothing, weapons and ammo are the items so far:

- An `Item` has a `kind` (`ItemKind`: weapon, ammo, attachment, cyberware, quickhack, clothing,
  consumable, shard, credchip, junk, component, after the wiki's 2077 item types plus the
  2020 credchip), a name, a count and the pocket it's `in`. `Game.inventory` is what the player carries, saved as `items`;
  `Game.gearSaved` is their pockets, saved as `gear`. Giving and taking items goes in
  `Game`: `Game.buy(id)` (off a menu or a rack), `Game.consume(id, now)` (eat or drink one),
  `Game.drop(id)`. Anything new that hands the player an item goes through `pocketFor`
  (room, or none) and sets `in`; old saves with items in no pocket are put away by `stow`.
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
  and up, change back in coins as far as `changeRoom` allows); `Game.affords(id)` and
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
  from the wiki (its name without the maker, the maker, the class, Power/Tech/Smart, the
  magazine as the wiki's ammo capacity), with our weight, price, note and store tier; the
  TCG's cards have no shop weapons yet. The ammo is the wiki's four kinds by item id
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
- `src/data/items.ts` names each kind and says what goes in it (the order items are listed
  in within a pocket). Real items take their names and details from the wiki and the TCG.
- `src/ui/inventory.ts` shows a page at a time: the outfit (a row per slot, then the bags),
  or inside one pocket (its pockets' load, the items in it with Eat/Drink/Wear/Load/Unload/Drop, the
  pockets inside it as rows that open, and figures for the bills and the coins). `main.ts`
  keeps the path of pockets opened; what using or wearing something does is `Game`'s
  business. Weight has no effect on the player yet; `Game.carry()` has the total for when it
  does.

## People

Every city has a population, made up for its seed in `Game`'s constructor (`generatePeople`
in `src/engine/people.ts`, from `src/data/people.ts`): it never touches the city itself, so
it needs no generator bump. The pieces:

- The people come in two draws, each on its own RNG stream, so the first (`seed:people`: the
  staff by `rolesFor`, `residents` per home, the gangs by their district weights) never
  changes and every save keeps the people it knows; the second (`seed:people:more`) fills
  the city out by `PEOPLE.more` (the chance of one more pair of hands per storefront, with a
  role from `roles.extra` by the building's category; residents `perHome`, more in a `tall`
  block and a `megabuilding`; the gangs again, by `gangs`). Make a city bigger or smaller
  there, or with a third draw on a new stream, never by changing the first. Families, ties
  and hangouts are made within a draw; coworkers, crews and bios over everyone at the end.
- A `Person` has a home, a job (`building` null for freelance work), maybe a `gang`,
  `traits`, `likes` (a dish, a drink, a `hangout` spot), `hates` (a gang) and `eddies`.
  `Tie`s link people both ways: `to` is `from`'s `kind` (spouse, partner, parent, uncle,
  friend, crew, coworker…; `INVERSE` gives the other side), one tie a pair. `whereIs` puts a person somewhere by the clock
  (`Clock`: hour, weekday, day; the phone's local time, or `rules.clock` in tests); nobody is
  placed on the streets, only in buildings and at places, so `Game.peopleHere(now)` works
  inside a building or at a location.
- `src/engine/society.ts` is the player's side: `Standing` per person (rapport, grudge,
  fading on the clock), `Rep` per circle (`gang:`, `district:`, `business:<building id>`,
  `chain:<business id>`), incidents and threats. `applyIncident` is the cascade; add a new
  kind of incident (assault, murder are already named) by giving it a severity in
  `src/data/society.ts` and calling `Game`'s private `incident()`. Anything that should
  change how someone feels goes through `changeStanding`/`changeRep` so it fades right.
- What the player knows is separate from what is true: `SocietyState.known` (met, seen,
  told of; which `facts` the player has: name, job, age, home, likes, hates, nature, and
  `dead` once they've been told; and
  the `log` of what was said, the last `LOG_CAP` lines) and `links` (what the player knows
  of a tie, keyed `a|b`; `kind` null for "connected somehow", `'none'` for "asked, and
  they'd never heard of them"). The UI shows a person only through `Game.describe` (name
  or their look, and the facts known), `standingWith` (web) and `conversation`, never the
  `Person` or the population's ties directly; new ways of finding things out go through
  `learnOf`, `learnFact` and `learnLink` (`Game.look` for what's plain to see, the topics
  in `talk`, `Game.ask` and `Game.askFact`), and everything said goes through `logLine`. A
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
  level); charisma is the one so far (`src/data/skills.ts`), applied in `Game.talk`,
  `gift` and `ask`. A new skill is another `SkillRules` in `src/data/skills.ts`, a state on
  `Game`, a save field and an event.
- `src/engine/dialogue.ts` puts lines together from fragments in `src/data/dialogue.ts`
  (our own words; slang from the wiki's Streetslang page, by voice through the `lexicon`).
  A `Speaker` is everything a line is picked and filled by (voice, mood, stance, history,
  the player's eloquence, `vars`); `Game.speakerFor` builds it. `compose` adds an opener and
  an aside by how chatty someone is; `fits` is the one place conditions are checked. New
  things people can say are new pools (or new `When` conditions), never new code paths; a
  new variable goes in `varsFor` or `speakerFor` and is guarded with `needs`/`lacks`.
  `tests/dialogue.test.ts` sweeps whole cities for holes (`{...}` left unfilled, empty
  lines), so a pool that can come up empty for some speaker fails there. Combine conditions
  with `both` (it adds `needs`/`lacks` up; it never replaces them). Personality comes through
  the vars: a gang's own slang (`gangLexicon`, over the gang voice), a street name
  (`handleOf`, on its own stream: most gangers, a few others, corpos never; checked against
  the wiki so none is canon), what they want out of life (`dreamOf`, `dream<Kind>`, the
  `dream` topic and a `dream` fact), the `views` topic on the corps and the city, their age
  bracket, their home, their hangout, their boss and years at work, their district
  (`inWatson`…). Loosely-fitting lines can be `vague` (they give way to ones that say more).
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
  live, a ganger glad to run down rivals); `approach` is per way of starting a chat
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
  `Person.hiredOn`, so `bossOf` never makes a hire the boss), gangs, `Person.hurtUntil`
  (laid up at home in `whereIs`) and `Person.diedOn` (the dead are nowhere, never live a day
  or spend a cent, and anyone dead who meant to come collect never comes). The changes are
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
  (and a ganger on their turf with the help, rivals with each other) with a phrase from
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
  rest from the gang's treasury. Every storefront takes a day's walk-in trade (drawn once per
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
  up in each community's style and must never be a real character's (`tests/people.test.ts`
  checks a few).
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
  date). `Game.romanceWith(id, now)` is what the card's ♥ offers (`RomanceMove`); `askOut`
  (a yes takes `drawn`, free, warm or better, `ask.spark` and `ask.rapport`; pressing like any
  ask), `date` (an evening by `date.from`/`to`, somewhere with a food menu, not at their work,
  once a clock day, paying for two of their favorite if it's on, else the cheapest drink),
  `makeOfficial` (`official.dates` and `official.spark`) and `endRomance` (the `dumped`
  numbers, with their people by closeness). Flirting in front of the one the player is seeing
  is `jealous` (a `cheated` memory); they end it themselves on the next talk when the spark
  is under `endAt` or they've caught the player `cheats` times (`LINES.romance.theyEnd`,
  `fizzled`/`caught`). One at a time: `liveUntil` takes the player's partner as `spokenFor`,
  so life never pairs them off, and pairs only people drawn to each other; a partner who dies
  ends it. Lines are `LINES.romance`, `LINES.approaches.flirt`, `LINES.you.askOut`/`date`/
  `official`/`endIt`, and memory lines for `date`, `dumped` and `cheated`.
- `src/ui/people.ts` is the overlay (a `MapOverlay` off the panel's **People** action); the
  game decides who is here and what the actions do. A person's card is deliberately spare:
  a header whose facts line unfolds (`factsOpen`) into everything known and their web, in
  the transcript's place; the transcript (your lines after a `›`, theirs bare, the notes
  small and colored by tone); one command row (Talk, which unfolds the ways in, Ask, Give,
  Chop, Work, ♥ for the heart's moves, `⋯` for the hostile acts, each only when it can be
  done; ♥ shows on the card of the one the player is seeing even when they're not here, to
  end it by message)
  whose choices (`Picker`) unfold only while open; keep new things to do with a person
  behind a command, not as another row, and new things to know behind the facts line. Lines
  a person says use the `talk` tone, which the feed skips while the card is open.

## Work

Eateries and clothing stores hire; the player climbs a ladder of rungs at one place at a time:

- `src/engine/jobs.ts` is the engine: `bossOf(building, population)` (the worker whose role
  says they run it, else the first one; every storefront has exactly one), `bossAt(person)`
  (the hiring storefront they run, if any), `ladderFor(building)` (by category, from
  `JOBS.ladders`), `rungOf`/`nextRung`/`canPromote` (trust against the next rung's `at`, and
  the boss's stance in `promoteAt`), `shiftOpen(hour)` and `shiftPay(rung, quality)`. The
  numbers (rungs, pay, energy, hours, tiers, trust and rapport per shift) are in
  `src/data/jobs.ts`; a new kind of place that hires is another ladder there, keyed by
  building category.
- `Game` keeps the job (`JobState`: building, rung, trust, shifts, the clock day of the last
  shift; saved as `job`, dropped when the building is gone or no longer hires).
  `Game.jobStatus(now)` is where it stands (rung, next rung, pay, `here`, `blocked`: away,
  done today, or closed); `Game.workWith(id)` says what a person's card offers (`hire` for a
  boss, `quit` for the player's own boss); `Game.askForWork(id, now)` is an ask like any
  other (`openness` with the `hire` cost, pressing, the mask's own refusal, no second job);
  `Game.work(now)` is a shift (energy through `spendEnergy`, pay to the account, trust,
  `JOBS.rapport` with the boss and `JOBS.rep` with the place, the boss's line if they're
  about, and the promotion when `canPromote`); `Game.quit(now)`; a private `checkFired(now)`
  lets the player go once the place bars them (called after a robbery or an insult lands).
  Everything it says comes from `LINES.work` and `LINES.you.work`/`quit`, with `{title}`,
  `{work}` and `{pay}` in the speaker's vars; the event is `jobChanged`.
- The UI: a boss's card gets a **Work** command (`Picker` `work`: an `Ask for work` or `Quit`
  chip, actions `hire`/`quit`); the panel inside the workplace gets a **Work** action
  (`ActionId` `work`) whose subtitle is the pay and energy, or why not now; the status
  drop-down names the job. People's troubles to help with are not here yet: when they are,
  they hang off the same card, behind a command.

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
name; the address above it says only the district, and the clock only the time of day.
Nothing else on the screen repeats them: the panel's kicker says what's here ("You are
here · Restaurant", "Inside · Block G1"), never the district, and has no title inside a
building or at a place (the target view keeps its own, with the district, since it's
elsewhere). The energy bar has no words: one line under it (`src/ui/status.ts`, filled by
`showStatus` in `main.ts` on every tick) says the figure, the level, when the next point
comes, and anything the matter (drunk, masked, the job's rung); tapping it unfolds
everything else about the player: experience, charisma, eddies and the bank, the pass, the
job, the condition, the mask, every reputation, the map count, the weather, the date, and
last the **Settings** link (the drop-down's `foot`, which `StatusPanel.render` keeps at the
bottom). Anything new the player should know about themselves goes in there as a row, not
on the header, the map's head (the save light and the one button: the inventory, with the
cash on it) or the People overlay's strip (only what people here can see: the mask). The
map has no footer; it zooms by pinch, scroll or a tap on a block, and its only button, the
one that finds the player (`CityMap`'s `updateControls`), shows while they're off the
screen. Buttons go away when they can, not into a corner.

## The panel under the map

`.place` has one fixed height per layout (`src/style.css`), so the map stage never resizes
as its text changes or types out: anything longer scrolls inside `.place-text`. Keep it that
way when adding to the panel; the map re-renders (and re-clamps its camera) on every resize.
Inside a building, leaving is the panel's corner button (`closable` with a `closeLabel`), so
the action row keeps to three buttons at most and their words fit a phone.

## Overlays

Every overlay (`MapOverlay` in `src/ui/overlay.ts`: inventory, settings, people, menu) lies
over the map and the panel under it, and its header is one `.overlay-strip`: what it is, a
count or a detail, and the close. Don't put the place's name or district in one; the sign
above has it. Phone taps need room: chips and commands are at least 36px tall, and the
panel's buttons share their row (`flex: 1`) with one-line labels, so keep subtitles short.

## Settings

`src/ui/settings.ts` is the settings overlay: **You** (the pronouns the player goes by, three
choices, `onPronouns`), then the save: restart this city, or erase the save and start a new
one, each asking first. New options go in it as their own groups.

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
