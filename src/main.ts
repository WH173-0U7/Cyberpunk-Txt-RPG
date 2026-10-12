import './style.css';
import { CITY } from './data/city';
import { Game } from './engine/game';
import { generateWorld } from './engine/generate';
import { randomSeed } from './engine/rng';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { Feed } from './ui/feed';
import { Hud } from './ui/hud';
import { CityMap } from './ui/map';
import { SceneView } from './ui/scene';

function $<T extends Element = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const weather = new WeatherFx($<HTMLCanvasElement>('#weather'), reducedMotion);
const screen = new ScreenFx({ app: $('#app'), flash: $('#flash') }, reducedMotion);
const glitchText = new GlitchText(reducedMotion);
const hud = new Hud({ sign: $('#hud-sign'), path: $('#hud-path'), weather: $('#hud-weather'), clock: $('#hud-clock') });
const mapStage = $('#map-stage');
const seedLabel = $('#map-seed');
const newCityButton = $<HTMLButtonElement>('#new-city');

const feed = new Feed({ log: $('#log'), announcer: $('#announcer') }, { onGlitchText: (el, text) => glitchText.register(el, text) });

const sceneView = new SceneView(
  { beam: $('#scan-beam'), text: $('#scene-text') },
  {
    onGlitchText: (el, text) => glitchText.register(el, text),
    announce: (text) => feed.announce(text),
  },
  reducedMotion,
);

const map = new CityMap(
  {
    stage: mapStage,
    zones: $('#map-zones'),
    routes: $<SVGSVGElement>('#map-routes'),
    nodes: $('#map-nodes'),
    sweep: $('#map-sweep'),
    tracer: $('#map-tracer'),
    progress: $('#map-progress'),
    coords: $('#map-coords'),
  },
  { onTravel: (id) => void travelTo(id) },
  reducedMotion,
);

let game: Game;
let traveling = false;
let lastActivity = performance.now();

/** Animates the trip on the map, then arrives. */
async function travelTo(id: string): Promise<void> {
  const route = game.routeTo(id);
  if (traveling || !route) return;
  traveling = true;
  lastActivity = performance.now();
  feed.skipTyping();
  const trip = game;
  await map.animateRoute(route);
  // A new city may have been generated while the tracer was moving.
  if (trip === game) game.travel(id);
  traveling = false;
}

// Game → presentation. The engine only emits events; every visual reaction lives here.
function wire(g: Game): void {
  g.events.on('output', ({ text, tone }) => {
    feed.print(text, tone);
    if (tone === 'error') screen.nudge(mapStage);
  });

  g.events.on('locationChanged', ({ from, to, district }) => {
    const theme = resolveTheme(to, district);
    applyTheme(theme);
    weather.setWeather(to.weather);
    weather.setTint(theme.primary);
    hud.setLocation(to.name, district.name, to.weather);
    sceneView.show(to);
    feed.divider(to.name);
    if (from) screen.glitch();
  });

  g.events.on('mapChanged', (state) => map.update(state));

  g.events.on('fx', ({ effect }) => {
    screen.play(effect);
    if (effect === 'lightning') hud.flickerSign();
  });
}

/** Generates a city from the seed and drops the player into it. */
function startCity(seed: string): void {
  game = new Game(generateWorld(seed, CITY));
  wire(game);
  feed.clear();
  map.setWorld(game.world);
  seedLabel.textContent = `Seed ${seed.toUpperCase()}`;
  try {
    // Put the seed in the address so the same city can be reopened or shared.
    history.replaceState(null, '', `#${seed}`);
  } catch {
    // Some hosts don't let the page change its address; the game works without it.
  }
  game.start();
}

// A new city takes two taps, so a stray one can't throw away the current city.
let confirmTimer: number | undefined;
function resetNewCityButton(): void {
  window.clearTimeout(confirmTimer);
  confirmTimer = undefined;
  newCityButton.textContent = 'New city';
  newCityButton.classList.remove('is-armed');
}
newCityButton.addEventListener('click', () => {
  if (confirmTimer === undefined) {
    newCityButton.textContent = 'Tap to confirm';
    newCityButton.classList.add('is-armed');
    confirmTimer = window.setTimeout(resetNewCityButton, 3000);
    return;
  }
  resetNewCityButton();
  lastActivity = performance.now();
  screen.glitch();
  startCity(randomSeed());
});

const seedInAddress = location.hash.slice(1).toLowerCase();
startCity(/^[0-9a-f]{8}$/.test(seedInAddress) ? seedInAddress : randomSeed());

// The city keeps talking when the player goes quiet.
function scheduleAmbient(): void {
  setTimeout(
    () => {
      const idleFor = performance.now() - lastActivity;
      if (idleFor > 12_000 && feed.idle && !traveling && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
