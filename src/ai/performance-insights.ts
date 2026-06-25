export type PerformanceMetrics = {
  reach?: number;
  impressions?: number;
  engagement?: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  followersGained?: number;
};

export type PerformanceInput = {
  clientName: string;
  contentTitle?: string;
  platform?: string;
  contentType?: string;
  metrics: PerformanceMetrics;
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

/**
 * Deterministic, human-reviewed performance summary used as the AI fallback (and
 * unit-tested on its own). Turns raw analytics metrics into plain-English insights
 * and concrete recommendations. No external calls, no randomness.
 */
export function summarizePerformance(input: PerformanceInput): string {
  const m = input.metrics;
  const reach = m.reach ?? 0;
  const impressions = m.impressions ?? 0;
  const engagement = m.engagement ?? 0;
  const clicks = m.clicks ?? 0;
  const saves = m.saves ?? 0;
  const followersGained = m.followersGained ?? 0;

  const engagementRate = rate(engagement, reach);
  const ctr = rate(clicks, impressions);
  const saveRate = rate(saves, reach);
  const subject = input.contentTitle ?? 'this content';

  const lines = [
    `Performance summary for ${subject} (${input.clientName}):`,
    `- Reach ${reach.toLocaleString()}, impressions ${impressions.toLocaleString()}.`,
    `- Engagement rate: ${engagementRate.toFixed(1)}% (${engagement.toLocaleString()} interactions).`,
    `- Click-through rate: ${ctr.toFixed(1)}%.`,
    `- Save rate: ${saveRate.toFixed(1)}%; ${followersGained} new followers.`,
  ];

  const recommendations: string[] = [];

  if (reach === 0 && impressions === 0) {
    recommendations.push('No reach yet — confirm the post is published and metrics are captured.');
  } else {
    if (engagementRate < 2) {
      recommendations.push(
        'Engagement is low — test a stronger hook and a clearer call to action.',
      );
    } else if (engagementRate > 6) {
      recommendations.push('Strong engagement — repurpose this angle into more formats.');
    }

    if (impressions > 0 && ctr < 1) {
      recommendations.push('Low click-through — make the offer or link more prominent.');
    }

    if (saveRate > 3) {
      recommendations.push('High save rate — followers find this useful; build it into a series.');
    }

    if (followersGained <= 0) {
      recommendations.push('No follower growth — add a follow prompt and on-profile value.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Metrics are healthy — keep the current content direction.');
  }

  return [...lines, '', 'Recommendations:', ...recommendations.map((item) => `- ${item}`)].join(
    '\n',
  );
}
