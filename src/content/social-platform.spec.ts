import { formatLegacyPlatform, normalizeSocialPlatforms } from './social-platform';

describe('normalizeSocialPlatforms', () => {
  it('prefers the explicit platforms array and de-duplicates it', () => {
    expect(
      normalizeSocialPlatforms(['FACEBOOK_PAGE', 'FACEBOOK_PAGE', 'INSTAGRAM'], 'ignored'),
    ).toEqual(['FACEBOOK_PAGE', 'INSTAGRAM']);
  });

  it('returns an empty array when there is no platform information', () => {
    expect(normalizeSocialPlatforms(undefined, null)).toEqual([]);
    expect(normalizeSocialPlatforms([], '   ')).toEqual([]);
  });

  it('derives Facebook from common legacy spellings', () => {
    expect(normalizeSocialPlatforms(undefined, 'Facebook')).toEqual(['FACEBOOK_PAGE']);
    expect(normalizeSocialPlatforms(undefined, 'fb')).toEqual(['FACEBOOK_PAGE']);
    expect(normalizeSocialPlatforms([], 'FB.PAGE')).toEqual(['FACEBOOK_PAGE']);
  });

  it('derives Instagram and both platforms from legacy strings', () => {
    expect(normalizeSocialPlatforms(undefined, 'instagram')).toEqual(['INSTAGRAM']);
    expect(normalizeSocialPlatforms(undefined, 'Facebook & Instagram')).toEqual([
      'FACEBOOK_PAGE',
      'INSTAGRAM',
    ]);
  });
});

describe('formatLegacyPlatform', () => {
  it('returns undefined for an empty list', () => {
    expect(formatLegacyPlatform([])).toBeUndefined();
  });

  it('formats platforms into a human-readable label', () => {
    expect(formatLegacyPlatform(['FACEBOOK_PAGE'])).toBe('Facebook Page');
    expect(formatLegacyPlatform(['FACEBOOK_PAGE', 'INSTAGRAM'])).toBe('Facebook Page, Instagram');
  });
});
