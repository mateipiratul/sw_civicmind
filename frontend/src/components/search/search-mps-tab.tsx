import type { SearchMP } from "@/lib/api";
import type { FilterChip } from "@/lib/search-filters";
import { FilterChips } from "@/components/search/filter-chips";
import { MpResultsGrid } from "@/components/search/result-grids";
import { SearchEmptyState } from "@/components/search/search-empty-state";

type SearchMpsTabProps = {
  mpChips: FilterChip[];
  filteredMps: SearchMP[];
  query: string;
  onClearChip: (key: string) => void;
  onResetFilters: () => void;
};

export function SearchMpsTab({
  mpChips,
  filteredMps,
  query,
  onClearChip,
  onResetFilters,
}: SearchMpsTabProps) {
  const isFiltered = mpChips.length > 0;

  return (
    <div className="search-results">
      <FilterChips chips={mpChips} onClear={onClearChip} />

      {filteredMps.length === 0 ? (
        <div className="search-empty-container">
          {isFiltered ? (
            <SearchEmptyState
              message="Nu am găsit rezultate cu aceste filtre. Încearcă să elimini din filtrele selectate."
              actionLabel="Șterge filtrele"
              onAction={onResetFilters}
            />
          ) : (
            <div className="search-empty">Nu am găsit parlamentari care să se potrivească căutării tale.</div>
          )}
        </div>
      ) : (
        <MpResultsGrid mps={filteredMps} query={query} />
      )}
    </div>
  );
}
