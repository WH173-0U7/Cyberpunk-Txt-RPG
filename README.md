# Night City Terminal

A text RPG set in the Cyberpunk 2077 universe. Every game is a whole Night City of its own, with
thousands of people living their own lives in it, a working economy, and you somewhere in the
middle trying to get by. It runs in the browser, it's made for phones, and the text is wrapped in
neon, scanlines, glitches and weather.

**▶ [Play it](https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/)**: the stable release.
**▶ [Try the beta](https://wh173-0u7.github.io/Cyberpunk-Txt-RPG/beta/)**: the next version. It
keeps its own save, so it never touches the stable game's.

## Contents

- [What it is](#what-it-is)
- [Your first ten minutes](#your-first-ten-minutes)
- [The screen](#the-screen)
- [Playing](#playing): [getting around](#getting-around) · [staying alive](#staying-alive) ·
  [money](#money) · [making a living](#making-a-living) · [people](#people) ·
  [trouble](#trouble) · [gear](#gear) · [skills](#skills) · [the city's economy](#the-citys-economy)
- [Saves and seeds](#saves-and-seeds)
- [Controls](#controls)
- [For developers](#for-developers)

## What it is

- **All of Night City, every game.** Every district (Watson, Westbrook, City Center, Heywood,
  Santo Domingo, Pacifica) and every neighborhood in them, roughly where they are on the real
  map, with the Badlands around them. The streets, the weather and most places are new each
  game; the real places come first (the Afterlife, Tom's Diner, Lizzie's Bar, Jig-Jig Street,
  Konpeki Plaza, El Coyote Cojo…), and the NCART uses the real stations and lines.
- **About four and a half thousand people**, each with a name, a family, a home, a job, a
  personality, a gang (for some), favorite food, a hangout and money in their pocket. They keep
  hours on your phone's clock, and they have days of their own: they make friends, fall out,
  marry, get hired and laid off, get robbed, and die.
- **A closed economy.** Every eddie someone spends lands somewhere, and every eddie they're paid
  comes from somewhere. Shops run out of stock, prices climb, wages and rents move, and in hard
  times people borrow from loan sharks, get evicted and turn to crime.
- **Canon first.** Names, places, gangs, corporations, items and slang come from the
  [Cyberpunk Wiki](https://cyberpunk.fandom.com). The prices, times and stats are the game's own.

## Your first ten minutes

1. **Look around.** The map opens on you. Tap a place, a station or a building to see it on the
   panel under the map.
2. **Walk somewhere.** Tap **Walk** (or tap the same thing again). Walking takes real minutes,
   sped up 60× for now while the game is being tested.
3. **Go inside** a storefront. An eatery has a **Menu**, a store a **Shop**. Buy something to
   eat, open the **Inventory** (the button in the map's header, or **I**) and **Eat** it: you get
   hungry, and hungry means less energy.
4. **Meet people.** Inside, **People** lists who's there. Tap someone to open their card,
   **Talk** to them, and **Ask** about them. They tell you more as they get to know you.
5. **Get a job.** Find the boss of a place (their card has a **Work** command) and ask for work.
   Shifts pay on Friday.
6. **Check yourself.** The line under the energy bar says what matters right now. Tap it for
   everything else: skills, money, job, home, reputation, the market.

You start with 50 €$ and the clothes you're wearing.

## The screen

| Where | What it shows |
|---|---|
| **The sign** | Where you are. The address above it is the neighborhood and district (`NCNET://kabuki.watson`), and the clock the time of day. |
| **The energy bar** | Your energy. The line under it gives the figure, your level, when the next point comes, and anything the matter: hungry, resting, drunk, masked, a debt, a shift waiting. Tap it for the **status drop-down**. |
| **The map** | The city, under fog until you've walked it. Pins mark your work, your home and your corner. Drag to pan; pinch or scroll to zoom. |
| **The feed** | The city's chatter, and what happens to you, types across the top of the map. |
| **The panel** | Under the map: where you are or what you've picked, and the actions (**Walk**, **Go inside**, **Menu**, **People**, **Work**…). Inside a building, the corner button leaves. |
| **Overlays** | The inventory, people, menus, the bank, settings and fights open over the map. **×** or **Esc** closes them. |

## Playing

### Getting around

- **Walking** is free and goes anywhere along the streets. Stop partway with **Stop here**, or
  change course by picking somewhere else.
- **The NCART** is quicker. Walk to a station, pick where you're going, and ride. A ride is
  1 €$, or nothing with a monthly pass (20 €$ for 30 days, sold at any station).
- **Real time.** Trips run on your phone's clock and carry on while the game is closed. **For
  testing, everything runs 60× faster** (a 20-minute walk takes 20 seconds); `timeScale` in
  `src/data/travel.ts` sets it.
- **The fog** lifts along the streets you walk and around places you've been, not from the
  train. Arriving somewhere turns up the places its routes lead to.
- **Going inside.** Anything with floors can be entered. Buildings have rooms: a shop's floor,
  its restroom and its back room (staff only); a motel's numbered rooms; an apartment block's
  lobby and floors of units, where you can knock (someone who likes you lets you in). You only
  see who's in the same room as you.
- **Opening hours.** Every storefront keeps its hours on its door ("Open 11:00–23:00"). Shut, it's
  locked, and at closing time you're shown out.

### Staying alive

- **Energy** is what shifts, deals and robberies cost. It comes back a point every 6 minutes,
  even while the game is closed, and starts very low (10). Spending it trains it, slowly: level 2
  alone takes 600 points.
- **Hunger.** A full stomach empties in 20 game-hours, so three or four meals a day keep you fed.
  A meal fills about a third, a Burrito XXL or a pizza nearly half, a snack or a drink a little.

  | Fullness | You're | It costs you |
  |---|---|---|
  | under half | Peckish | nothing yet |
  | under a quarter | Hungry | a quarter of your max energy |
  | under a tenth | Starving | half your max energy, a fifth of your max health |

  Nobody starves to death, and there's no eating past full (a drink still goes down).
- **Rest.** Energy comes back three times as fast in a bed (your own rented unit, or a motel room
  for the night) and half again as fast in a squat. A rented home also raises your max energy.
- **Health** comes back on the clock. Hospitals, street clinics and ripperdocs treat what's
  missing for a fee; pharmacies sell the MaxDoc and the Bounce Back.
- **Trauma Team.** A hospital signs you up for 30 days: Silver (500 €$), Gold (1,500 €$) or
  Platinum (6,000 €$). Go down in a fight on a plan and an AV picks you up before anyone can rob
  you or finish you (not if you're only knocked out cold).
- **Drink** goes to your head: Tipsy, Drunk, Wasted, Blackout drunk. The screen blurs and sways,
  your aim goes, and people notice. It clears a unit an hour.
- **Drugs** you carry can be taken (**Use**). Each does something real for a while (Black Lace
  makes you hard to hurt, Glitter loosens your tongue), each hooks you a little more, and any dose
  can be an overdose.

### Money

- **Eddies (€$)** come as **cash** and an **account**.
  - **Notes** are the wiki's eurodollars: €$1, €$5, €$10, €$20, €$50, €$100 and €$500. Your
    wallet holds 40 of them, whatever they're worth, so big notes carry more. **Coins** are €$1,
    loose in the change pocket and heavy (six grams each).
  - Paying cash, the coins go first, then the notes that cover the rest, exactly if they can, and
    the change comes back in notes and coins, as far as your pockets have room. The inventory's
    wallet page lists every note you carry.
  - People carry real notes too: the poor small ones and a handful of coins, the rich big ones.
  - The **account** is weightless and safe. Chains, luxury places, gear racks and the NCART take
    a transfer from it; everyone else wants cash.
- **Banks** (EuroBank, Asukaga & Finch): deposit your cash (the bank keeps 5% of any coins it
  counts), withdraw bills, or change coins for bills.
- **Credchips** are items with eddies on them, carried in the wallet's four card slots. One taken
  off someone is locked until a netrunner **chops** it, for a quarter of what's on it.
- **Loans.** A bank lends against what your work pays (200 €$ up to 5,000 €$, 15% on top, eight
  weekly installments). Any ganger will lend you their gang's cash at a tenth a week; leave it
  two weeks and someone comes for it. You can lend to people too, and the honest pay you back.
- **Trading** is a skill: what you pay is your Trading against the seller's, so at first you pay
  over the odds. Chains, hospitals and Trauma Team keep their prices.
- **Selling.** A store buys what it deals in (gun shops guns, clothing stores clothes,
  ripperdocs chrome…), for about half what it's worth, more where its shelves are short. A
  pawn shop or a junk shop fences the valuables you take off people, no questions asked.

### Making a living

| Way | How | What it pays | The catch |
|---|---|---|---|
| **A job** | Ask a boss for work; a shift a day in the job's hours, for its energy | 22–110 €$ a shift by rung, more at a luxury place | Gated by the day; miss four rostered days and you're let go |
| **Dealing** | A gang fronts you a package to sell at a corner | A share of each sale, more up the rungs and up the gang's line of drugs | Searches, busts, robbers, rivals, collectors |
| **Robbery** | **Rob** under **⋯** on someone's card, 3 energy; **Search** them after, 1 more | What they're scared into handing over: cash, their credchip, anything worth fencing | They may say no or fight; grudges, the NCPD, their gang, people coming to collect |
| **A business** | Buy a storefront off its boss, or one gone under | What it makes over its reserve, every payday | It can still go under |

- **Work.** Every storefront hires, each kind on a ladder of its own (the dish pit up to line
  cook, barback up to floor manager, cash runner up to branch manager…). Hold as many jobs as fit
  the day (a day job and a night one). Trust earns promotions; experience and a good word start
  you higher elsewhere. Pay comes Friday morning, more at a thriving place. Perks: a fifth off at
  your own counter, a staff meal, a uniform, and from the third rung the keys. About one shift in
  three something happens that wants a choice: a rush, a shoplifter, a gang come for its cut, a
  coworker who needs cover.
- **A home.** **Rent** a unit at an apartment block's door (a week up front), or **Squat** an
  abandoned building or a shack for nothing. A home has a **stash** no robber or search finds;
  a rented one has a bed. Fall three weeks behind and you're out, stash and all.
- **Dealing.** The Tyger Claws, Maelstrom, the Animals, the Scavengers and the Valentinos deal
  their canon product (Glitter, Black Lace, Juice, Deep Dive, 'Dorph) and a line of dearer drugs
  above it. Any member points you to their connect, who fronts you a package to sell at a corner
  on their turf and wants paying back by a day. Climb the rungs for bigger packages and a better
  cut; cut your product to stretch it (and risk hurting someone); run a crew of your own once
  you're a supplier. Watch for undercover officers, robbers and rival gangs.
- **A business.** Buy a storefront off its boss when they'll sell, or one gone under off the
  notice on its shutters. The old boss runs it; out back, its **Books** let you put money in, take
  it out, set its prices (cheap draws custom, dear makes more a sale) or sell it back.

### People

- **Who they are.** Until you're introduced, someone is "a young woman in Valentinos colors".
  Talking gets you their name; **Ask** gets you the rest (work, age, home, tastes, enemies, what
  they want, their type) if they'll tell you, by how they feel about you, your charisma and the
  moment. Their card's **Profile** tab keeps everything you know, and their web of the people you
  know they know.
- **Talking.** **Talk** unfolds the ways in: Chat, Compliment, Joke, Gossip, How are you?, and
  Flirt. Each lands by who they are, and a note under every exchange says how it went and why.
  Every line is put together on the spot, in the speaker's own voice and their gang's slang.
- **Where you stand**: Stranger, Wary, Warm, Friend, Cold, Hostile. Rapport grows with talk and
  gifts (their favorite counts double) and fades if you're gone.
- **They remember.** A robbery, a gift, a joke that landed, the shift you covered, the day you
  walked out, and they bring it up. What they remember changes their prices, how much they tell
  you, whether they'd call the NCPD on you and whose side they take in a fight. They remember
  each other too, and settle scores of their own.
- **Their own lives.** Every day, in every district, things happen between them: shakedowns,
  fights, friendships, romances, weddings, breakups, hires, layoffs, deaths, muggings, evictions.
  It's news, and they tell you about it. The People list shows who's with whom right now.
- **Romance.** Everyone has a heart: whom they're drawn to, the way in that wins them over, the
  look they go for. Flirt, ask them out, take them on dates, make it official. Flirt with someone
  else in front of them and it stings. Set the pronouns you go by in **Settings**.

### Trouble

- **Crossing people.** **Insult**, **Rob** or **Attack** someone (under **⋯** on their card) and
  it spreads: the victim holds a grudge, so do their family, friends, crew and gang, and anyone
  who saw it talks. Whoever has the grudge and the nerve comes for you, hours or a day later, in
  person: it's a fight (the first beat waits for you to see it coming). Run, and they'll be back.
- **Robbery runs on fear.** Their card shows how afraid of you they look (Unafraid up to
  Terrified). A gun scares more than a blade, a blade more than a club, and chrome, a mask, being
  good with what you hold and a name for violence all add to it; their own nerve, a weapon of
  their own, their friends or gang nearby, a crowd, their home turf, and you looking hurt or drunk
  all take it away. An officer is never afraid of you. Unafraid, they say no, and the brave or
  hot-tempered fight. Afraid, they hand over what they think they can get away with: the small
  notes first, swearing that's all, the greedy keeping back more, and the chip and their valuables
  only when they're really scared. For a few minutes after, **Search** them for the rest. The
  more scared they are, the likelier they let you. If not, they pull away, or a hot-tempered one
  swings at you.
- **Masks.** A gas mask, a ballistic mask, a balaclava or a menpō hides your face: what you do
  in it is nobody's doing, until someone who saw it sees the same mask on you again. No counter
  serves a mask, and gangers on their turf don't like one.
- **Fighting.** Each beat you and they both pick a move at once: attack, close in, back off,
  take cover, quickhack, heal, talk them down, or run, against a seven-second clock (longer with a
  Kerenzikov or a Sandevistan). Range matters, chrome counts, and people fight with what they
  carry. You fight to wound unless you say otherwise. Others may throw in, on either side.
- **Knockouts.** A punch or a club can knock someone out cold: then you can rob them of
  everything they carry, or kill them, if nobody stops you first.
- **Losing a fight.** Put down or knocked out, you're at their mercy. They take everything you
  carry (cash, chips, gear; your clothes stay on), unless they were only fighting back and have
  no greed in them. Then they may finish you. That depends on why they came: revenge for a
  killing most of all, then a gang's hunt, a beating, a turf war, a robbery, and least a debt or
  someone you picked a fight with. It also depends on who they are: the hot-tempered, the brave
  and the cold, more; the calm, the timid and the warm, hardly ever. The grudge they hold adds to
  it, and people watching take from it, except on their own turf. An officer never finishes you,
  and nobody does with one around or a friend of yours still standing. If they do, you're dead,
  and Night City starts over. Keep what matters in the bank or your stash, and a Trauma Team plan
  gets you out before anyone can touch you.
- **The NCPD.** No wanted stars: nothing's on record unless someone calls it in. Downtown and
  Westbrook most do, gangers never on their own turf, and nobody in Pacifica or the Badlands,
  where the NCPD doesn't come. A unit counts down on the status line. When it arrives you can
  **Comply** (a fine, maybe a cell), **Run** or **Fight**. A report names you only if someone who
  knew your face called it in; a named report is a warrant.

### Gear

- **Carrying things.** Everything you own is in a pocket of something you wear. Pockets hold so
  many slots and so much weight; bags (a belt pouch up to a backpack and a duffel) carry more.
- **Clothes** are real 2077 pieces in the wiki's six slots and four styles, with their brands.
  Stores sell what the wiki has them selling, at their tier: Jinguji and Avante downtown, the
  Stylishly chain, Saeko's on the Japantown boardwalk, Ded-Zed in Northside, thrift shops.
- **Weapons** are real 2077 guns and blades, checked against the wiki, each store stocking a
  handful at its tier. Ammo is the wiki's four kinds, carried by the round; **Load** a gun from
  your pockets. Long guns and katanas want a bag or a gun case.
- **Cyberware.** Ripperdocs sell chrome and fit it there and then; outlets sell it boxed; deck
  shops sell cyberdecks. Mantis Blades, Gorilla Arms, a Sandevistan, Kiroshi optics, Subdermal
  Armor, a Second Heart…, in the body's ten parts, with 50 capacity for all of it.
- **Quickhacks** (Short Circuit, Overheat, Contagion, Synapse Burnout…) are the **Hack** move in
  a fight once you have a cyberdeck.

### Skills

Every skill starts you off worse than an ordinary person and only past level 4 carries you.

| Skill | Grows with | Does |
|---|---|---|
| **Charisma** | Chats, gifts, answered questions | What people tell you and how much they like you |
| **Trading** | Every purchase and sale | What you pay and what you get |
| **Street Brawler** | Blows landed with fists or blunt weapons | Harder punches, more knockouts |
| **Toughness** | Blows taken, fights survived | Harder to knock out |
| **Weapon levels** | Every shot or swing, for each kind of weapon and each weapon | Damage, aim, and perks at levels 5, 7 and 10 |
| **Dealing** | Sales, packages paid off, rungs climbed | Opens dearer drugs |
| **Cutting** | Every dose cut | Cleaner cuts, fewer bad batches |
| **Energy** | Every point spent | A bigger energy bar |

Everyone else has their own levels in the same things: a ganger fights hard and talks badly, an
old lady the other way round.

### The city's economy

- **Wages** come out of real tills: a shop pays its people (workers first, the boss out of
  what's left), a gang pays its members out of its chest, and the corps, the NCPD and freelancers
  are paid from outside the city.
- **Spending** happens at real places: people buy their week's food at a counter near home, go
  out, shop in their district, feed a habit, and pay rent to whoever owns their home (a
  neighborhood landlord, or a corp).
- **Stock and prices.** Every shop has shelves. Prices climb as they empty (up to two fifths
  over), a slow place on full shelves takes a tenth off, and an eatery's last hour a quarter off.
  Now and then the trucks stop coming to one kind of store in a district.
- **Pay and rent move.** A thriving shop pays its people a little more each payday (up to a
  quarter over), a struggling one less (down to 15% under). A block where everyone paid puts the
  rent up 1% a week; one where more than a tenth fell behind brings it down. Your shifts and your
  rent follow.
- **Hard times.** The broke shoplift, borrow from the gang that runs their turf, get evicted to
  a squat or the street, and mug strangers. A shop that can't pay its people three paydays
  running goes under, and new management opens it again later.
- **Seeing it.** The status drop-down's **Market** row says what's dear or cheap in the district
  and how pay and rents stand; its **News** row and the feed carry the headlines ("Food short in
  Watson"); people complain about it.

## Saves and seeds

- The game **saves on your device after every move** (the light in the map's header says
  **Not saved** if the browser won't allow it, as in a private window). Come back and you pick up
  where you were, and the city has lived the days you were away (up to a month of them).
- Every city has a **seed**, shown in the page address (`#7f3a29c1`). The same seed always builds
  the same city; open a link with a seed and a new player starts there.
- **Settings** (the last row of the status drop-down) has your pronouns, **Restart this city**,
  and **Erase save** for a brand new city.
- If an update changes how cities are built, an older save can't line up with its city any more:
  the game starts that city over and says so.

## Controls

It's all taps; there's no typing. On a keyboard:

| Key | Does |
|---|---|
| **Tab** / **Enter** | Move between places on the map / pick one (again: walk there) |
| **+** / **−** | Zoom |
| **I** | Inventory |
| **Esc** | Close what's open, or clear the pick |

Effects that move the screen are toned down when the system's "reduce motion" setting is on.

## For developers

### Running it

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install      # once
npm run dev      # the game at http://localhost:5173, reloading on every save
```

| Command | What it does |
|---|---|
| `npm test` | The unit tests: game logic, and checks on hundreds of generated cities |
| `npm run typecheck` | TypeScript checks |
| `npm run bench` | Times the slow things (a new game, a reload, a month away, a day) on the biggest cities against the performance budget |
| `npm run build` | A static site in `dist/`; `CHANNEL=beta` builds the beta, with its own save |

### Branches and releases

- New work goes to `beta` by pull request. A push to `beta` or `main` rebuilds both sites (the
  beta under `/beta/`, the stable release at the root) and deploys them.
- A release is `beta` merged into `main`, then the **Release** workflow (Actions tab) run with
  the version (bump `version` in `package.json` with it): it tags `main` and publishes a GitHub
  Release with the built site. Settings says which build you're on.

### How it's built

The game logic never touches the screen: it announces what happens as events, and the screen
decides how that looks.

| Folder | What's in it |
|---|---|
| `src/engine/` | The rules and the state: the city generator, travel, the people and their days, the economy, dialogue, fighting, the NCPD, work, dealing, saves. No DOM, unit-tested. |
| `src/data/` | The content and the numbers: districts and places, food, clothing, weapons, cyberware, drugs, dialogue, prices and tuning. |
| `src/ui/` | The map and its renderer, the fog, the overlays (inventory, people, shop, bank, books, fight, settings), the panel, the status bar. |
| `src/fx/` | Weather particles, glitches, shakes and flashes, district colors. |
| `src/main.ts` | Wires the engine's events to the screen. |
| `tests/` | Vitest tests. |

**[CLAUDE.md](CLAUDE.md)** is the full guide to the code: every system, where it lives, its rules,
and what to keep true when changing it.

### Adding content

- **Canon first.** Names, places, gangs, items and slang come from the
  [Cyberpunk Wiki](https://cyberpunk.fandom.com) (and the [Cyberpunk TCG](https://cyberpunktcg.com)
  for characters, items and art direction), in our own words; numbers are ours. Check a name and
  where it is before adding it.
- **The city**: districts, neighborhoods, real places (`landmarks`), kinds of place and buildings
  are in `src/data/city.ts`; made-up shop names in `src/data/storefronts.ts`.
- **People**: name pools, gangs and turf, jobs and hours in `src/data/people.ts`; everything they
  say in `src/data/dialogue.ts`; how they react and remember in `src/data/society.ts`; their days
  in `src/data/life.ts`.
- **Things**: food in `src/data/food.ts`, clothing in `src/data/clothing.ts`, weapons in
  `src/data/weapons.ts`, cyberware in `src/data/cyberware.ts`, drugs in `src/data/drugs.ts`.
- **The economy's numbers**: `src/data/economy.ts`, `src/data/money.ts`, `src/data/jobs.ts`.
  `tests/balance.test.ts` holds what the player earns against what living costs.
- A change that makes seeds build different places needs `GENERATOR_VERSION` bumped in
  `src/engine/generate.ts` (a test in `tests/save.test.ts` fails as a reminder).
- Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
