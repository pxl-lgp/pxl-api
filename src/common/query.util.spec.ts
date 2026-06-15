import { normalizeSearchTerm } from './query.util';

describe('normalizeSearchTerm', () => {
  it('returns undefined for empty or blank input', () => {
    expect(normalizeSearchTerm(undefined)).toBeUndefined();
    expect(normalizeSearchTerm(null)).toBeUndefined();
    expect(normalizeSearchTerm('')).toBeUndefined();
    expect(normalizeSearchTerm('   ')).toBeUndefined();
  });

  it('wraps a trimmed term in wildcards', () => {
    expect(normalizeSearchTerm('promo')).toBe('%promo%');
    expect(normalizeSearchTerm('  reel  ')).toBe('%reel%');
  });

  it('escapes LIKE wildcards so they are matched literally', () => {
    expect(normalizeSearchTerm('50%_off')).toBe('%50\\%\\_off%');
    expect(normalizeSearchTerm('a\\b')).toBe('%a\\\\b%');
  });
});
