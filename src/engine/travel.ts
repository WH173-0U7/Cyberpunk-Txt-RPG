import { pathLength, pointAlong, streetRoute } from './streets';
import { rideBetween } from './transit';
import type { Leg, Point, Station, Trip, TripPlan, TravelMode, Whereabouts, World } from './types';

/** How long getting around takes and what it costs. All times are real minutes. */
export interface TravelRules {
  /**
   * How much faster than real time trips run. 1 is real time; anything higher is for testing,
   * so a trip that should take 20 minutes is over in seconds.
   */
  timeScale: number;
  /** Walking: minutes per map unit (a unit is roughly 80 m). */
  walkMinutesPerUnit: number;
  /** On the train. */
  rideMinutesPerUnit: number;
  /** Waiting on the platform for a train. */
  waitMinutes: number;
  /** Stopped at each station on the way. */
  stopMinutes: number;
  /** €$ per ride without a pass. */
  fare: number;
  passPrice: number;
  passDays: number;
  startingEddies: number;
  /** On foot, places this close to where you walk get discovered (map units). */
  discoverRadius: number;
}

/**
 * How to get somewhere. On foot: from any point, along the streets the whole way. By NCART:
 * only from the stop the player is standing at, waiting for a train and riding to the stop
 * nearest the destination (or the stop picked); the rest is up to the player's feet. Null
 * when that can't be done: not at a stop, no line there, or already at the nearest stop.
 */
export function planTrip(
  world: World,
  from: Point & { station?: string | null },
  to: Whereabouts,
  mode: TravelMode,
  rules: TravelRules,
): TripPlan | null {
  if (mode === 'foot') {
    const leg = walk(world, from, to, rules);
    return { mode, from: copy(from), to, legs: [leg], minutes: leg.minutes, fare: 0 };
  }

  const board = from.station ? world.transit.stations[from.station] : undefined;
  const alight = to.station ? world.transit.stations[to.station] : nearestStation(Object.values(world.transit.stations), to);
  if (!board || !alight || board.id === alight.id) return null;
  const ride = rideBetween(world.transit, board.id, alight.id);
  if (!ride) return null;

  const track = ride.map((id) => world.transit.stations[id]).filter((s): s is Station => Boolean(s));
  const trackPath = track.map((s) => ({ x: s.x, y: s.y }));
  const legs: Leg[] = [
    { kind: 'wait', path: [copy(board)], minutes: rules.waitMinutes },
    {
      kind: 'ride',
      path: trackPath,
      minutes: pathLength(trackPath) * rules.rideMinutesPerUnit + Math.max(0, ride.length - 2) * rules.stopMinutes,
      stations: ride,
    },
  ];
  return {
    mode,
    from: copy(board),
    to: { x: alight.x, y: alight.y, place: null, station: alight.id, building: null },
    legs,
    minutes: legs.reduce((sum, l) => sum + l.minutes, 0),
    fare: rules.fare,
  };
}

/** A plan set off at `now`. Real minutes become clock time, sped up by the test scale. */
export function startTrip(plan: TripPlan, now: number, rules: TravelRules): Trip {
  return { ...plan, startedAt: now, endsAt: now + Math.round((plan.minutes * 60_000) / rules.timeScale) };
}

/** Where a trip has got to by `now`: the point, which leg and how far through it, and how far through the whole trip (all 0–1). */
export function tripProgress(trip: Trip, now: number): { at: Point; leg: number; legDone: number; done: number } {
  const span = Math.max(1, trip.endsAt - trip.startedAt);
  const done = Math.min(1, Math.max(0, (now - trip.startedAt) / span));
  let minutes = done * trip.minutes;
  for (let i = 0; i < trip.legs.length; i++) {
    const leg = trip.legs[i];
    if (!leg) continue;
    const last = i === trip.legs.length - 1;
    if (minutes <= leg.minutes || last) {
      const t = leg.minutes > 0 ? Math.min(1, minutes / leg.minutes) : 1;
      return { at: pointAlong(leg.path, pathLength(leg.path) * t), leg: i, legDone: t, done };
    }
    minutes -= leg.minutes;
  }
  return { at: copy(trip.to), leg: Math.max(0, trip.legs.length - 1), legDone: 1, done };
}

/** How far into each walking leg the player has got by `now`, in map units. */
export function walkedSoFar(trip: Trip, now: number): Array<{ path: Point[]; distance: number }> {
  const span = Math.max(1, trip.endsAt - trip.startedAt);
  let minutes = Math.min(1, Math.max(0, (now - trip.startedAt) / span)) * trip.minutes;
  const walked: Array<{ path: Point[]; distance: number }> = [];
  for (const leg of trip.legs) {
    if (minutes <= 0) break;
    const share = leg.minutes > 0 ? Math.min(1, minutes / leg.minutes) : 1;
    if (leg.kind === 'walk') walked.push({ path: leg.path, distance: pathLength(leg.path) * share });
    minutes -= leg.minutes;
  }
  return walked;
}

function walk(world: World, from: Point, to: Point, rules: TravelRules): Leg {
  const path = streetRoute(world.layout, from, to);
  return { kind: 'walk', path, minutes: pathLength(path) * rules.walkMinutesPerUnit };
}

/** The station nearest a point, as the streets run (blocks across plus blocks down). */
function nearestStation(stations: Station[], p: Point): Station | null {
  return stations.reduce<Station | null>(
    (best, s) => (!best || Math.abs(s.x - p.x) + Math.abs(s.y - p.y) < Math.abs(best.x - p.x) + Math.abs(best.y - p.y) ? s : best),
    null,
  );
}

function copy(p: Point): Point {
  return { x: p.x, y: p.y };
}
