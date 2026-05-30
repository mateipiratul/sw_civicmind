import { Link } from "@tanstack/react-router";
import { Calendar, FileText, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Bill } from "@/lib/api";

interface FeedBillCardProps {
  bill: Bill;
  userInterests?: string[];
}

export function FeedBillCard({ bill, userInterests = [] }: FeedBillCardProps) {
  const ai = bill.ai_analysis;
  const title = ai?.title_short || bill.title;
  const isAdopted = bill.status?.toLowerCase().includes("adoptat");

  const allCats = ai?.impact_categories || [];
  const matchedCats = allCats.filter(c => userInterests.includes(c));
  const unmatchedCats = allCats.filter(c => !userInterests.includes(c));
  const displayCats = [...matchedCats, ...unmatchedCats].slice(0, 2);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {displayCats.map((cat) => {
          const isMatch = userInterests.includes(cat);
          return (
            <span key={cat} style={{ 
              fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, 
              background: isMatch ? "var(--primary)" : "var(--color-muted)", 
              color: isMatch ? "var(--primary-text)" : "var(--text-muted)" 
            }}>
              {cat}
            </span>
          );
        })}
        <span style={{
          fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4,
          background: isAdopted ? "var(--color-success)" : "var(--color-muted)",
          color: isAdopted ? "var(--color-primary-foreground)" : "var(--text-muted)",
        }}>
          {bill.status || "În analiză"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>{bill.bill_number}</span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", lineHeight: 1.45 }}>{title}</div>

      {ai?.key_ideas && ai.key_ideas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            AI Rezumat
          </div>
          {ai.key_ideas.slice(0, 2).map((idea, i) => (
            <div key={i} style={{ display: "flex", gap: 6, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--color-input)", flexShrink: 0 }}>•</span>
              <span>{idea}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        {bill.registered_at && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={13} />
            {formatDate(bill.registered_at)}
          </span>
        )}
        {bill.law_type && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <FileText size={13} />
            {bill.law_type}
          </span>
        )}
        <Link
          to="/bills/$id"
          params={{ id: String(bill.idp) }}
          style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 600, color: "var(--text)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
        >
          Detalii <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
