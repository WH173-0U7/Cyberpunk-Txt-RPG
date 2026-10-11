import './style.css';
import { WORLD } from './data/world';
import { Game } from './engine/game';
import type { Direction } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { Compass } from './ui/compass';
import { Feed } from './ui/feed';
import { Hud } from './ui/hud';
import { SceneView } from './ui/scene';

function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const game = new Game(WORLD);
const weather = new WeatherFx($<HTMLCanvasElement>('#weather'), reducedMotion);
const screen = new ScreenFx({ app: $('#app'), flash: $('#flash') }, reducedMotion);
const glitchText = new GlitchText(reducedMotion);
const hud = new Hud({ sign: $('#hud-sign'), path: $('#hud-path'), weather: $('#hud-weather'), clock: $('#hud-clock') });
const compassEl = $('#compass');

let lastActivity = performance.now();

const feed = new Feed(
  { log: $('#log'), announcer: $('#announcer') },
  { onGlitchText: (el, text) => glitchText.register(el, text) },
);

/** Every tap or key the player makes goes through here. */
function act(action: () => void): void {
  lastActivity = performance.now();
  feed.skipTyping();
  action();
}

const sceneView = new SceneView(
  {
    card: $('#scene'),
    beam: $('#scan-beam'),
    text: $('#scene-text'),
    inspect: $('#inspect'),
    inspectTitle: $('#inspect-title'),
    inspectText: $('#inspect-text'),
    inspectClose: $<HTMLButtonElement>('#inspect-close'),
    poiBlock: $('#poi-block'),
    pois: $('#pois'),
  },
  {
    onExamine: (id) => act(() => game.examine(id)),
    onGlitchText: (el, text) => glitchText.register(el, text),
    announce: (text) => feed.announce(text),
  },
  reducedMotion,
);

const compass = new Compass(compassEl, {
  onMove: (direction) => act(() => game.move(direction)),
  onLook: () => act(() => game.look()),
});

// Keyboard players: arrow keys move, Escape closes whatever you're examining.
const ARROW_KEYS = new Map<string, Direction>([
  ['ArrowUp', 'north'],
  ['ArrowRight', 'east'],
  ['ArrowDown', 'south'],
  ['ArrowLeft', 'west'],
]);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    sceneView.closeInspect();
    return;
  }
  const direction = ARROW_KEYS.get(event.key);
  if (!direction || event.ctrlKey || event.metaKey || event.altKey) return;
  event.preventDefault();
  act(() => game.move(direction));
});

// Game → presentation. The engine only emits events; every visual reaction lives here.
game.events.on('output', ({ text, tone }) => {
  feed.print(text, tone);
  if (tone === 'error') screen.nudge(compassEl);
});

game.events.on('locationChanged', ({ from, to, district }) => {
  const theme = resolveTheme(to, district);
  applyTheme(theme);
  weather.setWeather(to.weather);
  weather.setTint(theme.primary);
  hud.setLocation(to.name, district.name, to.weather);
  feed.divider(to.name);
  if (from) screen.glitch();
});

game.events.on('scene', (scene) => {
  sceneView.show(scene);
  compass.setExits(scene.exits);
});

game.events.on('examined', ({ poi }) => sceneView.inspect(poi));

game.events.on('fx', ({ effect }) => {
  screen.play(effect);
  if (effect === 'lightning') hud.flickerSign();
});

game.start();

// The city keeps talking when the player goes quiet.
function scheduleAmbient(): void {
  setTimeout(
    () => {
      const idleFor = performance.now() - lastActivity;
      if (idleFor > 12_000 && feed.idle && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
