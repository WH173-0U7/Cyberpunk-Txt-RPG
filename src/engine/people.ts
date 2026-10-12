import type { Dish } from './food';
import { createRng, type Rng } from './rng';
import type { Building, Location, World } from './types';

/**
 * The people of a city: made up for each seed, from the districts' communities, and living
 * their own lives on the clock. Everyone has a home, a job (or a gang), family, friends,
 * a favorite dish and a place they go in the evening, so they can be found, and so that
 * what happens to one of them matters to the others (see society.ts).
 */
export type Pronouns = 'he' | 'she' | 'they';

export interface NamePool {
  masculine: string[];
  feminine: string[];
  family: string[];
}

export interface GangContent {
  id: string;
  name: string;
  /** One of them, e.g. "Valentino". */
  member: string;
  /** How to tell one on sight. */
  look: string;
  roles: string[];
  /** Gangs they fight. */
  rivals: string[];
}

export interface PeopleContent {
  names: Record<string, NamePool>;
  /** Weighted name pools by district: who lives there. */
  backgrounds: Record<string, Array<[string, number]>>;
  /** For districts not listed. */
  fallbackBackground: string;
  gangs: Record<string, GangContent>;
  /** Which gangs run each district, and roughly how many of them turn up. */
  turf: Record<string, Array<[string, number]>>;
  roles: {
    /** By business id, then by category, then by building kind. */
    business: Record<string, string[]>;
    category: Record<string, string[]>;
    kind: Record<string, string[]>;
    /** Work with no address. */
    freelance: string[];
  };
  /** Residents per district on top of the people its storefronts employ. */
  residents: [number, number];
  /** Kinds of place people go to in the evening. */
  hangouts: string[];
  /** One line each, picked by a person's strongest trait. */
  traitLines: Record<keyof Traits, { high: string; low: string }>;
}

export interface Traits {
  warmth: number;
  temper: number;
  loyalty: number;
  greed: number;
  courage: number;
  chatty: number;
}

/** Somewhere a person can be found: a building, or a place. */
export type Spot = { kind: 'building'; id: string } | { kind: 'location'; id: string };

export interface Person {
  id: string;
  name: string;
  given: string;
  family: string;
  pronouns: Pronouns;
  age: number;
  district: string;
  /** The building they live in (null: somewhere out of the way). */
  home: string | null;
  job: { role: string; building: string | null };
  gang: string | null;
  traits: Traits;
  likes: { dish: string; drink: string; hangout: Spot | null };
  /** A gang they can't stand, if any. */
  hates: string | null;
  /** Eddies on them, for anyone who takes them. */
  eddies: number;
  bio: string;
}

export type TieKind = 'spouse' | 'sibling' | 'cousin' | 'parent' | 'child' | 'uncle' | 'nephew' | 'kin' | 'friend' | 'crew' | 'coworker';

/** `to` is `from`'s `kind`: their parent, their friend. Stored both ways (the parent's side says "child"). */
export interface Tie {
  from: string;
  to: string;
  kind: TieKind;
}

export interface Population {
  people: Person[];
  ties: Tie[];
}

/** The time of day the schedules run on. */
export interface Clock {
  /** 0–23. */
  hour: number;
  /** 0 (Sunday) – 6. */
  weekday: number;
  /** Days since 1970, by this clock. */
  day: number;
}

const DAY = 86_400_000;

/** The phone's local time. */
export function localClock(now: number): Clock {
  const d = new Date(now);
  return { hour: d.getHours(), weekday: d.getDay(), day: Math.floor((now - d.getTimezoneOffset() * 60_000) / DAY) };
}

const WORK_KINDS = new Set(['tower', 'factory', 'warehouse']);
/** What `from` is to `to`, given what `to` is to `from`. */
export const INVERSE: Record<TieKind, TieKind> = {
  spouse: 'spouse',
  sibling: 'sibling',
  cousin: 'cousin',
  parent: 'child',
  child: 'parent',
  uncle: 'nephew',
  nephew: 'uncle',
  kin: 'kin',
  friend: 'friend',
  crew: 'crew',
  coworker: 'coworker',
};

export function generatePeople(world: World, content: PeopleContent, dishes: Dish[]): Population {
  const rng = createRng(`${world.seed}:people`);
  const people: Person[] = [];
  const ties: Tie[] = [];
  const names = new Set<string>();
  const tied = new Set<string>();
  /** Ties `a` to `b`: `b` is `a`'s `kind`. Once per pair. */
  const tie = (a: Person, b: Person, kind: TieKind) => {
    if (a.id === b.id) return;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (tied.has(key)) return;
    tied.add(key);
    ties.push({ from: a.id, to: b.id, kind }, { from: b.id, to: a.id, kind: INVERSE[kind] });
  };
  const gangsHere = new Set(Object.keys(world.districts).flatMap((d) => (content.turf[d] ?? []).map(([g]) => g)));
  const byDistrict = new Map<string, Person[]>();

  for (const district of Object.values(world.districts)) {
    const buildings = world.buildings.filter((b) => b.district === district.id);
    const homes = buildings.filter((b) => b.category === 'residential');
    const storefronts = buildings.filter((b) => b.business);
    const workplaces = buildings.filter((b) => !b.business && WORK_KINDS.has(b.kind));
    const hangouts = hangoutsIn(world, district.id, content);
    const locals: Person[] = [];
    /** A person with no name yet: that comes with their family. */
    const make = (job: Person['job'], gang: string | null): Person => {
      const age = gang ? rng.int(18, 40) : job.building ? rng.int(19, 62) : rng.int(18, 70);
      const traits = makeTraits(rng, gang, job);
      const person: Person = {
        id: '',
        name: '',
        given: '',
        family: '',
        pronouns: rng.chance(0.1) ? 'they' : rng.chance(0.5) ? 'she' : 'he',
        age,
        district: district.id,
        home: homes.length ? rng.pick(homes).id : null,
        job,
        gang,
        traits,
        likes: { dish: pickDish(rng, dishes, district.id, 'food'), drink: pickDish(rng, dishes, district.id, gang ? 'alcohol' : 'drink'), hangout: null },
        hates: null,
        eddies: 0,
        bio: '',
      };
      people.push(person);
      locals.push(person);
      return person;
    };

    // Everyone who works in a storefront.
    for (const b of storefronts) {
      const roles = rolesFor(b, content);
      const count = rng.chance(0.4) ? 2 : 1;
      for (let i = 0; i < count; i++) make({ role: roles[Math.min(i, roles.length - 1)] ?? 'works here', building: b.id }, null);
    }
    // The neighborhood: people with other jobs, or none to speak of.
    const residents = rng.int(content.residents[0], content.residents[1]);
    for (let i = 0; i < residents; i++) {
      const place = workplaces.length && rng.chance(0.55) ? rng.pick(workplaces) : null;
      const role = place ? rng.pick(content.roles.kind[place.kind] ?? content.roles.freelance) : rng.pick(content.roles.freelance);
      make({ role, building: place?.id ?? null }, null);
    }
    // The gangs that run the place.
    for (const [gangId, weight] of content.turf[district.id] ?? []) {
      const gang = content.gangs[gangId];
      if (!gang) continue;
      const count = Math.max(1, weight + rng.int(-1, 1));
      for (let i = 0; i < count; i++) make({ role: rng.pick(gang.roles), building: null }, gangId);
    }

    // Families, named together; then everyone else, named alone.
    const pools = content.backgrounds[district.id] ?? content.backgrounds[content.fallbackBackground] ?? [];
    const loose = rng.shuffle(locals);
    while (loose.length) {
      const size = loose.length >= 2 && rng.chance(0.6) ? Math.min(loose.length, rng.int(2, 4)) : 1;
      const family = loose.splice(0, size);
      const pool = content.names[pickWeighted(rng, pools) ?? content.fallbackBackground] ?? firstPool(content);
      const familyName = rng.pick(pool.family);
      for (const person of family) {
        person.family = familyName;
        const given = person.pronouns === 'he' ? pool.masculine : person.pronouns === 'she' ? pool.feminine : [...pool.masculine, ...pool.feminine];
        for (let tries = 0; tries < 40; tries++) {
          person.given = rng.pick(given);
          person.name = `${person.given} ${person.family}`;
          if (!names.has(person.name)) break;
        }
        // The same name twice in one city only if the pools have run dry; then a number tells them apart.
        if (names.has(person.name)) person.name = `${person.name} ${names.size}`;
        names.add(person.name);
        person.id = slug(person.name);
      }
      if (family.length > 1) relate(rng, family, tie);
    }

    // The rest of a life: friends, a hangout, grudges, a little money.
    for (const person of locals) {
      const others = locals.filter((p) => p !== person);
      const friends = rng.int(1, 2);
      for (let i = 0; i < friends && others.length; i++) tie(person, rng.pick(others), 'friend');
      const gang = person.gang ? content.gangs[person.gang] : null;
      const own = gang ? hangouts.filter((h) => h.kind === 'location' && world.locations[h.id]?.description.includes(gang.name)) : [];
      const options = own.length ? own : hangouts;
      person.likes.hangout = options.length && (gang || rng.chance(0.85)) ? rng.pick(options) : null;
      if (gang) person.hates = gang.rivals.find((r) => gangsHere.has(r)) ?? null;
      else if (rng.chance(0.35)) {
        const local = (content.turf[district.id] ?? []).map(([g]) => g);
        person.hates = local.length ? rng.pick(local) : null;
      }
      const corpo = person.job.building ? world.buildings.find((b) => b.id === person.job.building)?.kind === 'tower' : false;
      person.eddies = Math.round((corpo ? rng.int(60, 220) : gang ? rng.int(20, 90) : rng.int(8, 60)) * (0.7 + person.traits.greed * 0.6));
    }
    byDistrict.set(district.id, locals);
  }

  // Coworkers and crews know each other.
  for (const a of people) {
    for (const b of people) {
      if (a.id >= b.id) continue;
      if (a.job.building && a.job.building === b.job.building) tie(a, b, 'coworker');
      if (a.gang && a.gang === b.gang) tie(a, b, 'crew');
    }
  }
  // A few families and friendships reach across the city.
  const districts = [...byDistrict.values()].filter((l) => l.length > 0);
  for (let i = 0; i + 1 < districts.length; i++) {
    const here = districts[i] as Person[];
    const there = districts[i + 1] as Person[];
    tie(rng.pick(here), rng.pick(there), 'cousin');
    tie(rng.pick(here), rng.pick(there), 'friend');
  }
  for (const person of people) person.bio = describe(person, world, content, dishes);
  return { people, ties };
}

/** Everyone a person is tied to. */
export function tiesOf(population: Population, id: string): Tie[] {
  return population.ties.filter((t) => t.from === id);
}

export function personById(population: Population, id: string): Person | undefined {
  return population.people.find((p) => p.id === id);
}

/** Where a person is at a moment, and what they're doing there. Null when they're out on the streets somewhere. */
export function whereIs(person: Person, world: World, clock: Clock, dishes: Dish[]): { spot: Spot; doing: string } | null {
  const { hour, weekday, day } = clock;
  const rng = createRng(`${person.id}:${day}:${Math.floor(hour / 3)}`);
  const home: Spot | null = person.home ? { kind: 'building', id: person.home } : null;
  const work: Spot | null = person.job.building ? { kind: 'building', id: person.job.building } : null;
  const hangout = person.likes.hangout;
  const dayOff = createRng(`${person.id}:${day}:off`).chance(weekday === 0 || weekday === 6 ? 0.5 : 0.12);
  const at = (spot: Spot | null, doing: string) => (spot ? { spot, doing } : null);
  const outLate = person.gang ? 0.45 : person.traits.chatty * 0.3;

  if (hour < 6) return rng.chance(outLate) && hangout ? at(hangout, hangingOut(person, world, hangout, dishes)) : at(home, 'at home, asleep');
  if (hour < 9) return rng.chance(0.5) ? at(home, 'at home') : null;
  if (hour < 18) {
    if (work && !dayOff) return at(work, atWork(person));
    const roll = rng.next();
    if (roll < 0.35 && hangout) return at(hangout, hangingOut(person, world, hangout, dishes));
    if (roll < 0.7) return at(home, 'at home');
    return null;
  }
  if (hour < 23) {
    if (hangout && rng.chance(person.gang ? 0.8 : 0.6)) return at(hangout, hangingOut(person, world, hangout, dishes));
    return rng.chance(0.75) ? at(home, 'at home') : null;
  }
  return rng.chance(0.3) && hangout ? at(hangout, hangingOut(person, world, hangout, dishes)) : at(home, 'at home, asleep');
}

/** Everyone to be found at a spot right now. */
export function peopleAt(population: Population, world: World, spot: Spot, clock: Clock, dishes: Dish[]): Array<{ person: Person; doing: string }> {
  const found: Array<{ person: Person; doing: string }> = [];
  for (const person of population.people) {
    const where = whereIs(person, world, clock, dishes);
    if (where && where.spot.kind === spot.kind && where.spot.id === spot.id) found.push({ person, doing: where.doing });
  }
  return found;
}

export function gangOf(person: Person, content: PeopleContent): GangContent | null {
  return person.gang ? (content.gangs[person.gang] ?? null) : null;
}

/** Subject, object and possessive pronouns, and the verb ending that goes with them ("he eats", "they eat"). */
export function pronounsOf(person: Person): { he: string; him: string; his: string; s: string } {
  if (person.pronouns === 'she') return { he: 'she', him: 'her', his: 'her', s: 's' };
  if (person.pronouns === 'they') return { he: 'they', him: 'them', his: 'their', s: '' };
  return { he: 'he', him: 'him', his: 'his', s: 's' };
}

function atWork(person: Person): string {
  const role = person.job.role.toLowerCase();
  if (/cook|chef|grill/.test(role)) return 'at the stove';
  if (/counter|clerk|cashier|runs/.test(role)) return 'working the counter';
  if (/guard|watch|bouncer|security/.test(role)) return 'on watch';
  if (/doc|nurse|medic/.test(role)) return 'with a patient';
  return 'on shift';
}

function hangingOut(person: Person, world: World, spot: Spot, dishes: Dish[]): string {
  const place = spot.kind === 'location' ? world.locations[spot.id] : world.buildings.find((b) => b.id === spot.id);
  const kind = spot.kind === 'location' ? (place as Location | undefined)?.kind : (place as Building | undefined)?.category;
  const dish = dishes.find((d) => d.id === person.likes.dish)?.name ?? 'something';
  const drink = dishes.find((d) => d.id === person.likes.drink)?.name ?? 'a drink';
  if (person.gang && (kind === 'bar' || kind === 'club' || kind === 'nightlife')) return 'holding court';
  if (kind === 'bar' || kind === 'club' || kind === 'nightlife' || kind === 'pachinko' || kind === 'entertainment') return `nursing a ${drink}`;
  if (kind === 'noodle' || kind === 'diner' || kind === 'restaurant' || kind === 'food') return `eating ${dish}`;
  if (kind === 'market') return 'browsing the stalls';
  return 'killing time';
}

function hangoutsIn(world: World, district: string, content: PeopleContent): Spot[] {
  const kinds = new Set(content.hangouts);
  const places: Spot[] = Object.values(world.locations)
    .filter((l) => l.district === district && kinds.has(l.kind))
    .map((l) => ({ kind: 'location', id: l.id }));
  const shops: Spot[] = world.buildings
    .filter((b) => b.district === district && b.business && kinds.has(b.category))
    .map((b) => ({ kind: 'building', id: b.id }));
  return [...places, ...shops];
}

function rolesFor(building: Building, content: PeopleContent): string[] {
  return (building.business && content.roles.business[building.business]) || content.roles.category[building.category] || content.roles.kind[building.kind] || content.roles.freelance;
}

function makeTraits(rng: Rng, gang: string | null, job: Person['job']): Traits {
  const t = () => Math.round(rng.range(0.1, 0.9) * 100) / 100;
  const traits: Traits = { warmth: t(), temper: t(), loyalty: t(), greed: t(), courage: t(), chatty: t() };
  const clamp = (v: number) => Math.round(Math.min(0.95, Math.max(0.05, v)) * 100) / 100;
  if (gang) {
    traits.courage = clamp(traits.courage + 0.2);
    traits.temper = clamp(traits.temper + 0.15);
    traits.loyalty = clamp(traits.loyalty + 0.15);
  }
  if (/analyst|manager|executive|consultant/.test(job.role)) {
    traits.greed = clamp(traits.greed + 0.2);
    traits.warmth = clamp(traits.warmth - 0.1);
  }
  return traits;
}

function pickDish(rng: Rng, dishes: Dish[], district: string, kind: Dish['kind']): string {
  const pool = dishes.filter((d) => d.kind === kind && d.on.length > 0);
  const weighted = pool.flatMap((d) => (d.favored?.includes(district) ? [d, d, d] : [d]));
  return weighted.length ? rng.pick(weighted).id : '';
}

function pickWeighted(rng: Rng, options: Array<[string, number]>): string | null {
  const total = options.reduce((sum, [, w]) => sum + w, 0);
  if (!total) return null;
  let roll = rng.next() * total;
  for (const [id, w] of options) {
    roll -= w;
    if (roll < 0) return id;
  }
  return options[options.length - 1]?.[0] ?? null;
}

function firstPool(content: PeopleContent): NamePool {
  const pool = Object.values(content.names)[0];
  if (!pool) throw new Error('No name pools');
  return pool;
}

/**
 * Who is what to whom in a family, by their ages: the eldest and, often, a partner near
 * their age; anyone a generation younger is their child (and the children siblings); anyone
 * else is the eldest's sibling, an in-law to the partner and an aunt or uncle to the children.
 */
function relate(rng: Rng, family: Person[], tie: (a: Person, b: Person, kind: TieKind) => void): void {
  const byAge = [...family].sort((a, b) => b.age - a.age);
  const [eldest, second] = byAge;
  if (!eldest || !second) return;
  const couple = eldest.age - second.age <= 12 && second.age >= 23 && rng.chance(0.75);
  const parents = couple ? [eldest, second] : [eldest];
  if (couple) tie(eldest, second, 'spouse');
  const youngestParent = Math.min(...parents.map((p) => p.age));
  const children: Person[] = [];
  const siblings: Person[] = [];
  for (const person of byAge.slice(parents.length)) (youngestParent - person.age >= 18 ? children : siblings).push(person);
  for (const child of children) for (const parent of parents) tie(child, parent, 'parent');
  for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) tie(children[i] as Person, children[j] as Person, 'sibling');
  for (const sibling of siblings) {
    tie(sibling, eldest, rng.chance(0.8) ? 'sibling' : 'cousin');
    if (couple) tie(sibling, second, 'kin');
    for (const child of children) tie(child, sibling, 'uncle');
  }
  for (let i = 0; i < siblings.length; i++) for (let j = i + 1; j < siblings.length; j++) tie(siblings[i] as Person, siblings[j] as Person, rng.chance(0.8) ? 'sibling' : 'cousin');
}

function describe(person: Person, world: World, content: PeopleContent, dishes: Dish[]): string {
  const gang = gangOf(person, content);
  const place = person.job.building ? world.buildings.find((b) => b.id === person.job.building) : undefined;
  const work = gang ? `${gang.name} ${person.job.role}` : place ? `${capitalize(person.job.role)} at ${place.name}` : capitalize(person.job.role);
  const strongest = (Object.entries(person.traits) as Array<[keyof Traits, number]>).sort((a, b) => Math.abs(b[1] - 0.5) - Math.abs(a[1] - 0.5))[0];
  const line = strongest ? (strongest[1] >= 0.5 ? content.traitLines[strongest[0]].high : content.traitLines[strongest[0]].low) : '';
  const dish = dishes.find((d) => d.id === person.likes.dish)?.name;
  return `${work}, ${person.age}. ${line}${dish ? ` Never says no to ${dish}.` : ''}`.trim();
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
