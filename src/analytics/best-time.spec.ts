import { computeBestTimes } from './best-time';

describe('computeBestTimes', () => {
  it('returns a not-enough-data note below the threshold', () => {
    const result = computeBestTimes([
      { publishedAt: new Date('2026-06-01T09:00:00'), engagement: 100 },
      { publishedAt: null, engagement: 50 },
    ]);

    expect(result.sampleSize).toBe(1);
    expect(result.topSlots).toHaveLength(0);
    expect(result.note).toMatch(/not enough/i);
  });

  it('ranks the highest-engagement slot first', () => {
    const result = computeBestTimes([
      { publishedAt: new Date('2026-06-01T09:00:00'), engagement: 10 },
      { publishedAt: new Date('2026-06-08T09:00:00'), engagement: 20 },
      { publishedAt: new Date('2026-06-02T18:00:00'), engagement: 500 },
      { publishedAt: new Date('2026-06-09T18:00:00'), engagement: 600 },
    ]);

    expect(result.sampleSize).toBe(4);
    expect(result.topSlots[0].hour).toBe(18);
    expect(result.bestHours[0].hour).toBe(18);
  });
});
