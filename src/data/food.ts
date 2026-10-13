import type { Dish, FoodContent } from '../engine/food';

/**
 * What there is to eat in Night City. Every name is a real product or dish from the Cyberpunk
 * Wiki's lists of 2077's food, drinks and alcohol; the notes and the prices are ours. Prices
 * are what an everyday place charges, in eddies: luxury places charge three times that, cheap
 * ones a bit over half. The bottom shelf keeps out of luxury places, and the dearest dishes
 * (where luxury only) keep out of everywhere else.
 */
const DISHES: Dish[] = [
  // ── Noodles and dumplings ──
  { id: 'rammmmen', name: 'RaMMMMen', note: 'Kabayan Foods instant ramen, heavy on the MSG.', kind: 'food', price: 4, on: ['noodles', 'street'], favored: ['watson', 'westbrook'] },
  { id: 'wontons', name: 'Wontons', note: "Little China's specialty, in broth or fried.", kind: 'food', price: 2, on: ['noodles', 'dumplings', 'street', 'market'], favored: ['watson'] },
  { id: 'galician-pierogi', name: 'Galician Pierogi', note: 'Dumplings by the plate, Galician style.', kind: 'food', price: 4, on: ['dumplings', 'fine'] },
  { id: 'yikes-tofu-bar', name: 'Yikes! Tofu Bar', note: 'An All Foods tofu bar. Calories, not flavor.', kind: 'food', price: 2, on: ['noodles', 'snack', 'street'], favored: ['westbrook'], where: ['everyday', 'poverty'], grams: 90 },
  { id: 'soy-paste', name: 'Soy Paste', note: 'Nutrients in a tube. Quicker than chewing.', kind: 'food', price: 1, on: ['street', 'snack'], favored: ['pacifica'], where: ['everyday', 'poverty'], grams: 120 },

  // ── Scopdogs and grill ──
  { id: 'hawt-dawg', name: 'Hawt Dawg', note: 'A scopdog in a soft steamed bun.', kind: 'food', price: 2, on: ['street', 'grill', 'diner', 'market'], favored: ['santo_domingo', 'watson'], where: ['everyday', 'poverty'] },
  { id: 'cheese-hawtdawg', name: 'Cheese HawtDawg', note: 'A cheese "sausage" that melts into the bun.', kind: 'food', price: 3, on: ['street', 'grill', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'chilli-hawtdawg', name: 'Chilli HawtDawg', note: 'The classic dog with chili heat.', kind: 'food', price: 3, on: ['street', 'grill'], where: ['everyday', 'poverty'] },
  { id: 'premium-hawtdawg', name: 'Premium HawtDawg', note: 'The house special: smoked, pickled pork sausage and the original sauce.', kind: 'food', price: 5, on: ['grill'] },
  { id: 'eezybeef', name: 'EEZYBEEF', note: "All Foods' synth-beef, the cheapest meat in the city.", kind: 'food', price: 2, on: ['grill', 'street', 'diner', 'market'], favored: ['santo_domingo'], where: ['everyday', 'poverty'] },
  { id: 'all-foods-meat-delight', name: 'All Foods Meat Delight', note: 'Synthetic meat that tastes nearly like the real thing.', kind: 'food', price: 3, on: ['grill', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'all-foods-veggie-delight', name: 'All Foods Veggie Delight', note: 'The vegan plate from the same factory.', kind: 'food', price: 3, on: ['grill', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'slaughterhouse-prime', name: 'Slaughterhouse Prime', note: 'A Slaughterhouse syn-meat patty, heavy on the derivatives.', kind: 'food', price: 4, on: ['grill'], favored: ['santo_domingo'] },
  { id: 'slaughterhouse-jerky', name: 'Slaughterhouse Jerky', note: 'Dried syn-meat strips.', kind: 'food', price: 3, on: ['grill', 'snack'], where: ['everyday', 'poverty'], grams: 80 },
  { id: 'slaughterhouse-veggie', name: 'Slaughterhouse Veggie', note: 'The grudging vegetarian option.', kind: 'food', price: 3, on: ['grill'], where: ['everyday', 'poverty'] },

  // ── Mexican ──
  { id: 'taco', name: 'Taco', note: 'A street taco: tortilla, syn-meat, salsa.', kind: 'food', price: 2, on: ['street'], favored: ['heywood'] },
  { id: 'loaded-tamale', name: 'Loaded Tamale', note: 'A tamale stuffed to bursting.', kind: 'food', price: 3, on: ['street'], favored: ['heywood'] },
  { id: 'burrito-xxl', name: 'Burrito XXL', note: "All Foods' oversized burrito.", kind: 'food', price: 4, on: ['street', 'market'], favored: ['heywood'], where: ['everyday', 'poverty'], grams: 600 },
  { id: 'burrito-xxl-rosado', name: 'Burrito XXL Rosado', note: 'The pink one.', kind: 'food', price: 4, on: ['street'], favored: ['heywood'], where: ['everyday', 'poverty'] },
  { id: 'burrito-xxl-turquesa', name: 'Burrito XXL Turquesa', note: 'The turquoise one, a cut above.', kind: 'food', price: 7, on: ['street'], where: ['everyday', 'luxury'] },

  // ── Japanese ──
  { id: 'nigiri', name: 'Nigiri', note: 'Rice and syn-fish, with non-toxic coloring.', kind: 'food', price: 7, on: ['fine', 'market'], where: ['everyday', 'luxury'], favored: ['westbrook'] },
  { id: 'norimaki', name: 'Norimaki', note: 'Rolled sushi, the classic.', kind: 'food', price: 6, on: ['fine', 'market'], where: ['everyday', 'luxury'], favored: ['westbrook'] },

  // ── Pizza ──
  { id: 'locust-pepperoni-pizza', name: 'Locust Pepperoni Pizza', note: 'Pepperoni made of locusts.', kind: 'food', price: 6, on: ['market'] },
  { id: 'ham-and-mushroom-pizza', name: 'Ham and Mushroom Pizza', note: 'Syn-ham and mushroom.', kind: 'food', price: 6, on: ['market'] },
  { id: 'artichoke-n-avocado-pizza', name: "Artichoke 'n' Avocado Pizza", note: 'The expensive toppings.', kind: 'food', price: 7, on: ['market'] },
  { id: 'tofud-tuna-and-pineapple-pizza', name: "Tofu'd Tuna and Pineapple Pizza", note: 'Tofu tuna, pineapple, controversy.', kind: 'food', price: 6, on: ['market'] },

  // ── Diner and bakery ──
  { id: 'ham-and-cheese-sandwich', name: 'Ham and cheese sandwich', note: 'Syn-ham and cheese-flavored paste, made by hand.', kind: 'food', price: 3, on: ['diner', 'snack'] },
  { id: 'dairing-dairy-milkshake', name: 'Dairing Dairy "Milkshake"', note: 'A milkshake with authentic milk flavoring.', kind: 'food', price: 3, on: ['diner', 'market'], where: ['everyday', 'poverty'] },
  { id: 'holobites-peach-pie', name: 'Holobites Peach Pie', note: 'Peach pie, in paste form.', kind: 'food', price: 2, on: ['diner', 'market', 'snack'], where: ['everyday', 'poverty'] },
  { id: 'holobites-grape-pie', name: 'Holobites Grape Pie', note: 'Grape pie. Also paste.', kind: 'food', price: 2, on: ['diner', 'market', 'snack'], where: ['everyday', 'poverty'] },
  { id: 'pierres-croissants', name: "Pierre's Croissants", note: 'Croissants with a two-year shelf life.', kind: 'food', price: 5, on: ['diner', 'fine', 'market', 'street'], favored: ['city_center'] },
  { id: 'sweets-for-sweetie-cupcake', name: 'Sweets for Sweetie Cupcake', note: 'A cupcake under a drift of sprinkles.', kind: 'food', price: 3, on: ['diner', 'snack'] },

  // ── Fine dining ──
  { id: 'jambalaya', name: 'Jambalaya', note: 'Rice, sausage and everything else in the pot.', kind: 'food', price: 6, on: ['fine', 'diner'], favored: ['pacifica'] },
  { id: 'tajine', name: 'Tajine!', note: 'A slow-cooked North African stew.', kind: 'food', price: 6, on: ['fine', 'street', 'noodles'] },
  { id: 'ave-saitan', name: 'Ave Saitan', note: 'A 666-gram seitan roast.', kind: 'food', price: 5, on: ['fine', 'street', 'grill'], where: ['everyday', 'luxury'] },
  { id: 'got-escargot', name: 'Got Escargot?', note: 'Real snails, fully legal.', kind: 'food', price: 8, on: ['fine'], where: ['luxury'], favored: ['city_center'] },
  { id: 'realfruit', name: 'RealFruit', note: 'Actual fruit, which is why it costs that.', kind: 'food', price: 6, on: ['fine', 'market'], where: ['everyday', 'luxury'], favored: ['city_center'] },
  { id: 'dark-chocolate', name: 'Dark Chocolate', note: 'Real chocolate, with vitamin C.', kind: 'food', price: 5, on: ['fine', 'snack'], where: ['everyday', 'luxury'] },

  // ── Snacks and the bottom shelf ──
  { id: 'synthsnack', name: 'SynthSnack', note: 'Salt, fat and sugar in a bag.', kind: 'food', price: 1, on: ['snack', 'street'], where: ['everyday', 'poverty'] },
  { id: 'pop-turd', name: 'Pop-Turd', note: 'A toaster pastry.', kind: 'food', price: 1, on: ['snack', 'market'], where: ['everyday', 'poverty'] },
  { id: 'mr-whitey', name: 'Mr. Whitey', note: 'A calorie-packed snack bar.', kind: 'food', price: 1, on: ['snack', 'market'], where: ['everyday', 'poverty'] },
  { id: 'moonchies', name: 'Moonchies', note: 'Puffed snacks for when you are sky high.', kind: 'food', price: 1, on: ['snack', 'market'], where: ['everyday', 'poverty'] },
  { id: 'cat-food', name: 'Cat Food', note: "Cat food. It's calories.", kind: 'food', price: 1, on: ['street', 'market', 'snack'], where: ['poverty'], favored: ['pacifica', 'watson'] },
  { id: 'dried-meat', name: 'Dried Meat', note: "Don't ask what it was.", kind: 'food', price: 2, on: ['street', 'snack'], where: ['poverty'], favored: ['pacifica'] },

  // ── Chain-only dishes (from the chains' own menus) ──
  { id: 'paste-taco', name: 'Paste Taco', note: "Capitán Caliente's one-eddie taco. Paste in a shell.", kind: 'food', price: 1, on: [] },
  { id: 'big-buddha-baby-burrito', name: 'Big Buddha Baby Burrito', note: "Capitán Caliente's burrito, bigger than it sounds.", kind: 'food', price: 4, on: [] },
  { id: 'synthcoff', name: 'SynthCoff', note: "Buck-A-Slice's synthetic coffee.", kind: 'drink', price: 1, on: [] },

  // ── Coffee and tea ──
  { id: 'coffee', name: 'Coffee', note: 'Brewed from GMO beans out of Brazil.', kind: 'drink', price: 2, on: ['coffee', 'diner'], where: ['everyday', 'poverty', 'luxury'] },
  { id: 'coffee-with-syn-milk', name: 'Coffee with Syn-Milk', note: 'Coffee, creamy with syn-milk.', kind: 'drink', price: 2, on: ['coffee', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'latte', name: 'Latte', note: "All Foods' trademarked latte.", kind: 'drink', price: 3, on: ['coffee'], where: ['everyday', 'poverty'] },
  { id: 'matapang-coffee', name: 'Matapang Coffee', note: 'Strong coffee for rough mornings.', kind: 'drink', price: 3, on: ['coffee', 'market'] },
  { id: 'matapang-decaf', name: 'Matapang Decaf', note: 'The decaf, for a flickering ticker.', kind: 'drink', price: 3, on: ['coffee'], where: ['everyday', 'poverty'] },
  { id: 'kopi-kadal-coffee', name: 'Kopi Kadal Coffee', note: 'Real beans, for people who can tell.', kind: 'drink', price: 3, on: ['coffee', 'fine'], where: ['luxury'], favored: ['city_center'] },
  { id: 'oolong-tea', name: 'Oolong Tea', note: 'Oolong, hot.', kind: 'drink', price: 3, on: ['tea'], where: ['everyday', 'poverty', 'luxury'], favored: ['watson'] },
  { id: 'te-matcha', name: 'Té Matcha', note: 'Matcha, by Té.', kind: 'drink', price: 4, on: ['tea', 'fine'], where: ['everyday', 'luxury'], favored: ['westbrook'] },
  { id: 'te-sencha', name: 'Té Sencha', note: 'Sencha, by Té.', kind: 'drink', price: 3, on: ['tea'], where: ['everyday', 'poverty', 'luxury'], favored: ['westbrook'] },
  { id: 'te-oolong', name: 'Té Oolong', note: 'Oolong, by Té.', kind: 'drink', price: 3, on: ['tea'] },

  // ── Soft drinks and water ──
  { id: 'nicola', name: 'NiCola', note: "Kabuto Manufacturing's cola. America's favorite, they say.", kind: 'drink', price: 2, on: ['soft', 'market'] },
  { id: 'nicola-sakura', name: 'NiCola Sakura', note: 'The cherry-blossom NiCola.', kind: 'drink', price: 3, on: ['soft'], favored: ['westbrook'] },
  { id: 'nicola-fire', name: 'NiCola Fire', note: 'NiCola with a burn.', kind: 'drink', price: 3, on: ['soft'], where: ['everyday', 'poverty'] },
  { id: 'cirrus-cola-classic', name: 'Cirrus Cola Classic', note: 'The cola with the eagle on the can.', kind: 'drink', price: 2, on: ['soft', 'market'], favored: ['santo_domingo'] },
  { id: 'naranjita-classic', name: 'Naranjita Classic', note: 'Orange soda.', kind: 'drink', price: 2, on: ['soft'], favored: ['heywood'] },
  { id: 'chromanticore', name: 'ChroManticore', note: 'An energy drink. A new mix every can.', kind: 'drink', price: 3, on: ['soft', 'snack'], where: ['everyday', 'poverty'] },
  { id: 'spunky-monkey', name: 'Spunky Monkey', note: 'A sugary mixed drink.', kind: 'drink', price: 3, on: ['soft', 'market', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'tiancha', name: 'Tiancha', note: 'A tea drink that soothes and stimulates at once.', kind: 'drink', price: 3, on: ['soft', 'tea'] },
  { id: 'tiancha-pomegranate', name: 'Tiancha Pomegranate', note: 'The pomegranate Tiancha.', kind: 'drink', price: 5, on: ['soft', 'tea'], where: ['everyday', 'luxury'] },
  { id: 'soop', name: 'Soop', note: 'Soup, juice or smoothie. Nobody is sure.', kind: 'drink', price: 3, on: ['soft'], where: ['everyday', 'poverty'] },
  { id: 'tomato-juice', name: 'Tomato "Juice"', note: 'Red, at least.', kind: 'drink', price: 2, on: ['soft', 'diner'], where: ['everyday', 'poverty'] },
  { id: 'vita-mine', name: 'Vita-Mine', note: 'Every vitamin in one bottle.', kind: 'drink', price: 3, on: ['soft', 'snack'], where: ['everyday', 'poverty'] },
  { id: 'water', name: 'Water', note: 'Clean water.', kind: 'drink', price: 1, on: ['water', 'street'], where: ['everyday', 'poverty'] },
  { id: 'filtered-rainwater', name: 'Filtered Rainwater', note: 'Rainwater, filtered, with a metallic edge.', kind: 'drink', price: 1, on: ['water', 'street'], where: ['poverty'], favored: ['pacifica'] },
  { id: 'real-water-still', name: 'Real Water (Still)', note: 'Water that was real once.', kind: 'drink', price: 5, on: ['water', 'fine', 'market'], where: ['everyday', 'luxury'] },
  { id: 'real-water-sparkling', name: 'Real Water (Sparkling)', note: 'The fizzy one.', kind: 'drink', price: 5, on: ['water', 'fine', 'market'], where: ['everyday', 'luxury'] },
  { id: 'sain-ruisseau', name: 'Sain Ruisseau', note: 'Bottled water, the clean kind.', kind: 'drink', price: 8, on: ['water', 'fine'], where: ['everyday', 'luxury'] },
  { id: 'vatnajokull-still', name: 'Vatnajökull (Still)', note: 'Glacier water, from an actual glacier.', kind: 'drink', price: 3, on: ['water', 'fine'], where: ['luxury'] },

  // ── Beer ──
  { id: 'broseph-lager', name: 'Broseph Lager', note: 'A cheap lager.', kind: 'alcohol', alcohol: 1, price: 5, on: ['beer', 'market'], favored: ['santo_domingo'], where: ['everyday', 'poverty'] },
  { id: 'broseph-ale', name: 'Broseph Ale', note: 'A cheap ale.', kind: 'alcohol', alcohol: 1, price: 5, on: ['beer'], where: ['everyday', 'poverty'] },
  { id: '21st-stout', name: '21st Stout', note: 'A plain stout.', kind: 'alcohol', alcohol: 1.2, price: 4, on: ['beer'], where: ['everyday', 'poverty'] },
  { id: 'abydos-classic', name: 'Abydos Classic', note: 'A cheap beer that never changes.', kind: 'alcohol', alcohol: 1, price: 4, on: ['beer', 'market'], where: ['everyday', 'poverty'] },
  { id: 'trailerbrew-beer', name: 'Trailerbrew Beer', note: 'Nomad beer, heavy on the yeast.', kind: 'alcohol', alcohol: 1, price: 3, on: ['beer'], favored: ['santo_domingo'], where: ['everyday', 'poverty'] },
  { id: 'randver', name: 'Randver', note: 'A beer with ambitions.', kind: 'alcohol', alcohol: 1.2, price: 7, on: ['beer', 'fine'], where: ['everyday', 'luxury'] },

  // ── Spirits ──
  { id: 'moonshine', name: 'Moonshine', note: 'Nomad moonshine. Sour going down, fuzzy after.', kind: 'alcohol', alcohol: 3, price: 3, on: ['spirits', 'street'], where: ['poverty'], favored: ['pacifica'] },
  { id: 'pitorro', name: 'Pitorro', note: 'Rotgut rum. Cheap, and it might cost you your eyes.', kind: 'alcohol', alcohol: 2.5, price: 3, on: ['spirits', 'street'], where: ['poverty'], favored: ['pacifica'] },
  { id: 'tequila-especial', name: 'Tequila Especial', note: 'A cheap tequila with agave bite.', kind: 'alcohol', alcohol: 2, price: 8, on: ['spirits'], favored: ['heywood'] },
  { id: 'calavera-feliz', name: 'Calavera Feliz', note: 'A top-shelf tequila for fiestas.', kind: 'alcohol', alcohol: 2, price: 10, on: ['spirits'], where: ['everyday', 'luxury'], favored: ['heywood'] },
  { id: 'centzon-totochtin', name: 'Centzon Totochtin', note: 'Blue-agave tequila, the good stuff.', kind: 'alcohol', alcohol: 2, price: 18, on: ['spirits', 'fine', 'market'], where: ['everyday', 'luxury'], favored: ['heywood'] },
  { id: 'sake-utagawa', name: 'Sake Utagawa', note: 'Top-shelf sake.', kind: 'alcohol', alcohol: 1.5, price: 10, on: ['spirits', 'fine', 'tea'], where: ['everyday', 'luxury'], favored: ['westbrook'] },
  { id: 'bolshevik-vodka', name: 'Bolshevik Vodka', note: 'Vodka with a kick.', kind: 'alcohol', alcohol: 2.5, price: 7, on: ['spirits'], where: ['everyday', 'poverty'] },
  { id: 'odickin-whiskey', name: "O'Dickin Whiskey", note: 'A no-frills whiskey.', kind: 'alcohol', alcohol: 2, price: 12, on: ['spirits', 'market'] },
  { id: 'blue-grass', name: 'Blue Grass', note: 'A bourbon for drowning sorrows.', kind: 'alcohol', alcohol: 2, price: 6, on: ['spirits'], where: ['everyday', 'poverty'] },
  { id: 'conine', name: 'Conine', note: 'A cognac.', kind: 'alcohol', alcohol: 2, price: 12, on: ['spirits', 'fine'], where: ['everyday', 'luxury'] },
  { id: 'armagnac-massy', name: 'Armagnac Massy', note: 'A brandy to savor, not drink.', kind: 'alcohol', alcohol: 2, price: 12, on: ['fine'], where: ['luxury'] },
  { id: 'romvlvs-gin', name: 'ROMVLVS GIN', note: 'Gin as a status symbol.', kind: 'alcohol', alcohol: 2, price: 5, on: ['spirits', 'fine'], where: ['luxury'] },

  // ── Wine ──
  { id: 'chateau-delen-2012', name: 'Chateau Delen 2012', note: 'One of two hundred bottles.', kind: 'alcohol', alcohol: 1.5, price: 25, on: ['wine', 'fine'], where: ['luxury'], favored: ['city_center'] },
  { id: 'champaradise', name: 'Champaradise', note: 'Sparkling wine, expensive.', kind: 'alcohol', alcohol: 1.5, price: 15, on: ['wine', 'fine'], where: ['luxury'], favored: ['city_center'] },
  { id: 'la-perle-des-alpes', name: 'La Perle des Alpes', note: 'An Alpine liqueur.', kind: 'alcohol', alcohol: 1.5, price: 10, on: ['wine', 'fine'], where: ['luxury'] },
];

export const FOOD: FoodContent = {
  dishes: DISHES,
  // By business (storefronts) and by kind of place.
  kitchens: {
    'noodle-bar': { serves: ['noodles', 'dumplings', 'tea', 'soft'], foods: 3, drinks: 2 },
    'dumpling-house': { serves: ['dumplings', 'noodles', 'tea', 'soft'], foods: 3, drinks: 2 },
    grill: { serves: ['grill', 'beer', 'soft'], foods: 4, drinks: 2 },
    'food-stall': { serves: ['street', 'snack', 'soft', 'water'], foods: 4, drinks: 2 },
    'fast-food': { serves: ['street', 'grill', 'soft'], foods: 4, drinks: 2 },
    diner: { serves: ['diner', 'coffee', 'soft'], foods: 4, drinks: 2 },
    restaurant: { serves: ['fine', 'wine', 'spirits', 'water', 'coffee', 'tea'], foods: 4, drinks: 3 },
    // Places: street-food stands and markets.
    noodle: { serves: ['noodles', 'street', 'tea', 'soft'], foods: 4, drinks: 2 },
    market: { serves: ['market', 'street', 'soft', 'beer'], foods: 5, drinks: 3 },
  },
  /**
   * Real places and chains, with what they really serve where the wiki says (the Kabuki Market
   * and Cherry Blossom Market stalls' stock, Capitán Caliente's and Buck-A-Slice's own menus)
   * and the house style where it doesn't.
   */
  fixed: {
    // Chains: the same menu and prices in every outlet.
    'buck-a-slice': {
      quality: 'everyday',
      dishes: [
        { id: 'locust-pepperoni-pizza', price: 3 },
        { id: 'ham-and-mushroom-pizza', price: 3 },
        { id: 'artichoke-n-avocado-pizza', price: 3 },
        { id: 'tofud-tuna-and-pineapple-pizza', price: 3 },
        { id: 'synthcoff', price: 1 },
        { id: 'cirrus-cola-classic', price: 2 },
        { id: 'nicola', price: 2 },
      ],
    },
    'capitan-caliente': {
      quality: 'everyday',
      dishes: [
        { id: 'paste-taco', price: 1 },
        { id: 'big-buddha-baby-burrito', price: 4 },
        { id: 'coffee', price: 2 },
        { id: 'nicola', price: 2 },
      ],
    },
    'yagami-market': {
      quality: 'everyday',
      dishes: [
        { id: 'nigiri', price: 10 },
        { id: 'norimaki', price: 9 },
        { id: 'rammmmen', price: 6 },
        { id: 'te-sencha', price: 3 },
        { id: 'te-matcha', price: 4 },
        { id: 'oolong-tea', price: 3 },
        { id: 'sake-utagawa', price: 12 },
        { id: 'nicola-sakura', price: 3 },
      ],
    },
    // Watson
    "Tom's Diner": {
      quality: 'everyday',
      dishes: ['coffee', 'coffee-with-syn-milk', 'ham-and-cheese-sandwich', 'hawt-dawg', 'dairing-dairy-milkshake', 'holobites-peach-pie', 'pierres-croissants'],
    },
    'Kabuki Market': {
      quality: 'everyday',
      dishes: ['wontons', 'hawt-dawg', 'eezybeef', 'burrito-xxl', 'nigiri', 'locust-pepperoni-pizza', 'pierres-croissants', 'dairing-dairy-milkshake', 'cirrus-cola-classic', 'matapang-coffee', 'spunky-monkey', 'broseph-lager', 'centzon-totochtin'],
    },
    'Corpo Snack': {
      quality: 'poverty',
      dishes: ['hawt-dawg', 'eezybeef', 'burrito-xxl', 'rammmmen', 'cat-food', 'pop-turd', 'cirrus-cola-classic', 'naranjita-classic', 'chromanticore', 'real-water-sparkling'],
    },
    // Westbrook
    'Cherry Blossom Market': {
      quality: 'everyday',
      dishes: ['rammmmen', 'wontons', 'tajine', 'coffee', 'latte', 'matapang-coffee', 'nicola', 'nicola-sakura', 'real-water-still'],
    },
    'Au Cabanon': {
      quality: 'luxury',
      dishes: ['got-escargot', 'ave-saitan', 'pierres-croissants', 'chateau-delen-2012', 'la-perle-des-alpes', 'champaradise', 'armagnac-massy', 'vatnajokull-still', 'kopi-kadal-coffee'],
    },
    // City Center
    'Pickles!': {
      quality: 'everyday',
      dishes: ['hawt-dawg', 'cheese-hawtdawg', 'chilli-hawtdawg', 'premium-hawtdawg', 'cirrus-cola-classic', 'nicola', 'spunky-monkey'],
    },
    // Heywood
    Embers: {
      quality: 'luxury',
      dishes: ['nigiri', 'norimaki', 'got-escargot', 'ave-saitan', 'sake-utagawa', 'chateau-delen-2012', 'champaradise', 'armagnac-massy', 'te-matcha', 'real-water-still'],
    },
    'El Pinche Pollo': {
      quality: 'everyday',
      dishes: ['taco', 'loaded-tamale', 'burrito-xxl', 'burrito-xxl-rosado', 'naranjita-classic', 'nicola', 'tequila-especial', 'calavera-feliz', 'centzon-totochtin'],
    },
    "Chubby Buffalo's": {
      quality: 'everyday',
      dishes: ['slaughterhouse-prime', 'slaughterhouse-jerky', 'eezybeef', 'premium-hawtdawg', 'cirrus-cola-classic', 'broseph-lager', '21st-stout'],
    },
    // Santo Domingo
    BuryGer: {
      quality: 'everyday',
      dishes: ['eezybeef', 'all-foods-meat-delight', 'ham-and-cheese-sandwich', 'dairing-dairy-milkshake', 'coffee', 'spunky-monkey'],
    },
  },
  priceBy: { luxury: 3, everyday: 1, poverty: 0.6 },
  labels: { luxury: 'Luxury', everyday: 'Neighborhood', poverty: 'Cheap eats', chain: 'Franchise' },
  blurbs: {
    luxury: 'White tablecloths, real ingredients and prices to match.',
    everyday: 'A neighborhood joint: honest food at honest prices.',
    poverty: 'Cheap eats. SCOP, kibble and whatever came off the truck.',
    chain: 'A franchise, with the same menu as every other one in the city.',
  },
};
