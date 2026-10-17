import type { ItemKind } from '../engine/types';

/**
 * How the inventory names each kind of item and what goes in it, in the order it lists them.
 * The kinds follow how the Cyberpunk Wiki sorts 2077's items; the hints are ours.
 */
export const ITEM_KINDS: Record<ItemKind, { label: string; hint: string }> = {
  weapon: { label: 'Weapons', hint: 'Guns, blades, blunt weapons and throwables.' },
  ammo: { label: 'Ammo', hint: 'Rounds, loose by the box: handgun, shotgun, heavy and sniper.' },
  attachment: { label: 'Attachments & mods', hint: 'Scopes, muzzles and weapon mods.' },
  cyberware: { label: 'Cyberware', hint: 'Implants, waiting on a ripperdoc to fit them.' },
  quickhack: { label: 'Quickhacks', hint: 'Programs for a cyberdeck.' },
  clothing: { label: 'Clothing', hint: 'Head, face, torso, legs and feet.' },
  consumable: { label: 'Consumables', hint: 'Meds, food, drinks and booze.' },
  shard: { label: 'Shards', hint: 'Datashards: notes, articles and recordings.' },
  credchip: { label: 'CredChips', hint: 'Eddies on a chip: spent where transfers are taken, or banked. A stolen one wants chopping first.' },
  junk: { label: 'Junk', hint: "Taken off someone: only a fence (a pawn shop, a junk shop) will buy it, and it doesn't ask." },
  component: { label: 'Components', hint: 'Parts for crafting.' },
};
