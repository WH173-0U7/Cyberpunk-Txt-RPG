import type { ItemKind } from '../engine/types';

/**
 * How the inventory names each kind of item and what goes in it, in the order it lists them.
 * The kinds follow how the Cyberpunk Wiki sorts 2077's items; the hints are ours.
 */
export const ITEM_KINDS: Record<ItemKind, { label: string; hint: string }> = {
  weapon: { label: 'Weapons', hint: 'Guns, blades, blunt weapons and throwables.' },
  attachment: { label: 'Attachments & mods', hint: 'Scopes, muzzles and weapon mods.' },
  cyberware: { label: 'Cyberware', hint: 'Implants, waiting on a ripperdoc to fit them.' },
  quickhack: { label: 'Quickhacks', hint: 'Programs for a cyberdeck.' },
  clothing: { label: 'Clothing', hint: 'Head, face, torso, legs and feet.' },
  consumable: { label: 'Consumables', hint: 'Meds, food, drinks and booze.' },
  shard: { label: 'Shards', hint: 'Datashards: notes, articles and recordings.' },
  junk: { label: 'Junk', hint: 'Worth a few eddies to a vendor or a drop point.' },
  component: { label: 'Components', hint: 'Parts for crafting.' },
};
