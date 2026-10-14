import type { ArmsContent, WeaponClass, WeaponKind, WeaponTech } from '../engine/weapons';
import type { Quality } from '../engine/food';

/**
 * Guns, blades and ammo. Every weapon is a real, non-iconic 2077 weapon checked against its
 * own page on the Cyberpunk Wiki: the name and the maker as its infobox gives them, its class
 * (the wiki's type), Power, Tech or Smart, and its magazine (the infobox's ammo capacity, the
 * game's number where the page's prose says another). Each note says only what the page says
 * of it (its characteristics, its database entry, its intrinsic), in our words. The ammo is the
 * wiki's four kinds: Handgun Ammo for pistols, revolvers and SMGs; Shotgun Ammo; Heavy Ammo for
 * assault rifles, precision rifles and LMGs; and Sniper Ammo. Where the page says no vendor
 * sells a weapon (enemy drops only, or it can't be had at all), it's here with `sold: false`
 * and on no rack; where the only vendors are in Dogtown, its stores are Pacifica's (`where`);
 * the Senkoh LX, sold by one fixer downtown, is City Center's. The weights, prices, the tier
 * of store that stocks each (by what its page says of its price and its market) and the rest
 * are ours. The TCG's cards have no shop weapons: its Gear is cyberware, gadgets and Satori,
 * which is iconic.
 */

const CLASSES: ArmsContent['classes'] = {
  pistol: { label: 'Pistol', ammo: 'handgun-ammo', grams: 1100 },
  revolver: { label: 'Revolver', ammo: 'handgun-ammo', grams: 1300 },
  smg: { label: 'SMG', ammo: 'handgun-ammo', grams: 2600 },
  'assault-rifle': { label: 'Assault rifle', ammo: 'heavy-ammo', grams: 3600, long: true },
  'precision-rifle': { label: 'Precision rifle', ammo: 'heavy-ammo', grams: 4200, long: true },
  shotgun: { label: 'Shotgun', ammo: 'shotgun-ammo', grams: 3800, long: true },
  'double-barrel': { label: 'Double-barrel shotgun', ammo: 'shotgun-ammo', grams: 3400, long: true },
  'sniper-rifle': { label: 'Sniper rifle', ammo: 'sniper-ammo', grams: 6800, long: true },
  lmg: { label: 'LMG', ammo: 'heavy-ammo', grams: 8200, long: true },
  // The wiki throws knives and axes; the rest of the blades and the clubs are for the hand.
  knife: { label: 'Knife', grams: 300, cut: 'thrown' },
  katana: { label: 'Katana', grams: 1300, long: true, cut: 'blade' },
  machete: { label: 'Machete', grams: 900, cut: 'blade' },
  axe: { label: 'Axe', grams: 900, cut: 'thrown' },
  club: { label: 'Club', grams: 1400, cut: 'blunt' },
  'two-handed-club': { label: 'Two-handed club', grams: 1100, long: true, cut: 'blunt' },
  hammer: { label: 'Hammer', grams: 4500, long: true, cut: 'blunt' },
  chainsword: { label: 'Chainsword', grams: 4200, long: true, cut: 'blade' },
};

function gun(name: string, short: string, maker: string, cls: WeaponClass, tech: WeaponTech, magazine: number, quality: Quality, price: number, note: string, extra: Partial<WeaponKind> = {}): WeaponKind {
  return { name, short, maker, class: cls, tech, magazine, quality, price, note, ...extra };
}

function melee(name: string, short: string, cls: WeaponClass, quality: Quality, price: number, note: string, extra: Partial<WeaponKind> = {}): WeaponKind {
  return { name, short, class: cls, quality, price, note, ...extra };
}

/** Sold only in Dogtown, in the wiki: Pacifica's stores. */
const DOGTOWN = { where: ['pacifica'] };
/** On no vendor's shelf in the game. */
const UNSOLD = { sold: false };

const WEAPONS: Record<string, WeaponKind> = {
  // ── Pistols
  'slaught-o-matic': gun('Slaught-O-Matic', 'Slaught-O-Matic', 'Budget Arms', 'pistol', 'Power', 36, 'poverty', 45, 'Single-use, the kind Budget Arms sells out of its vending machines: it comes loaded, and when it is empty you throw it away. There is no reloading it.', { disposable: true, grams: 600 }),
  unity: gun('Unity', 'Unity', 'Constitutional Arms', 'pistol', 'Power', 12, 'poverty', 120, 'A compact, cheap .45 semi-auto, as common on the streets as it is reliable.'),
  grit: gun('HA-4 Grit', 'Grit', 'Hansen Armory', 'pistol', 'Tech', 30, 'everyday', 280, "Dogtown's Hansen Armory builds it from Militech parts on a Slaught-O-Matic frame. Charged, it fires full auto.", DOGTOWN),
  liberty: gun('Liberty', 'Liberty', 'Constitutional Arms', 'pistol', 'Power', 14, 'everyday', 160, 'A turn-of-the-century pistol for purists: no tracking, no tricks, it fires bullets.'),
  nue: gun('Nue', 'Nue', 'Tsunami', 'pistol', 'Power', 10, 'everyday', 200, "Tsunami's mass-market .45, made well enough to lead the pistol market. Too big to hide easily."),
  lexington: gun('M-10AF Lexington', 'Lexington', 'Militech', 'pistol', 'Power', 20, 'everyday', 220, 'The NCPD sidearm: light, full auto, made to stop people more than end them. Disappears in a coat pocket.'),
  ticon: gun('Ticon', 'Ticon', 'Militech', 'pistol', 'Tech', 21, 'everyday', 280, 'The old Militech tech pistol the Omaha grew from: compact, it rarely jams, and it fires in bursts of three.', DOGTOWN),
  omaha: gun('M-76e Omaha', 'Omaha', 'Militech', 'pistol', 'Tech', 9, 'luxury', 620, 'A Militech electromag pistol firing solid slugs; charged, a burst. It lives in the holsters of high-end corpos.'),
  tamayura: gun('Tamayura', 'Tamayura', 'Arasaka', 'pistol', 'Power', 8, 'everyday', 240, "One of Arasaka's oldest pistols, from the early 2000s: rare now, hard to keep running, and nobody makes the parts."),
  chao: gun('A-22B Chao', 'Chao', 'Kang Tao', 'pistol', 'Smart', 21, 'luxury', 850, "Kang Tao's answer to the Yukimura: a tiny smart pistol firing three-round bursts. It wants a Smart Link."),
  kenshin: gun('JKE-X2 Kenshin', 'Kenshin', 'Arasaka', 'pistol', 'Tech', 20, 'luxury', 950, "Made for Arasaka's operators: small enough to hide, and charged, it bursts tungsten-tipped rounds through cover."),
  kappa: gun('Kappa', 'Kappa', 'Tsunami', 'pistol', 'Smart', 30, 'luxury', 1000, "Tsunami's full-auto smart pistol, built to take on Kang Tao and Arasaka: it locks onto two targets at once."),
  yukimura: gun('HJKE-11 Yukimura', 'Yukimura', 'Arasaka', 'pistol', 'Smart', 30, 'luxury', 1100, 'The 2040s Arasaka pistol that started the smart-gun age. Guided rounds, with a Smart Link.'),
  // ── Revolvers
  metel: gun('Metel', 'Metel', 'Techtronika', 'revolver', 'Power', 8, 'poverty', 300, 'A cheap, ugly Techtronika revolver loaded with eight explosive rounds. A favorite in the slums.', DOGTOWN),
  nova: gun('DR-5 Nova', 'Nova', 'Darra Polytechnic', 'revolver', 'Power', 6, 'poverty', 150, 'A cheap six-shooter, prone to jamming and easy to fix. It is in NCPD lockers, gang belts and handbags alike.'),
  overture: gun('Overture', 'Overture', 'Malorian Arms', 'revolver', 'Power', 6, 'everyday', 480, 'A double-action six-shooter in .42, well made and with a kick to every shot.'),
  quasar: gun('DR-12 Quasar', 'Quasar', 'Darra Polytechnic', 'revolver', 'Tech', 20, 'everyday', 520, "Darra's electromag revolver with a twenty-round drum. Charged, it fires full auto."),
  burya: gun('RT-46 Burya', 'Burya', 'Techtronika', 'revolver', 'Tech', 4, 'everyday', 600, 'A Soviet electromag revolver: four rounds that blast through walls without charging, and a recoil that breaks elbows.'),
  // ── SMGs
  guillotine: gun('Guillotine', 'Guillotine', 'Budget Arms', 'smg', 'Power', 45, 'poverty', 150, 'The budget SMG of Night City: cheap plastic, full auto, and a digital scope built into the frame.'),
  pulsar: gun('DS1 Pulsar', 'Pulsar', 'Darra Polytechnic', 'smg', 'Power', 40, 'poverty', 220, 'A bullpup Darra SMG: small, fast-firing, hard to handle, and its parts are cheap.'),
  saratoga: gun('M221 Saratoga', 'Saratoga', 'Militech', 'smg', 'Power', 40, 'everyday', 380, "Militech's light, cheap SMG from the 2040s, made for corporate security and taken up by gangs. It empties a magazine in a blink."),
  warden: gun('HA-7 Warden', 'Warden', 'Hansen Armory', 'smg', 'Smart', 40, 'everyday', 640, "Hansen Armory's crude-looking take on the Shingen, made in Dogtown: a smart SMG that fires faster the longer you hold it.", DOGTOWN),
  shigure: gun('Shigure', 'Shigure', 'Arasaka', 'smg', 'Power', 50, 'everyday', 380, 'An Arasaka SMG from the early century that sprays more lead a minute than anything newer. Still a staple with the gangs.'),
  shingen: gun('TKI-20 Shingen', 'Shingen', 'Arasaka', 'smg', 'Smart', 30, 'luxury', 980, "Arasaka's compact smart SMG: all that firepower in a tiny body, with tracing rounds. It wants a Smart Link."),
  dian: gun('G-58 Dian', 'Dian', 'Kang Tao', 'smg', 'Smart', 45, 'luxury', 1050, "Kang Tao's top smart SMG, carried even by Trauma Team. It folds down small enough to conceal."),
  senkoh: gun('Senkoh LX', 'Senkoh', 'Arasaka & Jinguji', 'smg', 'Tech', 30, 'luxury', 1300, "Arasaka and Jinguji's luxury SMG for bodyguards: three-round bursts, and charged, the whole magazine through cover.", { where: ['city_center'] }),
  // ── Assault rifles
  umbra: gun('DA8 Umbra', 'Umbra', 'Darra Polytechnic', 'assault-rifle', 'Power', 40, 'poverty', 260, 'Low-grade alloy and a high rate of fire. People empty a few magazines and drop it down a drain.'),
  copperhead: gun('D5 Copperhead', 'Copperhead', 'Nokota', 'assault-rifle', 'Power', 30, 'everyday', 420, 'The mass-produced rifle that took the Kalashnikov\'s place: cheap, reliable, everywhere.'),
  ajax: gun('M251s Ajax', 'Ajax', 'Militech', 'assault-rifle', 'Power', 30, 'everyday', 620, "Militech's assault rifle, the soldier's choice the world over: durable, simple, and it hits hard."),
  nowaki: gun('Nowaki', 'Nowaki', 'Arasaka', 'assault-rifle', 'Power', 21, 'luxury', 820, 'An Arasaka rifle from the dawn of the century that still commands respect. It fires in accurate three-round bursts.'),
  kyubi: gun('Kyubi', 'Kyubi', 'Tsunami', 'assault-rifle', 'Power', 20, 'luxury', 900, 'A semi-auto Tsunami rifle, a marksman\'s dream: one quiet shot, one target.'),
  masamune: gun('HJSH-18 Masamune', 'Masamune', 'Arasaka', 'assault-rifle', 'Power', 24, 'luxury', 980, 'A 2050s Arasaka rifle built on the Nowaki: light, finely made, firing accurate three-round bursts.'),
  sidewinder: gun('D5 Sidewinder', 'Sidewinder', 'Nokota', 'assault-rifle', 'Smart', 30, 'everyday', 680, 'The Copperhead made smart: guided rounds on a budget frame, and now and then one loses its lock.'),
  // ── Precision rifles
  kolac: gun('Kolac', 'Kolac', 'Rostović', 'precision-rifle', 'Power', 6, 'poverty', 380, 'A big-bore Serbian bullpup marksman rifle: bulky, and it hits hard. Nobody sells it.', UNSOLD),
  'sor-22': gun('SOR-22', 'SOR-22', 'Midnight Arms', 'precision-rifle', 'Power', 10, 'luxury', 900, 'A heavy semi-auto marksman rifle used by both sides in the Metal Wars. Rare on the streets.'),
  achilles: gun('M-179e Achilles', 'Achilles', 'Militech', 'precision-rifle', 'Tech', 9, 'luxury', 1400, "Militech's electromag precision rifle, the best there is: charged, it puts its rounds through walls and armor."),
  // ── Shotguns
  carnage: gun('Carnage', 'Carnage', 'Budget Arms', 'shotgun', 'Power', 4, 'poverty', 280, 'A massive Budget Arms 4-gauge pump gun: four shells, a recoil that pops shoulders, and not much reliability.', { grams: 4600 }),
  tactician: gun('M2038 Tactician', 'Tactician', 'Constitutional Arms', 'shotgun', 'Power', 8, 'poverty', 240, 'A cheap, simple pump-action with eight shells. The NCPD still uses it, and so does your neighbor.'),
  crusher: gun('Crusher', 'Crusher', 'Militech', 'shotgun', 'Power', 12, 'everyday', 520, "Militech's classic from 2020: a fully automatic shotgun compact enough for one hand."),
  pozhar: gun('VST-37 Pozhar', 'Pozhar', 'Techtronika', 'shotgun', 'Power', 12, 'everyday', 600, 'An automatic Techtronika shotgun, unchanged for decades and still a MaxTac favorite.'),
  zhuo: gun('L-69 Zhuo', 'Zhuo', 'Kang Tao', 'shotgun', 'Smart', 4, 'luxury', 1200, "Kang Tao's smart shotgun: every pellet locks onto its own target. Heavy to carry, and it wants a Smart Link.", { grams: 4600 }),
  // ── Double-barrel shotguns
  igla: gun('DB-4 Igla', 'Igla', 'Rostović', 'double-barrel', 'Power', 2, 'poverty', 160, 'A Serbian duck gun from the turn of the century. Night City calls it an antique: more noise than damage.'),
  testera: gun('DB-2 Testera', 'Testera', 'Rostović', 'double-barrel', 'Power', 2, 'poverty', 220, 'A sawed-off, modernized Igla built tougher: both barrels at once, and no shotgun hits harder.'),
  satara: gun('DB-2 Satara', 'Satara', 'Rostović', 'double-barrel', 'Tech', 2, 'everyday', 480, 'The Igla with an electromag barrel: charged, its steel spikes go through walls. MaxTac swears by it against cyberpsychos.'),
  palica: gun('DB-4 Palica', 'Palica', 'Rostović', 'double-barrel', 'Smart', 2, 'poverty', 300, 'A smart double-barrel at a street price, built on the Igla. Its guided shot hits harder, and sometimes loses the lock.'),
  // ── Sniper rifles
  grad: gun('SPT32 Grad', 'Grad', 'Techtronika', 'sniper-rifle', 'Power', 4, 'luxury', 1200, 'A Soviet bolt-action from a run made for Soviet intelligence. Nothing hides from it, and it is heavy.'),
  ashura: gun('Ashura', 'Ashura', 'Tsunami', 'sniper-rifle', 'Smart', 1, 'luxury', 1600, "Tsunami's smart sniper rifle: one big dart round, one target at a time, the spotter built in."),
  nekomata: gun('Nekomata', 'Nekomata', 'Tsunami', 'sniper-rifle', 'Tech', 4, 'luxury', 1800, "Tsunami's electromag sniper rifle, firing tungsten spikes through armor and walls. Its sale is tightly controlled."),
  // ── Light machine guns
  defender: gun('M2067 Defender', 'Defender', 'Constitutional Arms', 'lmg', 'Power', 80, 'everyday', 1200, 'An LMG made for law-abiding citizens and loved by gangers: eighty rounds, and heavy enough to slow you down.'),
  ma70: gun('MA70 HB', 'MA70', 'Midnight Arms', 'lmg', 'Power', 60, 'everyday', 1300, "Midnight Arms' steel cannon: a heavy LMG firing explosive rounds. It wants a reinforced spine."),

  // ── Melee: thrown (knives and axes)
  'chefs-knife': melee("Chef's Knife", "chef's knife", 'knife', 'poverty', 15, 'A razor-sharp kitchen knife, sold by food vendors all over the city. What it cuts bleeds.', { grams: 250 }),
  knife: melee('Knife', 'knife', 'knife', 'poverty', 20, 'A plain knife, balanced to throw.'),
  punknife: melee('Punknife', 'punknife', 'knife', 'everyday', 70, 'A small throwing blade, quicker to draw and sheathe than any other knife.', { grams: 250 }),
  'neurotoxin-knife': melee('Neurotoxin Knife', 'knife', 'knife', 'everyday', 240, 'A combat knife that takes a chemical cartridge: it cuts, and it poisons.'),
  kaiken: melee('Kaiken', 'kaiken', 'knife', 'luxury', 160, "A long Japanese knife, the katana's little sibling, and it hits harder up close.", { grams: 350 }),
  tomahawk: melee('Tomahawk', 'tomahawk', 'axe', 'everyday', 55, 'A Militech throwing axe.', { maker: 'Militech', grams: 700 }),
  claw: melee('Claw', 'claw', 'axe', 'everyday', 140, 'A heavy polymer axe that takes brawn to swing, and hits hardest thrown.', { grams: 2000 }),
  // ── Melee: blades
  machete: melee('Machete', 'machete', 'machete', 'poverty', 40, 'Long and heavy, for hacking a path. Nobody sells it.', UNSOLD),
  kukri: melee('Kukri', 'kukri', 'machete', 'everyday', 60, 'A Nepalese knife, curved and heavy. Nobody sells it.', { ...UNSOLD, grams: 800 }),
  razor: melee('Razor', 'Razor', 'machete', 'everyday', 380, "Techtronika's one-piece cleaver of a machete: heavy, and it crushes chrome.", { maker: 'Techtronika', grams: 1800, ...DOGTOWN }),
  'cut-o-matic': melee('Cut-o-Matic', 'Cut-o-Matic', 'chainsword', 'everyday', 300, 'A cheap plastic motorized chainblade. The noise clears a room, and the motor chokes when it matters.', { maker: 'Budget Arms' }),
  katana: melee('Katana', 'katana', 'katana', 'luxury', 450, 'A katana: in 2077 mostly an Arasaka make, molded nearly whole from polymer.'),
  // ── Melee: blunt
  'steel-pipe': melee('Steel Pipe', 'pipe', 'club', 'poverty', 8, 'A length of pipe off a wall, and it stuns. Nobody sells it.', { ...UNSOLD, grams: 1800 }),
  'tire-iron': melee('Tire Iron', 'tire iron', 'club', 'poverty', 10, 'One in every chop shop in the city, and it stuns. Nobody sells it.', { ...UNSOLD, grams: 1200 }),
  crowbar: melee('Crowbar', 'crowbar', 'club', 'poverty', 15, "The burglar's favorite. It blocks as well as it hits. Nobody sells it.", { ...UNSOLD, grams: 1600 }),
  'baseball-bat': melee('Baseball Bat', 'bat', 'two-handed-club', 'poverty', 25, 'A bat, common all over the city; some come studded with spikes or bolts.'),
  'electric-baton': melee('Electric Baton Alpha', 'baton', 'club', 'everyday', 220, 'A shock baton made for crowd control: one swing can hit more than one.', { grams: 900 }),
  'electric-baton-beta': melee('Electric Baton Beta', 'baton', 'club', 'everyday', 300, 'A shock baton that hits more than one at a time. Keep it out of the water.', { grams: 900 }),
  'electric-baton-gamma': melee('Electric Baton Gamma', 'baton', 'club', 'luxury', 420, 'The top shock baton, with a kick to it: it hits more than one at a time.', { grams: 900 }),
  hammer: melee('Hammer', 'hammer', 'hammer', 'everyday', 160, 'A sledgehammer made a weapon: slow, heavy, and it knocks people down. The Animals carry them.'),
  kanabo: melee('Kanabo', 'kanabo', 'two-handed-club', 'luxury', 180, 'A Japanese war club. The name sounds refined; it is a heavy stick.', { grams: 2500 }),
};

export const ARMS: ArmsContent = {
  classes: CLASSES,
  weapons: WEAPONS,
  ammo: {
    'handgun-ammo': { name: 'Handgun Ammo', grams: 12, perSlot: 50, box: 50, price: 25, for: 'Pistols, revolvers, SMGs', note: 'A box of fifty rounds for pistols, revolvers and SMGs.' },
    'shotgun-ammo': { name: 'Shotgun Ammo', grams: 40, perSlot: 25, box: 25, price: 30, for: 'Shotguns', note: 'A box of twenty-five shells. Heavier than it looks.' },
    'heavy-ammo': { name: 'Heavy Ammo', grams: 18, perSlot: 60, box: 60, price: 40, for: 'Rifles, LMGs', note: 'Sixty rounds for assault rifles, precision rifles and LMGs.' },
    'sniper-ammo': { name: 'Sniper Ammo', grams: 50, perSlot: 20, box: 20, price: 45, for: 'Sniper rifles', note: 'Twenty long rounds for sniper rifles.' },
  },
  stores: {
    'gun-shop': { guns: 8, ammo: true },
    gunsmith: { guns: 5, ammo: true, up: true },
    'ammo-shop': { ammo: true },
    'blade-shop': { melee: 7 },
  },
  tiers: { poverty: ['poverty', 'everyday'], everyday: ['poverty', 'everyday'], luxury: ['everyday', 'luxury'] },
  rob: { bare: 0.5, melee: 0.3, gun: 0.12 },
};

/** What a store of weapons says about itself, by tier, and a blade shop and an ammo shop apart. */
export const ARMS_BLURBS: Record<Quality | 'blades' | 'ammo', string> = {
  luxury: 'Glass cases, a range in the back, and smart guns with Arasaka and Kang Tao on the grip.',
  everyday: 'Militech and Darra on the wall, ammo by the box, and a clerk who has seen it all.',
  poverty: 'Cheap iron behind a cage: Budget Arms, Rostović, whatever came in this week.',
  blades: 'Blades and clubs on the wall, sharpened while you wait.',
  ammo: 'Boxes of rounds stacked to the ceiling, and holsters on a hook.',
};
