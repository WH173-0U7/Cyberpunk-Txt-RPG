import type { ArmsContent, WeaponClass, WeaponKind, WeaponTech } from '../engine/weapons';
import type { Quality } from '../engine/food';

/**
 * Guns, blades and ammo. Every weapon is a real, non-iconic 2077 weapon from the Cyberpunk
 * Wiki: the name and maker as the wiki gives them, its class, whether it's a Power, Tech or
 * Smart gun, and its magazine (the wiki's ammo capacity). The ammo is the wiki's four kinds:
 * Handgun Ammo for pistols, revolvers and SMGs; Shotgun Ammo; Heavy Ammo for assault rifles,
 * precision rifles and LMGs; and Sniper Ammo. The weights, prices, notes, which tier of store
 * stocks what, and the rest are ours. The TCG's cards have no shop weapons yet, only iconic
 * ones and cyberware, so none are here.
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
  knife: { label: 'Knife', grams: 300, cut: 'blade' },
  katana: { label: 'Katana', grams: 1300, long: true, cut: 'blade' },
  machete: { label: 'Machete', grams: 900, cut: 'blade' },
  axe: { label: 'Axe', grams: 900, cut: 'blade' },
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

const WEAPONS: Record<string, WeaponKind> = {
  // ── Pistols
  'slaught-o-matic': gun('Slaught-O-Matic', 'Slaught-O-Matic', 'Budget Arms', 'pistol', 'Power', 36, 'poverty', 45, 'Plastic, sealed and sold loaded. Empty it and throw it away: there is no reloading it.', { disposable: true, grams: 600 }),
  unity: gun('Unity', 'Unity', 'Constitutional Arms', 'pistol', 'Power', 12, 'poverty', 120, 'A plain semi-auto that does what it says and nothing else.'),
  grit: gun('HA-4 Grit', 'Grit', 'Hansen Armory', 'pistol', 'Tech', 30, 'poverty', 260, 'Dogtown-made tech pistol that runs full auto on a charge. Rough, and it keeps working.'),
  liberty: gun('Liberty', 'Liberty', 'Constitutional Arms', 'pistol', 'Power', 14, 'everyday', 160, 'A heavy frame and a hard kick, sold on the flag.'),
  nue: gun('Nue', 'Nue', 'Tsunami', 'pistol', 'Power', 10, 'everyday', 180, 'Small-frame Tsunami pistol that sits right in any hand.'),
  lexington: gun('M-10AF Lexington', 'Lexington', 'Militech', 'pistol', 'Power', 20, 'everyday', 220, 'The NCPD sidearm: light, full auto, made to stop people more than end them. Disappears in a coat pocket.'),
  ticon: gun('Ticon', 'Ticon', 'Militech', 'pistol', 'Tech', 21, 'everyday', 280, 'The older Militech tech pistol the Omaha grew from. A charged shot puts three rounds out at once.'),
  omaha: gun('M-76e Omaha', 'Omaha', 'Militech', 'pistol', 'Tech', 9, 'everyday', 340, 'Hold the trigger to charge it and it fires a burst. Small, and it means it.'),
  tamayura: gun('Tamayura', 'Tamayura', 'Arasaka', 'pistol', 'Power', 8, 'luxury', 420, 'Compact Arasaka power pistol, eight rounds, finished like a watch.'),
  chao: gun('A-22B Chao', 'Chao', 'Kang Tao', 'pistol', 'Smart', 21, 'luxury', 850, 'Kang Tao smart pistol: it does the aiming, if your cyberware lets it.'),
  kenshin: gun('JKE-X2 Kenshin', 'Kenshin', 'Arasaka', 'pistol', 'Tech', 20, 'luxury', 950, 'Arasaka tech pistol that charges a shot through cover. Tower security carries one.'),
  kappa: gun('Kappa', 'Kappa', 'Tsunami', 'pistol', 'Smart', 30, 'luxury', 1000, 'A twitchy smart pistol that can hold a lock on two people at once.'),
  yukimura: gun('HJKE-11 Yukimura', 'Yukimura', 'Arasaka', 'pistol', 'Smart', 30, 'luxury', 1100, 'Arasaka smart pistol: guided rounds after whatever your link has marked.'),
  // ── Revolvers
  metel: gun('Metel', 'Metel', 'Techtronika', 'revolver', 'Power', 8, 'poverty', 300, 'A blunt old Techtronika wheelgun that fires explosive rounds. Subtle it is not.'),
  nova: gun('DR-5 Nova', 'Nova', 'Darra Polytechnic', 'revolver', 'Power', 6, 'everyday', 260, 'Six chambers and a long barrel. A revolver never goes out of style here.'),
  overture: gun('Overture', 'Overture', 'Malorian Arms', 'revolver', 'Power', 6, 'everyday', 480, 'Malorian heavy revolver. Every shot rocks you back a step.'),
  quasar: gun('DR-12 Quasar', 'Quasar', 'Darra Polytechnic', 'revolver', 'Tech', 20, 'everyday', 520, 'A tech revolver with twenty chambers. Charge it and it empties them all at once.'),
  burya: gun('RT-46 Burya', 'Burya', 'Techtronika', 'revolver', 'Tech', 4, 'everyday', 600, 'Electromagnetic revolver: four rounds, each one hitting like a rifle\'s.'),
  // ── SMGs
  guillotine: gun('Guillotine', 'Guillotine', 'Budget Arms', 'smg', 'Power', 45, 'poverty', 150, 'Cheap and loud. Barely better than a knife in a real fight, but it makes the point.'),
  pulsar: gun('DS1 Pulsar', 'Pulsar', 'Darra Polytechnic', 'smg', 'Power', 40, 'everyday', 340, 'A fast-firing Darra SMG, forty rounds to the magazine.'),
  saratoga: gun('M221 Saratoga', 'Saratoga', 'Militech', 'smg', 'Power', 40, 'everyday', 420, 'Militech SMG, smooth and steady on full auto.'),
  warden: gun('HA-7 Warden', 'Warden', 'Hansen Armory', 'smg', 'Smart', 40, 'everyday', 640, 'Dogtown smart SMG that fires faster the longer you hold the trigger.'),
  shigure: gun('Shigure', 'Shigure', 'Arasaka', 'smg', 'Power', 50, 'luxury', 760, 'Arasaka power SMG with a fifty-round magazine.'),
  shingen: gun('TKI-20 Shingen', 'Shingen', 'Arasaka', 'smg', 'Smart', 30, 'luxury', 980, 'Arasaka smart SMG: guided rounds that find their way around a corner.'),
  dian: gun('G-58 Dian', 'Dian', 'Kang Tao', 'smg', 'Smart', 45, 'luxury', 1050, 'The Kang Tao smart SMG the gun mags keep ranking first.'),
  senkoh: gun('Senkoh LX', 'Senkoh', 'Arasaka & Jinguji', 'smg', 'Tech', 30, 'luxury', 1300, 'A tech SMG Jinguji styled for Arasaka. Charged, it runs full auto.'),
  // ── Assault rifles
  umbra: gun('DA8 Umbra', 'Umbra', 'Darra Polytechnic', 'assault-rifle', 'Power', 40, 'poverty', 260, 'Low-grade alloy and a high rate of fire. People empty a few magazines and drop it down a drain.'),
  copperhead: gun('D5 Copperhead', 'Copperhead', 'Nokota', 'assault-rifle', 'Power', 30, 'everyday', 480, 'A plain all-round rifle, sold on every continent.'),
  ajax: gun('M251s Ajax', 'Ajax', 'Militech', 'assault-rifle', 'Power', 30, 'everyday', 620, 'Militech service rifle: hits hard and shrugs off the weather.'),
  nowaki: gun('Nowaki', 'Nowaki', 'Arasaka', 'assault-rifle', 'Power', 21, 'luxury', 820, 'An old Arasaka design still in service, accurate in short bursts.'),
  kyubi: gun('Kyubi', 'Kyubi', 'Tsunami', 'assault-rifle', 'Power', 20, 'luxury', 900, 'Semi-auto Tsunami rifle, quick and precise.'),
  masamune: gun('HJSH-18 Masamune', 'Masamune', 'Arasaka', 'assault-rifle', 'Power', 24, 'luxury', 980, 'Arasaka rifle: three-round bursts and a lot of kick.'),
  sidewinder: gun('D5 Sidewinder', 'Sidewinder', 'Nokota', 'assault-rifle', 'Smart', 30, 'luxury', 1100, 'Nokota smart rifle. Guided rounds, so a miss is rare.'),
  // ── Precision rifles
  kolac: gun('Kolac', 'Kolac', 'Rostović', 'precision-rifle', 'Power', 6, 'poverty', 380, 'A Serbian marksman rifle, a little better than its price.'),
  'sor-22': gun('SOR-22', 'SOR-22', 'Midnight Arms', 'precision-rifle', 'Power', 10, 'everyday', 560, 'A dependable semi-auto marksman rifle from Midnight Arms.'),
  achilles: gun('M-179e Achilles', 'Achilles', 'Militech', 'precision-rifle', 'Tech', 9, 'luxury', 1400, 'Militech tech rifle: charged shots go through walls.'),
  // ── Shotguns
  carnage: gun('Carnage', 'Carnage', 'Budget Arms', 'shotgun', 'Power', 4, 'poverty', 280, 'A huge, heavy pump gun. Four shells, and each one leaves a hole you could climb through.', { grams: 4600 }),
  tactician: gun('M2038 Tactician', 'Tactician', 'Constitutional Arms', 'shotgun', 'Power', 8, 'everyday', 420, 'Pump action, eight shells, no arguments.'),
  crusher: gun('Crusher', 'Crusher', 'Militech', 'shotgun', 'Power', 12, 'everyday', 520, 'A Militech pump shotgun that has been around since 2020.'),
  pozhar: gun('VST-37 Pozhar', 'Pozhar', 'Techtronika', 'shotgun', 'Power', 12, 'everyday', 600, 'Big-bore Techtronika shotgun with a kick to match.'),
  zhuo: gun('L-69 Zhuo', 'Zhuo', 'Kang Tao', 'shotgun', 'Smart', 4, 'luxury', 1200, 'Kang Tao smart shotgun: guided slugs, and a lot of weight to haul around.', { grams: 4600 }),
  // ── Double-barrel shotguns
  igla: gun('DB-4 Igla', 'Igla', 'Rostović', 'double-barrel', 'Power', 2, 'poverty', 180, 'A cheap double-barrel. Two shells is all it ever needs.'),
  testera: gun('DB-2 Testera', 'Testera', 'Rostović', 'double-barrel', 'Power', 2, 'poverty', 220, 'Side-by-side barrels: an old design nobody has needed to improve.'),
  satara: gun('DB-2 Satara', 'Satara', 'Rostović', 'double-barrel', 'Tech', 2, 'everyday', 480, 'A tech double-barrel. Charge it and both shells go through cover.'),
  palica: gun('DB-4 Palica', 'Palica', 'Rostović', 'double-barrel', 'Smart', 2, 'everyday', 520, 'A smart double-barrel at a street price. Its guided shot hits harder, when it keeps the lock.'),
  // ── Sniper rifles
  grad: gun('SPT32 Grad', 'Grad', 'Techtronika', 'sniper-rifle', 'Power', 4, 'everyday', 900, 'A heavy Techtronika bolt-action. There is no cover from it.'),
  ashura: gun('Ashura', 'Ashura', 'Tsunami', 'sniper-rifle', 'Smart', 1, 'luxury', 1600, 'Smart sniper rifle: one round and one target at a time.'),
  nekomata: gun('Nekomata', 'Nekomata', 'Tsunami', 'sniper-rifle', 'Tech', 4, 'luxury', 1800, 'Tsunami tech sniper rifle. Charged, it goes through the wall and whoever is behind it.'),
  // ── Light machine guns
  defender: gun('M2067 Defender', 'Defender', 'Constitutional Arms', 'lmg', 'Power', 80, 'everyday', 1200, 'Eighty rounds deep. Carrying it slows you down before you fire a shot.'),
  ma70: gun('MA70 HB', 'MA70', 'Midnight Arms', 'lmg', 'Power', 60, 'luxury', 1500, 'A heavy-barrel LMG that fires explosive rounds.'),

  // ── Melee: blades
  'chefs-knife': melee("Chef's Knife", "chef's knife", 'knife', 'poverty', 15, 'A kitchen knife. It works out of the kitchen too.', { grams: 250 }),
  knife: melee('Knife', 'knife', 'knife', 'poverty', 20, 'A plain fixed blade, balanced well enough to throw.'),
  machete: melee('Machete', 'machete', 'machete', 'poverty', 40, 'Long and heavy. Clears brush, or a path.'),
  punknife: melee('Punknife', 'punknife', 'knife', 'everyday', 70, 'A throwing knife in street paint, balanced like a dart.', { grams: 250 }),
  kukri: melee('Kukri', 'kukri', 'machete', 'everyday', 60, 'A curved Nepalese blade, its weight out toward the tip.', { grams: 800 }),
  tomahawk: melee('Tomahawk', 'tomahawk', 'axe', 'everyday', 55, 'A Militech throwing axe.', { maker: 'Militech', grams: 700 }),
  claw: melee('Claw', 'claw', 'axe', 'everyday', 140, 'A heavy hooked axe that wants a strong arm.', { grams: 2000 }),
  razor: melee('Razor', 'Razor', 'machete', 'everyday', 380, 'A Techtronika blade heavy enough to cut like a saw.', { maker: 'Techtronika', grams: 1800 }),
  'cut-o-matic': melee('Cut-o-Matic', 'Cut-o-Matic', 'chainsword', 'everyday', 300, 'A chainsaw on a sword hilt. The noise alone clears a room.', { maker: 'Budget Arms' }),
  kaiken: melee('Kaiken', 'kaiken', 'knife', 'luxury', 160, 'A short Japanese blade, forged from the steel left over from a katana.', { grams: 350 }),
  katana: melee('Katana', 'katana', 'katana', 'luxury', 450, 'A long single-edged sword. Japantown still pays for a good one.'),
  // ── Melee: blunt
  'steel-pipe': melee('Steel Pipe', 'pipe', 'club', 'poverty', 8, 'A length of pipe. It held something up once.', { grams: 1800 }),
  'tire-iron': melee('Tire Iron', 'tire iron', 'club', 'poverty', 10, 'Changes a tire. Changes a mind.', { grams: 1200 }),
  crowbar: melee('Crowbar', 'crowbar', 'club', 'poverty', 15, 'Opens doors, crates and arguments.', { grams: 1600 }),
  'baseball-bat': melee('Baseball Bat', 'bat', 'two-handed-club', 'poverty', 25, 'Aluminum, for shins as much as home runs.'),
  'electric-baton': melee('Electric Baton Alpha', 'baton', 'club', 'everyday', 220, 'A shock baton made for crowd control. One swing can drop two.', { grams: 900 }),
  hammer: melee('Hammer', 'hammer', 'hammer', 'everyday', 160, 'A sledgehammer heavy enough to slow you down.'),
  kanabo: melee('Kanabo', 'kanabo', 'two-handed-club', 'luxury', 180, 'A studded war club. The name sounds refined; the club does not.', { grams: 2500 }),
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
