import { CASE_STATUSES, APPROVAL_STATUSES } from "@/lib/constants";
import { query } from "@/lib/db/client";
import { buildCaseConditions, type CaseFilterOptions } from "@/lib/services/case-service";
import {
  buildSearchGroups,
  editDistance,
  normalizeSearchText,
  tokenizeSearch,
} from "@/lib/search/text";
import type {
  CaseListFilters,
  FacetCount,
  FilterFacets,
  SearchSuggestionCategory,
  SearchSuggestions,
} from "@/types";

const CANDIDATE_VALUES = `
  SELECT DISTINCT value FROM (
    SELECT brand AS value FROM cases WHERE brand IS NOT NULL AND brand <> ''
    UNION SELECT name FROM brands WHERE name <> ''
    UNION SELECT target_name FROM cases WHERE target_name IS NOT NULL AND target_name <> ''
    UNION SELECT name FROM target_by WHERE name <> ''
    UNION SELECT name FROM target_natures WHERE name <> ''
    UNION SELECT name FROM targets WHERE name <> ''
  ) candidate_values
`;

type FacetDefinition = {
  name: keyof FilterFacets;
  exclude: (keyof CaseListFilters)[];
  expression: string;
  join?: string;
};

const FACETS: FacetDefinition[] = [
  { name: "status", exclude: ["status", "statusIn"], expression: "c.status::text" },
  { name: "reportStatus", exclude: ["reportStatus"], expression: "c.report_status::text" },
  {
    name: "targetBy",
    exclude: ["targetBy"],
    expression: "c.target_by_id::text",
  },
  {
    name: "targetNature",
    exclude: ["targetNature"],
    expression: "COALESCE(c.target_nature, tn.name)",
    join: "LEFT JOIN target_natures tn ON tn.id = c.target_nature_id",
  },
  { name: "brand", exclude: ["brand", "brands"], expression: "c.brand" },
  { name: "caseType", exclude: ["caseType"], expression: "c.case_type" },
  { name: "investigator", exclude: ["investigator"], expression: "c.investigator_id::text" },
  { name: "team", exclude: ["team"], expression: "c.team_id::text" },
];

function prettyLabel(value: string): string {
  const known = [...CASE_STATUSES, ...APPROVAL_STATUSES].find(
    (entry) => entry.value === value
  );
  if (known) return known.label;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function facetLabel(
  name: keyof FilterFacets,
  value: string,
  options: CaseFilterOptions
): string {
  if (name === "targetBy") {
    return options.targetBy.find((entry) => String(entry.id) === value)?.name ?? value;
  }
  if (name === "investigator") {
    return options.investigators.find((entry) => String(entry.id) === value)?.name ?? value;
  }
  if (name === "team") {
    return options.teams.find((entry) => String(entry.id) === value)?.name ?? value;
  }
  return prettyLabel(value);
}

async function getFacetCounts(
  definition: FacetDefinition,
  filters: CaseListFilters,
  options: CaseFilterOptions
): Promise<FacetCount[]> {
  const reduced = { ...filters };
  for (const key of definition.exclude) {
    delete reduced[key];
  }
  const { conditions, params } = buildCaseConditions(reduced);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{ value: string | null; count: number }>(
    `SELECT ${definition.expression} AS value, count(*)::int AS count
     FROM cases c
     LEFT JOIN target_by tb ON tb.id = c.target_by_id
     ${definition.join ?? ""}
     ${where}
     GROUP BY value
     ORDER BY count DESC, value ASC
     LIMIT 12`,
    params
  );

  return rows
    .filter((row) => row.value !== null && row.value !== "")
    .map((row) => ({
      value: String(row.value),
      label: facetLabel(definition.name, String(row.value), options),
      count: Number(row.count),
    }));
}

async function getDidYouMean(queryText: string): Promise<string | null> {
  const rows = await query<{ value: string; score: number }>(
    `SELECT value, similarity(lower(value), $1) AS score
     FROM (${CANDIDATE_VALUES}) v
     WHERE similarity(lower(value), $1) > 0.38
     ORDER BY score DESC, lower(value) ASC
     LIMIT 3`,
    [queryText]
  );
  const candidate = rows.find(
    (row) => normalizeSearchText(row.value) !== normalizeSearchText(queryText)
  );
  return candidate?.value ?? null;
}

async function getRelatedKeywords(queryText: string): Promise<string[]> {
  const rows = await query<{ value: string }>(
    `SELECT lower(value) AS value
     FROM (${CANDIDATE_VALUES}) v
     WHERE similarity(lower(value), $1) > 0.12
     GROUP BY lower(value)
     ORDER BY max(similarity(lower(value), $1)) DESC, value ASC
     LIMIT 8`,
    [queryText]
  );
  return rows
    .map((row) => row.value)
    .filter((value) => value && value !== queryText)
    .slice(0, 6);
}

async function getCategories(
  queryText: string
): Promise<SearchSuggestionCategory[]> {
  const rows = await query<{
    type: SearchSuggestionCategory["type"];
    value: string;
    label: string;
    score: number;
  }>(
    `SELECT type, value, label, score FROM (
       SELECT 'brand'::text AS type, name AS value, name AS label,
              similarity(lower(name), $1) AS score
       FROM brands WHERE name <> ''
       UNION ALL
       SELECT 'targetNature', name, name, similarity(lower(name), $1)
       FROM target_natures WHERE name <> ''
       UNION ALL
       SELECT 'targetBy', id::text, name, similarity(lower(name), $1)
       FROM target_by WHERE name <> ''
     ) ranked
     WHERE score > 0.12
     ORDER BY score DESC, label ASC
     LIMIT 4`,
    [queryText]
  );

  const statusScores = [...CASE_STATUSES, ...APPROVAL_STATUSES].map((entry) => {
    const labelText = normalizeSearchText(entry.label);
    const distance = editDistance(queryText, labelText);
    return {
      type: "status" as const,
      value: entry.value,
      label: entry.label,
      score: Math.max(
        0,
        1 - distance / Math.max(queryText.length, labelText.length, 1)
      ),
    };
  });

  return [...rows, ...statusScores.filter((entry) => entry.score > 0.45)]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ type, value, label }) => ({ type, value, label }));
}

async function getPopularSearches(): Promise<string[]> {
  const rows = await query<{ value: string; weight: number }>(
    `SELECT value, sum(weight)::int AS weight FROM (
       SELECT brand AS value, 3 AS weight FROM cases
         WHERE brand IS NOT NULL AND brand <> ''
       UNION ALL
       SELECT b.name, 3 FROM case_brands cb JOIN brands b ON b.id = cb.brand_id
       UNION ALL
       SELECT COALESCE(c.target_nature, tn.name), 1 FROM cases c
         LEFT JOIN target_natures tn ON tn.id = c.target_nature_id
         WHERE COALESCE(c.target_nature, tn.name) IS NOT NULL
           AND COALESCE(c.target_nature, tn.name) <> ''
     ) weighted
     GROUP BY value
     ORDER BY weight DESC, value ASC
     LIMIT 6`
  );
  return rows.map((row) => row.value);
}

/**
 * Computes everything that makes search feel intelligent: typo suggestions,
 * real-data related terms, clickable categories, popular values and live
 * facet counts. All suggestions come from existing data or known constants.
 */
export async function getSearchIntelligence(
  filters: CaseListFilters,
  options: CaseFilterOptions
): Promise<{
  suggestions: SearchSuggestions;
  facets: FilterFacets;
  normalizedQuery: string;
  expandedTerms: string[];
}> {
  const queryText = normalizeSearchText(filters.q ?? "");
  const { groups } = buildSearchGroups(filters.q ?? "");
  const typed = tokenizeSearch(filters.q ?? "");
  const expandedTerms = Array.from(
    new Set(groups.flat().filter((term) => !typed.includes(term)))
  );

  const [didYouMean, relatedKeywords, categories, popular, facetResults] =
    await Promise.all([
      queryText.length >= 3 ? getDidYouMean(queryText) : Promise.resolve(null),
      queryText.length >= 2 ? getRelatedKeywords(queryText) : Promise.resolve([]),
      queryText.length >= 2 ? getCategories(queryText) : Promise.resolve([]),
      getPopularSearches(),
      Promise.all(FACETS.map((facet) => getFacetCounts(facet, filters, options))),
    ]);

  const facets = {} as FilterFacets;
  FACETS.forEach((facet, index) => {
    facets[facet.name] = facetResults[index];
  });

  return {
    suggestions: { didYouMean, relatedKeywords, categories, popular },
    facets,
    normalizedQuery: queryText,
    expandedTerms,
  };
}
