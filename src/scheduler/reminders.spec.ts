import { HOUR_MS, shouldRemind } from './reminders';

const now = new Date('2026-06-15T12:00:00.000Z');

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR_MS);
}

describe('shouldRemind', () => {
  it('does not remind for items younger than the stale threshold', () => {
    expect(shouldRemind({ createdAt: hoursAgo(2), lastReminderAt: null }, now)).toBe(false);
  });

  it('reminds a stale item that has never been reminded', () => {
    expect(shouldRemind({ createdAt: hoursAgo(30), lastReminderAt: null }, now)).toBe(true);
  });

  it('does not re-remind within the reminder interval', () => {
    expect(shouldRemind({ createdAt: hoursAgo(48), lastReminderAt: hoursAgo(5) }, now)).toBe(false);
  });

  it('re-reminds once the interval has elapsed', () => {
    expect(shouldRemind({ createdAt: hoursAgo(72), lastReminderAt: hoursAgo(25) }, now)).toBe(true);
  });

  it('respects custom thresholds', () => {
    expect(shouldRemind({ createdAt: hoursAgo(3), lastReminderAt: null }, now, 2 * HOUR_MS)).toBe(
      true,
    );
    expect(shouldRemind({ createdAt: hoursAgo(1), lastReminderAt: null }, now, 2 * HOUR_MS)).toBe(
      false,
    );
  });
});
