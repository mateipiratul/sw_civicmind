import type { Bill, SearchMP } from "@/lib/api";
import { ExactMatchCard } from "@/components/search/exact-match-card";
import { BillResultsGrid, MpResultsGrid } from "@/components/search/result-grids";
import { SearchSectionHeader } from "@/components/search/search-section-header";

type SearchAllTabProps = {
  exactMatch: Bill | null;
  topLaws: Bill[];
  topMps: SearchMP[];
  query: string;
  onSeeAllLaws: () => void;
  onSeeAllMps: () => void;
};

export function SearchAllTab({ exactMatch, topLaws, topMps, query, onSeeAllLaws, onSeeAllMps }: SearchAllTabProps) {
  return (
    <div className="search-results">
      {exactMatch && <ExactMatchCard bill={exactMatch} />}

      <div className="search-section-block">
        <SearchSectionHeader title="Top Legi" actionLabel="Vezi toate" onAction={onSeeAllLaws} />
        {topLaws.length === 0 ? <div className="search-empty">Nu am găsit legi relevante.</div> : <BillResultsGrid bills={topLaws} />}
      </div>

      <div className="search-section-block">
        <SearchSectionHeader title="Top Parlamentari" actionLabel="Vezi toate" onAction={onSeeAllMps} />
        {topMps.length === 0 ? (
          <div className="search-empty">Nu am găsit parlamentari relevanți.</div>
        ) : (
          <MpResultsGrid mps={topMps} query={query} />
        )}
      </div>
    </div>
  );
}
