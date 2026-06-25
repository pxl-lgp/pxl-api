export type PublishedEngagement = {
  publishedAt: Date | null;
  engagement: number;
};

export type BestTimeSlot = {
  weekday: number;
  weekdayLabel: string;
  hour: number;
  avgEngagement: number;
  sampleSize: number;
};

export type BestTimeResult = {
  sampleSize: number;
  topSlots: BestTimeSlot[];
  bestHours: Array<{ hour: number; avgEngagement: number; sampleSize: number }>;
  bestWeekdays: Array<{
    weekday: number;
    weekdayLabel: string;
    avgEngagement: number;
    sampleSize: number;
  }>;
  note: string;
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Computes best-time-to-post suggestions from a client's historical published
 * content engagement (Workflow Study §9). Pure and timezone-naive: it reads the
 * Date's local hour/weekday, so callers should pass dates already in the agency's
 * timezone if that matters. Returns empty suggestions (with a note) when there is
 * not enough history yet.
 */
export function computeBestTimes(rows: PublishedEngagement[]): BestTimeResult {
  const valid = rows.filter(
    (row): row is { publishedAt: Date; engagement: number } => row.publishedAt != null,
  );

  if (valid.length < 3) {
    return {
      sampleSize: valid.length,
      topSlots: [],
      bestHours: [],
      bestWeekdays: [],
      note: 'Not enough published history yet — publish a few more posts to unlock best-time suggestions.',
    };
  }

  const slotBuckets = new Map<string, { weekday: number; hour: number; values: number[] }>();
  const hourBuckets = new Map<number, number[]>();
  const weekdayBuckets = new Map<number, number[]>();

  for (const row of valid) {
    const weekday = row.publishedAt.getDay();
    const hour = row.publishedAt.getHours();
    const slotKey = `${weekday}-${hour}`;

    const slot = slotBuckets.get(slotKey) ?? { weekday, hour, values: [] };
    slot.values.push(row.engagement);
    slotBuckets.set(slotKey, slot);

    hourBuckets.set(hour, [...(hourBuckets.get(hour) ?? []), row.engagement]);
    weekdayBuckets.set(weekday, [...(weekdayBuckets.get(weekday) ?? []), row.engagement]);
  }

  const topSlots: BestTimeSlot[] = [...slotBuckets.values()]
    .map((slot) => ({
      weekday: slot.weekday,
      weekdayLabel: WEEKDAY_LABELS[slot.weekday],
      hour: slot.hour,
      avgEngagement: average(slot.values),
      sampleSize: slot.values.length,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  const bestHours = [...hourBuckets.entries()]
    .map(([hour, values]) => ({ hour, avgEngagement: average(values), sampleSize: values.length }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  const bestWeekdays = [...weekdayBuckets.entries()]
    .map(([weekday, values]) => ({
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      avgEngagement: average(values),
      sampleSize: values.length,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  return {
    sampleSize: valid.length,
    topSlots,
    bestHours,
    bestWeekdays,
    note: `Based on ${valid.length} published post(s).`,
  };
}
