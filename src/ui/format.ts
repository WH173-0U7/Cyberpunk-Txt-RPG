/** "Under a minute", "18 min", "1 h 05 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1 min';
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
}

/** A countdown: "0:42", "12:03", "1:02:03". */
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** How long a clock duration really is, for test-speed notes: "18 s", "3 min". */
export function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds} s`;
  return formatMinutes(seconds / 60);
}

/** A time of day on the 24-hour clock, as the header has it: "09:00". */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Weekdays (0 Sunday – 6 Saturday) as a roster says them: "Mon–Fri", "Thu, Fri, Sat", "Sat, Sun". */
export function formatDays(days: readonly number[]): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // The week from Monday, so a weekend reads Sat, Sun.
  const order = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const run = order.length > 3 && order.every((d, i) => i === 0 || d === ((order[i - 1] as number) + 1) % 7);
  return run ? `${names[order[0] as number]}–${names[order[order.length - 1] as number]}` : order.map((d) => names[d]).join(', ');
}

/** A short date in the game's calendar style: "Nov 11". */
export function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
