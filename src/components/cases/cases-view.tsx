import { getCaseFilterOptions, searchCases } from "@/lib/services/case-service";
import { getSearchIntelligence } from "@/lib/services/search-service";
import { parseCaseSearchParams } from "@/lib/search/params";
import type { CaseListFilters, SearchResponse } from "@/types";
import { SearchExperience } from "./search-experience";

export interface CasesViewProps {
  title: string;
  description: string;
  statusMode: "all" | "open" | "closed" | "close1";
  searchParams: Record<string, string | string[] | undefined>;
  showNewButton?: boolean;
}

function lockedStatusIn(mode: CasesViewProps["statusMode"]): string[] | undefined {
  if (mode === "open") return ["open"];
  if (mode === "closed") return ["close"];
  if (mode === "close1") return ["close_1"];
  return undefined;
}

/**
 * Server shell for every case list. It renders the first page without waiting
 * for client JavaScript; SearchExperience then owns live updates from there.
 */
export async function CasesView({
  title,
  description,
  statusMode,
  searchParams,
  showNewButton = false,
}: CasesViewProps) {
  const filters: CaseListFilters = parseCaseSearchParams(searchParams);
  if (statusMode !== "all") {
    filters.statusIn = lockedStatusIn(statusMode);
    filters.status = undefined;
  }

  const [result, options] = await Promise.all([
    searchCases(filters),
    getCaseFilterOptions(),
  ]);
  const intelligence = await getSearchIntelligence(filters, options);
  const initialResult: SearchResponse = { ...result, ...intelligence };

  return (
    <SearchExperience
      title={title}
      description={description}
      statusMode={statusMode}
      initialFilters={filters}
      initialResult={initialResult}
      options={options}
      showNewButton={showNewButton}
    />
  );
}
