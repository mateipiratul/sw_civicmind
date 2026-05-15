import type { SearchMP } from "@/lib/api";
import type { FilterChip } from "@/lib/search-filters";
import { FilterChips } from "@/components/search/filter-chips";
import { MpResultsGrid } from "@/components/search/result-grids";
import { SearchEmptyState } from "@/components/search/search-empty-state";

type SearchMpsTabProps = {
  mpChips: FilterChip[];
  filteredMps: SearchMP[];
  showEmptyState: boolean;
  query: string;
  onClearChip: (key: string) => void;
  onResetFilters: () => void;
};

export function SearchMpsTab({
  mpChips,
  filteredMps,
  showEmptyState,
  query,
  onClearChip,
  onResetFilters,
}: SearchMpsTabProps) {
  return (
    <div className="search-results">
      <FilterChips chips={mpChips} onClear={onClearChip} />

      {showEmptyState ? (
        <SearchEmptyState
          message="Nu am găsit rezultate cu aceste filtre. Încearcă să elimini din filtrele selectate."
          actionLabel="Șterge filtrele"
          onAction={onResetFilters}
        />
      ) : (
        <MpResultsGrid mps={filteredMps} query={query} />
      )}
    </div>
  );
}
