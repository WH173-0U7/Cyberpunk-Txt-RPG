import type { HackContent, QuickhackKind } from '../engine/combat';
import type { Quality } from '../engine/food';

/**
 * Quickhacks: programs a cyberdeck runs on someone. Every one is a real 2077 quickhack checked
 * against its page on the Cyberpunk Wiki: its name, its type (Combat or Control), the tier it's
 * first had at and its RAM cost there; each note says what its page says it does, in our
 * words. The wiki has netrunner vendors selling them, so here quickhack dealers do. The
 * covert ones (Ping, Bait, Memory Wipe…) do nothing in a fight, the ultimates cost more RAM
 * than any deck here has (22 and up), and Blackwall Gateway comes only on an iconic deck, so
 * they aren't here. What each does in a fight, the prices and the tier of store that stocks
 * each are ours.
 */

const STORE_TIER: Record<QuickhackKind['tier'], Quality> = { 1: 'poverty', 2: 'everyday', 3: 'luxury' };

function hack(name: string, type: QuickhackKind['type'], tier: QuickhackKind['tier'], ram: number, price: number, note: string, effect: QuickhackKind['effect']): QuickhackKind {
  return { name, type, tier, ram, quality: STORE_TIER[tier], price, note, effect };
}

export const HACKS: HackContent = {
  hacks: {
    // ── Combat
    'short-circuit': hack('Short Circuit', 'Combat', 1, 3, 300, 'A jolt through their chrome: plain damage, and worse for anything that is all machine.', { damage: [14, 22] }),
    overheat: hack('Overheat', 'Combat', 1, 3, 350, 'Sets them on fire from the inside: it burns for a while.', { damage: [4, 8], burn: { perBeat: 7, beats: 3 } }),
    contagion: hack('Contagion', 'Combat', 2, 5, 700, 'A virus that has their own cyberware leak poison into them, over and over.', { burn: { perBeat: 8, beats: 4 } }),
    'synapse-burnout': hack('Synapse Burnout', 'Combat', 3, 10, 1600, 'Burns out the nerves: heavy damage, and heavier the more RAM you have already spent.', { damage: [30, 42], burnout: true }),
    // ── Control
    'reboot-optics': hack('Reboot Optics', 'Control', 1, 2, 250, 'Restarts their optics: in a fight, they can barely aim for a while.', { blind: 2 }),
    'weapon-glitch': hack('Weapon Glitch', 'Control', 2, 3, 450, 'Jams their gun for a while. A blade it does nothing to.', { jam: 2 }),
    'cripple-movement': hack('Cripple Movement', 'Control', 2, 3, 450, 'Locks their legs and the chrome that moves them: no closing in, no getting away.', { cripple: 3 }),
    'cyberware-malfunction': hack('Cyberware Malfunction', 'Control', 2, 3, 500, "Knocks their chrome offline for a while: blades in the arms won't come out.", { chromeOff: 3 }),
  },
  stores: { 'quickhack-dealer': { up: true } },
  tiers: { poverty: ['poverty', 'everyday'], everyday: ['poverty', 'everyday'], luxury: ['everyday', 'luxury'] },
};
