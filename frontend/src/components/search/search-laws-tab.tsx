import type { Bill } from "@/lib/api";
import type { FilterChip } from "@/lib/search-filters";
import { ExactMatchCard } from "@/components/search/exact-match-card";
import { FilterChips } from "@/components/search/filter-chips";
import { BillResultsGrid } from "@/components/search/result-grids";
import { SearchEmptyState } from "@/components/search/search-empty-state";

type SearchLawsTabProps = {
  exactMatch: Bill | null;
  lawChips: FilterChip[];
  filteredLaws: Bill[];
  onClearChip: (key: string) => void;
  onResetFilters: () => void;
};

export function SearchLawsTab({
  exactMatch,
  lawChips,
  filteredLaws,
  onClearChip,
  onResetFilters,
}: SearchLawsTabProps) {
  const isFiltered = lawChips.length > 0;

  return (
    <div className="search-results">
      <FilterChips chips={lawChips} onClear={onClearChip} />

      {exactMatch && <ExactMatchCard bill={exactMatch} />}

      {filteredLaws.length === 0 ? (
        <div className="search-empty-container">
          {isFiltered ? (
            <SearchEmptyState
              message="Nu am găsit rezultate cu aceste filtre. Încearcă să elimini din filtrele selectate."
              actionLabel="Șterge filtrele"
              onAction={onResetFilters}
            />
          ) : (
            <div className="search-empty">Nu am găsit legi care să se potrivească căutării tale.</div>
          )}
        </div>
      ) : (
        <BillResultsGrid bills={filteredLaws} />
      )}
    </div>
  );
}
