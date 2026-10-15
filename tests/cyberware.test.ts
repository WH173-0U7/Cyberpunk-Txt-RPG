import { describe, expect, it } from 'vitest';
import { capacityUsed, chromeStatus, chromeStockFor, fitCheck, implantDetail, type BodyPart, type ImplantKind } from '../src/engine/cyberware';
import { itemGrams, placeFor, type PocketState } from '../src/engine/carry';
import { CHROME } from '../src/data/cyberware';
import { FOOD } from '../src/data/food';
import { GEAR } from '../src/data/gear';

/**
 * Each implant as its page on the Cyberpunk Wiki has it (checked 2026-10-15, through the
 * MediaWiki API): the infobox's title (a cyberdeck's with its range of marks, sold here as its
 * first), manufacturer, type (the part of the body, or the kind of operating system), capacity
 * and the tier it's first sold at. An implant added to the game is added here from its own
 * page; one that disagrees with it fails.
 */
const CANON: Record<string, [string, string, string, number, number]> = {
  "bioconductor": ["Bioconductor", "", "Frontal Cortex", 16, 1],
  "camillo-ram-manager": ["Camillo RAM Manager", "", "Frontal Cortex", 8, 4],
  "ex-disk": ["Ex-Disk", "", "Frontal Cortex", 10, 3],
  "kerenzikov-boost-system": ["Kerenzikov Boost System", "Militech", "Frontal Cortex", 3, 3],
  "mechatronic-core": ["Mechatronic Core", "", "Frontal Cortex", 5, 1],
  "memory-boost": ["Memory Boost", "", "Frontal Cortex", 18, 2],
  "ram-upgrade": ["RAM Upgrade", "Militech", "Frontal Cortex", 8, 1],
  "self-ice": ["Self-ICE", "Rostovi\u0107", "Frontal Cortex", 5, 3],
  "paraline": ["Paraline Mk.1-5", "Militech", "Cyberdeck", 14, 1],
  "arasaka-shadow": ["Arasaka Mk.1-5", "Arasaka", "Cyberdeck", 14, 1],
  "rippler": ["Rippler Mk.1-4", "Tetratronic", "Cyberdeck", 16, 1],
  "biotech-sigma": ["Biotech \u03a3 Mk.1-4", "Biotech \u03a3", "Cyberdeck", 16, 2],
  "raven-microcyber": ["Raven Microcyber Mk.1-3", "Raven Microcybernetics", "Cyberdeck", 20, 3],
  "dynalar-sandevistan": ["Dynalar Sandevistan", "Dynalar", "Sandevistan", 18, 2],
  "warp-dancer": ["Warp Dancer", "QianT", "Sandevistan", 14, 3],
  "zetatech-sandevistan": ["Zetatech Sandevistan", "Zetatech", "Sandevistan", 20, 2],
  "biodyne-berserk": ["BioDyne Berserk", "BioDyne", "Berserk", 20, 2],
  "moore-tech-berserk": ["Moore Tech Berserk", "MoorE Technologies", "Berserk", 12, 2],
  "zetatech-berserk": ["Zetatech Berserk", "Zetatech", "Berserk", 16, 3],
  "gorilla-arms": ["Gorilla Arms", "Arasaka", "Arms", 8, 2],
  "electrifying-gorilla-arms": ["Electrifying Gorilla Arms", "Arasaka", "Arms", 8, 2],
  "thermal-gorilla-arms": ["Thermal Gorilla Arms", "Arasaka", "Arms", 8, 2],
  "toxic-gorilla-arms": ["Toxic Gorilla Arms", "Arasaka", "Arms", 8, 2],
  "mantis-blades": ["Mantis Blades", "Arasaka", "Arms", 8, 2],
  "electrifying-mantis-blades": ["Electrifying Mantis Blades", "", "Arms", 8, 2],
  "thermal-mantis-blades": ["Thermal Mantis Blades", "", "Arms", 8, 2],
  "toxic-mantis-blades": ["Toxic Mantis Blades", "", "Arms", 8, 2],
  "maxtac-mantis-blades": ["MaxTac Mantis Blades", "MaxTac", "Arms", 8, 4],
  "monowire": ["Monowire", "", "Arms", 8, 2],
  "electrifying-monowire": ["Electrifying Monowire", "", "Arms", 8, 2],
  "thermal-monowire": ["Thermal Monowire", "", "Arms", 8, 2],
  "toxic-monowire": ["Toxic Monowire", "", "Arms", 8, 2],
  "projectile-launch-system": ["Projectile Launch System", "Arasaka", "Arms", 8, 2],
  "electrifying-projectile-launch-system": ["Electrifying Projectile Launch System", "", "Arms", 8, 2],
  "thermal-projectile-launch-system": ["Thermal Projectile Launch System", "", "Arms", 8, 2],
  "toxic-projectile-launch-system": ["Toxic Projectile Launch System", "", "Arms", 8, 2],
  "basic-kiroshi-optics": ["Basic Kiroshi Optics", "Kiroshi", "Face", 1, 1],
  "clairvoyant": ["Clairvoyant", "Kiroshi", "Face", 8, 3],
  "doomsayer": ["Doomsayer", "Kiroshi & Militech", "Face", 2, 1],
  "sentry": ["Sentry", "Kiroshi & Militech", "Face", 2, 1],
  "stalker": ["Stalker", "Kiroshi", "Face", 2, 1],
  "the-oracle": ["The Oracle", "Kiroshi", "Face", 10, 4],
  "ballistic-coprocessor": ["Ballistic Coprocessor", "", "Hands", 2, 1],
  "handle-wrap": ["Handle Wrap", "", "Hands", 8, 3],
  "microgenerator": ["Microgenerator", "", "Hands", 9, 2],
  "shock-absorber": ["Shock Absorber", "Militech", "Hands", 12, 1],
  "smart-link": ["Smart Link", "", "Hands", 4, 1],
  "bionic-joints": ["Bionic Joints", "MoorE Technologies", "Skeleton", 8, 1],
  "dense-marrow": ["Dense Marrow", "", "Skeleton", 16, 2],
  "epimorphic-skeleton": ["Epimorphic Skeleton", "", "Skeleton", 40, 4],
  "feen-x": ["Feen-X", "", "Skeleton", 16, 1],
  "kinetic-frame": ["Kinetic Frame", "", "Skeleton", 16, 1],
  "para-bellum": ["Para Bellum", "", "Skeleton", 25, 3],
  "ram-recoup": ["RAM Recoup", "Kang Tao", "Skeleton", 14, 1],
  "scar-coalescer": ["Scar Coalescer", "Kang Tao", "Skeleton", 20, 1],
  "scarab": ["Scarab", "", "Skeleton", 14, 1],
  "spring-joints": ["Spring Joints", "", "Skeleton", 16, 2],
  "titanium-bones": ["Titanium Bones", "", "Skeleton", 6, 1],
  "universal-booster": ["Universal Booster", "", "Skeleton", 25, 3],
  "adrenaline-converter": ["Adrenaline Converter", "", "Nervous System", 6, 1],
  "atomic-sensors": ["Atomic Sensors", "Kang Tao", "Nervous System", 5, 1],
  "kerenzikov": ["Kerenzikov", "", "Nervous System", 12, 2],
  "neofiber": ["NeoFiber", "Kang Tao", "Nervous System", 14, 3],
  "reflex-tuner": ["Reflex Tuner", "", "Nervous System", 5, 1],
  "stabber": ["Stabber", "Tsunami", "Nervous System", 12, 2],
  "synaptic-accelerator": ["Synaptic Accelerator", "", "Nervous System", 5, 2],
  "tyrosine-injector": ["Tyrosine Injector", "", "Nervous System", 8, 1],
  "visual-cortex-support": ["Visual Cortex Support", "", "Nervous System", 20, 1],
  "adrenaline-booster": ["Adrenaline Booster", "BioDyne Systems", "Circulatory System", 14, 1],
  "biomonitor": ["Biomonitor", "", "Circulatory System", 14, 1],
  "black-mamba": ["Black Mamba", "", "Circulatory System", 16, 3],
  "blood-pump": ["Blood Pump", "", "Circulatory System", 15, 2],
  "clutch-padding": ["Clutch Padding", "", "Circulatory System", 12, 1],
  "feedback-circuit": ["Feedback Circuit", "", "Circulatory System", 14, 3],
  "heal-on-kill": ["Heal-On-Kill", "", "Circulatory System", 10, 1],
  "microrotors": ["Microrotors", "", "Circulatory System", 12, 1],
  "second-heart": ["Second Heart", "", "Circulatory System", 30, 4],
  "threatevac": ["ThreatEvac", "", "Circulatory System", 5, 1],
  "carapace": ["Carapace", "", "Integumentary System", 16, 2],
  "cellular-adapter": ["Cellular Adapter", "", "Integumentary System", 10, 2],
  "cogito-lattice": ["Cogito Lattice", "", "Integumentary System", 12, 1],
  "countershell": ["Countershell", "", "Integumentary System", 12, 1],
  "defenzikov": ["Defenzikov", "", "Integumentary System", 20, 3],
  "nano-plating": ["Nano-plating", "Kang Tao", "Integumentary System", 20, 2],
  "optical-camo": ["Optical Camo", "Kang Tao", "Integumentary System", 20, 2],
  "pain-editor": ["Pain Editor", "", "Integumentary System", 35, 4],
  "painducer": ["Painducer", "", "Integumentary System", 30, 4],
  "proxishield": ["ProxiShield", "", "Integumentary System", 10, 1],
  "rangeguard": ["RangeGuard", "", "Integumentary System", 14, 1],
  "shock-n-awe": ["Shock-n-Awe", "", "Integumentary System", 25, 1],
  "subdermal-armor": ["Subdermal Armor", "", "Integumentary System", 5, 1],
  "fortified-ankles": ["Fortified Ankles", "Zetatech", "Legs", 6, 1],
  "jenkins-tendons": ["Jenkins' Tendons", "", "Legs", 6, 2],
  "lynx-paws": ["Lynx Paws", "", "Legs", 5, 2],
  "reinforced-tendons": ["Reinforced Tendons", "Tsunami", "Legs", 8, 2],
};
/** The wiki's type for each part of the body; an operating system goes by its kind. */
const WIKI_TYPE: Record<BodyPart, string> = {
  'frontal-cortex': 'Frontal Cortex',
  'operating-system': 'Operating System',
  arms: 'Arms',
  face: 'Face',
  skeleton: 'Skeleton',
  hands: 'Hands',
  'nervous-system': 'Nervous System',
  'circulatory-system': 'Circulatory System',
  'integumentary-system': 'Integumentary System',
  legs: 'Legs',
};
const implants = Object.entries(CHROME.implants);

describe('the cyberware', () => {
  it('is each exactly as the wiki has it: name, maker, part of the body, capacity and tier', () => {
    expect(Object.keys(CHROME.implants).sort()).toEqual(Object.keys(CANON).sort());
    for (const [id, implant] of implants) {
      const [title, maker, type, capacity, tier] = CANON[id]!;
      expect(implant.name, id).toBe(title.replace(/ Mk\.1-\d$/, ' Mk.1'));
      expect(implant.maker ?? '', id).toBe(maker);
      expect(implant.system ? CHROME.systems[implant.system] : WIKI_TYPE[implant.part], id).toBe(type);
      expect(implant.capacity, id).toBe(capacity);
      expect(implant.tier, id).toBe(tier);
    }
  });

  it("has the wiki's ten parts of the body with its slots, an operating system for every deck, Sandevistan and Berserk", () => {
    expect(Object.values(CHROME.parts).map((p) => `${p.label} ${p.slots}`)).toEqual(['Frontal Cortex 3', 'Operating System 1', 'Arms 1', 'Face 1', 'Skeleton 2', 'Hands 1', 'Nervous System 3', 'Circulatory System 3', 'Integumentary System 3', 'Legs 1']);
    for (const [id, implant] of implants) {
      expect(Boolean(implant.system), id).toBe(implant.part === 'operating-system');
      expect(implant.price, id).toBeGreaterThan(0);
      expect(implant.note.length, id).toBeGreaterThan(10);
      expect(implant.quality, id).toBe(({ 1: 'poverty', 2: 'everyday', 3: 'luxury', 4: 'luxury', 5: 'luxury' } as const)[implant.tier]);
    }
    expect(new Set(implants.map(([, i]) => i.name)).size).toBe(implants.length);
    // Iconic chrome is one of a kind, and the quest tattoos are V's: none of it is here.
    const names = new Set(implants.map(([, i]) => i.name));
    for (const iconic of ['Apogee', 'Falcon', 'Canto Mk.6', 'Netdriver Mk.1', 'Militech Berserk', 'Axolotl', 'Chitin', 'Cockatrice', 'Chrome Compressor', "Tattoo: Johnny's Special"]) expect(names.has(iconic), iconic).toBe(false);
    expect(implants.filter(([, i]) => i.sold === false).map(([id]) => id)).toEqual(['maxtac-mantis-blades']);
    expect(implantDetail(CHROME.implants.paraline!, CHROME)).toBe('Cyberdeck · Militech · 14 capacity');
  });

  it('stocks a rack from its tier, a spread of the body, the same for the same store and never what nobody sells', () => {
    const doc = CHROME.stores.ripperdoc!;
    const rack = chromeStockFor('seed', 'b1', 'everyday', doc, CHROME);
    expect(rack).toHaveLength(doc.count);
    expect(chromeStockFor('seed', 'b1', 'everyday', doc, CHROME)).toEqual(rack);
    expect(chromeStockFor('seed', 'b2', 'everyday', doc, CHROME)).not.toEqual(rack);
    const order = Object.keys(CHROME.parts);
    const ranks = rack.map((id) => order.indexOf(CHROME.implants[id]!.part));
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    for (const quality of ['poverty', 'everyday', 'luxury'] as const) {
      for (let n = 0; n < 20; n++) {
        const ids = chromeStockFor('seed', `b${n}`, quality, doc, CHROME);
        const parts = new Map<string, number>();
        for (const id of ids) parts.set(CHROME.implants[id]!.part, (parts.get(CHROME.implants[id]!.part) ?? 0) + 1);
        expect(Math.max(...parts.values()), `${quality} b${n}`).toBeLessThanOrEqual(doc.perPart!);
        expect(ids).not.toContain('maxtac-mantis-blades');
        // A ripperdoc reaches a tier up; a secondhand one, never to luxury.
        if (quality === 'poverty') for (const id of ids) expect(CHROME.implants[id]!.quality, id).not.toBe('luxury');
      }
    }
    // An outlet stays at its own tier; a deck shop sells decks and the RAM for them.
    for (const id of chromeStockFor('seed', 'b1', 'poverty', CHROME.stores['cyberware-outlet']!, CHROME)) expect(CHROME.tiers.poverty).toContain(CHROME.implants[id]!.quality);
    for (const id of chromeStockFor('seed', 'b1', 'luxury', CHROME.stores['cyberdeck-shop']!, CHROME)) {
      const implant: ImplantKind = CHROME.implants[id]!;
      expect(implant.system === 'cyberdeck' || implant.part === 'frontal-cortex', id).toBe(true);
    }
  });
});

describe('fitting chrome', () => {
  it('fits an implant where there is a slot and the capacity, once', () => {
    expect(fitCheck([], 'mantis-blades', 50, CHROME)).toEqual({ ok: true, replaces: null });
    expect(fitCheck([{ id: 'mantis-blades', since: 1 }], 'mantis-blades', 50, CHROME)).toMatchObject({ ok: false, why: 'fitted' });
    expect(fitCheck([], 'epimorphic-skeleton', 30, CHROME)).toMatchObject({ ok: false, why: 'capacity', left: 30 });
    expect(fitCheck([], 'no-such-thing', 50, CHROME)).toMatchObject({ ok: false, why: 'unknown' });
  });

  it('takes the place of the implant fitted longest in a part with every slot taken, its capacity given back', () => {
    // Two skeleton slots: a third implant there swaps out the first in.
    const bones = [{ id: 'titanium-bones', since: 2 }, { id: 'bionic-joints', since: 1 }];
    expect(fitCheck(bones, 'scarab', 50, CHROME)).toEqual({ ok: true, replaces: 'bionic-joints' });
    // The arms' one slot, near the limit: the new arms fit in the old ones' room.
    expect(fitCheck([{ id: 'gorilla-arms', since: 1 }], 'mantis-blades', 8, CHROME)).toEqual({ ok: true, replaces: 'gorilla-arms' });
    expect(capacityUsed(bones, CHROME)).toBe(14);
    const status = chromeStatus([{ id: 'mantis-blades', since: 3 }, ...bones, { id: 'paraline', since: 4 }], 50, CHROME);
    expect(status.fitted.map((f) => `${f.label}: ${f.name}`)).toEqual(['Cyberdeck: Paraline Mk.1', 'Arms: Mantis Blades', 'Skeleton: Bionic Joints', 'Skeleton: Titanium Bones']);
    expect(status.used).toBe(14 + 8 + 14);
  });

  it('weighs an implant carried by the part it is for: a pair of arms wants a bag', () => {
    const arms = { id: 'gorilla-arms', kind: 'cyberware' as const };
    const optics = { id: 'basic-kiroshi-optics', kind: 'cyberware' as const };
    expect(itemGrams(arms, GEAR, FOOD.dishes)).toBe(CHROME.parts.arms.grams);
    expect(itemGrams(optics, GEAR, FOOD.dishes)).toBe(CHROME.parts.face.grams);
    const pockets: PocketState[] = [
      { id: 'jacket', kind: 'jacket', in: null },
      { id: 'pants', kind: 'pants', in: null },
      { id: 'wallet', kind: 'wallet', in: 'pants' },
    ];
    const none = { bills: 0, coins: 0 };
    expect(placeFor(pockets, [], none, optics, 1, GEAR, FOOD.dishes)).toBe('jacket');
    expect(placeFor(pockets, [], none, arms, 1, GEAR, FOOD.dishes)).toBeNull();
    expect(placeFor([...pockets, { id: 'backpack-1', kind: 'backpack', in: null }], [], none, arms, 1, GEAR, FOOD.dishes)).toBe('backpack-1');
  });
});
