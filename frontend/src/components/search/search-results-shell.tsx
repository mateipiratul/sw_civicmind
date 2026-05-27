import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FilterDrawer } from "@/components/search/filter-drawer";
import { SearchAllTab } from "@/components/search/search-all-tab";
import { SearchLawsTab } from "@/components/search/search-laws-tab";
import { SearchMpsTab } from "@/components/search/search-mps-tab";
import { buildLawFilterChips, buildMpFilterChips, useFilteredLaws, useFilteredMps } from "@/lib/search-filters";
import { EMPTY_FILTERS, EMPTY_MP_FILTERS } from "@/lib/constants";
import type { GlobalSearchResponse } from "@/lib/api";
import type { LawFilterOptions, LawFilters, MpFilterOptions, MpFilters, SearchTab } from "@/lib/search-filters";

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "all", label: "Toate" },
  { id: "laws", label: "Legi" },
  { id: "mps", label: "Parlamentari" },
];

type SearchResultsShellProps = {
  q: string;
  activeTab: SearchTab;
  data: GlobalSearchResponse | null;
  loading: boolean;
  error: string | null;
  onTabChange: (tab: SearchTab) => void;
  lawFilters: LawFilters;
  mpFilters: MpFilters;
  onLawFilterChange: (filters: LawFilters) => void;
  onMpFilterChange: (filters: MpFilters) => void;
  onResetFilters: (tab: SearchTab) => void;
};

export function SearchResultsShell({ 
  q, 
  activeTab, 
  data, 
  loading, 
  error, 
  onTabChange,
  lawFilters,
  mpFilters,
  onLawFilterChange,
  onMpFilterChange,
  onResetFilters
}: SearchResultsShellProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const laws = data?.laws ?? [];
  const mps = data?.mps ?? [];
  const exactMatch = data?.exactMatch ?? null;
  const searchMpCount = mps.length;
  const lawOptions: LawFilterOptions = data?.filters.laws ?? { statuses: [], initiators: [], categories: [] };
  const mpOptions: MpFilterOptions = data?.filters.mps ?? { parties: [], counties: [], chambers: [] };

  const filteredLaws = useFilteredLaws(laws, lawFilters);
  const filteredMps = useFilteredMps(mps, mpFilters);
  const lawChips = buildLawFilterChips(lawFilters);
  const mpChips = buildMpFilterChips(mpFilters);
  const lawFilterCount = lawChips.length;
  const mpFilterCount = mpChips.length;
  const topLaws = filteredLaws.slice(0, 3);
  const topMps = filteredMps.slice(0, 3);
  const showFilters = activeTab === "laws" || activeTab === "mps";
  const activeFilterCount = activeTab === "laws" ? lawFilterCount : activeTab === "mps" ? mpFilterCount : 0;

  const handleTabChange = (nextTab: SearchTab) => {
    setFiltersOpen(false);
    onTabChange(nextTab);
  };

  const handleLawChange = (key: keyof LawFilters, value: string) => {
    onLawFilterChange({ ...lawFilters, [key]: value });
  };

  const handleMpChange = (key: keyof MpFilters, value: string) => {
    onMpFilterChange({ ...mpFilters, [key]: value });
  };

  const handleLawChipClear = (key: string) => {
    handleLawChange(key as keyof LawFilters, "");
  };

  const handleMpChipClear = (key: string) => {
    handleMpChange(key as keyof MpFilters, "");
  };

  const handleResetCurrentTabFilters = () => {
    onResetFilters(activeTab);
  };

  const openFilters = () => setFiltersOpen(true);
  const closeFilters = () => setFiltersOpen(false);

  return (
    <>
      <div className="search-hero">
        <div>
          <div className="search-kicker">Rezultate globale</div>
          <h1>Rezultate pentru "{q || "—"}"</h1>
          <p>Explorează rapid legi și parlamentari legați de același subiect.</p>
        </div>
        <div className="search-metrics">
          <div>
            <span>Legi</span>
            <strong>{data?.counts.laws ?? 0}</strong>
          </div>
          <div>
            <span>Parlamentari</span>
            <strong>{searchMpCount}</strong>
          </div>
        </div>
      </div>

      <div className="search-tabs">
        {SEARCH_TABS.map((item) => (
          <button
            key={item.id}
            className={`search-tab ${activeTab === item.id ? "active" : ""}`}
            onClick={() => handleTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}

        {showFilters && (
          <button className="filter-button" onClick={openFilters}>
            <SlidersHorizontal size={14} /> Filtrează
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
        )}
      </div>

      {loading && <div className="search-loading">Se încarcă rezultatele...</div>}
      {error && <div className="error-box">{error}</div>}
      {!q && !loading && <div className="search-empty">Introdu un termen de căutare pentru a vedea rezultate.</div>}

      {activeTab === "all" && !loading && q && (
        <SearchAllTab
          exactMatch={exactMatch}
          topLaws={topLaws}
          topMps={topMps}
          query={q}
          onSeeAllLaws={() => handleTabChange("laws")}
          onSeeAllMps={() => handleTabChange("mps")}
        />
      )}

      {activeTab === "laws" && !loading && q && (
        <SearchLawsTab
          exactMatch={exactMatch}
          lawChips={lawChips}
          filteredLaws={filteredLaws}
          onClearChip={handleLawChipClear}
          onResetFilters={handleResetCurrentTabFilters}
        />
      )}

      {activeTab === "mps" && !loading && q && (
        <SearchMpsTab
          mpChips={mpChips}
          filteredMps={filteredMps}
          query={q}
          onClearChip={handleMpChipClear}
          onResetFilters={handleResetCurrentTabFilters}
        />
      )}

      <FilterDrawer
        open={filtersOpen}
        activeTab={activeTab}
        lawFilters={lawFilters}
        mpFilters={mpFilters}
        lawOptions={lawOptions}
        mpOptions={mpOptions}
        onClose={closeFilters}
        onReset={handleResetCurrentTabFilters}
        onLawChange={handleLawChange}
        onMpChange={handleMpChange}
      />
    </>
  );
}
