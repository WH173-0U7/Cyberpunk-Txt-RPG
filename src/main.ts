import './style.css';
import { CITY } from './data/city';
import { Game } from './engine/game';
import { generateWorld } from './engine/generate';
import { randomSeed } from './engine/rng';
import type { District, Location } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { Hud } from './ui/hud';
import { CityMap } from './ui/map';
import { PlacePanel } from './ui/place';
import { Transmissions } from './ui/transmissions';

function $<T extends Element = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const weather = new WeatherFx($<HTMLCanvasElement>('#weather'), reducedMotion);
const screen = new ScreenFx({ app: $('#app'), flash: $('#flash') }, reducedMotion);
const glitchText = new GlitchText(reducedMotion);
const registerGlitch = (el: HTMLElement, text: string) => glitchText.register(el, text);
const hud = new Hud({ sign: $('#hud-sign'), path: $('#hud-path'), weather: $('#hud-weather'), clock: $('#hud-clock') });
const mapStage = $('#map-stage');
const seedLabel = $('#map-seed');
const newCityButton = $<HTMLButtonElement>('#new-city');

const transmissions = new Transmissions({ root: $('#transmissions'), announcer: $('#announcer') }, registerGlitch, reducedMotion);

const place = new PlacePanel(
  {
    root: $('#place'),
    beam: $('#scan-beam'),
    kicker: $('#place-kicker'),
    title: $('#place-title'),
    meta: $('#place-meta'),
    description: $('#place-desc'),
    actions: $('#place-actions'),
    travel: $<HTMLButtonElement>('#place-travel'),
    close: $<HTMLButtonElement>('#place-close'),
  },
  {
    onTravel: () => {
      const id = map.selection;
      if (id) void travelTo(id);
    },
    onClose: () => select(null),
    onGlitchText: registerGlitch,
    announce: (text) => transmissions.announce(text),
  },
  reducedMotion,
);

const map = new CityMap(
  {
    stage: mapStage,
    city: $<HTMLCanvasElement>('#map-city'),
    routes: $<SVGSVGElement>('#map-routes'),
    nodes: $('#map-nodes'),
    sweep: $('#map-sweep'),
    tracer: $('#map-tracer'),
    progress: $('#map-progress'),
    coords: $('#map-coords'),
  },
  {
    onSelect: (id) => select(id),
    onTravel: (id) => void travelTo(id),
  },
  reducedMotion,
);

let game: Game;
let traveling = false;
let lastActivity = performance.now();

function districtOf(location: Location): District {
  const district = game.world.districts[location.district];
  if (!district) throw new Error(`Unknown district "${location.district}"`);
  return district;
}

/** Picks a destination on the map (null: back to where you are). */
function select(id: string | null): void {
  lastActivity = performance.now();
  const route = id ? game.routeTo(id) : null;
  const destination = id ? game.world.locations[id] : undefined;
  if (!id || id === game.location.id || !route || !destination) {
    map.select(null);
    place.showCurrent(game.location, districtOf(game.location));
    return;
  }
  map.select(id, route);
  place.showDestination(destination, districtOf(destination), route.length - 1, game.mapState.visited.has(id));
}

/** Animates the trip on the map, then arrives. */
async function travelTo(id: string): Promise<void> {
  const route = game.routeTo(id);
  if (traveling || !route) return;
  traveling = true;
  lastActivity = performance.now();
  place.setTraveling(true);
  const trip = game;
  await map.animateRoute(route);
  // A new city may have been generated while the tracer was moving.
  if (trip === game) game.travel(id);
  place.setTraveling(false);
  traveling = false;
}

// Game → presentation. The engine only emits events; every visual reaction lives here.
function wire(g: Game): void {
  g.events.on('output', ({ text, tone }) => {
    transmissions.push(text, tone);
    if (tone === 'error') screen.nudge(mapStage);
  });

  g.events.on('locationChanged', ({ from, to, district }) => {
    const theme = resolveTheme(to, district);
    applyTheme(theme);
    weather.setWeather(to.weather);
    weather.setTint(theme.primary);
    hud.setLocation(to.name, district.name, to.weather);
    place.showCurrent(to, district);
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
  transmissions.clear();
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

// Escape drops the current selection.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && map.selection) select(null);
});

const seedInAddress = location.hash.slice(1).toLowerCase();
startCity(/^[0-9a-f]{8}$/.test(seedInAddress) ? seedInAddress : randomSeed());

// The city keeps talking when the player goes quiet.
function scheduleAmbient(): void {
  setTimeout(
    () => {
      const idleFor = performance.now() - lastActivity;
      if (idleFor > 12_000 && transmissions.idle && !traveling && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
