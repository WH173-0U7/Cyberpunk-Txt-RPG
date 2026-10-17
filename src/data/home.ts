import type { HomeRules } from '../engine/home';

/**
 * The player's home (all ours). A unit is twice what a tenant pays a head in the same block, a
 * week at a time from the day it's taken; two weeks owed brings a warning, three and the player
 * is put out, and what they kept there goes out on the street with them. A block's stash takes
 * forty stacks and sixty kilos, a megabuilding's smaller unit thirty and forty-five, a squat
 * twenty and twenty-five, and one week in four somebody goes through a squat's and takes a third
 * of everything.
 */
export const HOME: HomeRules = {
  unit: 2,
  warnAt: 2,
  evictAt: 3,
  stash: {
    apartments: { slots: 40, maxGrams: 60_000 },
    megabuilding: { slots: 30, maxGrams: 45_000 },
    squat: { slots: 20, maxGrams: 25_000 },
  },
  squat: { raid: 0.25, take: 1 / 3 },
  lines: {
    rented: ['{room} at {place} is yours: {rent} €$ a week, the first paid. The key sticks, but it turns.', 'You sign for {room} at {place}. {rent} €$ a week, and the first week paid up front.', 'The keys to {room} at {place}, on a ring with a cartoon cat. {rent} €$ a week, starting now.'],
    squatted: ["You claim a corner of {place}. No rent, no bed, no lock worth the name. It's yours till someone says otherwise.", "{place} is home now, as far as anyone's going to stop you. Mind what you leave lying around.", 'You stake out a dry corner of {place}. Free, and worth about that.'],
    masked: ["Nobody's renting a room to a {mask}. Show your face, or find somewhere else.", "The super takes one look at the {mask} and shuts the window."],
    short: ["The first week's {rent} €$, up front. You haven't got it.", '{rent} €$ to move in, and you\'re short. Come back with it.'],
    paid: ['Rent paid on {room} at {place}: {rent} €$.', '{rent} €$ of rent gone to {place}. The lights stay on another week.'],
    behind: ["You couldn't make the rent at {place}: {owed} €$ owed now.", 'Short on the rent at {place}. You owe {owed} €$.'],
    warn: ["A notice taped to the door of {room}: {owed} €$ behind at {place}. Pay before the week's out, or you're out.", "Your landlord at {place} wants {owed} €$, and wants it this week. After that, the locks change."],
    evicted: ["You're out of {place}: {weeks} weeks behind, and the locks changed. What you kept there is on the street by now, and not for long.", "Evicted from {place}. Your things are gone with the key.", "{place} has changed the locks on you. {weeks} weeks behind, and everything in the stash gone with it."],
    raided: ['Somebody has been through your stash at {place}: {what} gone.', 'Your corner of {place} has been picked over. {what}, gone.'],
    movedOut: ['You hand back the keys to {room} at {place}.', 'You clear out of {place}. Somebody else\'s problem now.'],
    left: ['You give up {place} for the new place.', 'You hand back the keys to {place}: the new place is home now.'],
    full: ['No room left in the stash.', 'The stash is full: something has to come out first.'],
    clear: ['Take your things out of the stash at {place} first.', "Your stash at {place} isn't empty. Clear it out before you go."],
  },
};
