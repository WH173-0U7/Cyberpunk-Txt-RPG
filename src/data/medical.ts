import type { MedicalContent } from '../engine/medical';

/**
 * Medicine. The meds are the wiki's 2077 medication that heals and that its meds vendors sell:
 * the MaxDoc (Trauma Team's inhaler, health at once) and the Bounce Back (an injector, some at
 * once and more over a few seconds); the boosters do things the game doesn't have yet. Where
 * they're sold, and the street clinics, hospitals and ripperdocs that patch the player up, are
 * ours (the wiki has Viktor patching V up). Trauma Team's plans are its three 2077 premium
 * packages, Silver, Gold and Platinum: Platinum the fullest (surgery, and up to 90% off
 * prescriptions), the others cheaper with less to them. What each does here, and the prices,
 * are ours.
 */
export const MEDICAL: MedicalContent = {
  meds: {
    maxdoc: { name: 'MaxDoc', maker: 'Trauma Team', type: 'Inhaler', heal: 40, grams: 120, price: 60, note: "Trauma Team's inhaler: a breath of it and the health comes rushing back." },
    'bounce-back': { name: 'Bounce Back', type: 'Injector', heal: 15, regen: { perBeat: 8, beats: 4 }, grams: 80, price: 80, note: 'An injector: some health at once, and more coming back for a little while after.' },
  },
  stores: {
    pharmacy: { meds: true },
    'street-clinic': { meds: true, treats: true },
    hospital: { meds: true, treats: true, plans: true },
    ripperdoc: { treats: true },
  },
  perPoint: 2,
  treatment: { name: 'Treatment', note: 'Cleaned up, stitched and patched: back to full health, here and now.' },
  plans: {
    silver: { name: 'Silver Package', days: 30, price: 500, restore: 0.5, copay: 1, note: 'If you go down, an AV comes for you: they do what they can, drop you at the nearest hospital, and bill you for the treatment.' },
    gold: { name: 'Gold Package', days: 30, price: 1500, restore: 1, copay: 0.5, note: 'If you go down, an AV gets you out and you wake up whole at the nearest hospital, for half the bill.' },
    platinum: { name: 'Platinum Package', days: 30, price: 6000, restore: 1, copay: 0, medsOff: 0.9, note: 'The whole package: if you go down, you wake up whole and the bill is theirs; and 90% off meds at any counter.' },
  },
  blurbs: {
    hospital: 'A waiting room, a triage desk and doctors on shift: they treat what they can, sell meds over the counter, and sign you up with Trauma Team.',
    'street-clinic': 'A clinic in a storefront: a cot behind a curtain, a medtech who stitches what comes in, and meds on the shelf.',
    pharmacy: 'Meds behind the counter: inhalers and injectors for the next time it goes bad.',
  },
  labels: { luxury: 'Private care', everyday: 'Walk-in care', poverty: 'Cut-rate care' },
};
