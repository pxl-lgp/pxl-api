export type LeadScoreBand = 'COLD' | 'WARM' | 'HOT';

export type LeadScore = {
  score: number;
  band: LeadScoreBand;
  reasons: string[];
};

export type ScoreableLead = {
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  message?: string | null;
};

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.com.ph',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'proton.me',
]);

// Buying-intent signals. Filipino/Taglish variants are included on purpose since
// the agency's leads are local (Workflow Study §11: lead qualification).
const INTENT_KEYWORDS = [
  'budget',
  'monthly',
  'retainer',
  'package',
  'contract',
  'urgent',
  'asap',
  'ready',
  'hire',
  'quote',
  'proposal',
  'magkano',
  'avail',
  'book',
];

/**
 * Deterministic, explainable lead-qualification score (0-100). Kept pure and
 * dependency-free so it is trivially unit-testable and stable across runs.
 */
export function scoreLead(lead: ScoreableLead): LeadScore {
  const reasons: string[] = [];
  let score = 30;
  reasons.push('Base score for a new inquiry (+30)');

  if (lead.phone && lead.phone.trim().length >= 7) {
    score += 15;
    reasons.push('Provided a phone number (+15)');
  }

  const message = lead.message?.trim() ?? '';
  if (message.length > 200) {
    score += 15;
    reasons.push('Wrote a detailed message (+15)');
  } else if (message.length > 40) {
    score += 8;
    reasons.push('Wrote a substantive message (+8)');
  }

  const lowerMessage = message.toLowerCase();
  const matchedKeywords = INTENT_KEYWORDS.filter((keyword) => lowerMessage.includes(keyword));
  if (matchedKeywords.length > 0) {
    const keywordPoints = Math.min(matchedKeywords.length * 8, 24);
    score += keywordPoints;
    reasons.push(`Buying-intent keywords (${matchedKeywords.join(', ')}) (+${keywordPoints})`);
  }

  const source = lead.source?.toLowerCase() ?? '';
  if (source.includes('referral')) {
    score += 15;
    reasons.push('Came from a referral (+15)');
  } else if (source.includes('website') || source.includes('form')) {
    score += 5;
    reasons.push('Came from the website form (+5)');
  }

  const domain = lead.email?.split('@')[1]?.toLowerCase().trim();
  if (domain && !FREE_EMAIL_DOMAINS.has(domain)) {
    score += 10;
    reasons.push('Used a business email domain (+10)');
  }

  score = Math.max(0, Math.min(100, score));
  const band: LeadScoreBand = score >= 70 ? 'HOT' : score >= 45 ? 'WARM' : 'COLD';

  return { score, band, reasons };
}
