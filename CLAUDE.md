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

Everything the player owns is in a pocket of something worn; food, drink, credchips and
clothing are the items so far:

- An `Item` has a `kind` (`ItemKind`: weapon, attachment, cyberware, quickhack, clothing,
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
  swap is off. A rack (`Game.menu()` at a store) sells garments as `clothing` menu items at
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
- `src/data/items.ts` names each kind and says what goes in it (the order items are listed
  in within a pocket). Real items take their names and details from the wiki and the TCG.
- `src/ui/inventory.ts` shows a page at a time: the outfit (a row per slot, then the bags),
  or inside one pocket (its pockets' load, the items in it with Eat/Drink/Wear/Drop, the
  pockets inside it as rows that open, and figures for the bills and the coins). `main.ts`
  keeps the path of pockets opened; what using or wearing something does is `Game`'s
  business. Weight has no effect on the player yet; `Game.carry()` has the total for when it
  does.

## People

Every city has a population, made up for its seed in `Game`'s constructor (`generatePeople`
in `src/engine/people.ts`, from `src/data/people.ts`): it never touches the city itself, so
it needs no generator bump. The pieces:

- A `Person` has a home, a job (`building` null for freelance work), maybe a `gang`,
  `traits`, `likes` (a dish, a drink, a `hangout` spot), `hates` (a gang) and `eddies`.
  `Tie`s link people both ways: `to` is `from`'s `kind` (spouse, parent, uncle, friend, crew,
  coworker…; `INVERSE` gives the other side). `whereIs` puts a person somewhere by the clock
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
  told of; which `facts` the player has: name, job, age, home, likes, hates, nature; and
  the `log` of what was said, the last `LOG_CAP` lines) and `links` (what the player knows
  of a tie, keyed `a|b`; `kind` null for "connected somehow", `'none'` for "asked, and
  they'd never heard of them"). The UI shows a person only through `Game.describe` (name
  or their look, and the facts known), `standingWith` (web) and `conversation`, never the
  `Person` or the population's ties directly; new ways of finding things out go through
  `learnOf`, `learnFact` and `learnLink` (`Game.look` for what's plain to see, the topics
  in `talk`, `Game.ask` and `Game.askFact`), and everything said goes through `logLine`.
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
  lines), so a pool that can come up empty for some speaker fails there.
- Whether someone answers is `openness` (engine) with the numbers in `SOCIETY.openness`:
  stance, charisma level and traits against the cost of what's asked (`Asked`: a fact, a
  topic, or `chop`, a favor). A no is written on their `Standing.refused`; asking again
  within the talk cooldown is pressing and costs rapport. Anything new the player can want
  from someone gets a cost there.
- Gangs are canon (wiki): keep their turf, looks and rivalries true to it. Names are made
  up in each community's style and must never be a real character's (`tests/people.test.ts`
  checks a few).
- `src/ui/people.ts` is the overlay (a `MapOverlay` off the panel's **People** action); the
  game decides who is here and what the actions do. A person's card is deliberately spare:
  header, transcript, one command row whose choices (`Picker`) unfold only while open; keep
  new things to do with a person behind a command, not as another row. Lines a person says
  use the `talk` tone, which the feed skips while the card is open.

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

## The panel under the map

`.place` has one fixed height per layout (`src/style.css`), so the map stage never resizes
as its text changes or types out: anything longer scrolls inside `.place-text`. Keep it that
way when adding to the panel; the map re-renders (and re-clamps its camera) on every resize.

## Overlays

Every overlay (`MapOverlay` in `src/ui/overlay.ts`: inventory, settings, people, menu) lies
over the map and the panel under it, and its header is one `.overlay-strip`: what it is, a
count or a detail, and the close. Don't put the place's name or district in one; the sign
above has it. Phone taps need room: chips and commands are at least 36px tall, and the
panel's buttons share their row (`flex: 1`) with one-line labels, so keep subtitles short.

## Settings

`src/ui/settings.ts` is the settings overlay. It only looks after the save for now: restart
this city, or erase the save and start a new one, each asking first. New options go in it
as their own groups.

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
- Merging to `main` deploys to GitHub Pages (https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/).
