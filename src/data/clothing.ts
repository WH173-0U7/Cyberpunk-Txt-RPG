import type { Quality } from '../engine/food';
import type { PocketKind, Slot, Style } from '../engine/carry';

/**
 * What there is to wear. Every garment is a real piece of 2077 clothing from the Cyberpunk
 * Wiki, named as the wiki names it, in the slot the wiki files it under (head, face, outer
 * torso, inner torso, legs, feet) and in one of the wiki's four styles (Entropism: necessity
 * over style; Kitsch: style over substance; Neomilitarism: substance over style; Neokitsch:
 * style and substance). Brands are the wiki's too (Arasaka and Kang Tao corporate wear,
 * Uniware's old-news office clothes, Sudo's corporate luxury, ICON America's leather, AT-AK's
 * sportswear the nomads favor, MaxiWear's cheap leisurewear, Saeko's casual wear, Darra
 * Polytechnic's sneakers, Spunky Monkey's kicks). The stores are the wiki's clothing vendors:
 * Jinguji's flagship downtown and Avante's designer stores in the money (both luxury
 * neokitsch), the Stylishly chain in the middle-class neighborhoods, Saeko's boardwalk store
 * in Japantown, the Ded-Zed store in Northside, the thrift-quality racks of Kabuki and the
 * used clothes of the Badlands, and the streetwear stands of Arroyo and West Wind Estate;
 * each sells what the wiki shows its vendor selling. The pockets, weights, prices and notes
 * are ours: a coat has deep pockets, a tank top none, pants take the loose change.
 */
export const SLOTS: Record<Slot, string> = { head: 'Head', face: 'Face', outer: 'Outer torso', inner: 'Inner torso', legs: 'Legs', feet: 'Feet' };
export const STYLES: Record<Style, string> = { entropism: 'Entropism', kitsch: 'Kitsch', neomilitarism: 'Neomilitarism', neokitsch: 'Neokitsch' };

/** Pockets a garment has: how many things and how much weight; `change` where loose coins go. */
type Pockets = { slots: number; maxGrams: number; change?: boolean };
const POCKETS: Record<string, Pockets> = {
  jacket: { slots: 4, maxGrams: 2000 },
  coat: { slots: 5, maxGrams: 3000 },
  blazer: { slots: 3, maxGrams: 1500 },
  vest: { slots: 2, maxGrams: 800 },
  dress: { slots: 1, maxGrams: 500 },
  pants: { slots: 3, maxGrams: 1500, change: true },
  cargo: { slots: 5, maxGrams: 2500, change: true },
  shorts: { slots: 2, maxGrams: 800, change: true },
  skirt: { slots: 1, maxGrams: 500, change: true },
};

function garment(name: string, slot: Slot, style: Style, quality: Quality, grams: number, price: number, note: string, pockets?: Pockets, brand?: string): PocketKind {
  return { name, slot, style, quality, grams, price, note, slots: pockets?.slots ?? 0, maxGrams: pockets?.maxGrams ?? 0, ...(pockets?.change ? { change: true } : {}), ...(brand ? { brand } : {}) };
}

export const GARMENTS: Record<string, PocketKind> = {
  // ── What a new player wears: thrift-rack clothes, the kind Kabuki's vendor sells.
  jacket: garment('Old duolayer jacket with buckles', 'outer', 'entropism', 'poverty', 1300, 18, 'Two layers of what was synleather once; the buckles still close. Four pockets.', POCKETS.jacket),
  tank: garment('Basic tank top', 'inner', 'kitsch', 'everyday', 150, 6, 'A tank top. It does what a tank top does.'),
  pants: garment('Worn cargo pants', 'legs', 'entropism', 'poverty', 700, 12, 'Cargo pockets gone soft at the corners. The loose change lives in the right one.', POCKETS.pants),
  'high-tops': garment('Worn aramid high-tops', 'feet', 'entropism', 'poverty', 800, 14, 'Aramid uppers scuffed grey; the soles still grip.'),

  // ── Jinguji: high-end suits and evening wear, neomilitarist and neokitsch, as its downtown flagship sells them.
  'arasaka-corporate-blazer': garment('Arasaka polycarbonate corporate blazer', 'outer', 'neomilitarism', 'luxury', 900, 520, 'Tower-cut, polycarbonate thread through the weave, the logo at the breast where a tie clip would sit.', POCKETS.blazer, 'Arasaka'),
  'marbre-dore-suit-jacket': garment('Marbre Doré suit jacket with discreet bulletproof lining', 'outer', 'neokitsch', 'luxury', 1100, 780, 'Gold-veined marble print over a lining that stops a pistol round. Discreetly, says the label.', POCKETS.blazer),
  'gatto-nero-evening-jacket': garment('Gatto Nero evening jacket with tungsten-steel microplates', 'outer', 'neokitsch', 'luxury', 1300, 850, 'Black on black, microplates between the layers. It goes to galas and comes back.', POCKETS.vest),
  'yunami-formal-jacket': garment('Yūnami formal hybrid duoweave jacket', 'outer', 'neokitsch', 'luxury', 1000, 640, 'Wave-patterned duoweave, cut long. Japantown money wears this to dinner.', POCKETS.blazer),
  'caret-cassico-blazer': garment('Elegant Caret Cassico blazer with nanotube stripes', 'outer', 'neokitsch', 'luxury', 950, 600, 'Pinstripes of nanotube that catch the light when you move.', POCKETS.blazer),
  'synthetic-corporate-jacket': garment('Synthetic corporate jacket', 'outer', 'neomilitarism', 'luxury', 900, 380, 'The plain one on the rack, which is still more than most people earn in a month.', POCKETS.blazer),
  'gin-no-hoshi-shirt-and-vest': garment('Gin no Hoshi neo-silk shirt and vest', 'outer', 'neokitsch', 'luxury', 600, 460, 'Silver-star neo-silk under a fitted vest. Two inside pockets, no outside ones.', POCKETS.vest),
  'reinforced-dress-shirt': garment('Reinforced breathable dress shirt', 'inner', 'neomilitarism', 'luxury', 250, 140, 'A dress shirt that breathes and will not tear. Starched by someone else.'),
  'classic-corporate-pants': garment('Classic immuno-cotton corporate pants', 'legs', 'neomilitarism', 'luxury', 600, 260, 'Immuno-cotton, creased to a line. The pockets were designed for a holo and a keycard.', POCKETS.pants),
  'royal-gray-dress-pants': garment('Royal Gray aramid-weave dress pants', 'legs', 'neokitsch', 'luxury', 650, 320, 'Aramid woven fine enough to pass for wool, in a grey that photographs well.', { slots: 2, maxGrams: 1200, change: true }),
  'demon-rhapsody-pencil-dress': garment('Demon Rhapsody reactive-layer pencil dress', 'outer', 'neokitsch', 'luxury', 700, 720, 'A pencil dress with a reactive layer that goes rigid when something hits it. One hidden pocket.', POCKETS.dress),
  'arasaka-cap-with-camera': garment('Arasaka cap with camera', 'head', 'neomilitarism', 'luxury', 120, 180, 'Corporate issue, with a camera over the brim that is always on.', undefined, 'Arasaka'),
  'arasaka-side-cap': garment('Carbon-fiber Arasaka side cap', 'head', 'neomilitarism', 'luxury', 90, 150, 'A carbon-fiber garrison cap with the logo. Worn by people who do not get asked for ID.', undefined, 'Arasaka'),
  'arasaka-aramid-vest': garment('Arasaka polycarbonate-laced bulletproof aramid vest', 'outer', 'neomilitarism', 'luxury', 1600, 900, 'Aramid laced with polycarbonate, cut to go under a blazer. It is what the tower security wears.', POCKETS.vest, 'Arasaka'),
  'corporate-pumps': garment('Ergonomic reinforced corporate pumps', 'feet', 'neomilitarism', 'luxury', 500, 240, 'Pumps you can run for an elevator in.'),

  // ── Avante: luxury neokitsch designerware, at Appel de Paris on Corpo Plaza and in Lele Park.
  'noble-white-evening-jacket': garment('Noble White albino alligator evening jacket', 'outer', 'neokitsch', 'luxury', 1400, 1200, 'Albino alligator, the real thing, grown for it. The kind of white that makes a room go quiet.', POCKETS.vest),
  'koumori-trench-coat': garment('Koumori syn-leather trench coat', 'outer', 'neokitsch', 'luxury', 1900, 680, 'Bat-winged syn-leather with a shine, and pockets deep enough to lose a pistol in.', POCKETS.coat),
  'fairy-frost-trench-coat': garment('Fairy Frost trench coat with protective mesh', 'outer', 'neokitsch', 'luxury', 1800, 720, 'Pale as frost, with a mesh under the shell that turns a blade.', POCKETS.coat),
  'lady-in-white-pencil-dress': garment('Lady in White hybrid-weave pencil dress', 'outer', 'neokitsch', 'luxury', 600, 650, 'Hybrid weave, white, a cut that does not forgive. One pocket, for a credchip.', POCKETS.dress),
  'golden-mean-formal-skirt': garment('Golden Mean aramid-stitch formal skirt', 'legs', 'neokitsch', 'luxury', 450, 340, 'Aramid-stitched, gold thread at the hem. One pocket.', POCKETS.skirt),
  'powder-pink-blazer': garment('Powder Pink light polyamide blazer', 'outer', 'neokitsch', 'luxury', 800, 540, 'A soft pink that only money gets away with.', POCKETS.blazer),
  'classy-bordeaux-pants': garment('Classy Bordeaux pants with fortified seams', 'legs', 'neokitsch', 'luxury', 650, 360, 'Wine-dark, with seams that will outlast you.', POCKETS.pants),
  'simple-office-pants': garment('Simple office pants', 'legs', 'neomilitarism', 'luxury', 600, 190, 'Plain, dark, pressed. Avante charges for the label in the waistband.', POCKETS.pants),
  'office-shirt-and-vest': garment('Tear-resistant office shirt and vest', 'outer', 'neomilitarism', 'luxury', 600, 380, 'A shirt and vest that survive the office. Two pockets in the vest.', POCKETS.vest),
  'kogane-no-yume-bd-wreath': garment('Kogane no Yume titanium BD wreath', 'face', 'neokitsch', 'luxury', 120, 560, 'A titanium braindance wreath finished in gold, worn out as jewelry. That tells you who is wearing it.'),
  'designer-fleets': garment('Designer fleets with acid-resistant uppers', 'feet', 'neokitsch', 'luxury', 600, 300, 'Designer fleets that shrug off the rain this city makes.'),
  'bai-long-formal-pants': garment('Bái Lóng formal pants with reinforced neo-silk', 'legs', 'neokitsch', 'luxury', 550, 420, 'White-dragon neo-silk, reinforced so it drapes and never creases.', { slots: 2, maxGrams: 1200, change: true }),

  // ── The boutique: designer pieces that are nobody's house brand.
  'synsilk-blazer': garment('Durable synsilk blazer', 'outer', 'neokitsch', 'luxury', 800, 480, 'Synsilk with the weight of the real thing and none of the worms.', POCKETS.blazer),
  'light-synfiber-evening-jacket': garment('Light synfiber evening jacket', 'outer', 'neokitsch', 'luxury', 700, 520, 'For evenings. It was not made for the day.', POCKETS.vest),
  'phoenix-formal-dress': garment('Phoenix formal dress with microarmor layer', 'outer', 'neokitsch', 'luxury', 800, 760, 'A phoenix up the side, and microarmor where it counts.', POCKETS.dress),
  'imperial-marble-formal-pants': garment('Imperial Marble aramid-weave formal pants', 'legs', 'neokitsch', 'luxury', 650, 340, 'Marble-print aramid that falls straight.', { slots: 2, maxGrams: 1200, change: true }),
  'golden-hive-designer-pants': garment('Golden Hive polyamide designer pants', 'legs', 'neokitsch', 'luxury', 600, 390, 'Honeycomb polyamide, gold where the light hits.', POCKETS.pants),
  'luxury-half-zip': garment('Luxury half-zip with silver nano-inlay', 'outer', 'neokitsch', 'luxury', 600, 410, 'A half-zip with silver worked into the thread. Casual, for a certain value of casual.', POCKETS.vest),
  'elegant-unitard': garment('Elegant unitard with ballistic lining', 'inner', 'neokitsch', 'luxury', 400, 300, 'A ballistic lining under something that looks like nothing at all.'),
  'classic-evening-pumps': garment('Classic evening pumps with polycarbonate support', 'feet', 'neokitsch', 'luxury', 500, 260, 'Evening pumps with a polycarbonate spine in the heel.'),
  'classic-trilby': garment('Classic trilby with composite band', 'head', 'neokitsch', 'luxury', 160, 170, 'A trilby with a composite band. Nobody wears a hat by accident anymore.'),
  'armor-coated-aviators': garment('Classic armor-coated aviators', 'face', 'neokitsch', 'luxury', 40, 190, 'Aviators with an armor coat on the lenses.'),

  // ── Saeko's: casual wear in every style but Entropism, from the boardwalk store in Japantown.
  'white-hive-jacket': garment('White Hive LED-lined anti-piercing jacket', 'outer', 'kitsch', 'everyday', 1200, 150, 'White honeycomb with LEDs in the seams and a weave that stops a blade.', POCKETS.jacket),
  'aramid-coated-deltajock-jacket': garment('Aramid-coated deltajock jacket', 'outer', 'kitsch', 'everyday', 1300, 120, 'A deltajock cut, aramid-coated. Everybody under thirty in Japantown owns one.', POCKETS.jacket),
  'saekos-tight-tank': garment("Saeko's protective-layer tight tank", 'inner', 'kitsch', 'everyday', 180, 38, "Saeko's own, with a protective layer you cannot see.", undefined, "Saeko's"),
  'saekos-breastplate': garment("Saeko's prototype tactical aramid breastplate", 'outer', 'neomilitarism', 'everyday', 1500, 220, "A prototype breastplate Saeko's never put into production, except that it did.", { slots: 1, maxGrams: 500 }, "Saeko's"),
  'tamashi-utility-pants': garment('Tamashī anti-mech utility pants', 'legs', 'kitsch', 'everyday', 800, 95, 'Utility pants with more pockets than you have things.', POCKETS.cargo),
  'golden-pocket-hotpants': garment('Golden Pocket hybrid-weave hotpants', 'legs', 'neokitsch', 'everyday', 300, 70, 'One golden pocket, as advertised.', { slots: 1, maxGrams: 400, change: true }),
  'light-speed-biker-boots': garment('Light Speed biker boots with nanoarmor fabric', 'feet', 'kitsch', 'everyday', 1100, 130, 'Biker boots in nanoarmor fabric, lighter than they look.'),
  'yoru-no-samurai-kicks': garment('Yoru no Samurai kicks with carbon-fiber layering', 'feet', 'kitsch', 'everyday', 700, 90, 'Night-samurai kicks, carbon fiber in the uppers.'),
  'kang-tao-field-cap': garment('Kang Tao field cap with holodisplay', 'head', 'neomilitarism', 'everyday', 110, 85, 'A Kang Tao field cap with a holodisplay in the brim.', undefined, 'Kang Tao'),
  'sepia-vision-aviators': garment('Elegant Sepia Vision aviators with reinforced lenses', 'face', 'neokitsch', 'everyday', 40, 75, 'Sepia lenses that make the city look like an old photo of itself.'),
  'menpo-with-durable-lining': garment('Menpō with durable lining', 'face', 'kitsch', 'everyday', 250, 60, 'A samurai half-mask the Tyger Claws made fashionable. This one is only a mask.'),
  'molto-vivace-rocker-coat': garment('Molto Vivace nanoweave rocker coat', 'outer', 'kitsch', 'everyday', 1700, 180, 'A long rocker coat in nanoweave, for standing at the back of a gig.', POCKETS.coat),

  // ── Stylishly: the middle of the road, in Little China, Wellsprings and Rancho Coronado.
  'zebriger-led-jacket': garment('Durable Zebriger LED-lined jacket', 'outer', 'kitsch', 'everyday', 1200, 110, 'Zebra stripes with LEDs between them.', POCKETS.jacket),
  'mikan-flight-jacket': garment('Mikan enhanced flight jacket', 'outer', 'kitsch', 'everyday', 1300, 125, 'Tangerine flight jacket, enhanced in some way the tag does not explain.', POCKETS.jacket),
  'duolayer-nylon-vest': garment('Duolayer nylon vest', 'outer', 'kitsch', 'everyday', 500, 45, 'Two layers of nylon and two pockets.', POCKETS.vest),
  'violet-nebula-turtleneck': garment('Violet Nebula anti-tear polyamide turtleneck', 'inner', 'kitsch', 'everyday', 300, 40, 'A violet turtleneck that will not tear.'),
  'dark-sapphire-rocker-pants': garment('Dark Sapphire thermo-fabric rocker pants', 'legs', 'kitsch', 'everyday', 650, 70, 'Thermo-fabric that warms up when you do.', POCKETS.pants),
  'golden-scale-windbreaker-pants': garment('Golden Scale trilayer windbreaker pants', 'legs', 'kitsch', 'everyday', 500, 60, 'Windbreaker pants in gold scales. Two pockets.', { slots: 2, maxGrams: 1200, change: true }),
  'glamor-spirit-street-shoes': garment('Glamor Spirit street shoes with reinforced insoles', 'feet', 'kitsch', 'everyday', 700, 65, 'Street shoes with insoles made for walking the whole city.'),
  'icon-america-fleets': garment('Breathable ICON America fleets', 'feet', 'kitsch', 'everyday', 650, 80, "ICON America's fleets, which breathe. The leather is on the jackets.", undefined, 'ICON America'),
  'leather-flat-cap': garment('Stylish leather flat cap with light armor layer', 'head', 'kitsch', 'everyday', 150, 45, 'A leather flat cap with a light armor layer in the crown.'),
  'emerald-speed-beanie': garment('Durable Emerald Speed polyamide beanie', 'head', 'kitsch', 'everyday', 80, 25, 'Emerald green, pulled down low.'),
  'anhelo-blanco-fringe-vest': garment('Anhelo Blanco puncture-resistant western fringe vest', 'outer', 'kitsch', 'everyday', 700, 85, 'A white fringe vest for the Rancho Coronado rodeo look.', POCKETS.vest),
  'gunslinger-cowboy-hat': garment('Gunslinger cowboy hat with reinforced lining', 'head', 'kitsch', 'everyday', 300, 70, 'A cowboy hat with a reinforced lining, worn by people who have never ridden anything.'),
  'western-star-cowboy-boots': garment('Western Star cowboy boots with thick synthetic heels', 'feet', 'kitsch', 'everyday', 1200, 120, 'Cowboy boots with a star stitched on and heels that add an inch.'),
  'western-shorties': garment('Comfy hardened-leather western shorties', 'feet', 'kitsch', 'everyday', 900, 95, 'Short western boots in hardened leather. Comfortable, as it says.'),
  'heavy-duty-biker-boots': garment('Heavy-duty biker boots', 'feet', 'kitsch', 'everyday', 1300, 110, 'Biker boots built for the bike you do not have.'),
  'composite-biker-jacket': garment('Composite biker jacket with buckles', 'outer', 'kitsch', 'everyday', 1400, 130, 'A biker jacket with composite in the shoulders and buckles everywhere else.', POCKETS.jacket),
  'darra-polytechnic-cap': garment('Darra Polytechnic cap', 'head', 'kitsch', 'everyday', 90, 30, 'A cap from a gun maker. The logo does the talking.', undefined, 'Darra Polytechnic'),

  // ── Ded-Zed, on Richmond Street in Northside: street and surplus.
  'arasaka-combat-turtleneck': garment('Arasaka waterproof combat turtleneck', 'inner', 'neomilitarism', 'everyday', 350, 70, 'Arasaka surplus, waterproof, with the logo at the throat.', undefined, 'Arasaka'),
  'pink-rage-deltajock-jacket': garment('Pink Rage ultra-light rocker deltajock jacket', 'outer', 'kitsch', 'everyday', 1000, 115, 'Loud pink, light as a shirt, cut like a jacket.', POCKETS.jacket),
  'at-ak-rally-bolero': garment('AT-AK insulated aramid-padded rally bolero', 'outer', 'kitsch', 'everyday', 900, 105, 'A short rally jacket, padded with aramid. AT-AK makes them for drivers and sells them to everyone.', POCKETS.vest, 'AT-AK'),
  'uniware-platform-boots': garment('Reinforced Uniware platform boots', 'feet', 'kitsch', 'everyday', 1300, 90, 'Uniware, which your parents wore to the office. The platforms are new.', undefined, 'Uniware'),
  'darra-polytechnic-sneakers': garment('Darra Polytechnic suede sneakers', 'feet', 'kitsch', 'everyday', 650, 75, 'Suede sneakers from a gun maker, which is a Night City thing to be.', undefined, 'Darra Polytechnic'),
  'icon-america-kicks': garment('ICON America synfiber kicks', 'feet', 'kitsch', 'everyday', 600, 70, 'Synfiber kicks with the ICON America tag.', undefined, 'ICON America'),
  'heat-resistant-military-boots': garment('Heat-resistant military boots', 'feet', 'neomilitarism', 'everyday', 1400, 120, 'Military boots that take heat. Surplus, probably.'),
  'hardened-leather-flat-cap': garment('Classic hardened-leather flat cap', 'head', 'kitsch', 'everyday', 140, 40, 'A flat cap in hardened leather.'),
  'cotton-motorcycle-cap': garment('Cotton motorcycle cap with protective inset', 'head', 'kitsch', 'everyday', 110, 30, 'A motorcycle cap with a protective inset, for people who ride in a cap.'),
  'reinforced-baseball-cap': garment('Reinforced baseball cap', 'head', 'kitsch', 'everyday', 100, 22, 'A baseball cap, reinforced.'),
  'used-leather-combat-boots': garment('Used leather combat boots', 'feet', 'entropism', 'poverty', 1300, 35, 'Combat boots somebody else broke in.'),

  // ── The thrift rack: used and worn, the Kabuki vendor's "thrift store quality" and the Badlands' secondhand.
  'worn-punk-coat': garment('Worn PUNK coat', 'outer', 'entropism', 'poverty', 1600, 24, 'PUNK across the back in paint that has mostly flaked.', POCKETS.coat),
  'old-spotted-trench-coat': garment('Old spotted trench coat', 'outer', 'entropism', 'poverty', 1800, 22, 'A trench coat with spots that were not part of the design.', POCKETS.coat),
  'used-flight-jacket': garment('Used flight jacket with composite lining', 'outer', 'entropism', 'poverty', 1300, 26, 'A flight jacket with a composite lining and someone else\'s name inside the collar.', POCKETS.jacket),
  'frayed-athletic-shoes': garment('Frayed athletic shoes', 'feet', 'entropism', 'poverty', 600, 9, 'Athletic shoes, frayed. They were white.'),
  'threadbare-sneakers': garment('Threadbare sneakers', 'feet', 'entropism', 'poverty', 550, 6, 'Sneakers you can see your socks through.'),
  'faded-cirqt-steel-toes': garment('Faded CIRQT laceless steel-toes', 'feet', 'entropism', 'poverty', 1200, 20, 'Laceless steel-toes, faded to no color.'),
  'worn-baseball-cap': garment('Worn baseball cap', 'head', 'entropism', 'poverty', 90, 5, 'A baseball cap with the brim worn soft.'),
  'worn-brimmed-hat-with-gauge': garment('Worn brimmed hat with gauge', 'head', 'entropism', 'poverty', 200, 8, 'A nomad hat with a radiation gauge clipped to the brim. The gauge still works.'),
  'old-plastic-gas-mask': garment('Old plastic gas mask', 'face', 'entropism', 'poverty', 300, 10, 'A plastic gas mask with a filter that expired years ago.'),
  'hardened-plastic-goggles': garment('Hardened plastic goggles', 'face', 'entropism', 'poverty', 80, 7, 'Goggles of hardened plastic, scratched.'),
  'psycho-biker-pants': garment('PSYCHO tac-fiber biker pants', 'legs', 'kitsch', 'poverty', 800, 18, 'Biker pants with PSYCHO down one leg.', POCKETS.pants),
  'light-electro-shorts': garment('Light ELECTRO extra-lined shorts', 'legs', 'kitsch', 'poverty', 350, 10, 'Shorts with ELECTRO on them and an extra lining.', POCKETS.shorts),
  'secondhand-knotted-tank': garment('Secondhand knotted tank', 'inner', 'kitsch', 'poverty', 150, 5, 'An ICON America tank, secondhand, knotted at the hip.', undefined, 'ICON America'),
  'faded-uniware-knotted-tank': garment('Faded Uniware knotted tank', 'inner', 'kitsch', 'poverty', 150, 5, 'Uniware is old news, says the print. It still holds together.', undefined, 'Uniware'),
  'worn-compression-t-shirt': garment('Worn compression t-shirt', 'inner', 'entropism', 'poverty', 160, 6, 'A compression shirt that has stopped compressing.', undefined, 'Uniware'),

  // ── Streetwear, the stands of Arroyo and West Wind Estate.
  'spunky-monkey-aramid-coat': garment('Spunky Monkey aramid coat', 'outer', 'kitsch', 'everyday', 1600, 95, 'An aramid coat from the energy drink people, in their colors.', POCKETS.coat, 'Spunky Monkey'),
  'dusty-rocker-jacket': garment('Dusty rocker jacket with buckles', 'outer', 'kitsch', 'everyday', 1300, 85, 'A rocker jacket, dusty, with buckles.', POCKETS.jacket),
  'natsunoshio-tracksuit': garment('Natsunoshio protective-mesh tracksuit', 'outer', 'kitsch', 'everyday', 800, 70, 'A summer-tide tracksuit top with a protective mesh. Three pockets, zipped.', POCKETS.blazer),
  'braindance-cap': garment('BRAINDANCE cap', 'head', 'kitsch', 'everyday', 90, 20, 'BRAINDANCE across the front, like an ad you agreed to wear.'),
  'sturdy-plaid-flat-cap': garment('Sturdy plaid flat cap', 'head', 'kitsch', 'everyday', 130, 28, 'A plaid flat cap, sturdy.'),
  'cut3-brainzz-sneakers': garment('Cut3 Brainzz tear-proof sneakers', 'feet', 'kitsch', 'everyday', 650, 60, 'Tear-proof sneakers with a cartoon brain on the tongue.'),
  'green-graffiti-athletic-shoes': garment('GREEN GRAFFITI armor-coated athletic shoes', 'feet', 'kitsch', 'everyday', 700, 65, 'Athletic shoes tagged green, with an armor coat.'),
  'spunky-monkey-kicks': garment('Robust Spunky Monkey kicks', 'feet', 'kitsch', 'everyday', 700, 55, 'Kicks from the energy drink people. Robust.', undefined, 'Spunky Monkey'),
  'reinforced-biker-boots': garment('Reinforced biker boots', 'feet', 'kitsch', 'everyday', 1300, 90, 'Biker boots, reinforced at the toe and the shin.'),
  'composite-punk-exo-jacks': garment('Composite punk exo-jacks', 'feet', 'kitsch', 'everyday', 1100, 80, 'Exo-jacks with composite plates up the ankle.'),
  'at-ak-utility-pants': garment('AT-AK utility wear-resistant pants', 'legs', 'kitsch', 'everyday', 750, 65, 'AT-AK utility pants, the kind the nomads wear out. Five pockets.', POCKETS.cargo, 'AT-AK'),
  'maxiwear-windbreaker-pants': garment('MaxiWear windbreaker pants', 'legs', 'kitsch', 'everyday', 450, 40, 'MaxiWear: interchangeable, affordable, and the stitching knows it.', { slots: 2, maxGrams: 1200, change: true }, 'MaxiWear'),
  'cotton-long-sleeve': garment('Cotton long-sleeve', 'inner', 'kitsch', 'everyday', 250, 18, 'A cotton long-sleeve. Actual cotton, says the tag.'),
  'syn-cotton-t-shirt': garment('Durable hardened syn-cotton T-shirt', 'inner', 'kitsch', 'everyday', 200, 15, 'A syn-cotton T-shirt, hardened, which is a strange thing for a T-shirt to be.'),
  'classic-square-glasses': garment('Classic square glasses with UV filter', 'face', 'kitsch', 'everyday', 30, 25, 'Square glasses with a UV filter and no prescription.'),
};

/** What each store sells, by business id: each vendor's stock on the wiki, in our tiers. Bags come from `GEAR.racks` too. */
export const STORES = {
  jinguji: ['arasaka-corporate-blazer', 'marbre-dore-suit-jacket', 'gatto-nero-evening-jacket', 'yunami-formal-jacket', 'caret-cassico-blazer', 'synthetic-corporate-jacket', 'gin-no-hoshi-shirt-and-vest', 'arasaka-aramid-vest', 'demon-rhapsody-pencil-dress', 'reinforced-dress-shirt', 'classic-corporate-pants', 'royal-gray-dress-pants', 'arasaka-cap-with-camera', 'arasaka-side-cap', 'corporate-pumps'],
  avante: ['noble-white-evening-jacket', 'koumori-trench-coat', 'fairy-frost-trench-coat', 'lady-in-white-pencil-dress', 'powder-pink-blazer', 'office-shirt-and-vest', 'golden-mean-formal-skirt', 'classy-bordeaux-pants', 'bai-long-formal-pants', 'simple-office-pants', 'kogane-no-yume-bd-wreath', 'designer-fleets'],
  boutique: ['synsilk-blazer', 'light-synfiber-evening-jacket', 'phoenix-formal-dress', 'luxury-half-zip', 'elegant-unitard', 'imperial-marble-formal-pants', 'golden-hive-designer-pants', 'classic-evening-pumps', 'classic-trilby', 'armor-coated-aviators'],
  saekos: ['white-hive-jacket', 'aramid-coated-deltajock-jacket', 'molto-vivace-rocker-coat', 'saekos-breastplate', 'saekos-tight-tank', 'tamashi-utility-pants', 'golden-pocket-hotpants', 'light-speed-biker-boots', 'yoru-no-samurai-kicks', 'kang-tao-field-cap', 'sepia-vision-aviators', 'menpo-with-durable-lining'],
  stylishly: ['zebriger-led-jacket', 'mikan-flight-jacket', 'composite-biker-jacket', 'duolayer-nylon-vest', 'anhelo-blanco-fringe-vest', 'violet-nebula-turtleneck', 'dark-sapphire-rocker-pants', 'golden-scale-windbreaker-pants', 'glamor-spirit-street-shoes', 'icon-america-fleets', 'western-star-cowboy-boots', 'western-shorties', 'heavy-duty-biker-boots', 'leather-flat-cap', 'emerald-speed-beanie', 'gunslinger-cowboy-hat', 'darra-polytechnic-cap'],
  'ded-zed': ['pink-rage-deltajock-jacket', 'at-ak-rally-bolero', 'arasaka-combat-turtleneck', 'uniware-platform-boots', 'darra-polytechnic-sneakers', 'icon-america-kicks', 'heat-resistant-military-boots', 'used-leather-combat-boots', 'hardened-leather-flat-cap', 'cotton-motorcycle-cap', 'reinforced-baseball-cap'],
  'clothing-store': ['spunky-monkey-aramid-coat', 'dusty-rocker-jacket', 'natsunoshio-tracksuit', 'cotton-long-sleeve', 'syn-cotton-t-shirt', 'at-ak-utility-pants', 'maxiwear-windbreaker-pants', 'cut3-brainzz-sneakers', 'green-graffiti-athletic-shoes', 'spunky-monkey-kicks', 'reinforced-biker-boots', 'composite-punk-exo-jacks', 'braindance-cap', 'sturdy-plaid-flat-cap', 'classic-square-glasses'],
  'thrift-shop': ['worn-punk-coat', 'old-spotted-trench-coat', 'used-flight-jacket', 'jacket', 'secondhand-knotted-tank', 'faded-uniware-knotted-tank', 'worn-compression-t-shirt', 'tank', 'pants', 'psycho-biker-pants', 'light-electro-shorts', 'high-tops', 'frayed-athletic-shoes', 'threadbare-sneakers', 'faded-cirqt-steel-toes', 'worn-baseball-cap', 'worn-brimmed-hat-with-gauge', 'old-plastic-gas-mask', 'hardened-plastic-goggles'],
} satisfies Record<string, string[]>;

/** How each clothing store prices and presents itself; stores not listed draw a quality from their district like an eatery. */
export const STORE_QUALITY: Record<string, Quality> = {
  jinguji: 'luxury',
  avante: 'luxury',
  boutique: 'luxury',
  saekos: 'everyday',
  stylishly: 'everyday',
  'ded-zed': 'everyday',
  'clothing-store': 'everyday',
  'thrift-shop': 'poverty',
};
