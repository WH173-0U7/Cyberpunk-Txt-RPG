import './style.css';
import { CITY } from './data/city';
import { ENERGY } from './data/energy';
import { FOOD } from './data/food';
import { GEAR } from './data/gear';
import { MONEY } from './data/money';
import { itemGrams, outfit, type PocketLoad, type Slot } from './engine/carry';
import { chipCut, notesLine } from './engine/money';
import { INEBRIATION } from './data/inebriation';
import { LINES } from './data/dialogue';
import { PEOPLE } from './data/people';
import { CHARISMA, TRADING } from './data/skills';
import { JOBS } from './data/jobs';
import { LIFE } from './data/life';
import { SOCIETY } from './data/society';
import { TRAVEL } from './data/travel';
import { blockAt } from './engine/buildings';
import { Game, type Description, type MarketView, type PersonStanding, type Presence, streetSpot } from './engine/game';
import type { TradeKind } from './engine/trade';
import type { BusinessView, PriceLevel } from './engine/economy';
import type { HomeView } from './engine/home';
import { hasRooms, type RoomAccess } from './engine/rooms';
import type { JobStatus } from './engine/jobs';
import { GENERATOR_VERSION, generateWorld } from './engine/generate';
import type { Menu, Quality } from './engine/food';
import type { ChatMove } from './engine/chat';
import type { TextKind } from './engine/phone';
import { lookWords, nameFor, type Character } from './engine/character';
import { kinWord, type Approach, type Question } from './engine/dialogue';
import type { InebriationStatus } from './engine/inebriation';
import type { HungerStatus } from './engine/needs';
import { createRng, randomSeed } from './engine/rng';
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
import { COMBAT, JOIN } from './data/combat';
import { HACKS } from './data/quickhacks';
import { MEDICAL } from './data/medical';
import { HOURS } from './data/hours';
import { ROOMS } from './data/rooms';
import { HOME } from './data/home';
import { CREDIT } from './data/credit';
import { TRADE } from './data/trade';
import { NEEDS } from './data/needs';
import { POLICE } from './data/police';
import { DEALING } from './data/dealing';
import { ROBBERY } from './data/robbery';
import { DOWNED } from './data/downed';
import { PHONE } from './data/phone';
import { CHARACTER } from './data/character';
import type { PoliceView } from './engine/police';
import type { RunnerView } from './engine/crew';
import type { DealView } from './engine/dealing';
import type { HabitView } from './engine/habit';
import type { FinishKind } from './engine/combat';
import { medDetail } from './engine/medical';
import { FightPanel } from './ui/fight';
import { fitCheck, implantDetail, implantOf } from './engine/cyberware';
import { isGun, weaponDetail, weaponOf } from './engine/weapons';
import { formatClock, formatCountdown, formatDay, formatDays, formatDuration, formatMinutes } from './ui/format';
import { Hud, WEATHER_LABEL } from './ui/hud';
import { EnergyMeter } from './ui/energy';
import { StatusPanel, type StatusRow } from './ui/status';
import { Bank } from './ui/bank';
import { Books, type BooksPicker } from './ui/books';
import { RoomsPanel } from './ui/rooms';
import { Inventory, type ChromePageView, type InventoryItemView, type InventoryView, type PocketRowView } from './ui/inventory';
import { MapOverlay } from './ui/overlay';
import { stripMarkup } from './ui/markup';
import { CityMap, type Target } from './ui/map';
import { People, STANCE_LABEL, type CardTab, type PeopleTab, type PersonAction, type Picker } from './ui/people';
import { Phone } from './ui/phone';
import { MainMenu } from './ui/menu';
import { Builder } from './ui/builder';
import { PlacePanel, type ActionId, type PanelAction, type PanelView } from './ui/place';
import { saveSlot } from './ui/save-slot';
import { Settings } from './ui/settings';
import { Shop, type SellItemView } from './ui/shop';
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
    room: $<HTMLButtonElement>('#place-room'),
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
      'pick-1': $<HTMLButtonElement>('#act-pick-1'),
      'pick-2': $<HTMLButtonElement>('#act-pick-2'),
      'pick-3': $<HTMLButtonElement>('#act-pick-3'),
      leave: $<HTMLButtonElement>('#act-leave'),
      menu: $<HTMLButtonElement>('#act-menu'),
      people: $<HTMLButtonElement>('#act-people'),
      bank: $<HTMLButtonElement>('#act-bank'),
      work: $<HTMLButtonElement>('#act-work'),
      deal: $<HTMLButtonElement>('#act-deal'),
      home: $<HTMLButtonElement>('#act-home'),
      move: $<HTMLButtonElement>('#act-move'),
      buy: $<HTMLButtonElement>('#act-buy'),
      books: $<HTMLButtonElement>('#act-books'),
      sell: $<HTMLButtonElement>('#act-sell'),
    },
    close: $<HTMLButtonElement>('#place-close'),
  },
  {
    onAction: (id) => act(id),
    // The corner button leaves the building the player is in; otherwise it drops what they picked.
    onClose: () => (game.interior && !target ? game.leave() : select(null)),
    onRooms: () => {
      roomsStatus = '';
      rooms.overlay.show($('#place-room'));
    },
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
    // It opens on the player head to toe, unless it was opened onto a page of its own.
    inventoryPath = inventoryOpensAt ? [inventoryOpensAt] : [];
    inventoryOpensAt = null;
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
    onUse: (id, pocket) => {
      if (pocket !== STASH_PAGE) return use(id, pocket);
      lastActivity = performance.now();
      game.unstash(id);
    },
    onUnload: (id) => unload(id),
    onCut: (id, pocket) => {
      lastActivity = performance.now();
      game.cut(id, pocket || undefined);
    },
    // At home, what would be dropped goes in the stash.
    onDrop: (id, pocket) => {
      if (!game.stash()) return drop(id, pocket);
      lastActivity = performance.now();
      game.stashIt(id, pocket || undefined);
    },
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
/** The stash at home, as a page of the inventory. */
const STASH_PAGE = ':stash';
/** A page the inventory opens straight onto, once (the stash, from the panel's button). */
let inventoryOpensAt: string | null = null;

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
    menu: $<HTMLButtonElement>('#settings-menu'),
  },
  () => showSettings(),
  {
    onPronouns: (pronouns) => game.setPronouns(pronouns),
    onRestart: () => startOver(game.world.seed, 'Progress reset. This city starts over from the beginning.'),
    onErase: () => {
      saveSlot.clear();
      gameOver('Save erased. Make someone new for a new Night City.');
    },
    onMenu: () => {
      settings.overlay.close();
      showMenu();
    },
  },
  reducedMotion,
);

/** The header's buttons, which rest while a fight is on: there's no looking away. */
const HEADER = [$('#status-toggle'), $('#inventory-toggle'), $('#phone-toggle')];

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
    foes: $('#fight-foes'),
    allies: $('#fight-allies'),
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
    onTarget: (id) => {
      lastActivity = performance.now();
      game.fightTarget(id, Date.now());
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
    tabs: $('#shop-tabs'),
    list: $('#shop-list'),
  },
  () => showShop(),
  {
    onBuy: (id) => buyFromShop(id),
    onSell: (id, from) => sellToShop(id, from),
    onMode: (mode) => {
      shopMode = mode;
      shopStatus = '';
      showShop();
    },
  },
  reducedMotion,
);
/** What last happened at the counter, shown under the menu's header until it closes; and whether it's buying or selling. */
let shopStatus = '';
let shopMode: 'buy' | 'sell' = 'buy';

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
      loanOpen = false;
      showBank();
    },
    onToggleLoan: () => {
      loanOpen = !loanOpen;
      withdrawOpen = false;
      showBank();
    },
    onBorrow: (amount) => atTheCounter(() => game.borrow(amount, Date.now())),
    onRepay: () => atTheCounter(() => game.repayLoan(Date.now())),
  },
  reducedMotion,
);
/** What the counter last said, and whether the sums to withdraw are unfolded. */
let bankStatus = '';
let withdrawOpen = false;
let loanOpen = false;

const books = new Books(
  {
    root: $('#books'),
    close: $<HTMLButtonElement>('#books-close'),
    name: $('#books-name'),
    figures: $('#books-figures'),
    status: $('#books-status'),
    picker: $('#books-picker'),
    commands: $('#books-commands'),
  },
  () => showBooks(),
  {
    onPicker: (open) => {
      booksPicker = booksPicker === open ? null : open;
      showBooks();
    },
    onPutIn: (amount) => atTheBooks(() => game.putIn(amount, Date.now())),
    onTakeOut: () => atTheBooks(() => game.takeOut(Date.now())),
    onPrices: (level) => atTheBooks(() => game.setPrices(level as PriceLevel, Date.now())),
    onSell: () => atTheBooks(() => game.sellBusiness(Date.now())),
  },
  reducedMotion,
);
/** What the books last said, and which choices are unfolded. */
let booksStatus = '';
let booksPicker: BooksPicker = null;

const rooms = new RoomsPanel(
  {
    root: $('#rooms'),
    close: $<HTMLButtonElement>('#rooms-close'),
    floor: $('#rooms-floor'),
    list: $('#rooms-list'),
    status: $('#rooms-status'),
    floors: $('#rooms-floors'),
  },
  () => showRooms(),
  {
    // Walking into a room closes the overlay on it; a door that won't open says why, and stays.
    onGo: (id) => atTheDoor(() => game.goRoom(id, Date.now()), true),
    onKnock: (id) => atTheDoor(() => game.knock(id, Date.now()) && game.room()?.id === id, true),
    onFloor: (floor) => atTheDoor(() => game.goFloor(floor, Date.now()), false),
  },
  reducedMotion,
);
/** What the last door said. */
let roomsStatus = '';

/** Tries a door; what the game says about it becomes the overlay's line, and going through one closes the overlay when `closes`. */
function atTheDoor(act: () => boolean, closes: boolean): void {
  lastActivity = performance.now();
  const said: string[] = [];
  const off = game.events.on('output', ({ text }) => said.push(text));
  const through = act();
  off();
  roomsStatus = said.at(-1) ?? '';
  if (through && closes) rooms.overlay.close();
  else showRooms();
}

/** A small number from a string, the same every time: which of a room's blurbs a building has. */
function hashOf(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** Fills the rooms overlay: the floor the player is on, its rooms, and the stairs. */
function showRooms(): void {
  const view = game.roomsView(Date.now());
  if (!view) {
    rooms.overlay.close();
    return;
  }
  const note: Record<RoomAccess, string> = { here: 'You are here', open: '', staff: 'Staff only', locked: 'Locked', yours: 'Your room' };
  rooms.render({
    floorLabel: view.floors > 1 ? (view.floor === 1 ? `Ground floor of ${view.floors}` : `Floor ${view.floor} of ${view.floors}`) : 'Ground floor',
    floor: view.floor,
    floors: view.floors,
    status: roomsStatus,
    rooms: view.rooms.map(({ room, access }) => ({
      id: room.id,
      name: room.name,
      note: note[access],
      open: access === 'open' || access === 'yours',
      knock: access === 'locked' && room.kind === 'unit',
      here: access === 'here',
    })),
  });
}

/** Does something at the bank's counter; whatever the game says about it becomes the counter's line. */
function atTheCounter(act: () => boolean): void {
  lastActivity = performance.now();
  const said: string[] = [];
  const off = game.events.on('output', ({ text }) => said.push(text));
  act();
  off();
  bankStatus = said.at(-1) ?? '';
  withdrawOpen = false;
  loanOpen = false;
  showBank();
}

/** Does something at the books of the player's own storefront; whatever the game says about it becomes the books' line. */
function atTheBooks(act: () => boolean): void {
  lastActivity = performance.now();
  const said: string[] = [];
  const off = game.events.on('output', ({ text }) => said.push(text));
  act();
  off();
  booksStatus = said.at(-1) ?? '';
  booksPicker = null;
  if (game.books()) showBooks();
  else books.overlay.close();
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
    cardTabs: $('#person-tabs'),
    cardProfile: $('#person-profile'),
    cardWeb: $('#person-web'),
    tabs: $('#people-tabs'),
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
      cardTab = 'talk';
      picker = null;
      showPeople();
    },
    onQuestion: (id, fact) => {
      lastActivity = performance.now();
      cardTab = 'talk';
      game.askFact(id, fact as Question, Date.now());
    },
    onRoster: (id, day) => {
      // On that day or off it; a job keeps at least one.
      lastActivity = performance.now();
      const now = Date.now();
      const days = rosterOf(id, now).filter((d) => d.on).map((d) => d.day);
      game.setRoster(id, days.includes(day) ? days.filter((d) => d !== day) : [...days, day], now);
      showPeople();
    },
    onCardTab: (tab) => {
      // The profile folds any command's choices away, so it has the card to itself.
      cardTab = tab;
      if (tab === 'profile') picker = null;
      showPeople();
    },
    onTab: (tab) => {
      peopleTab = tab;
      personShown = null;
      picker = null;
      showPeople();
    },
    onPicker: (which) => {
      picker = picker === which ? null : which;
      showPeople();
    },
    onAction: (action, id) => {
      // Insulting or robbing folds the row away again; anything said brings the transcript back over the facts and the web.
      if (action !== 'talk') picker = null;
      cardTab = 'talk';
      actOn(action, id);
    },
    onTalk: (id, approach) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.talk(id, Date.now(), approach as Approach);
    },
    onReply: (id, move) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.reply(id, move as ChatMove, Date.now());
      showPeople();
    },
    onGift: (id, itemId) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.gift(id, itemId, Date.now());
    },
    onChop: (id, chipId) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.chop(id, chipId, Date.now());
    },
    onKill: (id, way) => {
      lastActivity = performance.now();
      picker = null;
      if (game.killCold(id, way as FinishKind, Date.now())) showPeople();
    },
    onDeal: (id, option) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.deal(id, option, Date.now());
      showPeople();
    },
    onMoney: (id, option) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
      game.moneyMove(id, option, Date.now());
      showPeople();
    },
    onHeart: (id, move) => {
      lastActivity = performance.now();
      picker = null;
      cardTab = 'talk';
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
/** Which list the People overlay shows, which tab of a card, and which command's choices are unfolded. */
let peopleTab: PeopleTab = 'here';
let cardTab: CardTab = 'talk';
let picker: Picker = null;

/** The contact whose texts are open on the holo, if any, and what came of the last call to them. */
let phoneShown: string | null = null;
let phoneStatus = '';
const phoneToggle = $<HTMLButtonElement>('#phone-toggle');
const phone = new Phone(
  {
    root: $('#phone'),
    toggle: phoneToggle,
    close: $<HTMLButtonElement>('#phone-close'),
    count: $('#phone-count'),
    list: $('#phone-list'),
    empty: $('#phone-empty'),
    thread: $('#phone-thread'),
    name: $('#phone-name'),
    stance: $('#phone-stance'),
    kicker: $('#phone-kicker'),
    texts: $('#phone-texts'),
    status: $('#phone-status'),
    picker: $('#phone-picker'),
    commands: $('#phone-commands'),
    back: $<HTMLButtonElement>('#phone-back'),
  },
  () => {
    phoneStatus = '';
    showPhone();
  },
  {
    onOpen: (id) => {
      phoneShown = id;
      phoneStatus = '';
      showPhone();
    },
    onText: (id, kind) => {
      lastActivity = performance.now();
      phoneStatus = '';
      game.text(id, kind as TextKind, Date.now());
      showPhone();
    },
    onCall: (id) => {
      lastActivity = performance.now();
      // What came of it (rang out, turned down) is the thread's line; picked up, the call is their card.
      const said: string[] = [];
      const off = game.events.on('output', ({ text }) => said.push(text));
      const result = game.call(id, Date.now());
      off();
      if (result === 'answered') openCard(id, phoneToggle);
      else {
        phoneStatus = said.slice(1).join(' ') || said.join(' ');
        showPhone();
      }
    },
    onCard: (id) => openCard(id, phoneToggle),
  },
  reducedMotion,
);

/** Someone's card in the People overlay, from wherever: the holo, a call. */
function openCard(id: string, opener: HTMLElement): void {
  MapOverlay.open?.close();
  personShown = id;
  peopleTab = 'known';
  cardTab = 'talk';
  picker = null;
  people.overlay.show(opener);
}

const energyMeter = new EnergyMeter({ root: $('#energy'), fill: $('#energy-fill') });
const statusPanel = new StatusPanel({ toggle: $<HTMLButtonElement>('#status-toggle'), summary: $('#status-summary'), list: $('#status'), foot: $('#status-foot') });
// Settings opens from the bottom of the drop-down, which folds away as it does: closed, it hands focus back to the drop-down's toggle.
$('#settings-toggle').addEventListener('click', () => {
  statusPanel.toggle(false);
  settings.overlay.show($('#status-toggle'));
});

let game: Game;
/** Whether the game in hand is over (the player dead, or the save erased): nothing to continue, and nothing to save. */
let over = false;
/** The city the next new game starts in, when there's a reason for it (a shared link, the city of a save that can't go on); else a brand new one. */
let freshSeed: string | null = null;

// The title screen and the builder put the whole game out of reach while they're up.
const APP = [$('#app')];
const menu = new MainMenu(
  {
    root: $('#menu'),
    behind: APP,
    notice: $('#menu-notice'),
    continueButton: $<HTMLButtonElement>('#menu-continue'),
    continueSub: $('#menu-continue-sub'),
    newButton: $<HTMLButtonElement>('#menu-new'),
    newSub: $('#menu-new-sub'),
    build: $('#menu-build'),
  },
  {
    onContinue: () => {
      menu.hide();
      if (!game) return;
      lastActivity = performance.now();
      refresh();
      showStatus(Date.now());
    },
    onNew: () => {
      menu.hide();
      builder.show(Boolean(game) && !over);
    },
  },
);
const districtName = (id: string) => CITY.districts.find((d) => d.id === id)?.name ?? 'Night City';
const builder = new Builder(
  { root: $('#builder'), behind: APP, step: $('#builder-step'), body: $('#builder-body'), back: $<HTMLButtonElement>('#builder-back'), next: $<HTMLButtonElement>('#builder-next') },
  {
    rules: CHARACTER,
    name: (path, pronouns) => nameFor(path, pronouns, CHARACTER, PEOPLE, createRng(`${Math.random()}`)),
    startsAt: (path) => {
      const p = CHARACTER.lifepaths[path];
      return `${p.place}, ${districtName(p.district)} · €$ ${p.cash}${p.account ? ` and €$ ${p.account} banked` : ''} · knows ${p.known.count}`;
    },
  },
  {
    onCancel: () => {
      builder.hide();
      showMenu();
    },
    onDone: (character) => {
      builder.hide();
      const seed = freshSeed ?? randomSeed();
      freshSeed = null;
      startOver(seed, '', character);
    },
  },
);

/** The title screen: the game behind it to go back to, if there's one, and what a new game would be. */
function showMenu(notice = ''): void {
  MapOverlay.open?.close();
  const live = Boolean(game) && !over;
  menu.show({
    saved: live ? savedLine() : null,
    fresh: live ? 'A new city and a new you. Replaces your save.' : freshSeed ? `A new you, in Night City ${freshSeed.toUpperCase()}.` : 'A new Night City, and a new you in it.',
    notice,
    build: `${__CHANNEL__ === 'beta' ? 'Beta' : 'Stable'} build ${__BUILD__}`,
  });
}

/** The saved game, as the menu puts it: who, where from, and where they are now. */
function savedLine(): string {
  const c = game.character;
  const where = game.whereabouts;
  const place = [game.neighborhoodOf(where), game.districtOf(where)?.name].filter(Boolean).join(', ');
  return [c?.name, c ? CHARACTER.lifepaths[c.lifepath].name : '', place].filter(Boolean).join(' · ');
}

/** Who the player made themselves, for the status drop-down. */
function youLine(c: Character): string {
  const look = lookWords(c.look, CHARACTER);
  return [c.name, CHARACTER.lifepaths[c.lifepath].name, [look.hair, look.eyes, look.mark].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
}
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
/** The walk to a building, planned once for each spot the player is near (the planner walks the streets): for the shift on the status line. */
let walkCache: { key: string; minutes: number } | null = null;
function walkTo(building: string, now: number): number {
  const at = game.positionAt(now);
  const key = `${building}|${Math.round(at.x)},${Math.round(at.y)}`;
  if (walkCache?.key !== key) {
    const to = destinationOf({ kind: 'building', id: building });
    walkCache = { key, minutes: (to && game.plan(to, 'foot', now)?.minutes) || 0 };
  }
  return walkCache.minutes;
}

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
    shopMode = 'buy';
    shop.overlay.show($('#act-menu'));
  } else if (id === 'sell' && game.sellables(now)) {
    shopStatus = '';
    shopMode = 'sell';
    shop.overlay.show($('#act-sell'));
  } else if (id === 'people') {
    personShown = null;
    people.overlay.show($('#act-people'));
  } else if (id === 'bank' && game.bank()) {
    bankStatus = '';
    withdrawOpen = false;
    bank.overlay.show($('#act-bank'));
  } else if (id === 'work') game.work(now);
  else if (id === 'deal') game.walkUp(now);
  else if (id === 'home') {
    const offer = game.homeOffer();
    if (offer?.kind === 'rent' || offer?.kind === 'squat') game.takeHome(now);
    else if (offer?.kind === 'go') game.goHome(now);
    else if (offer?.kind === 'stash') {
      inventoryOpensAt = STASH_PAGE;
      inventory.overlay.show($('#act-home'));
    }
  } else if (id === 'move') game.moveOut(now);
  else if (id === 'buy') game.buyClosed(now);
  else if (id === 'books' && game.books()) {
    booksStatus = '';
    booksPicker = null;
    books.overlay.show($('#act-books'));
  }
  else if (id === 'pick-1' || id === 'pick-2' || id === 'pick-3') {
    const at = Number(id.slice(-1)) - 1;
    // Officers on the player come before a collector, a collector before a buyer, a buyer before anything on a shift.
    const cops = game.police(now).confront;
    if (cops) {
      const choice = cops.choices[at];
      if (choice) game.answerPolice(choice.id, now);
      return;
    }
    const collector = game.collector(now);
    if (collector) {
      const choice = collector.choices[at];
      if (choice && !choice.disabled) game.answerCollector(choice.id, now);
      return;
    }
    const buyer = game.dealMoment(now);
    if (buyer) {
      const choice = buyer.choices[at];
      if (choice && !choice.disabled) game.answerDeal(choice.id, now);
      return;
    }
    const choice = game.shiftEvent(now)?.choices[at];
    if (choice) game.answerShift(choice.id, now);
  }
}

/** Something done to someone in the people overlay. */
function actOn(action: PersonAction, id: string): void {
  lastActivity = performance.now();
  const now = Date.now();
  if (action === 'talk') game.talk(id, now);
  else if (action === 'insult') game.insult(id, now);
  else if (action === 'rob') game.rob(id, now);
  else if (action === 'search') game.search(id, now);
  else if (action === 'attack') game.attack(id, now);
  else if (action === 'hire') game.askForWork(id, now);
  else if (action === 'quit') game.quit(now, id);
}

// ───────────── The panel ─────────────

/** Shows what the player has picked, or the trip they're on, or the building they're in, or where they are. */
function refresh(): void {
  const now = Date.now();
  const trip = game.currentTrip;
  // The menu, the counter and the people are for where the player is; they go when they leave.
  if (shop.overlay.isOpen && !game.menu() && !game.sellables(now)) shop.overlay.close();
  if (bank.overlay.isOpen && !game.bank()) bank.overlay.close();
  if (books.overlay.isOpen && !game.books()) books.overlay.close();
  if (people.overlay.isOpen && !game.interior && !game.location && !game.police(now).confront) people.overlay.close();
  // The NCPD has the player: nothing else on the panel till that's settled.
  const ncpd = policeView(now) ?? collectorView(now);
  if (ncpd) {
    target = null;
    map.select(null);
    place.show(ncpd);
    return;
  }
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

/** Officers on the player (their three choices), or a holding cell (nothing to do but wait); null when the NCPD has nothing to do with them. */
function policeView(now: number): PanelView | null {
  const police = game.police(now);
  const cops = police.confront;
  if (cops) {
    return {
      mode: game.interior ? 'inside' : 'here',
      kicker: cops.why === 'scene' ? 'NCPD · On the scene' : cops.why === 'search' ? 'NCPD · Stop and search' : 'NCPD · Warrant',
      description: cops.text,
      actions: cops.choices.slice(0, 3).map((c, i) => ({ id: `pick-${i + 1}` as 'pick-1' | 'pick-2' | 'pick-3', label: c.label, ...(c.sub ? { sub: c.sub } : {}) })),
      closable: false,
      announce: `${cops.text} ${cops.choices.map((c) => c.label).join(', ')}?`,
    };
  }
  if (police.held) {
    const out = formatClock(police.held);
    const description = `A holding cell at the precinct: a bench bolted to the wall, a drain in the floor, a camera in the corner. They let you out at ${out}.`;
    return { mode: 'here', kicker: 'NCPD · Holding cell', description, actions: [], closable: false, announce: description };
  }
  return null;
}

/** The player's habit, as the status says it: what's working and for how long, how hooked on each, the edge, the nerves. */
function habitLine(habit: HabitView, now: number): string {
  return [
    ...habit.active.map((a) => `${a.name} for ${formatMinutes(Math.max(0, a.until - now) / 60_000)}`),
    habit.stage ? (habit.stage.stage === 'craving' ? `craving ${habit.stage.name}` : `${habit.stage.name} withdrawal`) : '',
    ...habit.drugs.map((d) => `${d.name} ${d.dependence}% hooked`),
    habit.edge ? `edge ${habit.edge}${habit.numb ? ', numb' : ''}` : '',
    habit.nerve ? `nerve damage ×${habit.nerve}` : '',
  ].filter(Boolean).join(' · ');
}

/** Where the player stands with the gang they deal for, as the status says it. */
function dealLine(deal: DealView, now: number): string {
  const day = (ms: number) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getDay()]} ${formatClock(ms)}`;
  const owing = deal.debt ? `debt ${deal.debt} €$${deal.collectAt ? `, collectors in ${formatMinutes(Math.max(0, deal.collectAt - now) / 60_000)}` : ''}` : deal.front ? `owe ${deal.front.left} €$ by ${day(deal.front.due)}` : 'nothing owed';
  const next = deal.next ? `trust ${deal.trust}, ${deal.next.title.toLowerCase()} at ${deal.next.trust} and ${deal.next.fronts} paid` : 'top of the ladder';
  const shut = deal.line.find((d) => !d.open);
  return [`${deal.title} for the ${deal.gangName}`, deal.carried ? `${deal.carried} on you` : '', owing, deal.corner ? `corner: ${deal.corner.name}` : '', `${deal.sold} sold`, next, shut ? `${shut.name} at Dealing Lv ${shut.at}` : ''].filter(Boolean).join(' · ');
}

/** The player's runners, as the status says them: what each has out and owes, and anyone held, short, gone or run off. */
function crewLine(crew: RunnerView[], most: number): string {
  const day = (ms: number) => `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getDay()]} ${formatClock(ms)}`;
  const one = (r: RunnerView) => {
    if (r.ran) return `${r.name} ran off owing ${r.left} €$`;
    const state = r.quit ? 'walked' : r.held ? 'held by the NCPD' : r.short ? `short ${r.left} €$` : r.left ? `owes ${r.left} €$${r.due ? ` by ${day(r.due)}` : ''}` : r.drug ? `${r.drug} out` : 'on nothing';
    return `${r.name}: ${state}`;
  };
  return [`${crew.length} of ${most}`, ...crew.map(one)].join(' · ');
}

/** A collector on the player for a debt, and the three things to do about it; null when there's none. */
function collectorView(now: number): PanelView | null {
  const c = game.collector(now);
  if (!c) return null;
  return {
    mode: game.interior ? 'inside' : 'here',
    kicker: `${c.gang} · Collecting`,
    description: c.text,
    actions: c.choices.slice(0, 3).map((x, i) => ({ id: `pick-${i + 1}` as 'pick-1' | 'pick-2' | 'pick-3', label: x.label, ...(x.sub ? { sub: x.sub } : {}), ...(x.disabled ? { disabled: true } : {}) })),
    closable: false,
    announce: `${c.text} ${c.choices.map((x) => x.label).join(', ')}?`,
  };
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
    // A storefront's hours, and whether it's shut right now.
    const hours = b ? signOf(b) : '';
    const shut = b && game.locked(b, now);
    description = b ? [shut?.down ? 'Closed down: it went under.' : hours ? `${hours}${shut ? `, shut till ${shut.opensAt ? formatClock(shut.opensAt) : 'who knows'}` : ''}.` : '', categoryOf(b).description].filter(Boolean).join(' ') : undefined;
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
    // A buyer at the player's corner waits on an answer: it's all the panel offers till then.
    const buyer = game.dealMoment(now);
    if (buyer) {
      return {
        mode: 'here',
        kicker: 'On the corner',
        description: buyer.text,
        actions: buyer.choices.slice(0, 3).map((c, i) => ({ id: `pick-${i + 1}` as 'pick-1' | 'pick-2' | 'pick-3', label: c.label, ...(c.sub ? { sub: c.sub } : {}), ...(c.disabled ? { disabled: true } : {}) })),
        closable: false,
        announce: `${buyer.text} ${buyer.choices.map((c) => c.label).join(', ')}?`,
      };
    }
    const menu = game.menu();
    const here = game.peopleHere(now).length;
    const barred = menu ? game.barred(now) : null;
    const corner = game.cornerAction(now);
    return {
      mode: 'here',
      kicker: `You are here · ${location.kindLabel}${corner ? ' · Your corner' : ''}`,
      description: location.description,
      actions: [
        peopleAction(here),
        ...(menu ? [barred ? { id: 'menu' as const, label: menu.kind === 'gear' ? 'Shop' : 'Menu', sub: "Won't serve you", disabled: true } : menuAction(menu)] : []),
        ...(corner ? [{ id: 'deal' as const, label: corner.label, ...(corner.sub ? { sub: corner.sub } : {}), ...(corner.disabled ? { disabled: true } : {}) }] : []),
      ],
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
  // A storefront's door says its hours, and when it's shut, when someone's next in.
  const locked = door ? game.locked(door, now) : null;
  // Gone under, its hours mean nothing.
  const open = door && !locked?.down ? signOf(door) : '';
  const enter: PanelAction | null = !door ? null : locked ? { id: 'enter', label: locked.down ? 'Closed down' : 'Closed', sub: locked.down ? (game.owns(door.id) ? 'Yours · opens tomorrow' : 'Gone under') : locked.opensAt ? `Opens ${formatClock(locked.opensAt)}` : 'Shut for good', disabled: true } : { id: 'enter', label: 'Go inside', sub: door.kindLabel };
  // Gone under, it's for sale off the notice on its shutters.
  const sale = game.forSale();
  const buy: PanelAction | null = sale ? { id: 'buy', label: 'Buy it', sub: `€$ ${sale.price}`, ...(sale.affordable ? {} : { disabled: true }) } : null;
  return {
    mode: 'here',
    kicker: `You are here${building ? ` · Block ${building.block}` : ''}`,
    ...(open ? { meta: open } : {}),
    description: building ? `${categoryOf(building).label} · ${[building.kindLabel, heightOf(building)].filter(Boolean).join(', ')}. ${locked?.down ? (game.owns(building.id) ? "It's yours: the notice is off the shutters, and new hands start tomorrow. " : "It's gone under: the shutters are chained, with a notice on them. ") : locked ? 'The shutters are down. ' : ''}${mood}` : mood,
    actions: [enter, buy].filter((a): a is PanelAction => Boolean(a)),
    closable: false,
    announce: `${name}. ${open ? `${open}. ` : ''}${locked ? 'Closed. ' : ''}${sale ? `For sale at ${sale.price} eddies. ` : ''}${mood}`,
  };
}

/** A storefront's hours as its door says them: "Open 11:00–23:00", "Open 24/7" (nothing for anywhere that keeps none). */
function signOf(building: Building): string {
  const hours = game.hoursOf(building);
  const at = (hour: number) => `${String(hour % 24).padStart(2, '0')}:00`;
  return hours === 'always' ? 'Open 24/7' : hours ? `Open ${at(hours[0])}–${at(hours[1])}` : '';
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
  const why = shift.blocked === 'done' ? 'Done today' : shift.blocked === 'off' ? 'Not your day' : shift.blocked === 'closed' ? `${shift.hours[0]}–${shift.hours[1]}h` : masked ? 'Not in a mask' : tired ? 'Too tired' : '';
  return { id: 'work', label: 'Work', sub: why || `${shift.pay} €$, ${shift.rung.energy} energy`, disabled: Boolean(why) };
}

function insideView(building: Building): PanelView {
  const now = Date.now();
  // Something on the shift wants a choice: it's all the panel offers until it's answered.
  const moment = game.shiftEvent(now);
  if (moment) {
    return {
      mode: 'inside',
      kicker: `On shift · Block ${building.block}`,
      meta: [categoryOf(building).label, building.kindLabel].join(' · '),
      description: moment.text,
      actions: moment.choices.slice(0, 2).map((c, i) => ({ id: i ? ('pick-2' as const) : ('pick-1' as const), label: c.label, ...(c.sub ? { sub: c.sub } : {}), ...(c.disabled ? { disabled: true } : {}) })),
      closable: true,
      closeLabel: `Leave ${building.name}`,
      announce: `On shift at ${building.name}. ${moment.text} ${moment.choices.map((c) => c.label).join(' or ')}?`,
    };
  }
  const room = game.room();
  // A building with more than one room shows the one the player is in, which opens the rest.
  const roomChip = room && hasRooms(building, ROOMS) ? room.name : undefined;
  if (room && room.kind !== 'main') {
    const count = game.peopleHere(now).length;
    const job = game.jobStatus(now);
    const blurbs = ROOMS.blurbs[room.kind];
    const blurb = blurbs.length ? blurbs[hashOf(`${building.id}:${room.id}`) % blurbs.length]! : '';
    const yours = game.rented(now)?.room === room.id;
    const description = [blurb, yours ? `It's yours till ${formatClock(game.rented(now)!.until)}.` : '', homeNote(now)].filter(Boolean).join(' ');
    return {
      mode: 'inside',
      kicker: `Inside · Block ${building.block}`,
      room: roomChip,
      meta: [room.floor > 1 ? `Floor ${room.floor}` : '', building.kindLabel].filter(Boolean).join(' · '),
      description,
      // Out back on a shift's day, the shift can be worked from here too.
      actions: [peopleAction(count), ...(room.kind === 'back' && job?.here ? [workAction(job, now)] : []), ...homeActions(), ...booksAction()],
      closable: true,
      closeLabel: `Leave ${building.name}`,
      announce: `${room.name}, in ${building.name}. ${description} ${count ? `${count} people here.` : ''} Leave with the corner button.`,
    };
  }
  const menu = game.menu();
  const here = game.peopleHere(now).length;
  const barred = game.barred(now);
  const job = game.jobStatus(now);
  const shift = job?.here ? job : null;
  // Shut: nobody who works here is in. The sign says when someone will be.
  const closed = game.closed(now);
  const opens = closed?.opensAt ? `Opens ${formatClock(closed.opensAt)}` : 'Shut for good';
  const shut = closed ? (closed.down ? 'Closed down. The place has gone under, and nobody works here any more.' : `Closed. The shutters are half down and nobody's behind the counter. ${closed.opensAt ? `Someone's in again at ${formatClock(closed.opensAt)}.` : 'Nobody works here any more.'}`) : '';
  // How the place is doing on its books, after what it sells.
  const trade = menu || closed ? ` ${game.trade(building).line}` : '';
  // A fence, with nothing on its shelves for the player: only a counter that buys.
  const selling = !menu ? game.sellables(now) : null;
  const sellBlurb = selling ? (selling.fence ? "Glass cases of other people's things, and a counter that'll take yours. Nobody asks where it came from." : 'A counter that buys what it deals in.') : '';
  const description = (barred ?? (shut || (menu ? menuBlurb(menu) : game.bank() ? 'A counter, a teller, and a vault somewhere behind. Cash goes in, bills come out, coins get counted for a cut, and a credchip in your name is banked.' : sellBlurb || (here ? 'People live and work in here.' : 'Nobody around right now.')))) + trade + (homeNote(now) ? ` ${homeNote(now)}` : '');
  return {
    mode: 'inside',
    kicker: `Inside · Block ${building.block}`,
    room: roomChip,
    meta: [menu ? '' : categoryOf(building).label, building.kindLabel, heightOf(building)].filter(Boolean).join(' · '),
    description,
    actions: [
      peopleAction(here),
      ...(menu ? [barred ? { id: 'menu' as const, label: menu.kind === 'gear' ? 'Shop' : 'Menu', sub: "Won't serve you", disabled: true } : menuAction(menu)] : []),
      ...(game.bank() ? [{ id: 'bank' as const, label: 'Bank', sub: `€$ ${game.wallet.account} banked` }] : []),
      // A fence has no shelves for the player: only what it would give for what they've got.
      ...(!menu && game.sellables(now) ? [{ id: 'sell' as const, label: 'Sell', sub: game.sellables(now)!.fence ? 'No questions asked' : 'What they buy' }] : []),
      ...(closed ? [{ id: closed.what === 'bank' ? ('bank' as const) : ('menu' as const), label: 'Closed', sub: opens, disabled: true }] : []),
      ...homeActions(),
      // The player's shift here: what it pays and costs, or why not now (masked, or too tired, it's refused).
      ...(shift ? [workAction(shift, now)] : []),
      ...booksAction(),
    ],
    // Leaving is the corner button, so the row keeps to what there is to do in here.
    closable: true,
    closeLabel: `Leave ${building.name}`,
    announce: `Inside ${building.name}. ${description} ${here ? `${here} people here.` : ''} Leave with the corner button.`,
  };
}

/** The Books button in the player's own storefront (out back): how it's doing. */
function booksAction(): PanelAction[] {
  const view = game.books();
  return view ? [{ id: 'books', label: 'Books', sub: `€$ ${view.week} this week` }] : [];
}

/** What a home's buttons offer here: a unit to rent at a block's door, a corner to squat, the way up to the player's own unit, or (in it) the stash and moving out. */
function homeActions(): PanelAction[] {
  const offer = game.homeOffer();
  if (!offer) return [];
  if (offer.kind === 'rent') return [{ id: 'home', label: 'Rent', sub: `€$ ${offer.rent} a week` }];
  if (offer.kind === 'squat') return [{ id: 'home', label: 'Squat', sub: 'No rent, no bed' }];
  if (offer.kind === 'go') return [{ id: 'home', label: 'Home', sub: offer.room }];
  const squat = game.home(Date.now())?.squat;
  return [
    { id: 'home', label: 'Stash', sub: offer.count ? `${offer.count} ${offer.count === 1 ? 'thing' : 'things'}` : 'Empty' },
    { id: 'move', label: squat ? 'Leave' : 'Vacate', sub: squat ? 'Walk away' : 'Keys back' },
  ];
}

/** The Home row: where the player lives and how the rent stands, or that they live nowhere. */
function homeLine(home: HomeView | null): string {
  if (!home) return 'Nowhere: rent a unit at a block, or squat';
  const stash = home.stashed ? ` · ${home.stashed} in the stash` : '';
  if (home.squat) return `Squatting at ${home.building.name} · no bed${stash}`;
  const due = home.dueIn === 0 ? 'due today' : `due in ${home.dueIn} ${home.dueIn === 1 ? 'day' : 'days'}`;
  return `${home.room}, ${home.building.name} · €$ ${home.rent}/wk ${due}${home.owed ? ` · €$ ${home.owed} behind` : ''} · bed${stash}`;
}

/** A word on the player's home, where they're in it: the rent and when it's due, or how far behind; a squat's lack of a bed and a lock. */
function homeNote(now: number): string {
  const home = game.home(now);
  if (!home?.atHome) return '';
  if (home.squat) return 'Home, of a sort: no bed, no lock, and somebody always knows what you left.';
  const due = home.dueIn === 0 ? 'today' : home.dueIn === 1 ? 'tomorrow' : `in ${home.dueIn} days`;
  return home.behind ? `Home, for now: ${home.behind} ${home.behind === 1 ? 'week' : 'weeks'} behind on the rent (€$ ${home.owed} owed). The next ${home.rent} €$ is due ${due}.` : `Home. A bed, a door that locks, and ${home.rent} €$ due ${due}.`;
}

/** The people button: how many are here. */
function peopleAction(count: number): PanelAction {
  return { id: 'people', label: 'People', sub: count ? `${count} here` : 'Nobody here', disabled: !count };
}

/** The menu button: how much there is to eat (the prices are on the menu); a store's rack says how many things are on it. */
function menuAction(menu: Menu): PanelAction {
  // A motel's or a capsule hotel's desk: a room for the night, or the one that's the player's.
  const room = menu.items.find((i) => i.kind === 'room');
  if (room) return { id: 'menu', label: 'Desk', sub: game.rented(Date.now()) ? 'Your room till noon' : `A room · ${room.price} €$` };
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
  const lodging = menu.items.some((i) => i.kind === 'room') ? game.interior?.business : undefined;
  if (lodging && ROOMS.rent[lodging]) return ROOMS.rent[lodging]!.desk;
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
  walletLabel.title = `${wallet.bills} €$ in notes${wallet.bills ? ` (${notesLine(wallet.notes)})` : ''}, ${wallet.coins} €$ in coins, ${wallet.account} €$ in the bank${wallet.chips ? `, ${wallet.chips} €$ on chips` : ''}.${pass ? ` NCART monthly pass valid until ${formatDay(wallet.passUntil)}.` : ' Buy an NCART monthly pass at any station.'}`;
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
    bills: `€$ ${bills}${wallet ? ` · ${wallet.notes ?? 0} of ${wallet.holds} notes` : ''}`,
    coins: `€$ ${coins} · ${formatGrams(coins * GEAR.gramsPerCoin)}`,
    chips: carried.length ? `${carried.length} · €$ ${chips}${locked ? `, ${locked} locked` : ''}` : 'None',
    fee: `${Math.round((at?.fee ?? 0) * 100)}% on coins`,
    status: bankStatus,
    canDeposit: bills + coins > 0,
    canChange: coins > 0,
    canBankChips: carried.length > locked,
    withdrawals: (at?.withdrawals ?? []).map((amount) => ({ amount, enabled: amount <= account })),
    withdrawOpen,
    loan: loanFigure(),
    loans: game.credit(Date.now())?.amounts ?? [],
    loanOpen,
    canRepay: Boolean(game.credit(Date.now())?.loan) && account + bills + coins > 0,
  });
}

/** Fills the books of the player's own storefront. */
function showBooks(): void {
  const view = game.books();
  if (!view) return;
  const { bills, coins, account } = game.wallet;
  const money = bills + coins + account;
  const rules = LIFE.economy.business;
  const labels: Record<PriceLevel, string> = { low: 'Low', fair: 'Fair', high: 'High' };
  books.render({
    name: view.building.name,
    trade: view.opening ? 'Opens tomorrow' : `${view.health[0]!.toUpperCase()}${view.health.slice(1)} · €$ ${view.week} this week`,
    till: `€$ ${view.till}${view.over ? ` · €$ ${view.over} over its float` : ''}${view.lean ? ` · short ${view.lean} ${view.lean === 1 ? 'payday' : 'paydays'}` : ''}`,
    stock: `${Math.round(view.stock * 100)}%`,
    staff: view.staff ? `${view.staff}${view.manager ? ` · run by ${view.manager}` : ''}` : 'Nobody yet',
    prices: labels[view.prices],
    worth: `€$ ${view.worth}`,
    status: booksStatus,
    picker: booksPicker,
    amounts: (rules?.amounts ?? []).map((amount) => ({ amount, enabled: amount <= money })),
    over: view.over,
    levels: (Object.keys(labels) as PriceLevel[]).map((id) => ({ id, label: labels[id], on: id === view.prices })),
    canSell: !view.opening,
  });
}

/** The status's Business row: each storefront the player owns, how it's doing and its till. */
function businessLine(list: BusinessView[]): string {
  return list.map((b) => `${b.building.name} · ${b.opening ? 'opens tomorrow' : `${b.health} · €$ ${b.week} this week · till €$ ${b.till}`}${b.lean ? ` · short ${b.lean}` : ''}`).join(' · ') || 'None';
}

/** The bank counter's Loan figure: the loan the player has, or what the bank would lend. */
function loanFigure(): string {
  const credit = game.credit(Date.now());
  if (!credit) return 'None';
  const loan = credit.loan;
  if (loan) return loan.defaulted ? `€$ ${loan.owed} owed · in default` : `€$ ${loan.owed} owed · €$ ${loan.installment}/wk`;
  return credit.barred ? 'Refused: you defaulted' : credit.limit ? `Up to €$ ${credit.limit}` : 'None';
}

/** The Debts row: the bank loan, the loan shark, and what people owe the player. */
function debtLine(now: number): string {
  const d = game.debts(now);
  const parts = [
    d.bank ? `${d.bank.name} €$ ${d.bank.owed}${d.bank.defaulted ? ' in default' : ` · €$ ${d.bank.installment} in ${d.bank.dueIn} ${d.bank.dueIn === 1 ? 'day' : 'days'}`}${d.bank.missed ? ` · ${d.bank.missed} missed` : ''}` : '',
    d.shark ? `${d.shark.gang} €$ ${d.shark.owed}${d.shark.late ? ' · they want it now' : ''}` : '',
    d.owers ? `owed you €$ ${d.owedYou} by ${d.owers}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Nothing owed either way';
}

/** Fills the inventory: the player head to toe, or the inside of the pocket they're looking into, and what's in it. */
function showInventory(): void {
  const { grams, pockets } = game.carry();
  const items = game.inventory;
  // At home, the stash: what's dropped goes in it, and it's a page of its own.
  const stash = game.stash();
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
    cut: Boolean(GEAR.drugs[item.id]) && item.kind === 'consumable' && game.canCut(item.id, item.in) === null,
    weight: formatGrams(item.count * itemGrams(item, GEAR, FOOD.dishes)),
    detail: itemDetail(item, tier),
    ...(stash ? { drop: 'Stash' } : {}),
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
      detail: wallet ? `€$ ${p.bills} · ${p.notes ?? 0}/${p.holds} notes${p.chips ? ` · ${p.chips}/${p.chipSlots} chips` : ''}` : p.slots ? `${p.load.slots}/${p.slots} slots` : 'No pockets',
      weight: formatGrams(p.grams),
      over: p.over,
      opens: wallet || p.slots > 0 || holding,
      removable: p.in === null && Boolean(p.slot) && !required.has(p.slot),
    };
  };
  // What the player is looking into, if it's still there; else back out to themselves.
  while (inventoryPath.length && inventoryPath.at(-1) !== CHROME_PAGE && !(stash && inventoryPath.at(-1) === STASH_PAGE) && !pockets.some((p) => p.id === inventoryPath.at(-1))) inventoryPath.pop();
  const open = inventoryPath.length ? pockets.find((p) => p.id === inventoryPath.at(-1)) : undefined;
  const chrome = game.chrome();
  let page: InventoryView['page'];
  if (inventoryPath.at(-1) === CHROME_PAGE) {
    page = chromePage();
  } else if (stash && inventoryPath.at(-1) === STASH_PAGE) {
    page = {
      kind: 'pocket',
      id: STASH_PAGE,
      name: 'Stash',
      sub: game.home(Date.now())?.room ?? '',
      note: 'Kept here, off you: no robber or search finds it. Take out what you need.',
      load: `${stash.slots}/${stash.maxSlots} slots · ${formatGrams(stash.grams, true)} / ${formatGrams(stash.maxGrams, true)}`,
      over: false,
      back: 'On you',
      items: [...stash.items].sort(byKind).map((item) => ({ ...view({ ...item, in: STASH_PAGE }), use: 'Take', unload: false, wear: false, cut: false, drop: false })),
      inside: [],
      figures: [],
    };
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
      ...(stash
        ? {
            stash: {
              id: STASH_PAGE,
              name: 'Stash',
              sub: game.home(Date.now())?.room ?? '',
              detail: `${stash.slots}/${stash.maxSlots} slots`,
              weight: formatGrams(stash.grams),
              over: false,
              opens: true,
            },
          }
        : {}),
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
    if (open.holds !== undefined) figures.push({ label: 'Bills', value: `€$ ${open.bills} · ${open.notes ?? 0} of ${open.holds} notes` }, ...(open.held && Object.keys(open.held).length ? [{ label: 'Notes', value: notesLine(open.held) }] : []));
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

/** How well the player knows a weapon, for its row: its level, and its latest perk or the next one ("Lv 3 · Ricochet at 5"). */
function masteryText(id: string): string {
  const m = game.masteryOf(id);
  if (!m) return '';
  const perk = m.perks.at(-1);
  return [`Lv ${m.status.level}`, perk ? perk.name : m.next ? `${m.next.name} at ${m.next.at}` : ''].filter(Boolean).join(' · ');
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
  // A gun by its class and what's in it (the maker is on the rack); a blade by its class and maker; either with how well the player knows it.
  if (weapon && isGun(weapon, ARMS)) return [ARMS.classes[weapon.class]?.label, `${item.loaded ?? 0}/${weapon.magazine ?? 0}`, weapon.disposable ? 'sealed' : '', masteryText(item.weapon ?? '')].filter(Boolean).join(' · ');
  if (weapon) return [weaponDetail(weapon, ARMS), masteryText(item.weapon ?? '')].filter(Boolean).join(' · ');
  if (item.kind === 'ammo') return ARMS.ammo[item.id]?.for;
  const implant = implantOf(item, CHROME);
  if (implant) return implantDetail(implant, CHROME);
  const hack = item.kind === 'quickhack' ? HACKS.hacks[item.id] : undefined;
  if (hack) return `${hack.type} · ${hack.ram} RAM`;
  // A drug, by how much of it is cutting agent.
  if (item.kind === 'consumable' && GEAR.drugs[item.id] && item.cut) return `${Math.round(item.cut * 100)}% cut`;
  const med = item.kind === 'consumable' ? MEDICAL.meds[item.id] : undefined;
  if (med) return medDetail(med);
  return undefined;
}

/** What can be done with something from the inventory: eat a dish, drink a drink, take a med, load a gun or unload it, have a ripperdoc fit an implant. */
function useLabel(item: Item): string | undefined {
  if (item.kind === 'cyberware') return game.clinic() ? 'Fit' : undefined;
  if (item.kind === 'consumable' && (MEDICAL.meds[item.id] || GEAR.drugs[item.id])) return 'Use';
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
 * rest: experience, charisma and the fighting skills, eddies and the bank, the pass, the job, every reputation, the map.
 */
function showStatus(now: number): void {
  const energy = game.energy(now);
  const charisma = game.charisma();
  const brawler = game.brawler();
  const toughness = game.toughness();
  const trading = game.trading();
  const wallet = game.wallet;
  const drunk = game.inebriation(now);
  const mask = game.masked();
  const armed = game.armed();
  const chrome = game.chrome();
  const health = game.health(now);
  const police = game.police(now);
  const cover = game.covered(now);
  const hurt = health.current < health.max;
  // A hold, a unit the player knows is coming, a warrant: the worst of it, on the line.
  const ncpd = police.held ? `Held · ${formatCountdown(police.held - now)}` : police.dispatch ? `NCPD · ${formatCountdown(police.dispatch.arriveAt - now)}` : police.warrants.length ? 'Wanted' : '';
  const heart = game.romance(now);
  const market = game.market(now);
  const deal = game.dealing(now);
  const dealer = game.dealingSkill();
  const cutter = game.cuttingSkill();
  const crew = game.crew(now);
  const habit = game.habit(now);
  const hunger = game.hunger(now);
  // What's working, else the worst of a craving or withdrawal, on the line.
  const high = habit?.active[0] ? `On ${habit.active[0].name}` : habit?.stage ? (habit.stage.stage === 'craving' ? `Craving ${habit.stage.name}` : 'Withdrawal') : '';
  // The corner the player deals from, on the map.
  map.setCorner(deal?.corner?.id ?? null);
  const job = game.jobStatus(now);
  const jobs = game.jobsStatus(now);
  // Where the player works, on the map; lit while a shift there is on.
  const owned = game.businesses();
  map.setWork([...jobs.map((j) => ({ id: j.building.id, name: j.building.name, open: j.open, ...(game.owns(j.building.id) ? { owned: true } : {}) })), ...owned.filter((b) => !jobs.some((j) => j.building.id === b.building.id)).map((b) => ({ id: b.building.id, name: b.building.name, open: false, owned: true }))]);
  const home = game.home(now);
  map.setHome(home ? { id: home.building.id, name: home.building.name } : null);
  // A shift open somewhere else: how far, on foot.
  const due = jobs.find((j) => j.open && !j.here);
  const away = due ? walkTo(due.building.id, now) : 0;
  const pass = wallet.passUntil > now;
  const refill = energy.nextPointAt === null ? 'Full' : `+1 in ${formatCountdown(energy.nextPointAt - now)}`;
  const condition = drunk.stage ? `${drunk.stage.label} · sober in ${formatCountdown((drunk.soberAt ?? now) - now)}` : '';
  const summary = [`${energy.current}/${energy.max} · Lv ${energy.level} · ${refill}`, hurt ? `HP ${health.current}` : '', ncpd, deal?.debt ? `Debt ${deal.debt} €$` : '', high, hunger?.stage?.label, game.resting(now) ? 'Resting' : '', drunk.stage?.label, mask ? 'Masked' : '', due ? `Shift on · ${formatMinutes(away)}` : job ? job.rung.title : ''].filter(Boolean).join(' · ');
  const today = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const you = game.character;
  const rows: StatusRow[] = [
    ...(you ? [{ label: 'You', value: youLine(you) }] : []),
    { label: 'Energy', value: `Lv ${energy.level} · ${energy.xp}/${energy.xpToNext} XP · ${refill}` },
    { label: 'Health', value: `${health.current}/${health.max}${health.fullAt ? ` · full in ${formatCountdown(health.fullAt - now)}` : ''}`, ...(health.current < health.max / 2 ? { tone: 'warn' as const } : {}) },
    ...(hunger ? [{ label: 'Hunger', value: hungerLine(hunger, now), ...(hunger.stage && hunger.stage.energy * hunger.stage.health < 1 ? { tone: hunger.stage.health < 1 ? ('bad' as const) : ('warn' as const) } : {}) }] : []),
    { label: 'Trauma Team', value: cover ? `${cover.plan.name} · until ${formatDay(cover.until)}` : 'Not covered' },
    { label: 'NCPD', value: ncpdLine(police, now), ...(police.held || police.dispatch || police.warrants.length ? { tone: 'bad' as const } : {}) },
    { label: 'Charisma', value: `Lv ${charisma.level} · ${charisma.xp}/${charisma.xpToNext} XP` },
    { label: 'Street Brawler', value: `Lv ${brawler.level} · ${brawler.xp}/${brawler.xpToNext} XP` },
    { label: 'Toughness', value: `Lv ${toughness.level} · ${toughness.xp}/${toughness.xpToNext} XP` },
    { label: 'Trading', value: `Lv ${trading.level} · ${trading.xp}/${trading.xpToNext} XP` },
    // Every kind of weapon the player has fought with, best known first.
    { label: 'Weapons', value: game.mastery().types.map((t) => `${t.label} Lv ${t.status.level}`).join(' · ') || 'None used yet' },
    { label: 'Eddies', value: `€$ ${wallet.eddies} on you${wallet.account ? ` · €$ ${wallet.account} banked` : ''}${wallet.chips ? ` · €$ ${wallet.chips} on chips` : ''}` },
    { label: 'NCART', value: pass ? `Pass until ${formatDay(wallet.passUntil)}` : 'No pass' },
    { label: 'Market', value: marketLine(market) },
    ...(market.news[0] ? [{ label: 'News', value: market.news.slice(0, 2).map((n) => `${n.text} (${n.ago})`).join(' · ') }] : []),
    { label: 'Debts', value: debtLine(now), ...(game.debts(now).shark?.late || game.debts(now).bank?.missed ? { tone: 'bad' as const } : {}) },
    { label: 'Home', value: homeLine(home), ...(home?.behind ? { tone: home.behind >= HOME.warnAt ? ('bad' as const) : ('warn' as const) } : {}) },
    ...(owned.length ? [{ label: 'Business', value: businessLine(owned), ...(owned.some((b) => b.lean) ? { tone: 'bad' as const } : {}) }] : []),
    { label: 'Heart', value: heart ? `${heart.stage === 'together' ? 'Together with' : 'Seeing'} ${heart.name} · ${heart.dates} ${heart.dates === 1 ? 'date' : 'dates'} · ♥ ${heart.spark}` : 'Seeing no one' },
    ...(jobs.length ? jobs.map((j) => ({ label: j.side ? 'Side gig' : 'Work', value: `${j.rung.title} at ${j.building.name} · ${formatDays(j.days)} ${j.hours[0]}–${j.hours[1]}h${j.owed ? ` · ${j.owed} €$ owed` : ''} · ${j.shifts} ${j.shifts === 1 ? 'shift' : 'shifts'}${j.next ? ` · trust ${j.trust}, ${j.next.title.toLowerCase()} at ${j.next.at}` : ' · top of the ladder'} · trade ${game.trade(j.building).health} · ${j.perks.join(', ')}` })) : [{ label: 'Work', value: 'No job' }]),
    ...(dealer && (deal || dealer.level > 1 || dealer.xp > 0) ? [{ label: 'Dealing', value: `Lv ${dealer.level} · ${dealer.xp}/${dealer.xpToNext} XP` }] : []),
    ...(cutter && (cutter.level > 1 || cutter.xp > 0) ? [{ label: 'Cutting', value: `Lv ${cutter.level} · ${cutter.xp}/${cutter.xpToNext} XP` }] : []),
    ...(deal ? [{ label: 'Gang', value: dealLine(deal, now), ...(deal.debt ? { tone: 'bad' as const } : {}) }] : []),
    ...(crew.length || deal?.crewMost ? [{ label: 'Crew', value: crewLine(crew, deal?.crewMost ?? crew.length), ...(crew.some((r) => r.short || r.ran) ? { tone: 'warn' as const } : {}) }] : []),
    ...(habit && (habit.drugs.length || habit.active.length || habit.edge || habit.nerve) ? [{ label: 'Habit', value: habitLine(habit, now), ...(habit.stage || habit.numb ? { tone: 'bad' as const } : {}) }] : []),
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

/** How full the player is, for the status drop-down: the stage, what it takes off, and when the next sets in. */
function hungerLine(hunger: HungerStatus, now: number): string {
  const full = `${Math.round(hunger.value)}% full`;
  const off = [hunger.energy < 1 ? `energy −${Math.round((1 - hunger.energy) * 100)}%` : '', hunger.health < 1 ? `health −${Math.round((1 - hunger.health) * 100)}%` : ''].filter(Boolean).join(', ');
  const next = hunger.next && hunger.nextAt ? `${hunger.next.label.toLowerCase()} in ${formatCountdown(hunger.nextAt - now)}` : '';
  return [hunger.stage ? hunger.stage.label : 'Fed', full, off, next].filter(Boolean).join(' · ');
}

/** The market where the player is, for the status drop-down: what's dear or cheap in the district against usual. */
function marketLine(market: MarketView): string {
  const where = market.district || 'Here';
  const pct = (change: number) => `${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))}%`;
  const moves = [...market.prices.map((p) => `${p.goods} ${pct(p.change)}`), Math.abs(market.rent) >= 0.03 ? `rents ${pct(market.rent)}` : '', Math.abs(market.pay) >= 0.03 ? `pay ${pct(market.pay)}` : ''].filter(Boolean);
  return moves.length ? `${where}: ${moves.join(', ')}` : `${where}: prices as usual`;
}

/** What the NCPD has on the player, for the status drop-down: a hold, a unit coming, the warrants, what's on record. */
function ncpdLine(police: PoliceView, now: number): string {
  const parts = [
    police.held ? `Held · out in ${formatCountdown(police.held - now)}` : '',
    police.dispatch ? `A unit on its way · ${formatCountdown(police.dispatch.arriveAt - now)}` : '',
    ...police.warrants.map((w) => `Wanted for ${w.crime}${w.until === null ? '' : ` · lapses ${formatDay(w.until)}`}`),
    police.reports ? `${police.reports} ${police.reports === 1 ? 'report' : 'reports'} on record` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Nothing on you';
}

/** A menu's strip: what the shelves, the hour and haggling have done to its prices all told, else how good a place it is (the blurb says both, and why). */
function priceKicker(menu: Menu): string {
  const change = Math.round(((1 + (menu.market ?? 0)) * (1 - (menu.closing ?? 0)) * (1 + (menu.haggle ?? 0)) - 1) * 100);
  return change ? `Prices ${change > 0 ? '+' : '−'}${Math.abs(change)}%` : qualityLabel(menu);
}

/** Why a storefront's prices are what they are today, after its blurb: the shelves, a slow week, the last hour. */
function marketNote(menu: Menu): string {
  return [
    (menu.market ?? 0) > 0 ? MARKET_NOTES.low : (menu.market ?? 0) < 0 ? MARKET_NOTES.slow : '',
    menu.closing ? MARKET_NOTES.closing.replace('{off}', Math.round(menu.closing * 100) >= 25 ? 'a quarter' : `${Math.round(menu.closing * 100)}%`) : '',
  ]
    .filter(Boolean)
    .join(' ');
}
const MARKET_NOTES = { low: 'The shelves are low, and it shows in the prices.', slow: "Slow week: everything's marked down to move it.", closing: "Last hour: {off} off what won't keep." };

/** Fills the menu with what's for sale where the player is, and whether they can afford it. */
function showShop(): void {
  const menu = game.menu();
  const sells = sellRows(Date.now());
  if (!menu) {
    // A fence: nothing on the shelves for the player, only an eye for what they've got.
    if (sells) shop.render({ kicker: sells.fence ? 'Fence' : 'Buying', blurb: sellBlurb(sells.till, sells.fence), status: shopStatus, items: [], mode: 'sell', sells: sells.rows });
    else shop.render({ kicker: 'No menu', blurb: 'Nothing to eat here.', status: '', items: [] });
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
    // The staff price at work; anywhere else, what the shelves and haggling made of the prices, if anything, and an eatery's last hour.
    kicker: menu.staff ? `Staff −${Math.round(menu.staff * 100)}%` : priceKicker(menu),
    blurb: barred ?? (sells && shopMode === 'sell' ? sellBlurb(sells.till, sells.fence) : [menuBlurb(menu), marketNote(menu)].filter(Boolean).join(' ')),
    status: shopStatus,
    ...(sells ? { mode: shopMode, sells: sells.rows } : {}),
    // Cash, or a transfer where this counter takes one: the game knows which.
    items: items.map((item) => {
      const row = { ...item, affordable: !barred && item.left !== 0 && game.affords(item.id, now), barred: Boolean(barred), carried: carried.get(item.id) ?? 0 };
      // A service is had, not carried: treatment there and then, a plan signed (or renewed).
      if (item.kind === 'treatment') return { ...row, verb: 'Treat' };
      // A room for the night: rented, or kept another night.
      if (item.kind === 'room') return { ...row, verb: game.rented(now) ? 'Stay on' : 'Rent' };
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
  const fear = present ? game.fear(present.person.id, now) : null;
  const gifts = game.inventory.filter((item) => item.kind === 'consumable' && FOOD.dishes.some((d) => d.id === item.id));
  const hot = game.inventory.filter((item) => item.kind === 'credchip' && item.locked);
  const gangOf = (id: string | null) => (id ? PEOPLE.gangs[id]?.name : undefined);
  const mask = game.masked();
  const how = { seen: 'seen together', told: 'told', asked: 'asked' };
  const nameOf = (id: string, fallback: string) => game.describe(id)?.name ?? fallback;
  const described = shown ? game.describe(shown.id, now) : null;
  // Everyone met or known by name, for the Known tab: here now, else when last dealt with.
  const acquainted = peopleTab === 'known' ? game.acquaintances(now) : [];
  const hereIds = new Set(here.map((p) => p.person.id));
  people.render({
    count: peopleTab === 'known' ? `${acquainted.length} known` : `${here.length} here`,
    tab: peopleTab,
    // The standing lines belong to the list; a card is about one person.
    // What's on the player that people here can see; the rest of their standing is the status drop-down's.
    reputation: shown || !mask ? [] : [`Masked · they see a ${mask.word}, not a face`],
    rows: peopleTab === 'known'
      ? acquainted.map(({ person, name, stance, job, dead, last }) => ({
          id: person.id,
          name,
          sub: [gangOf(person.gang) ? `${gangOf(person.gang)} colors` : undefined, person.gang ? undefined : job].filter(Boolean).join(' · '),
          doing: dead ? 'Dead' : hereIds.has(person.id) ? 'Here' : last ? `Last ${agoText(now - last)}` : 'Heard of',
          stance,
          stanceLabel: STANCE_LABEL[stance],
        }))
      : here.map(({ person, doing, stance, scene }) => {
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
    empty:
      peopleTab === 'known'
        ? 'Nobody yet. Anyone you talk to, or learn the name of, is kept here.'
        : 'Nobody here right now. People keep hours: workers by day, regulars in the evening, residents at night.',
    card:
      shown && standing && described
        ? {
            id: shown.id,
            name: described.name,
            stance: standing.stance,
            stanceLabel: STANCE_LABEL[standing.stance],
            kicker: [gangOf(shown.gang) && described.named ? `${gangOf(shown.gang)} colors` : undefined, game.chatWith(shown.id, now)?.remote ? 'On a holocall' : present ? withCompany(present.doing, present.scene) : described.facts.dead ? 'Dead' : 'Not here'].filter(Boolean).join(' · '),
            facts: described.lines.length ? described.lines.join(' · ') : described.named ? 'That\'s all you know.' : 'Nothing known yet. Talk, watch, ask.',
            tab: cardTab,
            // How afraid of the player they are, by what they'd see if robbed now: on the profile, and on the Rob command.
            profile: [...profileOf(standing, described), ...(game.hasHolo(shown.id) ? [{ label: 'Holo', value: 'In your holo' }] : []), ...(fear ? [{ label: 'Fear', value: fear.label }] : [])],
            fear: fear?.label ?? '',
            search: present ? game.canSearch(shown.id, now) : false,
            // What's still to find out: the questions not yet answered.
            unknown: (Object.entries(LINES.questions) as Array<[Question, { label: string }]>).filter(([fact]) => !standing.knowledge.facts.includes(fact)).map(([, q]) => q.label),
            between: game.between(shown.id, now),
            // Out cold, they're here but past talking to: all that's left is going through their pockets.
            here: Boolean(present) && !game.outCold(shown.id, now),
            cold: Boolean(present) && game.outCold(shown.id, now),
            finishes: present ? game.finishes(shown.id, now).map((f) => ({ id: f.id, label: f.label })) : [],
            web: standing.web.map((link) => ({ id: link.person.id, name: nameOf(link.person.id, link.person.name), label: link.kind ? kinWord(shown, link.kind, link.person) : '?', how: how[link.how] })),
            webHint: `You don't know who ${described.named ? shown.given : 'they'} know${described.named ? 's' : ''}. Watch who they keep company with, or get them talking.`,
            picker,
            questions: (Object.entries(LINES.questions) as Array<[Question, { label: string }]>)
              .filter(([fact]) => !standing.knowledge.facts.includes(fact))
              .map(([fact, q]) => ({ fact, label: q.label })),
            gifts: gifts.map((g) => ({ id: g.id, name: g.name, count: g.count })),
            // A hot chip can be put to a netrunner the player can tell is one; the label says what it holds and what they'd keep.
            chops: present && game.canChop(shown.id) ? hot.map((c) => ({ id: c.id, label: `€$ ${c.balance ?? 0} chip · cut ${chipCut(c.balance ?? 0, MONEY)}` })) : [],
            work: present ? game.workWith(shown.id) : null,
            ...(present && game.workWith(shown.id) === 'switch' ? { leaving: game.switchingFrom(shown.id) ?? undefined } : {}),
            roster: present && game.workWith(shown.id) === 'quit' ? rosterOf(shown.id, now) : [],
            deal: present ? game.dealWith(shown.id, now) : [],
            money: present ? game.moneyWith(shown.id, now) : [],
            heart: game.romanceWith(shown.id, now),
            // Chat first, a flirt last.
            approaches: [{ id: 'chat', label: 'Chat' }, ...Object.entries(LINES.approaches).sort(([a], [b]) => Number(a === 'flirt') - Number(b === 'flirt')).map(([id, a]) => ({ id, label: a.label }))],
            log: game.conversation(shown.id).map((line) => ({ who: line.who, text: line.text, ...(line.tone ? { tone: line.tone } : {}) })),
            chat: game.chatWith(shown.id, now),
          }
        : null,
  });
}

/** Fills the holo: everyone in it, or one contact's texts. Opening a thread reads it. */
let phoneRendering = false;
function showPhone(): void {
  if (phoneRendering) return;
  phoneRendering = true;
  const now = Date.now();
  if (phoneShown) game.readTexts(phoneShown);
  const contacts = game.contacts(now);
  const shown = phoneShown ? contacts.find((c) => c.id === phoneShown) : undefined;
  if (phoneShown && !shown) phoneShown = null;
  const thread = shown ? game.textsWith(shown.id) : null;
  phone.render({
    count: `${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`,
    contacts: contacts.map((c) => ({ id: c.id, name: c.name, stance: c.stance, stanceLabel: STANCE_LABEL[c.stance], last: c.dead ? 'Dead' : c.last || `Added ${agoText(now - c.at)}`, unread: c.unread })),
    empty: "Nobody's holo yet. Get talking: someone who enjoys the conversation may give you theirs, and you can always ask.",
    thread:
      shown && thread
        ? {
            id: shown.id,
            name: shown.name,
            stance: shown.stance,
            stanceLabel: STANCE_LABEL[shown.stance],
            kicker: shown.dead ? 'Dead' : shown.seeing ? 'Seeing you' : '',
            texts: thread.texts.map((t) => ({ from: t.from, text: t.text, ago: agoText(now - t.at) })),
            kinds: shown.dead ? [] : thread.kinds,
            status: phoneStatus,
            canCall: !game.fighting,
          }
        : null,
  });
  phoneRendering = false;
  showUnread();
}

/** What's unread on the holo, on its button. */
function showUnread(): void {
  const unread = game.unreadTexts();
  const badge = $('#phone-unread');
  badge.hidden = unread === 0;
  badge.textContent = String(unread);
  phoneToggle.setAttribute('aria-label', unread ? `Holo, ${unread} unread` : 'Holo');
}

/** A person's profile, label and value: how they stand with the player, how much has passed, and each thing known of them. */
function profileOf(standing: PersonStanding, described: Description): Array<{ label: string; value: string }> {
  const { standing: s, stance } = standing;
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Standing', value: [STANCE_LABEL[stance], `rapport ${Math.round(s.rapport)}`, (s.spark ?? 0) >= 1 ? `♥ ${Math.round(s.spark ?? 0)}` : '', s.grudge >= 1 ? `grudge ${Math.round(s.grudge)}` : ''].filter(Boolean).join(' · ') },
  ];
  const met = [s.talks ? (s.talks === 1 ? 'Once' : `${s.talks} times`) : '', s.gifts ? `${s.gifts} ${s.gifts === 1 ? 'gift' : 'gifts'}` : ''].filter(Boolean).join(' · ');
  if (met) rows.push({ label: 'Talked', value: met });
  const f = described.facts;
  const known = new Set(Object.values(f));
  // Seeing the player comes first in what's known, and isn't one of the facts.
  const heart = described.lines.find((line) => !known.has(line));
  if (heart) rows.push({ label: 'With you', value: heart });
  const facts: Array<[keyof typeof f, string, RegExp?]> = [
    ['dead', 'Died', /^Died /],
    ['job', 'Work'],
    ['age', 'Age'],
    ['home', 'Home', /^Lives at /],
    ['likes', 'Eats', /^Likes /],
    ['drinks', 'Drinks', /^Drinks /],
    ['hates', 'Hates', /^Hates /],
    ['type', 'Type'],
    ['dream', 'Wants'],
    ['nature', 'Nature'],
  ];
  for (const [fact, label, prefix] of facts) {
    // Plain to see, from the first look: their sex, and how they'd be in a fight; how they talk once they have.
    if (fact === 'age') {
      rows.push({ label: 'Sex', value: described.sex });
      if (described.fight) rows.push({ label: 'Fighting', value: described.fight });
      if (described.talk) rows.push({ label: 'Talking', value: described.talk });
    }
    const value = f[fact];
    if (value) rows.push({ label, value: prefix ? value.replace(prefix, '') : value });
  }
  return rows;
}

/** How long ago something was, on the phone's clock: "just now", "12 min ago", "3 h ago", "2 days ago". */
function agoText(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  if (minutes < 60 * 36) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} days ago`;
}

/** The week at the job someone gives the player, a chip a day: whether the player is on it. */
function rosterOf(bossId: string, now: number): Array<{ day: number; label: string; on: boolean }> {
  const job = game.jobsStatus(now).find((j) => j.boss?.id === bossId);
  const labels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  // The week from Monday.
  return job ? [1, 2, 3, 4, 5, 6, 0].map((day) => ({ day, label: labels[day] as string, on: job.days.includes(day) })) : [];
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
/** What the counter here would buy off the player, as the shop's rows (null: it buys nothing). */
function sellRows(now: number): { till: number; fence: boolean; rows: SellItemView[] } | null {
  const sells = game.sellables(now);
  if (!sells) return null;
  const labels: Record<TradeKind, string> = { gun: 'Gun', melee: 'Melee weapon', ammo: 'Ammo', clothing: 'Clothing', cyberware: 'Cyberware', deck: 'Cyberdeck', quickhack: 'Quickhack', med: 'Meds', food: 'Food', component: 'Supplies', valuable: 'Valuable' };
  return { till: sells.till, fence: sells.fence, rows: sells.items.map((i) => ({ id: i.id, ...(i.from ? { from: i.from } : {}), name: i.name, label: labels[i.kind], count: i.count, units: i.units, offer: i.offer, ...(i.why ? { why: i.why } : {}) })) };
}

/** What the counter says about buying off the player: what's in its till, and a fence's way. */
function sellBlurb(till: number, fence: boolean): string {
  return `${fence ? 'No questions asked, and no receipts.' : 'They buy what they sell, at what it would fetch them.'} €$ ${till} in the till.`;
}

/** Sells one of a thing at the counter here; what came of it is the shop's line. */
function sellToShop(id: string, from: string | undefined): void {
  lastActivity = performance.now();
  const said: string[] = [];
  const off = game.events.on('output', ({ text }) => said.push(text));
  game.sell(id, from, Date.now());
  off();
  shopStatus = said.at(-1) ?? '';
  showShop();
}

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
  const verb = item.kind === 'room' ? `Rented ${item.detail?.split(' · ')[0] ?? 'a room'} till noon` : `Bought ${what}`;
  shopStatus = why ?? (bought ? `${verb} for ${item.price} €$ ${how} · €$ ${game.wallet.eddies} on you${game.wallet.account ? `, €$ ${game.wallet.account} banked` : ''}` : '');
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

/** Throws away the game in progress and starts a city from the beginning, as the same person. The new game saves over the old one. */
function startOver(seed: string, notice: string, character = game?.character ?? undefined): void {
  MapOverlay.open?.close();
  target = null;
  transmissions.clear();
  begin(generateWorld(seed, CITY), undefined, notice, character);
}

/** The game is over (the player is dead, or the save erased): nothing to go back to, and the menu says why. */
function gameOver(notice: string): void {
  over = true;
  MapOverlay.open?.close();
  saveSlot.clear();
  freshSeed = null;
  showMenu(notice);
}

// ───────────── Saving ─────────────

let savePending = false;
let lastFlash = 0;
/** Saves once after whatever just changed, and lets the player see that it did (now and then: walking saves constantly). */
function queueSave(): void {
  if (savePending || over || !game) return;
  savePending = true;
  queueMicrotask(() => {
    savePending = false;
    if (over) return;
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
    rooms.overlay.close();
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

  // Another room: who's here is whoever's in it now.
  g.events.on('roomChanged', () => {
    if (people.overlay.isOpen) showPeople();
    if (rooms.overlay.isOpen) showRooms();
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

  // A call, a unit, officers on the player, a hold: the panel is theirs till it's settled.
  g.events.on('policeChanged', () => {
    // In a cell, the sign says so; out of it, where they are again.
    const where = g.whereabouts;
    const district = g.districtOf(where);
    const held = g.police(Date.now()).held;
    hud.setLocation(held ? 'Holding cell' : (g.interior?.name ?? g.nameOf(where)), district?.name ?? 'Night City', g.neighborhoodOf(where));
    // Officers on the player, or a cell: whatever covers the panel makes way for it.
    if ((held || g.police(Date.now()).confront) && MapOverlay.open && MapOverlay.open !== fight.overlay) MapOverlay.open.close();
    if (people.overlay.isOpen) showPeople();
    if (rooms.overlay.isOpen) rooms.overlay.close();
    if (shop.overlay.isOpen && !g.menu() && !g.sellables(Date.now())) shop.overlay.close();
    refresh();
    showStatus(Date.now());
    queueSave();
  });

  // A front, a sale, a debt, a collector: the panel, the status and anyone's card here may say so.
  g.events.on('dealChanged', () => {
    const now = Date.now();
    // A collector on the player: whatever covers the panel makes way for them.
    if (g.collector(now) && MapOverlay.open && MapOverlay.open !== fight.overlay) MapOverlay.open.close();
    if (people.overlay.isOpen) showPeople();
    if (!target && !g.currentTrip) refresh();
    showStatus(now);
    queueSave();
  });

  // A dose, a craving, withdrawal: the line and the drop-down say so.
  g.events.on('habitChanged', () => {
    if (inventory.overlay.isOpen) showInventory();
    if (!target && !g.currentTrip) refresh();
    showStatus(Date.now());
    queueSave();
  });

  // An overdose with nobody to help, or someone finishing the player off: the end, and the city starts over without them.
  g.events.on('flatlined', ({ text }) => {
    if (g !== game) return;
    setTimeout(() => gameOver(`${text} You're gone; Night City goes on without you.`), 0);
  });

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

  g.events.on('businessChanged', () => {
    if (books.overlay.isOpen) showBooks();
    if (!target && !g.currentTrip) refresh();
    queueSave();
  });
  g.events.on('homeChanged', () => {
    if (inventory.overlay.isOpen) showInventory();
    if (rooms.overlay.isOpen) showRooms();
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

  g.events.on('skillChanged', () => {
    // A better trader gets better prices: the rack here says so at once.
    if (shop.overlay.isOpen) showShop();
    queueSave();
  });

  g.events.on('phoneChanged', () => {
    if (phone.overlay.isOpen) showPhone();
    else showUnread();
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

/** Drops the player into a city: a new game (as who they made themselves), or a saved one picking up where it left off. */
function begin(world: World, progress?: Progress, notice?: string, character?: Character): void {
  over = false;
  game = new Game(world, { ...TRAVEL, energy: ENERGY, food: FOOD, inebriation: INEBRIATION, people: PEOPLE, society: SOCIETY, lines: LINES, charisma: CHARISMA, trading: TRADING, gear: GEAR, money: MONEY, jobs: JOBS, life: LIFE, combat: COMBAT, hours: HOURS, rooms: ROOMS, home: HOME, credit: CREDIT, trade: TRADE, needs: NEEDS, police: POLICE, join: JOIN, dealing: DEALING, robbery: ROBBERY, downed: DOWNED, phone: PHONE, character: CHARACTER }, progress, character);
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
  showUnread();
}

/**
 * The title screen first. Behind it, the saved game on this device if there is one (Continue
 * goes back to it); without one, a new game starts from the builder, in the city of a shared
 * link if the address has one, or a brand new one. A save that won't play, or one from before
 * the city changed, leaves its city for the next new game.
 */
function boot(): void {
  const raw = saveSlot.load();
  try {
    const saved = readSave(raw);
    const world = saved ? generateWorld(saved.seed, CITY) : null;
    const progress = saved && world ? progressFor(world, saved, GENERATOR_VERSION) : null;
    if (world && progress) {
      begin(world, progress);
      showMenu();
      return;
    }
  } catch (error) {
    // A save that reads but won't play is no reason never to start again: the same city, from the top.
    console.error('The save would not load:', error);
    freshSeed = savedSeed(raw);
    showMenu("Your save wouldn't load. Start again, in the same city.");
    return;
  }
  // A save from before the game changed how cities (or saves) work: keep the city for the new game.
  const oldSeed = savedSeed(raw);
  if (oldSeed) {
    freshSeed = oldSeed;
    showMenu('Night City has changed since you were last here. Start again, in the same city.');
    return;
  }
  const seedInAddress = location.hash.slice(1).toLowerCase();
  freshSeed = /^[0-9a-f]{8}$/.test(seedInAddress) ? seedInAddress : null;
  showMenu();
}

let lastHour = -1;
/** The clock: lands trips that are due, moves the trip panel on, and lets people come and go on the hour. */
function tick(): void {
  if (!game || over) return;
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
  // The title screen and the builder take their own keys; the city's rest till there is one.
  if (!game || over || menu.isOpen || builder.isOpen) return;
  // In a fight there's no looking away: the keys rest until it's over.
  if (game.fighting) return;
  if (event.key === 'i' || event.key === 'I') inventory.overlay.toggle();
  else if ((event.key === 'h' || event.key === 'H') && !(event.target instanceof HTMLInputElement)) phone.overlay.toggle();
  // Escape backs out of a person's card to the list, then closes whatever covers the map, then the status drop-down, then lets go of whatever's picked.
  else if (event.key === 'Escape' && people.overlay.isOpen && personShown) {
    const was = personShown;
    personShown = null;
    cardTab = 'talk';
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
      if (game && !over && !menu.isOpen && idleFor > 12_000 && transmissions.idle && game.currentTrip?.mode !== 'ncart' && !document.hidden) game.ambient();
      scheduleAmbient();
    },
    18_000 + Math.random() * 22_000,
  );
}
scheduleAmbient();
