import type { Valuable } from '../engine/trade';

/**
 * Valuables: what people carry that's worth taking off them, and only a fence will buy. The
 * names are the wiki's 2077 junk and jewellery (its "Cyberpunk 2077 Junk" list, by the sets
 * the game draws them from: a gang's own, a casino's, a corporation's, the street's, the rich
 * and the poor); the notes, the prices and the weights are ours. The wiki's junk sells for next
 * to nothing and its jewellery for real money, and so here.
 */
export const VALUABLES: Record<string, Valuable> = {
  // A gang's own.
  'broken-metal-fangs': { name: 'Broken Metal Fangs', note: 'Steel caps snapped off someone\'s teeth in a fight.', price: 4, grams: 30, gangs: ['animals'] },
  'grappling-gloves': { name: 'Grappling Gloves', note: 'Open-fingered gloves for holding on and choking out.', price: 9, grams: 180, gangs: ['animals'] },
  'jaguar-patch': { name: 'Jaguar Patch', note: 'An Animals patch, ripped off a jacket.', price: 5, grams: 15, gangs: ['animals'] },
  'syn-fang-necklace': { name: 'Syn-fang Necklace', note: 'A string of synthetic fangs, Animals style.', price: 120, grams: 60, jewellery: true, gangs: ['animals'] },
  'studded-choker': { name: 'Studded Choker', note: 'A studded collar, worn on the street rather than a leash.', price: 90, grams: 70, jewellery: true, gangs: ['animals'] },
  'subdermal-led-diodes': { name: 'Subdermal LED Diodes', note: 'A strip of red diodes, the kind Maelstrom wear under the skin.', price: 12, grams: 20, gangs: ['maelstrom'] },
  'soldering-iron': { name: 'Soldering Iron', note: 'A techie\'s iron, tip burned black.', price: 10, grams: 250, gangs: ['maelstrom'] },
  'broken-eye-implant': { name: 'Broken Eye Implant', note: 'An optic, dead, its wires hanging out.', price: 14, grams: 40, gangs: ['maelstrom'] },
  'fluorescent-lipstick': { name: 'Fluorescent Lipstick', note: 'A tube of glowing pink, a Mox favorite.', price: 6, grams: 20, gangs: ['mox'] },
  'torn-fishnets': { name: 'Torn Fishnets', note: 'Ripped fishnets, worn till they gave out.', price: 3, grams: 60, gangs: ['mox'] },
  'dull-scalpel': { name: 'Dull Scalpel', note: 'A scalpel that has opened too many people.', price: 8, grams: 30, gangs: ['scavengers'] },
  handcuffs: { name: 'Handcuffs', note: 'Steel cuffs, the key long gone.', price: 11, grams: 300, gangs: ['scavengers'] },
  'used-airhypo': { name: 'Used Airhypo', note: 'A spent hypo. Best not to ask.', price: 4, grams: 50, gangs: ['scavengers'] },
  'nusa-pin': { name: 'NUSA Pin', note: 'A lapel pin of the New United States flag.', price: 7, grams: 10, gangs: ['sixth_street'] },
  'shortwave-transmitter': { name: 'Shortwave Transmitter', note: 'An old shortwave set, still crackling.', price: 15, grams: 400, gangs: ['sixth_street'] },
  'military-canteen': { name: 'Military Canteen', note: 'A camo canteen, more costume than kit.', price: 6, grams: 350, gangs: ['sixth_street'] },
  omamori: { name: 'Omamori', note: 'A silk charm bag for luck and protection.', price: 8, grams: 15, gangs: ['tyger_claws'] },
  'hanafuda-cards': { name: 'Hanafuda Cards', note: 'A deck of Japanese flower cards.', price: 9, grams: 60, gangs: ['tyger_claws'] },
  'silver-wrap-earrings': { name: 'Silver Wrap Earrings', note: 'Silver wrapped round the ear, Tyger Claws style.', price: 150, grams: 15, jewellery: true, gangs: ['tyger_claws'] },
  'yin-yang-medallion': { name: 'Yin Yang Medallion', note: 'A heavy medallion on a chain.', price: 130, grams: 80, jewellery: true, gangs: ['tyger_claws'] },
  'kanji-pendant': { name: 'Kanji Pendant', note: 'A pendant with a single kanji for luck.', price: 110, grams: 40, jewellery: true, gangs: ['tyger_claws'] },
  'hair-gel': { name: 'Hair Gel', note: 'A tub of gel for a slicked-back look.', price: 4, grams: 120, gangs: ['valentinos'] },
  calavera: { name: 'Calavera', note: 'A painted sugar skull for the Day of the Dead.', price: 10, grams: 200, gangs: ['valentinos'] },
  'decorative-spoon': { name: 'Decorative Spoon', note: 'A ceramic spoon, hand-painted.', price: 7, grams: 60, gangs: ['valentinos'] },
  'santa-muerte-brooch': { name: 'Santa Muerte Brooch', note: 'A brooch of the saint of death.', price: 140, grams: 30, jewellery: true, gangs: ['valentinos'] },
  'skull-ring': { name: 'Skull Ring', note: 'A heavy silver skull for a finger.', price: 120, grams: 25, jewellery: true, gangs: ['valentinos'] },
  'gold-cross': { name: 'Gold Cross', note: 'A gold cross on a fine chain.', price: 220, grams: 20, jewellery: true, gangs: ['valentinos'] },
  'shard-with-loa-symbols': { name: 'Shard with Loa symbols', note: 'A data shard scratched with loa signs.', price: 18, grams: 10, gangs: ['voodoo_boys'] },
  'luminescent-chalk': { name: 'Luminescent Chalk', note: 'Chalk that glows, for drawing veves.', price: 5, grams: 80, gangs: ['voodoo_boys'] },
  'tire-iron': { name: 'Tire Iron', note: 'A tire iron, good for tires and worse.', price: 8, grams: 900, gangs: ['wraiths'] },
  'turquoise-hair-dye': { name: 'Turquoise Hair Dye', note: 'A bottle of dye, somewhere between blue and green.', price: 5, grams: 150, gangs: ['wraiths'] },
  'military-pocket-knife': { name: 'Military Pocket Knife', note: 'A folding knife with a light and an opener.', price: 16, grams: 120, gangs: ['barghest'], walks: ['gang', 'guard'] },
  'digital-compass': { name: 'Digital Compass', note: 'A lit-up military compass.', price: 14, grams: 90, gangs: ['barghest'], walks: ['gang', 'guard'] },
  // Any gang.
  'golden-chain': { name: 'Golden Chain', note: 'A thick gold chain, mostly for show.', price: 45, grams: 90, walks: ['gang'] },
  'tattoo-needle': { name: 'Tattoo Needle', note: 'A homemade tattoo needle, well used.', price: 5, grams: 20, walks: ['gang'] },
  'counterfeit-documents': { name: 'Counterfeit Documents', note: 'Forged papers, good enough for a quick look.', price: 25, grams: 30, walks: ['gang'] },
  'bloody-knife': { name: 'Bloody Knife', note: 'A knife nobody cleaned after.', price: 6, grams: 150, walks: ['gang'] },
  // Guards: Militech's.
  'thigh-holster': { name: 'Thigh Holster', note: 'A tactical thigh holster, empty.', price: 18, grams: 300, walks: ['guard'] },
  // Corporations.
  'stress-ball': { name: 'Stress Ball', note: 'A squeezable ball from some office.', price: 2, grams: 40, walks: ['corpo'] },
  stapler: { name: 'Stapler', note: 'A desk stapler.', price: 3, grams: 250, walks: ['corpo'] },
  nda: { name: 'NDA', note: 'A signed non-disclosure agreement.', price: 4, grams: 20, walks: ['corpo'] },
  'drip-coffee-maker': { name: 'Drip Coffee Maker', note: 'A compact drip coffee maker.', price: 15, grams: 900, walks: ['corpo'] },
  'silver-watch': { name: 'Silver Watch', note: 'A silver wristwatch, real hands and all.', price: 350, grams: 90, jewellery: true, walks: ['corpo'], means: ['luxury', 'everyday'] },
  'titanium-ring': { name: 'Titanium Ring', note: 'A plain titanium band that cost a fortune.', price: 300, grams: 10, jewellery: true, means: ['luxury'] },
  // The rich.
  cufflinks: { name: 'Cufflinks', note: 'A pair of engraved cufflinks.', price: 40, grams: 20, means: ['luxury'] },
  'ncu-signet-ring': { name: 'NCU Signet Ring', note: 'A Night City University signet ring.', price: 180, grams: 15, jewellery: true, means: ['luxury'] },
  cigar: { name: 'Cigar', note: 'A hand-rolled cigar in its tube.', price: 20, grams: 25, means: ['luxury'] },
  'cashmere-wool': { name: 'Cashmere Wool', note: 'A skein of synthetic cashmere.', price: 30, grams: 200, means: ['luxury'] },
  'crystal-decanter': { name: 'Crystal Decanter', note: 'A cut-crystal decanter.', price: 45, grams: 1100, means: ['luxury'] },
  'raven-skull-pendant': { name: 'Raven Skull Pendant', note: 'A pendant cast from a raven\'s skull.', price: 260, grams: 30, jewellery: true, means: ['luxury'] },
  'shell-ring': { name: 'Shell Ring', note: 'A ring cut from real shell.', price: 160, grams: 10, jewellery: true, means: ['luxury', 'everyday'] },
  // The poor.
  disinfectant: { name: 'Disinfectant', note: 'A small bottle of disinfectant.', price: 2, grams: 200, means: ['poverty'] },
  'damaged-poker-chip': { name: 'Damaged Poker Chip', note: 'A cracked chip from a casino floor.', price: 2, grams: 10, means: ['poverty'] },
  'lottery-scratchcard': { name: 'Lottery Scratchcard', note: 'A scratched card. Another loser.', price: 1, grams: 5, means: ['poverty'] },
  'glow-stick': { name: 'Glow Stick', note: 'A glow stick from some rave.', price: 1, grams: 20, means: ['poverty'] },
  'bullet-pendant': { name: 'Bullet Pendant', note: 'A spent round on a cord.', price: 55, grams: 20, jewellery: true, means: ['poverty', 'everyday'] },
  'cable-necklace': { name: 'Cable Necklace', note: 'A necklace twisted out of cable.', price: 50, grams: 30, jewellery: true, means: ['poverty'] },
  'pcb-earrings': { name: 'PCB Earrings', note: 'Earrings cut from circuit boards.', price: 60, grams: 10, jewellery: true, means: ['poverty', 'everyday'] },
  // Anyone.
  'vinyl-record': { name: 'Vinyl Record', note: 'A real vinyl record in its sleeve.', price: 12, grams: 250 },
  'guitar-pick': { name: 'Guitar Pick', note: 'A plastic pick, chewed at the edge.', price: 1, grams: 2 },
  rosary: { name: 'Rosary', note: 'A rosary, the beads rubbed smooth.', price: 8, grams: 40, walks: ['elder', 'street'] },
  'spray-paint': { name: 'Spray Paint', note: 'A can of paint, half used.', price: 3, grams: 350 },
  perfume: { name: 'Perfume', note: 'A small bottle of perfume.', price: 14, grams: 120 },
  'pack-of-cigarettes': { name: 'Pack of Cigarettes', note: 'A pack, a few left.', price: 3, grams: 30 },
  lighter: { name: 'Lighter', note: 'A refillable lighter.', price: 4, grams: 50 },
  'pack-of-cards': { name: 'Pack of Cards', note: 'A deck a few cards short.', price: 2, grams: 80 },
  'dog-tag': { name: 'Dog Tag', note: 'A military dog tag on a chain.', price: 70, grams: 20, jewellery: true },
  'brass-earrings': { name: 'Brass Earrings', note: 'Brass, easy to take for gold.', price: 65, grams: 10, jewellery: true },
  'led-bracelets': { name: 'LED Bracelets', note: 'A stack of flashing bracelets.', price: 60, grams: 40, jewellery: true },
  pipe: { name: 'Pipe', note: 'A carved smoking pipe.', price: 9, grams: 60, walks: ['elder'] },
  'hand-fan': { name: 'Hand Fan', note: 'A folding paper fan.', price: 5, grams: 50, walks: ['elder'] },
  'postcard-from-night-city': { name: 'Postcard from Night City', note: 'A tourist\'s postcard of the skyline.', price: 1, grams: 5 },
};
