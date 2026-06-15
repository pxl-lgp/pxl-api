export const socialPlatforms = ['FACEBOOK_PAGE', 'INSTAGRAM'] as const;

export type SocialPlatform = (typeof socialPlatforms)[number];

export function normalizeSocialPlatforms(
  platforms: SocialPlatform[] | undefined,
  legacyPlatform?: string | null,
): SocialPlatform[] {
  if (platforms?.length) {
    return [...new Set(platforms)];
  }

  const normalized = legacyPlatform?.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const results: SocialPlatform[] = [];

  if (
    normalized.includes('facebook') ||
    normalized === 'fb' ||
    normalized.startsWith('fb.')
  ) {
    results.push('FACEBOOK_PAGE');
  }

  if (normalized.includes('instagram')) {
    results.push('INSTAGRAM');
  }

  return results;
}

export function formatLegacyPlatform(platforms: SocialPlatform[]): string | undefined {
  if (platforms.length === 0) {
    return undefined;
  }

  return platforms
    .map((platform) => (platform === 'FACEBOOK_PAGE' ? 'Facebook Page' : 'Instagram'))
    .join(', ');
}
