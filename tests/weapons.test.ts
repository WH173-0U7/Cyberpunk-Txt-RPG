import { describe, expect, it } from 'vitest';
import { fits, itemGrams, placeFor, stackSlots, type PocketState } from '../src/engine/carry';
import { drawWeapon, isGun, isLong, MELEE_LABEL, stockFor, weaponGrams, type WeaponClass } from '../src/engine/weapons';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';
import { ARMS } from '../src/data/weapons';
import type { Item } from '../src/engine/types';

const none = { bills: 0, coins: 0 };
const dishes = FOOD.dishes;

/**
 * Each weapon as its page on the Cyberpunk Wiki has it (checked 2026-10-14, through the
 * MediaWiki API): the infobox's title, manufacturer, type, technology (Power, Tech, Smart; for
 * melee, Blade, Blunt or Thrown) and ammo capacity. A weapon added to the game is added here
 * from its own page; one that disagrees with it fails.
 */
const CANON: Record<string, [string, string, string, string, number | null]> = {
  'slaught-o-matic': ["Slaught-O-Matic", "Budget Arms", "Pistol", "Power", 36],
  'unity': ["Unity", "Constitutional Arms", "Pistol", "Power", 12],
  'grit': ["HA-4 Grit", "Hansen Armory", "Pistol", "Tech", 30],
  'liberty': ["Liberty", "Constitutional Arms", "Pistol", "Power", 14],
  'nue': ["Nue", "Tsunami", "Pistol", "Power", 10],
  'lexington': ["M-10AF Lexington", "Militech", "Pistol", "Power", 20],
  'ticon': ["Ticon", "Militech", "Pistol", "Tech", 21],
  'omaha': ["M-76e Omaha", "Militech", "Pistol", "Tech", 9],
  'tamayura': ["Tamayura", "Arasaka", "Pistol", "Power", 8],
  'chao': ["A-22B Chao", "Kang Tao", "Pistol", "Smart", 21],
  'kenshin': ["JKE-X2 Kenshin", "Arasaka", "Pistol", "Tech", 20],
  'kappa': ["Kappa", "Tsunami", "Pistol", "Smart", 30],
  'yukimura': ["HJKE-11 Yukimura", "Arasaka", "Pistol", "Smart", 30],
  'metel': ["Metel", "Techtronika", "Revolver", "Power", 8],
  'nova': ["DR-5 Nova", "Darra Polytechnic", "Revolver", "Power", 6],
  'overture': ["Overture", "Malorian Arms", "Revolver", "Power", 6],
  'quasar': ["DR-12 Quasar", "Darra Polytechnic", "Revolver", "Tech", 20],
  'burya': ["RT-46 Burya", "Techtronika", "Revolver", "Tech", 4],
  'guillotine': ["Guillotine", "Budget Arms", "Submachine Gun", "Power", 45],
  'pulsar': ["DS1 Pulsar", "Darra Polytechnic", "Submachine Gun", "Power", 40],
  'saratoga': ["M221 Saratoga", "Militech", "Submachine Gun", "Power", 40],
  'warden': ["HA-7 Warden", "Hansen Armory", "Submachine Gun", "Smart", 40],
  'shigure': ["Shigure", "Arasaka", "Submachine Gun", "Power", 50],
  'shingen': ["TKI-20 Shingen", "Arasaka", "Submachine Gun", "Smart", 30],
  'dian': ["G-58 Dian", "Kang Tao", "Submachine Gun", "Smart", 45],
  'senkoh': ["Senkoh LX", "Arasaka & Jinguji", "Submachine Gun", "Tech", 30],
  'umbra': ["DA8 Umbra", "Darra Polytechnic", "Assault Rifle", "Power", 40],
  'copperhead': ["D5 Copperhead", "Nokota", "Assault Rifle", "Power", 30],
  'ajax': ["M251s Ajax", "Militech", "Assault Rifle", "Power", 30],
  'nowaki': ["Nowaki", "Arasaka", "Assault Rifle", "Power", 21],
  'kyubi': ["Kyubi", "Tsunami", "Assault Rifle", "Power", 20],
  'masamune': ["HJSH-18 Masamune", "Arasaka", "Assault Rifle", "Power", 24],
  'sidewinder': ["D5 Sidewinder", "Nokota", "Assault Rifle", "Smart", 30],
  'kolac': ["Kolac", "Rostovi\u0107", "Precision Rifle", "Power", 6],
  'sor-22': ["SOR-22", "Midnight Arms", "Precision Rifle", "Power", 10],
  'achilles': ["M-179e Achilles", "Militech", "Precision Rifle", "Tech", 9],
  'carnage': ["Carnage", "Budget Arms", "Shotgun", "Power", 4],
  'tactician': ["M2038 Tactician", "Constitutional Arms", "Shotgun", "Power", 8],
  'crusher': ["Crusher", "Militech", "Shotgun", "Power", 12],
  'pozhar': ["VST-37 Pozhar", "Techtronika", "Shotgun", "Power", 12],
  'zhuo': ["L-69 Zhuo", "Kang Tao", "Shotgun", "Smart", 4],
  'igla': ["DB-4 Igla", "Rostovi\u0107", "Double-Barrel Shotgun", "Power", 2],
  'testera': ["DB-2 Testera", "Rostovi\u0107", "Double-Barrel Shotgun", "Power", 2],
  'satara': ["DB-2 Satara", "Rostovi\u0107", "Double-Barrel Shotgun", "Tech", 2],
  'palica': ["DB-4 Palica", "Rostovi\u0107", "Double-Barrel Shotgun", "Smart", 2],
  'grad': ["SPT32 Grad", "Techtronika", "Sniper Rifle", "Power", 4],
  'ashura': ["Ashura", "Tsunami", "Sniper Rifle", "Smart", 1],
  'nekomata': ["Nekomata", "Tsunami", "Sniper Rifle", "Tech", 4],
  'defender': ["M2067 Defender", "Constitutional Arms", "Light Machine Gun", "Power", 80],
  'ma70': ["MA70 HB", "Midnight Arms", "Light Machine Gun", "Power", 60],
  'chefs-knife': ["Chef's Knife", "", "Knife", "Thrown", null],
  'knife': ["Knife", "", "Knife", "Thrown", null],
  'punknife': ["Punknife", "", "Knife", "Thrown", null],
  'neurotoxin-knife': ["Neurotoxin Knife", "", "Knife", "Thrown", null],
  'kaiken': ["Kaiken", "", "Knife", "Thrown", null],
  'tomahawk': ["Tomahawk", "Militech", "Axe", "Thrown", null],
  'claw': ["Claw", "", "Axe", "Thrown", null],
  'machete': ["Machete", "", "Machete", "Blade", null],
  'kukri': ["Kukri", "", "Machete", "Blade", null],
  'razor': ["Razor", "Techtronika", "Machete", "Blade", null],
  'cut-o-matic': ["Cut-o-Matic", "Budget Arms", "Chainsword", "Blade", null],
  'katana': ["Katana", "", "Katana", "Blade", null],
  'steel-pipe': ["Steel Pipe", "", "One-Handed Club", "Blunt", null],
  'tire-iron': ["Tire Iron", "", "One-Handed Club", "Blunt", null],
  'crowbar': ["Crowbar", "", "One-Handed Club", "Blunt", null],
  'baseball-bat': ["Baseball Bat", "", "Two-Handed Club", "Blunt", null],
  'electric-baton': ["Electric Baton Alpha", "", "One-Handed Club", "Blunt", null],
  'electric-baton-beta': ["Electric Baton Beta", "", "One-Handed Club", "Blunt", null],
  'electric-baton-gamma': ["Electric Baton Gamma", "", "One-Handed Club", "Blunt", null],
  'hammer': ["Hammer", "", "Hammer", "Blunt", null],
  'kanabo': ["Kanabo", "", "Two-Handed Club", "Blunt", null],
};
/** The wiki's type for each of our classes. */
const WIKI_TYPE: Record<WeaponClass, string> = { pistol: 'Pistol', revolver: 'Revolver', smg: 'Submachine Gun', 'assault-rifle': 'Assault Rifle', 'precision-rifle': 'Precision Rifle', shotgun: 'Shotgun', 'double-barrel': 'Double-Barrel Shotgun', 'sniper-rifle': 'Sniper Rifle', lmg: 'Light Machine Gun', knife: 'Knife', katana: 'Katana', machete: 'Machete', axe: 'Axe', club: 'One-Handed Club', 'two-handed-club': 'Two-Handed Club', hammer: 'Hammer', chainsword: 'Chainsword' };
/** The wiki's melee technology for each of our kinds. */
const WIKI_MELEE = { blade: 'Blade', blunt: 'Blunt', thrown: 'Thrown' } as const;

describe('the weapons', () => {
  it('are each exactly as the wiki has them: name, maker, type, Power, Tech or Smart, and magazine', () => {
    expect(Object.keys(ARMS.weapons).sort()).toEqual(Object.keys(CANON).sort());
    for (const [id, weapon] of Object.entries(ARMS.weapons)) {
      const [name, maker, type, tech, magazine] = CANON[id] as [string, string, string, string, number | null];
      expect(weapon.name, id).toBe(name);
      expect(weapon.maker ?? '', id).toBe(maker);
      expect(WIKI_TYPE[weapon.class], id).toBe(type);
      const cut = ARMS.classes[weapon.class]?.cut;
      expect(cut ? WIKI_MELEE[cut] : weapon.tech, id).toBe(tech);
      expect(weapon.magazine ?? null, id).toBe(magazine);
    }
    expect(MELEE_LABEL.thrown).toBe('Throwable');
  });

  it('are on a rack only where the wiki has a vendor selling them', () => {
    // No vendor sells these: enemy drops, or (the Kolac) not to be had at all.
    const unsold = Object.entries(ARMS.weapons).filter(([, w]) => w.sold === false).map(([id]) => id).sort();
    expect(unsold).toEqual(['crowbar', 'kolac', 'kukri', 'machete', 'steel-pipe', 'tire-iron']);
    // Dogtown's guns are sold only there, and the Senkoh LX only downtown.
    expect(Object.entries(ARMS.weapons).filter(([, w]) => w.where?.includes('pacifica')).map(([id]) => id).sort()).toEqual(['grit', 'metel', 'razor', 'ticon', 'warden']);
    expect(ARMS.weapons.senkoh?.where).toEqual(['city_center']);
    for (const district of ['watson', 'pacifica', 'city_center', 'heywood']) {
      for (const quality of ['poverty', 'everyday', 'luxury'] as const) {
        for (let n = 0; n < 6; n++) {
          for (const id of stockFor('seed', `b${n}`, district, quality, { guns: 40, melee: 40, up: true }, ARMS)) {
            const weapon = ARMS.weapons[id];
            expect(weapon?.sold, id).not.toBe(false);
            if (weapon?.where) expect(weapon.where, `${id} in ${district}`).toContain(district);
          }
        }
      }
    }
    expect(stockFor('seed', 'b1', 'pacifica', 'everyday', { guns: 40 }, ARMS)).toContain('warden');
    expect(stockFor('seed', 'b1', 'watson', 'everyday', { guns: 40 }, ARMS)).not.toContain('warden');
  });

  it('are the wiki\'s, each with a class that exists, and every gun a magazine and a round it takes', () => {
    const names = new Set<string>();
    for (const [id, weapon] of Object.entries(ARMS.weapons)) {
      expect(ARMS.classes[weapon.class], id).toBeDefined();
      expect(weapon.price, id).toBeGreaterThan(0);
      expect(['luxury', 'everyday', 'poverty']).toContain(weapon.quality);
      expect(weapon.note.length, id).toBeGreaterThan(10);
      expect(names.has(weapon.name), id).toBe(false);
      names.add(weapon.name);
      if (isGun(weapon, ARMS)) {
        expect(weapon.magazine, id).toBeGreaterThan(0);
        expect(ARMS.ammo[ARMS.classes[weapon.class]!.ammo!], id).toBeDefined();
        expect(weapon.maker, id).toBeTruthy();
        expect(['Power', 'Tech', 'Smart']).toContain(weapon.tech);
      } else {
        expect(weapon.magazine, id).toBeUndefined();
        expect(ARMS.classes[weapon.class]?.cut, id).toBeDefined();
      }
    }
    // Iconic weapons are one of a kind in the game: none of them is on a rack.
    for (const iconic of ['Apparition', 'Order', 'Malorian Arms 3516', 'Skippy', 'Satori', 'Overwatch', 'Comrade\'s Hammer', 'Kongou', 'La Chingona Dorada', 'Divided We Stand']) expect(names.has(iconic), iconic).toBe(false);
  });

  it('take the wiki\'s four kinds of ammo, each box a slot', () => {
    expect(Object.values(ARMS.ammo).map((a) => a.name).sort()).toEqual(['Handgun Ammo', 'Heavy Ammo', 'Shotgun Ammo', 'Sniper Ammo']);
    for (const [id, ammo] of Object.entries(ARMS.ammo)) {
      expect(stackSlots({ id, kind: 'ammo' }, ammo.box, GEAR), id).toBe(1);
      expect(stackSlots({ id, kind: 'ammo' }, ammo.box + 1, GEAR), id).toBe(2);
      expect(itemGrams({ id, kind: 'ammo' }, GEAR, dishes), id).toBe(ammo.grams);
    }
  });

  it('stock a store from its tier, the same for the same store and not for another', () => {
    const everyday = stockFor('seed', 'b1', 'watson', 'everyday', { guns: 8 }, ARMS);
    expect(everyday).toHaveLength(8);
    expect(stockFor('seed', 'b1', 'watson', 'everyday', { guns: 8 }, ARMS)).toEqual(everyday);
    expect(stockFor('seed', 'b2', 'watson', 'everyday', { guns: 8 }, ARMS)).not.toEqual(everyday);
    for (const id of everyday) expect(ARMS.tiers.everyday).toContain(ARMS.weapons[id]?.quality);
    for (const id of stockFor('seed', 'b1', 'watson', 'luxury', { guns: 8 }, ARMS)) expect(ARMS.tiers.luxury).toContain(ARMS.weapons[id]?.quality);
    // A gunsmith reaches a tier up; a blade shop has no guns, and a gun shop no blades.
    const up = stockFor('seed', 'b1', 'watson', 'everyday', { guns: 40, up: true }, ARMS);
    expect(up.some((id) => ARMS.weapons[id]?.quality === 'luxury')).toBe(true);
    expect(stockFor('seed', 'b1', 'watson', 'poverty', { melee: 7 }, ARMS).every((id) => !isGun(ARMS.weapons[id]!, ARMS))).toBe(true);
    expect(everyday.every((id) => isGun(ARMS.weapons[id]!, ARMS))).toBe(true);
    // Listed by class, then price.
    const order = Object.keys(ARMS.classes);
    const ranks = everyday.map((id) => order.indexOf(ARMS.weapons[id]!.class));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe('carrying weapons', () => {
  const pockets: PocketState[] = [
    { id: 'jacket', kind: 'jacket', in: null },
    { id: 'pants', kind: 'pants', in: null },
    { id: 'wallet', kind: 'wallet', in: 'pants' },
  ];
  const pistol = { id: 'lexington-1', kind: 'weapon' as const, weapon: 'lexington' };
  const rifle = { id: 'ajax-1', kind: 'weapon' as const, weapon: 'ajax' };
  const katana = { id: 'katana-1', kind: 'weapon' as const, weapon: 'katana' };

  it('weighs a gun with the rounds in it', () => {
    const lex = ARMS.weapons.lexington!;
    expect(itemGrams(pistol, GEAR, dishes)).toBe(weaponGrams(lex, ARMS));
    expect(itemGrams({ ...pistol, loaded: 20 }, GEAR, dishes)).toBe(weaponGrams(lex, ARMS) + 20 * ARMS.ammo['handgun-ammo']!.grams);
  });

  it('puts a pistol in a pocket, and a rifle or a katana only in a bag that takes something long', () => {
    expect(isLong(pistol, ARMS)).toBe(false);
    expect(isLong(rifle, ARMS)).toBe(true);
    expect(isLong(katana, ARMS)).toBe(true);
    expect(placeFor(pockets, [], none, pistol, 1, GEAR, dishes)).toBe('jacket');
    expect(placeFor(pockets, [], none, rifle, 1, GEAR, dishes)).toBeNull();
    expect(placeFor(pockets, [], none, katana, 1, GEAR, dishes)).toBeNull();
    const pouch = [...pockets, { id: 'belt-pouch-1', kind: 'belt-pouch', in: null }];
    expect(placeFor(pouch, [], none, rifle, 1, GEAR, dishes)).toBeNull();
    const bag = [...pockets, { id: 'backpack-1', kind: 'backpack', in: null }];
    expect(placeFor(bag, [], none, rifle, 1, GEAR, dishes)).toBe('backpack-1');
    expect(placeFor(bag, [], none, katana, 1, GEAR, dishes)).toBe('backpack-1');
    // An LMG is too heavy for a backpack, but not for a duffel.
    const lmg = { id: 'defender-1', kind: 'weapon' as const, weapon: 'defender' };
    expect(placeFor(bag, [], none, lmg, 1, GEAR, dishes)).toBeNull();
    expect(placeFor([...pockets, { id: 'duffel-bag-1', kind: 'duffel-bag', in: null }], [], none, lmg, 1, GEAR, dishes)).toBe('duffel-bag-1');
  });

  it('keeps a holster for a weapon, and a gun case for guns and their rounds', () => {
    const holster: PocketState = { id: 'holster-1', kind: 'holster', in: null };
    const taco = { id: 'taco', kind: 'consumable' as const };
    expect(fits(holster, [holster], [], none, pistol, 1, GEAR, dishes)).toBe(true);
    expect(fits(holster, [holster], [], none, taco, 1, GEAR, dishes)).toBe(false);
    expect(fits(holster, [holster], [], none, { id: 'handgun-ammo', kind: 'ammo' }, 50, GEAR, dishes)).toBe(false);
    expect(fits(holster, [holster], [], none, rifle, 1, GEAR, dishes)).toBe(false);
    const gunCase: PocketState = { id: 'gun-case-1', kind: 'gun-case', in: null };
    expect(fits(gunCase, [gunCase], [], none, rifle, 1, GEAR, dishes)).toBe(true);
    expect(fits(gunCase, [gunCase], [], none, { id: 'heavy-ammo', kind: 'ammo' }, 60, GEAR, dishes)).toBe(true);
    expect(fits(gunCase, [gunCase], [], none, taco, 1, GEAR, dishes)).toBe(false);
  });

  it('draws a loaded gun before an empty one, and any gun before a blade', () => {
    const items: Item[] = [
      { id: 'katana-1', kind: 'weapon', weapon: 'katana', name: 'Katana', count: 1, in: 'bag' },
      { id: 'kenshin-1', kind: 'weapon', weapon: 'kenshin', name: 'JKE-X2 Kenshin', count: 1, in: 'jacket', loaded: 0 },
      { id: 'unity-1', kind: 'weapon', weapon: 'unity', name: 'Unity', count: 1, in: 'jacket', loaded: 3 },
    ];
    expect(drawWeapon(items, ARMS)?.item.id).toBe('unity-1');
    expect(drawWeapon(items.slice(0, 2), ARMS)?.item.id).toBe('kenshin-1');
    expect(drawWeapon(items.slice(0, 1), ARMS)).toMatchObject({ gun: false });
    expect(drawWeapon([], ARMS)).toBeNull();
  });
});
