import type { ChromeContent, ImplantKind, BodyPart, SystemKind } from '../engine/cyberware';
import type { Quality } from '../engine/food';

/**
 * Cyberware. Every implant is a real, non-iconic 2077 one checked against its own page on
 * the Cyberpunk Wiki: the name its infobox gives it (a cyberdeck by its first mark, "Paraline
 * Mk.1"), its manufacturer, the part of the body it goes in (the infobox's type; an operating
 * system by its kind: Cyberdeck, Sandevistan, Berserk), the cyberware capacity it takes and
 * the tier it's first sold at. Each note says only what its page says it does, in our words.
 * The body is the wiki's ten parts with the wiki's slots (a second face slot and a second
 * hand slot come out of a quest and a perk in the game, so they're one each here). Iconic
 * implants (Dogtown's airdrops, the Apogee, the Canto, the Netdriver…), the quest tattoos and
 * the Newton Module, whose page says nothing of where it's had, aren't here; the MaxTac Mantis
 * Blades come off a MaxTac operator, so they're on no rack (`sold: false`). The TCG's cyberware
 * cards are the Mantis Blades, here, and the Arasaka Emergency Radioport and the Deadman
 * Transmitter, which the wiki has no 2077 page for. The tier of store that stocks each (the
 * wiki's Tier I secondhand, II everyday, III and up luxury), the prices, the weights, the
 * capacity a body has and the fitting fee are ours.
 */

const PARTS: ChromeContent['parts'] = {
  'frontal-cortex': { label: 'Frontal Cortex', slots: 3, grams: 150 },
  'operating-system': { label: 'Operating System', slots: 1, grams: 600 },
  arms: { label: 'Arms', slots: 1, grams: 3200 },
  face: { label: 'Face', slots: 1, grams: 100 },
  skeleton: { label: 'Skeleton', slots: 2, grams: 1500 },
  hands: { label: 'Hands', slots: 1, grams: 300 },
  'nervous-system': { label: 'Nervous System', slots: 3, grams: 200 },
  'circulatory-system': { label: 'Circulatory System', slots: 3, grams: 500 },
  'integumentary-system': { label: 'Integumentary System', slots: 3, grams: 800 },
  legs: { label: 'Legs', slots: 1, grams: 1500 },
};

const SYSTEMS: Record<SystemKind, string> = { cyberdeck: 'Cyberdeck', sandevistan: 'Sandevistan', berserk: 'Berserk' };

/** The tier of store that sells what the wiki first sells at each tier. */
const STORE_TIER: Record<ImplantKind['tier'], Quality> = { 1: 'poverty', 2: 'everyday', 3: 'luxury', 4: 'luxury', 5: 'luxury' };

function ware(name: string, part: BodyPart, tier: ImplantKind['tier'], capacity: number, price: number, note: string, extra: Partial<ImplantKind> = {}): ImplantKind {
  return { name, short: name, part, tier, capacity, quality: STORE_TIER[tier], price, note, ...extra };
}

function system(name: string, kind: SystemKind, maker: string, tier: ImplantKind['tier'], capacity: number, price: number, note: string, extra: Partial<ImplantKind> = {}): ImplantKind {
  return ware(name, 'operating-system', tier, capacity, price, note, { system: kind, maker, ...extra });
}

const IMPLANTS: Record<string, ImplantKind> = {
  // ── Frontal Cortex
  bioconductor: ware('Bioconductor', 'frontal-cortex', 1, 16, 600, 'Makes the wiring between your implants superconduct, so a quickhack can land a critical hit.'),
  'camillo-ram-manager': ware('Camillo RAM Manager', 'frontal-cortex', 4, 8, 4200, 'Manages the RAM passing between your brain and your cyberdeck, and tops it back up when it runs low.'),
  'ex-disk': ware('Ex-Disk', 'frontal-cortex', 3, 10, 2400, 'More room in the brain to store and work through data: more RAM for a cyberdeck.'),
  'kerenzikov-boost-system': ware('Kerenzikov Boost System', 'frontal-cortex', 3, 3, 2200, 'An add-on for a Kerenzikov: while it runs, shooting costs no stamina and the world slows a little more.', { maker: 'Militech' }),
  'mechatronic-core': ware('Mechatronic Core', 'frontal-cortex', 1, 5, 350, 'Knows where machines are weak, the mass-produced and the rare: hits harder on drones, robots, mechs and turrets.'),
  'memory-boost': ware('Memory Boost', 'frontal-cortex', 2, 18, 1100, 'Keeps brain and chrome in step, and wins back a little RAM every time an enemy goes down.'),
  'ram-upgrade': ware('RAM Upgrade', 'frontal-cortex', 1, 8, 450, 'Faster random-access memory for your system: more RAM, and quicker to come back.', { maker: 'Militech' }),
  'self-ice': ware('Self-ICE', 'frontal-cortex', 3, 5, 2600, "Intrusion countermeasures for your own implants: it shrugs off an enemy's quickhack by itself.", { maker: 'Rostović' }),

  // ── Operating System: cyberdecks
  paraline: system('Paraline Mk.1', 'cyberdeck', 'Militech', 1, 14, 900, "Not the strongest deck on the market, but it runs several jobs at once if you're patient. Quickhacks on people and devices while you scan."),
  'arasaka-shadow': system('Arasaka Mk.1', 'cyberdeck', 'Arasaka', 1, 14, 1200, 'A top deck for infiltration and corporate espionage; the files call it the Shadow. Better marks take longer to trace.'),
  rippler: system('Rippler Mk.1', 'cyberdeck', 'Tetratronic', 1, 16, 1100, "Tetratronic says its decks run combat ops the world over. Not all true, but it's a strong, efficient deck."),
  'biotech-sigma': system('Biotech Σ Mk.1', 'cyberdeck', 'Biotech Σ', 2, 16, 2000, 'Overclocked Biotech coprocessors, for netrunners who live on getting their RAM back fast.'),
  'raven-microcyber': system('Raven Microcyber Mk.1', 'cyberdeck', 'Raven Microcybernetics', 3, 20, 3600, 'A battleship of a deck: system security and anti-theft protocols locked down tight, and quickhacks that spread further.'),
  // ── Operating System: Sandevistans
  'dynalar-sandevistan': system('Dynalar Sandevistan', 'sandevistan', 'Dynalar', 2, 18, 2400, "The soldier's and the merc's old standby: the world slows to half around you, combat support built in, at a fair price."),
  'warp-dancer': system('Warp Dancer', 'sandevistan', 'QianT', 3, 14, 3800, "QianT's Sandevistan for defense: the world slows a little, and you shrug off more of whatever keeps hitting you."),
  'zetatech-sandevistan': system('Zetatech Sandevistan', 'sandevistan', 'Zetatech', 2, 20, 2600, 'The popular mass-market Sandevistan, liked for its simplicity and for what it does in the air. The world slows by a third.'),
  // ── Operating System: Berserks
  'biodyne-berserk': system('BioDyne Berserk', 'berserk', 'BioDyne', 2, 20, 2200, "Cheap and versatile: quick results, no miracles. While it runs you fight with your hands or a blade, and you don't go down easy."),
  'moore-tech-berserk': system('Moore Tech Berserk', 'berserk', 'MoorE Technologies', 2, 12, 1600, 'A classic, one of the best-liked Berserks, proven where the stakes are highest. Melee only while it runs, and hard to put down.'),
  'zetatech-berserk': system('Zetatech Berserk', 'berserk', 'Zetatech', 3, 16, 3200, 'Makes you a lean killing machine, and a hard one to kill, with nanodermal impact absorption. Melee only while it runs.'),

  // ── Arms
  'gorilla-arms': ware('Gorilla Arms', 'arms', 2, 8, 1500, 'Classic replacement arms built for hard labor: light, efficient, and every punch lands like a hammer.', { maker: 'Arasaka' }),
  'electrifying-gorilla-arms': ware('Electrifying Gorilla Arms', 'arms', 2, 8, 1800, 'Gorilla Arms with an electric shock in every punch.', { maker: 'Arasaka' }),
  'thermal-gorilla-arms': ware('Thermal Gorilla Arms', 'arms', 2, 8, 1800, 'Gorilla Arms whose punches burn.', { maker: 'Arasaka' }),
  'toxic-gorilla-arms': ware('Toxic Gorilla Arms', 'arms', 2, 8, 1800, 'Gorilla Arms whose punches poison.', { maker: 'Arasaka' }),
  'mantis-blades': ware('Mantis Blades', 'arms', 2, 8, 1800, 'Blades folded into the forearms, made to kill and to hide, and they look the part: quick slashes, and a leap that lands on a target.', { maker: 'Arasaka' }),
  'electrifying-mantis-blades': ware('Electrifying Mantis Blades', 'arms', 2, 8, 2100, 'Mantis Blades that shock what they cut.'),
  'thermal-mantis-blades': ware('Thermal Mantis Blades', 'arms', 2, 8, 2100, 'Mantis Blades that burn what they cut.'),
  'toxic-mantis-blades': ware('Toxic Mantis Blades', 'arms', 2, 8, 2100, 'Mantis Blades that poison what they cut.'),
  'maxtac-mantis-blades': ware('MaxTac Mantis Blades', 'arms', 4, 8, 6000, "The Mantis Blades MaxTac's operators carry. No ripperdoc sells them.", { maker: 'MaxTac', sold: false }),
  monowire: ware('Monowire', 'arms', 2, 8, 1600, 'A whip of monofilament wire with an edge one molecule wide, for several enemies at once from a distance.'),
  'electrifying-monowire': ware('Electrifying Monowire', 'arms', 2, 8, 1900, 'A Monowire that carries an electric charge.'),
  'thermal-monowire': ware('Thermal Monowire', 'arms', 2, 8, 1900, 'A Monowire that burns.'),
  'toxic-monowire': ware('Toxic Monowire', 'arms', 2, 8, 1900, 'A Monowire that poisons.'),
  'projectile-launch-system': ware('Projectile Launch System', 'arms', 2, 8, 1700, 'A missile launcher in the palm of your hand, near enough: it fires an explosive round.', { maker: 'Arasaka' }),
  'electrifying-projectile-launch-system': ware('Electrifying Projectile Launch System', 'arms', 2, 8, 2000, 'The launcher in the palm, its round bursting in an electric blast.'),
  'thermal-projectile-launch-system': ware('Thermal Projectile Launch System', 'arms', 2, 8, 2000, 'The launcher in the palm, its round bursting in fire that can set someone alight.'),
  'toxic-projectile-launch-system': ware('Toxic Projectile Launch System', 'arms', 2, 8, 2000, 'The launcher in the palm, its round bursting in a chemical blast that can poison.'),

  // ── Face
  'basic-kiroshi-optics': ware('Basic Kiroshi Optics', 'face', 1, 1, 250, "Kiroshi's basic eyes: a zoom when you scan, and cameras take longer to spot you.", { maker: 'Kiroshi', short: 'Kiroshi optics' }),
  clairvoyant: ware('Clairvoyant', 'face', 3, 8, 2400, 'Kiroshi optics: a scan picks out the enemies around you, and keeps them marked for a minute.', { maker: 'Kiroshi', short: 'Clairvoyant optics' }),
  doomsayer: ware('Doomsayer', 'face', 1, 2, 400, 'Kiroshi optics: a scan picks out explosives and traps around where you look, for a minute after.', { maker: 'Kiroshi & Militech', short: 'Doomsayer optics' }),
  sentry: ware('Sentry', 'face', 1, 2, 400, 'Kiroshi optics: a scan picks out the cameras and turrets around you, for a minute after.', { maker: 'Kiroshi & Militech', short: 'Sentry optics' }),
  stalker: ware('Stalker', 'face', 1, 2, 450, 'Kiroshi optics that link up with a Tech weapon, and show enemies behind cover while you aim.', { maker: 'Kiroshi', short: 'Stalker optics' }),
  'the-oracle': ware('The Oracle', 'face', 4, 10, 4500, 'Kiroshi optics that see it all on a scan: enemies, even behind cover, cameras and turrets, explosives and traps.', { maker: 'Kiroshi', short: 'Oracle optics' }),

  // ── Hands
  'ballistic-coprocessor': ware('Ballistic Coprocessor', 'hands', 1, 2, 300, 'Rounds from Power weapons ricochet more often, and hit harder when they do.'),
  'handle-wrap': ware('Handle Wrap', 'hands', 3, 8, 2000, 'A grip for throwing: drawing or throwing a throwable makes the next few likelier to land a critical.'),
  microgenerator: ware('Microgenerator', 'hands', 2, 9, 1000, 'A tiny high-voltage generator: reload an empty gun and the next shot sets off an electroshock where it lands.'),
  'shock-absorber': ware('Shock Absorber', 'hands', 1, 12, 500, 'Takes some of the recoil out of every gun.', { maker: 'Militech' }),
  'smart-link': ware('Smart Link', 'hands', 1, 4, 400, 'Lets Smart weapons track their targets. Without one, a smart gun is just a gun.'),

  // ── Skeleton
  'bionic-joints': ware('Bionic Joints', 'skeleton', 1, 8, 400, 'Armor, plain and effective.', { maker: 'MoorE Technologies' }),
  'dense-marrow': ware('Dense Marrow', 'skeleton', 2, 16, 1200, 'Heavier bones and more weight behind every blow: melee hits harder.'),
  'epimorphic-skeleton': ware('Epimorphic Skeleton', 'skeleton', 4, 40, 6000, 'A skeleton that holds more life in it: more health, and a lot of armor.'),
  'feen-x': ware('Feen-X', 'skeleton', 1, 16, 600, "RAM comes back far faster when there's little left."),
  'kinetic-frame': ware('Kinetic Frame', 'skeleton', 1, 16, 600, 'With plenty of stamina in you, you\'re likelier to shrug off part of a hit.'),
  'para-bellum': ware('Para Bellum', 'skeleton', 3, 25, 3000, 'More armor, all of the time.'),
  'ram-recoup': ware('RAM Recoup', 'skeleton', 1, 14, 550, 'Taking damage gives a little RAM back.', { maker: 'Kang Tao' }),
  'scar-coalescer': ware('Scar Coalescer', 'skeleton', 1, 20, 650, 'More armor once you\'re down below half your health.', { maker: 'Kang Tao' }),
  scarab: ware('Scarab', 'skeleton', 1, 14, 500, 'Crouch and your armor goes up, for moving slower.'),
  'spring-joints': ware('Spring Joints', 'skeleton', 2, 16, 1200, 'When you shrug off part of a hit, more of it goes.'),
  'titanium-bones': ware('Titanium Bones', 'skeleton', 1, 6, 450, 'Titanium bones: you can carry a lot more.'),
  'universal-booster': ware('Universal Booster', 'skeleton', 3, 25, 2800, 'Health items do more: a little armor, and less stamina spent, for a few seconds after.'),

  // ── Nervous System
  'adrenaline-converter': ware('Adrenaline Converter', 'nervous-system', 1, 6, 350, 'Faster on your feet for a few seconds when a fight starts.'),
  'atomic-sensors': ware('Atomic Sensors', 'nervous-system', 1, 5, 350, 'The nearer someone is to spotting you, the faster you move.', { maker: 'Kang Tao' }),
  kerenzikov: ware('Kerenzikov', 'nervous-system', 2, 12, 1400, 'The classic reflex booster: aim and shoot while you slide, dodge or dash.'),
  neofiber: ware('NeoFiber', 'nervous-system', 3, 14, 2400, 'Synthetic muscle fiber: likelier to shrug off part of a hit, and more of it when you do.', { maker: 'Kang Tao' }),
  'reflex-tuner': ware('Reflex Tuner', 'nervous-system', 1, 5, 400, 'A coprocessor for emergencies: below a quarter of your health, the world slows for a few seconds.'),
  stabber: ware('Stabber', 'nervous-system', 2, 12, 1100, 'Blades and throwables find the soft spots: more critical hits.', { maker: 'Tsunami' }),
  'synaptic-accelerator': ware('Synaptic Accelerator', 'nervous-system', 2, 5, 900, "Steadies the body's hormones under threat: when someone's halfway to spotting you, the world slows."),
  'tyrosine-injector': ware('Tyrosine Injector', 'nervous-system', 1, 8, 400, 'After a takedown, headshots hit harder and you move faster, for a while.'),
  'visual-cortex-support': ware('Visual Cortex Support', 'nervous-system', 1, 20, 700, 'Sharper perception and aim: the farther off the target, the likelier a critical.'),

  // ── Circulatory System
  'adrenaline-booster': ware('Adrenaline Booster', 'circulatory-system', 1, 14, 500, 'Keeps the body going under strain: stamina back every time a melee weapon puts someone down.', { maker: 'BioDyne Systems' }),
  biomonitor: ware('Biomonitor', 'circulatory-system', 1, 14, 550, 'Runs the healing: below half your health, it uses your health item for you.'),
  'black-mamba': ware('Black Mamba', 'circulatory-system', 3, 16, 2400, "Against anyone you've poisoned: the poison does less, and everything else more."),
  'blood-pump': ware('Blood Pump', 'circulatory-system', 2, 15, 1300, "Pushes oxygen to the body's cells faster: it works like a strong health item."),
  'clutch-padding': ware('Clutch Padding', 'circulatory-system', 1, 12, 450, "Shooting takes less stamina, so you've still got the legs for cover after a full clip."),
  'feedback-circuit': ware('Feedback Circuit', 'circulatory-system', 3, 14, 2200, 'Wires body and chrome into weapons: a fully charged Tech shot that hits gives you health.'),
  'heal-on-kill': ware('Heal-On-Kill', 'circulatory-system', 1, 10, 450, 'A combat implant: hormones in check, and some health back when an enemy goes down.'),
  microrotors: ware('Microrotors', 'circulatory-system', 1, 12, 450, 'Quicker in a melee: faster attacks.'),
  'second-heart': ware('Second Heart', 'circulatory-system', 4, 30, 5500, "Fixes one of nature's oversights: when your health hits zero, it all comes back."),
  threatevac: ware('ThreatEvac', 'circulatory-system', 1, 5, 300, 'Faster on your feet once your health is down to a quarter. Call it a tactical retreat.'),

  // ── Integumentary System
  carapace: ware('Carapace', 'integumentary-system', 2, 16, 1300, 'Armor that works harder against what hits you from the side or behind.'),
  'cellular-adapter': ware('Cellular Adapter', 'integumentary-system', 2, 10, 1100, 'Heavy armor for a body that was built different.'),
  'cogito-lattice': ware('Cogito Lattice', 'integumentary-system', 1, 12, 500, 'Armor that more than triples when your RAM runs low.'),
  countershell: ware('Countershell', 'integumentary-system', 1, 12, 500, "Lose a third of your health in a few seconds and you're likelier to shrug off part of what comes next."),
  defenzikov: ware('Defenzikov', 'integumentary-system', 3, 20, 2600, "When your Kerenzikov ends, you're far likelier to shrug off part of a hit for a few seconds."),
  'nano-plating': ware('Nano-plating', 'integumentary-system', 2, 20, 1600, 'Plating that now and then stops a bullet outright.', { maker: 'Kang Tao' }),
  'optical-camo': ware('Optical Camo', 'integumentary-system', 2, 20, 1800, 'All but invisible in visible light for a few seconds: hard to find, and hard to hit.', { maker: 'Kang Tao' }),
  'pain-editor': ware('Pain Editor', 'integumentary-system', 4, 35, 5000, 'A little less of every hit gets through.'),
  painducer: ware('Painducer', 'integumentary-system', 4, 30, 4800, 'Takes part of every hit and spreads it out over time.'),
  proxishield: ware('ProxiShield', 'integumentary-system', 1, 10, 400, 'The closer an attacker is, the less they hurt you.'),
  rangeguard: ware('RangeGuard', 'integumentary-system', 1, 14, 500, 'More armor while no enemy is within a few meters.'),
  'shock-n-awe': ware('Shock-n-Awe', 'integumentary-system', 1, 25, 800, 'Self-defense made in Shanghai: a hit can set off an electroshock that catches everyone close.'),
  'subdermal-armor': ware('Subdermal Armor', 'integumentary-system', 1, 5, 300, 'Armor under the skin. Simple, and it works.'),

  // ── Legs
  'fortified-ankles': ware('Fortified Ankles', 'legs', 1, 6, 450, 'Ankles reinforced with plastic fiber and nanogel: charge a jump to go further.', { maker: 'Zetatech' }),
  'jenkins-tendons': ware("Jenkins' Tendons", 'legs', 2, 6, 900, 'A burst of speed when you sprint, easing off after a few seconds.'),
  'lynx-paws': ware('Lynx Paws', 'legs', 2, 5, 850, 'Connective tissue for the legs: quieter, quicker in a crouch, and falls hurt less.'),
  'reinforced-tendons': ware('Reinforced Tendons', 'legs', 2, 8, 1000, 'Connective tissue for the legs: jump again in midair.', { maker: 'Tsunami' }),
};

export const CHROME: ChromeContent = {
  parts: PARTS,
  systems: SYSTEMS,
  implants: IMPLANTS,
  stores: {
    // A ripperdoc's clinic, a storefront or a place: it sells a spread and fits what it sells.
    ripperdoc: { count: 10, perPart: 2, up: true, fits: true },
    'cyberware-outlet': { count: 12, perPart: 3 },
    'cyberdeck-shop': { count: 7, only: ['cyberdeck', 'frontal-cortex'], up: true },
  },
  tiers: { poverty: ['poverty', 'everyday'], everyday: ['poverty', 'everyday'], luxury: ['everyday', 'luxury'] },
  capacity: 50,
  fitting: 150,
};

/** What a store of chrome says about itself: a ripperdoc by its tier, an outlet, a deck shop. */
export const CHROME_BLURBS: Record<Quality | 'outlet' | 'decks', string> = {
  luxury: 'A white clinic with a corporate client list: chrome under glass, a surgeon on call, and a chair that costs more than a car.',
  everyday: 'A ripperdoc\'s chair under surgical lights, chrome in the cabinets, and the doc fits what you buy before you leave.',
  poverty: 'A back-room chair, secondhand chrome in a tray, and a ripperdoc who asks no questions and gives no refunds.',
  outlet: 'Chrome in sealed boxes on the shelves, sold to take away. You find a ripperdoc to fit it.',
  decks: 'Cyberdecks on the wall and RAM in the case, for netrunners. A ripperdoc fits them.',
};
