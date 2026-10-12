import type { InebriationRules } from '../engine/inebriation';

/**
 * Getting drunk. Each drink's units are on the dish (src/data/food.ts): a beer is about one,
 * a shot of spirits two or more. The body clears a unit an hour on the game's clock (a unit a
 * minute at the testing speed), so a beer is an hour of being tipsy, and a blackout is a
 * night's work to sleep off. The stages and their lines are ours.
 */
export const INEBRIATION: InebriationRules = {
  soberPerHour: 1,
  worst: 8,
  sober: 'The world comes back into focus. Sober.',
  stages: [
    { id: 'tipsy', label: 'Tipsy', at: 1, up: 'A warm buzz behind the eyes. Tipsy.', down: 'The edges sharpen up again. Just tipsy now.' },
    { id: 'drunk', label: 'Drunk', at: 3, up: 'The street tilts a little. Drunk.', down: 'The neon stops smearing. Down to drunk.' },
    { id: 'wasted', label: 'Wasted', at: 5, up: 'The neon smears and the ground sways. Wasted.', down: 'You can nearly read the signs again. Still wasted.' },
    { id: 'blackout', label: 'Blackout drunk', at: 8, up: "Everything swims. You won't remember this.", down: '' },
  ],
};
