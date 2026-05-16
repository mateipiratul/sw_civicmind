import type { Bill, SearchMP } from "@/lib/api";
import { MpResultCard } from "@/components/search/mp-result-card";
import { LawResultCard } from "@/components/search/law-result-card";

export function BillResultsGrid({ bills }: { bills: Bill[] }) {
  return (
    <div className="search-grid">
      {bills.map((bill) => (
        <LawResultCard key={bill.idp} bill={bill} />
      ))}
    </div>
  );
}

export function MpResultsGrid({ mps, query }: { mps: SearchMP[]; query: string }) {
  return (
    <div className="search-mp-grid">
      {mps.map((mp) => (
        <MpResultCard key={mp.mp_slug} mp={mp} query={query} />
      ))}
    </div>
  );
}
