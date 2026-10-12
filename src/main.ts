import './style.css';
import { CITY } from './data/city';
import { TRAVEL } from './data/travel';
import { blockAt } from './engine/buildings';
import { Game, streetSpot } from './engine/game';
import { GENERATOR_VERSION, generateWorld } from './engine/generate';
import { randomSeed } from './engine/rng';
import { createSave, readSave, resume, savedSeed, type Progress } from './engine/save';
import { snapToStreet } from './engine/streets';
import { tripProgress } from './engine/travel';
import type { Building, TravelMode, Trip, TripPlan, Wallet, Whereabouts, World } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { ITEM_KINDS } from './data/items';
import { formatCountdown, formatDay, formatDuration, formatMinutes } from './ui/format';
import { Hud } from './ui/hud';
import { Inventory } from './ui/inventory';
import { stripMarkup } from './ui/markup';
import { CityMap, type Target } from './ui/map';
import { PlacePanel, type ActionId, type PanelAction, type PanelView } from './ui/place';
import { saveSlot } from './ui/save-slot';
import { Transmissions } from './ui/transmissions';

function $<T extends Element = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Shown wherever times appear while trips run faster than real time. */
const testSpeed = TRAVEL.timeScale === 1 ? '' : `Test speed ×${TRAVEL.timeScale}`;

const weather = new WeatherFx($<HTMLCanvasElement>('#weather'), reducedMotion);
const screen = new ScreenFx({ app: $('#app'), flash: $('#flash') }, reducedMotion);
const glitchText = new GlitchText(reducedMotion);
const registerGlitch = (el: HTMLElement, text: string) => glitchText.register(el, text);
const hud = new Hud({ sign: $('#hud-sign'), path: $('#hud-path'), weather: $('#hud-weather'), clock: $('#hud-clock') });
const mapStage = $('#map-stage');
const seedLabel = $('#map-seed');
const saveStatus = $('#save-status');
const walletLabel = $('#wallet');

const transmissions = new Transmissions({ root: $('#transmissions'), announcer: $('#announcer') }, registerGlitch, reducedMotion);

const place = new PlacePanel(
  {
    root: $('#place'),
    beam: $('#scan-beam'),
    kicker: $('#place-kicker'),
    title: $('#place-title'),
    meta: $('#place-meta'),
    description: $('#place-desc'),
    progress: $('#place-progress'),
    actions: $('#place-actions'),
    buttons: {
      walk: $<HTMLButtonElement>('#act-walk'),
      ride: $<HTMLButtonElement>('#act-ride'),
      pass: $<HTMLButtonElement>('#act-pass'),
      stop: $<HTMLButtonElement>('#act-stop'),
      enter: $<HTMLButtonElement>('#act-enter'),
      leave: $<HTMLButtonElement>('#act-leave'),
    },
    close: $<HTMLButtonElement>('#place-close'),
  },
  {
    onAction: (id) => act(id),
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
    fog: $<HTMLCanvasElement>('#map-fog'),
    names: $('#map-names'),
    routes: $<SVGSVGElement>('#map-routes'),
    nodes: $('#map-nodes'),
    sweep: $('#map-sweep'),
    player: $('#map-player'),
    progress: $('#map-progress'),
    coords: $('#map-coords'),
    controls: $('#map-zoom'),
    zoomIn: $<HTMLButtonElement>('#zoom-in'),
    zoomOut: $<HTMLButtonElement>('#zoom-out'),
    zoomHome: $<HTMLButtonElement>('#zoom-home'),
  },
  {
    onSelect: (target) => select(target),
    // Tapping what's picked a second time walks there.
    onGo: () => go('foot'),
  },
  reducedMotion,
);

const inventory = new Inventory(
  {
    root: $('#inventory'),
    toggle: $<HTMLButtonElement>('#inventory-toggle'),
    close: $<HTMLButtonElement>('#inventory-close'),
    eddies: $('#inventory-eddies'),
    pass: $('#inventory-pass'),
    total: $('#inventory-total'),
    sections: $('#inventory-sections'),
  },
  () => showInventory(),
  reducedMotion,
);

let game: Game;
/** What the player has picked to go to, if anything. */
let target: Target | null = null;
let lastActivity = performance.now();

// ───────────── Picking and going ─────────────

function buildingOf(id: string): Building | undefined {
  return game.world.buildings.find((b) => b.id === id);
}

/** The spot a pick means going to. Buildings and bits of street are reached from the nearest street. */
function destinationOf(t: Target): Whereabouts | null {
  const { world } = game;
  switch (t.kind) {
    case 'place': {
      const l = world.locations[t.id];
      return l ? { ...streetSpot(l), place: l.id } : null;
    }
    case 'station': {
      const s = world.transit.stations[t.id];
      return s ? { ...streetSpot(s), station: s.id } : null;
    }
    case 'building': {
      const b = buildingOf(t.id);
      return b ? { ...streetSpot(snapToStreet(world.layout, { x: b.x + b.w / 2, y: b.y + b.h / 2 })), building: b.id } : null;
    }
    case 'point':
      return streetSpot(snapToStreet(world.layout, t.point));
  }
}

function select(t: Target | null): void {
  lastActivity = performance.now();
  target = t?.kind === 'point' ? { kind: 'point', point: snapToStreet(game.world.layout, t.point) } : t;
  refresh();
}

function go(mode: TravelMode): void {
  const to = target && destinationOf(target);
  if (!to) return;
  const now = Date.now();
  const plan = game.plan(to, mode, now);
  if (!plan || !game.go(plan, now)) return;
  target = null;
  lastActivity = performance.now();
  refresh();
}

function act(id: ActionId): void {
  const now = Date.now();
  lastActivity = performance.now();
  if (id === 'walk') go('foot');
  else if (id === 'ride') go('ncart');
  else if (id === 'pass') game.buyPass(now);
  else if (id === 'stop') game.stop(now);
  else if (id === 'enter') game.enter();
  else if (id === 'leave') game.leave();
}

// ───────────── The panel ─────────────

/** Shows what the player has picked, or the trip they're on, or the building they're in, or where they are. */
function refresh(): void {
  const now = Date.now();
  const trip = game.currentTrip;
  if (target) {
    const to = destinationOf(target);
    const plans = to ? { foot: game.plan(to, 'foot', now), ncart: game.plan(to, 'ncart', now) } : null;
    // Picking your own spot (or something gone) just clears the pick.
    if (!to || !plans || (!trip && !plans.foot)) {
      target = null;
      return refresh();
    }
    const ride = plans.ncart?.legs.find((l) => l.kind === 'ride')?.stations ?? [];
    map.select(target, { path: plans.foot?.legs[0]?.path ?? null, stations: [ride[0], ride.at(-1)].filter((s): s is string => Boolean(s)) });
    place.show(targetView(target, to, plans, now));
    return;
  }
  map.select(null);
  const inside = game.interior;
  place.show(trip ? tripView(trip, now) : inside ? insideView(inside) : hereView(now));
}

function lineNames(stationId: string): string {
  const station = game.world.transit.stations[stationId];
  return (station?.lines ?? []).map((id) => game.world.transit.lines.find((l) => l.id === id)?.name ?? id).join(' · ');
}

function heightOf(b: Building): string {
  return b.floors > 1 ? `${b.floors} floors` : '';
}

/** What a building is for, as players read it: e.g. "Firearms", and what that covers. */
function categoryOf(b: Building): { label: string; description: string } {
  return CITY.buildings.categories[b.category];
}

function targetView(t: Target, to: Whereabouts, plans: { foot: TripPlan | null; ncart: TripPlan | null }, now: number): PanelView {
  const { world } = game;
  const district = game.districtOf(to)?.name ?? 'Night City';
  let kicker = district;
  let title = game.nameOf(to);
  let meta = '';
  let description: string | undefined;
  if (t.kind === 'place') {
    const l = world.locations[t.id];
    kicker = `${district} · ${l?.kindLabel ?? 'Place'}`;
    meta = game.mapState.visited.has(t.id) ? 'Been here' : 'Unexplored';
  } else if (t.kind === 'station') {
    kicker = `${district} · NCART station`;
    meta = lineNames(t.id);
  } else if (t.kind === 'building') {
    const b = buildingOf(t.id);
    kicker = `Block ${b?.block ?? '?'} · ${district}`;
    title = b?.name ?? title;
    meta = b ? [categoryOf(b).label, b.kindLabel, heightOf(b)].filter(Boolean).join(' · ') : '';
    description = b ? categoryOf(b).description : undefined;
  } else {
    const block = blockAt(world.layout, to);
    kicker = block ? `Block ${block.address} · ${district}` : district;
    title = 'On the street';
    meta = 'You can walk anywhere';
  }
  const actions = [walkAction(plans.foot), rideAction(plans.ncart, now)];
  // The train only goes stop to stop: say which stop it would leave you at.
  const stop = plans.ncart && t.kind !== 'station' ? world.transit.stations[plans.ncart.to.station ?? '']?.name : undefined;
  return {
    mode: 'target',
    kicker,
    title,
    meta: [meta, stop ? `Train to ${stop}` : '', testSpeed].filter(Boolean).join(' · '),
    description,
    actions,
    closable: true,
    announce: `${title}. ${actions.map((a) => [a.label, a.sub].filter(Boolean).join(' ')).join('. ')}.`,
  };
}

function walkAction(plan: TripPlan | null): PanelAction {
  const trip = game.currentTrip;
  if (trip?.mode === 'ncart') return { id: 'walk', label: 'Walk', sub: 'NCART trip underway', disabled: true };
  if (!plan) return { id: 'walk', label: 'Walk', disabled: true };
  return { id: 'walk', label: trip ? 'Walk here instead' : 'Walk', sub: formatMinutes(plan.minutes) };
}

function rideAction(plan: TripPlan | null, now: number): PanelAction {
  if (game.currentTrip?.mode === 'ncart') return { id: 'ride', label: 'NCART', sub: 'NCART trip underway', disabled: true };
  if (!plan) {
    const none = Object.keys(game.world.transit.stations).length === 0;
    const why = none ? 'No NCART here' : game.atStation ? 'This is the nearest stop' : 'Board at a station';
    return { id: 'ride', label: 'NCART', sub: why, disabled: true };
  }
  const covered = game.passActive(now);
  const fare = covered ? 'Pass' : `${plan.fare} €$`;
  const short = !covered && game.wallet.eddies < plan.fare;
  return { id: 'ride', label: 'NCART', sub: `${formatMinutes(plan.minutes)} · ${short ? `${fare}, short` : fare}`, disabled: short };
}

function hereView(now: number): PanelView {
  const where = game.whereabouts;
  const district = game.districtOf(where);
  const dname = district?.name ?? 'Night City';
  const name = game.nameOf(where);
  const location = game.location;
  if (location) {
    return {
      mode: 'here',
      kicker: `You are here · ${dname} · ${location.kindLabel}`,
      description: location.description,
      actions: [],
      closable: false,
      announce: `${location.name}. ${stripMarkup(location.description)}`,
    };
  }
  if (where.station) {
    const { passPrice, passDays, fare } = TRAVEL;
    const active = game.passActive(now);
    const lines = lineNames(where.station);
    return {
      mode: 'here',
      kicker: `You are here · ${dname} · NCART`,
      title: name,
      meta: active ? `Monthly pass valid until ${formatDay(game.wallet.passUntil)}` : undefined,
      description: `NCART, run by Night Corp. ${lines}. A ride costs ${fare} €$, or nothing with a monthly pass.`,
      actions: [
        {
          id: 'pass',
          label: active ? 'Extend pass' : 'Monthly pass',
          sub: `${passPrice} €$ · ${passDays} days`,
          disabled: game.wallet.eddies < passPrice,
        },
      ],
      closable: false,
      announce: `${name}. ${lines}.`,
    };
  }
  const building = where.building ? buildingOf(where.building) : undefined;
  const mood = district?.mood ?? '';
  const door = game.door;
  return {
    mode: 'here',
    kicker: `You are here · ${dname}${building ? ` · Block ${building.block}` : ''}`,
    title: name,
    description: building ? `${categoryOf(building).label} · ${[building.kindLabel, heightOf(building)].filter(Boolean).join(', ')}. ${mood}` : mood,
    actions: door ? [{ id: 'enter', label: 'Go inside', sub: door.kindLabel }] : [],
    closable: false,
    announce: `${name}. ${mood}`,
  };
}

/**
 * Inside a building. There's nothing to do in here yet: what each category of building holds
 * (counters, rooms, people, jobs) gets added to this view as the game grows.
 */
function insideView(building: Building): PanelView {
  const district = game.districtOf(game.whereabouts)?.name ?? 'Night City';
  return {
    mode: 'inside',
    kicker: `Inside · ${district} · Block ${building.block}`,
    title: building.name,
    meta: [categoryOf(building).label, building.kindLabel, heightOf(building)].filter(Boolean).join(' · '),
    description: 'Nothing to do in here yet.',
    actions: [{ id: 'leave', label: 'Leave', sub: 'Back to the street' }],
    closable: false,
    announce: `Inside ${building.name}. Nothing to do in here yet.`,
  };
}

/** What the player is doing on this stretch of the trip. */
function legStatus(trip: Trip, now: number): string {
  const { leg: index } = tripProgress(trip, now);
  const leg = trip.legs[index];
  const stations = game.world.transit.stations;
  const destination = game.nameOf(trip.to);
  if (!leg || trip.mode === 'foot') return `Walking to ${destination}`;
  if (leg.kind === 'wait') return 'Waiting for the train';
  if (leg.kind === 'ride') {
    const [first, second] = leg.stations ?? [];
    const line = game.world.transit.lines.find((l) => first && second && l.stations.includes(first) && l.stations.includes(second));
    return `Riding ${line?.name ?? 'the NCART'} to ${stations[leg.stations?.at(-1) ?? '']?.name ?? 'the station'}`;
  }
  const next = trip.legs[index + 1];
  const board = next?.kind === 'wait' ? Object.values(stations).find((s) => s.x === next.path[0]?.x && s.y === next.path[0]?.y) : undefined;
  return board ? `Walking to ${board.name}` : `Walking to ${destination}`;
}

function tripMeta(trip: Trip, now: number): string {
  return `${legStatus(trip, now)} · ${formatCountdown(trip.endsAt - now)} left`;
}

function tripView(trip: Trip, now: number): PanelView {
  const name = game.nameOf(trip.to);
  const mode = trip.mode === 'foot' ? 'On foot' : 'NCART';
  // Trips are planned in real minutes; at a test speed, the clock time is much shorter.
  const real = testSpeed
    ? `${formatMinutes(trip.minutes)} · ${formatDuration(trip.endsAt - trip.startedAt)} at ×${TRAVEL.timeScale}`
    : `${formatMinutes(trip.minutes)} trip`;
  return {
    mode: 'trip',
    kicker: `${mode} · ${real}`,
    title: name,
    meta: tripMeta(trip, now),
    progress: tripProgress(trip, now).done,
    actions: trip.mode === 'foot' ? [{ id: 'stop', label: 'Stop here' }] : [],
    closable: false,
    announce: `${mode} to ${name}. ${formatMinutes(trip.minutes)}.`,
  };
}

function showWallet(wallet: Wallet, now: number): void {
  const pass = wallet.passUntil > now;
  walletLabel.textContent = `€$ ${wallet.eddies}${pass ? ' · Pass' : ''}`;
  walletLabel.classList.toggle('has-pass', pass);
  walletLabel.title = pass ? `NCART monthly pass valid until ${formatDay(wallet.passUntil)}` : 'Eurodollars. Buy an NCART monthly pass at any station.';
}

/** Fills the inventory with what the player carries, sorted by kind of item. */
function showInventory(): void {
  const { eddies, passUntil } = game.wallet;
  const items = game.inventory;
  inventory.render({
    eddies: `€$ ${eddies}`,
    pass: passUntil > Date.now() ? `Valid until ${formatDay(passUntil)}` : 'None',
    sections: Object.entries(ITEM_KINDS).map(([kind, { label, hint }]) => ({
      kind: kind as keyof typeof ITEM_KINDS,
      label,
      hint,
      items: items.filter((item) => item.kind === kind),
    })),
  });
}

// ───────────── Saving ─────────────

let savePending = false;
let lastFlash = 0;
/** Saves once after whatever just changed, and lets the player see that it did (now and then: walking saves constantly). */
function queueSave(): void {
  if (savePending) return;
  savePending = true;
  queueMicrotask(() => {
    savePending = false;
    const saved = saveSlot.write(createSave(game.world.seed, game, GENERATOR_VERSION));
    saveStatus.textContent = saved ? 'Saved' : 'Not saved';
    saveStatus.classList.toggle('is-failed', !saved);
    saveStatus.title = saved
      ? 'Your progress saves on this device as you go.'
      : "This browser won't let the game save (a private window, maybe). Progress will be lost when you leave.";
    if (saved && !reducedMotion && performance.now() - lastFlash > 5000) {
      lastFlash = performance.now();
      saveStatus.animate(
        [
          { opacity: 1, textShadow: '0 0 8px currentColor' },
          { opacity: 0.6, textShadow: '0 0 0 transparent' },
        ],
        { duration: 1400, easing: 'ease-out' },
      );
    }
  });
}

// ───────────── Game → presentation ─────────────

// The engine only emits events; every visual reaction lives here.
function wire(g: Game): void {
  g.events.on('output', ({ text, tone }) => {
    transmissions.push(text, tone);
    if (tone === 'error') screen.nudge(mapStage);
  });

  g.events.on('arrived', ({ from, where, place: location, district }) => {
    const theme = resolveTheme(district, location);
    applyTheme(theme);
    const sky = location?.weather ?? district?.weather ?? 'clear';
    weather.setWeather(sky);
    weather.setTint(theme.primary);
    hud.setLocation(g.nameOf(where), district?.name ?? 'Night City', sky);
    if (from) screen.glitch();
    place.scan();
    refresh();
  });

  g.events.on('interiorChanged', (building) => {
    const where = g.whereabouts;
    const district = g.districtOf(where);
    map.setInside(building?.id ?? null);
    // Indoors, the weather stays outside.
    const sky = building ? 'clear' : (district?.weather ?? 'clear');
    weather.setWeather(sky);
    hud.setLocation(building ? building.name : g.nameOf(where), district?.name ?? 'Night City', sky);
    place.scan();
    refresh();
    queueSave();
  });

  g.events.on('tripChanged', (trip) => {
    map.setTrip(trip);
    if (trip) void map.bringIntoView(trip.legs.flatMap((l) => l.path));
    refresh();
    queueSave();
  });

  g.events.on('mapChanged', (state) => {
    map.update(state);
    queueSave();
  });

  g.events.on('walletChanged', (wallet) => {
    showWallet(wallet, Date.now());
    if (inventory.isOpen) showInventory();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });

  g.events.on('fx', ({ effect }) => {
    screen.play(effect);
    if (effect === 'lightning') hud.flickerSign();
  });
}

/** Drops the player into a city: a new game, or a saved one picking up where it left off. */
function begin(world: World, progress?: Progress, notice?: string): void {
  game = new Game(world, TRAVEL, progress);
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
  game.start(Date.now());
}

/**
 * Picks up the saved game on this device if there is one. Otherwise starts the city in the
 * address (a shared link) or a brand new one.
 */
function boot(): void {
  const raw = saveSlot.load();
  const saved = readSave(raw);
  const world = saved ? generateWorld(saved.seed, CITY) : null;
  const progress = saved && world && saved.generator === GENERATOR_VERSION ? resume(world, saved) : null;
  if (world && progress) {
    begin(world, progress);
    return;
  }
  // A save from before the game changed how cities (or saves) work: keep the city, start the map over.
  const oldSeed = savedSeed(raw);
  if (oldSeed) {
    begin(generateWorld(oldSeed, CITY), undefined, 'Night City has changed since you were last here. Your map starts over.');
    return;
  }
  const seedInAddress = location.hash.slice(1).toLowerCase();
  begin(generateWorld(/^[0-9a-f]{8}$/.test(seedInAddress) ? seedInAddress : randomSeed(), CITY));
}

/** The clock: lands trips that are due and moves the trip panel on. */
function tick(): void {
  const now = Date.now();
  game.tick(now);
  const trip = game.currentTrip;
  if (trip && !target) place.update(tripProgress(trip, now).done, tripMeta(trip, now));
  showWallet(game.wallet, now);
}

// Escape drops the current pick; + and - zoom.
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'i' || event.key === 'I') inventory.toggle();
  // Escape closes the inventory first, then lets go of whatever's picked.
  else if (event.key === 'Escape' && inventory.isOpen) inventory.close();
  else if (event.key === 'Escape' && target) select(null);
  // The map's keys rest while the inventory covers it.
  else if (inventory.isOpen) return;
  else if (event.key === '+' || event.key === '=') map.zoomBy(2);
  else if (event.key === '-' || event.key === '_') map.zoomBy(0.5);
});

// Coming back to the game (the phone was locked, another app was open): catch the clock up at once.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) tick();
});

boot();
setInterval(tick, 500);

// The city keeps talking when the player goes quiet (but not over the clatter of a train).
function scheduleAmbient(): void {
  setTimeout(
    () => {
      const idleFor = performance.now() - lastActivity;
      if (idleFor > 12_000 && transmissions.idle && game.currentTrip?.mode !== 'ncart' && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
