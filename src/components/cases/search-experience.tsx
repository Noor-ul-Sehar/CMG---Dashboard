"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CloseIcon, EyeIcon, PencilIcon, SearchIcon, SpinnerIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { CaseFormModal } from "@/components/cases/case-form-modal";
import { APPROVAL_STATUSES, CASE_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  filtersToSearchParams,
  parseCaseSearchParams,
} from "@/lib/search/params";
import {
  highlightSegments,
  normalizeSearchText,
  tokenizeSearch,
} from "@/lib/search/text";
import type { CaseFilterOptions } from "@/lib/services/case-service";
import type {
  CaseListFilters,
  CaseSort,
  CaseWithRefs,
  FacetCount,
  SearchResponse,
  SearchSuggestionCategory,
} from "@/types";

const PER_PAGE = 20;
const RECENT_KEY = "cmg-search-recent";

const SORT_OPTIONS: { value: CaseSort; label: string }[] = [
  { value: "relevance", label: "Most Relevant" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "az", label: "Title A–Z" },
  { value: "za", label: "Title Z–A" },
];

type FilterKey = keyof CaseListFilters;

const COMPARED_KEYS: FilterKey[] = [
  "q",
  "status",
  "targetBy",
  "targetNature",
  "brand",
  "clientReference",
  "reportStatus",
  "caseType",
  "investigator",
  "team",
  "dateFrom",
  "dateTo",
  "sort",
  "page",
  "perPage",
];

function equalFilters(a: CaseListFilters, b: CaseListFilters): boolean {
  if (COMPARED_KEYS.some((key) => (a[key] ?? "") !== (b[key] ?? ""))) {
    return false;
  }
  for (const key of ["statusIn", "brands"] as const) {
    const left = a[key] ?? [];
    const right = b[key] ?? [];
    if (
      left.length !== right.length ||
      left.some((value, index) => value !== right[index])
    ) {
      return false;
    }
  }
  return true;
}

function lockedStatusIn(mode: "all" | "open" | "closed" | "close1") {
  if (mode === "open") return ["open"];
  if (mode === "closed") return ["close"];
  if (mode === "close1") return ["close_1"];
  return undefined;
}

function countLabel(label: string, counts: FacetCount[], value: string): string {
  const count = counts.find((entry) => entry.value === value)?.count;
  return count === undefined ? label : `${label} (${count})`;
}

function Highlight({ text, terms }: { text: string | null; terms: string[] }) {
  const value = text ?? "";
  const segments = highlightSegments(value, terms);
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded bg-amber-100 px-0.5 text-inherit"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}

interface SuggestionItem {
  key: string;
  label: string;
  hint: string;
  run: () => void;
}

export function SearchExperience({
  title,
  description,
  statusMode,
  initialFilters,
  initialResult,
  options,
  showNewButton = false,
}: {
  title: string;
  description: string;
  statusMode: "all" | "open" | "closed" | "close1";
  initialFilters: CaseListFilters;
  initialResult: SearchResponse;
  options: CaseFilterOptions;
  showNewButton?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const normalizedInitial = useMemo<CaseListFilters>(
    () => ({
      ...initialFilters,
      page: initialFilters.page ?? 1,
      perPage: initialFilters.perPage ?? PER_PAGE,
      sort: initialFilters.sort ?? "newest",
    }),
    [initialFilters]
  );

  const [filters, setFilters] = useState<CaseListFilters>(normalizedInitial);
  const [input, setInput] = useState(normalizedInitial.q ?? "");
  const [result, setResult] = useState<SearchResponse>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<CaseListFilters>(normalizedInitial);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(RECENT_KEY) ?? "[]");
      return Array.isArray(stored)
        ? stored
            .filter((item): item is string => typeof item === "string")
            .slice(0, 5)
        : [];
    } catch {
      return [];
    }
  });

  const filtersRef = useRef(normalizedInitial);
  const firstRun = useRef(true);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const parsed = parseCaseSearchParams(new URLSearchParams(paramsKey));
    if (statusMode !== "all") parsed.statusIn = lockedStatusIn(statusMode);
    if (!equalFilters(filtersRef.current, parsed)) {
      setFilters(parsed);
      setInput(parsed.q ?? "");
      setActiveIndex(-1);
    }
  }, [paramsKey, statusMode]);

  useEffect(() => {
    const desired = filtersToSearchParams(filters);
    const current = filtersToSearchParams(
      parseCaseSearchParams(new URLSearchParams(paramsKey))
    );
    if (desired.toString() !== current.toString()) {
      router.replace(`${pathname}?${desired.toString()}`, { scroll: false });
    }
  }, [filters, paramsKey, pathname, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = input.trim() || undefined;
      const current = filtersRef.current;
      if (current.q !== nextQ || current.page !== 1) {
        const next = { ...current, q: nextQ, page: 1 };
        filtersRef.current = next;
        setFilters(next);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?${filtersToSearchParams(filters).toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error("Search request failed");
        const data = (await response.json()) as SearchResponse;
        setResult(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("We couldn't complete that search. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters]);

  const applyFilters = useCallback((patch: Partial<CaseListFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }));
  }, []);

  const rememberTerm = useCallback((term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    setRecent((previous) => {
      const next = [cleaned, ...previous.filter((item) => item !== cleaned)].slice(0, 5);
      try {
        sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Session storage is best-effort only.
      }
      return next;
    });
  }, []);

  const applyTerm = useCallback(
    (term: string) => {
      const cleaned = term.trim();
      setInput(cleaned);
      setActiveIndex(-1);
      applyFilters({ q: cleaned || undefined });
      rememberTerm(cleaned);
      setDropdownOpen(false);
    },
    [applyFilters, rememberTerm]
  );

  const applyCategory = useCallback(
    (category: SearchSuggestionCategory) => {
      const patch: Partial<CaseListFilters> = {};
      if (category.type === "brand") patch.brand = category.value;
      if (category.type === "targetNature") patch.targetNature = category.value;
      if (category.type === "targetBy") patch.targetBy = category.value;
      if (category.type === "status") patch.status = category.value;
      applyFilters(patch);
      setDropdownOpen(false);
    },
    [applyFilters]
  );

  const clearAll = useCallback(() => {
    const reset: CaseListFilters = {
      statusIn: statusMode === "all" ? undefined : lockedStatusIn(statusMode),
      page: 1,
      perPage: PER_PAGE,
      sort: "newest",
    };
    setInput("");
    setActiveIndex(-1);
    setFilters(reset);
    setDropdownOpen(false);
    setDraftFilters(reset);
  }, [statusMode]);

  const openFilters = useCallback(() => {
    setDraftFilters(filters);
    setFiltersOpen(true);
  }, [filters]);

  const applyDraftFilters = useCallback(() => {
    setFilters((previous) => ({ ...previous, ...draftFilters, page: 1 }));
    setFiltersOpen(false);
  }, [draftFilters]);

  const suggestionItems = useMemo<SuggestionItem[]>(() => {
    const items: SuggestionItem[] = [];
    if (result.suggestions.didYouMean) {
      const term = result.suggestions.didYouMean;
      items.push({
        key: `did-${term}`,
        label: term,
        hint: "Did you mean",
        run: () => applyTerm(term),
      });
    }
    for (const category of result.suggestions.categories) {
      items.push({
        key: `cat-${category.type}-${category.value}`,
        label: category.label,
        hint: `Filter by ${category.type === "targetNature" ? "nature" : category.type}`,
        run: () => applyCategory(category),
      });
    }
    const typed = normalizeSearchText(input);
    for (const keyword of result.suggestions.relatedKeywords) {
      if (keyword === typed) continue;
      items.push({
        key: `rel-${keyword}`,
        label: keyword,
        hint: "Related keyword",
        run: () => applyTerm(keyword),
      });
    }
    if (!input.trim()) {
      for (const term of recent) {
        items.push({
          key: `recent-${term}`,
          label: term,
          hint: "Recent search",
          run: () => applyTerm(term),
        });
      }
      for (const term of result.suggestions.popular) {
        items.push({
          key: `popular-${term}`,
          label: term,
          hint: "Popular in your cases",
          run: () => applyTerm(term),
        });
      }
    }
    return items.slice(0, 10);
  }, [applyCategory, applyTerm, input, recent, result.suggestions]);

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && suggestionItems[activeIndex]) {
        suggestionItems[activeIndex].run();
      } else {
        applyTerm(input);
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setDropdownOpen(true);
      setActiveIndex((current) =>
        suggestionItems.length === 0 ? -1 : Math.min(current + 1, suggestionItems.length - 1)
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
    } else if (event.key === "Escape") {
      setDropdownOpen(false);
      setActiveIndex(-1);
    }
  }

  const chips = useMemo(() => {
    const list: { key: FilterKey; label: string; value: string }[] = [];
    const add = (key: FilterKey, label: string, value: string | number | undefined | null) => {
      if (value !== undefined && value !== null && value !== "") {
        list.push({ key, label, value: String(value) });
      }
    };

    add("q", "Search", filters.q);
    add("status", "Status", filters.status);
    add("reportStatus", "Approval", filters.reportStatus);
    add("targetBy", "Target By", options.targetBy.find((item) => String(item.id) === filters.targetBy)?.name ?? filters.targetBy);
    add("targetNature", "Nature", filters.targetNature);
    add("brand", "Brand", filters.brand);
    add("investigator", "Investigator", options.investigators.find((item) => String(item.id) === filters.investigator)?.name ?? filters.investigator);
    add("team", "Team", options.teams.find((item) => String(item.id) === filters.team)?.name ?? filters.team);
    add("caseType", "Case type", filters.caseType);
    add("dateFrom", "Updated from", filters.dateFrom);
    add("dateTo", "Updated to", filters.dateTo);
    return list;
  }, [filters, options]);

  const highlightTerms = useMemo(() => tokenizeSearch(input), [input]);

  const formMasterOptions = useMemo(
    () => ({
      targetBy: options.targetBy,
      targetNatures: options.targetNatures.map((name) => ({ name })),
      brands: options.brands.map((name) => ({ name })),
    }),
    [options]
  );

  function columns(): Column<CaseWithRefs>[] {
    return [
      {
        key: "ref",
        header: "CMG Reference #",
        cell: (row) => (
          <a
            href={`/market-cases/all-cases/${row.id}`}
            className="relative z-10 font-medium tabular-nums text-zinc-900 underline-offset-2 hover:underline"
          >
            <Highlight text={row.cmgReference} terms={highlightTerms} />
          </a>
        ),
      },
      {
        key: "target",
        header: "Target",
        cell: (row) => (
          <span className="block max-w-48 truncate" title={row.targetName ?? ""}>
            <Highlight text={row.targetName} terms={highlightTerms} />
          </span>
        ),
      },
      {
        key: "brand",
        header: "Brand",
        cell: (row) => {
          const brands = row.brands ?? [];
          if (brands.length === 0) {
            return <Highlight text={row.brand} terms={highlightTerms} />;
          }
          return (
            <span className="flex flex-wrap gap-1">
              {brands.slice(0, 2).map((brand) => (
                <span
                  key={brand}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700"
                >
                  <Highlight text={brand} terms={highlightTerms} />
                </span>
              ))}
              {brands.length > 2 ? (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                  +{brands.length - 2}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        key: "targetBy",
        header: "Target By",
        cell: (row) => (
          <span className="block max-w-36 truncate" title={row.targetBy ?? ""}>
            <Highlight text={row.targetBy} terms={highlightTerms} />
          </span>
        ),
      },
      {
        key: "status",
        header: "Case Status",
        cell: (row) => <StatusBadge type="case" value={row.status} />,
      },
      {
        key: "reportStatus",
        header: "Approval Status",
        cell: (row) => <StatusBadge type="approval" value={row.reportStatus} />,
      },
      {
        key: "investigationDate",
        header: "Investigation Date",
        cell: (row) => (
          <span className="tabular-nums text-zinc-500">
            {row.investigationDate ? formatDate(row.investigationDate) : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        cell: (row) => (
          <div className="relative z-10 flex items-center gap-2">
            <LinkButton href={`/market-cases/all-cases/${row.id}`} variant="ghost" size="sm">
              <EyeIcon className="h-4 w-4" />
              <span className="sr-only">View</span>
            </LinkButton>
            <CaseFormModal
              mode="edit"
              caseData={row}
              {...formMasterOptions}
              label="Edit"
              variant="ghost"
              size="sm"
              icon={<PencilIcon className="h-4 w-4" />}
              hideLabel
            />
          </div>
        ),
      },
    ];
  }

  const hasAnyFilter =
    chips.length > 0 || Boolean(filters.statusIn?.length) || Boolean(filters.brands?.length);

  const searchBox: ReactNode = (
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setDropdownOpen(false);
      }
    }}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setActiveIndex(-1);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search refs, targets, brands, notes…"
          aria-label="Search cases"
          aria-autocomplete="list"
          aria-expanded={dropdownOpen}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <SpinnerIcon className="h-4 w-4 animate-spin text-zinc-400" /> : null}
          {input ? (
            <button
              type="button"
              onClick={() => applyTerm("")}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Clear search"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {dropdownOpen && suggestionItems.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestionItems.map((item, index) => (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={item.run}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                activeIndex === index ? "bg-zinc-100" : "hover:bg-zinc-50"
              }`}
            >
              <span className="truncate text-zinc-800">{item.label}</span>
              <span className="shrink-0 text-xs text-zinc-400">{item.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const filterControls: ReactNode = (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/[0.02]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">{searchBox}</div>
        <Select
          value={filters.sort ?? "newest"}
          onChange={(event) => applyFilters({ sort: event.target.value as CaseSort })}
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" onClick={openFilters} aria-haspopup="dialog">
          Filters
        </Button>
      </div>
      {hasAnyFilter ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900"
          >
            Clear all filters
          </button>
        </div>
      ) : null}
    </div>
  );

  const activeChips: ReactNode = chips.length > 0 ? (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Active filters
      </span>
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.value}`}
          type="button"
          onClick={() => applyFilters({ [chip.key]: undefined })}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
          aria-label={`Remove ${chip.label} filter`}
        >
          <span className="text-zinc-400">{chip.label}:</span>
          <span className="max-w-40 truncate">{chip.value}</span>
          <CloseIcon className="h-3 w-3 text-zinc-400" />
        </button>
      ))}
    </div>
  ) : null;

  const filterModal: ReactNode = (
    <Modal
      open={filtersOpen}
      onClose={() => setFiltersOpen(false)}
      title="Filter cases"
      description="Narrow results by status, brand, investigator and date range."
      size="2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => setFiltersOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={applyDraftFilters}>
            Apply filters
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statusMode === "all" ? (
          <Select
            value={draftFilters.status ?? ""}
            onChange={(event) =>
              setDraftFilters((previous) => ({
                ...previous,
                status: event.target.value || undefined,
              }))
            }
            aria-label="Case status"
          >
            <option value="">All case statuses</option>
            {CASE_STATUSES.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {countLabel(entry.label, result.facets.status, entry.value)}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={draftFilters.reportStatus ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              reportStatus: event.target.value || undefined,
            }))
          }
          aria-label="Approval status"
        >
          <option value="">All approval statuses</option>
          {APPROVAL_STATUSES.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {countLabel(entry.label, result.facets.reportStatus, entry.value)}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.targetBy ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              targetBy: event.target.value || undefined,
            }))
          }
          aria-label="Target By"
        >
          <option value="">All targeted by</option>
          {options.targetBy.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {countLabel(entry.name, result.facets.targetBy, String(entry.id))}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.targetNature ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              targetNature: event.target.value || undefined,
            }))
          }
          aria-label="Target nature"
        >
          <option value="">All natures</option>
          {options.targetNatures.map((entry) => (
            <option key={entry} value={entry}>
              {countLabel(entry, result.facets.targetNature, entry)}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.brand ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              brand: event.target.value || undefined,
            }))
          }
          aria-label="Brand"
        >
          <option value="">All brands</option>
          {options.brands.map((entry) => (
            <option key={entry} value={entry}>
              {countLabel(entry, result.facets.brand, entry)}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.investigator ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              investigator: event.target.value || undefined,
            }))
          }
          aria-label="Investigator"
        >
          <option value="">All investigators</option>
          {options.investigators.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {countLabel(entry.name, result.facets.investigator, String(entry.id))}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.team ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              team: event.target.value || undefined,
            }))
          }
          aria-label="Team"
        >
          <option value="">All teams</option>
          {options.teams.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {countLabel(entry.name, result.facets.team, String(entry.id))}
            </option>
          ))}
        </Select>
        <Select
          value={draftFilters.caseType ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              caseType: event.target.value || undefined,
            }))
          }
          aria-label="Case type"
        >
          <option value="">All case types</option>
          {options.caseTypes.map((entry) => (
            <option key={entry} value={entry}>
              {countLabel(entry, result.facets.caseType, entry)}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={draftFilters.dateFrom ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              dateFrom: event.target.value || undefined,
            }))
          }
          aria-label="Updated from"
        />
        <Input
          type="date"
          value={draftFilters.dateTo ?? ""}
          onChange={(event) =>
            setDraftFilters((previous) => ({
              ...previous,
              dateTo: event.target.value || undefined,
            }))
          }
          aria-label="Updated to"
        />
      </div>
    </Modal>
  );

  const emptyState = (): ReactNode => {
    if (!hasAnyFilter && statusMode === "all") {
      return (
        <EmptyState
          title="No Market Cases yet"
          description="Create your first Market Case to get started."
          action={
            <CaseFormModal
              mode="new"
              {...formMasterOptions}
              label="+ New Market Case"
            />
          }
        />
      );
    }

    const suggestions = result.suggestions;
    return (
      <div className="px-6 py-12 text-center">
        <h3 className="text-sm font-semibold text-zinc-900">
          {result.normalizedQuery ? "No exact matches found." : "No cases match the current filters"}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
          Try one of these real values from your cases, or clear a filter.
        </p>
        <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
          {suggestions.didYouMean ? (
            <Button type="button" size="sm" onClick={() => applyTerm(suggestions.didYouMean!)}>
              Did you mean “{suggestions.didYouMean}”?
            </Button>
          ) : null}
          {suggestions.categories.map((category) => (
            <Button
              key={`empty-${category.type}-${category.value}`}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyCategory(category)}
            >
              {category.label}
            </Button>
          ))}
          {suggestions.relatedKeywords.map((keyword) => (
            <Button
              key={`empty-related-${keyword}`}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyTerm(keyword)}
            >
              {keyword}
            </Button>
          ))}
          {suggestions.popular.slice(0, 4).map((keyword) => (
            <Button
              key={`empty-popular-${keyword}`}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyTerm(keyword)}
            >
              {keyword}
            </Button>
          ))}
          {chips.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Clear all filters
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          showNewButton ? (
            <CaseFormModal
              mode="new"
              {...formMasterOptions}
              label="New Market Case"
            />
          ) : undefined
        }
      />

      {filterControls}
      {activeChips}
      {filterModal}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-500" aria-live="polite">
          {loading ? (
            "Searching…"
          ) : (
            <>
              <span className="font-semibold text-zinc-900">
                {result.total.toLocaleString()}
              </span>{" "}
              {result.total === 1 ? "case" : "cases"}
              {result.normalizedQuery ? (
                <>
                  {" "}
                  for <span className="font-medium text-zinc-800">“{input}”</span>
                </>
              ) : null}
            </>
          )}
        </p>
        {!loading && result.expandedTerms.length > 0 ? (
          <p className="text-xs text-zinc-400">
            Also matching related terms: {result.expandedTerms.join(", ")}
          </p>
        ) : null}
      </div>

      {error ? (
        <Card>
          <ErrorState message={error} retry={() => setFilters((current) => ({ ...current }))} />
        </Card>
      ) : (
        <div className="relative">
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/50 pt-16">
              <LoadingState label="Searching cases" />
            </div>
          ) : null}
          <Card>
            {result.rows.length === 0 ? (
              emptyState()
            ) : (
              <DataTable
                columns={columns()}
                rows={result.rows}
                rowHref={(row) => `/market-cases/all-cases/${row.id}`}
                rowKey={(row) => row.id}
              />
            )}
          </Card>
        </div>
      )}

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <p>
            Showing page {result.page} of {result.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={result.page <= 1 || loading}
              onClick={() => applyFilters({ page: result.page - 1 })}
            >
              Previous
            </Button>
            <span className="tabular-nums">
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={result.page >= result.totalPages || loading}
              onClick={() => applyFilters({ page: result.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
