/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchResultsShell } from "@/components/search/search-results-shell";
import { api } from "@/lib/api";
import type { SearchTab } from "@/lib/search-filters";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string; tab: SearchTab } => {
    const q = typeof search.q === "string" ? search.q : "";
    const tab =
      search.tab === "laws" || search.tab === "mps" || search.tab === "all"
        ? (search.tab as SearchTab)
        : "all";
    return { q, tab };
  },
  component: SearchPage,
});

function formatChamber(chamber?: string | null) {
  if (!chamber) return "";
  if (chamber === "deputies") return "Camera Deputaților";
  if (chamber === "senate") return "Senat";
  return chamber;
}

function MpResultCard({ mp, query }: { mp: SearchMP; query: string }) {
  const relation = mp.relation;
  const relatedBills = relation?.relatedBills ?? 0;
  const forVotes = relation?.forVotes ?? 0;
  const keyword = relation?.keyword || query;
  const relationText = relatedBills > 0
    ? `A votat [PENTRU] ${forVotes} legi legate de '${keyword}'.`
    : `Nu am găsit voturi directe legate de '${keyword}'.`;

  return (
    <div className="search-mp-card">
      <div className="search-mp-header">
        <div>
          <div className="search-mp-name">{mp.mp_name}</div>
          <div className="search-mp-meta">
            {mp.party && <span>{mp.party}</span>}
            {mp.county && <span>· {mp.county}</span>}
            {mp.chamber && <span>· {formatChamber(mp.chamber)}</span>}
          </div>
        </div>
        {mp.impact_score?.score != null && (
          <div className="search-mp-score">{mp.impact_score.score.toFixed(0)}</div>
        )}
      </div>
      <div className="search-mp-relation">{relationText}</div>
      <Link to="/mps/$slug" params={{ slug: mp.mp_slug }} className="search-mp-link">
        Vezi profil complet
      </Link>
    </div>
  );
}

function buildLawFilterChips(filters: typeof EMPTY_FILTERS) {
  const chips: { key: string; label: string }[] = [];
  if (filters.status) chips.push({ key: "status", label: `Status: ${filters.status}` });
  if (filters.initiator) chips.push({ key: "initiator", label: `Inițiator: ${filters.initiator}` });
  if (filters.category) chips.push({ key: "category", label: `Categorie: ${filters.category}` });
  if (filters.dateFrom) chips.push({ key: "dateFrom", label: `De la: ${filters.dateFrom}` });
  if (filters.dateTo) chips.push({ key: "dateTo", label: `Până la: ${filters.dateTo}` });
  return chips;
}

function buildMpFilterChips(filters: typeof EMPTY_MP_FILTERS) {
  const chips: { key: string; label: string }[] = [];
  if (filters.party) chips.push({ key: "party", label: `Partid: ${filters.party}` });
  if (filters.county) chips.push({ key: "county", label: `Județ: ${filters.county}` });
  if (filters.chamber) chips.push({ key: "chamber", label: `Comisie: ${formatChamber(filters.chamber)}` });
  return chips;
}

function SearchPage() {
  const { q, tab } = Route.useSearch();
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
