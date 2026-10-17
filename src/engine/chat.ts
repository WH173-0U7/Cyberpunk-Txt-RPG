import type { Approach, Mood, Topic } from './dialogue';
import type { Traits } from './people';
import type { Stance } from './society';

/**
 * A conversation: talking to someone (any way in, `Approach`) is the opening, and after it the
 * player keeps it going a turn at a time, picking a reply, for as long as the other one is
 * interested. Interest starts from who they are and how they're doing (the chatty, the warm and
 * the friendly have more of it; the busy less), goes up with every reply they like and down
 * with every one they don't, and a little with each turn; at none they wrap it up. Goodbye ends
 * it on the player's side, and after a good one they may offer their holo. Pure: the numbers
 * and the lines are in `src/data/chat.ts`, and `Game` does it.
 */

/**
 * The player's replies: keep them talking (`more`), agree with them, tell them about
 * themselves (`share`), another joke or flirt (when that's how it started), comfort (after
 * asking how they're holding up, or when they're grieving or broke), ask for their holo, or
 * say goodbye.
 */
export type ChatMove = 'more' | 'agree' | 'share' | 'joke' | 'flirt' | 'comfort' | 'holo' | 'bye';

export const CHAT_MOVES: readonly ChatMove[] = ['more', 'agree', 'share', 'joke', 'flirt', 'comfort', 'holo', 'bye'];

/** A conversation going on: who with, how it started, what they last talked about, how interested they still are, and the replies so far. */
export interface Chat {
  with: string;
  approach: Approach;
  topic: Topic | null;
  interest: number;
  turns: number;
  /** When the last thing was said: a conversation left too long is over. */
  at: number;
  /** Over the holo: a call, not face to face. */
  remote: boolean;
  /** Where the player was when it started (a spot and a room): walking off ends one face to face. */
  where: string;
  /** How often each reply has been used, for the same thing again being worth less. */
  used: Partial<Record<ChatMove, number>>;
  /** Everything they made of the replies so far, added up: a good talk to say goodbye after. */
  warmth: number;
  /** Whether comfort fits: asked how they were holding up, or grieving, or broke. */
  comfort: boolean;
}

export interface ChatRules {
  interest: {
    /** Everyone's to start with, and more for the chatty and the warm (times their trait, 0 to 1). */
    base: number;
    chatty: number;
    warmth: number;
    stance: Record<Stance, number>;
    mood: Partial<Record<Mood, number>>;
    /** Times how they took the way in. */
    opening: number;
    /** Each turn uses this up; each point of a reply they liked adds `liked`, each point of one they didn't takes `disliked`. */
    perTurn: number;
    liked: number;
    disliked: number;
    /** Never more than this, and never past this many turns. */
    most: number;
    turns: number;
  };
  /** A reply's rapport: `turn`, and the reactions' as for a way in, the good of it fading by `fade` a turn. */
  rapport: { turn: number; fade: number };
  /** Each time a reply is used again in a conversation, past the times it's `free` (keeping someone going is never once), a point less of liking it. */
  same: number;
  free: Partial<Record<ChatMove, number>>;
  /** Left this long without a word (real minutes, on the test speed), a conversation is over. */
  idleMinutes: number;
  /** Asking for a holo: what it asks of them (`Asked` `holo`), and how much each point of interest makes it easier. Goodbye after this much warmth, they may offer theirs. */
  holo: { interest: number; offerAt: number };
}

/** How interested someone is in talking, to start with: their nature, how they feel about the player, what they're doing, and how they took the way in. */
export function interestOf(traits: Traits, stance: Stance, mood: Mood, opening: number, rules: ChatRules): number {
  const i = rules.interest;
  const start = i.base + traits.chatty * i.chatty + traits.warmth * i.warmth + i.stance[stance] + (i.mood[mood] ?? 0) + opening * i.opening;
  return Math.max(0, Math.min(i.most, start));
}

/** What's left of their interest after a reply they took as `score` (a reaction's, less what saying the same thing again costs). */
export function interestAfter(interest: number, score: number, rules: ChatRules): number {
  const i = rules.interest;
  const moved = interest - i.perTurn + (score > 0 ? score * i.liked : score * i.disliked);
  return Math.max(0, Math.min(i.most, moved));
}

/** The rapport a reply is worth: a little for keeping it going and what they made of it, the good of it fading the longer it goes; a bad one costs in full. */
export function replyRapport(score: number, turns: number, reactionRapport: number, rules: ChatRules): number {
  const raw = rules.rapport.turn + score * reactionRapport;
  return Math.round(raw > 0 ? raw * rules.rapport.fade ** turns : raw);
}

/** What saying the same thing again costs: a point a time past the free ones. */
export function samePenalty(move: ChatMove, used: number, rules: ChatRules): number {
  return Math.max(0, used - (rules.free[move] ?? 0)) * rules.same;
}

/** What the player can say next: always more, sharing and goodbye; agreeing once there's something to agree with; another joke or flirt when that's how it started; comfort when it fits; the holo when there's a phone and they're not in it yet. */
export function movesFor(chat: Chat, holo: boolean): ChatMove[] {
  const moves: ChatMove[] = ['more'];
  if (chat.topic || chat.turns > 0) moves.push('agree');
  moves.push('share');
  if (chat.approach === 'joke') moves.push('joke');
  if (chat.approach === 'flirt') moves.push('flirt');
  if (chat.comfort) moves.push('comfort');
  if (holo && !chat.remote) moves.push('holo');
  moves.push('bye');
  return moves;
}
