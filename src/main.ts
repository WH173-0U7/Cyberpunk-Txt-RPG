import './style.css';
import { WORLD } from './data/world';
import { Game } from './engine/game';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { Hud } from './ui/hud';
import { Terminal } from './ui/terminal';

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
const prompt = $<HTMLFormElement>('#prompt');

let lastActivity = performance.now();

const terminal = new Terminal(
  { log: $('#log'), form: prompt, input: $<HTMLInputElement>('#command'), announcer: $('#announcer') },
  {
    onCommand: (input) => {
      lastActivity = performance.now();
      game.handle(input);
    },
    onGlitchText: (el, text) => glitchText.register(el, text),
  },
);

// Game → presentation. The engine only emits events; every visual reaction lives here.
game.events.on('output', ({ text, tone }) => {
  terminal.print(text, tone);
  if (tone === 'error') screen.nudge(prompt);
});

game.events.on('locationChanged', ({ from, to, district }) => {
  const theme = resolveTheme(to, district);
  applyTheme(theme);
  weather.setWeather(to.weather);
  weather.setTint(theme.primary);
  hud.setLocation(to.name, district.name, to.weather);
  if (from) screen.glitch();
});

game.events.on('fx', ({ effect }) => {
  screen.play(effect);
  if (effect === 'lightning') hud.flickerSign();
});

game.events.on('clear', () => terminal.clear());

game.start();

// The city keeps talking when the player goes quiet.
function scheduleAmbient(): void {
  setTimeout(
    () => {
      const idleFor = performance.now() - lastActivity;
      if (idleFor > 12_000 && terminal.idle && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
