import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchResultsShell } from "@/components/search/search-results-shell";
import { api } from "@/lib/api";
import type { SearchParams, LawFilters, MpFilters, SearchTab } from "@/lib/search-filters";
import { EMPTY_FILTERS, EMPTY_MP_FILTERS } from "@/lib/constants";

export function SearchPage() {
  const searchParams = useSearch({ from: "/search" }) as SearchParams;
  const { q, tab, l_status, l_initiator, l_category, l_dateFrom, l_dateTo, m_party, m_county, m_chamber } = searchParams;
  const navigate = useNavigate();
  
  const activeTab: SearchTab = tab === "laws" || tab === "mps" || tab === "all" ? tab : "all";
  
  const lawFilters: LawFilters = {
    status: l_status || "",
    initiator: l_initiator || "",
    category: l_category || "",
    dateFrom: l_dateFrom || "",
    dateTo: l_dateTo || "",
  };

  const mpFilters: MpFilters = {
    party: m_party || "",
    county: m_county || "",
    chamber: m_chamber || "",
  };

  const searchQuery = useQuery({
    queryKey: ["global-search", q],
    queryFn: () => api.searchGlobal(q),
    enabled: q.length > 0,
  });

  const handleTabChange = (nextTab: SearchTab) => {
    navigate({ to: "/search", search: { ...searchParams, tab: nextTab } });
  };

  const handleLawFilterChange = (filters: LawFilters) => {
    navigate({
      to: "/search",
      search: {
        ...searchParams,
        l_status: filters.status || undefined,
        l_initiator: filters.initiator || undefined,
        l_category: filters.category || undefined,
        l_dateFrom: filters.dateFrom || undefined,
        l_dateTo: filters.dateTo || undefined,
      },
    });
  };

  const handleMpFilterChange = (filters: MpFilters) => {
    navigate({
      to: "/search",
      search: {
        ...searchParams,
        m_party: filters.party || undefined,
        m_county: filters.county || undefined,
        m_chamber: filters.chamber || undefined,
      },
    });
  };

  const handleResetFilters = (resetTab?: SearchTab) => {
    if (resetTab === "laws") {
       handleLawFilterChange(EMPTY_FILTERS);
    } else if (resetTab === "mps") {
       handleMpFilterChange(EMPTY_MP_FILTERS);
    }
  };

  const error = searchQuery.error instanceof Error ? searchQuery.error.message : null;

  return (
    <div className="search-page">
      <SearchResultsShell
        key={q}
        q={q}
        activeTab={activeTab}
        data={searchQuery.data ?? null}
        loading={searchQuery.isLoading}
        error={error}
        onTabChange={handleTabChange}
        lawFilters={lawFilters}
        mpFilters={mpFilters}
        onLawFilterChange={handleLawFilterChange}
        onMpFilterChange={handleMpFilterChange}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
}
