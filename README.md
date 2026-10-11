# Cyberpunk-Txt-RPG
Game designed to be within the universe of cyberpunk 2077, text based RPG, with in depth mechanics.

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
| `npm test` | Runs the unit tests (game logic + world data checks) |
| `npm run typecheck` | Checks the TypeScript for errors |
| `npm run build` | Builds a static site into `dist/` that can be hosted anywhere (e.g. GitHub Pages) |

## Playing

Type commands at the `>` prompt: `look`, `go north` (or just `n`), `exits`, `help`.
`fx glitch`, `fx shake`, `fx flash` and `fx lightning` preview the screen effects.
Click anywhere or press <kbd>Esc</kbd> to skip the typewriter; <kbd>↑</kbd>/<kbd>↓</kbd> recall earlier commands.
If you go quiet for a while, the city starts talking to you.

## How it's built

The game logic never touches the screen. It announces what happens as events, and the
effects layer decides how that should look:

```
src/
  engine/   Game rules and state: parser, commands, events. No DOM, fully unit-tested.
  data/     World content: districts, locations, descriptions, ambient lines.
  ui/       Terminal (typewriter, prompt, history), HUD and the text markup parser.
  fx/       Effects: weather particles, screen glitch/shake/flash, glitch text, district colors.
  main.ts   Wires engine events to the UI and effects.
tests/      Vitest unit tests.
```

| Game event | What the player sees |
|---|---|
| Entering a location | Signal-tear glitch, neon sign flickers on, colors crossfade to the district palette, weather changes |
| An error (bad command, blocked exit) | The prompt jitters and pulses red |
| Ambient line with an effect | e.g. lightning flashes the screen and the sign; a bass drop shakes the bar |
| `{g\|word}` in any text | The word tears and scrambles every few seconds |

Effects that rely on motion are toned down when the OS "reduce motion" setting is on.

## Adding content

Everything lives in [`src/data/world.ts`](src/data/world.ts). To add a location, add an entry to
`locations` with a name, district, weather (`rain`, `drizzle`, `dust`, `haze` or `clear`),
description, exits and optional ambient lines, then link to it from another location's `exits`.
`npm test` will tell you if an exit points nowhere or a place can't be reached.

Text supports inline markup: `{h|highlight}`, `{w|danger}` and `{g|glitch}`.
