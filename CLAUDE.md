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

The inventory overlay is in place, with nothing in it yet:

- An `Item` has a `kind` (`ItemKind`: weapon, attachment, cyberware, quickhack, clothing,
  consumable, shard, junk, component, after the wiki's 2077 item types), a name and a count.
  `Game.inventory` is what the player carries; it's saved as `items`. Giving and taking items
  goes in `Game`.
- `src/data/items.ts` names each kind and says what goes in it; the overlay lists them in
  that order, but only the kinds the player carries (no empty placeholders). Real items take their names and details from the wiki and the TCG (above).

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

## Settings

`src/ui/settings.ts` is the settings overlay (over the map, like the inventory; both are a
`MapOverlay`). It only looks after the save for now: restart this city, or erase the save
and start a new one, each asking first. New options go in it as their own groups.

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
