import type { EnergyStatus } from './energy';
import type { InebriationStatus } from './inebriation';
import type { SkillStatus } from './skills';
import type { JobStatus } from './jobs';
import type { Quality } from './food';
import type { You } from './romance';
import type { ChromeStatus } from './cyberware';
import type { FightView, HealthStatus } from './combat';
import type { CoverageStatus } from './medical';
import type { Room } from './rooms';
import type { PoliceView } from './police';
/** Weather drives the particle layer behind the UI. */
export type Weather = 'rain' | 'drizzle' | 'dust' | 'haze' | 'clear';

/** Screen-level effects that game content can trigger. */
export type FxName = 'glitch' | 'shake' | 'flash' | 'lightning';

/** Neon colors (6-digit hex) used for glow, highlights and particles. */
export interface Theme {
  primary: string;
  secondary: string;
}

/** Map coordinates. Both axes run 0–`WORLD` (geography.ts); the map stretches them to fit the screen. */
export interface Point {
  x: number;
  y: number;
}

export type Side = 'north' | 'east' | 'south' | 'west';

/** One of a district's neighborhoods (the wiki's sub-districts, e.g. Kabuki in Watson), and where it is. */
export interface Subdistrict extends Point {
  name: string;
}

export interface District extends Point {
  id: string;
  name: string;
  theme: Theme;
  /** City blocks, or open desert like the Badlands. */
  terrain: 'city' | 'desert';
  /** Out on its streets this city. */
  weather: Weather;
  /** A line about its streets, for when the player is between places. */
  mood: string;
  /** What plays while the player is out on its streets. */
  ambient: AmbientLine[];
  /** How its eateries lean: luxury, everyday or poverty, as relative weights. */
  dining: Partial<Record<Quality, number>>;
  /** Its neighborhoods on this map. A block belongs to the one nearest it (or to the nearest district with none). */
  subdistricts: Subdistrict[];
}

/** An NCART stop. Stations sit on street corners. */
export interface Station extends Point {
  id: string;
  name: string;
  district: string;
  /** Ids of the lines that stop here. */
  lines: string[];
}

/** One NCART line: the stations it runs through, in order. Trains run both ways. */
export interface TransitLine {
  id: string;
  name: string;
  color: string;
  stations: string[];
}

export interface Transit {
  stations: Record<string, Station>;
  lines: TransitLine[];
}

/** Where the player is: always a point on the map, and whatever is there, if anything. */
export interface Whereabouts extends Point {
  place: string | null;
  station: string | null;
  /** Standing outside a building. */
  building: string | null;
}

/** The street grid every location sits on. Positions run 0–`WORLD` like map coordinates. */
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

/**
 * What a building is for. Every building lands in exactly one. The first group are businesses
 * (storefronts), named after the kinds of vendor in Night City; the rest are everything else
 * a city is made of.
 */
export type BuildingCategory =
  | 'commodity'
  | 'food'
  | 'nightlife'
  | 'firearms'
  | 'melee'
  | 'cyberware'
  | 'netrunning'
  | 'clothing'
  | 'medical'
  | 'vehicles'
  | 'entertainment'
  | 'services'
  | 'lodging'
  | 'residential'
  | 'corporate'
  | 'industrial'
  | 'storage'
  | 'public'
  | 'parking'
  | 'abandoned';

/** One building (or open lot) in a city block. Every city generates its own. */
export interface Building {
  id: string;
  /** Grid address of its block: a column letter and a row number, e.g. "D7". */
  block: string;
  district: string;
  kind: BuildingKind;
  /** What it is as players read it, e.g. "Apartment block" or, for a storefront, "Gun shop". */
  kindLabel: string;
  category: BuildingCategory;
  /** The kind of business a storefront runs, e.g. "gun-shop". Null for anything that isn't a storefront. */
  business: string | null;
  name: string;
  /** 0 for open ground such as parks, plazas and lots. */
  floors: number;
  /** Footprint in map coordinates: top-left corner, width and height. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The kinds of item in Night City, sorted the way the Cyberpunk Wiki sorts 2077's: weapons,
 * ammunition, attachments and mods, cyberware, quickhacks, clothing, consumables, shards,
 * junk and crafting components; and credchips, the wiki's 2020 chips of eurodollars, which
 * 2077's list has no slot for.
 */
export type ItemKind = 'weapon' | 'ammo' | 'attachment' | 'cyberware' | 'quickhack' | 'clothing' | 'consumable' | 'shard' | 'credchip' | 'junk' | 'component';

/** Something the player carries: what it is, and how many of it. */
export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  count: number;
  /** The pocket it's in (src/engine/carry.ts). Saves from before pockets have none; they're put away on loading. */
  in?: string;
  /** For a credchip: the eddies on it. */
  balance?: number;
  /** For a credchip: stolen and not yet chopped, so no counter and no bank will take it. */
  locked?: boolean;
  /** For clothing carried rather than worn: which garment it is (a kind in `GEAR.kinds`). */
  gear?: string;
  /** For a weapon: which one it is (a weapon in `src/data/weapons.ts`). Each is its own item, with its own id. */
  weapon?: string;
  /** For a gun: the rounds in its magazine, which weigh with it. */
  loaded?: number;
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
  /** The neighborhood it's in (a `Subdistrict` name), when its district has them. */
  area?: string;
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
  transit: Transit;
}

/** What the player knows about the city. */
export interface MapState {
  /** Where the player is (or set off from, while on the move). */
  where: Whereabouts;
  /** Places the player has been to. */
  visited: ReadonlySet<string>;
  /** Places the player knows exist: everywhere visited, where its routes lead, and anything passed on foot. */
  discovered: ReadonlySet<string>;
  /** Map cells the player has walked through (see `cellOf`). The fog lifts over them. */
  explored: ReadonlySet<number>;
}

export interface Wallet {
  /** Cash on hand, in eurodollars (€$): bills and coins together. */
  eddies: number;
  bills: number;
  coins: number;
  /** In the bank. */
  account: number;
  /** On credchips in your name, spendable where transfers are taken. */
  chips: number;
  /** When the monthly NCART pass runs out, in ms since 1970 (0: never bought). */
  passUntil: number;
}

export type TravelMode = 'foot' | 'ncart';

/** One stretch of a trip. A ride passes through `stations`, boarding at the first. */
export interface Leg {
  kind: 'walk' | 'wait' | 'ride';
  path: Point[];
  /** Real minutes, before any test speed-up. */
  minutes: number;
  stations?: string[];
}

export interface TripPlan {
  mode: TravelMode;
  from: Point;
  to: Whereabouts;
  legs: Leg[];
  /** Real minutes for the whole trip, before any test speed-up. */
  minutes: number;
  /** €$ a ride costs without a pass (0 on foot). */
  fare: number;
}

/** A trip underway, timed by the phone's clock (ms since 1970). */
export interface Trip extends TripPlan {
  startedAt: number;
  endsAt: number;
}

/** How a transmission should be presented. */
/** `talk`: something a person said to the player; it's on their card, so the feed can skip it while that's open. */
export type Tone = 'narrative' | 'system' | 'ambient' | 'error' | 'talk';

/** Everything the engine announces. The UI and effects layers listen to these. */
export type GameEvents = {
  /** A short message shown over the map. */
  output: { text: string; tone: Tone };
  /** The player is somewhere new: the game began (`from` is null), they arrived, or they stopped. */
  arrived: {
    from: Whereabouts | null;
    where: Whereabouts;
    place: Location | null;
    station: Station | null;
    building: Building | null;
    district: District | null;
  };
  /** A trip began (or changed course), or ended (null). */
  tripChanged: Trip | null;
  /** The player went into a building, or came back out onto the street (null). */
  interiorChanged: Building | null;
  /** The player's knowledge of the map changed. */
  mapChanged: MapState;
  /** Eddies spent or the NCART pass changed. */
  walletChanged: Wallet;
  /** Energy was spent (and maybe a level gained). Refilling on the clock doesn't fire this; ask `Game.energy(now)`. */
  energyChanged: EnergyStatus;
  /** Something was bought, used or picked up. */
  inventoryChanged: Item[];
  /** The player had a drink, or sobered up a stage. Clearing on the clock doesn't fire this; ask `Game.inebriation(now)`. */
  inebriationChanged: InebriationStatus;
  /** What people think of the player changed: a chat, a gift, an insult, a robbery, or someone collecting on one. */
  societyChanged: { people: string[] };
  /** Charisma earned experience or a level. */
  charismaChanged: SkillStatus;
  /** A fighting skill gained experience or a level: Street Brawler, or Toughness. */
  skillChanged: { skill: 'brawler' | 'toughness' | 'weapon'; status: SkillStatus };
  /** The player walked into another room of the building they're in. */
  roomChanged: Room;
  /** The player got a job, worked a shift, moved up, quit or was let go (null: no job now). */
  jobChanged: JobStatus | null;
  /** The player changed the pronouns they go by. */
  youChanged: You;
  /** A ripperdoc fitted an implant, or took one out. */
  chromeChanged: ChromeStatus;
  /** A fight began, went a beat, or ended (null: none to show). */
  fightChanged: FightView | null;
  /** The player was hurt (a fight ended) or patched up (treatment, a med). Healing on the clock doesn't fire this; ask `Game.health(now)`. */
  healthChanged: HealthStatus;
  /** The player signed up with Trauma Team, or lost the plan (null: none now). Running out on the clock doesn't fire this; ask `Game.covered(now)`. */
  coverageChanged: CoverageStatus | null;
  /** Something with the NCPD changed: a call made, a unit sent or arrived, a warrant, officers on the player, a hold. The clock running down doesn't fire this; ask `Game.police(now)`. */
  policeChanged: PoliceView;
  fx: { effect: FxName };
};
