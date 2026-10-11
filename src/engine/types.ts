export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

/** Weather drives the particle layer behind the terminal. */
export type Weather = 'rain' | 'drizzle' | 'dust' | 'haze' | 'clear';

/** Screen-level effects that game content can trigger. */
export type FxName = 'glitch' | 'shake' | 'flash' | 'lightning';

export const FX_NAMES: readonly FxName[] = ['glitch', 'shake', 'flash', 'lightning'];

/** Neon colors (6-digit hex) used for glow, highlights and particles. */
export interface Theme {
  primary: string;
  secondary: string;
}

export interface District {
  id: string;
  name: string;
  theme: Theme;
}

/** Flavor text that plays while the player is idle, optionally firing an effect. */
export type AmbientLine = string | { text: string; fx: FxName };

export interface Location {
  id: string;
  name: string;
  district: string;
  weather: Weather;
  /** Overrides the district colors, e.g. for an interior with its own lighting. */
  theme?: Partial<Theme>;
  description: string;
  exits: Partial<Record<Direction, string>>;
  ambient?: AmbientLine[];
}

export interface World {
  start: string;
  /** System lines shown while the terminal boots. */
  intro: string[];
  welcome: string;
  districts: Record<string, District>;
  locations: Record<string, Location>;
}

/** How a block of text should be presented. */
export type Tone = 'narrative' | 'heading' | 'system' | 'ambient' | 'error';

/** Everything the engine announces. The UI and effects layers listen to these. */
export type GameEvents = {
  output: { text: string; tone: Tone };
  locationChanged: { from: Location | null; to: Location; district: District };
  fx: { effect: FxName };
  clear: undefined;
};
