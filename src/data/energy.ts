import type { EnergyRules } from '../engine/energy';

/**
 * Energy. It starts very low and grows very slowly: every point spent is a point of
 * experience (plus a bonus for running down to empty), and level 2 alone takes 600 points
 * spent, about 60 empty bars. Each level after takes more. A home with a bed adds a lot more
 * straight away (once there are homes).
 *
 * It refills a point every 6 minutes on the game's clock: a full bar of 10 in an hour of real
 * time, or a minute at the testing speed (TRAVEL.timeScale).
 */
export const ENERGY: EnergyRules = {
  start: 10,
  perLevel: 1,
  bed: 10,
  regenMinutes: 6,
  xpPerPoint: 1,
  exhaustedBonus: 5,
  xpFirstLevel: 600,
  xpGrowth: 1.5,
};
