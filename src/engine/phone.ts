import type { Topic } from './dialogue';
import type { Stance } from './society';

/**
 * The player's holophone: the 2077 phone, neuralware reached through the neuroport, that
 * holocalls and texts (the wiki's holophone, from the Edgerunners Mission Kit). Everyone has
 * one; what the player has is the holos of the people who gave theirs (`contacts`), the texts
 * with each (`threads`), and what's on its way (`due`: their answers, and what they send first).
 *
 * A holocall is a conversation (chat.ts) at a distance: they pick up by how they feel about
 * the player and what they're doing (`answerOdds`): never asleep or hostile, less at work or
 * late, less again for the player calling back too soon. A text gets an answer later, by how
 * they feel; and now and then a contact texts first (`reachOdds`): the one the player is
 * seeing most, friends and the chatty more. Pure; the numbers and narration are in
 * `src/data/phone.ts`, and `Game` does it.
 */

/** What the player can text: hello, how they're holding up, what's the word, a joke, and (to the one they're seeing) that they're on their mind. */
export type TextKind = 'hey' | 'how' | 'word' | 'joke' | 'miss';

export const TEXT_KINDS: readonly TextKind[] = ['hey', 'how', 'word', 'joke', 'miss'];

/** Someone whose holo the player has: since when, and when they last heard from each other. */
export interface Contact {
  since: number;
  /** When the player last called or texted them, and when they last answered or texted. */
  lastOut?: number;
  lastIn?: number;
  /** When the player last called, and whether it rang out. */
  lastCall?: number;
  missed?: boolean;
  /** Texts from the player since they last answered one. */
  waiting?: number;
}

export interface Text {
  from: 'you' | 'them';
  text: string;
  at: number;
}

/** A text on its way to the player: an answer to one of theirs, a word after a missed call, or one they send first; what it does when it lands. */
export interface Due {
  from: string;
  text: string;
  at: number;
  kind: 'reply' | 'missed' | 'reach';
  rapport?: number;
  spark?: number;
  /** What they talked about in it, which the player then knows from them. */
  topic?: Topic | null;
}

export interface PhoneState {
  contacts: Record<string, Contact>;
  threads: Record<string, Text[]>;
  due: Due[];
  /** Texts not yet read, by contact. */
  unread: Record<string, number>;
  /** When contacts were last given the chance to text first. */
  checked: number;
}

export interface PhoneRules {
  /**
   * Picking up: the odds by stance; times `busy` at work, `late` in the small hours; the one the
   * player is seeing picks up by `seeing`. Calling back within `again.minutes` of the last call
   * is times `again.by`, and costs `again.rapport`.
   */
  answer: { stance: Record<Stance, number>; busy: number; late: number; seeing: number; again: { minutes: number; by: number; rapport: number } };
  /**
   * Texting back: in `minutes` (real minutes, on the test speed), by the odds for their stance;
   * a text is worth `worth` of what the same said face to face. More than `waiting` texts with
   * no answer and each costs `pester` rapport and gets none. A missed call is answered by text
   * at `missed` of those odds.
   */
  reply: { minutes: [number, number]; stance: Record<Stance, number>; worth: number; waiting: number; pester: number; missed: number };
  /**
   * Texting first: each contact's odds a day by stance, times `chatty` for the talkative, and
   * the one the player is seeing at `seeing`; never within `quietHours` of the last word either
   * way. Looked at every `everyMinutes` of the streets' clock.
   */
  reach: { stance: Record<Stance, number>; chatty: number; seeing: number; quietHours: number; everyMinutes: number };
  /** Texts kept a thread. */
  keep: number;
  lines: {
    /** The player calling (`{who}`), it ringing out, a decline, a dead number, the call dropped by them, a text in. */
    call: string[];
    noAnswer: string[];
    declined: string[];
    dead: string[];
    hangUp: string[];
    text: string[];
  };
}

export function freshPhone(): PhoneState {
  return { contacts: {}, threads: {}, due: [], unread: {}, checked: 0 };
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** The odds someone picks up a holocall from the player. */
export function answerOdds(stance: Stance, at: { busy: boolean; late: boolean; seeing: boolean; again: boolean }, rules: PhoneRules): number {
  const a = rules.answer;
  if (stance === 'hostile') return 0;
  let odds = at.seeing ? Math.max(a.seeing, a.stance[stance]) : a.stance[stance];
  if (at.busy) odds *= a.busy;
  if (at.late) odds *= a.late;
  if (at.again) odds *= a.again.by;
  return clamp(odds);
}

/** The odds someone answers a text: none past the texts the player has piled up unanswered. */
export function replyOdds(stance: Stance, waiting: number, rules: PhoneRules): number {
  if (stance === 'hostile' || waiting > rules.reply.waiting) return 0;
  return clamp(rules.reply.stance[stance]);
}

/** The odds a contact texts the player first, at one look (every `everyMinutes`). */
export function reachOdds(stance: Stance, chatty: number, seeing: boolean, rules: PhoneRules): number {
  const r = rules.reach;
  const perDay = (seeing ? Math.max(r.seeing, r.stance[stance]) : r.stance[stance]) * (1 + (chatty - 0.5) * r.chatty);
  return clamp((perDay * r.everyMinutes) / 1440);
}

/** A text added to a thread, the oldest falling off past `keep`. */
export function thread(state: PhoneState, id: string, text: Text, keep: number): void {
  const list = (state.threads[id] ??= []);
  list.push(text);
  if (list.length > keep) list.splice(0, list.length - keep);
}
