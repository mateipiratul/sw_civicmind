import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchResultsShell } from "@/components/search/search-results-shell";
import { api } from "@/lib/api";
import type { SearchTab } from "@/lib/search-filters";

export function SearchPage() {
  const { q, tab } = useSearch({ from: "/search" });
  const navigate = useNavigate();
  const activeTab: SearchTab = tab === "laws" || tab === "mps" || tab === "all" ? tab : "all";
  const searchQuery = useQuery({
    queryKey: ["global-search", q],
    queryFn: () => api.searchGlobal(q),
    enabled: q.length > 0,
  });

  const handleTabChange = (nextTab: SearchTab) => {
    navigate({ to: "/search", search: { q, tab: nextTab } });
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
      />
    </div>
  );
}
