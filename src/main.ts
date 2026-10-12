import './style.css';
import { CITY } from './data/city';
import { ENERGY } from './data/energy';
import { FOOD } from './data/food';
import { INEBRIATION } from './data/inebriation';
import { LINES, PEOPLE } from './data/people';
import { CHARISMA } from './data/skills';
import { SOCIETY } from './data/society';
import { TRAVEL } from './data/travel';
import { blockAt } from './engine/buildings';
import { Game, streetSpot } from './engine/game';
import { GENERATOR_VERSION, generateWorld } from './engine/generate';
import type { Menu } from './engine/food';
import { kinWord } from './engine/dialogue';
import type { Fact } from './engine/society';
import type { InebriationStatus } from './engine/inebriation';
import { randomSeed } from './engine/rng';
import { createSave, readSave, resume, savedSeed, type Progress } from './engine/save';
import { snapToStreet } from './engine/streets';
import { tripProgress } from './engine/travel';
import type { Building, Item, TravelMode, Trip, TripPlan, Wallet, Whereabouts, World } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { ITEM_KINDS } from './data/items';
import { formatCountdown, formatDay, formatDuration, formatMinutes } from './ui/format';
import { Hud } from './ui/hud';
import { EnergyMeter } from './ui/energy';
import { Inventory } from './ui/inventory';
import { MapOverlay } from './ui/overlay';
import { stripMarkup } from './ui/markup';
import { CityMap, type Target } from './ui/map';
import { People, STANCE_LABEL, type PersonAction } from './ui/people';
import { PlacePanel, type ActionId, type PanelAction, type PanelView } from './ui/place';
import { saveSlot } from './ui/save-slot';
import { Settings } from './ui/settings';
import { Shop } from './ui/shop';
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
const conditionLabel = $('#condition');

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
      menu: $<HTMLButtonElement>('#act-menu'),
      people: $<HTMLButtonElement>('#act-people'),
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
  (id) => consume(id),
  reducedMotion,
);

const settings = new Settings(
  {
    root: $('#settings'),
    toggle: $<HTMLButtonElement>('#settings-toggle'),
    close: $<HTMLButtonElement>('#settings-close'),
    seed: $('#settings-seed'),
    progress: $('#settings-progress'),
    restart: $<HTMLButtonElement>('#settings-restart'),
    erase: $<HTMLButtonElement>('#settings-erase'),
    confirm: $('#settings-confirm'),
    confirmText: $('#settings-confirm-text'),
    confirmYes: $<HTMLButtonElement>('#settings-confirm-yes'),
    confirmNo: $<HTMLButtonElement>('#settings-confirm-no'),
  },
  () => showSettings(),
  {
    onRestart: () => startOver(game.world.seed, 'Progress reset. This city starts over from the beginning.'),
    onErase: () => {
      saveSlot.clear();
      startOver(randomSeed(), 'Save erased. A new Night City boots up.');
    },
  },
  reducedMotion,
);

const shop = new Shop(
  {
    root: $('#shop'),
    close: $<HTMLButtonElement>('#shop-close'),
    title: $('#shop-title'),
    kicker: $('#shop-kicker'),
    blurb: $('#shop-blurb'),
    eddies: $('#shop-eddies'),
    status: $('#shop-status'),
    list: $('#shop-list'),
  },
  () => showShop(),
  (id) => buyFromShop(id),
  reducedMotion,
);
/** What last happened at the counter, shown under the menu's header until it closes. */
let shopStatus = '';

const people = new People(
  {
    root: $('#people'),
    close: $<HTMLButtonElement>('#people-close'),
    title: $('#people-title'),
    kicker: $('#people-kicker'),
    count: $('#people-count'),
    reputation: $('#people-rep'),
    list: $('#people-list'),
    empty: $('#people-empty'),
    card: $('#person'),
    cardName: $('#person-name'),
    cardKicker: $('#person-kicker'),
    cardFacts: $('#person-facts'),
    cardWebToggle: $<HTMLButtonElement>('#person-web-toggle'),
    cardWeb: $('#person-web'),
    cardActions: $('#person-actions'),
    cardQuestions: $('#person-questions'),
    cardGifts: $('#person-gifts'),
    cardAsk: $('#person-ask'),
    cardLog: $('#person-log'),
    known: $('#people-known'),
    back: $<HTMLButtonElement>('#person-back'),
  },
  () => {
    // Opening it is taking a look around: everyone here is noticed, and who's with whom.
    game.look(Date.now());
    showPeople();
  },
  {
    onSelect: (id) => {
      personShown = id;
      webOpen = false;
      showPeople();
    },
    onQuestion: (id, fact) => {
      lastActivity = performance.now();
      game.askFact(id, fact as Exclude<Fact, 'nature' | 'drinks'>, Date.now());
    },
    onToggleWeb: () => {
      webOpen = !webOpen;
      showPeople();
    },
    onAction: (action, id) => actOn(action, id),
    onGift: (id, itemId) => {
      lastActivity = performance.now();
      game.gift(id, itemId, Date.now());
    },
    onAsk: (id, aboutId) => {
      lastActivity = performance.now();
      game.ask(id, aboutId, Date.now());
    },
  },
  reducedMotion,
);
/** The person whose card is open, if any: someone here, or anyone the player knows of. */
let personShown: string | null = null;
/** Whether their web is unfolded. */
let webOpen = false;

const energyMeter = new EnergyMeter({ root: $('#energy'), fill: $('#energy-fill'), value: $('#energy-value'), detail: $('#energy-detail') });

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
  else if (id === 'menu' && game.menu()) {
    shopStatus = '';
    shop.overlay.show($('#act-menu'));
  } else if (id === 'people') {
    personShown = null;
    people.overlay.show($('#act-people'));
  }
}

/** Something done to someone in the people overlay. */
function actOn(action: PersonAction, id: string): void {
  lastActivity = performance.now();
  const now = Date.now();
  if (action === 'talk') game.talk(id, now);
  else if (action === 'insult') game.insult(id, now);
  else if (action === 'rob') game.rob(id, now);
}

// ───────────── The panel ─────────────

/** Shows what the player has picked, or the trip they're on, or the building they're in, or where they are. */
function refresh(): void {
  const now = Date.now();
  const trip = game.currentTrip;
  // The menu and the people are for where the player is; they go when they leave.
  if (shop.overlay.isOpen && !game.menu()) shop.overlay.close();
  if (people.overlay.isOpen && !game.interior && !game.location) people.overlay.close();
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
    const menu = game.menu();
    const here = game.peopleHere(now).length;
    return {
      mode: 'here',
      kicker: `You are here · ${dname} · ${location.kindLabel}`,
      description: location.description,
      actions: [peopleAction(here), ...(menu ? [menuAction(menu)] : [])],
      closable: false,
      announce: `${location.name}. ${stripMarkup(location.description)}${menu ? ' There is a menu.' : ''} ${here ? `${here} people here.` : 'Nobody here.'}`,
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
 * Inside a building. An eatery has a menu; there's nothing to do in the others yet. What each
 * category of building holds (counters, rooms, people, jobs) gets added to this view as the
 * game grows.
 */
function insideView(building: Building): PanelView {
  const now = Date.now();
  const district = game.districtOf(game.whereabouts)?.name ?? 'Night City';
  const menu = game.menu();
  const here = game.peopleHere(now).length;
  const barred = game.barred(now);
  const description = barred ?? (menu ? FOOD.blurbs[menu.venue.chain ? 'chain' : menu.venue.quality] : here ? 'People live and work in here.' : 'Nobody around right now.');
  return {
    mode: 'inside',
    kicker: `Inside · ${district} · Block ${building.block}`,
    title: building.name,
    meta: [menu ? qualityLabel(menu) : categoryOf(building).label, building.kindLabel, heightOf(building)].filter(Boolean).join(' · '),
    description,
    actions: [peopleAction(here), ...(menu ? [barred ? { id: 'menu' as const, label: 'Menu', sub: "Won't serve you", disabled: true } : menuAction(menu)] : []), { id: 'leave', label: 'Leave', sub: 'Back to the street' }],
    closable: false,
    announce: `Inside ${building.name}. ${description} ${here ? `${here} people here.` : ''}`,
  };
}

/** The people button: how many are here. */
function peopleAction(count: number): PanelAction {
  return { id: 'people', label: 'People', sub: count ? `${count} here` : 'Nobody here', disabled: !count };
}

/** The menu button: how much there is to eat, and what the cheapest thing costs. */
function menuAction(menu: Menu): PanelAction {
  const dishes = menu.items.filter((i) => i.kind === 'food').length;
  const from = Math.min(...menu.items.map((i) => i.price));
  const sub = menu.items.length ? `${dishes} ${dishes === 1 ? 'dish' : 'dishes'} · from ${from} €$` : 'Nothing on it';
  return { id: 'menu', label: 'Menu', sub, disabled: !menu.items.length };
}

/** "Luxury", "Cheap eats"…: the kind of eatery, as players read it. */
function qualityLabel(menu: Menu): string {
  return FOOD.labels[menu.venue.chain ? 'chain' : menu.venue.quality];
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
      items: items.filter((item) => item.kind === kind).map((item) => ({ ...item, use: useLabel(item) })),
    })),
  });
}

/** What using an item is called: food is eaten, the rest drunk. Nothing else can be used yet. */
function useLabel(item: Item): string | undefined {
  const dish = item.kind === 'consumable' ? FOOD.dishes.find((d) => d.id === item.id) : undefined;
  return dish ? (dish.kind === 'food' ? 'Eat' : 'Drink') : undefined;
}

/** Eats or drinks something from the inventory. */
function consume(id: string): void {
  lastActivity = performance.now();
  game.consume(id, Date.now());
}

let shownCondition = '';
/** Under the energy bar: how drunk the player is and when it wears off; and the screen to match. */
function showCondition(status: InebriationStatus, now: number): void {
  const text = status.stage ? `${status.stage.label} · sober in ${formatCountdown((status.soberAt ?? now) - now)}` : '';
  if (text !== shownCondition) {
    shownCondition = text;
    conditionLabel.textContent = text;
  }
  screen.setInebriation(status.severity);
}

/** Fills the menu with what's for sale where the player is, and whether they can afford it. */
function showShop(): void {
  const menu = game.menu();
  const { eddies } = game.wallet;
  if (!menu) {
    shop.render({ title: game.nameOf(game.whereabouts), kicker: 'No menu', blurb: 'Nothing to eat here.', eddies: `€$ ${eddies}`, status: '', items: [] });
    return;
  }
  const { venue, items } = menu;
  const carried = new Map(game.inventory.map((item) => [item.id, item.count]));
  const barred = game.barred(Date.now());
  shop.render({
    title: venue.name,
    kicker: `${qualityLabel(menu)} · ${venue.kindLabel} · ${game.world.districts[venue.district]?.name ?? 'Night City'}`,
    blurb: barred ?? FOOD.blurbs[venue.chain ? 'chain' : venue.quality],
    eddies: `€$ ${eddies}`,
    status: shopStatus,
    items: items.map((item) => ({ ...item, affordable: !barred && item.price <= eddies, carried: carried.get(item.id) ?? 0 })),
  });
}

/** Fills the people overlay: everyone here, or the card of one person (here, or only known of). */
function showPeople(): void {
  const now = Date.now();
  const here = game.peopleHere(now);
  const at = game.interior ?? game.location;
  const district = at ? (game.world.districts[at.district]?.name ?? 'Night City') : 'Night City';
  const reputation = game.reputation(now).map((r) => `${r.label} ${r.value > 0 ? '+' : '−'}${Math.abs(r.value)}`);
  const known = game.knownPeople();
  const present = personShown ? here.find((p) => p.person.id === personShown) : undefined;
  const shown = present?.person ?? (personShown ? known.find((p) => p.id === personShown) : undefined);
  if (personShown && !shown) personShown = null;
  const standing = shown ? game.standingWith(shown.id, now) : null;
  const gifts = game.inventory.filter((item) => item.kind === 'consumable' && FOOD.dishes.some((d) => d.id === item.id));
  const gangOf = (id: string | null) => (id ? PEOPLE.gangs[id]?.name : undefined);
  const charisma = game.charisma();
  const how = { seen: 'seen together', told: 'told', asked: 'asked' };
  const nameOf = (id: string, fallback: string) => game.describe(id)?.name ?? fallback;
  const described = shown ? game.describe(shown.id) : null;
  const named = (p: { id: string }) => game.describe(p.id)?.named ?? false;
  people.render({
    title: at?.name ?? 'Here',
    kicker: `${district} · ${at && 'floors' in at ? at.kindLabel : (at?.kindLabel ?? 'The street')}`,
    count: `${here.length} ${here.length === 1 ? 'person' : 'people'}`,
    reputation: [`Charisma Lv ${charisma.level} · ${charisma.xp}/${charisma.xpToNext} XP`, ...reputation],
    rows: here.map(({ person, doing, stance }) => {
      const about = game.describe(person.id);
      return {
        id: person.id,
        name: about?.name ?? person.name,
        // The gang shows on sight; the job only once known (a gang member's job is the gang).
        sub: [gangOf(person.gang) ? `${gangOf(person.gang)} colors` : undefined, person.gang ? undefined : about?.facts.job].filter(Boolean).join(' · '),
        doing,
        stance,
        stanceLabel: STANCE_LABEL[stance],
      };
    }),
    empty: 'Nobody here right now. People keep hours: workers by day, regulars in the evening, residents at night.',
    known: known.filter((p) => !here.some((h) => h.person.id === p.id)).map((p) => ({ id: p.id, name: nameOf(p.id, p.name) })),
    card:
      shown && standing && described
        ? {
            id: shown.id,
            name: described.name,
            kicker: [STANCE_LABEL[standing.stance], gangOf(shown.gang) ? `${gangOf(shown.gang)} colors` : undefined, present ? present.doing : 'Not here'].filter(Boolean).join(' · '),
            facts: described.lines.length ? described.lines.join(' · ') : described.named ? 'That\'s all you know.' : 'You don\'t know anything about them yet. Talk, watch, ask.',
            stance: standing.stance,
            here: Boolean(present),
            web: standing.web.map((link) => ({ id: link.person.id, name: nameOf(link.person.id, link.person.name), label: link.kind ? kinWord(shown, link.kind, link.person) : '?', how: how[link.how] })),
            webOpen,
            webHint: `You don't know who ${described.named ? shown.given : 'they'} know${described.named ? 's' : ''}. Ask about people you've met, watch who they keep company with, or get them talking.`,
            actions: [
              { id: 'talk', label: 'Talk', sub: standing.stance === 'hostile' ? "Won't talk" : `Rapport ${standing.standing.rapport}` },
              { id: 'insult', label: 'Insult', sub: 'Makes enemies', danger: true },
              { id: 'rob', label: 'Rob', sub: 'Take what they carry', danger: true },
            ],
            questions: (Object.entries(LINES.questions) as Array<[Exclude<Fact, 'nature' | 'drinks'>, string]>)
              .filter(([fact]) => !standing.knowledge.facts.includes(fact))
              .map(([fact, label]) => ({ fact, label })),
            gifts: gifts.map((g) => ({ id: g.id, name: g.name, count: g.count })),
            askAbout: known.filter((p) => p.id !== shown.id && named(p)).map((p) => ({ id: p.id, name: p.name })),
            log: game.conversation(shown.id).map((line) => ({ who: line.who, text: line.text })),
          }
        : null,
  });
}

/** Buys off the menu, and says how it went under the menu's header. */
function buyFromShop(id: string): void {
  lastActivity = performance.now();
  const item = game.menu()?.items.find((i) => i.id === id);
  if (!item) return;
  const had = game.wallet.eddies;
  shopStatus = game.buy(id) ? `Bought ${item.name} for ${item.price} €$ · €$ ${game.wallet.eddies} left` : `${item.name} is ${item.price} €$. You've got ${had} €$.`;
  showShop();
}

/** What settings shows: the city, and what starting over would lose. */
function showSettings(): void {
  const mapped = game.mapState.visited.size;
  const places = Object.keys(game.world.locations).length;
  settings.render({
    seed: game.world.seed.toUpperCase(),
    // A no-break space keeps the eddies sign with its number.
    progress: `Right now you've mapped ${mapped} of ${places} places and have €$\u00a0${game.wallet.eddies}.`,
  });
}

/** Throws away the game in progress and starts a city from the beginning. The new game saves over the old one. */
function startOver(seed: string, notice: string): void {
  MapOverlay.open?.close();
  target = null;
  transmissions.clear();
  begin(generateWorld(seed, CITY), undefined, notice);
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
    people.overlay.close();
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

  g.events.on('energyChanged', (status) => {
    energyMeter.update(status, Date.now());
    queueSave();
  });

  g.events.on('walletChanged', (wallet) => {
    showWallet(wallet, Date.now());
    if (inventory.overlay.isOpen) showInventory();
    if (shop.overlay.isOpen) showShop();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });

  g.events.on('inventoryChanged', () => {
    if (inventory.overlay.isOpen) showInventory();
    if (shop.overlay.isOpen) showShop();
    if (people.overlay.isOpen) showPeople();
    queueSave();
  });

  g.events.on('societyChanged', () => {
    if (people.overlay.isOpen) showPeople();
    if (shop.overlay.isOpen) showShop();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });

  g.events.on('charismaChanged', () => {
    if (people.overlay.isOpen) showPeople();
    queueSave();
  });

  g.events.on('inebriationChanged', (status) => {
    showCondition(status, Date.now());
    queueSave();
  });

  g.events.on('fx', ({ effect }) => {
    screen.play(effect);
    if (effect === 'lightning') hud.flickerSign();
  });
}

/** Drops the player into a city: a new game, or a saved one picking up where it left off. */
function begin(world: World, progress?: Progress, notice?: string): void {
  game = new Game(world, { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA }, progress);
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
  energyMeter.update(game.energy(Date.now()), Date.now());
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

let lastHour = -1;
/** The clock: lands trips that are due, moves the trip panel on, and lets people come and go on the hour. */
function tick(): void {
  const now = Date.now();
  game.tick(now);
  const hour = new Date(now).getHours();
  if (hour !== lastHour) {
    const first = lastHour === -1;
    lastHour = hour;
    if (!first) {
      if (people.overlay.isOpen) {
        game.look(now);
        showPeople();
      }
      if (!target && !game.currentTrip) refresh();
    }
  }
  const trip = game.currentTrip;
  if (trip && !target) place.update(tripProgress(trip, now).done, tripMeta(trip, now));
  showWallet(game.wallet, now);
  energyMeter.update(game.energy(now), now);
  showCondition(game.inebriation(now), now);
}

// Escape drops the current pick; + and - zoom.
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key === 'i' || event.key === 'I') inventory.overlay.toggle();
  // Escape closes whatever covers the map first, then lets go of whatever's picked.
  else if (event.key === 'Escape' && MapOverlay.open) MapOverlay.open.close();
  else if (event.key === 'Escape' && target) select(null);
  // The map's keys rest while something covers it.
  else if (MapOverlay.open) return;
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
