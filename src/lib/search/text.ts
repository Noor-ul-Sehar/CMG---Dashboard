/**
 * Shared text intelligence for search. Kept dependency-free so it can be used
 * by both server services and client components.
 */

const SYNONYM_GROUPS: string[][] = [
  ["ip", "infringement", "infringing", "counterfeit", "piracy", "fake"],
  ["trademark", "brand", "mark"],
  ["copyright", "copyrights"],
  ["case", "matter", "file", "reference"],
  ["target", "seller", "vendor", "supplier"],
  ["developer", "dev", "engineer", "programmer"],
  ["web", "website", "site"],
  ["open", "active", "new"],
  ["closed", "close", "completed", "done"],
  ["pending", "awaiting", "waiting"],
  ["review", "reviewed", "approval", "approve", "approved"],
  ["garment", "garments", "clothing", "apparel"],
  ["footwear", "shoe", "shoes"],
  ["cosmetic", "cosmetics", "beauty"],
  ["bag", "bags", "accessories"],
  ["investigation", "investigate", "investigated"],
  ["recordal", "recordals", "registration", "registered"],
];

const SYNONYM_LOOKUP = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    const others = group.filter((entry) => entry !== word);
    const existing = SYNONYM_LOOKUP.get(word) ?? [];
    SYNONYM_LOOKUP.set(word, Array.from(new Set([...existing, ...others])));
  }
}

/**
 * Lowercases, strips accents, collapses whitespace and reduces punctuation so
 * "  CMG/2024  -  0013 " and "cmg 2024 0013" behave consistently.
 * `%` and `_` are removed so user input can never act as a LIKE wildcard.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSearch(input: string): string[] {
  return normalizeSearchText(input)
    .split(" ")
    .filter((token) => token.length > 0);
}

/** Returns related words for a single token, capped to keep SQL bounded. */
export function synonymsFor(token: string): string[] {
  return (SYNONYM_LOOKUP.get(token) ?? []).slice(0, 4);
}

/**
 * Builds the per-term alternatives used by the search SQL. Each original term
 * is kept together with its synonyms; the caller must AND the groups and OR
 * the alternatives inside each group.
 */
export function buildSearchGroups(
  input: string
): { original: string[]; groups: string[][] } {
  const original = Array.from(new Set(tokenizeSearch(input))).slice(0, 8);
  const groups = original.map((term) =>
    Array.from(new Set([term, ...synonymsFor(term)])).slice(0, 5)
  );
  return { original, groups };
}

/** Levenshtein distance, used for client-side "Did you mean" ranking. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/**
 * Splits text into matching / non-matching segments for result highlighting.
 * Longer terms are matched first so multi-word terms win over their prefixes.
 */
export function highlightSegments(
  text: string,
  terms: string[]
): { text: string; match: boolean }[] {
  const cleaned = Array.from(
    new Set(
      terms
        .map((term) => normalizeSearchText(term))
        .filter((term) => term.length > 0)
    )
  ).sort((a, b) => b.length - a.length);
  if (cleaned.length === 0) return [{ text, match: false }];

  const pattern = new RegExp(`(${cleaned.map(escapeRegExp).join("|")})`, "gi");
  return text
    .split(pattern)
    .filter((part) => part.length > 0)
    .map((part) => ({ text: part, match: cleaned.includes(part.toLowerCase()) }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
