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
  (their markers show through the fog). The header counts how much you've mapped.
- **Buildings**: every block is filled with its own buildings, zoned by district: corporate
  towers downtown, apartment blocks and storefronts in Watson, factories and warehouses in
  Santo Domingo, derelicts in Pacifica, shacks and containers out in the Badlands, plus parks,
  plazas and parking lots. They're kept simple: they stand up off the map with lit windows,
  neon edges, shop signs, holo-ads and red warning lights on the towers.
- **Zoom**: drag to pan; pinch, scroll or use the **+ / −** buttons to zoom; the target button
  flies back to where you are. Zoomed out, tapping a block flies in to it. Close in, tapping a
  building picks it out and the panel shows its name, block address and size. Buildings don't
  do anything yet; they're there for what comes next.
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
            trip planning on the real clock, the wallet and pass, discovery, ambient chatter,
            the save format. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts), and travel times and
            prices (travel.ts).
  ui/       City map (camera, gestures, routes, markers), city renderer (draw-city.ts:
            ground, sea, buildings), place panel, transmissions, HUD, typewriter, markup parser,
            the save slot in local storage.
  fx/       Effects: weather particles, screen glitch/shake/flash, glitch text, district colors.
  main.ts   Wires engine events to the UI and effects.
tests/      Vitest unit tests.
```

| Game event | What the player sees |
|---|---|
| Picking somewhere | Its marker lights up, the walk there is drawn along the streets, and the NCART stations a ride would use glow |
| Travelling | Your marker moves along the route in real time, lighting the path behind it, with a countdown in the panel |
| Arriving somewhere | Signal-tear glitch, neon sign flickers on, colors crossfade to the district palette, weather changes, the panel rescans |
| Discovering places | Fog lifts, new markers and routes appear, districts light up and get their names |
| Ambient line with an effect | e.g. lightning flashes the screen and the sign; a bass drop shakes the bar |
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
  `{corp}` and `{shop}`).

A description is one sentence from the kind plus one mood sentence from the district, and has
to fit in 160 characters, so keep sentences short. Add a new kind to `KINDS`, then list it in
the `kinds` of every district it can appear in. `npm test` generates 500 cities and checks that
every one is connected, has every place on its own street corner, routes that follow the
streets, a coastline that never floods a place, unique names and descriptions that fit, and
buildings that stay off the streets, out of the sea and out of each other's way.

Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
