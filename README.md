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
different places in them, different names, weather and streets.

- **City map**: a street grid of blocks, parks, desert and coastline, tinted by district.
  Unexplored areas sit under fog that lifts around everywhere you've been, and every arrival
  reveals the places its streets lead to. The header counts how much you've mapped.
- **Travel**: tap a place to select it. The panel under the map shows how far it is and
  the route lights up; tap **Travel** (or the place again) and a tracer runs along the
  streets before you arrive.
- **Panel**: where you are and what it's like, or the destination you've picked.
- **Transmissions**: the city's chatter types across the top of the map, then fades.
- **New city**: generates a fresh city (tap twice to confirm).

Each city has a **seed**, shown under the map and in the page address (e.g. `#7f3a29c1`).
Opening the game with the same seed rebuilds exactly the same city, so you can share one.

There's no typing. On a keyboard, Tab moves between places on the map, Enter selects and
travels, and Esc clears the selection.

## How it's built

The game logic never touches the screen. It announces what happens as events, and the
effects layer decides how that should look:

```
src/
  engine/   Game rules and state: the city generator, seeded random numbers, travel and
            discovery, ambient chatter. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts).
  ui/       City map (canvas city, routes, markers), place panel, transmissions, HUD,
            typewriter, markup parser.
  fx/       Effects: weather particles, screen glitch/shake/flash, glitch text, district colors.
  main.ts   Wires engine events to the UI and effects.
tests/      Vitest unit tests.
```

| Game event | What the player sees |
|---|---|
| Picking a destination | Its marker lights up and the route there is drawn along the streets |
| Travelling | A tracer races along the streets, lighting the path behind it |
| Arriving somewhere | Signal-tear glitch, neon sign flickers on, colors crossfade to the district palette, weather changes, the panel rescans |
| Discovering places | Fog lifts, new markers and routes appear, districts light up and get their names |
| Ambient line with an effect | e.g. lightning flashes the screen and the sign; a bass drop shakes the bar |
| `{g\|word}` in any text | The word tears and scrambles every few seconds |

Effects that rely on motion are toned down when the OS "reduce motion" setting is on.

## Adding content

Cities are built from the pools in [`src/data/city.ts`](src/data/city.ts):

- **Districts** have colors, weather options, neighborhood names, the kinds of place they
  can contain, mood sentences and ambient lines (separate indoor and outdoor sets).
- **Kinds of place** (bar, ripperdoc, night market, rooftop, nomad camp…) have name templates,
  description sentences and ambient lines. In names, `{area}` becomes one of the district's
  neighborhoods and `{n}` a small number: `{area} Night Market` → `Kabuki Night Market`.

A description is one sentence from the kind plus one mood sentence from the district, and has
to fit in 160 characters, so keep sentences short. Add a new kind to `KINDS`, then list it in
the `kinds` of every district it can appear in. `npm test` generates 500 cities and checks that
every one is connected, has every place on its own street corner, routes that follow the
streets, a coastline that never floods a place, unique names and descriptions that fit.

Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
