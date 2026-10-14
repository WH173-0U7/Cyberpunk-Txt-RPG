import type { SaveData } from '../engine/save';

/** The beta keeps a save of its own, so trying the next version never touches the stable game's. */
const KEY = __CHANNEL__ === 'beta' ? 'night-city-terminal/beta/save' : 'night-city-terminal/save';

/**
 * The one save on this device, kept in the browser's local storage. Storage can be missing or
 * full (private windows, cleared site data), so every call fails quietly and says whether it
 * worked: the game plays on either way.
 */
export const saveSlot = {
  /** Whatever was saved, unchecked; `readSave` decides if it's usable. */
  load(): unknown {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as unknown) : null;
    } catch {
      return null;
    }
  },

  write(save: SaveData): boolean {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
      return true;
    } catch {
      return false;
    }
  },

  /** Deletes the save from this device. */
  clear(): boolean {
    try {
      localStorage.removeItem(KEY);
      return true;
    } catch {
      return false;
    }
  },
};
