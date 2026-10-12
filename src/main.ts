import './style.css';
import { CITY } from './data/city';
import { Game } from './engine/game';
import { GENERATOR_VERSION, generateWorld } from './engine/generate';
import { randomSeed } from './engine/rng';
import { createSave, readSave, resume, type Progress } from './engine/save';
import type { District, Location, MapState, World } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { Hud } from './ui/hud';
import { CityMap } from './ui/map';
import { PlacePanel } from './ui/place';
import { saveSlot } from './ui/save-slot';
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
const saveStatus = $('#save-status');

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
    controls: $('#map-zoom'),
    zoomIn: $<HTMLButtonElement>('#zoom-in'),
    zoomOut: $<HTMLButtonElement>('#zoom-out'),
    zoomHome: $<HTMLButtonElement>('#zoom-home'),
  },
  {
    onSelect: (id) => select(id),
    onTravel: (id) => void travelTo(id),
    onSelectBuilding: (id) => selectBuilding(id),
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

/** Picks out a building on the map (null: back to where you are). */
function selectBuilding(id: string | null): void {
  const building = id ? game.world.buildings.find((b) => b.id === id) : undefined;
  if (!building) {
    select(null);
    return;
  }
  lastActivity = performance.now();
  map.selectBuilding(building.id);
  place.showBuilding(building, game.world.districts[building.district]);
}

/** Animates the trip on the map, then arrives. */
async function travelTo(id: string): Promise<void> {
  const route = game.routeTo(id);
  if (traveling || !route) return;
  traveling = true;
  lastActivity = performance.now();
  place.setTraveling(true);
  await map.animateRoute(route);
  game.travel(id);
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

  g.events.on('mapChanged', (state) => {
    map.update(state);
    save(g.world.seed, state);
  });

  g.events.on('fx', ({ effect }) => {
    screen.play(effect);
    if (effect === 'lightning') hud.flickerSign();
  });
}

/** Saves after every move, and lets the player see that it did. */
function save(seed: string, state: MapState): void {
  const saved = saveSlot.write(createSave(seed, state, GENERATOR_VERSION));
  saveStatus.textContent = saved ? 'Saved' : 'Not saved';
  saveStatus.classList.toggle('is-failed', !saved);
  saveStatus.title = saved
    ? 'Your progress saves on this device after every move.'
    : "This browser won't let the game save (a private window, maybe). Progress will be lost when you leave.";
  if (saved && !reducedMotion) {
    saveStatus.animate(
      [
        { opacity: 1, textShadow: '0 0 8px currentColor' },
        { opacity: 0.6, textShadow: '0 0 0 transparent' },
      ],
      { duration: 1400, easing: 'ease-out' },
    );
  }
}

/** Drops the player into a city: a new game, or a saved one picking up where it left off. */
function begin(world: World, progress?: Progress, notice?: string): void {
  game = new Game(world, progress);
  wire(game);
  map.setWorld(world);
  seedLabel.textContent = `Seed ${world.seed.toUpperCase()}`;
  try {
    // Show the seed in the address, so a new player can be sent to the same city.
    history.replaceState(null, '', `#${world.seed}`);
  } catch {
    // Some hosts don't let the page change its address; the game works without it.
  }
  if (notice) game.say(notice, 'system');
  game.start();
}

/**
 * Picks up the saved game on this device if there is one. Otherwise starts the city in the
 * address (a shared link) or a brand new one.
 */
function boot(): void {
  const saved = readSave(saveSlot.load());
  if (saved) {
    const world = generateWorld(saved.seed, CITY);
    const progress = saved.generator === GENERATOR_VERSION ? resume(world, saved) : null;
    if (progress) begin(world, progress);
    // The game has changed how cities are built since this save, so its places no longer line up.
    else begin(world, undefined, 'Night City has changed since you were last here. Your map starts over.');
    return;
  }
  const seedInAddress = location.hash.slice(1).toLowerCase();
  begin(generateWorld(/^[0-9a-f]{8}$/.test(seedInAddress) ? seedInAddress : randomSeed(), CITY));
}

// Escape drops the current selection; + and - zoom.
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'Escape' && (map.selection || map.buildingSelection)) select(null);
  else if (event.key === '+' || event.key === '=') map.zoomBy(2);
  else if (event.key === '-' || event.key === '_') map.zoomBy(0.5);
});

boot();

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
