import type { TravelRules } from '../engine/travel';

/**
 * Getting around Night City. Trips run on the phone's real clock, in real minutes: about a
 * minute of walking per city block, much less on the NCART.
 *
 * TESTING: `timeScale` makes every trip 60× faster, so a 20-minute walk takes 20 seconds.
 * Set it to 1 for real time.
 */
export const TRAVEL: TravelRules = {
  timeScale: 60,
  walkMinutesPerUnit: 1,
  rideMinutesPerUnit: 0.15,
  waitMinutes: 3,
  stopMinutes: 0.5,
  fare: 1,
  passPrice: 20,
  passDays: 30,
  startingEddies: 50,
  discoverRadius: 9,
};
