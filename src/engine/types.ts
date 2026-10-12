/** Weather drives the particle layer behind the UI. */
export type Weather = 'rain' | 'drizzle' | 'dust' | 'haze' | 'clear';

/** Screen-level effects that game content can trigger. */
export type FxName = 'glitch' | 'shake' | 'flash' | 'lightning';

/** Neon colors (6-digit hex) used for glow, highlights and particles. */
export interface Theme {
  primary: string;
  secondary: string;
}

/** Map coordinates. Both axes run 0–100; the map stretches them to fit the screen. */
export interface Point {
  x: number;
  y: number;
}

export interface District extends Point {
  id: string;
  name: string;
  theme: Theme;
}

/** Flavor text that plays while the player is idle, optionally firing an effect. */
export type AmbientLine = string | { text: string; fx: FxName };

export interface Location extends Point {
  id: string;
  name: string;
  /** What sort of place this is, e.g. "bar" or "ripperdoc". */
  kind: string;
  district: string;
  weather: Weather;
  /** Overrides the district colors, e.g. for an interior with its own lighting. */
  theme?: Partial<Theme>;
  /** One or two sentences. */
  description: string;
  /** Ids of the locations a route leads to directly. */
  links: string[];
  ambient: AmbientLine[];
}

export interface World {
  /** Regenerating from this seed rebuilds exactly the same city. */
  seed: string;
  start: string;
  /** System lines shown while the terminal boots. */
  intro: string[];
  welcome: string;
  districts: Record<string, District>;
  locations: Record<string, Location>;
}

/** What the player knows about the city. */
export interface MapState {
  current: string;
  /** Places the player has been to (or passed through). */
  visited: ReadonlySet<string>;
  /** Places the player knows exist: everything visited plus its neighbors. */
  discovered: ReadonlySet<string>;
}

/** How a feed message should be presented. */
export type Tone = 'narrative' | 'system' | 'ambient' | 'error';

/** Everything the engine announces. The UI and effects layers listen to these. */
export type GameEvents = {
  /** A message for the event feed. */
  output: { text: string; tone: Tone };
  /**
   * The player arrived somewhere. `route` runs from where they were to where they are now
   * (just the start location when the game begins, when `from` is null).
   */
  locationChanged: { from: Location | null; to: Location; district: District; route: string[] };
  /** The player's knowledge of the map changed. */
  mapChanged: MapState;
  fx: { effect: FxName };
};
