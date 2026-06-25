import { summarizePerformance } from './performance-insights';

describe('summarizePerformance', () => {
  it('computes engagement rate, CTR and save rate from metrics', () => {
    const output = summarizePerformance({
      clientName: 'Acme',
      contentTitle: 'June promo',
      metrics: {
        reach: 1000,
        impressions: 2000,
        engagement: 80,
        clicks: 40,
        saves: 50,
        followersGained: 5,
      },
    });

    expect(output).toContain('Engagement rate: 8.0%');
    expect(output).toContain('Click-through rate: 2.0%');
    expect(output).toContain('Save rate: 5.0%');
    expect(output).toContain('June promo');
  });

  it('recommends a stronger hook when engagement is low', () => {
    const output = summarizePerformance({
      clientName: 'Acme',
      metrics: { reach: 1000, impressions: 1000, engagement: 5, clicks: 30, followersGained: 2 },
    });

    expect(output).toMatch(/Engagement is low/);
  });

  it('praises strong engagement and recommends repurposing', () => {
    const output = summarizePerformance({
      clientName: 'Acme',
      metrics: { reach: 1000, impressions: 1000, engagement: 100, clicks: 30, followersGained: 10 },
    });

    expect(output).toMatch(/Strong engagement/);
  });

  it('handles missing/zero metrics without dividing by zero', () => {
    const output = summarizePerformance({ clientName: 'Acme', metrics: {} });

    expect(output).toContain('Engagement rate: 0.0%');
    expect(output).toMatch(/No reach yet/);
  });

  it('flags no follower growth', () => {
    const output = summarizePerformance({
      clientName: 'Acme',
      metrics: { reach: 500, impressions: 500, engagement: 20, clicks: 10, followersGained: 0 },
    });

    expect(output).toMatch(/No follower growth/);
  });
});
