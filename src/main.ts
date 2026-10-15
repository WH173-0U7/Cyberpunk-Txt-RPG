import './style.css';
import { CITY } from './data/city';
import { ENERGY } from './data/energy';
import { FOOD } from './data/food';
import { GEAR } from './data/gear';
import { MONEY } from './data/money';
import { itemGrams, outfit, type PocketLoad, type Slot } from './engine/carry';
import { chipCut } from './engine/money';
import { INEBRIATION } from './data/inebriation';
import { LINES } from './data/dialogue';
import { PEOPLE } from './data/people';
import { CHARISMA } from './data/skills';
import { JOBS } from './data/jobs';
import { LIFE } from './data/life';
import { SOCIETY } from './data/society';
import { TRAVEL } from './data/travel';
import { blockAt } from './engine/buildings';
import { Game, type Presence, streetSpot } from './engine/game';
import type { JobStatus } from './engine/jobs';
import { GENERATOR_VERSION, generateWorld } from './engine/generate';
import type { Menu, Quality } from './engine/food';
import { kinWord, type Approach, type Question } from './engine/dialogue';
import type { InebriationStatus } from './engine/inebriation';
import { randomSeed } from './engine/rng';
import { createSave, progressFor, readSave, savedSeed, type Progress } from './engine/save';
import { snapToStreet } from './engine/streets';
import { tripProgress } from './engine/travel';
import type { Building, Item, TravelMode, Trip, TripPlan, Wallet, Weather, Whereabouts, World } from './engine/types';
import { GlitchText } from './fx/glitch';
import { ScreenFx } from './fx/screen';
import { applyTheme, resolveTheme } from './fx/theme';
import { WeatherFx } from './fx/weather';
import { ITEM_KINDS } from './data/items';
import { ARMS, ARMS_BLURBS } from './data/weapons';
import { CHROME, CHROME_BLURBS } from './data/cyberware';
import { COMBAT } from './data/combat';
import { HACKS } from './data/quickhacks';
import { MEDICAL } from './data/medical';
import { HOURS } from './data/hours';
import { medDetail } from './engine/medical';
import { FightPanel } from './ui/fight';
import { fitCheck, implantDetail, implantOf } from './engine/cyberware';
import { isGun, weaponDetail, weaponOf } from './engine/weapons';
import { formatClock, formatCountdown, formatDay, formatDuration, formatMinutes } from './ui/format';
import { Hud, WEATHER_LABEL } from './ui/hud';
import { EnergyMeter } from './ui/energy';
import { StatusPanel, type StatusRow } from './ui/status';
import { Bank } from './ui/bank';
import { Inventory, type ChromePageView, type InventoryItemView, type InventoryView, type PocketRowView } from './ui/inventory';
import { MapOverlay } from './ui/overlay';
import { stripMarkup } from './ui/markup';
import { CityMap, type Target } from './ui/map';
import { People, STANCE_LABEL, type PersonAction, type Picker } from './ui/people';
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
const hud = new Hud({ sign: $('#hud-sign'), path: $('#hud-path'), clock: $('#hud-clock') });
/** The sky where the player is: shown in the status drop-down, not on the header. */
let skyNow: Weather = 'clear';
const mapStage = $('#map-stage');
const saveStatus = $('#save-status');
const walletLabel = $('#wallet');

const transmissions = new Transmissions({ root: $('#transmissions'), announcer: $('#announcer') }, registerGlitch, reducedMotion);
// An overlay over the map puts the map and the panel out of reach until it closes.
MapOverlay.behind = [$('#map-stage'), $('#place')];

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
      bank: $<HTMLButtonElement>('#act-bank'),
      work: $<HTMLButtonElement>('#act-work'),
    },
    close: $<HTMLButtonElement>('#place-close'),
  },
  {
    onAction: (id) => act(id),
    // The corner button leaves the building the player is in; otherwise it drops what they picked.
    onClose: () => (game.interior && !target ? game.leave() : select(null)),
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
    controls: $('#map-zoom'),
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
    total: $('#inventory-total'),
    sections: $('#inventory-sections'),
  },
  () => {
    // It opens on the player head to toe.
    inventoryPath = [];
    showInventory();
  },
  {
    onOpen: (id) => {
      inventoryPath.push(id);
      showInventory();
    },
    onBack: () => {
      inventoryPath.pop();
      showInventory();
    },
    onUse: (id, pocket) => use(id, pocket),
    onUnload: (id) => unload(id),
    onDrop: (id, pocket) => drop(id, pocket),
    onWear: (id, pocket) => wear(id, pocket),
    onTakeOff: (id) => {
      lastActivity = performance.now();
      game.takeOff(id);
    },
    onTakeOut: (id) => {
      lastActivity = performance.now();
      game.uninstall(id, Date.now());
    },
  },
  reducedMotion,
);
/** Which pocket the inventory is looking into, by the pockets opened in turn; none for the outfit, `CHROME_PAGE` for the chrome. */
let inventoryPath: string[] = [];
/** The inventory's page for the chrome fitted: no pocket has this id. */
const CHROME_PAGE = ':chrome';

const settings = new Settings(
  {
    root: $('#settings'),
    close: $<HTMLButtonElement>('#settings-close'),
    seed: $('#settings-seed'),
    progress: $('#settings-progress'),
    build: $('#settings-build'),
    restart: $<HTMLButtonElement>('#settings-restart'),
    erase: $<HTMLButtonElement>('#settings-erase'),
    confirm: $('#settings-confirm'),
    confirmText: $('#settings-confirm-text'),
    confirmYes: $<HTMLButtonElement>('#settings-confirm-yes'),
    confirmNo: $<HTMLButtonElement>('#settings-confirm-no'),
    pronouns: $('#settings-pronouns'),
  },
  () => showSettings(),
  {
    onPronouns: (pronouns) => game.setPronouns(pronouns),
    onRestart: () => startOver(game.world.seed, 'Progress reset. This city starts over from the beginning.'),
    onErase: () => {
      saveSlot.clear();
      startOver(randomSeed(), 'Save erased. A new Night City boots up.');
    },
  },
  reducedMotion,
);

/** The header's buttons, which rest while a fight is on: there's no looking away. */
const HEADER = [$('#status-toggle'), $('#inventory-toggle')];

const fight = new FightPanel(
  {
    root: $('#fight'),
    close: $<HTMLButtonElement>('#fight-close'),
    kicker: $('#fight-kicker'),
    youArm: $('#fight-you-arm'),
    youFill: $('#fight-you-fill'),
    youHp: $('#fight-you-hp'),
    themName: $('#fight-them-name'),
    themArm: $('#fight-them-arm'),
    themFill: $('#fight-them-fill'),
    themHp: $('#fight-them-hp'),
    tell: $('#fight-tell'),
    log: $('#fight-log'),
    clock: $('#fight-clock'),
    seconds: $('#fight-seconds'),
    moves: $('#fight-moves'),
    hacks: $('#fight-hacks'),
    result: $('#fight-result'),
    done: $<HTMLButtonElement>('#fight-done'),
    lethal: $<HTMLButtonElement>('#fight-lethal'),
  },
  () => {
    const view = game.fightView();
    if (view) fight.render(view, Date.now());
  },
  () => {
    game.leaveFight();
    fight.reset();
    for (const el of HEADER) el.inert = false;
    if (!target && !game.currentTrip) refresh();
  },
  {
    onMove: (move, hack) => {
      lastActivity = performance.now();
      game.fightMove(move, Date.now(), hack);
    },
    onLethal: (on) => {
      lastActivity = performance.now();
      game.setLethal(on);
    },
  },
  reducedMotion,
);

const shop = new Shop(
  {
    root: $('#shop'),
    close: $<HTMLButtonElement>('#shop-close'),
    kicker: $('#shop-kicker'),
    blurb: $('#shop-blurb'),
    status: $('#shop-status'),
    list: $('#shop-list'),
  },
  () => showShop(),
  (id) => buyFromShop(id),
  reducedMotion,
);
/** What last happened at the counter, shown under the menu's header until it closes. */
let shopStatus = '';

const bank = new Bank(
  {
    root: $('#bank'),
    close: $<HTMLButtonElement>('#bank-close'),
    name: $('#bank-name'),
    figures: $('#bank-figures'),
    status: $('#bank-status'),
    picker: $('#bank-picker'),
    commands: $('#bank-commands'),
  },
  () => showBank(),
  {
    onDeposit: () => atTheCounter(() => game.deposit()),
    onWithdraw: (amount) => atTheCounter(() => game.withdraw(amount)),
    onChange: () => atTheCounter(() => game.exchange()),
    onChips: () => atTheCounter(() => game.bankChips()),
    onToggleWithdraw: () => {
      withdrawOpen = !withdrawOpen;
      showBank();
    },
  },
  reducedMotion,
);
/** What the counter last said, and whether the sums to withdraw are unfolded. */
let bankStatus = '';
let withdrawOpen = false;

/** Does something at the bank's counter; whatever the game says about it becomes the counter's line. */
function atTheCounter(act: () => boolean): void {
  lastActivity = performance.now();
  const said: string[] = [];
  const off = game.events.on('output', ({ text }) => said.push(text));
  act();
  off();
  bankStatus = said.at(-1) ?? '';
  withdrawOpen = false;
  showBank();
}

const people = new People(
  {
    root: $('#people'),
    close: $<HTMLButtonElement>('#people-close'),
    count: $('#people-count'),
    reputation: $('#people-rep'),
    list: $('#people-list'),
    empty: $('#people-empty'),
    card: $('#person'),
    cardName: $('#person-name'),
    cardStance: $('#person-stance'),
    cardKicker: $('#person-kicker'),
    cardFacts: $<HTMLButtonElement>('#person-facts'),
    cardWeb: $('#person-web'),
    cardLog: $('#person-log'),
    cardPicker: $('#person-picker'),
    cardCommands: $('#person-commands'),
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
      factsOpen = false;
      picker = null;
      showPeople();
    },
    onQuestion: (id, fact) => {
      lastActivity = performance.now();
      factsOpen = false;
      game.askFact(id, fact as Question, Date.now());
    },
    onToggleFacts: () => {
      // Unfolding what's known folds any command's choices away, so the web has the card to itself.
      factsOpen = !factsOpen;
      if (factsOpen) picker = null;
      showPeople();
    },
    onPicker: (which) => {
      picker = picker === which ? null : which;
      showPeople();
    },
    onAction: (action, id) => {
      // Insulting or robbing folds the row away again; anything said brings the transcript back over the facts and the web.
      if (action !== 'talk') picker = null;
      factsOpen = false;
      actOn(action, id);
    },
    onTalk: (id, approach) => {
      lastActivity = performance.now();
      picker = null;
      factsOpen = false;
      game.talk(id, Date.now(), approach as Approach);
    },
    onGift: (id, itemId) => {
      lastActivity = performance.now();
      picker = null;
      factsOpen = false;
      game.gift(id, itemId, Date.now());
    },
    onChop: (id, chipId) => {
      lastActivity = performance.now();
      picker = null;
      factsOpen = false;
      game.chop(id, chipId, Date.now());
    },
    onAsk: (id, aboutId) => {
      lastActivity = performance.now();
      factsOpen = false;
      game.ask(id, aboutId, Date.now());
    },
    onHeart: (id, move) => {
      lastActivity = performance.now();
      picker = null;
      factsOpen = false;
      const now = Date.now();
      if (move === 'askOut') game.askOut(id, now);
      else if (move === 'date') game.date(id, now);
      else if (move === 'official') game.makeOfficial(id, now);
      else game.endRomance(now);
      showPeople();
    },
  },
  reducedMotion,
);
/** The person whose card is open, if any: someone here, or anyone the player knows of. */
let personShown: string | null = null;
/** Whether what's known of them and their web are unfolded; and which command's choices are. */
let factsOpen = false;
let picker: Picker = null;

const energyMeter = new EnergyMeter({ root: $('#energy'), fill: $('#energy-fill') });
const statusPanel = new StatusPanel({ toggle: $<HTMLButtonElement>('#status-toggle'), summary: $('#status-summary'), list: $('#status'), foot: $('#status-foot') });
// Settings opens from the bottom of the drop-down, which folds away as it does: closed, it hands focus back to the drop-down's toggle.
$('#settings-toggle').addEventListener('click', () => {
  statusPanel.toggle(false);
  settings.overlay.show($('#status-toggle'));
});

let game: Game;
/** What the player has picked to go to, if anything. */
let target: Target | null = null;
let lastActivity = performance.now();
/** The mask the player had on at the last look, by kind: the panel's counter changes its mind when it changes. */
let lastMask: string | null = null;

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
  if (!plan) return;
  // The target goes before the trip starts, so the panel the trip redraws (and reads out) is the trip's, not the target's.
  const was = target;
  target = null;
  if (!game.go(plan, now)) {
    target = was;
    return;
  }
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
  } else if (id === 'bank' && game.bank()) {
    bankStatus = '';
    withdrawOpen = false;
    bank.overlay.show($('#act-bank'));
  } else if (id === 'work') game.work(now);
}

/** Something done to someone in the people overlay. */
function actOn(action: PersonAction, id: string): void {
  lastActivity = performance.now();
  const now = Date.now();
  if (action === 'talk') game.talk(id, now);
  else if (action === 'insult') game.insult(id, now);
  else if (action === 'rob') game.rob(id, now);
  else if (action === 'attack') game.attack(id, now);
  else if (action === 'hire') game.askForWork(id, now);
  else if (action === 'quit') game.quit(now);
}

// ───────────── The panel ─────────────

/** Shows what the player has picked, or the trip they're on, or the building they're in, or where they are. */
function refresh(): void {
  const now = Date.now();
  const trip = game.currentTrip;
  // The menu, the counter and the people are for where the player is; they go when they leave.
  if (shop.overlay.isOpen && !game.menu()) shop.overlay.close();
  if (bank.overlay.isOpen && !game.bank()) bank.overlay.close();
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
  return { id: 'walk', label: trip ? 'Walk here' : 'Walk', sub: formatMinutes(plan.minutes) };
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
  // The NCART takes a transfer too, so the account and a chip in your name count.
  const short = !covered && !game.affordsFare(plan.fare);
  return { id: 'ride', label: 'NCART', sub: `${formatMinutes(plan.minutes)} · ${short ? `${fare}, short` : fare}`, disabled: short };
}

function hereView(now: number): PanelView {
  const where = game.whereabouts;
  const district = game.districtOf(where);
  const name = game.nameOf(where);
  const location = game.location;
  if (location) {
    const menu = game.menu();
    const here = game.peopleHere(now).length;
    const barred = menu ? game.barred(now) : null;
    return {
      mode: 'here',
      kicker: `You are here · ${location.kindLabel}`,
      description: location.description,
      actions: [peopleAction(here), ...(menu ? [barred ? { id: 'menu' as const, label: menu.kind === 'gear' ? 'Shop' : 'Menu', sub: "Won't serve you", disabled: true } : menuAction(menu)] : [])],
      closable: false,
      announce: `${location.name}. ${stripMarkup(location.description)}${menu ? (menu.kind === 'gear' ? ' There is something for sale.' : ' There is a menu.') : ''} ${here ? `${here} people here.` : 'Nobody here.'}`,
    };
  }
  if (where.station) {
    const { passPrice, passDays, fare } = TRAVEL;
    const active = game.passActive(now);
    const lines = lineNames(where.station);
    return {
      mode: 'here',
      kicker: 'You are here · NCART',
      meta: active ? `Monthly pass valid until ${formatDay(game.wallet.passUntil)}` : undefined,
      description: `NCART, run by Night Corp. ${lines}. A ride costs ${fare} €$, or nothing with a monthly pass.`,
      actions: [
        {
          id: 'pass',
          label: active ? 'Extend pass' : 'Monthly pass',
          sub: `${passPrice} €$ · ${passDays} days`,
          disabled: !game.affordsFare(passPrice),
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
    kicker: `You are here${building ? ` · Block ${building.block}` : ''}`,
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
/** The Work button inside the player's workplace: what a shift pays and costs, or why not now. */
function workAction(shift: JobStatus, now: number): PanelAction {
  const masked = Boolean(game.masked());
  const tired = game.energy(now).current < shift.rung.energy;
  const why = shift.blocked === 'done' ? 'Done today' : shift.blocked === 'closed' ? `${JOBS.hours[0]}–${JOBS.hours[1]}h` : masked ? 'Not in a mask' : tired ? 'Too tired' : '';
  return { id: 'work', label: 'Work', sub: why || `${shift.pay} €$, ${shift.rung.energy} energy`, disabled: Boolean(why) };
}

function insideView(building: Building): PanelView {
  const now = Date.now();
  const menu = game.menu();
  const here = game.peopleHere(now).length;
  const barred = game.barred(now);
  const job = game.jobStatus(now);
  const shift = job?.here ? job : null;
  // Shut: nobody who works here is in. The sign says when someone will be.
  const closed = game.closed(now);
  const opens = closed?.opensAt ? `Opens ${formatClock(closed.opensAt)}` : 'Shut for good';
  const shut = closed ? `Closed. The shutters are half down and nobody's behind the counter. ${closed.opensAt ? `Someone's in again at ${formatClock(closed.opensAt)}.` : 'Nobody works here any more.'}` : '';
  // How the place is doing on its books, after what it sells.
  const trade = menu || closed ? ` ${game.trade(building).line}` : '';
  const description = (barred ?? (shut || (menu ? menuBlurb(menu) : game.bank() ? 'A counter, a teller, and a vault somewhere behind. Cash goes in, bills come out, coins get counted for a cut, and a credchip in your name is banked.' : here ? 'People live and work in here.' : 'Nobody around right now.'))) + trade;
  return {
    mode: 'inside',
    kicker: `Inside · Block ${building.block}`,
    meta: [menu ? '' : categoryOf(building).label, building.kindLabel, heightOf(building)].filter(Boolean).join(' · '),
    description,
    actions: [
      peopleAction(here),
      ...(menu ? [barred ? { id: 'menu' as const, label: menu.kind === 'gear' ? 'Shop' : 'Menu', sub: "Won't serve you", disabled: true } : menuAction(menu)] : []),
      ...(game.bank() ? [{ id: 'bank' as const, label: 'Bank', sub: `€$ ${game.wallet.account} banked` }] : []),
      ...(closed ? [{ id: closed.what === 'bank' ? ('bank' as const) : ('menu' as const), label: 'Closed', sub: opens, disabled: true }] : []),
      // The player's shift here: what it pays and costs, or why not now (masked, or too tired, it's refused).
      ...(shift ? [workAction(shift, now)] : []),
    ],
    // Leaving is the corner button, so the row keeps to what there is to do in here.
    closable: true,
    closeLabel: `Leave ${building.name}`,
    announce: `Inside ${building.name}. ${description} ${here ? `${here} people here.` : ''} Leave with the corner button.`,
  };
}

/** The people button: how many are here. */
function peopleAction(count: number): PanelAction {
  return { id: 'people', label: 'People', sub: count ? `${count} here` : 'Nobody here', disabled: !count };
}

/** The menu button: how much there is to eat (the prices are on the menu); a store's rack says how many things are on it. */
function menuAction(menu: Menu): PanelAction {
  if (menu.kind === 'gear') {
    const n = menu.items.length;
    return { id: 'menu', label: 'Shop', sub: n ? `${n} ${n === 1 ? 'thing' : 'things'}` : 'Nothing on the rack', disabled: !n };
  }
  const dishes = menu.items.filter((i) => i.kind === 'food').length;
  const sub = menu.items.length ? `${dishes} ${dishes === 1 ? 'dish' : 'dishes'}` : 'Nothing on it';
  return { id: 'menu', label: 'Menu', sub, disabled: !menu.items.length };
}

/** What the panel says about the place's menu or rack. */
function menuBlurb(menu: Menu): string {
  if (menu.kind === 'gear' && menu.items.some((i) => i.kind === 'cyberware')) {
    if (game.clinic()) return CHROME_BLURBS[menu.venue.quality];
    // A deck shop has only decks and the RAM for them; an outlet, a bit of everything.
    const decks = menu.items.every((i) => i.kind !== 'cyberware' || CHROME.implants[i.id]?.system === 'cyberdeck' || CHROME.implants[i.id]?.part === 'frontal-cortex');
    return CHROME_BLURBS[decks ? 'decks' : 'outlet'];
  }
  // A hospital, a clinic or a pharmacy says what it does (a ripperdoc's chrome says it for one).
  const medical = game.medical();
  if (menu.kind === 'gear' && medical && MEDICAL.blurbs[medical.key]) return MEDICAL.blurbs[medical.key]!;
  if (menu.kind === 'gear') {
    const weapons = menu.items.filter((i) => i.kind === 'weapon');
    const guns = weapons.filter((i) => {
      const weapon = ARMS.weapons[i.id];
      return weapon ? isGun(weapon, ARMS) : false;
    });
    if (guns.length) return ARMS_BLURBS[menu.venue.quality];
    if (weapons.length) return ARMS_BLURBS.blades;
    if (menu.items.some((i) => i.kind === 'ammo')) return ARMS_BLURBS.ammo;
    return menu.items.some((i) => i.kind === 'clothing') ? GEAR.blurbs[menu.venue.quality] : GEAR.blurbs.bags;
  }
  return FOOD.blurbs[menu.venue.chain ? 'chain' : menu.venue.quality];
}

/** "Luxury", "Cheap eats"…: the kind of eatery, as players read it. */
function qualityLabel(menu: Menu): string {
  // A hospital, a clinic or a pharmacy by the care it gives (a ripperdoc goes by its chrome).
  const medical = game.medical();
  if (menu.kind === 'gear' && medical && MEDICAL.blurbs[medical.key]) return MEDICAL.labels[menu.venue.quality];
  if (menu.kind === 'gear') return GEAR.labels[menu.venue.quality];
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

/** The eddies on you, in the map's head; the bank and the chips are in the status drop-down. */
function showWallet(wallet: Wallet, now: number): void {
  const pass = wallet.passUntil > now;
  walletLabel.textContent = `€$ ${wallet.eddies}${pass ? ' · Pass' : ''}`;
  walletLabel.classList.toggle('has-pass', pass);
  // The button's name says what's on it, too.
  $('#inventory-toggle').setAttribute('aria-label', `Inventory, ${wallet.eddies} €$ in cash${pass ? ', NCART pass' : ''}`);
  walletLabel.title = `${wallet.bills} €$ in bills, ${wallet.coins} €$ in coins, ${wallet.account} €$ in the bank${wallet.chips ? `, ${wallet.chips} €$ on chips` : ''}.${pass ? ` NCART monthly pass valid until ${formatDay(wallet.passUntil)}.` : ' Buy an NCART monthly pass at any station.'}`;
}

/** Fills the bank's counter with the account, the cash and the chips on you, and what can be done with them. */
function showBank(): void {
  const at = game.bank();
  const { bills, coins, account, chips } = game.wallet;
  const wallet = game.carry().pockets.find((p) => p.holds !== undefined);
  const carried = game.inventory.filter((item) => item.kind === 'credchip');
  const locked = carried.filter((item) => item.locked).length;
  bank.render({
    name: at?.name ?? 'Bank',
    account: `€$ ${account}`,
    bills: `€$ ${bills}${wallet ? ` of ${wallet.holds}` : ''}`,
    coins: `€$ ${coins} · ${formatGrams(coins * GEAR.gramsPerCoin)}`,
    chips: carried.length ? `${carried.length} · €$ ${chips}${locked ? `, ${locked} locked` : ''}` : 'None',
    fee: `${Math.round((at?.fee ?? 0) * 100)}% on coins`,
    status: bankStatus,
    canDeposit: bills + coins > 0,
    canChange: coins > 0,
    canBankChips: carried.length > locked,
    withdrawals: (at?.withdrawals ?? []).map((amount) => ({ amount, enabled: amount <= account })),
    withdrawOpen,
  });
}

/** Fills the inventory: the player head to toe, or the inside of the pocket they're looking into, and what's in it. */
function showInventory(): void {
  const { grams, pockets } = game.carry();
  const items = game.inventory;
  const order = Object.keys(ITEM_KINDS);
  const byKind = (a: Item, b: Item) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name);
  const tier = (p: { brand?: string; style?: PocketLoad['style']; quality?: Quality } | undefined) => (p ? [p.brand, p.style ? GEAR.styleLabels[p.style] : '', p.quality ? GEAR.labels[p.quality] : ''].filter(Boolean).join(' · ') : '');
  const view = (item: Item): InventoryItemView => ({
    id: item.id,
    in: item.in ?? '',
    name: item.name,
    count: item.count,
    use: useLabel(item),
    unload: item.kind === 'weapon' && game.canLoad(item.id).load && game.canLoad(item.id).unload,
    wear: item.kind === 'clothing' && Boolean(item.gear),
    weight: formatGrams(item.count * itemGrams(item, GEAR, FOOD.dishes)),
    detail: itemDetail(item, tier),
  });
  // What a new player comes dressed in stays on (it gets swapped); anything else worn, a hat or face wear, can come off.
  const required = new Set(GEAR.start.map((p) => GEAR.kinds[p.kind]?.slot));
  const row = (p: PocketLoad): PocketRowView => {
    const wallet = p.holds !== undefined;
    const holding = items.some((i) => i.in === p.id) || pockets.some((q) => q.in === p.id);
    return {
      id: p.id,
      name: p.name,
      sub: [tier(p), p.mask ? 'Hides your face' : ''].filter(Boolean).join(' · '),
      // Just the slots on the row; the kilos are on the pocket's own page.
      detail: wallet ? `€$ ${p.bills} of ${p.holds}${p.chips ? ` · ${p.chips}/${p.chipSlots} chips` : ''}` : p.slots ? `${p.load.slots}/${p.slots} slots` : 'No pockets',
      weight: formatGrams(p.grams),
      over: p.over,
      opens: wallet || p.slots > 0 || holding,
      removable: p.in === null && Boolean(p.slot) && !required.has(p.slot),
    };
  };
  // What the player is looking into, if it's still there; else back out to themselves.
  while (inventoryPath.length && inventoryPath.at(-1) !== CHROME_PAGE && !pockets.some((p) => p.id === inventoryPath.at(-1))) inventoryPath.pop();
  const open = inventoryPath.length ? pockets.find((p) => p.id === inventoryPath.at(-1)) : undefined;
  const chrome = game.chrome();
  let page: InventoryView['page'];
  if (inventoryPath.at(-1) === CHROME_PAGE) {
    page = chromePage();
  } else if (!open) {
    const { worn, bags } = outfit(pockets, GEAR);
    const load = (id: string | undefined) => (id ? pockets.find((p) => p.id === id) : undefined);
    page = {
      kind: 'outfit',
      slots: (Object.keys(GEAR.slotLabels) as Slot[]).map((slot) => {
        const garment = load(worn[slot]?.id);
        return { label: GEAR.slotLabels[slot], garment: garment ? row(garment) : null };
      }),
      bags: bags.map((b) => load(b.id)).filter((b): b is PocketLoad => Boolean(b)).map(row),
      chrome: {
        id: CHROME_PAGE,
        name: chrome.fitted.length ? `${chrome.fitted.length} ${chrome.fitted.length === 1 ? 'implant' : 'implants'}` : 'None fitted',
        sub: chrome.fitted.map((f) => f.short).slice(0, 3).join(', ') + (chrome.fitted.length > 3 ? '…' : ''),
        detail: `${chrome.used}/${chrome.capacity} capacity`,
        weight: '',
        over: false,
        opens: true,
      },
    };
  } else {
    const parent = open.in ? pockets.find((p) => p.id === open.in) : undefined;
    const figures: PocketPageFigures = [];
    if (open.holds !== undefined) figures.push({ label: 'Bills', value: `€$ ${open.bills} of ${open.holds}` });
    if (open.coins) figures.push({ label: 'Coins', value: `€$ ${open.coins} · ${formatGrams(open.coins * GEAR.gramsPerCoin)}` });
    page = {
      kind: 'pocket',
      id: open.id,
      name: open.name,
      sub: tier(open),
      note: open.note ?? '',
      load: open.holds !== undefined ? `${open.chips ?? 0}/${open.chipSlots ?? 0} card slots · ${formatGrams(open.grams)} all told` : open.slots ? `${open.load.slots}/${open.slots} slots · ${formatGrams(open.load.grams, true)} / ${formatGrams(open.maxGrams, true)}` : 'No pockets',
      over: open.over,
      back: parent ? parent.name : 'On you',
      items: items.filter((i) => i.in === open.id).sort(byKind).map(view),
      inside: pockets.filter((q) => q.in === open.id).map(row),
      figures,
    };
  }
  inventory.render({
    weight: formatGrams(grams),
    // Loose rounds are one thing, however many.
    count: items.reduce((n, item) => n + (item.kind === 'ammo' ? 1 : item.count), 0),
    page,
  });
}
type PocketPageFigures = Array<{ label: string; value: string }>;

/** The chrome page: every part of the body and what's fitted there; at a ripperdoc, each can come out. */
function chromePage(): ChromePageView {
  const chrome = game.chrome();
  const clinic = game.clinic();
  return {
    kind: 'chrome',
    name: 'Chrome',
    note: clinic ? `${clinic.name} fits chrome you carry, and takes chrome out: ${clinic.fee} €$ a time.` : 'Fitted by a ripperdoc, who can take it out again. Chrome you carry waits on one to fit it.',
    load: `${chrome.used}/${chrome.capacity} capacity`,
    back: 'On you',
    parts: (Object.keys(CHROME.parts) as Array<keyof typeof CHROME.parts>).map((part) => {
      const info = CHROME.parts[part];
      const here = chrome.fitted.filter((f) => f.part === part);
      return {
        label: info.label,
        count: `${here.length}/${info.slots}`,
        // The part is the heading: under it, an operating system says its kind, and each its maker and capacity.
        implants: here.map((f) => {
          const implant = CHROME.implants[f.id];
          const sub = implant ? [implant.system ? CHROME.systems[implant.system] : '', implant.maker, `${implant.capacity} capacity`].filter(Boolean).join(' · ') : '';
          return { id: f.id, name: f.name, sub, removable: Boolean(clinic) };
        }),
      };
    }),
  };
}

/** "250 g", "1.3 kg"; `kilos` always in kilos, for the limits. */
function formatGrams(grams: number, kilos = false): string {
  return grams >= 1000 || kilos ? `${(grams / 1000).toFixed(1)} kg` : `${Math.round(grams)} g`;
}

/** What using an item is called: food is eaten, the rest drunk. Nothing else can be used yet. */
/** A word on something carried: a credchip's balance and lock, a garment's brand and style, a weapon's class and magazine, what a round is for. */
function itemDetail(item: Item, tier: (p: { brand?: string; style?: PocketLoad['style']; quality?: Quality } | undefined) => string): string | undefined {
  if (item.kind === 'credchip') return `€$ ${item.balance ?? 0}${item.locked ? ' · locked' : ''}`;
  if (item.kind === 'clothing' && item.gear) return [tier(GEAR.kinds[item.gear]), GEAR.kinds[item.gear]?.mask ? 'Hides your face' : ''].filter(Boolean).join(' · ') || undefined;
  const weapon = weaponOf(item, ARMS);
  // A gun by its class and what's in it (the maker is on the rack); a blade by its class and maker.
  if (weapon && isGun(weapon, ARMS)) return [ARMS.classes[weapon.class]?.label, `${item.loaded ?? 0}/${weapon.magazine ?? 0}`, weapon.disposable ? 'sealed' : ''].filter(Boolean).join(' · ');
  if (weapon) return weaponDetail(weapon, ARMS);
  if (item.kind === 'ammo') return ARMS.ammo[item.id]?.for;
  const implant = implantOf(item, CHROME);
  if (implant) return implantDetail(implant, CHROME);
  const hack = item.kind === 'quickhack' ? HACKS.hacks[item.id] : undefined;
  if (hack) return `${hack.type} · ${hack.ram} RAM`;
  const med = item.kind === 'consumable' ? MEDICAL.meds[item.id] : undefined;
  if (med) return medDetail(med);
  return undefined;
}

/** What can be done with something from the inventory: eat a dish, drink a drink, take a med, load a gun or unload it, have a ripperdoc fit an implant. */
function useLabel(item: Item): string | undefined {
  if (item.kind === 'cyberware') return game.clinic() ? 'Fit' : undefined;
  if (item.kind === 'consumable' && MEDICAL.meds[item.id]) return 'Use';
  if (item.kind === 'weapon') {
    const can = game.canLoad(item.id);
    return can.load ? 'Load' : can.unload ? 'Unload' : undefined;
  }
  const dish = item.kind === 'consumable' ? FOOD.dishes.find((d) => d.id === item.id) : undefined;
  return dish ? (dish.kind === 'food' ? 'Eat' : 'Drink') : undefined;
}

/** Uses something from the inventory, from the pocket it was tapped in: eats or drinks it, or loads a gun (or unloads one that's full). */
function use(id: string, pocket: string): void {
  lastActivity = performance.now();
  const item = game.inventory.find((i) => i.id === id);
  if (item?.kind === 'weapon') {
    if (game.canLoad(id).load) game.load(id);
    else game.unload(id);
    return;
  }
  if (item?.kind === 'cyberware') {
    game.install(id, Date.now(), pocket || undefined);
    return;
  }
  game.consume(id, Date.now(), pocket || undefined);
}

/** Takes the rounds out of a gun that could take more. */
function unload(id: string): void {
  lastActivity = performance.now();
  game.unload(id);
}

/** Drops something from the inventory, from the pocket it was tapped in, to make room. */
function drop(id: string, pocket: string): void {
  lastActivity = performance.now();
  game.drop(id, pocket || undefined);
}

/** Puts on a garment from the inventory, from the pocket it was tapped in. */
function wear(id: string, pocket: string): void {
  lastActivity = performance.now();
  game.wear(id, Date.now(), pocket || undefined);
}

/** How drunk the player is, on the screen; the words are the status drop-down's. */
function showCondition(status: InebriationStatus): void {
  screen.setInebriation(status.severity);
}

/**
 * The status drop-down: the line under the energy bar says the energy level, when the next
 * point comes, and anything the matter (drunk, masked, on a shift somewhere); unfolded, the
 * rest: experience, charisma, eddies and the bank, the pass, the job, every reputation, the map.
 */
function showStatus(now: number): void {
  const energy = game.energy(now);
  const charisma = game.charisma();
  const wallet = game.wallet;
  const drunk = game.inebriation(now);
  const mask = game.masked();
  const armed = game.armed();
  const chrome = game.chrome();
  const health = game.health(now);
  const heat = game.heat(now);
  const cover = game.covered(now);
  const hurt = health.current < health.max;
  const stars = heat.stars ? '★'.repeat(heat.stars) : '';
  const heart = game.romance(now);
  const job = game.jobStatus(now);
  const pass = wallet.passUntil > now;
  const refill = energy.nextPointAt === null ? 'Full' : `+1 in ${formatCountdown(energy.nextPointAt - now)}`;
  const condition = drunk.stage ? `${drunk.stage.label} · sober in ${formatCountdown((drunk.soberAt ?? now) - now)}` : '';
  const summary = [`${energy.current}/${energy.max} · Lv ${energy.level} · ${refill}`, hurt ? `HP ${health.current}` : '', stars, drunk.stage?.label, mask ? 'Masked' : '', job ? job.rung.title : ''].filter(Boolean).join(' · ');
  const today = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const rows: StatusRow[] = [
    { label: 'Energy', value: `Lv ${energy.level} · ${energy.xp}/${energy.xpToNext} XP · ${refill}` },
    { label: 'Health', value: `${health.current}/${health.max}${health.fullAt ? ` · full in ${formatCountdown(health.fullAt - now)}` : ''}`, ...(health.current < health.max / 2 ? { tone: 'warn' as const } : {}) },
    { label: 'Trauma Team', value: cover ? `${cover.plan.name} · until ${formatDay(cover.until)}` : 'Not covered' },
    ...(stars ? [{ label: 'NCPD', value: `${stars} · cools in ${formatCountdown((heat.coolAt ?? now) - now)}`, tone: 'bad' as const }] : []),
    { label: 'Charisma', value: `Lv ${charisma.level} · ${charisma.xp}/${charisma.xpToNext} XP` },
    { label: 'Eddies', value: `€$ ${wallet.eddies} on you${wallet.account ? ` · €$ ${wallet.account} banked` : ''}${wallet.chips ? ` · €$ ${wallet.chips} on chips` : ''}` },
    { label: 'NCART', value: pass ? `Pass until ${formatDay(wallet.passUntil)}` : 'No pass' },
    { label: 'Heart', value: heart ? `${heart.stage === 'together' ? 'Together with' : 'Seeing'} ${heart.name} · ${heart.dates} ${heart.dates === 1 ? 'date' : 'dates'} · ♥ ${heart.spark}` : 'Seeing no one' },
    { label: 'Work', value: job ? `${job.rung.title} at ${job.building.name} · ${job.shifts} ${job.shifts === 1 ? 'shift' : 'shifts'}${job.next ? ` · trust ${job.trust}, ${job.next.title.toLowerCase()} at ${job.next.at}` : ' · top of the ladder'} · trade ${game.trade(job.building).health}` : 'No job' },
    ...(condition ? [{ label: 'Condition', value: condition, tone: 'warn' as const }] : []),
    ...(mask ? [{ label: 'Mask', value: `${mask.name} · nobody knows your face`, tone: 'warn' as const }] : []),
    { label: 'Armed', value: armed ? `${armed.name}${armed.gun ? ` · ${armed.loaded}/${armed.magazine}` : ''}` : 'Nothing but your hands' },
    { label: 'Chrome', value: chrome.fitted.length ? `${chrome.fitted.map((f) => f.short).join(', ')} · ${chrome.used}/${chrome.capacity} capacity` : `None · ${chrome.capacity} capacity free` },
    ...game.reputation(now).map((r) => ({ label: r.label, value: `${r.value > 0 ? '+' : '−'}${Math.abs(r.value)}`, tone: (r.value < 0 ? 'bad' : 'good') as 'bad' | 'good' })),
    { label: 'Mapped', value: `${game.mapState.visited.size} of ${Object.keys(game.world.locations).length} places` },
    { label: 'Weather', value: WEATHER_LABEL[skyNow] },
    { label: 'Date', value: `2077.${pad(today.getMonth() + 1)}.${pad(today.getDate())}` },
  ];
  statusPanel.render(summary, rows);
}

/** Fills the menu with what's for sale where the player is, and whether they can afford it. */
function showShop(): void {
  const menu = game.menu();
  if (!menu) {
    shop.render({ kicker: 'No menu', blurb: 'Nothing to eat here.', status: '', items: [] });
    return;
  }
  const { items } = menu;
  // Stacks of the same thing in different pockets count together.
  const carried = new Map<string, number>();
  // A weapon counts by its model, each one its own item; rounds by the round.
  for (const item of game.inventory) carried.set(item.weapon ?? item.id, (carried.get(item.weapon ?? item.id) ?? 0) + item.count);
  const now = Date.now();
  const barred = game.barred(now);
  const clinic = game.clinic();
  const chrome = game.chromeSaved;
  const cover = game.covered(now);
  shop.render({
    kicker: qualityLabel(menu),
    blurb: barred ?? menuBlurb(menu),
    status: shopStatus,
    // Cash, or a transfer where this counter takes one: the game knows which.
    items: items.map((item) => {
      const row = { ...item, affordable: !barred && game.affords(item.id, now), barred: Boolean(barred), carried: carried.get(item.id) ?? 0 };
      // A service is had, not carried: treatment there and then, a plan signed (or renewed).
      if (item.kind === 'treatment') return { ...row, verb: 'Treat' };
      if (item.kind === 'plan') return { ...row, verb: cover?.id === item.id ? 'Renew' : 'Sign up', detail: cover?.id === item.id ? `${item.detail} · yours until ${formatDay(cover.until)}` : item.detail };
      if (item.kind !== 'cyberware' || !clinic) return row;
      // A ripperdoc fits what it sells: the rack says whether it would go in, and what it would take the place of.
      const check = fitCheck(chrome, item.id, CHROME.capacity, CHROME);
      const state = check.ok ? (check.replaces ? `Replaces ${CHROME.implants[check.replaces]?.name ?? check.replaces}` : '') : check.why === 'fitted' ? 'Fitted' : 'No capacity';
      return { ...row, verb: 'Fit', detail: [item.detail, state].filter(Boolean).join(' · '), affordable: row.affordable && check.ok, why: check.ok ? undefined : check.why === 'fitted' ? 'in you already' : 'not enough capacity left' };
    }),
  });
}

/** Fills the people overlay: everyone here, or the card of one person (here, or only known of). */
function showPeople(): void {
  const now = Date.now();
  const here = game.peopleHere(now);
  const known = game.knownPeople();
  const present = personShown ? here.find((p) => p.person.id === personShown) : undefined;
  const shown = present?.person ?? (personShown ? known.find((p) => p.id === personShown) : undefined);
  if (personShown && !shown) personShown = null;
  const standing = shown ? game.standingWith(shown.id, now) : null;
  const gifts = game.inventory.filter((item) => item.kind === 'consumable' && FOOD.dishes.some((d) => d.id === item.id));
  const hot = game.inventory.filter((item) => item.kind === 'credchip' && item.locked);
  const gangOf = (id: string | null) => (id ? PEOPLE.gangs[id]?.name : undefined);
  const mask = game.masked();
  const how = { seen: 'seen together', told: 'told', asked: 'asked' };
  const nameOf = (id: string, fallback: string) => game.describe(id)?.name ?? fallback;
  const described = shown ? game.describe(shown.id, now) : null;
  people.render({
    count: `${here.length} ${here.length === 1 ? 'person' : 'people'}`,
    // The standing lines belong to the list; a card is about one person.
    // What's on the player that people here can see; the rest of their standing is the status drop-down's.
    reputation: shown || !mask ? [] : [`Masked · they see a ${mask.word}, not a face`],
    rows: here.map(({ person, doing, stance, scene }) => {
      const about = game.describe(person.id);
      return {
        id: person.id,
        name: about?.name ?? person.name,
        // The gang shows on sight (a stranger's look says it already); the job only once known (a gang member's job is the gang).
        sub: [gangOf(person.gang) && about?.named ? `${gangOf(person.gang)} colors` : undefined, person.gang ? undefined : about?.facts.job].filter(Boolean).join(' · '),
        doing: withCompany(doing, scene),
        stance,
        stanceLabel: STANCE_LABEL[stance],
      };
    }),
    empty: 'Nobody here right now. People keep hours: workers by day, regulars in the evening, residents at night.',
    card:
      shown && standing && described
        ? {
            id: shown.id,
            name: described.name,
            stance: standing.stance,
            stanceLabel: STANCE_LABEL[standing.stance],
            kicker: [gangOf(shown.gang) && described.named ? `${gangOf(shown.gang)} colors` : undefined, present ? withCompany(present.doing, present.scene) : described.facts.dead ? 'Dead' : 'Not here'].filter(Boolean).join(' · '),
            facts: described.lines.length ? described.lines.join(' · ') : described.named ? 'That\'s all you know.' : 'Nothing known yet. Talk, watch, ask.',
            factsOpen,
            here: Boolean(present),
            web: standing.web.map((link) => ({ id: link.person.id, name: nameOf(link.person.id, link.person.name), label: link.kind ? kinWord(shown, link.kind, link.person) : '?', how: how[link.how] })),
            webHint: `You don't know who ${described.named ? shown.given : 'they'} know${described.named ? 's' : ''}. Ask about people you've met, watch who they keep company with, or get them talking.`,
            picker,
            questions: (Object.entries(LINES.questions) as Array<[Question, { label: string }]>)
              .filter(([fact]) => !standing.knowledge.facts.includes(fact))
              .map(([fact, q]) => ({ fact, label: q.label })),
            // A few worth asking about (seen with them, family by the name, here with them, talked to lately), never everyone known.
            askAbout: present ? game.worthAsking(shown.id, now).map((p) => ({ id: p.id, name: p.name })) : [],
            gifts: gifts.map((g) => ({ id: g.id, name: g.name, count: g.count })),
            // A hot chip can be put to a netrunner the player can tell is one; the label says what it holds and what they'd keep.
            chops: present && game.canChop(shown.id) ? hot.map((c) => ({ id: c.id, label: `€$ ${c.balance ?? 0} chip · cut ${chipCut(c.balance ?? 0, MONEY)}` })) : [],
            work: present ? game.workWith(shown.id) : null,
            heart: game.romanceWith(shown.id, now),
            // Chat first, a flirt last.
            approaches: [{ id: 'chat', label: 'Chat' }, ...Object.entries(LINES.approaches).sort(([a], [b]) => Number(a === 'flirt') - Number(b === 'flirt')).map(([id, a]) => ({ id, label: a.label }))],
            log: game.conversation(shown.id).map((line) => ({ who: line.who, text: line.text, ...(line.tone ? { tone: line.tone } : {}) })),
          }
        : null,
  });
}

/** What someone is doing, and with whom, as the player can tell them: "eating Wontons · arguing with a woman in Mox colors". */
function withCompany(doing: string, scene: Presence['scene']): string {
  if (!scene) return doing;
  const other = game.describe(scene.with);
  const name = other ? (other.named ? other.name : other.name.replace(/^(An?) /, (m) => m.toLowerCase())) : 'someone';
  // "holding court · holding court with": the scene says it once.
  return scene.phrase.startsWith(doing) ? `${scene.phrase} ${name}` : `${doing} · ${scene.phrase} ${name}`;
}

/** Buys off the menu, and says how it went under the menu's header. */
function buyFromShop(id: string): void {
  lastActivity = performance.now();
  const item = game.menu()?.items.find((i) => i.id === id);
  if (!item) return;
  // The game says why not, if not: short of eddies, no pocket with room, barred.
  const why = game.canBuy(id);
  const before = game.wallet;
  const bought = !why && game.buy(id);
  const how = bought && game.wallet.account < before.account ? 'by transfer' : bought && game.wallet.chips < before.chips ? 'by chip' : 'in cash';
  const what = item.kind === 'ammo' ? `a box of ${item.name} (${ARMS.ammo[item.id]?.box ?? 0} rounds)` : item.name;
  shopStatus = why ?? (bought ? `Bought ${what} for ${item.price} €$ ${how} · €$ ${game.wallet.eddies} on you${game.wallet.account ? `, €$ ${game.wallet.account} banked` : ''}` : '');
  showShop();
}

/** What settings shows: the city, and what starting over would lose. */
function showSettings(): void {
  const mapped = game.mapState.visited.size;
  const places = Object.keys(game.world.locations).length;
  settings.render({
    seed: game.world.seed.toUpperCase(),
    // A no-break space keeps the eddies sign with its number.
    progress: `Right now you've mapped ${mapped} of ${places} places and have ${game.wallet.eddies}\u00a0€$ on you${game.wallet.account ? ` and ${game.wallet.account}\u00a0€$ in the bank` : ''}.`,
    build: `${__CHANNEL__ === 'beta' ? 'Beta' : 'Stable'} build ${__BUILD__}${__CHANNEL__ === 'beta' ? ' · its own save, apart from the stable game' : ''}`,
    pronouns: game.pronouns,
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
    saveStatus.textContent = saved ? '' : 'Not saved';
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
    // What someone says is on their card; the feed only repeats it once that's closed.
    if (tone === 'talk' && people.overlay.isOpen) return;
    transmissions.push(text, tone);
    if (tone === 'error') screen.nudge(mapStage);
  });

  g.events.on('arrived', ({ from, where, place: location, district }) => {
    const theme = resolveTheme(district, location);
    applyTheme(theme);
    skyNow = location?.weather ?? district?.weather ?? 'clear';
    weather.setWeather(skyNow);
    weather.setTint(theme.primary);
    hud.setLocation(g.nameOf(where), district?.name ?? 'Night City', g.neighborhoodOf(where));
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
    skyNow = building ? 'clear' : (district?.weather ?? 'clear');
    weather.setWeather(skyNow);
    hud.setLocation(building ? building.name : g.nameOf(where), district?.name ?? 'Night City', g.neighborhoodOf(where));
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
    // A mask on or off changes what the counter here will do, so the panel looks again.
    const mask = g.masked()?.kind ?? null;
    if (mask !== lastMask) {
      lastMask = mask;
      if (!target && !g.currentTrip) refresh();
    }
    queueSave();
  });

  g.events.on('fightChanged', (view) => {
    if (!view) return;
    const opening = !fight.overlay.isOpen;
    if (opening) fight.overlay.show();
    fight.render(view, Date.now());
    if (opening) fight.focusFirst();
    for (const el of HEADER) el.inert = g.fighting;
    if (view.over) queueSave();
  });

  g.events.on('healthChanged', () => {
    // Patched up, the treatment on the rack is for less.
    if (shop.overlay.isOpen) showShop();
    queueSave();
  });

  g.events.on('coverageChanged', () => queueSave());

  g.events.on('chromeChanged', () => {
    if (inventory.overlay.isOpen) showInventory();
    if (shop.overlay.isOpen) showShop();
    queueSave();
  });

  g.events.on('societyChanged', () => {
    if (people.overlay.isOpen) showPeople();
    if (shop.overlay.isOpen) showShop();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });

  g.events.on('jobChanged', () => {
    if (people.overlay.isOpen) showPeople();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });

  g.events.on('charismaChanged', () => {
    if (people.overlay.isOpen) showPeople();
    queueSave();
  });

  g.events.on('youChanged', () => {
    if (settings.overlay.isOpen) showSettings();
    queueSave();
  });

  g.events.on('inebriationChanged', (status) => {
    showCondition(status);
    queueSave();
  });

  g.events.on('fx', ({ effect }) => {
    screen.play(effect);
    if (effect === 'lightning') hud.flickerSign();
  });
}

/** Drops the player into a city: a new game, or a saved one picking up where it left off. */
function begin(world: World, progress?: Progress, notice?: string): void {
  game = new Game(world, { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, hours: HOURS }, progress);
  wire(game);
  map.setWorld(world);
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
  try {
    const saved = readSave(raw);
    const world = saved ? generateWorld(saved.seed, CITY) : null;
    const progress = saved && world ? progressFor(world, saved, GENERATOR_VERSION) : null;
    if (world && progress) {
      begin(world, progress);
      return;
    }
  } catch (error) {
    // A save that reads but won't play is no reason never to start again: the same city, from the top.
    console.error('The save would not load:', error);
    begin(generateWorld(savedSeed(raw) ?? randomSeed(), CITY), undefined, "Your save wouldn't load. Night City starts over for you.");
    return;
  }
  // A save from before the game changed how cities (or saves) work: keep the city, start the map over.
  const oldSeed = savedSeed(raw);
  if (oldSeed) {
    begin(generateWorld(oldSeed, CITY), undefined, 'Night City has changed since you were last here. You start over in it.');
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
  if (fight.overlay.isOpen) fight.clock(now);
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
  showCondition(game.inebriation(now));
  showStatus(now);
}

// Escape drops the current pick; + and - zoom.
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  // In a fight there's no looking away: the keys rest until it's over.
  if (game.fighting) return;
  if (event.key === 'i' || event.key === 'I') inventory.overlay.toggle();
  // Escape backs out of a person's card to the list, then closes whatever covers the map, then the status drop-down, then lets go of whatever's picked.
  else if (event.key === 'Escape' && people.overlay.isOpen && personShown) {
    const was = personShown;
    personShown = null;
    factsOpen = false;
    picker = null;
    showPeople();
    (document.querySelector<HTMLElement>(`#people-list [data-id="${was}"]`) ?? $('#people-close')).focus({ preventScroll: true });
  } else if (event.key === 'Escape' && MapOverlay.open) MapOverlay.open.close();
  else if (event.key === 'Escape' && statusPanel.isOpen) {
    statusPanel.toggle(false);
    $('#status-toggle').focus({ preventScroll: true });
  }
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
