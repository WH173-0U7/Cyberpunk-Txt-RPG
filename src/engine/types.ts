export type Direction = 'north' | 'east' | 'south' | 'west' | 'up' | 'down';

/** Clockwise, then vertical: the order exits are listed in. */
export const DIRECTIONS: readonly Direction[] = ['north', 'east', 'south', 'west', 'up', 'down'];

/** Weather drives the particle layer behind the UI. */
export type Weather = 'rain' | 'drizzle' | 'dust' | 'haze' | 'clear';

/** Screen-level effects that game content can trigger. */
export type FxName = 'glitch' | 'shake' | 'flash' | 'lightning';

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

/** Something in a location the player can take a closer look at. */
export interface PointOfInterest {
  id: string;
  name: string;
  description: string;
  /** Effect that fires when the player examines it. */
  fx?: FxName;
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
  /** One or two sentences. Detail belongs in points of interest. */
  description: string;
  pois?: PointOfInterest[];
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

export interface ExitView {
  direction: Direction;
  /** Name of the location the exit leads to. */
  name: string;
}

/** What the player can currently see and do. The UI redraws itself from this. */
export interface Scene {
  location: Location;
  district: District;
  exits: ExitView[];
}

/** How a feed message should be presented. */
export type Tone = 'narrative' | 'system' | 'ambient' | 'error';

/** Everything the engine announces. The UI and effects layers listen to these. */
export type GameEvents = {
  /** A message for the event feed. */
  output: { text: string; tone: Tone };
  /** The player arrived somewhere (`from` is null when the game starts). */
  locationChanged: { from: Location | null; to: Location; district: District };
  /** The current scene, sent on arrival and whenever the player looks around. */
  scene: Scene;
  /** The player took a closer look at something. */
  examined: { poi: PointOfInterest };
  fx: { effect: FxName };
};
