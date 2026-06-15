export const HOUR_MS = 60 * 60 * 1000;

// An item is "stale" once it has waited this long without action, and is
// re-flagged at most once per interval so the team is reminded but not spammed.
export const STALE_AFTER_MS = 24 * HOUR_MS;
export const REMINDER_INTERVAL_MS = 24 * HOUR_MS;

export type Remindable = {
  createdAt: Date;
  lastReminderAt: Date | null;
};

/**
 * Decides whether a still-open item (a pending approval, an un-contacted lead)
 * should trigger a reminder now: it must be older than the stale threshold, and
 * either never reminded or last reminded longer than the interval ago.
 */
export function shouldRemind(
  item: Remindable,
  now: Date,
  staleAfterMs: number = STALE_AFTER_MS,
  reminderIntervalMs: number = REMINDER_INTERVAL_MS,
): boolean {
  const age = now.getTime() - item.createdAt.getTime();

  if (age < staleAfterMs) {
    return false;
  }

  if (!item.lastReminderAt) {
    return true;
  }

  return now.getTime() - item.lastReminderAt.getTime() >= reminderIntervalMs;
}
