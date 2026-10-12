import type { District, Location, Theme } from '../engine/types';

const STREETS: Theme = { primary: '#00f0ff', secondary: '#ff2a6d' };

/** A location's own lighting wins over its district's. Out of every district, plain street neon. */
export function resolveTheme(district: District | null, location?: Location | null): Theme {
  return { ...(district?.theme ?? STREETS), ...location?.theme };
}

/**
 * Pushes the palette into CSS custom properties. They're registered with @property
 * in style.css, so every glow, border and highlight crossfades to the new colors.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement.style;
  root.setProperty('--primary', theme.primary);
  root.setProperty('--secondary', theme.secondary);
}
