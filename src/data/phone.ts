import type { PhoneRules } from '../engine/phone';

/**
 * The holophone (all ours but the thing itself, the 2077 holophone). A friend picks up nine
 * calls in ten, a stranger whose holo the player somehow has half, someone cold one in five;
 * at work, two thirds of that; in the small hours, a third; calling back within ten minutes,
 * half again and a point of rapport. The one the player is seeing picks up almost always.
 *
 * A text is answered in two to forty minutes (on the streets' clock), by friends nearly always
 * and the cold one time in four, and is worth half what the same said face to face. Three texts
 * without an answer is enough: each one more costs a point of rapport and gets nothing. A call
 * that rang out gets a text back a third as often as a text would.
 *
 * Contacts text first now and then: a friend about every four days, someone warm every eight,
 * the one the player is seeing about once a day; the chatty half as often again, the quiet half
 * as often; never within six hours of the last word either way.
 */
export const PHONE: PhoneRules = {
  answer: {
    stance: { hostile: 0, cold: 0.2, wary: 0.35, neutral: 0.5, warm: 0.75, friend: 0.9 },
    busy: 0.65,
    late: 0.35,
    seeing: 0.95,
    again: { minutes: 10, by: 0.5, rapport: 1 },
  },
  reply: {
    minutes: [2, 40],
    stance: { hostile: 0, cold: 0.25, wary: 0.45, neutral: 0.6, warm: 0.85, friend: 0.95 },
    worth: 0.5,
    waiting: 3,
    pester: 1,
    missed: 0.33,
  },
  reach: {
    stance: { hostile: 0, cold: 0, wary: 0.02, neutral: 0.05, warm: 0.12, friend: 0.25 },
    chatty: 1,
    seeing: 0.9,
    quietHours: 6,
    everyMinutes: 60,
  },
  keep: 40,
  lines: {
    call: ['You holo {who}.', 'You put a call through to {who}.', 'You ping {who} on the holo.'],
    noAnswer: ['It rings out.', 'No answer.', 'It rings and rings. Nothing.', 'Straight to the holo\'s message tone.'],
    declined: ['{Who} declines the call.', 'The call cuts off on the second ring: {who} declined it.'],
    dead: ['The number is dead: no ring, nothing.', 'The holo says the number is out of service.'],
    hangUp: ['{Who} hangs up.', 'The line goes quiet: {who} is gone.'],
    text: ['{who}: {text}'],
  },
};
