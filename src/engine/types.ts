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

export type Side = 'north' | 'east' | 'south' | 'west';

export interface District extends Point {
  id: string;
  name: string;
  theme: Theme;
  /** City blocks, or open desert like the Badlands. */
  terrain: 'city' | 'desert';
}

/** The street grid every location sits on. Positions run 0–100 like map coordinates. */
export interface CityLayout {
  /** Streets running north–south, by x position. */
  avenues: number[];
  /** Streets running east–west, by y position. */
  streets: number[];
  /** The sea along one edge: everything closer than `depth` to that edge is water. */
  coast: { side: Side; depth: number } | null;
}

export type BuildingKind =
  | 'tower'
  | 'apartments'
  | 'megabuilding'
  | 'shops'
  | 'warehouse'
  | 'factory'
  | 'derelict'
  | 'park'
  | 'plaza'
  | 'lot'
  | 'shack'
  | 'container';

/** One building (or open lot) in a city block. Every city generates its own. */
export interface Building {
  id: string;
  /** Grid address of its block: a column letter and a row number, e.g. "D7". */
  block: string;
  district: string;
  kind: BuildingKind;
  /** The kind as players read it, e.g. "Apartment block". */
  kindLabel: string;
  name: string;
  /** 0 for open ground such as parks, plazas and lots. */
  floors: number;
  /** Footprint in map coordinates: top-left corner, width and height. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Flavor text that plays while the player is idle, optionally firing an effect. */
export type AmbientLine = string | { text: string; fx: FxName };

export interface Location extends Point {
  id: string;
  name: string;
  /** What sort of place this is, e.g. "bar" or "ripperdoc". */
  kind: string;
  /** The kind as players read it, e.g. "Night market". */
  kindLabel: string;
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
  welcome: string;
  /** Said instead of `welcome` when a saved game picks up again. */
  welcomeBack: string;
  layout: CityLayout;
  districts: Record<string, District>;
  locations: Record<string, Location>;
  buildings: Building[];
}

/** What the player knows about the city. */
export interface MapState {
  current: string;
  /** Places the player has been to (or passed through). */
  visited: ReadonlySet<string>;
  /** Places the player knows exist: everything visited plus its neighbors. */
  discovered: ReadonlySet<string>;
}

/** How a transmission should be presented. */
export type Tone = 'narrative' | 'system' | 'ambient' | 'error';

/** Everything the engine announces. The UI and effects layers listen to these. */
export type GameEvents = {
  /** A short message shown over the map. */
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
