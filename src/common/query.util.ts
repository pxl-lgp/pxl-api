/**
 * Turns a free-text search term into a safe SQL `ILIKE` pattern.
 *
 * Returns `undefined` for empty/blank input (so callers can skip the filter),
 * and escapes the LIKE wildcards (`%`, `_`) and the escape char (`\`) so user
 * input is matched literally instead of acting as a wildcard.
 */
export function normalizeSearchTerm(term: string | undefined | null): string | undefined {
  const trimmed = term?.trim();

  if (!trimmed) {
    return undefined;
  }

  const escaped = trimmed.replace(/[\\%_]/g, (char) => `\\${char}`);

  return `%${escaped}%`;
}
