import { BadgeCheck } from "lucide-react";
import type { Bill } from "@/lib/api";
import { BillResultsGrid } from "@/components/search/result-grids";

export function ExactMatchCard({ bill }: { bill: Bill }) {
  return (
    <div className="exact-match">
      <div className="exact-match-label">
        <BadgeCheck size={14} /> Exact Match
      </div>
      <BillResultsGrid bills={[bill]} />
    </div>
  );
}
