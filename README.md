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

- **City map**: tap any place you know about to travel there. A tracer runs along the
  route, then you arrive. You start knowing only your surroundings; every arrival reveals
  the places its routes lead to. The header counts how much of the city you've mapped.
- **Location card**: a one- or two-sentence description of where you are.
- **Feed**: idle chatter from the city, warnings, and a marker each time you arrive somewhere.
- **New city**: generates a fresh city (tap twice to confirm).

Each city has a **seed**, shown under the map and in the page address (e.g. `#7f3a29c1`).
Opening the game with the same seed rebuilds exactly the same city, so you can share one.

There's no typing. On a keyboard, Tab moves between places on the map and Enter travels.

## How it's built

The game logic never touches the screen. It announces what happens as events, and the
effects layer decides how that should look:

```
src/
  engine/   Game rules and state: the city generator, seeded random numbers, travel and
            discovery, ambient chatter. No DOM, fully unit-tested.
  data/     The content the generator builds cities from (city.ts).
  ui/       City map, location card, event feed, HUD, typewriter, markup parser.
  fx/       Effects: weather particles, screen glitch/shake/flash, glitch text, district colors.
  main.ts   Wires engine events to the UI and effects.
tests/      Vitest unit tests.
```

| Game event | What the player sees |
|---|---|
| Travelling | A tracer races along the route on the map, lighting the path behind it |
| Arriving somewhere | Signal-tear glitch, neon sign flickers on, colors crossfade to the district palette, weather changes, the card rescans |
| Discovering places | New markers and routes appear; districts light up and get their names |
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
every one is connected, has no crossing streets, unique names and descriptions that fit.

Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
