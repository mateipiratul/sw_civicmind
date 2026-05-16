import { Link } from "@tanstack/react-router";
import type { Bill } from "@/lib/api";
import { ChevronRight } from "lucide-react";

type LawResultCardProps = {
  bill: Bill;
};

export function LawResultCard({ bill }: LawResultCardProps) {
  const analysis = bill.ai_analysis;
  const title = analysis?.title_short || bill.title;
  const isAdopted = bill.status?.toLowerCase().includes("adoptat");
  const statusClass = isAdopted ? "adoptat" : "pending";

  return (
    <div className="search-law-card">
      <div className="search-law-header">
        <div>
          <div className="search-law-number">{bill.bill_number}</div>
          <div className="search-law-title" title={bill.title}>{title}</div>
        </div>
        <div className={`search-law-status ${statusClass}`}>
          {bill.status || "În analiză"}
        </div>
      </div>      

      <div className="search-law-meta">
        {bill.registered_at && (
          <span>{new Date(bill.registered_at).toLocaleDateString("ro-RO")}</span>
        )}
        {bill.law_type && (
          <span> · {bill.law_type}</span>
        )}
      </div>

      <div className="search-law-categories">
        {analysis?.impact_categories?.slice(0, 3).map((cat) => (
          <span key={cat} className="search-law-category">
            {cat}
          </span>
        ))}
        {(!analysis?.impact_categories || analysis.impact_categories.length === 0) && (
          <span className="search-law-category">Analiză în curs</span>
        )}
      </div>

      {analysis?.controversy_score !== undefined && analysis?.controversy_score !== null && (
        <div className="search-law-impact">
          <div className="search-law-impact-bar">
            <div
              className="search-law-impact-fill"
              style={{ width: `${(analysis.controversy_score || 0) * 10}%` }}
            />
          </div>
          <span className="search-law-impact-label">Impact</span>
        </div>
      )}

      <Link
        to="/bills/$id"
        params={{ id: String(bill.idp) }}
        className="search-law-link"
      >
        Vezi detalii <ChevronRight size={14} />
      </Link>
    </div>
  );
}
