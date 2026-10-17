import type { NeedsRules } from '../engine/needs';

/**
 * Eating and resting (all ours). A full stomach empties in twenty hours on the game's clock, so
 * three or four meals a day keep the player fed: a meal fills about a third of it, a big one
 * (a Burrito XXL, a pizza, a jambalaya) nearly half, a snack a tenth or so, a drink a little,
 * and every dish says its own where it isn't the usual. Under half full the player is peckish,
 * which does nothing yet but say so; under a quarter, hungry, holding three quarters of their
 * energy; under a tenth, starving, half their energy and four fifths of their health. Energy
 * comes back three times as fast in a bed and half again as fast in a squat.
 */
export const NEEDS: NeedsRules = {
  hunger: {
    hours: 20,
    start: 80,
    full: 90,
    fill: { food: 30, drink: 4, alcohol: 2 },
    stages: [
      { id: 'peckish', label: 'Peckish', below: 50, energy: 1, health: 1, down: 'Your stomach starts to talk. You could eat.' },
      { id: 'hungry', label: 'Hungry', below: 25, energy: 0.75, health: 1, down: "You're hungry, properly hungry. You won't keep going long on nothing." },
      { id: 'starving', label: 'Starving', below: 10, energy: 0.5, health: 0.8, down: "You're starving. Your hands shake and your legs feel borrowed." },
    ],
    lines: {
      full: ["You couldn't eat another bite.", "You're full. It'll keep.", 'Not another mouthful: you\'re stuffed.'],
      better: ['That takes the edge off.', 'Better. The shakes ease.', 'Your stomach stops complaining.'],
    },
  },
  rest: { bed: 3, squat: 1.5 },
};
