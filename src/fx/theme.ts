import type { District, Location, Theme } from '../engine/types';

/** A location's own lighting wins over its district's. */
export function resolveTheme(location: Location, district: District): Theme {
  return { ...district.theme, ...location.theme };
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
